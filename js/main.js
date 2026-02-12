/* ============================================
   Glick's Picks — Vanilla JS
   ============================================ */

(function () {
  'use strict';

  // Mark that JS is active (for CSS fallback on .reveal)
  document.documentElement.classList.add('js');

  // Check reduced motion preference
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // --- Scroll Reveal ---
  var revealObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );

  document.querySelectorAll('.reveal').forEach(function (el) {
    revealObserver.observe(el);
  });

  // --- Edge-Tier Bar Animation on Scroll ---
  var barObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var fills = entry.target.querySelectorAll('.edge-tier-fill');
          fills.forEach(function (fill) {
            var targetWidth = fill.getAttribute('data-width');
            if (targetWidth !== null) {
              if (prefersReducedMotion) {
                fill.style.transition = 'none';
              }
              fill.style.width = targetWidth + '%';
            }
          });
          barObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2 }
  );

  var edgeTiers = document.querySelector('.edge-tiers');
  if (edgeTiers) {
    barObserver.observe(edgeTiers);
  }

  // --- Mobile Menu ---
  var hamburger = document.querySelector('.hamburger');
  var mobileNav = document.querySelector('.mobile-nav');

  if (hamburger && mobileNav) {
    hamburger.addEventListener('click', function () {
      hamburger.classList.toggle('open');
      mobileNav.classList.toggle('open');
      document.body.style.overflow = mobileNav.classList.contains('open') ? 'hidden' : '';
    });

    mobileNav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        hamburger.classList.remove('open');
        mobileNav.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  // Active nav state is set via .active class in each page's HTML

  // ============================================
  // Picks & Results Pages
  // ============================================

  // --- Backtest/Prod Toggle ---
  function getEnv() {
    return localStorage.getItem('glicks-env') || 'prod';
  }

  function setEnv(env) {
    localStorage.setItem('glicks-env', env);
  }

  function getDataPath(filename) {
    var env = getEnv();
    return env === 'dev' ? 'data/backtest/' + filename : 'data/' + filename;
  }

  function initEnvToggle() {
    var env = getEnv();
    updateBacktestBanner(env);

    var toggles = [
      document.getElementById('env-toggle'),
      document.getElementById('env-toggle-mobile')
    ];

    toggles.forEach(function (toggle) {
      if (!toggle) return;
      toggle.checked = (env === 'dev');
      toggle.addEventListener('change', function () {
        var newEnv = toggle.checked ? 'dev' : 'prod';
        setEnv(newEnv);
        location.reload();
      });
    });
  }

  function updateBacktestBanner(env) {
    var banner = document.getElementById('backtest-banner');
    if (banner) {
      banner.style.display = (env === 'dev') ? 'block' : 'none';
    }
    if (env === 'dev') {
      document.body.classList.add('backtest-mode');
    } else {
      document.body.classList.remove('backtest-mode');
    }
  }

  // --- Utilities ---
  function fetchJSON(filename, callback) {
    fetch(getDataPath(filename))
      .then(function (res) {
        if (!res.ok) throw new Error(res.status);
        return res.json();
      })
      .then(callback)
      .catch(function () { callback(null); });
  }

  function renderStars(n) {
    var s = '';
    for (var i = 0; i < n; i++) s += '\u2605';
    return s;
  }

  function formatPrice(price) {
    if (price === null || price === undefined) return '';
    return (price > 0 ? '+' : '') + price;
  }

  function formatPnl(val) {
    if (val === null || val === undefined) return '--';
    var sign = val > 0 ? '+' : (val < 0 ? '-' : '');
    return sign + '$' + Math.abs(val).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  }

  function formatDate(dateStr) {
    var parts = dateStr.split('-');
    return parseInt(parts[1], 10) + '/' + parseInt(parts[2], 10);
  }

  function formatFullDate(dateStr) {
    var d = new Date(dateStr + 'T12:00:00');
    var options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
    return d.toLocaleDateString('en-US', options);
  }

  function el(tag, className, textContent) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (textContent !== undefined) node.textContent = textContent;
    return node;
  }

  function clearChildren(node) {
    while (node.firstChild) {
      node.removeChild(node.firstChild);
    }
  }

  function reobserveReveals() {
    // Delay one frame so layout recalculates after display changes
    requestAnimationFrame(function () {
      document.querySelectorAll('.reveal:not(.visible)').forEach(function (el) {
        revealObserver.observe(el);
      });
    });
  }

  // --- Shared Pick Card Renderer ---
  function renderPickCard(pick) {
    var card = el('div', 'pick-card');
    card.setAttribute('data-stars', pick.stars);

    // Header row
    var header = el('div', 'pick-card-header');
    var headerLeft = el('div');
    headerLeft.appendChild(el('div', 'pick-card-player', pick.player));
    headerLeft.appendChild(el('div', 'pick-card-opponent', 'vs ' + pick.opponent));
    header.appendChild(headerLeft);
    header.appendChild(el('div', 'pick-stars', renderStars(pick.stars)));
    card.appendChild(header);

    // Body row
    var body = el('div', 'pick-card-body');
    var dirClass = pick.direction === 'OVER' ? 'over' : 'under';
    body.appendChild(el('span', 'pick-direction ' + dirClass, pick.direction));
    body.appendChild(el('span', 'pick-line', String(pick.line)));
    body.appendChild(el('span', 'pick-card-market', pick.market));
    card.appendChild(body);

    // Book info
    if (pick.best_book) {
      var bookDiv = el('div', 'pick-card-book', pick.best_book + ' ');
      if (pick.best_price !== null) {
        bookDiv.appendChild(el('span', 'pick-card-price', formatPrice(pick.best_price)));
      }
      card.appendChild(bookDiv);
    }

    return card;
  }

  // --- Backtest Date Picker ---
  function initBacktestDatePicker() {
    var picker = document.getElementById('backtest-date-picker');
    var select = document.getElementById('backtest-date-select');
    var container = document.getElementById('picks-container');
    if (!picker || !select || !container) return;

    fetch('data/backtest/picks_index.json')
      .then(function (res) {
        if (!res.ok) throw new Error(res.status);
        return res.json();
      })
      .then(function (index) {
        if (!index || !index.dates || index.dates.length === 0) return;

        // Populate dropdown (most recent first)
        var dates = index.dates.slice().reverse();
        dates.forEach(function (entry) {
          var opt = document.createElement('option');
          opt.value = entry.date;
          opt.textContent = formatFullDate(entry.date) + ' (' + entry.count + ' picks)';
          select.appendChild(opt);
        });

        // Show picker
        picker.style.display = '';

        // Load most recent date
        loadBacktestPicks(dates[0].date, container);

        // Handle date change
        select.addEventListener('change', function () {
          loadBacktestPicks(select.value, container);
        });
      })
      .catch(function () {
        // Index not available — fall through to empty state
      });
  }

  function loadBacktestPicks(dateStr, container) {
    var dateEl = document.getElementById('picks-date');
    var emptyEl = document.getElementById('picks-empty');

    // Update subtitle
    if (dateEl) {
      dateEl.textContent = formatFullDate(dateStr);
    }

    // Clear existing cards
    clearChildren(container);
    container.style.display = '';
    if (emptyEl) emptyEl.style.display = 'none';

    fetch('data/backtest/picks/' + dateStr + '.json')
      .then(function (res) {
        if (!res.ok) throw new Error(res.status);
        return res.json();
      })
      .then(function (data) {
        if (!data || !data.picks || data.picks.length === 0) {
          container.style.display = 'none';
          if (emptyEl) emptyEl.style.display = '';
          return;
        }

        data.picks.forEach(function (pick) {
          container.appendChild(renderPickCard(pick));
        });

        reobserveReveals();
      })
      .catch(function () {
        container.style.display = 'none';
        if (emptyEl) emptyEl.style.display = '';
      });
  }

  // --- Picks Page ---
  function initPicksPage() {
    var container = document.getElementById('picks-container');
    if (!container) return;

    // Backtest mode: show date picker and browsable picks
    if (getEnv() === 'dev') {
      var titleEl = document.getElementById('picks-title');
      if (titleEl) titleEl.textContent = '2025 Backtest Picks';
      initBacktestDatePicker();
      return;
    }

    // Prod mode: single day's picks
    fetchJSON('picks_today.json', function (data) {
      var dateEl = document.getElementById('picks-date');
      var emptyEl = document.getElementById('picks-empty');

      if (!data || !data.picks || data.picks.length === 0) {
        container.style.display = 'none';
        if (emptyEl) emptyEl.style.display = '';
        if (dateEl) {
          dateEl.textContent = data && data.date
            ? formatFullDate(data.date)
            : 'Season starts soon';
        }
        return;
      }

      if (dateEl) {
        var updated = data.generated_at
          ? new Date(data.generated_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
          : '';
        dateEl.textContent = formatFullDate(data.date) + (updated ? ' \u2022 Updated ' + updated : '');
      }

      data.picks.forEach(function (pick) {
        container.appendChild(renderPickCard(pick));
      });

      reobserveReveals();
    });
  }

  // --- Results Page ---
  function initResultsPage() {
    var statsEl = document.getElementById('results-stats');
    if (!statsEl) return;

    fetchJSON('results.json', function (data) {
      var emptyEl = document.getElementById('results-empty');
      var contentEl = document.getElementById('results-content');

      if (!data || !data.summary) {
        if (emptyEl) emptyEl.style.display = '';
        return;
      }

      if (contentEl) contentEl.style.display = '';

      var s = data.summary;

      // Stats banner
      document.getElementById('stat-record').textContent =
        s.wins + '-' + s.losses + (s.pushes > 0 ? '-' + s.pushes : '');

      document.getElementById('stat-winrate').textContent = s.win_rate.toFixed(1) + '%';

      var pnlEl = document.getElementById('stat-pnl');
      pnlEl.textContent = formatPnl(s.total_pnl);
      pnlEl.className = 'results-stat-value ' + (s.total_pnl >= 0 ? 'positive' : 'negative');

      var roiEl = document.getElementById('stat-roi');
      roiEl.textContent = (s.roi >= 0 ? '+' : '') + s.roi.toFixed(1) + '%';
      roiEl.className = 'results-stat-value ' + (s.roi >= 0 ? 'positive' : 'negative');

      // Market breakdown table
      var marketBody = document.querySelector('#market-table tbody');
      if (marketBody && data.by_market) {
        data.by_market.forEach(function (m) {
          var tr = document.createElement('tr');
          var tdMarket = el('td'); var strong = el('strong', '', m.market); tdMarket.appendChild(strong);
          tr.appendChild(tdMarket);
          tr.appendChild(el('td', '', String(m.bets)));
          tr.appendChild(el('td', '', m.wins + '-' + m.losses));
          tr.appendChild(el('td', '', m.win_rate.toFixed(1) + '%'));
          var tdPnl = el('td', m.pnl >= 0 ? 'pnl-positive' : 'pnl-negative', formatPnl(m.pnl));
          tr.appendChild(tdPnl);
          var tdRoi = el('td', m.roi >= 0 ? 'pnl-positive' : 'pnl-negative',
            (m.roi >= 0 ? '+' : '') + m.roi.toFixed(1) + '%');
          tr.appendChild(tdRoi);
          marketBody.appendChild(tr);
        });
      }

      // Recent picks table
      var recentBody = document.querySelector('#recent-table tbody');
      if (recentBody && data.recent) {
        data.recent.forEach(function (r) {
          var tr = document.createElement('tr');
          tr.appendChild(el('td', '', formatDate(r.date)));
          tr.appendChild(el('td', '', r.player));
          tr.appendChild(el('td', '', r.direction + ' ' + r.line + ' ' + r.market));

          var tdResult = document.createElement('td');
          var badge = el('span', 'result-badge ' + r.result, r.result.toUpperCase());
          tdResult.appendChild(badge);
          if (r.actual !== null) {
            tdResult.appendChild(document.createTextNode(' (' + r.actual + ')'));
          }
          tr.appendChild(tdResult);

          tr.appendChild(el('td', r.pnl >= 0 ? 'pnl-positive' : 'pnl-negative', formatPnl(r.pnl)));
          recentBody.appendChild(tr);
        });
      }

      // P&L chart
      var canvas = document.getElementById('pnl-chart');
      if (canvas && data.cumulative_pnl && data.cumulative_pnl.length > 0 && typeof Chart !== 'undefined') {
        initPnlChart(canvas, data.cumulative_pnl);
      }

      reobserveReveals();
    });
  }

  function initPnlChart(canvas, pnlData) {
    var labels = pnlData.map(function (d) { return formatDate(d.date); });
    var cumValues = pnlData.map(function (d) { return d.cumulative; });
    var dailyValues = pnlData.map(function (d) { return d.pnl; });
    var lastVal = cumValues[cumValues.length - 1];
    var lineColor = lastVal >= 0 ? '#1a7f6d' : '#c0392b';
    var fillColor = lastVal >= 0 ? 'rgba(26, 127, 109, 0.08)' : 'rgba(192, 57, 43, 0.08)';

    // Compute rolling 7-day P&L
    var rolling7 = [];
    for (var i = 0; i < dailyValues.length; i++) {
      if (i < 6) {
        rolling7.push(null);
      } else {
        var sum = 0;
        for (var j = i - 6; j <= i; j++) { sum += dailyValues[j]; }
        rolling7.push(Math.round(sum * 100) / 100);
      }
    }

    new Chart(canvas, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Cumulative P&L',
            data: cumValues,
            borderColor: lineColor,
            backgroundColor: fillColor,
            fill: true,
            tension: 0.3,
            pointRadius: 0,
            pointHitRadius: 8,
            borderWidth: 2,
            yAxisID: 'y'
          },
          {
            label: 'Rolling 7-Day P&L',
            data: rolling7,
            borderColor: 'rgba(99, 102, 241, 0.85)',
            backgroundColor: 'transparent',
            fill: false,
            tension: 0.3,
            pointRadius: 0,
            pointHitRadius: 8,
            borderWidth: 2,
            borderDash: [5, 3],
            yAxisID: 'y2'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: { left: 8, right: 8 }
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
              boxWidth: 20
            }
          },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                return ctx.dataset.label + ': ' + formatPnl(ctx.parsed.y);
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              font: { family: 'Inter', size: 11 },
              maxTicksLimit: 10
            }
          },
          y: {
            type: 'linear',
            position: 'left',
            grid: { color: 'rgba(27, 42, 74, 0.06)' },
            ticks: {
              font: { family: "'JetBrains Mono'", size: 11 },
              callback: function (val) {
                if (Math.abs(val) >= 1000) return '$' + (val / 1000) + 'K';
                return '$' + val;
              }
            }
          },
          y2: {
            type: 'linear',
            position: 'right',
            grid: { display: false },
            ticks: {
              font: { family: "'JetBrains Mono'", size: 11 },
              color: 'rgba(99, 102, 241, 0.7)',
              callback: function (val) {
                if (Math.abs(val) >= 1000) return '$' + (val / 1000) + 'K';
                return '$' + val;
              }
            }
          }
        }
      }
    });
  }

  // --- Page Router ---
  initEnvToggle();
  initPicksPage();
  initResultsPage();

})();
