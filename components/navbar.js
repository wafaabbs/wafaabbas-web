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
  // "/wafaabbas-web/index.html"      → BASE_PATH = "/wafaabbas-web/"
  // "/wafaabbas-web/admin/posts.html"→ BASE_PATH = "/wafaabbas-web/"
  // "/index.html"                    → BASE_PATH = "/"
  // ---------------------------------------------------------------------

  function detectBasePath() {
    const parts = window.location.pathname.split("/").filter(Boolean);
    // Kalau tidak ada segmen, atau segmen pertama adalah file (.html),
    // berarti situs di-serve dari root.
    if (!parts.length || parts[0].includes(".")) {
      return "/";
    }
    // Segmen pertama adalah subfolder repo.
    return "/" + parts[0] + "/";
  }

  const BASE_PATH = detectBasePath();

  // Resolve URL dari database ke URL absolut yang benar.
  // - URL sudah absolut (http/https/mailto/#) → dibiarkan
  // - URL sudah mulai dengan BASE_PATH → dibiarkan (tidak double-prefix)
  // - URL relatif → prepend BASE_PATH
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
    // Buang leading slash kalau ada, biar tidak jadi double slash
    return BASE_PATH + url.replace(/^\//, "");
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function renderMenuItem(item) {
    const label = escapeHtml(item.label);
    const url = resolveUrl(item.url);
    const hasChildren = item.children && item.children.length > 0;

    if (!hasChildren) {
      return `<li class="nav-item"><a href="${url}" class="nav-link">${label}</a></li>`;
    }

    const submenuItems = item.children
      .map((child) => {
        const childLabel = escapeHtml(child.label);
        const childUrl = resolveUrl(child.url);
        return `<li><a href="${childUrl}" class="nav-dropdown-link">${childLabel}</a></li>`;
      })
      .join("");

    return `
      <li class="nav-item nav-item--has-dropdown">
        <button type="button" class="nav-link nav-dropdown-toggle" aria-expanded="false">
          ${label}
          <span class="nav-dropdown-caret" aria-hidden="true">▾</span>
        </button>
        <ul class="nav-dropdown" hidden>
          ${submenuItems}
        </ul>
      </li>
    `;
  }

  function renderNavbar(tree) {
    const nav = document.getElementById("site-navbar");

    if (!nav) {
      return;
    }

    const items = tree.map(renderMenuItem).join("");
    nav.innerHTML = `<ul class="nav-list">${items}</ul>`;

    // Bind klik untuk dropdown toggle
    nav.querySelectorAll(".nav-dropdown-toggle").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const dropdown = btn.nextElementSibling;
        const isOpen = !dropdown.hidden;

        // Tutup semua dropdown lain dulu
        nav.querySelectorAll(".nav-dropdown").forEach((d) => {
          d.hidden = true;
        });
        nav.querySelectorAll(".nav-dropdown-toggle").forEach((b) => {
          b.setAttribute("aria-expanded", "false");
        });

        // Toggle yang diklik
        if (!isOpen) {
          dropdown.hidden = false;
          btn.setAttribute("aria-expanded", "true");
        }
      });
    });

    // Klik di luar navbar → tutup semua dropdown
    document.addEventListener("click", () => {
      nav.querySelectorAll(".nav-dropdown").forEach((d) => {
        d.hidden = true;
      });
      nav.querySelectorAll(".nav-dropdown-toggle").forEach((b) => {
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