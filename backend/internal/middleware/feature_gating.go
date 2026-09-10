package middleware

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/user/whatsapp-saas/internal/models"
	"github.com/user/whatsapp-saas/internal/repository"
)

const PlanInfoKey contextKey = "plan_info"

func RequireFeature(billing *repository.BillingRepo, feature string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			orgID := GetOrgID(r.Context())
			if orgID == "" {
				http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
				return
			}

			sub, plan, err := billing.GetOrgSubscription(r.Context(), orgID)
			if err != nil || plan == nil {
				if feature == "basic_chat" {
					next.ServeHTTP(w, r)
					return
				}
				http.Error(w, `{"error":"plano não encontrado. Faça upgrade para acessar este recurso."}`, http.StatusForbidden)
				return
			}

			if sub.Status != "active" && sub.Status != "trialing" {
				http.Error(w, `{"error":"assinatura inativa. Regularize para acessar este recurso."}`, http.StatusPaymentRequired)
				return
			}

			var features []string
			json.Unmarshal(plan.Features, &features)

			hasFeature := false
			for _, f := range features {
				if f == feature {
					hasFeature = true
					break
				}
			}

			if !hasFeature {
				http.Error(w, `{"error":"recurso não disponível no seu plano. Faça upgrade para acessar."}`, http.StatusForbidden)
				return
			}

			info := &models.OrgPlanInfo{
				Plan:         *plan,
				Subscription: *sub,
			}
			ctx := context.WithValue(r.Context(), PlanInfoKey, info)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func RequirePlanLevel(billing *repository.BillingRepo, minLevel string) func(http.Handler) http.Handler {
	levels := map[string]int{
		"free":         0,
		"starter":      1,
		"professional": 2,
		"enterprise":   3,
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			orgID := GetOrgID(r.Context())
			if orgID == "" {
				http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
				return
			}

			sub, plan, err := billing.GetOrgSubscription(r.Context(), orgID)
			if err != nil || plan == nil {
				http.Error(w, `{"error":"plano não encontrado"}`, http.StatusForbidden)
				return
			}

			if sub.Status != "active" && sub.Status != "trialing" {
				http.Error(w, `{"error":"assinatura inativa"}`, http.StatusPaymentRequired)
				return
			}

			currentLevel, ok1 := levels[plan.Name]
			requiredLevel, ok2 := levels[minLevel]
			if !ok1 || !ok2 || currentLevel < requiredLevel {
				http.Error(w, `{"error":"recurso requer plano "+`+minLevel+`. Faça upgrade."}`, http.StatusForbidden)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func CheckLimit(billing *repository.BillingRepo, metric string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			orgID := GetOrgID(r.Context())
			if orgID == "" {
				next.ServeHTTP(w, r)
				return
			}

			sub, plan, err := billing.GetOrgSubscription(r.Context(), orgID)
			if err != nil || plan == nil {
				next.ServeHTTP(w, r)
				return
			}

			if sub.Status != "active" && sub.Status != "trialing" {
				next.ServeHTTP(w, r)
				return
			}

			ctx := r.Context()
			period := ctx.Value("period")
			if period == nil {
				next.ServeHTTP(w, r)
				return
			}

			usage, err := billing.GetOrgUsage(ctx, orgID, period.(string))
			if err != nil || usage == nil {
				next.ServeHTTP(w, r)
				return
			}

			limit := getLimitForMetric(plan, metric)
			if limit < 0 {
				next.ServeHTTP(w, r)
				return
			}

			used := getUsageForMetric(usage, metric)
			if used >= limit {
				http.Error(w, `{"error":"limite do plano atingido para este recurso. Faça upgrade."}`, http.StatusTooManyRequests)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func getLimitForMetric(plan *models.Plan, metric string) int {
	switch metric {
	case "conversations":
		return plan.MaxConversations
	case "messages":
		return plan.MaxMessagesMonth
	case "members":
		return plan.MaxMembers
	case "quick_replies":
		return plan.MaxQuickReplies
	case "groups":
		return plan.MaxGroups
	default:
		return -1
	}
}

func getUsageForMetric(usage *models.UsageTracking, metric string) int {
	switch metric {
	case "conversations":
		return usage.ConversationsActive
	case "messages":
		return usage.MessagesSent
	case "members":
		return usage.MembersCount
	default:
		return 0
	}
}

func GetPlanInfo(ctx context.Context) *models.OrgPlanInfo {
	if info, ok := ctx.Value(PlanInfoKey).(*models.OrgPlanInfo); ok {
		return info
	}
	return nil
}

func HasFeature(features json.RawMessage, feature string) bool {
	var featureList []string
	json.Unmarshal(features, &featureList)
	for _, f := range featureList {
		if f == feature {
			return true
		}
	}
	return false
}

func ParseFeatureList(features json.RawMessage) []string {
	var featureList []string
	json.Unmarshal(features, &featureList)
	return featureList
}

func FeatureEnabled(features json.RawMessage, feature string) bool {
	for _, f := range strings.Split(string(features), ",") {
		if strings.TrimSpace(f) == feature {
			return true
		}
	}
	return false
}
