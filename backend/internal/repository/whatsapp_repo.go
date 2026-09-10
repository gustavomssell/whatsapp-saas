package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/user/whatsapp-saas/internal/models"
)

type WhatsappRepo struct {
	db *pgxpool.Pool
}

func (r *WhatsappRepo) DB() *pgxpool.Pool {
	return r.db
}

func NewWhatsappRepo(db *pgxpool.Pool) *WhatsappRepo {
	return &WhatsappRepo{db: db}
}

func (r *WhatsappRepo) UpsertConversation(ctx context.Context, conv *models.WhatsappConversation) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO whatsapp_conversations (org_id, jid, name, phone, is_group, last_message, last_message_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 ON CONFLICT (org_id, jid) DO UPDATE SET
		   name = COALESCE(NULLIF($3,''), whatsapp_conversations.name),
		   phone = COALESCE(NULLIF($4,''), whatsapp_conversations.phone),
		   last_message = COALESCE($6, whatsapp_conversations.last_message),
		   last_message_at = COALESCE($7, whatsapp_conversations.last_message_at),
		   unread_count = CASE WHEN $5 = FALSE THEN whatsapp_conversations.unread_count + 1 ELSE whatsapp_conversations.unread_count END,
		   updated_at = NOW()`,
		conv.OrgID, conv.Jid, conv.Name, conv.Phone, conv.IsGroup, conv.LastMessage, conv.LastMessageAt,
	)
	return err
}

func (r *WhatsappRepo) UpsertConversationFromMe(ctx context.Context, conv *models.WhatsappConversation) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO whatsapp_conversations (org_id, jid, name, phone, is_group, last_message, last_message_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 ON CONFLICT (org_id, jid) DO UPDATE SET
		   name = COALESCE(NULLIF($3,''), whatsapp_conversations.name),
		   phone = COALESCE(NULLIF($4,''), whatsapp_conversations.phone),
		   last_message = COALESCE($6, whatsapp_conversations.last_message),
		   last_message_at = COALESCE($7, whatsapp_conversations.last_message_at),
		   updated_at = NOW()`,
		conv.OrgID, conv.Jid, conv.Name, conv.Phone, conv.IsGroup, conv.LastMessage, conv.LastMessageAt,
	)
	return err
}

