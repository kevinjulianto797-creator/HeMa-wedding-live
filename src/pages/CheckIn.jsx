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
import { saveCheckin, getAllCheckins, setAppState, getAppState } from '../services/db';
import { syncService } from '../services/syncService';

export function CheckIn() {
  const [activeTab, setActiveTab] = useState('receptionist'); // 'receptionist' | 'self'
  const [guests, setGuests] = useState(INITIAL_GUESTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [qrModalData, setQrModalData] = useState(null); // for generating QR pass
  const [successGuest, setSuccessGuest] = useState(null);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Load guests and checkins from IndexedDB
  useEffect(() => {
    const loadCheckins = async () => {
      try {
        const saved = await getAppState('guest_list');
        const checkins = await getAllCheckins();
        
        let currentGuests = saved || INITIAL_GUESTS;
        
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

    const unsubscribe = syncService.subscribe((status) => {
      setIsOnline(status.isOnline);
    });

    return () => unsubscribe();
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
      colors: ['#D4AF37', '#FDE68A', '#102A43', '#FFFFFF']
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

    // Save to IndexedDB (Works online AND offline!)
    await saveCheckin({
      guestId: guest.id,
      guestName: guest.name,
      pax: guest.pax || 1,
      category: guest.category,
      timestamp: updated.checkedInAt,
      checkedInBy: updated.checkedInBy,
      synced: isOnline,
    });

    const newGuestList = guests.map(g => g.id === guest.id ? updated : g);
    setGuests(newGuestList);
    await setAppState('guest_list', newGuestList);

    setSuccessGuest(updated);
    triggerCelebration();

    // Trigger sync if online
    if (isOnline) {
      syncService.syncAll();
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
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-gold-gradient">
          Check-in Kehadiran Tamu
        </h2>
        <p className="text-xs sm:text-sm text-slate-300">
          Sistem absensi barcode cerdas dengan dukungan mode online dan offline.
        </p>

        {/* Tab Selector */}
        <div className="inline-flex p-1 bg-navy-900 border border-gold-500/30 rounded-2xl mt-2">
          <button
            onClick={() => setActiveTab('receptionist')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'receptionist'
                ? 'bg-gradient-to-r from-gold-600 to-gold-500 text-navy-950 shadow-gold-glow'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Mode 1: Panitia / Resepsionis
          </button>
          <button
            onClick={() => setActiveTab('self')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'self'
                ? 'bg-gradient-to-r from-gold-600 to-gold-500 text-navy-950 shadow-gold-glow'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Mode 2: Tamu Mandiri
          </button>
        </div>
      </div>

      {/* Attendance Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-navy p-3.5 rounded-2xl text-center border border-white/10">
          <span className="text-[11px] text-slate-400">Total Tamu</span>
          <p className="text-lg sm:text-2xl font-bold font-mono text-slate-100">{totalGuests}</p>
        </div>
        <div className="glass-navy p-3.5 rounded-2xl text-center border border-emerald-500/30 bg-emerald-950/20">
          <span className="text-[11px] text-emerald-400">Sudah Hadir</span>
          <p className="text-lg sm:text-2xl font-bold font-mono text-emerald-400">{arrivedCount}</p>
        </div>
        <div className="glass-navy p-3.5 rounded-2xl text-center border border-amber-500/30 bg-amber-950/20">
          <span className="text-[11px] text-amber-300">Belum Hadir</span>
          <p className="text-lg sm:text-2xl font-bold font-mono text-amber-300">
            {totalGuests - arrivedCount}
          </p>
        </div>
      </div>

      {/* MODE 1: PANITIA / RESEPSIONIS */}
      {activeTab === 'receptionist' && (
        <div className="space-y-4">
          {/* Main Action: Open Camera Scanner */}
          <div className="glass-navy p-5 rounded-2xl border border-gold-500/40 text-center space-y-4 shadow-navy-card">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-gold-600 via-gold-500 to-amber-300 text-navy-950 flex items-center justify-center shadow-gold-glow">
              <Camera className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-slate-100">
                Scan Barcode / QR Undangan Tamu
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                Arahkan kamera HP panitia ke QR code pada kartu fisik atau layar HP tamu untuk absensi otomatis.
              </p>
            </div>
            <button
              onClick={() => setIsScannerOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gold-600 via-gold-500 to-amber-400 hover:from-gold-500 hover:to-gold-300 text-navy-950 font-bold text-sm rounded-xl transition shadow-gold-glow active:scale-95"
            >
              <QrCode className="w-5 h-5" />
              <span>Buka Kamera Scanner</span>
            </button>
          </div>

          {/* Fallback Search Input */}
          <div className="glass-navy p-4 rounded-2xl border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-gold-400 uppercase tracking-wider">
                Atau Cari Nama Tamu (Manual)
              </h4>
              <span className="text-[11px] text-slate-400">
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
                className="w-full bg-navy-950 border border-gold-500/20 rounded-xl pl-9 pr-4 py-2.5 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-gold-400 transition"
              />
            </div>

            {/* Guest List Items */}
            <div className="divide-y divide-white/5 max-h-96 overflow-y-auto pr-1">
              {filteredGuests.map((guest) => (
                <div
                  key={guest.id}
                  className="py-3 flex items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-xs sm:text-sm text-slate-100">
                        {guest.name}
                      </p>
                      {guest.checkedIn && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-semibold">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Hadir</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span className="text-gold-300 font-medium">{guest.category}</span>
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
                      className="p-2 rounded-lg bg-navy-800 hover:bg-navy-700 text-gold-400 border border-gold-500/20 transition"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>

                    {/* Check-in button */}
                    {!guest.checkedIn ? (
                      <button
                        onClick={() => handleCheckInGuest(guest, 'manual')}
                        className="px-3 py-1.5 bg-gold-500/20 hover:bg-gold-500/30 text-gold-300 border border-gold-500/40 rounded-lg text-xs font-semibold transition"
                      >
                        Tandai Hadir
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-mono">
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
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: TAMU MANDIRI (SELF CHECK-IN) */}
      {activeTab === 'self' && (
        <div className="space-y-4">
          <div className="glass-navy p-6 rounded-2xl border border-gold-500/40 text-center space-y-4 shadow-navy-card">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gold-500/10 border border-gold-500/30 text-gold-400 flex items-center justify-center">
              <QrCode className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-slate-100">
                Self Check-in Tamu
              </h3>
              <p className="text-xs text-slate-300 max-w-sm mx-auto mt-1">
                Scan standee akrilik di meja resepsionis atau pilih nama Anda sendiri di bawah untuk konfirmasi kehadiran.
              </p>
            </div>

            <button
              onClick={() => setIsScannerOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-navy-950 font-bold text-xs rounded-xl transition shadow-gold-glow"
            >
              <Camera className="w-4 h-4" />
              <span>Scan QR Meja Resepsionis</span>
            </button>
          </div>

          {/* Quick Select My Name */}
          <div className="glass-navy p-5 rounded-2xl border border-white/10 space-y-3">
            <h4 className="text-xs font-semibold text-gold-400 uppercase tracking-wider">
              Konfirmasi Mandiri dengan Nama Anda
            </h4>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama Anda di undangan..."
                className="w-full bg-navy-950 border border-gold-500/20 rounded-xl pl-9 pr-4 py-2.5 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-gold-400 transition"
              />
            </div>

            <div className="divide-y divide-white/5 max-h-64 overflow-y-auto">
              {filteredGuests.map((guest) => (
                <div key={guest.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-xs text-slate-200">{guest.name}</p>
                    <p className="text-[10px] text-slate-400">{guest.table}</p>
                  </div>
                  {!guest.checkedIn ? (
                    <button
                      onClick={() => handleCheckInGuest(guest, 'self')}
                      className="px-3 py-1 bg-gold-500 text-navy-950 font-bold text-xs rounded-lg hover:bg-gold-400 transition"
                    >
                      Saya Hadir!
                    </button>
                  ) : (
                    <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Sudah Hadir</span>
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Success Modal Confirmation */}
      {successGuest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-sm bg-navy-900 border border-gold-500/50 rounded-3xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <span className="text-xs uppercase tracking-widest text-gold-400 font-semibold">
                Check-in Berhasil!
              </span>
              <h3 className="font-serif font-bold text-xl text-slate-100 mt-1">
                Selamat Datang,
              </h3>
              <p className="font-serif font-bold text-2xl text-gold-gradient mt-0.5">
                {successGuest.name}
              </p>
            </div>

            <div className="bg-navy-950 p-3.5 rounded-xl border border-white/10 text-xs text-slate-300 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Kategori:</span>
                <span className="font-semibold text-gold-300">{successGuest.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Meja Tamu:</span>
                <span className="font-semibold text-slate-100">{successGuest.table}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Waktu Hadir:</span>
                <span className="font-mono text-slate-100">
                  {new Date(successGuest.checkedInAt).toLocaleTimeString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-white/5">
                <span className="text-slate-400">Status Sinyal:</span>
                <span className={`font-semibold ${isOnline ? 'text-emerald-400' : 'text-amber-300'}`}>
                  {isOnline ? 'Tersinkronisasi Online' : 'Tersimpan di Perangkat (Offline)'}
                </span>
              </div>
            </div>

            <button
              onClick={() => setSuccessGuest(null)}
              className="w-full py-3 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-navy-950 font-bold text-xs rounded-xl transition shadow-gold-glow"
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
