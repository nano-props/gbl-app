// Boot script — applies the resolved theme to <html data-theme=...>
// before the React app module runs.
// Main passes the resolved theme via `?theme=` on the file:// URL.
//
// This file lives under `public/` so vite copies it as-is into the
// dist root rather than bundling it into main.js.
;(function () {
  var qs = new URLSearchParams(window.location.search)
  var theme = qs.get('theme')
  if (theme !== 'light' && theme !== 'dark') theme = 'light'
  document.documentElement.setAttribute('data-theme', theme)
})()
