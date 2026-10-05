import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';

export function QRScannerModal({ isOpen, onClose, onScanSuccess, title = 'Scan QR Code Undangan' }) {
  const [scannerError, setScannerError] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' (belakang) or 'user' (depan)
  const html5QrCodeRef = useRef(null);

  // Play audio chime on successful scan using Web Audio API
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // 880Hz A5 note
      osc.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.15); // ramp to 1760Hz
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.2);

      // Trigger haptic vibration if supported on phone
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
    } catch (e) {
      console.warn('Audio feedback failed:', e);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    let scannerInstance = null;
    setScannerError(null);

    const startScanner = async () => {
      try {
        const qrContainer = document.getElementById('qr-reader-container');
        if (!qrContainer) return;

        scannerInstance = new Html5Qrcode('qr-reader-container');
        html5QrCodeRef.current = scannerInstance;

        const config = {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        };

        await scannerInstance.start(
          { facingMode: facingMode },
          config,
          (decodedText) => {
            console.log('✅ QR Detected:', decodedText);
            playBeep();
            // Stop scanning and trigger success
            stopScanner().then(() => {
              onScanSuccess(decodedText);
            });
          },
          (errorMessage) => {
            // Non-critical scan failure per frame, ignored
          }
        );

        setIsScanning(true);
      } catch (err) {
        console.error('Camera Scanner Error:', err);
        setScannerError(
          'Tidak dapat mengakses kamera. Pastikan izin kamera aktif dan menggunakan browser HTTPS.'
        );
        setIsScanning(false);
      }
    };

    const timer = setTimeout(startScanner, 200);

    return () => {
      clearTimeout(timer);
      stopScanner();
    };
  }, [isOpen, facingMode]);

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn('Error stopping scanner:', err);
      }
      html5QrCodeRef.current = null;
      setIsScanning(false);
    }
  };

  const handleToggleCamera = async () => {
    await stopScanner();
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-navy-900 border border-gold-500/40 rounded-2xl p-5 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-gold-400" />
            <h3 className="font-serif font-bold text-lg text-slate-100">{title}</h3>
          </div>
          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="p-1.5 rounded-full bg-navy-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Viewport Area */}
        <div className="relative w-full aspect-square bg-navy-950 rounded-xl overflow-hidden border-2 border-gold-500/30 flex items-center justify-center">
          <div id="qr-reader-container" className="w-full h-full"></div>

          {/* Scanner Overlay Guide */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-60 h-60 border-2 border-gold-400/80 rounded-2xl relative shadow-gold-glow">
              {/* Corner accents */}
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-gold-300 rounded-tl-lg" />
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-gold-300 rounded-tr-lg" />
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-gold-300 rounded-bl-lg" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-gold-300 rounded-br-lg" />

              {/* Scanning red line animation */}
              <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-gold-400 to-transparent animate-pulse absolute top-1/2 transform -translate-y-1/2" />
            </div>
          </div>
        </div>

        {/* Error message or switch camera button */}
        {scannerError ? (
          <div className="mt-3 p-3 bg-rose-950/70 border border-rose-500/40 rounded-xl flex items-start gap-2.5 text-xs text-rose-200">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Akses Kamera Bermasalah</p>
              <p>{scannerError}</p>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-slate-300">
              Arahkan kamera ke QR Code tamu atau tiket undangan.
            </p>
            <button
              onClick={handleToggleCamera}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-800 hover:bg-navy-700 text-gold-400 text-xs font-medium rounded-lg border border-gold-500/20 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Ganti Kamera</span>
            </button>
          </div>
        )}

        {/* Simulated Quick Scan Test for Dev / Testing */}
        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">Uji coba cepat tanpa kamera:</span>
          <div className="flex gap-1.5">
            <button
              onClick={() => {
                playBeep();
                stopScanner().then(() => onScanSuccess('HEMA-VIP-AF001'));
              }}
              className="text-[11px] px-2 py-1 bg-gold-500/20 text-gold-300 border border-gold-500/40 rounded hover:bg-gold-500/30 transition"
            >
              Scan VIP
            </button>
            <button
              onClick={() => {
                playBeep();
                stopScanner().then(() => onScanSuccess('HEMA-FAM-RD002'));
              }}
              className="text-[11px] px-2 py-1 bg-navy-800 text-slate-300 border border-white/20 rounded hover:bg-navy-700 transition"
            >
              Scan Keluarga
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
