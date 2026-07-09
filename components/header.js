(function initSiteHeader() {
  "use strict";

  // ============================================================
  // Header Component — Two-level sticky + Mega menu + Mobile burger
  // Inject ke <div id="site-header-mount"></div>
  // Load SEBELUM navbar.js, font-size-toggle.js, translator.js
  // ============================================================

  if (!window.WafaSupabase) return;
  const { menus } = window.WafaSupabase;

  function detectBasePath() {
    const parts = window.location.pathname.split("/").filter(Boolean);
    if (!parts.length || parts[0].includes(".")) return "/";
    return "/" + parts[0] + "/";
  }

  const BASE_PATH = detectBasePath();

  function resolveUrl(path) {
    if (!path) return "#";
    if (path.startsWith("http") || path.startsWith("mailto") || path.startsWith("#")) return path;
    return BASE_PATH + path.replace(/^\//, "");
  }

  function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = String(value || "");
    return div.innerHTML;
  }

  // ------------------------------------------------------------------
  // Lucide icon renderer — pakai CDN via img tag
  // Lucide icons tersedia di unpkg sebagai SVG individual
  // ------------------------------------------------------------------
  function getLucideIcon(name, size) {
    size = size || 20;
    if (!name) return "";
    return `<img
      src="https://unpkg.com/lucide-static@latest/icons/${escapeHtml(name)}.svg"
      width="${size}"
      height="${size}"
      alt=""
      aria-hidden="true"
      class="nav-icon"
      onerror="this.style.display='none';"
    />`;
  }

  // ------------------------------------------------------------------
  // Render dropdown item (dengan icon + title + description)
  // ------------------------------------------------------------------
  function renderDropdownItem(item) {
    const url = resolveUrl(item.url);
    const label = escapeHtml(item.label);
    const desc = item.description ? escapeHtml(item.description) : "";
    const icon = getLucideIcon(item.icon_name, 20);
    const hasDesc = !!desc;

    return `
      <li>
        <a href="${url}" class="nav-dropdown-item ${hasDesc ? "nav-dropdown-item--rich" : ""}">
          ${icon ? `<span class="nav-dropdown-icon">${icon}</span>` : ""}
          <span class="nav-dropdown-text">
            <span class="nav-dropdown-label">${label}</span>
            ${hasDesc ? `<span class="nav-dropdown-desc">${desc}</span>` : ""}
          </span>
        </a>
      </li>
    `;
  }

  // ------------------------------------------------------------------
  // Render top-level nav item
  // ------------------------------------------------------------------
  function renderNavItem(item) {
    const url = resolveUrl(item.url);
    const label = escapeHtml(item.label);
    const hasChildren = item.children && item.children.length > 0;

    if (!hasChildren) {
      return `
        <li class="nav-item">
          <a href="${url}" class="nav-link">${label}</a>
        </li>
      `;
    }

    const dropdownItems = item.children.map(renderDropdownItem).join("");

    return `
      <li class="nav-item nav-item--has-dropdown">
        <button type="button" class="nav-link nav-dropdown-toggle" aria-expanded="false" aria-haspopup="true">
          ${label}
          <svg class="nav-caret" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
        <div class="nav-dropdown" hidden>
          <ul class="nav-dropdown-list">
            ${dropdownItems}
          </ul>
        </div>
      </li>
    `;
  }

  // ------------------------------------------------------------------
  // Render mobile menu items (accordion style)
  // ------------------------------------------------------------------
  function renderMobileItem(item) {
    const url = resolveUrl(item.url);
    const label = escapeHtml(item.label);
    const hasChildren = item.children && item.children.length > 0;

    if (!hasChildren) {
      return `
        <li class="mobile-nav-item">
          <a href="${url}" class="mobile-nav-link">${label}</a>
        </li>
      `;
    }

    const subItems = item.children.map((child) => `
      <li>
        <a href="${resolveUrl(child.url)}" class="mobile-nav-sublink">
          ${getLucideIcon(child.icon_name, 16)}
          <span>
            <span class="mobile-nav-sublabel">${escapeHtml(child.label)}</span>
            ${child.description ? `<span class="mobile-nav-subdesc">${escapeHtml(child.description)}</span>` : ""}
          </span>
        </a>
      </li>
    `).join("");

    return `
      <li class="mobile-nav-item mobile-nav-item--has-sub">
        <button type="button" class="mobile-nav-link mobile-nav-toggle" aria-expanded="false">
          ${label}
          <svg class="mobile-nav-caret" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
        <ul class="mobile-nav-sub" hidden>
          ${subItems}
        </ul>
      </li>
    `;
  }

  // ------------------------------------------------------------------
  // Build header HTML
  // ------------------------------------------------------------------
  function buildHeaderHtml() {
    return `
      <header class="site-header" id="site-header">
        <!-- Top bar -->
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
              <!-- Mobile burger -->
              <button type="button" class="burger-btn" id="burgerBtn" aria-label="Buka menu" aria-expanded="false">
                <span class="burger-line"></span>
                <span class="burger-line"></span>
                <span class="burger-line"></span>
              </button>
            </div>
          </div>
        </div>
        <!-- Desktop nav bar -->
        <div class="site-navbar" id="desktopNavbar">
          <div class="container">
            <nav id="site-navbar" aria-label="Navigasi utama">
              <ul class="nav-list" id="navList">
                <li class="nav-item"><span class="nav-link" style="opacity:0.5;">Memuat...</span></li>
              </ul>
            </nav>
          </div>
        </div>
        <!-- Mobile menu overlay -->
        <div class="mobile-menu" id="mobileMenu" hidden aria-label="Menu mobile">
          <nav>
            <ul class="mobile-nav-list" id="mobileNavList">
              <li class="mobile-nav-item"><span class="mobile-nav-link" style="opacity:0.5;">Memuat...</span></li>
            </ul>
          </nav>
          <div class="mobile-menu-footer">
            <a href="${resolveUrl("admin/login.html")}" class="btn-login" style="width:100%;justify-content:center;">Login</a>
          </div>
        </div>
      </header>
    `;
  }

  // ------------------------------------------------------------------
  // Bind dropdown events (desktop)
  // ------------------------------------------------------------------
  function bindDesktopDropdowns(navList) {
    const toggles = navList.querySelectorAll(".nav-dropdown-toggle");

    toggles.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const dropdown = btn.nextElementSibling;
        const isOpen = !dropdown.hidden;

        // Tutup semua dropdown lain
        navList.querySelectorAll(".nav-dropdown").forEach((d) => { d.hidden = true; });
        navList.querySelectorAll(".nav-dropdown-toggle").forEach((b) => { b.setAttribute("aria-expanded", "false"); });

        if (!isOpen) {
          dropdown.hidden = false;
          btn.setAttribute("aria-expanded", "true");
        }
      });
    });

    // Klik luar → tutup semua
    document.addEventListener("click", () => {
      navList.querySelectorAll(".nav-dropdown").forEach((d) => { d.hidden = true; });
      navList.querySelectorAll(".nav-dropdown-toggle").forEach((b) => { b.setAttribute("aria-expanded", "false"); });
    });

    // Escape key → tutup semua
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        navList.querySelectorAll(".nav-dropdown").forEach((d) => { d.hidden = true; });
        navList.querySelectorAll(".nav-dropdown-toggle").forEach((b) => { b.setAttribute("aria-expanded", "false"); });
      }
    });
  }

  // ------------------------------------------------------------------
  // Bind mobile menu events
  // ------------------------------------------------------------------
  function bindMobileMenu() {
    const burger = document.getElementById("burgerBtn");
    const mobileMenu = document.getElementById("mobileMenu");
    const mobileNavList = document.getElementById("mobileNavList");

    if (!burger || !mobileMenu) return;

    // Burger toggle
    burger.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = !mobileMenu.hidden;
      mobileMenu.hidden = isOpen;
      burger.setAttribute("aria-expanded", String(!isOpen));
      burger.classList.toggle("burger-btn--open", !isOpen);
      document.body.style.overflow = isOpen ? "" : "hidden";
    });

    // Close mobile menu saat klik luar
    document.addEventListener("click", (e) => {
      if (!mobileMenu.hidden && !mobileMenu.contains(e.target) && !burger.contains(e.target)) {
        mobileMenu.hidden = true;
        burger.setAttribute("aria-expanded", "false");
        burger.classList.remove("burger-btn--open");
        document.body.style.overflow = "";
      }
    });

    // Mobile accordion
    if (mobileNavList) {
      mobileNavList.querySelectorAll(".mobile-nav-toggle").forEach((btn) => {
        btn.addEventListener("click", () => {
          const sub = btn.nextElementSibling;
          const isOpen = !sub.hidden;
          sub.hidden = isOpen;
          btn.setAttribute("aria-expanded", String(!isOpen));
          btn.classList.toggle("mobile-nav-toggle--open", !isOpen);
        });
      });
    }
  }

  // ------------------------------------------------------------------
  // Render nav dari data Supabase
  // ------------------------------------------------------------------
  function renderDesktopNav(tree) {
    const navList = document.getElementById("navList");
    if (!navList) return;
    navList.innerHTML = tree.map(renderNavItem).join("");
    bindDesktopDropdowns(navList);
  }

  function renderMobileNav(tree) {
    const mobileNavList = document.getElementById("mobileNavList");
    if (!mobileNavList) return;
    mobileNavList.innerHTML = tree.map(renderMobileItem).join("");
    bindMobileMenu();
  }

  // ------------------------------------------------------------------
  // Boot
  // ------------------------------------------------------------------
  async function boot() {
    // 1. Inject header HTML
    const mount = document.getElementById("site-header-mount");
    if (mount) {
      mount.outerHTML = buildHeaderHtml();
    }

    // 2. Bind burger (tersedia setelah inject)
    bindMobileMenu();

    // 3. Fetch menu dari Supabase dan render
    try {
      const flat = await menus.list();
      const tree = menus.buildTree(flat);
      renderDesktopNav(tree);
      renderMobileNav(tree);
    } catch (err) {
      console.warn("Header: gagal memuat menu.", err.message);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();