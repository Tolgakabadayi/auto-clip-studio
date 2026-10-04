import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Scissors,
  Type,
  Music,
  Volume2,
  VolumeX,
  Sparkles,
  CheckCircle2,
  X,
  Clock,
  Sliders,
  Film
} from 'lucide-react';
import { ViralClip } from '../types';

interface TimelineEditorProps {
  clip: ViralClip;
  originalVideoPath: string;
  onClose: () => void;
  onApplyChanges: (
    clip: ViralClip,
    options: {
      startSeconds: number;
      durationSeconds: number;
      enableSubtitles: boolean;
      audioVolume: number; // 0 to 1
      musicPath?: string;
      musicVolume?: number; // 0 to 1
    }
  ) => Promise<void>;
  isProcessing: boolean;
}

export const TimelineEditor: React.FC<TimelineEditorProps> = ({
  clip,
  originalVideoPath,
  onClose,
  onApplyChanges,
  isProcessing,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Trimming State
  const [startSec, setStartSec] = useState<number>(clip.start_seconds);
  const [endSec, setEndSec] = useState<number>(clip.end_seconds);
  const duration = Math.max(1, endSec - startSec);

  // Player State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);

  // Post-Edit Settings
  const [enableSubtitles, setEnableSubtitles] = useState<boolean>(true);
  const [audioVolume, setAudioVolume] = useState<number>(100); // 0 - 100%
  const [musicPath, setMusicPath] = useState<string>('');
  const [musicVolume, setMusicVolume] = useState<number>(30); // 0 - 100%

  // Local HTTP stream URL
  const videoSrc = clip.outputPath
    ? `http://127.0.0.1:39821/stream?path=${encodeURIComponent(clip.outputPath)}`
    : `http://127.0.0.1:39821/stream?path=${encodeURIComponent(originalVideoPath)}`;

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 10);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${ms}`;
  };

  // Synchronize playback with bounds
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (time: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = time;
    setCurrentTime(time);
  };

  const handleSelectMusic = async () => {
    if (window.electronAPI?.selectVideoFile) {
      const res = await window.electronAPI.selectVideoFile();
      if (res && res.path) {
        setMusicPath(res.path);
      }
    }
  };

  const handleSave = async () => {
    await onApplyChanges(clip, {
      startSeconds: startSec,
      durationSeconds: duration,
      enableSubtitles,
      audioVolume: audioVolume / 100,
      musicPath: musicPath || undefined,
      musicVolume: musicVolume / 100,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-4">
      <div className="relative bg-dark-900 border border-dark-700 rounded-3xl overflow-hidden max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl shadow-black/90">
        {/* Header Bar */}
        <div className="h-14 border-b border-dark-750 px-6 flex items-center justify-between bg-dark-950/70">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-brand-purple/20 text-brand-purple border border-brand-purple/30 flex items-center justify-center">
              <Scissors className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Timeline Stüdyosu & Hassas Düzenleme
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30">
                  Klip #{clip.clip_id}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 truncate max-w-md">
                {clip.title}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-dark-800 hover:bg-dark-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Studio Workspace */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left: Video Preview Player (9:16) */}
          <div className="bg-black/90 p-6 flex flex-col items-center justify-center md:w-[380px] shrink-0 border-b md:border-b-0 md:border-r border-dark-750">
            <div className="relative aspect-[9/16] h-[48vh] max-h-[460px] rounded-2xl overflow-hidden border border-dark-700 shadow-2xl bg-dark-950 flex items-center justify-center">
              <video
                ref={videoRef}
                src={videoSrc}
                playsInline
                preload="auto"
                className="w-full h-full object-contain"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
            </div>

            {/* Compact Player Controls */}
            <div className="w-full mt-3 flex items-center justify-between text-xs text-slate-300 px-2">
              <button
                onClick={togglePlay}
                className="p-2 rounded-xl bg-brand-purple hover:bg-brand-violet text-white transition-all shadow-md shadow-brand-purple/20"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
              </button>
              <div className="font-mono text-xs text-slate-400">
                <span className="text-white font-semibold">{formatSeconds(currentTime)}</span> / {formatSeconds(duration)}
              </div>
              <button
                onClick={() => handleSeek(0)}
                className="p-2 rounded-xl bg-dark-800 hover:bg-dark-700 text-slate-400 hover:text-white transition-colors"
                title="Başa Sar"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Right: Controls & Adjustments */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            {/* 1. Trimming Controls */}
            <div className="bg-dark-850 border border-dark-700 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white uppercase tracking-wider flex items-center">
                  <Scissors className="w-3.5 h-3.5 text-brand-purple mr-1.5" />
                  Kırpma ve Süre (Trim)
                </label>
                <span className="text-xs font-mono font-bold text-brand-cyan bg-brand-cyan/10 px-2.5 py-0.5 rounded-full border border-brand-cyan/20">
                  {duration} saniye
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400">Başlangıç Zamanı</span>
                  <div className="flex items-center space-x-2 bg-dark-900 border border-dark-700 rounded-xl px-3 py-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max={endSec - 5}
                      value={startSec}
                      onChange={(e) => setStartSec(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="w-full bg-transparent text-xs text-white font-mono focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-500">sn</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400">Bitiş Zamanı</span>
                  <div className="flex items-center space-x-2 bg-dark-900 border border-dark-700 rounded-xl px-3 py-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <input
                      type="number"
                      step="1"
                      min={startSec + 5}
                      value={endSec}
                      onChange={(e) => setEndSec(Math.max(startSec + 5, parseInt(e.target.value, 10) || startSec + 5))}
                      className="w-full bg-transparent text-xs text-white font-mono focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-500">sn</span>
                  </div>
                </div>
              </div>

              {/* Range sliders */}
              <div className="pt-2 space-y-2">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Başlangıç Kaydırıcı</span>
                  <span>{startSec}s</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={Math.max(0, endSec - 5)}
                  value={startSec}
                  onChange={(e) => setStartSec(parseInt(e.target.value, 10))}
                  className="w-full accent-brand-purple"
                />
              </div>
            </div>

            {/* 2. Subtitle Toggle */}
            <div className="bg-dark-850 border border-dark-700 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20">
                  <Type className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Animasyonlu TikTok Altyazıları</h4>
                  <p className="text-[11px] text-slate-400">
                    Klibin içine kelime kelime renk değiştiren altyazıyı göm
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableSubtitles}
                  onChange={(e) => setEnableSubtitles(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-dark-750 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-purple"></div>
              </label>
            </div>

            {/* 3. Audio & Music Controls */}
            <div className="bg-dark-850 border border-dark-700 rounded-2xl p-4 space-y-4">
              <div className="flex items-center space-x-2 text-xs font-semibold text-white uppercase tracking-wider">
                <Volume2 className="w-4 h-4 text-emerald-400" />
                <span>Ses & Müzik Seviyesi</span>
              </div>

              {/* Original Audio Volume */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-300">
                  <span>Orijinal Video Sesi</span>
                  <span className="font-mono text-emerald-400 font-bold">%{audioVolume}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="150"
                  value={audioVolume}
                  onChange={(e) => setAudioVolume(parseInt(e.target.value, 10))}
                  className="w-full accent-emerald-500"
                />
              </div>

              {/* Background Music */}
              <div className="pt-2 border-t border-dark-750 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-300 flex items-center">
                    <Music className="w-3.5 h-3.5 mr-1.5 text-brand-purple" />
                    Arka Plan Müziği (Opsiyonel)
                  </span>
                  <button
                    onClick={handleSelectMusic}
                    className="text-[11px] font-semibold text-brand-purple hover:underline"
                  >
                    {musicPath ? 'Müziği Değiştir' : '+ Müzik Dosyası Seç'}
                  </button>
                </div>
                {musicPath && (
                  <div className="p-2.5 rounded-xl bg-dark-900 border border-dark-700 flex items-center justify-between text-xs text-slate-300">
                    <span className="truncate max-w-xs">{musicPath.split('\\').pop()}</span>
                    <button
                      onClick={() => setMusicPath('')}
                      className="text-rose-400 hover:text-rose-300 text-xs font-semibold"
                    >
                      Kaldır
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="h-16 border-t border-dark-750 px-6 flex items-center justify-between bg-dark-950/90">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-dark-800 hover:bg-dark-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
          >
            İptal
          </button>

          <button
            onClick={handleSave}
            disabled={isProcessing}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-purple to-brand-cyan hover:from-brand-violet hover:to-cyan-400 text-white text-xs font-bold shadow-lg shadow-brand-purple/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center space-x-2 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isProcessing ? 'İşleniyor...' : 'Düzenlenen Klibi Render Et'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
