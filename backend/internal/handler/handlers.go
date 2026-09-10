package handler

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/websocket"
	"github.com/user/whatsapp-saas/internal/middleware"
	"github.com/user/whatsapp-saas/internal/models"
	"github.com/user/whatsapp-saas/internal/repository"
	"github.com/user/whatsapp-saas/internal/service"
	"github.com/user/whatsapp-saas/internal/socket"
)

type Handler struct {
	auth    *service.AuthService
	wa      *service.WhatsappService
	repo    *repository.WhatsappRepo
	billing *repository.BillingRepo
	upload  *service.UploadService
	hub     *socket.Hub
}

func NewHandler(auth *service.AuthService, wa *service.WhatsappService, repo *repository.WhatsappRepo, billing *repository.BillingRepo, upload *service.UploadService, hub *socket.Hub) *Handler {
	return &Handler{auth: auth, wa: wa, repo: repo, billing: billing, upload: upload, hub: hub}
}

func (h *Handler) respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func (h *Handler) respondError(w http.ResponseWriter, status int, msg string) {
	h.respondJSON(w, status, map[string]string{"error": msg})
}

func (h *Handler) respondPaginated(w http.ResponseWriter, data interface{}, total, page, perPage int) {
	h.respondJSON(w, http.StatusOK, map[string]interface{}{
		"data":       data,
		"total":      total,
		"page":       page,
		"per_page":   perPage,
		"total_pages": (total + perPage - 1) / perPage,
	})
}

func parsePageParam(r *http.Request) int {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	return page
}

func parsePerPageParam(r *http.Request, def int) int {
	pp, _ := strconv.Atoi(r.URL.Query().Get("per_page"))
	if pp < 1 {
		pp = def
	}
	return pp
}

// ── Auth ──────────────────────────────────────────────────────

func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Name     string `json:"name"`
		Email    string `json:"email"`
		Password string `json:"password"`
		OrgName  string `json:"org_name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Name == "" || body.Email == "" || body.Password == "" {
		h.respondError(w, http.StatusBadRequest, "nome, email e senha são obrigatórios")
		return
	}
	if body.OrgName == "" {
		body.OrgName = body.Name + "'s Workspace"
	}

	result, err := h.auth.Register(r.Context(), body.Name, body.Email, body.Password, body.OrgName)
	if err != nil {
		h.respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	h.respondJSON(w, http.StatusCreated, result)
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Email == "" || body.Password == "" {
		h.respondError(w, http.StatusBadRequest, "email e senha são obrigatórios")
		return
	}

	result, err := h.auth.Login(r.Context(), body.Email, body.Password)
	if err != nil {
		h.respondError(w, http.StatusUnauthorized, err.Error())
		return
	}
	h.respondJSON(w, http.StatusOK, result)
}

func (h *Handler) RefreshToken(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	token, err := h.auth.RefreshToken(r.Context(), userID)
	if err != nil {
		h.respondError(w, http.StatusUnauthorized, err.Error())
		return
	}
	h.respondJSON(w, http.StatusOK, map[string]string{"token": token})
}

func (h *Handler) GetProfile(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	orgID := middleware.GetOrgID(r.Context())
	h.respondJSON(w, http.StatusOK, map[string]string{"user_id": userID, "org_id": orgID})
}

// ── WhatsApp Connection ───────────────────────────────────────

func (h *Handler) WhatsAppConnect(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	var body struct {
		InstanceName string `json:"instance_name"`
		WebhookURL   string `json:"webhook_url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.InstanceName == "" {
		h.respondError(w, http.StatusBadRequest, "instance_name é obrigatório")
		return
	}

	qrCode, err := h.wa.Connect(r.Context(), orgID, body.InstanceName, body.WebhookURL)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, http.StatusOK, map[string]interface{}{
		"qr_code": qrCode,
		"message": "Conectando...",
	})
}

func (h *Handler) WhatsAppStatus(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	state, instanceName, err := h.wa.Status(r.Context(), orgID)
	if err != nil {
		h.respondJSON(w, http.StatusOK, map[string]interface{}{
			"status":        "error",
			"instance_name": instanceName,
			"error":         err.Error(),
		})
		return
	}
	h.respondJSON(w, http.StatusOK, map[string]interface{}{
		"status":        state,
		"instance_name": instanceName,
	})
}

