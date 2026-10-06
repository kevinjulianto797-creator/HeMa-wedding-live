import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, ArrowLeft } from 'lucide-react';
import { syncService } from '../services/syncService';
import { getWeddingSettings } from '../services/weddingSettings';

export function Navbar({ activePage, setActivePage }) {
  const [networkStatus, setNetworkStatus] = useState({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
  });
  const [pendingCount, setPendingCount] = useState(0);
  const [settings, setSettings] = useState(getWeddingSettings());

  // Secret Admin Tap Counter (5 taps within 3 seconds)
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef(null);

  useEffect(() => {
    const handleSettingsUpdate = (e) => {
      setSettings(e.detail || getWeddingSettings());
    };

    window.addEventListener('wedding-settings-updated', handleSettingsUpdate);

    const updateCounts = async () => {
      const counts = await syncService.getPendingCount();
      setPendingCount(counts.total);
    };

    updateCounts();

    const unsubscribe = syncService.subscribe((status) => {
      setNetworkStatus(status);
      updateCounts();
    });

    const handleSyncComplete = () => {
      updateCounts();
    };

    window.addEventListener('wedding-sync-completed', handleSyncComplete);
    const interval = setInterval(updateCounts, 4000);

    return () => {
      window.removeEventListener('wedding-settings-updated', handleSettingsUpdate);
      unsubscribe();
      window.removeEventListener('wedding-sync-completed', handleSyncComplete);
      clearInterval(interval);
    };
  }, []);

  const handleManualSync = () => {
    syncService.syncAll();
  };

  // Secret Easter Egg for Admin (5 taps on couple logo)
  const handleLogoTap = () => {
    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);

    if (tapCountRef.current >= 5) {
      tapCountRef.current = 0;
      setActivePage('admin');
      return;
    }

    tapTimerRef.current = setTimeout(() => {
      tapCountRef.current = 0;
    }, 2500);

    // If single tap, navigate to home as usual
    if (tapCountRef.current === 1) {
      setActivePage('home');
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 border-b border-navy-100/80 backdrop-blur-md shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Tombol Kembali (Muncul saat tidak di halaman Beranda) */}
          {activePage !== 'home' && (
            <button
              type="button"
              onClick={() => setActivePage('home')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-navy-950 text-xs font-bold transition border border-slate-200 shadow-xs group"
              title="Kembali ke Beranda"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-navy-900 group-hover:-translate-x-0.5 transition" />
              <span>Kembali</span>
            </button>
          )}

          {/* Brand & Couple Names (Secret Admin trigger on 5 taps) */}
          <div 
            onClick={handleLogoTap}
            className="flex items-center gap-2.5 cursor-pointer group select-none"
            title="Klik untuk Beranda"
          >
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-navy-900 via-navy-800 to-gold-500 p-[1.5px] shadow-sm">
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
              <span className="font-serif text-sm font-bold text-navy-900">
                {settings.initials || 'CM'}
              </span>
            </div>
          </div>
            <div>
              <h1 className="font-serif text-base sm:text-lg font-bold tracking-wide text-navy-950 group-hover:text-navy-700 transition">
                {settings.coupleTitle || 'Cecep & Memey'}
              </h1>
              <p className="text-[10px] text-slate-500 font-medium tracking-wider uppercase">
                {settings.weddingDateFormatted || 'Minggu, 18 Okt 2026'} • Live
              </p>
            </div>
          </div>
        </div>

        {/* Right Status Actions (Clean & for guests only) */}
        <div className="flex items-center gap-2">
          {/* Pending Sync / Offline Indicator */}
          {pendingCount > 0 && (
            <button
              onClick={handleManualSync}
              disabled={networkStatus.isSyncing || !networkStatus.isOnline}
              title="Ada data offline yang menunggu sinyal"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition animate-pulse"
            >
              <RefreshCw className={`w-3 h-3 ${networkStatus.isSyncing ? 'animate-spin' : ''}`} />
              <span>{pendingCount} Antrean</span>
            </button>
          )}

          {/* Online/Offline Badge */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
              networkStatus.isOnline
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                networkStatus.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <span className="hidden sm:inline">
              {networkStatus.isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
