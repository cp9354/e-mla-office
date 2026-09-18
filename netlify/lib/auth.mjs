import crypto from 'node:crypto';
import { getDatabase } from '@netlify/database';

export const COOKIE = 'emla_session';
export const SESSION_HOURS = 8;
export const CODE_TTL_MINUTES = 10;
export const MAX_CODE_ATTEMPTS = 5;
export const RESEND_COOLDOWN_SECONDS = 45;
export const MAX_CODES_PER_WINDOW = 5;
export const RATE_WINDOW_MINUTES = 15;

// Only these two office accounts may sign in. Registration is not offered
// anywhere in the app: any other address is rejected outright.
export const ALLOWED_ACCOUNTS = [
  { email: 'acpatel789@gmail.com', role: 'MLA', name: 'Shri Arvindbhai Patel', title: 'MLA • Dharampur' },
  { email: 'crvaland143@gmail.com', role: 'PA', name: 'Personal Assistant', title: 'PA • MLA Office' }
];

export const normalizeEmail = value => String(value || '').trim().toLowerCase();

export function findAccount(email) {
  const target = normalizeEmail(email);
  return ALLOWED_ACCOUNTS.find(a => a.email === target) || null;
}

let dbInstance;
export function db() {
  if (!dbInstance) dbInstance = getDatabase();
  return dbInstance;
}

let cachedKey;
// Signing key for session cookies and code hashes. SESSION_SECRET wins when
// set; otherwise a random key is generated once and kept in the database so
// sessions stay valid across deploys without any manual setup.
export async function signingKey() {
  if (cachedKey) return cachedKey;
  const fromEnv = String(process.env.SESSION_SECRET || '');
  if (fromEnv.length >= 16) {
    cachedKey = fromEnv;
    return cachedKey;
  }
  const generated = crypto.randomBytes(48).toString('base64url');
  await db().sql`
    INSERT INTO app_keys (name, value) VALUES ('session_secret', ${generated})
    ON CONFLICT (name) DO NOTHING
  `;
  const rows = await db().sql`SELECT value FROM app_keys WHERE name = 'session_secret'`;
  cachedKey = rows[0]?.value || generated;
  return cachedKey;
}

const hmac = (key, value) => crypto.createHmac('sha256', key).update(value).digest('base64url');

export function safeEqual(a, b) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export async function hashCode(email, code) {
  return hmac(await signingKey(), `${normalizeEmail(email)}:${String(code)}`);
}

export function generateCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

export async function createSessionCookie(account) {
  const payload = Buffer.from(JSON.stringify({
    email: account.email,
    name: account.name,
    role: account.role,
    title: account.title,
    exp: Date.now() + SESSION_HOURS * 60 * 60 * 1000
  })).toString('base64url');
  const token = `${payload}.${hmac(await signingKey(), payload)}`;
  const maxAge = SESSION_HOURS * 60 * 60;
  return `${COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

export const clearedSessionCookie = () =>
  `${COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;

export function readCookie(req) {
  const raw = req.headers.get('cookie') || '';
  const found = raw.split(';').map(part => part.trim()).find(part => part.startsWith(`${COOKIE}=`));
  return found ? decodeURIComponent(found.slice(COOKIE.length + 1)) : null;
}

export async function readSession(req) {
  try {
    const token = readCookie(req);
    if (!token) return null;
    const [payload, signature] = token.split('.');
    if (!payload || !signature) return null;
    if (!safeEqual(signature, hmac(await signingKey(), payload))) return null;
    const user = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!user.exp || user.exp < Date.now()) return null;
    // Revoking an account in ALLOWED_ACCOUNTS invalidates its live sessions.
    if (!findAccount(user.email)) return null;
    return user;
  } catch {
    return null;
  }
}

export const clientIp = req =>
  (req.headers.get('x-nf-client-connection-ip') ||
    req.headers.get('x-forwarded-for') ||
    '').split(',')[0].trim() || null;

export async function logEvent(req, { email, role, event, detail }) {
  try {
    await db().sql`
      INSERT INTO login_events (email, role, event, detail, request_ip, user_agent)
      VALUES (${normalizeEmail(email)}, ${role || null}, ${event}, ${detail || null},
              ${clientIp(req)}, ${req.headers.get('user-agent') || null})
    `;
  } catch {
    // Audit logging must never block a sign-in.
  }
}

export const maskEmail = email => {
  const [user = '', domain = ''] = normalizeEmail(email).split('@');
  const head = user.slice(0, 2);
  const tail = user.length > 3 ? user.slice(-1) : '';
  return `${head}${'*'.repeat(Math.max(user.length - head.length - tail.length, 2))}${tail}@${domain}`;
};

export class EmailNotConfiguredError extends Error {}

// Delivers the one-time code through Resend's HTTP API. No SDK needed.
export async function sendLoginCode({ account, code }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new EmailNotConfiguredError('RESEND_API_KEY is not configured.');
  const from = process.env.OTP_FROM_EMAIL || 'e-MLA Office <onboarding@resend.dev>';
  const subject = `${code} — e-MLA Office login code`;
  const text = [
    `e-MLA Office — Dharampur Constituency`,
    ``,
    `Your one-time login code is ${code}`,
    `Aa code ${CODE_TTL_MINUTES} minute sudhi valid chhe.`,
    ``,
    `Signing in as: ${account.role} (${account.email})`,
    `If you did not request this code, you can ignore this email.`
  ].join('\n');

  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#f6f8fb;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#141f33">
  <div style="max-width:480px;margin:0 auto;background:#fff;border:1px solid #e6eaf0;border-radius:18px;overflow:hidden">
    <div style="padding:20px 24px;background:linear-gradient(135deg,#0f1b2d,#17263d);color:#fff">
      <div style="font-size:18px;font-weight:700">e-MLA Office</div>
      <div style="font-size:11px;opacity:.75;letter-spacing:.6px">DHARAMPUR CONSTITUENCY • 178</div>
    </div>
    <div style="padding:28px 24px">
      <p style="margin:0 0 6px;font-size:11px;letter-spacing:.8px;color:#7a8699;font-weight:700">SECURE OFFICE ACCESS</p>
      <h1 style="margin:0 0 14px;font-size:22px">Your login code</h1>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#4a5567">
        Signing in as <strong>${account.role}</strong>. Aa code <strong>${CODE_TTL_MINUTES} minute</strong> sudhi valid chhe.
      </p>
      <div style="font-size:34px;font-weight:800;letter-spacing:10px;text-align:center;padding:18px;border:1px dashed #f0d5c5;border-radius:14px;background:#fff7f2;color:#a54c1b">${code}</div>
      <p style="margin:22px 0 0;font-size:12px;line-height:1.6;color:#7a8699">
        Tame aa code request na karyo hoy to aa email ignore karo — koi pan badlav thayo nathi.
      </p>
    </div>
  </div></body></html>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from, to: [account.email], subject, text, html })
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Email provider rejected the request (${res.status}). ${body.slice(0, 300)}`);
  }
}

export const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers }
  });
