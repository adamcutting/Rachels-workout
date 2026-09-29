# Rachel's Workouts

A phone app for lunchtime workouts at home: kettlebell strength, bodyweight moves and sprints, planned for fat loss through perimenopause. It installs to the home screen on Android (built with a Pixel 9a in mind), works offline, and keeps everything on the phone.

## What it does

- **Today**: the next workout in the rotation, with a full (30 to 45 min) or short (about 25 min) version, a nudge for any workout day left unlogged, the week at a glance and a daily check-in.
- **A monthly plan that moves on when workouts are done.** A "week" of the plan is complete once she's done one of each workout in the rotation, and four of those make a month. Miss days and the plan waits. After a break of two weeks or more it offers to repeat the previous week.
  - Month 1 **Foundations**: learn the moves, 2 then 3 sets.
  - Month 2 **Build**: harder versions (slow squats, lunges holding the bell, single-leg bridges, floor push-ups) and the 16kg bell for legs.
  - Month 3 **Burn**: rests cut by a quarter, longer finishers, more sprints.
  - Month 4 onwards repeats the month 3 format, going heavier where it felt easy.
- **Workouts**: Legs and glutes, Upper body and core, Whole body burn, and Sprints and sweat (joins with a fourth workout day), plus a 12-minute stretch for rest days. Main work is done in pairs to save time.
- **Demonstrations**: an animated figure for every main move, step-by-step instructions, common mistakes, easier and harder options, and a link to videos. Demos also show in the timer bar during circuits.
- **Timer**: rest timer starts when a set is ticked; circuit, sprint interval, EMOM and AMRAP timers; countdown beeps, spoken cues, vibration, and the screen stays awake.
- **Logging**: weights and reps per set (her 2.5, 6, 10 and 16kg bells), effort, niggles and notes. Skipped days with a reason. Walks and other activity. Check-ins for energy, sleep, mood, steps, period and symptoms. Weight (kg or stone) and waist.
- **History**: calendar, monthly totals, strength trends, weight and waist trends, why workouts were missed (with patterns such as "most skips are on Mondays" or "on days with symptoms"), and how she has felt.
- **Suggestions** to move up a bell once the same weight has felt comfortable twice in a row.
- **Backups**: send to Google Drive or email, save a file, or copy as text; restore from any of these. Google Calendar reminders for her workout days.

## Put it on the phone

The app is plain HTML, CSS and JavaScript with no build step, so any static host works. It needs HTTPS to install and work offline.

**GitHub Pages** (this repo includes the workflow in `.github/workflows/pages.yml`):

1. Merge this branch into `main`.
2. In the repo on GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. The workflow deploys on every push to `main`. The site will be at `https://adamcutting.github.io/Rachels-workout/`.

GitHub Pages for a **private** repo needs a paid GitHub plan. Otherwise, either make the repo public (it contains no personal data; her logs stay on her phone) or connect the repo to Netlify or Cloudflare Pages, both free for private repos, with no build command and the repo root as the publish directory.

**On the Pixel 9a**: open the site in Chrome, tap **⋮ → Add to home screen → Install**. It then opens full screen from its own icon.

## Data

Everything is stored in the browser's local storage on the phone. Nothing is sent anywhere. The app asks Chrome to keep the storage persistent, and reminds her to back up every few weeks.

## Working on it

```
npx http-server -p 8080     # then open http://localhost:8080
node scripts/build-artifact.mjs   # single-file build in dist/ for a claude.ai preview
```

- `js/program.js`: the moves, sessions, month-by-month progression and coaching notes. Change the programme here.
- `js/demos.js`: keyframes for each animated demonstration; `js/figure.js` draws and animates them.
- `js/app.js`: screens, logging, timers and storage.
- `sw.js`: offline caching. Bump `VERSION` when changing the list of files.
