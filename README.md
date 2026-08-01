# TaskTracker

[![CI](https://github.com/J5pecter/task-tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/J5pecter/task-tracker/actions/workflows/ci.yml)
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/J5pecter/task-tracker)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A ClickUp‑inspired **personal work tracker**: create tasks, set their status
(WIP), estimate how long they'll take, and track the time you actually spend —
built on **React + Vite + Tailwind**, **Supabase (Postgres)**, and **Netlify
Functions** (serverless TypeScript). One‑click deployable to Netlify.

## Features

- **Hierarchy:** Workspaces → (Folders) → Lists → Tasks → Subtasks
- **Tasks:** rich description, priority, custom per‑list statuses
  (**Open / In Progress / Done** = your WIP state), assignee, due/start dates,
  **time estimate** ("how long will it take"), **recurrence**, labels, and
  **custom fields** (text/number/dropdown/date/checkbox)
- **Time tracking:** per‑task **start/stop timer**, a running‑timer pill, and
  logged‑time totals — see the time you allot vs. the time you spend
- **Subtasks, dependencies** (blocking / waiting‑on), and **threaded comments**
- **Attachments:** drag‑and‑drop upload to Supabase Storage, private signed‑URL
  downloads
- **Views:** List (sortable, drag‑and‑drop, shows estimate), **Board** (Kanban,
  drag between statuses), **Calendar** (tasks by due date)
- **My Tasks** dashboard aggregating everything assigned to you (overdue / today /
  upcoming) and **full‑text search + filters**
- **Notifications:** in‑app toasts + basic browser due‑date reminders
- **Security:** Supabase **Row Level Security** on every table; secrets live only
  in Netlify Functions, never in the client bundle

## Architecture

```
Browser (React + React Query)
   │  Supabase JWT in Authorization header
   ▼
Netlify Functions (TypeScript, user-scoped Supabase client → RLS)
   ├─ projects.ts        workspaces / folders / lists
   ├─ tasks.ts           tasks / subtasks / dependencies / search
   ├─ comments.ts        threaded comments
   ├─ time-entries.ts    timers & summaries
   ├─ custom-fields.ts   field defs + values
   └─ attachments.ts     attachment metadata (+ Storage cleanup)
                     │
                     ▼
              Supabase (Postgres + RLS + Storage)
```

The frontend talks only to Netlify Functions; each function verifies the caller's
Supabase JWT and uses a client scoped to that user, so RLS is enforced on every
query.

## Project structure

```
├─ netlify.toml
├─ package.json / vite.config.ts / tailwind.config.js / tsconfig*.json
├─ index.html
├─ supabase/migrations/0001_init.sql      # full schema + RLS + storage bucket
├─ netlify/functions/
│  ├─ _shared/  http, auth, supabaseAdmin, crud
│  └─ projects.ts  tasks.ts  comments.ts  time-entries.ts  custom-fields.ts  attachments.ts
└─ src/
   ├─ main.tsx  App.tsx  index.css
   ├─ types/  lib/  hooks/  components/  pages/
```

---

## Setup

### 1. Prerequisites
- Node.js 18+ and npm
- A [Supabase](https://supabase.com) project
- (deploy) a [Netlify](https://netlify.com) account

```bash
npm install
npm install -g netlify-cli   # for `npm run dev`
```

### 2. Supabase
1. Create a project at supabase.com. Under **Settings → API**, note the
   **Project URL**, the **anon/publishable** key, and the **service_role/secret** key.
2. Open **SQL Editor**, paste [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql),
   and run it (creates tables, RLS policies, the `attachments` storage bucket, and
   a trigger that provisions a profile + personal workspace on signup). Then run
   [`supabase/migrations/0002_team.sql`](supabase/migrations/0002_team.sql) to enable
   team invites + member assignment.
3. **Authentication → Providers → Email:** disable "Confirm email" for the
   quickest start (or confirm via email).
4. **Authentication → URL Configuration:** set **Site URL** to your app URL
   (`http://localhost:8888` locally, `https://your-site.netlify.app` in prod).

### 3. Environment variables
Copy `.env.example` to `.env` and fill it in:

| Variable | Where | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | frontend | safe to expose; inlined at **build** time |
| `VITE_FUNCTIONS_BASE` | frontend | default `/.netlify/functions` |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | functions | same values as the `VITE_` ones |
| `SUPABASE_SERVICE_ROLE_KEY` | functions | **secret**, bypasses RLS |

### 4. Run locally
```bash
npm run dev            # netlify dev → http://localhost:8888
```
Sign up, add a List from the sidebar, and start creating tasks.

### 5. Deploy to Netlify
See **[DEPLOY.md](DEPLOY.md)** for the full step‑by‑step checklist (import from
Git, set env vars, redeploy). Build settings come from `netlify.toml`
automatically (`npm run build` → `dist`, functions in `netlify/functions`).

> Because `VITE_*` vars are compiled into the bundle at **build time**, you must
> **redeploy** after changing them.

## Security notes
- The service‑role key exists only in function env — never in the client bundle
  (only `VITE_*` vars are bundled).
- All data access is constrained by Postgres **Row Level Security**.

## License
[MIT](LICENSE) — contributions welcome, see [CONTRIBUTING.md](CONTRIBUTING.md).
