(function initAdminCategories() {
  "use strict";

  if (!window.WafaSupabase) {
    return;
  }

  const { auth, categories } = window.WafaSupabase;

  const elements = {
    logoutButton: document.getElementById("logoutButton"),
    categoryFormTitle: document.getElementById("categoryFormTitle"),
    categoryIdInput: document.getElementById("categoryIdInput"),
    categoryNameInput: document.getElementById("categoryNameInput"),
    categorySlugInput: document.getElementById("categorySlugInput"),
    categoryParentInput: document.getElementById("categoryParentInput"),
    categoryMessage: document.getElementById("categoryMessage"),
    saveCategoryButton: document.getElementById("saveCategoryButton"),
    resetCategoryButton: document.getElementById("resetCategoryButton"),
    categoryList: document.getElementById("categoryList"),
  };

  // ID kategori yang sedang di-edit (null = mode tambah baru)
  let editingId = null;
  // Cache flat list terakhir, dipakai untuk rebuild dropdown parent
  let cachedFlatList = [];

  function setMessage(message, type = "neutral") {
    elements.categoryMessage.textContent = message;
    elements.categoryMessage.dataset.type = type;
  }

  function setLoading(isLoading) {
    elements.saveCategoryButton.disabled = isLoading;
    elements.categoryNameInput.disabled = isLoading;
    elements.categorySlugInput.disabled = isLoading;
    elements.categoryParentInput.disabled = isLoading;
  }

  // ---------------------------------------------------------------------
  // Slug auto-generate dari nama
  // ---------------------------------------------------------------------

  function bindSlugAutoFill() {
    let slugTouched = false;

    elements.categorySlugInput.addEventListener("input", () => {
      slugTouched = true;
      elements.categorySlugInput.value = categories.normalizeSlug(
        elements.categorySlugInput.value
      );
    });

    elements.categoryNameInput.addEventListener("input", () => {
      if (!slugTouched || !editingId) {
        elements.categorySlugInput.value = categories.normalizeSlug(
          elements.categoryNameInput.value
        );
      }
    });

    // Reset flag saat form di-reset ke mode tambah baru
    elements.resetCategoryButton.addEventListener("click", () => {
      slugTouched = false;
    });
  }

  // ---------------------------------------------------------------------
  // Render dropdown parent (exclude kategori yang sedang diedit
  // dan semua descendant-nya, supaya tidak bisa jadi anak dirinya sendiri)
  // ---------------------------------------------------------------------

  async function renderParentDropdown(selectedParentId = null) {
    const select = elements.categoryParentInput;
    select.innerHTML = '<option value="">— Tidak ada (kategori utama) —</option>';

    try {
      const flat = await categories.list();
      cachedFlatList = flat;

      // Kalau lagi edit, exclude diri sendiri dan semua descendant-nya
      // dari pilihan parent (mencegah circular reference)
      let excludeIds = new Set();

      if (editingId) {
        const descendantIds = await categories.getDescendantIds(editingId);
        descendantIds.forEach((id) => excludeIds.add(id));
      }

      const tree = categories.buildTree(flat);
      const options = categories.flattenTreeForSelect(tree);

      options.forEach(({ id, name, depth }) => {
        if (excludeIds.has(id)) {
          return;
        }

        const option = document.createElement("option");
        option.value = id;
        option.textContent = "—".repeat(depth) + (depth > 0 ? " " : "") + name;

        if (id === selectedParentId) {
          option.selected = true;
        }

        select.appendChild(option);
      });
    } catch (err) {
      console.warn("Gagal memuat dropdown parent:", err.message);
    }
  }

  // ---------------------------------------------------------------------
  // Render daftar kategori (tree view)
  // ---------------------------------------------------------------------

  function renderCategoryTree(flatList) {
    const list = elements.categoryList;

    if (!flatList.length) {
      list.innerHTML = '<p class="admin-muted" style="padding:16px;">Belum ada kategori.</p>';
      return;
    }

    const tree = categories.buildTree(flatList);

    function renderNodes(nodes, depth = 0) {
      return nodes
        .map((node) => {
          const indent = depth * 20;
          const hasChildren = node.children && node.children.length > 0;

          return `
            <div class="admin-category-item" style="padding-left:${indent + 16}px;">
              <div class="admin-category-item-info">
                ${depth > 0 ? '<span class="admin-category-branch">└</span>' : ""}
                <div>
                  <strong>${escapeHtml(node.name)}</strong>
                  <span class="admin-category-slug">${escapeHtml(node.slug)}</span>
                </div>
              </div>
              <div class="admin-category-item-actions">
                <button
                  type="button"
                  class="admin-button-small"
                  data-action="edit"
                  data-id="${node.id}"
                >
                  Edit
                </button>
                <button
                  type="button"
                  class="admin-danger-button admin-button-small"
                  data-action="delete"
                  data-id="${node.id}"
                  data-name="${escapeHtml(node.name)}"
                  data-has-children="${hasChildren}"
                >
                  Hapus
                </button>
              </div>
            </div>
            ${hasChildren ? renderNodes(node.children, depth + 1) : ""}
          `;
        })
        .join("");
    }

    list.innerHTML = renderNodes(tree);

    // Bind event listener ke tombol Edit dan Hapus
    list.querySelectorAll("[data-action='edit']").forEach((btn) => {
      btn.addEventListener("click", () => handleEditClick(btn.dataset.id));
    });

    list.querySelectorAll("[data-action='delete']").forEach((btn) => {
      btn.addEventListener("click", () =>
        handleDeleteClick(btn.dataset.id, btn.dataset.name, btn.dataset.hasChildren === "true")
      );
    });
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // ---------------------------------------------------------------------
  // Load & refresh
  // ---------------------------------------------------------------------

  async function loadCategories() {
    try {
      const flat = await categories.list();
      cachedFlatList = flat;
      renderCategoryTree(flat);
    } catch (err) {
      elements.categoryList.innerHTML =
        '<p class="admin-muted" style="padding:16px;">Gagal memuat kategori.</p>';
    }
  }

  // ---------------------------------------------------------------------
  // Form actions
  // ---------------------------------------------------------------------

  function resetForm() {
    editingId = null;
    elements.categoryIdInput.value = "";
    elements.categoryNameInput.value = "";
    elements.categorySlugInput.value = "";
    elements.categoryFormTitle.textContent = "Tambah Kategori";
    elements.resetCategoryButton.hidden = true;
    setMessage("");
    renderParentDropdown();
  }

  async function handleEditClick(id) {
    const category = cachedFlatList.find((c) => c.id === id);

    if (!category) {
      return;
    }

    editingId = id;
    elements.categoryIdInput.value = id;
    elements.categoryNameInput.value = category.name;
    elements.categorySlugInput.value = category.slug;
    elements.categoryFormTitle.textContent = "Edit Kategori";
    elements.resetCategoryButton.hidden = false;
    setMessage("");

    // Render ulang dropdown parent dengan excludes dan selected value
    await renderParentDropdown(category.parent_id);

    elements.categoryNameInput.focus();
  }

  async function handleDeleteClick(id, name, hasChildren) {
    let confirmMessage = `Hapus kategori "${name}" secara permanen?`;

    if (hasChildren) {
      confirmMessage += "\n\nPeringatan: semua sub-kategori di bawahnya akan kehilangan parent (jadi kategori utama).";
    }

    confirmMessage += "\n\nArtikel yang menggunakan kategori ini akan di-set tanpa kategori (NULL).";

    const confirmed = window.confirm(confirmMessage);

    if (!confirmed) {
      return;
    }

    setLoading(true);
    setMessage("Menghapus kategori...");

    try {
      await categories.delete(id);

      // Kalau kategori yang dihapus sedang di-edit, reset form
      if (editingId === id) {
        resetForm();
      }

      setMessage("Kategori berhasil dihapus.", "success");
      await loadCategories();
      await renderParentDropdown(null);
    } catch (err) {
      setMessage(err.message || "Gagal menghapus kategori.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    const name = elements.categoryNameInput.value.trim();
    const slug = elements.categorySlugInput.value.trim();
    const parentId = elements.categoryParentInput.value || null;

    if (!name) {
      setMessage("Nama kategori wajib diisi.", "error");
      elements.categoryNameInput.focus();
      return;
    }

    setLoading(true);
    setMessage(editingId ? "Menyimpan perubahan..." : "Menambah kategori...");

    try {
      if (editingId) {
        await categories.update(editingId, { name, slug, parent_id: parentId });
        setMessage("Kategori berhasil diperbarui.", "success");
      } else {
        await categories.create({ name, slug, parent_id: parentId });
        setMessage("Kategori berhasil ditambahkan.", "success");
      }

      resetForm();
      await loadCategories();
    } catch (err) {
      setMessage(err.message || "Gagal menyimpan kategori.", "error");
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------

  function bindEvents() {
    elements.logoutButton.addEventListener("click", async () => {
      await auth.signOut();
      window.location.href = "./login.html";
    });

    elements.saveCategoryButton.addEventListener("click", handleSave);
    elements.resetCategoryButton.addEventListener("click", resetForm);
  }

  async function boot() {
    try {
      await auth.requireSession("./login.html");
      bindEvents();
      bindSlugAutoFill();
      await renderParentDropdown();
      await loadCategories();
    } catch (err) {
      setMessage(err.message || "Gagal membuka halaman kategori.", "error");
    }
  }

  boot();
})();