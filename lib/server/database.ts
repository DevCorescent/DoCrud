import dns from 'node:dns';
import path from 'path';
import { Pool } from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var __docrudPgPool: Pool | undefined;
}

const APP_STATE_TABLE = 'app_state';

dns.setDefaultResultOrder('ipv4first');

function getSupabaseProjectRef() {
  const projectUrl = process.env.SUPABASE_URL || '';
  if (projectUrl) {
    try {
      return new URL(projectUrl).hostname.split('.')[0] || '';
    } catch {
      return '';
    }
  }

  const anonKey = process.env.SUPABASE_ANON_KEY || '';
  if (!anonKey) {
    return '';
  }

  const parts = anonKey.split('.');
  if (parts.length < 2) {
    return '';
  }

  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as { ref?: string };
    return payload.ref || '';
  } catch {
    return '';
  }
}

function getDatabaseUrl() {
  const rawUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || '';
  if (!rawUrl) {
    return '';
  }

  const supabaseProjectRef = getSupabaseProjectRef();
  if (!supabaseProjectRef || !rawUrl.includes('supabase.co')) {
    return rawUrl;
  }

  try {
    const parsed = new URL(rawUrl);
    const expectedHost = `db.${supabaseProjectRef}.supabase.co`;
    if (parsed.hostname !== expectedHost) {
      parsed.hostname = expectedHost;
      return parsed.toString();
    }
  } catch {
    return rawUrl;
  }

  return rawUrl;
}

export function isDatabaseConfigured() {
  return Boolean(getDatabaseUrl());
}

function createPool() {
  return new Pool({
    connectionString: getDatabaseUrl(),
    ssl: getDatabaseUrl().includes('supabase.co')
      ? { rejectUnauthorized: false }
      : undefined,
    max: 5,
  });
}

export function getDbPool() {
  if (!isDatabaseConfigured()) {
    return null;
  }

  if (!global.__docrudPgPool) {
    global.__docrudPgPool = createPool();
  }

  return global.__docrudPgPool;
}

let tableReadyPromise: Promise<void> | null = null;

async function ensureAppStateTable() {
  const pool = getDbPool();
  if (!pool) {
    return;
  }

  if (!tableReadyPromise) {
    tableReadyPromise = pool.query(`
      CREATE TABLE IF NOT EXISTS ${APP_STATE_TABLE} (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `).then(() => undefined);
  }

  await tableReadyPromise;
}

export function getAppStateKey(filePath: string) {
  const relativePath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
  return `json:${relativePath}`;
}

export async function readAppState<T>(key: string): Promise<T | null> {
  const pool = getDbPool();
  if (!pool) {
    return null;
  }

  await ensureAppStateTable();
  const result = await pool.query<{ value: T }>(`SELECT value FROM ${APP_STATE_TABLE} WHERE key = $1 LIMIT 1`, [key]);
  return result.rows[0]?.value ?? null;
}

export async function writeAppState<T>(key: string, value: T) {
  const pool = getDbPool();
  if (!pool) {
    throw new Error('Database is not configured');
  }

  await ensureAppStateTable();
  await pool.query(
    `
      INSERT INTO ${APP_STATE_TABLE} (key, value, updated_at)
      VALUES ($1, $2::jsonb, NOW())
      ON CONFLICT (key)
      DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    `,
    [key, JSON.stringify(value)],
  );
}
