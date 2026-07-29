# Deploy TaskTracker to Netlify — exact checklist

Follow these in order. Total time ≈ 20–30 minutes. Every value you copy in one
step is reused later, so keep a scratch note open. Boxes you can literally tick:

```
[ ] 0. Prerequisites
[ ] 1. Supabase project + schema
[ ] 2. Azure AD app (Microsoft Graph)
[ ] 3. Push code to GitHub
[ ] 4. Import site into Netlify
[ ] 5. Set environment variables
[ ] 6. Fix redirect URIs to the real URL
[ ] 7. Verify it works
```

Throughout, replace `YOUR-SITE` with your actual Netlify subdomain
(e.g. `tasktracker-jayesh`) once you know it (end of step 4).

---

## 0. Prerequisites

```
[ ] Node.js 18+ installed        →  node -v
[ ] A GitHub account
[ ] A Netlify account            →  https://app.netlify.com  (sign in with GitHub)
[ ] A Supabase account           →  https://supabase.com
[ ] A Microsoft/Azure account    →  https://portal.azure.com
[ ] (optional) Netlify CLI       →  npm install -g netlify-cli
```

---

## 1. Supabase project + schema

```
[ ] 1.1  supabase.com → New project. Pick a name + strong DB password + region.
[ ] 1.2  Wait for it to finish provisioning (~2 min).
[ ] 1.3  Settings → API. Copy these THREE values into your scratch note:
             • Project URL              →  SUPABASE_URL   (looks like https://abcd.supabase.co)
             • Project API keys: anon    →  SUPABASE_ANON_KEY
             • Project API keys: service_role  →  SUPABASE_SERVICE_ROLE_KEY   (KEEP SECRET)
[ ] 1.4  SQL Editor → New query. Open supabase/migrations/0001_init.sql from this
         repo, paste ALL of it, click Run. You should see "Success. No rows returned".
[ ] 1.5  (Quick-start) Authentication → Providers → Email → turn OFF "Confirm email"
         so new signups can log in immediately. (Re-enable later for production.)
[ ] 1.6  (Optional, for "Continue with Microsoft" sign-in) Authentication →
         Providers → Azure → enable, and paste the client id/secret from step 2.
[ ] 1.7  Confirm Storage → there is an "attachments" bucket (created by the SQL).
```

---

## 2. Azure AD app registration (Microsoft Graph / Outlook)

```
[ ] 2.1  portal.azure.com → Microsoft Entra ID → App registrations → New registration.
[ ] 2.2  Name: TaskTracker.
[ ] 2.3  Supported account types:
             "Accounts in any organizational directory and personal Microsoft accounts".
[ ] 2.4  Redirect URI → platform "Web" → for now enter:
             http://localhost:8888/.netlify/functions/auth
         (You'll add the production URL in step 6.)
[ ] 2.5  Register. On the Overview page, copy:
             • Application (client) ID  →  MICROSOFT_CLIENT_ID
[ ] 2.6  Certificates & secrets → New client secret → copy the VALUE (not the ID):
             • Value                    →  MICROSOFT_CLIENT_SECRET   (KEEP SECRET)
[ ] 2.7  API permissions → Add a permission → Microsoft Graph → Delegated permissions.
         Add ALL of: User.Read, Tasks.ReadWrite, Calendars.Read,
                     offline_access, openid, profile, email
[ ] 2.8  If your tenant requires it, click "Grant admin consent".
```

---

## 3. Push the code to GitHub

From the extracted project folder:

```bash
cd task-tracker
git init
git add .
git commit -m "Initial commit: TaskTracker"

# Using the GitHub CLI (easiest):
gh repo create task-tracker --public --source=. --push

# — or manually —
# create an empty repo on github.com, then:
# git remote add origin https://github.com/J5pecter/task-tracker.git
# git branch -M main
# git push -u origin main
```

```
[ ] 3.1  Repo is on GitHub and the "CI" workflow appears under the Actions tab.
[ ] 3.2  Badges/Deploy button in README.md already point at
         github.com/J5pecter/task-tracker.
```

> `.env` is git-ignored, so your secrets are NOT pushed. Good.

---

## 4. Import the site into Netlify

```
[ ] 4.1  app.netlify.com → Add new site → Import an existing project → GitHub.
[ ] 4.2  Authorize Netlify and pick the task-tracker repo.
[ ] 4.3  Build settings are auto-detected from netlify.toml:
             Build command:   npm run build
             Publish dir:     dist
             Functions dir:   netlify/functions
         Leave them as-is.
[ ] 4.4  Click Deploy. The FIRST build may fail or the app may load but not work
         yet — that's expected until env vars are set (next step).
[ ] 4.5  Site settings → General → note your URL, e.g. https://YOUR-SITE.netlify.app
         (you can rename it under Site settings → Change site name).
```

