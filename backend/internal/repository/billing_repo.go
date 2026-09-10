package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/user/whatsapp-saas/internal/models"
)

type BillingRepo struct {
	db *pgxpool.Pool
}

func NewBillingRepo(db *pgxpool.Pool) *BillingRepo {
	return &BillingRepo{db: db}
}

func (r *BillingRepo) GetPlans(ctx context.Context) ([]models.Plan, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, name, display_name, price_monthly, price_yearly, max_conversations, max_messages_month, max_members, max_quick_replies, max_groups, features, is_active, created_at, updated_at
		 FROM plans WHERE is_active = TRUE ORDER BY price_monthly ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var plans []models.Plan
	for rows.Next() {
		var p models.Plan
		if err := rows.Scan(&p.ID, &p.Name, &p.DisplayName, &p.PriceMonthly, &p.PriceYearly,
			&p.MaxConversations, &p.MaxMessagesMonth, &p.MaxMembers, &p.MaxQuickReplies,
			&p.MaxGroups, &p.Features, &p.IsActive, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		plans = append(plans, p)
	}
	return plans, nil
}

func (r *BillingRepo) GetPlanByName(ctx context.Context, name string) (*models.Plan, error) {
	var p models.Plan
	err := r.db.QueryRow(ctx,
		`SELECT id, name, display_name, price_monthly, price_yearly, max_conversations, max_messages_month, max_members, max_quick_replies, max_groups, features, is_active, created_at, updated_at
		 FROM plans WHERE name = $1`, name,
	).Scan(&p.ID, &p.Name, &p.DisplayName, &p.PriceMonthly, &p.PriceYearly,
		&p.MaxConversations, &p.MaxMessagesMonth, &p.MaxMembers, &p.MaxQuickReplies,
		&p.MaxGroups, &p.Features, &p.IsActive, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *BillingRepo) GetOrgSubscription(ctx context.Context, orgID string) (*models.Subscription, *models.Plan, error) {
	var s models.Subscription
	var p models.Plan
	err := r.db.QueryRow(ctx,
		`SELECT s.id, s.org_id, s.plan_id, s.status, s.billing_cycle, s.current_period_start, s.current_period_end, s.trial_ends_at, s.cancelled_at, s.payment_method, s.created_at, s.updated_at,
		        p.id, p.name, p.display_name, p.price_monthly, p.price_yearly, p.max_conversations, p.max_messages_month, p.max_members, p.max_quick_replies, p.max_groups, p.features, p.is_active, p.created_at, p.updated_at
		 FROM subscriptions s JOIN plans p ON s.plan_id = p.id
		 WHERE s.org_id = $1`, orgID,
	).Scan(&s.ID, &s.OrgID, &s.PlanID, &s.Status, &s.BillingCycle, &s.CurrentPeriodStart, &s.CurrentPeriodEnd, &s.TrialEndsAt, &s.CancelledAt, &s.PaymentMethod, &s.CreatedAt, &s.UpdatedAt,
		&p.ID, &p.Name, &p.DisplayName, &p.PriceMonthly, &p.PriceYearly,
		&p.MaxConversations, &p.MaxMessagesMonth, &p.MaxMembers, &p.MaxQuickReplies,
		&p.MaxGroups, &p.Features, &p.IsActive, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, nil, err
	}
	return &s, &p, nil
}

func (r *BillingRepo) CreateSubscription(ctx context.Context, sub *models.Subscription) error {
	err := r.db.QueryRow(ctx,
		`INSERT INTO subscriptions (org_id, plan_id, status, billing_cycle, current_period_start, current_period_end, trial_ends_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING id, created_at`,
		sub.OrgID, sub.PlanID, sub.Status, sub.BillingCycle, sub.CurrentPeriodStart, sub.CurrentPeriodEnd, sub.TrialEndsAt,
	).Scan(&sub.ID, &sub.CreatedAt)
	return err
}

func (r *BillingRepo) UpdateSubscription(ctx context.Context, sub *models.Subscription) error {
	_, err := r.db.Exec(ctx,
		`UPDATE subscriptions SET plan_id = $2, status = $3, billing_cycle = $4, current_period_end = $5, updated_at = NOW()
		 WHERE id = $1`,
		sub.ID, sub.PlanID, sub.Status, sub.BillingCycle, sub.CurrentPeriodEnd,
	)
	return err
}

func (r *BillingRepo) GetOrgUsage(ctx context.Context, orgID, period string) (*models.UsageTracking, error) {
	var u models.UsageTracking
	err := r.db.QueryRow(ctx,
		`SELECT id, org_id, period, messages_sent, messages_received, conversations_active, members_count, api_calls, created_at, updated_at
		 FROM usage_tracking WHERE org_id = $1 AND period = $2`, orgID, period,
	).Scan(&u.ID, &u.OrgID, &u.Period, &u.MessagesSent, &u.MessagesReceived, &u.ConversationsActive, &u.MembersCount, &u.ApiCalls, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *BillingRepo) UpsertUsage(ctx context.Context, usage *models.UsageTracking) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO usage_tracking (org_id, period, messages_sent, messages_received, conversations_active, members_count, api_calls)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 ON CONFLICT (org_id, period) DO UPDATE SET
		   messages_sent = usage_tracking.messages_sent + EXCLUDED.messages_sent,
		   messages_received = usage_tracking.messages_received + EXCLUDED.messages_received,
		   conversations_active = EXCLUDED.conversations_active,
		   members_count = EXCLUDED.members_count,
		   api_calls = usage_tracking.api_calls + EXCLUDED.api_calls,
		   updated_at = NOW()`,
		usage.OrgID, usage.Period, usage.MessagesSent, usage.MessagesReceived,
		usage.ConversationsActive, usage.MembersCount, usage.ApiCalls,
	)
	return err
}

func (r *BillingRepo) IncrementUsage(ctx context.Context, orgID, metric string, amount int) error {
	period := time.Now().Format("2006-01")
	_, err := r.db.Exec(ctx,
		`INSERT INTO usage_tracking (org_id, period, `+metric+`)
		 VALUES ($1, $2, $3)
		 ON CONFLICT (org_id, period) DO UPDATE SET
		   `+metric+` = usage_tracking.`+metric+` + $3,
		   updated_at = NOW()`,
		orgID, period, amount,
	)
	return err
}

func (r *BillingRepo) CreateInvoice(ctx context.Context, inv *models.Invoice) error {
	err := r.db.QueryRow(ctx,
		`INSERT INTO invoices (org_id, subscription_id, amount, currency, status, payment_method, description, metadata, due_date)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		 RETURNING id, created_at`,
		inv.OrgID, inv.SubscriptionID, inv.Amount, inv.Currency, inv.Status,
		inv.PaymentMethod, inv.Description, inv.Metadata, inv.DueDate,
	).Scan(&inv.ID, &inv.CreatedAt)
	return err
}

func (r *BillingRepo) GetOrgInvoices(ctx context.Context, orgID string, limit int) ([]models.Invoice, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, org_id, subscription_id, amount, currency, status, payment_method, payment_id, description, metadata, due_date, paid_at, created_at
		 FROM invoices WHERE org_id = $1 ORDER BY created_at DESC LIMIT $2`, orgID, limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var invoices []models.Invoice
	for rows.Next() {
		var inv models.Invoice
		if err := rows.Scan(&inv.ID, &inv.OrgID, &inv.SubscriptionID, &inv.Amount, &inv.Currency,
			&inv.Status, &inv.PaymentMethod, &inv.PaymentID, &inv.Description, &inv.Metadata,
			&inv.DueDate, &inv.PaidAt, &inv.CreatedAt); err != nil {
			return nil, err
		}
		invoices = append(invoices, inv)
	}
	return invoices, nil
}

func (r *BillingRepo) CreateAPIKey(ctx context.Context, key *models.APIKey) error {
	err := r.db.QueryRow(ctx,
		`INSERT INTO api_keys (org_id, name, key_hash, key_prefix, permissions, rate_limit, expires_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING id, created_at`,
		key.OrgID, key.Name, key.KeyHash, key.KeyPrefix, key.Permissions, key.RateLimit, key.ExpiresAt,
	).Scan(&key.ID, &key.CreatedAt)
	return err
}

func (r *BillingRepo) ListAPIKeys(ctx context.Context, orgID string) ([]models.APIKey, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, org_id, name, key_prefix, permissions, rate_limit, is_active, last_used_at, expires_at, created_at
		 FROM api_keys WHERE org_id = $1 ORDER BY created_at DESC`, orgID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var keys []models.APIKey
	for rows.Next() {
		var k models.APIKey
		if err := rows.Scan(&k.ID, &k.OrgID, &k.Name, &k.KeyPrefix, &k.Permissions,
			&k.RateLimit, &k.IsActive, &k.LastUsedAt, &k.ExpiresAt, &k.CreatedAt); err != nil {
			return nil, err
		}
		keys = append(keys, k)
	}
	return keys, nil
}

func (r *BillingRepo) DeleteAPIKey(ctx context.Context, orgID, keyID string) error {
	_, err := r.db.Exec(ctx,
		`DELETE FROM api_keys WHERE org_id = $1 AND id = $2`, orgID, keyID,
	)
	return err
}

func (r *BillingRepo) ValidateAPIKey(ctx context.Context, keyHash string) (*models.APIKey, string, error) {
	var k models.APIKey
	var orgID string
	err := r.db.QueryRow(ctx,
		`SELECT id, org_id, name, key_prefix, permissions, rate_limit, is_active, last_used_at, expires_at, created_at
		 FROM api_keys WHERE key_hash = $1 AND is_active = TRUE`, keyHash,
	).Scan(&k.ID, &orgID, &k.Name, &k.KeyPrefix, &k.Permissions,
		&k.RateLimit, &k.IsActive, &k.LastUsedAt, &k.ExpiresAt, &k.CreatedAt)
	if err != nil {
		return nil, "", err
	}

	if k.ExpiresAt != nil && k.ExpiresAt.Before(time.Now()) {
		return nil, "", fmt.Errorf("api key expirada")
	}

	r.db.Exec(ctx, `UPDATE api_keys SET last_used_at = NOW() WHERE id = $1`, k.ID)

	return &k, orgID, nil
}
