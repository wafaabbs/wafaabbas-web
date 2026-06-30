(function initAdminEditor() {
  "use strict";

  if (!window.WafaSupabase) {
    return;
  }

  const { auth, articles } = window.WafaSupabase;

  const elements = {
    logoutButton: document.getElementById("logoutButton"),
    editorForm: document.getElementById("editorForm"),
    editorPageTitle: document.getElementById("editorPageTitle"),
    postIdInput: document.getElementById("postIdInput"),
    postTitleInput: document.getElementById("postTitleInput"),
    postSlugInput: document.getElementById("postSlugInput"),
    postExcerptInput: document.getElementById("postExcerptInput"),
    postContentInput: document.getElementById("postContentInput"),
    postCategoryInput: document.getElementById("postCategoryInput"),
    postStatusInput: document.getElementById("postStatusInput"),
    postThumbnailInput: document.getElementById("postThumbnailInput"),
    editorMessage: document.getElementById("editorMessage"),
    saveDraftButton: document.getElementById("saveDraftButton"),
    publishButton: document.getElementById("publishButton"),
    deletePostButton: document.getElementById("deletePostButton"),
  };

  let activePostId = null;
  let slugTouched = false;

  function getPostIdFromUrl() {
    return new URLSearchParams(window.location.search).get("id");
  }

  function setMessage(message, type = "neutral") {
    elements.editorMessage.textContent = message;
    elements.editorMessage.dataset.type = type;
  }

  function setLoading(isLoading) {
    elements.saveDraftButton.disabled = isLoading;
    elements.publishButton.disabled = isLoading;
    elements.deletePostButton.disabled = isLoading;
  }

  function getPayload(status) {
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
    elements.postExcerptInput.value = post.excerpt || "";
    elements.postContentInput.value = post.content || "";
    elements.postCategoryInput.value = post.category || "";
    elements.postStatusInput.value = post.status || articles.status.DRAFT;
    elements.postThumbnailInput.value = post.thumbnail_url || "";

    elements.editorPageTitle.textContent = "Edit Post";
    elements.deletePostButton.hidden = false;

    document.title = "Edit Post | Wafa Abbas CMS";
  }

  function validateForm() {
    if (!elements.postTitleInput.value.trim()) {
      setMessage("Judul artikel wajib diisi.", "error");
      elements.postTitleInput.focus();
      return false;
    }

    if (!elements.postSlugInput.value.trim()) {
      setMessage("Slug artikel wajib diisi.", "error");
      elements.postSlugInput.focus();
      return false;
    }

    if (!elements.postContentInput.value.trim()) {
      setMessage("Isi artikel wajib diisi.", "error");
      elements.postContentInput.focus();
      return false;
    }

    return true;
  }

  async function savePost(status) {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setMessage("Menyimpan artikel...");

    try {
      const payload = getPayload(status);

      if (activePostId) {
        const updatedPost = await articles.update(activePostId, payload);
        fillForm(updatedPost);
      } else {
        const createdPost = await articles.create(payload);
        fillForm(createdPost);
        window.history.replaceState(null, "", `editor.html?id=${createdPost.id}`);
      }

      const successMessage =
        status === articles.status.PUBLISHED
          ? "Artikel berhasil dipublish."
          : "Draft berhasil disimpan.";

      setMessage(successMessage, "success");
    } catch (error) {
      setMessage(error.message || "Gagal menyimpan artikel.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function deletePost() {
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
      window.location.href = "./posts.html";
    } catch (error) {
      setMessage(error.message || "Gagal menghapus artikel.", "error");
      setLoading(false);
    }
  }

  async function loadPost() {
    const postId = getPostIdFromUrl();

    if (!postId) {
      elements.editorPageTitle.textContent = "New Post";
      elements.deletePostButton.hidden = true;
      return;
    }

    setMessage("Memuat artikel...");

    try {
      const post = await articles.getById(postId);
      fillForm(post);
      setMessage("");
    } catch (error) {
      setMessage(error.message || "Artikel tidak ditemukan.", "error");
    }
  }

  async function handleLogout() {
    await auth.signOut();
    window.location.href = "./login.html";
  }

  function bindEvents() {
    elements.logoutButton.addEventListener("click", handleLogout);

    elements.postSlugInput.addEventListener("input", () => {
      slugTouched = true;
      elements.postSlugInput.value = articles.normalizeSlug(
        elements.postSlugInput.value
      );
    });

    elements.postTitleInput.addEventListener("input", () => {
      if (!activePostId && !slugTouched) {
        elements.postSlugInput.value = articles.normalizeSlug(
          elements.postTitleInput.value
        );
      }
    });

    elements.saveDraftButton.addEventListener("click", () => {
      elements.postStatusInput.value = articles.status.DRAFT;
      savePost(articles.status.DRAFT);
    });

    elements.publishButton.addEventListener("click", () => {
      elements.postStatusInput.value = articles.status.PUBLISHED;
      savePost(articles.status.PUBLISHED);
    });

    elements.deletePostButton.addEventListener("click", deletePost);

    elements.editorForm.addEventListener("submit", (event) => {
      event.preventDefault();
      savePost(elements.postStatusInput.value);
    });
  }

  async function boot() {
    try {
      await auth.requireSession("./login.html");
      bindEvents();
      await loadPost();
    } catch (error) {
      setMessage(error.message || "Gagal membuka editor.", "error");
    }
  }

  boot();
})();