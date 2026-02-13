'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'data');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function isFiniteNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

function assertPickShape(pick, ctx) {
  assert.equal(typeof pick.player, 'string', ctx + ': player');
  assert.ok(pick.player.length > 0, ctx + ': player non-empty');
  assert.equal(typeof pick.market, 'string', ctx + ': market');
  assert.ok(['OVER', 'UNDER'].includes(pick.direction), ctx + ': direction');
  assert.ok(isFiniteNumber(pick.line), ctx + ': line');
  assert.ok(Number.isInteger(pick.stars), ctx + ': stars integer');
  assert.ok(pick.stars >= 1 && pick.stars <= 3, ctx + ': stars range');
}

test('picks_today.json contract', function () {
  const data = readJson(path.join(DATA, 'picks_today.json'));
  assert.equal(typeof data.generated_at, 'string');
  assert.equal(typeof data.date, 'string');
  assert.ok(Array.isArray(data.picks));
  data.picks.forEach(function (pick, idx) {
    assertPickShape(pick, 'picks_today[' + idx + ']');
  });
});

test('results.json contract', function () {
  const data = readJson(path.join(DATA, 'results.json'));
  assert.equal(typeof data.generated_at, 'string');
  assert.ok(data.summary && typeof data.summary === 'object');
  assert.ok(isFiniteNumber(data.summary.total_bets));
  assert.ok(isFiniteNumber(data.summary.wins));
  assert.ok(isFiniteNumber(data.summary.losses));
  assert.ok(isFiniteNumber(data.summary.win_rate));
  assert.ok(isFiniteNumber(data.summary.total_pnl));
  assert.ok(isFiniteNumber(data.summary.roi));

  assert.ok(Array.isArray(data.by_market));
  data.by_market.forEach(function (row, idx) {
    assert.equal(typeof row.market, 'string', 'by_market[' + idx + '].market');
    assert.ok(isFiniteNumber(row.bets), 'by_market[' + idx + '].bets');
    assert.ok(isFiniteNumber(row.wins), 'by_market[' + idx + '].wins');
    assert.ok(isFiniteNumber(row.losses), 'by_market[' + idx + '].losses');
    assert.ok(isFiniteNumber(row.win_rate), 'by_market[' + idx + '].win_rate');
    assert.ok(isFiniteNumber(row.pnl), 'by_market[' + idx + '].pnl');
    assert.ok(isFiniteNumber(row.roi), 'by_market[' + idx + '].roi');
  });

  assert.ok(Array.isArray(data.recent));
  data.recent.forEach(function (row, idx) {
    assert.equal(typeof row.date, 'string', 'recent[' + idx + '].date');
    assert.equal(typeof row.player, 'string', 'recent[' + idx + '].player');
    assert.equal(typeof row.market, 'string', 'recent[' + idx + '].market');
    assert.ok(['OVER', 'UNDER'].includes(row.direction), 'recent[' + idx + '].direction');
    assert.ok(isFiniteNumber(row.line), 'recent[' + idx + '].line');
    assert.ok(['win', 'loss', 'push'].includes(String(row.result).toLowerCase()), 'recent[' + idx + '].result');
    assert.ok(isFiniteNumber(row.pnl), 'recent[' + idx + '].pnl');
  });
});

test('backtest picks_index.json contract', function () {
  const idx = readJson(path.join(DATA, 'backtest/picks_index.json'));
  assert.ok(Array.isArray(idx.dates));
  assert.ok(idx.dates.length > 0);

  let prevDate = '';
  const seen = new Set();
  idx.dates.forEach(function (entry, i) {
    assert.equal(typeof entry.date, 'string', 'dates[' + i + '].date');
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(entry.date), 'dates[' + i + '] date format');
    assert.ok(isFiniteNumber(entry.count), 'dates[' + i + '].count');
    assert.ok(entry.count >= 0, 'dates[' + i + '].count non-negative');
    assert.ok(entry.date >= prevDate, 'dates sorted asc');
    assert.ok(!seen.has(entry.date), 'dates unique');
    prevDate = entry.date;
    seen.add(entry.date);
  });
});

test('all backtest picks files match index and pick schema', function () {
  const index = readJson(path.join(DATA, 'backtest/picks_index.json'));
  const byDate = new Map(index.dates.map(function (d) { return [d.date, d.count]; }));
  const picksDir = path.join(DATA, 'backtest/picks');
  const files = fs.readdirSync(picksDir).filter(function (f) { return f.endsWith('.json'); }).sort();
  assert.ok(files.length > 0);

  files.forEach(function (file) {
    const date = file.replace('.json', '');
    const data = readJson(path.join(picksDir, file));
    assert.equal(data.date, date, file + ': date matches filename');
    assert.equal(typeof data.generated_at, 'string', file + ': generated_at');
    assert.ok(Array.isArray(data.picks), file + ': picks array');
    assert.equal(data.picks.length, byDate.get(date), file + ': count matches index');
    data.picks.forEach(function (pick, i) {
      assertPickShape(pick, file + ' picks[' + i + ']');
    });
  });
});
