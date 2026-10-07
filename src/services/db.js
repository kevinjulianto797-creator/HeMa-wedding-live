import { openDB } from 'idb';

const DB_NAME = 'hema_wedding_offline_db';
const DB_VERSION = 1;

export async function initDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // 1. Store for check-ins (both offline queue and local cache)
      if (!db.objectStoreNames.contains('checkins')) {
        const checkinStore = db.createObjectStore('checkins', { keyPath: 'id' });
        checkinStore.createIndex('synced', 'synced');
        checkinStore.createIndex('guestId', 'guestId');
      }

      // 2. Store for wishes (text & voice note)
      if (!db.objectStoreNames.contains('wishes')) {
        const wishStore = db.createObjectStore('wishes', { keyPath: 'id' });
        wishStore.createIndex('synced', 'synced');
        wishStore.createIndex('timestamp', 'timestamp');
      }

      // 3. Store for moments (photos & videos)
      if (!db.objectStoreNames.contains('moments')) {
        const momentStore = db.createObjectStore('moments', { keyPath: 'id' });
        momentStore.createIndex('synced', 'synced');
        momentStore.createIndex('timestamp', 'timestamp');
      }

      // 4. Store for guests list & general app state
      if (!db.objectStoreNames.contains('app_state')) {
        db.createObjectStore('app_state', { keyPath: 'key' });
      }
    },
  });
}

// --- CHECK-IN OPERATIONS ---
export async function saveCheckin(checkin) {
  const db = await initDB();
  const item = {
    id: checkin.id || `chk_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    guestId: checkin.guestId,
    guestName: checkin.guestName,
    pax: checkin.pax || 1,
    category: checkin.category || 'Tamu Undangan',
    timestamp: checkin.timestamp || new Date().toISOString(),
    checkedInBy: checkin.checkedInBy || 'self', // 'self' or 'admin'
    synced: checkin.synced ?? false,
  };
  await db.put('checkins', item);
  return item;
}

export async function getPendingCheckins() {
  const db = await initDB();
  const tx = db.transaction('checkins', 'readonly');
  const index = tx.store.index('synced');
  return index.getAll(false);
}

export async function getAllCheckins() {
  const db = await initDB();
  return db.getAll('checkins');
}

export async function markCheckinSynced(id) {
  const db = await initDB();
  const item = await db.get('checkins', id);
  if (item) {
    item.synced = true;
    await db.put('checkins', item);
  }
}

// --- WISHES & VOICE NOTES OPERATIONS ---
export async function saveWish(wish) {
  const db = await initDB();
  const item = {
    id: wish.id || `wsh_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    senderName: wish.senderName || 'Tamu Undangan',
    relationship: wish.relationship || 'Teman',
    message: wish.message || '',
    type: wish.type || 'text', // 'text' | 'voice'
    audioBlob: wish.audioBlob || null, // Blob saved directly in IndexedDB!
    audioDuration: wish.audioDuration || 0,
    timestamp: wish.timestamp || new Date().toISOString(),
    synced: wish.synced ?? false,
  };
  await db.put('wishes', item);
  return item;
}

export async function getPendingWishes() {
  const db = await initDB();
  const tx = db.transaction('wishes', 'readonly');
  const index = tx.store.index('synced');
  return index.getAll(false);
}

export async function getAllWishes() {
  const db = await initDB();
  const all = await db.getAll('wishes');
  return all.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

export async function markWishSynced(id) {
  const db = await initDB();
  const item = await db.get('wishes', id);
  if (item) {
    item.synced = true;
    await db.put('wishes', item);
  }
}

// --- MOMENTS (PHOTOS & VIDEOS) OPERATIONS ---
export async function saveMoment(moment) {
  const db = await initDB();
  const item = {
    id: moment.id || `mmt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    caption: moment.caption || '',
    uploaderName: moment.uploaderName || 'Tamu Undangan',
    uploaderRole: moment.uploaderRole || 'guest', // 'photographer' | 'guest'
    type: moment.type || 'photo', // 'photo' | 'video'
    category: moment.category || 'Momen Bahagia',
    fileBlob: moment.fileBlob || null,
    previewUrl: moment.previewUrl || '',
    likes: moment.likes || 0,
    timestamp: moment.timestamp || new Date().toISOString(),
    synced: moment.synced ?? false,
  };
  await db.put('moments', item);
  return item;
}

export async function getPendingMoments() {
  const db = await initDB();
  const tx = db.transaction('moments', 'readonly');
  const index = tx.store.index('synced');
  return index.getAll(false);
}

export async function getAllMoments() {
  const db = await initDB();
  const all = await db.getAll('moments');
  return all.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

export async function markMomentSynced(id) {
  const db = await initDB();
  const item = await db.get('moments', id);
  if (item) {
    item.synced = true;
    await db.put('moments', item);
  }
}

export async function updateMomentLikes(id, increment = 1) {
  const db = await initDB();
  const item = await db.get('moments', id);
  if (item) {
    item.likes = (item.likes || 0) + increment;
    await db.put('moments', item);
    return item.likes;
  }
  return 0;
}

// --- APP STATE / GUEST CACHE ---
export async function setAppState(key, value) {
  const db = await initDB();
  await db.put('app_state', { key, value });
}

export async function getAppState(key) {
  const db = await initDB();
  const record = await db.get('app_state', key);
  return record ? record.value : null;
}

// --- CLOUD MERGE OPERATIONS (2-Way Realtime Sync) ---
export async function mergeCloudMoments(cloudMoments) {
  if (!Array.isArray(cloudMoments)) return 0;
  const db = await initDB();
  const localMoments = await db.getAll('moments');

  // Amankan momen lokal yang masih antre upload (synced: false)
  const pendingLocal = localMoments.filter(m => m.synced === false);

  const cloudMap = new Map();
  for (const cm of cloudMoments) {
    const key = cm.previewUrl || `${cm.timestamp}_${cm.uploaderName}`;
    cloudMap.set(key, {
      id: cm.id || `mmt_cloud_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      caption: cm.caption || '',
      uploaderName: cm.uploaderName || 'Tamu Undangan',
      uploaderRole: cm.uploaderRole || 'guest',
      type: cm.type || 'photo',
      category: cm.category || 'Momen Bahagia',
      previewUrl: cm.previewUrl,
      likes: cm.likes || 1,
      timestamp: cm.timestamp || new Date().toISOString(),
      synced: true,
    });
  }

  // Jika cloud kosong (misal database di-setup ulang oleh pengantin),
  // sinkronisasi lokal akan mencerminkan cloud yang bersih tanpa data lama
  const tx = db.transaction('moments', 'readwrite');
  await tx.store.clear();

  for (const pm of pendingLocal) {
    await tx.store.put(pm);
  }
  for (const cm of cloudMap.values()) {
    await tx.store.put(cm);
  }
  await tx.done;

  return cloudMap.size;
}

