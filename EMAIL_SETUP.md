# Production email (confirmation / reset) via custom SMTP

Supabase's **built-in** email sender is rate-limited (~2–4/hour) and often
undelivered — fine for testing, not production. To keep "Confirm email" ON and
have it actually deliver, plug in a transactional email provider. **Resend** has
the simplest free tier; **SendGrid** works identically.

> All of this is done in **your** Resend/SendGrid + Supabase dashboards — there
> are no code changes in this repo.

## Option A — Resend (recommended)

### 1. Create the sender
1. Sign up at **https://resend.com** (free tier: 3,000 emails/mo).
2. **Domains → Add domain** → enter a domain you control (e.g. `rathi.com` or a
   subdomain like `mail.yourdomain.com`) → add the shown **DNS records** (SPF,
   DKIM, and optionally DMARC) at your DNS host → **Verify**.
   *(Just testing? You can send from `onboarding@resend.dev` without a domain,
   but production needs your own verified domain to avoid spam.)*
3. **API Keys → Create API Key** → copy it (starts with `re_…`).

### 2. Point Supabase at Resend's SMTP
Supabase → **Project Settings → Authentication → SMTP Settings** → **Enable
custom SMTP** and fill in:

| Field | Value |
|---|---|
| Host | `smtp.resend.com` |
| Port | `465` (SSL) — or `587` (STARTTLS) |
| Username | `resend` |
| Password | your Resend **API key** (`re_…`) |
| Sender email | `no-reply@yourdomain.com` (on the verified domain) |
| Sender name | `TaskTracker` |

Save.

### 3. Turn confirmation back on + set URLs
- **Authentication → Providers → Email** → turn **"Confirm email" ON**.
- **Authentication → URL Configuration**:
  - **Site URL** = `https://tasktrackerjm.netlify.app`
  - **Redirect URLs** = add `https://tasktrackerjm.netlify.app/**`
  (so the confirmation link returns to the app, not `localhost`).

### 4. (Optional) Brand the emails
**Authentication → Email Templates → Confirm signup** — keep the
`{{ .ConfirmationURL }}` variable, change the copy/subject to your wording.

### 5. Test
Sign up with a real address → you should get the confirmation email within
seconds; clicking it lands you back on the app, signed in.

## Option B — SendGrid
Same as above, but in Supabase SMTP settings use:

| Field | Value |
|---|---|
| Host | `smtp.sendgrid.net` |
| Port | `587` |
| Username | `apikey` (literally the word) |
| Password | your SendGrid API key |
| Sender email | a **Single Sender** or verified-domain address |

(SendGrid: create the API key under **Settings → API Keys** with "Mail Send"
permission, and verify the sender under **Settings → Sender Authentication**.)

## Troubleshooting
| Symptom | Fix |
|---|---|
| Email never arrives | Domain/sender not verified, or wrong SMTP password. Re-check DNS verification and that the password is the API key. |
| Lands in spam | Add DKIM + DMARC records; send from your verified domain, not a free mailbox. |
| Confirm link goes to `localhost` | Set **Site URL** to the Netlify URL (step 3). |
| "Error sending confirmation email" on signup | SMTP creds wrong or provider blocked the sender — check the provider's activity log. |

Until this is set up, keep **"Confirm email" OFF** for instant, email-free
sign-in (see README / DEPLOY).