func (r *WhatsappRepo) FindConversationByJid(ctx context.Context, orgID, jid string) (*models.WhatsappConversation, error) {
	conv := &models.WhatsappConversation{}
	err := r.db.QueryRow(ctx,
		`SELECT id, org_id, jid, name, phone, is_group, avatar_url, last_message, last_message_at, unread_count, tags, assigned_guide, is_archived, is_pinned, created_at, updated_at
		 FROM whatsapp_conversations WHERE org_id = $1 AND jid = $2`, orgID, jid,
	).Scan(&conv.ID, &conv.OrgID, &conv.Jid, &conv.Name, &conv.Phone, &conv.IsGroup,
		&conv.AvatarURL, &conv.LastMessage, &conv.LastMessageAt, &conv.UnreadCount,
		&conv.Tags, &conv.AssignedGuide, &conv.IsArchived, &conv.IsPinned,
		&conv.CreatedAt, &conv.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return conv, nil
}

func (r *WhatsappRepo) ListConversations(ctx context.Context, orgID string, limit, offset int, filters models.ConversationFilters) ([]models.WhatsappConversation, int, error) {
	where := `org_id = $1 AND is_archived = FALSE`
	args := []interface{}{orgID}
	argIdx := 2

	if filters.Tag != "" {
		where += fmt.Sprintf(` AND $%d = ANY(tags)`, argIdx)
		args = append(args, filters.Tag)
		argIdx++
	}
	if filters.Guide != "" {
		where += fmt.Sprintf(` AND assigned_guide = $%d`, argIdx)
		args = append(args, filters.Guide)
		argIdx++
	}
	if filters.UnreadOnly {
		where += ` AND unread_count > 0`
	}
	if filters.Search != "" {
		where += fmt.Sprintf(` AND (name ILIKE $%d OR phone ILIKE $%d)`, argIdx, argIdx)
		args = append(args, "%"+filters.Search+"%")
		argIdx++
	}

	var total int
	r.db.QueryRow(ctx, fmt.Sprintf("SELECT COUNT(*) FROM whatsapp_conversations WHERE %s", where), args...).Scan(&total)

	args = append(args, limit, offset)
	query := fmt.Sprintf(
		`SELECT id, org_id, jid, name, phone, is_group, avatar_url, last_message, last_message_at, unread_count, tags, assigned_guide, is_archived, is_pinned, created_at, updated_at
		 FROM whatsapp_conversations WHERE %s ORDER BY is_pinned DESC, last_message_at DESC NULLS LAST LIMIT $%d OFFSET $%d`,
		where, argIdx, argIdx+1,
	)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var convs []models.WhatsappConversation
	for rows.Next() {
		var c models.WhatsappConversation
		if err := rows.Scan(&c.ID, &c.OrgID, &c.Jid, &c.Name, &c.Phone, &c.IsGroup,
			&c.AvatarURL, &c.LastMessage, &c.LastMessageAt, &c.UnreadCount,
			&c.Tags, &c.AssignedGuide, &c.IsArchived, &c.IsPinned,
			&c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, 0, err
		}
		convs = append(convs, c)
	}
	return convs, total, nil
}

func (r *WhatsappRepo) ListMessages(ctx context.Context, conversationID string, limit int) ([]models.WhatsappMessage, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, conversation_id, org_id, remote_msg_id, sender, sender_name, content, msg_type, media_url, media_type, from_me, is_group, status, reactions, quoted_msg_id, is_edited, edit_history, is_deleted, deleted_for, timestamp, created_at
		 FROM (SELECT * FROM whatsapp_messages WHERE conversation_id = $1 AND is_deleted = FALSE ORDER BY timestamp DESC LIMIT $2) sub
		 ORDER BY timestamp ASC`, conversationID, limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var msgs []models.WhatsappMessage
	for rows.Next() {
		var m models.WhatsappMessage
		if err := rows.Scan(&m.ID, &m.ConversationID, &m.OrgID, &m.RemoteMsgID, &m.Sender, &m.SenderName,
			&m.Content, &m.MsgType, &m.MediaURL, &m.MediaType, &m.FromMe, &m.IsGroup,
			&m.Status, &m.Reactions, &m.QuotedMsgID, &m.IsEdited, &m.EditHistory, &m.IsDeleted, &m.DeletedFor, &m.Timestamp, &m.CreatedAt); err != nil {
			return nil, err
		}
		msgs = append(msgs, m)
	}
	return msgs, nil
}

func (r *WhatsappRepo) InsertMessage(ctx context.Context, msg *models.WhatsappMessage) error {
	query := `
		INSERT INTO whatsapp_messages (conversation_id, org_id, remote_msg_id, sender, sender_name, content, msg_type, media_url, media_type, from_me, is_group, status, reactions, quoted_msg_id, timestamp)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
		ON CONFLICT DO NOTHING
		RETURNING id, created_at
	`
	return r.db.QueryRow(ctx, query,
		msg.ConversationID, msg.OrgID, msg.RemoteMsgID, msg.Sender,
		msg.SenderName, msg.Content, msg.MsgType, msg.MediaURL,
		msg.MediaType, msg.FromMe, msg.IsGroup, msg.Status,
		msg.Reactions, msg.QuotedMsgID, msg.Timestamp,
	).Scan(&msg.ID, &msg.CreatedAt)
}

func (r *WhatsappRepo) MarkAsRead(ctx context.Context, orgID, conversationID string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE whatsapp_conversations SET unread_count = 0, updated_at = NOW() WHERE id = $1 AND org_id = $2`,
		conversationID, orgID,
	)
	return err
}