func (h *Handler) WhatsAppDisconnect(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	if err := h.wa.Disconnect(r.Context(), orgID); err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, http.StatusOK, map[string]string{"message": "desconectado"})
}

func (h *Handler) WhatsAppContacts(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	query := r.URL.Query().Get("q")
	if query != "" {
		convs, err := h.repo.SearchConversations(r.Context(), orgID, query, 20)
		if err != nil {
			h.respondError(w, http.StatusInternalServerError, err.Error())
			return
		}
		h.respondJSON(w, http.StatusOK, map[string]interface{}{"data": convs})
		return
	}
	contacts, err := h.wa.GetContacts(r.Context(), orgID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, http.StatusOK, map[string]interface{}{"data": contacts})
}

// ── WhatsApp Inbox ────────────────────────────────────────────

func (h *Handler) ListConversations(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	page := parsePageParam(r)
	perPage := parsePerPageParam(r, 50)

	filters := models.ConversationFilters{
		Tag:        r.URL.Query().Get("tag"),
		Guide:      r.URL.Query().Get("guide"),
		UnreadOnly: r.URL.Query().Get("unread") == "true",
		Search:     r.URL.Query().Get("search"),
		Period:     r.URL.Query().Get("period"),
	}

	convs, total, err := h.repo.ListConversations(r.Context(), orgID, perPage, (page-1)*perPage, filters)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondPaginated(w, convs, total, page, perPage)
}

func (h *Handler) ListMessages(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	jid := chi.URLParam(r, "jid")
	if jid == "" {
		h.respondError(w, http.StatusBadRequest, "jid é obrigatório")
		return
	}

	conv, err := h.repo.FindConversationByJid(r.Context(), orgID, jid)
	if err != nil {
		h.respondError(w, http.StatusNotFound, "conversa não encontrada")
		return
	}

	msgs, err := h.repo.ListMessages(r.Context(), conv.ID, 200)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.repo.MarkAsRead(r.Context(), orgID, conv.ID)
	h.respondJSON(w, http.StatusOK, msgs)
}

