import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';

export function AudioPlayer({ audioBlob, audioDuration = 15, isDemo = false }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (audioBlob instanceof Blob) {
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [audioBlob]);

  const togglePlay = () => {
    if (audioRef.current && audioUrl) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    } else {
      // Demo simulated playback for sample wishes
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
    <div className="bg-navy-950/70 border border-gold-500/20 rounded-xl p-2.5 flex items-center gap-3">
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          className="hidden"
        />
      )}

      {/* Play/Pause Button */}
      <button
        onClick={togglePlay}
        className="w-8 h-8 rounded-full bg-gold-500 hover:bg-gold-400 text-navy-950 flex items-center justify-center shrink-0 transition shadow-gold-glow"
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 fill-navy-950" />
        ) : (
          <Play className="w-4 h-4 fill-navy-950 ml-0.5" />
        )}
      </button>

      {/* Waveform / Progress Track */}
      <div className="flex-1">
        <div className="flex items-center justify-between text-[10px] text-gold-300 font-mono mb-1">
          <div className="flex items-center gap-1">
            <Volume2 className="w-3 h-3 text-gold-400" />
            <span>Voice Note</span>
          </div>
          <span>
            {formatSecs(currentTime)} / {formatSecs(audioDuration)}
          </span>
        </div>

        {/* Progress Bar with Mini Waveform spikes */}
        <div className="relative w-full h-2 bg-navy-800 rounded-full overflow-hidden">
          <div
            className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-gold-600 to-amber-300 transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
          />
        </div>
      </div>
    </div>
  );
}
