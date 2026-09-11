package repository

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/user/whatsapp-saas/internal/models"
)

type ContactRepo struct {
	db *pgxpool.Pool
}

func NewContactRepo(db *pgxpool.Pool) *ContactRepo {
	return &ContactRepo{db: db}
}

func (r *ContactRepo) ListContacts(ctx context.Context, orgID, search, tag string, limit, offset int) ([]models.WhatsappContact, int, error) {
	where := `org_id = $1`
	args := []interface{}{orgID}
	argIdx := 2

	if search != "" {
		where += fmt.Sprintf(` AND (name ILIKE $%d OR phone ILIKE $%d OR email ILIKE $%d OR company ILIKE $%d)`, argIdx, argIdx, argIdx, argIdx)
		args = append(args, "%"+search+"%")
		argIdx++
	}
	if tag != "" {
		where += fmt.Sprintf(` AND $%d = ANY(tags)`, argIdx)
		args = append(args, tag)
		argIdx++
	}

	var total int
	r.db.QueryRow(ctx, fmt.Sprintf("SELECT COUNT(*) FROM whatsapp_contacts WHERE %s", where), args...).Scan(&total)

	args = append(args, limit, offset)
	query := fmt.Sprintf(
		`SELECT id, org_id, phone, name, email, company, tags, notes, avatar_url, is_whatsapp, is_my_contact, created_at, updated_at
		 FROM whatsapp_contacts WHERE %s ORDER BY name ASC LIMIT $%d OFFSET $%d`,
		where, argIdx, argIdx+1,
	)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var contacts []models.WhatsappContact
	for rows.Next() {
		var c models.WhatsappContact
		if err := rows.Scan(&c.ID, &c.OrgID, &c.Phone, &c.Name, &c.Email, &c.Company,
			&c.Tags, &c.Notes, &c.AvatarURL, &c.IsWhatsApp, &c.IsMyContact,
			&c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, 0, err
		}
		contacts = append(contacts, c)
	}
	return contacts, total, nil
}

