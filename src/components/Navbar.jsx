import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, Sparkles, Tv, ShieldCheck } from 'lucide-react';
import { syncService } from '../services/syncService';

export function Navbar({ activePage, setActivePage }) {
  const [networkStatus, setNetworkStatus] = useState({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
  });
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
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
      unsubscribe();
      window.removeEventListener('wedding-sync-completed', handleSyncComplete);
      clearInterval(interval);
    };
  }, []);

  const handleManualSync = () => {
    syncService.syncAll();
  };

  return (
    <header className="sticky top-0 z-40 w-full glass-navy border-b border-gold-500/20 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between">
        {/* Brand & Couple Names */}
        <div 
          onClick={() => setActivePage('home')}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-gold-600 via-gold-400 to-amber-200 p-[1.5px] shadow-gold-glow">
            <div className="w-full h-full rounded-full bg-navy-900 flex items-center justify-center">
              <span className="font-serif text-sm font-bold text-gold-400">HM</span>
            </div>
          </div>
          <div>
            <h1 className="font-serif text-base sm:text-lg font-bold tracking-wide text-gold-gradient group-hover:opacity-90 transition">
              Hendra & Maya
            </h1>
            <p className="text-[10px] text-slate-300 font-medium tracking-wider uppercase">
              Minggu, 18 Okt 2026 • Live
            </p>
          </div>
        </div>

        {/* Right Status Actions */}
        <div className="flex items-center gap-2">
          {/* TV Projector Quick Link */}
          <button
            onClick={() => setActivePage('live')}
            title="Buka Mode Layar TV / Proyektor Gedung"
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition ${
              activePage === 'live'
                ? 'bg-gold-500 text-navy-950 border-gold-400 font-semibold'
                : 'bg-navy-800/80 text-gold-300 border-gold-500/30 hover:bg-navy-700'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>Layar Proyektor</span>
          </button>

          {/* Admin / Fotografer Quick Link */}
          <button
            onClick={() => setActivePage('admin')}
            title="Panel Admin & Fotografer"
            className={`p-1.5 sm:px-2.5 sm:py-1 rounded-full text-xs font-medium border transition flex items-center gap-1.5 ${
              activePage === 'admin'
                ? 'bg-gold-500 text-navy-950 border-gold-400 font-semibold'
                : 'bg-navy-800/80 text-slate-200 border-white/10 hover:bg-navy-700'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-gold-400" />
            <span className="hidden md:inline">Admin / Fotografer</span>
          </button>

          {/* Pending Sync / Offline Indicator */}
          {pendingCount > 0 && (
            <button
              onClick={handleManualSync}
              disabled={networkStatus.isSyncing || !networkStatus.isOnline}
              title="Ada data offline yang menunggu sinyal"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition animate-pulse"
            >
              <RefreshCw className={`w-3 h-3 ${networkStatus.isSyncing ? 'animate-spin' : ''}`} />
              <span>{pendingCount} Antrean</span>
            </button>
          )}

          {/* Online/Offline Badge */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
              networkStatus.isOnline
                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30'
                : 'bg-rose-950/60 text-rose-300 border-rose-500/40'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                networkStatus.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
              }`}
            />
            <span className="hidden sm:inline">
              {networkStatus.isOnline ? 'Online' : 'Offline (Auto-Sync)'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
