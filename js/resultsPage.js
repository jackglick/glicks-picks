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
    var thead = document.createElement('thead');
    var headRow = document.createElement('tr');
    ['Direction', 'Bets', 'Win Rate', 'Flat Return', '2% Return'].forEach(function (h) {
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
      var flatRet = d.flat_return != null ? d.flat_return : (d.pnl || 0) / 5000 * 100;
      tr.appendChild(el('td', flatRet >= 0 ? 'pnl-positive' : 'pnl-negative',
        (flatRet >= 0 ? '+' : '') + flatRet.toFixed(1) + '%'));
      var pctRet = d.pct_return != null ? d.pct_return : 0;
      tr.appendChild(el('td', pctRet >= 0 ? 'pnl-positive' : 'pnl-negative',
        (pctRet >= 0 ? '+' : '') + pctRet.toFixed(1) + '%'));
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
      streakEl.appendChild(el('span', 'summary-meta-label', 'Streaks'));
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
    var showAll = recent.length <= INITIAL_LIMIT;

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
      var toggleBtn = el('button', 'show-all-btn', 'Show all ' + recent.length + ' picks');
      toggleBtn.type = 'button';
      toggleBtn.addEventListener('click', function () {
        renderRows(recent);
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
            borderColor: '#1a7f6d',
            backgroundColor: 'rgba(26, 127, 109, 0.06)',
            fill: false,
            tension: 0.3,
            pointRadius: 0,
            pointHitRadius: 8,
            borderWidth: 2.5
          },
          {
            label: '2% of Bankroll',
            data: pctValues,
            borderColor: '#d4940a',
            backgroundColor: 'rgba(212, 148, 10, 0.06)',
            fill: false,
            tension: 0.3,
            pointRadius: 0,
            pointHitRadius: 8,
            borderWidth: 2.5
          },
          {
            label: 'Starting Bankroll',
            data: baselineValues,
            borderColor: 'rgba(150, 160, 175, 0.75)',
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
              font: { family: 'Inter', size: 11 },
              usePointStyle: true,
              pointStyle: 'line',
              boxWidth: 20,
              filter: function (item) {
                return item.text !== 'Starting Bankroll';
              }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(17, 28, 48, 0.94)',
            borderColor: 'rgba(26, 127, 109, 0.45)',
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
            footerColor: '#b8c4d8',
            titleFont: { family: 'Inter', size: 12, weight: '700' },
            bodyFont: { family: "'JetBrains Mono'", size: 11, weight: '600' },
            footerFont: { family: 'Inter', size: 10, weight: '600' },
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
                if (ctx.dataset.label === 'Flat $100') return '#8ff2cf';
                return '#f6d28a';
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
            ticks: {
              font: { family: 'Inter', size: 11 },
              maxTicksLimit: responsiveTicksLimit
            }
          },
          y: {
            type: 'linear',
            position: 'left',
            grid: { color: 'rgba(27, 42, 74, 0.06)' },
            ticks: {
              font: { family: "'JetBrains Mono'", size: isNarrow ? 9 : 11 },
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

    GP.fetchJSON('results.json', function (data, err) {
      var emptyEl = document.getElementById('results-empty');
      var contentEl = document.getElementById('results-content');

      if (err || !data || !data.summary || data.summary.total_bets === 0) {
        if (emptyEl) {
          emptyEl.style.display = '';
          var emptyTitle = document.getElementById('results-empty-title');
          var emptyCopy = document.getElementById('results-empty-copy');
          if (!GP.isArchiveSeason()) {
            if (emptyTitle) emptyTitle.textContent = 'Season Starting Soon';
            if (emptyCopy) emptyCopy.textContent = 'Results will appear here once the ' + season + ' season begins and picks are graded. Select a season above to explore the backtest archive.';
          } else {
            if (emptyTitle) emptyTitle.textContent = 'Results unavailable';
            if (emptyCopy) emptyCopy.textContent = 'We could not load results data for this season. Please try refreshing.';
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
          var flatRet = m.flat_return != null ? m.flat_return : (m.pnl / 5000 * 100);
          tr.appendChild(el('td', flatRet >= 0 ? 'pnl-positive' : 'pnl-negative',
            (flatRet >= 0 ? '+' : '') + flatRet.toFixed(1) + '%'));
          var pctRet = m.pct_return != null ? m.pct_return : 0;
          tr.appendChild(el('td', pctRet >= 0 ? 'pnl-positive' : 'pnl-negative',
            (pctRet >= 0 ? '+' : '') + pctRet.toFixed(1) + '%'));
          marketBody.appendChild(tr);
        });
      }

      renderRecentPicks(data);
      renderDirectionStats(data);
      renderDrawdownStreak(data);

      if (data.bankroll_curve && data.bankroll_curve.length > 1) {
        var first = data.bankroll_curve[0];
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

      GP.reobserveReveals();
    });
  };

})();
