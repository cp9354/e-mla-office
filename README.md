# e-MLA Office

Dharampur Constituency • MLA Office ERP

## Sign-in

The whole application sits behind a login screen. Only two office accounts may sign
in, and there is no registration anywhere in the app:

| Role | Email |
| --- | --- |
| MLA | `acpatel789@gmail.com` |
| PA (Personal Assistant) | `crvaland143@gmail.com` |

Sign-in uses an emailed one-time code instead of a password:

1. Pick **MLA** or **Personal Assistant** and submit the email address.
2. A 6-digit code is emailed to that address; it is valid for 10 minutes.
3. Entering the code starts an 8-hour session stored in a signed, HttpOnly cookie.

Codes are single-use, stored only as HMAC hashes, retired as soon as a newer code is
requested, and locked after 5 incorrect attempts. Each account may request at most
5 codes per 15 minutes, with a 45-second gap between requests. All sign-in activity is
recorded in the `login_events` table.

To change who may sign in, edit `ALLOWED_ACCOUNTS` in `netlify/lib/auth.mjs`. Removing
an account there immediately invalidates its existing sessions.

### Required configuration

Email delivery goes through [Resend](https://resend.com). Set these environment
variables on the Netlify site (**Site configuration → Environment variables**):

| Variable | Required | Purpose |
| --- | --- | --- |
| `RESEND_API_KEY` | Yes | Resend API key used to send login codes. Until this is set, the login screen reports that email delivery is not configured. |
| `OTP_FROM_EMAIL` | Recommended | Sender address, e.g. `e-MLA Office <login@yourdomain.in>`. Defaults to Resend's shared `onboarding@resend.dev` sender, which can only deliver to the Resend account owner's own address. |
| `SESSION_SECRET` | Optional | Key used to sign session cookies. If unset, a random key is generated once and kept in the database. |

The older `MLA_LOGIN_EMAIL`, `PA_LOGIN_EMAIL`, `MLA_LOGIN_PASSWORD` and
`PA_LOGIN_PASSWORD` variables are no longer read and can be deleted.

## Data storage

Login codes, the sign-in audit trail and the generated session key live in the site's
Netlify Database (managed Postgres). The schema is created by the migration in
`netlify/database/migrations/`, which Netlify applies automatically during deploy.

## Deployment

Deploy to Netlify. The login flow depends on Netlify Functions and Netlify Database, so
the GitHub Pages workflow in `.github/` can only publish the static shell — the sign-in
step cannot work there.

## Sections
Dashboard; Reports & Analytics; Applications / Grievances; Citizen Database; Follow-ups & Reminders; Village Master; Departments & Officers; Development Works; Appointments; Events & Programs; Letters / Inward-Outward; Documents & Files; Meetings & Minutes; Staff & Users; SMS / WhatsApp / Email; Notifications; Office Settings; Audit Log.
