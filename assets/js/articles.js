(function initArticlesPage() {
  "use strict";

  if (!window.WafaSupabase) {
    return;
  }

  const { articles } = window.WafaSupabase;

  const FALLBACK_THUMBNAIL = "assets/img/thumbnail-placeholder.png";

  const elements = {
    listSection: document.querySelector(".articles"),
    list: document.getElementById("article-list"),
    detailSection: document.getElementById("article-detail"),
    pageHeading: document.querySelector(".hero h2"),
    pageDescription: document.querySelector(".hero p"),
    detailTitle: document.getElementById("detail-title"),
    detailMeta: document.getElementById("detail-meta"),
    detailContent: document.getElementById("detail-content"),
    detailThumbnail: document.getElementById("detail-thumbnail"),
  };

  function getSlugFromUrl() {
    return new URLSearchParams(window.location.search).get("slug");
  }

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

  function renderContent(value) {
    return escapeHtml(value)
      .split(/\n{2,}/)
      .map((paragraph) => `<p>${paragraph.replaceAll("\n", "<br>")}</p>`)
      .join("");
  }

  function setListLoading() {
    elements.list.innerHTML = `
      <article class="article-card">
        <h3>Memuat artikel...</h3>
        <p>Mohon tunggu sebentar.</p>
      </article>
    `;
  }

  function renderEmptyList() {
    elements.list.innerHTML = `
      <article class="article-card">
        <h3>Belum ada artikel</h3>
        <p>Artikel yang sudah dipublikasikan akan tampil di sini.</p>
      </article>
    `;
  }

  function renderListError() {
    elements.list.innerHTML = `
      <article class="article-card">
        <h3>Artikel belum bisa dimuat</h3>
        <p>Silakan coba lagi beberapa saat lagi.</p>
      </article>
    `;
  }

  function renderArticleList(items) {
    if (!items.length) {
      renderEmptyList();
      return;
    }

    elements.list.innerHTML = items
      .map((article) => {
        const title = escapeHtml(article.title || "Untitled");
        const excerpt = escapeHtml(article.excerpt || "");
        const category = escapeHtml(article.category || "Artikel");
        const publishedDate = formatDate(article.published_at);
        const slug = encodeURIComponent(article.slug || "");
        const thumbnailUrl = article.thumbnail_url || FALLBACK_THUMBNAIL;

        return `
          <article class="article-card">
            <a href="article.html?slug=${slug}">
              <img
                src="${thumbnailUrl}"
                alt="${title}"
                class="article-card-thumbnail"
                loading="lazy"
                onerror="this.onerror=null;this.src='${FALLBACK_THUMBNAIL}';"
              />
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

  function setDetailMode() {
    if (elements.listSection) {
      elements.listSection.hidden = true;
    }

    if (elements.detailSection) {
      elements.detailSection.hidden = false;
    }

    if (elements.pageHeading) {
      elements.pageHeading.textContent = "Membuka artikel...";
    }

    if (elements.pageDescription) {
      elements.pageDescription.textContent = "";
    }
  }

  function setListMode() {
    if (elements.listSection) {
      elements.listSection.hidden = false;
    }

    if (elements.detailSection) {
      elements.detailSection.hidden = true;
    }

    if (elements.pageHeading) {
      elements.pageHeading.textContent = "Semua artikel";
    }

    if (elements.pageDescription) {
      elements.pageDescription.textContent =
        "Kumpulan tulisan tentang akuntansi, perpajakan, dan keuangan praktis.";
    }
  }

  function renderNotFound() {
    document.title = "Artikel tidak ditemukan | wafaabbas.com";

    if (elements.pageHeading) {
      elements.pageHeading.textContent = "Artikel tidak ditemukan";
    }

    if (elements.detailTitle) {
      elements.detailTitle.textContent = "Artikel tidak ditemukan";
    }

    if (elements.detailMeta) {
      elements.detailMeta.textContent = "";
    }

    if (elements.detailThumbnail) {
      elements.detailThumbnail.hidden = true;
    }

    if (elements.detailContent) {
      elements.detailContent.innerHTML = `
        <p>Artikel ini belum tersedia atau belum dipublikasikan.</p>
        <p><a href="article.html">Kembali ke daftar artikel</a></p>
      `;
    }
  }

  function renderArticleDetail(article) {
    const publishedDate = formatDate(article.published_at);
    const category = article.category || "Artikel";

    document.title = `${article.title} | wafaabbas.com`;

    const description = document.querySelector("meta[name='description']");
    if (description && article.excerpt) {
      description.setAttribute("content", article.excerpt);
    }

    if (elements.pageHeading) {
      elements.pageHeading.textContent = article.title || "Untitled";
    }

    if (elements.pageDescription) {
      elements.pageDescription.textContent = article.excerpt || "";
    }

    if (elements.detailTitle) {
      elements.detailTitle.textContent = article.title || "Untitled";
    }

    if (elements.detailMeta) {
      elements.detailMeta.textContent = `${category}${publishedDate ? ` · ${publishedDate}` : ""}`;
    }

    if (elements.detailThumbnail) {
      if (article.thumbnail_url) {
        elements.detailThumbnail.src = article.thumbnail_url;
        elements.detailThumbnail.alt = article.title || "";
        elements.detailThumbnail.hidden = false;
        elements.detailThumbnail.onerror = function () {
          elements.detailThumbnail.hidden = true;
        };
      } else {
        elements.detailThumbnail.hidden = true;
      }
    }

    if (elements.detailContent) {
      elements.detailContent.innerHTML = renderContent(article.content || "");
    }
  }

  async function loadList() {
    setListMode();
    setListLoading();

    try {
      const publishedArticles = await articles.listPublished({ limit: 50 });
      renderArticleList(publishedArticles);
    } catch (error) {
      renderListError();
    }
  }

  async function loadDetail(slug) {
    setDetailMode();

    try {
      const article = await articles.getBySlug(slug);
      renderArticleDetail(article);
    } catch (error) {
      renderNotFound();
    }
  }

  function boot() {
    const slug = getSlugFromUrl();

    if (slug) {
      loadDetail(slug);
      return;
    }

    loadList();
  }

  boot();
})();