-- 004_contacts.up.sql

CREATE TABLE IF NOT EXISTS whatsapp_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    phone VARCHAR(50) NOT NULL,
    name VARCHAR(255) DEFAULT '',
    email VARCHAR(255) DEFAULT '',
    company VARCHAR(255) DEFAULT '',
    tags TEXT[] DEFAULT '{}',
    notes TEXT DEFAULT '',
    avatar_url TEXT DEFAULT '',
    is_whatsapp BOOLEAN DEFAULT TRUE,
    is_my_contact BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, phone)
);

CREATE INDEX idx_contacts_org ON whatsapp_contacts(org_id);
CREATE INDEX idx_contacts_phone ON whatsapp_contacts(org_id, phone);
CREATE INDEX idx_contacts_name ON whatsapp_contacts(org_id, name);
