// assets/js/articles.js
// Logika untuk halaman article.html: list + detail

document.addEventListener("DOMContentLoaded", () => {
  const yearSpan = document.getElementById("year");
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }

  renderArticleList().then(() => {
    // Setelah list beres, kalau ada slug di URL, highlight detail
    renderArticleDetailIfNeeded();
  });
});

async function renderArticleList() {
  const listEl = document.getElementById("article-list");
  const emptyEl = document.getElementById("article-empty-state");

  if (!listEl) return;
  if (!window.WafaSupabase) {
    console.warn("Supabase belum dikonfigurasi.");
    return;
  }

  listEl.innerHTML = "<p class='muted'>Memuat artikel...</p>";

  const { fetchPublishedArticles } = window.WafaSupabase;
  const { data, error } = await fetchPublishedArticles();

  if (error) {
    console.warn("Gagal load artikel:", error);
    listEl.innerHTML = "<p class='muted'>Gagal memuat artikel.</p>";
    return;
  }

  if (!data || data.length === 0) {
    listEl.innerHTML = "";
    if (emptyEl) emptyEl.style.display = "block";
    return;
  }

  if (emptyEl) emptyEl.style.display = "none";
  listEl.innerHTML = "";

  const params = new URLSearchParams(window.location.search);
  const activeSlug = params.get("slug");

  data.forEach((article) => {
    const card = document.createElement("article");
    card.className = "article-card";

    const href = `article.html?slug=${encodeURIComponent(article.slug)}`;

    const isActive = activeSlug && activeSlug === article.slug;

    card.innerHTML = `
      <h3>
        <a href="${href}" ${isActive ? "style='text-decoration:underline;'" : ""}>
          ${article.title}
        </a>
      </h3>
      <p>${article.excerpt || ""}</p>
      <div class="article-meta">
        <span>${formatDate(article.published_at)} · ${article.category || "Umum"}</span>
      </div>
    `;

    listEl.appendChild(card);
  });
}

async function renderArticleDetailIfNeeded() {
  if (!window.WafaSupabase) return;

  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug");
  if (!slug) return;

  const detailSection = document.getElementById("article-detail");
  const titleEl = document.getElementById("detail-title");
  const metaEl = document.getElementById("detail-meta");
  const contentEl = document.getElementById("detail-content");

  if (!detailSection || !titleEl || !metaEl || !contentEl) return;

  const { fetchArticleBySlug } = window.WafaSupabase;
  const { data, error } = await fetchArticleBySlug(slug);

  detailSection.hidden = false;

  if (error || !data) {
    titleEl.textContent = "Artikel tidak ditemukan";
    metaEl.textContent = "";
    contentEl.textContent = "Periksa kembali tautan artikel atau kembali ke daftar artikel.";
    return;
  }

  titleEl.textContent = data.title;
  metaEl.textContent = `${formatDate(data.published_at)} · ${data.category || "Umum"}`;
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