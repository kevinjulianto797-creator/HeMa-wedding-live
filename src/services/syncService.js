import {
  getPendingCheckins,
  markCheckinSynced,
  getPendingWishes,
  markWishSynced,
  getPendingMoments,
  markMomentSynced,
  mergeCloudMoments,
  mergeCloudWishes,
  mergeCloudCheckins,
} from './db';
import { 
  syncCheckinToGoogle, 
  syncWishToGoogle, 
  syncMediaToGoogle,
  pullCloudData 
} from './googleSync';

class SyncService {
  constructor() {
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    this.isSyncing = false;
    this.listeners = new Set();

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.notifyListeners();
        console.log('📡 [SyncService] Sinyal internet terhubung kembali! Memulai auto-sync...');
        this.syncAll();
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
        this.notifyListeners();
        console.warn('⚠️ [SyncService] Sinyal offline! Mode penyimpanan lokal aktif.');
      });

      // Jalankan auto-sync awal jika online untuk mengirim antrean yang tersimpan sebelumnya
      if (this.isOnline) {
        setTimeout(() => this.syncAll(), 2500);
      }

      window.addEventListener('wedding-settings-updated', () => {
        if (this.isOnline) this.syncAll();
      });

      // Polling berkala setiap 7 detik untuk menarik foto, ucapan, dan checkin baru dari Google Sheets & Drive
      setInterval(() => {
        if (this.isOnline && !this.isSyncing) {
          this.pullFromCloud();
        }
      }, 7000);
    }
  }

  subscribe(callback) {
    this.listeners.add(callback);
    callback({ isOnline: this.isOnline, isSyncing: this.isSyncing });
    return () => this.listeners.delete(callback);
  }

  notifyListeners() {
    this.listeners.forEach((cb) =>
      cb({ isOnline: this.isOnline, isSyncing: this.isSyncing })
    );
  }

  async getPendingCount() {
    try {
      const [checkins, wishes, moments] = await Promise.all([
        getPendingCheckins(),
        getPendingWishes(),
        getPendingMoments(),
      ]);
      return {
        checkins: checkins.length,
        wishes: wishes.length,
        moments: moments.length,
        total: checkins.length + wishes.length + moments.length,
      };
    } catch (e) {
      console.error('Error getting pending count:', e);
      return { checkins: 0, wishes: 0, moments: 0, total: 0 };
    }
  }

  async syncAll() {
    if (this.isSyncing || !this.isOnline) return;

    this.isSyncing = true;
    this.notifyListeners();

    try {
      // 1. Sync pending check-ins to Cloud/Google Sheets
      const pendingCheckins = await getPendingCheckins();
      for (const item of pendingCheckins) {
        try {
          console.log(`[SyncService] Mengirim antrean checkin: ${item.guestName}`);
          await syncCheckinToGoogle(item);
          await markCheckinSynced(item.id);
        } catch (errCheckin) {
          console.warn('Gagal sync checkin:', errCheckin);
        }
      }

      // 2. Sync pending wishes (text & voice note) to Cloud/Google Sheets & Drive
      const pendingWishes = await getPendingWishes();
      for (const item of pendingWishes) {
        try {
          console.log(`[SyncService] Mengirim antrean ucapan: ${item.senderName}`);
          await syncWishToGoogle(item);
          await markWishSynced(item.id);
        } catch (errWish) {
          console.warn('Gagal sync ucapan:', errWish);
        }
      }

      // 3. Sync pending moments (photos/videos) to Google Drive & Sheets
      const pendingMoments = await getPendingMoments();
      for (const item of pendingMoments) {
        try {
          console.log(`[SyncService] Mengirim antrean foto/video: ${item.caption}`);
          await syncMediaToGoogle(item);
          await markMomentSynced(item.id);
        } catch (errMedia) {
          console.warn('Gagal sync media:', errMedia);
        }
      }

      console.log('✅ [SyncService] Seluruh data antrean selesai diproses!');
      await this.pullFromCloud();
      window.dispatchEvent(new CustomEvent('wedding-sync-completed'));
    } catch (error) {
      console.error('❌ [SyncService] Gagal saat sinkronisasi:', error);
    } finally {
      this.isSyncing = false;
      this.notifyListeners();
    }
  }

  // 4. Tarik data terbaru dari Cloud (Google Sheets & Drive) agar foto tamu di HP langsung masuk ke Laptop
  async pullFromCloud() {
    try {
      const cloudData = await pullCloudData();
      if (!cloudData || cloudData.status !== 'success') return;

      let hasNewData = false;
      if (Array.isArray(cloudData.moments) && cloudData.moments.length > 0) {
        const addedMoments = await mergeCloudMoments(cloudData.moments);
        if (addedMoments > 0) hasNewData = true;
      }
      if (Array.isArray(cloudData.wishes) && cloudData.wishes.length > 0) {
        const addedWishes = await mergeCloudWishes(cloudData.wishes);
        if (addedWishes > 0) hasNewData = true;
      }
      if (Array.isArray(cloudData.checkins) && cloudData.checkins.length > 0) {
        const addedCheckins = await mergeCloudCheckins(cloudData.checkins);
        if (addedCheckins > 0) hasNewData = true;
      }

      if (hasNewData) {
        console.log('🔄 [SyncService] Data foto/doa baru dari Google Sheets & Drive berhasil diterima!');
        window.dispatchEvent(new CustomEvent('wedding-sync-completed'));
      }
    } catch (e) {
      console.warn('SyncService pullFromCloud error:', e);
    }
  }
}

export const syncService = new SyncService();
