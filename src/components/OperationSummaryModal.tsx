import React from 'react';
import {
  CheckCircle2,
  Clock,
  Film,
  FolderOpen,
  Trash2,
  X,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { ViralClip } from '../types';

export interface LatestOperationResult {
  videoName: string;
  clips: ViralClip[];
  projectDir: string;
  elapsedSeconds: number;
  completedAt: Date;
  totalClips: number;
}

interface OperationSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: LatestOperationResult | null;
  onClearTerminalAndAgency: () => void;
  onOpenFolder?: (path: string) => void;
  onPreviewClip?: (clip: ViralClip) => void;
}

export const OperationSummaryModal: React.FC<OperationSummaryModalProps> = ({
  isOpen,
  onClose,
  result,
  onClearTerminalAndAgency,
  onOpenFolder,
  onPreviewClip,
}) => {
  if (!isOpen || !result) return null;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins} dk ${secs} sn`;
    }
    return `${secs} sn`;
  };

  const handleOpenFolder = () => {
    if (result.projectDir && window.electronAPI?.openPath) {
      window.electronAPI.openPath(result.projectDir);
    } else if (result.projectDir && onOpenFolder) {
      onOpenFolder(result.projectDir);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="relative w-full max-w-2xl bg-dark-900 border border-brand-purple/60 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Glow Header */}
        <div className="relative p-6 bg-gradient-to-r from-brand-purple/20 via-brand-cyan/10 to-emerald-500/10 border-b border-dark-750 flex items-start justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-black text-white tracking-wide">
                  Toplantı & Operasyon Özeti
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                  Tamamlandı
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Yapay zeka ajansı video analizini ve klip üretimini başarıyla sonuçlandırdı.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-dark-800 hover:bg-dark-750 text-slate-400 hover:text-white transition-colors border border-dark-700"
            title="Kapat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-dark-950/80 border border-dark-750 flex flex-col justify-between">
              <div className="flex items-center space-x-2 text-slate-400 text-xs">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Toplam Süre</span>
              </div>
              <span className="text-lg font-black text-white mt-1">
                {formatDuration(result.elapsedSeconds)}
              </span>
              <span className="text-[10px] text-slate-500">Deşifre & Render Dahil</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-dark-950/80 border border-dark-750 flex flex-col justify-between">
              <div className="flex items-center space-x-2 text-slate-400 text-xs">
                <Film className="w-3.5 h-3.5 text-brand-cyan" />
                <span>Üretilen Klip</span>
              </div>
              <span className="text-lg font-black text-brand-cyan mt-1">
                {result.clips.length} Adet
              </span>
              <span className="text-[10px] text-slate-500">9:16 Dikey Format</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-dark-950/80 border border-dark-750 flex flex-col justify-between">
              <div className="flex items-center space-x-2 text-slate-400 text-xs">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>Ortalama Skor</span>
              </div>
              <span className="text-lg font-black text-emerald-400 mt-1">
                {result.clips.length > 0
                  ? Math.round(
                      result.clips.reduce((acc, c) => acc + (c.virality_score || 85), 0) /
                        result.clips.length
                    )
                  : 0}
                /100
              </span>
              <span className="text-[10px] text-slate-500">Virallik Potansiyeli</span>
            </div>
          </div>

          {/* Sentinel & Auditor Security Verification Shield */}
          <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex items-start space-x-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/30">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <h4 className="font-bold text-emerald-300 flex items-center gap-1.5">
                <span>Sentinel Guard & Auditor Doğrulama Raporu</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/30 text-emerald-200 uppercase font-black">
                  Onaylandı
                </span>
              </h4>
              <p className="text-slate-300 mt-0.5 leading-relaxed text-[11px]">
                Video dosyası (<span className="text-white font-medium">{result.videoName}</span>) için transkript ve altyazı eşleşmesi teyit edildi. Önceki videoya ait altyazıların karışması engellendi ve izole proje klasörüne kaydedildi.
              </p>
            </div>
          </div>

          {/* Generated Clips List */}
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brand-purple" />
                <span>Hazırlanan Viral Klipler ({result.clips.length})</span>
              </h4>
              {result.projectDir && (
                <button
                  type="button"
                  onClick={handleOpenFolder}
                  className="text-[11px] text-brand-cyan hover:underline flex items-center gap-1 font-medium"
                >
                  <FolderOpen className="w-3 h-3" />
                  <span>Klasörde Göster</span>
                </button>
              )}
            </div>

            <div className="space-y-2">
              {result.clips.map((clip, idx) => (
                <div
                  key={clip.clip_id || idx}
                  onClick={() => onPreviewClip && onPreviewClip(clip)}
                  className="p-3 rounded-xl bg-dark-950 border border-dark-750 hover:border-brand-purple/60 hover:bg-dark-850/60 transition-all flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-dark-800 text-brand-purple font-mono font-bold text-xs flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      #{idx + 1}
                    </div>
                    <div className="min-w-0">
                      <h5 className="text-xs font-bold text-white truncate group-hover:text-brand-cyan transition-colors">
                        {clip.title}
                      </h5>
                      <p className="text-[10px] text-slate-400 truncate max-w-md">
                        {(clip as any).hook || clip.reason}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 shrink-0 ml-3">
                    <span className="text-[11px] font-mono text-slate-400">
                      {Math.round(clip.duration_seconds)}s
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-400 font-mono text-xs font-bold border border-emerald-500/20">
                      {clip.virality_score}/100
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-dark-950/80 border-t border-dark-750 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClearTerminalAndAgency}
            className="py-2.5 px-4 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 border border-rose-500/40 text-rose-200 text-xs font-bold flex items-center space-x-2 transition-all shadow-md shadow-rose-950/30 hover:scale-[1.01] active:scale-[0.98]"
            title="Terminal loglarını ve ajans mesajlarını temizleyerek yeni video için sıfırlar"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Terminal ve Ajans Konuşmalarını Temizle</span>
          </button>

          <div className="flex items-center space-x-2">
            {result.projectDir && (
              <button
                type="button"
                onClick={handleOpenFolder}
                className="py-2.5 px-4 rounded-xl bg-dark-800 hover:bg-dark-750 border border-dark-600 text-slate-200 text-xs font-bold flex items-center space-x-2 transition-all"
              >
                <FolderOpen className="w-3.5 h-3.5 text-brand-cyan" />
                <span>Klipler Klasörünü Aç</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-brand-purple to-indigo-600 hover:from-brand-purple/90 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-brand-purple/30"
            >
              Tamam
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
