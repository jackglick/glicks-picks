/* ============================================
   Glick's Picks — Shared Utilities
   ============================================ */
(function () {
  'use strict';

  var GP = window.GP;
  var SiteLogic = window.GlicksSiteLogic || null;
  GP.SiteLogic = SiteLogic;

  // Mark that JS is active (for CSS fallback on .reveal)
  document.documentElement.classList.add('js');

  // --- Scroll Reveal ---
  GP.revealObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          GP.revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );

  document.querySelectorAll('.reveal').forEach(function (el) {
    GP.revealObserver.observe(el);
  });

  GP.reobserveReveals = function () {
    requestAnimationFrame(function () {
      document.querySelectorAll('.reveal:not(.visible)').forEach(function (item) {
        GP.revealObserver.observe(item);
      });
    });
  };

  // --- Season Helpers ---
  GP.getSeason = function () {
    return localStorage.getItem('glicks-season') || GP.CURRENT_SEASON;
  };

  GP.setSeason = function (season) {
    localStorage.setItem('glicks-season', season);
  };

  GP.isArchiveSeason = function () {
    return GP.getSeason() !== GP.CURRENT_SEASON;
  };

  // --- Formatting ---
  GP.formatPrice = function (price) {
    if (price === null || price === undefined) return '';
    if (price === 0) return 'EVEN';
    return (price > 0 ? '+' : '') + price;
  };

  GP.formatPnl = function (val) {
    if (val === null || val === undefined) return '--';
    var sign = val > 0 ? '+' : (val < 0 ? '-' : '');
    return sign + '$' + Math.abs(val).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  GP.formatDate = function (dateStr) {
    var parts = dateStr.split('-');
    return parseInt(parts[1], 10) + '/' + parseInt(parts[2], 10);
  };

  GP.formatFullDate = function (dateStr) {
    var d = new Date(dateStr + 'T12:00:00');
    var options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
    return d.toLocaleDateString('en-US', options);
  };

  GP.formatTimestamp = function (ts) {
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
  };

  // --- DOM Helpers ---
  GP.el = function (tag, className, textContent) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (textContent !== undefined) node.textContent = textContent;
    return node;
  };

  GP.clearChildren = function (node) {
    while (node.firstChild) {
      node.removeChild(node.firstChild);
    }
  };

  GP.setStatusText = function (id, text) {
    var node = document.getElementById(id);
    if (node) node.textContent = text;
  };

  GP.showLoadingSkeletons = function (container, count) {
    GP.clearChildren(container);
    container.style.display = '';
    for (var i = 0; i < count; i++) {
      container.appendChild(GP.el('div', 'pick-card loading-skeleton'));
    }
  };

  // --- Team Helpers ---
  GP.normalizeTeamCode = function (raw) {
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
  };

  GP.getTeamLogoUrl = function (teamCode) {
    var code = GP.normalizeTeamCode(teamCode);
    var teamId = GP.TEAM_LOGO_IDS[code];
    if (!teamId) return null;
    return 'https://www.mlbstatic.com/team-logos/' + teamId + '.svg';
  };

  // --- Book Helpers ---
  GP.normalizeBookKey = function (book) {
    if (SiteLogic && typeof SiteLogic.normalizeBookKey === 'function') {
      return SiteLogic.normalizeBookKey(book);
    }
    return String(book || '').trim().toLowerCase();
  };

  GP.getBookDisplayName = function (bookKey) {
    return GP.BOOK_DISPLAY[bookKey] || bookKey;
  };

})();
