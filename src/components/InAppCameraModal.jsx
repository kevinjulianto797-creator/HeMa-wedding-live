import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, X, Check, AlertCircle, Sparkles } from 'lucide-react';

export function InAppCameraModal({ isOpen, onClose, onPhotoCaptured }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [facingMode, setFacingMode] = useState('environment'); // 'user' | 'environment'
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState(null);
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isShutterActive, setIsShutterActive] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCapturedPhotoUrl(null);
      setCapturedBlob(null);
      setErrorMsg(null);
      startCamera(facingMode);
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async (mode) => {
    setIsLoading(true);
    setErrorMsg(null);
    stopCamera();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Browser Anda tidak mendukung akses kamera langsung. Silakan gunakan tombol Kamera Bawaan HP.');
      }

      const constraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setIsLoading(false);
        };
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setIsLoading(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMsg('Izin kamera ditolak. Izinkan akses kamera di browser Anda atau gunakan Kamera Bawaan HP.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMsg('Kamera tidak ditemukan pada perangkat Anda.');
      } else {
        setErrorMsg(err.message || 'Gagal membuka kamera di aplikasi.');
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleCapture = () => {
    if (!videoRef.current) return;

    // Trigger visual shutter flash
    setIsShutterActive(true);
    setTimeout(() => setIsShutterActive(false), 200);

    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    
    // If selfie camera, mirror horizontally
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      setCapturedBlob(blob);
      setCapturedPhotoUrl(url);
      stopCamera();
    }, 'image/jpeg', 0.92);
  };

  const handleRetake = () => {
    if (capturedPhotoUrl) {
      URL.revokeObjectURL(capturedPhotoUrl);
    }
    setCapturedPhotoUrl(null);
    setCapturedBlob(null);
    startCamera(facingMode);
  };

  const handleConfirm = () => {
    if (capturedBlob && capturedPhotoUrl) {
      // Create a File object
      const file = new File([capturedBlob], `camera_${Date.now()}.jpg`, { type: 'image/jpeg' });
      onPhotoCaptured({ file, previewUrl: capturedPhotoUrl });
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-navy-950/90 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-navy-950 border border-gold-500/30 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh]">
        {/* Header Bar */}
        <div className="px-5 py-3.5 bg-navy-900/90 border-b border-white/10 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-gold-400" />
            <h3 className="font-serif font-bold text-sm sm:text-base text-white">
              {capturedPhotoUrl ? 'Tinjau Foto' : 'Kamera di Aplikasi'}
            </h3>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 rounded-full bg-navy-800 text-slate-300 hover:text-white hover:bg-navy-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder / Preview Area */}
        <div className="relative flex-1 bg-black flex items-center justify-center min-h-[360px] sm:min-h-[440px] overflow-hidden">
          {/* Shutter flash effect */}
          {isShutterActive && (
            <div className="absolute inset-0 bg-white z-30 opacity-80 pointer-events-none transition duration-150" />
          )}

          {errorMsg ? (
            <div className="p-6 text-center max-w-sm space-y-3 z-10">
              <div className="w-12 h-12 mx-auto rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="text-xs text-rose-300 leading-relaxed">{errorMsg}</p>
              <button
                onClick={() => startCamera(facingMode)}
                className="px-4 py-2 bg-navy-800 hover:bg-navy-700 text-white rounded-xl text-xs font-semibold transition"
              >
                Coba Lagi
              </button>
            </div>
          ) : capturedPhotoUrl ? (
            /* Review Captured Photo */
            <div className="relative w-full h-full flex items-center justify-center">
              <img
                src={capturedPhotoUrl}
                alt="Captured"
                className="w-full h-full object-contain max-h-[500px]"
              />
            </div>
          ) : (
            /* Live Camera Stream */
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className={`w-full h-full object-cover max-h-[500px] ${
                  facingMode === 'user' ? 'scale-x-[-1]' : ''
                }`}
              />

              {/* Viewfinder frame overlay */}
              <div className="absolute inset-6 sm:inset-10 border-2 border-white/20 rounded-2xl pointer-events-none flex flex-col justify-between p-3">
                <div className="flex justify-between">
                  <div className="w-4 h-4 border-t-2 border-l-2 border-gold-400" />
                  <div className="w-4 h-4 border-t-2 border-r-2 border-gold-400" />
                </div>
                <div className="flex justify-between">
                  <div className="w-4 h-4 border-b-2 border-l-2 border-gold-400" />
                  <div className="w-4 h-4 border-b-2 border-r-2 border-gold-400" />
                </div>
              </div>

              {isLoading && (
                <div className="absolute inset-0 bg-navy-950/80 flex items-center justify-center gap-2 text-gold-300 text-xs font-medium">
                  <RefreshCw className="w-4 h-4 animate-spin text-gold-400" />
                  <span>Membuka kamera...</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Hidden Canvas for capturing full-res frame */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Bottom Control Bar */}
        <div className="p-4 bg-navy-900 border-t border-white/10 flex items-center justify-around z-10">
          {capturedPhotoUrl ? (
            <div className="w-full flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleRetake}
                className="flex-1 py-3 px-4 bg-navy-800 hover:bg-navy-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Foto Ulang</span>
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-500 hover:brightness-110 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition"
              >
                <Check className="w-4 h-4" />
                <span>Gunakan Foto Ini</span>
              </button>
            </div>
          ) : (
            <div className="w-full flex items-center justify-between px-6">
              {/* Switch Camera (Front/Back) */}
              <button
                type="button"
                onClick={toggleFacingMode}
                title="Ganti Kamera Depan / Belakang"
                className="w-11 h-11 rounded-full bg-navy-800 hover:bg-navy-700 text-gold-400 border border-white/10 flex items-center justify-center transition active:scale-95"
              >
                <RefreshCw className="w-5 h-5" />
              </button>

              {/* Shutter Button */}
              <button
                type="button"
                onClick={handleCapture}
                disabled={isLoading || !!errorMsg}
                title="Ambil Foto"
                className="w-18 h-18 p-1.5 rounded-full bg-gradient-to-tr from-gold-500 via-amber-300 to-gold-600 shadow-gold-glow flex items-center justify-center hover:scale-105 active:scale-90 transition disabled:opacity-50"
              >
                <div className="w-14 h-14 rounded-full bg-white border-2 border-navy-950 flex items-center justify-center">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-navy-950 to-navy-900" />
                </div>
              </button>

              {/* Cancel Button */}
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  onClose();
                }}
                className="w-11 h-11 rounded-full bg-navy-800 hover:bg-navy-700 text-slate-300 border border-white/10 flex items-center justify-center transition active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
