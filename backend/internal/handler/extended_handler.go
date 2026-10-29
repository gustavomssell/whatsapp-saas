package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/user/whatsapp-saas/internal/middleware"
	"github.com/user/whatsapp-saas/internal/models"
)

// ── Groups Management ─────────────────────────────────────────

func (h *Handler) UpdateGroup(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	groupJid := chi.URLParam(r, "groupJid")

	var body struct {
		Subject     string `json:"subject"`
		Description string `json:"description"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		h.respondError(w, http.StatusBadRequest, "dados inválidos")
		return
	}

	if err := h.repo.UpdateGroup(r.Context(), orgID, groupJid, body.Subject, body.Description); err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, http.StatusOK, map[string]string{"message": "grupo atualizado"})
}

func (h *Handler) DeleteGroup(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	groupJid := chi.URLParam(r, "groupJid")

	if err := h.repo.DeleteGroup(r.Context(), orgID, groupJid); err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, http.StatusOK, map[string]string{"message": "grupo excluído"})
}

func (h *Handler) GetGroupInviteLink(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	groupJid := chi.URLParam(r, "groupJid")

	_, instanceName, err := h.repo.GetOrgInstance(r.Context(), orgID)
	if err != nil || instanceName == "" {
		h.respondError(w, http.StatusBadRequest, "WhatsApp não conectado")
		return
	}

	resp, body, err := h.wa.GetEvolutionClient().DoGroupRequest("GET", instanceName, "fetchInviteCode/"+groupJid, nil)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if resp.StatusCode >= 300 {
		h.respondError(w, http.StatusInternalServerError, string(body))
		return
	}

	var result map[string]interface{}
	json.Unmarshal(body, &result)
	h.respondJSON(w, http.StatusOK, result)
}

// ── Profile ───────────────────────────────────────────────────

func (h *Handler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	var body struct {
		Name  string `json:"name"`
		Email string `json:"email"`
		Phone string `json:"phone"`
		Avatar string `json:"avatar"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		h.respondError(w, http.StatusBadRequest, "dados inválidos")
		return
	}

	if err := h.repo.UpdateUserProfile(r.Context(), userID, body.Name, body.Email, body.Phone, body.Avatar); err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.repo.CreateAuditLog(r.Context(), &models.AuditLog{
		OrgID:      middleware.GetOrgID(r.Context()),
		UserID:     userID,
		Action:     "update_profile",
		EntityType: "user",
		EntityID:   userID,
		Details:    json.RawMessage(`{"name":"` + body.Name + `","email":"` + body.Email + `"}`),
	})

	h.respondJSON(w, http.StatusOK, map[string]string{"message": "perfil atualizado"})
}

func (h *Handler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	var body struct {
		CurrentPassword string `json:"current_password"`
		NewPassword     string `json:"new_password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		h.respondError(w, http.StatusBadRequest, "dados inválidos")
		return
	}
	if body.NewPassword == "" || len(body.NewPassword) < 6 {
		h.respondError(w, http.StatusBadRequest, "nova senha deve ter pelo menos 6 caracteres")
		return
	}

	user, err := h.repo.GetUserByID(r.Context(), userID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if !h.auth.CheckPassword(body.CurrentPassword, user.PasswordHash) {
		h.respondError(w, http.StatusUnauthorized, "senha atual incorreta")
		return
	}

	newHash, err := h.auth.HashPassword(body.NewPassword)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if err := h.repo.UpdateUserPassword(r.Context(), userID, newHash); err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.repo.CreateAuditLog(r.Context(), &models.AuditLog{
		OrgID:      middleware.GetOrgID(r.Context()),
		UserID:     userID,
		Action:     "change_password",
		EntityType: "user",
		EntityID:   userID,
	})

	h.respondJSON(w, http.StatusOK, map[string]string{"message": "senha alterada"})
}

// ── Members Management ────────────────────────────────────────

func (h *Handler) ListOrgMembers(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	members, err := h.repo.ListOrgMembers(r.Context(), orgID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, http.StatusOK, members)
}

func (h *Handler) UpdateMemberRole(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	memberID := chi.URLParam(r, "memberId")

	var body struct {
		Role string `json:"role"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		h.respondError(w, http.StatusBadRequest, "dados inválidos")
		return
	}
	if body.Role != "owner" && body.Role != "admin" && body.Role != "member" {
		h.respondError(w, http.StatusBadRequest, "role inválido")
		return
	}

	if err := h.repo.UpdateMemberRole(r.Context(), orgID, memberID, body.Role); err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.repo.CreateAuditLog(r.Context(), &models.AuditLog{
		OrgID:      orgID,
		UserID:     middleware.GetUserID(r.Context()),
		Action:     "update_member_role",
		EntityType: "member",
		EntityID:   memberID,
		Details:    json.RawMessage(`{"role":"` + body.Role + `"}`),
	})

	h.respondJSON(w, http.StatusOK, map[string]string{"message": "função atualizada"})
}

