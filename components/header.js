(function initSiteHeader() {
  "use strict";

  // ============================================================
  // Header Component
  // Inject two-level sticky header ke semua halaman publik.
  // Taruh <div id="site-header-mount"></div> di awal <body>,
  // lalu load script ini — header akan di-inject otomatis.
  //
  // Komponen ini harus di-load SEBELUM navbar.js, font-size-toggle.js,
  // dan translator.js karena mereka butuh #site-navbar yang dibuat di sini.
  // ============================================================

  function detectBasePath() {
    const parts = window.location.pathname.split("/").filter(Boolean);
    if (!parts.length || parts[0].includes(".")) return "/";
    return "/" + parts[0] + "/";
  }

  const BASE_PATH = detectBasePath();

  function resolveUrl(path) {
    if (path.startsWith("http") || path.startsWith("mailto") || path.startsWith("#")) {
      return path;
    }
    return BASE_PATH + path.replace(/^\//, "");
  }

  function injectHeader() {
    const mount = document.getElementById("site-header-mount");
    if (!mount) return;

    mount.outerHTML = `
      <header class="site-header" id="site-header">
        <!-- Top bar: brand + actions -->
        <div class="site-topbar">
          <div class="container">
            <a href="${resolveUrl("index.html")}" class="site-brand">
              <div class="site-logo" aria-hidden="true">W</div>
              <div class="site-brand-text">
                <span class="site-title">wafaabbas.com</span>
                <span class="site-tagline">Akuntansi · Perpajakan · Keuangan</span>
              </div>
            </a>
            <div class="site-topbar-actions">
              <a href="${resolveUrl("admin/login.html")}" class="btn-login">Login</a>
            </div>
          </div>
        </div>
        <!-- Nav bar: dynamic menu dari Supabase -->
        <div class="site-navbar">
          <div class="container">
            <nav id="site-navbar" aria-label="Navigasi utama"></nav>
          </div>
        </div>
      </header>
    `;
  }

  // Inject segera — tidak perlu tunggu DOMContentLoaded
  // karena script ini di-load di awal body
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectHeader);
  } else {
    injectHeader();
  }
})();