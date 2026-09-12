package handler

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestRespondJSON(t *testing.T) {
	h := &Handler{}
	w := httptest.NewRecorder()
	h.respondJSON(w, http.StatusOK, map[string]string{"status": "ok"})

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	if ct := w.Header().Get("Content-Type"); ct != "application/json" {
		t.Errorf("expected Content-Type application/json, got %s", ct)
	}

	var body map[string]string
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}
	if body["status"] != "ok" {
		t.Errorf("expected status=ok, got %s", body["status"])
	}
}

func TestRespondError(t *testing.T) {
	h := &Handler{}
	w := httptest.NewRecorder()
	h.respondError(w, http.StatusBadRequest, "invalid input")

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", w.Code)
	}

	var body map[string]string
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}
	if body["error"] != "invalid input" {
		t.Errorf("expected error=invalid input, got %s", body["error"])
	}
}

func TestRespondPaginated(t *testing.T) {
	h := &Handler{}
	data := []map[string]string{{"id": "1"}, {"id": "2"}}
	w := httptest.NewRecorder()
	h.respondPaginated(w, data, 10, 1, 2)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	var body struct {
		Data  []map[string]string `json:"data"`
		Total int                 `json:"total"`
		Page  int                 `json:"page"`
		Pages int                 `json:"total_pages"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}
	if body.Total != 10 {
		t.Errorf("expected total 10, got %d", body.Total)
	}
	if body.Page != 1 {
		t.Errorf("expected page 1, got %d", body.Page)
	}
	if body.Pages != 5 {
		t.Errorf("expected pages 5, got %d", body.Pages)
	}
	if len(body.Data) != 2 {
		t.Errorf("expected 2 items, got %d", len(body.Data))
	}
}

func TestParsePageParam(t *testing.T) {
	tests := []struct {
		url  string
		want int
	}{
		{"/conversations?page=1", 1},
		{"/conversations?page=5", 5},
		{"/conversations", 1},
		{"/conversations?page=abc", 1},
		{"/conversations?page=0", 1},
	}

	for _, tt := range tests {
		t.Run(tt.url, func(t *testing.T) {
			r := httptest.NewRequest(http.MethodGet, tt.url, nil)
			got := parsePageParam(r)
			if got != tt.want {
				t.Errorf("parsePageParam(%q) = %d, want %d", tt.url, got, tt.want)
			}
		})
	}
}

func TestParsePerPageParam(t *testing.T) {
	tests := []struct {
		url  string
		def  int
		want int
	}{
		{"/conversations?per_page=20", 50, 20},
		{"/conversations", 50, 50},
		{"/conversations?per_page=abc", 50, 50},
		{"/conversations?per_page=0", 50, 50},
		{"/conversations?per_page=100", 50, 100},
	}

	for _, tt := range tests {
		t.Run(tt.url, func(t *testing.T) {
			r := httptest.NewRequest(http.MethodGet, tt.url, nil)
			got := parsePerPageParam(r, tt.def)
			if got != tt.want {
				t.Errorf("parsePerPageParam(%q, %d) = %d, want %d", tt.url, tt.def, got, tt.want)
			}
		})
	}
}
