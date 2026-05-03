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
  var americanToImplied = GP.americanToImplied;
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
    schedule: null,
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
    if (!playerName) return '?';
    var parts = playerName.split(', ');
    if (parts.length === 2) {
      return (parts[1].charAt(0) + parts[0].charAt(0)).toUpperCase();
    }
    return playerName.charAt(0).toUpperCase();
  }

  function bbrefUrl(bbrefId) {
    return 'https://www.baseball-reference.com/players/' + bbrefId.charAt(0) + '/' + bbrefId + '.shtml';
  }

  function wrapInBbrefLink(element, bbrefId) {
    var a = document.createElement('a');
    a.href = bbrefUrl(bbrefId);
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.appendChild(element);
    return a;
  }

  function createPlayerAvatar(pick) {
    var avatar;
    if (pick.player_id) {
      var img = document.createElement('img');
      img.className = 'player-headshot';
      img.alt = pick.player;
      img.loading = 'lazy';
      img.src = 'https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/' + pick.player_id + '/headshot/67/current';
      img.onerror = function () {
        var initials = el('div', 'player-initials', getPlayerInitials(pick.player));
        var parent = img.parentNode;
        parent.replaceChild(initials, img);
      };
      avatar = img;
    } else {
      avatar = el('div', 'player-initials', getPlayerInitials(pick.player));
    }
    return pick.bbref_id ? wrapInBbrefLink(avatar, pick.bbref_id) : avatar;
  }

  function formatPlayerName(name) {
    if (!name) return '';
    var parts = name.split(', ');
    if (parts.length === 2) return parts[1] + ' ' + parts[0];
    return name;
  }

  function renderPickCard(pick) {
    var card = el('div', 'pick-card');
    if (pick.category === 'batter') {
      card.classList.add('pick-card--batter');
    }
    if (pick.game_pk) card.setAttribute('data-game-pk', pick.game_pk);
    if (pick.player_id) card.setAttribute('data-player-id', pick.player_id);
    if (pick.market) card.setAttribute('data-market', pick.market);
    card.setAttribute('data-category', pick.category || 'pitcher');
    if (pick.line != null) card.setAttribute('data-line', pick.line);
    if (pick.direction) card.setAttribute('data-direction', pick.direction);

    var header = el('div', 'pick-card-header');
    header.appendChild(createPlayerAvatar(pick));
    var headerInfo = el('div', 'pick-card-header-info');
    var headerLeft = el('div');
    var playerDiv = el('div', 'pick-card-player');
    if (pick.bbref_id) {
      var playerLink = document.createElement('a');
      playerLink.href = bbrefUrl(pick.bbref_id);
      playerLink.target = '_blank';
      playerLink.rel = 'noopener noreferrer';
      playerLink.textContent = formatPlayerName(pick.player);
      playerDiv.appendChild(playerLink);
    } else {
      playerDiv.textContent = formatPlayerName(pick.player);
    }
    if (pick.injury_flag) {
      var injBadge = document.createElement('span');
      injBadge.className = 'injury-badge';
      injBadge.textContent = 'INJ';
      injBadge.title = pick.injury_note || 'Injury concern';
      playerDiv.appendChild(injBadge);
    }
    headerLeft.appendChild(playerDiv);
    var roleText = pick.category === 'batter' ? 'Batter' : 'Starting Pitcher';
    var roleDiv = el('div', 'pick-card-role');
    var teamCode = getPlayerTeamCode(pick);
    if (teamCode) {
      var teamLogoUrl = getTeamLogoUrl(teamCode);
      if (teamLogoUrl) {
        var teamLogo = document.createElement('img');
        teamLogo.className = 'pick-card-role-logo';
        teamLogo.src = teamLogoUrl;
        teamLogo.alt = teamCode;
        teamLogo.loading = 'lazy';
        teamLogo.onerror = function () { teamLogo.style.display = 'none'; };
        roleDiv.appendChild(teamLogo);
      }
      roleDiv.appendChild(el('span', 'pick-card-role-team', teamCode));
      roleDiv.appendChild(el('span', 'pick-card-role-sep', '\u00b7'));
    }
    roleDiv.appendChild(document.createTextNode(roleText));
    headerLeft.appendChild(roleDiv);
    headerInfo.appendChild(headerLeft);
    header.appendChild(headerInfo);
    card.appendChild(header);

    var matchupRow = createMatchupRow(pick);
    if (matchupRow) card.appendChild(matchupRow);

    var body = el('div', 'pick-card-body');
    var callWrapper = el('div', 'pick-call-wrapper');
    callWrapper.appendChild(el('span', 'pick-call-label', 'The Call'));
    var dirClass = pick.direction === 'OVER' ? 'over' : 'under';
    callWrapper.appendChild(el('span', 'pick-direction ' + dirClass, pick.direction));
    if (pick.sizing && pick.sizing > 0) {
      var sizingText = pick.sizing === Math.floor(pick.sizing) ? pick.sizing + 'x' : pick.sizing.toFixed(1) + 'x';
      callWrapper.appendChild(el('span', 'pick-sizing', sizingText));
    }
    body.appendChild(callWrapper);
    body.appendChild(el('span', 'pick-line', String(pick.line)));
    body.appendChild(el('span', 'pick-card-market', pick.market));
    card.appendChild(body);

    // Locked-vs-current price comparison. pick.best_price is what we locked
    // at queue/placement time (immutable in paper_trades.csv). The current
    // best market price comes from pick.book_prices[0] (refreshed each cycle).
    // If implied prob has risen since lock, the market is moving toward our
    // side — we beat the closing line. If implied has fallen, market beat us.
    var lockedPrice = pick.best_price;
    var currentBest = (pick.book_prices && pick.book_prices.length > 0)
      ? pick.book_prices[0].price : null;
    if (lockedPrice != null && currentBest != null && lockedPrice !== currentBest && !pick.result) {
      var lockedImpl = americanToImplied(lockedPrice);
      var currentImpl = americanToImplied(currentBest);
      var deltaPct = (currentImpl - lockedImpl) * 100;
      var weBeatMarket = deltaPct > 0;
      var driftDiv = el('div', 'pick-card-drift ' + (weBeatMarket ? 'beat-market' : 'market-beat'));
      driftDiv.appendChild(el('span', 'pick-drift-label', 'Locked'));
      driftDiv.appendChild(el('span', 'pick-drift-locked', formatPrice(lockedPrice)));
      driftDiv.appendChild(el('span', 'pick-drift-arrow', '→'));
      driftDiv.appendChild(el('span', 'pick-drift-label', 'Now'));
      driftDiv.appendChild(el('span', 'pick-drift-current', formatPrice(currentBest)));
      var deltaSign = deltaPct > 0 ? '+' : '';
      driftDiv.appendChild(el('span', 'pick-drift-delta',
        '(' + deltaSign + deltaPct.toFixed(1) + 'pp)'));
      card.appendChild(driftDiv);
    }

    var isConsensus = pick.best_book && pick.best_book.toLowerCase() === 'consensus';
    if (pick.book_prices && pick.book_prices.length > 0) {
      var booksDiv = el('div', 'pick-card-books');
      for (var bi = 0; bi < pick.book_prices.length; bi++) {
        var bp = pick.book_prices[bi];
        var bookKey = bp.book.toLowerCase();
        var bookColor = GP.BOOK_COLORS[bookKey] || '#8d95a3';
        var row = el('span', 'pick-book-entry' + (bi === 0 ? ' pick-book-best' : ''));
        var dot = el('span', 'book-dot');
        dot.style.background = bookColor;
        row.appendChild(dot);
        var displayName = GP.BOOK_DISPLAY[bookKey] || bp.book;
        row.appendChild(document.createTextNode(displayName + ' '));
        if (bp.line != null) {
          var lineStr = bp.line % 1 === 0 ? bp.line.toFixed(1) : String(bp.line);
          row.appendChild(el('span', 'pick-book-altline', lineStr + ' '));
        }
        row.appendChild(el('span', 'pick-card-price', formatPrice(bp.price)));
        booksDiv.appendChild(row);
      }
      card.appendChild(booksDiv);
    } else if (pick.best_book || pick.best_price !== null) {
      var bookDiv = el('div', 'pick-card-book');
      if (pick.best_book && !isConsensus) {
        var bookKey = pick.best_book.toLowerCase();
        var bookColor = GP.BOOK_COLORS[bookKey] || '#8d95a3';
        var dot = el('span', 'book-dot');
        dot.style.background = bookColor;
        bookDiv.appendChild(dot);
        var displayName = GP.BOOK_DISPLAY[bookKey] || pick.best_book;
        bookDiv.appendChild(document.createTextNode(displayName + ' '));
      } else if (!pick.best_book && pick.best_price !== null && pick.best_price !== undefined) {
        bookDiv.appendChild(document.createTextNode('Best Price '));
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
      card.appendChild(footer);
    }

    // Early-season batter prop notice (remove after ~2 weeks of data)
    if (pick.category === 'batter' && !GP.isArchiveSeason()) {
      var notice = el('div', 'pick-card-notice');
      notice.textContent = 'Early season \u2014 batter models are still calibrating with limited 2026 data. Expect higher variance.';
      card.appendChild(notice);
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
      if (!key) return true;
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
    var picksControls = document.getElementById('picks-controls');
    if (!container || !emptyEl) return;

    clearChildren(container);
    var allPicks = picksState.allPicks || [];
    var schedule = picksState.schedule || null;
    var filtered = getFilteredPicks();
    filtered = applyMarketFilter(filtered);
    filtered = sortPicks(filtered, picksState.sortBy);

    // If we have a schedule (live season), render game-by-game
    if (schedule && !GP.isArchiveSeason()) {
      // No games today
      if (schedule.length === 0 && allPicks.length === 0) {
        container.style.display = 'none';
        emptyEl.style.display = '';
        if (picksControls) picksControls.style.display = 'none';
        setPicksEmptyState('Off Day', 'No games scheduled today.');
        if (summary) summary.textContent = '';
        return;
      }

      container.style.display = '';
      emptyEl.style.display = 'none';
      if (picksControls) picksControls.style.display = allPicks.length > 0 ? '' : 'none';

      // Group filtered picks by game_pk
      var picksByGame = {};
      filtered.forEach(function (pick) {
        var key = pick.game_pk;
        if (!key) return;
        if (!picksByGame[key]) picksByGame[key] = [];
        picksByGame[key].push(pick);
      });

      // Build game list from schedule, attach picks
      var games = schedule.map(function (g) {
        return {
          game_pk: g.game_pk,
          away_team: g.away_team,
          home_team: g.home_team,
          away_pitcher: g.away_pitcher,
          home_pitcher: g.home_pitcher,
          game_time: g.game_time,
          game_date_utc: g.game_date_utc,
          status: g.status,
          detailedState: g.detailedState || '',
          away_score: g.away_score,
          home_score: g.home_score,
          picks: picksByGame[g.game_pk] || []
        };
      });

      // Add any picks with game_pk not in schedule (edge case)
      var scheduledPks = {};
      schedule.forEach(function (g) { scheduledPks[g.game_pk] = true; });
      var orphanPicks = filtered.filter(function (p) {
        return p.game_pk && !scheduledPks[p.game_pk];
      });
      if (orphanPicks.length > 0) {
        var orphanGroups = {};
        orphanPicks.forEach(function (p) {
          var key = p.game_pk;
          if (!orphanGroups[key]) {
            orphanGroups[key] = {
              game_pk: key,
              away_team: p.away_team || '',
              home_team: p.home_team || '',
              away_pitcher: null,
              home_pitcher: null,
              game_time: p.game_time || null,
              game_date_utc: null,
              status: 'Preview',
              picks: []
            };
          }
          orphanGroups[key].picks.push(p);
        });
        Object.keys(orphanGroups).forEach(function (k) {
          games.push(orphanGroups[k]);
        });
      }

      // Sort games by start time
      games.sort(function (a, b) {
        if (a.game_date_utc && b.game_date_utc) {
          return new Date(a.game_date_utc) - new Date(b.game_date_utc);
        }
        return 0;
      });

      // Group into time slates
      var slateGroups = {};
      var slateOrder = [];
      games.forEach(function (g) {
        var slateKey = g.game_time || '_ungrouped';
        if (!slateGroups[slateKey]) {
          slateGroups[slateKey] = { label: g.game_time, games: [] };
          slateOrder.push(slateKey);
        }
        slateGroups[slateKey].games.push(g);
      });

      var hasMultipleSlates = slateOrder.length > 1 ||
        (slateOrder.length === 1 && slateOrder[0] !== '_ungrouped');

      slateOrder.forEach(function (slateKey) {
        var slate = slateGroups[slateKey];

        if (hasMultipleSlates && slate.label) {
          var slateHeader = el('div', 'time-slate-header');
          slateHeader.appendChild(el('span', 'time-slate-label', slate.label));
          container.appendChild(slateHeader);
        }

        slate.games.forEach(function (game) {
          var section = el('div', 'game-slate-group');
          section.setAttribute('data-game-pk', game.game_pk);

          // Game header: away [score] @ [score] home
          var header = el('div', 'game-slate-header');
          header.setAttribute('data-game-pk', game.game_pk);
          header.appendChild(createTeamBadge(normalizeTeamCode(game.away_team), 'left'));
          if (game.away_score != null && game.home_score != null) {
            header.appendChild(el('span', 'game-score away-score', String(game.away_score)));
          }
          header.appendChild(el('span', 'matchup-vs', '@'));
          if (game.away_score != null && game.home_score != null) {
            header.appendChild(el('span', 'game-score home-score', String(game.home_score)));
          }
          header.appendChild(createTeamBadge(normalizeTeamCode(game.home_team), 'right'));
          section.appendChild(header);

          // Probable pitchers row
          var awayP = formatPitcherShortName(game.away_pitcher);
          var homeP = formatPitcherShortName(game.home_pitcher);
          if (awayP || homeP) {
            var pitcherRow = el('div', 'game-slate-pitchers');
            pitcherRow.textContent = (awayP || 'TBD') + '  vs  ' + (homeP || 'TBD');
            section.appendChild(pitcherRow);
          }

          if (game.picks.length > 0) {
            // Render pick cards
            var grid = el('div', 'picks-grid');
            game.picks.forEach(function (pick) {
              grid.appendChild(renderPickCard(pick));
            });
            section.appendChild(grid);
          } else {
            // Placeholder
            var placeholder = el('div', 'game-placeholder', getGamePlaceholderText(game));
            section.appendChild(placeholder);
          }

          container.appendChild(section);
        });
      });

      if (summary) {
        summary.textContent = allPicks.length > 0
          ? 'Showing ' + filtered.length + ' of ' + allPicks.length + ' picks'
          : '';
      }
      GP.reobserveReveals();
      if (typeof GP.initLiveTracker === 'function' && !GP.isArchiveSeason()) {
        GP.initLiveTracker(picksState.schedule);
      }
      return;
    }

    // Fallback: no schedule (archive mode or fetch failed) — original behavior
    if (allPicks.length === 0) {
      container.style.display = 'none';
      emptyEl.style.display = '';
      if (picksControls) picksControls.style.display = 'none';
      setPicksEmptyState(
        'Rain Delay',
        'No picks on this date. The models found no edges worth swinging at.'
      );
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

    // Group picks by game_pk (existing logic for archive/fallback)
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

    var slateGroupsFB = {};
    var slateOrderFB = [];
    gameOrder.forEach(function (key) {
      var group = gameGroups[key];
      var slateKey = group.game_time || '_ungrouped';
      if (!slateGroupsFB[slateKey]) {
        slateGroupsFB[slateKey] = { label: group.game_time, games: [] };
        slateOrderFB.push(slateKey);
      }
      slateGroupsFB[slateKey].games.push(key);
    });

    slateOrderFB.sort(function (a, b) {
      return parseTimeMinutes(slateGroupsFB[a].label) - parseTimeMinutes(slateGroupsFB[b].label);
    });

    slateOrderFB.forEach(function (slateKey) {
      slateGroupsFB[slateKey].games.sort(function (a, b) {
        return gameGroups[b].picks.length - gameGroups[a].picks.length;
      });
    });

    var hasMultipleSlatesFB = slateOrderFB.length > 1 || (slateOrderFB.length === 1 && slateOrderFB[0] !== '_ungrouped');

    slateOrderFB.forEach(function (slateKey) {
      var slate = slateGroupsFB[slateKey];

      if (hasMultipleSlatesFB && slate.label) {
        var slateHeader = el('div', 'time-slate-header');
        slateHeader.appendChild(el('span', 'time-slate-label', slate.label));
        container.appendChild(slateHeader);
      }

      slate.games.forEach(function (gameKey) {
        var group = gameGroups[gameKey];
        var section = el('div', 'game-slate-group');

        var header = el('div', 'game-slate-header');
        header.appendChild(createTeamBadge(normalizeTeamCode(group.away_team), 'left'));
        header.appendChild(el('span', 'matchup-vs', '@'));
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

    var calendarModel = SiteLogic.computeCalendarDays(picksState.backtestIndex, picksState.selectedBacktestDate);
    var fillerCount = calendarModel.fillers;
    for (var i = 0; i < fillerCount; i++) {
      grid.appendChild(el('span', 'calendar-day filler', ''));
    }
    var entries = calendarModel.days;

    entries.forEach(function (entry) {
      var dateKey = entry.dateKey;
      var count = entry.count;
      var isAvailable = entry.isAvailable;
      var isClickable = entry.isClickable;

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'calendar-day';
      btn.textContent = String(entry.day);
      btn.disabled = !isClickable;
      btn.setAttribute('aria-label', formatFullDate(dateKey));

      if (isAvailable) {
        btn.classList.add('has-picks');
        btn.style.backgroundColor = 'rgba(37, 99, 235, ' + Number(entry.alpha).toFixed(3) + ')';
        btn.title = formatFullDate(dateKey) + ' \u2022 ' + count + ' picks';
      } else {
        btn.classList.add('empty');
        if (isClickable) {
          btn.classList.add('is-clickable');
          btn.title = formatFullDate(dateKey);
        }
      }

      if (isClickable) {
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
        btn.setAttribute('aria-selected', 'true');
      } else {
        btn.setAttribute('aria-selected', 'false');
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

    GP.supabase.rpc('picks_index', { p_season: GP.getSeasonInt() })
      .then(function (res) {
        if (res.error || !res.data || res.data.length === 0) {
          setStatusText('picks-status', 'No date index available for this season.');
          return;
        }
        var index = { dates: res.data };

        var builtIndex = SiteLogic.buildBacktestIndex(index, {
          seasonYear: GP.getSeasonInt(),
          isLiveSeason: !GP.isArchiveSeason()
        });
        if (!builtIndex) {
          setStatusText('picks-status', 'No date index available for this season.');
          return;
        }
        // For the current season, default to today instead of last date.
        var defaultDate = builtIndex.selectedBacktestDate;
        if (!GP.isArchiveSeason()) {
          var now = new Date();
          var todayStr = now.getFullYear() + '-' +
            String(now.getMonth() + 1).padStart(2, '0') + '-' +
            String(now.getDate()).padStart(2, '0');
          defaultDate = todayStr;
          builtIndex.viewYear = now.getFullYear();
          builtIndex.viewMonth = now.getMonth();
        }
        picksState.backtestIndex = {
          dates: builtIndex.dates,
          countByDate: builtIndex.countByDate,
          maxCount: builtIndex.maxCount,
          minMonthIdx: builtIndex.minMonthIdx,
          maxMonthIdx: builtIndex.maxMonthIdx,
          viewYear: builtIndex.viewYear,
          viewMonth: builtIndex.viewMonth,
          isLiveSeason: builtIndex.isLiveSeason,
          seasonStart: builtIndex.seasonStart,
          seasonEnd: builtIndex.seasonEnd
        };
        picksState.selectedBacktestDate = defaultDate;

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
    if (typeof GP.stopLiveTracker === 'function') GP.stopLiveTracker();
    var dateEl = document.getElementById('picks-date');
    var container = document.getElementById('picks-container');
    var count = picksState.backtestIndex && picksState.backtestIndex.countByDate[dateStr]
      ? picksState.backtestIndex.countByDate[dateStr]
      : 0;

    if (container) GP.showLoadingSkeletons(container, 4);

    var picksPromise = GP.supabase.from('picks').select('*')
      .eq('season', GP.getSeasonInt())
      .eq('date', dateStr)
      .order('stars', { ascending: false })
      .then(function (res) { return res.data || []; })
      .catch(function () { return []; });

    // Fetch schedule for current season (game times, probable pitchers)
    var schedulePromise = GP.isArchiveSeason()
      ? Promise.resolve(null)
      : fetchTodaySchedule(dateStr);

    Promise.all([picksPromise, schedulePromise]).then(function (results) {
      var picks = results[0];
      var schedule = results[1];

      if (dateEl) {
        var parts = [formatFullDate(dateStr)];
        if (picks.length > 0) parts.push(picks.length + ' picks');
        if (schedule) parts.push(schedule.length + ' games');
        dateEl.textContent = parts.join(' \u2022 ');
      }

      picksState.allPicks = picks;
      picksState.schedule = schedule;
      syncBookFilterState();
      renderBooksFilterPanel();
      initMarketFilter(picks);
      renderPicksWithFilters();
      setStatusText('picks-status', '');
    }).catch(function () {
      picksState.allPicks = [];
      picksState.schedule = null;
      renderBooksFilterPanel();
      renderPicksWithFilters();
      setStatusText('picks-status', 'Could not load picks for this date.');
    });
  }

  // ============================================
  // Schedule helpers
  // ============================================

  function fetchTodaySchedule(dateStr) {
    var url = 'https://statsapi.mlb.com/api/v1/schedule?date=' + dateStr +
      '&sportId=1&hydrate=team,probablePitcher';
    return fetch(url)
      .then(function (resp) {
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        return resp.json();
      })
      .then(function (data) {
        var games = [];
        var dates = data.dates || [];
        if (dates.length === 0) return games;
        (dates[0].games || []).forEach(function (g) {
          var away = g.teams.away || {};
          var home = g.teams.home || {};
          var awayAbbr = (away.team || {}).abbreviation || '';
          var homeAbbr = (home.team || {}).abbreviation || '';
          var awayPitcher = (away.probablePitcher || {}).fullName || null;
          var homePitcher = (home.probablePitcher || {}).fullName || null;
          var gameDate = new Date(g.gameDate);
          var timeStr = gameDate.toLocaleTimeString('en-US', {
            hour: 'numeric', minute: '2-digit', hour12: true, timeZoneName: 'short'
          });
          games.push({
            game_pk: g.gamePk,
            away_team: awayAbbr,
            home_team: homeAbbr,
            away_pitcher: awayPitcher,
            home_pitcher: homePitcher,
            game_time: timeStr,
            game_date_utc: g.gameDate,
            status: (g.status || {}).abstractGameState || 'Preview',
            detailedState: (g.status || {}).detailedState || '',
            away_score: away.score != null ? away.score : null,
            home_score: home.score != null ? home.score : null
          });
        });
        return games;
      })
      .catch(function (err) {
        console.warn('Schedule fetch failed:', err);
        return null;
      });
  }

  function formatPitcherShortName(fullName) {
    if (!fullName) return null;
    var parts = fullName.split(' ');
    if (parts.length < 2) return fullName;
    return parts[0].charAt(0) + '. ' + parts[parts.length - 1];
  }

  function getGamePlaceholderText(game) {
    var ds = game.detailedState || '';
    if (ds.indexOf('Postponed') !== -1) {
      return 'Game postponed';
    }
    var now = new Date();
    var gameStart = new Date(game.game_date_utc);
    var hoursUntil = (gameStart - now) / (1000 * 60 * 60);
    if (hoursUntil > 3) {
      return 'Picks appear ~3 hours before first pitch';
    }
    return 'No picks for this game';
  }

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

  // ============================================
  // Page init
  // ============================================

  GP.initPicksPage = function () {
    var container = document.getElementById('picks-container');
    if (!container) return;

    var urlSeason = new URLSearchParams(window.location.search).get('season');
    if (urlSeason) {
      GP.setSeason(urlSeason);
    } else {
      GP.setSeason(GP.CURRENT_SEASON);
    }

    GP.updateSeasonBanner();
    var resolvedSeason = GP.getSeason();
    document.querySelectorAll('.season-pill-btn').forEach(function (btn) {
      var isActive = btn.getAttribute('data-season') === resolvedSeason;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    initPicksSort();

    if (GP.isArchiveSeason()) {
      var titleEl = document.getElementById('picks-title');
      if (titleEl) titleEl.textContent = GP.getSeason() + ' Season Picks';
    }

    initBacktestDatePicker();
  };

})();
