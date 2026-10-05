/**
 * GOOGLE APPS SCRIPT WEBHOOK UNTUK HEMAS WEDDING LIVE
 * 
 * Cara Penggunaan:
 * 1. Buat Google Spreadsheet baru di Google Drive Anda (misal nama: "Data Tamu HeMa Wedding").
 * 2. Buat 2 sheet di dalamnya:
 *    - Sheet 1 beri nama: "Kehadiran"
 *    - Sheet 2 beri nama: "Ucapan"
 * 3. Di Google Spreadsheet, klik menu: Ekstensi > Apps Script.
 * 4. Hapus semua kode yang ada, lalu paste seluruh kode di bawah ini.
 * 5. Klik tombol "Terapkan" (Deploy) > "Penerapan Baru" (New Deployment).
 * 6. Pilih Jenis: "Aplikasi Web" (Web App).
 * 7. Konfigurasi:
 *    - Jalankan sebagai: "Saya" (Akun Google Anda)
 *    - Yang memiliki akses: "Siapa saja" (Anyone)
 * 8. Klik Terapkan dan salin URL Webhook yang dihasilkan.
 * 9. Masukkan URL tersebut ke menu Panel Admin aplikasi (di tab Pengaturan Google Sheets).
 */

function doPost(e) {
  try {
    var rawData = e.postData.contents;
    var data = JSON.parse(rawData);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. Catat Kehadiran (Check-In)
    if (data.action === "CHECK_IN") {
      var sheetHadir = ss.getSheetByName("Kehadiran");
      if (!sheetHadir) {
        sheetHadir = ss.insertSheet("Kehadiran");
        sheetHadir.appendRow(["Timestamp", "ID Tamu", "Nama Tamu", "Kategori", "Pax", "Petugas/Metode"]);
      }
      
      sheetHadir.appendRow([
        new Date(data.timestamp || new Date()),
        data.guestId || "-",
        data.guestName,
        data.category || "Tamu Undangan",
        data.pax || 1,
        data.checkedInBy || "Scanner"
      ]);

      return ContentService.createTextOutput(JSON.stringify({ status: "success", type: "checkin" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 2. Catat Ucapan & Voice Note
    if (data.action === "NEW_WISH") {
      var sheetUcapan = ss.getSheetByName("Ucapan");
      if (!sheetUcapan) {
        sheetUcapan = ss.insertSheet("Ucapan");
        sheetUcapan.appendRow(["Timestamp", "Nama Pengirim", "Hubungan", "Tipe", "Durasi VN (detik)", "Pesan Doa"]);
      }

      sheetUcapan.appendRow([
        new Date(data.timestamp || new Date()),
        data.senderName,
        data.relationship || "Teman",
        data.type === "voice" ? "Voice Note" : "Teks",
        data.audioDuration || 0,
        data.message || ""
      ]);

      return ContentService.createTextOutput(JSON.stringify({ status: "success", type: "wish" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "unknown action" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput("Webhook HeMa Wedding Live aktif dan siap menerima data!");
}
