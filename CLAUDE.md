# Glick's Picks

A static website for an MLB player prop analytics project (7 markets: 5 pitcher props + 2 batter props). Hosted on GitHub Pages at glicks-picks.com.

## Project structure

- `index.html` — Single-page site (hero, how-it-works, the-edge, what's-next, about, footer)
- `css/style.css` — All styles, uses CSS custom properties (vars in :root)
- `js/main.js` — Vanilla JS: IntersectionObserver scroll reveal, bar animations, mobile menu, active nav highlighting
- `images/` — hero-bg.jpg, edge-bg.jpg, favicon.svg
- `CNAME` — Custom domain: glicks-picks.com

## Tech stack

- Pure HTML/CSS/JS — no frameworks, no build tools, no npm
- Fonts: Inter (body) and JetBrains Mono (numbers/code) via Google Fonts
- Deployed via GitHub Pages from the main branch
- No server-side code

## Design system

- Color palette defined in CSS custom properties (`:root` in style.css)
  - `--bg: #faf7f2` (warm cream background)
  - `--accent: #1a7f6d` (teal green for CTAs and highlights)
  - `--navy: #1b2a4a` (dark sections and headings)
  - `--yellow: #d4940a` (caution/warning tier)
- Typography: Inter for body text, JetBrains Mono for statistics and numbers
- Light editorial theme with paper texture overlay
- Mobile-first responsive design with breakpoints at 599px, 768px, 1024px

## Coding conventions

- Vanilla JavaScript only — no libraries, no jQuery, no frameworks
- Use `var` and function expressions (the existing code style) for consistency with main.js
- CSS uses BEM-ish class naming: `.section-name`, `.section-name-element`, `.section-name-modifier`
- All animations respect `prefers-reduced-motion: reduce`
- All interactive elements must have `focus-visible` styles
- Use `clamp()` for responsive typography
- HTML sections follow the pattern: section > container > reveal wrapper > content

## Deployment

- Push to `main` branch triggers GitHub Pages deployment
- The CNAME file must always contain `glicks-picks.com`
- No build step — files are served as-is

## Content guidelines

- This is a research project, NOT a betting service
- All statistics come from backtesting, not live wagering
- Footer disclaimer about gambling is required and must not be removed
- Tone: professional, data-driven, understated (not hype-y or promotional)