export async function mergeCloudWishes(cloudWishes) {
  if (!Array.isArray(cloudWishes)) return 0;
  const db = await initDB();
  const localWishes = await db.getAll('wishes');

  const pendingLocal = localWishes.filter(w => w.synced === false);

  const cloudMap = new Map();
  for (const cw of cloudWishes) {
    const key = `${cw.timestamp}_${cw.senderName}`;
    cloudMap.set(key, {
      id: cw.id || `wsh_cloud_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      senderName: cw.senderName || 'Tamu Undangan',
      relationship: cw.relationship || 'Teman',
      message: cw.message || '',
      type: cw.type || 'text',
      audioBlob: null,
      audioUrl: cw.audioUrl || null,
      audioDuration: cw.audioDuration || 0,
      timestamp: cw.timestamp || new Date().toISOString(),
      synced: true,
    });
  }

  const tx = db.transaction('wishes', 'readwrite');
  await tx.store.clear();

  for (const pw of pendingLocal) {
    await tx.store.put(pw);
  }
  for (const cw of cloudMap.values()) {
    await tx.store.put(cw);
  }
  await tx.done;

  return cloudMap.size;
}

export async function mergeCloudCheckins(cloudCheckins) {
  if (!Array.isArray(cloudCheckins)) return 0;
  const db = await initDB();
  const localCheckins = await db.getAll('checkins');

  const pendingLocal = localCheckins.filter(c => c.synced === false);

  const cloudMap = new Map();
  for (const cc of cloudCheckins) {
    const key = `${cc.timestamp}_${cc.guestName}`;
    cloudMap.set(key, {
      id: cc.id || `chk_cloud_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      guestId: cc.guestId || '-',
      guestName: cc.guestName || 'Tamu Undangan',
      pax: cc.pax || 1,
      category: cc.category || 'Tamu Undangan',
      table: cc.table || '-',
      timestamp: cc.timestamp || new Date().toISOString(),
      checkedInBy: cc.checkedInBy || 'self',
      synced: true,
    });
  }

  const tx = db.transaction('checkins', 'readwrite');
  await tx.store.clear();

  for (const pc of pendingLocal) {
    await tx.store.put(pc);
  }
  for (const cc of cloudMap.values()) {
    await tx.store.put(cc);
  }
  await tx.done;

  return cloudMap.size;
}

// Reset / Bersihkan seluruh data lokal (uji coba)
export async function clearAllEventData() {
  const db = await initDB();
  const tx = db.transaction(['moments', 'wishes', 'checkins', 'app_state'], 'readwrite');
  await tx.objectStore('moments').clear();
  await tx.objectStore('wishes').clear();
  await tx.objectStore('checkins').clear();
  await tx.objectStore('app_state').clear();
  await tx.done;

  localStorage.removeItem('hema_guest_upload_quota');
  localStorage.removeItem('hema_sync_logs');

  window.dispatchEvent(new CustomEvent('wedding-sync-completed'));
  return true;
}

// Hapus draft uji coba offline yang tertahan di HP
export async function clearPendingDrafts() {
  const db = await initDB();
  const moments = await db.getAll('moments');
  const wishes = await db.getAll('wishes');
  const checkins = await db.getAll('checkins');

  const tx = db.transaction(['moments', 'wishes', 'checkins'], 'readwrite');
  for (const m of moments) {
    if (m.synced === false) await tx.objectStore('moments').delete(m.id);
  }
  for (const w of wishes) {
    if (w.synced === false) await tx.objectStore('wishes').delete(w.id);
  }
  for (const c of checkins) {
    if (c.synced === false) await tx.objectStore('checkins').delete(c.id);
  }
  await tx.done;

  localStorage.removeItem('hema_guest_upload_quota');
  window.dispatchEvent(new CustomEvent('wedding-sync-completed'));
  return true;
}
