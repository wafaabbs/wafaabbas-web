(function initFontSizeToggle() {
  "use strict";

  // ============================================================
  // Font Size Toggle
  // Inject tombol A- / A / A+ di navbar.
  // Mengubah data-font-size di <html>, yang dikontrol via CSS:
  //   html[data-font-size="sm"] { font-size: 14px }
  //   html[data-font-size="md"] { font-size: 16px }  ← default
  //   html[data-font-size="lg"] { font-size: 18px }
  //   html[data-font-size="xl"] { font-size: 20px }
  // Semua komponen pakai var(--text-*) yang berbasis rem,
  // jadi seluruh halaman scale otomatis.
  // ============================================================

  const SIZES = ["sm", "md", "lg", "xl"];
  const LABELS = { sm: "A-", md: "A", lg: "A+", xl: "A++" };
  const STORAGE_KEY = "wafa_font_size";
  const DEFAULT_SIZE = "md";

  function getSize() {
    const stored = localStorage.getItem(STORAGE_KEY);
    return SIZES.includes(stored) ? stored : DEFAULT_SIZE;
  }

  function applySize(size) {
    document.documentElement.setAttribute("data-font-size", size);
    localStorage.setItem(STORAGE_KEY, size);
  }

  function getCurrentIndex() {
    return SIZES.indexOf(getSize());
  }

  function injectButtons() {
    function tryAppend() {
      const navList = document.querySelector("#site-navbar .nav-list");
      if (!navList) {
        setTimeout(tryAppend, 100);
        return;
      }

      const li = document.createElement("li");
      li.className = "nav-item nav-fontsize-item";
      li.setAttribute("aria-label", "Ukuran teks");

      const wrapper = document.createElement("div");
      wrapper.className = "nav-fontsize-controls";

      // Tombol decrease
      const btnDecrease = document.createElement("button");
      btnDecrease.type = "button";
      btnDecrease.className = "nav-fontsize-btn";
      btnDecrease.setAttribute("aria-label", "Perkecil teks");
      btnDecrease.textContent = "A-";

      // Label ukuran aktif
      const labelEl = document.createElement("span");
      labelEl.className = "nav-fontsize-label";
      labelEl.setAttribute("aria-live", "polite");

      // Tombol increase
      const btnIncrease = document.createElement("button");
      btnIncrease.type = "button";
      btnIncrease.className = "nav-fontsize-btn";
      btnIncrease.setAttribute("aria-label", "Perbesar teks");
      btnIncrease.textContent = "A+";

      function updateState() {
        const idx = getCurrentIndex();
        const size = SIZES[idx];
        labelEl.textContent = LABELS[size];
        btnDecrease.disabled = idx === 0;
        btnIncrease.disabled = idx === SIZES.length - 1;
        btnDecrease.style.opacity = idx === 0 ? "0.4" : "1";
        btnIncrease.style.opacity = idx === SIZES.length - 1 ? "0.4" : "1";
      }

      btnDecrease.addEventListener("click", () => {
        const idx = getCurrentIndex();
        if (idx > 0) {
          applySize(SIZES[idx - 1]);
          updateState();
        }
      });

      btnIncrease.addEventListener("click", () => {
        const idx = getCurrentIndex();
        if (idx < SIZES.length - 1) {
          applySize(SIZES[idx + 1]);
          updateState();
        }
      });

      wrapper.appendChild(btnDecrease);
      wrapper.appendChild(labelEl);
      wrapper.appendChild(btnIncrease);
      li.appendChild(wrapper);

      // Insert sebelum lang toggle kalau ada, atau append di akhir
      const langItem = navList.querySelector(".nav-lang-item");
      if (langItem) {
        navList.insertBefore(li, langItem);
      } else {
        navList.appendChild(li);
      }

      updateState();
    }

    tryAppend();
  }

  function boot() {
    // Apply ukuran yang tersimpan sebelum render (hindari flash)
    applySize(getSize());

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", injectButtons);
    } else {
      injectButtons();
    }
  }

  boot();
})();