import {
  MAX_CODE_ATTEMPTS, createSessionCookie, db, findAccount, hashCode, json, logEvent,
  normalizeEmail, safeEqual
} from '../lib/auth.mjs';

export default async (req) => {
  if (req.method !== 'POST') return json({ message: 'Method not allowed' }, 405);

  let email, code;
  try {
    ({ email, code } = await req.json());
  } catch {
    return json({ message: 'Invalid request.' }, 400);
  }

  const address = normalizeEmail(email);
  const entered = String(code || '').replace(/\D/g, '');
  const account = findAccount(address);
  if (!account) return json({ message: 'This email address is not authorized for the MLA Office.' }, 403);
  if (entered.length !== 6) return json({ message: 'Enter the 6-digit code from your email.' }, 400);

  try {
    const [pending] = await db().sql`
      SELECT id, code_hash, attempts FROM login_codes
      WHERE email = ${account.email} AND consumed_at IS NULL AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
    `;
    if (!pending) {
      return json({ message: 'That code has expired. Please request a new login code.', code: 'expired' }, 400);
    }

    // Increment first so parallel guesses cannot share one attempt budget.
    const [{ attempts }] = await db().sql`
      UPDATE login_codes SET attempts = attempts + 1 WHERE id = ${pending.id} RETURNING attempts
    `;
    if (attempts > MAX_CODE_ATTEMPTS) {
      await db().sql`UPDATE login_codes SET consumed_at = NOW() WHERE id = ${pending.id}`;
      await logEvent(req, { email: account.email, role: account.role, event: 'code_locked', detail: 'attempt limit reached' });
      return json({ message: 'Too many incorrect attempts. Please request a new login code.', code: 'locked' }, 429);
    }

    if (!safeEqual(pending.code_hash, await hashCode(account.email, entered))) {
      const attemptsLeft = Math.max(MAX_CODE_ATTEMPTS - attempts, 0);
      await logEvent(req, { email: account.email, role: account.role, event: 'code_incorrect' });
      if (attemptsLeft === 0) {
        await db().sql`UPDATE login_codes SET consumed_at = NOW() WHERE id = ${pending.id}`;
        return json({ message: 'Too many incorrect attempts. Please request a new login code.', code: 'locked' }, 429);
      }
      return json({
        message: `Incorrect code. ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} left.`,
        attemptsLeft
      }, 401);
    }

    await db().sql`UPDATE login_codes SET consumed_at = NOW() WHERE id = ${pending.id}`;
    await logEvent(req, { email: account.email, role: account.role, event: 'login_success' });

    const user = { email: account.email, name: account.name, role: account.role, title: account.title };
    return json({ ok: true, user }, 200, { 'set-cookie': await createSessionCookie(account) });
  } catch (err) {
    console.error('login error:', err);
    return json({ message: 'Login service is temporarily unavailable. Please try again.' }, 500);
  }
};
