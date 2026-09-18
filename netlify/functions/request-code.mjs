import {
  CODE_TTL_MINUTES, MAX_CODES_PER_WINDOW, RATE_WINDOW_MINUTES, RESEND_COOLDOWN_SECONDS,
  EmailNotConfiguredError, db, findAccount, generateCode, hashCode, json, logEvent,
  maskEmail, normalizeEmail, clientIp, sendLoginCode
} from '../lib/auth.mjs';

export default async (req) => {
  if (req.method !== 'POST') return json({ message: 'Method not allowed' }, 405);

  let email;
  try {
    ({ email } = await req.json());
  } catch {
    return json({ message: 'Invalid request.' }, 400);
  }

  const address = normalizeEmail(email);
  const account = findAccount(address);
  if (!account) {
    await logEvent(req, { email: address, event: 'code_denied', detail: 'not an authorized office account' });
    return json({ message: 'This email address is not authorized for the MLA Office.' }, 403);
  }

  try {
    const [recent] = await db().sql`
      SELECT created_at FROM login_codes
      WHERE email = ${account.email}
      ORDER BY created_at DESC
      LIMIT 1
    `;
    if (recent) {
      const elapsed = (Date.now() - new Date(recent.created_at).getTime()) / 1000;
      if (elapsed < RESEND_COOLDOWN_SECONDS) {
        return json({
          message: `A code was just sent. Please wait ${Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed)}s before asking for another.`,
          retryAfterSeconds: Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed)
        }, 429);
      }
    }

    const [{ count }] = await db().sql`
      SELECT COUNT(*)::int AS count FROM login_codes
      WHERE email = ${account.email}
        AND created_at > NOW() - make_interval(mins => ${RATE_WINDOW_MINUTES}::int)
    `;
    if (count >= MAX_CODES_PER_WINDOW) {
      await logEvent(req, { email: account.email, role: account.role, event: 'code_rate_limited' });
      return json({
        message: `Too many login codes requested. Please try again in ${RATE_WINDOW_MINUTES} minutes.`
      }, 429);
    }

    // Any code still outstanding for this account is retired first, so only
    // the newest code can ever be used.
    await db().sql`
      UPDATE login_codes SET consumed_at = NOW()
      WHERE email = ${account.email} AND consumed_at IS NULL
    `;

    const code = generateCode();
    const codeHash = await hashCode(account.email, code);
    const [row] = await db().sql`
      INSERT INTO login_codes (email, role, code_hash, expires_at, request_ip)
      VALUES (${account.email}, ${account.role}, ${codeHash},
              NOW() + make_interval(mins => ${CODE_TTL_MINUTES}::int), ${clientIp(req)})
      RETURNING id
    `;

    try {
      await sendLoginCode({ account, code });
    } catch (err) {
      await db().sql`UPDATE login_codes SET consumed_at = NOW() WHERE id = ${row.id}`;
      if (err instanceof EmailNotConfiguredError) {
        await logEvent(req, { email: account.email, role: account.role, event: 'code_send_failed', detail: 'email provider not configured' });
        return json({
          message: 'Email delivery is not configured yet. Add a RESEND_API_KEY environment variable to this site, then try again.',
          code: 'email_not_configured'
        }, 503);
      }
      await logEvent(req, { email: account.email, role: account.role, event: 'code_send_failed', detail: String(err.message || err).slice(0, 300) });
      return json({ message: 'Could not send the login code right now. Please try again in a moment.' }, 502);
    }

    await logEvent(req, { email: account.email, role: account.role, event: 'code_sent' });
    return json({
      ok: true,
      role: account.role,
      maskedEmail: maskEmail(account.email),
      expiresInSeconds: CODE_TTL_MINUTES * 60,
      cooldownSeconds: RESEND_COOLDOWN_SECONDS
    });
  } catch (err) {
    console.error('login error:', err);
    return json({ message: 'Login service is temporarily unavailable. Please try again.' }, 500);
  }
};
