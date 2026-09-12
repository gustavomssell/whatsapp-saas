package socket

import (
	"encoding/json"
	"testing"
	"time"
)

func TestNewHub(t *testing.T) {
	hub := NewHub()
	if hub == nil {
		t.Fatal("expected non-nil hub")
	}
}

func TestRegisterAndUnregister(t *testing.T) {
	hub := NewHub()
	ch := make(chan []byte, 1)

	hub.Register("org-1", ch)
	if len(hub.clients["org-1"]) != 1 {
		t.Fatal("expected 1 client for org-1")
	}

	hub.Unregister("org-1", ch)
	if len(hub.clients["org-1"]) != 0 {
		t.Fatal("expected 0 clients after unregister")
	}
}

func TestRegisterUserAndUnregisterUser(t *testing.T) {
	hub := NewHub()
	ch := make(chan []byte, 1)

	hub.RegisterUser("user-1", ch)
	if len(hub.userClients["user-1"]) != 1 {
		t.Fatal("expected 1 user client")
	}

	hub.UnregisterUser("user-1", ch)
	if len(hub.userClients["user-1"]) != 0 {
		t.Fatal("expected 0 user clients after unregister")
	}
}

func TestBroadcastToOrg(t *testing.T) {
	hub := NewHub()
	ch1 := make(chan []byte, 1)
	ch2 := make(chan []byte, 1)
	data := []byte(`{"type":"test","message":"hello"}`)

	hub.Register("org-1", ch1)
	hub.Register("org-1", ch2)
	hub.BroadcastToOrg("org-1", data)

	select {
	case msg := <-ch1:
		if string(msg) != string(data) {
			t.Errorf("ch1 received %q, want %q", msg, data)
		}
	case <-time.After(100 * time.Millisecond):
		t.Error("timeout waiting for ch1")
	}

	select {
	case msg := <-ch2:
		if string(msg) != string(data) {
			t.Errorf("ch2 received %q, want %q", msg, data)
		}
	case <-time.After(100 * time.Millisecond):
		t.Error("timeout waiting for ch2")
	}
}

func TestBroadcastToUser(t *testing.T) {
	hub := NewHub()
	ch := make(chan []byte, 1)
	data := []byte(`{"type":"notification"}`)

	hub.RegisterUser("user-1", ch)
	hub.BroadcastToUser("user-1", data)

	select {
	case msg := <-ch:
		if string(msg) != string(data) {
			t.Errorf("received %q, want %q", msg, data)
		}
	case <-time.After(100 * time.Millisecond):
		t.Error("timeout waiting for message")
	}
}

func TestBroadcastToOrg_IgnoresOtherOrgs(t *testing.T) {
	hub := NewHub()
	ch1 := make(chan []byte, 1)
	ch2 := make(chan []byte, 1)
	data := []byte(`{"type":"org1-only"}`)

	hub.Register("org-1", ch1)
	hub.Register("org-2", ch2)
	hub.BroadcastToOrg("org-1", data)

	select {
	case msg := <-ch1:
		if string(msg) != string(data) {
			t.Errorf("ch1 received %q, want %q", msg, data)
		}
	case <-time.After(100 * time.Millisecond):
		t.Error("timeout waiting for ch1")
	}

	select {
	case <-ch2:
		t.Error("ch2 should not have received a message")
	case <-time.After(100 * time.Millisecond):
		// expected
	}
}

func TestBroadcastJSON(t *testing.T) {
	hub := NewHub()
	ch := make(chan []byte, 1)

	type TestPayload struct {
		Type    string `json:"type"`
		Message string `json:"message"`
	}

	hub.Register("org-1", ch)
	hub.BroadcastJSON("org-1", TestPayload{Type: "test", Message: "hello"})

	select {
	case msg := <-ch:
		var payload TestPayload
		if err := json.Unmarshal(msg, &payload); err != nil {
			t.Fatalf("failed to unmarshal: %v", err)
		}
		if payload.Type != "test" || payload.Message != "hello" {
			t.Errorf("unexpected payload: %+v", payload)
		}
	case <-time.After(100 * time.Millisecond):
		t.Error("timeout waiting for message")
	}
}
