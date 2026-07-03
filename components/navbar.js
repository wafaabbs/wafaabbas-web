(function initNavbar() {
  "use strict";

  if (!window.WafaSupabase) {
    return;
  }

  const { menus } = window.WafaSupabase;

  // ---------------------------------------------------------------------
  // BASE_PATH — deteksi otomatis subfolder repo dari pathname.
  //
  // Cara kerja:
  // - Ambil pathname saat ini, misal "/wafaabbas-web/index.html"
  // - Cari segmen pertama setelah root ("/") yang bukan file HTML
  // - Kalau ada → itu subfolder repo, jadikan BASE_PATH
  // - Kalau tidak ada (deploy di root domain) → BASE_PATH = "/"
  //
  // Contoh:
  // "/wafaabbas-web/index.html"       → BASE_PATH = "/wafaabbas-web/"
  // "/wafaabbas-web/admin/posts.html" → BASE_PATH = "/wafaabbas-web/"
  // "/index.html"                     → BASE_PATH = "/"
  // ---------------------------------------------------------------------

  function detectBasePath() {
    const parts = window.location.pathname.split("/").filter(Boolean);
    if (!parts.length || parts[0].includes(".")) {
      return "/";
    }
    return "/" + parts[0] + "/";
  }

  const BASE_PATH = detectBasePath();

  function resolveUrl(url) {
    if (!url) return "#";
    if (
      url.startsWith("http") ||
      url.startsWith("mailto") ||
      url.startsWith("#") ||
      url.startsWith(BASE_PATH)
    ) {
      return url;
    }
    return BASE_PATH + url.replace(/^\//, "");
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&")
      .replaceAll("<", "<")
      .replaceAll(">", ">")
      .replaceAll('"', """)
      .replaceAll("'", "&#039;");
  }

  // ---------------------------------------------------------------------
  // renderMenuItem — rekursif, support multi-level tanpa batas kedalaman.
  //
  // depth=0 → top-level navbar item
  // depth>0 → di dalam dropdown (flyout ke kanan desktop, indent mobile)
  // ---------------------------------------------------------------------
  function renderMenuItem(item, depth) {
    depth = depth || 0;
    const label = escapeHtml(item.label);
    const url = resolveUrl(item.url);
    const hasChildren = item.children && item.children.length > 0;

    // Tidak ada children → link biasa
    if (!hasChildren) {
      if (depth === 0) {
        return `<li class="nav-item"><a href="${url}" class="nav-link">${label}</a></li>`;
      }
      return `<li class="nav-item"><a href="${url}" class="nav-dropdown-link">${label}</a></li>`;
    }

    // Ada children → render toggle + submenu rekursif
    const childrenHtml = item.children
      .map(function (child) { return renderMenuItem(child, depth + 1); })
      .join("");

    if (depth === 0) {
      // Top-level: dropdown ke bawah
      return `<li class="nav-item nav-item--has-dropdown">
        <button type="button" class="nav-link nav-dropdown-toggle" aria-expanded="false" aria-haspopup="true">
          ${label}
          <span class="nav-dropdown-caret" aria-hidden="true">▾</span>
        </button>
        <ul class="nav-dropdown" hidden>
          ${childrenHtml}
        </ul>
      </li>`;
    }

    // Level 2+: flyout ke kanan
    return `<li class="nav-item nav-item--has-dropdown">
      <button type="button" class="nav-dropdown-link nav-dropdown-toggle" aria-expanded="false" aria-haspopup="true">
        <span>${label}</span>
        <span class="nav-dropdown-caret nav-sub-caret" aria-hidden="true">›</span>
      </button>
      <ul class="nav-dropdown nav-subdropdown" hidden>
        ${childrenHtml}
      </ul>
    </li>`;
  }

  function renderNavbar(tree) {
    const nav = document.getElementById("site-navbar");
    if (!nav) return;

    const items = tree.map(function (item) { return renderMenuItem(item, 0); }).join("");
    nav.innerHTML = `<ul class="nav-list">${items}</ul>`;

    // Bind klik untuk semua toggle — bekerja di semua level
    nav.querySelectorAll(".nav-dropdown-toggle").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        const dropdown = btn.nextElementSibling;
        const isOpen = !dropdown.hidden;

        // Tutup siblings di level yang sama saja (bukan seluruh nav)
        const parentList = btn.closest("ul");
        if (parentList) {
          parentList.querySelectorAll(":scope > .nav-item > .nav-dropdown").forEach(function (d) {
            d.hidden = true;
          });
          parentList.querySelectorAll(":scope > .nav-item > .nav-dropdown-toggle").forEach(function (b) {
            b.setAttribute("aria-expanded", "false");
          });
        }

        // Toggle yang diklik
        if (!isOpen) {
          dropdown.hidden = false;
          btn.setAttribute("aria-expanded", "true");
        }
      });
    });

    // Klik di luar navbar → tutup semua dropdown
    document.addEventListener("click", function () {
      nav.querySelectorAll(".nav-dropdown").forEach(function (d) { d.hidden = true; });
      nav.querySelectorAll(".nav-dropdown-toggle").forEach(function (b) {
        b.setAttribute("aria-expanded", "false");
      });
    });
  }

  async function boot() {
    try {
      const flat = await menus.list();
      const tree = menus.buildTree(flat);
      renderNavbar(tree);
    } catch (err) {
      console.warn("Navbar: gagal memuat menu.", err.message);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();