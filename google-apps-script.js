/**
 * ============================================================================
 * GOOGLE APPS SCRIPT: AUTO-SETUP DATABASE & GOOGLE DRIVE INTEGRATION
 * PROYEK: HeMa Wedding Live Moments
 * ============================================================================
 * 
 * FITUR:
 * 1. Setup Database Otomatis: Membuat 4 Sheet rapi dengan styling header
 *    (Daftar_Undangan, Kehadiran, Ucapan_Doa, Galeri_Media).
 * 2. Setup Google Drive Otomatis: Membuat folder utama "HeMa Wedding Moments"
 *    beserta 3 subfolder terpisah (Foto_Fotografer, Momen_Tamu, Voice_Notes).
 * 3. Auto File Upload: Otomatis menyimpan file foto, video, dan rekaman audio
 *    voice note tamu/fotografer langsung ke Google Drive dan mencatat link-nya.
 * 
 * CARA PAKAI:
 * 1. Buat Google Spreadsheet baru di Google Drive Anda.
 * 2. Klik menu: Ekstensi > Apps Script.
 * 3. Hapus semua isi file Code.gs, lalu paste seluruh script ini.
 * 4. Simpan (Ctrl + S), lalu reload Google Spreadsheet Anda.
 * 5. Akan muncul menu baru di atas: "💍 HeMa Wedding" > klik "⚙️ Setup Database & Drive Otomatis".
 * 6. Klik "Terapkan (Deploy)" > "Penerapan Baru (New Deployment)" > Aplikasi Web (Web App):
 *    - Jalankan sebagai: "Saya" (Akun Google Anda)
 *    - Siapa saja yang memiliki akses: "Siapa saja" (Anyone)
 * 7. Salin URL Webhook dan masukkan ke Panel Admin aplikasi.
 */

// 1. Menu Otomatis di Google Sheets
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('💍 HeMa Wedding')
    .addItem('⚙️ Setup Database & Folder Drive Otomatis', 'setupDatabase')
    .addItem('📁 Buka Folder Google Drive Media', 'openDriveFolder')
    .addItem('ℹ️ Cek Info Webhook', 'showWebhookInfo')
    .addToUi();
}

