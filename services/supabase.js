const WAFA_SUPABASE_CONFIG = {
  url: "https://sjgsrposlucbkabxaodm.supabase.co",
  anonKey: "sb_publishable_SVyecFKhxY6MiJKiewluJQ_OzQHFcXF",
  tables: {
    articles: "articles",
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

    async delete(id) {
      return unwrapQuery(getArticlesTable().delete().eq("id", id));
    },
  };

  global.WafaSupabase = {
    get client() {
      return getClient();
    },
    getClient,
    auth,
    articles,
  };
})(window);