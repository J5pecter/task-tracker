# Contributing to TaskTracker

Thanks for your interest in improving TaskTracker! This guide covers local setup,
project conventions, and how to submit changes.

## Getting started

1. **Fork** the repo and clone your fork.
2. Install dependencies:
   ```bash
   npm install
   npm install -g netlify-cli   # for `npm run dev`
   ```
3. Create your env file and fill it in (see [README.md](README.md) for how to get
   each value):
   ```bash
   cp .env.example .env
   ```
4. Set up Supabase (run `supabase/migrations/0001_init.sql`) and, if you're
   working on Outlook features, register an Azure AD app.
5. Run the app:
   ```bash
   npm run dev        # netlify dev → http://localhost:8888
   ```

## Project layout

- `src/` — React frontend (Vite + Tailwind + React Query).
  - `pages/` route-level screens · `components/` reusable UI · `hooks/` data
    hooks (one per resource) · `lib/` clients & helpers · `types/` shared types.
- `netlify/functions/` — serverless TypeScript API. Shared helpers live in
  `_shared/`. Each function verifies the Supabase JWT and uses a user-scoped
  client so Row Level Security is enforced.
- `supabase/migrations/` — SQL schema, RLS policies, and storage setup.

## Development conventions

- **TypeScript everywhere.** No `// @ts-ignore` without a comment explaining why.
- **Data flow:** the frontend calls Netlify Functions via `callFunction()` and
  caches with React Query. Add a query key to `src/lib/queryClient.ts` (`qk`)
  rather than inlining key arrays.
- **New resource?** Add: a migration (table + RLS), a function, a hook, then UI.
- **Secrets** belong only in functions (never `VITE_`-prefixed). Never log tokens.
- **Styling:** Tailwind utility classes; reuse the `.btn`, `.input`, `.card`,
  `.label` component classes in `src/index.css`.
- **Icons:** `lucide-react`. **Modals/menus:** `@headlessui/react`.

## Before you open a PR

Run the same checks CI runs:

```bash
npm run lint
npm run typecheck
npm run build
```

All three should pass (lint warnings are tolerated; type and build errors are not).

## Commit & PR guidelines

- Use clear, present-tense commit messages (e.g. `Add board-view swimlanes`).
- Keep PRs focused; one logical change per PR.
- Describe **what** changed and **why**, and note any schema/RLS changes or new
  environment variables.
- If you change the database schema, include the migration and mention whether
  existing deployments need to re-run it.

## Reporting bugs / requesting features

Open an issue with steps to reproduce (for bugs) or a short use-case description
(for features). Screenshots and the relevant function/component path help a lot.

## Code of conduct

Be respectful and constructive. We want this to be a welcoming project for
contributors of all experience levels.

## License

By contributing, you agree that your contributions are licensed under the
project's [MIT License](LICENSE).
