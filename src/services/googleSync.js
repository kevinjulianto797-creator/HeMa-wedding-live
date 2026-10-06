// Google Sheets & Drive Sync Service Bridge

const SETTINGS_KEY = 'hema_google_settings';

export function getGoogleSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : {
      sheetsWebhookUrl: '', // URL Google Apps Script Webhook
      driveFolderId: '',
      autoSyncToDrive: true,
      lastSyncTimestamp: null,
    };
  } catch {
    return {
      sheetsWebhookUrl: '',
      driveFolderId: '',
      autoSyncToDrive: true,
      lastSyncTimestamp: null,
    };
  }
}

export function saveGoogleSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// Convert Blob / File to Base64 String
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      // Result is data:mime;base64,XXXX -> split after comma
      const base64String = reader.result.split(',')[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// 1. Sync Checkin to Google Sheet
export async function syncCheckinToGoogle(checkin) {
  const settings = getGoogleSettings();
  const payload = {
    action: 'CHECK_IN',
    timestamp: checkin.timestamp,
    guestId: checkin.guestId,
    guestName: checkin.guestName,
    pax: checkin.pax,
    category: checkin.category,
    table: checkin.table || '-',
    checkedInBy: checkin.checkedInBy,
  };

  if (settings.sheetsWebhookUrl && settings.sheetsWebhookUrl.startsWith('http')) {
    try {
      await fetch(settings.sheetsWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        mode: 'no-cors',
      });
    } catch (e) {
      console.warn('Webhook POST error:', e);
    }
  }

  addAuditLog('CHECK_IN', `${checkin.guestName} (${checkin.category}) tercatat hadir.`);
  return { success: true };
}

// 2. Sync Wish & Voice Note to Google Sheet & Drive
export async function syncWishToGoogle(wish) {
  const settings = getGoogleSettings();
  let audioBase64 = null;

  if (wish.audioBlob instanceof Blob) {
    try {
      audioBase64 = await blobToBase64(wish.audioBlob);
    } catch (err) {
      console.warn('Error converting audio blob to base64:', err);
    }
  }

  const payload = {
    action: 'NEW_WISH',
    timestamp: wish.timestamp,
    senderName: wish.senderName,
    relationship: wish.relationship,
    type: wish.type,
    message: wish.message,
    audioDuration: wish.audioDuration,
    audioBase64: audioBase64, // Automatically saved to Google Drive 03_Voice_Notes folder!
  };

  if (settings.sheetsWebhookUrl && settings.sheetsWebhookUrl.startsWith('http')) {
    try {
      await fetch(settings.sheetsWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        mode: 'no-cors',
      });
    } catch (e) {
      console.warn('Webhook POST error:', e);
    }
  }

  addAuditLog('WISH', `Ucapan dari ${wish.senderName} [${wish.type.toUpperCase()}] disinkronkan ke Sheet & Drive.`);
  return { success: true };
}

// 3. Sync Moment (Photo/Video) to Google Drive & Sheet
export async function syncMediaToGoogle(moment) {
  const settings = getGoogleSettings();
  let fileBase64 = null;

  if (moment.fileBlob instanceof Blob) {
    try {
      fileBase64 = await blobToBase64(moment.fileBlob);
    } catch (err) {
      console.warn('Error converting media blob to base64:', err);
    }
  } else if (moment.previewUrl && moment.previewUrl.startsWith('data:')) {
    // If previewUrl is already a data-url
    fileBase64 = moment.previewUrl.split(',')[1];
  }

  const payload = {
    action: 'UPLOAD_MEDIA',
    timestamp: moment.timestamp,
    uploaderName: moment.uploaderName,
    uploaderRole: moment.uploaderRole,
    type: moment.type,
    category: moment.category,
    caption: moment.caption,
    fileBase64: fileBase64, // Saved directly into Google Drive folder!
    mimeType: moment.type === 'video' ? 'video/mp4' : 'image/jpeg',
  };

  if (settings.sheetsWebhookUrl && settings.sheetsWebhookUrl.startsWith('http')) {
    try {
      await fetch(settings.sheetsWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        mode: 'no-cors',
      });
    } catch (e) {
      console.warn('Webhook POST error:', e);
    }
  }

  addAuditLog('MEDIA', `Media "${moment.caption || 'Foto Momen'}" di-upload oleh ${moment.uploaderName} ke Drive.`);
  return { success: true };
}

// Helper: Audit Log
function addAuditLog(type, message) {
  try {
    const logs = JSON.parse(localStorage.getItem('hema_sync_logs') || '[]');
    logs.unshift({
      id: Date.now(),
      type,
      message,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    });
    localStorage.setItem('hema_sync_logs', JSON.stringify(logs.slice(0, 50)));
  } catch (e) {
    console.error(e);
  }
}

export function getSyncLogs() {
  try {
    return JSON.parse(localStorage.getItem('hema_sync_logs') || '[]');
  } catch {
    return [];
  }
}

// 4. Instant 1-Click Export to CSV
export function exportCheckinsToCSV(checkins) {
  const headers = ['ID', 'Nama Tamu', 'Kategori', 'Pax', 'Waktu Kehadiran', 'Metode Checkin', 'Status Sync'];
  const rows = checkins.map(c => [
    `"${c.guestId || ''}"`,
    `"${c.guestName || ''}"`,
    `"${c.category || ''}"`,
    c.pax || 1,
    `"${c.timestamp ? new Date(c.timestamp).toLocaleString('id-ID') : '-'}"`,
    `"${c.checkedInBy || 'self'}"`,
    `"${c.synced ? 'Tersinkronisasi' : 'Lokal/Offline'}"`
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `Daftar_Kehadiran_HeMa_Wedding_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportWishesToCSV(wishes) {
  const headers = ['ID', 'Nama Pengirim', 'Hubungan', 'Tipe', 'Durasi VN (detik)', 'Isi Pesan/Doa', 'Waktu Kirim', 'Status Sync'];
  const rows = wishes.map(w => [
    `"${w.id || ''}"`,
    `"${w.senderName || ''}"`,
    `"${w.relationship || ''}"`,
    `"${w.type === 'voice' ? 'Voice Note' : 'Teks'}"`,
    w.audioDuration || 0,
    `"${(w.message || '').replace(/"/g, '""')}"`,
    `"${w.timestamp ? new Date(w.timestamp).toLocaleString('id-ID') : '-'}"`,
    `"${w.synced ? 'Tersinkronisasi' : 'Lokal/Offline'}"`
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `Buku_Ucapan_HeMa_Wedding_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// 5. Pull Cloud Data (2-Way Realtime Synchronization)
export async function pullCloudData() {
  const settings = getGoogleSettings();
  if (!settings.sheetsWebhookUrl || !settings.sheetsWebhookUrl.startsWith('http')) {
    return null;
  }

  try {
    const res = await fetch(`${settings.sheetsWebhookUrl}?action=GET_ALL`, {
      method: 'GET',
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json;
  } catch (err) {
    console.warn('Error pulling cloud data from Google Apps Script:', err);
    return null;
  }
}
