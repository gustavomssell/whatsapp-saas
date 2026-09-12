package service

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestEvolutionClient_CreateInstance(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Errorf("expected POST, got %s", r.Method)
		}
		if r.URL.Path != "/instance/create" {
			t.Errorf("expected /instance/create, got %s", r.URL.Path)
		}
		if r.Header.Get("apikey") != "test-key" {
			t.Errorf("expected apikey header, got %s", r.Header.Get("apikey"))
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"instance": map[string]interface{}{
				"instanceName": "test-instance",
				"instanceID":   "abc-123",
			},
		})
	}))
	defer server.Close()

	client := &EvolutionClient{
		baseURL:    server.URL,
		apiKey:     "test-key",
		httpClient: server.Client(),
	}

	resp, err := client.CreateInstance("test-instance", "http://webhook.url")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Instance.InstanceName != "test-instance" {
		t.Errorf("expected instanceName test-instance, got %s", resp.Instance.InstanceName)
	}
	if resp.Instance.InstanceID != "abc-123" {
		t.Errorf("expected instanceID abc-123, got %s", resp.Instance.InstanceID)
	}
}

func TestEvolutionClient_GetInstanceStatus(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/instance/test-name/connect" {
			t.Errorf("unexpected path: %s", r.URL.Path)
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"state": "open",
		})
	}))
	defer server.Close()

	client := &EvolutionClient{
		baseURL:    server.URL,
		apiKey:     "test-key",
		httpClient: server.Client(),
	}

	state, err := client.GetInstanceStatus("test-name")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if state != "open" {
		t.Errorf("expected state open, got %s", state)
	}
}

func TestEvolutionClient_SendMessage(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Errorf("expected POST, got %s", r.Method)
		}
		if r.URL.Path != "/instance/my-inst/sendText" {
			t.Errorf("unexpected path: %s", r.URL.Path)
		}

		var body map[string]interface{}
		json.NewDecoder(r.Body).Decode(&body)
		if body["number"] != "5511999999999" {
			t.Errorf("expected number 5511999999999, got %v", body["number"])
		}
		if body["text"] != "hello world" {
			t.Errorf("expected text hello world, got %v", body["text"])
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"key": map[string]interface{}{
				"id": "msg-123",
			},
		})
	}))
	defer server.Close()

	client := &EvolutionClient{
		baseURL:    server.URL,
		apiKey:     "test-key",
		httpClient: server.Client(),
	}

	msgID, err := client.SendMessage("my-inst", "5511999999999", "hello world")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if msgID != "msg-123" {
		t.Errorf("expected msgID msg-123, got %s", msgID)
	}
}

func TestEvolutionClient_DisconnectInstance(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodDelete {
			t.Errorf("expected DELETE, got %s", r.Method)
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	client := &EvolutionClient{
		baseURL:    server.URL,
		apiKey:     "test-key",
		httpClient: server.Client(),
	}

	err := client.DisconnectInstance("my-inst")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestEvolutionClient_GetContacts(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/instance/my-inst/chat/findContacts" {
			t.Errorf("unexpected path: %s", r.URL.Path)
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]map[string]interface{}{
			{"id": "contact-1", "name": "John"},
			{"id": "contact-2", "name": "Jane"},
		})
	}))
	defer server.Close()

	client := &EvolutionClient{
		baseURL:    server.URL,
		apiKey:     "test-key",
		httpClient: server.Client(),
	}

	contacts, err := client.GetContacts("my-inst")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(contacts) != 2 {
		t.Errorf("expected 2 contacts, got %d", len(contacts))
	}
}

func TestMediaTypeToEvolution(t *testing.T) {
	tests := []struct {
		input string
		want  string
	}{
		{"image/jpeg", "image"},
		{"image/png", "image"},
		{"video/mp4", "video"},
		{"audio/mpeg", "audio"},
		{"audio/ogg", "audio"},
		{"application/pdf", "document"},
		{"text/plain", "document"},
		{"unknown/type", "document"},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			got := mediaTypeToEvolution(tt.input)
			if got != tt.want {
				t.Errorf("mediaTypeToEvolution(%q) = %q, want %q", tt.input, got, tt.want)
			}
		})
	}
}

func TestEvolutionClient_ErrorResponse(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"message":"internal error"}`))
	}))
	defer server.Close()

	client := &EvolutionClient{
		baseURL:    server.URL,
		apiKey:     "test-key",
		httpClient: server.Client(),
	}

	_, err := client.GetInstanceStatus("test")
	if err == nil {
		t.Error("expected error for 500 response")
	}
}
