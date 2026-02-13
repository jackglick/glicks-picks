(function () {
  // Frame-busting fallback for environments where response headers are not configurable.
  if (window.top !== window.self) {
    try {
      window.top.location = window.self.location.href;
    } catch (err) {
      window.self.location = window.self.location.href;
    }
  }
})();
