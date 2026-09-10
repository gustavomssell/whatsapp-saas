package handler

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/user/whatsapp-saas/internal/middleware"
	"github.com/user/whatsapp-saas/internal/models"
)

func generateAPIKey() (string, string, string) {
	bytes := make([]byte, 32)
	rand.Read(bytes)
	fullKey := "wps_" + hex.EncodeToString(bytes)
	hash := sha256.Sum256([]byte(fullKey))
	hashHex := hex.EncodeToString(hash[:])
	prefix := fullKey[:7]
	return fullKey, hashHex, prefix
}

func (h *Handler) CreateAPIKey(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())

	var body struct {
		Name        string   `json:"name"`
		Permissions []string `json:"permissions"`
		RateLimit   int      `json:"rate_limit"`
		ExpiresIn   int      `json:"expires_in_days"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Name == "" {
		h.respondError(w, http.StatusBadRequest, "name é obrigatório")
		return
	}

	_, plan, _ := h.billing.GetOrgSubscription(r.Context(), orgID)
	if plan != nil && plan.Name != "enterprise" {
		h.respondError(w, http.StatusForbidden, "API keys disponíveis apenas no plano Empresarial")
		return
	}

	if body.Permissions == nil {
		body.Permissions = []string{"read"}
	}
	if body.RateLimit <= 0 {
		body.RateLimit = 100
	}

	fullKey, hashHex, prefix := generateAPIKey()
	perms, _ := json.Marshal(body.Permissions)

	key := &models.APIKey{
		OrgID:       orgID,
		Name:        body.Name,
		KeyHash:     hashHex,
		KeyPrefix:   prefix,
		Permissions: perms,
		RateLimit:   body.RateLimit,
		IsActive:    true,
	}
	if body.ExpiresIn > 0 {
		exp := time.Now().AddDate(0, 0, body.ExpiresIn)
		key.ExpiresAt = &exp
	}

	if err := h.billing.CreateAPIKey(r.Context(), key); err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.respondJSON(w, http.StatusCreated, map[string]interface{}{
		"id":         key.ID,
		"name":       key.Name,
		"api_key":    fullKey,
		"key_prefix": prefix,
		"message":    " guarde esta chave. Ela não será exibida novamente.",
	})
}

func (h *Handler) ListAPIKeys(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())

	keys, err := h.billing.ListAPIKeys(r.Context(), orgID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, http.StatusOK, keys)
}

func (h *Handler) DeleteAPIKey(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	keyID := chi.URLParam(r, "keyID")

	if err := h.billing.DeleteAPIKey(r.Context(), orgID, keyID); err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, http.StatusOK, map[string]string{"message": "chave deletada"})
}

func (h *Handler) APIKeyAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		apiKey := r.Header.Get("X-API-Key")
		if apiKey == "" {
			http.Error(w, `{"error":"X-API-Key header required"}`, http.StatusUnauthorized)
			return
		}

		hash := sha256.Sum256([]byte(apiKey))
		hashHex := hex.EncodeToString(hash[:])

		key, orgID, err := h.billing.ValidateAPIKey(r.Context(), hashHex)
		if err != nil {
			http.Error(w, `{"error":"api key inválida ou expirada"}`, http.StatusUnauthorized)
			return
		}

		ctx := middleware.WithOrgID(r.Context(), orgID)
		ctx = middleware.WithUserID(ctx, key.ID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (h *Handler) ListPlans(w http.ResponseWriter, r *http.Request) {
	plans, err := h.billing.GetPlans(r.Context())
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, http.StatusOK, plans)
}

func (h *Handler) GetOrgPlan(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())

	sub, plan, err := h.billing.GetOrgSubscription(r.Context(), orgID)
	if err != nil {
		plan, _ = h.billing.GetPlanByName(r.Context(), "free")
		if plan == nil {
			h.respondError(w, http.StatusNotFound, "plano não encontrado")
			return
		}
		sub = &models.Subscription{
			OrgID:  orgID,
			PlanID: plan.ID,
			Status: "active",
		}
	}

	period := time.Now().Format("2006-01")
	usage, _ := h.billing.GetOrgUsage(r.Context(), orgID, period)
	if usage == nil {
		usage = &models.UsageTracking{OrgID: orgID, Period: period}
	}

	info := models.OrgPlanInfo{
		Plan:         *plan,
		Subscription: *sub,
		Usage:        *usage,
	}
	h.respondJSON(w, http.StatusOK, info)
}

func (h *Handler) SubscribePlan(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())

	var body struct {
		PlanName      string `json:"plan_name"`
		BillingCycle  string `json:"billing_cycle"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.PlanName == "" {
		h.respondError(w, http.StatusBadRequest, "plan_name é obrigatório")
		return
	}
	if body.BillingCycle == "" {
		body.BillingCycle = "monthly"
	}

	plan, err := h.billing.GetPlanByName(r.Context(), body.PlanName)
	if err != nil {
		h.respondError(w, http.StatusNotFound, "plano não encontrado")
		return
	}

	existing, _, _ := h.billing.GetOrgSubscription(r.Context(), orgID)
	if existing != nil && existing.Status == "active" {
		existing.PlanID = plan.ID
		existing.BillingCycle = body.BillingCycle
		now := time.Now()
		periodEnd := now.AddDate(0, 1, 0)
		if body.BillingCycle == "yearly" {
			periodEnd = now.AddDate(1, 0, 0)
		}
		existing.CurrentPeriodEnd = &periodEnd
		h.billing.UpdateSubscription(r.Context(), existing)
		h.respondJSON(w, http.StatusOK, existing)
		return
	}

	now := time.Now()
	periodEnd := now.AddDate(0, 1, 0)
	if body.BillingCycle == "yearly" {
		periodEnd = now.AddDate(1, 0, 0)
	}

	sub := &models.Subscription{
		OrgID:              orgID,
		PlanID:             plan.ID,
		Status:             "active",
		BillingCycle:       body.BillingCycle,
		CurrentPeriodStart: now,
		CurrentPeriodEnd:   &periodEnd,
	}
	if err := h.billing.CreateSubscription(r.Context(), sub); err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, http.StatusCreated, sub)
}

