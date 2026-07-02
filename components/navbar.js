(function initNavbar() {
  "use strict";

  if (!window.WafaSupabase) {
    return;
  }

  const { menus } = window.WafaSupabase;

  // === BASE_PATH: deteksi subfolder deployment ===
  // Di GitHub Pages project site, URL-nya <username>.github.io/wafaabbas-web/...
  // jadi path pertama = nama repo. Kalau nanti custom domain (wafaabbas.com),
  // hostname gak lagi endsWith "github.io", BASE_PATH otomatis jadi "".
  function getBasePath() {
    if (window.location.hostname.endsWith("github.io")) {
      return "/wafaabbas-web";
    }
    return "";
  }

  const BASE_PATH = getBasePath();

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // Tambahkan BASE_PATH ke URL relatif dari database.
  // URL absolut (http/https/mailto) dan anchor (#) dibiarkan apa adanya.
  function resolveUrl(url) {
    if (!url) return "#";
    if (url.startsWith("http") || url.startsWith("mailto") || url.startsWith("#")) {
      return url;
    }
    const cleanUrl = url.startsWith("/") ? url : "/" + url;
    return BASE_PATH + cleanUrl;
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

    nav.querySelectorAll(".nav-dropdown-toggle").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const dropdown = btn.nextElementSibling;
        const isOpen = !dropdown.hidden;

        nav.querySelectorAll(".nav-dropdown").forEach((d) => {
          d.hidden = true;
        });
        nav.querySelectorAll(".nav-dropdown-toggle").forEach((b) => {
          b.setAttribute("aria-expanded", "false");
        });

        if (!isOpen) {
          dropdown.hidden = false;
          btn.setAttribute("aria-expanded", "true");
        }
      });
    });

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