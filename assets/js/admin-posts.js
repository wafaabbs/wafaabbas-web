(function initAdminPosts() {
  "use strict";

  if (!window.WafaSupabase) {
    return;
  }

  const { auth, articles } = window.WafaSupabase;

  const elements = {
    logoutButton: document.getElementById("logoutButton"),
    postsSummary: document.getElementById("postsSummary"),
    postSearchInput: document.getElementById("postSearchInput"),
    postStatusFilter: document.getElementById("postStatusFilter"),
    postsTableBody: document.getElementById("postsTableBody"),
  };

  let posts = [];

  function formatDate(value) {
    if (!value) {
      return "-";
    }

    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
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

  function setSummary() {
    const total = posts.length;
    const published = posts.filter(
      (post) => post.status === articles.status.PUBLISHED
    ).length;
    const draft = posts.filter(
      (post) => post.status === articles.status.DRAFT
    ).length;

    elements.postsSummary.textContent = `${total} artikel · ${published} published · ${draft} draft`;
  }

  function getFilteredPosts() {
    const search = elements.postSearchInput.value.trim().toLowerCase();
    const status = elements.postStatusFilter.value;

    return posts.filter((post) => {
      const matchesSearch = !search
        ? true
        : [post.title, post.excerpt, post.category, post.slug]
            .filter(Boolean)
            .some((value) => value.toLowerCase().includes(search));

      const matchesStatus = status ? post.status === status : true;

      return matchesSearch && matchesStatus;
    });
  }

  function renderPosts() {
    const filteredPosts = getFilteredPosts();

    if (!filteredPosts.length) {
      elements.postsTableBody.innerHTML = `
        <tr>
          <td colspan="5">Tidak ada artikel yang cocok.</td>
        </tr>
      `;
      return;
    }

    elements.postsTableBody.innerHTML = filteredPosts
      .map((post) => {
        const id = encodeURIComponent(post.id);
        const title = escapeHtml(post.title || "Untitled");
        const category = escapeHtml(post.category || "-");
        const status = escapeHtml(post.status || "draft");
        const updatedAt = formatDate(post.updated_at || post.created_at);

        return `
          <tr>
            <td>
              <strong>${title}</strong>
              <div class="admin-muted">${escapeHtml(post.slug || "")}</div>
            </td>
            <td>${category}</td>
            <td>
              <span class="admin-status admin-status-${status}">
                ${status}
              </span>
            </td>
            <td>${updatedAt}</td>
            <td>
              <a class="admin-button-small" href="./editor.html?id=${id}">
                Edit
              </a>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  async function loadPosts() {
    elements.postsTableBody.innerHTML = `
      <tr>
        <td colspan="5">Memuat artikel...</td>
      </tr>
    `;

    try {
      posts = await articles.listAdmin();
      setSummary();
      renderPosts();
    } catch (error) {
      elements.postsSummary.textContent = "Gagal memuat artikel.";
      elements.postsTableBody.innerHTML = `
        <tr>
          <td colspan="5">${escapeHtml(error.message || "Gagal memuat artikel.")}</td>
        </tr>
      `;
    }
  }

  async function handleLogout() {
    await auth.signOut();
    window.location.href = "./login.html";
  }

  function bindEvents() {
    elements.logoutButton.addEventListener("click", handleLogout);
    elements.postSearchInput.addEventListener("input", renderPosts);
    elements.postStatusFilter.addEventListener("change", renderPosts);
  }

  async function boot() {
    try {
      await auth.requireSession("./login.html");
      bindEvents();
      await loadPosts();
    } catch (error) {
      elements.postsSummary.textContent = "Session tidak valid.";
      elements.postsTableBody.innerHTML = `
        <tr>
          <td colspan="5">${escapeHtml(error.message || "Silakan login ulang.")}</td>
        </tr>
      `;
    }
  }

  boot();
})();