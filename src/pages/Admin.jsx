import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Upload, 
  FileSpreadsheet, 
  HardDrive, 
  CheckCircle2, 
  RefreshCw, 
  Sparkles,
  Download,
  AlertCircle,
  Database,
  History
} from 'lucide-react';
import { 
  getGoogleSettings, 
  saveGoogleSettings, 
  exportCheckinsToCSV, 
  exportWishesToCSV,
  getSyncLogs 
} from '../services/googleSync';
import { getAllCheckins, getAllWishes, getAllMoments, saveMoment } from '../services/db';
import { syncService } from '../services/syncService';

export function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  // Settings
  const [settings, setSettings] = useState(getGoogleSettings());
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);

  // Batch upload for photographer
  const [batchPhotos, setBatchPhotos] = useState([]);
  const [photoCategory, setPhotoCategory] = useState('Akad Nikah');
  const [photoCaption, setPhotoCaption] = useState('');
  const [isUploadingBatch, setIsUploadingBatch] = useState(false);
  const [uploadSuccessCount, setUploadSuccessCount] = useState(0);

  const [stats, setStats] = useState({ checkins: 0, wishes: 0, moments: 0 });

  useEffect(() => {
    if (isAuthenticated) {
      loadAdminData();
    }
  }, [isAuthenticated]);

  const loadAdminData = async () => {
    const [c, w, m] = await Promise.all([
      getAllCheckins(),
      getAllWishes(),
      getAllMoments(),
    ]);
    setStats({ checkins: c.length, wishes: w.length, moments: m.length });
    setAuditLogs(getSyncLogs());
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (pinInput === '1234' || pinInput === 'admin') {
      setIsAuthenticated(true);
      setPinError(false);
    } else {
      setPinError(true);
    }
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    saveGoogleSettings(settings);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Export handlers
  const handleExportCheckins = async () => {
    const checkins = await getAllCheckins();
    exportCheckinsToCSV(checkins);
  };

  const handleExportWishes = async () => {
    const wishes = await getAllWishes();
    exportWishesToCSV(wishes);
  };

  // Handle batch photographer photos
  const handleBatchFileSelect = (e) => {
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

  const handleUploadAllBatch = async () => {
    if (batchPhotos.length === 0) return;
    setIsUploadingBatch(true);

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
          likes: 5,
          timestamp: new Date().toISOString(),
          synced: navigator.onLine,
        });
        count++;
      }

      setUploadSuccessCount(count);
      setBatchPhotos([]);
      setPhotoCaption('');
      loadAdminData();
      syncService.syncAll();
      setTimeout(() => setUploadSuccessCount(0), 4000);
    } catch (err) {
      console.error('Batch upload error:', err);
      alert('Gagal mengupload batch foto.');
    } finally {
      setIsUploadingBatch(false);
    }
  };

  // PIN Lock Screen
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto py-12 px-4 animate-fade-in">
        <div className="glass-navy p-6 sm:p-8 rounded-3xl border border-gold-500/40 text-center space-y-4 shadow-navy-card">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gold-500/10 border border-gold-500/30 text-gold-400 flex items-center justify-center">
            <Lock className="w-7 h-7" />
          </div>

          <div>
            <h3 className="font-serif font-bold text-xl text-slate-100">
              Panel Fotografer & Admin
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Masukkan PIN keamanan untuk mengunggah foto master dan mengelola integrasi.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 pt-2">
            <div>
              <input
                type="password"
                maxLength={6}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="Masukkan PIN (Default: 1234)"
                className="w-full text-center tracking-widest text-lg font-mono bg-navy-950 border border-gold-500/30 rounded-xl px-4 py-3 text-gold-300 focus:outline-none focus:border-gold-400 transition"
              />
            </div>

            {pinError && (
              <p className="text-xs text-rose-400 font-semibold">
                PIN salah. Gunakan PIN default: 1234
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-navy-950 font-bold text-xs rounded-xl transition shadow-gold-glow"
            >
              Buka Panel Admin
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 animate-fade-in max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-gold-gradient">
            Panel Fotografer & Admin
          </h2>
          <p className="text-xs sm:text-sm text-slate-300">
            Upload batch foto fotografer, sinkronisasi Google Sheets & Drive, serta ekspor data.
          </p>
        </div>

        <button
          onClick={() => setIsAuthenticated(false)}
          className="text-xs text-slate-400 hover:text-slate-200 underline"
        >
          Kunci Panel
        </button>
      </div>

      {/* SECTION 1: BATCH UPLOAD UNTUK FOTOGRAFER */}
      <div className="glass-navy p-5 sm:p-6 rounded-3xl border border-gold-500/30 shadow-navy-card space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-white/10">
          <Sparkles className="w-5 h-5 text-gold-400" />
          <h3 className="font-serif font-bold text-lg text-slate-100">
            Upload Jepretan Fotografer (Multi-File)
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
              placeholder="Contoh: Momen Bahagia Akad Nikah"
              className="w-full bg-navy-950 border border-gold-500/20 rounded-xl p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-gold-400 transition"
            />
          </div>
        </div>

        {/* Dropzone */}
        <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gold-500/30 rounded-2xl hover:border-gold-500/60 bg-navy-950/40 cursor-pointer transition">
          <Upload className="w-8 h-8 text-gold-400 mb-2" />
          <span className="text-xs font-semibold text-slate-200">
            Pilih Foto Sekaligus dari Laptop / Kamera (Bisa Puluhan Foto)
          </span>
          <span className="text-[10px] text-slate-400 mt-1">
            Format JPEG, PNG, WebP (Original Resolution)
          </span>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleBatchFileSelect}
            className="hidden"
          />
        </label>

        {/* Selected Photos Previews */}
        {batchPhotos.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-gold-300">
                {batchPhotos.length} Foto Siap Di-upload ke Galeri & Layar Proyektor:
              </span>
              <button
                onClick={() => setBatchPhotos([])}
                className="text-rose-400 hover:text-rose-300"
              >
                Hapus Semua Antrean
              </button>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto p-1 bg-navy-950 rounded-xl">
              {batchPhotos.map((p, idx) => (
                <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-white/10">
                  <img src={p.previewUrl} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>

            <button
              onClick={handleUploadAllBatch}
              disabled={isUploadingBatch}
              className="w-full py-3 bg-gradient-to-r from-gold-600 via-gold-500 to-amber-400 hover:from-gold-500 hover:to-gold-300 text-navy-950 font-bold text-xs rounded-xl transition shadow-gold-glow flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              <span>
                {isUploadingBatch ? 'Sedang Mengunggah...' : `Unggah ${batchPhotos.length} Foto Sekarang`}
              </span>
            </button>
          </div>
        )}

        {uploadSuccessCount > 0 && (
          <div className="p-3 bg-emerald-950/70 border border-emerald-500/40 rounded-xl flex items-center gap-2 text-xs text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Berhasil mengunggah {uploadSuccessCount} foto ke Galeri dan Layar Proyektor!</span>
          </div>
        )}
      </div>

      {/* SECTION 2: GOOGLE SHEETS & GOOGLE DRIVE INTEGRATION */}
      <div className="glass-navy p-5 sm:p-6 rounded-3xl border border-gold-500/30 shadow-navy-card space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-white/10">
          <Database className="w-5 h-5 text-gold-400" />
          <h3 className="font-serif font-bold text-lg text-slate-100">
            Integrasi Google Sheets & Google Drive
          </h3>
        </div>

        <p className="text-xs text-slate-300">
          Hubungkan aplikasi ke Google Spreadsheet dan Google Drive milik Anda agar data tamu, ucapan, dan foto ter-backup secara otomatis.
        </p>

        <form onSubmit={handleSaveSettings} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Google Apps Script / Webhook Endpoint (Untuk Auto Sheet)
            </label>
            <input
              type="url"
              value={settings.sheetsWebhookUrl}
              onChange={(e) => setSettings({ ...settings, sheetsWebhookUrl: e.target.value })}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full bg-navy-950 border border-gold-500/20 rounded-xl p-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-gold-400 font-mono transition"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Opsional: Masukkan Webhook URL Google Sheets Anda untuk sync realtime tanpa batas.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Google Drive Backup Folder ID
            </label>
            <input
              type="text"
              value={settings.driveFolderId}
              onChange={(e) => setSettings({ ...settings, driveFolderId: e.target.value })}
              placeholder="FOLDER_HEMA_WEDDING_MOMENTS"
              className="w-full bg-navy-950 border border-gold-500/20 rounded-xl p-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-gold-400 font-mono transition"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="submit"
              className="px-4 py-2 bg-navy-800 hover:bg-navy-700 text-gold-300 text-xs font-semibold rounded-xl border border-gold-500/30 transition"
            >
              Simpan Pengaturan
            </button>

            {saveSuccess && (
              <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Tersimpan!</span>
              </span>
            )}
          </div>
        </form>
      </div>

      {/* SECTION 3: 1-CLICK EXPORT TO EXCEL / SHEETS (CSV) */}
      <div className="glass-navy p-5 sm:p-6 rounded-3xl border border-gold-500/30 shadow-navy-card space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-white/10">
          <FileSpreadsheet className="w-5 h-5 text-gold-400" />
          <h3 className="font-serif font-bold text-lg text-slate-100">
            Ekspor Data Instan (Excel / Google Sheets)
          </h3>
        </div>

        <p className="text-xs text-slate-300">
          Download seluruh rekapan kehadiran tamu dan buku ucapan ke format file CSV yang dapat langsung dibuka di Microsoft Excel atau diimpor ke Google Sheets.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <button
            onClick={handleExportCheckins}
            className="flex items-center justify-between p-4 bg-navy-950 hover:bg-navy-900 border border-gold-500/30 rounded-2xl transition group"
          >
            <div className="text-left">
              <span className="text-xs font-bold text-slate-100 group-hover:text-gold-300 transition block">
                Download Buku Tamu & Kehadiran
              </span>
              <span className="text-[11px] text-slate-400">
                Nama tamu, pax, jam kehadiran, dan metode check-in.
              </span>
            </div>
            <Download className="w-5 h-5 text-gold-400 group-hover:translate-y-0.5 transition shrink-0 ml-2" />
          </button>

          <button
            onClick={handleExportWishes}
            className="flex items-center justify-between p-4 bg-navy-950 hover:bg-navy-900 border border-gold-500/30 rounded-2xl transition group"
          >
            <div className="text-left">
              <span className="text-xs font-bold text-slate-100 group-hover:text-gold-300 transition block">
                Download Buku Ucapan & Doa
              </span>
              <span className="text-[11px] text-slate-400">
                Pesan doa restu, daftar voice note, dan waktu kirim.
              </span>
            </div>
            <Download className="w-5 h-5 text-gold-400 group-hover:translate-y-0.5 transition shrink-0 ml-2" />
          </button>
        </div>
      </div>

      {/* SECTION 4: AUDIT SYNC LOGS */}
      <div className="glass-navy p-5 rounded-3xl border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-gold-400" />
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Aktivitas Sinkronisasi Terkini
            </h4>
          </div>
          <button
            onClick={() => syncService.syncAll()}
            className="flex items-center gap-1 text-[11px] text-gold-400 hover:text-gold-300 font-semibold"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Sync Sekarang</span>
          </button>
        </div>

        <div className="divide-y divide-white/5 max-h-40 overflow-y-auto text-xs font-mono">
          {auditLogs.length > 0 ? (
            auditLogs.map((log) => (
              <div key={log.id} className="py-2 flex items-center justify-between gap-2">
                <span className="text-slate-300 truncate">{log.message}</span>
                <span className="text-[10px] text-slate-500 shrink-0">{log.timestamp}</span>
              </div>
            ))
          ) : (
            <p className="py-4 text-center text-slate-500">Belum ada aktivitas sinkronisasi.</p>
          )}
        </div>
      </div>
    </div>
  );
}
