(function initAdminAuth() {
  "use strict";

  const { auth } = window.WafaSupabase;

  const elements = {
    loginForm: document.getElementById("loginForm"),
    emailInput: document.getElementById("emailInput"),
    passwordInput: document.getElementById("passwordInput"),
    loginMessage: document.getElementById("loginMessage"),
    loginButton: document.getElementById("loginButton"),
  };

  function setMessage(message, type = "neutral") {
    elements.loginMessage.textContent = message;
    elements.loginMessage.dataset.type = type;
  }

  function setLoading(isLoading) {
    elements.loginButton.disabled = isLoading;
    elements.loginButton.textContent = isLoading ? "Logging in..." : "Login";
  }

  async function redirectIfAuthenticated() {
    const session = await auth.getSession();

    if (session) {
      window.location.href = "./posts.html";
    }
  }

  async function handleLogin(event) {
    event.preventDefault();

    const email = elements.emailInput.value.trim();
    const password = elements.passwordInput.value;

    if (!email || !password) {
      setMessage("Email dan password wajib diisi.", "error");
      return;
    }

    setLoading(true);
    setMessage("Memeriksa akun...");

    try {
      await auth.signIn(email, password);
      setMessage("Login berhasil. Membuka dashboard...", "success");
      window.location.href = "./posts.html";
    } catch (error) {
      setMessage(error.message || "Login gagal. Periksa email dan password.", "error");
    } finally {
      setLoading(false);
    }
  }

  function bindEvents() {
    elements.loginForm.addEventListener("submit", handleLogin);
  }

  async function boot() {
    try {
      bindEvents();
      await redirectIfAuthenticated();
    } catch (error) {
      setMessage(error.message || "Gagal menyiapkan halaman login.", "error");
    }
  }

  boot();
})();