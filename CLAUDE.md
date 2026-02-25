# Glick's Picks

A static website for an MLB player prop analytics project (7 markets: 5 pitcher props + 2 batter props). Hosted on GitHub Pages at glicks-picks.com.

## Rules
- **Linear for issue tracking**: All TODOs, bugs, and feature requests live in Linear (MLB Analytics team, `label: Website`). When starting work, find or create an issue and move to In Progress. Reference issues in commits (`MLB-N`).
- **Notion for documentation**: Project docs live in Notion (search for "Glicks Picks — Project Hub" > "Website"). After significant changes, update the Website page and add a Decision Log entry for architectural choices. Use the Notion MCP tools.

## Project structure

- `index.html` — Homepage (hero, how-it-works, markets, CTA)
- `picks.html` — Today's Picks page (pick cards, filters, archive calendar)
- `results.html` — Track Record page (summary, equity chart, market breakdown)
- `css/style.css` — All styles (2,056 lines), CSS custom properties, light/dark mode
- `js/config.js` — Global constants (`window.GP`): current season, book colors, team IDs
- `js/site_logic.js` — Pure logic module (UMD, testable in Node.js): book filter, calendar, results viewmodel
- `js/utils.js` — DOM helpers, fetch wrapper, formatters, team/book helpers
- `js/main.js` — Page router: mobile menu, season selector, theme toggle, homepage stats
- `js/picksPage.js` — Picks page: card rendering, filters, sort, backtest calendar
- `js/resultsPage.js` — Results page: equity chart, tables, streaks, direction stats
- `js/analytics.js` — Google Analytics 4 (async, fail-silent)
- `js/security.js` — Frame-busting protection
- `js/vendor/chart.umd.min.js` — Chart.js (vendored locally)
- `images/` — hero-bg.jpg, edge-bg.jpg, favicon.svg
- `data/` — JSON data files (picks, results, injuries, news). Written by mlb-analytics `export_web.py`.
- `tests/` — site_logic, data contract, and accessibility tests (Node.js `node:test`)
- `CNAME` — Custom domain: glicks-picks.com

## Tech stack

- Pure HTML/CSS/JS — no frameworks, no build tools, no npm runtime dependencies
- Fonts: DM Sans (body) and JetBrains Mono (numbers/code) via Google Fonts
- Chart.js vendored locally at `js/vendor/chart.umd.min.js` (no CDN dependency)
- Deployed via GitHub Pages from the main branch
- No server-side code

## Design system

- Color palette defined in CSS custom properties (`:root` in style.css)
  - `--bg: #f8f9fb` (light background)
  - `--accent: #2563eb` (blue for CTAs and highlights)
  - Dark mode via `data-theme="dark"` on `<html>`, toggle persisted to localStorage
  - FOLT prevention via inline `<head>` script
- Typography: DM Sans for body text, JetBrains Mono for statistics and numbers
- Mobile-first responsive design with breakpoints at 599px, 768px, 1024px
- Scroll reveal via IntersectionObserver (`.reveal` class)

## Coding conventions

- Vanilla JavaScript only — no libraries, no jQuery, no frameworks
- Use `var` and function expressions (the existing code style) for consistency
- CSS uses BEM-ish class naming: `.section-name`, `.section-name-element`, `.section-name-modifier`
- All animations respect `prefers-reduced-motion: reduce`
- All interactive elements must have `focus-visible` styles
- Use `clamp()` for responsive typography
- Script loading order: `security.js` → `analytics.js` → `config.js` → `site_logic.js` → `utils.js` → `[page-specific].js` → `main.js`

## Data integration

Data flows one-way from `~/mlb-analytics/` via `scripts/export_web.py`:
- `data/picks_today.json` — Current-season live picks
- `data/{season}/results.json` — Full season results + bankroll curve
- `data/{season}/picks_index.json` — Date index with pick counts
- `data/{season}/picks/{date}.json` — Per-day pick archive
- `data/injury_ledger.json` — Active IL players (from reddit_news.py)
- `data/reddit_news.json` — 7-day Reddit news feed

Season routing: `GP.CURRENT_SEASON` in config.js. Archive seasons read from `data/{season}/`.

## Deployment

- Push to `main` branch triggers GitHub Pages deployment
- The CNAME file must always contain `glicks-picks.com`
- No build step — files are served as-is

## Content guidelines

- This is a research project, NOT a betting service
- All statistics come from backtesting, not live wagering
- Footer disclaimer about gambling is required and must not be removed
- Tone: professional, data-driven, understated (not hype-y or promotional)
