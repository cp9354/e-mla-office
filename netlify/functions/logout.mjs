import { clearedSessionCookie, json, logEvent, readSession } from '../lib/auth.mjs';

export default async (req) => {
  const user = await readSession(req);
  if (user) await logEvent(req, { email: user.email, role: user.role, event: 'logout' });
  return json({ ok: true }, 200, { 'set-cookie': clearedSessionCookie() });
};
