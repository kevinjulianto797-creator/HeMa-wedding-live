import React, { useState, useEffect } from 'react';
import { 
  Camera, 
  Upload, 
  Heart, 
  Download, 
  X, 
  Sparkles, 
  Image as ImageIcon, 
  Video, 
  Share2,
  Filter,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { INITIAL_MOMENTS } from '../services/mockData';
import { getAllMoments, saveMoment, updateMomentLikes } from '../services/db';
import { syncService } from '../services/syncService';

export function Moments() {
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'photographer' | 'guest'
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [moments, setMoments] = useState(INITIAL_MOMENTS);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [lightboxMoment, setLightboxMoment] = useState(null);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Form upload state
  const [uploaderName, setUploaderName] = useState('');
  const [caption, setCaption] = useState('');
  const [category, setCategory] = useState('Selfie Tamu');
  const [previewMedia, setPreviewMedia] = useState(null);
  const [mediaFile, setMediaFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    loadMoments();

    const unsubscribe = syncService.subscribe((status) => {
      setIsOnline(status.isOnline);
    });

    const handleSyncComplete = () => {
      loadMoments();
    };

    window.addEventListener('wedding-sync-completed', handleSyncComplete);

    return () => {
      unsubscribe();
      window.removeEventListener('wedding-sync-completed', handleSyncComplete);
    };
  }, []);

  const loadMoments = async () => {
    try {
      const dbMoments = await getAllMoments();
      // Filter out any unsplash dummy photos
      const realMoments = (dbMoments || []).filter(
        (m) => !m.previewUrl?.includes('images.unsplash.com')
      );
      setMoments(realMoments);
    } catch (e) {
      console.error('Error loading moments:', e);
    }
  };

  // Filter moments
  const filteredMoments = moments.filter((m) => {
    if (activeTab === 'photographer' && m.uploaderRole !== 'photographer') return false;
    if (activeTab === 'guest' && m.uploaderRole !== 'guest') return false;
    if (selectedCategory !== 'Semua' && m.category !== selectedCategory) return false;
    return true;
  });

  const categories = ['Semua', 'Akad Nikah', 'Resepsi', 'Selfie Tamu', 'Dekorasi & Venue', 'Detail Momen'];

  // Handle Like with optimistic update
  const handleLike = async (id, e) => {
    e.stopPropagation();
    try {
      const updatedLikes = await updateMomentLikes(id, 1);
      setMoments((prev) =>
        prev.map((m) => (m.id === id ? { ...m, likes: (m.likes || 0) + 1 } : m))
      );
    } catch (err) {
      console.error('Like error:', err);
    }
  };

  // Handle file select & preview
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setMediaFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewMedia({
        url: event.target.result,
        type: file.type.startsWith('video') ? 'video' : 'photo',
      });
    };
    reader.readAsDataURL(file);
  };

  // Submit Upload
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!previewMedia) {
      alert('Pilih foto atau video terlebih dahulu!');
      return;
    }

    setIsUploading(true);

    try {
      const newMoment = {
        caption: caption || 'Momen Bahagia Bersama Hendra & Maya',
        uploaderName: uploaderName.trim() || 'Tamu Undangan',
        uploaderRole: 'guest',
        type: previewMedia.type,
        category: category,
        previewUrl: previewMedia.url,
        likes: 1,
        timestamp: new Date().toISOString(),
        synced: isOnline,
      };

      await saveMoment(newMoment);
      await loadMoments();

      setIsUploadOpen(false);
      setPreviewMedia(null);
      setMediaFile(null);
      setCaption('');
      setUploaderName('');

      if (isOnline) {
        syncService.syncAll();
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('Gagal mengupload momen.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 animate-fade-in">
      {/* Header & Upload Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-gold-gradient">
            Live Momen & Galeri
          </h2>
          <p className="text-xs sm:text-sm text-slate-300">
            Jepretan resmi fotografer dan kenangan selfie tamu pernikahan.
          </p>
        </div>

        <button
          onClick={() => setIsUploadOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-gold-600 via-gold-500 to-amber-400 hover:from-gold-500 hover:to-gold-300 text-navy-950 font-bold text-xs rounded-xl transition shadow-gold-glow active:scale-95"
        >
          <Camera className="w-4 h-4" />
          <span>Bagikan Foto / Video Saya</span>
        </button>
      </div>

      {/* Tabs: Semua vs Fotografer vs Tamu */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
            activeTab === 'all'
              ? 'bg-gold-500 text-navy-950 shadow-gold-glow'
              : 'bg-navy-900/80 text-slate-300 hover:bg-navy-800'
          }`}
        >
          Semua Momen ({moments.length})
        </button>
        <button
          onClick={() => setActiveTab('photographer')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
            activeTab === 'photographer'
              ? 'bg-gold-500 text-navy-950 shadow-gold-glow'
              : 'bg-navy-900/80 text-gold-300 hover:bg-navy-800 border border-gold-500/20'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Fotografer Resmi ({moments.filter((m) => m.uploaderRole === 'photographer').length})</span>
        </button>
        <button
          onClick={() => setActiveTab('guest')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
            activeTab === 'guest'
              ? 'bg-gold-500 text-navy-950 shadow-gold-glow'
              : 'bg-navy-900/80 text-slate-300 hover:bg-navy-800'
          }`}
        >
          Momen Tamu ({moments.filter((m) => m.uploaderRole === 'guest').length})
        </button>
      </div>

      {/* Category Chips Filter */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-2.5 py-1 rounded-lg text-[11px] whitespace-nowrap transition ${
              selectedCategory === cat
                ? 'bg-gold-500/20 text-gold-300 border border-gold-500/50 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Gallery Grid (Instagram / Pinterest style) */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5">
        {filteredMoments.map((item) => (
          <div
            key={item.id}
            onClick={() => setLightboxMoment(item)}
            className="group relative rounded-2xl overflow-hidden glass-navy border border-gold-500/20 cursor-pointer shadow-lg hover:border-gold-500/50 transition duration-300 aspect-[4/5] flex flex-col justify-end"
          >
            {/* Image / Video preview */}
            <img
              src={item.previewUrl}
              alt={item.caption}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-500"
              loading="lazy"
            />

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-950/30 to-transparent opacity-90" />

            {/* Top Badges */}
            <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
              {item.uploaderRole === 'photographer' ? (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-navy-900/85 border border-gold-400/50 text-gold-300 text-[10px] font-semibold backdrop-blur-sm">
                  <Sparkles className="w-3 h-3 text-gold-400" />
                  <span>Official</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-navy-900/85 border border-white/10 text-slate-300 text-[10px] font-medium backdrop-blur-sm">
                  Tamu
                </span>
              )}

              {/* Offline indicator if not synced */}
              {!item.synced && (
                <span className="px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/40 text-amber-300 text-[10px] font-semibold">
                  Offline
                </span>
              )}
            </div>

            {/* Bottom Content Info */}
            <div className="relative p-3 space-y-1 z-10">
              <p className="text-[11px] font-medium text-slate-100 line-clamp-2 leading-tight">
                {item.caption}
              </p>
              
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-slate-400 font-medium truncate max-w-[100px]">
                  {item.uploaderName}
                </span>

                {/* Like Button */}
                <button
                  onClick={(e) => handleLike(item.id, e)}
                  className="flex items-center gap-1 px-2 py-1 rounded-full bg-navy-900/80 hover:bg-rose-950/60 border border-white/10 text-slate-300 hover:text-rose-400 transition"
                >
                  <Heart className="w-3 h-3 text-rose-400 fill-rose-400" />
                  <span className="text-[10px] font-mono font-bold text-slate-200">
                    {item.likes || 0}
                  </span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredMoments.length === 0 && (
        <div className="text-center py-16 glass-navy rounded-2xl border border-white/10">
          <ImageIcon className="w-10 h-10 text-slate-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-300">Belum ada momen di kategori ini</p>
          <p className="text-xs text-slate-500 mt-1">Jadilah orang pertama yang mengabadikan momen!</p>
        </div>
      )}

      {/* MODAL UPLOAD MOMEN TAMU */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md bg-navy-900 border border-gold-500/40 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-gold-400" />
                <h3 className="font-serif font-bold text-lg text-slate-100">Bagikan Momen</h3>
              </div>
              <button
                onClick={() => setIsUploadOpen(false)}
                className="p-1.5 rounded-full bg-navy-800 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {/* Media Picker / Preview */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Foto atau Video
                </label>
                {previewMedia ? (
                  <div className="relative aspect-video rounded-xl overflow-hidden border border-gold-500/40 bg-navy-950">
                    <img
                      src={previewMedia.url}
                      alt="Preview"
                      className="w-full h-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => setPreviewMedia(null)}
                      className="absolute top-2 right-2 p-1 rounded-full bg-navy-950/80 text-white hover:bg-rose-600 transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gold-500/30 rounded-xl hover:border-gold-500/60 bg-navy-950/50 cursor-pointer transition">
                    <Upload className="w-8 h-8 text-gold-400 mb-2" />
                    <span className="text-xs font-semibold text-slate-200">
                      Pilih dari Galeri atau Kamera HP
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1">
                      Mendukung Foto (JPG, PNG) & Video Pendek
                    </span>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Uploader Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nama Anda
                </label>
                <input
                  type="text"
                  required
                  value={uploaderName}
                  onChange={(e) => setUploaderName(e.target.value)}
                  placeholder="Contoh: Rian & Nisa (Teman Kuliah)"
                  className="w-full bg-navy-950 border border-gold-500/20 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-gold-400 transition"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Kategori Momen
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-navy-950 border border-gold-500/20 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-gold-400 transition"
                >
                  <option value="Selfie Tamu">Selfie Tamu</option>
                  <option value="Akad Nikah">Akad Nikah</option>
                  <option value="Resepsi">Resepsi</option>
                  <option value="Dekorasi & Venue">Dekorasi & Venue</option>
                  <option value="Detail Momen">Detail Momen</option>
                </select>
              </div>

              {/* Caption */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Caption / Pesan Singkat
                </label>
                <textarea
                  rows={2}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Tuliskan cerita singkat momen ini..."
                  className="w-full bg-navy-950 border border-gold-500/20 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-gold-400 transition"
                />
              </div>

              {/* Offline note */}
              {!isOnline && (
                <div className="p-3 bg-amber-950/60 border border-amber-500/40 rounded-xl flex items-center gap-2 text-xs text-amber-200">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    Anda sedang offline. Foto akan disimpan di HP dan terunggah otomatis saat sinyal kembali!
                  </span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isUploading}
                className="w-full py-3 bg-gradient-to-r from-gold-600 via-gold-500 to-amber-400 hover:from-gold-500 hover:to-gold-300 text-navy-950 font-bold text-xs rounded-xl transition shadow-gold-glow flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" />
                <span>{isUploading ? 'Menyimpan...' : 'Bagikan ke Galeri Bersama'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* FULLSCREEN LIGHTBOX MODAL */}
      {lightboxMoment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/95 backdrop-blur-xl p-2 sm:p-6 animate-fade-in">
          <button
            onClick={() => setLightboxMoment(null)}
            className="absolute top-4 right-4 z-50 p-2.5 rounded-full bg-navy-900/80 text-slate-300 hover:text-white border border-white/20 transition"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <img
              src={lightboxMoment.previewUrl}
              alt={lightboxMoment.caption}
              className="max-h-[75vh] w-auto object-contain rounded-2xl shadow-2xl border border-gold-500/30"
            />

            <div className="w-full max-w-xl mt-4 glass-navy p-4 rounded-2xl border border-white/10 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs sm:text-sm font-semibold text-slate-100">
                  {lightboxMoment.caption}
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                  <span className="text-gold-400 font-medium">{lightboxMoment.uploaderName}</span>
                  <span>•</span>
                  <span>{new Date(lightboxMoment.timestamp).toLocaleTimeString('id-ID')}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={lightboxMoment.previewUrl}
                  download="HeMa_Wedding_Moment.jpg"
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-xl bg-navy-800 hover:bg-navy-700 text-gold-400 border border-gold-500/30 transition"
                  title="Unduh Foto Resolusi Asli"
                >
                  <Download className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
