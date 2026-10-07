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
  if (!settings.sheetsWebhookUrl || !settings.sheetsWebhookUrl.startsWith('http')) {
    throw new Error('URL Webhook Google Apps Script belum dikonfigurasi.');
  }

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

  await fetch(settings.sheetsWebhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
    mode: 'no-cors',
  });

  addAuditLog('CHECK_IN', `${checkin.guestName} (${checkin.category}) tercatat hadir.`);
  return { success: true };
}

// 2. Sync Wish & Voice Note to Google Sheet & Drive
export async function syncWishToGoogle(wish) {
  const settings = getGoogleSettings();
  if (!settings.sheetsWebhookUrl || !settings.sheetsWebhookUrl.startsWith('http')) {
    throw new Error('URL Webhook Google Apps Script belum dikonfigurasi.');
  }

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
    audioBase64: audioBase64, // Saved directly to Google Drive 03_Voice_Notes folder!
  };

  await fetch(settings.sheetsWebhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
    mode: 'no-cors',
  });

  addAuditLog('WISH', `Ucapan dari ${wish.senderName} [${wish.type.toUpperCase()}] disinkronkan ke Sheet & Drive.`);
  return { success: true };
}

// 3. Sync Moment (Photo/Video) to Google Drive & Sheet
export async function syncMediaToGoogle(moment) {
  const settings = getGoogleSettings();
  if (!settings.sheetsWebhookUrl || !settings.sheetsWebhookUrl.startsWith('http')) {
    throw new Error('URL Webhook Google Apps Script belum dikonfigurasi.');
  }

  let fileBase64 = null;
  if (moment.fileBlob instanceof Blob) {
    try {
      fileBase64 = await blobToBase64(moment.fileBlob);
    } catch (err) {
      console.warn('Error converting media blob to base64:', err);
    }
  } else if (moment.previewUrl && moment.previewUrl.startsWith('data:')) {
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

  await fetch(settings.sheetsWebhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
    mode: 'no-cors',
  });

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

// 6. Test Koneksi Webhook Google Spreadsheet
export async function testGoogleConnection(url) {
  const settings = getGoogleSettings();
  const targetUrl = url || settings.sheetsWebhookUrl;
  if (!targetUrl || !targetUrl.startsWith('http')) {
    throw new Error('URL Webhook Google Apps Script belum diisi.');
  }

  const payload = {
    action: 'TEST_CONNECTION',
    timestamp: new Date().toISOString(),
  };

  await fetch(targetUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
    mode: 'no-cors',
  });

  addAuditLog('TEST', 'Tes pengiriman baris ke Google Sheets berhasil dikirim!');
  return { success: true };
}

// 7. Sync Guest to Google Sheet (Daftar_Undangan)
export async function syncGuestToGoogle(guest) {
  const settings = getGoogleSettings();
  if (!settings.sheetsWebhookUrl || !settings.sheetsWebhookUrl.startsWith('http')) {
    console.warn('Google Webhook URL belum diisi untuk sinkronisasi tamu.');
    return { success: false };
  }

  const payload = {
    action: 'ADD_GUEST',
    id: guest.id,
    name: guest.name,
    category: guest.category || 'Tamu Undangan',
    pax: guest.pax || 1,
    table: guest.table || 'Meja Reguler',
    qrToken: guest.qrToken || '-',
    checkedIn: guest.checkedIn || false,
    checkedInAt: guest.checkedInAt || null,
  };

  try {
    await fetch(settings.sheetsWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      mode: 'no-cors',
    });
    addAuditLog('GUEST', `Tamu "${guest.name}" (${guest.category}) didaftarkan ke Google Sheet.`);
    return { success: true };
  } catch (err) {
    console.warn('Gagal sync guest to Google:', err);
    return { success: false, error: err };
  }
}

// 8. Sync Batch Guests to Google Sheet (Daftar_Undangan)
export async function syncAllGuestsToGoogle(guests) {
  const settings = getGoogleSettings();
  if (!settings.sheetsWebhookUrl || !settings.sheetsWebhookUrl.startsWith('http')) {
    throw new Error('URL Webhook Google Apps Script belum dikonfigurasi.');
  }

  const payload = {
    action: 'SYNC_ALL_GUESTS',
    guests: (guests || []).map((g) => ({
      id: g.id,
      name: g.name,
      category: g.category || 'Tamu Undangan',
      pax: g.pax || 1,
      table: g.table || 'Meja Reguler',
      qrToken: g.qrToken || '-',
      checkedIn: g.checkedIn || false,
      checkedInAt: g.checkedInAt || null,
    })),
  };

  await fetch(settings.sheetsWebhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
    mode: 'no-cors',
  });

  addAuditLog('GUEST', `${guests.length} tamu disinkronkan ke Google Sheet Daftar_Undangan.`);
  return { success: true };
}

// 9. Sync Event Settings (Pengantin, Tanggal, Venue, dll.) to Google Sheet
export async function syncEventSettingsToGoogle(eventSettings) {
  const settings = getGoogleSettings();
  if (!settings.sheetsWebhookUrl || !settings.sheetsWebhookUrl.startsWith('http')) {
    return { success: false, message: 'URL Webhook belum diisi' };
  }

  const payload = {
    action: 'SAVE_EVENT_SETTINGS',
    settings: {
      groomName: eventSettings.groomName || 'Pengantin Pria',
      brideName: eventSettings.brideName || 'Pengantin Wanita',
      coupleTitle: eventSettings.coupleTitle || `${eventSettings.groomName || ''} & ${eventSettings.brideName || ''}`,
      initials: eventSettings.initials || 'W',
      weddingDateFormatted: eventSettings.weddingDateFormatted || '',
      weddingDateRaw: eventSettings.weddingDateRaw || '',
      venueName: eventSettings.venueName || '',
      venueAddress: eventSettings.venueAddress || '',
      akadTime: eventSettings.akadTime || '',
      receptionTime: eventSettings.receptionTime || '',
      welcomeMessage: eventSettings.welcomeMessage || '',
    },
  };

  try {
    await fetch(settings.sheetsWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      mode: 'no-cors',
    });
    addAuditLog('SETTINGS', `Informasi acara (${payload.settings.coupleTitle}) disinkronkan ke Google Spreadsheet.`);
    return { success: true };
  } catch (err) {
    console.warn('Gagal sync event settings to Google:', err);
    return { success: false, error: err };
  }
}

