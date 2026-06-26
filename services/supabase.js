// services/supabase.js
// Modul kecil buat koneksi Supabase dari frontend (tanpa backend sendiri).

// TODO: ganti dengan URL & anon key proyek Supabase lo
const SUPABASE_URL = "https://YOUR-PROJECT.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_ANON_PUBLIC_KEY";

let supabaseClient = null;

function getSupabaseClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn("Supabase belum dikonfigurasi. Isi SUPABASE_URL dan SUPABASE_ANON_KEY di services/supabase.js");
    return null;
  }

  if (supabaseClient) return supabaseClient;

  // versi browser SDK v2 (nanti kita konkretkan setelah lo setup Supabase)
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return supabaseClient;
}

// Helper: ambil artikel published
async function fetchPublishedArticles() {
  const client = getSupabaseClient();
  if (!client) return { data: [], error: "Supabase not configured" };

  const { data, error } = await client
    .from("articles")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  return { data: data || [], error };
}

// Helper: ambil 1 artikel berdasarkan slug
async function fetchArticleBySlug(slug) {
  const client = getSupabaseClient();
  if (!client) return { data: null, error: "Supabase not configured" };

  const { data, error } = await client
    .from("articles")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  return { data, error };
}

// Export ke global biar bisa dipakai di file JS lain tanpa bundler
window.WafaSupabase = {
  getClient: getSupabaseClient,
  fetchPublishedArticles,
  fetchArticleBySlug,
};