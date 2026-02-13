'use strict';

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.GlicksSiteLogic = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function normalizeBookKey(book) {
    return String(book || '').trim().toLowerCase();
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
      return !!selectedBooks[key];
    });
  }

  function getDataPath(season, filename) {
    var current = '2026';
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

  function buildBacktestIndex(index) {
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

    return {
      dates: sorted,
      countByDate: countByDate,
      maxCount: maxCount,
      minMonthIdx: getCalendarMonthIndex(minParsed.getFullYear(), minParsed.getMonth()),
      maxMonthIdx: getCalendarMonthIndex(maxParsed.getFullYear(), maxParsed.getMonth()),
      viewYear: maxParsed.getFullYear(),
      viewMonth: maxParsed.getMonth(),
      selectedBacktestDate: maxDate
    };
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

    for (var day = 1; day <= daysInMonth; day++) {
      var dateKey = toDateKey(year, month, day);
      var count = backtestIndex.countByDate[dateKey] || 0;
      var isAvailable = count > 0;
      var density = isAvailable ? count / backtestIndex.maxCount : 0;
      var alpha = isAvailable ? (0.16 + (density * 0.54)) : 0;
      days.push({
        day: day,
        dateKey: dateKey,
        count: count,
        isAvailable: isAvailable,
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
    computeResultsViewModel: computeResultsViewModel
  };
});
