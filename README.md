# wafaabbas.com

Website personal edukasi akuntansi, keuangan, perpajakan, financial planning, produktivitas, dan karier. Dibangun dengan HTML/CSS/JS statis dan Supabase sebagai backend (database, auth, storage).

## Tech Stack

- HTML5, CSS3, Vanilla JavaScript (tanpa framework/build step)
- [Supabase](https://supabase.com) — Database (Postgres), Auth, Storage
- GitHub Pages / GitHub Codespaces untuk hosting dan development

## Struktur Folder

```
admin/
  dashboard.html       Halaman ringkasan admin
  editor.html           Form create/edit artikel
  login.html             Login admin
  posts.html             Daftar semua artikel (admin)

assets/
  css/
    admin.css            Style untuk halaman admin
    main.css              Style untuk halaman publik
  img/
    thumbnail-placeholder.png   Fallback gambar saat artikel belum punya thumbnail
  js/
    admin-auth.js        Logic login admin
    admin-editor.js       Logic form editor (create/update/delete + upload thumbnail)
    admin-posts.js        Logic daftar artikel di admin
    articles.js            Logic halaman publik artikel (list + detail)
    main.js                 Logic homepage (menampilkan artikel terbaru)

services/
  supabase.js            Satu-satunya pintu koneksi ke Supabase (auth, articles, storage)

about.html
article.html             Daftar/detail artikel publik
contact.html
index.html                  Homepage
README.md
```

**Aturan penting:** semua interaksi dengan Supabase wajib lewat `services/supabase.js`. File ini expose `window.WafaSupabase` yang berisi tiga modul: `auth`, `articles`, dan `storage`. Jangan panggil Supabase client langsung dari file lain.

## Setup Supabase

### 1. Project & API Key

Buat project di [supabase.com](https://supabase.com), lalu salin `Project URL` dan `anon public key` ke `services/supabase.js` pada bagian `WAFA_SUPABASE_CONFIG`.

> **Catatan soal anon key:** anon key Supabase memang didesain untuk dipakai di sisi client/public (termasuk ditulis langsung di kode yang ter-commit ke repo publik). Key ini tidak memberi akses penuh ke database — semua pembatasan akses diatur lewat Row Level Security (RLS) policy di bawah, bukan lewat menyembunyikan key. Yang **tidak boleh** pernah ditaruh di kode frontend adalah `service_role key`, karena itu bisa bypass RLS sepenuhnya.

### 2. Tabel `articles`

Kolom yang dipakai:

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid / bigint | Primary key |
| title | text | Judul artikel |
| slug | text | Unik, dipakai di URL |
| excerpt | text | Ringkasan singkat |
| content | text | Isi artikel |
| category | text | Kategori artikel |
| status | text | `draft` atau `published` |
| published_at | timestamptz, **nullable** | Diisi otomatis saat status jadi `published` |
| created_at | timestamptz | Diisi otomatis saat create |
| updated_at | timestamptz | Diisi otomatis setiap update |
| thumbnail_url | text, nullable | Public URL gambar dari Supabase Storage |

Pastikan `published_at` bisa `NULL` (artikel draft belum punya tanggal publish):

```sql
alter table articles alter column published_at drop not null;
```

### 3. RLS Policy — tabel `articles`

```sql
alter table articles enable row level security;

create policy "Public can read published articles"
on articles for select to anon
using (status = 'published');

create policy "Authenticated users can read all articles"
on articles for select to authenticated
using (true);

create policy "Authenticated users can insert articles"
on articles for insert to authenticated
with check (true);

create policy "Authenticated users can update articles"
on articles for update to authenticated
using (true) with check (true);

create policy "Authenticated users can delete articles"
on articles for delete to authenticated
using (true);
```

### 4. Storage Bucket — `thumbnails`

Buat bucket bernama `thumbnails`, set sebagai **public bucket**. Policy storage yang dibutuhkan:

- `anon`/`public` bisa **select** (baca) semua file — supaya gambar bisa tampil di halaman publik
- `authenticated` bisa **insert**, **update**, dan **delete** file — supaya admin bisa upload/ganti/hapus thumbnail

Penamaan file di-generate otomatis oleh `services/supabase.js` dengan format `timestamp-random.ext`, jadi tidak akan ada collision nama file.

## Cara Login Admin

1. Buat user lewat Supabase Dashboard → Authentication → Add User (atau lewat SQL/API), gunakan email + password.
2. Buka `admin/login.html`, login dengan kredensial tersebut.
3. Setelah berhasil, otomatis redirect ke `admin/posts.html`.

Semua halaman admin (`dashboard.html`, `editor.html`, `posts.html`) melakukan pengecekan sesi lewat `auth.requireSession()` — kalau belum login, otomatis redirect ke `login.html`.

## Workflow Development

1. Jalankan lewat GitHub Codespaces, atau buka langsung file HTML-nya (tidak butuh build step/bundler).
2. Semua perubahan ke logic Supabase (query, auth, storage) dilakukan di `services/supabase.js` — jangan duplikasi koneksi di file lain.
3. Setelah edit file `.js`/`.css`, lakukan hard refresh browser (Ctrl+Shift+R) untuk menghindari cache lama, terutama untuk file yang di-load lewat tag `<script>`.
4. CSS sengaja dijaga basic/fungsional dulu (dark theme sederhana). Redesign UI/UX direncanakan setelah seluruh sistem CMS stabil.

## Deployment (GitHub Pages)

1. Push perubahan ke branch `main`.
2. Di repo Settings → Pages, set source ke branch `main`, folder root (`/`).
3. Situs akan ter-deploy otomatis di `https://<username>.github.io/<repo>/` atau custom domain yang dikonfigurasi.
4. Karena tidak ada build step, deployment GitHub Pages murni menyajikan file statis apa adanya — pastikan path relatif (`../assets/...`, `./services/...`, dsb) sudah benar sebelum push.

## Status Progress

### Phase 1 — CMS Dasar ✅ Selesai
- Supabase service (`auth`, `articles`) dengan RLS
- Login/logout admin
- CRUD artikel (create, read, update, delete)
- Draft & publish flow
- Halaman publik (homepage + detail artikel) terkoneksi Supabase

### Phase 2 — Media ✅ Selesai
- Supabase Storage untuk upload thumbnail
- Preview gambar sebelum disimpan
- Auto-hapus thumbnail lama saat diganti atau artikel dihapus
- Validasi tipe file (JPG/PNG/WEBP/GIF) dan ukuran maksimal (5MB)
- Fallback placeholder image untuk artikel tanpa thumbnail
- Render thumbnail di homepage dan halaman detail artikel

### Phase 3 — Belum dimulai
- Scope masih dalam tahap diskusi.