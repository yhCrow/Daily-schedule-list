# Study Planner

A private website that tells you what to **study** and **revise** each day.

- **Automatic spaced repetition.** Log something you learned and it's scheduled for revision
  **1, 3, 7 and 10 days** later (plus an optional 30-day review).
- **Today page.** Overdue revisions, revisions due today, today's to-do list, and what you learned today.
- **Tomorrow card.** A small to-do list for tomorrow, plus a preview of tomorrow's revisions.
  Tomorrow's tasks become today's automatically when the date changes.
- **Owner only.** Only your account can view or change anything. This is enforced by the
  database (Row Level Security), not just by hiding buttons.

Also included: finishing a revision late moves the item's later revisions back by the same number
of days · a "Didn't remember it" button restarts an item's schedule from today · unfinished to-dos
from earlier days are carried over · drag to reorder · month calendar with busy-day warnings ·
streak and stats · JSON export/import · light/dark mode · installable on your phone (PWA) ·
shortcuts `N` (add learning) and `T` (add to-do).

## Try it without any setup

```bash
npm install
npm run dev:demo
```

Open http://localhost:5173. Demo mode saves data in your browser only and has no login.
**Don't deploy demo mode**; use the Supabase setup below for the real thing.

## Setup (real, login-protected version)

### 1. Create the database

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor**, paste all of [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) and click **Run**.

### 2. Lock sign-ups and create your account

1. **Authentication → Sign In / Providers**: turn **off** "Allow new users to sign up".
2. **Authentication → Users → Add user → Create new user**: enter your email and a strong password
   and tick "Auto confirm user".
3. Copy your new user's **UID**, then in the SQL editor run:

   ```sql
   insert into public.app_owner (user_id) values ('PASTE-YOUR-UID-HERE');
   ```

   Only the account listed in `app_owner` can touch data. Even if another account were somehow
   created, it would see nothing and could change nothing.

### 3. Connect the website

```bash
cp .env.example .env.local
```

Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from **Project Settings → API**.
Use the **anon / publishable** key only. **Never** put the `service_role` key in the website.

```bash
npm install
npm run dev
```

### 4. Check that nobody else has access

```bash
npm run check-rls
```

This checks that a logged-out visitor can't read or write any table. To also test a second account:
temporarily turn sign-ups back on (or add a user in the dashboard), then run
`TEST_EMAIL=other@example.com TEST_PASSWORD=... npm run check-rls`, and delete that user afterwards.

Manual checklist:

- [ ] Opening the site in a private window shows only the login page.
- [ ] Signing in as any account other than yours shows "No access".
- [ ] `npm run check-rls` prints "All checks passed".

## Deploy

The build is a static site (`npm run build` → `dist/`). It uses hash URLs (`/#/calendar`), so it
needs no server rewrites.

**Vercel:** import the repo, framework preset "Vite", and add the two `VITE_SUPABASE_*` environment
variables. Deploy.

**GitHub Pages:** add the two variables as repository secrets, build with them set
(`npm run build`), and publish the `dist/` folder (e.g. with the `actions/deploy-pages` workflow).

The anon key is meant to be public. Your data stays private because of the Row Level Security
rules in the database.

## How the schedule works

| Situation | What happens |
| --- | --- |
| You add an item learned on day D | Revisions due D+1, D+3, D+7, D+10 (and D+30 if enabled in Settings) |
| You finish a revision on time or early | Nothing else moves |
| You finish a revision N days late | That item's later, unfinished revisions move N days later |
| You click "Didn't remember it" | The item's revisions are replaced with a fresh schedule starting today |
| You change an item's learned date | Revisions you haven't done yet move to the usual offsets from the new date |
| A revision's day passes and it isn't done | It stays in **Overdue** until you do it |

To change the intervals, edit `REVISION_OFFSETS` in [`src/lib/schedule.ts`](src/lib/schedule.ts).

## Development

```bash
npm test          # scheduling and stats unit tests
npm run typecheck
npm run build
```

| Path | Contents |
| --- | --- |
| `src/lib/schedule.ts` | Spaced-repetition rules (pure functions, unit tested) |
| `src/lib/stats.ts` | Streak and completion stats |
| `src/lib/backend.ts` | Supabase data access, plus the browser-only demo backend |
| `src/hooks/useData.tsx` | App state with optimistic updates and undo |
| `src/pages/` | Today, Learn, Calendar, Stats, Settings, Login |
| `supabase/migrations/` | Database schema and security rules |

Stack: Vite, React, TypeScript, Tailwind CSS, Supabase, date-fns, dnd-kit. The UI font is
Bahnschrift, falling back to Segoe UI / system fonts where it isn't installed.

## Not built yet

Daily reminder emails or notifications, and a read-only share link. Both need extra server
setup (a scheduled Supabase Edge Function, and a separate public-read policy).
