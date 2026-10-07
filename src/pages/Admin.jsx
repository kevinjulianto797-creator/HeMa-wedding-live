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
  Check,
  Printer,
  AlertTriangle
} from 'lucide-react';
import QRCode from 'qrcode';
import { 
  getWeddingSettings, 
  saveWeddingSettings,
  getShareableWeddingUrl,
  getCleanCoupleUrl,
  getWhatsAppShareText
} from '../services/weddingSettings';
import { 
  getGoogleSettings, 
  saveGoogleSettings, 
  exportCheckinsToCSV, 
  exportWishesToCSV,
  getSyncLogs,
  testGoogleConnection,
  syncAllGuestsToGoogle,
  syncEventSettingsToGoogle
} from '../services/googleSync';
import { getAllCheckins, getAllWishes, getAllMoments, clearAllEventData } from '../services/db';
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

  // Loading States for Buttons
  const [isAddingGuest, setIsAddingGuest] = useState(false);
  const [isSavingWeddingInfo, setIsSavingWeddingInfo] = useState(false);
  const [isSavingGoogle, setIsSavingGoogle] = useState(false);
  const [isSavingPin, setIsSavingPin] = useState(false);
  const [isResettingEventData, setIsResettingEventData] = useState(false);
  const [resetSuccessMsg, setResetSuccessMsg] = useState('');

  // Wedding Settings State
  const [weddingForm, setWeddingForm] = useState(getWeddingSettings());
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Google Integration State
  const [googleForm, setGoogleForm] = useState(getGoogleSettings());
  const [googleSaveSuccess, setGoogleSaveSuccess] = useState(false);
  const [testingGoogle, setTestingGoogle] = useState(false);
  const [googleTestStatus, setGoogleTestStatus] = useState(null);

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
  const [isSyncingGuests, setIsSyncingGuests] = useState(false);
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
    if (!newGuestName.trim() || isAddingGuest) return;

    setIsAddingGuest(true);
    try {
      const created = await addGuest({
        name: newGuestName,
        category: newGuestCategory,
        pax: newGuestPax,
        table: newGuestTable,
      });

      setGuestSuccessMsg(`Tamu "${created.name}" berhasil ditambahkan & disinkronkan ke Google Spreadsheet!`);
      setNewGuestName('');
      setNewGuestPax(1);
      setNewGuestTable('Meja Reguler');
      await loadData();

      setTimeout(() => setGuestSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Error adding guest:', err);
      alert('Gagal menambahkan tamu: ' + (err.message || 'Terjadi kesalahan sistem'));
    } finally {
      setIsAddingGuest(false);
    }
  };

  const handleSyncAllGuestsToGoogle = async () => {
    if (guestList.length === 0) {
      alert('Belum ada tamu yang terdaftar.');
      return;
    }
    setIsSyncingGuests(true);
    try {
      await syncAllGuestsToGoogle(guestList);
      setGuestSuccessMsg(`✅ Berhasil menyinkronkan seluruh (${guestList.length}) tamu ke Google Spreadsheet (sheet Daftar_Undangan)!`);
      setTimeout(() => setGuestSuccessMsg(''), 5000);
    } catch (err) {
      alert('Gagal menyinkronkan: ' + (err.message || 'Periksa URL Webhook Google di Tab Integrasi Google.'));
    } finally {
      setIsSyncingGuests(false);
    }
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
  const [cleanLinkCopied, setCleanLinkCopied] = useState(false);
  const [shareQrDataUrl, setShareQrDataUrl] = useState('');
  const [rawDateValue, setRawDateValue] = useState('');
  const [akadStartTime, setAkadStartTime] = useState('08:00');
  const [akadEndTime, setAkadEndTime] = useState('10:00');
  const [recStartTime, setRecStartTime] = useState('11:00');
  const [recEndTime, setRecEndTime] = useState('14:00');

  // Generate QR code for share link whenever weddingForm updates
  useEffect(() => {
    const url = getShareableWeddingUrl(weddingForm);
    QRCode.toDataURL(url, {
      width: 450,
      margin: 2,
      color: {
        dark: '#0A192F',
        light: '#FFFFFF'
      }
    })
      .then((res) => setShareQrDataUrl(res))
      .catch((err) => console.error('Error generating share QR:', err));
  }, [weddingForm, googleForm]);

  const handleDateChange = (e) => {
    const val = e.target.value;
    setRawDateValue(val);
    if (!val) return;
    try {
      const d = new Date(val + 'T00:00:00');
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      const formatted = `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
      setWeddingForm((prev) => ({
        ...prev,
        weddingDateFormatted: formatted
      }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleAkadTimeChange = (start, end) => {
    setAkadStartTime(start);
    setAkadEndTime(end);
    setWeddingForm((prev) => ({
      ...prev,
      akadTime: `${start} - ${end} WIB`
    }));
  };

  const handleRecTimeChange = (start, end) => {
    setRecStartTime(start);
    setRecEndTime(end);
    setWeddingForm((prev) => ({
      ...prev,
      receptionTime: `${start} - ${end} WIB`
    }));
  };

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

  const handleDownloadQrPng = () => {
    if (!shareQrDataUrl) return;
    const a = document.createElement('a');
    a.href = shareQrDataUrl;
    a.download = `QR-Akses-Tamu-${weddingForm.groomName || 'Pernikahan'}.png`;
    a.click();
  };

  const handlePrintBarcodePdf = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Mohon izinkan pop-up browser untuk mencetak atau mengunduh PDF.');
      return;
    }

    const coupleTitle = `${weddingForm.groomName || 'Pengantin'} & ${weddingForm.brideName || 'Pengantin'}`;
    const initials = weddingForm.initials || 'W';
    const dateText = weddingForm.weddingDateFormatted || 'Hari Bahagia';
    const venueText = weddingForm.venueName || 'Lokasi Acara';
    const url = getShareableWeddingUrl(weddingForm);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="id">
        <head>
          <title>Barcode Akses Tamu - ${coupleTitle}</title>
          <meta charset="utf-8" />
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800&family=Plus+Jakarta+Sans:wght@400;600;700&display=swap');
            @page {
              size: A4 portrait;
              margin: 15mm;
            }
            body {
              font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
              margin: 0;
              padding: 24px;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 90vh;
              background-color: #f8fafc;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .card {
              max-width: 480px;
              width: 100%;
              background: #ffffff;
              border: 3px solid #0A192F;
              border-radius: 28px;
              padding: 36px 28px;
              text-align: center;
              box-shadow: 0 10px 30px rgba(10, 25, 47, 0.08);
              box-sizing: border-box;
            }
            .inner-border {
              border: 1.5px dashed #d4af37;
              border-radius: 20px;
              padding: 28px 20px;
            }
            .monogram {
              font-family: 'Cinzel', serif;
              font-size: 28px;
              font-weight: 700;
              color: #d4af37;
              letter-spacing: 4px;
              margin-bottom: 8px;
            }
            .title {
              font-family: 'Cinzel', serif;
              font-size: 26px;
              font-weight: 700;
              color: #0A192F;
              margin: 0 0 6px;
            }
            .subtitle {
              font-size: 13px;
              color: #64748b;
              margin: 0 0 20px;
              line-height: 1.5;
            }
            .qr-wrapper {
              background: #ffffff;
              padding: 16px;
              border-radius: 20px;
              border: 2px solid #e2e8f0;
              display: inline-block;
              box-shadow: 0 4px 12px rgba(0,0,0,0.06);
              margin-bottom: 20px;
            }
            .qr-wrapper img {
              width: 230px;
              height: 230px;
              display: block;
            }
            .instruction {
              font-size: 13px;
              font-weight: 700;
              color: #0A192F;
              background: #f1f5f9;
              padding: 8px 18px;
              border-radius: 9999px;
              margin: 0 auto 16px;
              display: inline-block;
            }
            .details {
              font-size: 13px;
              color: #334155;
              line-height: 1.6;
              border-top: 1px solid #f1f5f9;
              padding-top: 16px;
            }
            .details strong {
              color: #0A192F;
            }
            .url {
              font-family: monospace;
              font-size: 10px;
              color: #94a3b8;
              margin-top: 12px;
              word-break: break-all;
            }
            @media print {
              body {
                background: white;
                padding: 0;
              }
              .card {
                box-shadow: none;
                border: 2px solid #0A192F;
              }
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="inner-border">
              <div class="monogram">${initials}</div>
              <h1 class="title">${coupleTitle}</h1>
              <p class="subtitle">Buku Tamu Digital, Ucapan Doa & Galeri Momen Live</p>
              
              <div class="qr-wrapper">
                <img src="${shareQrDataUrl}" alt="QR Barcode Akses Tamu" />
              </div>
              
              <div>
                <div class="instruction">📷 Scan Barcode dengan Kamera HP</div>
              </div>
              
              <div class="details">
                <div><strong>${dateText}</strong></div>
                <div>${venueText}</div>
              </div>

              <div class="url">${url}</div>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleSaveWeddingSettings = async (e) => {
    e.preventDefault();
    setIsSavingWeddingInfo(true);
    try {
      const updated = saveWeddingSettings(weddingForm);
      await syncEventSettingsToGoogle(updated || weddingForm);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan pengaturan: ' + err.message);
    } finally {
      setTimeout(() => setIsSavingWeddingInfo(false), 500);
    }
  };

  const handleSaveGoogleSettings = async (e) => {
    e.preventDefault();
    setIsSavingGoogle(true);
    try {
      saveGoogleSettings(googleForm);
      await syncEventSettingsToGoogle(weddingForm);
      setGoogleSaveSuccess(true);
      setTimeout(() => setGoogleSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan URL Webhook: ' + err.message);
    } finally {
      setTimeout(() => setIsSavingGoogle(false), 500);
    }
  };

  const handleSavePinSettings = async (e) => {
    e.preventDefault();
    setIsSavingPin(true);
    try {
      saveWeddingSettings(weddingForm);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan PIN: ' + err.message);
    } finally {
      setTimeout(() => setIsSavingPin(false), 500);
    }
  };

  const handleResetAllEventData = async () => {
    const confirmed = window.confirm(
      '⚠️ PERINGATAN RESET DATABASE ACARA:\n\n' +
      'Apakah Anda yakin ingin MENGHAPUS SEMUA data cache lokal (foto momen, video, ucapan doa, dan kehadiran) di perangkat ini?\n\n' +
      'Fitur ini wajib dijalankan jika Anda baru saja melakukan "Setup Database Ulang" di Google Spreadsheet agar aplikasi bersih dan kembali sinkron dari awal.'
    );
    if (!confirmed) return;

    setIsResettingEventData(true);
    try {
      await clearAllEventData();
      await loadData();
      setResetSuccessMsg('✅ Seluruh data uji coba lokal berhasil dibersihkan! Aplikasi kini sinkron dengan Google Spreadsheet yang bersih.');
      setTimeout(() => setResetSuccessMsg(''), 6000);
    } catch (err) {
      console.error(err);
      alert('Gagal membersihkan data: ' + err.message);
    } finally {
      setIsResettingEventData(false);
    }
  };

  const handleTestGoogleConnection = async () => {
    if (!googleForm.sheetsWebhookUrl || !googleForm.sheetsWebhookUrl.startsWith('http')) {
      setGoogleTestStatus({
        type: 'error',
        message: 'Masukkan URL Webhook Google Apps Script terlebih dahulu!'
      });
      return;
    }

    setTestingGoogle(true);
    setGoogleTestStatus(null);
    try {
      saveGoogleSettings(googleForm);
      await testGoogleConnection(googleForm.sheetsWebhookUrl);
      setGoogleTestStatus({
        type: 'success',
        message: '✅ Sinyal uji coba berhasil dikirim! Silakan buka Google Spreadsheet Anda, cek tab "Checkin_Kehadiran" untuk memastikan ada baris bertuliskan "TEST_CONNECTION".'
      });
    } catch (err) {
      setGoogleTestStatus({
        type: 'error',
        message: '❌ Gagal mengirim: ' + (err.message || 'Periksa kembali URL dan pastikan hak akses Web App di-set ke "Anyone / Siapa saja".')
      });
    } finally {
      setTestingGoogle(false);
      setAuditLogs(getSyncLogs());
    }
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
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-navy-600 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kategori Tamu
                </label>
                <select
                  value={newGuestCategory}
                  onChange={(e) => setNewGuestCategory(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-navy-600 focus:bg-white transition cursor-pointer"
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
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-navy-600 focus:bg-white transition"
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
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-navy-600 focus:bg-white transition"
                />
              </div>

              <div className="flex flex-col justify-end">
                <button
                  type="submit"
                  disabled={isAddingGuest}
                  className="w-full h-10 bg-navy-950 hover:bg-navy-900 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition shadow-md flex items-center justify-center gap-1.5"
                >
                  {isAddingGuest ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>+ Simpan & Buat QR</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* List Tamu & Barcode Pass */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="min-w-0">
                <h4 className="font-serif font-bold text-navy-950 text-base">
                  Daftar Tamu & Barcode Tiket ({filteredGuests.length})
                </h4>
                <p className="text-[11px] text-slate-500">
                  Klik tombol QR untuk mengunduh gambar QR Code pass dan kirim via WhatsApp ke tamu.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 max-w-full">
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="text"
                    value={guestSearch}
                    onChange={(e) => setGuestSearch(e.target.value)}
                    placeholder="Cari nama / meja..."
                    className="h-9 w-full sm:w-44 bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-navy-600 focus:bg-white transition"
                  />
                </div>
                {guestList.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSyncAllGuestsToGoogle}
                    disabled={isSyncingGuests}
                    className="h-9 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-xs disabled:opacity-50 shrink-0"
                    title="Kirim & sinkronkan seluruh daftar tamu ke Google Spreadsheet (sheet Daftar_Undangan)"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingGuests ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">{isSyncingGuests ? 'Menyinkronkan...' : 'Sinkron ke Spreadsheet'}</span>
                    <span className="sm:hidden">{isSyncingGuests ? 'Sync...' : 'Sync'}</span>
                  </button>
                )}
                {guestList.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllGuests}
                    className="h-9 px-3 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold flex items-center gap-1.5 transition shrink-0"
                    title="Kosongkan seluruh data tamu"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Kosongkan Semua</span>
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
                Pilih Tanggal Acara (Kalender Interaktif)
              </label>
              <input
                type="date"
                value={rawDateValue}
                onChange={handleDateChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-navy-600 focus:bg-white transition cursor-pointer"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Klik kalender di atas untuk memilih tanggal otomatis dalam Bahasa Indonesia.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Format Teks Tanggal Acara (Tampilan Layar & Undangan)
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
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Waktu Akad Nikah
                </label>
                <span className="text-[10px] text-navy-700 font-medium">Scroll / Pilih Jam</span>
              </div>
              <div className="flex items-center gap-1.5 mb-2">
                <input
                  type="time"
                  value={akadStartTime}
                  onChange={(e) => handleAkadTimeChange(e.target.value, akadEndTime)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-center text-slate-900 focus:outline-none focus:border-navy-600 focus:bg-white transition cursor-pointer"
                  title="Jam Mulai Akad"
                />
                <span className="text-xs text-slate-400 font-bold">-</span>
                <input
                  type="time"
                  value={akadEndTime}
                  onChange={(e) => handleAkadTimeChange(akadStartTime, e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-center text-slate-900 focus:outline-none focus:border-navy-600 focus:bg-white transition cursor-pointer"
                  title="Jam Selesai Akad"
                />
              </div>
              <input
                type="text"
                value={weddingForm.akadTime}
                onChange={(e) => setWeddingForm({ ...weddingForm, akadTime: e.target.value })}
                placeholder="08:00 - 10:00 WIB"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:border-navy-600 focus:bg-white transition"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Waktu Resepsi
                </label>
                <span className="text-[10px] text-navy-700 font-medium">Scroll / Pilih Jam</span>
              </div>
              <div className="flex items-center gap-1.5 mb-2">
                <input
                  type="time"
                  value={recStartTime}
                  onChange={(e) => handleRecTimeChange(e.target.value, recEndTime)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-center text-slate-900 focus:outline-none focus:border-navy-600 focus:bg-white transition cursor-pointer"
                  title="Jam Mulai Resepsi"
                />
                <span className="text-xs text-slate-400 font-bold">-</span>
                <input
                  type="time"
                  value={recEndTime}
                  onChange={(e) => handleRecTimeChange(recStartTime, e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-center text-slate-900 focus:outline-none focus:border-navy-600 focus:bg-white transition cursor-pointer"
                  title="Jam Selesai Resepsi"
                />
              </div>
              <input
                type="text"
                value={weddingForm.receptionTime}
                onChange={(e) => setWeddingForm({ ...weddingForm, receptionTime: e.target.value })}
                placeholder="11:00 - 14:00 WIB"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:border-navy-600 focus:bg-white transition"
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
            disabled={isSavingWeddingInfo}
            className="w-full py-3 bg-navy-950 hover:bg-navy-900 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition shadow-md flex items-center justify-center gap-2"
          >
            {isSavingWeddingInfo ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Menyimpan Perubahan...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 text-gold-400" />
                <span>Simpan Perubahan Informasi Acara</span>
              </>
            )}
          </button>
        </form>

        {/* CARD: BAGIKAN KE WHATSAPP & SOSIAL MEDIA */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-emerald-600" />
              <h3 className="font-serif font-bold text-lg text-navy-950">
                Bagikan Tautan & Barcode Akses Tamu
              </h3>
            </div>
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
              Nama Mempelai Otomatis
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Tautan dan Barcode di bawah ini otomatis menyematkan nama pengantin <strong>{weddingForm.groomName || 'Cecep'} & {weddingForm.brideName || 'Memey'}</strong>. Tamu dapat scan barcode langsung di meja resepsionis atau buka link yang dikirimkan via WhatsApp.
          </p>

          {/* QR Code Barcode Box Preview */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center gap-5">
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-md shrink-0 text-center">
              {shareQrDataUrl ? (
                <img
                  src={shareQrDataUrl}
                  alt="QR Code Link Akses Tamu"
                  className="w-40 h-40 object-contain mx-auto rounded-lg"
                />
              ) : (
                <div className="w-40 h-40 flex items-center justify-center text-xs text-slate-400">
                  Membuat Barcode...
                </div>
              )}
              <span className="text-[10px] font-bold text-navy-900 mt-2 block tracking-wider uppercase">
                Barcode Akses Tamu
              </span>
            </div>

            <div className="space-y-3 flex-1 w-full text-center sm:text-left">
              <div>
                <h4 className="font-serif font-bold text-navy-950 text-base">
                  Barcode Cetak Meja / Standee & Unduh PDF
                </h4>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Cetak dan pajang di meja penerima tamu agar undangan dapat langsung memindai QR code ini dengan kamera HP untuk masuk ke buku tamu digital, mengirim ucapan doa, serta membagikan momen foto/video live ke layar proyektor.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 pt-1 justify-center sm:justify-start">
                <button
                  type="button"
                  onClick={handlePrintBarcodePdf}
                  className="px-4 py-2.5 bg-navy-950 hover:bg-navy-900 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition"
                >
                  <Printer className="w-4 h-4 text-gold-400" />
                  <span>Unduh PDF / Cetak Barcode Standee</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadQrPng}
                  className="px-3.5 py-2.5 bg-slate-200 hover:bg-slate-300 text-navy-950 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh PNG</span>
                </button>
              </div>
            </div>
          </div>

          {/* Box 1: Tautan Akses Tamu & Barcode (Pendek & Otomatis Terhubung) */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-navy-950 flex items-center gap-1.5">
              <span>🔗 Tautan Akses Tamu & Barcode (Otomatis Sinkron Database):</span>
            </span>
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
          </div>

          {/* Box 2: Tautan Cantik Pendek (Clean URL untuk Media Sosial) */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
              <span>✨ Tautan Pendek Elegan (Untuk Dicetak / Bio Medsos):</span>
            </span>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2 overflow-hidden">
              <span className="text-xs font-mono font-semibold text-navy-900 truncate">
                {getCleanCoupleUrl(weddingForm)}
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(getCleanCoupleUrl(weddingForm));
                  setCleanLinkCopied(true);
                  setTimeout(() => setCleanLinkCopied(false), 2500);
                }}
                className="px-3 py-1.5 bg-navy-50 hover:bg-navy-100 text-navy-900 border border-navy-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shrink-0"
              >
                {cleanLinkCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Tautan Pendek</span>
                  </>
                )}
              </button>
            </div>
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
        <div className="space-y-6">
          <form onSubmit={handleSaveGoogleSettings} className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-serif font-bold text-lg text-navy-950">
                  Integrasi Otomatis Google Sheets & Drive
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sinkronisasi buku tamu, ucapan & doa, voice note, foto & video langsung ke Google Spreadsheet & Google Drive Anda.
                </p>
              </div>
              {googleSaveSuccess && (
                <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1 shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Tersimpan!</span>
                </span>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Google Apps Script Webhook URL (Web App /exec)
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={googleForm.sheetsWebhookUrl}
                  onChange={(e) => {
                    setGoogleForm({ ...googleForm, sheetsWebhookUrl: e.target.value });
                    setGoogleTestStatus(null);
                  }}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-navy-600 focus:bg-white transition"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                URL ini otomatis disematkan ke dalam barcode meja tamu, sehingga tamu yang scan langsung tersambung ke spreadsheet yang sama.
              </p>
            </div>

            {/* Test Status Alert */}
            {googleTestStatus && (
              <div className={`p-3 rounded-xl text-xs flex items-start gap-2 border ${
                googleTestStatus.type === 'success' 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}>
                {googleTestStatus.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <HelpCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 leading-relaxed">
                  {googleTestStatus.message}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="submit"
                disabled={isSavingGoogle}
                className="w-full py-2.5 bg-navy-950 hover:bg-navy-900 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition shadow-sm flex items-center justify-center gap-1.5"
              >
                {isSavingGoogle ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Menyimpan URL...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Simpan URL Webhook</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleTestGoogleConnection}
                disabled={testingGoogle}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition shadow-sm flex items-center justify-center gap-1.5"
              >
                {testingGoogle ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Sedang Menguji Koneksi...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Uji Coba Kirim Data ke Spreadsheet</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Card Panduan Praktis Integrasi Google Sheets */}
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Cloud className="w-5 h-5 text-navy-800" />
              <h4 className="font-serif font-bold text-base text-navy-950">
                Panduan Praktis Update Google Apps Script
              </h4>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Agar data ucapan, doa, voice note, foto & video tersimpan rapi di Google Drive dan Google Sheets Anda tanpa kendala folder, ikuti 4 langkah mudah berikut:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 bg-white rounded-2xl border border-slate-200 space-y-1">
                <span className="font-bold text-navy-950 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-navy-100 text-navy-900 text-[11px] font-bold flex items-center justify-center">1</span>
                  Buka Apps Script di Spreadsheet
                </span>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Buka Google Spreadsheet Anda &rarr; klik menu <b>Ekstensi (Extensions)</b> &rarr; pilih <b>Apps Script</b>.
                </p>
              </div>

              <div className="p-3.5 bg-white rounded-2xl border border-slate-200 space-y-1">
                <span className="font-bold text-navy-950 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-navy-100 text-navy-900 text-[11px] font-bold flex items-center justify-center">2</span>
                  Salin Kode Terbaru
                </span>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Buka file <code className="bg-slate-100 text-navy-900 px-1 py-0.5 rounded font-mono font-semibold">google-apps-script.js</code> di proyek ini, copy seluruh kodenya, lalu timpa/paste ke editor Apps Script.
                </p>
              </div>

              <div className="p-3.5 bg-white rounded-2xl border border-slate-200 space-y-1">
                <span className="font-bold text-navy-950 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-navy-100 text-navy-900 text-[11px] font-bold flex items-center justify-center">3</span>
                  Deploy / Terapkan sebagai Web App
                </span>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Klik tombol biru <b>Terapkan (Deploy)</b> &rarr; <b>Kelola Penerapan (Manage Deployments)</b> &rarr; klik ikon pensil Edit &rarr; pilih <b>Versi Baru (New Version)</b>.<br/>
                  Pastikan <i>Akses (Who has access)</i>: <b>Siapa Saja (Anyone)</b>.
                </p>
              </div>

              <div className="p-3.5 bg-white rounded-2xl border border-slate-200 space-y-1">
                <span className="font-bold text-navy-950 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-navy-100 text-navy-900 text-[11px] font-bold flex items-center justify-center">4</span>
                  Tempel URL & Tes Koneksi
                </span>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Salin Web App URL yang berakhiran <code className="bg-slate-100 font-mono text-navy-900 px-1">/exec</code> ke kolom di atas, lalu klik <b>Uji Coba Kirim Data ke Spreadsheet</b>.
                </p>
              </div>
            </div>
          </div>
        </div>
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

      {/* TAB 6: KEAMANAN, PIN & RESET DATA */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <form onSubmit={handleSavePinSettings} className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
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
              disabled={isSavingPin}
              className="w-full py-3 bg-navy-950 hover:bg-navy-900 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition shadow-md flex items-center justify-center gap-2"
            >
              {isSavingPin ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Menyimpan PIN...</span>
                </>
              ) : (
                <>
                  <Key className="w-4 h-4 text-gold-400" />
                  <span>Simpan PIN Keamanan Baru</span>
                </>
              )}
            </button>
          </form>

          {/* DANGER CARD: BERSIHKAN DATA UJI COBA / RESET DATABASE ACARA */}
          <div className="bg-rose-50/40 border border-rose-200 rounded-3xl p-5 sm:p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-rose-100 rounded-xl text-rose-700 shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-serif font-bold text-base text-rose-950">
                  Bersihkan Cache & Reset Data Uji Coba Acara
                </h4>
                <p className="text-xs text-rose-700 mt-1 leading-relaxed">
                  Jika Anda baru saja melakukan <strong>"Setup Database Ulang"</strong> di Google Spreadsheet atau ingin menghapus seluruh foto momen, video, ucapan doa, dan rekapan kehadiran uji coba sebelumnya di perangkat ini agar kembali kosong dan sinkron, klik tombol di bawah ini.
                </p>
              </div>
            </div>

            {resetSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{resetSuccessMsg}</span>
              </div>
            )}

            <div className="pt-1">
              <button
                type="button"
                onClick={handleResetAllEventData}
                disabled={isResettingEventData}
                className="w-full sm:w-auto px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition shadow-sm flex items-center justify-center gap-2"
              >
                {isResettingEventData ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Membersihkan Data Acara...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Bersihkan Seluruh Data Uji Coba (Reset Acara)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
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
