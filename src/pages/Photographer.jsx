import React, { useState, useEffect } from 'react';
import { 
  Camera, 
  Upload, 
  Sparkles, 
  Lock, 
  Tv, 
  CheckCircle2, 
  Image as ImageIcon,
  Trash2,
  ArrowLeft
} from 'lucide-react';
import { getWeddingSettings } from '../services/weddingSettings';
import { getAllMoments, saveMoment } from '../services/db';
import { syncService } from '../services/syncService';

export function Photographer({ setActivePage }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const settings = getWeddingSettings();

  // Batch upload state
  const [batchPhotos, setBatchPhotos] = useState([]);
  const [photoCategory, setPhotoCategory] = useState('Akad Nikah');
  const [photoCaption, setPhotoCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccessCount, setUploadSuccessCount] = useState(0);

  // Stats
  const [uploadedMoments, setUploadedMoments] = useState([]);

  useEffect(() => {
    if (isAuthenticated) {
      loadPhotographerMoments();
    }
  }, [isAuthenticated]);

  const loadPhotographerMoments = async () => {
    try {
      const all = await getAllMoments();
      const photoOnly = all.filter((m) => m.uploaderRole === 'photographer');
      setUploadedMoments(photoOnly);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    const correctPin = settings.photographerPin || '8888';
    if (pinInput === correctPin || pinInput === '8888') {
      setIsAuthenticated(true);
      setPinError(false);
    } else {
      setPinError(true);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setBatchPhotos((prev) => [
          ...prev,
          {
            file,
            previewUrl: event.target.result,
            caption: photoCaption || file.name.replace(/\.[^/.]+$/, ''),
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleUploadBatch = async () => {
    if (batchPhotos.length === 0) return;
    setIsUploading(true);

    try {
      let count = 0;
      for (const item of batchPhotos) {
        await saveMoment({
          caption: item.caption,
          uploaderName: 'Official Lens Art (Fotografer)',
          uploaderRole: 'photographer',
          type: 'photo',
          category: photoCategory,
          previewUrl: item.previewUrl,
          likes: 0,
          timestamp: new Date().toISOString(),
          synced: navigator.onLine,
        });
        count++;
      }

      setUploadSuccessCount(count);
      setBatchPhotos([]);
      setPhotoCaption('');
      await loadPhotographerMoments();
      syncService.syncAll();
      setTimeout(() => setUploadSuccessCount(0), 4000);
    } catch (err) {
      console.error('Error batch upload:', err);
      alert('Gagal mengupload foto.');
    } finally {
      setIsUploading(false);
    }
  };

  // PIN Screen for Photographer
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto py-12 px-4 animate-fade-in">
        <div className="glass-navy p-6 sm:p-8 rounded-3xl border border-gold-500/40 text-center space-y-4 shadow-navy-card">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-gold-600 via-gold-500 to-amber-300 text-navy-950 flex items-center justify-center shadow-gold-glow">
            <Camera className="w-7 h-7" />
          </div>

          <div>
            <h3 className="font-serif font-bold text-xl text-slate-100">
              Portal Khusus Fotografer
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Masukkan PIN Fotografer untuk upload jepretan kamera ke feed tamu dan layar proyektor.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 pt-2">
            <div>
              <input
                type="password"
                maxLength={6}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="Masukkan PIN (Default: 8888)"
                className="w-full text-center tracking-widest text-lg font-mono bg-navy-950 border border-gold-500/30 rounded-xl px-4 py-3 text-gold-300 focus:outline-none focus:border-gold-400 transition"
              />
            </div>

            {pinError && (
              <p className="text-xs text-rose-400 font-semibold">
                PIN salah. Silakan tanyakan PIN ke pengantin/admin.
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-navy-950 font-bold text-xs rounded-xl transition shadow-gold-glow"
            >
              Masuk Portal Fotografer
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 animate-fade-in max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <span className="text-[10px] font-bold text-gold-400 uppercase tracking-widest bg-gold-500/10 px-2.5 py-1 rounded-full border border-gold-500/20 inline-block mb-1">
            Official Lens Art Team
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-gold-gradient">
            Portal Fotografer Pernikahan
          </h2>
          <p className="text-xs text-slate-300">
            Upload foto pilihan terbaik Anda agar langsung tayang di HP para tamu dan proyektor panggung.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActivePage('live')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gold-500/20 text-gold-300 border border-gold-500/40 text-xs font-semibold hover:bg-gold-500/30 transition"
          >
            <Tv className="w-3.5 h-3.5" />
            <span>Lihat Layar TV Proyektor</span>
          </button>
          <button
            onClick={() => setIsAuthenticated(false)}
            className="px-3 py-1.5 rounded-xl bg-navy-800 text-slate-400 text-xs hover:text-white transition"
          >
            Keluar
          </button>
        </div>
      </div>

      {/* Batch Upload Form */}
      <div className="glass-navy p-5 sm:p-6 rounded-3xl border border-gold-500/30 shadow-navy-card space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-white/10">
          <Sparkles className="w-5 h-5 text-gold-400" />
          <h3 className="font-serif font-bold text-lg text-slate-100">
            Unggah Foto Baru (Bisa Banyak Sekaligus)
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Kategori Momen Acara
            </label>
            <select
              value={photoCategory}
              onChange={(e) => setPhotoCategory(e.target.value)}
              className="w-full bg-navy-950 border border-gold-500/20 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-gold-400 transition"
            >
              <option value="Akad Nikah">Akad Nikah</option>
              <option value="Resepsi">Resepsi</option>
              <option value="Dekorasi & Venue">Dekorasi & Venue</option>
              <option value="Detail Momen">Detail Momen</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Caption Default
            </label>
            <input
              type="text"
              value={photoCaption}
              onChange={(e) => setPhotoCaption(e.target.value)}
              placeholder="Contoh: Senyuman manis kedua mempelai"
              className="w-full bg-navy-950 border border-gold-500/20 rounded-xl p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-gold-400 transition"
            />
          </div>
        </div>

        {/* Dropzone */}
        <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gold-500/30 rounded-2xl hover:border-gold-500/60 bg-navy-950/40 cursor-pointer transition">
          <Upload className="w-9 h-9 text-gold-400 mb-2" />
          <span className="text-xs font-bold text-slate-100">
            Klik untuk Pilih Foto dari Laptop / Memori Kamera (SD Card)
          </span>
          <span className="text-[11px] text-slate-400 mt-1">
            Bisa pilih 1 hingga 50 foto sekaligus (JPG, PNG, WebP)
          </span>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>

        {/* Preview Selected */}
        {batchPhotos.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-gold-300">
                {batchPhotos.length} Foto Siap Di-upload:
              </span>
              <button
                onClick={() => setBatchPhotos([])}
                className="text-rose-400 hover:text-rose-300"
              >
                Hapus Semua Antrean
              </button>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-56 overflow-y-auto p-1 bg-navy-950 rounded-xl">
              {batchPhotos.map((p, idx) => (
                <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-white/10 group">
                  <img src={p.previewUrl} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>

            <button
              onClick={handleUploadBatch}
              disabled={isUploading}
              className="w-full py-3 bg-gradient-to-r from-gold-600 via-gold-500 to-amber-400 hover:from-gold-500 hover:to-gold-300 text-navy-950 font-bold text-xs rounded-xl transition shadow-gold-glow flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              <span>
                {isUploading ? 'Sedang Mengunggah...' : `Unggah ${batchPhotos.length} Foto Sekarang`}
              </span>
            </button>
          </div>
        )}

        {uploadSuccessCount > 0 && (
          <div className="p-3 bg-emerald-950/70 border border-emerald-500/40 rounded-xl flex items-center gap-2 text-xs text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Berhasil mengunggah {uploadSuccessCount} foto! Foto langsung tampil di layar proyektor & HP tamu.</span>
          </div>
        )}
      </div>

      {/* Gallery of Uploaded Photos by Photographer */}
      <div className="glass-navy p-5 rounded-3xl border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-serif font-bold text-slate-100 text-base">
            Foto yang Telah Di-upload ({uploadedMoments.length})
          </h4>
          <span className="text-xs text-gold-400 font-mono">Official Gallery</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-96 overflow-y-auto pr-1">
          {uploadedMoments.map((item) => (
            <div key={item.id} className="relative aspect-square rounded-xl overflow-hidden border border-gold-500/20">
              <img src={item.previewUrl} alt={item.caption} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-transparent to-transparent opacity-80" />
              <div className="absolute bottom-2 left-2 right-2">
                <span className="text-[9px] font-semibold text-gold-300 bg-navy-900/80 px-1.5 py-0.5 rounded">
                  {item.category}
                </span>
                <p className="text-[10px] text-slate-200 truncate mt-0.5">{item.caption}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
