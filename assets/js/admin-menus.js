(function initAdminMenus() {
  "use strict";

  if (!window.WafaSupabase) {
    return;
  }

  const { auth, menus } = window.WafaSupabase;

  const elements = {
    logoutButton: document.getElementById("logoutButton"),
    menuFormTitle: document.getElementById("menuFormTitle"),
    menuIdInput: document.getElementById("menuIdInput"),
    menuLabelInput: document.getElementById("menuLabelInput"),
    menuUrlInput: document.getElementById("menuUrlInput"),
    menuOrderInput: document.getElementById("menuOrderInput"),
    menuParentInput: document.getElementById("menuParentInput"),
    menuMessage: document.getElementById("menuMessage"),
    saveMenuButton: document.getElementById("saveMenuButton"),
    resetMenuButton: document.getElementById("resetMenuButton"),
    menuList: document.getElementById("menuList"),
  };

  let editingId = null;
  let cachedFlatList = [];

  function setMessage(message, type = "neutral") {
    elements.menuMessage.textContent = message;
    elements.menuMessage.dataset.type = type;
  }

  function setLoading(isLoading) {
    elements.saveMenuButton.disabled = isLoading;
    elements.menuLabelInput.disabled = isLoading;
    elements.menuUrlInput.disabled = isLoading;
    elements.menuOrderInput.disabled = isLoading;
    elements.menuParentInput.disabled = isLoading;
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
  // Dropdown parent — exclude diri sendiri dan submenu-nya
  // ---------------------------------------------------------------------

  async function renderParentDropdown(selectedParentId = null) {
    const select = elements.menuParentInput;
    select.innerHTML = '<option value="">— Tidak ada (menu utama) —</option>';

    try {
      const flat = await menus.list();
      cachedFlatList = flat;

      // Exclude item yang sedang diedit dan semua children-nya
      const excludeIds = new Set();

      if (editingId) {
        // Kumpulkan semua descendant dari editingId secara rekursif
        function collectDescendants(id) {
          excludeIds.add(id);
          flat.filter((m) => m.parent_id === id).forEach((child) => {
            collectDescendants(child.id);
          });
        }
        collectDescendants(editingId);
      }

      // Hanya tampilkan item top-level sebagai pilihan parent
      // (submenu tidak bisa jadi parent, max 2 level)
      flat
        .filter((item) => !item.parent_id && !excludeIds.has(item.id))
        .forEach((item) => {
          const option = document.createElement("option");
          option.value = item.id;
          option.textContent = item.label;
          if (item.id === selectedParentId) option.selected = true;
          select.appendChild(option);
        });
    } catch (err) {
      console.warn("Gagal memuat dropdown parent menu:", err.message);
    }
  }

  // ---------------------------------------------------------------------
  // Render daftar menu
  // ---------------------------------------------------------------------

  function renderMenuList(flatList) {
    const list = elements.menuList;

    if (!flatList.length) {
      list.innerHTML = '<p class="admin-muted" style="padding:16px;">Belum ada item menu.</p>';
      return;
    }

    const tree = menus.buildTree(flatList);

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
                  <strong>${escapeHtml(node.label)}</strong>
                  <span class="admin-category-slug">${escapeHtml(node.url)} · urutan: ${node.order_index}</span>
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
                  data-label="${escapeHtml(node.label)}"
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

    list.querySelectorAll("[data-action='edit']").forEach((btn) => {
      btn.addEventListener("click", () => handleEditClick(btn.dataset.id));
    });

    list.querySelectorAll("[data-action='delete']").forEach((btn) => {
      btn.addEventListener("click", () =>
        handleDeleteClick(btn.dataset.id, btn.dataset.label, btn.dataset.hasChildren === "true")
      );
    });
  }

  // ---------------------------------------------------------------------
  // Load
  // ---------------------------------------------------------------------

  async function loadMenus() {
    try {
      const flat = await menus.list();
      cachedFlatList = flat;
      renderMenuList(flat);
    } catch (err) {
      elements.menuList.innerHTML =
        '<p class="admin-muted" style="padding:16px;">Gagal memuat menu.</p>';
    }
  }

  // ---------------------------------------------------------------------
  // Form actions
  // ---------------------------------------------------------------------

  function resetForm() {
    editingId = null;
    elements.menuIdInput.value = "";
    elements.menuLabelInput.value = "";
    elements.menuUrlInput.value = "";
    elements.menuOrderInput.value = "0";
    elements.menuFormTitle.textContent = "Tambah Item Menu";
    elements.resetMenuButton.hidden = true;
    setMessage("");
    renderParentDropdown();
  }

  async function handleEditClick(id) {
    const item = cachedFlatList.find((m) => m.id === id);
    if (!item) return;

    editingId = id;
    elements.menuIdInput.value = id;
    elements.menuLabelInput.value = item.label;
    elements.menuUrlInput.value = item.url;
    elements.menuOrderInput.value = item.order_index;
    elements.menuFormTitle.textContent = "Edit Item Menu";
    elements.resetMenuButton.hidden = false;
    setMessage("");

    await renderParentDropdown(item.parent_id);
    elements.menuLabelInput.focus();
  }

  async function handleDeleteClick(id, label, hasChildren) {
    let confirmMessage = `Hapus item menu "${label}"?`;
    if (hasChildren) {
      confirmMessage += "\n\nPeringatan: semua submenu di bawahnya akan ikut terhapus.";
    }

    if (!window.confirm(confirmMessage)) return;

    setLoading(true);
    setMessage("Menghapus item menu...");

    try {
      await menus.delete(id);
      if (editingId === id) resetForm();
      setMessage("Item menu berhasil dihapus.", "success");
      await loadMenus();
      await renderParentDropdown();
    } catch (err) {
      setMessage(err.message || "Gagal menghapus item menu.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    const label = elements.menuLabelInput.value.trim();
    const url = elements.menuUrlInput.value.trim();
    const orderIndex = parseInt(elements.menuOrderInput.value, 10) || 0;
    const parentId = elements.menuParentInput.value || null;

    if (!label) {
      setMessage("Label menu wajib diisi.", "error");
      elements.menuLabelInput.focus();
      return;
    }

    if (!url) {
      setMessage("URL menu wajib diisi.", "error");
      elements.menuUrlInput.focus();
      return;
    }

    setLoading(true);
    setMessage(editingId ? "Menyimpan perubahan..." : "Menambah item menu...");

    try {
      if (editingId) {
        await menus.update(editingId, { label, url, order_index: orderIndex, parent_id: parentId });
        setMessage("Item menu berhasil diperbarui.", "success");
      } else {
        await menus.create({ label, url, order_index: orderIndex, parent_id: parentId });
        setMessage("Item menu berhasil ditambahkan.", "success");
      }

      resetForm();
      await loadMenus();
    } catch (err) {
      setMessage(err.message || "Gagal menyimpan item menu.", "error");
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

    elements.saveMenuButton.addEventListener("click", handleSave);
    elements.resetMenuButton.addEventListener("click", resetForm);
  }

  async function boot() {
    try {
      await auth.requireSession("./login.html");
      bindEvents();
      await renderParentDropdown();
      await loadMenus();
    } catch (err) {
      setMessage(err.message || "Gagal membuka halaman menu.", "error");
    }
  }

  boot();
})();