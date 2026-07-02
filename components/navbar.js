(function initNavbar() {
  "use strict";

  // Navbar di-inject ke elemen dengan id="site-navbar" atau
  // class="site-nav" yang sudah ada di HTML.
  // Di-load setelah services/supabase.js.

  if (!window.WafaSupabase) {
    return;
  }

  const { menus } = window.WafaSupabase;

  // Tentukan path prefix relatif berdasarkan lokasi halaman saat ini.
  // Halaman di root: prefix = ""
  // Halaman di subfolder (admin/): prefix = "../"
  function getPathPrefix() {
    const path = window.location.pathname;
    const depth = (path.match(/\//g) || []).length;
    // Kalau URL-nya /admin/xxx.html, depth >= 2 → prefix "../"
    // Kalau URL-nya /xxx.html atau /, depth <= 1 → prefix ""
    return depth >= 2 ? "../" : "";
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // Tambahkan path prefix ke URL relatif dari database.
  // URL absolut (http/https/mailto) dan anchor (#) dibiarkan.
  function resolveUrl(url) {
    if (!url) return "#";
    if (url.startsWith("http") || url.startsWith("mailto") || url.startsWith("#")) {
      return url;
    }
    return getPathPrefix() + url;
  }

  // Render satu item menu (top-level atau submenu)
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

        // Tutup semua dropdown lain yang terbuka dulu
        nav.querySelectorAll(".nav-dropdown").forEach((d) => {
          d.hidden = true;
        });
        nav.querySelectorAll(".nav-dropdown-toggle").forEach((b) => {
          b.setAttribute("aria-expanded", "false");
        });

        // Toggle dropdown yang diklik
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
      // Fallback: kalau fetch gagal, navbar tetap kosong tapi halaman tidak crash
      console.warn("Navbar: gagal memuat menu.", err.message);
    }
  }

  // Tunggu DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();