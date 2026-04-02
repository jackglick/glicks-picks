/* ============================================
   Glick's Picks — Live Game Tracker
   Polls MLB Stats API for in-progress games
   and updates pick cards with real-time stats.
   ============================================ */
(function () {
  'use strict';

  var GP = window.GP;
  var el = GP.el;
  var clearChildren = GP.clearChildren;

  var SCHEDULE_POLL_MS = 30000;
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

  var finalCache = {};

  var liveState = {
    active: false,
    scheduleTimerId: null,
    gameTimers: {},
    gameCache: {},
    gameStatuses: {},
    errorCounts: {},
    lastStatValues: {},
    gameScores: {}
  };

  // ============================================
  // Entry point
  // ============================================

  GP.initLiveTracker = function (schedule) {
    if (GP.isArchiveSeason()) return;
    if (!schedule || !schedule.length) return;

    // If already polling, just re-apply cached overlays to fresh DOM
    if (liveState.active) {
      reapplyOverlays(schedule);
      return;
    }

    // Restore Final games from cache
    schedule.forEach(function (g) {
      if (g.status === 'Final') {
        updateGameSlateHeader(g.game_pk, 'Final', null, '',
          g.away_score != null ? g.away_score : null,
          g.home_score != null ? g.home_score : null);
        var cached = finalCache[g.game_pk];
        if (cached) {
          updateCardsForGame(g.game_pk, cached);
        } else if (finalCache[g.game_pk] !== 'pending') {
          fetchAndCacheFinal(g.game_pk);
        }
      }
    });

    var hasLiveOrPreview = schedule.some(function (g) {
      return g.status === 'Live' || g.status === 'Preview';
    });
    if (!hasLiveOrPreview) return;

    liveState.active = true;

    schedule.forEach(function (g) {
      liveState.gameStatuses[g.game_pk] = g.status;
      if (g.away_score != null && g.home_score != null) {
        liveState.gameScores[g.game_pk] = { away: g.away_score, home: g.home_score };
      }
    });

    var liveGames = schedule.filter(function (g) { return g.status === 'Live'; });
    startBoxscorePolling(liveGames);

    liveGames.forEach(function (g) {
      updateGameSlateHeader(g.game_pk, 'Live', null, '',
        g.away_score != null ? g.away_score : null,
        g.home_score != null ? g.home_score : null);
    });

    pollSchedule();
    liveState.scheduleTimerId = setInterval(pollSchedule, SCHEDULE_POLL_MS);
    document.addEventListener('visibilitychange', handleVisibilityChange);
  };

  // Re-apply cached stats/badges to freshly rendered DOM (sort/filter change)
  function reapplyOverlays(schedule) {
    schedule.forEach(function (g) {
      var pk = g.game_pk;
      var status = liveState.gameStatuses[pk] || g.status;
      var cached = (status === 'Final') ? finalCache[pk] : liveState.gameCache[pk];

      if (status === 'Final' || status === 'Live') {
        var scores = liveState.gameScores[pk];
        updateGameSlateHeader(pk, status, null, '',
          scores ? scores.away : null,
          scores ? scores.home : null);
      }
      if (cached) {
        updateCardsForGame(pk, cached);
      }
    });
  }

  GP.stopLiveTracker = function () {
    liveState.active = false;

    if (liveState.scheduleTimerId) {
      clearInterval(liveState.scheduleTimerId);
      liveState.scheduleTimerId = null;
    }

    Object.keys(liveState.gameTimers).forEach(function (pk) {
      clearTimeout(liveState.gameTimers[pk]);
    });

    liveState.gameTimers = {};
    liveState.gameCache = {};
    liveState.gameStatuses = {};
    liveState.errorCounts = {};
    liveState.lastStatValues = {};
    liveState.gameScores = {};

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
          var awayScore = ((g.teams || {}).away || {}).score;
          var homeScore = ((g.teams || {}).home || {}).score;
          if (awayScore != null && homeScore != null) {
            liveState.gameScores[pk] = { away: awayScore, home: homeScore };
          }
          updateGameSlateHeader(pk, status, null, detailedState,
            awayScore != null ? awayScore : null,
            homeScore != null ? homeScore : null);
        });

        if (newlyLive.length > 0) {
          startBoxscorePolling(newlyLive);
        }

        newlyFinal.forEach(function (pk) {
          pollGameBoxscore(pk).then(function () {
            if (liveState.gameCache[pk]) {
              finalCache[pk] = liveState.gameCache[pk];
            }
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
  // Per-game boxscore polling (chained setTimeout for live backoff)
  // ============================================

  function startBoxscorePolling(games) {
    games.forEach(function (g) {
      var pk = g.game_pk;
      if (liveState.gameTimers[pk]) return;
      liveState.errorCounts[pk] = 0;
      pollAndReschedule(pk);
    });
  }

  function pollAndReschedule(pk) {
    pollGameBoxscore(pk).finally(function () {
      if (!liveState.active) return;
      liveState.gameTimers[pk] = setTimeout(function () {
        pollAndReschedule(pk);
      }, getGamePollInterval(pk));
    });
  }

  function getGamePollInterval(pk) {
    var errs = liveState.errorCounts[pk] || 0;
    if (errs >= BACKOFF_THRESHOLD) return BOXSCORE_POLL_MS * 2;
    return BOXSCORE_POLL_MS;
  }

  function fetchAndCacheFinal(pk) {
    finalCache[pk] = 'pending';
    var url = 'https://statsapi.mlb.com/api/v1.1/game/' + pk + '/feed/live';
    fetch(url)
      .then(function (resp) {
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        return resp.json();
      })
      .then(function (data) {
        finalCache[pk] = data;
        updateCardsForGame(pk, data);
      })
      .catch(function (err) {
        delete finalCache[pk];
        console.warn('[LiveTracker] Final fetch failed for game ' + pk + ':', err);
      });
  }

  function stopGamePolling(pk) {
    if (liveState.gameTimers[pk]) {
      clearTimeout(liveState.gameTimers[pk]);
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
        var lsTeams = (linescore || {}).teams || {};
        var awayRuns = (lsTeams.away || {}).runs;
        var homeRuns = (lsTeams.home || {}).runs;
        if (awayRuns != null && homeRuns != null) {
          liveState.gameScores[pk] = { away: awayRuns, home: homeRuns };
        }
        updateGameSlateHeader(pk, status, linescore, detailedState,
          awayRuns != null ? awayRuns : null,
          homeRuns != null ? homeRuns : null);

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
      updateSingleCard(cards[i], gamePk, liveFeed);
    }
  }

  function updateSingleCard(card, gamePk, liveFeed) {
    var playerId = card.getAttribute('data-player-id');
    var market = card.getAttribute('data-market');
    var line = parseFloat(card.getAttribute('data-line'));
    var direction = card.getAttribute('data-direction');

    if (!playerId || !market) return;

    var marketConfig = MARKET_STAT_MAP[market];
    if (!marketConfig) return;

    var stat = extractPlayerStat(liveFeed, playerId, marketConfig);

    var liveEl = card.querySelector('.pick-card-live');
    if (!liveEl) {
      liveEl = el('div', 'pick-card-live');

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

    var cacheKey = gamePk + ':' + playerId + ':' + market;
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

  function updateGameSlateHeader(gamePk, status, linescore, detailedState, awayScore, homeScore) {
    var headers = document.querySelectorAll('.game-slate-header[data-game-pk="' + gamePk + '"]');
    for (var i = 0; i < headers.length; i++) {
      var header = headers[i];

      var oldBadge = header.querySelector('.live-badge, .final-badge, .delay-badge, .postponed-badge');
      if (oldBadge) oldBadge.remove();
      var oldInning = header.querySelector('.live-inning');
      if (oldInning && (linescore || status !== 'Live')) oldInning.remove();

      // Update or create score elements
      var awayScoreEl = header.querySelector('.game-score.away-score');
      var homeScoreEl = header.querySelector('.game-score.home-score');

      if (awayScore != null && homeScore != null) {
        if (!awayScoreEl) {
          // Insert scores: [away-badge] [score] @ [score] [home-badge]
          var vsEl = header.querySelector('.matchup-vs');
          if (vsEl) {
            awayScoreEl = el('span', 'game-score away-score', String(awayScore));
            header.insertBefore(awayScoreEl, vsEl);
            homeScoreEl = el('span', 'game-score home-score', String(homeScore));
            vsEl.nextSibling
              ? header.insertBefore(homeScoreEl, vsEl.nextSibling)
              : header.appendChild(homeScoreEl);
          }
        } else {
          awayScoreEl.textContent = String(awayScore);
          homeScoreEl.textContent = String(homeScore);
        }
      }

      if (status === 'Live') {
        var isDelayed = detailedState && detailedState.indexOf('Delay') !== -1;
        if (isDelayed) {
          header.appendChild(el('span', 'delay-badge', 'DELAY'));
        } else {
          var badge = el('span', 'live-badge');
          badge.insertBefore(el('span', 'live-badge-dot'), badge.firstChild);
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
        var isPostponed = detailedState && detailedState.indexOf('Postponed') !== -1;
        if (isPostponed) {
          header.appendChild(el('span', 'postponed-badge', 'POSTPONED'));
        } else {
          header.appendChild(el('span', 'final-badge', 'FINAL'));
        }
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
      clearTimeout(liveState.gameTimers[pk]);
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
