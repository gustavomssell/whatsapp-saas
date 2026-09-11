package handler

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/user/whatsapp-saas/internal/middleware"
	"github.com/user/whatsapp-saas/internal/models"
)

func (h *Handler) ListContacts(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	search := r.URL.Query().Get("search")
	tag := r.URL.Query().Get("tag")
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	perPage, _ := strconv.Atoi(r.URL.Query().Get("per_page"))
	if perPage < 1 {
		perPage = 50
	}

	contacts, total, err := h.contacts.ListContacts(r.Context(), orgID, search, tag, perPage, (page-1)*perPage)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondPaginated(w, contacts, total, page, perPage)
}

func (h *Handler) GetContact(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	id := chi.URLParam(r, "contactId")
	if id == "" {
		h.respondError(w, http.StatusBadRequest, "contactId é obrigatório")
		return
	}

	contact, err := h.contacts.GetContact(r.Context(), orgID, id)
	if err != nil {
		h.respondError(w, http.StatusNotFound, "contato não encontrado")
		return
	}
	h.respondJSON(w, http.StatusOK, contact)
}

func (h *Handler) CreateContact(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())

	var body struct {
		Phone      string   `json:"phone"`
		Name       string   `json:"name"`
		Email      string   `json:"email"`
		Company    string   `json:"company"`
		Tags       []string `json:"tags"`
		Notes      string   `json:"notes"`
		AvatarURL  string   `json:"avatar_url"`
		IsWhatsApp bool     `json:"is_whatsapp"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		h.respondError(w, http.StatusBadRequest, "dados inválidos")
		return
	}
	if body.Phone == "" {
		h.respondError(w, http.StatusBadRequest, "phone é obrigatório")
		return
	}

	contact := &models.WhatsappContact{
		OrgID:       orgID,
		Phone:       body.Phone,
		Name:        body.Name,
		Email:       body.Email,
		Company:     body.Company,
		Tags:        body.Tags,
		Notes:       body.Notes,
		AvatarURL:   body.AvatarURL,
		IsWhatsApp:  body.IsWhatsApp,
		IsMyContact: true,
	}
	if contact.Tags == nil {
		contact.Tags = []string{}
	}

	if err := h.contacts.CreateContact(r.Context(), contact); err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, http.StatusCreated, contact)
}

func (h *Handler) UpdateContact(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	id := chi.URLParam(r, "contactId")
	if id == "" {
		h.respondError(w, http.StatusBadRequest, "contactId é obrigatório")
		return
	}

	existing, err := h.contacts.GetContact(r.Context(), orgID, id)
	if err != nil {
		h.respondError(w, http.StatusNotFound, "contato não encontrado")
		return
	}

	var body struct {
		Name       *string   `json:"name"`
		Email      *string   `json:"email"`
		Company    *string   `json:"company"`
		Tags       *[]string `json:"tags"`
		Notes      *string   `json:"notes"`
		AvatarURL  *string   `json:"avatar_url"`
		IsWhatsApp *bool     `json:"is_whatsapp"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		h.respondError(w, http.StatusBadRequest, "dados inválidos")
		return
	}

	if body.Name != nil {
		existing.Name = *body.Name
	}
	if body.Email != nil {
		existing.Email = *body.Email
	}
	if body.Company != nil {
		existing.Company = *body.Company
	}
	if body.Tags != nil {
		existing.Tags = *body.Tags
	}
	if body.Notes != nil {
		existing.Notes = *body.Notes
	}
	if body.AvatarURL != nil {
		existing.AvatarURL = *body.AvatarURL
	}
	if body.IsWhatsApp != nil {
		existing.IsWhatsApp = *body.IsWhatsApp
	}

	if err := h.contacts.UpdateContact(r.Context(), existing); err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, http.StatusOK, existing)
}

func (h *Handler) DeleteContact(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	id := chi.URLParam(r, "contactId")
	if id == "" {
		h.respondError(w, http.StatusBadRequest, "contactId é obrigatório")
		return
	}

		if err := h.contacts.DeleteContact(r.Context(), orgID, id); err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, http.StatusOK, map[string]string{"message": "contato excluído"})
}

func (h *Handler) SyncContactsFromWhatsApp(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())

	waContacts, err := h.wa.GetContacts(r.Context(), orgID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, "erro ao buscar contatos do WhatsApp: "+err.Error())
		return
	}

	contacts := make([]models.WhatsappContact, 0, len(waContacts))
	for _, wc := range waContacts {
		phone := ""
		if p, ok := wc["phone"].(string); ok {
			phone = p
		} else if remoteJid, ok := wc["remoteJid"].(string); ok {
			parts := strings.Split(remoteJid, "@")
			if len(parts) > 0 {
				phone = parts[0]
				if idx := strings.Index(phone, ":"); idx >= 0 {
					phone = phone[idx+1:]
				}
			}
		}
		if phone == "" {
			continue
		}

		name := ""
		if pn, ok := wc["pushName"].(string); ok {
			name = pn
		}
		avatarURL := ""
		if av, ok := wc["profilePicUrl"].(string); ok {
			avatarURL = av
		}

		contact := models.WhatsappContact{
			Phone:       phone,
			Name:        name,
			AvatarURL:   avatarURL,
			IsWhatsApp:  true,
			IsMyContact: false,
			Tags:        []string{},
		}
		contacts = append(contacts, contact)
	}

	synced, err := h.contacts.BulkUpsertContacts(r.Context(), orgID, contacts)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.respondJSON(w, http.StatusOK, map[string]interface{}{
		"message": fmt.Sprintf("%d contatos sincronizados", synced),
		"count":   synced,
	})
}