func (h *Handler) RemoveMember(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	memberID := chi.URLParam(r, "memberId")

	if memberID == middleware.GetUserID(r.Context()) {
		h.respondError(w, http.StatusBadRequest, "não é possível remover a si mesmo")
		return
	}

	if err := h.repo.RemoveMember(r.Context(), orgID, memberID); err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.repo.CreateAuditLog(r.Context(), &models.AuditLog{
		OrgID:      orgID,
		UserID:     middleware.GetUserID(r.Context()),
		Action:     "remove_member",
		EntityType: "member",
		EntityID:   memberID,
	})

	h.respondJSON(w, http.StatusOK, map[string]string{"message": "membro removido"})
}

// ── Audit Logs ────────────────────────────────────────────────

func (h *Handler) ListAuditLogs(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	perPage, _ := strconv.Atoi(r.URL.Query().Get("per_page"))
	if perPage < 1 {
		perPage = 50
	}

	logs, total, err := h.repo.ListAuditLogs(r.Context(), orgID, perPage, (page-1)*perPage)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondPaginated(w, logs, total, page, perPage)
}

// ── Auto-Reply Rules ──────────────────────────────────────────

func (h *Handler) ListAutoReplyRules(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	rules, err := h.repo.ListAutoReplyRules(r.Context(), orgID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, http.StatusOK, rules)
}

func (h *Handler) CreateAutoReplyRule(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())

	var body struct {
		Name         string `json:"name"`
		TriggerType  string `json:"trigger_type"`
		TriggerValue string `json:"trigger_value"`
		ResponseText string `json:"response_text"`
		IsActive     *bool  `json:"is_active"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		h.respondError(w, http.StatusBadRequest, "dados inválidos")
		return
	}
	if body.TriggerType != "keyword" && body.TriggerType != "contains" && body.TriggerType != "exact" && body.TriggerType != "starts_with" {
		h.respondError(w, http.StatusBadRequest, "trigger_type inválido")
		return
	}

	isActive := true
	if body.IsActive != nil {
		isActive = *body.IsActive
	}

	rule := &models.AutoReplyRule{
		OrgID:        orgID,
		Name:         body.Name,
		TriggerType:  body.TriggerType,
		TriggerValue: body.TriggerValue,
		ResponseText: body.ResponseText,
		IsActive:     isActive,
	}

	if err := h.repo.CreateAutoReplyRule(r.Context(), rule); err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, http.StatusCreated, rule)
}

func (h *Handler) UpdateAutoReplyRule(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	ruleID := chi.URLParam(r, "ruleId")

	var body struct {
		Name         string `json:"name"`
		TriggerType  string `json:"trigger_type"`
		TriggerValue string `json:"trigger_value"`
		ResponseText string `json:"response_text"`
		IsActive     *bool  `json:"is_active"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		h.respondError(w, http.StatusBadRequest, "dados inválidos")
		return
	}

	isActive := true
	if body.IsActive != nil {
		isActive = *body.IsActive
	}

	rule := &models.AutoReplyRule{
		ID:           ruleID,
		OrgID:        orgID,
		Name:         body.Name,
		TriggerType:  body.TriggerType,
		TriggerValue: body.TriggerValue,
		ResponseText: body.ResponseText,
		IsActive:     isActive,
	}

	if err := h.repo.UpdateAutoReplyRule(r.Context(), rule); err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, http.StatusOK, rule)
}