func (r *WhatsappRepo) ArchiveConversation(ctx context.Context, orgID, conversationID string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE whatsapp_conversations SET is_archived = TRUE, updated_at = NOW() WHERE id = $1 AND org_id = $2`,
		conversationID, orgID,
	)
	return err
}

func (r *WhatsappRepo) UnarchiveConversation(ctx context.Context, orgID, conversationID string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE whatsapp_conversations SET is_archived = FALSE, updated_at = NOW() WHERE id = $1 AND org_id = $2`,
		conversationID, orgID,
	)
	return err
}

func (r *WhatsappRepo) AssignGuide(ctx context.Context, orgID, conversationID, guide string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE whatsapp_conversations SET assigned_guide = $3, updated_at = NOW() WHERE id = $1 AND org_id = $2`,
		conversationID, orgID, guide,
	)
	return err
}

func (r *WhatsappRepo) UpdateTags(ctx context.Context, orgID, conversationID string, tags []string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE whatsapp_conversations SET tags = $3, updated_at = NOW() WHERE id = $1 AND org_id = $2`,
		conversationID, orgID, tags,
	)
	return err
}

func (r *WhatsappRepo) PinConversation(ctx context.Context, orgID, conversationID string, pinned bool) error {
	_, err := r.db.Exec(ctx,
		`UPDATE whatsapp_conversations SET is_pinned = $3, updated_at = NOW() WHERE id = $1 AND org_id = $2`,
		conversationID, orgID, pinned,
	)
	return err
}

func (r *WhatsappRepo) SetMessageReaction(ctx context.Context, conversationID, remoteMsgID, emoji string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE whatsapp_messages SET reactions = reactions::jsonb || $3::jsonb
		 WHERE conversation_id = $1 AND remote_msg_id = $2`,
		conversationID, remoteMsgID, fmt.Sprintf(`["%s"]`, emoji),
	)
	return err
}

func (r *WhatsappRepo) UpdateMessageContentByRemoteID(ctx context.Context, orgID, remoteMsgID, newContent string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE whatsapp_messages SET content = $3, is_edited = TRUE WHERE org_id = $1 AND remote_msg_id = $2`,
		orgID, remoteMsgID, newContent,
	)
	return err
}

func (r *WhatsappRepo) UpdateMessageStatus(ctx context.Context, orgID, remoteMsgID, status string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE whatsapp_messages SET status=$1 WHERE org_id=$2 AND remote_msg_id=$3`,
		status, orgID, remoteMsgID,
	)
	return err
}

func (r *WhatsappRepo) MarkMessageEdited(ctx context.Context, orgID, remoteMsgID string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE whatsapp_messages SET is_edited = TRUE WHERE org_id = $1 AND remote_msg_id = $2`,
		orgID, remoteMsgID,
	)
	return err
}

func (r *WhatsappRepo) FindOrgByInstanceID(ctx context.Context, instanceID string) (string, error) {
	var orgID string
	err := r.db.QueryRow(ctx,
		`SELECT id FROM organizations WHERE whatsapp_instance_id = $1`,
		instanceID,
	).Scan(&orgID)
	if err != nil {
		return "", fmt.Errorf("org not found for instance %s: %w", instanceID, err)
	}
	return orgID, nil
}

func (r *WhatsappRepo) FindOrgByInstanceName(ctx context.Context, instanceName string) (string, error) {
	var orgID string
	err := r.db.QueryRow(ctx,
		`SELECT id FROM organizations WHERE whatsapp_instance_name = $1 OR id = $1`,
		instanceName,
	).Scan(&orgID)
	if err != nil {
		return "", fmt.Errorf("org not found for instance %s: %w", instanceName, err)
	}
	return orgID, nil
}

func (r *WhatsappRepo) SetInstance(ctx context.Context, orgID, instanceID, instanceName string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE organizations SET whatsapp_instance_id = $2, whatsapp_instance_name = $3, updated_at = NOW() WHERE id = $1`,
		orgID, instanceID, instanceName,
	)
	return err
}

func (r *WhatsappRepo) ClearInstance(ctx context.Context, orgID string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE organizations SET whatsapp_instance_id = NULL, whatsapp_instance_name = NULL, updated_at = NOW() WHERE id = $1`,
		orgID,
	)
	return err
}

