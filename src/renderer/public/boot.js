// Boot script — applies the resolved theme to <html data-theme=...>
// before stylesheets load so first paint uses the right background.
// Main passes the resolved theme via `?theme=` on the file:// URL.
//
// This file lives under `public/` so vite copies it as-is into the
// dist root rather than bundling it into main.js. Loading it as a
// plain (non-module) <script> in the document head means the
// data-theme attribute is set BEFORE the stylesheet link parses,
// which is what eliminates the white-flash on dark-pref users.
;(function () {
  var qs = new URLSearchParams(window.location.search)
  var theme = qs.get('theme')
  if (theme !== 'light' && theme !== 'dark') theme = 'light'
  document.documentElement.setAttribute('data-theme', theme)
})()
