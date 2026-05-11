/* Combined-version track record preview.
 * Stitches v1 (data/results_2026_v1.json) with v1.1 + v2.0 (Supabase
 * bankroll_curve + picks) into a single continuous bankroll, annotated
 * with vertical cutover lines at 2026-04-06 (v1 → v1.1) and 2026-05-07
 * (v1.1 → v2.0). */
(function () {
  'use strict';

  var INITIAL_BANKROLL = 5000;
  var SEASON_INT = 2026;
  var CUTOVERS = [
    { date: '2026-04-06', label: 'v1.1' },
    { date: '2026-05-07', label: 'v2.0' }
  ];

  function setText(id, text, cls) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    if (cls) { el.classList.remove('pos', 'neg'); el.classList.add(cls); }
  }

  function fmtMoney(v) {
    var sign = v < 0 ? '-' : (v > 0 ? '+' : '');
    return sign + '$' + Math.abs(v).toLocaleString(undefined, {
      minimumFractionDigits: 0, maximumFractionDigits: 0
    });
  }

  function fmtPct(v) {
    return (v >= 0 ? '+' : '') + v.toFixed(2) + '%';
  }

  function fmtDate(iso) {
    var d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function showError(msg) {
    var s = document.getElementById('chart-status');
    if (s) { s.className = 'chart-error'; s.textContent = msg; }
  }

  // Merge the v1 frozen curve with the supabase curve into one sorted
  // daily series, summing flat_day_pnl/pct_day_pnl per date and rebuilding
  // a continuous bankroll starting at INITIAL_BANKROLL. Same-date rows
  // (e.g. 2026-04-06 appears in both sources) are merged additively.
  function buildCombinedCurve(v1Rows, supaRows) {
    var byDate = {};
    function add(rows) {
      rows.forEach(function (r) {
        var d = String(r.date).slice(0, 10);
        if (!byDate[d]) byDate[d] = { date: d, flat_day_pnl: 0, pct_day_pnl: 0, n_bets: 0 };
        byDate[d].flat_day_pnl += Number(r.flat_day_pnl || 0);
        byDate[d].pct_day_pnl += Number(r.pct_day_pnl || 0);
        byDate[d].n_bets += Number(r.n_bets || 0);
      });
    }
    add(v1Rows || []);
    add(supaRows || []);
    var dates = Object.keys(byDate).sort();
    var flat = INITIAL_BANKROLL, pct = INITIAL_BANKROLL;
    return dates.map(function (d) {
      var row = byDate[d];
      flat += row.flat_day_pnl;
      pct += row.pct_day_pnl;
      return {
        date: d,
        flat: Math.round(flat * 100) / 100,
        pct: Math.round(pct * 100) / 100,
        n_bets: row.n_bets
      };
    });
  }

  // Aggregate summary across both data sources.
  function buildSummary(v1Summary, supaPicks) {
    var n = (v1Summary && v1Summary.total_bets) || 0;
    var wins = (v1Summary && v1Summary.wins) || 0;
    var losses = (v1Summary && v1Summary.losses) || 0;
    // v1 publishes flat-$100 ROI directly; reconstruct $ wagered + pnl.
    var wagered = (v1Summary && v1Summary.total_wagered) || (n * 100);
    var pnl = wagered * ((v1Summary && v1Summary.bet_roi) || 0) / 100;

    (supaPicks || []).forEach(function (p) {
      if (p.result !== 'win' && p.result !== 'loss') return;
      n += 1;
      if (p.result === 'win') wins += 1; else losses += 1;
      wagered += 100;
      // pnl column in supabase is per the row's actual bet_amount; scale
      // to $100-flat equivalent so the sums are consistent with v1.
      var ba = Number(p.bet_amount) || 0;
      if (ba > 0 && typeof p.pnl === 'number') {
        pnl += p.pnl * (100 / ba);
      } else if (typeof p.pnl === 'number') {
        pnl += p.pnl;
      }
    });

    var wr = n > 0 ? (wins / n * 100) : 0;
    var roi = wagered > 0 ? (pnl / wagered * 100) : 0;
    return { n: n, wins: wins, losses: losses, wagered: wagered, pnl: pnl, wr: wr, roi: roi };
  }

  function renderSummary(s) {
    setText('stat-picks', s.n.toLocaleString());
    setText('stat-record', s.wins + '-' + s.losses);
    setText('stat-wr', s.wr.toFixed(1) + '%');
    setText('stat-pnl', fmtMoney(s.pnl), s.pnl >= 0 ? 'pos' : 'neg');
    setText('stat-roi', fmtPct(s.roi), s.roi >= 0 ? 'pos' : 'neg');
  }

  function cutoverIndices(curve) {
    return CUTOVERS.map(function (c) {
      for (var i = 0; i < curve.length; i++) {
        if (curve[i].date >= c.date) return { idx: i, label: c.label, date: c.date };
      }
      return { idx: -1, label: c.label, date: c.date };
    }).filter(function (x) { return x.idx > 0 && x.idx < (arguments.length ? arguments[0].length : Infinity); });
  }

  function renderChart(curve) {
    var canvas = document.getElementById('preview-chart');
    var statusEl = document.getElementById('chart-status');
    if (!canvas || typeof Chart === 'undefined') {
      showError('Chart library failed to load.');
      return;
    }
    if (statusEl) statusEl.style.display = 'none';
    canvas.style.display = '';

    var labels = curve.map(function (d) { return fmtDate(d.date); });
    var flatVals = curve.map(function (d) { return d.flat; });
    var pctVals = curve.map(function (d) { return d.pct; });
    var baseline = curve.map(function () { return INITIAL_BANKROLL; });

    // Find cutover label x-positions
    var cutMarkers = CUTOVERS.map(function (c) {
      for (var i = 0; i < curve.length; i++) {
        if (curve[i].date >= c.date) return { idx: i, label: c.label, date: c.date };
      }
      return null;
    }).filter(function (m) { return m && m.idx > 0 && m.idx < curve.length; });

    var cutoverLinePlugin = {
      id: 'previewCutoverLines',
      afterDatasetsDraw: function (chart) {
        if (!cutMarkers.length) return;
        var meta = chart.getDatasetMeta(0);
        if (!meta || !meta.data) return;
        var area = chart.chartArea;
        var ctx = chart.ctx;
        cutMarkers.forEach(function (m) {
          var pt = meta.data[m.idx];
          if (!pt) return;
          ctx.save();
          ctx.strokeStyle = 'rgba(168, 85, 247, 0.85)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([6, 4]);
          ctx.beginPath();
          ctx.moveTo(pt.x, area.top);
          ctx.lineTo(pt.x, area.bottom);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = 'rgba(168, 85, 247, 0.95)';
          ctx.font = "600 11px 'DM Sans', system-ui, sans-serif";
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          var labelText = m.label + ' cutover';
          var labelX = pt.x + 6;
          if (labelX + ctx.measureText(labelText).width > area.right - 4) {
            labelX = pt.x - 6 - ctx.measureText(labelText).width;
          }
          ctx.fillText(labelText, labelX, area.top + 4);
          ctx.restore();
        });
      }
    };

    var allVals = flatVals.concat(pctVals, [INITIAL_BANKROLL]);
    var dataMin = Math.min.apply(null, allVals);
    var dataMax = Math.max.apply(null, allVals);
    var range = dataMax - dataMin;
    var pad = Math.max(range * 0.25, 100);
    var yMin = Math.floor((dataMin - pad) / 100) * 100;
    var yMax = Math.ceil((dataMax + pad) / 100) * 100;

    new Chart(canvas, {
      type: 'line',
      plugins: [cutoverLinePlugin],
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Flat $100',
            data: flatVals,
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37, 99, 235, 0.08)',
            fill: true,
            tension: 0.3,
            pointRadius: 0,
            pointHitRadius: 8,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: '#2563eb',
            pointHoverBorderColor: '#ffffff',
            pointHoverBorderWidth: 2,
            borderWidth: 2.5
          },
          {
            label: '2% of Bankroll',
            data: pctVals,
            borderColor: '#f97316',
            backgroundColor: 'rgba(249, 115, 22, 0.06)',
            fill: true,
            tension: 0.3,
            pointRadius: 0,
            pointHitRadius: 8,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: '#f97316',
            pointHoverBorderColor: '#ffffff',
            pointHoverBorderWidth: 2,
            borderWidth: 2.5
          },
          {
            label: 'Starting Bankroll',
            data: baseline,
            borderColor: 'rgba(148, 163, 184, 0.6)',
            backgroundColor: 'transparent',
            fill: false,
            tension: 0,
            pointRadius: 0,
            pointHitRadius: 0,
            borderWidth: 1.5,
            borderDash: [6, 4]
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: true,
            labels: {
              font: { family: "'DM Sans'", size: 12, weight: '600' },
              usePointStyle: true, pointStyle: 'line', boxWidth: 20, padding: 16,
              filter: function (item) { return item.text !== 'Starting Bankroll'; }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(15, 25, 35, 0.95)',
            borderColor: 'rgba(37, 99, 235, 0.3)',
            borderWidth: 1,
            cornerRadius: 10,
            padding: 12,
            titleColor: '#f5f8ff',
            bodyColor: '#e1e8f5',
            titleFont: { family: "'DM Sans'", size: 12, weight: '700' },
            bodyFont: { family: "'JetBrains Mono'", size: 11, weight: '600' },
            filter: function (item) { return item.dataset.label !== 'Starting Bankroll'; },
            callbacks: {
              title: function (items) {
                if (!items || !items.length) return '';
                var idx = items[0].dataIndex;
                var row = curve[idx];
                if (!row) return items[0].label;
                return new Date(row.date + 'T12:00:00').toLocaleDateString('en-US', {
                  weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
                });
              },
              label: function (ctx) {
                var v = ctx.parsed && typeof ctx.parsed.y === 'number' ? ctx.parsed.y : 0;
                return ' ' + ctx.dataset.label + ': $' + v.toLocaleString(undefined, {
                  minimumFractionDigits: 0, maximumFractionDigits: 0
                });
              }
            }
          }
        },
        scales: {
          x: {
            ticks: {
              font: { family: "'DM Sans'", size: 11 },
              maxTicksLimit: window.innerWidth < 640 ? 5 : 10,
              autoSkip: true
            },
            grid: { display: false }
          },
          y: {
            min: yMin,
            max: yMax,
            ticks: {
              font: { family: "'JetBrains Mono'", size: 11 },
              callback: function (val) {
                if (Math.abs(val) >= 10000) return '$' + (val / 1000).toFixed(1) + 'K';
                return '$' + val.toLocaleString();
              }
            },
            grid: { color: 'rgba(148, 163, 184, 0.15)' }
          }
        }
      }
    });
  }

  function init() {
    if (!window.GP || !GP.supabase) {
      showError('Supabase client not initialized.');
      return;
    }

    Promise.all([
      fetch('data/results_2026_v1.json').then(function (r) {
        if (!r.ok) throw new Error('v1 JSON HTTP ' + r.status);
        return r.json();
      }),
      GP.supabase.from('bankroll_curve').select('*').eq('season', SEASON_INT).order('date'),
      GP.supabase.from('picks').select('date,result,pnl,bet_amount').eq('season', SEASON_INT)
    ]).then(function (res) {
      var v1 = res[0];
      var bcRes = res[1];
      var picksRes = res[2];

      if (bcRes.error) { showError('Supabase bankroll_curve error: ' + bcRes.error.message); return; }
      if (picksRes.error) { showError('Supabase picks error: ' + picksRes.error.message); return; }

      var curve = buildCombinedCurve(v1.bankroll_curve, bcRes.data || []);
      var summary = buildSummary(v1.summary, picksRes.data || []);

      renderSummary(summary);
      renderChart(curve);
    }).catch(function (err) {
      console.error('Preview load error:', err);
      showError('Failed to load data: ' + err.message);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
