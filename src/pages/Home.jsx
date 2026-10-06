import React, { useState, useEffect } from 'react';
import { 
  QrCode, 
  MessageSquareHeart, 
  Camera, 
  Clock, 
  MapPin, 
  Sparkles, 
  Users, 
  Image, 
  Heart,
  ChevronRight
} from 'lucide-react';
import { getAllCheckins, getAllWishes, getAllMoments } from '../services/db';
import { getWeddingSettings } from '../services/weddingSettings';

export function Home({ setActivePage }) {
  const [settings, setSettings] = useState(getWeddingSettings());
  const [stats, setStats] = useState({
    checkedInCount: 0,
    momentsCount: 0,
    wishesCount: 0,
  });

  const [recentMoments, setRecentMoments] = useState([]);

  useEffect(() => {
    const handleSettingsUpdate = (e) => {
      setSettings(e.detail || getWeddingSettings());
    };

    window.addEventListener('wedding-settings-updated', handleSettingsUpdate);

    const loadData = async () => {
      try {
        const [checkins, wishes, moments] = await Promise.all([
          getAllCheckins(),
          getAllWishes(),
          getAllMoments(),
        ]);

        setStats({
          checkedInCount: checkins.length,
          momentsCount: moments.length,
          wishesCount: wishes.length,
        });

        setRecentMoments(moments.slice(0, 3));
      } catch (err) {
        console.error('Error loading home data:', err);
      }
    };

    loadData();
    window.addEventListener('wedding-sync-completed', loadData);

    return () => {
      window.removeEventListener('wedding-settings-updated', handleSettingsUpdate);
      window.removeEventListener('wedding-sync-completed', loadData);
    };
  }, []);

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      {/* Hero Card (Luxury White & Navy) */}
      <section className="relative overflow-hidden rounded-3xl border border-navy-100 bg-white p-6 sm:p-10 shadow-sm">
        {/* Decorative background glow */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-navy-100/60 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-gold-100/50 rounded-full blur-3xl pointer-events-none" />

        <div className="relative text-center max-w-xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-navy-50 border border-navy-200 text-navy-900 text-xs font-semibold tracking-wider uppercase">
            <Sparkles className="w-3.5 h-3.5 text-navy-700" />
            <span>The Wedding Celebration</span>
          </div>

          <h2 className="font-serif text-3xl sm:text-5xl font-bold text-navy-950 tracking-tight leading-tight">
            {settings.coupleTitle || 'Cecep & Memey'}
          </h2>

          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            {settings.welcomeMessage ||
              'Selamat datang di Buku Tamu Digital & Live Momen Pernikahan kami. Kehadiran dan doa restu Anda adalah anugerah terindah bagi kami.'}
          </p>

          {/* Event Details Pill */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-xs text-slate-700">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200">
              <Clock className="w-4 h-4 text-navy-800" />
              <span>{settings.weddingDateFormatted || 'Minggu, 18 Oktober 2026'}</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200">
              <MapPin className="w-4 h-4 text-navy-800" />
              <span>{settings.venueName || 'Grand Ballroom Hotel Mulia'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Main Action Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Card 1: Check-in Hadir */}
        <div
          onClick={() => setActivePage('checkin')}
          className="group cursor-pointer bg-white hover:bg-slate-50/80 p-5 rounded-2xl border border-slate-200 hover:border-navy-400 shadow-sm hover:shadow-md transition duration-300 flex flex-col justify-between"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-navy-950 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition">
              <QrCode className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-semibold text-navy-800 bg-navy-50 px-2.5 py-0.5 rounded-full border border-navy-200">
              Dual Mode
            </span>
          </div>
          <div>
            <h3 className="font-serif font-bold text-base text-navy-950 group-hover:text-navy-700 transition">
              Scan Kehadiran
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Check-in barcode/QR mandiri atau lewat meja resepsionis penerima tamu.
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold text-navy-900 mt-4 group-hover:translate-x-1 transition">
            <span>Buka Scanner</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>

        {/* Card 2: Doa & Voice Note */}
        <div
          onClick={() => setActivePage('wishes')}
          className="group cursor-pointer bg-white hover:bg-slate-50/80 p-5 rounded-2xl border border-slate-200 hover:border-navy-400 shadow-sm hover:shadow-md transition duration-300 flex flex-col justify-between"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-navy-900 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition">
              <MessageSquareHeart className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-semibold text-navy-800 bg-navy-50 px-2.5 py-0.5 rounded-full border border-navy-200">
              Teks & Suara
            </span>
          </div>
          <div>
            <h3 className="font-serif font-bold text-base text-navy-950 group-hover:text-navy-700 transition">
              Buku Doa & Ucapan
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Kirim ucapan selamat pernikahan dengan ketikan pesan atau rekaman suara.
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold text-navy-900 mt-4 group-hover:translate-x-1 transition">
            <span>Tulis Doa</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>

        {/* Card 3: Galeri Momen */}
        <div
          onClick={() => setActivePage('moments')}
          className="group cursor-pointer bg-white hover:bg-slate-50/80 p-5 rounded-2xl border border-slate-200 hover:border-navy-400 shadow-sm hover:shadow-md transition duration-300 flex flex-col justify-between"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-navy-800 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition">
              <Camera className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-semibold text-navy-800 bg-navy-50 px-2.5 py-0.5 rounded-full border border-navy-200">
              Kamera & Galeri
            </span>
          </div>
          <div>
            <h3 className="font-serif font-bold text-base text-navy-950 group-hover:text-navy-700 transition">
              Galeri & Momen
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Jepret foto langsung di aplikasi, kamera HP, atau unggah foto selfie Anda.
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold text-navy-900 mt-4 group-hover:translate-x-1 transition">
            <span>Buka Galeri</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </section>

      {/* Real-time Event Counter Stats */}
      <section className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 text-center shadow-sm">
          <div className="flex items-center justify-center gap-1.5 text-navy-800 text-xs mb-1 font-semibold">
            <Users className="w-3.5 h-3.5" />
            <span>Tamu Hadir</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold font-mono text-navy-950">
            {stats.checkedInCount}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 text-center shadow-sm">
          <div className="flex items-center justify-center gap-1.5 text-navy-800 text-xs mb-1 font-semibold">
            <Image className="w-3.5 h-3.5" />
            <span>Momen Foto</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold font-mono text-navy-950">
            {stats.momentsCount}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 text-center shadow-sm">
          <div className="flex items-center justify-center gap-1.5 text-navy-800 text-xs mb-1 font-semibold">
            <Heart className="w-3.5 h-3.5" />
            <span>Doa Restu</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold font-mono text-navy-950">
            {stats.wishesCount}
          </p>
        </div>
      </section>

      {/* Highlights: Recent Photos from Photographer */}
      {recentMoments.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-navy-800" />
              <h3 className="font-serif font-bold text-base sm:text-lg text-navy-950">
                Jepretan Terbaru Acara
              </h3>
            </div>
            <button
              onClick={() => setActivePage('moments')}
              className="text-xs font-semibold text-navy-900 hover:text-navy-700 transition flex items-center gap-1"
            >
              <span>Lihat Semua</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {recentMoments.map((m) => (
              <div
                key={m.id}
                onClick={() => setActivePage('moments')}
                className="group relative aspect-square rounded-2xl overflow-hidden border border-slate-200 cursor-pointer shadow-sm hover:shadow-md transition"
              >
                <img
                  src={m.previewUrl}
                  alt={m.caption}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy-950/80 via-transparent to-transparent" />
                <div className="absolute bottom-2.5 left-2.5 right-2.5">
                  <span className="text-[10px] font-semibold text-white bg-navy-900/80 px-2 py-0.5 rounded-full inline-block mb-1">
                    {m.category}
                  </span>
                  <p className="text-[11px] text-white line-clamp-1 font-medium">
                    {m.caption}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
