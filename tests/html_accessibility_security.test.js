'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function hasInlineScript(html) {
  const re = /<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    if ((m[1] || '').trim() !== '') return true;
  }
  return false;
}

['index.html', 'picks.html', 'results.html'].forEach(function (file) {
  test(file + ' has baseline accessibility and security structure', function () {
    const html = read(file);
    assert.ok(html.includes('class="skip-link" href="#main-content"'), file + ': skip link');
    assert.ok(html.includes('<main id="main-content">'), file + ': main landmark');
    assert.ok(html.includes('<meta name="viewport" content="width=device-width, initial-scale=1.0">'), file + ': viewport');
    assert.ok(html.includes('<meta http-equiv="Content-Security-Policy"'), file + ': CSP meta');
    assert.ok(html.includes('default-src \'self\''), file + ': CSP default-src');
    assert.ok(html.includes('object-src \'none\''), file + ': CSP object-src');
    assert.ok(html.includes('frame-ancestors \'none\''), file + ': CSP frame-ancestors');
    assert.ok(!html.includes('script-src \'unsafe-inline\''), file + ': no unsafe-inline scripts');
    assert.ok(!hasInlineScript(html), file + ': no inline script blocks');
    assert.ok(html.includes('<meta name="referrer" content="strict-origin-when-cross-origin">'), file + ': referrer policy');
    assert.ok(html.includes('<script src="js/security.js"></script>'), file + ': security.js');
    assert.ok(html.includes('<script src="js/analytics.js"></script>'), file + ': analytics.js');
    assert.ok(html.includes('<script src="js/site_logic.js"></script>'), file + ': site_logic.js');
    assert.ok(html.includes('<script src="js/config.js"></script>'), file + ': config.js');
    assert.ok(html.includes('<script src="js/utils.js"></script>'), file + ': utils.js');
    // Page-specific scripts: picksPage only on picks, resultsPage only on results
    if (file === 'picks.html') {
      assert.ok(html.includes('<script src="js/picksPage.js"></script>'), file + ': picksPage.js');
    }
    if (file === 'results.html') {
      assert.ok(html.includes('<script src="js/resultsPage.js"></script>'), file + ': resultsPage.js');
    }
    assert.ok(html.includes('<script src="js/main.js"></script>'), file + ': main.js');
  });
});

test('picks page has accessible calendar and filter controls', function () {
  const html = read('picks.html');
  assert.ok(html.includes('id="backtest-date-trigger"'), 'date trigger exists');
  assert.ok(html.includes('aria-haspopup="dialog"'), 'date trigger dialog semantics');
  assert.ok(html.includes('aria-controls="backtest-calendar-popover"'), 'date trigger controls popover');
  assert.ok(html.includes('id="backtest-prev-month" class="calendar-nav-btn" aria-label="Previous month"'), 'prev month aria-label');
  assert.ok(html.includes('id="backtest-next-month" class="calendar-nav-btn" aria-label="Next month"'), 'next month aria-label');
  assert.ok(html.includes('id="books-filter-summary" class="books-filter-summary" aria-live="polite"'), 'book summary aria-live');
});

test('results page keeps table captions for screen-reader context', function () {
  const html = read('results.html');
  assert.ok(html.includes('<caption>Market-level backtest summary</caption>'));
  assert.ok(html.includes('<caption>Most recent graded picks from the archive</caption>'));
});

test('security and analytics scripts keep expected hardened behavior', function () {
  const securityJs = read('js/security.js');
  const analyticsJs = read('js/analytics.js');
  assert.ok(securityJs.includes('if (window.top !== window.self)'), 'frame-busting guard present');
  assert.ok(securityJs.includes('window.top.location = window.self.location.href'), 'top-frame redirect present');
  assert.ok(analyticsJs.includes("var measurementId = 'G-CVB8L1B67P';"), 'GA measurement ID present');
  assert.ok(analyticsJs.includes('https://www.googletagmanager.com/gtag/js?id='), 'GA script source present');
});
