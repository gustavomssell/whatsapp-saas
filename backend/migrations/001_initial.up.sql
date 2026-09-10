-- 001_initial.up.sql

CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    logo_url TEXT DEFAULT '',
    whatsapp_instance_id VARCHAR(255),
    whatsapp_instance_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'member',
    avatar TEXT DEFAULT '',
    phone VARCHAR(50) DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, user_id)
);

CREATE TABLE IF NOT EXISTS whatsapp_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    jid VARCHAR(255) NOT NULL,
    name VARCHAR(255) DEFAULT '',
    phone VARCHAR(50) DEFAULT '',
    is_group BOOLEAN DEFAULT FALSE,
    avatar_url TEXT DEFAULT '',
    last_message TEXT DEFAULT '',
    last_message_at TIMESTAMPTZ,
    unread_count INT DEFAULT 0,
    tags TEXT[] DEFAULT '{}',
    assigned_guide VARCHAR(255) DEFAULT '',
    is_archived BOOLEAN DEFAULT FALSE,
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, jid)
);

CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES whatsapp_conversations(id) ON DELETE CASCADE NOT NULL,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    remote_msg_id VARCHAR(255) DEFAULT '',
    sender VARCHAR(255) DEFAULT '',
    sender_name VARCHAR(255) DEFAULT '',
    content TEXT DEFAULT '',
    msg_type VARCHAR(50) DEFAULT 'text',
    media_url TEXT DEFAULT '',
    media_type VARCHAR(100) DEFAULT '',
    from_me BOOLEAN DEFAULT FALSE,
    is_group BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'sent',
    reactions JSONB DEFAULT '[]',
    quoted_msg_id VARCHAR(255) DEFAULT '',
    is_edited BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whatsapp_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES whatsapp_conversations(id) ON DELETE CASCADE NOT NULL,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    user_id VARCHAR(255) DEFAULT '',
    user_name VARCHAR(255) DEFAULT '',
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whatsapp_quick_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    shortcut VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    variables TEXT[] DEFAULT '{}',
    is_global BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whatsapp_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    group_jid VARCHAR(255) NOT NULL,
    subject VARCHAR(255) DEFAULT '',
    description TEXT DEFAULT '',
    participant_count INT DEFAULT 0,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, group_jid)
);

CREATE TABLE IF NOT EXISTS whatsapp_group_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES whatsapp_groups(id) ON DELETE CASCADE NOT NULL,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    remote_msg_id VARCHAR(255) DEFAULT '',
    sender VARCHAR(255) DEFAULT '',
    sender_name VARCHAR(255) DEFAULT '',
    content TEXT DEFAULT '',
    msg_type VARCHAR(50) DEFAULT 'text',
    media_url TEXT DEFAULT '',
    media_type VARCHAR(100) DEFAULT '',
    from_me BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'sent',
    reactions JSONB DEFAULT '[]',
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conv_org ON whatsapp_conversations(org_id);
CREATE INDEX idx_conv_jid ON whatsapp_conversations(org_id, jid);
CREATE INDEX idx_msg_conv ON whatsapp_messages(conversation_id);
CREATE INDEX idx_msg_org ON whatsapp_messages(org_id);
CREATE INDEX idx_msg_timestamp ON whatsapp_messages(conversation_id, timestamp DESC);
CREATE INDEX idx_notes_conv ON whatsapp_notes(conversation_id);
CREATE INDEX idx_groups_org ON whatsapp_groups(org_id);
CREATE INDEX idx_group_msg_group ON whatsapp_group_messages(group_id);
CREATE INDEX idx_group_msg_timestamp ON whatsapp_group_messages(group_id, timestamp DESC);
