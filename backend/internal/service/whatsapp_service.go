package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/user/whatsapp-saas/internal/models"
	"github.com/user/whatsapp-saas/internal/repository"
	"github.com/user/whatsapp-saas/internal/socket"
)

type WhatsappService struct {
	repo      *repository.WhatsappRepo
	evolution *EvolutionClient
	hub       *socket.Hub
}

func NewWhatsappService(repo *repository.WhatsappRepo, evolution *EvolutionClient, hub *socket.Hub) *WhatsappService {
	return &WhatsappService{repo: repo, evolution: evolution, hub: hub}
}

func (s *WhatsappService) Connect(ctx context.Context, orgID, instanceName, webhookURL string) (string, error) {
	resp, err := s.evolution.CreateInstance(instanceName, webhookURL)
	if err != nil {
		return "", err
	}

	if err := s.repo.SetInstance(ctx, orgID, resp.Instance.InstanceID, resp.Instance.InstanceName); err != nil {
		return "", fmt.Errorf("erro ao salvar instância: %w", err)
	}

	return resp.QrCode, nil
}

func (s *WhatsappService) Status(ctx context.Context, orgID string) (string, string, error) {
	_, instanceName, err := s.repo.GetOrgInstance(ctx, orgID)
	if err != nil || instanceName == "" {
		return "disconnected", "", nil
	}

	state, err := s.evolution.GetInstanceStatus(instanceName)
	if err != nil {
		return "error", instanceName, err
	}
	return state, instanceName, nil
}

func (s *WhatsappService) Disconnect(ctx context.Context, orgID string) error {
	_, instanceName, err := s.repo.GetOrgInstance(ctx, orgID)
	if err != nil || instanceName == "" {
		return fmt.Errorf("nenhuma instância conectada")
	}

	if err := s.evolution.DisconnectInstance(instanceName); err != nil {
		return err
	}

	return s.repo.ClearInstance(ctx, orgID)
}

func (s *WhatsappService) SendMessage(ctx context.Context, orgID, jid, text, quotedMsgID string) (*models.WhatsappMessage, error) {
	conv, err := s.repo.FindConversationByJid(ctx, orgID, jid)
	if err != nil {
		return nil, fmt.Errorf("conversa não encontrada: %w", err)
	}

	_, instanceName, err := s.repo.GetOrgInstance(ctx, orgID)
	if err != nil || instanceName == "" {
		return nil, fmt.Errorf("WhatsApp não conectado")
	}

	remoteMsgID, err := s.evolution.SendMessage(instanceName, conv.Jid, text)
	if err != nil {
		return nil, fmt.Errorf("erro ao enviar mensagem: %w", err)
	}

	now := time.Now()
	msg := &models.WhatsappMessage{
		ConversationID: conv.ID,
		OrgID:          orgID,
		RemoteMsgID:    remoteMsgID,
		Sender:         "me",
		Content:        text,
		MsgType:        "text",
		FromMe:         true,
		IsGroup:        conv.IsGroup,
		Status:         "sent",
		Reactions:      json.RawMessage("[]"),
		QuotedMsgID:    quotedMsgID,
		Timestamp:      now,
	}
	if err := s.repo.InsertMessage(ctx, msg); err != nil {
		log.Printf("[whatsapp] erro ao salvar msg: %v", err)
	}

	s.repo.UpsertConversationFromMe(ctx, &models.WhatsappConversation{
		OrgID: orgID, Jid: conv.Jid, Name: conv.Name, Phone: conv.Phone,
		IsGroup: conv.IsGroup, LastMessage: text, LastMessageAt: &now,
	})

	s.broadcastMessage(orgID, "message_sent", msg)
	return msg, nil
}

