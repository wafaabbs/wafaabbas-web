// services/supabase.js
// Semua komunikasi ke Supabase lewat sini.
// Pastikan SUPABASE_URL dan SUPABASE_ANON_KEY diisi pakai project kamu.

// ======================
// Konfigurasi Supabase
// ======================
const SUPABASE_URL = 'https://sjgsrposlucbkabxaodm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_SVyecFKhxY6MiJKiewluJQ_OzQHFcXF';

// Guard biar gampang debug kalau lupa isi
if (!SUPABASE_URL || SUPABASE_URL.includes('YOUR-PROJECT-REF')) {
  console.error('[Supabase] SUPABASE_URL belum di-set di services/supabase.js');
}
if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes('YOUR_ANON_PUBLIC_KEY')) {
  console.error('[Supabase] SUPABASE_ANON_KEY belum di-set di services/supabase.js');
}

// Ini client global, dipakai semua file JS
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ======================
// Helper: Auth
// ======================

/**
 * Login admin pakai email & password Supabase Auth.
 * Return: { user, session } atau throw Error kalau gagal.
 */
async function signIn(email, password) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('[Supabase] signIn error:', error);
    throw error;
  }

  return data; // { user, session }
}

/**
 * Logout admin.
 */
async function signOut() {
  const { error } = await supabaseClient.auth.signOut();
  if (error) {
    console.error('[Supabase] signOut error:', error);
    throw error;
  }
}

/**
 * Ambil session aktif sekarang.
 * Return: session atau null.
 */
async function getSession() {
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) {
    console.error('[Supabase] getSession error:', error);
    throw error;
  }
  return data.session;
}

/**
 * Listener perubahan auth (login / logout / token refresh).
 * Dipakai nanti kalau mau auto-redirect di admin.
 */
function onAuthChange(callback) {
  const {
    data: { subscription },
  } = supabaseClient.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });

  return subscription; // bisa dipakai untuk unsubscribe kalau perlu
}

// ======================
// Helper: Data publik
// ======================

/**
 * Ambil semua artikel yang status = 'published', urut terbaru.
 */
async function fetchPublishedArticles() {
  const { data, error } = await supabaseClient
    .from('articles')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  if (error) {
    console.error('[Supabase] fetchPublishedArticles error:', error);
    throw error;
  }

  return data || [];
}

/**
 * Ambil 1 artikel berdasarkan slug.
 * Untuk halaman detail artikel publik.
 */
async function fetchArticleBySlug(slug) {
  const { data, error } = await supabaseClient
    .from('articles')
    .select('*')
    .eq('slug', slug)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[Supabase] fetchArticleBySlug error:', error);
    throw error;
  }

  return data; // bisa null kalau tidak ketemu
}

// ======================
// Namespace global
// ======================

// Kita expose 1 objek global biar rapi dipakai di file lain:
// window.WafaSupabase.auth.signIn(...)
// window.WafaSupabase.articles.fetchPublishedArticles() dll.
window.WafaSupabase = {
  client: supabaseClient,
  auth: {
    signIn,
    signOut,
    getSession,
    onAuthChange,
  },
  articles: {
    fetchPublishedArticles,
    fetchArticleBySlug,
  },
};