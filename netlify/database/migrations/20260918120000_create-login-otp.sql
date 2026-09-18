-- One-time login codes for the MLA / PA email OTP sign-in flow.
CREATE TABLE IF NOT EXISTS login_codes (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  request_ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS login_codes_email_created_idx
  ON login_codes (email, created_at DESC);

-- Audit trail of sign-in activity, surfaced by the Audit Log section.
CREATE TABLE IF NOT EXISTS login_events (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT,
  event TEXT NOT NULL,
  detail TEXT,
  request_ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS login_events_created_idx
  ON login_events (created_at DESC);

-- Single-row store for the server-side HMAC key used to sign session
-- cookies, so sessions survive deploys without a manual env var step.
CREATE TABLE IF NOT EXISTS app_keys (
  name TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