func (s *WhatsappService) SendMedia(ctx context.Context, orgID, conversationID, mediaURL, mediaType, fileName, caption, quotedMsgID string) (*models.WhatsappMessage, error) {
	conv, err := s.repo.FindConversationByJid(ctx, orgID, conversationID)
	if err != nil {
		return nil, fmt.Errorf("conversa não encontrada: %w", err)
	}

	_, instanceName, err := s.repo.GetOrgInstance(ctx, orgID)
	if err != nil || instanceName == "" {
		return nil, fmt.Errorf("WhatsApp não conectado")
	}

	remoteMsgID, err := s.evolution.SendMedia(instanceName, conv.Jid, mediaURL, mediaTypeToEvolution(mediaType), fileName, caption, quotedMsgID)
	if err != nil {
		return nil, fmt.Errorf("erro ao enviar mídia: %w", err)
	}

	now := time.Now()
	text := caption
	if text == "" {
		text = "[" + mediaType + "]"
	}

	msg := &models.WhatsappMessage{
		ConversationID: conv.ID,
		OrgID:          orgID,
		RemoteMsgID:    remoteMsgID,
		Sender:         "me",
		Content:        text,
		MsgType:        "media",
		MediaURL:       mediaURL,
		MediaType:      mediaType,
		FromMe:         true,
		IsGroup:        conv.IsGroup,
		Status:         "sent",
		Reactions:      json.RawMessage("[]"),
		QuotedMsgID:    quotedMsgID,
		Timestamp:      now,
	}
	if err := s.repo.InsertMessage(ctx, msg); err != nil {
		log.Printf("[whatsapp] erro ao salvar msg de mídia: %v", err)
	}

	s.repo.UpsertConversationFromMe(ctx, &models.WhatsappConversation{
		OrgID: orgID, Jid: conv.Jid, Name: conv.Name, Phone: conv.Phone,
		IsGroup: conv.IsGroup, LastMessage: text, LastMessageAt: &now,
	})

	s.broadcastMessage(orgID, "message_sent", msg)
	return msg, nil
}

func (s *WhatsappService) SendReaction(ctx context.Context, orgID, conversationID, msgID, emoji string) error {
	conv, err := s.repo.FindConversationByJid(ctx, orgID, conversationID)
	if err != nil {
		return err
	}

	_, instanceName, err := s.repo.GetOrgInstance(ctx, orgID)
	if err != nil || instanceName == "" {
		return fmt.Errorf("WhatsApp não conectado")
	}

	return s.evolution.SendReaction(instanceName, conv.Jid, msgID, emoji)
}

func (s *WhatsappService) GetContacts(ctx context.Context, orgID string) ([]map[string]interface{}, error) {
	_, instanceName, err := s.repo.GetOrgInstance(ctx, orgID)
	if err != nil || instanceName == "" {
		return nil, fmt.Errorf("WhatsApp não conectado")
	}
	return s.evolution.GetContacts(instanceName)
}

func (s *WhatsappService) HandleWebhook(ctx context.Context, orgIDHint string, event *models.WhatsappWebhookEvent) {
	switch event.Event {
	case "messages.upsert":
		s.handleMessagesUpsert(ctx, orgIDHint, event)
	case "message-receipt.update":
		s.handleReceipt(ctx, orgIDHint, event)
	case "groups.update":
		s.handleGroupsUpdate(ctx, orgIDHint, event)
	case "connection.update":
		s.handleConnectionUpdate(ctx, orgIDHint, event)
	default:
		log.Printf("[whatsapp webhook] event ignored: %s", event.Event)
	}
}

func (s *WhatsappService) handleMessagesUpsert(ctx context.Context, orgIDHint string, event *models.WhatsappWebhookEvent) {
	orgID := orgIDHint
	if orgID == "" {
		return
	}

	data, _ := event.Data.(map[string]interface{})
	if data == nil {
		return
	}

	messages, _ := data["data"].([]interface{})
	if messages == nil {
		return
	}

	for _, rawMsg := range messages {
		m, _ := rawMsg.(map[string]interface{})
		if m == nil {
			continue
		}

		key, _ := m["key"].(map[string]interface{})
		if key == nil {
			continue
		}

		msgID, _ := key["id"].(string)
		isFromMe, _ := key["fromMe"].(bool)
		remoteJid, _ := key["remoteJid"].(string)

		if remoteJid == "" {
			continue
		}

		var content, mediaURL, mediaType, msgType string

		if msgContent, ok := m["message"].(map[string]interface{}); ok {
			if textMsg, ok := msgContent["conversation"].(string); ok {
				content = textMsg
				msgType = "text"
			} else if extText, ok := msgContent["extendedTextMessage"].(map[string]interface{}); ok {
				content, _ = extText["text"].(string)
				msgType = "text"
			} else if locMsg, ok := msgContent["locationMessage"].(map[string]interface{}); ok {
				lat, _ := locMsg["degreesLatitude"].(float64)
				lng, _ := locMsg["degreesLongitude"].(float64)
				content = fmt.Sprintf("[location:%.6f,%.6f]", lat, lng)
				msgType = "location"
			} else if contactMsg, ok := msgContent["contactMessage"].(map[string]interface{}); ok {
				displayName, _ := contactMsg["displayName"].(string)
				vcard, _ := contactMsg["vcard"].(string)
				content = fmt.Sprintf("[contact:%s]", displayName)
				if vcard != "" {
					content = fmt.Sprintf("[contact:%s|%s]", displayName, vcard)
				}
				msgType = "contact"
			} else if pollMsg, ok := msgContent["pollCreationMessage"].(map[string]interface{}); ok {
				pollName, _ := pollMsg["name"].(string)
				content = fmt.Sprintf("[poll:%s]", pollName)
				msgType = "poll"
			} else {
				mediaURL, mediaType = extractMediaFromMessage(msgContent)
				if mediaURL != "" {
					msgType = "media"
					content = "[" + mediaType + "]"
				}
			}
		}

		timestampMS, _ := m["messageTimestamp"].(float64)
		ts := time.Unix(int64(timestampMS), 0)
		if ts.IsZero() {
			ts = time.Now()
		}

		if isFromMe {
			s.handleOutgoingMirror(ctx, orgID, remoteJid, msgID, content, mediaURL, mediaType, msgType, ts)
		} else {
			s.handleIncoming(ctx, orgID, remoteJid, msgID, content, mediaURL, mediaType, msgType, ts, m)
		}
	}
}

