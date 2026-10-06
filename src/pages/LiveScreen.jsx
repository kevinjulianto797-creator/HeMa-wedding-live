import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { 
  Maximize2, 
  Minimize2, 
  Sparkles, 
  Users, 
  Heart, 
  Clock, 
  ChevronLeft,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';
import { getAllMoments, getAllWishes, getAllCheckins } from '../services/db';
import { getWeddingSettings, getShareableWeddingUrl } from '../services/weddingSettings';

export function LiveScreen({ setActivePage }) {
  const [settings, setSettings] = useState(getWeddingSettings());
  const [moments, setMoments] = useState([]);
  const [wishes, setWishes] = useState([]);
  const [checkinsCount, setCheckinsCount] = useState(0);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [qrVenueUrl, setQrVenueUrl] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('id-ID'));

  // Generate QR for Guests to scan while looking at stage screen
  useEffect(() => {
    const handleSettingsUpdate = (e) => {
      const updated = e.detail || getWeddingSettings();
      setSettings(updated);
      const venueLink = getShareableWeddingUrl(updated);
      QRCode.toDataURL(venueLink, {
        width: 180,
        margin: 1,
        color: { dark: '#0A192F', light: '#FFFFFF' },
      }).then(setQrVenueUrl).catch(console.error);
    };

    window.addEventListener('wedding-settings-updated', handleSettingsUpdate);

    const venueLink = getShareableWeddingUrl(settings);
    QRCode.toDataURL(venueLink, {
      width: 180,
      margin: 1,
      color: { dark: '#0A192F', light: '#FFFFFF' },
    }).then(setQrVenueUrl).catch(console.error);

    const clockTimer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('id-ID'));
    }, 1000);

    return () => {
      window.removeEventListener('wedding-settings-updated', handleSettingsUpdate);
      clearInterval(clockTimer);
    };
  }, []);

  // Fetch data & auto-sync
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [m, w, c] = await Promise.all([
          getAllMoments(),
          getAllWishes(),
          getAllCheckins(),
        ]);
        if (m) {
          const realMoments = (m || []).filter(
            (item) => !item.previewUrl?.includes('images.unsplash.com')
          );
          setMoments(realMoments);
        }
        if (w) {
          setWishes(w);
        }
        setCheckinsCount(c ? c.length : 0);
      } catch (e) {
        console.error('LiveScreen fetch error:', e);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 6000);
    return () => clearInterval(interval);
  }, []);

  // Auto slide show every 6 seconds
  useEffect(() => {
    if (moments.length <= 1) return;
    const slideTimer = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % moments.length);
    }, 6000);
    return () => clearInterval(slideTimer);
  }, [moments]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn('Error attempting to enable fullscreen:', err);
      });
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const currentPhoto = moments[currentSlideIndex] || {
    previewUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1600&q=85',
    caption: `The Wedding Celebration of ${settings.coupleTitle || 'Cecep & Memey'}`,
    uploaderName: 'Official Lens Art',
    category: 'Akad Nikah',
  };

  return (
    <div className="fixed inset-0 z-50 bg-navy-950 text-slate-100 flex flex-col justify-between overflow-hidden select-none">
      {/* Top Header Bar */}
      <div className="relative z-20 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-navy-950/95 to-transparent backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActivePage('home')}
            className="p-2 rounded-xl bg-navy-900/80 hover:bg-navy-800 text-gold-400 border border-gold-500/30 transition flex items-center gap-1 text-xs"
            title="Kembali ke Aplikasi Tamu"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Kembali</span>
          </button>

          <div>
            <h1 className="font-serif text-xl sm:text-2xl font-bold text-gold-gradient">
              {settings.coupleTitle || 'Cecep & Memey'}
            </h1>
            <p className="text-[11px] text-slate-300 font-medium tracking-wider uppercase">
              {settings.venueName || 'Grand Ballroom Hotel Mulia'} • {currentTime} WIB
            </p>
          </div>
        </div>

        {/* Live Counters */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-navy-900/90 border border-emerald-500/40 text-emerald-400 text-xs font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <Users className="w-3.5 h-3.5" />
            <span>{checkinsCount} Tamu Hadir</span>
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-navy-900/80 hover:bg-navy-800 text-slate-300 hover:text-white border border-white/10 transition"
            title="Layar Penuh (Fullscreen)"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Slideshow Stage */}
      <div className="relative flex-1 flex items-center justify-center p-4 sm:p-8 overflow-hidden">
        {/* Blurred background ambiance */}
        <div
          className="absolute inset-0 bg-cover bg-center filter blur-2xl opacity-20 transform scale-110 transition-all duration-1000"
          style={{ backgroundImage: `url(${currentPhoto.previewUrl})` }}
        />

        {/* Center Frame */}
        {moments.length > 0 && currentPhoto ? (
          <div className="relative max-h-[72vh] max-w-5xl w-full flex items-center justify-center">
            <img
              key={currentPhoto.previewUrl}
              src={currentPhoto.previewUrl}
              alt={currentPhoto.caption}
              className="max-h-[68vh] max-w-full object-contain rounded-3xl shadow-2xl border-2 border-gold-500/40 animate-fade-in transition-all duration-700"
            />

            {/* Photo Caption Badge */}
            <div className="absolute bottom-4 left-6 right-6 flex items-center justify-between pointer-events-none">
              <div className="glass-navy px-4 py-2.5 rounded-2xl border border-gold-500/30 max-w-xl backdrop-blur-md">
                <span className="text-[10px] font-bold text-gold-400 uppercase tracking-widest block mb-0.5">
                  {currentPhoto.category || 'Momen Bahagia'} • {currentPhoto.uploaderName}
                </span>
                <p className="text-xs sm:text-sm font-semibold text-slate-100 line-clamp-1">
                  {currentPhoto.caption}
                </p>
              </div>

              {/* Slide Index Indicator */}
              {moments.length > 1 && (
                <div className="glass-navy px-3 py-1.5 rounded-xl border border-white/10 text-xs font-mono text-gold-300">
                  {currentSlideIndex + 1} / {moments.length}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center p-8 sm:p-12 glass-navy rounded-3xl border-2 border-gold-500/40 shadow-2xl max-w-md space-y-4 animate-fade-in">
            <div className="w-16 h-16 mx-auto rounded-full bg-gold-500/10 border-2 border-gold-400 flex items-center justify-center text-gold-400 shadow-gold-glow">
              <Sparkles className="w-8 h-8" />
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-gold-gradient">
              {settings.coupleTitle || 'Cecep & Memey'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              Layar proyektor live panggung. Foto dari fotografer dan selfie tamu akan langsung tayang di sini secara realtime.
            </p>
            {qrVenueUrl && (
              <div className="pt-2 inline-block">
                <img src={qrVenueUrl} alt="Scan QR" className="w-32 h-32 mx-auto rounded-2xl bg-white p-1.5 shadow-lg border border-gold-400/40" />
                <p className="text-[10px] font-bold text-gold-400 uppercase tracking-widest mt-2">
                  Scan untuk Kirim Doa & Foto
                </p>
              </div>
            )}
          </div>
        )}

        {/* Scan Me QR Overlay on Stage Screen (Corner) */}
        {qrVenueUrl && (
          <div className="absolute top-6 right-6 hidden md:flex flex-col items-center glass-navy p-3 rounded-2xl border border-gold-500/40 shadow-xl backdrop-blur-md">
            <img src={qrVenueUrl} alt="Scan QR" className="w-24 h-24 rounded-lg bg-white p-1" />
            <span className="text-[10px] font-bold text-gold-300 uppercase tracking-wider mt-1.5">
              Scan untuk Kirim Doa
            </span>
          </div>
        )}

        {/* Manual Slideshow Controls */}
        {moments.length > 1 && (
          <>
            <button
              onClick={() =>
                setCurrentSlideIndex((prev) => (prev - 1 + moments.length) % moments.length)
              }
              className="absolute left-4 top-1/2 transform -translate-y-1/2 p-3 rounded-full bg-navy-900/60 hover:bg-navy-900 text-gold-400 border border-gold-500/20 transition backdrop-blur-sm"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={() => setCurrentSlideIndex((prev) => (prev + 1) % moments.length)}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 p-3 rounded-full bg-navy-900/60 hover:bg-navy-900 text-gold-400 border border-gold-500/20 transition backdrop-blur-sm"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
      </div>

      {/* Bottom Running Text Marquee: Guest Wishes */}
      <div className="relative z-20 bg-navy-900/90 border-t border-gold-500/30 py-3 px-4 flex items-center gap-3 backdrop-blur-md">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold-500 text-navy-950 text-xs font-bold shrink-0 shadow-gold-glow">
          <Sparkles className="w-3.5 h-3.5 fill-navy-950" />
          <span>DOA RESTU TAMU</span>
        </div>

        {/* Continuous ticker */}
        <div className="overflow-hidden whitespace-nowrap flex-1">
          <div className="inline-block animate-marquee">
            {wishes.map((w, idx) => (
              <span key={idx} className="inline-flex items-center gap-2 mx-6 text-xs sm:text-sm">
                <span className="font-bold text-gold-300">{w.senderName}:</span>
                <span className="text-slate-200">
                  {w.type === 'voice' ? '🎙️ [Mengirimkan Doa Melalui Voice Note]' : `"${w.message}"`}
                </span>
                <span className="text-gold-500/60">•</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