// 2. Setup Database & Folder Drive Otomatis Sekali Klik
function setupDatabase() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();

  try {
    // --- A. SETUP FOLDER GOOGLE DRIVE ---
    var rootFolderName = "HeMa Wedding Live - Master Media";
    var rootFolders = DriveApp.getFoldersByName(rootFolderName);
    var rootFolder;

    if (rootFolders.hasNext()) {
      rootFolder = rootFolders.next();
    } else {
      rootFolder = DriveApp.createFolder(rootFolderName);
      rootFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    }

    // Subfolder 1: Foto Fotografer
    var photoFolder = getOrCreateSubfolder(rootFolder, "01_Foto_Fotografer");
    // Subfolder 2: Momen Tamu
    var guestFolder = getOrCreateSubfolder(rootFolder, "02_Momen_Tamu");
    // Subfolder 3: Voice Notes (Audio Doa)
    var voiceFolder = getOrCreateSubfolder(rootFolder, "03_Voice_Notes_Audio");

    // Simpan ID folder ke ScriptProperties
    var props = PropertiesService.getScriptProperties();
    props.setProperty("ROOT_FOLDER_ID", rootFolder.getId());
    props.setProperty("FOTO_FOLDER_ID", photoFolder.getId());
    props.setProperty("TAMU_FOLDER_ID", guestFolder.getId());
    props.setProperty("VOICE_FOLDER_ID", voiceFolder.getId());

    // --- B. SETUP SHEETS DENGAN STYLING NAVY & GOLD ---
    
    // 1. Sheet: Kehadiran (Check-in Realtime)
    var sheetHadir = getOrCreateSheet(ss, "Kehadiran");
    if (sheetHadir.getLastRow() === 0) {
      var hadirHeaders = [["Timestamp", "ID Tamu", "Nama Tamu", "Kategori", "Pax", "Meja", "Metode Checkin"]];
      sheetHadir.getRange(1, 1, 1, hadirHeaders[0].length).setValues(hadirHeaders);
      formatSheetHeader(sheetHadir, hadirHeaders[0].length);
    }

    // 2. Sheet: Ucapan_Doa (Teks & Voice Note)
    var sheetUcapan = getOrCreateSheet(ss, "Ucapan_Doa");
    if (sheetUcapan.getLastRow() === 0) {
      var ucapanHeaders = [["Timestamp", "Nama Pengirim", "Hubungan", "Tipe", "Durasi VN (detik)", "Pesan Doa / Transkrip", "Link File Audio di Drive"]];
      sheetUcapan.getRange(1, 1, 1, ucapanHeaders[0].length).setValues(ucapanHeaders);
      formatSheetHeader(sheetUcapan, ucapanHeaders[0].length);
    }

    // 3. Sheet: Galeri_Media (Foto & Video Fotografer & Tamu)
    var sheetMedia = getOrCreateSheet(ss, "Galeri_Media");
    if (sheetMedia.getLastRow() === 0) {
      var mediaHeaders = [["Timestamp", "Nama Pengunggah", "Peran (Role)", "Kategori Momen", "Caption / Cerita", "Tipe Media", "Link File di Google Drive"]];
      sheetMedia.getRange(1, 1, 1, mediaHeaders[0].length).setValues(mediaHeaders);
      formatSheetHeader(sheetMedia, mediaHeaders[0].length);
    }

    // 4. Sheet: Daftar_Undangan (Master Tamu)
    var sheetUndangan = getOrCreateSheet(ss, "Daftar_Undangan");
    if (sheetUndangan.getLastRow() === 0) {
      var undanganHeaders = [["ID Tamu", "Nama Tamu", "Kategori", "Pax", "Meja", "Token QR", "Status Hadir", "Jam Kehadiran"]];
      sheetUndangan.getRange(1, 1, 1, undanganHeaders[0].length).setValues(undanganHeaders);
      formatSheetHeader(sheetUndangan, undanganHeaders[0].length);
    }

    // 5. Sheet: Pengaturan_Acara (Informasi Mempelai & Acara)
    var sheetPengaturan = getOrCreateSheet(ss, "Pengaturan_Acara");
    if (sheetPengaturan.getLastRow() === 0) {
      var settingHeaders = [["Key", "Value"]];
      var defaultSettings = [
        ["groomName", "Cecep"],
        ["brideName", "Memey"],
        ["coupleTitle", "Cecep & Memey"],
        ["initials", "CM"],
        ["weddingDateFormatted", "Minggu, 18 Oktober 2026"],
        ["weddingDateRaw", "2026-10-18"],
        ["venueName", "Grand Ballroom Hotel Mulia"],
        ["venueAddress", "Jl. Asia Afrika Senayan, Gelora, Jakarta Pusat"],
        ["akadTime", "08:00 - 10:00 WIB"],
        ["receptionTime", "11:00 - 14:00 WIB"],
        ["welcomeMessage", "Selamat datang di Buku Tamu Digital & Live Momen Pernikahan kami."]
      ];
      sheetPengaturan.getRange(1, 1, 1, 2).setValues(settingHeaders);
      formatSheetHeader(sheetPengaturan, 2);
      sheetPengaturan.getRange(2, 1, defaultSettings.length, 2).setValues(defaultSettings);
    }

    // Hapus Sheet1 bawaan kosong jika ada
    var defaultSheet = ss.getSheetByName("Sheet1");
    if (defaultSheet && ss.getSheets().length > 1) {
      ss.deleteSheet(defaultSheet);
    }

    ui.alert(
      "Setup Berhasil!",
      "Database Google Sheets dan Folder Google Drive telah dibuat secara otomatis!\n\n" +
      "📁 Folder Utama: " + rootFolderName + "\n" +
      "├── 01_Foto_Fotografer\n" +
      "├── 02_Momen_Tamu\n" +
      "└── 03_Voice_Notes_Audio\n\n" +
      "Sekarang silakan klik tombol Terapkan (Deploy) > Penerapan Baru > Aplikasi Web untuk mendapatkan Webhook URL.",
      ui.ButtonSet.OK
    );

  } catch (err) {
    ui.alert("Gagal Setup: " + err.toString());
  }
}

