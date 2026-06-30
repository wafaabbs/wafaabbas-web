(function initPublicHome() {
  "use strict";

  const articlesList =
    document.getElementById("articlesList") ||
    document.getElementById("articleList") ||
    document.querySelector("[data-articles-list]") ||
    document.querySelector(".article-list");

  if (!articlesList || !window.WafaSupabase) {
    return;
  }

  const { articles } = window.WafaSupabase;

  function formatDate(value) {
    if (!value) {
      return "";
    }

    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(value));
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function renderLoading() {
    articlesList.innerHTML = `
      <article class="article-card">
        <h3>Memuat artikel...</h3>
        <p>Mohon tunggu sebentar.</p>
      </article>
    `;
  }

  function renderEmpty() {
    articlesList.innerHTML = `
      <article class="article-card">
        <h3>Belum ada artikel</h3>
        <p>Artikel yang sudah dipublikasikan akan tampil di sini.</p>
      </article>
    `;
  }

  function renderError() {
    articlesList.innerHTML = `
      <article class="article-card">
        <h3>Artikel belum bisa dimuat</h3>
        <p>Silakan coba lagi beberapa saat lagi.</p>
      </article>
    `;
  }

  function renderArticles(items) {
    if (!items.length) {
      renderEmpty();
      return;
    }

    articlesList.innerHTML = items
      .map((article) => {
        const title = escapeHtml(article.title || "Untitled");
        const excerpt = escapeHtml(article.excerpt || "");
        const category = escapeHtml(article.category || "Artikel");
        const publishedDate = formatDate(article.published_at);
        const slug = encodeURIComponent(article.slug || "");

        return `
          <article class="article-card">
            <a href="article.html?slug=${slug}">
              <h3>${title}</h3>
              <p>${excerpt}</p>
              <div class="article-meta">
                ${category}${publishedDate ? ` · ${publishedDate}` : ""}
              </div>
            </a>
          </article>
        `;
      })
      .join("");
  }

  async function loadPublishedArticles() {
    try {
      renderLoading();

      const publishedArticles = await articles.listPublished({ limit: 10 });
      renderArticles(publishedArticles);
    } catch (error) {
      renderError();
    }
  }

  loadPublishedArticles();
})();