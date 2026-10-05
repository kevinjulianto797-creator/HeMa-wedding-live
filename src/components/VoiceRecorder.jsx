import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Trash2, Send, AlertCircle } from 'lucide-react';

export function VoiceRecorder({ onRecordingComplete, onCancel }) {
  const [recordingStatus, setRecordingStatus] = useState('idle'); // 'idle' | 'recording' | 'preview'
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const audioPreviewRef = useRef(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState(null);
  const recordedBlobRef = useRef(null);

  const MAX_DURATION = 60; // Max 60 seconds for wedding voice note

  useEffect(() => {
    return () => {
      stopAndCleanup();
    };
  }, []);

  const startRecording = async () => {
    setErrorMsg(null);
    audioChunksRef.current = [];
    setRecordingDuration(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        recordedBlobRef.current = audioBlob;
        const audioUrl = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(audioUrl);
        setRecordingStatus('preview');
        // Stop all audio tracks from stream to release microphone
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(200); // 200ms slice
      setRecordingStatus('recording');

      // Start duration timer
      timerIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => {
          if (prev >= MAX_DURATION - 1) {
            stopRecording();
            return MAX_DURATION;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error('Mic access error:', err);
      setErrorMsg('Tidak dapat mengakses mikrofon. Berikan izin di browser Anda.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  const stopAndCleanup = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
    }
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
    }
  };

  const handleTogglePreview = () => {
    if (!audioPreviewRef.current) return;
    if (isPlayingPreview) {
      audioPreviewRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      audioPreviewRef.current.play();
      setIsPlayingPreview(true);
    }
  };

  const handleReset = () => {
    stopAndCleanup();
    setRecordingStatus('idle');
    setRecordedAudioUrl(null);
    recordedBlobRef.current = null;
    setRecordingDuration(0);
    setIsPlayingPreview(false);
  };

  const handleSend = () => {
    if (recordedBlobRef.current) {
      onRecordingComplete({
        audioBlob: recordedBlobRef.current,
        audioDuration: recordingDuration,
        audioUrl: recordedAudioUrl,
      });
    }
  };

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-navy-900/90 border border-gold-500/30 rounded-2xl p-5 shadow-lg">
      {/* Title */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Mic className="w-5 h-5 text-gold-400" />
          <h4 className="font-serif font-bold text-slate-100">Kirim Voice Note (Suara)</h4>
        </div>
        <span className="text-xs text-gold-300 font-mono">Maks. 60 Detik</span>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 bg-rose-950/70 border border-rose-500/40 rounded-xl flex items-center gap-2 text-xs text-rose-200">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* State: IDLE */}
      {recordingStatus === 'idle' && (
        <div className="text-center py-6">
          <p className="text-xs text-slate-400 mb-5">
            Ucapkan doa dan selamat langsung dengan rekaman suara Anda untuk Hendra & Maya.
          </p>
          <button
            onClick={startRecording}
            className="w-16 h-16 mx-auto rounded-full bg-gradient-to-tr from-gold-600 via-gold-500 to-amber-300 text-navy-950 flex items-center justify-center shadow-gold-glow hover:scale-105 active:scale-95 transition"
          >
            <Mic className="w-8 h-8" />
          </button>
          <p className="text-xs font-semibold text-gold-400 mt-3">Ketuk untuk Mulai Merekam</p>
        </div>
      )}

      {/* State: RECORDING */}
      {recordingStatus === 'recording' && (
        <div className="text-center py-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold mb-4 animate-pulse">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            <span>Sedang Merekam Suara...</span>
          </div>

          <div className="text-3xl font-mono font-bold text-gold-300 tracking-wider mb-5">
            {formatTime(recordingDuration)}
          </div>

          {/* Animated Waveform Simulation */}
          <div className="flex items-center justify-center gap-1.5 h-12 mb-6">
            {[40, 75, 50, 95, 60, 85, 45, 90, 65, 80, 55, 100, 70, 85].map((h, idx) => (
              <span
                key={idx}
                className="w-1.5 bg-gradient-to-t from-gold-600 to-gold-300 rounded-full animate-pulse"
                style={{
                  height: `${h}%`,
                  animationDuration: `${0.4 + (idx % 4) * 0.2}s`,
                }}
              />
            ))}
          </div>

          {/* Stop Button */}
          <button
            onClick={stopRecording}
            className="flex items-center gap-2 mx-auto px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition shadow-lg"
          >
            <Square className="w-4 h-4 fill-white" />
            <span>Selesai Merekam</span>
          </button>
        </div>
      )}

      {/* State: PREVIEW */}
      {recordingStatus === 'preview' && (
        <div className="py-4">
          <audio
            ref={audioPreviewRef}
            src={recordedAudioUrl}
            onEnded={() => setIsPlayingPreview(false)}
            className="hidden"
          />

          <div className="p-4 bg-navy-950 rounded-xl border border-gold-500/20 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={handleTogglePreview}
                className="w-10 h-10 rounded-full bg-gold-500 text-navy-950 flex items-center justify-center hover:bg-gold-400 transition"
              >
                {isPlayingPreview ? (
                  <Pause className="w-5 h-5 fill-navy-950" />
                ) : (
                  <Play className="w-5 h-5 fill-navy-950 ml-0.5" />
                )}
              </button>
              <div>
                <p className="text-xs font-semibold text-slate-200">Dengarkan Rekaman</p>
                <p className="text-[11px] font-mono text-gold-400">
                  Durasi: {formatTime(recordingDuration)}
                </p>
              </div>
            </div>

            <button
              onClick={handleReset}
              className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg transition"
              title="Hapus dan Rekam Ulang"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>

          {/* Buttons: Cancel vs Submit */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                handleReset();
                if (onCancel) onCancel();
              }}
              className="flex-1 py-2.5 bg-navy-800 hover:bg-navy-700 text-slate-300 rounded-xl text-xs font-semibold transition"
            >
              Batal
            </button>
            <button
              onClick={handleSend}
              className="flex-1 py-2.5 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-navy-950 rounded-xl text-xs font-bold transition shadow-gold-glow flex items-center justify-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Kirim Voice Note</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
