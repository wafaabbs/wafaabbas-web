// assets/js/admin-auth.js

const POSTS_PAGE = '/admin/posts.html';

// Ambil helper auth dari services/supabase.js
function getAuth() {
  if (!window.WafaSupabase || !window.WafaSupabase.auth) {
    console.error(
      'WafaSupabase.auth tidak ditemukan. Pastikan services/supabase.js dimuat lebih dulu.'
    );
    return null;
  }

  return window.WafaSupabase.auth;
}

// Helper status
function setStatus(message = '', type = 'info') {
  const statusEl =
    document.getElementById('status') ||
    document.getElementById('login-status');

  if (!statusEl) return;

  statusEl.textContent = message;

  statusEl.classList.remove(
    'status-info',
    'status-success',
    'status-error'
  );

  if (message) {
    statusEl.classList.add(`status-${type}`);
  }
}

// Enable / disable form
function setFormDisabled(disabled) {
  const form = document.getElementById('login-form');
  if (!form) return;

  form.querySelectorAll('input, button').forEach((el) => {
    el.disabled = disabled;
  });
}

// Cek session login
async function checkExistingSession() {
  const auth = getAuth();
  if (!auth) {
    setStatus('Supabase belum siap.', 'error');
    return;
  }

  try {
    const session = await auth.getSession();

    if (session) {
      setStatus('Session ditemukan. Mengarahkan...', 'success');

      setTimeout(() => {
        window.location.href = POSTS_PAGE;
      }, 300);

      return true;
    }

    return false;
  } catch (err) {
    console.error(err);
    setStatus('Gagal memeriksa session.', 'error');
    return false;
  }
}

// Login handler
function initLoginForm() {
  const form = document.getElementById('login-form');

  if (!form) {
    console.warn('login-form tidak ditemukan.');
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const auth = getAuth();
    if (!auth) return;

    const email =
      document.getElementById('email')?.value.trim() || '';
    const password =
      document.getElementById('password')?.value || '';

    if (!email || !password) {
      setStatus('Email dan password wajib diisi.', 'error');
      return;
    }

    try {
      setFormDisabled(true);
      setStatus('Sedang login...', 'info');

      const data = await auth.signIn(email, password);

      console.log('Login sukses:', data);

      setStatus(
        'Login berhasil. Mengarahkan ke dashboard...',
        'success'
      );

      setTimeout(() => {
        window.location.href = POSTS_PAGE;
      }, 500);
    } catch (err) {
      console.error(err);

      if (
        err.message &&
        err.message.toLowerCase().includes('invalid login credentials')
      ) {
        setStatus('Email atau password salah.', 'error');
      } else {
        setStatus(err.message || 'Login gagal.', 'error');
      }

      setFormDisabled(false);
    }
  });
}

// Init
document.addEventListener('DOMContentLoaded', async () => {
  const loggedIn = await checkExistingSession();

  if (!loggedIn) {
    initLoginForm();
  }
});