func (s *WhatsappService) handleIncoming(ctx context.Context, orgID, remoteJid, msgID, content, mediaURL, mediaType, msgType string, ts time.Time, fullMsg map[string]interface{}) {
	senderName := ""
	sender := ""
	if pushName, ok := fullMsg["pushName"].(string); ok {
		senderName = pushName
	}

	conv, err := s.repo.FindConversationByJid(ctx, orgID, remoteJid)
	if err != nil {
		s.repo.UpsertConversation(ctx, &models.WhatsappConversation{
			OrgID: orgID, Jid: remoteJid, Name: senderName,
			Phone: jidToPhone(remoteJid), LastMessage: content, LastMessageAt: &ts,
		})
		conv, _ = s.repo.FindConversationByJid(ctx, orgID, remoteJid)
		if conv == nil {
			return
		}
	} else {
		s.repo.UpsertConversation(ctx, &models.WhatsappConversation{
			OrgID: orgID, Jid: remoteJid, Name: senderName, Phone: conv.Phone, IsGroup: conv.IsGroup,
			LastMessage: content, LastMessageAt: &ts,
		})
	}

	msg := &models.WhatsappMessage{
		ConversationID: conv.ID,
		OrgID:          orgID,
		RemoteMsgID:    msgID,
		Sender:         sender,
		SenderName:     senderName,
		Content:        content,
		MsgType:        msgType,
		MediaURL:       mediaURL,
		MediaType:      mediaType,
		FromMe:         false,
		IsGroup:        conv.IsGroup,
		Status:         "received",
		Reactions:      json.RawMessage("[]"),
		Timestamp:      ts,
	}

	if err := s.repo.InsertMessage(ctx, msg); err != nil {
		log.Printf("[whatsapp] erro ao salvar msg recebida: %v", err)
		return
	}

	s.broadcastNewMessage(orgID, remoteJid, msg)

	if conv.AssignedGuide != "" {
		notification := map[string]interface{}{
			"type":    "guide_notification",
			"jid":     remoteJid,
			"conv_id": conv.ID,
			"sender":  senderName,
			"content": content,
		}
		s.hub.BroadcastJSONToUser(conv.AssignedGuide, notification)
	}
}

func (s *WhatsappService) handleOutgoingMirror(ctx context.Context, orgID, remoteJid, msgID, content, mediaURL, mediaType, msgType string, ts time.Time) {
	conv, err := s.repo.FindConversationByJid(ctx, orgID, remoteJid)
	if err != nil {
		s.repo.UpsertConversationFromMe(ctx, &models.WhatsappConversation{
			OrgID: orgID, Jid: remoteJid, Phone: jidToPhone(remoteJid),
			LastMessage: content, LastMessageAt: &ts,
		})
		conv, _ = s.repo.FindConversationByJid(ctx, orgID, remoteJid)
		if conv == nil {
			return
		}
	}

	msg := &models.WhatsappMessage{
		ConversationID: conv.ID,
		OrgID:          orgID,
		RemoteMsgID:    msgID,
		Sender:         "me",
		Content:        content,
		MsgType:        msgType,
		MediaURL:       mediaURL,
		MediaType:      mediaType,
		FromMe:         true,
		Status:         "sent",
		Reactions:      json.RawMessage("[]"),
		Timestamp:      ts,
	}

	s.repo.InsertMessage(ctx, msg)
	s.broadcastNewMessage(orgID, remoteJid, msg)
}

