// assets/js/main.js
// Script ringan untuk halaman index (home)

// Tahun di footer
document.addEventListener("DOMContentLoaded", () => {
  const yearSpan = document.getElementById("year");
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }

  // Coba isi daftar artikel dari Supabase (kalau sudah dikonfigurasi)
  renderHomepageArticles();
});

async function renderHomepageArticles() {
  const listEl = document.getElementById("article-list");
  const emptyEl = document.getElementById("article-empty-state");
  if (!listEl) return;

  // Kalau Supabase belum diset, biarkan empty state muncul
  if (!window.WafaSupabase) return;

  const { fetchPublishedArticles } = window.WafaSupabase;
  const { data, error } = await fetchPublishedArticles();

  if (error) {
    console.warn("Gagal load artikel:", error);
    return;
  }

  if (!data || data.length === 0) {
    if (emptyEl) emptyEl.style.display = "block";
    return;
  }

  if (emptyEl) emptyEl.style.display = "none";
  listEl.innerHTML = "";

  // Ambil beberapa artikel terbaru saja (misal 3)
  const latest = data.slice(0, 3);
  latest.forEach((article) => {
    const card = document.createElement("article");
    card.className = "article-card";

    const href = `article.html?slug=${encodeURIComponent(article.slug)}`;

    card.innerHTML = `
      <h3><a href="${href}">${article.title}</a></h3>
      <p>${article.excerpt || ""}</p>
      <div class="article-meta">
        <span>${formatDate(article.published_at)} · ${article.category || "Umum"}</span>
      </div>
    `;

    listEl.appendChild(card);
  });
}

function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("id-ID", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}