func (h *Handler) SendMessage(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	jid := chi.URLParam(r, "jid")

	var body struct {
		Text        string `json:"text"`
		QuotedMsgID string `json:"quoted_msg_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Text == "" {
		h.respondError(w, http.StatusBadRequest, "text é obrigatório")
		return
	}

	msg, err := h.wa.SendMessage(r.Context(), orgID, jid, body.Text, body.QuotedMsgID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, http.StatusCreated, msg)
}

func (h *Handler) EditMessage(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())

	var body struct {
		MsgID string `json:"msg_id"`
		Text  string `json:"text"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.MsgID == "" || body.Text == "" {
		h.respondError(w, http.StatusBadRequest, "msg_id e text são obrigatórios")
		return
	}

	origMsg, err := h.repo.FindMessageByRemoteID(r.Context(), orgID, body.MsgID)
	if err != nil {
		h.respondError(w, http.StatusNotFound, "mensagem não encontrada")
		return
	}

	editEntry := map[string]interface{}{
		"old_content": origMsg.Content,
		"edited_at":   time.Now().UTC(),
	}

	var history []map[string]interface{}
	if len(origMsg.EditHistory) > 0 {
		json.Unmarshal(origMsg.EditHistory, &history)
	}
	history = append(history, editEntry)
	historyBytes, _ := json.Marshal(history)

	err = h.repo.UpdateMessageContent(r.Context(), orgID, body.MsgID, body.Text, historyBytes)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	origMsg.Content = body.Text
	origMsg.IsEdited = true
	origMsg.EditHistory = historyBytes
	h.respondJSON(w, http.StatusOK, origMsg)
}

// ── Upload ────────────────────────────────────────────────────

func (h *Handler) SendMedia(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	jid := chi.URLParam(r, "jid")

	var body struct {
		MediaURL    string `json:"media_url"`
		MediaType   string `json:"media_type"`
		FileName    string `json:"file_name"`
		Caption     string `json:"caption"`
		QuotedMsgID string `json:"quoted_msg_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.MediaURL == "" {
		h.respondError(w, http.StatusBadRequest, "media_url é obrigatório")
		return
	}

	msg, err := h.wa.SendMedia(r.Context(), orgID, jid, body.MediaURL, body.MediaType, body.FileName, body.Caption, body.QuotedMsgID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, http.StatusCreated, msg)
}

func (h *Handler) SendReaction(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	jid := chi.URLParam(r, "jid")

	var body struct {
		MsgID string `json:"msg_id"`
		Emoji string `json:"emoji"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.MsgID == "" || body.Emoji == "" {
		h.respondError(w, http.StatusBadRequest, "msg_id e emoji são obrigatórios")
		return
	}

	if err := h.wa.SendReaction(r.Context(), orgID, jid, body.MsgID, body.Emoji); err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, http.StatusOK, map[string]string{"message": "reação enviada"})
}

func (h *Handler) ArchiveConversation(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	jid := chi.URLParam(r, "jid")
	conv, err := h.repo.FindConversationByJid(r.Context(), orgID, jid)
	if err != nil {
		h.respondError(w, http.StatusNotFound, "conversa não encontrada")
		return
	}
	h.repo.ArchiveConversation(r.Context(), orgID, conv.ID)
	h.respondJSON(w, http.StatusOK, map[string]string{"message": "arquivada"})
}

func (h *Handler) UnarchiveConversation(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	jid := chi.URLParam(r, "jid")
	conv, err := h.repo.FindConversationByJid(r.Context(), orgID, jid)
	if err != nil {
		h.respondError(w, http.StatusNotFound, "conversa não encontrada")
		return
	}
	h.repo.UnarchiveConversation(r.Context(), orgID, conv.ID)
	h.respondJSON(w, http.StatusOK, map[string]string{"message": "desarquivada"})
}

func (h *Handler) AssignGuide(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	jid := chi.URLParam(r, "jid")
	var body struct {
		Guide string `json:"guide"`
	}
	json.NewDecoder(r.Body).Decode(&body)
	conv, err := h.repo.FindConversationByJid(r.Context(), orgID, jid)
	if err != nil {
		h.respondError(w, http.StatusNotFound, "conversa não encontrada")
		return
	}
	h.repo.AssignGuide(r.Context(), orgID, conv.ID, body.Guide)
	h.respondJSON(w, http.StatusOK, map[string]string{"message": "guia atribuído"})
}

func (h *Handler) UpdateTags(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	jid := chi.URLParam(r, "jid")
	var body struct {
		Tags []string `json:"tags"`
	}
	json.NewDecoder(r.Body).Decode(&body)
	conv, err := h.repo.FindConversationByJid(r.Context(), orgID, jid)
	if err != nil {
		h.respondError(w, http.StatusNotFound, "conversa não encontrada")
		return
	}
	h.repo.UpdateTags(r.Context(), orgID, conv.ID, body.Tags)
	h.respondJSON(w, http.StatusOK, map[string]string{"message": "tags atualizadas"})
}

func (h *Handler) PinConversation(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	jid := chi.URLParam(r, "jid")
	var body struct {
		Pinned bool `json:"pinned"`
	}
	json.NewDecoder(r.Body).Decode(&body)
	conv, err := h.repo.FindConversationByJid(r.Context(), orgID, jid)
	if err != nil {
		h.respondError(w, http.StatusNotFound, "conversa não encontrada")
		return
	}
	h.repo.PinConversation(r.Context(), orgID, conv.ID, body.Pinned)
	h.respondJSON(w, http.StatusOK, map[string]string{"message": "ok"})
}

func (h *Handler) BulkActions(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	var body struct {
		Action          string   `json:"action"`
		ConversationIDs []string `json:"conversation_ids"`
		Tag             string   `json:"tag"`
		Guide           string   `json:"guide"`
	}
	json.NewDecoder(r.Body).Decode(&body)

	switch body.Action {
	case "archive":
		h.repo.BulkArchive(r.Context(), orgID, body.ConversationIDs)
	case "tag":
		if body.Tag != "" {
			h.repo.BulkTag(r.Context(), orgID, body.ConversationIDs, body.Tag)
		}
	case "assign":
		if body.Guide != "" {
			h.repo.BulkAssignGuide(r.Context(), orgID, body.ConversationIDs, body.Guide)
		}
	}
	h.respondJSON(w, http.StatusOK, map[string]string{"message": "ação aplicada"})
}

// ── Upload ────────────────────────────────────────────────────

func (h *Handler) UploadMedia(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(int64(h.upload.GetMaxSize())); err != nil {
		h.respondError(w, http.StatusBadRequest, "arquivo inválido")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		h.respondError(w, http.StatusBadRequest, "file é obrigatório")
		return
	}
	defer file.Close()

	url, err := h.upload.SaveFile(file, header)
	if err != nil {
		h.respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	mimeType := header.Header.Get("Content-Type")
	if mimeType == "" {
		mimeType = "application/octet-stream"
	}

	h.respondJSON(w, http.StatusOK, map[string]string{
		"url":      url,
		"fileName": header.Filename,
		"mimeType": mimeType,
	})
}

// ── Webhook ───────────────────────────────────────────────────

func (h *Handler) WebhookHandler(w http.ResponseWriter, r *http.Request) {
	var event models.WhatsappWebhookEvent
	if err := json.NewDecoder(r.Body).Decode(&event); err != nil {
		http.Error(w, "invalid payload", http.StatusBadRequest)
		return
	}

	instanceName := ""
	if event.InstanceID != "" {
		instanceName = event.InstanceID
	}

	orgID := ""
	if instanceName != "" {
		var err error
		orgID, err = h.repo.FindOrgByInstanceName(r.Context(), instanceName)
		if err != nil {
			log.Printf("[webhook] org not found for instance %s", instanceName)
			h.respondJSON(w, http.StatusOK, map[string]string{"status": "ignored"})
			return
		}
	}

	h.wa.HandleWebhook(r.Context(), orgID, &event)
	h.respondJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// ── Quick Replies ─────────────────────────────────────────────

func (h *Handler) ListQuickReplies(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	qrs, err := h.repo.ListQuickReplies(r.Context(), orgID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, http.StatusOK, qrs)
}

func (h *Handler) CreateQuickReply(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	var qr models.WhatsappQuickReply
	if err := json.NewDecoder(r.Body).Decode(&qr); err != nil {
		h.respondError(w, http.StatusBadRequest, "payload inválido")
		return
	}
	qr.OrgID = orgID
	if err := h.repo.CreateQuickReply(r.Context(), &qr); err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, http.StatusCreated, qr)
}

func (h *Handler) DeleteQuickReply(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	qrID := chi.URLParam(r, "qrId")
	if err := h.repo.DeleteQuickReply(r.Context(), orgID, qrID); err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, http.StatusOK, map[string]string{"message": "deletado"})
}

// ── Delete Message ────────────────────────────────────────────

func (h *Handler) DeleteMessage(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	remoteMsgID := chi.URLParam(r, "msgId")
	var body struct {
		ForEveryone bool `json:"for_everyone"`
	}
	json.NewDecoder(r.Body).Decode(&body)

	deletedFor := "me"
	if body.ForEveryone {
		deletedFor = "everyone"
	}

	if err := h.repo.DeleteMessage(r.Context(), orgID, remoteMsgID, deletedFor); err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, http.StatusOK, map[string]string{"message": "deletado"})
}

