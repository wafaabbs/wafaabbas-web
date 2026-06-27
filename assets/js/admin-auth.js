// assets/js/admin-auth.js
// Login dummy berbasis password tunggal + localStorage

document.addEventListener("DOMContentLoaded", () => {
  const yearSpan = document.getElementById("year");
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();

  const form = document.getElementById("login-form");
  form?.addEventListener("submit", handleLogin);

  // Kalau sudah login, langsung masuk dashboard
  if (isLoggedIn()) {
    window.location.href = "posts.html";
  }
});

// GANTI ini kalau mau ubah password admin
const DUMMY_ADMIN_PASSWORD = "wafa-admin-123";

function isLoggedIn() {
  return localStorage.getItem("wafa_admin") === "ok";
}

function handleLogin(event) {
  event.preventDefault();
  const input = document.getElementById("admin-password");
  const msg = document.getElementById("login-message");
  const value = input.value.trim();

  if (value === DUMMY_ADMIN_PASSWORD) {
    localStorage.setItem("wafa_admin", "ok");
    if (msg) msg.textContent = "Login berhasil, mengalihkan...";
    window.location.href = "posts.html";
  } else {
    if (msg) msg.textContent = "Password salah.";
  }
}

window.WafaAdminAuth = {
  isLoggedIn,
};