func (r *WhatsappRepo) GetOrgInstance(ctx context.Context, orgID string) (instanceID, instanceName string, err error) {
	err = r.db.QueryRow(ctx,
		`SELECT COALESCE(whatsapp_instance_id,''), COALESCE(whatsapp_instance_name,'') FROM organizations WHERE id = $1`,
		orgID,
	).Scan(&instanceID, &instanceName)
	return
}

func (r *WhatsappRepo) DashboardStats(ctx context.Context, orgID string) (*models.DashboardStats, error) {
	stats := &models.DashboardStats{}
	r.db.QueryRow(ctx, `SELECT COUNT(*) FROM whatsapp_conversations WHERE org_id=$1 AND is_archived=FALSE`, orgID).Scan(&stats.TotalConversations)
	r.db.QueryRow(ctx, `SELECT COUNT(*) FROM whatsapp_conversations WHERE org_id=$1 AND is_archived=FALSE AND unread_count>0`, orgID).Scan(&stats.UnreadConversations)
	r.db.QueryRow(ctx, `SELECT COUNT(*) FROM whatsapp_messages WHERE org_id=$1 AND from_me=TRUE AND timestamp::date=CURRENT_DATE`, orgID).Scan(&stats.MessagesSentToday)
	r.db.QueryRow(ctx, `SELECT COUNT(*) FROM whatsapp_messages WHERE org_id=$1 AND from_me=FALSE AND timestamp::date=CURRENT_DATE`, orgID).Scan(&stats.MessagesReceivedToday)
	r.db.QueryRow(ctx, `SELECT COUNT(*) FROM whatsapp_groups WHERE org_id=$1 AND is_archived=FALSE`, orgID).Scan(&stats.ActiveGroups)
	return stats, nil
}

func (r *WhatsappRepo) BulkArchive(ctx context.Context, orgID string, ids []string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE whatsapp_conversations SET is_archived = TRUE, updated_at = NOW() WHERE id = ANY($1) AND org_id = $2`,
		ids, orgID,
	)
	return err
}

func (r *WhatsappRepo) BulkTag(ctx context.Context, orgID string, ids []string, tag string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE whatsapp_conversations SET tags = array_append(tags, $3), updated_at = NOW() WHERE id = ANY($1) AND org_id = $2 AND NOT ($3 = ANY(tags))`,
		ids, orgID, tag,
	)
	return err
}

func (r *WhatsappRepo) BulkAssignGuide(ctx context.Context, orgID string, ids []string, guide string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE whatsapp_conversations SET assigned_guide = $3, updated_at = NOW() WHERE id = ANY($1) AND org_id = $2`,
		ids, orgID, guide,
	)
	return err
}

func (r *WhatsappRepo) SearchConversations(ctx context.Context, orgID, query string, limit int) ([]models.WhatsappConversation, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, org_id, jid, name, phone, is_group, avatar_url, last_message, last_message_at, unread_count, tags, assigned_guide, is_archived, is_pinned, created_at, updated_at
		 FROM whatsapp_conversations WHERE org_id=$1 AND is_archived=FALSE AND (name ILIKE $2 OR phone ILIKE $2 OR jid ILIKE $2)
		 ORDER BY last_message_at DESC LIMIT $3`,
		orgID, "%"+query+"%", limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var convs []models.WhatsappConversation
	for rows.Next() {
		var c models.WhatsappConversation
		rows.Scan(&c.ID, &c.OrgID, &c.Jid, &c.Name, &c.Phone, &c.IsGroup,
			&c.AvatarURL, &c.LastMessage, &c.LastMessageAt, &c.UnreadCount,
			&c.Tags, &c.AssignedGuide, &c.IsArchived, &c.IsPinned,
			&c.CreatedAt, &c.UpdatedAt)
		convs = append(convs, c)
	}
	return convs, nil
}

