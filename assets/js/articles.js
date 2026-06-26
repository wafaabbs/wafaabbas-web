// assets/js/articles.js
// Logika untuk halaman article.html

document.addEventListener("DOMContentLoaded", () => {
  const yearSpan = document.getElementById("year");
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }

  renderArticleList();
  renderArticleDetailIfNeeded();
});

async function renderArticleList() {
  const listEl = document.getElementById("article-list");
  const emptyEl = document.getElementById("article-empty-state");
  if (!listEl || !window.WafaSupabase) return;

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

  data.forEach((article) => {
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

async function renderArticleDetailIfNeeded() {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug");
  if (!slug || !window.WafaSupabase) return;

  const detailSection = document.getElementById("article-detail");
  const titleEl = document.getElementById("detail-title");
  const metaEl = document.getElementById("detail-meta");
  const contentEl = document.getElementById("detail-content");

  const { fetchArticleBySlug } = window.WafaSupabase;
  const { data, error } = await fetchArticleBySlug(slug);

  if (error || !data) {
    if (detailSection) {
      detailSection.hidden = false;
      titleEl.textContent = "Artikel tidak ditemukan";
      metaEl.textContent = "";
      contentEl.textContent = "Periksa kembali tautan artikel.";
    }
    return;
  }

  detailSection.hidden = false;
  titleEl.textContent = data.title;
  metaEl.textContent = `${formatDate(data.published_at)} · ${data.category || "Umum"}`;

  // Untuk sekarang content dianggap HTML yang aman dari CMS lo sendiri
  contentEl.innerHTML = data.content || "";
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