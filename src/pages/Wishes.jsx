import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  MessageSquareHeart, 
  Mic, 
  Send, 
  Sparkles, 
  Clock, 
  Heart, 
  CheckCircle2, 
  AlertCircle, 
  Volume2 
} from 'lucide-react';
import { VoiceRecorder } from '../components/VoiceRecorder';
import { AudioPlayer } from '../components/AudioPlayer';
import { INITIAL_WISHES } from '../services/mockData';
import { getAllWishes, saveWish, markWishSynced } from '../services/db';
import { syncService } from '../services/syncService';
import { syncWishToGoogle } from '../services/googleSync';
import { getWeddingSettings } from '../services/weddingSettings';

export function Wishes() {
  const [weddingSettings] = useState(getWeddingSettings());
  const [wishes, setWishes] = useState(INITIAL_WISHES);
  const [activeFormTab, setActiveFormTab] = useState('text'); // 'text' | 'voice'
  const [senderName, setSenderName] = useState('');
  const [relationship, setRelationship] = useState('Sahabat');
  const [messageText, setMessageText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  const quickEmojis = ['❤️', '💍', '✨', '🎉', '🥂', '🤲', '💐'];

  useEffect(() => {
    loadWishes();

    const unsubscribe = syncService.subscribe((status) => {
      setIsOnline(status.isOnline);
    });

    const handleSyncComplete = () => {
      loadWishes();
    };

    window.addEventListener('wedding-sync-completed', handleSyncComplete);

    return () => {
      unsubscribe();
      window.removeEventListener('wedding-sync-completed', handleSyncComplete);
    };
  }, []);

  const loadWishes = async () => {
    try {
      const dbWishes = await getAllWishes();
      if (dbWishes && dbWishes.length > 0) {
        const merged = [...dbWishes];
        INITIAL_WISHES.forEach((iw) => {
          if (!merged.find((w) => w.id === iw.id)) {
            merged.push(iw);
          }
        });
        setWishes(merged.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
      } else {
        for (const w of INITIAL_WISHES) {
          await saveWish(w);
        }
        setWishes(INITIAL_WISHES);
      }
    } catch (e) {
      console.error('Error loading wishes:', e);
    }
  };

  const triggerWishCelebration = () => {
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#0A192F', '#1E3A8A', '#D4AF37', '#F43F5E'],
    });
  };

  // Submit Text Wish
  const handleTextSubmit = async (e) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    setIsSubmitting(true);
    try {
      const newWish = {
        senderName: senderName.trim() || 'Tamu Undangan',
        relationship,
        message: messageText.trim(),
        type: 'text',
        audioDuration: 0,
        timestamp: new Date().toISOString(),
        synced: false,
      };

      await saveWish(newWish);
      await loadWishes();

      setMessageText('');
      setSenderName('');
      triggerWishCelebration();

      // Kirim langsung ke Google Sheets & Drive
      syncWishToGoogle(newWish)
        .then(() => markWishSynced(newWish.id))
        .catch((err) => console.warn('Direct wish sync failed, will retry:', err));

      if (isOnline) {
        syncService.syncAll();
      }
    } catch (err) {
      console.error('Submit wish error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Voice Note Wish
  const handleVoiceRecordingComplete = async ({ audioBlob, audioDuration }) => {
    try {
      const newWish = {
        senderName: senderName.trim() || 'Tamu Undangan (Suara)',
        relationship,
        message: 'Mengirimkan doa melalui rekaman suara (Voice Note)',
        type: 'voice',
        audioBlob,
        audioDuration,
        timestamp: new Date().toISOString(),
        synced: false,
      };

      await saveWish(newWish);
      await loadWishes();

      setSenderName('');
      setActiveFormTab('text');
      triggerWishCelebration();

      // Kirim langsung ke Google Sheets & Drive
      syncWishToGoogle(newWish)
        .then(() => markWishSynced(newWish.id))
        .catch((err) => console.warn('Direct voice note sync failed, will retry:', err));

      if (isOnline) {
        syncService.syncAll();
      }
    } catch (err) {
      console.error('Submit voice note error:', err);
      alert('Gagal menyimpan voice note.');
    }
  };

  return (
    <div className="space-y-6 pb-24 animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-navy-950">
          Buku Tamu & Doa Restu
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
          Tinggalkan ucapan selamat, doa terbaik, atau rekam suara Anda untuk kedua mempelai.
        </p>
      </div>

      {/* Form Container (White Card with Navy Accent) */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm">
        {/* Toggle between Text and Voice */}
        <div className="flex p-1 bg-slate-100 rounded-2xl border border-slate-200 mb-5">
          <button
            type="button"
            onClick={() => setActiveFormTab('text')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeFormTab === 'text'
                ? 'bg-navy-950 text-white shadow-sm font-bold'
                : 'text-slate-600 hover:text-navy-900'
            }`}
          >
            <MessageSquareHeart className="w-4 h-4" />
            <span>Ketik Pesan Teks</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFormTab('voice')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeFormTab === 'voice'
                ? 'bg-navy-950 text-white shadow-sm font-bold'
                : 'text-slate-600 hover:text-navy-900'
            }`}
          >
            <Mic className="w-4 h-4" />
            <span>Rekam Voice Note</span>
          </button>
        </div>

        {/* Sender Name & Relationship Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nama Anda (Opsional)
            </label>
            <input
              type="text"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="Contoh: Budi Santoso (Kosongkan untuk Tamu Undangan)"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-navy-600 focus:bg-white transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Hubungan / Kategori
            </label>
            <select
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-navy-600 focus:bg-white transition"
            >
              <option value="Sahabat">Sahabat</option>
              <option value="Keluarga Mempelai Pria">Keluarga Mempelai Pria</option>
              <option value="Keluarga Mempelai Wanita">Keluarga Mempelai Wanita</option>
              <option value="Teman Kerja / Rekan Kantor">Teman Kerja / Rekan Kantor</option>
              <option value="Teman Kuliah / Sekolah">Teman Kuliah / Sekolah</option>
              <option value="Tamu Kehormatan">Tamu Kehormatan</option>
            </select>
          </div>
        </div>

        {/* Form: Text Wishes */}
        {activeFormTab === 'text' && (
          <form onSubmit={handleTextSubmit} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Untaian Doa & Ucapan Selamat
                </label>
                {/* Emoji Quick Picker */}
                <div className="flex items-center gap-1">
                  {quickEmojis.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setMessageText((prev) => prev + emoji)}
                      className="text-sm hover:scale-125 transition"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                required
                rows={3}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder={`Tuliskan doa terbaik untuk pernikahan ${weddingSettings.coupleTitle || 'kedua mempelai'}...`}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-navy-600 focus:bg-white transition"
              />
            </div>

            {!isOnline && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-800">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Sinyal offline. Ucapan akan disimpan di memori HP dan otomatis terkirim saat online.
                </span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-gradient-to-r from-navy-950 via-navy-900 to-navy-950 hover:brightness-110 text-white font-bold text-xs rounded-xl transition shadow-md flex items-center justify-center gap-2 active:scale-95"
            >
              <Send className="w-4 h-4 text-gold-400" />
              <span>{isSubmitting ? 'Mengirim...' : 'Kirim Doa Restu'}</span>
            </button>
          </form>
        )}

        {/* Form: Voice Note Recording */}
        {activeFormTab === 'voice' && (
          <VoiceRecorder
            onRecordingComplete={handleVoiceRecordingComplete}
            onCancel={() => setActiveFormTab('text')}
          />
        )}
      </div>

      {/* Feed of Wishes */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-navy-800" />
            <h3 className="font-serif font-bold text-lg text-navy-950">
              Doa & Pesan Tamu ({wishes.length})
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">Live Update</span>
        </div>

        <div className="space-y-3">
          {wishes.map((item) => (
            <div
              key={item.id}
              className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition space-y-2.5"
            >
              {/* Header: Sender and Relationship */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-semibold text-xs sm:text-sm text-navy-950 flex items-center gap-1.5">
                    <span>{item.senderName}</span>
                    {item.type === 'voice' && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-navy-100 text-navy-800 text-[10px] font-mono">
                        <Volume2 className="w-3 h-3" />
                        <span>Voice Note</span>
                      </span>
                    )}
                  </h4>
                  <p className="text-[11px] text-navy-700 font-medium">
                    {item.relationship}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono shrink-0">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>
                    {item.timestamp
                      ? new Date(item.timestamp).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Baru saja'}
                  </span>
                </div>
              </div>

              {/* Message Content */}
              {item.type === 'voice' ? (
                <div className="pt-1">
                  <AudioPlayer
                    audioBlob={item.audioBlob}
                    audioDuration={item.audioDuration || 15}
                    isDemo={item.audioSampleType === 'demo'}
                  />
                  {item.message && (
                    <p className="text-xs text-slate-600 mt-2 italic font-serif">
                      "{item.message}"
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-serif">
                  "{item.message}"
                </p>
              )}

              {/* Offline indicator if queued */}
              {!item.synced && (
                <div className="pt-1 flex items-center justify-end">
                  <span className="text-[10px] text-amber-700 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    <span>Tersimpan di perangkat (Offline)</span>
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