// 3. Webhook Receiver (doPost) dari Frontend PWA
function doPost(e) {
  try {
    var data = {};
    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (errJson) {
        data = e.parameter || {};
      }
    } else if (e && e.parameter) {
      data = e.parameter;
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 0. ACTION: TEST KONEKSI
    if (data.action === "TEST_CONNECTION") {
      var sheetHadirTest = getOrCreateSheetWithHeaders(ss, "Kehadiran", [["Timestamp", "ID Tamu", "Nama Tamu", "Kategori", "Pax", "Meja", "Metode Checkin"]]);
      sheetHadirTest.appendRow([
        new Date(),
        "TEST",
        "TES KONEKSI BERHASIL: Sistem terhubung ke Google Sheets!",
        "Tes Otomatis",
        1,
        "-",
        "Admin Web Test"
      ]);
      return sendJsonResponse({ status: "success", message: "Koneksi berhasil dan baris tes tercatat di Spreadsheet!" });
    }

    // A. ACTION: CHECK-IN TAMU
    if (data.action === "CHECK_IN") {
      var sheetHadir = getOrCreateSheetWithHeaders(ss, "Kehadiran", [["Timestamp", "ID Tamu", "Nama Tamu", "Kategori", "Pax", "Meja", "Metode Checkin"]]);

      sheetHadir.appendRow([
        new Date(data.timestamp || new Date()),
        data.guestId || "-",
        data.guestName || "Tamu Undangan",
        data.category || "Tamu Undangan",
        data.pax || 1,
        data.table || "-",
        data.checkedInBy || "Scanner Barcode"
      ]);

      // Update status di sheet Daftar_Undangan jika ada
      updateGuestStatusInMaster(ss, data.guestId, data.guestName);

      return sendJsonResponse({ status: "success", type: "checkin" });
    }

    // B. ACTION: UCAPAN DOA & VOICE NOTE
    if (data.action === "NEW_WISH") {
      var sheetUcapan = getOrCreateSheetWithHeaders(ss, "Ucapan_Doa", [["Timestamp", "Nama Pengirim", "Hubungan", "Tipe", "Durasi VN (detik)", "Pesan Doa / Transkrip", "Link File Audio di Drive"]]);

      var driveAudioUrl = "-";

      // Jika ada lampiran rekaman suara (Voice Note Base64) -> simpan ke Drive
      if (data.audioBase64) {
        try {
          var voiceFolder = getVoiceNotesFolder();
          var fileName = "VN_" + sanitizeName(data.senderName) + "_" + Date.now() + ".webm";
          var decodedAudio = Utilities.base64Decode(data.audioBase64);
          var blob = Utilities.newBlob(decodedAudio, "audio/webm", fileName);
          var file = voiceFolder.createFile(blob);
          file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          driveAudioUrl = file.getUrl();
        } catch (errAudio) {
          console.error("Gagal simpan audio ke Drive:", errAudio);
          driveAudioUrl = "(Gagal simpan ke Drive: " + errAudio.toString() + ")";
        }
      }

      sheetUcapan.appendRow([
        new Date(data.timestamp || new Date()),
        data.senderName || "Tamu Undangan",
        data.relationship || "Teman",
        data.type === "voice" ? "Voice Note (Audio)" : "Pesan Teks",
        data.audioDuration || 0,
        data.message || "",
        driveAudioUrl
      ]);

      return sendJsonResponse({ status: "success", type: "wish", driveUrl: driveAudioUrl });
    }

    // C. ACTION: UPLOAD FOTO / VIDEO MEDIA (Fotografer atau Tamu)
    if (data.action === "UPLOAD_MEDIA") {
      var sheetMedia = getOrCreateSheetWithHeaders(ss, "Galeri_Media", [["Timestamp", "Nama Pengunggah", "Peran (Role)", "Kategori Momen", "Caption / Cerita", "Tipe Media", "Link File di Google Drive"]]);

      var driveMediaUrl = "-";
      var fileId = "";

      if (data.fileBase64) {
        try {
          var targetFolder = getTargetMediaFolder(data.uploaderRole);
          var mime = data.mimeType || "image/jpeg";
          var ext = mime.indexOf("video") >= 0 ? ".mp4" : ".jpg";
          var mediaFileName = (data.uploaderRole === "photographer" ? "OFFICIAL_" : "GUEST_") +
            sanitizeName(data.uploaderName) + "_" + Date.now() + ext;

          var decodedMedia = Utilities.base64Decode(data.fileBase64);
          var mediaBlob = Utilities.newBlob(decodedMedia, mime, mediaFileName);
          var mediaFile = targetFolder.createFile(mediaBlob);
          mediaFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          fileId = mediaFile.getId();
          // Gunakan CDN langsung lh3.googleusercontent.com agar gambar dapat langsung tampil di <img> tag semua perangkat tanpa login
          driveMediaUrl = "https://lh3.googleusercontent.com/d/" + fileId;
        } catch (errDrive) {
          console.error("Gagal simpan media ke Drive:", errDrive);
          driveMediaUrl = "(Gagal simpan ke Drive: " + errDrive.toString() + ")";
        }
      }

      sheetMedia.appendRow([
        new Date(data.timestamp || new Date()),
        data.uploaderName || "Tamu Undangan",
        data.uploaderRole || "guest",
        data.category || "Momen Bahagia",
        data.caption || "",
        data.type || "photo",
        driveMediaUrl
      ]);

      return sendJsonResponse({ 
        status: "success", 
        type: "media", 
        driveUrl: driveMediaUrl,
        fileId: fileId 
      });
    }

    // D. ACTION: TAMBAH TAMU / DAFTAR TAMU BARU (ADD_GUEST)
    if (data.action === "ADD_GUEST") {
      var sheetUndangan = getOrCreateSheetWithHeaders(ss, "Daftar_Undangan", [
        ["ID Tamu", "Nama Tamu", "Kategori", "Pax", "Meja", "Token QR", "Status Hadir", "Jam Kehadiran"]
      ]);

      sheetUndangan.appendRow([
        data.id || ("GUEST-" + Date.now()),
        data.name || "Tamu Undangan",
        data.category || "Tamu Undangan",
        Number(data.pax || 1),
        data.table || "Meja Reguler",
        data.qrToken || "-",
        data.checkedIn ? "Hadir" : "Belum Hadir",
        data.checkedInAt || "-"
      ]);

      return sendJsonResponse({ status: "success", type: "guest_added", id: data.id });
    }

    // E. ACTION: SYNC MASSAL DAFTAR TAMU (SYNC_ALL_GUESTS)
    if (data.action === "SYNC_ALL_GUESTS") {
      var sheetUndangan = getOrCreateSheetWithHeaders(ss, "Daftar_Undangan", [
        ["ID Tamu", "Nama Tamu", "Kategori", "Pax", "Meja", "Token QR", "Status Hadir", "Jam Kehadiran"]
      ]);

      var guestsArray = data.guests || [];
      var addedCount = 0;

      if (Array.isArray(guestsArray) && guestsArray.length > 0) {
        var existingData = sheetUndangan.getDataRange().getValues();
        var existingIds = {};
        for (var i = 1; i < existingData.length; i++) {
          if (existingData[i][0]) existingIds[String(existingData[i][0])] = true;
          if (existingData[i][1]) existingIds[String(existingData[i][1]).toLowerCase().trim()] = true;
        }

        var rowsToAdd = [];
        for (var g = 0; g < guestsArray.length; g++) {
          var item = guestsArray[g];
          var itemId = String(item.id || "");
          var itemName = String(item.name || "").toLowerCase().trim();
          if (!existingIds[itemId] && !existingIds[itemName]) {
            rowsToAdd.push([
              item.id || ("GUEST-" + Date.now() + "_" + g),
              item.name || "Tamu Undangan",
              item.category || "Tamu Undangan",
              Number(item.pax || 1),
              item.table || "Meja Reguler",
              item.qrToken || "-",
              item.checkedIn ? "Hadir" : "Belum Hadir",
              item.checkedInAt || "-"
            ]);
            existingIds[itemId] = true;
            existingIds[itemName] = true;
          }
        }

        if (rowsToAdd.length > 0) {
          var startRow = sheetUndangan.getLastRow() + 1;
          sheetUndangan.getRange(startRow, 1, rowsToAdd.length, rowsToAdd[0].length).setValues(rowsToAdd);
          addedCount = rowsToAdd.length;
        }
      }

      return sendJsonResponse({ status: "success", type: "guests_synced", added: addedCount });
    }

    // F. ACTION: HAPUS SATU TAMU (DELETE_GUEST)
    if (data.action === "DELETE_GUEST") {
      var sheetUndangan = ss.getSheetByName("Daftar_Undangan");
      var deleted = false;
      if (sheetUndangan && sheetUndangan.getLastRow() > 1) {
        var dataRange = sheetUndangan.getRange(2, 1, sheetUndangan.getLastRow() - 1, 8).getValues();
        for (var d = dataRange.length - 1; d >= 0; d--) {
          var rowId = String(dataRange[d][0]);
          var rowName = String(dataRange[d][1]).trim().toLowerCase();
          if ((data.id && rowId === String(data.id)) || (data.name && rowName === String(data.name).trim().toLowerCase())) {
            sheetUndangan.deleteRow(d + 2);
            deleted = true;
          }
        }
      }
      return sendJsonResponse({ status: "success", type: "guest_deleted", id: data.id, deleted: deleted });
    }

    // G. ACTION: KOSONGKAN SELURUH DAFTAR TAMU (CLEAR_ALL_GUESTS)
    if (data.action === "CLEAR_ALL_GUESTS") {
      var sheetUndangan = ss.getSheetByName("Daftar_Undangan");
      if (sheetUndangan && sheetUndangan.getLastRow() > 1) {
        sheetUndangan.deleteRows(2, sheetUndangan.getLastRow() - 1);
      }
      return sendJsonResponse({ status: "success", type: "guests_cleared" });
    }

    // H. ACTION: SIMPAN PENGATURAN ACARA (Informasi Mempelai, Tanggal, Tempat, dll.)
    if (data.action === "SAVE_EVENT_SETTINGS" && data.settings) {
      var sheetPengaturan = getOrCreateSheet(ss, "Pengaturan_Acara");
      sheetPengaturan.clear();
      var s = data.settings;
      var settingHeaders = [["Key", "Value"]];
      var settingRows = [
        ["groomName", s.groomName || ""],
        ["brideName", s.brideName || ""],
        ["coupleTitle", s.coupleTitle || (s.groomName + " & " + s.brideName)],
        ["initials", s.initials || "W"],
        ["weddingDateFormatted", s.weddingDateFormatted || ""],
        ["weddingDateRaw", s.weddingDateRaw || ""],
        ["venueName", s.venueName || ""],
        ["venueAddress", s.venueAddress || ""],
        ["akadTime", s.akadTime || ""],
        ["receptionTime", s.receptionTime || ""],
        ["welcomeMessage", s.welcomeMessage || ""]
      ];
      sheetPengaturan.getRange(1, 1, 1, 2).setValues(settingHeaders);
      formatSheetHeader(sheetPengaturan, 2);
      sheetPengaturan.getRange(2, 1, settingRows.length, 2).setValues(settingRows);

      return sendJsonResponse({ status: "success", type: "event_settings_saved" });
    }

    return sendJsonResponse({ status: "unknown_action" });

  } catch (error) {
    return sendJsonResponse({ status: "error", message: error.toString() });
  }
}

