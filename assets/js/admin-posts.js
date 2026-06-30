(function initAdminPosts() {
  "use strict";

  const { auth, articles } = window.WafaSupabase;

  const elements = {
    logoutButton: document.getElementById("logoutButton"),
    newPostButton: document.getElementById("newPostButton"),
    totalPostsCount: document.getElementById("totalPostsCount"),
    publishedPostsCount: document.getElementById("publishedPostsCount"),
    draftPostsCount: document.getElementById("draftPostsCount"),
    postSearchInput: document.getElementById("postSearchInput"),
    postStatusFilter: document.getElementById("postStatusFilter"),
    postsTableBody: document.getElementById("postsTableBody"),
    postDialog: document.getElementById("postDialog"),
    postForm: document.getElementById("postForm"),
    postDialogTitle: document.getElementById("postDialogTitle"),
    closePostDialogButton: document.getElementById("closePostDialogButton"),
    postIdInput: document.getElementById("postIdInput"),
    postTitleInput: document.getElementById("postTitleInput"),
    postSlugInput: document.getElementById("postSlugInput"),
    postCategoryInput: document.getElementById("postCategoryInput"),
    postStatusInput: document.getElementById("postStatusInput"),
    postExcerptInput: document.getElementById("postExcerptInput"),
    postContentInput: document.getElementById("postContentInput"),
    postThumbnailInput: document.getElementById("postThumbnailInput"),
    postFormMessage: document.getElementById("postFormMessage"),
    deletePostButton: document.getElementById("deletePostButton"),
    saveDraftButton: document.getElementById("saveDraftButton"),
    publishPostButton: document.getElementById("publishPostButton"),
  };

  let posts = [];
  let activePostId = null;

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

  function setMessage(message, type = "neutral") {
    elements.postFormMessage.textContent = message;
    elements.postFormMessage.dataset.type = type;
  }

  function setLoading(isLoading) {
    elements.publishPostButton.disabled = isLoading;
    elements.saveDraftButton.disabled = isLoading;
    elements.deletePostButton.disabled = isLoading;
  }

  function getFilteredPosts() {
    const search = elements.postSearchInput.value.trim().toLowerCase();
    const status = elements.postStatusFilter.value;

    return posts.filter((post) => {
      const matchesSearch = !search
        ? true
        : [post.title, post.excerpt, post.category]
            .filter(Boolean)
            .some((value) => value.toLowerCase().includes(search));

      const matchesStatus = status ? post.status === status : true;

      return matchesSearch && matchesStatus;
    });
  }

  function renderStats() {
    const publishedCount = posts.filter(
      (post) => post.status === articles.status.PUBLISHED
    ).length;
    const draftCount = posts.filter(
      (post) => post.status === articles.status.DRAFT
    ).length;

    elements.totalPostsCount.textContent = posts.length;
    elements.publishedPostsCount.textContent = publishedCount;
    elements.draftPostsCount.textContent = draftCount;
  }

  function renderPosts() {
    const filteredPosts = getFilteredPosts();

    if (!filteredPosts.length) {
      elements.postsTableBody.innerHTML = `
        <tr>
          <td colspan="5" class="admin-empty-cell">Belum ada artikel yang cocok.</td>
        </tr>
      `;
      return;
    }

    elements.postsTableBody.innerHTML = filteredPosts
      .map(
        (post) => `
          <tr>
            <td>
              <button type="button" class="admin-title-button" data-action="edit" data-id="${post.id}">
                <strong>${post.title || "Untitled"}</strong>
                <span>${post.slug || "-"}</span>
              </button>
            </td>
            <td>${post.category || "-"}</td>
            <td>
              <span class="admin-status admin-status-${post.status}">
                ${post.status}
              </span>
            </td>
            <td>${formatDate(post.updated_at || post.created_at)}</td>
            <td class="admin-table-actions">
              <button type="button" class="admin-secondary-button" data-action="edit" data-id="${post.id}">
                Edit
              </button>
            </td>
          </tr>
        `
      )
      .join("");
  }

  function resetForm() {
    activePostId = null;
    elements.postForm.reset();
    elements.postIdInput.value = "";
    elements.postStatusInput.value = articles.status.DRAFT;
    elements.postDialogTitle.textContent = "New Post";
    elements.deletePostButton.hidden = true;
    setMessage("");
  }

  function getFormPayload(status) {
    return {
      title: elements.postTitleInput.value,
      slug: elements.postSlugInput.value,
      excerpt: elements.postExcerptInput.value,
      content: elements.postContentInput.value,
      category: elements.postCategoryInput.value,
      status,
      thumbnail_url: elements.postThumbnailInput.value,
    };
  }

  function fillForm(post) {
    activePostId = post.id;
    elements.postIdInput.value = post.id;
    elements.postTitleInput.value = post.title || "";
    elements.postSlugInput.value = post.slug || "";
    elements.postCategoryInput.value = post.category || "";
    elements.postStatusInput.value = post.status || articles.status.DRAFT;
    elements.postExcerptInput.value = post.excerpt || "";
    elements.postContentInput.value = post.content || "";
    elements.postThumbnailInput.value = post.thumbnail_url || "";
    elements.postDialogTitle.textContent = "Edit Post";
    elements.deletePostButton.hidden = false;
    setMessage("");
  }

  function openDialog(post = null) {
    resetForm();

    if (post) {
      fillForm(post);
    }

    elements.postDialog.showModal();
    elements.postTitleInput.focus();
  }

  function closeDialog() {
    elements.postDialog.close();
  }

  async function loadPosts() {
    elements.postsTableBody.innerHTML = `
      <tr>
        <td colspan="5" class="admin-empty-cell">Loading posts...</td>
      </tr>
    `;

    posts = await articles.listAdmin();
    renderStats();
    renderPosts();
  }

  async function savePost(status) {
    setLoading(true);
    setMessage("Menyimpan artikel...");

    try {
      const payload = getFormPayload(status);

      if (activePostId) {
        await articles.update(activePostId, payload);
      } else {
        await articles.create(payload);
      }

      setMessage("Artikel berhasil disimpan.", "success");
      closeDialog();
      await loadPosts();
    } catch (error) {
      setMessage(error.message || "Gagal menyimpan artikel.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function deleteActivePost() {
    if (!activePostId) {
      return;
    }

    const confirmed = window.confirm("Hapus artikel ini secara permanen?");

    if (!confirmed) {
      return;
    }

    setLoading(true);
    setMessage("Menghapus artikel...");

    try {
      await articles.delete(activePostId);
      closeDialog();
      await loadPosts();
    } catch (error) {
      setMessage(error.message || "Gagal menghapus artikel.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await auth.signOut();
    window.location.href = "./login.html";
  }

  function bindEvents() {
    elements.logoutButton.addEventListener("click", handleLogout);

    elements.newPostButton.addEventListener("click", () => {
      openDialog();
    });

    elements.closePostDialogButton.addEventListener("click", closeDialog);

    elements.postSearchInput.addEventListener("input", renderPosts);
    elements.postStatusFilter.addEventListener("change", renderPosts);

    elements.postTitleInput.addEventListener("input", () => {
      if (!activePostId || !elements.postSlugInput.value.trim()) {
        elements.postSlugInput.value = articles.normalizeSlug(
          elements.postTitleInput.value
        );
      }
    });

    elements.postsTableBody.addEventListener("click", (event) => {
      const button = event.target.closest("[data-action='edit']");

      if (!button) {
        return;
      }

      const post = posts.find((item) => String(item.id) === button.dataset.id);

      if (post) {
        openDialog(post);
      }
    });

    elements.saveDraftButton.addEventListener("click", () => {
      elements.postStatusInput.value = articles.status.DRAFT;
      savePost(articles.status.DRAFT);
    });

    elements.deletePostButton.addEventListener("click", deleteActivePost);

    elements.postForm.addEventListener("submit", (event) => {
      event.preventDefault();
      savePost(elements.postStatusInput.value);
    });
  }

  async function boot() {
    try {
      await auth.requireSession("./login.html");
      bindEvents();
      await loadPosts();
    } catch (error) {
      elements.postsTableBody.innerHTML = `
        <tr>
          <td colspan="5" class="admin-empty-cell">
            ${error.message || "Gagal memuat dashboard."}
          </td>
        </tr>
      `;
    }
  }

  boot();
})();