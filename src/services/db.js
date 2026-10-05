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