func (h *Handler) DeleteAutoReplyRule(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	ruleID := chi.URLParam(r, "ruleId")

	if err := h.repo.DeleteAutoReplyRule(r.Context(), orgID, ruleID); err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, http.StatusOK, map[string]string{"message": "regra excluída"})
}

// ── Welcome Message ───────────────────────────────────────────

func (h *Handler) GetWelcomeMessage(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	wm, err := h.repo.GetWelcomeMessage(r.Context(), orgID)
	if err != nil {
		h.respondJSON(w, http.StatusOK, map[string]interface{}{"message": "", "is_active": false})
		return
	}
	h.respondJSON(w, http.StatusOK, wm)
}

func (h *Handler) UpdateWelcomeMessage(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())

	var body struct {
		Message  string `json:"message"`
		IsActive *bool  `json:"is_active"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		h.respondError(w, http.StatusBadRequest, "dados inválidos")
		return
	}

	isActive := true
	if body.IsActive != nil {
		isActive = *body.IsActive
	}

	wm := &models.WelcomeMessage{
		OrgID:    orgID,
		Message:  body.Message,
		IsActive: isActive,
	}

	if err := h.repo.UpsertWelcomeMessage(r.Context(), wm); err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, http.StatusOK, wm)
}

// ── Dashboard Enhanced ────────────────────────────────────────

func (h *Handler) DashboardGuideStats(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	stats, err := h.repo.DashboardGuideStats(r.Context(), orgID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, http.StatusOK, stats)
}

func (h *Handler) DashboardTopContacts(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	limit := 10
	if l := r.URL.Query().Get("limit"); l != "" {
		fmt.Sscanf(l, "%d", &limit)
	}
	contacts, err := h.repo.DashboardTopContacts(r.Context(), orgID, limit)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, http.StatusOK, contacts)
}

func (h *Handler) DashboardResponseTime(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	avgSeconds, err := h.repo.DashboardResponseTime(r.Context(), orgID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, http.StatusOK, map[string]interface{}{
		"avg_response_seconds": avgSeconds,
		"avg_response_human":   formatDuration(avgSeconds),
	})
}

func formatDuration(seconds float64) string {
	if seconds < 60 {
		return fmt.Sprintf("%.0fs", seconds)
	}
	minutes := int(seconds) / 60
	secs := int(seconds) % 60
	if seconds < 3600 {
		return fmt.Sprintf("%dm %02ds", minutes, secs)
	}
	hours := minutes / 60
	mins := minutes % 60
	return fmt.Sprintf("%dh %02dm", hours, mins)
}

// ── Export Report ─────────────────────────────────────────────

func (h *Handler) ExportReport(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	period := r.URL.Query().Get("period")
	if period == "" {
		period = "7d"
	}

	var days int
	switch {
	case strings.HasSuffix(period, "d"):
		fmt.Sscanf(strings.TrimSuffix(period, "d"), "%d", &days)
	case strings.HasSuffix(period, "w"):
		fmt.Sscanf(strings.TrimSuffix(period, "w"), "%d", &days)
		days *= 7
	case strings.HasSuffix(period, "m"):
		fmt.Sscanf(strings.TrimSuffix(period, "m"), "%d", &days)
		days *= 30
	default:
		days = 7
	}
	if days < 1 {
		days = 7
	}

	stats, _ := h.repo.DashboardStats(r.Context(), orgID)
	chartData, _ := h.repo.DashboardChartData(r.Context(), orgID, days)
	guideStats, _ := h.repo.DashboardGuideStats(r.Context(), orgID)
	topContacts, _ := h.repo.DashboardTopContacts(r.Context(), orgID, 10)
	avgResponse, _ := h.repo.DashboardResponseTime(r.Context(), orgID)

	report := map[string]interface{}{
		"period":          period,
		"stats":           stats,
		"chart":           chartData,
		"guide_stats":     guideStats,
		"top_contacts":    topContacts,
		"avg_response":    avgResponse,
		"generated_at":    fmt.Sprintf("%s", "now"),
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=relatorio_%s.json", period))
	json.NewEncoder(w).Encode(report)
}

// ── Evolution Audio ─────────────────────────────────────────────

func (h *Handler) SendAudio(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())

	var body struct {
		Jid      string `json:"jid"`
		AudioURL string `json:"audio_url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Jid == "" || body.AudioURL == "" {
		h.respondError(w, http.StatusBadRequest, "jid e audio_url são obrigatórios")
		return
	}

	_, instanceName, err := h.repo.GetOrgInstance(r.Context(), orgID)
	if err != nil || instanceName == "" {
		h.respondError(w, http.StatusBadRequest, "WhatsApp não conectado")
		return
	}

	if _, err := h.wa.GetEvolutionClient().SendWhatsAppAudio(instanceName, body.Jid, body.AudioURL); err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.respondJSON(w, http.StatusOK, map[string]string{"message": "áudio enviado"})
}

