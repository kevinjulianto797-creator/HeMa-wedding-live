import {
  getPendingCheckins,
  markCheckinSynced,
  getPendingWishes,
  markWishSynced,
  getPendingMoments,
  markMomentSynced,
} from './db';
import { syncCheckinToGoogle, syncWishToGoogle, syncMediaToGoogle } from './googleSync';

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
        console.log(`[SyncService] Mengirim antrean checkin: ${item.guestName}`);
        await syncCheckinToGoogle(item);
        await markCheckinSynced(item.id);
      }

      // 2. Sync pending wishes (text & voice note) to Cloud/Google Sheets & Drive
      const pendingWishes = await getPendingWishes();
      for (const item of pendingWishes) {
        console.log(`[SyncService] Mengirim antrean ucapan: ${item.senderName}`);
        await syncWishToGoogle(item);
        await markWishSynced(item.id);
      }

      // 3. Sync pending moments (photos/videos) to Cloudflare R2 & Google Drive
      const pendingMoments = await getPendingMoments();
      for (const item of pendingMoments) {
        console.log(`[SyncService] Mengirim antrean foto/video: ${item.caption}`);
        await syncMediaToGoogle(item);
        await markMomentSynced(item.id);
      }

      console.log('✅ [SyncService] Seluruh data offline berhasil disinkronisasi!');
      window.dispatchEvent(new CustomEvent('wedding-sync-completed'));
    } catch (error) {
      console.error('❌ [SyncService] Gagal saat sinkronisasi:', error);
    } finally {
      this.isSyncing = false;
      this.notifyListeners();
    }
  }
}

export const syncService = new SyncService();
