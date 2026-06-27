// assets/js/admin-auth.js
// Login admin pakai Supabase Auth (email & password)

document.addEventListener("DOMContentLoaded", async () => {
  const yearSpan = document.getElementById("year");
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();

  const form = document.getElementById("login-form");
  form?.addEventListener("submit", handleLogin);

  // Kalau sudah ada session aktif, langsung masuk dashboard
  const { data: session } = await window.WafaSupabase.auth.getSession();
  if (session) {
    window.location.href = "posts.html";
  }
});

async function handleLogin(event) {
  event.preventDefault();
  const emailInput = document.getElementById("admin-email");
  const passInput = document.getElementById("admin-password");
  const msg = document.getElementById("login-message");

  const email = emailInput.value.trim();
  const password = passInput.value;

  if (!email || !password) {
    if (msg) msg.textContent = "Email dan password wajib diisi.";
    return;
  }

  const { data, error } = await window.WafaSupabase.auth.signIn(email, password);

  if (error) {
    console.error(error);
    if (msg) msg.textContent = "Login gagal: " + (error.message || "periksa email/password.");
    return;
  }

  if (msg) msg.textContent = "Login berhasil, mengalihkan...";
  window.location.href = "posts.html";
}

// Helper buat dipakai di admin-posts.js
window.WafaAdminAuth = {
  async isLoggedIn() {
    const { data: session } = await window.WafaSupabase.auth.getSession();
    return !!session;
  },
  async logout() {
    await window.WafaSupabase.auth.signOut();
  },
};