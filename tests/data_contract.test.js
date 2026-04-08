'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

// Supabase REST API via built-in fetch (Node 18+)
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ajjruzolkbzardssopos.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_aAFvyqUjJFYQsuG8GY2KTA_U4SLd545';

function supabaseGet(path) {
  return fetch(SUPABASE_URL + '/rest/v1/' + path, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
    },
  }).then(function (res) {
    assert.ok(res.ok, 'HTTP ' + res.status + ' for ' + path);
    return res.json();
  });
}

function isFiniteNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

test('picks table has data with correct shape', async function () {
  var data = await supabaseGet('picks?season=eq.2025&limit=5');
  assert.ok(Array.isArray(data));
  assert.ok(data.length > 0, 'picks should have rows');

  var pick = data[0];
  assert.equal(typeof pick.player, 'string');
  assert.ok(pick.player.length > 0, 'player non-empty');
  assert.equal(typeof pick.market, 'string');
  assert.ok(['OVER', 'UNDER'].includes(pick.direction), 'direction valid');
  assert.ok(isFiniteNumber(pick.line), 'line is number');
  assert.ok(Number.isInteger(pick.stars), 'stars integer');
  assert.ok(pick.stars >= 1 && pick.stars <= 3, 'stars in 1-3');
});

test('picks_index RPC returns date counts', async function () {
  var data = await fetch(SUPABASE_URL + '/rest/v1/rpc/picks_index', {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_season: 2025 }),
  }).then(function (res) {
    assert.ok(res.ok, 'RPC picks_index HTTP ' + res.status);
    return res.json();
  });

  assert.ok(Array.isArray(data));
  assert.ok(data.length > 0, 'should have dates');

  var entry = data[0];
  assert.equal(typeof entry.date, 'string');
  assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(entry.date), 'date format');
  assert.ok(isFiniteNumber(entry.count), 'count is number');
});

test('market_stats view returns data', async function () {
  var data = await supabaseGet('market_stats?season=eq.2025');
  assert.ok(Array.isArray(data));
  assert.ok(data.length > 0);

  var row = data[0];
  assert.equal(typeof row.market, 'string');
  assert.ok(isFiniteNumber(row.bets), 'bets');
  assert.ok(isFiniteNumber(row.wins), 'wins');
  assert.ok(isFiniteNumber(row.losses), 'losses');
});

test('direction_stats view returns data', async function () {
  var data = await supabaseGet('direction_stats?season=eq.2025');
  assert.ok(Array.isArray(data));
  assert.ok(data.length > 0);

  data.forEach(function (row) {
    assert.ok(['OVER', 'UNDER'].includes(row.direction));
    assert.ok(isFiniteNumber(row.bets));
  });
});

test('season_summaries has summary JSONB', async function () {
  var data = await supabaseGet('season_summaries?season=eq.2025');
  assert.ok(Array.isArray(data));
  assert.equal(data.length, 1);

  var summary = data[0].summary;
  assert.ok(summary && typeof summary === 'object');
  assert.ok(isFiniteNumber(summary.total_bets), 'total_bets');
  assert.ok(isFiniteNumber(summary.win_rate), 'win_rate');
});

test('bankroll_curve has rows', async function () {
  var data = await supabaseGet('bankroll_curve?season=eq.2025&limit=5&order=date');
  assert.ok(Array.isArray(data));
  assert.ok(data.length > 0);

  var row = data[0];
  assert.equal(typeof row.date, 'string');
  assert.ok(isFiniteNumber(row.flat), 'flat');
  assert.ok(isFiniteNumber(row.pct), 'pct');
});

test('clv_summary view returns data', async function () {
  var data = await supabaseGet('clv_summary?season=eq.2025');
  assert.ok(Array.isArray(data));
  assert.ok(data.length > 0);

  var row = data[0];
  assert.equal(typeof row.market, 'string');
});

test('RLS enforces read-only (anon cannot insert)', async function () {
  var res = await fetch(SUPABASE_URL + '/rest/v1/picks', {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({
      season: 9999,
      date: '9999-01-01',
      player: 'Test',
      market: 'test',
      category: 'test',
      direction: 'OVER',
      line: 0,
    }),
  });
  // Should be rejected (403 or 401)
  assert.ok(!res.ok || res.status >= 400, 'anon insert should be rejected, got ' + res.status);
});