// ── Evolution Presence ──────────────────────────────────────────

func (h *Handler) SendPresence(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())

	var body struct {
		Jid      string `json:"jid"`
		Presence string `json:"presence"` // composing, recording, paused
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Jid == "" || body.Presence == "" {
		h.respondError(w, http.StatusBadRequest, "jid e presence são obrigatórios")
		return
	}

	_, instanceName, err := h.repo.GetOrgInstance(r.Context(), orgID)
	if err != nil || instanceName == "" {
		h.respondError(w, http.StatusBadRequest, "WhatsApp não conectado")
		return
	}

	if err := h.wa.GetEvolutionClient().SendPresence(instanceName, body.Jid, body.Presence); err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.respondJSON(w, http.StatusOK, map[string]string{"message": "presence enviado"})
}

// ── Evolution Delete Message ────────────────────────────────────

func (h *Handler) DeleteEvolutionMessage(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	jid := chi.URLParam(r, "jid")
	msgID := chi.URLParam(r, "msgId")

	var body struct {
		ForEveryone bool `json:"for_everyone"`
	}
	json.NewDecoder(r.Body).Decode(&body)

	_, instanceName, err := h.repo.GetOrgInstance(r.Context(), orgID)
	if err != nil || instanceName == "" {
		h.respondError(w, http.StatusBadRequest, "WhatsApp não conectado")
		return
	}

	if err := h.wa.GetEvolutionClient().DeleteMessage(instanceName, msgID, jid, body.ForEveryone); err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.respondJSON(w, http.StatusOK, map[string]string{"message": "mensagem deletada"})
}

// ── Evolution Update Message ────────────────────────────────────

