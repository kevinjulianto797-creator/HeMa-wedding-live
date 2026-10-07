import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';

export function AudioPlayer({ audioBlob, audioUrl: propAudioUrl, audioDuration = 15, isDemo = false }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef(null);
  const [playableSrc, setPlayableSrc] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    let objectUrl = null;
    if (audioBlob instanceof Blob) {
      objectUrl = URL.createObjectURL(audioBlob);
      setPlayableSrc(objectUrl);
    } else if (typeof audioBlob === 'string' && audioBlob.length > 0) {
      setPlayableSrc(audioBlob);
    } else if (propAudioUrl) {
      setPlayableSrc(propAudioUrl);
    } else {
      setPlayableSrc(null);
    }

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [audioBlob, propAudioUrl]);

  const togglePlay = () => {
    if (audioRef.current && playableSrc) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsPlaying(true);
            })
            .catch((err) => {
              console.warn('Audio play failed:', err);
              // Fallback to simulated animation if audio stream is blocked or unavailable
              runSimulatedTimer();
            });
        }
      }
    } else {
      runSimulatedTimer();
    }
  };

  const runSimulatedTimer = () => {
    if (isPlaying) {
      clearInterval(timerRef.current);
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      setCurrentTime(0);
      timerRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= audioDuration) {
            clearInterval(timerRef.current);
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(Math.floor(audioRef.current.currentTime));
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const formatSecs = (sec) => {
    const mins = Math.floor(sec / 60);
    const rem = sec % 60;
    return `${mins}:${rem.toString().padStart(2, '0')}`;
  };

  const progressPercent = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center gap-3">
      {playableSrc && (
        <audio
          ref={audioRef}
          src={playableSrc}
          preload="auto"
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          onError={(e) => console.warn('Audio element error:', e)}
          className="hidden"
        />
      )}

      {/* Play/Pause Button */}
      <button
        onClick={togglePlay}
        className="w-8 h-8 rounded-full bg-navy-950 hover:bg-navy-900 text-white flex items-center justify-center shrink-0 transition shadow-sm"
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 fill-white" />
        ) : (
          <Play className="w-4 h-4 fill-white ml-0.5" />
        )}
      </button>

      {/* Waveform / Progress Track */}
      <div className="flex-1">
        <div className="flex items-center justify-between text-[10px] text-navy-800 font-mono mb-1">
          <div className="flex items-center gap-1 font-semibold">
            <Volume2 className="w-3 h-3 text-navy-700" />
            <span>Voice Note</span>
          </div>
          <span className="text-slate-500">
            {formatSecs(currentTime)} / {formatSecs(audioDuration)}
          </span>
        </div>

        {/* Progress Bar with Mini Waveform spikes */}
        <div className="relative w-full h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="absolute top-0 bottom-0 left-0 bg-navy-900 transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
          />
        </div>
      </div>
    </div>
  );
}