func (r *WhatsappRepo) ListQuickReplies(ctx context.Context, orgID string) ([]models.WhatsappQuickReply, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, org_id, shortcut, title, content, COALESCE(media_url,''), COALESCE(media_type,''), variables, is_global, created_at
		 FROM whatsapp_quick_replies WHERE org_id = $1 ORDER BY shortcut`, orgID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var qrs []models.WhatsappQuickReply
	for rows.Next() {
		var q models.WhatsappQuickReply
		rows.Scan(&q.ID, &q.OrgID, &q.Shortcut, &q.Title, &q.Content, &q.MediaURL, &q.MediaType, &q.Variables, &q.IsGlobal, &q.CreatedAt)
		qrs = append(qrs, q)
	}
	return qrs, nil
}

func (r *WhatsappRepo) CreateQuickReply(ctx context.Context, qr *models.WhatsappQuickReply) error {
	return r.db.QueryRow(ctx,
		`INSERT INTO whatsapp_quick_replies (org_id, shortcut, title, content, media_url, media_type, variables, is_global)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, created_at`,
		qr.OrgID, qr.Shortcut, qr.Title, qr.Content, qr.MediaURL, qr.MediaType, qr.Variables, qr.IsGlobal,
	).Scan(&qr.ID, &qr.CreatedAt)
}

func (r *WhatsappRepo) DeleteQuickReply(ctx context.Context, orgID, qrID string) error {
	_, err := r.db.Exec(ctx,
		`DELETE FROM whatsapp_quick_replies WHERE id = $1 AND org_id = $2`, qrID, orgID,
	)
	return err
}

func (r *WhatsappRepo) FindMessageByRemoteID(ctx context.Context, orgID, remoteMsgID string) (*models.WhatsappMessage, error) {
	var m models.WhatsappMessage
	err := r.db.QueryRow(ctx,
		`SELECT id, conversation_id, org_id, remote_msg_id, sender, sender_name, content, msg_type, media_url, media_type, from_me, is_group, status, reactions, quoted_msg_id, is_edited, edit_history, is_deleted, deleted_for, timestamp, created_at
		 FROM whatsapp_messages WHERE org_id = $1 AND remote_msg_id = $2`, orgID, remoteMsgID,
	).Scan(&m.ID, &m.ConversationID, &m.OrgID, &m.RemoteMsgID, &m.Sender, &m.SenderName,
		&m.Content, &m.MsgType, &m.MediaURL, &m.MediaType, &m.FromMe, &m.IsGroup,
		&m.Status, &m.Reactions, &m.QuotedMsgID, &m.IsEdited, &m.IsDeleted, &m.DeletedFor, &m.Timestamp, &m.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &m, nil
}

func (r *WhatsappRepo) SearchMessages(ctx context.Context, conversationID, query string, limit int) ([]models.WhatsappMessage, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, conversation_id, org_id, remote_msg_id, sender, sender_name, content, msg_type, media_url, media_type, from_me, is_group, status, reactions, quoted_msg_id, is_edited, edit_history, is_deleted, deleted_for, timestamp, created_at
		 FROM whatsapp_messages
		 WHERE conversation_id = $1 AND is_deleted = FALSE AND content ILIKE $2
		 ORDER BY timestamp DESC LIMIT $3`,
		conversationID, "%"+query+"%", limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var msgs []models.WhatsappMessage
	for rows.Next() {
		var m models.WhatsappMessage
		if err := rows.Scan(&m.ID, &m.ConversationID, &m.OrgID, &m.RemoteMsgID, &m.Sender, &m.SenderName,
			&m.Content, &m.MsgType, &m.MediaURL, &m.MediaType, &m.FromMe, &m.IsGroup,
			&m.Status, &m.Reactions, &m.QuotedMsgID, &m.IsEdited, &m.EditHistory, &m.IsDeleted, &m.DeletedFor, &m.Timestamp, &m.CreatedAt); err != nil {
			return nil, err
		}
		msgs = append(msgs, m)
	}
	return msgs, nil
}

