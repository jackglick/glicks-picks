/* ============================================
   Glick's Picks — News Page
   ============================================ */
(function () {
  'use strict';

  var GP = window.GP;
  if (!GP) return;

  var TEAMS = [
    'ARI','ATL','BAL','BOS','CHC','CWS','CIN','CLE','COL','DET',
    'HOU','KC','LAA','LAD','MIA','MIL','MIN','NYM','NYY','OAK',
    'PHI','PIT','SD','SF','SEA','STL','TB','TEX','TOR','WSH'
  ];

  var TYPE_LABELS = {
    injury: 'Injury',
    roster_move: 'Roster Move',
    'return': 'Return',
    trade: 'Trade',
    lineup: 'Lineup',
    other: 'Other'
  };

  var TYPE_COLORS = {
    injury: '#c0392b',
    roster_move: '#3b82f6',
    'return': '#1a7f6d',
    trade: '#a855f7',
    lineup: '#d4940a',
    other: '#6a7384'
  };

  var PAGE_SIZE = 20;
  var newsState = {
    allPosts: [],
    visibleCount: PAGE_SIZE
  };

  // ============================================
  // Helpers
  // ============================================

  function $(id) { return document.getElementById(id); }

  // News data is always live (not season-specific), so bypass GP.fetchJSON
  // which applies the season prefix (e.g. data/2025/).
  function fetchNewsJSON(filename, callback) {
    fetch('data/' + filename)
      .then(function (res) { if (!res.ok) throw new Error(res.status); return res.json(); })
      .then(function (data) { callback(data, null); })
      .catch(function (err) { callback(null, err); });
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'textContent') { node.textContent = attrs[k]; }
        else if (k === 'className') { node.className = attrs[k]; }
        else if (k === 'style' && typeof attrs[k] === 'object') { Object.assign(node.style, attrs[k]); }
        else { node.setAttribute(k, attrs[k]); }
      });
    }
    if (children) {
      children.forEach(function (c) {
        if (typeof c === 'string') node.appendChild(document.createTextNode(c));
        else if (c) node.appendChild(c);
      });
    }
    return node;
  }

  function timeAgo(isoStr) {
    var ms = Date.now() - new Date(isoStr).getTime();
    var mins = Math.floor(ms / 60000);
    if (mins < 60) return mins + 'm ago';
    var hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + 'h ago';
    var days = Math.floor(hrs / 24);
    return days + 'd ago';
  }

  function trendArrow(trend) {
    var span = document.createElement('span');
    if (trend === 'declining') {
      span.textContent = ' \u25BC';
      span.style.color = '#c0392b';
      span.title = 'Declining';
    } else if (trend === 'improving') {
      span.textContent = ' \u25B2';
      span.style.color = '#1a7f6d';
      span.title = 'Improving';
    }
    return span;
  }

  // ============================================
  // Team Health Grid
  // ============================================

  function renderHealthGrid(teamHealth) {
    var grid = $('health-grid');
    if (!grid) return;
    grid.textContent = '';

    TEAMS.forEach(function (team) {
      var info = teamHealth[team] || { health_score: 1, active_injuries: 0, trend: 'stable', recent_news_count: 0 };
      var score = info.health_score;

      // Color: green > 0.7, yellow 0.4-0.7, red < 0.4
      var barColor;
      if (score > 0.7) barColor = '#1a7f6d';
      else if (score > 0.4) barColor = '#d4940a';
      else barColor = '#c0392b';

      var injuriesLabel = el('span', { textContent: info.active_injuries + ' injuries' });
      var injuriesDiv = el('div', { className: 'health-injuries' }, [injuriesLabel, trendArrow(info.trend)]);

      var card = el('div', { className: 'health-card', title: team + ': ' + info.active_injuries + ' active injuries' }, [
        el('div', { className: 'health-team', textContent: team }),
        injuriesDiv,
        el('div', { className: 'health-bar' })
      ]);

      var bar = card.querySelector('.health-bar');
      bar.style.background = 'var(--bg-elevated)';
      var fill = el('div', {
        style: { width: (score * 100) + '%', height: '100%', borderRadius: '3px', background: barColor, transition: 'width 0.3s' }
      });
      bar.appendChild(fill);

      grid.appendChild(card);
    });
  }

  // ============================================
  // News Feed
  // ============================================

  function renderNewsFeed(posts) {
    newsState.allPosts = posts;
    newsState.visibleCount = PAGE_SIZE;
    applyFiltersAndRender();
  }

  function applyFiltersAndRender() {
    var teamFilter = ($('team-filter') || {}).value || '';
    var typeFilter = ($('type-filter') || {}).value || '';

    var filtered = newsState.allPosts.filter(function (p) {
      if (teamFilter && p.team !== teamFilter) return false;
      if (typeFilter && p.category !== typeFilter) return false;
      return true;
    });

    var container = $('news-cards');
    var emptyEl = $('news-empty');
    var loadMoreBtn = $('load-more');
    if (!container) return;

    container.textContent = '';

    if (filtered.length === 0) {
      if (emptyEl) emptyEl.style.display = '';
      if (loadMoreBtn) loadMoreBtn.style.display = 'none';
      return;
    }
    if (emptyEl) emptyEl.style.display = 'none';

    var showing = filtered.slice(0, newsState.visibleCount);
    showing.forEach(function (post) {
      container.appendChild(buildNewsCard(post));
    });

    if (loadMoreBtn) {
      loadMoreBtn.style.display = filtered.length > newsState.visibleCount ? '' : 'none';
    }
  }

  function buildNewsCard(post) {
    var cat = post.category || 'other';
    var color = TYPE_COLORS[cat] || TYPE_COLORS.other;
    var label = TYPE_LABELS[cat] || 'Other';

    var card = el('div', { className: 'news-card', 'data-type': cat });
    card.style.borderLeftColor = color;

    // Header: pill + team + time
    var header = el('div', { className: 'news-card-header' }, [
      el('span', { className: 'event-pill', style: { background: color + '20', color: color }, textContent: label }),
      el('span', { className: 'news-card-team', textContent: ' ' + post.team }),
      el('span', { className: 'news-card-time', textContent: post.created_utc ? timeAgo(post.created_utc) : '' })
    ]);
    card.appendChild(header);

    // Title
    var titleEl = el('div', { className: 'news-card-title' });
    if (post.url) {
      var link = el('a', { href: post.url, target: '_blank', rel: 'noopener noreferrer', textContent: post.title });
      titleEl.appendChild(link);
    } else {
      titleEl.textContent = post.title;
    }
    card.appendChild(titleEl);

    // Extraction details
    if (post.extraction) {
      var ext = post.extraction;
      var detail = ext.player_name || '';
      if (ext.detail) detail += (detail ? ' \u2014 ' : '') + ext.detail;
      if (ext.severity && ext.severity !== 'unknown') detail += ' (' + ext.severity + ')';
      if (detail) {
        card.appendChild(el('div', { className: 'news-card-detail', textContent: detail }));
      }
    }

    // Score
    if (post.score) {
      card.appendChild(el('div', { className: 'news-card-score', textContent: post.score + ' upvotes' }));
    }

    return card;
  }

  // ============================================
  // Active Injuries Table
  // ============================================

  function renderInjuryTable(injuries) {
    var tbody = $('injury-tbody');
    var emptyEl = $('injury-empty');
    if (!tbody) return;

    tbody.textContent = '';
    var entries = Object.values(injuries);

    if (entries.length === 0) {
      if (emptyEl) emptyEl.style.display = '';
      return;
    }
    if (emptyEl) emptyEl.style.display = 'none';

    // Sort: active first, then by last_updated desc
    entries.sort(function (a, b) {
      if (a.resolved !== b.resolved) return a.resolved ? 1 : -1;
      return (b.last_updated || '').localeCompare(a.last_updated || '');
    });

    entries.forEach(function (entry) {
      if (entry.resolved && !($('show-resolved') || {}).checked) return;

      var statusClass = 'status-badge ';
      if (entry.status === 'on_il') statusClass += 'status-on-il';
      else if (entry.status === 'day_to_day') statusClass += 'status-day-to-day';
      else statusClass += 'status-active';

      var sources = [];
      if (entry.sources) {
        if (entry.sources.reddit) sources.push('Reddit');
        if (entry.sources.mlb_api) sources.push('MLB');
      }

      var row = el('tr', { className: entry.resolved ? 'status-resolved' : '' }, [
        el('td', { textContent: entry.player_name || '' }),
        el('td', { textContent: entry.team || '' }),
        el('td', { textContent: entry.injury_type || '' }),
        el('td', { textContent: entry.il_type || '-' }),
        el('td', { textContent: entry.started || '' }),
        el('td', { textContent: entry.earliest_return || '-' }),
        el('td', {}, [el('span', { className: statusClass, textContent: (entry.status || '').replace('_', ' ') })]),
        el('td', { textContent: sources.join(', ') || '-' })
      ]);

      tbody.appendChild(row);
    });
  }

  // ============================================
  // Filter & Load More Handlers
  // ============================================

  function setupFilters() {
    var teamSelect = $('team-filter');
    if (teamSelect) {
      TEAMS.forEach(function (t) {
        teamSelect.appendChild(el('option', { value: t, textContent: t }));
      });
      teamSelect.addEventListener('change', applyFiltersAndRender);
    }

    var typeSelect = $('type-filter');
    if (typeSelect) {
      typeSelect.addEventListener('change', applyFiltersAndRender);
    }

    var loadMoreBtn = $('load-more');
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', function () {
        newsState.visibleCount += PAGE_SIZE;
        applyFiltersAndRender();
      });
    }

    var showResolved = $('show-resolved');
    if (showResolved) {
      showResolved.addEventListener('change', function () {
        // Re-fetch and render injury table
        fetchNewsJSON('injury_ledger.json', function (data, err) {
          if (!err && data) renderInjuryTable(data.active_injuries || {});
        });
      });
    }
  }

  // ============================================
  // Init
  // ============================================

  function loadNewsData() {
    setupFilters();

    fetchNewsJSON('reddit_news.json', function (data, err) {
      if (err || !data) {
        var statusEl = $('news-status');
        if (statusEl) statusEl.textContent = 'News data not yet available. The scraper will populate this page.';
        var emptyEl = $('news-empty');
        if (emptyEl) emptyEl.style.display = '';
        renderHealthGrid({});
        return;
      }

      if (data.scraped_at) {
        var statusEl = $('news-status');
        if (statusEl) statusEl.textContent = 'Last updated: ' + new Date(data.scraped_at).toLocaleString();
      }

      renderHealthGrid(data.team_health || {});
      renderNewsFeed(data.posts || []);
    });

    fetchNewsJSON('injury_ledger.json', function (data, err) {
      if (err || !data) {
        var emptyEl = $('injury-empty');
        if (emptyEl) emptyEl.style.display = '';
        return;
      }
      renderInjuryTable(data.active_injuries || {});
    });
  }

  // Register for main.js to call (same pattern as picksPage/resultsPage)
  GP.initNewsPage = loadNewsData;

})();