// ── Forward Message ──────────────────────────────────────────

func (h *Handler) ForwardMessage(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	jid := chi.URLParam(r, "jid")

	var body struct {
		MsgID string `json:"msg_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.MsgID == "" {
		h.respondError(w, http.StatusBadRequest, "msg_id é obrigatório")
		return
	}

	origMsg, err := h.repo.FindMessageByRemoteID(r.Context(), orgID, body.MsgID)
	if err != nil {
		h.respondError(w, http.StatusNotFound, "mensagem não encontrada")
		return
	}

	conv, err := h.repo.FindConversationByJid(r.Context(), orgID, jid)
	if err != nil {
		h.respondError(w, http.StatusNotFound, "conversa de destino não encontrada")
		return
	}

	_, instanceName, err := h.repo.GetOrgInstance(r.Context(), orgID)
	if err != nil || instanceName == "" {
		h.respondError(w, http.StatusBadRequest, "WhatsApp não conectado")
		return
	}

	text := origMsg.Content
	if text == "" {
		text = "[" + origMsg.MsgType + "]"
	}

	msg, err := h.wa.SendMessage(r.Context(), orgID, jid, text, "")
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	_ = conv
	_ = instanceName
	h.respondJSON(w, http.StatusCreated, msg)
}

// ── Search Messages ──────────────────────────────────────────

func (h *Handler) SearchMessages(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	jid := chi.URLParam(r, "jid")
	query := r.URL.Query().Get("q")

	if query == "" {
		h.respondError(w, http.StatusBadRequest, "q é obrigatório")
		return
	}

	conv, err := h.repo.FindConversationByJid(r.Context(), orgID, jid)
	if err != nil {
		h.respondError(w, http.StatusNotFound, "conversa não encontrada")
		return
	}

	msgs, err := h.repo.SearchMessages(r.Context(), conv.ID, query, 50)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, http.StatusOK, msgs)
}

func (h *Handler) AutoArchive(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())

	var body struct {
		InactiveDays int `json:"inactive_days"`
	}
	json.NewDecoder(r.Body).Decode(&body)
	if body.InactiveDays <= 0 {
		body.InactiveDays = 30
	}

	count, err := h.repo.ArchiveInactiveConversations(r.Context(), orgID, body.InactiveDays)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, http.StatusOK, map[string]interface{}{
		"archived": count,
		"days":     body.InactiveDays,
	})
}

// ── Tag Colors ────────────────────────────────────────────────

func (h *Handler) GetTagColors(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	colors, err := h.repo.GetTagColors(r.Context(), orgID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, http.StatusOK, colors)
}

func (h *Handler) SetTagColor(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	var body struct {
		Tag   string `json:"tag"`
		Color string `json:"color"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Tag == "" {
		h.respondError(w, http.StatusBadRequest, "tag e color sao obrigatorios")
		return
	}
	if err := h.repo.SetTagColor(r.Context(), orgID, body.Tag, body.Color); err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, http.StatusOK, map[string]string{"message": "cor definida"})
}