func (h *Handler) UpdateEvolutionMessage(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	jid := chi.URLParam(r, "jid")
	msgID := chi.URLParam(r, "msgId")

	var body struct {
		Text string `json:"text"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Text == "" {
		h.respondError(w, http.StatusBadRequest, "text é obrigatório")
		return
	}

	_, instanceName, err := h.repo.GetOrgInstance(r.Context(), orgID)
	if err != nil || instanceName == "" {
		h.respondError(w, http.StatusBadRequest, "WhatsApp não conectado")
		return
	}

	if err := h.wa.GetEvolutionClient().UpdateMessage(instanceName, jid, msgID, body.Text); err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.respondJSON(w, http.StatusOK, map[string]string{"message": "mensagem atualizada"})
}

// ── Evolution Mark As Read ──────────────────────────────────────

func (h *Handler) MarkAsRead(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	jid := chi.URLParam(r, "jid")

	var body struct {
		MsgID string `json:"msg_id"`
		FromMe bool  `json:"from_me"`
	}
	json.NewDecoder(r.Body).Decode(&body)

	_, instanceName, err := h.repo.GetOrgInstance(r.Context(), orgID)
	if err != nil || instanceName == "" {
		h.respondError(w, http.StatusBadRequest, "WhatsApp não conectado")
		return
	}

	if err := h.wa.GetEvolutionClient().MarkAsRead(instanceName, jid, body.MsgID, body.FromMe); err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.respondJSON(w, http.StatusOK, map[string]string{"message": "marcado como lido"})
}

// ── Evolution Fetch Profile ─────────────────────────────────────

func (h *Handler) FetchProfile(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	number := chi.URLParam(r, "number")

	_, instanceName, err := h.repo.GetOrgInstance(r.Context(), orgID)
	if err != nil || instanceName == "" {
		h.respondError(w, http.StatusBadRequest, "WhatsApp não conectado")
		return
	}

	profile, err := h.wa.GetEvolutionClient().FetchProfile(instanceName, number)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.respondJSON(w, http.StatusOK, profile)
}

// ── Evolution Has WhatsApp ──────────────────────────────────────

func (h *Handler) HasWhatsApp(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())

	var body struct {
		Numbers []string `json:"numbers"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || len(body.Numbers) == 0 {
		h.respondError(w, http.StatusBadRequest, "numbers é obrigatório")
		return
	}

	_, instanceName, err := h.repo.GetOrgInstance(r.Context(), orgID)
	if err != nil || instanceName == "" {
		h.respondError(w, http.StatusBadRequest, "WhatsApp não conectado")
		return
	}

	results, err := h.wa.GetEvolutionClient().HasWhatsApp(instanceName, body.Numbers)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.respondJSON(w, http.StatusOK, results)
}

// ── Evolution Create Group ──────────────────────────────────────

func (h *Handler) CreateEvolutionGroup(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())

	var body struct {
		Subject      string   `json:"subject"`
		Description  string   `json:"description"`
		Participants []string `json:"participants"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Subject == "" {
		h.respondError(w, http.StatusBadRequest, "subject é obrigatório")
		return
	}

	_, instanceName, err := h.repo.GetOrgInstance(r.Context(), orgID)
	if err != nil || instanceName == "" {
		h.respondError(w, http.StatusBadRequest, "WhatsApp não conectado")
		return
	}

	result, err := h.wa.GetEvolutionClient().CreateGroup(instanceName, body.Subject, body.Description, body.Participants)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.respondJSON(w, http.StatusCreated, result)
}

// ── Evolution Update Group Participant ──────────────────────────

func (h *Handler) UpdateGroupParticipant(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	groupJid := chi.URLParam(r, "groupJid")

	var body struct {
		Action      string   `json:"action"` // add, remove, promote, demote
		Participants []string `json:"participants"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Action == "" || len(body.Participants) == 0 {
		h.respondError(w, http.StatusBadRequest, "action e participants são obrigatórios")
		return
	}

	_, instanceName, err := h.repo.GetOrgInstance(r.Context(), orgID)
	if err != nil || instanceName == "" {
		h.respondError(w, http.StatusBadRequest, "WhatsApp não conectado")
		return
	}

	if err := h.wa.GetEvolutionClient().UpdateGroupParticipant(instanceName, groupJid, body.Action, body.Participants); err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.respondJSON(w, http.StatusOK, map[string]string{"message": "participante atualizado"})
}
