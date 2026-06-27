// services/supabase.js
// Satu pintu koneksi Supabase untuk frontend & admin.

const SUPABASE_URL = "https://sjgsrposlucbkabxaodm.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_SVyecFKhxY6MiJKiewluJQ_OzQHFcXF";

let supabaseClient = null;

function getSupabaseClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn("Supabase belum dikonfigurasi.");
    return null;
  }

  if (supabaseClient) return supabaseClient;
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return supabaseClient;
}

// ========== AUTH ==========

async function signIn(email, password) {
  const client = getSupabaseClient();
  if (!client) return { data: null, error: "Supabase not configured" };

  const { data, error } = await client.auth.signInWithPassword({ email, password });
  return { data, error };
}

async function signOut() {
  const client = getSupabaseClient();
  if (!client) return { error: "Supabase not configured" };
  const { error } = await client.auth.signOut();
  return { error };
}

async function getSession() {
  const client = getSupabaseClient();
  if (!client) return { data: null, error: "Supabase not configured" };
  const { data, error } = await client.auth.getSession();
  return { data: data?.session ?? null, error };
}

// ========== DATA ==========

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

window.WafaSupabase = {
  getClient: getSupabaseClient,
  auth: {
    signIn,
    signOut,
    getSession,
  },
  fetchPublishedArticles,
  fetchArticleBySlug,
};