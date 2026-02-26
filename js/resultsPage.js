/* ============================================
   Glick's Picks — Results Page
   ============================================ */
(function () {
  'use strict';

  var GP = window.GP;

  var el = GP.el;
  var clearChildren = GP.clearChildren;
  var formatDate = GP.formatDate;
  var formatPnl = GP.formatPnl;
  var formatTimestamp = GP.formatTimestamp;
  var setStatusText = GP.setStatusText;

  // ============================================
  // Direction stats table
  // ============================================

  function renderDirectionStats(data) {
    var container = document.getElementById('direction-stats');
    if (!container || !data || !Array.isArray(data.direction_stats)) return;
    clearChildren(container);
    var stats = data.direction_stats;
    if (stats.length === 0) return;

    container.appendChild(el('h3', 'results-section-heading', 'By Direction'));

    var scrollWrap = el('div', 'results-table-scroll');
    var table = document.createElement('table');
    table.className = 'results-table';
    var caption = document.createElement('caption');
    caption.textContent = 'Performance breakdown by bet direction';
    table.appendChild(caption);
    var thead = document.createElement('thead');
    var headRow = document.createElement('tr');
    ['Direction', 'Bets', 'Win Rate', 'ROI'].forEach(function (h) {
      var th = el('th', '', h);
      th.setAttribute('scope', 'col');
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    var tbody = document.createElement('tbody');
    stats.forEach(function (d) {
      var tr = document.createElement('tr');
      tr.appendChild(el('td', '', String(d.direction || '')));
      tr.appendChild(el('td', '', String(d.bets || 0)));
      tr.appendChild(el('td', '', (d.win_rate != null ? d.win_rate.toFixed(1) : '0.0') + '%'));
      var dRoi = d.roi != null ? d.roi : 0;
      tr.appendChild(el('td', dRoi >= 0 ? 'pnl-positive' : 'pnl-negative',
        (dRoi >= 0 ? '+' : '') + dRoi.toFixed(1) + '%'));
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    scrollWrap.appendChild(table);
    container.appendChild(scrollWrap);
  }

  // ============================================
  // Streaks
  // ============================================

  function computeDailyStreaks(cumulativePnl) {
    if (!cumulativePnl || cumulativePnl.length === 0) return null;

    var currentRun = 0;
    var currentType = null;
    for (var i = cumulativePnl.length - 1; i >= 0; i--) {
      var dayPnl = cumulativePnl[i].pnl;
      if (dayPnl === 0) continue;
      var dayType = dayPnl > 0 ? 'W' : 'L';
      if (currentType === null) {
        currentType = dayType;
        currentRun = 1;
      } else if (dayType === currentType) {
        currentRun++;
      } else {
        break;
      }
    }

    var bestWin = 0;
    var winRun = 0;
    var bestLoss = 0;
    var lossRun = 0;
    for (var j = 0; j < cumulativePnl.length; j++) {
      var p = cumulativePnl[j].pnl;
      if (p > 0) {
        winRun++;
        lossRun = 0;
        if (winRun > bestWin) bestWin = winRun;
      } else if (p < 0) {
        lossRun++;
        winRun = 0;
        if (lossRun > bestLoss) bestLoss = lossRun;
      }
    }

    return {
      current: currentRun,
      currentType: currentType,
      bestWin: bestWin,
      bestLoss: bestLoss
    };
  }

  function renderDrawdownStreak(data) {
    var streakEl = document.getElementById('stat-streaks');
    if (!streakEl) return;

    var curve = data.bankroll_curve || [];
    var streaks = computeDailyStreaks(curve.map(function (d) {
      return { pnl: d.flat_day_pnl || 0 };
    }));
    if (!streaks) return;

    if (streaks.bestWin > 0 || streaks.bestLoss > 0) {
      streakEl.style.display = '';
      clearChildren(streakEl);
      streakEl.appendChild(el('span', 'summary-meta-label', 'Longest Streak'));
      streakEl.appendChild(document.createTextNode(' '));
      if (streaks.bestWin > 0) {
        streakEl.appendChild(el('strong', 'positive', streaks.bestWin + 'W'));
      }
      if (streaks.bestWin > 0 && streaks.bestLoss > 0) {
        streakEl.appendChild(document.createTextNode(' / '));
      }
      if (streaks.bestLoss > 0) {
        streakEl.appendChild(el('strong', 'negative', streaks.bestLoss + 'L'));
      }
    }
  }

  // ============================================
  // Recent picks table
  // ============================================

  function renderRecentPicks(data) {
    var recentBody = document.querySelector('#recent-table tbody');
    if (!recentBody || !data.recent) return;
    clearChildren(recentBody);

    var recent = data.recent;
    var INITIAL_LIMIT = 50;
    var hasMore = recent.length > INITIAL_LIMIT;
    if (hasMore) recent = recent.slice(0, INITIAL_LIMIT);
    var showAll = !hasMore;

    function renderRows(items) {
      clearChildren(recentBody);
      items.forEach(function (r) {
        var tr = document.createElement('tr');
        tr.appendChild(el('td', '', formatDate(r.date)));
        tr.appendChild(el('td', '', r.player));
        tr.appendChild(el('td', '', r.direction + ' ' + r.line + ' ' + r.market));

        var tdResult = document.createElement('td');
        var badge = el('span', 'result-badge ' + String(r.result).toLowerCase(), String(r.result).toUpperCase());
        tdResult.appendChild(badge);
        if (r.actual !== null) {
          tdResult.appendChild(document.createTextNode(' (' + r.actual + ')'));
        }
        tr.appendChild(tdResult);

        tr.appendChild(el('td', r.pnl > 0 ? 'pnl-positive' : (r.pnl < 0 ? 'pnl-negative' : ''), formatPnl(r.pnl)));
        recentBody.appendChild(tr);
      });
    }

    renderRows(showAll ? recent : recent.slice(0, INITIAL_LIMIT));

    if (!showAll) {
      var toggleRow = document.createElement('tr');
      var toggleTd = document.createElement('td');
      toggleTd.colSpan = 5;
      toggleTd.style.textAlign = 'center';
      var toggleBtn = el('button', 'show-all-btn', 'Show all picks');
      toggleBtn.type = 'button';
      toggleBtn.addEventListener('click', function () {
        toggleBtn.textContent = 'Loading\u2026';
        toggleBtn.disabled = true;
        GP.supabase.from('picks')
          .select('date,player,market,direction,line,actual,result,pnl,stars,clv_cents,clv_favorable')
          .eq('season', GP.getSeasonInt()).not('result', 'is', null)
          .order('date', { ascending: false })
          .then(function (res) { renderRows(res.data || []); });
      });
      toggleTd.appendChild(toggleBtn);
      toggleRow.appendChild(toggleTd);
      recentBody.appendChild(toggleRow);
    }
  }

  // ============================================
  // Bankroll equity chart
  // ============================================

  function initBankrollChart(canvas, curveData, initialBankroll) {
    var labels = curveData.map(function (d) { return formatDate(d.date); });
    var flatValues = curveData.map(function (d) { return d.flat; });
    var pctValues = curveData.map(function (d) { return d.pct; });
    var baselineValues = curveData.map(function () { return initialBankroll; });

    var responsiveTicksLimit = window.innerWidth < 640 ? 5 : 10;

    function formatDollar(val) {
      if (Math.abs(val) >= 1000) return '$' + Math.round(val / 1000) + 'K';
      return '$' + val;
    }

    var isNarrow = window.innerWidth < 640;

    var chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Flat $100',
            data: flatValues,
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37, 99, 235, 0.08)',
            fill: true,
            tension: 0.3,
            pointRadius: 0,
            pointHitRadius: 8,
            pointHoverBackgroundColor: '#2563eb',
            pointHoverBorderColor: '#ffffff',
            pointHoverRadius: 5,
            pointHoverBorderWidth: 2,
            borderWidth: 2.5
          },
          {
            label: '2% of Bankroll',
            data: pctValues,
            borderColor: '#f97316',
            backgroundColor: 'rgba(249, 115, 22, 0.06)',
            fill: true,
            tension: 0.3,
            pointRadius: 0,
            pointHitRadius: 8,
            pointHoverBackgroundColor: '#f97316',
            pointHoverBorderColor: '#ffffff',
            pointHoverRadius: 5,
            pointHoverBorderWidth: 2,
            borderWidth: 2.5
          },
          {
            label: 'Starting Bankroll',
            data: baselineValues,
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
        layout: {
          padding: { left: isNarrow ? 0 : 8, right: isNarrow ? 0 : 8 }
        },
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            display: true,
            labels: {
              font: { family: "'DM Sans'", size: 12, weight: '600' },
              usePointStyle: true,
              pointStyle: 'line',
              boxWidth: 20,
              padding: 16,
              filter: function (item) {
                return item.text !== 'Starting Bankroll';
              }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(15, 25, 35, 0.95)',
            borderColor: 'rgba(37, 99, 235, 0.3)',
            borderWidth: 1,
            cornerRadius: 10,
            caretSize: 7,
            caretPadding: 8,
            padding: 12,
            displayColors: true,
            usePointStyle: true,
            boxPadding: 4,
            titleColor: '#f5f8ff',
            bodyColor: '#e1e8f5',
            footerColor: '#94a3b8',
            titleFont: { family: "'DM Sans'", size: 12, weight: '700' },
            bodyFont: { family: "'JetBrains Mono'", size: 11, weight: '600' },
            footerFont: { family: "'DM Sans'", size: 10, weight: '600' },
            titleMarginBottom: 8,
            bodySpacing: 6,
            footerMarginTop: 6,
            filter: function (item) {
              return item.dataset.label !== 'Starting Bankroll';
            },
            callbacks: {
              title: function (items) {
                if (!items || items.length === 0) return '';
                var idx = items[0].dataIndex;
                var row = curveData[idx];
                if (!row || !row.date) return items[0].label;
                return new Date(row.date + 'T12:00:00').toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                });
              },
              label: function (ctx) {
                var val = ctx.parsed && typeof ctx.parsed.y === 'number' ? ctx.parsed.y : 0;
                return ' ' + ctx.dataset.label + ': $' + val.toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                });
              },
              labelTextColor: function (ctx) {
                if (ctx.dataset.label === 'Flat $100') return '#93c5fd';
                return '#fdba74';
              },
              footer: function (items) {
                if (!items || items.length === 0) return '';
                var idx = items[0].dataIndex;
                var row = curveData[idx];
                if (!row) return '';
                var lines = [];
                lines.push(row.n_bets + ' bet' + (row.n_bets !== 1 ? 's' : '') + ' today');
                if (row.flat_day_pnl !== undefined) {
                  var fSign = row.flat_day_pnl >= 0 ? '+' : '';
                  lines.push('Flat day: ' + fSign + '$' + Math.abs(row.flat_day_pnl).toFixed(0));
                }
                if (row.pct_day_pnl !== undefined) {
                  var pSign = row.pct_day_pnl >= 0 ? '+' : '';
                  lines.push('2% day: ' + pSign + '$' + Math.abs(row.pct_day_pnl).toFixed(0));
                }
                return lines;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: {
              font: { family: "'DM Sans'", size: 11 },
              color: '#94a3b8',
              maxTicksLimit: responsiveTicksLimit
            }
          },
          y: {
            type: 'linear',
            position: 'left',
            border: { display: false },
            grid: { color: 'rgba(226, 232, 240, 0.6)' },
            ticks: {
              font: { family: "'JetBrains Mono'", size: isNarrow ? 9 : 11 },
              color: '#94a3b8',
              maxTicksLimit: isNarrow ? 6 : 8,
              callback: function (val) { return formatDollar(val); }
            }
          }
        }
      }
    });

    window.addEventListener('resize', function () {
      var newLimit = window.innerWidth < 640 ? 5 : 10;
      if (chart.options.scales.x.ticks.maxTicksLimit !== newLimit) {
        chart.options.scales.x.ticks.maxTicksLimit = newLimit;
        chart.update('none');
      }
    });
  }

  // ============================================
  // Page init
  // ============================================

  GP.initResultsPage = function () {
    var statsEl = document.getElementById('results-stats');
    if (!statsEl) return;

    var subtitleEl = document.getElementById('results-subtitle');
    var season = GP.getSeason();
    if (subtitleEl) {
      if (GP.isArchiveSeason()) {
        subtitleEl.textContent = 'Out-of-sample ' + season + ' backtest archive across player-prop markets';
      } else {
        subtitleEl.textContent = 'Cumulative performance across player-prop markets';
      }
    }

    var seasonInt = GP.getSeasonInt();
    Promise.all([
      GP.supabase.from('season_summaries').select('*').eq('season', seasonInt).maybeSingle(),
      GP.supabase.from('market_stats').select('*').eq('season', seasonInt),
      GP.supabase.from('direction_stats').select('*').eq('season', seasonInt),
      GP.supabase.from('star_tier_stats').select('*').eq('season', seasonInt),
      GP.supabase.from('bankroll_curve').select('*').eq('season', seasonInt).order('date'),
      GP.supabase.from('clv_daily').select('*').eq('season', seasonInt).order('date'),
      GP.supabase.from('clv_summary').select('*').eq('season', seasonInt),
      GP.supabase.from('picks').select('date,player,market,direction,line,actual,result,pnl,stars,clv_cents,clv_favorable')
        .eq('season', seasonInt).not('result', 'is', null)
        .order('date', { ascending: false }).limit(51),
    ]).then(function (results) {
      var summaryRes = results[0];
      var marketRes = results[1];
      var directionRes = results[2];
      var starRes = results[3];
      var curveRes = results[4];
      var clvDailyRes = results[5];
      var clvSummaryRes = results[6];
      var recentRes = results[7];

      // Check for Supabase API-level errors
      var queryNames = ['season_summaries', 'market_stats', 'direction_stats', 'star_tier_stats',
                        'bankroll_curve', 'clv_daily', 'clv_summary', 'picks'];
      var queryErrors = [];
      [summaryRes, marketRes, directionRes, starRes, curveRes, clvDailyRes, clvSummaryRes, recentRes]
        .forEach(function (res, i) {
          if (res.error) {
            console.error('Supabase error for ' + queryNames[i] + ':', res.error);
            queryErrors.push(queryNames[i]);
          }
        });

      var data = {
        generated_at: summaryRes.data ? summaryRes.data.updated_at : null,
        summary: summaryRes.data ? summaryRes.data.summary : null,
        player_attention: summaryRes.data ? summaryRes.data.player_attention : null,
        by_market: marketRes.data || [],
        direction_stats: directionRes.data || [],
        star_tier_stats: starRes.data || [],
        recent: recentRes.data || [],
        bankroll_curve: curveRes.data || [],
        clv_summary: clvSummaryRes.data ? { by_market: clvSummaryRes.data } : null,
        clv_by_date: clvDailyRes.data || [],
      };

      var emptyEl = document.getElementById('results-empty');
      var contentEl = document.getElementById('results-content');

      if (!data.summary || data.summary.total_bets === 0) {
        if (emptyEl) {
          emptyEl.style.display = '';
          var emptyTitle = document.getElementById('results-empty-title');
          var emptyCopy = document.getElementById('results-empty-copy');
          if (!GP.isArchiveSeason()) {
            if (emptyTitle) emptyTitle.textContent = 'Season Starting Soon';
            if (emptyCopy) emptyCopy.textContent = 'Results will appear here once the ' + season + ' season begins and picks are graded. Select a season above to explore the backtest archive.';
          } else {
            if (emptyTitle) emptyTitle.textContent = 'No data for ' + season;
            if (emptyCopy) emptyCopy.textContent = 'Archive data is not available for the ' + season + ' season.';
          }
        }
        setStatusText('results-generated-at', '');
        return;
      }

      if (contentEl) contentEl.style.display = '';

      var s = data.summary;
      setStatusText('results-generated-at', 'Last updated: ' + formatTimestamp(data.generated_at));

      document.getElementById('stat-record').textContent =
        s.wins + '-' + s.losses + (s.pushes > 0 ? '-' + s.pushes : '');

      document.getElementById('stat-winrate').textContent = s.win_rate.toFixed(1) + '%';

      var flatRetEl = document.getElementById('stat-return-flat');
      if (flatRetEl && s.flat) {
        flatRetEl.textContent = (s.flat.return_pct >= 0 ? '+' : '') + s.flat.return_pct.toFixed(1) + '%';
        flatRetEl.className = 'summary-stat-value ' + (s.flat.return_pct >= 0 ? 'positive' : 'negative');
      }

      var pctRetEl = document.getElementById('stat-return-pct');
      if (pctRetEl && s.pct) {
        pctRetEl.textContent = (s.pct.return_pct >= 0 ? '+' : '') + s.pct.return_pct.toFixed(1) + '%';
        pctRetEl.className = 'summary-stat-value ' + (s.pct.return_pct >= 0 ? 'positive' : 'negative');
      }

      var betRoiEl = document.getElementById('stat-bet-roi');
      if (betRoiEl && s.bet_roi != null) {
        betRoiEl.textContent = (s.bet_roi >= 0 ? '+' : '') + s.bet_roi.toFixed(1) + '%';
        betRoiEl.className = s.bet_roi >= 0 ? 'positive' : 'negative';
      }

      var ddFlatEl = document.getElementById('stat-dd-flat');
      if (ddFlatEl && s.flat) {
        ddFlatEl.textContent = s.flat.max_drawdown_pct.toFixed(1) + '%';
        ddFlatEl.className = 'negative';
      }

      var ddPctEl = document.getElementById('stat-dd-pct');
      if (ddPctEl && s.pct) {
        ddPctEl.textContent = s.pct.max_drawdown_pct.toFixed(1) + '%';
        ddPctEl.className = 'negative';
      }

      var marketBody = document.querySelector('#market-table tbody');
      if (marketBody && data.by_market) {
        clearChildren(marketBody);
        var sortedMarkets = data.by_market.slice().sort(function (a, b) {
          return (b.roi || 0) - (a.roi || 0);
        });
        sortedMarkets.forEach(function (m) {
          var tr = document.createElement('tr');
          var tdMarket = el('td');
          var strong = el('strong', '', m.market);
          tdMarket.appendChild(strong);
          tr.appendChild(tdMarket);
          tr.appendChild(el('td', '', String(m.bets)));
          tr.appendChild(el('td', '', m.wins + '-' + m.losses + (m.pushes > 0 ? '-' + m.pushes : '')));
          tr.appendChild(el('td', '', m.win_rate.toFixed(1) + '%'));
          var mRoi = m.roi != null ? m.roi : 0;
          tr.appendChild(el('td', mRoi >= 0 ? 'pnl-positive' : 'pnl-negative',
            (mRoi >= 0 ? '+' : '') + mRoi.toFixed(1) + '%'));
          marketBody.appendChild(tr);
        });
      }

      renderRecentPicks(data);
      renderDirectionStats(data);
      renderDrawdownStreak(data);

      if (data.bankroll_curve && data.bankroll_curve.length > 1) {
        var last = data.bankroll_curve[data.bankroll_curve.length - 1];
        var initBk = s.initial_bankroll || 5000;
        setStatusText(
          'pnl-chart-summary',
          'Starting from $' + initBk.toLocaleString() + ', flat strategy ended at $' +
          last.flat.toLocaleString() + ' and 2% strategy at $' + last.pct.toLocaleString() +
          ' over ' + data.bankroll_curve.length + ' trading days.'
        );
      }

      var canvas = document.getElementById('pnl-chart');
      if (canvas && data.bankroll_curve && data.bankroll_curve.length > 0) {
        var initBankroll = s.initial_bankroll || 5000;
        if (typeof Chart !== 'undefined') {
          initBankrollChart(canvas, data.bankroll_curve, initBankroll);
        } else {
          var chartScript = document.getElementById('chart-script');
          if (chartScript) {
            chartScript.addEventListener('load', function () {
              initBankrollChart(canvas, data.bankroll_curve, initBankroll);
            });
          }
        }
      }

      if (queryErrors.length > 0) {
        setStatusText('results-generated-at',
          'Warning: Some data failed to load (' + queryErrors.join(', ') + '). Try refreshing.');
      }

      GP.reobserveReveals();

    }).catch(function (err) {
      console.error('Results fetch error:', err);
      var emptyEl = document.getElementById('results-empty');
      if (emptyEl) {
        emptyEl.style.display = '';
        var emptyTitle = document.getElementById('results-empty-title');
        var emptyCopy = document.getElementById('results-empty-copy');
        if (emptyTitle) emptyTitle.textContent = 'Results unavailable';
        if (emptyCopy) emptyCopy.textContent = 'We could not load results data. Please try refreshing.';
      }
      setStatusText('results-generated-at', '');
    });
  };

})();
