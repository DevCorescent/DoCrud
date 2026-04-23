CREATE TABLE IF NOT EXISTS app_state (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  display_name TEXT,
  industry TEXT,
  company_size TEXT,
  workspace_preset TEXT,
  support_email TEXT,
  support_phone TEXT,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  organization_id TEXT REFERENCES organizations(id) ON DELETE SET NULL,
  password_hash TEXT,
  password_salt TEXT,
  profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users (organization_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);

CREATE TABLE IF NOT EXISTS role_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  is_custom BOOLEAN NOT NULL DEFAULT FALSE,
  organization_id TEXT REFERENCES organizations(id) ON DELETE SET NULL,
  created_by TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  template_html TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_templates_organization_id ON templates (organization_id);
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates (category);

CREATE TABLE IF NOT EXISTS history_entries (
  id TEXT PRIMARY KEY,
  share_id TEXT UNIQUE,
  reference_number TEXT,
  template_id TEXT,
  template_name TEXT,
  category TEXT,
  organization_id TEXT REFERENCES organizations(id) ON DELETE SET NULL,
  generated_by TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  share_url TEXT,
  share_password TEXT,
  preview_html TEXT,
  document_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  editor_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  collaboration_comments JSONB NOT NULL DEFAULT '[]'::jsonb,
  access_events JSONB NOT NULL DEFAULT '[]'::jsonb,
  managed_files JSONB NOT NULL DEFAULT '[]'::jsonb,
  version_snapshots JSONB NOT NULL DEFAULT '[]'::jsonb,
  delivery_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  full_record JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_history_entries_template_id ON history_entries (template_id);
CREATE INDEX IF NOT EXISTS idx_history_entries_organization_id ON history_entries (organization_id);
CREATE INDEX IF NOT EXISTS idx_history_entries_generated_at ON history_entries (generated_at DESC);

CREATE TABLE IF NOT EXISTS settings_store (
  scope TEXT NOT NULL,
  key TEXT NOT NULL,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (scope, key)
);

CREATE TABLE IF NOT EXISTS dropdown_options (
  id BIGSERIAL PRIMARY KEY,
  field_key TEXT NOT NULL UNIQUE,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saas_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  billing_model TEXT NOT NULL,
  price_label TEXT NOT NULL,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  plan_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS signatures (
  id TEXT PRIMARY KEY,
  signer_name TEXT NOT NULL,
  signer_role TEXT,
  organization_id TEXT REFERENCES organizations(id) ON DELETE SET NULL,
  signature_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contact_requests (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  phone TEXT,
  message TEXT,
  request_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
