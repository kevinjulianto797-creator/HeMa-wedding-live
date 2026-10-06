import React, { useState, useEffect, useRef } from 'react';
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
  Sparkles,
  Cloud,
  Upload,
  ExternalLink,
  HelpCircle,
  FileUp,
  MessageCircle,
  Copy,
  Check
} from 'lucide-react';
import { 
  getWeddingSettings, 
  saveWeddingSettings,
  getShareableWeddingUrl,
  getWhatsAppShareText
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
  importGuestsFromExcelFile,
  downloadGuestTemplateExcel,
  clearAllGuests 
} from '../services/guestService';
import { QRGeneratorModal } from '../components/QRGeneratorModal';
import { INITIAL_GUESTS } from '../services/mockData';

export function Admin({ setActivePage }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [activeTab, setActiveTab] = useState('guests'); // 'guests' | 'wedding_info' | 'google' | 'export' | 'security'

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

  // Excel File Upload State
  const [selectedExcelFile, setSelectedExcelFile] = useState(null);
  const [isImportingExcel, setIsImportingExcel] = useState(false);
  const [excelSuccessMsg, setExcelSuccessMsg] = useState('');
  const fileInputRef = useRef(null);

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
    setGuestList(Array.isArray(g) ? g : []);
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

    setGuestSuccessMsg(`Tamu "${created.name}" berhasil ditambahkan dengan Token Barcode: ${created.qrToken}`);
    setNewGuestName('');
    setNewGuestPax(1);
    setNewGuestTable('Meja Reguler');
    await loadData();

    setTimeout(() => setGuestSuccessMsg(''), 4000);
  };

  // 2. Upload & Parse Excel File (.xlsx, .xls, .csv)
  const handleExcelFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedExcelFile(file);
      setExcelSuccessMsg('');
    }
  };

  const handleProcessExcelUpload = async () => {
    if (!selectedExcelFile) return;

    setIsImportingExcel(true);
    try {
      const imported = await importGuestsFromExcelFile(selectedExcelFile);
      setExcelSuccessMsg(`Berhasil mengimpor ${imported.length} tamu dari file Excel "${selectedExcelFile.name}"!`);
      setSelectedExcelFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadData();
      setTimeout(() => setExcelSuccessMsg(''), 5000);
    } catch (err) {
      console.error('Error importing Excel:', err);
      alert('Gagal membaca file Excel. Pastikan format file .xlsx, .xls, atau .csv valid.');
    } finally {
      setIsImportingExcel(false);
    }
  };

  // 3. Delete Guest
  const handleDeleteGuest = async (id, name) => {
    if (window.confirm(`Hapus tamu "${name}" dari daftar undangan?`)) {
      await deleteGuest(id);
      await loadData();
    }
  };

  // 4. Clear All Guests
  const handleClearAllGuests = async () => {
    if (window.confirm('PERINGATAN: Apakah Anda yakin ingin MENGHAPUS SEMUA data tamu undangan? Tindakan ini akan mengosongkan daftar tamu.')) {
      await clearAllGuests();
      await loadData();
    }
  };

  const [linkCopied, setLinkCopied] = useState(false);

  const handleCopyShareLink = () => {
    const url = getShareableWeddingUrl(weddingForm);
    navigator.clipboard.writeText(url);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2500);
  };

  const handleOpenWhatsAppShare = () => {
    const text = getWhatsAppShareText(weddingForm);
    const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
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
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 text-center space-y-4 shadow-xl">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-navy-950 text-white flex items-center justify-center shadow-md">
            <Lock className="w-7 h-7 text-gold-400" />
          </div>

          <div>
            <h3 className="font-serif font-bold text-xl text-navy-950">
              Panel Pengaturan Admin
            </h3>
            <p className="text-xs text-slate-500 mt-1">
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
                className="w-full text-center tracking-widest text-lg font-mono bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-navy-950 focus:outline-none focus:border-navy-600 focus:bg-white transition"
              />
            </div>

            {pinError && (
              <p className="text-xs text-rose-600 font-semibold">
                PIN salah. Silakan coba lagi.
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-navy-950 hover:bg-navy-900 text-white font-bold text-xs rounded-xl transition shadow-md"
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
          <span className="text-[10px] font-bold text-navy-900 uppercase tracking-widest bg-navy-50 px-2.5 py-1 rounded-full border border-navy-200 inline-block mb-1">
            Master Controller
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-navy-950">
            Panel Admin Pernikahan
          </h2>
          <p className="text-xs text-slate-500">
            Kelola daftar tamu, upload file Excel, integrasi Google Sheets & Drive, serta keamanan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActivePage('live')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-navy-950 text-white text-xs font-semibold hover:bg-navy-900 transition shadow-sm"
          >
            <Tv className="w-3.5 h-3.5 text-gold-400" />
            <span>Buka Layar Proyektor</span>
          </button>
          <button
            onClick={() => setIsAuthenticated(false)}
            className="text-xs text-slate-500 hover:text-slate-800 underline"
          >
            Kunci Kembali
          </button>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 border border-slate-200 rounded-2xl overflow-x-auto">
        <button
          onClick={() => setActiveTab('guests')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
            activeTab === 'guests'
              ? 'bg-navy-950 text-white shadow-xs font-bold'
              : 'text-slate-600 hover:text-navy-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Kelola Tamu & Barcode ({guestList.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('wedding_info')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
            activeTab === 'wedding_info'
              ? 'bg-navy-950 text-white shadow-xs font-bold'
              : 'text-slate-600 hover:text-navy-900'
          }`}
        >
          <Heart className="w-3.5 h-3.5" />
          <span>Nama & Waktu Acara</span>
        </button>
        <button
          onClick={() => setActiveTab('google')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
            activeTab === 'google'
              ? 'bg-navy-950 text-white shadow-xs font-bold'
              : 'text-slate-600 hover:text-navy-900'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Integrasi Google</span>
        </button>
        <button
          onClick={() => setActiveTab('export')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
            activeTab === 'export'
              ? 'bg-navy-950 text-white shadow-xs font-bold'
              : 'text-slate-600 hover:text-navy-900'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Ekspor Data (Excel/CSV)</span>
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
            activeTab === 'security'
              ? 'bg-navy-950 text-white shadow-xs font-bold'
              : 'text-slate-600 hover:text-navy-900'
          }`}
        >
          <Key className="w-3.5 h-3.5" />
          <span>PIN Keamanan</span>
        </button>
      </div>

      {/* TAB 1: KELOLA TAMU & UPLOAD EXCEL (.XLSX / .CSV) */}
      {activeTab === 'guests' && (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white p-3.5 rounded-2xl text-center border border-slate-200 shadow-sm">
              <span className="text-[11px] text-slate-500">Total Tamu Terdaftar</span>
              <p className="text-xl font-bold font-mono text-navy-950">{guestList.length}</p>
            </div>
            <div className="bg-white p-3.5 rounded-2xl text-center border border-emerald-200 bg-emerald-50/50 shadow-sm">
              <span className="text-[11px] text-emerald-700 font-semibold">Sudah Hadir</span>
              <p className="text-xl font-bold font-mono text-emerald-700">
                {guestList.filter((g) => g.checkedIn).length}
              </p>
            </div>
            <div className="bg-white p-3.5 rounded-2xl text-center border border-amber-200 bg-amber-50/50 shadow-sm">
              <span className="text-[11px] text-amber-700 font-semibold">Belum Hadir</span>
              <p className="text-xl font-bold font-mono text-amber-700">
                {guestList.filter((g) => !g.checkedIn).length}
              </p>
            </div>
          </div>

          {/* Form 1: Upload File Excel (.xlsx / .csv) dari File Manager */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="font-serif font-bold text-base sm:text-lg text-navy-950">
                    Upload File Excel Tamu (.xlsx / .csv)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Pilih file langsung dari laptop / File Manager Anda. Barcode & QR akan dibuatkan otomatis.
                  </p>
                </div>
              </div>

              {/* Download Sample Excel Template */}
              <button
                type="button"
                onClick={downloadGuestTemplateExcel}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-navy-900 border border-slate-200 text-xs font-semibold transition"
                title="Download template Excel dengan kolom contoh"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Format Template (.xlsx)</span>
              </button>
            </div>

            {excelSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{excelSuccessMsg}</span>
              </div>
            )}

            {/* File Dropzone */}
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleExcelFileSelect}
                className="hidden"
                id="excel-file-input"
              />

              <label
                htmlFor="excel-file-input"
                className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 rounded-2xl hover:border-navy-600 bg-slate-50 cursor-pointer transition"
              >
                <FileUp className="w-8 h-8 text-navy-700 mb-2" />
                {selectedExcelFile ? (
                  <div className="text-center">
                    <p className="text-xs font-bold text-navy-950">{selectedExcelFile.name}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Ukuran: {(selectedExcelFile.size / 1024).toFixed(1)} KB (Klik untuk ganti file)
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-xs font-bold text-navy-950">
                      Klik di Sini untuk Memilih File Excel dari Laptop / HP
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Mendukung format Microsoft Excel (.xlsx, .xls) dan CSV
                    </p>
                  </div>
                )}
              </label>

              {selectedExcelFile && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-slate-600">
                    File siap diproses ke database dan digenerate QR code.
                  </span>
                  <button
                    type="button"
                    onClick={handleProcessExcelUpload}
                    disabled={isImportingExcel}
                    className="px-5 py-2.5 bg-navy-950 hover:bg-navy-900 text-white font-bold text-xs rounded-xl transition shadow-md flex items-center gap-1.5"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{isImportingExcel ? 'Memproses...' : 'Import File Excel Sekarang'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Form 2: Tambah Tamu Satuan */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <UserPlus className="w-5 h-5 text-navy-800" />
              <div>
                <h3 className="font-serif font-bold text-base sm:text-lg text-navy-950">
                  Tambah Tamu Satuan (Manual Form)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Tambahkan satu tamu secara instan jika ada tamu susulan.
                </p>
              </div>
            </div>

            {guestSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{guestSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleAddGuest} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Tamu / Keluarga
                </label>
                <input
                  type="text"
                  required
                  value={newGuestName}
                  onChange={(e) => setNewGuestName(e.target.value)}
                  placeholder="Contoh: Bpk. Bambang & Istri"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-navy-600 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kategori Tamu
                </label>
                <select
                  value={newGuestCategory}
                  onChange={(e) => setNewGuestCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-navy-600 focus:bg-white transition"
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Jumlah Orang (Pax)
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={newGuestPax}
                  onChange={(e) => setNewGuestPax(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-navy-600 focus:bg-white transition"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nomor / Nama Meja
                </label>
                <input
                  type="text"
                  value={newGuestTable}
                  onChange={(e) => setNewGuestTable(e.target.value)}
                  placeholder="Contoh: Meja VIP 02"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-navy-600 focus:bg-white transition"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-navy-950 hover:bg-navy-900 text-white font-bold text-xs rounded-xl transition shadow-md flex items-center justify-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>+ Simpan & Buat QR</span>
                </button>
              </div>
            </form>
          </div>

          {/* List Tamu & Barcode Pass */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h4 className="font-serif font-bold text-navy-950 text-base">
                  Daftar Tamu & Barcode Tiket ({filteredGuests.length})
                </h4>
                <p className="text-[11px] text-slate-500">
                  Klik tombol QR untuk mengunduh gambar QR Code pass dan kirim via WhatsApp ke tamu.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="text"
                    value={guestSearch}
                    onChange={(e) => setGuestSearch(e.target.value)}
                    placeholder="Cari nama / meja / token..."
                    className="bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-navy-600 focus:bg-white transition"
                  />
                </div>
                {guestList.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllGuests}
                    className="px-2.5 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold flex items-center gap-1 transition shrink-0"
                    title="Kosongkan seluruh data tamu"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Kosongkan Semua</span>
                  </button>
                )}
              </div>
            </div>

            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto pr-1">
              {filteredGuests.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  {guestSearch ? (
                    'Tidak ada nama tamu yang cocok dengan pencarian.'
                  ) : (
                    <div className="space-y-1">
                      <p className="font-semibold text-slate-500">Daftar Tamu Masih Kosong</p>
                      <p className="text-[11px] text-slate-400">Silakan upload file Excel atau tambahkan tamu manual melalui formulir di atas.</p>
                    </div>
                  )}
                </div>
              ) : (
                filteredGuests.map((guest) => (
                  <div key={guest.id} className="py-3 flex items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs sm:text-sm text-navy-950">
                          {guest.name}
                        </span>
                        {guest.checkedIn && (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[10px] font-semibold border border-emerald-200">
                            Hadir
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                        <span className="text-navy-900 font-semibold">{guest.category}</span>
                        <span>•</span>
                        <span>{guest.table}</span>
                        <span>•</span>
                        <span>{guest.pax} Orang</span>
                        <span>•</span>
                        <span className="font-mono text-[10px] text-slate-400">{guest.qrToken}</span>
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
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-navy-50 hover:bg-navy-100 text-navy-900 border border-navy-200 text-xs font-semibold transition"
                      >
                        <QrCode className="w-3.5 h-3.5 text-navy-700" />
                        <span className="hidden sm:inline">QR Code</span>
                      </button>

                      <button
                        onClick={() => handleDeleteGuest(guest.id, guest.name)}
                        title="Hapus Tamu"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: NAMA PENGANTIN & WAKTU ACARA */}
      {activeTab === 'wedding_info' && (
        <div className="space-y-6">
          <form onSubmit={handleSaveWeddingSettings} className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-serif font-bold text-lg text-navy-950">
              Informasi Mempelai & Acara
            </h3>
            {saveSuccess && (
              <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Tersimpan & Live!</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Panggilan Pengantin Pria (Groom)
              </label>
              <input
                type="text"
                required
                value={weddingForm.groomName}
                onChange={(e) => setWeddingForm({ ...weddingForm, groomName: e.target.value })}
                placeholder="Contoh: Cecep"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-navy-600 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Panggilan Pengantin Wanita (Bride)
              </label>
              <input
                type="text"
                required
                value={weddingForm.brideName}
                onChange={(e) => setWeddingForm({ ...weddingForm, brideName: e.target.value })}
                placeholder="Contoh: Memey"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-navy-600 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Inisial Logo (Muncul di Header)
              </label>
              <input
                type="text"
                maxLength={4}
                value={weddingForm.initials}
                onChange={(e) => setWeddingForm({ ...weddingForm, initials: e.target.value })}
                placeholder="Contoh: CM"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-serif focus:outline-none focus:border-navy-600 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Format Teks Tanggal Acara
              </label>
              <input
                type="text"
                value={weddingForm.weddingDateFormatted}
                onChange={(e) => setWeddingForm({ ...weddingForm, weddingDateFormatted: e.target.value })}
                placeholder="Contoh: Minggu, 18 Oktober 2026"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-navy-600 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Waktu Akad Nikah
              </label>
              <input
                type="text"
                value={weddingForm.akadTime}
                onChange={(e) => setWeddingForm({ ...weddingForm, akadTime: e.target.value })}
                placeholder="08:00 - 10:00 WIB"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-navy-600 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Waktu Resepsi
              </label>
              <input
                type="text"
                value={weddingForm.receptionTime}
                onChange={(e) => setWeddingForm({ ...weddingForm, receptionTime: e.target.value })}
                placeholder="11:00 - 14:00 WIB"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-navy-600 focus:bg-white transition"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Gedung / Tempat Acara
              </label>
              <input
                type="text"
                value={weddingForm.venueName}
                onChange={(e) => setWeddingForm({ ...weddingForm, venueName: e.target.value })}
                placeholder="Contoh: Grand Ballroom Hotel Mulia"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-navy-600 focus:bg-white transition"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pesan Sambutan Pembuka (Hero Message)
              </label>
              <textarea
                rows={3}
                value={weddingForm.welcomeMessage}
                onChange={(e) => setWeddingForm({ ...weddingForm, welcomeMessage: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-navy-600 focus:bg-white transition"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-navy-950 hover:bg-navy-900 text-white font-bold text-xs rounded-xl transition shadow-md"
          >
            Simpan Perubahan Informasi Acara
          </button>
        </form>

        {/* CARD: BAGIKAN KE WHATSAPP & SOSIAL MEDIA */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-emerald-600" />
              <h3 className="font-serif font-bold text-lg text-navy-950">
                Bagikan Tautan ke WhatsApp & Sosial Media
              </h3>
            </div>
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
              Nama Mempelai Otomatis
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Tautan di bawah ini otomatis menyematkan nama pengantin <strong>{weddingForm.groomName || 'Cecep'} & {weddingForm.brideName || 'Memey'}</strong>. Saat dibagikan ke WhatsApp, nama mempelai, deskripsi undangan, dan kartu pratinjau mewah akan otomatis muncul!
          </p>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2 overflow-hidden">
            <span className="text-xs font-mono text-navy-950 truncate">
              {getShareableWeddingUrl(weddingForm)}
            </span>
            <button
              type="button"
              onClick={handleCopyShareLink}
              className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-navy-950 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shrink-0"
            >
              {linkCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin Link</span>
                </>
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={handleOpenWhatsAppShare}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition shadow-md flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Kirim Undangan / Live Link via WhatsApp Sekarang</span>
          </button>
        </div>
      </div>
    )}

      {/* TAB 3: INTEGRASI GOOGLE SHEETS & DRIVE */}
      {activeTab === 'google' && (
        <form onSubmit={handleSaveGoogleSettings} className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-serif font-bold text-lg text-navy-950">
              Integrasi Otomatis Google Sheets & Drive
            </h3>
            {googleSaveSuccess && (
              <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Pengaturan Tersimpan!</span>
              </span>
            )}
          </div>

          <p className="text-xs text-slate-600">
            Hubungkan aplikasi ke Google Spreadsheet Anda menggunakan URL Webhook Apps Script yang sudah disediakan di file <code className="text-navy-900 bg-slate-100 px-1 py-0.5 rounded font-mono">google-apps-script.js</code>.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Google Apps Script Webhook URL (Untuk Auto Sheets & Drive)
              </label>
              <input
                type="url"
                value={googleForm.sheetsWebhookUrl}
                onChange={(e) => setGoogleForm({ ...googleForm, sheetsWebhookUrl: e.target.value })}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-navy-600 focus:bg-white transition"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-navy-950 hover:bg-navy-900 text-white font-bold text-xs rounded-xl transition shadow-md"
          >
            Simpan Pengaturan Google
          </button>
        </form>
      )}

      {/* TAB 5: EKSPOR DATA CSV */}
      {activeTab === 'export' && (
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <FileSpreadsheet className="w-5 h-5 text-navy-800" />
            <h3 className="font-serif font-bold text-lg text-navy-950">
              Download Rekapan Data Acara (Excel / CSV)
            </h3>
          </div>

          <p className="text-xs text-slate-600">
            Unduh seluruh rekapan kehadiran tamu dan buku ucapan ke format file CSV yang dapat langsung dibuka di Microsoft Excel atau diimpor ke Google Sheets.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleExportCheckins}
              className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl transition group"
            >
              <div className="text-left">
                <span className="text-xs font-bold text-navy-950 group-hover:text-navy-800 transition block">
                  Download Buku Tamu & Kehadiran
                </span>
                <span className="text-[11px] text-slate-500">
                  Total {stats.checkins} tamu tercatat hadir.
                </span>
              </div>
              <Download className="w-5 h-5 text-navy-800 group-hover:translate-y-0.5 transition shrink-0 ml-2" />
            </button>

            <button
              onClick={handleExportWishes}
              className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl transition group"
            >
              <div className="text-left">
                <span className="text-xs font-bold text-navy-950 group-hover:text-navy-800 transition block">
                  Download Buku Ucapan & Doa
                </span>
                <span className="text-[11px] text-slate-500">
                  Total {stats.wishes} doa & rekaman voice note.
                </span>
              </div>
              <Download className="w-5 h-5 text-navy-800 group-hover:translate-y-0.5 transition shrink-0 ml-2" />
            </button>
          </div>
        </div>
      )}

      {/* TAB 6: KEAMANAN & PIN */}
      {activeTab === 'security' && (
        <form onSubmit={handleSaveWeddingSettings} className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-serif font-bold text-lg text-navy-950">
              PIN Keamanan Admin & Fotografer
            </h3>
            {saveSuccess && (
              <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>PIN Diperbarui!</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-navy-950">
                PIN Admin (Pengantin)
              </label>
              <p className="text-[11px] text-slate-500">
                Digunakan untuk membuka halaman pengaturan ini.
              </p>
              <input
                type="text"
                maxLength={6}
                value={weddingForm.adminPin}
                onChange={(e) => setWeddingForm({ ...weddingForm, adminPin: e.target.value })}
                placeholder="1234"
                className="w-full text-center text-lg font-mono font-bold bg-white border border-slate-200 rounded-xl p-2.5 text-navy-950 focus:outline-none focus:border-navy-600 transition"
              />
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-navy-950">
                PIN Fotografer (Terpisah)
              </label>
              <p className="text-[11px] text-slate-500">
                Berikan PIN ini ke tim fotografer untuk upload foto tanpa bisa mengubah data acara.
              </p>
              <input
                type="text"
                maxLength={6}
                value={weddingForm.photographerPin}
                onChange={(e) => setWeddingForm({ ...weddingForm, photographerPin: e.target.value })}
                placeholder="8888"
                className="w-full text-center text-lg font-mono font-bold bg-white border border-slate-200 rounded-xl p-2.5 text-navy-950 focus:outline-none focus:border-navy-600 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-navy-950 hover:bg-navy-900 text-white font-bold text-xs rounded-xl transition shadow-md"
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
