package service

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
)

type EvolutionClient struct {
	baseURL    string
	apiKey     string
	httpClient *http.Client
}

func NewEvolutionClient(baseURL, apiKey string) *EvolutionClient {
	return &EvolutionClient{
		baseURL:    strings.TrimSuffix(baseURL, "/"),
		apiKey:     apiKey,
		httpClient: &http.Client{},
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

	return resp, respBody, nil
}

func (c *EvolutionClient) DoInstanceRequest(method, instanceName, path string, body []byte) (*http.Response, []byte, error) {
 fullPath := fmt.Sprintf("/instance/%s%s", instanceName, path)
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
			"enabled":  true,
			"url":      webhookURL,
			"events":   []string{"messages.upsert", "message-receipt.update", "groups.update", "connection.update"},
		},
	})

	resp, respBody, err := c.doRequest("POST", "/instance/create", body)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode >= 300 {
		return nil, fmt.Errorf("evolution API error %d: %s", resp.StatusCode, string(respBody))
	}

	var result CreateInstanceResp
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("erro ao decodificar resposta: %w", err)
	}
	return &result, nil
}

func (c *EvolutionClient) GetInstanceStatus(instanceName string) (string, error) {
	resp, body, err := c.DoInstanceRequest("GET", instanceName, "/connect", nil)
	if err != nil {
		return "", err
	}
	if resp.StatusCode >= 300 {
		return "", fmt.Errorf("status error %d: %s", resp.StatusCode, string(body))
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
	resp, body, err := c.DoInstanceRequest("GET", instanceName, "/connect", nil)
	if err != nil {
		return "", err
	}
	if resp.StatusCode >= 300 {
		return "", fmt.Errorf("qrcode error %d: %s", resp.StatusCode, string(body))
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
	resp, body, err := c.DoInstanceRequest("DELETE", instanceName, "/connect", nil)
	if err != nil {
		return err
	}
	if resp.StatusCode >= 300 {
		return fmt.Errorf("disconnect error %d: %s", resp.StatusCode, string(body))
	}
	return nil
}

func (c *EvolutionClient) SendMessage(instanceName, number, text string) (string, error) {
	payload := map[string]interface{}{
		"number": number,
		"text":   text,
	}
	body, _ := json.Marshal(payload)
	resp, respBody, err := c.DoInstanceRequest("POST", instanceName, "/sendText", body)
	if err != nil {
		return "", err
	}
	if resp.StatusCode >= 300 {
		return "", fmt.Errorf("send error %d: %s", resp.StatusCode, string(respBody))
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
	resp, respBody, err := c.DoInstanceRequest("POST", instanceName, "/sendMedia", body)
	if err != nil {
		return "", err
	}
	if resp.StatusCode >= 300 {
		return "", fmt.Errorf("send media error %d: %s", resp.StatusCode, string(respBody))
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
	resp, respBody, err := c.DoInstanceRequest("POST", instanceName, "/sendReaction", body)
	if err != nil {
		return err
	}
	if resp.StatusCode >= 300 {
		return fmt.Errorf("reaction error %d: %s", resp.StatusCode, string(respBody))
	}
	return nil
}

func (c *EvolutionClient) GetContacts(instanceName string) ([]map[string]interface{}, error) {
	resp, body, err := c.DoInstanceRequest("GET", instanceName, "/chat/findContacts", nil)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode >= 300 {
		return nil, fmt.Errorf("contacts error %d: %s", resp.StatusCode, string(body))
	}
	var contacts []map[string]interface{}
	if err := json.Unmarshal(body, &contacts); err != nil {
		return nil, err
	}
	return contacts, nil
}

func (c *EvolutionClient) GetGroups(instanceName string) ([]map[string]interface{}, error) {
	resp, body, err := c.DoInstanceRequest("GET", instanceName, "/group/fetchAllGroups", nil)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode >= 300 {
		return nil, fmt.Errorf("groups error %d: %s", resp.StatusCode, string(body))
	}
	var groups []map[string]interface{}
	if err := json.Unmarshal(body, &groups); err != nil {
		return nil, err
	}
	return groups, nil
}

func (c *EvolutionClient) UpdateWebhook(instanceName, webhookURL string) error {
	payload := map[string]interface{}{
		"webhook": map[string]interface{}{
			"enabled": true,
			"url":     webhookURL,
			"events":  []string{"messages.upsert", "message-receipt.update", "groups.update", "connection.update"},
		},
	}
	body, _ := json.Marshal(payload)
	resp, respBody, err := c.DoInstanceRequest("PATCH", instanceName, "/webhook/set", body)
	if err != nil {
		return err
	}
	if resp.StatusCode >= 300 {
		return fmt.Errorf("webhook error %d: %s", resp.StatusCode, string(respBody))
	}
	return nil
}

func extractMsgID(respBody []byte) string {
	var result map[string]interface{}
	if err := json.Unmarshal(respBody, &result); err != nil {
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
