# Build Prompt: Personal Study & Revision Planner

Copy everything below the line into Claude Code (or any coding assistant) to build the project.

---

## Goal

Build a personal website that shows me what to **study** and what to **revise** each day. It uses
spaced repetition: whenever I log something I learned, the site automatically schedules the
revisions for me. It also has a daily to-do list for today and a short to-do list for tomorrow.

**Only I can edit anything.** Nobody else can create, change, tick off or delete a single item.

## Tech stack

- **Frontend:** Vite + React + TypeScript, Tailwind CSS
- **Backend / auth / database:** Supabase (Postgres + Supabase Auth + Row Level Security)
- **Hosting:** Vercel or GitHub Pages (static build), Supabase for data
- **Dates:** `date-fns` (all dates use my local timezone, stored as plain `DATE` values, not timestamps)
- **Font:** Bahnschrift as the main UI font, with a fallback stack:
  `font-family: "Bahnschrift", "DIN Alternate", "Segoe UI", system-ui, sans-serif;`

## Core feature 1: Learning log with automatic revision schedule

1. A form to add a learning item: **title** (required), **subject/tag** (optional), **notes or link**
   (optional), **date learned** (defaults to today, can be changed for back-filling).
2. When I save it, the app **automatically creates 4 revision tasks** due on:
   - Revision 1: learned date **+ 1 day**
   - Revision 2: learned date **+ 3 days**
   - Revision 3: learned date **+ 7 days** (1 week)
   - Revision 4: learned date **+ 10 days**

   Example: learned on Mon 5 Oct → revise Tue 6 Oct, Thu 8 Oct, Mon 12 Oct, Thu 15 Oct.
3. The intervals live in **one config constant** (`REVISION_OFFSETS = [1, 3, 7, 10]`) so I can change
   them later without touching the rest of the code. Generate the schedule from this array.
4. Each revision can be marked **done**. Show progress per item, e.g. `2/4 revisions done`.
5. If I edit an item's learned date, recalculate any revisions that are not yet done.
6. Deleting a learning item deletes its revisions (ask for confirmation first).

## Core feature 2: Today page (the home page)

The home page shows one combined view for **today**:

- **Revise today:** all revisions due today, labelled with which round it is (R1–R4).
- **Overdue:** revisions whose due date has passed and are not done, shown in red at the top,
  with how many days late. They stay here until I complete them (they never silently disappear).
- **Today's to-do list:** free-form tasks for today. Add, tick off, edit, delete, reorder (drag).
- **Learned today:** the items I logged today, with a quick "add what I learned" button.

## Core feature 3: Tomorrow list

- A **small** to-do list for **tomorrow only** (keep it visually compact, e.g. a side card).
- It also previews the revisions that will be due tomorrow (read-only preview).
- At the start of a new day, tomorrow's tasks automatically become today's tasks. Do this by storing
  every task with a `due_date`; "today" and "tomorrow" are just queries by date, so nothing needs a
  cron job.
- Unfinished to-do tasks from past days show as "carried over" on today's list, with a one-click
  option to move them to today or delete them.

## Core feature 4: Owner-only access (security)

Security must be enforced **on the server**, not just by hiding buttons:

1. Use Supabase Auth with email + password (or magic link / GitHub login). **Disable public
   sign-ups** in the Supabase dashboard so no one else can create an account.
2. Every table has an `owner_id uuid` column defaulting to `auth.uid()`.
3. Enable **Row Level Security** on every table with policies so only my user can
   `SELECT/INSERT/UPDATE/DELETE`:
   ```sql
   create policy "owner only" on learning_items
     for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
   ```
   As an extra lock, also check against my exact user id (store it in a config table or hard-code it
   in the policy) so even an accidentally created second account has zero access.
4. Logged-out visitors see only a login page. Never put the Supabase **service role key** in the
   frontend; only the public anon key is allowed there.
5. Write a short test or manual checklist that proves: logged-out users get no data, and a second
   test account cannot read or modify my rows.

## Data model (suggested)

```
learning_items(id, owner_id, title, subject, notes, learned_on DATE, created_at)
revisions(id, owner_id, item_id -> learning_items ON DELETE CASCADE, round INT,
          due_on DATE, done_at TIMESTAMPTZ NULL)
todos(id, owner_id, title, due_on DATE, done_at TIMESTAMPTZ NULL, position INT, created_at)
```

Create revisions inside one database function / transaction together with the learning item, so an
item never exists without its revisions.

## Pages

- `/` Today (overdue, revise today, today's to-dos, learned today, tomorrow card)
- `/learn` Add / list / search all learning items, filter by subject, see progress
- `/calendar` Month view: dots for revisions and to-dos on each day; click a day to see details
- `/login`

## UI / UX requirements

- Clean, minimal, mobile-first (I'll use it on my phone too). Works at 360px width.
- Light and dark mode.
- Quick-add: pressing `N` opens "add learning", `T` opens "add to-do".
- Ticking something off gives instant feedback (optimistic update) and can be undone for a few seconds.

## Suggested extras (build if time allows, in this order)

1. **Reschedule rule for late revisions:** if I complete a revision late, shift the remaining
   revisions of that item forward by the same number of days, so the spacing still makes sense.
2. **"Didn't remember it" button:** restarts that item's schedule from today (1, 3, 7, 10 again).
3. **Optional 5th long-term review** at +30 days (toggle in settings) for stronger long-term memory.
4. **Daily load warning:** if a day has many revisions, show a count badge so I can plan ahead.
5. **Streak & stats:** days in a row with all revisions done, total items learned, completion rate.
6. **Export / import JSON** backup of all my data.
7. **PWA:** installable on phone, works offline for viewing, syncs when back online.
8. **Reminder:** optional daily email or browser notification at a time I choose, listing today's
   revisions and to-dos.
9. **Read-only share link (optional, off by default):** lets someone view, never edit, my schedule.

## Deliverables

- Working app with the features above, plus `README.md` explaining setup: creating the Supabase
  project, running the SQL migration (put it in `supabase/migrations/`), disabling sign-ups,
  creating my account, setting env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`), running
  locally, and deploying.
- Unit tests for the scheduling logic (offsets, edited dates, late-completion shift, month and year
  boundaries, timezone around midnight).
- Keep the code simple and well organised; no features beyond this list unless I ask.
