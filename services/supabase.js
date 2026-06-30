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
      throw new Error(
        "Supabase SDK belum dimuat. Tambahkan script @supabase/supabase-js sebelum services/supabase.js."
      );
    }
  }

  function assertConfig() {
    const hasUrl =
      WAFA_SUPABASE_CONFIG.url &&
      !WAFA_SUPABASE_CONFIG.url.includes("PASTE_SUPABASE_PROJECT_URL_HERE");
    const hasAnonKey =
      WAFA_SUPABASE_CONFIG.anonKey &&
      !WAFA_SUPABASE_CONFIG.anonKey.includes("PASTE_SUPABASE_ANON_KEY_HERE");

    if (!hasUrl || !hasAnonKey) {
      throw new Error(
        "Konfigurasi Supabase belum lengkap. Isi url dan anonKey di services/supabase.js."
      );
    }
  }

  function getClient() {
    if (client) {
      return client;
    }

    assertSupabaseSdk();
    assertConfig();

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

  async function unwrapQuery(query) {
    const { data, error } = await query;

    if (error) {
      throw error;
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
        throw error;
      }

      return data.session;
    },

    async getUser() {
      const { data, error } = await getClient().auth.getUser();

      if (error) {
        throw error;
      }

      return data.user;
    },

    async signIn(email, password) {
      const { data, error } = await getClient().auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      return data;
    },

    async signOut() {
      const { error } = await getClient().auth.signOut();

      if (error) {
        throw error;
      }
    },

    onAuthStateChange(callback) {
      return getClient().auth.onAuthStateChange(callback);
    },

    async requireSession(redirectTo = "/admin/login.html") {
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

    async publish(id) {
      const now = getTimestamp();

      return unwrapQuery(
        getArticlesTable()
          .update({
            status: ARTICLE_STATUS.PUBLISHED,
            published_at: now,
            updated_at: now,
          })
          .eq("id", id)
          .select(ARTICLE_COLUMNS)
          .single()
      );
    },

    async unpublish(id) {
      return unwrapQuery(
        getArticlesTable()
          .update({
            status: ARTICLE_STATUS.DRAFT,
            published_at: null,
            updated_at: getTimestamp(),
          })
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