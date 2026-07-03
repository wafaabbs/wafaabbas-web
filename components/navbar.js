(function initNavbar() {
  "use strict";

  if (!window.WafaSupabase) {
    return;
  }

  const { menus } = window.WafaSupabase;

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
    const div = document.createElement("div");
    div.textContent = String(value || "");
    return div.innerHTML;
  }

  function renderMenuItem(item, depth) {
    depth = depth || 0;
    const label = escapeHtml(item.label);
    const url = resolveUrl(item.url);
    const hasChildren = item.children && item.children.length > 0;

    if (!hasChildren) {
      if (depth === 0) {
        return `<li class="nav-item"><a href="${url}" class="nav-link">${label}</a></li>`;
      }
      return `<li class="nav-item"><a href="${url}" class="nav-dropdown-link">${label}</a></li>`;
    }

    const childrenHtml = item.children
      .map(function (child) { return renderMenuItem(child, depth + 1); })
      .join("");

    if (depth === 0) {
      return `<li class="nav-item nav-item--has-dropdown">
        <button type="button" class="nav-link nav-dropdown-toggle" aria-expanded="false" aria-haspopup="true">
          ${label}
          <span class="nav-dropdown-caret" aria-hidden="true">&#9662;</span>
        </button>
        <ul class="nav-dropdown" hidden>
          ${childrenHtml}
        </ul>
      </li>`;
    }

    return `<li class="nav-item nav-item--has-dropdown">
      <button type="button" class="nav-dropdown-link nav-dropdown-toggle" aria-expanded="false" aria-haspopup="true">
        <span>${label}</span>
        <span class="nav-dropdown-caret nav-sub-caret" aria-hidden="true">&#8250;</span>
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

    nav.querySelectorAll(".nav-dropdown-toggle").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        const dropdown = btn.nextElementSibling;
        const isOpen = !dropdown.hidden;

        const parentList = btn.closest("ul");
        if (parentList) {
          parentList.querySelectorAll(":scope > .nav-item > .nav-dropdown").forEach(function (d) {
            d.hidden = true;
          });
          parentList.querySelectorAll(":scope > .nav-item > .nav-dropdown-toggle").forEach(function (b) {
            b.setAttribute("aria-expanded", "false");
          });
        }

        if (!isOpen) {
          dropdown.hidden = false;
          btn.setAttribute("aria-expanded", "true");
        }
      });
    });

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