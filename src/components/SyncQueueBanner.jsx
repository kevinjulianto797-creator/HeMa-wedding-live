import React, { useState, useEffect } from 'react';
import { RefreshCw, CloudUpload, CheckCircle2, AlertCircle, X, ExternalLink, Trash2 } from 'lucide-react';
import { syncService } from '../services/syncService';
import { getGoogleSettings, saveGoogleSettings } from '../services/googleSync';
import { clearPendingDrafts } from '../services/db';

export function SyncQueueBanner() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [webhookInput, setWebhookInput] = useState('');
  const [statusMessage, setStatusMessage] = useState(null);

  useEffect(() => {
    const updateCount = async () => {
      const counts = await syncService.getPendingCount();
      setPendingCount(counts.total);
    };

    updateCount();
    const interval = setInterval(updateCount, 3000);

    const handleSyncComplete = () => {
      updateCount();
    };

    window.addEventListener('wedding-sync-completed', handleSyncComplete);

    return () => {
      clearInterval(interval);
      window.removeEventListener('wedding-sync-completed', handleSyncComplete);
    };
  }, []);

  const handleStartSync = async () => {
    const settings = getGoogleSettings();
    if (!settings.sheetsWebhookUrl || !settings.sheetsWebhookUrl.startsWith('http')) {
      setWebhookInput(settings.sheetsWebhookUrl || '');
      setShowConfigModal(true);
      return;
    }

    setIsSyncing(true);
    setStatusMessage(null);
    try {
      await syncService.syncAll();
      const afterCount = await syncService.getPendingCount();
      if (afterCount.total === 0) {
        setStatusMessage({
          type: 'success',
          text: '✅ Berhasil! Seluruh data di HP telah masuk ke Google Spreadsheet & Drive.',
        });
        setTimeout(() => setStatusMessage(null), 5000);
      } else {
        setStatusMessage({
          type: 'info',
          text: `Tersisa ${afterCount.total} data dalam antrean. Sistem akan terus mencoba mengirim saat jaringan stabil.`,
        });
      }
    } catch (err) {
      console.error(err);
      setStatusMessage({
        type: 'error',
        text: 'Gagal mengirim data. Pastikan sinyal internet aktif dan URL Webhook valid.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDiscardDrafts = async () => {
    if (window.confirm(`Hapus ${pendingCount} foto / data uji coba yang tersimpan di HP ini? Gunakan opsi ini jika data tersebut hanya untuk testing.`)) {
      await clearPendingDrafts();
      setStatusMessage({
        type: 'info',
        text: 'Data uji coba di HP telah dibersihkan.',
      });
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const handleSaveWebhookAndSync = async (e) => {
    e.preventDefault();
    if (!webhookInput.trim().startsWith('http')) {
      alert('Masukkan URL Webhook Google Apps Script yang valid (berawalan https://script.google.com/...)');
      return;
    }

    const current = getGoogleSettings();
    saveGoogleSettings({
      ...current,
      sheetsWebhookUrl: webhookInput.trim(),
    });

    setShowConfigModal(false);
    await handleStartSync();
  };

  if (pendingCount === 0 && !statusMessage) {
    return null;
  }

  return (
    <>
      <div className="mb-4">
        {statusMessage ? (
          <div className={`p-3 rounded-2xl text-xs font-medium flex items-center justify-between border shadow-xs transition ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : statusMessage.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-navy-50 text-navy-800 border-navy-200'
          }`}>
            <div className="flex items-center gap-2">
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="p-1 hover:bg-black/5 rounded-full transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="p-3 sm:p-3.5 bg-gradient-to-r from-navy-950 via-navy-900 to-navy-950 text-white rounded-2xl shadow-sm border border-navy-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gold-400/20 border border-gold-400/40 flex items-center justify-center shrink-0">
                <CloudUpload className="w-4 h-4 text-gold-300 animate-pulse" />
              </div>
              <div>
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>{pendingCount} Data di HP Menunggu Sinkronisasi</span>
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                </p>
                <p className="text-[11px] text-slate-300">
                  Foto, ucapan, atau rekaman suara tersimpan di HP ini dan siap dikirim ke Spreadsheet.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleDiscardDrafts}
                className="px-3 py-2 rounded-xl border border-white/20 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold transition"
                title="Hapus data uji coba di HP"
              >
                Hapus Draft di HP
              </button>

              <button
                onClick={handleStartSync}
                disabled={isSyncing}
                className="px-4 py-2 rounded-xl bg-gold-400 hover:bg-gold-500 text-navy-950 text-xs font-bold transition shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Sedang Mengirim...</span>
                  </>
                ) : (
                  <>
                    <CloudUpload className="w-3.5 h-3.5" />
                    <span>Kirim ke Spreadsheet</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Masukkan Webhook jika belum ada di HP */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-scale-up space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-serif font-bold text-base text-navy-950">
                Tautkan ke Google Spreadsheet
              </h3>
              <button
                onClick={() => setShowConfigModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Agar data foto, video, dan doa di HP ini dapat masuk ke spreadsheet Anda, masukkan URL Webhook Google Apps Script atau scan Barcode Akses Tamu dari layar laptop.
            </p>

            <form onSubmit={handleSaveWebhookAndSync} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Google Apps Script Webhook URL (/exec)
                </label>
                <input
                  type="url"
                  required
                  value={webhookInput}
                  onChange={(e) => setWebhookInput(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-navy-600 focus:bg-white transition"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-navy-950 hover:bg-navy-900 text-white transition shadow-sm"
                >
                  Simpan & Kirim Semua Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