test('RLS enforces read-only (anon cannot update)', async function () {
  // With RLS select-only policy, PostgREST returns 200 with empty array (0 rows affected)
  var res = await fetch(SUPABASE_URL + '/rest/v1/picks?season=eq.2025&limit=1', {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({ player: 'Hacked' }),
  });
  if (res.status >= 400) {
    // Explicitly rejected — pass
    assert.ok(true);
  } else {
    // PostgREST may return 200 with empty array (RLS silently blocks)
    var body = await res.json();
    assert.ok(Array.isArray(body) && body.length === 0,
      'anon update should affect 0 rows, got ' + JSON.stringify(body).slice(0, 100));
  }
  // Verify no data was corrupted
  var check = await supabaseGet('picks?player=eq.Hacked');
  assert.equal(check.length, 0, 'no rows should have player=Hacked');
});

test('RLS enforces read-only (anon cannot delete)', async function () {
  // With RLS select-only policy, PostgREST returns 200 with empty array (0 rows affected)
  var res = await fetch(SUPABASE_URL + '/rest/v1/picks?season=eq.2025&limit=1', {
    method: 'DELETE',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
      'Prefer': 'return=representation',
    },
  });
  if (res.status >= 400) {
    // Explicitly rejected — pass
    assert.ok(true);
  } else {
    // PostgREST may return 200 with empty array (RLS silently blocks)
    var body = await res.json();
    assert.ok(Array.isArray(body) && body.length === 0,
      'anon delete should affect 0 rows, got ' + JSON.stringify(body).slice(0, 100));
  }
  // Verify data still exists
  var check = await supabaseGet('picks?season=eq.2025&limit=1');
  assert.ok(check.length > 0, 'picks should still have data after failed delete');
});

test('RLS enforces read-only on bankroll_curve', async function () {
  var res = await fetch(SUPABASE_URL + '/rest/v1/bankroll_curve', {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ season: 9999, date: '9999-01-01', flat: 0, pct: 0 }),
  });
  assert.ok(!res.ok || res.status >= 400, 'anon insert on bankroll_curve should be rejected, got ' + res.status);
});

test('RLS enforces read-only on season_summaries', async function () {
  var res = await fetch(SUPABASE_URL + '/rest/v1/season_summaries', {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ season: 9999, summary: {} }),
  });
  assert.ok(!res.ok || res.status >= 400, 'anon insert on season_summaries should be rejected, got ' + res.status);
});

// ============================================
// v1 frozen JSON archive contract
// ============================================

const fs = require('node:fs');
const path = require('node:path');

test('results_2026_v1.json has the expected v1 archive shape', function () {
  var jsonPath = path.join(__dirname, '..', 'data', 'results_2026_v1.json');
  assert.ok(fs.existsSync(jsonPath), 'results_2026_v1.json must be committed to the repo');

  var raw = fs.readFileSync(jsonPath, 'utf8');
  var data = JSON.parse(raw);

  // Top-level metadata
  assert.equal(data.model_version, 'v1');
  assert.equal(data.cutover_date, '2026-04-06');
  assert.ok(data.label && data.label.indexOf('v1') !== -1);
  assert.ok(data.forward_sample_window);
  assert.equal(data.forward_sample_window.start, '2026-03-25');
  assert.equal(data.forward_sample_window.end, '2026-04-06');

  // Data sections — keys must match export_results() shape
  assert.ok(data.summary, 'summary must be present');
  assert.equal(typeof data.summary.total_bets, 'number');
  assert.ok(data.summary.total_bets > 100, 'should have >100 bets');
  assert.ok(data.summary.total_bets < 200, 'should have <200 bets');
  assert.ok(data.summary.flat, 'summary.flat must be present');
  assert.ok(data.summary.pct, 'summary.pct must be present');

  assert.ok(Array.isArray(data.bankroll_curve));
  assert.ok(data.bankroll_curve.length > 0, 'bankroll_curve must have entries');

  assert.ok(Array.isArray(data.by_market));
  assert.ok(data.by_market.length > 0, 'by_market must have at least one market');

  assert.ok(Array.isArray(data.direction_stats));
  assert.ok(data.direction_stats.length > 0, 'direction_stats must have entries');

  assert.ok(Array.isArray(data.recent));
  assert.ok(data.recent.length > 0, 'recent must have entries');

  // Scoped-out keys must be absent (not returning them is the design)
  assert.equal(data.star_tier_stats, undefined);
  assert.equal(data.player_attention, undefined);
  assert.equal(data.clv_summary, undefined);
  assert.equal(data.clv_by_date, undefined);
});