// 4. Webhook Reader (doGet) untuk Sinkronisasi 2-Arah ke Laptop, Proyektor, & HP Tamu
function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "GET_ALL";
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === "PING") {
      return sendJsonResponse({ status: "success", message: "Webhook HeMa Wedding Live Aktif!" });
    }

    // A. Ambil Galeri Foto & Video
    var sheetMedia = ss.getSheetByName("Galeri_Media");
    var moments = [];
    if (sheetMedia && sheetMedia.getLastRow() > 1) {
      var mediaRows = sheetMedia.getRange(2, 1, sheetMedia.getLastRow() - 1, 7).getValues();
      for (var i = 0; i < mediaRows.length; i++) {
        var row = mediaRows[i];
        if (row[0] && row[6]) {
          var rawUrl = String(row[6]);
          var imgUrl = rawUrl;
          var fileIdMatch = rawUrl.match(/[-\w]{25,}/);
          if (fileIdMatch && !rawUrl.includes("lh3.googleusercontent.com")) {
            imgUrl = "https://lh3.googleusercontent.com/d/" + fileIdMatch[0];
          }

          moments.push({
            id: "m_cloud_" + i + "_" + new Date(row[0]).getTime(),
            timestamp: new Date(row[0]).toISOString(),
            uploaderName: row[1] || "Tamu Undangan",
            uploaderRole: row[2] || "guest",
            category: row[3] || "Momen Bahagia",
            caption: row[4] || "",
            type: row[5] || "photo",
            previewUrl: imgUrl,
            likes: 1,
            synced: true
          });
        }
      }
    }

    // B. Ambil Ucapan Doa & Voice Notes
    var sheetUcapan = ss.getSheetByName("Ucapan_Doa");
    var wishes = [];
    if (sheetUcapan && sheetUcapan.getLastRow() > 1) {
      var ucapanRows = sheetUcapan.getRange(2, 1, sheetUcapan.getLastRow() - 1, 7).getValues();
      for (var j = 0; j < ucapanRows.length; j++) {
        var uRow = ucapanRows[j];
        if (uRow[0]) {
          wishes.push({
            id: "w_cloud_" + j + "_" + new Date(uRow[0]).getTime(),
            timestamp: new Date(uRow[0]).toISOString(),
            senderName: uRow[1] || "Tamu Undangan",
            relationship: uRow[2] || "Teman",
            type: (uRow[3] && String(uRow[3]).indexOf("Voice") >= 0) ? "voice" : "text",
            audioDuration: Number(uRow[4] || 0),
            message: uRow[5] || "",
            audioUrl: uRow[6] || "",
            synced: true
          });
        }
      }
    }

    // C. Ambil Data Kehadiran Check-In
    var sheetHadir = ss.getSheetByName("Kehadiran");
    var checkins = [];
    if (sheetHadir && sheetHadir.getLastRow() > 1) {
      var hadirRows = sheetHadir.getRange(2, 1, sheetHadir.getLastRow() - 1, 7).getValues();
      for (var k = 0; k < hadirRows.length; k++) {
        var hRow = hadirRows[k];
        if (hRow[0]) {
          checkins.push({
            id: "c_cloud_" + k + "_" + new Date(hRow[0]).getTime(),
            timestamp: new Date(hRow[0]).toISOString(),
            guestId: hRow[1] || "-",
            guestName: hRow[2] || "Tamu Undangan",
            category: hRow[3] || "Tamu Undangan",
            pax: Number(hRow[4] || 1),
            table: hRow[5] || "-",
            checkedInBy: hRow[6] || "Scanner Barcode",
            synced: true
          });
        }
      }
    }

    // D. Ambil Master Tamu Undangan dari sheet Daftar_Undangan
    var sheetUndangan = ss.getSheetByName("Daftar_Undangan");
    var guests = [];
    if (sheetUndangan && sheetUndangan.getLastRow() > 1) {
      var undanganRows = sheetUndangan.getRange(2, 1, sheetUndangan.getLastRow() - 1, 8).getValues();
      for (var u = 0; u < undanganRows.length; u++) {
        var gRow = undanganRows[u];
        if (gRow[1]) {
          guests.push({
            id: String(gRow[0] || ("GUEST-" + u)),
            name: String(gRow[1]),
            category: String(gRow[2] || "Tamu Undangan"),
            pax: Number(gRow[3] || 1),
            table: String(gRow[4] || "Meja Reguler"),
            qrToken: String(gRow[5] || "-"),
            checkedIn: String(gRow[6]) === "Hadir",
            checkedInAt: gRow[7] ? String(gRow[7]) : null,
          });
        }
      }
    }

    // E. Ambil Pengaturan Acara dari sheet Pengaturan_Acara
    var sheetPengaturan = ss.getSheetByName("Pengaturan_Acara");
    var eventSettings = null;
    if (sheetPengaturan && sheetPengaturan.getLastRow() > 1) {
      var setRows = sheetPengaturan.getRange(2, 1, sheetPengaturan.getLastRow() - 1, 2).getDisplayValues();
      eventSettings = {};
      for (var sIdx = 0; sIdx < setRows.length; sIdx++) {
        var k = String(setRows[sIdx][0]);
        var v = setRows[sIdx][1];
        if (k) eventSettings[k] = v;
      }
    }

    return sendJsonResponse({
      status: "success",
      settings: eventSettings,
      moments: moments,
      wishes: wishes,
      checkins: checkins,
      guests: guests
    });

  } catch (err) {
    return sendJsonResponse({ status: "error", message: err.toString() });
  }
}

