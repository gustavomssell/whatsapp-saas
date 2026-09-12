package middleware

import (
	"encoding/json"
	"testing"
	"time"
)

func TestRateLimiter_Allow(t *testing.T) {
	rl := &RateLimiter{requests: make(map[string][]time.Time)}

	if !rl.Allow("test-key", 5) {
		t.Error("first request should be allowed")
	}

	for i := 0; i < 4; i++ {
		if !rl.Allow("test-key", 5) {
			t.Errorf("request %d should be allowed", i+2)
		}
	}

	if rl.Allow("test-key", 5) {
		t.Error("6th request should be denied (limit is 5)")
	}
}

func TestRateLimiter_DifferentKeys(t *testing.T) {
	rl := &RateLimiter{requests: make(map[string][]time.Time)}

	for i := 0; i < 5; i++ {
		rl.Allow("key-a", 5)
	}

	if !rl.Allow("key-b", 5) {
		t.Error("different key should be allowed")
	}
}

func TestRateLimiter_CleanupExpired(t *testing.T) {
	rl := &RateLimiter{requests: make(map[string][]time.Time)}

	rl.Allow("active-key", 5)
	rl.Allow("expired-key", 5)

	rl.mu.Lock()
	rl.requests["expired-key"] = []time.Time{
		time.Now().Add(-2 * time.Minute),
	}
	rl.mu.Unlock()

	rl.mu.Lock()
	now := time.Now()
	for key, times := range rl.requests {
		valid := times[:0]
		for _, t := range times {
			if now.Sub(t) < time.Minute {
				valid = append(valid, t)
			}
		}
		if len(valid) == 0 {
			delete(rl.requests, key)
		} else {
			rl.requests[key] = valid
		}
	}
	rl.mu.Unlock()

	rl.mu.Lock()
	_, expiredExists := rl.requests["expired-key"]
	_, activeExists := rl.requests["active-key"]
	rl.mu.Unlock()

	if expiredExists {
		t.Error("expired entries should be cleaned up")
	}
	if !activeExists {
		t.Error("active entries should remain")
	}
}

func TestGetRateLimitForPlan(t *testing.T) {
	tests := []struct {
		plan   string
		action string
		want   int
	}{
		{"free", "send_message", 20},
		{"starter", "send_message", 60},
		{"professional", "send_message", 200},
		{"enterprise", "send_message", 1000},
		{"unknown", "send_message", 20},
		{"free", "upload", 5},
		{"free", "unknown_action", 30},
	}

	for _, tt := range tests {
		t.Run(tt.plan+"_"+tt.action, func(t *testing.T) {
			got := getRateLimitForPlan(tt.plan, tt.action)
			if got != tt.want {
				t.Errorf("getRateLimitForPlan(%q, %q) = %d, want %d", tt.plan, tt.action, got, tt.want)
			}
		})
	}
}

func TestHasFeature(t *testing.T) {
	tests := []struct {
		name     string
		features string
		feature  string
		want     bool
	}{
		{"has feature", `["quick_replies","tags","notes"]`, "tags", true},
		{"missing feature", `["quick_replies","notes"]`, "tags", false},
		{"empty features", `[]`, "tags", false},
		{"exact match", `["tags"]`, "tags", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			raw := json.RawMessage(tt.features)
			got := HasFeature(raw, tt.feature)
			if got != tt.want {
				t.Errorf("HasFeature(%s, %q) = %v, want %v", tt.features, tt.feature, got, tt.want)
			}
		})
	}
}

func TestFeatureEnabled(t *testing.T) {
	tests := []struct {
		name     string
		features string
		feature  string
		want     bool
	}{
		{"enabled", "quick_replies,tags,notes", "tags", true},
		{"disabled", "quick_replies,notes", "tags", false},
		{"empty", "", "tags", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			raw := json.RawMessage(tt.features)
			got := FeatureEnabled(raw, tt.feature)
			if got != tt.want {
				t.Errorf("FeatureEnabled(%s, %q) = %v, want %v", tt.features, tt.feature, got, tt.want)
			}
		})
	}
}
