# Deploy TaskTracker to Netlify — exact checklist

Follow these in order. Total time ≈ 15 minutes.

```
[ ] 0. Prerequisites
[ ] 1. Supabase project + schema
[ ] 2. Push code to GitHub
[ ] 3. Import site into Netlify
[ ] 4. Set environment variables
[ ] 5. Point Supabase Site URL at the deployed app
[ ] 6. Verify it works
```

Replace `YOUR-SITE` with your actual Netlify subdomain once you know it (step 3).

---

## 0. Prerequisites
```
[ ] Node.js 18+            →  node -v
[ ] GitHub account
[ ] Netlify account        →  https://app.netlify.com  (sign in with GitHub)
[ ] Supabase account       →  https://supabase.com
```

## 1. Supabase project + schema
```
[ ] 1.1  supabase.com → New project (name, DB password, region). Wait ~2 min.
[ ] 1.2  Settings → API. Copy into a scratch note:
             • Project URL                    →  SUPABASE_URL   (https://xxxx.supabase.co)
             • anon / publishable key          →  SUPABASE_ANON_KEY
             • service_role / secret key        →  SUPABASE_SERVICE_ROLE_KEY   (KEEP SECRET)
[ ] 1.3  SQL Editor → New query. Paste ALL of supabase/migrations/0001_init.sql → Run.
             Expect "Success. No rows returned."
[ ] 1.4  Authentication → Providers → Email → turn OFF "Confirm email"
             (so new signups can log in immediately).
```

## 2. Push the code to GitHub
```bash
cd task-tracker
git init && git add . && git commit -m "Initial commit: TaskTracker"
# create an empty repo on github.com (Public, no README), then:
git remote add origin https://github.com/YOUR_USERNAME/task-tracker.git
git branch -M main
git push -u origin main
```
When `git push` prompts, use your GitHub username + a **Personal Access Token**
(github.com → Settings → Developer settings → Tokens (classic), scope `repo`).

## 3. Import the site into Netlify
```
[ ] 3.1  app.netlify.com → Add new site → Import an existing project → GitHub.
[ ] 3.2  Authorize Netlify, select your task-tracker repo.
[ ] 3.3  Build settings auto-load from netlify.toml (npm run build → dist,
             functions netlify/functions). Leave them.
[ ] 3.4  Deploy. Note your URL: https://YOUR-SITE.netlify.app
             (rename under Site configuration → Change site name).
```

## 4. Set environment variables
Netlify → **Project configuration → Environment variables → Add a variable ▾ →
Import from a .env file**. Paste this, replacing the `YOUR_…` values from step 1.2:

```
VITE_SUPABASE_URL=https://YOUR_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_OR_PUBLISHABLE_KEY
VITE_FUNCTIONS_BASE=/.netlify/functions
SUPABASE_URL=https://YOUR_REF.supabase.co
SUPABASE_ANON_KEY=YOUR_ANON_OR_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_OR_SECRET_KEY
```

```
[ ] 4.1  Ensure each variable's Scopes = All scopes (the VITE_ ones MUST include
             "Builds" — they're compiled into the bundle at build time).
[ ] 4.2  Deploys → Trigger deploy → Clear cache and deploy site.
```

> ⚠️ `VITE_*` variables are baked in at **build time**. Every time you change
> them you must redeploy, or the old bundle stays live.

## 5. Point Supabase Site URL at the deployed app
```
[ ] 5.1  Supabase → Authentication → URL Configuration:
             • Site URL      = https://YOUR-SITE.netlify.app
             • Redirect URLs = add https://YOUR-SITE.netlify.app/**
         (Otherwise email-confirmation links redirect to localhost.)
```

## 6. Verify it works
```
[ ] 6.1  Open https://YOUR-SITE.netlify.app → you land on the Login page.
[ ] 6.2  Sign up → you reach "My Tasks" and a "My Workspace" exists in the sidebar.
[ ] 6.3  Add a List, create a task, set status + estimate, start the timer,
             drag it in Board view, add a comment, upload an attachment →
             everything persists on refresh.
```

If all boxes are ticked, you're live. 🎉

---

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| Build fails on Netlify | Open the deploy log; type errors surface here. Run `npm run build` locally first, fix, push. |
| Blank page / "Setup needed" after a **successful** deploy | `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` missing, misnamed, or their **Scope** excludes "Builds". Fix and redeploy with cache cleared. |
| Deploy **fails** right after adding env vars | Netlify secrets scanning flags the public anon key in the bundle. `netlify.toml` already sets `SECRETS_SCAN_OMIT_KEYS` for the public Supabase keys — pull the latest and redeploy. |
| Login works but no data / 401s | `SUPABASE_*` values wrong, or the SQL migration wasn't run. Re-check step 1. |
| Email confirmation lands on `localhost:3000` | Supabase **Site URL** still default. Set it to your Netlify URL (step 5), or disable "Confirm email". |
| Attachment upload fails | The `attachments` Storage bucket/policies weren't created — re-run the SQL (step 1.3). |

## Local development
```bash
npm install
cp .env.example .env      # fill with the same Supabase values
npm run dev               # netlify dev → http://localhost:8888
```
