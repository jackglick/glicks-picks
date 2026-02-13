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
  function initMobileMenu() {
    var hamburger = document.querySelector('.hamburger');
    var mobileNav = document.getElementById('mobile-nav') || document.querySelector('.mobile-nav');

    if (!hamburger || !mobileNav) return;

    function setOpenState(isOpen) {
      hamburger.classList.toggle('open', isOpen);
      mobileNav.classList.toggle('open', isOpen);
      hamburger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      document.body.style.overflow = isOpen ? 'hidden' : '';
    }

    function closeMenu() {
      setOpenState(false);
    }

    hamburger.addEventListener('click', function () {
      var isOpen = mobileNav.classList.contains('open');
      setOpenState(!isOpen);
    });

    mobileNav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeMenu);
    });

    document.addEventListener('keydown', function (evt) {
      if (evt.key === 'Escape' && mobileNav.classList.contains('open')) {
        closeMenu();
      }
    });

    document.addEventListener('click', function (evt) {
      if (!mobileNav.classList.contains('open')) return;
      if (mobileNav.contains(evt.target) || hamburger.contains(evt.target)) return;
      closeMenu();
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth >= 768) {
        closeMenu();
      }
    });
  }

  // ============================================
  // Shared mode/data helpers
  // ============================================

  function getEnv() {
    return localStorage.getItem('glicks-env') || 'dev';
  }

  function setEnv(env) {
    localStorage.setItem('glicks-env', env);
  }

  function getDataPath(filename) {
    var env = getEnv();
    return env === 'dev' ? 'data/backtest/' + filename : 'data/' + filename;
  }

  function updateBacktestBanner(env) {
    var banner = document.getElementById('backtest-banner');
    if (banner) {
      banner.textContent = env === 'dev' ? 'Viewing 2025 Backtest Archive' : 'Viewing Current Mode';
      banner.style.display = env === 'dev' ? 'block' : 'none';
    }

    if (env === 'dev') {
      document.body.classList.add('backtest-mode');
    } else {
      document.body.classList.remove('backtest-mode');
    }
  }

  function initEnvToggle() {
    var env = getEnv();
    updateBacktestBanner(env);

    var toggles = [
      document.getElementById('env-toggle'),
      document.getElementById('env-toggle-mobile')
    ];

    function syncToggleState(isBacktest) {
      toggles.forEach(function (toggle) {
        if (!toggle) return;
        toggle.checked = isBacktest;
      });
    }

    syncToggleState(env === 'dev');

    toggles.forEach(function (toggle) {
      if (!toggle) return;
      toggle.addEventListener('change', function () {
        var newEnv = toggle.checked ? 'dev' : 'prod';
        setEnv(newEnv);
        syncToggleState(newEnv === 'dev');
        location.reload();
      });
    });
  }

  // --- Utilities ---
  function fetchJSON(filename, callback) {
    fetch(getDataPath(filename))
      .then(function (res) {
        if (!res.ok) throw new Error(res.status);
        return res.json();
      })
      .then(function (data) { callback(data, null); })
      .catch(function (err) { callback(null, err); });
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

  function formatTimestamp(ts) {
    if (!ts) return '--';
    var d = new Date(ts);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    });
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
    requestAnimationFrame(function () {
      document.querySelectorAll('.reveal:not(.visible)').forEach(function (item) {
        revealObserver.observe(item);
      });
    });
  }

  function setStatusText(id, text) {
    var node = document.getElementById(id);
    if (node) node.textContent = text;
  }

  // --- Sportsbook brand colors ---
  var BOOK_COLORS = {
    'draftkings': '#53d337',
    'fanduel': '#1493ff',
    'betmgm': '#c5a05e',
    'caesars': '#8c1d40',
    'williamhill_us': '#8c1d40',
    'pointsbet': '#e4002b',
    'betrivers': '#1a3668',
    'bovada': '#cc0000',
    'bet365': '#027b5b',
    'fanatics': '#004bed',
    'betonlineag': '#ff6600',
    'mybookieag': '#d4af37'
  };
  var BOOK_DISPLAY = {
    'draftkings': 'DraftKings',
    'fanduel': 'FanDuel',
    'betmgm': 'BetMGM',
    'caesars': 'Caesars',
    'williamhill_us': 'Caesars',
    'pointsbet': 'PointsBet',
    'betrivers': 'BetRivers',
    'bovada': 'Bovada',
    'bet365': 'bet365',
    'fanatics': 'Fanatics',
    'betonlineag': 'BetOnline',
    'mybookieag': 'MyBookie'
  };

  var picksState = {
    allPicks: [],
    selectedBooks: {},
    backtestIndex: null,
    selectedBacktestDate: null
  };

  var TEAM_LOGO_IDS = {
    'ATH': 133,
    'AZ': 109,
    'ATL': 144,
    'BAL': 110,
    'BOS': 111,
    'CHC': 112,
    'CIN': 113,
    'CLE': 114,
    'COL': 115,
    'CWS': 145,
    'DET': 116,
    'HOU': 117,
    'KC': 118,
    'LAA': 108,
    'LAD': 119,
    'MIA': 146,
    'MIL': 158,
    'MIN': 142,
    'NYM': 121,
    'NYY': 147,
    'PHI': 143,
    'PIT': 134,
    'SD': 135,
    'SEA': 136,
    'SF': 137,
    'STL': 138,
    'TB': 139,
    'TEX': 140,
    'TOR': 141,
    'WSH': 120
  };

  function normalizeTeamCode(raw) {
    if (!raw) return '';
    var t = String(raw).trim().toUpperCase();
    if (t === 'ARI') return 'AZ';
    if (t === 'OAK') return 'ATH';
    if (t === 'WAS') return 'WSH';
    if (t === 'SDP') return 'SD';
    if (t === 'SFG') return 'SF';
    if (t === 'KCR') return 'KC';
    if (t === 'TBR') return 'TB';
    if (t === 'CHW') return 'CWS';
    return t;
  }

  function getTeamLogoUrl(teamCode) {
    var code = normalizeTeamCode(teamCode);
    var teamId = TEAM_LOGO_IDS[code];
    if (!teamId) return null;
    return 'https://www.mlbstatic.com/team-logos/' + teamId + '.svg';
  }

  function getPlayerTeamCode(pick) {
    var explicitTeam = normalizeTeamCode(pick.player_team || pick.team);
    if (explicitTeam) return explicitTeam;

    var opponent = normalizeTeamCode(pick.opponent);
    var home = normalizeTeamCode(pick.home_team);
    var away = normalizeTeamCode(pick.away_team);
    if (!opponent || !home || !away) return '';

    if (opponent === home) return away;
    if (opponent === away) return home;
    return '';
  }

  function createTeamBadge(teamCode, sideLabel) {
    var code = normalizeTeamCode(teamCode);
    if (!code) return null;

    var wrap = el('div', 'matchup-team');
    if (sideLabel) wrap.classList.add(sideLabel);

    var logoWrap = el('span', 'team-logo-wrap');
    var logo = document.createElement('img');
    logo.className = 'team-logo';
    logo.alt = code + ' logo';
    logo.loading = 'lazy';
    logo.decoding = 'async';
    logo.src = getTeamLogoUrl(code) || '';

    var fallback = el('span', 'team-logo-fallback', code);
    fallback.style.display = 'none';

    logo.onerror = function () {
      logo.style.display = 'none';
      fallback.style.display = 'inline-flex';
    };

    logoWrap.appendChild(logo);
    logoWrap.appendChild(fallback);
    wrap.appendChild(logoWrap);
    wrap.appendChild(el('span', 'matchup-team-code', code));
    return wrap;
  }

  function createMatchupRow(pick) {
    var opponent = normalizeTeamCode(pick.opponent);
    var playerTeam = getPlayerTeamCode(pick);
    if (!opponent || !playerTeam) return null;

    var row = el('div', 'pick-card-matchup');
    row.appendChild(createTeamBadge(playerTeam, 'left'));
    row.appendChild(el('span', 'matchup-vs', 'vs'));
    row.appendChild(createTeamBadge(opponent, 'right'));
    return row;
  }

  // --- Shared Pick Card Renderer ---
  function getPlayerInitials(playerName) {
    var parts = playerName.split(', ');
    if (parts.length === 2) {
      return (parts[1].charAt(0) + parts[0].charAt(0)).toUpperCase();
    }
    return playerName.charAt(0).toUpperCase();
  }

  function createPlayerAvatar(pick) {
    if (pick.player_id) {
      var img = document.createElement('img');
      img.className = 'player-headshot';
      img.alt = pick.player;
      img.src = 'https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/' + pick.player_id + '/headshot/67/current';
      img.onerror = function () {
        var initials = el('div', 'player-initials', getPlayerInitials(pick.player));
        img.parentNode.replaceChild(initials, img);
      };
      return img;
    }
    return el('div', 'player-initials', getPlayerInitials(pick.player));
  }

  function renderPickCard(pick) {
    var card = el('div', 'pick-card');
    card.setAttribute('data-stars', pick.stars);

    var header = el('div', 'pick-card-header');
    header.appendChild(createPlayerAvatar(pick));
    var headerInfo = el('div', 'pick-card-header-info');
    var headerLeft = el('div');
    headerLeft.appendChild(el('div', 'pick-card-player', pick.player));
    var playerTeamCode = getPlayerTeamCode(pick);
    var subline = playerTeamCode && pick.opponent ? (playerTeamCode + ' vs ' + normalizeTeamCode(pick.opponent)) : ('vs ' + pick.opponent);
    headerLeft.appendChild(el('div', 'pick-card-opponent', subline));
    headerInfo.appendChild(headerLeft);
    header.appendChild(headerInfo);
    header.appendChild(el('div', 'pick-stars', renderStars(pick.stars)));
    card.appendChild(header);

    var matchupRow = createMatchupRow(pick);
    if (matchupRow) card.appendChild(matchupRow);

    var body = el('div', 'pick-card-body');
    var callWrapper = el('div', 'pick-call-wrapper');
    callWrapper.appendChild(el('span', 'pick-call-label', 'Our Call'));
    var dirClass = pick.direction === 'OVER' ? 'over' : 'under';
    callWrapper.appendChild(el('span', 'pick-direction ' + dirClass, pick.direction));
    body.appendChild(callWrapper);
    body.appendChild(el('span', 'pick-line', String(pick.line)));
    body.appendChild(el('span', 'pick-card-market', pick.market));
    card.appendChild(body);

    if (pick.best_book || pick.best_price !== null) {
      var bookDiv = el('div', 'pick-card-book');
      if (pick.best_book) {
        var bookKey = pick.best_book.toLowerCase();
        var bookColor = BOOK_COLORS[bookKey] || '#8d95a3';
        var dot = el('span', 'book-dot');
        dot.style.background = bookColor;
        bookDiv.appendChild(dot);
        var displayName = BOOK_DISPLAY[bookKey] || pick.best_book;
        bookDiv.appendChild(document.createTextNode(displayName + ' '));
      }
      if (pick.best_price !== null && pick.best_price !== undefined) {
        bookDiv.appendChild(el('span', 'pick-card-price', formatPrice(pick.best_price)));
      }
      card.appendChild(bookDiv);
    }

    return card;
  }

  // --- Home Page ---
  function initHomePage() {
    var heroBets = document.getElementById('hero-total-bets');
    if (!heroBets) return;

    fetchJSON('results.json', function (data, err) {
      if (err || !data || !data.summary) return;

      var summary = data.summary;
      setStatusText('hero-total-bets', summary.total_bets.toLocaleString('en-US'));
      setStatusText('hero-roi', (summary.roi >= 0 ? '+' : '') + summary.roi.toFixed(1) + '%');
      setStatusText('hero-win-rate', summary.win_rate.toFixed(1) + '% win rate');

      setStatusText('edge-roi', (summary.roi >= 0 ? '+' : '') + summary.roi.toFixed(1) + '%');
      setStatusText(
        'edge-summary',
        'Combined ROI across ' + summary.total_bets.toLocaleString('en-US') +
        ' backtested bets (' + summary.win_rate.toFixed(1) + '% win rate).'
      );

      var byMarket = data.by_market || [];
      var marketMap = {};
      byMarket.forEach(function (m) {
        marketMap[m.market] = m;
      });

      var cards = document.querySelectorAll('.market-card[data-market]');
      cards.forEach(function (card) {
        var market = card.getAttribute('data-market');
        var m = marketMap[market];
        if (!m) return;

        var vals = card.querySelectorAll('.market-val');
        if (vals.length >= 2) {
          vals[0].textContent = m.win_rate.toFixed(1) + '%';
          vals[1].textContent = (m.roi >= 0 ? '+' : '') + m.roi.toFixed(1) + '%';
          vals[1].classList.toggle('negative', m.roi < 0);
        }

        var sample = card.querySelector('.market-sample');
        if (sample) {
          sample.textContent = m.bets.toLocaleString('en-US') + ' bets';
        }
      });
    });
  }

  function normalizeBookKey(book) {
    return String(book || '').trim().toLowerCase();
  }

  function getBookDisplayName(bookKey) {
    return BOOK_DISPLAY[bookKey] || bookKey;
  }

  function setPicksEmptyState(title, copy) {
    var titleEl = document.getElementById('picks-empty-title');
    var copyEl = document.getElementById('picks-empty-copy');
    if (titleEl) titleEl.textContent = title;
    if (copyEl) copyEl.textContent = copy;
  }

  function syncBookFilterState() {
    var present = {};
    (picksState.allPicks || []).forEach(function (pick) {
      var key = normalizeBookKey(pick.best_book);
      if (!key) return;
      present[key] = true;
    });

    var prev = picksState.selectedBooks || {};
    var next = {};
    Object.keys(present).forEach(function (key) {
      next[key] = Object.prototype.hasOwnProperty.call(prev, key) ? !!prev[key] : true;
    });
    picksState.selectedBooks = next;
  }

  function getFilteredPicks() {
    var picks = picksState.allPicks || [];
    if (picks.length === 0) return [];

    var keys = Object.keys(picksState.selectedBooks || {});
    if (keys.length === 0) return picks.slice();

    var hasAnyEnabled = keys.some(function (k) { return picksState.selectedBooks[k]; });
    if (!hasAnyEnabled) return [];

    return picks.filter(function (pick) {
      var key = normalizeBookKey(pick.best_book);
      return !!picksState.selectedBooks[key];
    });
  }

  function renderBooksFilterPanel() {
    var panel = document.getElementById('books-filter-panel');
    var list = document.getElementById('books-filter-list');
    var summary = document.getElementById('books-filter-summary');
    if (!panel || !list) return;

    clearChildren(list);
    var counts = {};
    (picksState.allPicks || []).forEach(function (pick) {
      var key = normalizeBookKey(pick.best_book);
      if (!key) return;
      counts[key] = (counts[key] || 0) + 1;
    });

    var books = Object.keys(counts).sort(function (a, b) {
      return getBookDisplayName(a).localeCompare(getBookDisplayName(b));
    });

    if (books.length === 0) {
      panel.style.display = 'none';
      if (summary) summary.textContent = '';
      return;
    }

    panel.style.display = '';
    books.forEach(function (bookKey) {
      var row = el('label', 'book-filter-option');
      var input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = !!picksState.selectedBooks[bookKey];
      input.setAttribute('aria-label', 'Show ' + getBookDisplayName(bookKey) + ' picks');
      input.addEventListener('change', function () {
        picksState.selectedBooks[bookKey] = input.checked;
        renderPicksWithFilters();
      });

      var dot = el('span', 'book-filter-dot');
      dot.style.background = BOOK_COLORS[bookKey] || '#8d95a3';

      var name = el('span', 'book-filter-name', getBookDisplayName(bookKey));
      var count = el('span', 'book-filter-count', String(counts[bookKey]));

      row.appendChild(input);
      row.appendChild(dot);
      row.appendChild(name);
      row.appendChild(count);
      list.appendChild(row);
    });
  }

  function renderPicksWithFilters() {
    var container = document.getElementById('picks-container');
    var emptyEl = document.getElementById('picks-empty');
    var summary = document.getElementById('books-filter-summary');
    if (!container || !emptyEl) return;

    clearChildren(container);
    var allPicks = picksState.allPicks || [];
    var filtered = getFilteredPicks();

    if (allPicks.length === 0) {
      container.style.display = 'none';
      emptyEl.style.display = '';
      setPicksEmptyState(
        'No picks available',
        'Try a different date in backtest mode or check again after the next data refresh.'
      );
      if (summary) summary.textContent = '';
      return;
    }

    if (filtered.length === 0) {
      container.style.display = 'none';
      emptyEl.style.display = '';
      setPicksEmptyState(
        'No picks match your book filters',
        'Enable one or more sportsbooks on the left to see matching picks.'
      );
      if (summary) {
        summary.textContent = 'Showing 0 of ' + allPicks.length + ' picks';
      }
      return;
    }

    container.style.display = '';
    emptyEl.style.display = 'none';
    filtered.forEach(function (pick) {
      container.appendChild(renderPickCard(pick));
    });
    if (summary) {
      summary.textContent = 'Showing ' + filtered.length + ' of ' + allPicks.length + ' picks';
    }
    reobserveReveals();
  }

  function toDateKey(year, month, day) {
    var mm = String(month + 1).padStart(2, '0');
    var dd = String(day).padStart(2, '0');
    return String(year) + '-' + mm + '-' + dd;
  }

  function parseDateKey(dateKey) {
    return new Date(dateKey + 'T12:00:00');
  }

  function getCalendarMonthIndex(year, month) {
    return year * 12 + month;
  }

  function closeBacktestCalendar() {
    var popover = document.getElementById('backtest-calendar-popover');
    var trigger = document.getElementById('backtest-date-trigger');
    if (!popover || !trigger) return;
    popover.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
  }

  function openBacktestCalendar() {
    var popover = document.getElementById('backtest-calendar-popover');
    var trigger = document.getElementById('backtest-date-trigger');
    if (!popover || !trigger) return;
    popover.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
  }

  function updateBacktestDateTrigger() {
    var trigger = document.getElementById('backtest-date-trigger');
    if (!trigger || !picksState.backtestIndex) return;
    var dateKey = picksState.selectedBacktestDate;
    var count = picksState.backtestIndex.countByDate[dateKey] || 0;
    trigger.textContent = formatFullDate(dateKey) + ' (' + count + ' picks)';
  }

  function shiftBacktestCalendarMonth(delta) {
    if (!picksState.backtestIndex) return;
    var year = picksState.backtestIndex.viewYear;
    var month = picksState.backtestIndex.viewMonth + delta;
    var d = new Date(year, month, 1);
    var nextIdx = getCalendarMonthIndex(d.getFullYear(), d.getMonth());
    if (nextIdx < picksState.backtestIndex.minMonthIdx || nextIdx > picksState.backtestIndex.maxMonthIdx) {
      return;
    }
    picksState.backtestIndex.viewYear = d.getFullYear();
    picksState.backtestIndex.viewMonth = d.getMonth();
    renderBacktestCalendar();
  }

  function renderBacktestCalendar() {
    var popover = document.getElementById('backtest-calendar-popover');
    var grid = document.getElementById('backtest-calendar-grid');
    var monthLabel = document.getElementById('backtest-calendar-month-label');
    var prevBtn = document.getElementById('backtest-prev-month');
    var nextBtn = document.getElementById('backtest-next-month');
    if (!popover || !grid || !monthLabel || !prevBtn || !nextBtn || !picksState.backtestIndex) return;

    clearChildren(grid);
    var year = picksState.backtestIndex.viewYear;
    var month = picksState.backtestIndex.viewMonth;
    var first = new Date(year, month, 1);
    var monthName = first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    monthLabel.textContent = monthName;

    var firstWeekday = first.getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();

    for (var i = 0; i < firstWeekday; i++) {
      grid.appendChild(el('span', 'calendar-day filler', ''));
    }

    for (var day = 1; day <= daysInMonth; day++) {
      var dateKey = toDateKey(year, month, day);
      var count = picksState.backtestIndex.countByDate[dateKey] || 0;
      var isAvailable = count > 0;

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'calendar-day';
      btn.textContent = String(day);
      btn.disabled = !isAvailable;

      if (!isAvailable) {
        btn.classList.add('no-picks');
      } else {
        btn.classList.add('has-picks');
        var density = count / picksState.backtestIndex.maxCount;
        var alpha = 0.16 + (density * 0.54);
        btn.style.backgroundColor = 'rgba(26, 127, 109, ' + alpha.toFixed(3) + ')';
        btn.title = formatFullDate(dateKey) + ' • ' + count + ' picks';
        btn.addEventListener('click', (function (pickedDate) {
          return function () {
            picksState.selectedBacktestDate = pickedDate;
            updateBacktestDateTrigger();
            closeBacktestCalendar();
            loadBacktestPicks(pickedDate);
          };
        })(dateKey));
      }

      if (dateKey === picksState.selectedBacktestDate) {
        btn.classList.add('selected');
      }

      grid.appendChild(btn);
    }

    var monthIdx = getCalendarMonthIndex(year, month);
    prevBtn.disabled = monthIdx <= picksState.backtestIndex.minMonthIdx;
    nextBtn.disabled = monthIdx >= picksState.backtestIndex.maxMonthIdx;
  }

  // --- Backtest Date Picker ---
  function initBacktestDatePicker() {
    var picker = document.getElementById('backtest-date-picker');
    var trigger = document.getElementById('backtest-date-trigger');
    var popover = document.getElementById('backtest-calendar-popover');
    var prevBtn = document.getElementById('backtest-prev-month');
    var nextBtn = document.getElementById('backtest-next-month');
    if (!picker || !trigger || !popover || !prevBtn || !nextBtn) return;

    fetch('data/backtest/picks_index.json')
      .then(function (res) {
        if (!res.ok) throw new Error(res.status);
        return res.json();
      })
      .then(function (index) {
        if (!index || !index.dates || index.dates.length === 0) {
          setStatusText('picks-status', 'No backtest date index available.');
          return;
        }

        var sorted = index.dates.slice().sort(function (a, b) {
          return a.date.localeCompare(b.date);
        });
        var countByDate = {};
        var maxCount = 1;
        sorted.forEach(function (entry) {
          countByDate[entry.date] = entry.count;
          if (entry.count > maxCount) maxCount = entry.count;
        });

        var minDate = sorted[0].date;
        var maxDate = sorted[sorted.length - 1].date;
        var minParsed = parseDateKey(minDate);
        var maxParsed = parseDateKey(maxDate);

        picksState.backtestIndex = {
          dates: sorted,
          countByDate: countByDate,
          maxCount: maxCount,
          minMonthIdx: getCalendarMonthIndex(minParsed.getFullYear(), minParsed.getMonth()),
          maxMonthIdx: getCalendarMonthIndex(maxParsed.getFullYear(), maxParsed.getMonth()),
          viewYear: maxParsed.getFullYear(),
          viewMonth: maxParsed.getMonth()
        };
        picksState.selectedBacktestDate = maxDate;

        picker.style.display = '';
        updateBacktestDateTrigger();
        renderBacktestCalendar();
        loadBacktestPicks(maxDate);

        if (picker.dataset.bound === '1') return;
        picker.dataset.bound = '1';

        trigger.addEventListener('click', function () {
          if (popover.hidden) {
            openBacktestCalendar();
          } else {
            closeBacktestCalendar();
          }
        });

        prevBtn.addEventListener('click', function () { shiftBacktestCalendarMonth(-1); });
        nextBtn.addEventListener('click', function () { shiftBacktestCalendarMonth(1); });

        document.addEventListener('click', function (evt) {
          if (popover.hidden) return;
          if (picker.contains(evt.target)) return;
          closeBacktestCalendar();
        });

        document.addEventListener('keydown', function (evt) {
          if (evt.key === 'Escape') closeBacktestCalendar();
        });
      })
      .catch(function () {
        setStatusText('picks-status', 'Could not load backtest date index.');
      });
  }

  function loadBacktestPicks(dateStr) {
    var dateEl = document.getElementById('picks-date');
    var count = picksState.backtestIndex && picksState.backtestIndex.countByDate[dateStr]
      ? picksState.backtestIndex.countByDate[dateStr]
      : 0;
    if (dateEl) {
      dateEl.textContent = formatFullDate(dateStr) + ' • ' + count + ' picks';
    }

    fetch('data/backtest/picks/' + dateStr + '.json')
      .then(function (res) {
        if (!res.ok) throw new Error(res.status);
        return res.json();
      })
      .then(function (data) {
        picksState.allPicks = data && data.picks ? data.picks : [];
        syncBookFilterState();
        renderBooksFilterPanel();
        renderPicksWithFilters();

        if (picksState.allPicks.length === 0) {
          setStatusText('picks-status', 'No picks found for this archive date.');
        } else {
          setStatusText('picks-status', 'Archive mode uses 2025 out-of-sample data.');
        }
      })
      .catch(function () {
        picksState.allPicks = [];
        renderBooksFilterPanel();
        renderPicksWithFilters();
        setStatusText('picks-status', 'Could not load picks for this date.');
      });
  }

  // --- Picks Page ---
  function initPicksPage() {
    var container = document.getElementById('picks-container');
    if (!container) return;

    if (getEnv() === 'dev') {
      var titleEl = document.getElementById('picks-title');
      if (titleEl) titleEl.textContent = '2025 Backtest Picks';
      initBacktestDatePicker();
      return;
    }

    fetchJSON('picks_today.json', function (data, err) {
      var dateEl = document.getElementById('picks-date');

      if (err || !data) {
        picksState.allPicks = [];
        renderBooksFilterPanel();
        renderPicksWithFilters();
        setStatusText('picks-status', 'Could not load current picks feed.');
        if (dateEl) dateEl.textContent = 'Feed unavailable';
        return;
      }

      if (dateEl) {
        if (data.date) {
          var updated = data.generated_at ? formatTimestamp(data.generated_at) : '';
          dateEl.textContent = formatFullDate(data.date) + (updated ? ' • Updated ' + updated : '');
        } else {
          dateEl.textContent = 'Season starts soon';
        }
      }

      picksState.allPicks = data.picks || [];
      syncBookFilterState();
      renderBooksFilterPanel();
      renderPicksWithFilters();

      if (picksState.allPicks.length === 0) {
        setStatusText('picks-status', 'No picks posted for this slate yet.');
      } else {
        setStatusText('picks-status', 'Current mode data feed loaded.');
      }
    });
  }

  // --- Results Page ---
  function initResultsPage() {
    var statsEl = document.getElementById('results-stats');
    if (!statsEl) return;

    fetchJSON('results.json', function (data, err) {
      var emptyEl = document.getElementById('results-empty');
      var contentEl = document.getElementById('results-content');

      if (err || !data || !data.summary) {
        if (emptyEl) emptyEl.style.display = '';
        setStatusText('results-generated-at', 'Last updated: unavailable');
        return;
      }

      if (contentEl) contentEl.style.display = '';

      var s = data.summary;
      setStatusText('results-generated-at', 'Last updated: ' + formatTimestamp(data.generated_at));

      document.getElementById('stat-record').textContent =
        s.wins + '-' + s.losses + (s.pushes > 0 ? '-' + s.pushes : '');

      document.getElementById('stat-winrate').textContent = s.win_rate.toFixed(1) + '%';

      var pnlEl = document.getElementById('stat-pnl');
      pnlEl.textContent = formatPnl(s.total_pnl);
      pnlEl.className = 'results-stat-value ' + (s.total_pnl >= 0 ? 'positive' : 'negative');

      var roiEl = document.getElementById('stat-roi');
      roiEl.textContent = (s.roi >= 0 ? '+' : '') + s.roi.toFixed(1) + '%';
      roiEl.className = 'results-stat-value ' + (s.roi >= 0 ? 'positive' : 'negative');

      var marketBody = document.querySelector('#market-table tbody');
      if (marketBody && data.by_market) {
        clearChildren(marketBody);
        data.by_market.forEach(function (m) {
          var tr = document.createElement('tr');
          var tdMarket = el('td');
          var strong = el('strong', '', m.market);
          tdMarket.appendChild(strong);
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

      var recentBody = document.querySelector('#recent-table tbody');
      if (recentBody && data.recent) {
        clearChildren(recentBody);
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

      if (data.cumulative_pnl && data.cumulative_pnl.length > 1) {
        var first = data.cumulative_pnl[0];
        var last = data.cumulative_pnl[data.cumulative_pnl.length - 1];
        setStatusText(
          'pnl-chart-summary',
          'From ' + first.date + ' to ' + last.date + ', cumulative P&L moved from ' +
          formatPnl(first.cumulative) + ' to ' + formatPnl(last.cumulative) + '.'
        );
      }

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

    var rolling7 = [];
    for (var i = 0; i < dailyValues.length; i++) {
      if (i < 6) {
        rolling7.push(null);
      } else {
        var sum = 0;
        for (var j = i - 6; j <= i; j++) sum += dailyValues[j];
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
            borderColor: 'rgba(212, 148, 10, 0.85)',
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
              color: 'rgba(212, 148, 10, 0.8)',
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
  initMobileMenu();
  initEnvToggle();
  initHomePage();
  initPicksPage();
  initResultsPage();

})();