func (h *Handler) DeleteTagColor(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	tag := chi.URLParam(r, "tag")
	if err := h.repo.DeleteTagColor(r.Context(), orgID, tag); err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, http.StatusOK, map[string]string{"message": "cor removida"})
}

// ── Groups ────────────────────────────────────────────────────

func (h *Handler) ListGroups(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	groups, err := h.repo.ListGroups(r.Context(), orgID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, http.StatusOK, groups)
}

func (h *Handler) ListGroupMessages(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	groupJid := chi.URLParam(r, "groupJid")

	group, err := h.repo.FindGroupByJid(r.Context(), orgID, groupJid)
	if err != nil {
		h.respondError(w, http.StatusNotFound, "grupo não encontrado")
		return
	}

	msgs, err := h.repo.ListGroupMessages(r.Context(), group.ID, 200)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, http.StatusOK, msgs)
}

// ── Notes ────────────────────────────────────────────────────

func (h *Handler) ListNotes(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	convJid := chi.URLParam(r, "convJid")
	notes, err := h.repo.ListNotes(r.Context(), orgID, convJid)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, http.StatusOK, notes)
}

func (h *Handler) CreateNote(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	convJid := chi.URLParam(r, "convJid")
	var note struct {
		UserName string `json:"user_name"`
		Content  string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&note); err != nil {
		h.respondError(w, http.StatusBadRequest, "payload inválido")
		return
	}
	n, err := h.repo.CreateNote(r.Context(), orgID, convJid, note.UserName, note.Content)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, http.StatusCreated, n)
}

// ── Dashboard ─────────────────────────────────────────────────

func (h *Handler) DashboardStats(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	stats, err := h.repo.DashboardStats(r.Context(), orgID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, http.StatusOK, stats)
}

func (h *Handler) DashboardChart(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	days := 7
	if d := r.URL.Query().Get("days"); d != "" {
		fmt.Sscanf(d, "%d", &days)
	}
	if days < 1 || days > 30 {
		days = 7
	}

	type ChartPoint struct {
		Date     string `json:"date"`
		Sent     int    `json:"sent"`
		Received int    `json:"received"`
	}
	var chart []ChartPoint

	rows, err := h.repo.DB().Query(r.Context(),
		`SELECT DATE(timestamp) as d,
		        COUNT(*) FILTER (WHERE from_me = TRUE) as sent,
		        COUNT(*) FILTER (WHERE from_me = FALSE) as received
		 FROM whatsapp_messages
		 WHERE org_id = $1 AND timestamp >= NOW() - INTERVAL '1 day' * $2
		 GROUP BY d ORDER BY d`, orgID, days,
	)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()

	for rows.Next() {
		var p ChartPoint
		rows.Scan(&p.Date, &p.Sent, &p.Received)
		chart = append(chart, p)
	}
	h.respondJSON(w, http.StatusOK, map[string]interface{}{"data": chart})
}

