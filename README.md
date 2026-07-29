# TaskTracker

[![CI](https://github.com/yeshmahajan/task-tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/yeshmahajan/task-tracker/actions/workflows/ci.yml)
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/yeshmahajan/task-tracker)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A ClickUp‑inspired, full‑stack task manager with **Microsoft Outlook** integration
(Microsoft Graph / Microsoft To Do + Calendar), built on **React + Vite +
Tailwind**, **Supabase (Postgres)**, and **Netlify Functions** (serverless
TypeScript). Deployable to Netlify with a single click once environment
variables are configured.

## Features

- **Hierarchy:** Workspaces → (Folders) → Lists → Tasks → Subtasks
- **Tasks:** description, priority, custom per‑list statuses, assignee, due/start
  dates, estimate, **time tracking** (start/stop timer), **recurrence**,
  labels, **custom fields** (text/number/dropdown/date/checkbox), **threaded
  comments**, **dependencies** (blocking / waiting‑on)
- **Views:** List (sortable, drag‑and‑drop), **Board** (Kanban, drag between
  statuses), **Calendar** (tasks + Outlook events)
- **My Tasks** dashboard aggregating everything assigned to you
- **Search & Filter:** full‑text task search, filter by status/priority/due
- **Outlook:** live fetch of Microsoft To Do lists/tasks and Calendar events,
  **Sync now**, and **import** an Outlook task into a local list (keeps a link
  via the stored Outlook task id)
- **Notifications:** in‑app toasts + basic browser due‑date reminders
- **Security:** Supabase **Row Level Security**; Microsoft **refresh tokens
  encrypted at rest** (AES‑256‑GCM); secrets live only in Netlify Functions

## Architecture

```
Browser (React + React Query)
   │  Supabase JWT in Authorization header
   ▼
Netlify Functions (TypeScript)              Microsoft Graph
   ├─ auth.ts            OAuth link + token exchange ─────► login.microsoftonline.com
   ├─ outlook-tasks.ts   live Graph reads (silent refresh) ─► graph.microsoft.com
   ├─ projects.ts        workspaces / folders / lists  ┐
   ├─ tasks.ts           tasks / subtasks / deps / search│  user-scoped client → RLS
   ├─ comments.ts        threaded comments               │
   ├─ time-entries.ts    timers & summaries              │
   └─ custom-fields.ts   field defs + values            ┘
                     │
                     ▼
              Supabase (Postgres + RLS + Storage)
```

The frontend talks **only** to Netlify Functions for data; the functions use a
Supabase client scoped to the caller's JWT, so RLS is enforced on every query.
Outlook data is fetched live and cached by React Query — it is **not** persisted
unless the user explicitly imports a task.

## Project structure

```
├─ netlify.toml
├─ package.json / vite.config.ts / tailwind.config.js / tsconfig*.json
├─ index.html
├─ supabase/migrations/0001_init.sql      # full schema + RLS + storage bucket
├─ netlify/functions/
│  ├─ _shared/  http, auth, supabaseAdmin, crypto, graph, crud
│  ├─ auth.ts  outlook-tasks.ts  projects.ts  tasks.ts
│  └─ comments.ts  time-entries.ts  custom-fields.ts  attachments.ts
└─ src/
   ├─ main.tsx  App.tsx  index.css  vite-env.d.ts
   ├─ types/                domain types shared across UI + functions
   ├─ lib/                  supabase, apiClient, queryClient, format
   ├─ hooks/                useAuth, useProjects, useTasks, useOutlookTasks,
   │                        useComments, useTimeTracking, useCustomFields,
   │                        useDueReminders
   ├─ components/           Sidebar, AppLayout, TaskCard, TaskForm, KanbanColumn,
   │                        Timer, CustomFieldInput, CommentThread, TaskFilters,
   │                        ViewTabs, ListHeader, RunningTimerPill, ui/*
   └─ pages/                Login, Dashboard, ListView, BoardView, CalendarView,
                            TaskDetail, OutlookView, Settings, SearchResults
```

---

## 1. Prerequisites

- Node.js 18+ and npm
- A [Supabase](https://supabase.com) project
- A [Microsoft Azure AD app registration](https://portal.azure.com)
- (For deploy) a [Netlify](https://netlify.com) account + the Netlify CLI

```bash
npm install
npm install -g netlify-cli   # for `npm run dev` (netlify dev)
```

## 2. Supabase setup

1. Create a project at supabase.com. Note the **Project URL** and, under
   **Settings → API**, the **anon** key and the **service_role** key.
2. Open **SQL Editor**, paste the contents of
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql), and run it.
   This creates all tables, RLS policies, the `attachments` storage bucket, and a
   trigger that provisions a profile + personal workspace on signup.
3. **Auth → Providers:** for the quickest start, disable "Confirm email"
   (Auth → Providers → Email) so new signups can log in immediately. Optionally
   enable the **Azure** provider to allow "Continue with Microsoft" sign‑in.

## 3. Azure AD app registration (Microsoft Graph)

1. Azure Portal → **Microsoft Entra ID → App registrations → New registration**.
2. Supported account types: **Accounts in any organizational directory and
   personal Microsoft accounts** (uses the `common` tenant).
3. **Redirect URI** (type *Web*): add both
   - `http://localhost:8888/.netlify/functions/auth` (local dev)
   - `https://YOUR-SITE.netlify.app/.netlify/functions/auth` (production)
4. **Certificates & secrets → New client secret** — copy the secret **value**.
5. **API permissions → Add → Microsoft Graph → Delegated:** `User.Read`,
   `Tasks.ReadWrite`, `Calendars.Read`, `offline_access`, `openid`, `profile`,
   `email`. Grant admin consent if required by your tenant.
6. Copy the **Application (client) ID**.

> `offline_access` is what lets us receive a **refresh token**; it is stored
> encrypted and used server‑side to refresh Graph access silently.

## 4. Environment variables

Copy `.env.example` to `.env` and fill it in:

```bash
cp .env.example .env
```

Generate the token encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

| Variable | Where | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | frontend | safe to expose |
| `VITE_FUNCTIONS_BASE` | frontend | default `/.netlify/functions` |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | functions | |
| `SUPABASE_SERVICE_ROLE_KEY` | functions | **secret**, bypasses RLS |
| `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET` | functions | from Azure |
| `MICROSOFT_TENANT` | functions | `common` unless single‑tenant |
| `MICROSOFT_REDIRECT_URI` | functions | must match Azure exactly |
| `MICROSOFT_SCOPES` | functions | see `.env.example` |
| `APP_BASE_URL` | functions | where to return the user after OAuth |
| `TOKEN_ENCRYPTION_KEY` | functions | 64 hex chars (32 bytes) |

## 5. Run locally

```bash
npm run dev            # netlify dev → app at http://localhost:8888
```

`netlify dev` serves the Vite app **and** the functions on port 8888 (so
relative `/.netlify/functions/*` calls work). Then:

1. Sign up / sign in (email + password).
2. A "My Workspace" is created automatically. Add a **List** from the sidebar.
3. Create tasks; try the List / Board / Calendar views.
4. Go to **Settings → Connect** (or the **Outlook** page) to link Microsoft and
   pull your To Do tasks / calendar.

> Prefer to run just the frontend? `npm run dev:vite` starts Vite on 5173 and
> proxies function calls to a `netlify dev` instance on 8888.

> **Deploying to production?** Follow [DEPLOY.md](DEPLOY.md) — a step‑by‑step,
> tick‑the‑box checklist covering Supabase, Azure, GitHub, Netlify, env vars, and
> verification, with a troubleshooting table.

## 6. Deploy to Netlify

1. Push this repo to GitHub and **Import** it in Netlify (build settings come
   from `netlify.toml`: build `npm run build`, publish `dist`, functions
   `netlify/functions`).
2. **Site settings → Environment variables:** add every non‑`VITE_`‑and‑`VITE_`
   variable from the table above. Set `APP_BASE_URL` and `MICROSOFT_REDIRECT_URI`
   to your `https://YOUR-SITE.netlify.app` values.
3. In Azure, ensure the production redirect URI is registered (step 3.3).
4. Deploy. Done.

```bash
# or from the CLI
netlify deploy --build --prod
```

## Security notes

- The service‑role key and Microsoft client secret exist **only** in function
  env — never in the client bundle (only `VITE_*` vars are bundled).
- Microsoft refresh tokens are encrypted (AES‑256‑GCM) before being stored in
  `user_profiles`; the browser never sees them.
- The OAuth link flow carries the Supabase JWT in the `state` parameter over
  HTTPS to identify the user in the stateless callback. For higher assurance you
  can swap this for a short‑lived, single‑use nonce persisted server‑side.
- All local data access is constrained by Postgres **Row Level Security**.

## Notes / roadmap

- Attachments are fully wired: drag‑and‑drop upload to the Supabase `attachments`
  Storage bucket, metadata recorded via the `attachments` function, private
  signed‑URL downloads, and server‑side cleanup on delete.
- Two‑way Outlook sync (pushing status changes back to Graph) is scaffolded via
  the stored `outlook_task_id` — add a `PATCH /me/todo/...` call in a function.
- Real‑time: swap React Query refetch for Supabase Realtime subscriptions when
  you add team collaboration (the schema already supports multiple members per
  workspace).
```
