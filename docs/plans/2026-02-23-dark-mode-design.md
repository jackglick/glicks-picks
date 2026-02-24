# Dark Mode Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a dark mode option with OS-preference detection, manual toggle, and localStorage persistence.

**Architecture:** CSS custom property overrides via `[data-theme="dark"]` on `<html>`. Inline `<head>` script prevents FOLT. Toggle button in header on all 3 pages. JS in `main.js` handles click + system preference listener.

**Tech Stack:** Vanilla CSS custom properties, vanilla JS, SVG icons, localStorage

---

### Task 1: Add dark mode CSS variable overrides

**Files:**
- Modify: `css/style.css` (append after line 1884)

**Step 1: Add the `[data-theme="dark"]` variable block**

Append to end of `css/style.css`:

```css
/* ============================================
   Dark Mode
   ============================================ */
[data-theme="dark"] {
  --bg: #1a1d23;
  --bg-surface: #22252b;
  --bg-surface-2: #2a2d34;
  --bg-elevated: #32353c;
  --accent: #2db89d;
  --accent-hover: #25a68c;
  --accent-dim: rgba(45, 184, 157, 0.12);
  --chip-border: rgba(255, 255, 255, 0.12);
  --chip-hover: rgba(45, 184, 157, 0.15);
  --navy: #e4e4e8;
  --yellow: #e8a820;
  --cream: #1a1d23;
  --text: #e4e4e8;
  --text-secondary: #9ca3b0;
  --text-dim: #7a8290;
  --muted: #6d7580;
  --border: rgba(255, 255, 255, 0.08);
  --danger: #e85d4a;
  --danger-bg: rgba(232, 93, 74, 0.15);
}
```

**Step 2: Verify file saved correctly**

Run: `tail -25 css/style.css`
Expected: The dark mode variable block appears.

**Step 3: Commit**

```bash
git add css/style.css
git commit -m "feat: add dark mode CSS custom property overrides"
```

---

### Task 2: Add dark mode targeted overrides for hardcoded values