// --- HELPER FUNCTIONS ---

function formatSheetHeader(sheet, numCols) {
  var headerRange = sheet.getRange(1, 1, 1, numCols);
  headerRange
    .setBackground("#0A192F") // Deep Midnight Navy
    .setFontColor("#D4AF37")   // Champagne Gold
    .setFontWeight("bold")
    .setFontSize(10)
    .setHorizontalAlignment("center");
  sheet.setFrozenRows(1);
  sheet.setRowHeight(1, 32);
  for (var i = 1; i <= numCols; i++) {
    sheet.autoResizeColumn(i);
  }
}

function getOrCreateSheetWithHeaders(ss, sheetName, headers) {
  var s = ss.getSheetByName(sheetName);
  if (!s) {
    s = ss.insertSheet(sheetName);
    if (headers && headers.length > 0) {
      s.getRange(1, 1, headers.length, headers[0].length).setValues(headers);
      formatSheetHeader(s, headers[0].length);
    }
  } else if (s.getLastRow() === 0 && headers && headers.length > 0) {
    s.getRange(1, 1, headers.length, headers[0].length).setValues(headers);
    formatSheetHeader(s, headers[0].length);
  }
  return s;
}

function getTargetMediaFolder(role) {
  var props = PropertiesService.getScriptProperties();
  var folderKey = (role === "photographer") ? "FOTO_FOLDER_ID" : "TAMU_FOLDER_ID";
  var folderId = props.getProperty(folderKey);
  if (folderId) {
    try {
      return DriveApp.getFolderById(folderId);
    } catch(e) {}
  }

  // Otomatis buat folder jika belum pernah disetup
  var subName = (role === "photographer") ? "01_Foto_Fotografer" : "02_Momen_Tamu";
  var rootName = "HeMa Wedding Live - Master Media";
  var rootIter = DriveApp.getFoldersByName(rootName);
  var rootFolder = rootIter.hasNext() ? rootIter.next() : DriveApp.createFolder(rootName);
  rootFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  var subIter = rootFolder.getFoldersByName(subName);
  var sub = subIter.hasNext() ? subIter.next() : rootFolder.createFolder(subName);
  sub.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  try { props.setProperty(folderKey, sub.getId()); } catch(e) {}
  return sub;
}

