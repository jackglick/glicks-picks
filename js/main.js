/* ============================================
   Glick's Picks — Main (Orchestrator)
   ============================================ */
(function () {
  'use strict';

  var GP = window.GP;

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

  // --- Season Selector ---
  function updateSeasonBanner() {
    var banner = document.getElementById('backtest-banner');
    var season = GP.getSeason();
    var hasPill = document.querySelector('.season-pill');
    if (banner) {
      if (GP.isArchiveSeason() && hasPill) {
        banner.textContent = 'Viewing ' + season + ' Season Archive';
        banner.style.display = 'block';
      } else {
        banner.style.display = 'none';
      }
    }

    if (GP.isArchiveSeason() && hasPill) {
      document.body.classList.add('backtest-mode');
    } else {
      document.body.classList.remove('backtest-mode');
    }
  }

  function initSeasonSelector() {
    var season = GP.getSeason();
    updateSeasonBanner();

    var buttons = document.querySelectorAll('.season-pill-btn');
    buttons.forEach(function (btn) {
      if (btn.getAttribute('data-season') === season) {
        btn.classList.add('active');
      }
      btn.addEventListener('click', function () {
        var picked = btn.getAttribute('data-season');
        if (picked === season) return;
        GP.setSeason(picked);
        location.reload();
      });
    });
  }

  // --- Home Page ---
  function initHomePage() {
    var heroWinRate = document.getElementById('hero-win-rate');
    if (!heroWinRate) return;

    fetch('data/2025/results.json')
      .then(function (res) { if (!res.ok) throw new Error(res.status); return res.json(); })
      .then(function (data) {
        if (!data || !data.summary) return;

        var summary = data.summary;
        GP.setStatusText('hero-win-rate', summary.win_rate.toFixed(1) + '%');
        GP.setStatusText('hero-win-rate-detail', 'across ' + summary.total_bets.toLocaleString('en-US') + ' bets');

        var betRoi = summary.bet_roi != null ? summary.bet_roi : 0;
        GP.setStatusText('hero-roi', (betRoi >= 0 ? '+' : '') + betRoi.toFixed(1) + '%');
      })
      .catch(function () {});
  }

  // --- Page Router ---
  initMobileMenu();
  initSeasonSelector();
  initHomePage();
  GP.initPicksPage();
  GP.initResultsPage();

})();
