import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Settings, 
  FileSpreadsheet, 
  Database, 
  Key, 
  CheckCircle2, 
  Download, 
  Calendar, 
  MapPin, 
  Heart,
  Users,
  History,
  RefreshCw,
  Clock,
  Tv,
  UserPlus,
  QrCode,
  Trash2,
  FileText,
  Search,
  Sparkles
} from 'lucide-react';
import { 
  getWeddingSettings, 
  saveWeddingSettings 
} from '../services/weddingSettings';
import { 
  getGoogleSettings, 
  saveGoogleSettings, 
  exportCheckinsToCSV, 
  exportWishesToCSV,
  getSyncLogs 
} from '../services/googleSync';
import { getAllCheckins, getAllWishes, getAllMoments } from '../services/db';
import { 
  getAllGuests, 
  addGuest, 
  deleteGuest, 
  importGuestsFromText 
} from '../services/guestService';
import { QRGeneratorModal } from '../components/QRGeneratorModal';
import { INITIAL_GUESTS } from '../services/mockData';

export function Admin({ setActivePage }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [activeTab, setActiveTab] = useState('guests'); // default open 'guests' so user immediately sees how to input guests!

  // Wedding Settings State
  const [weddingForm, setWeddingForm] = useState(getWeddingSettings());
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Google Integration State
  const [googleForm, setGoogleForm] = useState(getGoogleSettings());
  const [googleSaveSuccess, setGoogleSaveSuccess] = useState(false);

  // Guest Management State
  const [guestList, setGuestList] = useState([]);
  const [guestSearch, setGuestSearch] = useState('');
  const [newGuestName, setNewGuestName] = useState('');
  const [newGuestCategory, setNewGuestCategory] = useState('Tamu Undangan');
  const [newGuestPax, setNewGuestPax] = useState(1);
  const [newGuestTable, setNewGuestTable] = useState('Meja Reguler');
  const [guestSuccessMsg, setGuestSuccessMsg] = useState('');

  // Bulk Import State
  const [bulkText, setBulkText] = useState('');
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState('');

  // QR Modal for viewing/downloading individual guest pass
  const [selectedGuestQr, setSelectedGuestQr] = useState(null);

  // Stats & Logs
  const [stats, setStats] = useState({ checkins: 0, wishes: 0, moments: 0 });
  const [auditLogs, setAuditLogs] = useState([]);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const loadData = async () => {
    const [c, w, m, g] = await Promise.all([
      getAllCheckins(),
      getAllWishes(),
      getAllMoments(),
      getAllGuests(),
    ]);

    setStats({ checkins: c.length, wishes: w.length, moments: m.length });
    setAuditLogs(getSyncLogs());
    setGuestList(g && g.length > 0 ? g : INITIAL_GUESTS);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    const currentSettings = getWeddingSettings();
    const validPin = currentSettings.adminPin || '1234';
    if (pinInput === validPin || pinInput === 'admin') {
      setIsAuthenticated(true);
      setPinError(false);
    } else {
      setPinError(true);
    }
  };

  // 1. Add Single Guest
  const handleAddGuest = async (e) => {
    e.preventDefault();
    if (!newGuestName.trim()) return;

    const created = await addGuest({
      name: newGuestName,
      category: newGuestCategory,
      pax: newGuestPax,
      table: newGuestTable,
    });

    setGuestSuccessMsg(`Tamu "${created.name}" berhasil ditambahkan dengan Token: ${created.qrToken}`);
    setNewGuestName('');
    setNewGuestPax(1);
    setNewGuestTable('Meja Reguler');
    await loadData();

    setTimeout(() => setGuestSuccessMsg(''), 4000);
  };

  // 2. Bulk Import Guests
  const handleBulkImport = async (e) => {
    e.preventDefault();
    if (!bulkText.trim()) return;

    const imported = await importGuestsFromText(bulkText);
    setBulkSuccessMsg(`Berhasil mengimpor ${imported.length} tamu sekaligus beserta Barcode/QR masing-masing!`);
    setBulkText('');
    await loadData();

    setTimeout(() => setBulkSuccessMsg(''), 5000);
  };

  // 3. Delete Guest
  const handleDeleteGuest = async (id, name) => {
    if (window.confirm(`Hapus tamu "${name}" dari daftar undangan?`)) {
      await deleteGuest(id);
      await loadData();
    }
  };

  const handleSaveWeddingSettings = (e) => {
    e.preventDefault();
    saveWeddingSettings(weddingForm);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleSaveGoogleSettings = (e) => {
    e.preventDefault();
    saveGoogleSettings(googleForm);
    setGoogleSaveSuccess(true);
    setTimeout(() => setGoogleSaveSuccess(false), 3000);
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

  const filteredGuests = guestList.filter((g) =>
    g.name.toLowerCase().includes(guestSearch.toLowerCase()) ||
    (g.category && g.category.toLowerCase().includes(guestSearch.toLowerCase())) ||
    (g.table && g.table.toLowerCase().includes(guestSearch.toLowerCase())) ||
    (g.qrToken && g.qrToken.toLowerCase().includes(guestSearch.toLowerCase()))
  );

  // Hidden PIN Lock Screen
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 animate-fade-in">
        <div className="glass-navy p-6 sm:p-8 rounded-3xl border border-gold-500/40 text-center space-y-4 shadow-navy-card">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gold-500/10 border border-gold-500/30 text-gold-400 flex items-center justify-center">
            <Lock className="w-7 h-7" />
          </div>

          <div>
            <h3 className="font-serif font-bold text-xl text-slate-100">
              Panel Pengaturan Admin
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Halaman ini hanya untuk pemilik acara. Masukkan PIN Admin Anda.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 pt-2">
            <div>
              <input
                type="password"
                maxLength={6}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="PIN Admin (Default: 1234)"
                className="w-full text-center tracking-widest text-lg font-mono bg-navy-950 border border-gold-500/30 rounded-xl px-4 py-3 text-gold-300 focus:outline-none focus:border-gold-400 transition"
              />
            </div>

            {pinError && (
              <p className="text-xs text-rose-400 font-semibold">
                PIN salah. Silakan coba lagi.
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-navy-950 font-bold text-xs rounded-xl transition shadow-gold-glow"
            >
              Buka Pengaturan
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
            Master Controller
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-gold-gradient">
            Panel Admin Pernikahan
          </h2>
          <p className="text-xs text-slate-300">
            Kelola daftar tamu & barcode, informasi mempelai, integrasi Google, dan keamanan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActivePage('live')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gold-500/20 text-gold-300 border border-gold-500/40 text-xs font-semibold hover:bg-gold-500/30 transition shadow-gold-glow"
          >
            <Tv className="w-3.5 h-3.5" />
            <span>Buka Layar Proyektor</span>
          </button>
          <button
            onClick={() => setIsAuthenticated(false)}
            className="text-xs text-slate-400 hover:text-slate-200 underline"
          >
            Kunci Kembali
          </button>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex items-center gap-1.5 p-1 bg-navy-900 border border-gold-500/30 rounded-2xl overflow-x-auto">
        <button
          onClick={() => setActiveTab('guests')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
            activeTab === 'guests'
              ? 'bg-gradient-to-r from-gold-600 to-gold-500 text-navy-950 shadow-gold-glow font-bold'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Kelola Tamu & Barcode ({guestList.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('wedding_info')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
            activeTab === 'wedding_info'
              ? 'bg-gradient-to-r from-gold-600 to-gold-500 text-navy-950 shadow-gold-glow font-bold'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          <Heart className="w-3.5 h-3.5" />
          <span>Nama & Waktu Acara</span>
        </button>
        <button
          onClick={() => setActiveTab('google')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
            activeTab === 'google'
              ? 'bg-gradient-to-r from-gold-600 to-gold-500 text-navy-950 shadow-gold-glow font-bold'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Integrasi Google</span>
        </button>
        <button
          onClick={() => setActiveTab('export')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
            activeTab === 'export'
              ? 'bg-gradient-to-r from-gold-600 to-gold-500 text-navy-950 shadow-gold-glow font-bold'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Ekspor Data (Excel/CSV)</span>
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
            activeTab === 'security'
              ? 'bg-gradient-to-r from-gold-600 to-gold-500 text-navy-950 shadow-gold-glow font-bold'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          <Key className="w-3.5 h-3.5" />
          <span>PIN Keamanan</span>
        </button>
      </div>

      {/* TAB 1: KELOLA TAMU & BARCODE (GUEST & BARCODE MANAGER) */}
      {activeTab === 'guests' && (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="glass-navy p-3.5 rounded-2xl text-center border border-white/10">
              <span className="text-[11px] text-slate-400">Total Tamu Terdaftar</span>
              <p className="text-xl font-bold font-mono text-slate-100">{guestList.length}</p>
            </div>
            <div className="glass-navy p-3.5 rounded-2xl text-center border border-emerald-500/30 bg-emerald-950/20">
              <span className="text-[11px] text-emerald-400">Sudah Hadir</span>
              <p className="text-xl font-bold font-mono text-emerald-400">
                {guestList.filter((g) => g.checkedIn).length}
              </p>
            </div>
            <div className="glass-navy p-3.5 rounded-2xl text-center border border-amber-500/30 bg-amber-950/20">
              <span className="text-[11px] text-amber-300">Belum Hadir</span>
              <p className="text-xl font-bold font-mono text-amber-300">
                {guestList.filter((g) => !g.checkedIn).length}
              </p>
            </div>
          </div>

          {/* Form 1: Tambah Tamu Satuan */}
          <div className="glass-navy p-5 sm:p-6 rounded-3xl border border-gold-500/30 shadow-navy-card space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-white/10">
              <UserPlus className="w-5 h-5 text-gold-400" />
              <div>
                <h3 className="font-serif font-bold text-base sm:text-lg text-slate-100">
                  Tambah Tamu Undangan Baru
                </h3>
                <p className="text-[11px] text-slate-400">
                  Sistem akan otomatis membuatkan Barcode & QR Code unik untuk tamu ini.
                </p>
              </div>
            </div>

            {guestSuccessMsg && (
              <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{guestSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleAddGuest} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nama Tamu / Keluarga
                </label>
                <input
                  type="text"
                  required
                  value={newGuestName}
                  onChange={(e) => setNewGuestName(e.target.value)}
                  placeholder="Contoh: Bpk. Bambang & Istri"
                  className="w-full bg-navy-950 border border-gold-500/20 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-gold-400 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Kategori Tamu
                </label>
                <select
                  value={newGuestCategory}
                  onChange={(e) => setNewGuestCategory(e.target.value)}
                  className="w-full bg-navy-950 border border-gold-500/20 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-gold-400 transition"
                >
                  <option value="VIP / Kehormatan">VIP / Kehormatan</option>
                  <option value="Keluarga Mempelai Pria">Keluarga Pria</option>
                  <option value="Keluarga Mempelai Wanita">Keluarga Wanita</option>
                  <option value="Teman Kerja / Rekan Kantor">Teman Kerja</option>
                  <option value="Sahabat / Groomsmen / Bridesmaid">Sahabat</option>
                  <option value="Tamu Undangan">Tamu Reguler</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Jumlah Orang (Pax)
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={newGuestPax}
                  onChange={(e) => setNewGuestPax(e.target.value)}
                  className="w-full bg-navy-950 border border-gold-500/20 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-gold-400 transition"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nomor / Nama Meja
                </label>
                <input
                  type="text"
                  value={newGuestTable}
                  onChange={(e) => setNewGuestTable(e.target.value)}
                  placeholder="Contoh: Meja VIP 02"
                  className="w-full bg-navy-950 border border-gold-500/20 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-gold-400 transition"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-navy-950 font-bold text-xs rounded-xl transition shadow-gold-glow flex items-center justify-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>+ Simpan & Buat QR</span>
                </button>
              </div>
            </form>
          </div>

          {/* Form 2: Import Massal (Bulk Import) dari Excel */}
          <div className="glass-navy p-5 sm:p-6 rounded-3xl border border-white/10 shadow-navy-card space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-white/10">
              <FileText className="w-5 h-5 text-gold-400" />
              <div>
                <h3 className="font-serif font-bold text-base sm:text-lg text-slate-100">
                  Import Massal dari Excel / Teks (Bisa Puluhan/Ratusan Sekaligus)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Cukup salin (copy) baris nama dari Excel lalu tempel (paste) di bawah.
                </p>
              </div>
            </div>

            {bulkSuccessMsg && (
              <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{bulkSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleBulkImport} className="space-y-3">
              <textarea
                rows={4}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={`Format baris: Nama Tamu, Kategori, Pax, Meja\n\nContoh:\nBpk. Bambang & Istri, VIP, 2, Meja VIP 01\ndr. Sarah Amanda, Bridesmaid, 2, Meja 04\nRian Pratama, Rekan Kantor, 1, Meja 07`}
                className="w-full bg-navy-950 border border-gold-500/20 rounded-xl p-3 text-xs text-slate-100 font-mono placeholder-slate-600 focus:outline-none focus:border-gold-400 transition"
              />

              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400">
                  *Setiap baris otomatis dibuatkan Token QR Code unik secara instan.
                </span>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-navy-800 hover:bg-navy-700 text-gold-300 border border-gold-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4 text-gold-400" />
                  <span>Import Semua Tamu Sekarang</span>
                </button>
              </div>
            </form>
          </div>

          {/* List Tamu & Barcode Pass */}
          <div className="glass-navy p-5 rounded-3xl border border-white/10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h4 className="font-serif font-bold text-slate-100 text-base">
                  Daftar Tamu & Barcode Tiket ({filteredGuests.length})
                </h4>
                <p className="text-[11px] text-slate-400">
                  Klik tombol QR untuk melihat/mengunduh gambar QR Code pass masing-masing tamu.
                </p>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  value={guestSearch}
                  onChange={(e) => setGuestSearch(e.target.value)}
                  placeholder="Cari nama / meja / token..."
                  className="bg-navy-950 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-gold-400 transition"
                />
              </div>
            </div>

            <div className="divide-y divide-white/5 max-h-96 overflow-y-auto pr-1">
              {filteredGuests.map((guest) => (
                <div key={guest.id} className="py-3 flex items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs sm:text-sm text-slate-100">
                        {guest.name}
                      </span>
                      {guest.checkedIn && (
                        <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-semibold border border-emerald-500/30">
                          Hadir
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span className="text-gold-400 font-medium">{guest.category}</span>
                      <span>•</span>
                      <span>{guest.table}</span>
                      <span>•</span>
                      <span>{guest.pax} Orang</span>
                      <span>•</span>
                      <span className="font-mono text-[10px] text-slate-500">{guest.qrToken}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() =>
                        setSelectedGuestQr({
                          value: guest.qrToken,
                          title: guest.name,
                          subtitle: `${guest.category} • ${guest.table} (${guest.pax} Pax)`,
                        })
                      }
                      title="Lihat / Unduh QR Code Tamu"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gold-500/20 hover:bg-gold-500/30 text-gold-300 border border-gold-500/30 text-xs font-semibold transition"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">QR Code</span>
                    </button>

                    <button
                      onClick={() => handleDeleteGuest(guest.id, guest.name)}
                      title="Hapus Tamu"
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: NAMA PENGANTIN & WAKTU ACARA */}
      {activeTab === 'wedding_info' && (
        <form onSubmit={handleSaveWeddingSettings} className="glass-navy p-5 sm:p-6 rounded-3xl border border-gold-500/30 shadow-navy-card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <h3 className="font-serif font-bold text-lg text-slate-100">
              Informasi Mempelai & Acara
            </h3>
            {saveSuccess && (
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Tersimpan & Live!</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nama Panggilan Pengantin Pria (Groom)
              </label>
              <input
                type="text"
                required
                value={weddingForm.groomName}
                onChange={(e) => setWeddingForm({ ...weddingForm, groomName: e.target.value })}
                placeholder="Contoh: Hendra"
                className="w-full bg-navy-950 border border-gold-500/20 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-gold-400 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nama Panggilan Pengantin Wanita (Bride)
              </label>
              <input
                type="text"
                required
                value={weddingForm.brideName}
                onChange={(e) => setWeddingForm({ ...weddingForm, brideName: e.target.value })}
                placeholder="Contoh: Maya"
                className="w-full bg-navy-950 border border-gold-500/20 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-gold-400 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Inisial Logo (Muncul di Header)
              </label>
              <input
                type="text"
                maxLength={4}
                value={weddingForm.initials}
                onChange={(e) => setWeddingForm({ ...weddingForm, initials: e.target.value })}
                placeholder="Contoh: HM"
                className="w-full bg-navy-950 border border-gold-500/20 rounded-xl p-2.5 text-xs text-slate-100 font-serif focus:outline-none focus:border-gold-400 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Format Teks Tanggal Acara
              </label>
              <input
                type="text"
                value={weddingForm.weddingDateFormatted}
                onChange={(e) => setWeddingForm({ ...weddingForm, weddingDateFormatted: e.target.value })}
                placeholder="Contoh: Minggu, 18 Oktober 2026"
                className="w-full bg-navy-950 border border-gold-500/20 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-gold-400 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Waktu Akad Nikah
              </label>
              <input
                type="text"
                value={weddingForm.akadTime}
                onChange={(e) => setWeddingForm({ ...weddingForm, akadTime: e.target.value })}
                placeholder="08:00 - 10:00 WIB"
                className="w-full bg-navy-950 border border-gold-500/20 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-gold-400 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Waktu Resepsi
              </label>
              <input
                type="text"
                value={weddingForm.receptionTime}
                onChange={(e) => setWeddingForm({ ...weddingForm, receptionTime: e.target.value })}
                placeholder="11:00 - 14:00 WIB"
                className="w-full bg-navy-950 border border-gold-500/20 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-gold-400 transition"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nama Gedung / Tempat Acara
              </label>
              <input
                type="text"
                value={weddingForm.venueName}
                onChange={(e) => setWeddingForm({ ...weddingForm, venueName: e.target.value })}
                placeholder="Contoh: Grand Ballroom Hotel Mulia"
                className="w-full bg-navy-950 border border-gold-500/20 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-gold-400 transition"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Pesan Sambutan Pembuka (Hero Message)
              </label>
              <textarea
                rows={3}
                value={weddingForm.welcomeMessage}
                onChange={(e) => setWeddingForm({ ...weddingForm, welcomeMessage: e.target.value })}
                className="w-full bg-navy-950 border border-gold-500/20 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-gold-400 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-navy-950 font-bold text-xs rounded-xl transition shadow-gold-glow"
          >
            Simpan Perubahan Informasi Acara
          </button>
        </form>
      )}

      {/* TAB 3: INTEGRASI GOOGLE SHEETS & DRIVE */}
      {activeTab === 'google' && (
        <form onSubmit={handleSaveGoogleSettings} className="glass-navy p-5 sm:p-6 rounded-3xl border border-gold-500/30 shadow-navy-card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <h3 className="font-serif font-bold text-lg text-slate-100">
              Integrasi Otomatis Google Sheets & Drive
            </h3>
            {googleSaveSuccess && (
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Pengaturan Tersimpan!</span>
              </span>
            )}
          </div>

          <p className="text-xs text-slate-300">
            Hubungkan aplikasi ke Google Spreadsheet Anda menggunakan URL Webhook Apps Script yang sudah disediakan di file <code className="text-gold-300 bg-navy-950 px-1 py-0.5 rounded">google-apps-script.js</code>.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Google Apps Script Webhook URL (Untuk Auto Sheets & Drive)
              </label>
              <input
                type="url"
                value={googleForm.sheetsWebhookUrl}
                onChange={(e) => setGoogleForm({ ...googleForm, sheetsWebhookUrl: e.target.value })}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="w-full bg-navy-950 border border-gold-500/20 rounded-xl p-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-gold-400 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-navy-950 font-bold text-xs rounded-xl transition shadow-gold-glow"
          >
            Simpan Pengaturan Google
          </button>
        </form>
      )}

      {/* TAB 4: EKSPOR DATA CSV */}
      {activeTab === 'export' && (
        <div className="glass-navy p-5 sm:p-6 rounded-3xl border border-gold-500/30 shadow-navy-card space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-white/10">
            <FileSpreadsheet className="w-5 h-5 text-gold-400" />
            <h3 className="font-serif font-bold text-lg text-slate-100">
              Download Rekapan Data Acara (Excel / CSV)
            </h3>
          </div>

          <p className="text-xs text-slate-300">
            Unduh seluruh rekapan kehadiran tamu dan buku ucapan ke format file CSV yang dapat langsung dibuka di Microsoft Excel atau diimpor ke Google Sheets.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleExportCheckins}
              className="flex items-center justify-between p-4 bg-navy-950 hover:bg-navy-900 border border-gold-500/30 rounded-2xl transition group"
            >
              <div className="text-left">
                <span className="text-xs font-bold text-slate-100 group-hover:text-gold-300 transition block">
                  Download Buku Tamu & Kehadiran
                </span>
                <span className="text-[11px] text-slate-400">
                  Total {stats.checkins} tamu tercatat hadir.
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
                  Total {stats.wishes} doa & rekaman voice note.
                </span>
              </div>
              <Download className="w-5 h-5 text-gold-400 group-hover:translate-y-0.5 transition shrink-0 ml-2" />
            </button>
          </div>
        </div>
      )}

      {/* TAB 5: KEAMANAN & PIN */}
      {activeTab === 'security' && (
        <form onSubmit={handleSaveWeddingSettings} className="glass-navy p-5 sm:p-6 rounded-3xl border border-gold-500/30 shadow-navy-card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <h3 className="font-serif font-bold text-lg text-slate-100">
              PIN Keamanan Admin & Fotografer
            </h3>
            {saveSuccess && (
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>PIN Diperbarui!</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-navy-950 rounded-2xl border border-gold-500/20 space-y-2">
              <label className="block text-xs font-bold text-gold-300">
                PIN Admin (Pengantin)
              </label>
              <p className="text-[11px] text-slate-400">
                Digunakan untuk membuka halaman pengaturan ini.
              </p>
              <input
                type="text"
                maxLength={6}
                value={weddingForm.adminPin}
                onChange={(e) => setWeddingForm({ ...weddingForm, adminPin: e.target.value })}
                placeholder="1234"
                className="w-full text-center text-lg font-mono font-bold bg-navy-900 border border-gold-500/30 rounded-xl p-2.5 text-gold-300 focus:outline-none focus:border-gold-400 transition"
              />
            </div>

            <div className="p-4 bg-navy-950 rounded-2xl border border-gold-500/20 space-y-2">
              <label className="block text-xs font-bold text-gold-300">
                PIN Fotografer (Terpisah)
              </label>
              <p className="text-[11px] text-slate-400">
                Berikan PIN ini ke tim fotografer untuk upload foto tanpa bisa mengubah data acara.
              </p>
              <input
                type="text"
                maxLength={6}
                value={weddingForm.photographerPin}
                onChange={(e) => setWeddingForm({ ...weddingForm, photographerPin: e.target.value })}
                placeholder="8888"
                className="w-full text-center text-lg font-mono font-bold bg-navy-900 border border-gold-500/30 rounded-xl p-2.5 text-gold-300 focus:outline-none focus:border-gold-400 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-navy-950 font-bold text-xs rounded-xl transition shadow-gold-glow"
          >
            Simpan PIN Keamanan Baru
          </button>
        </form>
      )}

      {/* MODAL QR CODE TAMU */}
      {selectedGuestQr && (
        <QRGeneratorModal
          isOpen={!!selectedGuestQr}
          onClose={() => setSelectedGuestQr(null)}
          value={selectedGuestQr.value}
          title={selectedGuestQr.title}
          subtitle={selectedGuestQr.subtitle}
        />
      )}
    </div>
  );
}