func (h *Handler) CancelSubscription(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())

	sub, _, err := h.billing.GetOrgSubscription(r.Context(), orgID)
	if err != nil {
		h.respondError(w, http.StatusNotFound, "assinatura não encontrada")
		return
	}

	now := time.Now()
	sub.Status = "cancelled"
	sub.CancelledAt = &now
	h.billing.UpdateSubscription(r.Context(), sub)

	h.respondJSON(w, http.StatusOK, map[string]string{"message": "assinatura cancelada"})
}

func (h *Handler) GetUsage(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	period := r.URL.Query().Get("period")
	if period == "" {
		period = time.Now().Format("2006-01")
	}

	usage, err := h.billing.GetOrgUsage(r.Context(), orgID, period)
	if err != nil {
		usage = &models.UsageTracking{OrgID: orgID, Period: period}
	}
	h.respondJSON(w, http.StatusOK, usage)
}

func (h *Handler) GetInvoices(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())

	invoices, err := h.billing.GetOrgInvoices(r.Context(), orgID, 20)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, http.StatusOK, invoices)
}

func (h *Handler) CreateInvoice(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())

	var body struct {
		Amount       float64 `json:"amount"`
		Description  string  `json:"description"`
		PaymentMethod string `json:"payment_method"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Amount <= 0 {
		h.respondError(w, http.StatusBadRequest, "amount é obrigatório e deve ser > 0")
		return
	}

	sub, _, _ := h.billing.GetOrgSubscription(r.Context(), orgID)
	dueDate := time.Now().AddDate(0, 0, 7)

	inv := &models.Invoice{
		OrgID:          orgID,
		Amount:         body.Amount,
		Currency:       "BRL",
		Status:         "pending",
		PaymentMethod:  body.PaymentMethod,
		Description:    body.Description,
		DueDate:        &dueDate,
	}
	if sub != nil {
		inv.SubscriptionID = sub.ID
	}

	if err := h.billing.CreateInvoice(r.Context(), inv); err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, http.StatusCreated, inv)
}
