package service

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"
)

type EvolutionClient struct {
	baseURL    string
	apiKey     string
	httpClient *http.Client
}

func NewEvolutionClient(baseURL, apiKey string) *EvolutionClient {
	return &EvolutionClient{
		baseURL: strings.TrimSuffix(baseURL, "/"),
		apiKey:  apiKey,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

func (c *EvolutionClient) doRequest(method, path string, body []byte) (*http.Response, []byte, error) {
	url := c.baseURL + path
	var bodyReader io.Reader
	if body != nil {
		bodyReader = bytes.NewReader(body)
	}

	req, err := http.NewRequest(method, url, bodyReader)
	if err != nil {
		return nil, nil, fmt.Errorf("erro ao criar requisição: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("apikey", c.apiKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, nil, fmt.Errorf("erro ao enviar requisição: %w", err)
	}

	respBody, _ := io.ReadAll(resp.Body)
	resp.Body.Close()

	if resp.StatusCode >= 300 {
		var apiErr struct {
			Status  int    `json:"status"`
			Message string `json:"message"`
		}
		if err := json.Unmarshal(respBody, &apiErr); err == nil && apiErr.Message != "" {
			return resp, respBody, fmt.Errorf("evolution API error %d: %s", resp.StatusCode, apiErr.Message)
		}
		return resp, respBody, fmt.Errorf("evolution API error %d: %s", resp.StatusCode, string(respBody))
	}

	return resp, respBody, nil
}

func (c *EvolutionClient) DoInstanceRequest(method, instanceName, path string, body []byte) (*http.Response, []byte, error) {
	fullPath := fmt.Sprintf("/instance/%s%s", instanceName, path)
	return c.doRequest(method, fullPath, body)
}

func (c *EvolutionClient) DoMessageRequest(method, instanceName, path string, body []byte) (*http.Response, []byte, error) {
	fullPath := fmt.Sprintf("/message/%s/%s", path, instanceName)
	return c.doRequest(method, fullPath, body)
}

func (c *EvolutionClient) DoChatRequest(method, instanceName, path string, body []byte) (*http.Response, []byte, error) {
	fullPath := fmt.Sprintf("/chat/%s/%s", path, instanceName)
	return c.doRequest(method, fullPath, body)
}

func (c *EvolutionClient) DoGroupRequest(method, instanceName, path string, body []byte) (*http.Response, []byte, error) {
	fullPath := fmt.Sprintf("/group/%s/%s", path, instanceName)
	return c.doRequest(method, fullPath, body)
}

type CreateInstanceReq struct {
	InstanceName string `json:"instanceName"`
	WebhookURL   string `json:"webhook_url"`
}

type CreateInstanceResp struct {
	Instance struct {
		InstanceName string `json:"instanceName"`
		InstanceID   string `json:"instanceId"`
	} `json:"instance"`
	QrCode string `json:"qrcode"`
}

func (c *EvolutionClient) CreateInstance(instanceName, webhookURL string) (*CreateInstanceResp, error) {
	body, _ := json.Marshal(map[string]interface{}{
		"instanceName": instanceName,
		"webhook": map[string]interface{}{
			"enabled": true,
			"url":     webhookURL,
			"events": []string{
				"messages.upsert",
				"message-receipt.update",
				"groups.update",
				"connection.update",
				"contacts.upsert",
			},
		},
	})

	_, respBody, err := c.doRequest("POST", "/instance/create", body)
	if err != nil {
		return nil, err
	}

	var result CreateInstanceResp
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("erro ao decodificar resposta: %w", err)
	}
	return &result, nil
}

func (c *EvolutionClient) GetInstanceStatus(instanceName string) (string, error) {
	_, body, err := c.DoInstanceRequest("GET", instanceName, "/connectionState", nil)
	if err != nil {
		return "", err
	}

	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		return "", err
	}

	if state, ok := result["state"].(string); ok {
		return state, nil
	}
	return "unknown", nil
}

func (c *EvolutionClient) GetQRCode(instanceName string) (string, error) {
	_, body, err := c.DoInstanceRequest("GET", instanceName, "/connect", nil)
	if err != nil {
		return "", err
	}

	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		return "", err
	}

	if b64, ok := result["base64"].(string); ok {
		return b64, nil
	}
	if qr, ok := result["qrcode"].(string); ok {
		return qr, nil
	}
	return "", nil
}

func (c *EvolutionClient) DisconnectInstance(instanceName string) error {
	_, _, err := c.DoInstanceRequest("GET", instanceName, "/logout", nil)
	return err
}

func (c *EvolutionClient) DeleteInstance(instanceName string) error {
	_, _, err := c.DoInstanceRequest("DELETE", instanceName, "/delete", nil)
	return err
}

