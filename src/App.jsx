import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { Home } from './pages/Home';
import { CheckIn } from './pages/CheckIn';
import { Moments } from './pages/Moments';
import { Wishes } from './pages/Wishes';
import { Admin } from './pages/Admin';
import { Photographer } from './pages/Photographer';
import { LiveScreen } from './pages/LiveScreen';
import { syncService } from './services/syncService';
import { WifiOff } from 'lucide-react';

export function App() {
  const [activePage, setActivePage] = useState('home');
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Sync with URL hash (e.g. #live, #checkin, #admin, #photographer)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (['home', 'checkin', 'moments', 'wishes', 'admin', 'photographer', 'live'].includes(hash)) {
        setActivePage(hash);
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);

    const unsubscribe = syncService.subscribe((status) => {
      setIsOnline(status.isOnline);
    });

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      unsubscribe();
    };
  }, []);

  const handlePageChange = (page) => {
    setActivePage(page);
    window.location.hash = page;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Fullscreen TV / Projector Mode doesn't show phone navbars
  if (activePage === 'live') {
    return <LiveScreen setActivePage={handlePageChange} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Offline Alert Strip if network drops */}
      {!isOnline && (
        <aside aria-label="Status Jaringan" className="bg-amber-600/90 text-navy-950 px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 shrink-0" />
            <span>
              Koneksi terputus. Mode offline aktif — Anda tetap bisa scan hadir, kirim ucapan, dan foto (otomatis terkirim saat sinyal kembali).
            </span>
          </div>
          <button
            onClick={() => syncService.syncAll()}
            className="px-2 py-0.5 bg-navy-950 text-gold-300 rounded text-[11px] font-bold hover:bg-navy-900 transition shrink-0 ml-2"
          >
            Coba Sinkron
          </button>
        </aside>
      )}

      {/* Main Navbar */}
      <Navbar activePage={activePage} setActivePage={handlePageChange} />

      {/* Page Content Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 pt-4 sm:pt-6">
        {activePage === 'home' && <Home setActivePage={handlePageChange} />}
        {activePage === 'checkin' && <CheckIn setActivePage={handlePageChange} />}
        {activePage === 'moments' && <Moments setActivePage={handlePageChange} />}
        {activePage === 'wishes' && <Wishes setActivePage={handlePageChange} />}
        {activePage === 'admin' && <Admin setActivePage={handlePageChange} />}
        {activePage === 'photographer' && <Photographer setActivePage={handlePageChange} />}
      </main>

      {/* Mobile Bottom Navigation (Clean guest-facing tabs) */}
      <BottomNav activePage={activePage} setActivePage={handlePageChange} />
    </div>
  );
}

export default App;