func (h *Handler) ExportContactsCSV(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())

	contacts, err := h.contacts.ExportContactsCSV(r.Context(), orgID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=contatos_%s.csv", time.Now().Format("2006-01-02")))

	// BOM for Excel
	w.Write([]byte{0xEF, 0xBB, 0xBF})

	writer := csv.NewWriter(w)
	defer writer.Flush()

	writer.Write([]string{"phone", "name", "email", "company", "tags", "notes", "is_whatsapp"})

	for _, c := range contacts {
		writer.Write([]string{
			c.Phone,
			c.Name,
			c.Email,
			c.Company,
			strings.Join(c.Tags, ";"),
			c.Notes,
			strconv.FormatBool(c.IsWhatsApp),
		})
	}
}

func (h *Handler) ImportContactsCSV(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())

	if err := r.ParseMultipartForm(10 << 20); err != nil {
		h.respondError(w, http.StatusBadRequest, "erro ao processar arquivo")
		return
	}

	file, _, err := r.FormFile("file")
	if err != nil {
		h.respondError(w, http.StatusBadRequest, "arquivo não enviado")
		return
	}
	defer file.Close()

	reader := csv.NewReader(file)
	reader.Comma = ','
	reader.LazyQuotes = true

	records, err := reader.ReadAll()
	if err != nil {
		h.respondError(w, http.StatusBadRequest, "erro ao ler CSV: "+err.Error())
		return
	}

	if len(records) < 2 {
		h.respondError(w, http.StatusBadRequest, "CSV vazio ou sem cabeçalho")
		return
	}

	header := records[0]
	colIdx := make(map[string]int)
	for i, h := range header {
		colIdx[strings.ToLower(strings.TrimSpace(h))] = i
	}

	getField := func(row []string, field string) string {
		if idx, ok := colIdx[field]; ok && idx < len(row) {
			return strings.TrimSpace(row[idx])
		}
		return ""
	}

	contacts := make([]models.WhatsappContact, 0, len(records)-1)
	for _, row := range records[1:] {
		phone := getField(row, "phone")
		if phone == "" {
			continue
		}

		tagsStr := getField(row, "tags")
		var tags []string
		if tagsStr != "" {
			for _, t := range strings.Split(tagsStr, ";") {
				t = strings.TrimSpace(t)
				if t != "" {
					tags = append(tags, t)
				}
			}
		}
		if tags == nil {
			tags = []string{}
		}

		contact := models.WhatsappContact{
			Phone:       phone,
			Name:        getField(row, "name"),
			Email:       getField(row, "email"),
			Company:     getField(row, "company"),
			Tags:        tags,
			Notes:       getField(row, "notes"),
			IsWhatsApp:  true,
			IsMyContact: true,
		}
		contacts = append(contacts, contact)
	}

	imported, err := h.contacts.BulkUpsertContacts(r.Context(), orgID, contacts)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.respondJSON(w, http.StatusOK, map[string]interface{}{
		"message": fmt.Sprintf("%d contatos importados", imported),
		"count":   imported,
	})
}

func (h *Handler) ImportContactsJSON(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())

	body, err := io.ReadAll(r.Body)
	if err != nil {
		h.respondError(w, http.StatusBadRequest, "erro ao ler corpo da requisição")
		return
	}

	var incoming []struct {
		Phone      string   `json:"phone"`
		Name       string   `json:"name"`
		Email      string   `json:"email"`
		Company    string   `json:"company"`
		Tags       []string `json:"tags"`
		Notes      string   `json:"notes"`
		AvatarURL  string   `json:"avatar_url"`
		IsWhatsApp bool     `json:"is_whatsapp"`
	}
	if err := json.Unmarshal(body, &incoming); err != nil {
		h.respondError(w, http.StatusBadRequest, "JSON inválido: "+err.Error())
		return
	}

	contacts := make([]models.WhatsappContact, 0, len(incoming))
	for _, inc := range incoming {
		if inc.Phone == "" {
			continue
		}
		tags := inc.Tags
		if tags == nil {
			tags = []string{}
		}
		contacts = append(contacts, models.WhatsappContact{
			Phone:       inc.Phone,
			Name:        inc.Name,
			Email:       inc.Email,
			Company:     inc.Company,
			Tags:        tags,
			Notes:       inc.Notes,
			AvatarURL:   inc.AvatarURL,
			IsWhatsApp:  inc.IsWhatsApp,
			IsMyContact: true,
		})
	}

	imported, err := h.contacts.BulkUpsertContacts(r.Context(), orgID, contacts)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.respondJSON(w, http.StatusOK, map[string]interface{}{
		"message": fmt.Sprintf("%d contatos importados", imported),
		"count":   imported,
	})
}

func (h *Handler) BulkDeleteContacts(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())

	var body struct {
		IDs []string `json:"ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || len(body.IDs) == 0 {
		h.respondError(w, http.StatusBadRequest, "ids é obrigatório")
		return
	}

	for _, id := range body.IDs {
	if err := h.contacts.DeleteContact(r.Context(), orgID, id); err != nil {
			log.Printf("[contacts] erro ao excluir %s: %v", id, err)
		}
	}

	h.respondJSON(w, http.StatusOK, map[string]interface{}{
		"message": fmt.Sprintf("%d contatos excluídos", len(body.IDs)),
		"count":   len(body.IDs),
	})
}
