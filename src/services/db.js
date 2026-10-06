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
  if (!Array.isArray(cloudMoments) || cloudMoments.length === 0) return 0;
  const db = await initDB();
  const localMoments = await db.getAll('moments');
  const existingUrls = new Set(localMoments.map(m => m.previewUrl).filter(Boolean));
  const existingKeys = new Set(localMoments.map(m => `${m.timestamp}_${m.uploaderName}`));

  let addedCount = 0;
  for (const cm of cloudMoments) {
    const key = `${cm.timestamp}_${cm.uploaderName}`;
    if (!existingUrls.has(cm.previewUrl) && !existingKeys.has(key)) {
      await db.put('moments', {
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
      if (cm.previewUrl) existingUrls.add(cm.previewUrl);
      existingKeys.add(key);
      addedCount++;
    }
  }
  return addedCount;
}

export async function mergeCloudWishes(cloudWishes) {
  if (!Array.isArray(cloudWishes) || cloudWishes.length === 0) return 0;
  const db = await initDB();
  const localWishes = await db.getAll('wishes');
  const existingKeys = new Set(localWishes.map(w => `${w.timestamp}_${w.senderName}`));

  let addedCount = 0;
  for (const cw of cloudWishes) {
    const key = `${cw.timestamp}_${cw.senderName}`;
    if (!existingKeys.has(key)) {
      await db.put('wishes', {
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
      existingKeys.add(key);
      addedCount++;
    }
  }
  return addedCount;
}

export async function mergeCloudCheckins(cloudCheckins) {
  if (!Array.isArray(cloudCheckins) || cloudCheckins.length === 0) return 0;
  const db = await initDB();
  const localCheckins = await db.getAll('checkins');
  const existingKeys = new Set(localCheckins.map(c => `${c.timestamp}_${c.guestName}`));

  let addedCount = 0;
  for (const cc of cloudCheckins) {
    const key = `${cc.timestamp}_${cc.guestName}`;
    if (!existingKeys.has(key)) {
      await db.put('checkins', {
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
      existingKeys.add(key);
      addedCount++;
    }
  }
  return addedCount;
}
