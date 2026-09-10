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
	whatsappService := service.NewWhatsappService(whatsappRepo, evolutionClient, hub)
	uploadService := service.NewUploadService(cfg.UploadDir, cfg.UploadPublicURL, cfg.UploadMaxSizeMB)

	h := handler.NewHandler(authService, whatsappService, whatsappRepo, uploadService, hub)

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
				r.Get("/conversations/{jid}/messages", h.ListMessages)
				r.Post("/conversations/{jid}/media", h.SendMedia)
				r.Post("/conversations/{jid}/reaction", h.SendReaction)
				r.Post("/conversations/{jid}/archive", h.ArchiveConversation)
				r.Post("/conversations/{jid}/unarchive", h.UnarchiveConversation)
				r.Post("/conversations/{jid}/assign", h.AssignGuide)
				r.Post("/conversations/{jid}/tags", h.UpdateTags)
				r.Post("/conversations/{jid}/pin", h.PinConversation)
				r.Post("/conversations/bulk", h.BulkActions)
				r.Post("/conversations/{remoteMsgID}/content", h.UpdateMessageContent)
				r.Delete("/conversations/{jid}/messages/{msgId}", h.DeleteMessage)

				r.Get("/quick-replies", h.ListQuickReplies)
				r.Post("/quick-replies", h.CreateQuickReply)
				r.Delete("/quick-replies/{qrId}", h.DeleteQuickReply)

				r.Get("/groups", h.ListGroups)
				r.Get("/groups/{groupJid}/messages", h.ListGroupMessages)

				r.Get("/conversations/{convJid}/notes", h.ListNotes)
				r.Post("/conversations/{convJid}/notes", h.CreateNote)

				r.Get("/tag-colors", h.GetTagColors)
				r.Post("/tag-colors", h.SetTagColor)
				r.Delete("/tag-colors/{tag}", h.DeleteTagColor)
			})

			r.Get("/dashboard/stats", h.DashboardStats)
			r.Get("/dashboard/chart", h.DashboardChart)
			r.Get("/members", h.ListMembers)
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
