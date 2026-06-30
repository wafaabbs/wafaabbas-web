const WAFA_SUPABASE_CONFIG = {
  url: "https://sjgsrposlucbkabxaodm.supabase.co",
  anonKey: "sb_publishable_SVyecFKhxY6MiJKiewluJQ_OzQHFcXF",
  tables: {
    articles: "articles",
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

  const ARTICLE_COLUMNS = [
    "id",
    "title",
    "slug",
    "excerpt",
    "content",
    "category",
    "status",
    "published_at",
    "created_at",
    "updated_at",
    "thumbnail_url",
  ].join(",");

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
        "Slug sudah digunakan artikel lain. Ganti slug dengan versi yang unik."
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
      category: String(input.category || "").trim(),
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

  // Ambil storage path ("nama-file.ext") dari public URL thumbnail.
  // Mengembalikan null kalau URL tidak dikenali (misal sudah dihapus manual,
  // atau bukan URL dari bucket thumbnails ini).
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
    /**
     * Upload thumbnail baru ke bucket "thumbnails".
     * Mengembalikan { path, publicUrl }.
     */
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

    /**
     * Hapus thumbnail dari bucket berdasarkan public URL yang tersimpan
     * di kolom thumbnail_url. Aman dipanggil walau URL null/tidak valid;
     * akan diam-diam diabaikan (tidak melempar error) supaya tidak
     * memblokir flow utama (save/delete artikel).
     */
    async deleteThumbnailByUrl(publicUrl) {
      const path = getStoragePathFromPublicUrl(publicUrl);

      if (!path) {
        return;
      }

      const { error } = await getThumbnailsBucket().remove([path]);

      if (error) {
        // Tidak melempar error: kegagalan hapus file lama tidak boleh
        // menggagalkan keseluruhan flow update/delete artikel.
        console.warn("Gagal menghapus thumbnail lama:", error.message);
      }
    },

    /**
     * Helper kombinasi untuk dipakai di editor: upload file baru,
     * lalu hapus file lama (kalau ada) setelah upload baru berhasil.
     * Urutan ini sengaja: upload dulu baru hapus lama, supaya kalau
     * upload baru gagal, thumbnail lama tidak ikut hilang.
     */
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

    async listPublished({ limit = 12, category } = {}) {
      let query = getArticlesTable()
        .select(ARTICLE_COLUMNS)
        .eq("status", ARTICLE_STATUS.PUBLISHED)
        .order("published_at", { ascending: false })
        .limit(limit);

      if (category) {
        query = query.eq("category", category);
      }

      return unwrapQuery(query);
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

    /**
     * Delete artikel sekaligus thumbnail-nya di storage (kalau ada).
     * Mengambil thumbnail_url dulu sebelum delete row, supaya kita tahu
     * file mana yang harus dihapus dari bucket.
     */
    async delete(id) {
      let thumbnailUrl = null;

      try {
        const existing = await this.getById(id);
        thumbnailUrl = existing ? existing.thumbnail_url : null;
      } catch (err) {
        // Kalau gagal ambil data lama, lanjut saja proses delete row.
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

  global.WafaSupabase = {
    get client() {
      return getClient();
    },
    getClient,
    auth,
    articles,
    storage,
  };
})(window);