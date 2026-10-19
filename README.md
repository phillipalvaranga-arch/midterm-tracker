# Midterm Tracker 2026
Installable PWA. Data: pipeline/build_data.py -> data/data.json (daily GitHub Action). Pollster rule: pipeline/pollster_accuracy.py.

## Live results (v7)
`live.js` switches the app to live results on Nov 3, 2026, 6:00 PM CT. It reads the public Fox News election feed
(`feeds-elections.foxnews.com/archive/politics/elections/2026/3/2026_Generals/...`, CORS-enabled) directly in the browser every 30 s.
Backup: `.github/workflows/results.yml` runs `pipeline/results_snapshot.py` about every 10 min (Nov 3 - Dec 15) and commits `data/results.json`,
used only when the browser can't reach Fox. Test views: `?feed=stage` (Fox test feed, fake numbers), `?year=2024` / `?year=2022` (past results), `?results=1` / `?results=0`.
