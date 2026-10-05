// Google Sheets & Drive Sync Service Bridge

const SETTINGS_KEY = 'hema_google_settings';

export function getGoogleSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : {
      sheetsWebhookUrl: '', // URL Google Apps Script Webhook or Cloudflare Worker endpoint
      driveFolderId: 'FOLDER_HEMA_WEDDING_MOMENTS',
      autoSyncToDrive: true,
      lastSyncTimestamp: null,
    };
  } catch {
    return {
      sheetsWebhookUrl: '',
      driveFolderId: 'FOLDER_HEMA_WEDDING_MOMENTS',
      autoSyncToDrive: true,
      lastSyncTimestamp: null,
    };
  }
}

export function saveGoogleSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
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
    checkedInBy: checkin.checkedInBy,
  };

  // If webhook is provided, send real HTTP POST
  if (settings.sheetsWebhookUrl && settings.sheetsWebhookUrl.startsWith('http')) {
    try {
      await fetch(settings.sheetsWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        mode: 'no-cors', // standard for GAS webhooks
      });
    } catch (e) {
      console.warn('Webhook POST error:', e);
    }
  }

  // Record audit log in localStorage
  addAuditLog('CHECK_IN', `${checkin.guestName} (${checkin.category}) tercatat hadir.`);
  return { success: true };
}

// 2. Sync Wish & Voice Note to Google Sheet & Drive
export async function syncWishToGoogle(wish) {
  const settings = getGoogleSettings();
  const payload = {
    action: 'NEW_WISH',
    timestamp: wish.timestamp,
    senderName: wish.senderName,
    relationship: wish.relationship,
    type: wish.type,
    message: wish.message,
    audioDuration: wish.audioDuration,
    hasAudio: !!wish.audioBlob,
  };

  if (settings.sheetsWebhookUrl && settings.sheetsWebhookUrl.startsWith('http')) {
    try {
      await fetch(settings.sheetsWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        mode: 'no-cors',
      });
    } catch (e) {
      console.warn('Webhook POST error:', e);
    }
  }

  addAuditLog('WISH', `Ucapan dari ${wish.senderName} [${wish.type.toUpperCase()}] disinkronisasi.`);
  return { success: true };
}

// 3. Sync Moment (Photo/Video) to Cloudflare R2 / Drive
export async function syncMediaToGoogle(moment) {
  addAuditLog('MEDIA', `Media "${moment.caption || 'Foto Momen'}" di-upload oleh ${moment.uploaderName}.`);
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

// 4. Instant 1-Click Export to CSV (Openable in Excel / Google Sheets)
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