---

## 5. Set environment variables

Netlify → **Site configuration → Environment variables → Add a variable** (add
each one; values from steps 1 and 2). First generate the encryption key locally:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

```
[ ] VITE_SUPABASE_URL             = <SUPABASE_URL from 1.3>
[ ] VITE_SUPABASE_ANON_KEY        = <anon key from 1.3>
[ ] VITE_FUNCTIONS_BASE           = /.netlify/functions
[ ] SUPABASE_URL                  = <same as SUPABASE_URL>
[ ] SUPABASE_ANON_KEY             = <same anon key>
[ ] SUPABASE_SERVICE_ROLE_KEY     = <service_role key from 1.3>   (secret)
[ ] MICROSOFT_CLIENT_ID           = <from 2.5>
[ ] MICROSOFT_CLIENT_SECRET       = <from 2.6>                    (secret)
[ ] MICROSOFT_TENANT              = common
[ ] MICROSOFT_SCOPES              = openid profile email offline_access User.Read Tasks.ReadWrite Calendars.Read
[ ] MICROSOFT_REDIRECT_URI        = https://YOUR-SITE.netlify.app/.netlify/functions/auth
[ ] APP_BASE_URL                  = https://YOUR-SITE.netlify.app
[ ] TOKEN_ENCRYPTION_KEY          = <64 hex chars from the command above>   (secret)
```

```
[ ] 5.1  Deploys → Trigger deploy → Deploy site  (so functions pick up the vars).
```

---

## 6. Point the redirect URIs at the real URL

```
[ ] 6.1  Azure → your app → Authentication → Web → Add URI:
             https://YOUR-SITE.netlify.app/.netlify/functions/auth
         (Keep the localhost one too if you also develop locally.)
[ ] 6.2  Confirm MICROSOFT_REDIRECT_URI and APP_BASE_URL in Netlify match this
         exactly (no trailing slash, https, correct subdomain).
```

---

## 7. Verify it works

```
[ ] 7.1  Open https://YOUR-SITE.netlify.app → you land on the Login page.
[ ] 7.2  Sign up with an email + password → you're taken to "My Tasks", and a
         "My Workspace" exists in the sidebar (created by the DB trigger).
[ ] 7.3  Add a List, create a task, drag it in Board view, open it, add a comment,
         start the timer, upload an attachment → all persist on refresh.
[ ] 7.4  Settings → Connect (or the Outlook page) → sign in with Microsoft →
         you're redirected back with "Microsoft account connected!" and your
         Outlook To Do lists/tasks appear.
[ ] 7.5  Calendar view shows tasks with due dates and your Outlook events.
```

If all boxes are ticked, you're live. 🎉

---

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| Build fails on Netlify | Check the deploy log. Type errors surface here — fix and push. Run `npm run build` locally first. |
| Login works but no data / 401s | The `SUPABASE_*` vars are wrong or the SQL migration wasn't run. Re-check step 1. |
| "Function not found" / 404 on `/.netlify/functions/*` | Functions dir wrong — confirm `netlify.toml` `functions = "netlify/functions"` and redeploy. |
| Microsoft connect returns `ms_error=invalid_state` | Your session expired mid-flow, or `SUPABASE_SERVICE_ROLE_KEY` is wrong. Re-login and retry. |
| Microsoft returns redirect_uri mismatch | `MICROSOFT_REDIRECT_URI` (Netlify) ≠ the URI registered in Azure. Make them identical (step 6). |
| `no_refresh_token` after connecting | `offline_access` scope missing. Ensure it's in `MICROSOFT_SCOPES` and Azure API permissions (2.7). |
| Outlook page says "not connected" forever | Token encryption failed — `TOKEN_ENCRYPTION_KEY` must be exactly 64 hex chars. Regenerate and redeploy. |
| Signup does nothing | "Confirm email" is ON in Supabase and the confirmation email is pending. Disable it (1.5) or confirm via the email. |
| Attachment upload fails | The `attachments` Storage bucket/policies weren't created — re-run the SQL (step 1.4). |

## Local development (optional)

```bash
npm install
cp .env.example .env      # fill with the SAME values (use localhost URLs)
npm run dev               # netlify dev → http://localhost:8888
```

Set `APP_BASE_URL=http://localhost:8888` and
`MICROSOFT_REDIRECT_URI=http://localhost:8888/.netlify/functions/auth` in `.env`
for local Outlook testing (that localhost redirect URI is already registered from
step 2.4).
