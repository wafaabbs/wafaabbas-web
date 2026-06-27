// assets/js/admin-posts.js
// CMS sederhana untuk tabel "articles" dengan mode create/edit yang jelas

document.addEventListener("DOMContentLoaded", () => {
  const yearSpan = document.getElementById("year");
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();

  if (!window.WafaAdminAuth || !window.WafaAdminAuth.isLoggedIn()) {
    window.location.href = "login.html";
    return;
  }

  if (!window.WafaSupabase) {
    console.error("Supabase belum dikonfigurasi di services/supabase.js");
    return;
  }

  const refreshBtn = document.getElementById("refresh-btn");
  const form = document.getElementById("article-form");
  const newArticleBtn = document.getElementById("new-article-btn");
  const cancelEditBtn = document.getElementById("cancel-edit-btn");

  refreshBtn?.addEventListener("click", loadArticles);
  form?.addEventListener("submit", handleSubmit);
  newArticleBtn?.addEventListener("click", resetFormToCreate);
  cancelEditBtn?.addEventListener("click", resetFormToCreate);

  loadArticles();
});

async function loadArticles() {
  const listEl = document.getElementById("admin-article-list");
  const emptyEl = document.getElementById("admin-empty-state");
  if (!listEl) return;

  listEl.innerHTML = "<p class='muted'>Memuat artikel...</p>";

  const client = window.WafaSupabase.getClient();
  const { data, error } = await client
    .from("articles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
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

  data.forEach((article) => {
    const row = document.createElement("article");
    row.className = "article-card";

    row.innerHTML = `
      <h3>${article.title}</h3>
      <p class="muted">${article.excerpt || ""}</p>
      <div class="article-meta">
        <span>Slug: ${article.slug}</span> ·
        <span>Status: ${article.status}</span> ·
        <span>${formatDate(article.published_at) || "Belum dipublish"}</span>
      </div>
      <div style="margin-top:8px; display:flex; gap:8px;">
        <button type="button" data-action="edit" data-id="${article.id}">Edit</button>
        <button type="button" data-action="delete" data-id="${article.id}" style="color:#f97373;">Hapus</button>
      </div>
    `;

    listEl.appendChild(row);
  });

  listEl.onclick = handleListClick;
}

function handleListClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  const action = target.getAttribute("data-action");
  const id = target.getAttribute("data-id");
  if (!action || !id) return;

  if (action === "edit") {
    loadArticleIntoForm(id);
  } else if (action === "delete") {
    const confirmed = window.confirm("Yakin mau hapus artikel ini?");
    if (confirmed) deleteArticle(id);
  }
}

async function loadArticleIntoForm(id) {
  const client = window.WafaSupabase.getClient();
  const { data, error } = await client
    .from("articles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    console.error(error || "Artikel tidak ditemukan");
    return;
  }

  document.getElementById("article-id").value = data.id;
  document.getElementById("title").value = data.title || "";
  document.getElementById("slug").value = data.slug || "";
  document.getElementById("excerpt").value = data.excerpt || "";
  document.getElementById("content").value = data.content || "";
  document.getElementById("category").value = data.category || "";
  document.getElementById("status").value = data.status || "draft";

  const publishedInput = document.getElementById("published_at");
  if (publishedInput && data.published_at) {
    const d = new Date(data.published_at);
    const iso = d.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
    publishedInput.value = iso;
  } else if (publishedInput) {
    publishedInput.value = "";
  }

  setFormMode("edit");
}

function resetFormToCreate() {
  const form = document.getElementById("article-form");
  form.reset();
  document.getElementById("article-id").value = "";
  const publishedInput = document.getElementById("published_at");
  if (publishedInput) publishedInput.value = "";
  setFormMode("create");
}

function setFormMode(mode) {
  const formModeLabel = document.getElementById("form-mode-label");
  const cancelEditBtn = document.getElementById("cancel-edit-btn");
  const saveBtn = document.getElementById("save-btn");
  const msg = document.getElementById("form-message");

  if (mode === "edit") {
    if (formModeLabel) formModeLabel.textContent = "Mode: edit artikel yang sudah ada";
    if (cancelEditBtn) cancelEditBtn.style.display = "inline-block";
    if (saveBtn) saveBtn.textContent = "Update artikel";
    if (msg) msg.textContent = "Sedang mengedit artikel. Klik 'Batal edit' untuk kembali ke mode create.";
  } else {
    if (formModeLabel) formModeLabel.textContent = "Mode: buat artikel baru";
    if (cancelEditBtn) cancelEditBtn.style.display = "none";
    if (saveBtn) saveBtn.textContent = "Simpan artikel";
    if (msg) msg.textContent = "";
  }
}

async function handleSubmit(event) {
  event.preventDefault();
  const formMessage = document.getElementById("form-message");

  const id = document.getElementById("article-id").value || null;
  const title = document.getElementById("title").value.trim();
  const slug = document.getElementById("slug").value.trim();
  const excerpt = document.getElementById("excerpt").value.trim();
  const content = document.getElementById("content").value.trim();
  const category = document.getElementById("category").value.trim();
  const status = document.getElementById("status").value;
  const publishedAtRaw = document.getElementById("published_at").value;

  if (!title || !slug) {
    if (formMessage) formMessage.textContent = "Judul dan slug wajib diisi.";
    return;
  }

  const client = window.WafaSupabase.getClient();

  const payload = {
    title,
    slug,
    excerpt,
    content,
    category,
    status,
    published_at: publishedAtRaw ? new Date(publishedAtRaw).toISOString() : null,
  };

  let result;
  if (id) {
    result = await client.from("articles").update(payload).eq("id", id).select().maybeSingle();
  } else {
    result = await client.from("articles").insert(payload).select().maybeSingle();
  }

  const { error } = result;
  if (error) {
    console.error(error);
    if (formMessage) formMessage.textContent = "Gagal menyimpan artikel: " + error.message;
    return;
  }

  if (formMessage) formMessage.textContent = "Artikel berhasil disimpan.";
  resetFormToCreate();
  loadArticles();
}

async function deleteArticle(id) {
  const client = window.WafaSupabase.getClient();
  const { error } = await client.from("articles").delete().eq("id", id);

  if (error) {
    console.error(error);
    alert("Gagal menghapus artikel.");
    return;
  }

  loadArticles();
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