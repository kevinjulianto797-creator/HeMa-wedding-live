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
    sheetHadir.clear();
    var hadirHeaders = [["Timestamp", "ID Tamu", "Nama Tamu", "Kategori", "Pax", "Meja", "Metode Checkin"]];
    sheetHadir.getRange(1, 1, 1, hadirHeaders[0].length).setValues(hadirHeaders);
    formatSheetHeader(sheetHadir, hadirHeaders[0].length);

    // 2. Sheet: Ucapan_Doa (Teks & Voice Note)
    var sheetUcapan = getOrCreateSheet(ss, "Ucapan_Doa");
    sheetUcapan.clear();
    var ucapanHeaders = [["Timestamp", "Nama Pengirim", "Hubungan", "Tipe", "Durasi VN (detik)", "Pesan Doa / Transkrip", "Link File Audio di Drive"]];
    sheetUcapan.getRange(1, 1, 1, ucapanHeaders[0].length).setValues(ucapanHeaders);
    formatSheetHeader(sheetUcapan, ucapanHeaders[0].length);

    // 3. Sheet: Galeri_Media (Foto & Video Fotografer & Tamu)
    var sheetMedia = getOrCreateSheet(ss, "Galeri_Media");
    sheetMedia.clear();
    var mediaHeaders = [["Timestamp", "Nama Pengunggah", "Peran (Role)", "Kategori Momen", "Caption / Cerita", "Tipe Media", "Link File di Google Drive"]];
    sheetMedia.getRange(1, 1, 1, mediaHeaders[0].length).setValues(mediaHeaders);
    formatSheetHeader(sheetMedia, mediaHeaders[0].length);

    // 4. Sheet: Daftar_Undangan (Master Tamu)
    var sheetUndangan = getOrCreateSheet(ss, "Daftar_Undangan");
    if (sheetUndangan.getLastRow() === 0) {
      var undanganHeaders = [["ID Tamu", "Nama Tamu", "Kategori", "Pax", "Meja", "Token QR", "Status Hadir", "Jam Kehadiran"]];
      sheetUndangan.getRange(1, 1, 1, undanganHeaders[0].length).setValues(undanganHeaders);
      formatSheetHeader(sheetUndangan, undanganHeaders[0].length);
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
    var rawData = e.postData.contents;
    var data = JSON.parse(rawData);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var props = PropertiesService.getScriptProperties();

    // A. ACTION: CHECK-IN TAMU
    if (data.action === "CHECK_IN") {
      var sheetHadir = ss.getSheetByName("Kehadiran");
      if (!sheetHadir) sheetHadir = getOrCreateSheet(ss, "Kehadiran");

      sheetHadir.appendRow([
        new Date(data.timestamp || new Date()),
        data.guestId || "-",
        data.guestName,
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
      var sheetUcapan = ss.getSheetByName("Ucapan_Doa");
      if (!sheetUcapan) sheetUcapan = getOrCreateSheet(ss, "Ucapan_Doa");

      var driveAudioUrl = "-";

      // Jika ada lampiran rekaman suara (Voice Note Base64) -> simpan ke Drive
      if (data.audioBase64) {
        var voiceFolderId = props.getProperty("VOICE_FOLDER_ID");
        var voiceFolder = voiceFolderId ? DriveApp.getFolderById(voiceFolderId) : DriveApp.getRootFolder();
        var fileName = "VN_" + sanitizeName(data.senderName) + "_" + Date.now() + ".webm";
        var decodedAudio = Utilities.base64Decode(data.audioBase64);
        var blob = Utilities.newBlob(decodedAudio, "audio/webm", fileName);
        var file = voiceFolder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        driveAudioUrl = file.getUrl();
      }

      sheetUcapan.appendRow([
        new Date(data.timestamp || new Date()),
        data.senderName,
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
      var sheetMedia = ss.getSheetByName("Galeri_Media");
      if (!sheetMedia) sheetMedia = getOrCreateSheet(ss, "Galeri_Media");

      var driveMediaUrl = "-";

      if (data.fileBase64) {
        var targetFolderId = data.uploaderRole === "photographer"
          ? props.getProperty("FOTO_FOLDER_ID")
          : props.getProperty("TAMU_FOLDER_ID");

        var targetFolder = targetFolderId ? DriveApp.getFolderById(targetFolderId) : DriveApp.getRootFolder();
        var mime = data.mimeType || "image/jpeg";
        var ext = mime.indexOf("video") >= 0 ? ".mp4" : ".jpg";
        var mediaFileName = (data.uploaderRole === "photographer" ? "OFFICIAL_" : "GUEST_") +
          sanitizeName(data.uploaderName) + "_" + Date.now() + ext;

        var decodedMedia = Utilities.base64Decode(data.fileBase64);
        var mediaBlob = Utilities.newBlob(decodedMedia, mime, mediaFileName);
        var mediaFile = targetFolder.createFile(mediaBlob);
        var fileId = mediaFile.getId();
        // Gunakan CDN langsung lh3.googleusercontent.com agar gambar dapat langsung tampil di <img> tag semua perangkat tanpa login
        driveMediaUrl = "https://lh3.googleusercontent.com/d/" + fileId;
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

    return sendJsonResponse({
      status: "success",
      moments: moments,
      wishes: wishes,
      checkins: checkins
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