func (r *ContactRepo) GetContact(ctx context.Context, orgID, id string) (*models.WhatsappContact, error) {
	c := &models.WhatsappContact{}
	err := r.db.QueryRow(ctx,
		`SELECT id, org_id, phone, name, email, company, tags, notes, avatar_url, is_whatsapp, is_my_contact, created_at, updated_at
		 FROM whatsapp_contacts WHERE org_id = $1 AND id = $2`, orgID, id,
	).Scan(&c.ID, &c.OrgID, &c.Phone, &c.Name, &c.Email, &c.Company,
		&c.Tags, &c.Notes, &c.AvatarURL, &c.IsWhatsApp, &c.IsMyContact,
		&c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return c, nil
}

func (r *ContactRepo) CreateContact(ctx context.Context, c *models.WhatsappContact) error {
	return r.db.QueryRow(ctx,
		`INSERT INTO whatsapp_contacts (org_id, phone, name, email, company, tags, notes, avatar_url, is_whatsapp, is_my_contact)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id, created_at, updated_at`,
		c.OrgID, c.Phone, c.Name, c.Email, c.Company, c.Tags, c.Notes, c.AvatarURL, c.IsWhatsApp, c.IsMyContact,
	).Scan(&c.ID, &c.CreatedAt, &c.UpdatedAt)
}

func (r *ContactRepo) UpdateContact(ctx context.Context, c *models.WhatsappContact) error {
	_, err := r.db.Exec(ctx,
		`UPDATE whatsapp_contacts SET name=$3, email=$4, company=$5, tags=$6, notes=$7, avatar_url=$8, is_whatsapp=$9, is_my_contact=$10, updated_at=NOW()
		 WHERE org_id=$1 AND id=$2`,
		c.OrgID, c.ID, c.Name, c.Email, c.Company, c.Tags, c.Notes, c.AvatarURL, c.IsWhatsApp, c.IsMyContact,
	)
	return err
}

func (r *ContactRepo) DeleteContact(ctx context.Context, orgID, id string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM whatsapp_contacts WHERE org_id=$1 AND id=$2`, orgID, id)
	return err
}

func (r *ContactRepo) UpsertContact(ctx context.Context, c *models.WhatsappContact) error {
	return r.db.QueryRow(ctx,
		`INSERT INTO whatsapp_contacts (org_id, phone, name, email, company, tags, notes, avatar_url, is_whatsapp, is_my_contact)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		 ON CONFLICT (org_id, phone) DO UPDATE SET
		   name = COALESCE(NULLIF($3,''), whatsapp_contacts.name),
		   email = COALESCE(NULLIF($4,''), whatsapp_contacts.email),
		   company = COALESCE(NULLIF($5,''), whatsapp_contacts.company),
		   avatar_url = COALESCE(NULLIF($8,''), whatsapp_contacts.avatar_url),
		   is_whatsapp = $9,
		   is_my_contact = $10,
		   updated_at = NOW()
		 RETURNING id, created_at, updated_at`,
		c.OrgID, c.Phone, c.Name, c.Email, c.Company, c.Tags, c.Notes, c.AvatarURL, c.IsWhatsApp, c.IsMyContact,
	).Scan(&c.ID, &c.CreatedAt, &c.UpdatedAt)
}

func (r *ContactRepo) BulkUpsertContacts(ctx context.Context, orgID string, contacts []models.WhatsappContact) (int, error) {
	if len(contacts) == 0 {
		return 0, nil
	}

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback(ctx)

	count := 0
	for i := range contacts {
		c := &contacts[i]
		c.OrgID = orgID
		_, err := tx.Exec(ctx,
			`INSERT INTO whatsapp_contacts (org_id, phone, name, email, company, tags, notes, avatar_url, is_whatsapp, is_my_contact)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
			 ON CONFLICT (org_id, phone) DO UPDATE SET
			   name = COALESCE(NULLIF($3,''), whatsapp_contacts.name),
			   email = COALESCE(NULLIF($4,''), whatsapp_contacts.email),
			   company = COALESCE(NULLIF($5,''), whatsapp_contacts.company),
			   avatar_url = COALESCE(NULLIF($8,''), whatsapp_contacts.avatar_url),
			   is_whatsapp = $9,
			   is_my_contact = $10,
			   updated_at = NOW()`,
			c.OrgID, c.Phone, c.Name, c.Email, c.Company, c.Tags, c.Notes, c.AvatarURL, c.IsWhatsApp, c.IsMyContact,
		)
		if err != nil {
			return count, fmt.Errorf("erro ao upsert contato %s: %w", c.Phone, err)
		}
		count++
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, err
	}
	return count, nil
}

func (r *ContactRepo) DeleteAllContacts(ctx context.Context, orgID string) (int64, error) {
	result, err := r.db.Exec(ctx, `DELETE FROM whatsapp_contacts WHERE org_id=$1`, orgID)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected(), nil
}

func (r *ContactRepo) SearchContacts(ctx context.Context, orgID, query string, limit int) ([]models.WhatsappContact, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, org_id, phone, name, email, company, tags, notes, avatar_url, is_whatsapp, is_my_contact, created_at, updated_at
		 FROM whatsapp_contacts WHERE org_id=$1 AND (name ILIKE $2 OR phone ILIKE $2 OR email ILIKE $2)
		 ORDER BY name ASC LIMIT $3`,
		orgID, "%"+query+"%", limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var contacts []models.WhatsappContact
	for rows.Next() {
		var c models.WhatsappContact
		if err := rows.Scan(&c.ID, &c.OrgID, &c.Phone, &c.Name, &c.Email, &c.Company,
			&c.Tags, &c.Notes, &c.AvatarURL, &c.IsWhatsApp, &c.IsMyContact,
			&c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		contacts = append(contacts, c)
	}
	return contacts, nil
}

func (r *ContactRepo) ExportContactsCSV(ctx context.Context, orgID string) ([]models.WhatsappContact, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, org_id, phone, name, email, company, tags, notes, avatar_url, is_whatsapp, is_my_contact, created_at, updated_at
		 FROM whatsapp_contacts WHERE org_id=$1 ORDER BY name ASC`, orgID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var contacts []models.WhatsappContact
	for rows.Next() {
		var c models.WhatsappContact
		if err := rows.Scan(&c.ID, &c.OrgID, &c.Phone, &c.Name, &c.Email, &c.Company,
			&c.Tags, &c.Notes, &c.AvatarURL, &c.IsWhatsApp, &c.IsMyContact,
			&c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		contacts = append(contacts, c)
	}
	return contacts, nil
}

func escapeCSV(s string) string {
	if strings.ContainsAny(s, "\",\n\r") {
		return "\"" + strings.ReplaceAll(s, "\"", "\"\"") + "\""
	}
	return s
}
