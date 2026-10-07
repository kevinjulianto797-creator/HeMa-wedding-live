import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  QrCode, 
  Search, 
  CheckCircle2, 
  UserCheck, 
  Users, 
  Camera, 
  Share2, 
  Download,
  AlertCircle,
  Clock,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { QRScannerModal } from '../components/QRScannerModal';
import { QRGeneratorModal } from '../components/QRGeneratorModal';
import { INITIAL_GUESTS } from '../services/mockData';
import { saveCheckin, getAllCheckins, setAppState, getAppState, markCheckinSynced } from '../services/db';
import { syncService } from '../services/syncService';
import { syncCheckinToGoogle } from '../services/googleSync';
import { getAllGuests, addGuest } from '../services/guestService';

export function CheckIn() {
  const [activeTab, setActiveTab] = useState('self'); // Default Mode 1: 'self' (Tamu Mandiri) | Mode 2: 'receptionist' (Panitia)
  const [guests, setGuests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [qrModalData, setQrModalData] = useState(null); // for generating QR pass
  const [successGuest, setSuccessGuest] = useState(null);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Modal & Form State untuk Tamu Baru Mandiri (yang belum ada di list Excel)
  const [isSelfNewGuestOpen, setIsSelfNewGuestOpen] = useState(false);
  const [selfNewName, setSelfNewName] = useState('');
  const [selfNewPax, setSelfNewPax] = useState(1);

  // Load guests and checkins from IndexedDB / guestService
  useEffect(() => {
    const loadCheckins = async () => {
      try {
        const saved = await getAllGuests();
        const checkins = await getAllCheckins();
        
        let currentGuests = Array.isArray(saved) ? saved : [];
        
        // Merge checkedIn state
        currentGuests = currentGuests.map(g => {
          const matched = checkins.find(c => c.guestId === g.id || c.guestName === g.name);
          if (matched) {
            return {
              ...g,
              checkedIn: true,
              checkedInAt: matched.timestamp,
              checkedInBy: matched.checkedInBy
            };
          }
          return g;
        });

        setGuests(currentGuests);
      } catch (e) {
        console.error('Error loading checkins:', e);
      }
    };

    loadCheckins();
    window.addEventListener('wedding-guests-updated', loadCheckins);

    const unsubscribe = syncService.subscribe((status) => {
      setIsOnline(status.isOnline);
    });

    return () => {
      window.removeEventListener('wedding-guests-updated', loadCheckins);
      unsubscribe();
    };
  }, []);

  // Filtered guests
  const filteredGuests = guests.filter(g => 
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (g.category && g.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (g.qrToken && g.qrToken.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalGuests = guests.length;
  const arrivedCount = guests.filter(g => g.checkedIn).length;

  const triggerCelebration = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#0A192F', '#1E3A8A', '#D4AF37', '#10B981']
    });
  };

  // Perform Check-in
  const handleCheckInGuest = async (guest, method = 'scanner') => {
    const updated = {
      ...guest,
      checkedIn: true,
      checkedInAt: new Date().toISOString(),
      checkedInBy: method === 'scanner' ? 'Scan Barcode' : 'Manual Panitia'
    };

    const checkinPayload = {
      guestId: guest.id,
      guestName: guest.name,
      pax: guest.pax || 1,
      category: guest.category,
      timestamp: updated.checkedInAt,
      checkedInBy: updated.checkedInBy,
      synced: false,
    };

    // Save to IndexedDB (Works online AND offline!)
    const savedCheckin = await saveCheckin(checkinPayload);

    const newGuestList = guests.map(g => g.id === guest.id ? updated : g);
    setGuests(newGuestList);
    await setAppState('guest_list', newGuestList);

    setSuccessGuest(updated);
    triggerCelebration();

    // Kirim langsung ke Google Sheets jika online
    if (isOnline) {
      try {
        await syncCheckinToGoogle(savedCheckin);
        await markCheckinSynced(savedCheckin.id);
      } catch (err) {
        console.warn('Direct checkin sync failed, will retry in background:', err);
      }
    }
  };

  // Submit Self New Guest (jika nama belum terdaftar di Excel)
  const handleSelfNewGuestSubmit = async (e) => {
    e.preventDefault();
    if (!selfNewName.trim()) return;

    try {
      const created = await addGuest({
        name: selfNewName.trim(),
        category: 'Tamu Undangan',
        pax: selfNewPax || 1,
        table: 'Meja Reguler',
      });

      const updatedList = [created, ...guests];
      setGuests(updatedList);
      setIsSelfNewGuestOpen(false);
      setSelfNewName('');
      setSelfNewPax(1);

      await handleCheckInGuest(created, 'self');
    } catch (err) {
      console.error('Error adding self guest:', err);
    }
  };

  // When QR is decoded from camera scanner
  const handleScanSuccess = (decodedText) => {
    setIsScannerOpen(false);
    
    // Look up guest by qrToken or id
    const found = guests.find(g => 
      g.qrToken === decodedText || 
      g.id === decodedText || 
      decodedText.includes(g.id)
    );

    if (found) {
      handleCheckInGuest(found, 'scanner');
    } else {
      // Unrecognized QR
      alert(`QR Code terdeteksi: "${decodedText}", namun tidak ditemukan dalam daftar undangan.`);
    }
  };

  return (
    <div className="space-y-6 pb-24 animate-fade-in">
      {/* Title & Tabs */}
      <div className="text-center space-y-2">
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-navy-950">
          Check-in Kehadiran Tamu
        </h2>
        <p className="text-xs sm:text-sm text-slate-500">
          Sistem absensi barcode cerdas dengan dukungan mode online dan offline.
        </p>

        {/* Tab Selector */}
        <div className="inline-flex p-1 bg-slate-100 border border-slate-200 rounded-2xl mt-2">
          <button
            onClick={() => setActiveTab('self')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'self'
                ? 'bg-navy-950 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-navy-900'
            }`}
          >
            Mode 1: Tamu Mandiri
          </button>
          <button
            onClick={() => setActiveTab('receptionist')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'receptionist'
                ? 'bg-navy-950 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-navy-900'
            }`}
          >
            Mode 2: Panitia / Resepsionis
          </button>
        </div>
      </div>

      {/* Attendance Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white p-3.5 rounded-2xl text-center border border-slate-200 shadow-sm">
          <span className="text-[11px] text-slate-500 font-medium">Total Tamu</span>
          <p className="text-lg sm:text-2xl font-bold font-mono text-navy-950">{totalGuests}</p>
        </div>
        <div className="bg-emerald-50 p-3.5 rounded-2xl text-center border border-emerald-200">
          <span className="text-[11px] text-emerald-700 font-semibold">Sudah Hadir</span>
          <p className="text-lg sm:text-2xl font-bold font-mono text-emerald-800">{arrivedCount}</p>
        </div>
        <div className="bg-amber-50 p-3.5 rounded-2xl text-center border border-amber-200">
          <span className="text-[11px] text-amber-700 font-semibold">Belum Hadir</span>
          <p className="text-lg sm:text-2xl font-bold font-mono text-amber-800">
            {totalGuests - arrivedCount}
          </p>
        </div>
      </div>

      {/* MODE 1: PANITIA / RESEPSIONIS */}
      {activeTab === 'receptionist' && (
        <div className="space-y-4">
          {/* Main Action: Open Camera Scanner */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center space-y-4 shadow-sm">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-navy-950 text-white flex items-center justify-center shadow-md">
              <Camera className="w-7 h-7 text-gold-400" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-navy-950">
                Scan Barcode / QR Undangan Tamu
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Arahkan kamera HP panitia ke QR code pada kartu fisik atau layar HP tamu untuk absensi otomatis.
              </p>
            </div>
            <button
              onClick={() => setIsScannerOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-navy-950 via-navy-900 to-navy-950 hover:brightness-110 text-white font-bold text-sm rounded-xl transition shadow-md active:scale-95"
            >
              <QrCode className="w-5 h-5 text-gold-400" />
              <span>Buka Kamera Scanner</span>
            </button>
          </div>

          {/* Fallback Search Input */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-navy-900 uppercase tracking-wider">
                Atau Cari Nama Tamu (Manual)
              </h4>
              <span className="text-[11px] text-slate-500 font-mono">
                {filteredGuests.length} ditemukan
              </span>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ketik nama tamu / kategori / meja..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-navy-600 focus:bg-white transition"
              />
            </div>

            {/* Guest List Items */}
            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto pr-1">
              {filteredGuests.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  {searchQuery ? (
                    'Tidak ditemukan nama tamu yang cocok dengan pencarian.'
                  ) : (
                    <div className="space-y-1">
                      <p className="font-semibold text-slate-500">Daftar Tamu Masih Kosong</p>
                      <p className="text-[11px] text-slate-400">Silakan tambahkan tamu melalui menu Admin atau upload file Excel tamu.</p>
                    </div>
                  )}
                </div>
              ) : (
                filteredGuests.map((guest) => (
                  <div
                    key={guest.id}
                    className="py-3 flex items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-xs sm:text-sm text-navy-950">
                          {guest.name}
                        </p>
                        {guest.checkedIn && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-semibold">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Hadir</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <span className="text-navy-700 font-medium">{guest.category}</span>
                        <span>•</span>
                        <span>{guest.table}</span>
                        <span>•</span>
                        <span>{guest.pax} Orang</span>
                      </div>
                    </div>

                    {/* Action button */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* View QR Pass */}
                      <button
                        onClick={() =>
                          setQrModalData({
                            value: guest.qrToken,
                            title: guest.name,
                            subtitle: `${guest.category} • ${guest.table}`,
                          })
                        }
                        title="Lihat QR Code Tiket"
                        className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-navy-900 border border-slate-200 transition"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>

                      {/* Check-in button */}
                      {!guest.checkedIn ? (
                        <button
                          onClick={() => handleCheckInGuest(guest, 'manual')}
                          className="px-3 py-1.5 bg-navy-950 hover:bg-navy-900 text-white rounded-lg text-xs font-semibold transition shadow-xs"
                        >
                          Tandai Hadir
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-500 font-mono">
                          {guest.checkedInAt
                            ? new Date(guest.checkedInAt).toLocaleTimeString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'Hadir'}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODE 1: TAMU MANDIRI (SELF CHECK-IN) */}
      {activeTab === 'self' && (
        <div className="space-y-4">
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="text-center space-y-1">
              <span className="text-[10px] font-bold text-navy-900 uppercase tracking-widest bg-navy-50 px-2.5 py-1 rounded-full border border-navy-200 inline-block mb-1">
                Buku Tamu Digital Mandiri
              </span>
              <h3 className="font-serif font-bold text-xl text-navy-950">
                Cari & Konfirmasi Nama Anda
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Ketik nama Anda di bawah ini, lalu klik tombol konfirmasi kehadiran.
              </p>
            </div>

            {/* Search Input Box */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ketik nama Anda (Contoh: Budi, Agus, Sisca...)"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-navy-600 focus:bg-white shadow-inner transition"
              />
            </div>

            {/* List Tamu Hasil Pencarian */}
            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto pr-1">
              {filteredGuests.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs space-y-3">
                  <p className="text-slate-500 font-semibold">
                    {searchQuery ? `Nama "${searchQuery}" belum ada di daftar undangan.` : 'Belum ada daftar tamu undangan.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelfNewName(searchQuery);
                      setIsSelfNewGuestOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-navy-950 hover:bg-navy-900 text-white rounded-xl text-xs font-bold transition shadow-md"
                  >
                    <span>+ Tulis Nama Saya & Check-in Langsung</span>
                  </button>
                </div>
              ) : (
                filteredGuests.map((guest) => (
                  <div key={guest.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <p className="font-bold text-sm text-navy-950">{guest.name}</p>
                      <p className="text-[11px] text-slate-500">
                        {guest.category} • {guest.table} • {guest.pax} Orang
                      </p>
                    </div>

                    {!guest.checkedIn ? (
                      <button
                        onClick={() => handleCheckInGuest(guest, 'self')}
                        className="px-4 py-2 bg-navy-950 hover:bg-navy-900 text-white font-bold text-xs rounded-xl transition shadow-md active:scale-95 shrink-0"
                      >
                        Ini Saya, Konfirmasi Hadir
                      </button>
                    ) : (
                      <span className="text-xs text-emerald-700 font-bold flex items-center gap-1 shrink-0 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Sudah Hadir</span>
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Tombol Tambahan */}
            <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setIsSelfNewGuestOpen(true)}
                className="text-xs text-navy-900 hover:text-navy-700 font-semibold underline"
              >
                + Nama Anda Belum Terdaftar? Klik di Sini
              </button>

              <button
                type="button"
                onClick={() => setIsScannerOpen(true)}
                className="text-xs text-slate-500 hover:text-navy-900 flex items-center gap-1"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Punya kartu tiket QR? Scan di sini</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Tambah Tamu Baru di Mode Mandiri */}
      {isSelfNewGuestOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/70 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4">
            <div>
              <h3 className="font-serif font-bold text-lg text-navy-950">
                Check-in Tamu Baru
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Masukkan nama Anda untuk langsung konfirmasi kehadiran di buku tamu.
              </p>
            </div>

            <form onSubmit={handleSelfNewGuestSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Anda / Keluarga
                </label>
                <input
                  type="text"
                  required
                  value={selfNewName}
                  onChange={(e) => setSelfNewName(e.target.value)}
                  placeholder="Contoh: Budi Santoso & Istri"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-navy-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Jumlah Orang (Pax)
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={selfNewPax}
                  onChange={(e) => setSelfNewPax(Number(e.target.value) || 1)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-navy-600 focus:bg-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSelfNewGuestOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-navy-950 hover:bg-navy-900 text-white font-bold text-xs rounded-xl shadow-md"
                >
                  Konfirmasi Hadir
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Modal Confirmation */}
      {successGuest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/70 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 border-2 border-emerald-400 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <span className="text-xs uppercase tracking-widest text-navy-800 font-bold">
                Check-in Berhasil!
              </span>
              <h3 className="font-serif font-bold text-xl text-slate-700 mt-1">
                Selamat Datang,
              </h3>
              <p className="font-serif font-bold text-2xl text-navy-950 mt-0.5">
                {successGuest.name}
              </p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Kategori:</span>
                <span className="font-semibold text-navy-950">{successGuest.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Meja Tamu:</span>
                <span className="font-semibold text-navy-950">{successGuest.table}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Waktu Hadir:</span>
                <span className="font-mono text-navy-950">
                  {new Date(successGuest.checkedInAt).toLocaleTimeString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200">
                <span className="text-slate-500">Status Sinyal:</span>
                <span className={`font-semibold ${isOnline ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {isOnline ? 'Tersinkronisasi Online' : 'Tersimpan di Perangkat (Offline)'}
                </span>
              </div>
            </div>

            <button
              onClick={() => setSuccessGuest(null)}
              className="w-full py-3 bg-navy-950 hover:bg-navy-900 text-white font-bold text-xs rounded-xl transition shadow-md"
            >
              Tutup & Lanjutkan
            </button>
          </div>
        </div>
      )}

      {/* Camera Scanner Modal */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />

      {/* QR Code Pass Viewer Modal */}
      {qrModalData && (
        <QRGeneratorModal
          isOpen={!!qrModalData}
          onClose={() => setQrModalData(null)}
          value={qrModalData.value}
          title={qrModalData.title}
          subtitle={qrModalData.subtitle}
        />
      )}
    </div>
  );
}