func (r *WhatsappRepo) DeleteMessage(ctx context.Context, orgID, remoteMsgID, deletedFor string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE whatsapp_messages SET is_deleted = TRUE, deleted_for = $3 WHERE org_id = $1 AND remote_msg_id = $2`,
		orgID, remoteMsgID, deletedFor,
	)
	return err
}

func (r *WhatsappRepo) UpdateMessageContent(ctx context.Context, orgID, remoteMsgID, newContent string, editHistory []byte) error {
	_, err := r.db.Exec(ctx,
		`UPDATE whatsapp_messages SET content = $3, is_edited = TRUE, edit_history = $4 WHERE org_id = $1 AND remote_msg_id = $2`,
		orgID, remoteMsgID, newContent, editHistory,
	)
	return err
}

func (r *WhatsappRepo) ArchiveInactiveConversations(ctx context.Context, orgID string, inactiveDays int) (int64, error) {
	result, err := r.db.Exec(ctx,
		`UPDATE whatsapp_conversations
		 SET is_archived = TRUE
		 WHERE org_id = $1
		   AND is_archived = FALSE
		   AND last_message_at < NOW() - ($2 || ' days')::INTERVAL`,
		orgID, inactiveDays,
	)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected(), nil
}

func (r *WhatsappRepo) GetTagColors(ctx context.Context, orgID string) ([]models.TagColor, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, org_id, tag, color, created_at FROM tag_colors WHERE org_id = $1 ORDER BY tag`, orgID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var colors []models.TagColor
	for rows.Next() {
		var tc models.TagColor
		rows.Scan(&tc.ID, &tc.OrgID, &tc.Tag, &tc.Color, &tc.CreatedAt)
		colors = append(colors, tc)
	}
	return colors, nil
}

func (r *WhatsappRepo) SetTagColor(ctx context.Context, orgID, tag, color string) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO tag_colors (org_id, tag, color) VALUES ($1, $2, $3)
		 ON CONFLICT (org_id, tag) DO UPDATE SET color = $3`,
		orgID, tag, color,
	)
	return err
}

func (r *WhatsappRepo) DeleteTagColor(ctx context.Context, orgID, tag string) error {
	_, err := r.db.Exec(ctx,
		`DELETE FROM tag_colors WHERE org_id = $1 AND tag = $2`, orgID, tag,
	)
	return err
}

func (r *WhatsappRepo) FindConversationIDByJid(ctx context.Context, orgID, jid string) (string, error) {
	var id string
	err := r.db.QueryRow(ctx,
		`SELECT id FROM whatsapp_conversations WHERE org_id = $1 AND jid = $2`, orgID, jid,
	).Scan(&id)
	return id, err
}

func (r *WhatsappRepo) ListNotes(ctx context.Context, orgID, convJid string) ([]models.WhatsappNote, error) {
	convID, err := r.FindConversationIDByJid(ctx, orgID, convJid)
	if err != nil {
		return nil, err
	}
	notes := []models.WhatsappNote{}
	rows, err := r.db.Query(ctx,
		`SELECT id, conversation_id, org_id, user_name, content, created_at
		 FROM whatsapp_notes WHERE org_id = $1 AND conversation_id = $2 ORDER BY created_at DESC`,
		orgID, convID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var note models.WhatsappNote
		if err := rows.Scan(&note.ID, &note.ConversationID, &note.OrgID, &note.UserName, &note.Content, &note.CreatedAt); err != nil {
			return nil, err
		}
		notes = append(notes, note)
	}
	return notes, rows.Err()
}

func (r *WhatsappRepo) CreateNote(ctx context.Context, orgID, convJid, userName string, content string) (*models.WhatsappNote, error) {
	convID, err := r.FindConversationIDByJid(ctx, orgID, convJid)
	if err != nil {
		return nil, err
	}
	note := &models.WhatsappNote{}
	err = r.db.QueryRow(ctx,
		`INSERT INTO whatsapp_notes (org_id, conversation_id, user_name, content)
		 VALUES ($1, $2, $3, $4) RETURNING id, conversation_id, org_id, user_name, content, created_at`,
		orgID, convID, userName, content,
	).Scan(&note.ID, &note.ConversationID, &note.OrgID, &note.UserName, &note.Content, &note.CreatedAt)
	return note, err
}

func (r *WhatsappRepo) UpsertGroup(ctx context.Context, grp *models.WhatsappGroup) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO whatsapp_groups (org_id, group_jid, subject, description, participant_count)
		 VALUES ($1, $2, $3, $4, $5)
		 ON CONFLICT (org_id, group_jid) DO UPDATE SET
		   subject = COALESCE(NULLIF($3,''), whatsapp_groups.subject),
		   description = COALESCE(NULLIF($4,''), whatsapp_groups.description),
		   participant_count = $5,
		   updated_at = NOW()`,
		grp.OrgID, grp.GroupJid, grp.Subject, grp.Description, grp.ParticipantCount,
	)
	return err
}

