-- 002_features.up.sql

ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS deleted_for VARCHAR(50) DEFAULT '';

ALTER TABLE whatsapp_quick_replies ADD COLUMN IF NOT EXISTS media_url TEXT DEFAULT '';
ALTER TABLE whatsapp_quick_replies ADD COLUMN IF NOT EXISTS media_type VARCHAR(100) DEFAULT '';

CREATE TABLE IF NOT EXISTS tag_colors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    tag VARCHAR(255) NOT NULL,
    color VARCHAR(7) DEFAULT '#00FFA7',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_tag_colors_org ON tag_colors(org_id);
