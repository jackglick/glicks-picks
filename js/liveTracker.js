/* ============================================
   Glick's Picks — Live Game Tracker
   Polls MLB Stats API for in-progress games
   and updates pick cards with real-time stats.
   ============================================ */
(function () {
  'use strict';

  var GP = window.GP;
  var el = GP.el;

  var SCHEDULE_POLL_MS = 60000;
  var BOXSCORE_POLL_MS = 30000;
  var MAX_ERRORS = 5;
  var BACKOFF_THRESHOLD = 3;

  var MARKET_STAT_MAP = {
    'Strikeouts':         { type: 'pitching', field: 'strikeOuts',   abbrev: 'K' },
    'Earned Runs':        { type: 'pitching', field: 'earnedRuns',   abbrev: 'ER' },
    'Outs Recorded':      { type: 'pitching', field: 'outs',         abbrev: 'Outs' },
    'Hits Allowed':       { type: 'pitching', field: 'hits',         abbrev: 'H' },
    'Walks':              { type: 'pitching', field: 'baseOnBalls',  abbrev: 'BB' },
    'Hits':               { type: 'batting',  field: 'hits',         abbrev: 'H' },
    'Total Bases':        { type: 'batting',  field: 'totalBases',   abbrev: 'TB' }
  };

  var liveState = {
    active: false,
    scheduleTimerId: null,
    gameTimers: {},
    gameCache: {},
    gameStatuses: {},
    errorCounts: {},
    lastStatValues: {}
  };

  // ============================================
  // Entry point
  // ============================================

  GP.initLiveTracker = function (schedule) {
    if (GP.isArchiveSeason()) return;
    if (!schedule || !schedule.length) return;

    var hasLiveOrPreview = schedule.some(function (g) {
      return g.status === 'Live' || g.status === 'Preview';
    });
    if (!hasLiveOrPreview) return;

    GP.stopLiveTracker();

    liveState.active = true;

    schedule.forEach(function (g) {
      liveState.gameStatuses[g.game_pk] = g.status;
    });

    var liveGames = schedule.filter(function (g) { return g.status === 'Live'; });
    startBoxscorePolling(liveGames);

    liveGames.forEach(function (g) {
      updateGameSlateHeader(g.game_pk, 'Live', null, '');
    });

    liveState.scheduleTimerId = setInterval(pollSchedule, SCHEDULE_POLL_MS);
    document.addEventListener('visibilitychange', handleVisibilityChange);
  };

  GP.stopLiveTracker = function () {
    liveState.active = false;

    if (liveState.scheduleTimerId) {
      clearInterval(liveState.scheduleTimerId);
      liveState.scheduleTimerId = null;
    }

    Object.keys(liveState.gameTimers).forEach(function (pk) {
      clearInterval(liveState.gameTimers[pk]);
    });

    liveState.gameTimers = {};
    liveState.gameCache = {};
    liveState.gameStatuses = {};
    liveState.errorCounts = {};
    liveState.lastStatValues = {};

    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };

  // ============================================
  // Schedule polling
  // ============================================

  function pollSchedule() {
    if (!liveState.active) return;

    var today = new Date();
    var dateStr = today.getFullYear() + '-' +
      String(today.getMonth() + 1).padStart(2, '0') + '-' +
      String(today.getDate()).padStart(2, '0');

    var url = 'https://statsapi.mlb.com/api/v1/schedule?date=' + dateStr + '&sportId=1';
    fetch(url)
      .then(function (resp) {
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        return resp.json();
      })
      .then(function (data) {
        if (!liveState.active) return;
        var dates = data.dates || [];
        if (dates.length === 0) return;

        var newlyLive = [];
        var newlyFinal = [];

        (dates[0].games || []).forEach(function (g) {
          var pk = g.gamePk;
          var status = (g.status || {}).abstractGameState || 'Preview';
          var prev = liveState.gameStatuses[pk];
          liveState.gameStatuses[pk] = status;

          if (status === 'Live' && prev !== 'Live') {
            newlyLive.push({ game_pk: pk });
          }
          if (status === 'Final' && prev !== 'Final') {
            newlyFinal.push(pk);
          }

          var detailedState = (g.status || {}).detailedState || '';
          updateGameSlateHeader(pk, status, null, detailedState);
        });

        if (newlyLive.length > 0) {
          startBoxscorePolling(newlyLive);
        }

        newlyFinal.forEach(function (pk) {
          pollGameBoxscore(pk).then(function () {
            stopGamePolling(pk);
          });
        });

        var anyActive = Object.keys(liveState.gameStatuses).some(function (pk) {
          var s = liveState.gameStatuses[pk];
          return s === 'Live' || s === 'Preview';
        });
        if (!anyActive) {
          GP.stopLiveTracker();
        }
      })
      .catch(function (err) {
        console.warn('[LiveTracker] Schedule poll failed:', err);
      });
  }

  // ============================================
  // Per-game boxscore polling
  // ============================================

  function startBoxscorePolling(games) {
    games.forEach(function (g, i) {
      var pk = g.game_pk;
      if (liveState.gameTimers[pk]) return;

      liveState.errorCounts[pk] = 0;

      var staggerMs = i * Math.min(10000, BOXSCORE_POLL_MS / Math.max(games.length, 1));

      setTimeout(function () {
        if (!liveState.active) return;
        pollGameBoxscore(pk);
        liveState.gameTimers[pk] = setInterval(function () {
          if (!liveState.active) return;
          pollGameBoxscore(pk);
        }, getGamePollInterval(pk));
      }, staggerMs);
    });
  }

  function getGamePollInterval(pk) {
    var errs = liveState.errorCounts[pk] || 0;
    if (errs >= BACKOFF_THRESHOLD) return BOXSCORE_POLL_MS * 2;
    return BOXSCORE_POLL_MS;
  }

  function stopGamePolling(pk) {
    if (liveState.gameTimers[pk]) {
      clearInterval(liveState.gameTimers[pk]);
      delete liveState.gameTimers[pk];
    }
  }

  function pollGameBoxscore(pk) {
    var url = 'https://statsapi.mlb.com/api/v1.1/game/' + pk + '/feed/live';
    return fetch(url)
      .then(function (resp) {
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        return resp.json();
      })
      .then(function (data) {
        if (!liveState.active) return;
        liveState.errorCounts[pk] = 0;
        liveState.gameCache[pk] = data;

        var linescore = (data.liveData || {}).linescore || null;
        var status = ((data.gameData || {}).status || {}).abstractGameState || 'Live';
        var detailedState = ((data.gameData || {}).status || {}).detailedState || '';
        updateGameSlateHeader(pk, status, linescore, detailedState);

        updateCardsForGame(pk, data);
      })
      .catch(function (err) {
        console.warn('[LiveTracker] Boxscore fetch failed for game ' + pk + ':', err);
        liveState.errorCounts[pk] = (liveState.errorCounts[pk] || 0) + 1;
        if (liveState.errorCounts[pk] >= MAX_ERRORS) {
          console.warn('[LiveTracker] Giving up on game ' + pk + ' after ' + MAX_ERRORS + ' failures');
          stopGamePolling(pk);
        }
      });
  }

  // ============================================
  // Stat extraction
  // ============================================

  function extractPlayerStat(liveFeed, playerId, marketConfig) {
    var playerKey = 'ID' + playerId;
    var boxscore = ((liveFeed || {}).liveData || {}).boxscore;
    if (!boxscore) return null;

    var sides = ['home', 'away'];
    for (var i = 0; i < sides.length; i++) {
      var teamPlayers = ((boxscore.teams || {})[sides[i]] || {}).players || {};
      var player = teamPlayers[playerKey];
      if (!player) continue;

      var stats = player.stats || {};
      var group = stats[marketConfig.type] || {};
      var val = group[marketConfig.field];
      if (val !== undefined) return Number(val);
    }
    return null;
  }

  // ============================================
  // DOM updates — pick cards
  // ============================================

  function updateCardsForGame(gamePk, liveFeed) {
    var cards = document.querySelectorAll('.pick-card[data-game-pk="' + gamePk + '"]');
    for (var i = 0; i < cards.length; i++) {
      updateSingleCard(cards[i], liveFeed);
    }
  }

  function updateSingleCard(card, liveFeed) {
    var playerId = card.getAttribute('data-player-id');
    var market = card.getAttribute('data-market');
    var line = parseFloat(card.getAttribute('data-line'));
    var direction = card.getAttribute('data-direction');

    if (!playerId || !market) return;

    var marketConfig = MARKET_STAT_MAP[market];
    if (!marketConfig) return;

    var stat = extractPlayerStat(liveFeed, playerId, marketConfig);

    // Find or create the live stat element
    var liveEl = card.querySelector('.pick-card-live');
    if (!liveEl) {
      liveEl = document.createElement('div');
      liveEl.className = 'pick-card-live';

      var insertBefore = card.querySelector('.pick-card-books') ||
        card.querySelector('.pick-card-book') ||
        card.querySelector('.pick-card-footer') ||
        card.querySelector('.pick-card-notice') ||
        null;
      if (insertBefore) {
        card.insertBefore(liveEl, insertBefore);
      } else {
        card.appendChild(liveEl);
      }
    }

    if (stat === null) {
      clearChildren(liveEl);
      liveEl.appendChild(el('span', 'live-stat-pending', '\u2014'));
      return;
    }

    // Skip DOM write if value unchanged
    var cacheKey = card.getAttribute('data-game-pk') + ':' + playerId + ':' + market;
    if (liveState.lastStatValues[cacheKey] === stat) return;
    liveState.lastStatValues[cacheKey] = stat;

    var pct = isNaN(line) || line <= 0 ? 0 : Math.min((stat / line) * 100, 100);
    var colorClass = getProgressColor(stat, line, direction);

    clearChildren(liveEl);

    liveEl.appendChild(el('span', 'live-stat-current', String(stat)));
    liveEl.appendChild(el('span', 'live-stat-label', marketConfig.abbrev));
    liveEl.appendChild(el('span', 'live-stat-separator', '/'));
    liveEl.appendChild(el('span', 'live-stat-line', String(line)));

    var barContainer = el('div', 'live-progress-bar');
    var barFill = el('div', 'live-progress-fill' + (colorClass ? ' ' + colorClass : ''));
    barFill.style.width = pct + '%';
    barContainer.appendChild(barFill);
    liveEl.appendChild(barContainer);
  }

  function clearChildren(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function getProgressColor(stat, line, direction) {
    if (isNaN(line) || line <= 0) return '';
    var ratio = stat / line;
    if (ratio >= 1) {
      return direction === 'OVER' ? 'hit' : 'exceeded';
    }
    if (ratio >= 0.8) {
      return direction === 'OVER' ? 'approaching-good' : 'approaching-bad';
    }
    if (ratio >= 0.5) {
      return 'approaching';
    }
    return '';
  }

  // ============================================
  // DOM updates — game slate headers
  // ============================================

  function updateGameSlateHeader(gamePk, status, linescore, detailedState) {
    var headers = document.querySelectorAll('.game-slate-header[data-game-pk="' + gamePk + '"]');
    for (var i = 0; i < headers.length; i++) {
      var header = headers[i];

      // Remove existing badges and inning text
      var oldBadge = header.querySelector('.live-badge, .final-badge, .delay-badge');
      if (oldBadge) oldBadge.remove();
      var oldInning = header.querySelector('.live-inning');
      if (oldInning) oldInning.remove();

      if (status === 'Live') {
        var isDelayed = detailedState && detailedState.indexOf('Delay') !== -1;
        if (isDelayed) {
          header.appendChild(el('span', 'delay-badge', 'DELAY'));
        } else {
          var badge = document.createElement('span');
          badge.className = 'live-badge';
          var dot = document.createElement('span');
          dot.className = 'live-badge-dot';
          badge.appendChild(dot);
          badge.appendChild(document.createTextNode('LIVE'));
          header.appendChild(badge);

          if (linescore) {
            var inning = linescore.currentInning;
            var half = linescore.inningHalf || '';
            if (inning) {
              var halfText = half === 'Top' ? 'Top' : half === 'Bottom' ? 'Bot' : '';
              header.appendChild(el('span', 'live-inning', halfText + ' ' + ordinal(inning)));
            }
          }
        }
      } else if (status === 'Final') {
        header.appendChild(el('span', 'final-badge', 'FINAL'));
      }
    }
  }

  function ordinal(n) {
    var s = ['th', 'st', 'nd', 'rd'];
    var v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  // ============================================
  // Visibility handling
  // ============================================

  function handleVisibilityChange() {
    if (document.visibilityState === 'hidden') {
      pausePolling();
    } else {
      resumePolling();
    }
  }

  function pausePolling() {
    if (liveState.scheduleTimerId) {
      clearInterval(liveState.scheduleTimerId);
      liveState.scheduleTimerId = null;
    }
    Object.keys(liveState.gameTimers).forEach(function (pk) {
      clearInterval(liveState.gameTimers[pk]);
      delete liveState.gameTimers[pk];
    });
  }

  function resumePolling() {
    if (!liveState.active) return;

    pollSchedule();
    liveState.scheduleTimerId = setInterval(pollSchedule, SCHEDULE_POLL_MS);

    var liveGames = [];
    Object.keys(liveState.gameStatuses).forEach(function (pk) {
      if (liveState.gameStatuses[pk] === 'Live') {
        liveGames.push({ game_pk: pk });
      }
    });
    if (liveGames.length > 0) {
      startBoxscorePolling(liveGames);
    }
  }

})();
