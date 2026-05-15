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

CREATE TABLE IF NOT EXISTS knowledge_base_entries (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  query TEXT NOT NULL,
  category TEXT NOT NULL,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary TEXT NOT NULL,
  key_points JSONB NOT NULL DEFAULT '[]'::jsonb,
  sentiment JSONB NOT NULL DEFAULT '{}'::jsonb,
  sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  published_by TEXT,
  published_by_user_id TEXT,
  visibility TEXT NOT NULL DEFAULT 'public',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kb_entries_category ON knowledge_base_entries (category);
CREATE INDEX IF NOT EXISTS idx_kb_entries_created_at ON knowledge_base_entries (created_at DESC);

-- Resume / Talent directory (optional when Postgres is configured; otherwise file-store fallback is used)
CREATE TABLE IF NOT EXISTS resume_directory_entries (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  owner_user_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar_file_name TEXT,
  avatar_mime_type TEXT,
  avatar_data_url TEXT,
  headline TEXT,
  location TEXT,
  category TEXT NOT NULL,
  skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary TEXT,
  resume_text TEXT NOT NULL,
  resume_file_name TEXT,
  resume_mime_type TEXT,
  resume_data_url TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  contact_linkedin TEXT,
  contact_website TEXT,
  contact_visibility TEXT NOT NULL DEFAULT 'members',
  visibility TEXT NOT NULL DEFAULT 'public',
  view_count INTEGER NOT NULL DEFAULT 0,
  contact_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resume_directory_category ON resume_directory_entries (category);
CREATE INDEX IF NOT EXISTS idx_resume_directory_updated_at ON resume_directory_entries (updated_at DESC);

CREATE TABLE IF NOT EXISTS resume_connect_purchases (
  id TEXT PRIMARY KEY,
  buyer_user_id TEXT NOT NULL,
  product_mode TEXT NOT NULL,
  resume_id TEXT,
  resume_slug TEXT,
  amount_in_paise INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'created',
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  credits_granted INTEGER NOT NULL DEFAULT 0,
  credits_used INTEGER NOT NULL DEFAULT 0,
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resume_connect_buyer ON resume_connect_purchases (buyer_user_id);
CREATE INDEX IF NOT EXISTS idx_resume_connect_order ON resume_connect_purchases (razorpay_order_id);

CREATE TABLE IF NOT EXISTS gig_connect_purchases (
  id TEXT PRIMARY KEY,
  buyer_user_id TEXT NOT NULL,
  product_mode TEXT NOT NULL,
  amount_in_paise INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'created',
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  credits_granted INTEGER NOT NULL DEFAULT 0,
  credits_used INTEGER NOT NULL DEFAULT 0,
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gig_connect_buyer ON gig_connect_purchases (buyer_user_id);
CREATE INDEX IF NOT EXISTS idx_gig_connect_order ON gig_connect_purchases (razorpay_order_id);

CREATE TABLE IF NOT EXISTS resume_connect_leads (
  id TEXT PRIMARY KEY,
  buyer_user_id TEXT NOT NULL,
  resume_id TEXT NOT NULL,
  resume_slug TEXT NOT NULL,
  candidate_name TEXT NOT NULL,
  candidate_headline TEXT,
  candidate_location TEXT,
  candidate_category TEXT,
  candidate_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  candidate_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  candidate_summary TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  contact_linkedin TEXT,
  contact_website TEXT,
  jd_text TEXT,
  match_score INTEGER,
  compatibility_score INTEGER,
  ai_score INTEGER,
  match_provider TEXT,
  match_rationale TEXT,
  matched_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'new',
  notes JSONB NOT NULL DEFAULT '[]'::jsonb,
  connect_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (buyer_user_id, resume_id)
);

CREATE INDEX IF NOT EXISTS idx_resume_leads_buyer ON resume_connect_leads (buyer_user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_resume_leads_status ON resume_connect_leads (buyer_user_id, status);

ALTER TABLE resume_connect_leads ADD COLUMN IF NOT EXISTS compatibility_score INTEGER;
ALTER TABLE resume_connect_leads ADD COLUMN IF NOT EXISTS ai_score INTEGER;

CREATE TABLE IF NOT EXISTS web_sources (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  title TEXT,
  label TEXT,
  category TEXT,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  content_text TEXT NOT NULL,
  content_hash TEXT,
  owner_user_id TEXT,
  visibility TEXT NOT NULL DEFAULT 'private',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_web_sources_owner ON web_sources (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_web_sources_fetched_at ON web_sources (fetched_at DESC);

CREATE TABLE IF NOT EXISTS template_marketplace_withdrawals (
  id TEXT PRIMARY KEY,
  seller_user_id TEXT NOT NULL,
  seller_email TEXT,
  currency TEXT NOT NULL DEFAULT 'INR',
  amount_in_paise INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested',
  payout_method_label TEXT NOT NULL,
  payout_method_details TEXT NOT NULL,
  admin_note TEXT,
  transaction_ref TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_template_withdrawals_seller ON template_marketplace_withdrawals (seller_user_id);
CREATE INDEX IF NOT EXISTS idx_template_withdrawals_status ON template_marketplace_withdrawals (status);
