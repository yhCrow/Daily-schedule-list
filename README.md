# Study Planner

A private website that tells you what to **study** and **revise** each day.

**Live site:** https://yhcrow.github.io/Daily-schedule-list/ (after the one-time setup below)

- **Automatic spaced repetition.** Log something you learned and it's scheduled for revision
  **1, 3, 7 and 10 days** later (plus an optional 30-day review).
- **Today page.** Overdue revisions, revisions due today, today's to-do list, and what you learned today.
- **Tomorrow card.** A small to-do list for tomorrow, plus a preview of tomorrow's revisions.
  Tomorrow's tasks become today's automatically when the date changes.
- **Private by design.** No account, no server, no database. Everything is saved in your own
  browser, so nobody else can see or edit your list. Anyone else who opens the site gets their
  own empty planner.

Also included: finishing a revision late moves the item's later revisions back by the same number
of days · a "Didn't remember it" button restarts an item's schedule from today · unfinished to-dos
from earlier days are carried over · drag to reorder · month calendar with busy-day warnings ·
streak and stats · backup download/import with a weekly reminder · light/dark mode · works offline
and can be installed on your phone · shortcuts `N` (add learning) and `T` (add to-do).

## Keep your data safe

Your planner lives in **one browser on one device**.

- **Back up:** Settings → **Download backup** saves a `.json` file. A yellow bar reminds you if
  you haven't backed up for 7 days.
- **Move device or browser:** download a backup, open the site on the new device, then
  Settings → **Import backup**.
- **Don't** clear this site's data or use a private window for it, or the list will be wiped or hidden.

## One-time setup: put it online (GitHub Pages, free)

1. On GitHub open the repo → **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Open the **Actions** tab → **Deploy to GitHub Pages** → **Run workflow** (or just push a commit).

After a minute the site is live at https://yhcrow.github.io/Daily-schedule-list/. Every later
push redeploys it automatically.

If the page says **"Failed to load …/src/main.tsx"**, Pages is set to *Deploy from a branch*,
which publishes the raw source code. Switch **Source** back to **GitHub Actions** and re-run the
workflow.

On your phone, open the link and use **Add to Home Screen** to install it like an app.

## Run it on your computer

```bash
npm install
npm run dev
```

Open http://localhost:5173. Note that `localhost` and the GitHub Pages site are different
addresses, so each keeps its own separate data.

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
npm run build     # static site in dist/
```

| Path | Contents |
| --- | --- |
| `src/lib/schedule.ts` | Spaced-repetition rules (pure functions, unit tested) |
| `src/lib/stats.ts` | Streak and completion stats |
| `src/lib/storage.ts` | Saving to and loading from the browser |
| `src/hooks/useData.tsx` | App state and every action, with undo |
| `src/pages/` | Today, Learn, Calendar, Stats, Settings |
| `.github/workflows/deploy.yml` | Tests, builds and publishes to GitHub Pages |

Stack: Vite, React, TypeScript, Tailwind CSS, date-fns, dnd-kit. The UI font is Bahnschrift,
falling back to Segoe UI / system fonts where it isn't installed.