func (c *EvolutionClient) ListInstances() ([]map[string]interface{}, error) {
	_, body, err := c.doRequest("GET", "/instance/fetchInstances", nil)
	if err != nil {
		return nil, err
	}
	var instances []map[string]interface{}
	if err := json.Unmarshal(body, &instances); err != nil {
		return nil, err
	}
	return instances, nil
}

func (c *EvolutionClient) SendMessage(instanceName, number, text string) (string, error) {
	payload := map[string]interface{}{
		"number": number,
		"text":   text,
	}
	body, _ := json.Marshal(payload)
	_, respBody, err := c.DoMessageRequest("POST", instanceName, "sendText", body)
	if err != nil {
		return "", err
	}
	return extractMsgID(respBody), nil
}

func (c *EvolutionClient) SendMedia(instanceName, number, url, mediaType, filename, caption, quotedMsgID string) (string, error) {
	payload := map[string]interface{}{
		"number":   number,
		"url":      url,
		"type":     mediaType,
		"filename": filename,
		"caption":  caption,
	}
	if quotedMsgID != "" {
		payload["quoted"] = map[string]interface{}{"messageId": quotedMsgID, "participant": number}
	}
	body, _ := json.Marshal(payload)
	_, respBody, err := c.DoMessageRequest("POST", instanceName, "sendMedia", body)
	if err != nil {
		return "", err
	}
	return extractMsgID(respBody), nil
}

func (c *EvolutionClient) SendWhatsAppAudio(instanceName, number, audioURL string) (string, error) {
	payload := map[string]interface{}{
		"number": number,
		"audio":  audioURL,
	}
	body, _ := json.Marshal(payload)
	_, respBody, err := c.DoMessageRequest("POST", instanceName, "sendWhatsAppAudio", body)
	if err != nil {
		return "", err
	}
	return extractMsgID(respBody), nil
}

func (c *EvolutionClient) SendReaction(instanceName, number, msgID, emoji string) error {
	payload := map[string]interface{}{
		"number":   number,
		"id":       msgID,
		"reaction": emoji,
		"fromMe":   false,
	}
	body, _ := json.Marshal(payload)
	_, _, err := c.DoMessageRequest("POST", instanceName, "sendReaction", body)
	return err
}

func (c *EvolutionClient) SendPresence(instanceName, number, presence string) error {
	payload := map[string]interface{}{
		"number":   number,
		"presence": presence,
	}
	body, _ := json.Marshal(payload)
	_, _, err := c.DoMessageRequest("POST", instanceName, "presence", body)
	return err
}

func (c *EvolutionClient) DeleteMessage(instanceName, msgID, remoteJid string, fromMe bool) error {
	payload := map[string]interface{}{
		"id":        msgID,
		"remoteJid": remoteJid,
		"fromMe":    fromMe,
	}
	body, _ := json.Marshal(payload)
	_, _, err := c.DoChatRequest("DELETE", instanceName, "deleteMessage", body)
	return err
}

func (c *EvolutionClient) UpdateMessage(instanceName, remoteJid, msgID, newText string) error {
	payload := map[string]interface{}{
		"remoteJid": remoteJid,
		"key": map[string]interface{}{
			"id":     msgID,
			"fromMe": true,
		},
		"text": newText,
	}
	body, _ := json.Marshal(payload)
	_, _, err := c.DoChatRequest("PUT", instanceName, "updateMessage", body)
	return err
}

func (c *EvolutionClient) MarkAsRead(instanceName, remoteJid, msgID string, fromMe bool) error {
	payload := map[string]interface{}{
		"readMessages": []map[string]interface{}{
			{
				"remoteJid": remoteJid,
				"fromMe":    fromMe,
				"id":        msgID,
			},
		},
	}
	body, _ := json.Marshal(payload)
	_, _, err := c.DoChatRequest("PUT", instanceName, "markAsRead", body)
	return err
}

func (c *EvolutionClient) ArchiveChat(instanceName, chatJID string, archive bool) error {
	payload := map[string]interface{}{
		"chat":    chatJID,
		"archive": archive,
	}
	body, _ := json.Marshal(payload)
	_, _, err := c.DoChatRequest("PUT", instanceName, "archiveChat", body)
	return err
}

func (c *EvolutionClient) FetchProfile(instanceName, number string) (map[string]interface{}, error) {
	_, body, err := c.DoChatRequest("GET", instanceName, "fetchProfile/"+number, nil)
	if err != nil {
		return nil, err
	}
	var profile map[string]interface{}
	if err := json.Unmarshal(body, &profile); err != nil {
		return nil, err
	}
	return profile, nil
}

