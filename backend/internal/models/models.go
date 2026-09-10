package models

import (
	"encoding/json"
	"time"
)

type User struct {
	ID           string    `json:"id" db:"id"`
	OrgID        string    `json:"org_id" db:"org_id"`
	Name         string    `json:"name" db:"name"`
	Email        string    `json:"email" db:"email"`
	PasswordHash string    `json:"-" db:"password_hash"`
	Role         string    `json:"role" db:"role"`
	Avatar       string    `json:"avatar" db:"avatar"`
	Phone        string    `json:"phone" db:"phone"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time `json:"updated_at" db:"updated_at"`
}

type Organization struct {
	ID                   string     `json:"id" db:"id"`
	Name                 string     `json:"name" db:"name"`
	Slug                 string     `json:"slug" db:"slug"`
	LogoURL              string     `json:"logo_url" db:"logo_url"`
	WhatsAppInstanceID   *string    `json:"whatsapp_instance_id" db:"whatsapp_instance_id"`
	WhatsAppInstanceName *string    `json:"whatsapp_instance_name" db:"whatsapp_instance_name"`
	CreatedAt            time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt            time.Time  `json:"updated_at" db:"updated_at"`
}

type OrganizationMember struct {
	ID        string    `json:"id" db:"id"`
	OrgID     string    `json:"org_id" db:"org_id"`
	UserID    string    `json:"user_id" db:"user_id"`
	Role      string    `json:"role" db:"role"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

type WhatsappConversation struct {
	ID            string         `json:"id" db:"id"`
	OrgID         string         `json:"org_id" db:"org_id"`
	Jid           string         `json:"jid" db:"jid"`
	Name          string         `json:"name" db:"name"`
	Phone         string         `json:"phone" db:"phone"`
	IsGroup       bool           `json:"is_group" db:"is_group"`
	AvatarURL     string         `json:"avatar_url" db:"avatar_url"`
	LastMessage   string         `json:"last_message" db:"last_message"`
	LastMessageAt *time.Time     `json:"last_message_at" db:"last_message_at"`
	UnreadCount   int            `json:"unread_count" db:"unread_count"`
	Tags          []string       `json:"tags" db:"tags"`
	AssignedGuide string         `json:"assigned_guide" db:"assigned_guide"`
	IsArchived    bool           `json:"is_archived" db:"is_archived"`
	IsPinned      bool           `json:"is_pinned" db:"is_pinned"`
	CreatedAt     time.Time      `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at" db:"updated_at"`
}

type WhatsappMessage struct {
	ID             string          `json:"id" db:"id"`
	ConversationID string          `json:"conversation_id" db:"conversation_id"`
	OrgID          string          `json:"org_id" db:"org_id"`
	RemoteMsgID    string          `json:"remote_msg_id" db:"remote_msg_id"`
	Sender         string          `json:"sender" db:"sender"`
	SenderName     string          `json:"sender_name" db:"sender_name"`
	Content        string          `json:"content" db:"content"`
	MsgType        string          `json:"msg_type" db:"msg_type"`
	MediaURL       string          `json:"media_url" db:"media_url"`
	MediaType      string          `json:"media_type" db:"media_type"`
	FromMe         bool            `json:"from_me" db:"from_me"`
	IsGroup        bool            `json:"is_group" db:"is_group"`
	Status         string          `json:"status" db:"status"`
	Reactions      json.RawMessage `json:"reactions" db:"reactions"`
	QuotedMsgID    string          `json:"quoted_msg_id" db:"quoted_msg_id"`
	IsEdited       bool            `json:"is_edited" db:"is_edited"`
	IsDeleted      bool            `json:"is_deleted" db:"is_deleted"`
	DeletedFor     string          `json:"deleted_for" db:"deleted_for"`
	Timestamp      time.Time       `json:"timestamp" db:"timestamp"`
	CreatedAt      time.Time       `json:"created_at" db:"created_at"`
}

type WhatsappNote struct {
	ID             string    `json:"id" db:"id"`
	ConversationID string    `json:"conversation_id" db:"conversation_id"`
	OrgID          string    `json:"org_id" db:"org_id"`
	UserID         string    `json:"user_id" db:"user_id"`
	UserName       string    `json:"user_name" db:"user_name"`
	Content        string    `json:"content" db:"content"`
	CreatedAt      time.Time `json:"created_at" db:"created_at"`
}

type WhatsappQuickReply struct {
	ID        string    `json:"id" db:"id"`
	OrgID     string    `json:"org_id" db:"org_id"`
	Shortcut  string    `json:"shortcut" db:"shortcut"`
	Title     string    `json:"title" db:"title"`
	Content   string    `json:"content" db:"content"`
	MediaURL  string    `json:"media_url" db:"media_url"`
	MediaType string    `json:"media_type" db:"media_type"`
	Variables []string  `json:"variables" db:"variables"`
	IsGlobal  bool      `json:"is_global" db:"is_global"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

type TagColor struct {
	ID        string    `json:"id" db:"id"`
	OrgID     string    `json:"org_id" db:"org_id"`
	Tag       string    `json:"tag" db:"tag"`
	Color     string    `json:"color" db:"color"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

type WhatsappGroup struct {
	ID          string    `json:"id" db:"id"`
	OrgID       string    `json:"org_id" db:"org_id"`
	GroupJid    string    `json:"group_jid" db:"group_jid"`
	Subject     string    `json:"subject" db:"subject"`
	Description string    `json:"description" db:"description"`
	ParticipantCount int  `json:"participant_count" db:"participant_count"`
	IsArchived  bool      `json:"is_archived" db:"is_archived"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
}

type WhatsappGroupMessage struct {
	ID        string          `json:"id" db:"id"`
	GroupID   string          `json:"group_id" db:"group_id"`
	OrgID     string          `json:"org_id" db:"org_id"`
	RemoteMsgID string        `json:"remote_msg_id" db:"remote_msg_id"`
	Sender    string          `json:"sender" db:"sender"`
	SenderName string         `json:"sender_name" db:"sender_name"`
	Content   string          `json:"content" db:"content"`
	MsgType   string          `json:"msg_type" db:"msg_type"`
	MediaURL  string          `json:"media_url" db:"media_url"`
	MediaType string          `json:"media_type" db:"media_type"`
	FromMe    bool            `json:"from_me" db:"from_me"`
	Status    string          `json:"status" db:"status"`
	Reactions json.RawMessage `json:"reactions" db:"reactions"`
	Timestamp time.Time       `json:"timestamp" db:"timestamp"`
	CreatedAt time.Time       `json:"created_at" db:"created_at"`
}

type DashboardStats struct {
	TotalConversations  int     `json:"total_conversations"`
	UnreadConversations int     `json:"unread_conversations"`
	MessagesSentToday   int     `json:"messages_sent_today"`
	MessagesReceivedToday int   `json:"messages_received_today"`
	ActiveGroups        int     `json:"active_groups"`
}

type PaginationParams struct {
	Page    int
	PerPage int
}

type ConversationFilters struct {
	Tag        string
	Guide      string
	UnreadOnly bool
	Search     string
	Period     string
}

type WhatsappWebhookEvent struct {
	Event      string      `json:"event"`
	InstanceID string      `json:"instance"`
	Data       interface{} `json:"data"`
}
