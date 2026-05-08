'use strict';

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.GlicksSiteLogic = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function normalizeBookKey(book) {
    var key = String(book || '').trim().toLowerCase();
    if (key === 'consensus') return '';
    return key;
  }

  function syncBookFilterState(allPicks, selectedBooks) {
    var present = {};
    (allPicks || []).forEach(function (pick) {
      var key = normalizeBookKey(pick && pick.best_book);
      if (!key) return;
      present[key] = true;
    });

    var prev = selectedBooks || {};
    var next = {};
    Object.keys(present).forEach(function (key) {
      next[key] = Object.prototype.hasOwnProperty.call(prev, key) ? !!prev[key] : true;
    });
    return next;
  }

  function getFilteredPicks(allPicks, selectedBooks) {
    var picks = allPicks || [];
    if (picks.length === 0) return [];

    var keys = Object.keys(selectedBooks || {});
    if (keys.length === 0) return picks.slice();

    var hasAnyEnabled = keys.some(function (k) { return selectedBooks[k]; });
    if (!hasAnyEnabled) return [];

    return picks.filter(function (pick) {
      var key = normalizeBookKey(pick && pick.best_book);
      if (!key) return true; // always show picks without a specific book
      return !!selectedBooks[key];
    });
  }

  function getDataPath(season, filename) {
    var current = (typeof GP !== 'undefined' && GP.CURRENT_SEASON) || 'prod';
    return season === current ? 'data/' + filename : 'data/' + season + '/' + filename;
  }

  function parseDateKey(dateKey) {
    return new Date(dateKey + 'T12:00:00');
  }

  function getCalendarMonthIndex(year, month) {
    return year * 12 + month;
  }

  function toDateKey(year, month, day) {
    var mm = String(month + 1).padStart(2, '0');
    var dd = String(day).padStart(2, '0');
    return String(year) + '-' + mm + '-' + dd;
  }

  function buildBacktestIndex(index, options) {
    if (!index || !Array.isArray(index.dates) || index.dates.length === 0) return null;

    var sorted = index.dates.slice().sort(function (a, b) {
      return String(a.date).localeCompare(String(b.date));
    });
    var countByDate = {};
    var maxCount = 1;
    sorted.forEach(function (entry) {
      var count = Number(entry.count) || 0;
      countByDate[entry.date] = count;
      if (count > maxCount) maxCount = count;
    });

    var minDate = sorted[0].date;
    var maxDate = sorted[sorted.length - 1].date;
    var minParsed = parseDateKey(minDate);
    var maxParsed = parseDateKey(maxDate);

    var dataMinMonthIdx = getCalendarMonthIndex(minParsed.getFullYear(), minParsed.getMonth());
    var dataMaxMonthIdx = getCalendarMonthIndex(maxParsed.getFullYear(), maxParsed.getMonth());

    var built = {
      dates: sorted,
      countByDate: countByDate,
      maxCount: maxCount,
      minMonthIdx: dataMinMonthIdx,
      maxMonthIdx: dataMaxMonthIdx,
      viewYear: maxParsed.getFullYear(),
      viewMonth: maxParsed.getMonth(),
      selectedBacktestDate: maxDate
    };

    if (options && options.isLiveSeason && options.seasonYear) {
      var y = Number(options.seasonYear);
      built.isLiveSeason = true;
      built.seasonStart = String(y) + '-03-01';
      built.seasonEnd = String(y) + '-10-31';
      var seasonMinIdx = getCalendarMonthIndex(y, 2);  // March
      var seasonMaxIdx = getCalendarMonthIndex(y, 9);  // October
      if (seasonMinIdx < built.minMonthIdx) built.minMonthIdx = seasonMinIdx;
      if (seasonMaxIdx > built.maxMonthIdx) built.maxMonthIdx = seasonMaxIdx;
    }

    return built;
  }

  function shiftCalendarMonth(backtestIndex, delta) {
    if (!backtestIndex) return backtestIndex;
    var d = new Date(backtestIndex.viewYear, backtestIndex.viewMonth + delta, 1);
    var nextIdx = getCalendarMonthIndex(d.getFullYear(), d.getMonth());
    if (nextIdx < backtestIndex.minMonthIdx || nextIdx > backtestIndex.maxMonthIdx) {
      return backtestIndex;
    }
    backtestIndex.viewYear = d.getFullYear();
    backtestIndex.viewMonth = d.getMonth();
    return backtestIndex;
  }

  function computeCalendarDays(backtestIndex, selectedDate) {
    if (!backtestIndex) return { fillers: 0, days: [] };

    var year = backtestIndex.viewYear;
    var month = backtestIndex.viewMonth;
    var first = new Date(year, month, 1);
    var firstWeekday = first.getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var days = [];

    var isLive = !!backtestIndex.isLiveSeason;
    var seasonStart = backtestIndex.seasonStart || '';
    var seasonEnd = backtestIndex.seasonEnd || '';

    for (var day = 1; day <= daysInMonth; day++) {
      var dateKey = toDateKey(year, month, day);
      var count = backtestIndex.countByDate[dateKey] || 0;
      var isAvailable = count > 0;
      var density = isAvailable ? count / backtestIndex.maxCount : 0;
      var alpha = isAvailable ? (0.16 + (density * 0.54)) : 0;
      var isClickable = isLive
        ? (dateKey >= seasonStart && dateKey <= seasonEnd)
        : isAvailable;
      days.push({
        day: day,
        dateKey: dateKey,
        count: count,
        isAvailable: isAvailable,
        isClickable: isClickable,
        density: density,
        alpha: Number(alpha.toFixed(3)),
        selected: dateKey === selectedDate
      });
    }

    return {
      fillers: firstWeekday,
      days: days
    };
  }

  function formatPnl(value) {
    if (value === null || value === undefined) return '--';
    var sign = value > 0 ? '+' : (value < 0 ? '-' : '');
    return sign + '$' + Math.abs(value).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  }

  function formatDate(dateStr) {
    var parts = String(dateStr).split('-');
    if (parts.length < 3) return dateStr;
    return parseInt(parts[1], 10) + '/' + parseInt(parts[2], 10);
  }

  function computeResultsViewModel(data) {
    if (!data || !data.summary) {
      return {
        available: false,
        generatedAtText: 'Last updated: unavailable'
      };
    }

    var s = data.summary;
    var markets = (data.by_market || []).map(function (m) {
      return {
        market: m.market,
        bets: m.bets,
        record: m.wins + '-' + m.losses + (m.pushes > 0 ? '-' + m.pushes : ''),
        winRate: Number(m.win_rate).toFixed(1) + '%',
        pnlText: formatPnl(m.pnl),
        pnlClass: m.pnl >= 0 ? 'pnl-positive' : 'pnl-negative',
        roiText: (m.roi >= 0 ? '+' : '') + Number(m.roi).toFixed(1) + '%',
        roiClass: m.roi >= 0 ? 'pnl-positive' : 'pnl-negative'
      };
    });

    var recent = (data.recent || []).map(function (r) {
      return {
        dateText: formatDate(r.date),
        player: r.player,
        pickText: r.direction + ' ' + r.line + ' ' + r.market,
        result: String(r.result || '').toUpperCase(),
        actualText: r.actual !== null && r.actual !== undefined ? ' (' + r.actual + ')' : '',
        pnlText: formatPnl(r.pnl),
        pnlClass: r.pnl >= 0 ? 'pnl-positive' : 'pnl-negative'
      };
    });

    var chartSummary = 'Summary unavailable.';
    if (Array.isArray(data.cumulative_pnl) && data.cumulative_pnl.length > 1) {
      var first = data.cumulative_pnl[0];
      var last = data.cumulative_pnl[data.cumulative_pnl.length - 1];
      chartSummary = 'From ' + first.date + ' to ' + last.date + ', cumulative P&L moved from ' +
        formatPnl(first.cumulative) + ' to ' + formatPnl(last.cumulative) + '.';
    }

    return {
      available: true,
      generatedAtText: data.generated_at ? String(data.generated_at) : null,
      record: s.wins + '-' + s.losses + (s.pushes > 0 ? '-' + s.pushes : ''),
      winRateText: Number(s.win_rate).toFixed(1) + '%',
      pnlText: formatPnl(s.total_pnl),
      pnlClass: s.total_pnl >= 0 ? 'positive' : 'negative',
      roiText: (s.roi >= 0 ? '+' : '') + Number(s.roi).toFixed(1) + '%',
      roiClass: s.roi >= 0 ? 'positive' : 'negative',
      markets: markets,
      recent: recent,
      chartSummary: chartSummary
    };
  }

  // ============================================
  // v1 track record archive
  // ============================================

  // The v1.1 -> v2.0 cutover (MLB-234). Picks dated < this string are v1.1
  // forward sample; picks dated >= this string are v2.0 forward sample.
  // String comparison on YYYY-MM-DD is correct lexicographically for ISO dates.
  var V2_CUTOVER_DATE = '2026-08-01';

  function parseVersionParam(urlString) {
    try {
      var url = new URL(urlString);
      var version = url.searchParams.get('version');
      if (version === 'v1') return 'v1';
      if (version === 'v2') return 'v2';
      if (version === 'v1.1') return 'v1.1';
      // Default 'all' renders supabase data without a version filter.
      return 'all';
    } catch (e) {
      return 'all';
    }
  }

  function shouldShowVersionToggle(season) {
    return season === '2026';
  }

  function resolveResultsSource(season, version) {
    if (season === '2026' && version === 'v1') {
      return 'v1-frozen';
    }
    return 'supabase';
  }

  function buildVersionUrl(urlString, version) {
    try {
      var url = new URL(urlString);
      // 'all' is the implicit default — omit the param to keep URLs clean.
      if (!version || version === 'all') {
        url.searchParams.delete('version');
      } else {
        url.searchParams.set('version', version);
      }
      return url.toString();
    } catch (e) {
      return urlString;
    }
  }

  // Apply the v1.1 / v2.0 client-side filter to a list of supabase picks.
  // 'all' returns everything; 'v1.1' keeps date < cutover; 'v2' keeps
  // date >= cutover. v1 is handled by the v1-frozen archive path.
  function filterPicksByVersion(picks, version) {
    if (!Array.isArray(picks) || picks.length === 0) return [];
    if (version === 'v1.1') {
      return picks.filter(function (p) {
        return String((p && p.date) || '') < V2_CUTOVER_DATE;
      });
    }
    if (version === 'v2') {
      return picks.filter(function (p) {
        return String((p && p.date) || '') >= V2_CUTOVER_DATE;
      });
    }
    return picks.slice();
  }

  // Compute summary stats (n, wins, losses, win_rate, roi, pnl) over a
  // graded pick array, split into v1.1 (pre-cutover) and v2 (post-cutover)
  // halves. Used for the side-by-side per-version cards on the All view.
  function computeVersionSplitSummary(picks) {
    function summarize(arr) {
      var graded = arr.filter(function (p) {
        return p && (p.result === 'win' || p.result === 'loss');
      });
      var wins = 0, losses = 0, pnl = 0;
      // Approximate wagered as $100/bet (matches the existing flat-$100
      // P&L convention used elsewhere on the page). We avoid per-bet
      // odds-aware sizing here because the supabase pick rows do not
      // carry a uniform bet_amount field — see export_web.upsert_picks.
      for (var i = 0; i < graded.length; i++) {
        var p = graded[i];
        if (p.result === 'win') wins++;
        else if (p.result === 'loss') losses++;
        if (typeof p.pnl === 'number') pnl += p.pnl;
      }
      var n = wins + losses;
      var wr = n > 0 ? (wins / n * 100) : null;
      var wagered = n * 100;
      var roi = wagered > 0 ? (pnl / wagered * 100) : null;
      return { n: n, wins: wins, losses: losses, pnl: pnl,
               win_rate: wr, roi: roi };
    }

    return {
      cutover: V2_CUTOVER_DATE,
      v11: summarize(filterPicksByVersion(picks, 'v1.1')),
      v2: summarize(filterPicksByVersion(picks, 'v2'))
    };
  }

  function getCutoverDate() {
    return V2_CUTOVER_DATE;
  }

  function buildV1Subtitle(window) {
    var start = (window && window.start) || '?';
    var end = (window && window.end) || '?';
    return 'v1 model — frozen forward sample (' + start + ' \u2192 ' + end + ')';
  }

  return {
    normalizeBookKey: normalizeBookKey,
    syncBookFilterState: syncBookFilterState,
    getFilteredPicks: getFilteredPicks,
    getDataPath: getDataPath,
    parseDateKey: parseDateKey,
    getCalendarMonthIndex: getCalendarMonthIndex,
    toDateKey: toDateKey,
    buildBacktestIndex: buildBacktestIndex,
    shiftCalendarMonth: shiftCalendarMonth,
    computeCalendarDays: computeCalendarDays,
    formatPnl: formatPnl,
    formatDate: formatDate,
    computeResultsViewModel: computeResultsViewModel,
    parseVersionParam: parseVersionParam,
    shouldShowVersionToggle: shouldShowVersionToggle,
    resolveResultsSource: resolveResultsSource,
    buildVersionUrl: buildVersionUrl,
    buildV1Subtitle: buildV1Subtitle,
    // MLB-234: v2 cutover support
    filterPicksByVersion: filterPicksByVersion,
    computeVersionSplitSummary: computeVersionSplitSummary,
    getCutoverDate: getCutoverDate
  };
});