func (c *EvolutionClient) HasWhatsApp(instanceName string, numbers []string) ([]map[string]interface{}, error) {
	payload := map[string]interface{}{
		"numbers": numbers,
	}
	body, _ := json.Marshal(payload)
	_, respBody, err := c.DoChatRequest("POST", instanceName, "hasWhatsapp", body)
	if err != nil {
		return nil, err
	}
	var results []map[string]interface{}
	if err := json.Unmarshal(respBody, &results); err != nil {
		return nil, err
	}
	return results, nil
}

func (c *EvolutionClient) GetContacts(instanceName string) ([]map[string]interface{}, error) {
	_, body, err := c.DoChatRequest("GET", instanceName, "findContacts", nil)
	if err != nil {
		return nil, err
	}
	var contacts []map[string]interface{}
	if err := json.Unmarshal(body, &contacts); err != nil {
		return nil, err
	}
	return contacts, nil
}

func (c *EvolutionClient) FindMessages(instanceName, remoteJid string) ([]map[string]interface{}, error) {
	payload := map[string]interface{}{
		"where": map[string]interface{}{
			"key": map[string]interface{}{
				"remoteJid": remoteJid,
			},
		},
	}
	body, _ := json.Marshal(payload)
	_, respBody, err := c.DoChatRequest("POST", instanceName, "findMessages", body)
	if err != nil {
		return nil, err
	}
	var messages []map[string]interface{}
	if err := json.Unmarshal(respBody, &messages); err != nil {
		return nil, err
	}
	return messages, nil
}

func (c *EvolutionClient) GetGroups(instanceName string) ([]map[string]interface{}, error) {
	_, body, err := c.DoGroupRequest("GET", instanceName, "fetchAllGroups", nil)
	if err != nil {
		return nil, err
	}
	var groups []map[string]interface{}
	if err := json.Unmarshal(body, &groups); err != nil {
		return nil, err
	}
	return groups, nil
}

func (c *EvolutionClient) CreateGroup(instanceName, subject, description string, participants []string) (map[string]interface{}, error) {
	payload := map[string]interface{}{
		"subject":      subject,
		"description": description,
		"participants": participants,
	}
	body, _ := json.Marshal(payload)
	_, respBody, err := c.DoGroupRequest("POST", instanceName, "createGroup", body)
	if err != nil {
		return nil, err
	}
	var result map[string]interface{}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, err
	}
	return result, nil
}

func (c *EvolutionClient) UpdateGroupParticipant(instanceName, groupJid, action string, participants []string) error {
	payload := map[string]interface{}{
		"action":      action,
		"participants": participants,
	}
	body, _ := json.Marshal(payload)
	_, _, err := c.DoGroupRequest("PUT", instanceName, "updateParticipant/"+groupJid, body)
	return err
}

func (c *EvolutionClient) FetchGroupInviteCode(instanceName, groupJid string) (string, error) {
	_, body, err := c.DoGroupRequest("GET", instanceName, "fetchInviteCode/"+groupJid, nil)
	if err != nil {
		return "", err
	}
	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		return "", err
	}
	if code, ok := result["inviteCode"].(string); ok {
		return code, nil
	}
	return "", nil
}

func (c *EvolutionClient) UpdateWebhook(instanceName, webhookURL string) error {
	payload := map[string]interface{}{
		"webhook": map[string]interface{}{
			"enabled": true,
			"url":     webhookURL,
			"events": []string{
				"messages.upsert",
				"message-receipt.update",
				"groups.update",
				"connection.update",
				"contacts.upsert",
			},
		},
	}
	body, _ := json.Marshal(payload)
	_, _, err := c.DoInstanceRequest("PATCH", instanceName, "/webhook/set", body)
	return err
}

func extractMsgID(respBody []byte) string {
	var result map[string]interface{}
	if err := json.Unmarshal(respBody, &result); err != nil {
		log.Printf("[evolution] could not parse response: %s", string(respBody))
		return ""
	}
	if key, ok := result["key"].(map[string]interface{}); ok {
		if id, ok := key["id"].(string); ok {
			return id
		}
	}
	if id, ok := result["id"].(string); ok {
		return id
	}
	if msgID, ok := result["msgId"].(string); ok {
		return msgID
	}
	log.Printf("[evolution] could not extract msgID from: %s", string(respBody))
	return ""
}

func mediaTypeToEvolution(mediaType string) string {
	switch {
	case strings.HasPrefix(mediaType, "image/"):
		return "image"
	case strings.HasPrefix(mediaType, "video/"):
		return "video"
	case strings.HasPrefix(mediaType, "audio/"):
		return "audio"
	default:
		return "document"
	}
}
