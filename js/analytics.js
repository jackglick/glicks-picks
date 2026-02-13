(function () {
  var measurementId = 'G-CVB8L1B67P';

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };

  var gaScript = document.createElement('script');
  gaScript.async = true;
  gaScript.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(measurementId);
  document.head.appendChild(gaScript);

  gtag('js', new Date());
  gtag('config', measurementId);
})();
