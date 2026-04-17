'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const logic = require('../js/site_logic.js');

test('book filter state defaults new books to enabled and preserves existing selections', function () {
  const picks = [
    { best_book: 'DraftKings' },
    { best_book: 'FANDUEL' },
    { best_book: 'draftkings' }
  ];
  const selected = logic.syncBookFilterState(picks, { draftkings: false, oldbook: true });
  assert.deepEqual(selected, {
    draftkings: false,
    fanduel: true
  });
});

test('filtered picks respects enabled books and handles all-disabled state', function () {
  const picks = [
    { player: 'A', best_book: 'draftkings' },
    { player: 'B', best_book: 'fanduel' },
    { player: 'C', best_book: 'caesars' }
  ];

  assert.equal(logic.getFilteredPicks(picks, {}).length, 3);
  assert.equal(logic.getFilteredPicks(picks, { draftkings: true, fanduel: false, caesars: false }).length, 1);
  assert.equal(logic.getFilteredPicks(picks, { draftkings: false, fanduel: false, caesars: false }).length, 0);
});

test('data path routes current season to data/ and others to data/{season}/', function () {
  // When GP is not defined (Node.js tests), current defaults to 'prod'
  assert.equal(logic.getDataPath('prod', 'results.json'), 'data/results.json');
  assert.equal(logic.getDataPath('2025', 'results.json'), 'data/2025/results.json');
  assert.equal(logic.getDataPath('2024', 'picks_index.json'), 'data/2024/picks_index.json');
});

test('buildBacktestIndex sorts dates and computes month boundaries', function () {
  const built = logic.buildBacktestIndex({
    dates: [
      { date: '2025-04-03', count: 12 },
      { date: '2025-03-27', count: 8 },
      { date: '2025-04-02', count: 18 }
    ]
  });

  assert.ok(built);
  assert.equal(built.dates[0].date, '2025-03-27');
  assert.equal(built.selectedBacktestDate, '2025-04-03');
  assert.equal(built.maxCount, 18);
  assert.equal(built.minMonthIdx, logic.getCalendarMonthIndex(2025, 2));
  assert.equal(built.maxMonthIdx, logic.getCalendarMonthIndex(2025, 3));
});

test('shiftCalendarMonth enforces min/max month bounds', function () {
  const built = logic.buildBacktestIndex({
    dates: [
      { date: '2025-03-27', count: 8 },
      { date: '2025-04-03', count: 12 }
    ]
  });

  const startIdx = logic.getCalendarMonthIndex(built.viewYear, built.viewMonth);
  logic.shiftCalendarMonth(built, -1);
  assert.equal(logic.getCalendarMonthIndex(built.viewYear, built.viewMonth), startIdx - 1);

  logic.shiftCalendarMonth(built, -1);
  assert.equal(logic.getCalendarMonthIndex(built.viewYear, built.viewMonth), built.minMonthIdx);
});

test('calendar model marks available dates, selected date, and density alpha', function () {
  const backtestIndex = logic.buildBacktestIndex({
    dates: [
      { date: '2025-04-01', count: 10 },
      { date: '2025-04-02', count: 20 }
    ]
  });
  backtestIndex.viewYear = 2025;
  backtestIndex.viewMonth = 3;

  const model = logic.computeCalendarDays(backtestIndex, '2025-04-02');
  const apr1 = model.days.find(function (d) { return d.dateKey === '2025-04-01'; });
  const apr2 = model.days.find(function (d) { return d.dateKey === '2025-04-02'; });
  const apr3 = model.days.find(function (d) { return d.dateKey === '2025-04-03'; });

  assert.ok(apr1.isAvailable);
  assert.ok(apr2.isAvailable);
  assert.equal(apr2.selected, true);
  assert.equal(apr2.alpha > apr1.alpha, true);
  assert.equal(apr3.isAvailable, false);
});

test('results view model provides fallback state when summary is missing', function () {
  const vm = logic.computeResultsViewModel({});
  assert.equal(vm.available, false);
  assert.equal(vm.generatedAtText, 'Last updated: unavailable');
});

// ============================================
// v1 track record archive logic
// ============================================

test('parseVersionParam returns v1 when URL has ?version=v1', function () {
  assert.equal(logic.parseVersionParam('https://example.com/results.html?version=v1'), 'v1');
  assert.equal(logic.parseVersionParam('https://example.com/results.html?season=2026&version=v1'), 'v1');
});

test('parseVersionParam returns v1.1 (default) when param absent or not v1', function () {
  assert.equal(logic.parseVersionParam('https://example.com/results.html'), 'v1.1');
  assert.equal(logic.parseVersionParam('https://example.com/results.html?season=2025'), 'v1.1');
  assert.equal(logic.parseVersionParam('https://example.com/results.html?version=v1.1'), 'v1.1');
  assert.equal(logic.parseVersionParam('https://example.com/results.html?version=v2'), 'v1.1');
});

