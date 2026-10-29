package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"

	"github.com/user/whatsapp-saas/internal/config"
	"github.com/user/whatsapp-saas/internal/database"
	"github.com/user/whatsapp-saas/internal/handler"
	"github.com/user/whatsapp-saas/internal/middleware"
	"github.com/user/whatsapp-saas/internal/repository"
	"github.com/user/whatsapp-saas/internal/service"
	"github.com/user/whatsapp-saas/internal/socket"
)

func main() {
	cfg := config.Load()

	pool, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("erro ao conectar ao banco: %v", err)
	}
	defer pool.Close()

	if err := database.RunMigrations(pool); err != nil {
		log.Printf("aviso ao rodar migrations: %v", err)
	}

	hub := socket.NewHub()

	authService := service.NewAuthService(pool, cfg.JWTSecret)
	evolutionClient := service.NewEvolutionClient(cfg.EvolutionAPIURL, cfg.EvolutionAPIKey)
	whatsappRepo := repository.NewWhatsappRepo(pool)
	contactRepo := repository.NewContactRepo(pool)
	billingRepo := repository.NewBillingRepo(pool)
	whatsappService := service.NewWhatsappService(whatsappRepo, billingRepo, evolutionClient, hub)
	uploadService := service.NewUploadService(cfg.UploadDir, cfg.UploadPublicURL, cfg.UploadMaxSizeMB)

	h := handler.NewHandler(authService, whatsappService, whatsappRepo, contactRepo, billingRepo, uploadService, hub)

	r := chi.NewRouter()
	r.Use(chimw.Logger)
	r.Use(chimw.Recoverer)
	r.Use(chimw.AllowContentType("application/json", "multipart/form-data"))
	r.Use(corsMiddleware)

	uploadsDir := filepath.Join(".", "uploads")
	os.MkdirAll(uploadsDir, 0755)
	r.Handle("/uploads/*", http.StripPrefix("/uploads/", http.FileServer(http.Dir(uploadsDir))))

	r.Route("/api", func(r chi.Router) {
		r.Post("/auth/register", h.Register)
		r.Post("/auth/login", h.Login)
		r.Post("/webhook/whatsapp", h.WebhookHandler)

		r.Group(func(r chi.Router) {
			r.Use(middleware.Auth(cfg.JWTSecret))

			r.Post("/auth/refresh", h.RefreshToken)
			r.Get("/auth/profile", h.GetProfile)

			r.Post("/upload", h.UploadMedia)

			r.Route("/whatsapp", func(r chi.Router) {
				r.Post("/connect", h.WhatsAppConnect)
				r.Get("/status", h.WhatsAppStatus)
				r.Post("/disconnect", h.WhatsAppDisconnect)
				r.Get("/contacts", h.WhatsAppContacts)

				r.Get("/conversations", h.ListConversations)
				r.Post("/conversations/{jid}/messages", h.SendMessage)
				r.Post("/conversations/{jid}/edit", h.EditMessage)
				r.Get("/conversations/{jid}/messages", h.ListMessages)
				r.Post("/conversations/{jid}/media", h.SendMedia)
				r.Post("/conversations/{jid}/reaction", h.SendReaction)
				r.Post("/conversations/{jid}/archive", h.ArchiveConversation)
				r.Post("/conversations/{jid}/unarchive", h.UnarchiveConversation)
				r.Post("/conversations/{jid}/assign", h.AssignGuide)
				r.Post("/conversations/{jid}/tags", h.UpdateTags)
				r.Post("/conversations/{jid}/pin", h.PinConversation)
				r.Post("/conversations/bulk", h.BulkActions)
				r.Delete("/conversations/{jid}/messages/{msgId}", h.DeleteMessage)
				r.Post("/conversations/{jid}/forward", h.ForwardMessage)
				r.Get("/conversations/{jid}/search", h.SearchMessages)
				r.Post("/conversations/auto-archive", h.AutoArchive)

				r.Get("/quick-replies", h.ListQuickReplies)
				r.Post("/quick-replies", h.CreateQuickReply)
				r.Delete("/quick-replies/{qrId}", h.DeleteQuickReply)

				r.Get("/conversations/{convJid}/notes", h.ListNotes)
				r.Post("/conversations/{convJid}/notes", h.CreateNote)

				r.Post("/audio", h.SendAudio)
				r.Post("/presence", h.SendPresence)
				r.Delete("/messages/{jid}/{msgId}", h.DeleteEvolutionMessage)
				r.Put("/messages/{jid}/{msgId}", h.UpdateEvolutionMessage)
				r.Put("/chats/{jid}/markAsRead", h.MarkAsRead)
				r.Get("/profile/{number}", h.FetchProfile)
				r.Post("/chats/hasWhatsApp", h.HasWhatsApp)
			})

			r.Route("/contacts", func(r chi.Router) {
				r.Get("/", h.ListContacts)
				r.Post("/", h.CreateContact)
				r.Post("/sync", h.SyncContactsFromWhatsApp)
				r.Post("/import", h.ImportContactsCSV)
				r.Post("/import-json", h.ImportContactsJSON)
				r.Post("/bulk-delete", h.BulkDeleteContacts)
				r.Get("/export", h.ExportContactsCSV)
				r.Get("/{contactId}", h.GetContact)
				r.Put("/{contactId}", h.UpdateContact)
				r.Delete("/{contactId}", h.DeleteContact)
			})

			r.Get("/groups", h.ListGroups)
			r.Put("/groups/{groupJid}", h.UpdateGroup)
			r.Delete("/groups/{groupJid}", h.DeleteGroup)
			r.Get("/groups/{groupJid}/invite-link", h.GetGroupInviteLink)
			r.Get("/groups/{groupJid}/messages", h.ListGroupMessages)

			r.Get("/tag-colors", h.GetTagColors)
			r.Post("/tag-colors", h.SetTagColor)
			r.Delete("/tag-colors/{tag}", h.DeleteTagColor)

			r.Get("/dashboard/stats", h.DashboardStats)
			r.Get("/dashboard/chart", h.DashboardChart)
			r.Get("/dashboard/guide-stats", h.DashboardGuideStats)
			r.Get("/dashboard/top-contacts", h.DashboardTopContacts)
			r.Get("/dashboard/response-time", h.DashboardResponseTime)
			r.Get("/dashboard/export", h.ExportReport)
			r.Get("/members", h.ListMembers)
			r.Get("/org-members", h.ListOrgMembers)
			r.Put("/org-members/{memberId}/role", h.UpdateMemberRole)
			r.Delete("/org-members/{memberId}", h.RemoveMember)

			r.Put("/profile", h.UpdateProfile)
			r.Post("/profile/change-password", h.ChangePassword)

			r.Get("/audit-logs", h.ListAuditLogs)

			r.Get("/auto-reply-rules", h.ListAutoReplyRules)
			r.Post("/auto-reply-rules", h.CreateAutoReplyRule)
			r.Put("/auto-reply-rules/{ruleId}", h.UpdateAutoReplyRule)
			r.Delete("/auto-reply-rules/{ruleId}", h.DeleteAutoReplyRule)

			r.Get("/welcome-message", h.GetWelcomeMessage)
			r.Put("/welcome-message", h.UpdateWelcomeMessage)

			r.Route("/billing", func(r chi.Router) {
				r.Get("/plans", h.ListPlans)
				r.Get("/plan", h.GetOrgPlan)
				r.Post("/subscribe", h.SubscribePlan)
				r.Post("/cancel", h.CancelSubscription)
				r.Get("/usage", h.GetUsage)
				r.Get("/invoices", h.GetInvoices)
				r.Post("/invoices", h.CreateInvoice)
				r.Get("/api-keys", h.ListAPIKeys)
				r.Post("/api-keys", h.CreateAPIKey)
				r.Delete("/api-keys/{keyID}", h.DeleteAPIKey)
			})
		})
	})

	r.Get("/ws", h.WebSocketHandler)

	addr := ":" + cfg.Port
	log.Printf("servidor rodando em %s", addr)
	if err := http.ListenAndServe(addr, r); err != nil {
		log.Fatalf("erro ao iniciar servidor: %v", err)
	}
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

