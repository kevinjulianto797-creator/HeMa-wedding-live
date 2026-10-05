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
  ChevronRight,
  Tv
} from 'lucide-react';
import { getAllCheckins, getAllWishes, getAllMoments } from '../services/db';
import { getWeddingSettings } from '../services/weddingSettings';

export function Home({ setActivePage }) {
  const [settings, setSettings] = useState(getWeddingSettings());
  const [stats, setStats] = useState({
    checkedInCount: 142,
    momentsCount: 5,
    wishesCount: 3,
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
          checkedInCount: 140 + checkins.length,
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
      {/* Hero Card */}
      <section className="relative overflow-hidden rounded-3xl border border-gold-500/30 glass-navy p-6 sm:p-10 shadow-navy-card">
        {/* Decorative background glow */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-navy-600/30 rounded-full blur-3xl pointer-events-none" />

        <div className="relative text-center max-w-xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-500/10 border border-gold-500/30 text-gold-300 text-xs font-semibold tracking-wider uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>The Wedding Celebration</span>
          </div>

          <h2 className="font-serif text-3xl sm:text-5xl font-bold text-gold-gradient tracking-tight leading-tight">
            {settings.coupleTitle || 'Hendra & Maya'}
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
            {settings.welcomeMessage ||
              'Selamat datang di Buku Tamu Digital & Live Momen Pernikahan kami. Kehadiran dan doa restu Anda adalah anugerah terindah bagi kami.'}
          </p>

          {/* Event Details Pill */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-xs text-slate-300">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-900/80 rounded-xl border border-white/10">
              <Clock className="w-4 h-4 text-gold-400" />
              <span>{settings.weddingDateFormatted || 'Minggu, 18 Oktober 2026'}</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-900/80 rounded-xl border border-white/10">
              <MapPin className="w-4 h-4 text-gold-400" />
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
          className="group cursor-pointer glass-navy-subtle hover:glass-navy p-5 rounded-2xl border border-gold-500/20 hover:border-gold-500/50 transition duration-300 flex flex-col justify-between"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-gold-600 to-amber-300 text-navy-950 flex items-center justify-center shadow-gold-glow group-hover:scale-105 transition">
              <QrCode className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-semibold text-gold-400 bg-gold-500/10 px-2 py-0.5 rounded-full border border-gold-500/20">
              Dual Mode
            </span>
          </div>
          <div>
            <h3 className="font-serif font-bold text-base text-slate-100 group-hover:text-gold-300 transition">
              Scan Kehadiran
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Check-in barcode/QR mandiri atau lewat meja resepsionis penerima tamu.
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold text-gold-400 mt-4 group-hover:translate-x-1 transition">
            <span>Buka Scanner</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>

        {/* Card 2: Doa & Voice Note */}
        <div
          onClick={() => setActivePage('wishes')}
          className="group cursor-pointer glass-navy-subtle hover:glass-navy p-5 rounded-2xl border border-gold-500/20 hover:border-gold-500/50 transition duration-300 flex flex-col justify-between"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-200 text-navy-950 flex items-center justify-center shadow-gold-glow group-hover:scale-105 transition">
              <MessageSquareHeart className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-semibold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
              Teks & Voice Note
            </span>
          </div>
          <div>
            <h3 className="font-serif font-bold text-base text-slate-100 group-hover:text-gold-300 transition">
              Buku Doa & Ucapan
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Kirim ucapan selamat pernikahan dengan ketikan pesan atau rekaman suara.
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold text-gold-400 mt-4 group-hover:translate-x-1 transition">
            <span>Tulis Doa</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>

        {/* Card 3: Galeri Momen */}
        <div
          onClick={() => setActivePage('moments')}
          className="group cursor-pointer glass-navy-subtle hover:glass-navy p-5 rounded-2xl border border-gold-500/20 hover:border-gold-500/50 transition duration-300 flex flex-col justify-between"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-gold-500 to-amber-200 text-navy-950 flex items-center justify-center shadow-gold-glow group-hover:scale-105 transition">
              <Camera className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-semibold text-gold-300 bg-gold-500/10 px-2 py-0.5 rounded-full border border-gold-500/20">
              Live Feed
            </span>
          </div>
          <div>
            <h3 className="font-serif font-bold text-base text-slate-100 group-hover:text-gold-300 transition">
              Galeri & Momen
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Lihat jepretan fotografer resmi dan bagikan foto selfie Anda saat menghadiri acara.
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold text-gold-400 mt-4 group-hover:translate-x-1 transition">
            <span>Lihat Galeri</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </section>

      {/* Real-time Event Counter Stats */}
      <section className="grid grid-cols-3 gap-3">
        <div className="bg-navy-900/80 border border-white/10 rounded-2xl p-3.5 text-center">
          <div className="flex items-center justify-center gap-1.5 text-gold-400 text-xs mb-1">
            <Users className="w-3.5 h-3.5" />
            <span>Tamu Hadir</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold font-mono text-slate-100">
            {stats.checkedInCount}
          </p>
        </div>

        <div className="bg-navy-900/80 border border-white/10 rounded-2xl p-3.5 text-center">
          <div className="flex items-center justify-center gap-1.5 text-gold-400 text-xs mb-1">
            <Image className="w-3.5 h-3.5" />
            <span>Momen Foto</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold font-mono text-slate-100">
            {stats.momentsCount}
          </p>
        </div>

        <div className="bg-navy-900/80 border border-white/10 rounded-2xl p-3.5 text-center">
          <div className="flex items-center justify-center gap-1.5 text-gold-400 text-xs mb-1">
            <Heart className="w-3.5 h-3.5" />
            <span>Doa Restu</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold font-mono text-slate-100">
            {stats.wishesCount}
          </p>
        </div>
      </section>

      {/* Highlights: Recent Photos from Photographer */}
      {recentMoments.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-gold-400" />
              <h3 className="font-serif font-bold text-base sm:text-lg text-slate-100">
                Jepretan Terbaru Fotografer
              </h3>
            </div>
            <button
              onClick={() => setActivePage('moments')}
              className="text-xs font-semibold text-gold-400 hover:text-gold-300 transition flex items-center gap-1"
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
                className="group relative aspect-square rounded-2xl overflow-hidden border border-gold-500/20 cursor-pointer shadow-lg"
              >
                <img
                  src={m.previewUrl}
                  alt={m.caption}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-transparent to-transparent opacity-80" />
                <div className="absolute bottom-2.5 left-2.5 right-2.5">
                  <span className="text-[10px] font-semibold text-gold-300 bg-navy-900/80 px-2 py-0.5 rounded-full border border-gold-500/30 inline-block mb-1">
                    {m.category}
                  </span>
                  <p className="text-[11px] text-slate-200 line-clamp-1 font-medium">
                    {m.caption}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Projector TV Banner */}
      <section 
        onClick={() => setActivePage('live')}
        className="cursor-pointer glass-gold rounded-2xl p-4 sm:p-5 flex items-center justify-between group hover:border-gold-400 transition"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gold-500 text-navy-950 flex items-center justify-center shrink-0">
            <Tv className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-serif font-bold text-sm sm:text-base text-gold-300 group-hover:text-gold-200">
              Tampilkan di Layar TV / Proyektor Gedung
            </h4>
            <p className="text-xs text-slate-300">
              Live slideshow foto fotografer dan ucapan tamu secara otomatis.
            </p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-gold-400 group-hover:translate-x-1 transition shrink-0" />
      </section>
    </div>
  );
}