test('shouldShowVersionToggle is true only for 2026', function () {
  assert.equal(logic.shouldShowVersionToggle('2026'), true);
  assert.equal(logic.shouldShowVersionToggle('2025'), false);
  assert.equal(logic.shouldShowVersionToggle('2024'), false);
  assert.equal(logic.shouldShowVersionToggle('prod'), false);
});

test('resolveResultsSource dispatches to v1-frozen only for 2026 + v1', function () {
  assert.equal(logic.resolveResultsSource('2026', 'v1'), 'v1-frozen');
  assert.equal(logic.resolveResultsSource('2026', 'v1.1'), 'supabase');
  assert.equal(logic.resolveResultsSource('2025', 'v1'), 'supabase');
  assert.equal(logic.resolveResultsSource('2024', 'v1.1'), 'supabase');
});

test('buildVersionUrl adds ?version=v1 when selecting v1', function () {
  var url = logic.buildVersionUrl('https://example.com/results.html?season=2026', 'v1');
  assert.match(url, /version=v1/);
  assert.match(url, /season=2026/);
});

test('buildVersionUrl removes ?version when selecting v1.1 (default)', function () {
  var url = logic.buildVersionUrl('https://example.com/results.html?season=2026&version=v1', 'v1.1');
  assert.doesNotMatch(url, /version=/);
  assert.match(url, /season=2026/);
});

test('buildV1Subtitle formats the forward-sample window', function () {
  var subtitle = logic.buildV1Subtitle({ start: '2026-03-25', end: '2026-04-06', n_days: 12 });
  assert.match(subtitle, /2026-03-25/);
  assert.match(subtitle, /2026-04-06/);
  assert.match(subtitle, /frozen/i);
});

test('results view model computes display fields and classes', function () {
  const vm = logic.computeResultsViewModel({
    generated_at: '2026-02-13T00:00:00+00:00',
    summary: {
      wins: 10,
      losses: 8,
      pushes: 1,
      win_rate: 55.56,
      total_pnl: -120.4,
      roi: -3.2
    },
    by_market: [
      { market: 'Strikeouts', bets: 5, wins: 3, losses: 2, win_rate: 60.0, pnl: 40, roi: 8.0 }
    ],
    recent: [
      { date: '2025-04-02', player: 'A', market: 'Strikeouts', direction: 'UNDER', line: 5.5, result: 'win', actual: 4, pnl: 50 }
    ],
    cumulative_pnl: [
      { date: '2025-04-01', cumulative: 0 },
      { date: '2025-04-02', cumulative: 50 }
    ]
  });

  assert.equal(vm.available, true);
  assert.equal(vm.record, '10-8-1');
  assert.equal(vm.pnlClass, 'negative');
  assert.equal(vm.roiClass, 'negative');
  assert.equal(vm.markets[0].roiText, '+8.0%');
  assert.ok(vm.chartSummary.includes('From 2025-04-01 to 2025-04-02'));
});

test('buildBacktestIndex in live-season mode clamps bounds to March–October', function () {
  const built = logic.buildBacktestIndex(
    {
      dates: [
        { date: '2026-04-06', count: 3 },
        { date: '2026-04-12', count: 5 }
      ]
    },
    { seasonYear: 2026, isLiveSeason: true }
  );

  assert.ok(built);
  assert.equal(built.isLiveSeason, true);
  assert.equal(built.seasonStart, '2026-03-01');
  assert.equal(built.seasonEnd, '2026-10-31');
  assert.equal(built.minMonthIdx, logic.getCalendarMonthIndex(2026, 2));
  assert.equal(built.maxMonthIdx, logic.getCalendarMonthIndex(2026, 9));
});

test('buildBacktestIndex in archive mode is unchanged (no season window fields)', function () {
  const built = logic.buildBacktestIndex({
    dates: [
      { date: '2025-04-03', count: 12 },
      { date: '2025-03-27', count: 8 }
    ]
  });

  assert.ok(built);
  assert.equal(built.isLiveSeason, undefined);
  assert.equal(built.seasonStart, undefined);
  assert.equal(built.seasonEnd, undefined);
  assert.equal(built.minMonthIdx, logic.getCalendarMonthIndex(2025, 2));
  assert.equal(built.maxMonthIdx, logic.getCalendarMonthIndex(2025, 3));
});

test('buildBacktestIndex live-season preserves data-derived max when beyond October', function () {
  // Defensive: if a future bug caused picks data past October,
  // max should not shrink back to October.
  const built = logic.buildBacktestIndex(
    {
      dates: [
        { date: '2026-04-06', count: 3 },
        { date: '2026-11-05', count: 1 }
      ]
    },
    { seasonYear: 2026, isLiveSeason: true }
  );

  assert.equal(built.maxMonthIdx, logic.getCalendarMonthIndex(2026, 10));
});
