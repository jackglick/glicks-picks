(function () {
  try {
    var measurementId = 'G-CVB8L1B67P';

    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };

    var gaScript = document.createElement('script');
    gaScript.async = true;
    gaScript.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(measurementId);
    gaScript.onerror = function () {
      // Ad-blocker or network issue prevented GA from loading — silently ignore
    };
    document.head.appendChild(gaScript);

    gtag('js', new Date());
    gtag('config', measurementId);
  } catch (e) {
    // Analytics blocked or unavailable — do not surface errors to console
  }
})();
