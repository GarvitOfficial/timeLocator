# Time Locator (OSINT)

A lightweight, static web app to estimate likely timezones from a reported time and optional context. It computes each timezone’s local time at the observed moment, scores how closely it matches the target, and lets you filter and browse results.

## Features
- Visual clock time picker synced with the HH:MM input.
- Optional Advanced mode for entering observed datetime.
- Context chips (9 AM, Noon, 9 PM, Sleep, Custom).
- Results filtering, exact-match toggle, and pagination (10 per page).
- "All Timezones" searchable list with pagination and live local times.
- Pure static site — ideal for GitHub Pages.

## Quick Start
- Open `index.html` directly, or run a static server:
  - `python3 -m http.server 8001`
  - Visit `http://localhost:8001/`
- Set the reported time (use the clock or input), choose context, and click Analyze.

## Usage
- Reported time: the time they mentioned (HH:MM).
- Advanced mode: optionally add the observed date/time in your local timezone.
- Context: choose a chip or provide a custom time.
- Filter: search by city/timezone; toggle exact matches.
- Paginate: navigate results and "All Timezones" lists (10 per page).

## Deployment (GitHub Pages)
- Push this folder to a GitHub repo, then enable Pages:
  - Settings → Pages → Deploy from a branch → `main`, root (`/`).
- Your site will publish at `https://<user>.github.io/<repo>/`.

## Repository
- GitHub: https://github.com/GarvitOfficial/timeLocator

## License
- MIT License. See `LICENSE` for details.