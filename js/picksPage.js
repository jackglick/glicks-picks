/* ============================================
   Glick's Picks — Picks Page
   ============================================ */
(function () {
  'use strict';

  var GP = window.GP;
  var SiteLogic = GP.SiteLogic;

  var el = GP.el;
  var clearChildren = GP.clearChildren;
  var formatPrice = GP.formatPrice;
  var formatPnl = GP.formatPnl;
  var formatFullDate = GP.formatFullDate;
  var formatTimestamp = GP.formatTimestamp;
  var setStatusText = GP.setStatusText;
  var normalizeTeamCode = GP.normalizeTeamCode;
  var getTeamLogoUrl = GP.getTeamLogoUrl;
  var normalizeBookKey = GP.normalizeBookKey;
  var getBookDisplayName = GP.getBookDisplayName;

  var picksState = {
    allPicks: [],
    selectedBooks: {},
    selectedMarkets: {},
    sortBy: 'market',
    backtestIndex: null,
    selectedBacktestDate: null
  };

  // ============================================
  // Team badge & matchup helpers
  // ============================================

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

  // ============================================
  // Pick card renderer
  // ============================================

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

    var header = el('div', 'pick-card-header');
    header.appendChild(createPlayerAvatar(pick));
    var headerInfo = el('div', 'pick-card-header-info');
    var headerLeft = el('div');
    headerLeft.appendChild(el('div', 'pick-card-player', pick.player));
    var roleText = pick.category === 'batter' ? 'Batter' : 'Starting Pitcher';
    headerLeft.appendChild(el('div', 'pick-card-role', roleText));
    headerInfo.appendChild(headerLeft);
    header.appendChild(headerInfo);
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
        var bookColor = GP.BOOK_COLORS[bookKey] || '#8d95a3';
        var dot = el('span', 'book-dot');
        dot.style.background = bookColor;
        bookDiv.appendChild(dot);
        var displayName = GP.BOOK_DISPLAY[bookKey] || pick.best_book;
        bookDiv.appendChild(document.createTextNode(displayName + ' '));
      }
      if (pick.best_price !== null && pick.best_price !== undefined) {
        bookDiv.appendChild(el('span', 'pick-card-price', formatPrice(pick.best_price)));
      }
      card.appendChild(bookDiv);
    }

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
        var pnlClass = pick.pnl > 0 ? 'pnl-positive' : (pick.pnl < 0 ? 'pnl-negative' : '');
        footer.appendChild(el('span', 'pick-outcome-pnl ' + pnlClass, formatPnl(pick.pnl)));
      }
      card.appendChild(footer);
    }

    return card;
  }

  // ============================================
  // Filter & sort helpers
  // ============================================

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
      dot.style.background = GP.BOOK_COLORS[bookKey] || '#8d95a3';

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
      case 'direction':
        sorted.sort(function (a, b) {
          var da = a.direction === 'OVER' ? 0 : 1;
          var db = b.direction === 'OVER' ? 0 : 1;
          return da - db;
        });
        break;
      case 'player':
        sorted.sort(function (a, b) {
          return String(a.player || '').localeCompare(String(b.player || ''));
        });
        break;
      case 'market':
      default:
        sorted.sort(function (a, b) {
          return String(a.market || '').localeCompare(String(b.market || ''));
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

  // ============================================
  // Main picks rendering
  // ============================================

  function renderPicksWithFilters() {
    var container = document.getElementById('picks-container');
    var emptyEl = document.getElementById('picks-empty');
    var summary = document.getElementById('books-filter-summary');
    var offseasonHero = document.getElementById('offseason-hero');
    var picksControls = document.getElementById('picks-controls');
    if (!container || !emptyEl) return;

    clearChildren(container);
    var allPicks = picksState.allPicks || [];
    var filtered = getFilteredPicks();
    filtered = applyMarketFilter(filtered);
    filtered = sortPicks(filtered, picksState.sortBy);

    if (offseasonHero) offseasonHero.style.display = 'none';

    if (allPicks.length === 0) {
      container.style.display = 'none';
      emptyEl.style.display = '';
      if (picksControls) picksControls.style.display = 'none';

      if (!GP.isArchiveSeason() && offseasonHero) {
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
    if (picksControls) picksControls.style.display = '';

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
          game_time: pick.game_time || null
        };
        gameOrder.push(key);
      }
      gameGroups[key].picks.push(pick);
    });

    // Group games by slate (game start time)
    var slateGroups = {};
    var slateOrder = [];
    gameOrder.forEach(function (key) {
      var group = gameGroups[key];
      var slateKey = group.game_time || '_ungrouped';
      if (!slateGroups[slateKey]) {
        slateGroups[slateKey] = { label: group.game_time, games: [] };
        slateOrder.push(slateKey);
      }
      slateGroups[slateKey].games.push(key);
    });

    function parseTimeMinutes(label) {
      if (!label) return 9999;
      var m = label.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (!m) return 9999;
      var hours = parseInt(m[1], 10);
      var mins = parseInt(m[2], 10);
      var ampm = m[3].toUpperCase();
      if (ampm === 'PM' && hours !== 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
      return hours * 60 + mins;
    }

    slateOrder.sort(function (a, b) {
      return parseTimeMinutes(slateGroups[a].label) - parseTimeMinutes(slateGroups[b].label);
    });

    slateOrder.forEach(function (slateKey) {
      slateGroups[slateKey].games.sort(function (a, b) {
        return gameGroups[b].picks.length - gameGroups[a].picks.length;
      });
    });

    var hasMultipleSlates = slateOrder.length > 1 || (slateOrder.length === 1 && slateOrder[0] !== '_ungrouped');

    slateOrder.forEach(function (slateKey) {
      var slate = slateGroups[slateKey];

      if (hasMultipleSlates && slate.label) {
        var slateHeader = el('div', 'time-slate-header');
        slateHeader.appendChild(el('span', 'time-slate-label', slate.label));
        container.appendChild(slateHeader);
      }

      slate.games.forEach(function (gameKey) {
        var group = gameGroups[gameKey];
        var section = el('div', 'game-slate-group');

        var header = el('div', 'game-slate-header');
        header.appendChild(createTeamBadge(normalizeTeamCode(group.away_team), 'left'));
        header.appendChild(el('span', 'matchup-vs', 'at'));
        header.appendChild(createTeamBadge(normalizeTeamCode(group.home_team), 'right'));
        section.appendChild(header);

        var grid = el('div', 'picks-grid');
        group.picks.forEach(function (pick) {
          grid.appendChild(renderPickCard(pick));
        });
        section.appendChild(grid);
        container.appendChild(section);
      });
    });
    if (summary) {
      summary.textContent = 'Showing ' + filtered.length + ' of ' + allPicks.length + ' picks';
    }
    GP.reobserveReveals();
  }

  // ============================================
  // Backtest date picker / calendar
  // ============================================

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
        btn.title = formatFullDate(dateKey) + ' \u2022 ' + count + ' picks';
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

  function initBacktestDatePicker() {
    var picker = document.getElementById('backtest-date-picker');
    var trigger = document.getElementById('backtest-date-trigger');
    var popover = document.getElementById('backtest-calendar-popover');
    var prevBtn = document.getElementById('backtest-prev-month');
    var nextBtn = document.getElementById('backtest-next-month');
    if (!picker || !trigger || !popover || !prevBtn || !nextBtn) return;

    fetch(GP.getDataPath('picks_index.json'))
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
      dateEl.textContent = formatFullDate(dateStr) + ' \u2022 ' + count + ' picks \u2022 ' + GP.getSeason() + ' Archive';
    }

    if (container) GP.showLoadingSkeletons(container, 4);

    fetch(GP.getDataPath('picks/' + dateStr + '.json'))
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

  // ============================================
  // Page init
  // ============================================

  GP.initPicksPage = function () {
    var container = document.getElementById('picks-container');
    if (!container) return;

    initPicksSort();

    var viewResultsBtn = document.getElementById('view-2025-results-btn');
    if (viewResultsBtn) {
      viewResultsBtn.addEventListener('click', function () {
        GP.setSeason('2025');
        window.location.href = 'results.html';
      });
    }

    var browseBtn = document.getElementById('browse-backtest-btn');
    if (browseBtn) {
      browseBtn.addEventListener('click', function () {
        GP.setSeason('2025');
        location.reload();
      });
    }

    if (GP.isArchiveSeason()) {
      var titleEl = document.getElementById('picks-title');
      if (titleEl) titleEl.textContent = GP.getSeason() + ' Season Picks';
      initBacktestDatePicker();
      return;
    }

    GP.showLoadingSkeletons(container, 4);

    GP.fetchJSON('picks_today.json', function (data, err) {
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
  };

})();
