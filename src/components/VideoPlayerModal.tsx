import React from 'react';
import { X, ExternalLink, Play, Film, Share2 } from 'lucide-react';
import { ViralClip } from '../types';

interface VideoPlayerModalProps {
  clip: ViralClip | null;
  onClose: () => void;
  onShowInFolder: (path: string) => void;
  onOpenSocialModal?: (clip: ViralClip) => void;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  clip,
  onClose,
  onShowInFolder,
  onOpenSocialModal,
}) => {
  if (!clip || !clip.outputPath) return null;

  // Format local file URI using our high-performance HTTP Range stream server
  const videoSrc = `http://127.0.0.1:39821/stream?path=${encodeURIComponent(clip.outputPath)}`;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
      <div className="relative bg-dark-900 border border-dark-700 rounded-3xl overflow-hidden max-w-4xl w-full max-h-[90vh] flex flex-col md:flex-row shadow-2xl shadow-black/80">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-dark-800/80 hover:bg-dark-750 text-slate-300 hover:text-white flex items-center justify-center border border-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 9:16 Vertical Video Player Container */}
        <div className="bg-black flex items-center justify-center p-4 md:w-1/2 min-h-[460px]">
          <div className="relative aspect-[9/16] h-[75vh] max-h-[620px] rounded-2xl overflow-hidden border border-dark-700 shadow-2xl bg-dark-950 flex items-center justify-center">
            <video
              src={videoSrc}
              controls
              autoPlay
              playsInline
              className="w-full h-full object-contain"
              onError={(e) => {
                console.error("Video playback error on src:", videoSrc, e);
              }}
            />
          </div>
        </div>

        {/* Clip Details & Metadata Side */}
        <div className="p-6 md:w-1/2 flex flex-col justify-between space-y-6 overflow-y-auto">
          <div className="space-y-4">
            {/* Header badges */}
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center space-x-1">
                <span>🔥 Virallik Skoru: %{clip.virality_score}</span>
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-dark-800 text-slate-300 border border-dark-700">
                {clip.duration_seconds} saniye
              </span>
            </div>

            {/* Title */}
            <h3 className="text-xl font-bold text-white leading-snug">
              {clip.title}
            </h3>

            {/* Hook Sentence */}
            <div className="p-3.5 rounded-xl bg-dark-850 border border-brand-purple/30 space-y-1">
              <p className="text-[11px] font-semibold text-brand-purple uppercase tracking-wider">
                İlk 3-5 Saniye Kancası (Hook)
              </p>
              <p className="text-sm italic text-slate-200">
                "{clip.hook_sentence}"
              </p>
            </div>

            {/* AI Selection Reason */}
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Yapay Zeka Seçim Gerekçesi
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">
                {clip.reason}
              </p>
            </div>

            {/* Timestamps */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-dark-850 border border-dark-700">
                <span className="text-slate-400 block text-[10px]">Başlangıç:</span>
                <span className="font-semibold text-slate-200">{clip.start_time} ({clip.start_seconds}s)</span>
              </div>
              <div className="p-2.5 rounded-lg bg-dark-850 border border-dark-700">
                <span className="text-slate-400 block text-[10px]">Bitiş:</span>
                <span className="font-semibold text-slate-200">{clip.end_time} ({clip.end_seconds}s)</span>
              </div>
            </div>

            {/* Keywords */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Etiketler
              </span>
              <div className="flex flex-wrap gap-1.5">
                {clip.keywords.map((kw, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-md bg-dark-800 text-[11px] text-slate-300 border border-dark-700"
                  >
                    #{kw}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Action */}
          <div className="pt-4 border-t border-dark-700 flex items-center space-x-3">
            <button
              onClick={() => onShowInFolder(clip.outputPath!)}
              className="py-2.5 px-4 rounded-xl bg-dark-800 hover:bg-dark-700 border border-dark-600 text-slate-200 hover:text-white text-xs font-semibold flex items-center justify-center space-x-2 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Klasörde Göster</span>
            </button>
            {onOpenSocialModal && (
              <button
                onClick={() => {
                  onClose();
                  onOpenSocialModal(clip);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-brand-purple to-pink-600 hover:from-brand-purple/90 hover:to-pink-500 text-white text-xs font-bold flex items-center justify-center space-x-2 shadow-md shadow-brand-purple/20 transition-all hover:scale-105 active:scale-95"
              >
                <Share2 className="w-4 h-4" />
                <span>Sosyal Medya Metinleri</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
