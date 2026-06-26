(function () {
  const supabaseUrl = window.SUPABASE_URL || window.__SUPABASE_URL__ || '';
  const supabaseAnonKey = window.SUPABASE_ANON_KEY || window.__SUPABASE_ANON_KEY__ || '';
  let client = null;

  function isConfigured() {
    return Boolean(supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('YOUR_PROJECT') && !supabaseAnonKey.includes('YOUR_'));
  }

  function getConfigStatus() {
    return {
      configured: isConfigured(),
      url: supabaseUrl,
      hasKey: Boolean(supabaseAnonKey),
    };
  }

  function getSupabaseClient() {
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      throw new Error('Supabase JS was not loaded.');
    }

    if (!client) {
      if (!isConfigured()) {
        throw new Error('Supabase URL and anon key are not configured.');
      }

      client = window.supabase.createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    }

    return client;
  }

  async function signInWithGithub(redirectTo) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: redirectTo || window.location.origin + '/admin/dashboard.html',
      },
    });

    if (error) {
      throw error;
    }

    return data;
  }

  async function signOut() {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
  }

  async function getSession() {
    const supabase = getSupabaseClient();
    return supabase.auth.getSession();
  }

  window.supabaseAuth = {
    getSupabaseClient,
    signInWithGithub,
    signOut,
    getSession,
    isConfigured,
    getConfigStatus,
  };
})();
