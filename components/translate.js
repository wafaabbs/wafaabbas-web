(function initTranslate() {
  "use strict";

  const STORAGE_KEY = "wafa_lang";
  const PAGE_LANG = "id";
  const TARGET_LANG = "en";

  function setGoogCookie(from, to) {
    const val = "/" + from + "/" + to;
    ["", "; domain=" + window.location.hostname].forEach(function (d) {
      document.cookie = "googtrans=" + val + "; path=/" + d;
    });
  }

  function clearGoogCookie() {
    const past = "Thu, 01 Jan 1970 00:00:00 UTC";
    ["", "; domain=" + window.location.hostname].forEach(function (d) {
      document.cookie = "googtrans=; expires=" + past + "; path=/" + d;
    });
  }

  function getSavedLang() {
    return localStorage.getItem(STORAGE_KEY) || PAGE_LANG;
  }

  function saveLang(lang) {
    localStorage.setItem(STORAGE_KEY, lang);
  }

  function syncCookieWithPreference() {
    const lang = getSavedLang();
    if (lang !== PAGE_LANG) {
      setGoogCookie(PAGE_LANG, lang);
    } else {
      clearGoogCookie();
    }
  }

  function toggleLang() {
    const current = getSavedLang();
    const next = current === PAGE_LANG ? TARGET_LANG : PAGE_LANG;
    saveLang(next);
    if (next !== PAGE_LANG) {
      setGoogCookie(PAGE_LANG, next);
    } else {
      clearGoogCookie();
    }
    window.location.reload();
  }

  function renderToggleButton(nav) {
    if (document.getElementById("lang-toggle")) return;

    const isTranslated = getSavedLang() !== PAGE_LANG;

    const li = document.createElement("li");
    li.className = "nav-item nav-item--lang";

    const btn = document.createElement("button");
    btn.id = "lang-toggle";
    btn.type = "button";
    btn.className = "nav-lang-toggle";
    btn.textContent = isTranslated ? "ID" : "EN";
    btn.setAttribute("aria-label", isTranslated ? "Ganti ke Bahasa Indonesia" : "Switch to English");
    btn.addEventListener("click", toggleLang);

    li.appendChild(btn);

    const ul = nav.querySelector(".nav-list");
    if (ul) {
      ul.appendChild(li);
    } else {
      nav.appendChild(btn);
    }
  }

  window.googleTranslateElementInit = function () {
    new google.translate.TranslateElement(
      { pageLanguage: PAGE_LANG, includedLanguages: TARGET_LANG, autoDisplay: false },
      "google_translate_element"
    );
  };

  function loadGoogleTranslate() {
    const container = document.createElement("div");
    container.id = "google_translate_element";
    container.style.cssText =
      "position:absolute;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;left:-9999px;";
    document.body.appendChild(container);

    const script = document.createElement("script");
    script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    script.async = true;
    document.head.appendChild(script);
  }

  function watchNavbar() {
    const nav = document.getElementById("site-navbar");
    if (!nav) return;

    if (nav.querySelector(".nav-list")) {
      renderToggleButton(nav);
      return;
    }

    const observer = new MutationObserver(function (mutations, obs) {
      if (nav.querySelector(".nav-list")) {
        obs.disconnect();
        renderToggleButton(nav);
      }
    });

    observer.observe(nav, { childList: true, subtree: false });
  }

  function boot() {
    syncCookieWithPreference();
    loadGoogleTranslate();
    watchNavbar();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();