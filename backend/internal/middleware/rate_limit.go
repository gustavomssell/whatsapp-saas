package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/user/whatsapp-saas/internal/repository"
)

type RateLimiter struct {
	mu       sync.Mutex
	requests map[string][]time.Time
}

func NewRateLimiter() *RateLimiter {
	rl := &RateLimiter{
		requests: make(map[string][]time.Time),
	}
	go rl.cleanup()
	return rl
}

func (rl *RateLimiter) cleanup() {
	ticker := time.NewTicker(time.Minute)
	for range ticker.C {
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
	}
}

func (rl *RateLimiter) Allow(key string, limit int) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	window := time.Minute

	times := rl.requests[key]
	valid := times[:0]
	for _, t := range times {
		if now.Sub(t) < window {
			valid = append(valid, t)
		}
	}

	if len(valid) >= limit {
		return false
	}

	rl.requests[key] = append(valid, now)
	return true
}

func RateLimitByPlan(billing *repository.BillingRepo, rl *RateLimiter, action string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			orgID := GetOrgID(r.Context())
			if orgID == "" {
				next.ServeHTTP(w, r)
				return
			}

			sub, plan, err := billing.GetOrgSubscription(r.Context(), orgID)
			if err != nil || plan == nil {
				applyLimit(rl, orgID, action, 10, w, r, next)
				return
			}

			if sub.Status != "active" && sub.Status != "trialing" {
				applyLimit(rl, orgID, action, 10, w, r, next)
				return
			}

			limit := getRateLimitForPlan(plan.Name, action)
			applyLimit(rl, orgID, action, limit, w, r, next)
		})
	}
}

func applyLimit(rl *RateLimiter, orgID, action string, limit int, w http.ResponseWriter, r *http.Request, next http.Handler) {
	key := orgID + ":" + action
	if !rl.Allow(key, limit) {
		w.Header().Set("X-RateLimit-Limit", "exceeded")
		w.Header().Set("Retry-After", "60")
		http.Error(w, `{"error":"rate limit atingido. Tente novamente em 1 minuto."}`, http.StatusTooManyRequests)
		return
	}
	next.ServeHTTP(w, r)
}

func getRateLimitForPlan(planName, action string) int {
	limits := map[string]map[string]int{
		"free": {
			"send_message":   20,
			"upload":         5,
			"api_call":       30,
			"search":         10,
		},
		"starter": {
			"send_message":   60,
			"upload":         20,
			"api_call":       100,
			"search":         30,
		},
		"professional": {
			"send_message":   200,
			"upload":         50,
			"api_call":       300,
			"search":         100,
		},
		"enterprise": {
			"send_message":   1000,
			"upload":         200,
			"api_call":       1000,
			"search":         500,
		},
	}

	planLimits, ok := limits[planName]
	if !ok {
		planLimits = limits["free"]
	}

	limit, ok := planLimits[action]
	if !ok {
		return 30
	}
	return limit
}
