const WAFA_SUPABASE_CONFIG = {
  url: "https://sjgsrposlucbkabxaodm.supabase.co",
  anonKey: "sb_publishable_SVyecFKhxY6MiJKiewluJQ_OzQHFcXF",
  tables: {
    articles: "articles",
    categories: "categories",
    menus: "menus",
  },
  storage: {
    thumbnails: "thumbnails",
  },
};

(function initWafaSupabase(global) {
  "use strict";

  let client = null;

  const ARTICLE_STATUS = {
    DRAFT: "draft",
    PUBLISHED: "published",
  };

  // category di-embed via Supabase foreign table join.
  // Tiap artikel akan punya field "category" berupa object
  // { id, name, slug, parent_id } atau null.
  const ARTICLE_COLUMNS = [
    "id",
    "title",
    "slug",
    "excerpt",
    "content",
    "category_id",
    "category:categories(id,name,slug,parent_id)",
    "status",
    "published_at",
    "created_at",
    "updated_at",
    "thumbnail_url",
  ].join(",");

  const CATEGORY_COLUMNS = "id,name,slug,parent_id,created_at";

  const ALLOWED_THUMBNAIL_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
  ];

  const MAX_THUMBNAIL_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

  function assertSupabaseSdk() {
    if (!global.supabase || typeof global.supabase.createClient !== "function") {
      throw new Error("Supabase SDK belum dimuat.");
    }
  }

  function getClient() {
    if (client) {
      return client;
    }

    assertSupabaseSdk();

    client = global.supabase.createClient(
      WAFA_SUPABASE_CONFIG.url,
      WAFA_SUPABASE_CONFIG.anonKey,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
        },
      }
    );

    return client;
  }

  function getArticlesTable() {
    return getClient().from(WAFA_SUPABASE_CONFIG.tables.articles);
  }

  function getCategoriesTable() {
    return getClient().from(WAFA_SUPABASE_CONFIG.tables.categories);
  }

  function getMenusTable() {
    return getClient().from(WAFA_SUPABASE_CONFIG.tables.menus);
  }

  function getThumbnailsBucket() {
    return getClient().storage.from(WAFA_SUPABASE_CONFIG.storage.thumbnails);
  }

  function normalizeSlug(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function getTimestamp() {
    return new Date().toISOString();
  }

  function normalizeSupabaseError(error) {
    if (!error) {
      return new Error("Terjadi kesalahan tidak diketahui.");
    }

    if (error.code === "23505") {
      return new Error(
        "Slug sudah digunakan. Ganti dengan versi yang unik."
      );
    }

    if (error.code === "42501") {
      return new Error(
        "Akses ditolak oleh Supabase. Periksa login admin atau RLS policy."
      );
    }

    return new Error(error.message || "Request ke Supabase gagal.");
  }

  async function unwrapQuery(query) {
    const { data, error } = await query;

    if (error) {
      throw normalizeSupabaseError(error);
    }

    return data;
  }

  function prepareArticlePayload(input, options = {}) {
    const now = getTimestamp();
    const title = String(input.title || "").trim();
    const slug = normalizeSlug(input.slug || title);
    const status = input.status || ARTICLE_STATUS.DRAFT;
    const shouldPublish =
      status === ARTICLE_STATUS.PUBLISHED && !input.published_at;

    return {
      title,
      slug,
      excerpt: String(input.excerpt || "").trim(),
      content: String(input.content || "").trim(),
      category_id: input.category_id || null,
      status,
      published_at: shouldPublish ? now : input.published_at || null,
      updated_at: now,
      thumbnail_url: String(input.thumbnail_url || "").trim() || null,
      ...(options.includeCreatedAt ? { created_at: now } : {}),
    };
  }

  // ---------------------------------------------------------------------
  // Storage helpers (thumbnail)
  // ---------------------------------------------------------------------

  function getFileExtension(file) {
    const nameParts = String(file.name || "").split(".");
    const extFromName =
      nameParts.length > 1 ? nameParts.pop().toLowerCase() : "";

    if (extFromName) {
      return extFromName;
    }

    const typeMap = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
    };

    return typeMap[file.type] || "bin";
  }

  function generateThumbnailFileName(file) {
    const ext = getFileExtension(file);
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 8);
    return `${timestamp}-${random}.${ext}`;
  }

  function assertValidThumbnailFile(file) {
    if (!file) {
      throw new Error("Tidak ada file yang dipilih.");
    }

    if (!ALLOWED_THUMBNAIL_TYPES.includes(file.type)) {
      throw new Error(
        "Format file tidak didukung. Gunakan JPG, PNG, WEBP, atau GIF."
      );
    }

    if (file.size > MAX_THUMBNAIL_SIZE_BYTES) {
      throw new Error("Ukuran file maksimal 5MB.");
    }
  }

  function getStoragePathFromPublicUrl(publicUrl) {
    if (!publicUrl) {
      return null;
    }

    const marker = `/storage/v1/object/public/${WAFA_SUPABASE_CONFIG.storage.thumbnails}/`;
    const markerIndex = publicUrl.indexOf(marker);

    if (markerIndex === -1) {
      return null;
    }

    const path = publicUrl.slice(markerIndex + marker.length).split("?")[0];
    return path ? decodeURIComponent(path) : null;
  }

  const storage = {
    async uploadThumbnail(file) {
      assertValidThumbnailFile(file);

      const fileName = generateThumbnailFileName(file);

      const { data, error } = await getThumbnailsBucket().upload(
        fileName,
        file,
        {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        }
      );

      if (error) {
        throw normalizeSupabaseError(error);
      }

      const { data: publicUrlData } = getThumbnailsBucket().getPublicUrl(
        data.path
      );

      return {
        path: data.path,
        publicUrl: publicUrlData.publicUrl,
      };
    },

    async deleteThumbnailByUrl(publicUrl) {
      const path = getStoragePathFromPublicUrl(publicUrl);

      if (!path) {
        return;
      }

      const { error } = await getThumbnailsBucket().remove([path]);

      if (error) {
        console.warn("Gagal menghapus thumbnail lama:", error.message);
      }
    },

    async replaceThumbnail(file, oldPublicUrl) {
      const result = await this.uploadThumbnail(file);

      if (oldPublicUrl) {
        await this.deleteThumbnailByUrl(oldPublicUrl);
      }

      return result;
    },
  };

  const auth = {
    async getSession() {
      const { data, error } = await getClient().auth.getSession();

      if (error) {
        throw normalizeSupabaseError(error);
      }

      return data.session;
    },

    async getUser() {
      const { data, error } = await getClient().auth.getUser();

      if (error) {
        throw normalizeSupabaseError(error);
      }

      return data.user;
    },

    async signIn(email, password) {
      const { data, error } = await getClient().auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw normalizeSupabaseError(error);
      }

      return data;
    },

    async signOut() {
      const { error } = await getClient().auth.signOut();

      if (error) {
        throw normalizeSupabaseError(error);
      }
    },

    onAuthStateChange(callback) {
      return getClient().auth.onAuthStateChange(callback);
    },

    async requireSession(redirectTo = "./login.html") {
      const session = await this.getSession();

      if (!session) {
        global.location.href = redirectTo;
        return null;
      }

      return session;
    },
  };

  const articles = {
    status: ARTICLE_STATUS,
    normalizeSlug,

    async listPublished({ limit = 12, categoryId } = {}) {
      let query = getArticlesTable()
        .select(ARTICLE_COLUMNS)
        .eq("status", ARTICLE_STATUS.PUBLISHED)
        .order("published_at", { ascending: false })
        .limit(limit);

      if (categoryId) {
        query = query.eq("category_id", categoryId);
      }

      return unwrapQuery(query);
    },

    async listPublishedByCategory(categoryId, { limit = 50 } = {}) {
      // Panggil RPC buat ambil semua descendant ids (termasuk categoryId sendiri),
      // lalu filter artikel berdasarkan ids tersebut.
      const { data: rows, error } = await getClient().rpc(
        "get_category_descendant_ids",
        { root_id: categoryId }
      );

      if (error) {
        throw normalizeSupabaseError(error);
      }

      const ids = (rows || []).map((r) => r.id);

      if (!ids.length) {
        return [];
      }

      return unwrapQuery(
        getArticlesTable()
          .select(ARTICLE_COLUMNS)
          .eq("status", ARTICLE_STATUS.PUBLISHED)
          .in("category_id", ids)
          .order("published_at", { ascending: false })
          .limit(limit)
      );
    },

    async listAdmin({ status, search } = {}) {
      let query = getArticlesTable()
        .select(ARTICLE_COLUMNS)
        .order("updated_at", { ascending: false });

      if (status) {
        query = query.eq("status", status);
      }

      if (search) {
        query = query.ilike("title", `%${search}%`);
      }

      return unwrapQuery(query);
    },

    async getById(id) {
      return unwrapQuery(
        getArticlesTable().select(ARTICLE_COLUMNS).eq("id", id).single()
      );
    },

    async getBySlug(slug) {
      return unwrapQuery(
        getArticlesTable()
          .select(ARTICLE_COLUMNS)
          .eq("slug", normalizeSlug(slug))
          .eq("status", ARTICLE_STATUS.PUBLISHED)
          .single()
      );
    },

    async create(input) {
      const payload = prepareArticlePayload(input, { includeCreatedAt: true });

      return unwrapQuery(
        getArticlesTable().insert(payload).select(ARTICLE_COLUMNS).single()
      );
    },

    async update(id, input) {
      const payload = prepareArticlePayload(input);

      return unwrapQuery(
        getArticlesTable()
          .update(payload)
          .eq("id", id)
          .select(ARTICLE_COLUMNS)
          .single()
      );
    },

    async delete(id) {
      let thumbnailUrl = null;

      try {
        const existing = await this.getById(id);
        thumbnailUrl = existing ? existing.thumbnail_url : null;
      } catch (err) {
        // Tidak fatal untuk flow delete artikel.
      }

      const result = await unwrapQuery(
        getArticlesTable().delete().eq("id", id)
      );

      if (thumbnailUrl) {
        await storage.deleteThumbnailByUrl(thumbnailUrl);
      }

      return result;
    },
  };

  // ---------------------------------------------------------------------
  // Categories module
  // ---------------------------------------------------------------------

  const categories = {
    normalizeSlug,

    // Ambil semua kategori flat (untuk diproses jadi tree di frontend).
    async list() {
      return unwrapQuery(
        getCategoriesTable()
          .select(CATEGORY_COLUMNS)
          .order("name", { ascending: true })
      );
    },

    // Ambil satu kategori by id.
    async getById(id) {
      return unwrapQuery(
        getCategoriesTable().select(CATEGORY_COLUMNS).eq("id", id).single()
      );
    },

    // Ambil satu kategori by slug.
    async getBySlug(slug) {
      return unwrapQuery(
        getCategoriesTable()
          .select(CATEGORY_COLUMNS)
          .eq("slug", normalizeSlug(slug))
          .single()
      );
    },

    // Buat kategori baru.
    async create(input) {
      const name = String(input.name || "").trim();
      const slug = normalizeSlug(input.slug || name);

      return unwrapQuery(
        getCategoriesTable()
          .insert({
            name,
            slug,
            parent_id: input.parent_id || null,
          })
          .select(CATEGORY_COLUMNS)
          .single()
      );
    },

    // Update nama, slug, atau parent kategori.
    async update(id, input) {
      const payload = {};

      if (input.name !== undefined) {
        payload.name = String(input.name).trim();
      }

      if (input.slug !== undefined) {
        payload.slug = normalizeSlug(input.slug);
      } else if (input.name !== undefined) {
        // Auto-generate slug baru dari nama baru kalau slug tidak disuplai.
        payload.slug = normalizeSlug(input.name);
      }

      if ("parent_id" in input) {
        payload.parent_id = input.parent_id || null;
      }

      return unwrapQuery(
        getCategoriesTable()
          .update(payload)
          .eq("id", id)
          .select(CATEGORY_COLUMNS)
          .single()
      );
    },

    // Hapus kategori. Artikel yang punya category_id ini akan
    // set ke NULL secara otomatis karena kolom articles.category_id
    // didefinisikan ON DELETE SET NULL di database.
    async delete(id) {
      return unwrapQuery(getCategoriesTable().delete().eq("id", id));
    },

    // Ambil semua descendant id dari satu kategori (termasuk dirinya sendiri).
    // Pakai RPC Postgres recursive yang sudah dibuat di Langkah 3 SQL.
    async getDescendantIds(categoryId) {
      const { data, error } = await getClient().rpc(
        "get_category_descendant_ids",
        { root_id: categoryId }
      );

      if (error) {
        throw normalizeSupabaseError(error);
      }

      return (data || []).map((r) => r.id);
    },

    // Ubah array flat dari list() jadi nested tree.
    // Return: array kategori top-level, tiap item punya property "children" (array).
    buildTree(flatList) {
      const map = {};
      const roots = [];

      flatList.forEach((cat) => {
        map[cat.id] = { ...cat, children: [] };
      });

      flatList.forEach((cat) => {
        if (cat.parent_id && map[cat.parent_id]) {
          map[cat.parent_id].children.push(map[cat.id]);
        } else {
          roots.push(map[cat.id]);
        }
      });

      return roots;
    },

    // Ubah tree jadi array flat dengan indentasi (untuk dropdown di editor).
    // Return: array { id, name, slug, depth } sudah urut hirarki.
    flattenTreeForSelect(tree, depth = 0) {
      const result = [];

      tree.forEach((node) => {
        result.push({ id: node.id, name: node.name, slug: node.slug, depth });

        if (node.children && node.children.length) {
          result.push(...this.flattenTreeForSelect(node.children, depth + 1));
        }
      });

      return result;
    },
  };


  // ---------------------------------------------------------------------
  // Menus module
  // ---------------------------------------------------------------------

  const MENU_COLUMNS = "id,label,url,order_index,parent_id,created_at";

  const menus = {
    // Ambil semua menu flat, urut by order_index.
    async list() {
      return unwrapQuery(
        getMenusTable()
          .select(MENU_COLUMNS)
          .order("order_index", { ascending: true })
      );
    },

    async getById(id) {
      return unwrapQuery(
        getMenusTable().select(MENU_COLUMNS).eq("id", id).single()
      );
    },

    async create(input) {
      return unwrapQuery(
        getMenusTable()
          .insert({
            label: String(input.label || "").trim(),
            url: String(input.url || "").trim(),
            order_index: Number(input.order_index) || 0,
            parent_id: input.parent_id || null,
          })
          .select(MENU_COLUMNS)
          .single()
      );
    },

    async update(id, input) {
      const payload = {};

      if (input.label !== undefined) payload.label = String(input.label).trim();
      if (input.url !== undefined) payload.url = String(input.url).trim();
      if (input.order_index !== undefined) payload.order_index = Number(input.order_index);
      if ("parent_id" in input) payload.parent_id = input.parent_id || null;

      return unwrapQuery(
        getMenusTable()
          .update(payload)
          .eq("id", id)
          .select(MENU_COLUMNS)
          .single()
      );
    },

    async delete(id) {
      // on delete cascade di DB: submenu ikut terhapus otomatis
      return unwrapQuery(getMenusTable().delete().eq("id", id));
    },

    // Ubah flat list jadi nested tree (sama polanya dengan categories).
    buildTree(flatList) {
      const map = {};
      const roots = [];

      flatList.forEach((item) => {
        map[item.id] = { ...item, children: [] };
      });

      flatList.forEach((item) => {
        if (item.parent_id && map[item.parent_id]) {
          map[item.parent_id].children.push(map[item.id]);
        } else {
          roots.push(map[item.id]);
        }
      });

      return roots;
    },
  };

  global.WafaSupabase = {
    get client() {
      return getClient();
    },
    getClient,
    auth,
    articles,
    categories,
    menus,
    storage,
  };
})(window);