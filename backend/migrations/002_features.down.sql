-- 002_features.down.sql

ALTER TABLE whatsapp_messages DROP COLUMN IF EXISTS is_deleted;
ALTER TABLE whatsapp_messages DROP COLUMN IF EXISTS deleted_for;
ALTER TABLE whatsapp_messages DROP COLUMN IF EXISTS edit_history;

ALTER TABLE whatsapp_quick_replies DROP COLUMN IF EXISTS media_url;
ALTER TABLE whatsapp_quick_replies DROP COLUMN IF EXISTS media_type;

DROP TABLE IF EXISTS tag_colors;
