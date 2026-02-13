/* ============================================
   Glick's Picks — Vanilla JS
   ============================================ */

(function () {
  'use strict';

  var SiteLogic = window.GlicksSiteLogic || null;

  // Mark that JS is active (for CSS fallback on .reveal)
  document.documentElement.classList.add('js');

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

  var CURRENT_SEASON = '2026';
  var AVAILABLE_SEASONS = ['2026', '2025', '2024'];

  function getSeason() {
    return localStorage.getItem('glicks-season') || CURRENT_SEASON;
  }

  function setSeason(season) {
    localStorage.setItem('glicks-season', season);
  }

  function isArchiveSeason() {
    return getSeason() !== CURRENT_SEASON;
  }

  function getDataPath(filename) {
    var season = getSeason();
    if (SiteLogic && typeof SiteLogic.getDataPath === 'function') {
      return SiteLogic.getDataPath(season, filename);
    }
    return season === CURRENT_SEASON ? 'data/' + filename : 'data/' + season + '/' + filename;
  }

  function updateSeasonBanner() {
    var banner = document.getElementById('backtest-banner');
    var season = getSeason();
    if (banner) {
      if (isArchiveSeason()) {
        banner.textContent = 'Viewing ' + season + ' Season Archive';
        banner.style.display = 'block';
      } else {
        banner.style.display = 'none';
      }
    }

    if (isArchiveSeason()) {
      document.body.classList.add('backtest-mode');
    } else {
      document.body.classList.remove('backtest-mode');
    }
  }

  function initSeasonSelector() {
    var season = getSeason();
    updateSeasonBanner();

    var buttons = document.querySelectorAll('.season-pill-btn');
    buttons.forEach(function (btn) {
      if (btn.getAttribute('data-season') === season) {
        btn.classList.add('active');
      }
      btn.addEventListener('click', function () {
        var picked = btn.getAttribute('data-season');
        if (picked === season) return;
        setSeason(picked);
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
    if (price === 0) return 'EVEN';
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
    selectedMarkets: {},
    sortBy: 'stars-desc',
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
      img.loading = 'lazy';
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

    if (pick.stars >= 3) {
      var ribbon = el('div', 'corner-ribbon', 'TOP PICK');
      card.appendChild(ribbon);
    }

    var header = el('div', 'pick-card-header');
    header.appendChild(createPlayerAvatar(pick));
    var headerInfo = el('div', 'pick-card-header-info');
    var headerLeft = el('div');
    headerLeft.appendChild(el('div', 'pick-card-player', pick.player));
    var roleText = pick.category === 'batter' ? 'Batter' : 'Starting Pitcher';
    headerLeft.appendChild(el('div', 'pick-card-role', roleText));
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

    // Backtest outcome badge (item 19)
    if (pick.result) {
      var footer = el('div', 'pick-card-footer');
      var resultKey = String(pick.result).toLowerCase();
      var badgeClass = 'pick-outcome';
      if (resultKey === 'win') badgeClass += ' win';
      else if (resultKey === 'loss') badgeClass += ' loss';
      else if (resultKey === 'push') badgeClass += ' push';
      var badge = el('span', badgeClass, String(pick.result).toUpperCase());
      footer.appendChild(badge);
      if (pick.actual !== null && pick.actual !== undefined) {
        footer.appendChild(el('span', 'pick-outcome-actual', 'Actual: ' + pick.actual));
      }
      if (pick.pnl !== null && pick.pnl !== undefined) {
        var pnlClass = pick.pnl >= 0 ? 'pnl-positive' : 'pnl-negative';
        footer.appendChild(el('span', 'pick-outcome-pnl ' + pnlClass, formatPnl(pick.pnl)));
      }
      card.appendChild(footer);
    }

    return card;
  }

  // --- Home Page ---
  function initHomePage() {
    var heroBets = document.getElementById('hero-total-bets');
    if (!heroBets) return;

    // Update section title with season
    var season = getSeason();
    var sectionTitle = document.getElementById('market-section-title');
    if (sectionTitle && isArchiveSeason()) {
      sectionTitle.textContent = season + ' backtest results by market';
    }

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

      // Sort market cards by ROI descending (item 26)
      var cardsContainer = cards.length > 0 ? cards[0].parentNode : null;
      if (cardsContainer && byMarket.length > 1) {
        var sortedByRoi = byMarket.slice().sort(function (a, b) {
          return (b.roi || 0) - (a.roi || 0);
        });
        sortedByRoi.forEach(function (m) {
          var card = cardsContainer.querySelector('.market-card[data-market="' + m.market + '"]');
          if (card) cardsContainer.appendChild(card);
        });
      }
    });
  }

  function normalizeBookKey(book) {
    if (SiteLogic && typeof SiteLogic.normalizeBookKey === 'function') {
      return SiteLogic.normalizeBookKey(book);
    }
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
    if (SiteLogic && typeof SiteLogic.syncBookFilterState === 'function') {
      picksState.selectedBooks = SiteLogic.syncBookFilterState(
        picksState.allPicks || [],
        picksState.selectedBooks || {}
      );
      return;
    }

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
    if (SiteLogic && typeof SiteLogic.getFilteredPicks === 'function') {
      return SiteLogic.getFilteredPicks(
        picksState.allPicks || [],
        picksState.selectedBooks || {}
      );
    }

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
      row.classList.toggle('is-selected', input.checked);
      input.addEventListener('change', function () {
        picksState.selectedBooks[bookKey] = input.checked;
        row.classList.toggle('is-selected', input.checked);
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

  function sortPicks(picks, sortKey) {
    var sorted = picks.slice();
    switch (sortKey) {
      case 'stars-asc':
        sorted.sort(function (a, b) { return (a.stars || 0) - (b.stars || 0); });
        break;
      case 'market':
        sorted.sort(function (a, b) { return String(a.market || '').localeCompare(String(b.market || '')); });
        break;
      case 'direction':
        sorted.sort(function (a, b) {
          var da = a.direction === 'OVER' ? 0 : 1;
          var db = b.direction === 'OVER' ? 0 : 1;
          return da - db;
        });
        break;
      case 'stars-desc':
      default:
        sorted.sort(function (a, b) {
          var diff = (b.stars || 0) - (a.stars || 0);
          if (diff !== 0) return diff;
          return String(a.player || '').localeCompare(String(b.player || ''));
        });
        break;
    }
    return sorted;
  }

  function applyMarketFilter(picks) {
    var keys = Object.keys(picksState.selectedMarkets || {});
    if (keys.length === 0) return picks;
    var anyEnabled = keys.some(function (k) { return picksState.selectedMarkets[k]; });
    if (!anyEnabled) return [];
    return picks.filter(function (pick) {
      var m = String(pick.market || '');
      return !!picksState.selectedMarkets[m];
    });
  }

  function initPicksSort() {
    var sortEl = document.getElementById('picks-sort');
    if (!sortEl) return;
    sortEl.value = picksState.sortBy;
    sortEl.addEventListener('change', function () {
      picksState.sortBy = sortEl.value;
      renderPicksWithFilters();
    });
  }

  function initMarketFilter(picks) {
    var container = document.getElementById('picks-market-filter');
    if (!container) return;
    clearChildren(container);
    var marketCounts = {};
    picks.forEach(function (p) {
      if (p.market) {
        marketCounts[p.market] = (marketCounts[p.market] || 0) + 1;
      }
    });
    var marketList = Object.keys(marketCounts).sort();
    if (marketList.length <= 1) {
      container.style.display = 'none';
      return;
    }
    container.style.display = '';
    var chipsWrap = el('div', 'market-filter-chips');
    marketList.forEach(function (market) {
      if (!Object.prototype.hasOwnProperty.call(picksState.selectedMarkets, market)) {
        picksState.selectedMarkets[market] = true;
      }
      var isSelected = !!picksState.selectedMarkets[market];
      var chip = el('label', 'market-filter-chip' + (isSelected ? ' active' : ''));
      var input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = isSelected;
      input.setAttribute('aria-label', 'Show ' + market + ' picks');
      var name = el('span', 'market-filter-name', market);
      var count = el('span', 'market-filter-count', String(marketCounts[market]));
      input.addEventListener('change', function () {
        picksState.selectedMarkets[market] = input.checked;
        chip.classList.toggle('active', input.checked);
        renderPicksWithFilters();
      });
      chip.appendChild(input);
      chip.appendChild(name);
      chip.appendChild(count);
      chipsWrap.appendChild(chip);
    });
    container.appendChild(chipsWrap);
  }

  function showLoadingSkeletons(container, count) {
    clearChildren(container);
    container.style.display = '';
    for (var i = 0; i < count; i++) {
      container.appendChild(el('div', 'pick-card loading-skeleton'));
    }
  }

  function renderPicksWithFilters() {
    var container = document.getElementById('picks-container');
    var emptyEl = document.getElementById('picks-empty');
    var summary = document.getElementById('books-filter-summary');
    var offseasonHero = document.getElementById('offseason-hero');
    if (!container || !emptyEl) return;

    clearChildren(container);
    var allPicks = picksState.allPicks || [];
    var filtered = getFilteredPicks();
    filtered = applyMarketFilter(filtered);
    filtered = sortPicks(filtered, picksState.sortBy);

    // Hide offseason hero by default
    if (offseasonHero) offseasonHero.style.display = 'none';

    if (allPicks.length === 0) {
      container.style.display = 'none';
      emptyEl.style.display = '';

      // Offseason state: 0 picks and not in archive mode
      if (!isArchiveSeason() && offseasonHero) {
        offseasonHero.style.display = 'block';
        emptyEl.style.display = 'none';
      } else {
        setPicksEmptyState(
          'No picks available',
          'Try a different date or season, or check again after the next data refresh.'
        );
      }
      if (summary) summary.textContent = '';
      return;
    }

    if (filtered.length === 0) {
      container.style.display = 'none';
      emptyEl.style.display = '';
      setPicksEmptyState(
        'No picks match your filters',
        'Adjust your sportsbook or market filters above to see matching picks.'
      );
      if (summary) {
        summary.textContent = 'Showing 0 of ' + allPicks.length + ' picks';
      }
      return;
    }

    container.style.display = '';
    emptyEl.style.display = 'none';

    // Remove legacy best-bets section if present
    var bestBetsSection = container.parentNode ? container.parentNode.querySelector('.best-bets-section') : null;
    if (bestBetsSection) {
      clearChildren(bestBetsSection);
      bestBetsSection.style.display = 'none';
    }

    // Group picks by game_pk
    var gameGroups = {};
    var gameOrder = [];
    filtered.forEach(function (pick) {
      var key = pick.game_pk || (pick.home_team + '_' + pick.away_team);
      if (!gameGroups[key]) {
        gameGroups[key] = {
          picks: [],
          home_team: pick.home_team || '',
          away_team: pick.away_team || '',
          maxStars: 0
        };
        gameOrder.push(key);
      }
      gameGroups[key].picks.push(pick);
      if (pick.stars > gameGroups[key].maxStars) {
        gameGroups[key].maxStars = pick.stars;
      }
    });

    // Sort game groups: highest max stars first, then by pick count descending
    gameOrder.sort(function (a, b) {
      var diff = gameGroups[b].maxStars - gameGroups[a].maxStars;
      if (diff !== 0) return diff;
      return gameGroups[b].picks.length - gameGroups[a].picks.length;
    });

    // Render each game group
    gameOrder.forEach(function (key) {
      var group = gameGroups[key];
      var section = el('div', 'game-slate-group');

      // Game header with team logos
      var header = el('div', 'game-slate-header');
      header.appendChild(createTeamBadge(normalizeTeamCode(group.away_team), 'left'));
      header.appendChild(el('span', 'matchup-vs', 'at'));
      header.appendChild(createTeamBadge(normalizeTeamCode(group.home_team), 'right'));
      section.appendChild(header);

      // Sort picks within group: 3-star first, then by current sort
      var sorted = group.picks.slice().sort(function (a, b) {
        return b.stars - a.stars;
      });

      var grid = el('div', 'picks-grid');
      sorted.forEach(function (pick) {
        grid.appendChild(renderPickCard(pick));
      });
      section.appendChild(grid);
      container.appendChild(section);
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
    if (SiteLogic && typeof SiteLogic.getCalendarMonthIndex === 'function') {
      return SiteLogic.getCalendarMonthIndex(year, month);
    }
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
    if (SiteLogic && typeof SiteLogic.shiftCalendarMonth === 'function') {
      var prevIdx = getCalendarMonthIndex(
        picksState.backtestIndex.viewYear,
        picksState.backtestIndex.viewMonth
      );
      SiteLogic.shiftCalendarMonth(picksState.backtestIndex, delta);
      var nextIdx = getCalendarMonthIndex(
        picksState.backtestIndex.viewYear,
        picksState.backtestIndex.viewMonth
      );
      if (nextIdx === prevIdx) return;
      renderBacktestCalendar();
      return;
    }

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
    var calendarModel = null;
    if (SiteLogic && typeof SiteLogic.computeCalendarDays === 'function') {
      calendarModel = SiteLogic.computeCalendarDays(picksState.backtestIndex, picksState.selectedBacktestDate);
    }

    var fillerCount = calendarModel ? calendarModel.fillers : firstWeekday;
    for (var i = 0; i < fillerCount; i++) {
      grid.appendChild(el('span', 'calendar-day filler', ''));
    }

    var entries = [];
    if (calendarModel) {
      entries = calendarModel.days;
    } else {
      for (var day = 1; day <= daysInMonth; day++) {
        var dateKey = toDateKey(year, month, day);
        var count = picksState.backtestIndex.countByDate[dateKey] || 0;
        var isAvailable = count > 0;
        var density = isAvailable ? count / picksState.backtestIndex.maxCount : 0;
        entries.push({
          day: day,
          dateKey: dateKey,
          count: count,
          isAvailable: isAvailable,
          alpha: Number((0.16 + (density * 0.54)).toFixed(3)),
          selected: dateKey === picksState.selectedBacktestDate
        });
      }
    }

    entries.forEach(function (entry) {
      var dateKey = entry.dateKey;
      var count = entry.count;
      var isAvailable = entry.isAvailable;

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'calendar-day';
      btn.textContent = String(entry.day);
      btn.disabled = !isAvailable;
      btn.setAttribute('aria-label', formatFullDate(dateKey));

      if (!isAvailable) {
        btn.classList.add('no-picks');
      } else {
        btn.classList.add('has-picks');
        btn.style.backgroundColor = 'rgba(26, 127, 109, ' + Number(entry.alpha).toFixed(3) + ')';
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

      if (entry.selected || dateKey === picksState.selectedBacktestDate) {
        btn.classList.add('selected');
      }

      grid.appendChild(btn);
    });

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

    fetch(getDataPath('picks_index.json'))
      .then(function (res) {
        if (!res.ok) throw new Error(res.status);
        return res.json();
      })
      .then(function (index) {
        if (!index || !index.dates || index.dates.length === 0) {
          setStatusText('picks-status', 'No date index available for this season.');
          return;
        }

        if (SiteLogic && typeof SiteLogic.buildBacktestIndex === 'function') {
          var builtIndex = SiteLogic.buildBacktestIndex(index);
          if (!builtIndex) {
            setStatusText('picks-status', 'No date index available for this season.');
            return;
          }
          picksState.backtestIndex = {
            dates: builtIndex.dates,
            countByDate: builtIndex.countByDate,
            maxCount: builtIndex.maxCount,
            minMonthIdx: builtIndex.minMonthIdx,
            maxMonthIdx: builtIndex.maxMonthIdx,
            viewYear: builtIndex.viewYear,
            viewMonth: builtIndex.viewMonth
          };
          picksState.selectedBacktestDate = builtIndex.selectedBacktestDate;
        } else {
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
        }

        picker.style.display = '';
        updateBacktestDateTrigger();
        renderBacktestCalendar();
        loadBacktestPicks(picksState.selectedBacktestDate);

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

        var calCloseBtn = popover.querySelector('.calendar-close-btn');
        if (calCloseBtn) {
          calCloseBtn.addEventListener('click', function () {
            closeBacktestCalendar();
          });
        }
      })
      .catch(function () {
        setStatusText('picks-status', 'Could not load date index for this season.');
      });
  }

  function loadBacktestPicks(dateStr) {
    var dateEl = document.getElementById('picks-date');
    var container = document.getElementById('picks-container');
    var count = picksState.backtestIndex && picksState.backtestIndex.countByDate[dateStr]
      ? picksState.backtestIndex.countByDate[dateStr]
      : 0;
    if (dateEl) {
      dateEl.textContent = formatFullDate(dateStr) + ' \u2022 ' + count + ' picks \u2022 ' + getSeason() + ' Archive';
    }

    // Show loading skeletons
    if (container) showLoadingSkeletons(container, 4);

    fetch(getDataPath('picks/' + dateStr + '.json'))
      .then(function (res) {
        if (!res.ok) throw new Error(res.status);
        return res.json();
      })
      .then(function (data) {
        picksState.allPicks = data && data.picks ? data.picks : [];
        syncBookFilterState();
        renderBooksFilterPanel();
        initMarketFilter(picksState.allPicks);
        renderPicksWithFilters();
        setStatusText('picks-status', '');
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

    initPicksSort();

    // Offseason hero browse-archive button
    var browseBtn = document.getElementById('browse-backtest-btn');
    if (browseBtn) {
      browseBtn.addEventListener('click', function () {
        setSeason('2025');
        location.reload();
      });
    }

    if (isArchiveSeason()) {
      var titleEl = document.getElementById('picks-title');
      if (titleEl) titleEl.textContent = getSeason() + ' Season Picks';
      initBacktestDatePicker();
      return;
    }

    // Show loading skeletons while fetching
    showLoadingSkeletons(container, 4);

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

      // Consolidated status line (item 18)
      if (dateEl) {
        var parts = [];
        if (data.date) {
          parts.push(formatFullDate(data.date));
        }
        if (data.picks && data.picks.length > 0) {
          parts.push(data.picks.length + ' picks');
        }
        if (data.generated_at) {
          parts.push('Updated ' + formatTimestamp(data.generated_at));
        }
        dateEl.textContent = parts.length > 0 ? parts.join(' \u2022 ') : 'Season starts soon';
      }

      picksState.allPicks = data.picks || [];
      syncBookFilterState();
      renderBooksFilterPanel();
      initMarketFilter(picksState.allPicks);
      renderPicksWithFilters();

      if (picksState.allPicks.length === 0) {
        setStatusText('picks-status', '');
      } else {
        setStatusText('picks-status', '');
      }
    });
  }

  // --- Results Page ---
  function renderStarTierStats(data) {
    var container = document.getElementById('star-tier-stats');
    if (!container || !data || !Array.isArray(data.star_tier_stats)) return;
    clearChildren(container);
    var tiers = data.star_tier_stats;
    if (tiers.length === 0) return;

    container.appendChild(el('h3', 'results-section-heading', 'By Confidence Tier'));

    var scrollWrap = el('div', 'results-table-scroll');
    var table = document.createElement('table');
    table.className = 'results-table';
    var thead = document.createElement('thead');
    var headRow = document.createElement('tr');
    ['Stars', 'Bets', 'Record', 'Win Rate', 'P&L', 'ROI'].forEach(function (h) {
      headRow.appendChild(el('th', '', h));
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    var tbody = document.createElement('tbody');
    tiers.forEach(function (t) {
      var tr = document.createElement('tr');
      tr.appendChild(el('td', '', renderStars(t.stars || 0)));
      tr.appendChild(el('td', '', String(t.bets || 0)));
      var record = (t.wins || 0) + '-' + (t.losses || 0);
      if (t.pushes > 0) record += '-' + t.pushes;
      tr.appendChild(el('td', '', record));
      tr.appendChild(el('td', '', (t.win_rate != null ? t.win_rate.toFixed(1) : '0.0') + '%'));
      tr.appendChild(el('td', (t.pnl || 0) >= 0 ? 'pnl-positive' : 'pnl-negative', formatPnl(t.pnl)));
      var roiVal = t.roi || 0;
      tr.appendChild(el('td', roiVal >= 0 ? 'pnl-positive' : 'pnl-negative',
        (roiVal >= 0 ? '+' : '') + roiVal.toFixed(1) + '%'));
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    scrollWrap.appendChild(table);
    container.appendChild(scrollWrap);
  }

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
    ['Direction', 'Bets', 'Win Rate', 'ROI'].forEach(function (h) {
      headRow.appendChild(el('th', '', h));
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    var tbody = document.createElement('tbody');
    stats.forEach(function (d) {
      var tr = document.createElement('tr');
      tr.appendChild(el('td', '', String(d.direction || '')));
      tr.appendChild(el('td', '', String(d.bets || 0)));
      tr.appendChild(el('td', '', (d.win_rate != null ? d.win_rate.toFixed(1) : '0.0') + '%'));
      var roiVal = d.roi || 0;
      tr.appendChild(el('td', roiVal >= 0 ? 'pnl-positive' : 'pnl-negative',
        (roiVal >= 0 ? '+' : '') + roiVal.toFixed(1) + '%'));
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    scrollWrap.appendChild(table);
    container.appendChild(scrollWrap);
  }

  function renderDrawdownStreak(summary) {
    var container = document.getElementById('drawdown-streak-row');
    if (!container) return;
    clearChildren(container);

    if (summary.max_drawdown !== undefined && summary.max_drawdown !== null) {
      var ddBox = el('div', 'results-stat-box');
      ddBox.appendChild(el('div', 'results-stat-label', 'Max Drawdown'));
      var ddVal = el('div', 'results-stat-value negative', formatPnl(summary.max_drawdown));
      ddBox.appendChild(ddVal);
      container.appendChild(ddBox);
    }

    if (summary.current_streak !== undefined && summary.current_streak !== null) {
      var stBox = el('div', 'results-stat-box');
      stBox.appendChild(el('div', 'results-stat-label', 'Current Streak'));
      var streakType = summary.streak_type || '';
      var streakClass = streakType === 'W' ? 'positive' : (streakType === 'L' ? 'negative' : '');
      var streakText = summary.current_streak + (streakType ? streakType : '');
      stBox.appendChild(el('div', 'results-stat-value ' + streakClass, streakText));
      container.appendChild(stBox);
    }
  }

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

  function initResultsPage() {
    var statsEl = document.getElementById('results-stats');
    if (!statsEl) return;

    // Add loading class to stat boxes
    statsEl.querySelectorAll('.results-stat-box').forEach(function (box) {
      box.classList.add('loading');
    });

    fetchJSON('results.json', function (data, err) {
      var emptyEl = document.getElementById('results-empty');
      var contentEl = document.getElementById('results-content');

      // Remove loading class
      statsEl.querySelectorAll('.results-stat-box').forEach(function (box) {
        box.classList.remove('loading');
      });

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

      // Market table — sort by ROI descending (item 24)
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
          var tdPnl = el('td', m.pnl >= 0 ? 'pnl-positive' : 'pnl-negative', formatPnl(m.pnl));
          tr.appendChild(tdPnl);
          var tdRoi = el('td', m.roi >= 0 ? 'pnl-positive' : 'pnl-negative',
            (m.roi >= 0 ? '+' : '') + m.roi.toFixed(1) + '%');
          tr.appendChild(tdRoi);
          marketBody.appendChild(tr);
        });
      }

      // Recent picks with pagination (item 23)
      renderRecentPicks(data);

      // Star tier stats (item 20)
      renderStarTierStats(data);

      // Direction stats (item 21)
      renderDirectionStats(data);

      // Drawdown and streak (item 22)
      renderDrawdownStreak(s);

      if (data.cumulative_pnl && data.cumulative_pnl.length > 1) {
        var first = data.cumulative_pnl[0];
        var last = data.cumulative_pnl[data.cumulative_pnl.length - 1];
        setStatusText(
          'pnl-chart-summary',
          'From ' + formatDate(first.date) + ' to ' + formatDate(last.date) + ', cumulative P&L moved from ' +
          formatPnl(first.cumulative) + ' to ' + formatPnl(last.cumulative) + '.'
        );
      }

      var canvas = document.getElementById('pnl-chart');
      if (canvas && data.cumulative_pnl && data.cumulative_pnl.length > 0) {
        if (typeof Chart !== 'undefined') {
          initPnlChart(canvas, data.cumulative_pnl);
        } else {
          // Chart.js defer script may not have executed yet — wait for it
          var attempts = 0;
          var waitForChart = setInterval(function () {
            attempts++;
            if (typeof Chart !== 'undefined') {
              clearInterval(waitForChart);
              initPnlChart(canvas, data.cumulative_pnl);
            } else if (attempts > 50) {
              clearInterval(waitForChart);
            }
          }, 100);
        }
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
    var upArrow = '\u25b2';
    var downArrow = '\u25bc';

    function directionArrow(value) {
      if (value > 0) return upArrow;
      if (value < 0) return downArrow;
      return '\u25a0';
    }

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

    var responsiveTicksLimit = window.innerWidth < 640 ? 5 : 10;

    var chart = new Chart(canvas, {
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
            callbacks: {
              title: function (items) {
                if (!items || items.length === 0) return '';
                var idx = items[0].dataIndex;
                var row = pnlData[idx];
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
                return directionArrow(val) + ' ' + ctx.dataset.label + ': ' + formatPnl(val);
              },
              labelTextColor: function (ctx) {
                var val = ctx.parsed && typeof ctx.parsed.y === 'number' ? ctx.parsed.y : 0;
                if (ctx.dataset && ctx.dataset.label === 'Cumulative P&L') {
                  return val >= 0 ? '#8ff2cf' : '#ffb3b3';
                }
                return val >= 0 ? '#f6d28a' : '#ffbe7a';
              },
              footer: function (items) {
                if (!items || items.length === 0) return '';
                var idx = items[0].dataIndex;
                var row = pnlData[idx];
                if (!row || row.pnl === null || row.pnl === undefined) return '';
                var lines = [];
                lines.push('Daily P&L: ' + directionArrow(row.pnl) + ' ' + formatPnl(row.pnl));
                if (idx > 0 && pnlData[idx - 1] && pnlData[idx - 1].cumulative !== null && row.cumulative !== null) {
                  var delta = row.cumulative - pnlData[idx - 1].cumulative;
                  lines.push('Change vs prior: ' + directionArrow(delta) + ' ' + formatPnl(delta));
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

    window.addEventListener('resize', function () {
      var newLimit = window.innerWidth < 640 ? 5 : 10;
      if (chart.options.scales.x.ticks.maxTicksLimit !== newLimit) {
        chart.options.scales.x.ticks.maxTicksLimit = newLimit;
        chart.update('none');
      }
    });

    // Populate chart aria-describedby after data loads
    var chartDesc = document.getElementById('pnl-chart-summary');
    if (chartDesc) {
      var first = pnlData[0];
      var last = pnlData[pnlData.length - 1];
      chartDesc.textContent = 'From ' + formatDate(first.date) + ' to ' + formatDate(last.date) +
        ', cumulative P&L moved from ' + formatPnl(first.cumulative) + ' to ' + formatPnl(last.cumulative) + '.';
    }
  }

  // --- Page Router ---
  initMobileMenu();
  initSeasonSelector();
  initHomePage();
  initPicksPage();
  initResultsPage();

})();