// ── WebSocket ─────────────────────────────────────────────────

var wsUpgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

func (h *Handler) WebSocketHandler(w http.ResponseWriter, r *http.Request) {
	token := r.URL.Query().Get("token")
	if token == "" {
		http.Error(w, "token required", http.StatusUnauthorized)
		return
	}

	orgID, userID, err := validateTokenForWSUser(token, h.auth)
	if err != nil {
		http.Error(w, "invalid token", http.StatusUnauthorized)
		return
	}

	conn, err := wsUpgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[ws] upgrade error: %v", err)
		return
	}

	ch := make(chan []byte, 256)
	h.hub.Register(orgID, ch)
	h.hub.RegisterUser(userID, ch)
	defer func() {
		h.hub.Unregister(orgID, ch)
		h.hub.UnregisterUser(userID, ch)
		conn.Close()
	}()

	go func() {
		for {
			if _, _, err := conn.ReadMessage(); err != nil {
				break
			}
		}
	}()

	for msg := range ch {
		if err := conn.WriteMessage(websocket.TextMessage, msg); err != nil {
			break
		}
	}
}

func validateTokenForWS(token string, auth *service.AuthService) (string, error) {
	t, err := jwt.Parse(token, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return []byte(auth.GetJWTSecret()), nil
	})
	if err != nil || !t.Valid {
		return "", fmt.Errorf("invalid token")
	}
	claims, ok := t.Claims.(jwt.MapClaims)
	if !ok {
		return "", fmt.Errorf("invalid claims")
	}
	orgID, _ := claims["org_id"].(string)
	if orgID == "" {
		return "", fmt.Errorf("org_id not found in token")
	}
	return orgID, nil
}

func validateTokenForWSUser(token string, auth *service.AuthService) (string, string, error) {
	t, err := jwt.Parse(token, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return []byte(auth.GetJWTSecret()), nil
	})
	if err != nil || !t.Valid {
		return "", "", fmt.Errorf("invalid token")
	}
	claims, ok := t.Claims.(jwt.MapClaims)
	if !ok {
		return "", "", fmt.Errorf("invalid claims")
	}
	orgID, _ := claims["org_id"].(string)
	userID, _ := claims["user_id"].(string)
	if orgID == "" || userID == "" {
		return "", "", fmt.Errorf("org_id or user_id not found in token")
	}
	return orgID, userID, nil
}

func (h *Handler) SendMediaDirect(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(int64(h.upload.GetMaxSize())); err != nil {
		h.respondError(w, http.StatusBadRequest, "arquivo inválido")
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		h.respondError(w, http.StatusBadRequest, "file é obrigatório")
		return
	}
	defer file.Close()

	url, err := h.upload.SaveFile(file, header)
	if err != nil {
		h.respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	mimeType := header.Header.Get("Content-Type")
	if mimeType == "" {
		mimeType = "application/octet-stream"
	}

	h.respondJSON(w, http.StatusOK, map[string]string{
		"url":      url,
		"fileName": header.Filename,
		"mimeType": mimeType,
	})
}

// ── Members ─────────────────────────────────────────────────

func (h *Handler) ListMembers(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	rows, err := h.repo.DB().Query(r.Context(),
		`SELECT u.id, u.name, u.email, u.role, u.avatar
		 FROM users u
		 JOIN organization_members om ON om.user_id = u.id
		 WHERE om.org_id = $1 ORDER BY u.name`, orgID,
	)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()

	type Member struct {
		ID    string `json:"id"`
		Name  string `json:"name"`
		Email string `json:"email"`
		Role  string `json:"role"`
		Avatar string `json:"avatar"`
	}
	var members []Member
	for rows.Next() {
		var m Member
		rows.Scan(&m.ID, &m.Name, &m.Email, &m.Role, &m.Avatar)
		members = append(members, m)
	}
	h.respondJSON(w, http.StatusOK, map[string]interface{}{"data": members})
}