**Files:**
- Modify: `css/style.css` (append after Task 1's block)

**Step 1: Add targeted overrides**

Append to end of `css/style.css` (after the variable block from Task 1):

```css
/* --- Dark mode: header --- */
[data-theme="dark"] .header {
  background: rgba(26, 29, 35, 0.97);
}

/* --- Dark mode: paper texture --- */
[data-theme="dark"] body::after {
  opacity: 0;
}

/* --- Dark mode: hero overlay --- */
[data-theme="dark"] .hero::before {
  background:
    radial-gradient(ellipse 70% 80% at 50% 50%, rgba(26, 29, 35, 0.88) 0%, rgba(26, 29, 35, 0.60) 100%),
    linear-gradient(180deg, rgba(26, 29, 35, 0.65) 0%, rgba(26, 29, 35, 0.70) 100%);
}

/* --- Dark mode: hero text shadows (dark glow instead of light) --- */
[data-theme="dark"] .hero-headline,
[data-theme="dark"] .hero-stat-number,
[data-theme="dark"] .hero-stat-label,
[data-theme="dark"] .hero-stat-detail,
[data-theme="dark"] .hero-stat-context,
[data-theme="dark"] .hero-sub {
  text-shadow: 0 0 20px rgba(26, 29, 35, 0.9), 0 0 40px rgba(26, 29, 35, 0.5);
}

/* --- Dark mode: box shadows --- */
[data-theme="dark"] .backtest-calendar-popover {
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
}

[data-theme="dark"] .pick-card {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2), 0 1px 2px rgba(0, 0, 0, 0.15);
}

[data-theme="dark"] .pick-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2);
}

[data-theme="dark"] .step-card,
[data-theme="dark"] .summary-card,
[data-theme="dark"] .results-chart-wrapper,
[data-theme="dark"] .results-table-wrapper,
[data-theme="dark"] .stats-breakdown {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

[data-theme="dark"] .books-filter-bar {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
}

/* --- Dark mode: hardcoded white backgrounds --- */
[data-theme="dark"] .book-filter-option,
[data-theme="dark"] .market-filter-chip {
  background: var(--bg-surface);
}

/* --- Dark mode: hardcoded danger color --- */
[data-theme="dark"] .pick-direction.under {
  color: var(--danger);
  background: var(--danger-bg);
}

[data-theme="dark"] .pnl-negative,
[data-theme="dark"] .summary-stat-value.negative,
[data-theme="dark"] .summary-meta strong.negative {
  color: var(--danger);
}

[data-theme="dark"] .result-badge.loss {
  color: var(--danger);
  background: var(--danger-bg);
}

/* --- Dark mode: skip link --- */
[data-theme="dark"] .skip-link {
  background: var(--bg-surface);
}

/* --- Dark mode: loading skeleton --- */
[data-theme="dark"] .loading-skeleton {
  background: linear-gradient(90deg, var(--bg-surface) 25%, rgba(45, 184, 157, 0.08) 50%, var(--bg-surface) 75%);
  background-size: 200% 100%;
}

/* --- Dark mode: table row hover --- */
[data-theme="dark"] .results-table tbody tr:hover {
  background: rgba(45, 184, 157, 0.08);
}

/* --- Dark mode: push badge --- */
[data-theme="dark"] .result-badge.push {
  background: rgba(122, 130, 144, 0.15);
}

[data-theme="dark"] .pick-outcome.push {
  background: rgba(122, 130, 144, 0.15);
}
```

**Step 2: Commit**

```bash
git add css/style.css
git commit -m "feat: add dark mode overrides for hardcoded rgba values"
```

---

### Task 3: Add theme toggle CSS (button styling + icon visibility)

**Files:**
- Modify: `css/style.css` (append after Task 2's block)

**Step 1: Add toggle button styles**

Append to end of `css/style.css`:

```css
/* --- Theme Toggle Button --- */
.theme-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 0;
  border-radius: 6px;
  transition: color 0.2s;
}

.theme-toggle:hover {
  color: var(--text);
}

/* Light mode: show moon, hide sun */
.theme-icon-sun {
  display: none;
}

/* Dark mode: show sun, hide moon */
[data-theme="dark"] .theme-icon-moon {
  display: none;
}

[data-theme="dark"] .theme-icon-sun {
  display: block;
}
```

**Step 2: Commit**

```bash
git add css/style.css
git commit -m "feat: add theme toggle button styles and icon visibility rules"
```

---

### Task 4: Add toggle button HTML to all 3 pages

**Files:**
- Modify: `index.html:54` (between `</nav>` and `<button class="hamburger">`)
- Modify: `picks.html:51` (same location)
- Modify: `results.html:51` (same location)

**Step 1: Insert toggle button in `index.html`**

After line 54 (`</nav>`), before line 55 (`<button class="hamburger"`), insert:

```html
      <button class="theme-toggle" aria-label="Switch to dark mode">
        <svg class="theme-icon-moon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
        <svg class="theme-icon-sun" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
        </svg>
      </button>
```

**Step 2: Insert identical toggle button in `picks.html`**

Same HTML, same location (after `</nav>`, before `<button class="hamburger"`).

**Step 3: Insert identical toggle button in `results.html`**

Same HTML, same location.

**Step 4: Commit**

```bash
git add index.html picks.html results.html
git commit -m "feat: add theme toggle button to all page headers"
```

---

### Task 5: Add inline FOLT-prevention script to all 3 pages

**Files:**
- Modify: `index.html:40` (before `</head>`)
- Modify: `picks.html:37` (before `</head>`)
- Modify: `results.html:37` (before `</head>`)

**Step 1: Insert inline script in `index.html`**

Before the `</head>` tag (line 41), after the stylesheet link (line 40), insert:

```html
  <script>
    (function(){var t=localStorage.getItem('theme');if(!t){t=window.matchMedia&&window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'}document.documentElement.setAttribute('data-theme',t)})();
  </script>
```

**Step 2: Insert identical script in `picks.html`**

Before `</head>` (line 38), after the stylesheet link (line 37).

**Step 3: Insert identical script in `results.html`**

Before `</head>` (line 38), after the stylesheet link (line 37).

**Step 4: Update CSP in all 3 pages**

The Content-Security-Policy `script-src` directive currently has `'self' https://www.googletagmanager.com`. Add `'unsafe-inline'` to allow the inline FOLT script. In each page's CSP meta tag, change:

`script-src 'self' https://www.googletagmanager.com`

to:

`script-src 'self' 'unsafe-inline' https://www.googletagmanager.com`

Note: The inline script is tiny and non-dynamic, so the security risk is minimal. An alternative would be a sha256 hash in the CSP, but that's fragile for a static site.

**Step 5: Commit**

```bash
git add index.html picks.html results.html
git commit -m "feat: add inline FOLT-prevention script to all pages"
```

---

### Task 6: Add theme toggle JavaScript to main.js

**Files:**
- Modify: `js/main.js` (add `initThemeToggle()` function and call it)

**Step 1: Add `initThemeToggle` function**

In `js/main.js`, insert a new function before the Page Router section (before line 119 `// --- Page Router ---`):

```javascript
  // --- Theme Toggle ---
  function initThemeToggle() {
    var toggle = document.querySelector('.theme-toggle');
    if (!toggle) return;

    function getTheme() {
      return document.documentElement.getAttribute('data-theme') || 'light';
    }

    function setTheme(theme) {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('theme', theme);
      toggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    }

    // Set initial aria-label
    toggle.setAttribute('aria-label', getTheme() === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');

    toggle.addEventListener('click', function () {
      setTheme(getTheme() === 'dark' ? 'light' : 'dark');
    });

    // Listen for OS preference changes (only if user hasn't set manual override)
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
        if (!localStorage.getItem('theme')) {
          setTheme(e.matches ? 'dark' : 'light');
        }
      });
    }
  }
```

**Step 2: Call `initThemeToggle()` in the Page Router section**

Add `initThemeToggle();` as the first call in the Page Router block (line 120), before `initMobileMenu();`:

```javascript
  // --- Page Router ---
  initThemeToggle();
  initMobileMenu();
```

**Step 3: Commit**

```bash
git add js/main.js
git commit -m "feat: add theme toggle JS with system preference detection"
```

---

### Task 7: Manual testing and adjustments

**Step 1: Open the site locally and verify**

Run: `open index.html` (or use a local server)

Test checklist:
- [ ] Toggle button visible in header on all 3 pages
- [ ] Clicking toggle switches between light and dark
- [ ] Preference persists on page reload
- [ ] Preference persists across pages (navigate from index to picks)
- [ ] With no localStorage, respects OS preference
- [ ] No FOLT on page reload in dark mode
- [ ] Hero section readable in dark mode
- [ ] Pick cards, filter chips, and tables look correct in dark mode
- [ ] Focus-visible outline works on the toggle button
- [ ] Mobile: toggle visible next to hamburger
- [ ] Mobile nav background correct in dark mode

**Step 2: Fix any visual issues found during testing**

Adjust CSS overrides as needed.

**Step 3: Final commit**

```bash
git add -A
git commit -m "fix: dark mode visual adjustments from manual testing"
```