func (s *WhatsappService) handleReceipt(ctx context.Context, orgID string, event *models.WhatsappWebhookEvent) {
	data, _ := event.Data.(map[string]interface{})
	if data == nil {
		return
	}
	key, _ := data["key"].(map[string]interface{})
	if key == nil {
		return
	}
	msgID, _ := key["id"].(string)
	status, _ := data["status"].(string)

	if msgID != "" && status != "" {
		if err := s.repo.UpdateMessageStatus(ctx, orgID, msgID, status); err != nil {
			log.Printf("[whatsapp] erro ao atualizar status: %v", err)
		}
		s.broadcastMessage(orgID, "message_status", map[string]string{
			"remote_msg_id": msgID,
			"status":        status,
		})
		log.Printf("[whatsapp] receipt: msgID=%s status=%s", msgID, status)
	}
}

func (s *WhatsappService) handleGroupsUpdate(ctx context.Context, orgID string, event *models.WhatsappWebhookEvent) {
	log.Printf("[whatsapp] groups.update event received")
}

func (s *WhatsappService) handleConnectionUpdate(ctx context.Context, orgID string, event *models.WhatsappWebhookEvent) {
	data, _ := event.Data.(map[string]interface{})
	if data == nil {
		return
	}
	state, _ := data["state"].(string)
	log.Printf("[whatsapp] connection.update: state=%s org=%s", state, orgID)
	s.broadcastMessage(orgID, "connection_update", map[string]string{"state": state})
}

func (s *WhatsappService) broadcastMessage(orgID, eventType string, payload interface{}) {
	if s.hub == nil {
		return
	}
	data, _ := json.Marshal(map[string]interface{}{
		"type":    eventType,
		"org_id":  orgID,
		"payload": payload,
	})
	s.hub.BroadcastToOrg(orgID, data)
}

func (s *WhatsappService) broadcastNewMessage(orgID, remoteJid string, msg *models.WhatsappMessage) {
	if s.hub == nil {
		return
	}
	data, _ := json.Marshal(map[string]interface{}{
		"type":    "new_message",
		"org_id":  orgID,
		"remote_jid": remoteJid,
		"payload": msg,
	})
	s.hub.BroadcastToOrg(orgID, data)
}

func extractMediaFromMessage(msg map[string]interface{}) (string, string) {
	if imgMsg, ok := msg["imageMessage"].(map[string]interface{}); ok {
		mime, _ := imgMsg["mimetype"].(string)
		if mime == "" {
			mime = "image/jpeg"
		}
		if url, ok := imgMsg["url"].(string); ok && url != "" {
			return url, mime
		}
		if b64, ok := msg["base64"].(string); ok && b64 != "" {
			return "data:" + mime + ";base64," + b64, mime
		}
		return "", mime
	}
	if vidMsg, ok := msg["videoMessage"].(map[string]interface{}); ok {
		mime, _ := vidMsg["mimetype"].(string)
		if mime == "" {
			mime = "video/mp4"
		}
		if url, ok := vidMsg["url"].(string); ok && url != "" {
			return url, mime
		}
		return "", mime
	}
	if audMsg, ok := msg["audioMessage"].(map[string]interface{}); ok {
		mime, _ := audMsg["mimetype"].(string)
		if mime == "" {
			mime = "audio/ogg"
		}
		if url, ok := audMsg["url"].(string); ok && url != "" {
			return url, mime
		}
		return "", mime
	}
	if docMsg, ok := msg["documentMessage"].(map[string]interface{}); ok {
		mime, _ := docMsg["mimetype"].(string)
		if mime == "" {
			mime = "application/octet-stream"
		}
		if url, ok := docMsg["url"].(string); ok && url != "" {
			return url, mime
		}
		return "", mime
	}
	return "", ""
}



func jidToPhone(jid string) string {
	parts := strings.Split(jid, "@")
	if len(parts) == 0 {
		return jid
	}
	phone := parts[0]
	if colonIdx := strings.Index(phone, ":"); colonIdx >= 0 {
		phone = phone[colonIdx+1:]
	}
	return phone
}

func (s *WhatsappService) ListNotes(ctx context.Context, orgID, conversationID string) ([]models.WhatsappNote, error) {
	return s.repo.ListNotes(ctx, orgID, conversationID)
}

func (s *WhatsappService) CreateNote(ctx context.Context, orgID, conversationID, userName string, content string) (*models.WhatsappNote, error) {
	return s.repo.CreateNote(ctx, orgID, conversationID, userName, content)
}

func (s *WhatsappService) UpdateMessageContent(ctx context.Context, orgID, remoteMsgID, newContent string) error {
	return s.repo.UpdateMessageContentByRemoteID(ctx, orgID, remoteMsgID, newContent)
}
