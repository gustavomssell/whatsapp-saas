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
	EditHistory    json.RawMessage `json:"edit_history" db:"edit_history"`
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

type Plan struct {
	ID                string          `json:"id" db:"id"`
	Name              string          `json:"name" db:"name"`
	DisplayName       string          `json:"display_name" db:"display_name"`
	PriceMonthly      float64         `json:"price_monthly" db:"price_monthly"`
	PriceYearly       float64         `json:"price_yearly" db:"price_yearly"`
	MaxConversations  int             `json:"max_conversations" db:"max_conversations"`
	MaxMessagesMonth  int             `json:"max_messages_month" db:"max_messages_month"`
	MaxMembers        int             `json:"max_members" db:"max_members"`
	MaxQuickReplies   int             `json:"max_quick_replies" db:"max_quick_replies"`
	MaxGroups         int             `json:"max_groups" db:"max_groups"`
	Features          json.RawMessage `json:"features" db:"features"`
	IsActive          bool            `json:"is_active" db:"is_active"`
	CreatedAt         time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt         time.Time       `json:"updated_at" db:"updated_at"`
}

type Subscription struct {
	ID                 string          `json:"id" db:"id"`
	OrgID              string          `json:"org_id" db:"org_id"`
	PlanID             string          `json:"plan_id" db:"plan_id"`
	Status             string          `json:"status" db:"status"`
	BillingCycle       string          `json:"billing_cycle" db:"billing_cycle"`
	CurrentPeriodStart time.Time       `json:"current_period_start" db:"current_period_start"`
	CurrentPeriodEnd   *time.Time      `json:"current_period_end" db:"current_period_end"`
	TrialEndsAt        *time.Time      `json:"trial_ends_at" db:"trial_ends_at"`
	CancelledAt        *time.Time      `json:"cancelled_at" db:"cancelled_at"`
	PaymentMethod      json.RawMessage `json:"payment_method" db:"payment_method"`
	CreatedAt          time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt          time.Time       `json:"updated_at" db:"updated_at"`
}

type UsageTracking struct {
	ID               string    `json:"id" db:"id"`
	OrgID            string    `json:"org_id" db:"org_id"`
	Period           string    `json:"period" db:"period"`
	MessagesSent     int       `json:"messages_sent" db:"messages_sent"`
	MessagesReceived int       `json:"messages_received" db:"messages_received"`
	ConversationsActive int    `json:"conversations_active" db:"conversations_active"`
	MembersCount     int       `json:"members_count" db:"members_count"`
	ApiCalls         int       `json:"api_calls" db:"api_calls"`
	CreatedAt        time.Time `json:"created_at" db:"created_at"`
	UpdatedAt        time.Time `json:"updated_at" db:"updated_at"`
}

type Invoice struct {
	ID             string          `json:"id" db:"id"`
	OrgID          string          `json:"org_id" db:"org_id"`
	SubscriptionID string          `json:"subscription_id" db:"subscription_id"`
	Amount         float64         `json:"amount" db:"amount"`
	Currency       string          `json:"currency" db:"currency"`
	Status         string          `json:"status" db:"status"`
	PaymentMethod  string          `json:"payment_method" db:"payment_method"`
	PaymentID      string          `json:"payment_id" db:"payment_id"`
	Description    string          `json:"description" db:"description"`
	Metadata       json.RawMessage `json:"metadata" db:"metadata"`
	DueDate        *time.Time      `json:"due_date" db:"due_date"`
	PaidAt         *time.Time      `json:"paid_at" db:"paid_at"`
	CreatedAt      time.Time       `json:"created_at" db:"created_at"`
}

type OrgPlanInfo struct {
	Plan          Plan           `json:"plan"`
	Subscription  Subscription   `json:"subscription"`
	Usage         UsageTracking  `json:"usage"`
	HasFeature    func(string) bool `json:"-"`
}

type WhatsappContact struct {
	ID          string    `json:"id" db:"id"`
	OrgID       string    `json:"org_id" db:"org_id"`
	Phone       string    `json:"phone" db:"phone"`
	Name        string    `json:"name" db:"name"`
	Email       string    `json:"email" db:"email"`
	Company     string    `json:"company" db:"company"`
	Tags        []string  `json:"tags" db:"tags"`
	Notes       string    `json:"notes" db:"notes"`
	AvatarURL   string    `json:"avatar_url" db:"avatar_url"`
	IsWhatsApp  bool      `json:"is_whatsapp" db:"is_whatsapp"`
	IsMyContact bool      `json:"is_my_contact" db:"is_my_contact"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
}

type AuditLog struct {
	ID         string          `json:"id" db:"id"`
	OrgID      string          `json:"org_id" db:"org_id"`
	UserID     string          `json:"user_id" db:"user_id"`
	UserName   string          `json:"user_name" db:"user_name"`
	Action     string          `json:"action" db:"action"`
	EntityType string          `json:"entity_type" db:"entity_type"`
	EntityID   string          `json:"entity_id" db:"entity_id"`
	Details    json.RawMessage `json:"details" db:"details"`
	IPAddress  string          `json:"ip_address" db:"ip_address"`
	CreatedAt  time.Time       `json:"created_at" db:"created_at"`
}

type AutoReplyRule struct {
	ID          string    `json:"id" db:"id"`
	OrgID       string    `json:"org_id" db:"org_id"`
	Name        string    `json:"name" db:"name"`
	TriggerType string    `json:"trigger_type" db:"trigger_type"`
	TriggerValue string   `json:"trigger_value" db:"trigger_value"`
	ResponseText string   `json:"response_text" db:"response_text"`
	IsActive    bool      `json:"is_active" db:"is_active"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
}

type WelcomeMessage struct {
	ID        string    `json:"id" db:"id"`
	OrgID     string    `json:"org_id" db:"org_id"`
	Message   string    `json:"message" db:"message"`
	IsActive  bool      `json:"is_active" db:"is_active"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

type APIKey struct {
	ID          string          `json:"id" db:"id"`
	OrgID       string          `json:"org_id" db:"org_id"`
	Name        string          `json:"name" db:"name"`
	KeyHash     string          `json:"-" db:"key_hash"`
	KeyPrefix   string          `json:"key_prefix" db:"key_prefix"`
	Permissions json.RawMessage `json:"permissions" db:"permissions"`
	RateLimit   int             `json:"rate_limit" db:"rate_limit"`
	IsActive    bool            `json:"is_active" db:"is_active"`
	LastUsedAt  *time.Time      `json:"last_used_at" db:"last_used_at"`
	ExpiresAt   *time.Time      `json:"expires_at" db:"expires_at"`
	CreatedAt   time.Time       `json:"created_at" db:"created_at"`
}
