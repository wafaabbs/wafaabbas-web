(function initGoogleTranslate() {
  "use strict";

  // ============================================================
  // Google Translate Widget
  // Tidak butuh API key, tidak ada limit, gratis selamanya.
  // Widget di-inject sebagai tombol EN/ID di navbar.
  // ============================================================

  function injectGoogleTranslateScript() {
    // Inject script Google Translate hanya sekali
    if (document.getElementById("google-translate-script")) return;

    const script = document.createElement("script");
    script.id = "google-translate-script";
    script.src =
      "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    script.async = true;
    document.head.appendChild(script);
  }

  // Callback yang dipanggil Google Translate setelah script-nya load
  window.googleTranslateElementInit = function () {
    new window.google.translate.TranslateElement(
      {
        pageLanguage: "id",
        includedLanguages: "en,id",
        autoDisplay: false,
        // Layout: minimal — sembunyikan widget bawaan Google,
        // kita pakai tombol custom di navbar
        layout:
          window.google.translate.TranslateElement.InlineLayout.SIMPLE,
      },
      "google-translate-container"
    );
  };

  // ----------------------------------------------------------------
  // Ambil atau buat container tersembunyi untuk widget Google
  // ----------------------------------------------------------------
  function getOrCreateContainer() {
    let container = document.getElementById("google-translate-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "google-translate-container";
      container.style.cssText = "position:absolute;visibility:hidden;height:0;overflow:hidden;";
      document.body.appendChild(container);
    }
    return container;
  }

  // ----------------------------------------------------------------
  // Deteksi bahasa aktif dari cookie Google Translate
  // ----------------------------------------------------------------
  function getActiveLang() {
    const match = document.cookie.match(/googtrans=\/id\/([a-z]+)/);
    return match ? match[1].toUpperCase() : "ID";
  }

  // ----------------------------------------------------------------
  // Trigger terjemahan ke bahasa tertentu lewat select widget
  // ----------------------------------------------------------------
  function triggerTranslate(targetLang) {
    const select = document.querySelector(".goog-te-combo");
    if (!select) return false;

    select.value = targetLang.toLowerCase();
    select.dispatchEvent(new Event("change"));
    return true;
  }

  // ----------------------------------------------------------------
  // Update tampilan tombol
  // ----------------------------------------------------------------
  function updateButton(btn) {
    const lang = getActiveLang();
    if (lang === "ID" || lang === "AUTO") {
      btn.textContent = "EN";
      btn.title = "Switch to English";
    } else {
      btn.textContent = "ID";
      btn.title = "Ganti ke Bahasa Indonesia";
    }
  }

  // ----------------------------------------------------------------
  // Inject tombol toggle ke navbar
  // ----------------------------------------------------------------
  function injectToggleButton() {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "nav-lang-toggle";
    btn.setAttribute("aria-label", "Toggle language");

    btn.addEventListener("click", () => {
      const current = getActiveLang();
      const next = current === "ID" || current === "AUTO" ? "en" : "id";

      // Tunggu widget siap, coba beberapa kali
      let attempts = 0;
      const tryTranslate = setInterval(() => {
        const success = triggerTranslate(next);
        attempts++;
        if (success || attempts > 20) {
          clearInterval(tryTranslate);
          setTimeout(() => updateButton(btn), 500);
        }
      }, 200);
    });

    // Inject ke nav-list setelah navbar.js selesai render
    function tryAppend() {
      const navList = document.querySelector("#site-navbar .nav-list");
      if (navList) {
        const li = document.createElement("li");
        li.className = "nav-item nav-lang-item";
        li.appendChild(btn);
        navList.appendChild(li);
        updateButton(btn);
      } else {
        setTimeout(tryAppend, 100);
      }
    }

    tryAppend();
    return btn;
  }

  // ----------------------------------------------------------------
  // Sembunyikan toolbar Google Translate yang muncul di atas halaman
  // ----------------------------------------------------------------
  function hideGoogleToolbar() {
    const style = document.createElement("style");
    style.textContent = `
      .goog-te-banner-frame,
      .goog-te-balloon-frame,
      #goog-gt-tt,
      .goog-te-balloon-frame,
      .goog-tooltip,
      .goog-tooltip:hover {
        display: none !important;
      }
      body {
        top: 0 !important;
        position: static !important;
      }
    `;
    document.head.appendChild(style);
  }

  // ----------------------------------------------------------------
  // Boot
  // ----------------------------------------------------------------
  function boot() {
    getOrCreateContainer();
    hideGoogleToolbar();
    injectGoogleTranslateScript();

    // Inject tombol setelah DOM ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", injectToggleButton);
    } else {
      injectToggleButton();
    }
  }

  boot();
})();