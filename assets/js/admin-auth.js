// assets/js/admin-auth.js

// Halaman tujuan setelah login sukses
const POSTS_PAGE = '/admin/posts.html';

// Ambil objek auth dari Supabase yang sudah kamu inisialisasi di services/supabase.js
function getAuth() {
  if (!window.WafaSupabase || !window.WafaSupabase.auth) {
    console.error('WafaSupabase.auth tidak ditemukan. Pastikan services/supabase.js sudah dimuat sebelum admin-auth.js.');
    return null;
  }
  return window.WafaSupabase.auth;
}

// Helper untuk update pesan status di halaman login
function setStatus(message, type = 'info') {
  const statusEl = document.getElementById('status') || document.getElementById('login-status');
  if (!statusEl) return;

  statusEl.textContent = message || '';

  // Reset class basic
  statusEl.classList.remove('status-info', 'status-error', 'status-success');

  if (type === 'error') {
    statusEl.classList.add('status-error');
  } else if (type === 'success') {
    statusEl.classList.add('status-success');
  } else {
    statusEl.classList.add('status-info');
  }
}

// Enable / disable form saat login diproses
function setFormDisabled(disabled) {
  const form = document.getElementById('login-form');
  if (!form) return;

  const elements = form.querySelectorAll('input, button');
  elements.forEach((el) => {
    el.disabled = disabled;
  });
}

// Cek apakah sudah ada sesi login aktif
async function checkExistingSession() {
  const auth = getAuth();
  if (!auth) {
    setStatus('Konfigurasi Supabase belum siap. Cek console.', 'error');
    return;
  }

  try {
    setStatus('Mengecek sesi login...', 'info');

    const { data, error } = await auth.getSession();

    if (error) {
      console.error('Error getSession:', error);
      setStatus('Gagal cek sesi. Silakan login ulang.', 'error');
      return;
    }

    const session = data?.session;

    if (session) {
      // Sudah login: langsung lempar ke posts.html
      setStatus('Sudah login, mengarahkan ke dashboard...', 'success');
      window.location.href = POSTS_PAGE;
    } else {
      // Belum login: biarkan form tampil, jangan redirect
      setStatus('', 'info');
    }
  } catch (err) {
    console.error('Exception saat cek sesi:', err);
    setStatus('Terjadi error saat cek sesi. Silakan login ulang.', 'error');
  }
}

// Inisialisasi handler form login
function initLoginForm() {
  const form = document.getElementById('login-form');
  if (!form) {
    console.warn('login-form tidak ditemukan di halaman ini.');
    return;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const auth = getAuth();
    if (!auth) {
      setStatus('Konfigurasi Supabase belum siap. Cek console.', 'error');
      return;
    }

    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    const email = emailInput ? emailInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';

    if (!email || !password) {
      setStatus('Email dan password wajib diisi.', 'error');
      return;
    }

    try {
      setFormDisabled(true);
      setStatus('Sedang login...', 'info');

      const { data, error } = await auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Error signInWithPassword:', error);

        if (error.message?.toLowerCase().includes('invalid login credentials')) {
          setStatus('Email atau password salah.', 'error');
        } else {
          setStatus(error.message || 'Gagal login. Coba lagi.', 'error');
        }

        setFormDisabled(false);
        return;
      }

      // Berhasil login
      console.log('Login sukses:', data);
      setStatus('Login berhasil, mengarahkan ke dashboard...', 'success');

      // Sedikit delay biar user sempat lihat pesan
      setTimeout(() => {
        window.location.href = POSTS_PAGE;
      }, 500);
    } catch (err) {
      console.error('Exception saat login:', err);
      setStatus('Terjadi error tidak terduga saat login.', 'error');
      setFormDisabled(false);
    }
  });
}

// Saat DOM siap, jalankan alur login
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Cek dulu ada sesi atau tidak
  await checkExistingSession();
  // 2. Apapun hasilnya, siapkan form handler (kalau sudah login akan langsung redirect, jadi user ga lihat ini)
  initLoginForm();
});