func (r *WhatsappRepo) ListGroups(ctx context.Context, orgID string) ([]models.WhatsappGroup, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, org_id, group_jid, subject, description, participant_count, is_archived, created_at, updated_at
		 FROM whatsapp_groups WHERE org_id = $1 AND is_archived = FALSE ORDER BY subject`, orgID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var groups []models.WhatsappGroup
	for rows.Next() {
		var g models.WhatsappGroup
		rows.Scan(&g.ID, &g.OrgID, &g.GroupJid, &g.Subject, &g.Description, &g.ParticipantCount, &g.IsArchived, &g.CreatedAt, &g.UpdatedAt)
		groups = append(groups, g)
	}
	return groups, nil
}

func (r *WhatsappRepo) FindGroupByJid(ctx context.Context, orgID, groupJid string) (*models.WhatsappGroup, error) {
	g := &models.WhatsappGroup{}
	err := r.db.QueryRow(ctx,
		`SELECT id, org_id, group_jid, subject, description, participant_count, is_archived, created_at, updated_at
		 FROM whatsapp_groups WHERE org_id = $1 AND group_jid = $2`, orgID, groupJid,
	).Scan(&g.ID, &g.OrgID, &g.GroupJid, &g.Subject, &g.Description, &g.ParticipantCount, &g.IsArchived, &g.CreatedAt, &g.UpdatedAt)
	return g, err
}

func (r *WhatsappRepo) InsertGroupMessage(ctx context.Context, msg *models.WhatsappGroupMessage) error {
	query := `
		INSERT INTO whatsapp_group_messages (group_id, org_id, remote_msg_id, sender, sender_name, content, msg_type, media_url, media_type, from_me, status, reactions, timestamp)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		ON CONFLICT DO NOTHING
		RETURNING id, created_at
	`
	return r.db.QueryRow(ctx, query,
		msg.GroupID, msg.OrgID, msg.RemoteMsgID, msg.Sender, msg.SenderName,
		msg.Content, msg.MsgType, msg.MediaURL, msg.MediaType, msg.FromMe,
		msg.Status, msg.Reactions, msg.Timestamp,
	).Scan(&msg.ID, &msg.CreatedAt)
}

func (r *WhatsappRepo) ListGroupMessages(ctx context.Context, groupID string, limit int) ([]models.WhatsappGroupMessage, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, group_id, org_id, remote_msg_id, sender, sender_name, content, msg_type, media_url, media_type, from_me, status, reactions, timestamp, created_at
		 FROM (SELECT * FROM whatsapp_group_messages WHERE group_id = $1 ORDER BY timestamp DESC LIMIT $2) sub
		 ORDER BY timestamp ASC`, groupID, limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var msgs []models.WhatsappGroupMessage
	for rows.Next() {
		var m models.WhatsappGroupMessage
		rows.Scan(&m.ID, &m.GroupID, &m.OrgID, &m.RemoteMsgID, &m.Sender, &m.SenderName,
			&m.Content, &m.MsgType, &m.MediaURL, &m.MediaType, &m.FromMe,
			&m.Status, &m.Reactions, &m.Timestamp, &m.CreatedAt)
		msgs = append(msgs, m)
	}
	return msgs, nil
}