function getVoiceNotesFolder() {
  var props = PropertiesService.getScriptProperties();
  var folderId = props.getProperty("VOICE_FOLDER_ID");
  if (folderId) {
    try {
      return DriveApp.getFolderById(folderId);
    } catch(e) {}
  }

  var rootName = "HeMa Wedding Live - Master Media";
  var rootIter = DriveApp.getFoldersByName(rootName);
  var rootFolder = rootIter.hasNext() ? rootIter.next() : DriveApp.createFolder(rootName);
  rootFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  var subIter = rootFolder.getFoldersByName("03_Voice_Notes_Audio");
  var sub = subIter.hasNext() ? subIter.next() : rootFolder.createFolder("03_Voice_Notes_Audio");
  sub.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  try { props.setProperty("VOICE_FOLDER_ID", sub.getId()); } catch(e) {}
  return sub;
}

function getOrCreateSheet(ss, sheetName) {
  var s = ss.getSheetByName(sheetName);
  if (!s) s = ss.insertSheet(sheetName);
  return s;
}

function getOrCreateSubfolder(parentFolder, subfolderName) {
  var iter = parentFolder.getFoldersByName(subfolderName);
  if (iter.hasNext()) return iter.next();
  var sub = parentFolder.createFolder(subfolderName);
  sub.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return sub;
}

