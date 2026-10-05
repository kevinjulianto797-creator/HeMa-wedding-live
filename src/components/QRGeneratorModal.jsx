import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, QrCode, Download, Share2 } from 'lucide-react';

export function QRGeneratorModal({ isOpen, onClose, value, title, subtitle }) {
  const [qrDataUrl, setQrDataUrl] = useState('');

  useEffect(() => {
    if (value && isOpen) {
      QRCode.toDataURL(value, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0A192F', // Deep navy QR pixels
          light: '#FFFFFF', // Clean white background
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Error generating QR:', err));
    }
  }, [value, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-sm bg-navy-900 border border-gold-500/40 rounded-2xl p-6 shadow-2xl text-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-navy-800 text-slate-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 mx-auto rounded-full bg-gold-500/10 border border-gold-500/30 flex items-center justify-center mb-3">
          <QrCode className="w-6 h-6 text-gold-400" />
        </div>

        <h3 className="font-serif font-bold text-xl text-slate-100 mb-1">{title}</h3>
        <p className="text-xs text-slate-400 mb-5">{subtitle}</p>

        {/* QR Card Frame */}
        <div className="bg-white p-4 rounded-xl shadow-lg inline-block border-2 border-gold-400 mb-4">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="QR Code" className="w-56 h-56 mx-auto object-contain" />
          ) : (
            <div className="w-56 h-56 flex items-center justify-center text-navy-900 text-sm">
              Membuat QR Code...
            </div>
          )}
        </div>

        <p className="text-xs font-mono text-gold-300 bg-navy-950/80 px-3 py-1.5 rounded-lg border border-gold-500/20 mb-4 inline-block">
          Token: {value}
        </p>

        {/* Action Buttons */}
        <div className="flex gap-2 justify-center">
          {qrDataUrl && (
            <a
              href={qrDataUrl}
              download={`QR_${value}.png`}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-navy-950 text-xs font-bold rounded-xl transition shadow-gold-glow"
            >
              <Download className="w-4 h-4" />
              <span>Simpan Gambar</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
