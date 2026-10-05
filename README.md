# HeMa Wedding Live Moments (PWA)

Aplikasi Web Progresif (PWA) Buku Tamu Digital & Live Sharing Momen Pernikahan **Hendra & Maya (HeMa)**. Didesain dengan tema **Midnight Navy & Warm Champagne Gold** yang mewah dan elegan.

---

## Fitur Utama

1. **Dual-Mode Check-in Barcode / QR**:
   - **Mode 1 (Panitia/Resepsionis)**: Kamera scanner live dengan audio chime "beep" & haptic feedback getar. Dilengkapi fitur pencarian manual nama tamu jika kartu rusak.
   - **Mode 2 (Tamu Mandiri)**: Tamu scan QR Meja Resepsionis langsung dari HP mereka untuk konfirmasi kehadiran instan.
2. **Offline-First & Auto-Sync Engine (Sinyal Buruk)**:
   - Jika sinyal internet terputus, data scan hadir, ucapan teks, voice note, dan upload foto **tetap tersimpan aman di HP (IndexedDB)**.
   - Indikator status koneksi `🟢 Online` vs `🟠 Offline`.
   - Begitu sinyal internet kembali pulih, seluruh antrean secara otomatis disinkronisasi ke server di latar belakang (*background auto-sync*).
3. **Buku Tamu Interaktif**:
   - Ucapan doa teks dengan pemilih emoji cepat.
   - **Perekam Voice Note (Suara)** bawaan (Web Audio API) dengan visualisasi timer & gelombang suara (*waveform*).
   - Audio player estetik untuk mendengarkan kembali rekaman doa tamu.
4. **Live Moments Feed (Galeri Bersama)**:
   - **Tab Fotografer Resmi (Official)**: Foto kualitas tinggi dengan thumbnail cepat.
   - **Tab Momen Tamu**: Selfie dan video candid yang diunggah oleh para tamu.
   - Tombol Like / Reaksi cinta dengan animasi mengambang.
   - Fullscreen Lightbox viewer untuk melihat foto resolusi penuh & download.
5. **Mode Layar Proyektor TV (`/live`)**:
   - Tampilan khusus panggung/proyektor gedung.
   - Slideshow foto otomatis, live running ticker ucapan tamu, dan counter jumlah kehadiran tamu secara realtime.
   - Dilengkapi QR Code di pojok layar agar tamu di meja bisa langsung scan.
6. **Panel Admin & Fotografer (`/admin`)**:
   - Dilindungi PIN keamanan (Default PIN: `1234`).
   - Batch upload foto untuk fotografer (bisa upload puluhan foto sekaligus dengan tagging kategori).
   - Ekspor data 1-klik ke file CSV (dapat langsung dibuka di Microsoft Excel atau Google Sheets).
   - Pengaturan integrasi Google Sheets & Google Drive.

---

## Cara Menjalankan Aplikasi di Lokal

1. Buka terminal di folder proyek:
   ```bash
   npm run dev
   ```
2. Buka browser di alamat:
   ```
   http://localhost:3000
   ```

---

## Cara Menghubungkan ke Google Sheets & Google Drive

File `google-apps-script.js` sudah disediakan di folder ini:
1. Buat Spreadsheet baru di Google Drive Anda.
2. Klik menu **Ekstensi > Apps Script**.
3. Copy-paste isi file [google-apps-script.js](file:///d:/Antigravity/HeMa%20Wedding%20Live/google-apps-script.js) ke dalam editor Apps Script.
4. Klik **Terapkan (Deploy)** > **Penerapan Baru (New Deployment)** > Pilih **Aplikasi Web (Web App)**.
   - Jalankan sebagai: **Saya**
   - Yang memiliki akses: **Siapa saja**
5. Salin Webhook URL yang diberikan Google.
6. Buka menu **Admin** di aplikasi (`/admin`), paste Webhook URL tersebut ke kolom pengaturan, lalu simpan.

---

## Cara Deploy ke Vercel

1. Push folder proyek ini ke repository GitHub Anda:
   ```bash
   git init
   git add .
   git commit -m "Initial HeMa Wedding Live PWA"
   git remote add origin https://github.com/USERNAME/REPO_NAME.git
   git push -u origin main
   ```
2. Buka dashboard [Vercel](https://vercel.com).
3. Import repository GitHub tersebut.
4. Klik **Deploy**. Vercel akan otomatis meng-compile dan menyediakan domain HTTPS gratis.