function sanitizeName(name) {
  if (!name) return "Anonim";
  return name.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 20);
}

function updateGuestStatusInMaster(ss, guestId, guestName) {
  var sheetUndangan = ss.getSheetByName("Daftar_Undangan");
  if (!sheetUndangan) return;
  var data = sheetUndangan.getDataRange().getValues();
  for (var r = 1; r < data.length; r++) {
    if ((guestId && data[r][0] == guestId) || (guestName && data[r][1] == guestName)) {
      sheetUndangan.getRange(r + 1, 7).setValue("Hadir");
      sheetUndangan.getRange(r + 1, 8).setValue(new Date().toLocaleTimeString("id-ID"));
      break;
    }
  }
}

function openDriveFolder() {
  var props = PropertiesService.getScriptProperties();
  var rootId = props.getProperty("ROOT_FOLDER_ID");
  if (rootId) {
    var folder = DriveApp.getFolderById(rootId);
    SpreadsheetApp.getUi().alert("Link Google Drive:", folder.getUrl(), SpreadsheetApp.getUi().ButtonSet.OK);
  } else {
    SpreadsheetApp.getUi().alert("Jalankan setup database otomatis terlebih dahulu!");
  }
}

function showWebhookInfo() {
  SpreadsheetApp.getUi().alert(
    "Cara Mendapatkan Webhook URL:",
    "1. Klik tombol 'Terapkan' (Deploy) di kanan atas editor Apps Script.\n" +
    "2. Pilih 'Penerapan Baru' (New Deployment).\n" +
    "3. Pilih jenis: 'Aplikasi Web' (Web App).\n" +
    "4. 'Jalankan sebagai': Saya.\n" +
    "5. 'Yang memiliki akses': Siapa saja (Anyone).\n" +
    "6. Klik Terapkan dan salin URL-nya ke Panel Admin aplikasi Anda.",
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function sendJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
