import React, { useState } from 'react';
import {
  Flame,
  Clock,
  Play,
  Share2,
  FolderOpen,
  Sparkles,
  RefreshCw,
  Film,
  Video,
  CheckCircle,
  AlertTriangle,
  Maximize2,
  Scissors,
  Eye,
  ShieldCheck,
  Bot,
} from 'lucide-react';
import { ViralClip, ScheduledClipPackage } from '../types';
import { ThumbnailStudioModal } from './ThumbnailStudioModal';

interface CenterPanelProps {
  clips: ViralClip[];
  autopilotPackages?: ScheduledClipPackage[];
  onPreviewClip: (clip: ViralClip) => void;
  onShowInFolder: (path: string) => void;
  onReRenderClip: (clip: ViralClip) => void;
  onOpenTimeline: (clip: ViralClip) => void;
  onOpenSocialModal?: (clip: ViralClip) => void;
  onOpenAutopilot?: () => void;
  isProcessing: boolean;
  videoPath?: string;
  onUpdateClipThumbnail?: (clipId: number, newThumbnailPath: string) => void;
}

export const CenterPanel: React.FC<CenterPanelProps> = ({
  clips,
  autopilotPackages = [],
  onPreviewClip,
  onShowInFolder,
  onReRenderClip,
  onOpenTimeline,
  onOpenSocialModal,
  onOpenAutopilot,
  isProcessing,
  videoPath,
  onUpdateClipThumbnail,
}) => {
  const [filterTab, setFilterTab] = useState<'all' | 'studio' | 'autopilot'>('all');
  const [thumbnailStudioClip, setThumbnailStudioClip] = useState<ViralClip | null>(null);

  // Convert autopilot packages to ViralClip format
  const convertedAutopilotClips: ViralClip[] = (autopilotPackages || []).map((pkg) => ({
    clip_id: pkg.clipId || Number(pkg.id.replace(/\D/g, '').slice(-6)) || 999,
    title: pkg.title,
    start_time: '00:00',
    end_time: '00:45',
    start_seconds: 0,
    end_seconds: 45,
    duration_seconds: 45,
    hook_sentence: pkg.socialMetadata?.description?.split('\n')[0] || pkg.title,
    virality_score: pkg.viralityScore,
    reason: `7/24 Otopilot • ${pkg.dayLabel} (${pkg.slotTime})`,
    keywords: pkg.socialMetadata?.hashtags?.map((h) => h.replace('#', '')) || ['viral', 'kesfet'],
    outputPath: pkg.videoPath,
    thumbnailPath: pkg.thumbnailPath,
    directorNotes: `Kaynak: ${pkg.sourceVideo?.title} (${pkg.sourceVideo?.channel}) • CC-BY Lisanslı`,
    qaScore: pkg.qaScore || 95,
    socialMetadata: pkg.socialMetadata,
    status: 'completed',
    createdAt: pkg.createdAt,
  }));

  // Helper to sort clips newest-first (en yeni her zaman en üstte)
  const sortNewestFirst = (list: ViralClip[]) => {
    return [...list].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (timeA && timeB && timeA !== timeB) {
        return timeB - timeA;
      }
      if (timeB && !timeA) return 1;
      if (timeA && !timeB) return -1;
      return (b.clip_id || 0) - (a.clip_id || 0);
    });
  };

  const sortedStudioClips = sortNewestFirst(clips);
  const sortedAutopilotClips = sortNewestFirst(convertedAutopilotClips);
  const sortedAllClips = sortNewestFirst([...clips, ...convertedAutopilotClips]);

  const displayedClips =
    filterTab === 'studio'
      ? sortedStudioClips
      : filterTab === 'autopilot'
      ? sortedAutopilotClips
      : sortedAllClips;

  const getViralityBadge = (score: number) => {
    if (score >= 90) {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-sm flex items-center space-x-1">
          <Flame className="w-3.5 h-3.5 fill-current" />
          <span>%{score} Viral Potansiyel</span>
        </span>
      );
    }
    if (score >= 80) {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>%{score} Çok Yüksek</span>
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30 flex items-center space-x-1">
        <span>%{score} İyi Potansiyel</span>
      </span>
    );
  };

  return (
    <main className="flex-1 bg-dark-950 flex flex-col h-[calc(100vh-3.5rem)] overflow-y-auto p-6 space-y-6">
      {/* Top Bar / Stats & Filters */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center space-x-2">
            <span>Tespit Edilen Viral Klipler</span>
            {displayedClips.length > 0 && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand-purple/20 text-brand-purple font-semibold border border-brand-purple/30">
                {displayedClips.length} Klip Hazır
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            İzleyicinin dikkatini ilk saniyede yakalayacak 30-75 saniyelik Shorts & Reels kesitleri
          </p>
        </div>

        {/* Filter Pills */}
        {(clips.length > 0 || convertedAutopilotClips.length > 0) && (
          <div className="flex items-center space-x-1.5 bg-dark-900 p-1 rounded-2xl border border-dark-750">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterTab === 'all'
                  ? 'bg-brand-purple text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Tümü ({sortedAllClips.length})
            </button>
            <button
              onClick={() => setFilterTab('studio')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterTab === 'studio'
                  ? 'bg-brand-purple text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🎬 Stüdyo ({clips.length})
            </button>
            <button
              onClick={() => setFilterTab('autopilot')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterTab === 'autopilot'
                  ? 'bg-brand-purple text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🤖 7/24 Otopilot ({convertedAutopilotClips.length})
            </button>
          </div>
        )}
      </div>

      {/* When no clips are produced yet */}
      {displayedClips.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-dark-700 rounded-3xl p-12 text-center bg-dark-900/30">
          <div className="w-16 h-16 rounded-3xl bg-brand-purple/10 text-brand-purple flex items-center justify-center mb-4 shadow-xl shadow-brand-purple/10">
            <Film className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-200">
            Henüz Klip Üretilmedi
          </h3>
          <p className="text-sm text-slate-400 max-w-md mt-1.5 leading-relaxed">
            Sol panelden videonuzu seçin veya üstteki <strong className="text-amber-400 font-semibold">"🤖 7/24 Otopilot"</strong> modülüyle otomatik telifsiz viral videolar bulun.
          </p>

          {/* Workflow Steps Preview Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 max-w-2xl text-left">
            <div className="p-4 rounded-2xl bg-dark-850/60 border border-dark-700/60 space-y-1">
              <span className="text-brand-purple font-bold text-xs">Adım 1 & 2</span>
              <p className="text-xs font-semibold text-slate-200">Whisper Deşifre</p>
              <p className="text-[11px] text-slate-400">
                Ses ayıklanır ve CUDA GPU ile kelime kelime zaman damgalanır.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-dark-850/60 border border-dark-700/60 space-y-1">
              <span className="text-brand-cyan font-bold text-xs">Adım 3</span>
              <p className="text-xs font-semibold text-slate-200">AI Highlight Analizi</p>
              <p className="text-[11px] text-slate-400">
                Yerel Ollama veya Groq, ilk 3 saniyesinde güçlü kanca olan 30-75 sn kesitleri bulur.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-dark-850/60 border border-dark-700/60 space-y-1">
              <span className="text-emerald-400 font-bold text-xs">Adım 4 & 5</span>
              <p className="text-xs font-semibold text-slate-200">9:16 Render & Altyazı</p>
              <p className="text-[11px] text-slate-400">
                Bulanık arka plan ve TikTok stili dinamik kelime vurguları videoya gömülür.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Wide Clips List (Inline 9:16 Preview on Left, Metadata on Right) */
        <div className="space-y-6 max-w-5xl mx-auto w-full">
          {displayedClips.map((clip, index) => {
            const hasOutput = !!clip.outputPath;
            const videoSrc = hasOutput
              ? `http://127.0.0.1:39821/stream?path=${encodeURIComponent(clip.outputPath!)}`
              : '';
            const isAutopilotClip = clip.reason?.includes('Otopilot');
            const uniqueKey = `${isAutopilotClip ? 'ap' : 'std'}_${clip.clip_id}_${index}`;
            return (
              <div
                key={uniqueKey}
                className="bg-dark-850/90 border border-dark-700 hover:border-brand-purple/50 rounded-3xl p-5 transition-all hover:shadow-2xl hover:shadow-black/60 group flex flex-col md:flex-row gap-6 items-stretch"
              >
                {/* Left: 9:16 Video Preview Player Container */}
                <div className="w-full md:w-[220px] lg:w-[240px] aspect-[9/16] rounded-2xl overflow-hidden bg-black border border-dark-700/80 shadow-inner flex items-center justify-center relative shrink-0">
                  {hasOutput ? (
                    <video
                      src={videoSrc}
                      controls
                      playsInline
                      preload="metadata"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-4 text-center space-y-2">
                      <Film className="w-8 h-8 text-slate-600 animate-pulse" />
                      <span className="text-xs text-slate-500 font-medium">Render Bekleniyor...</span>
                    </div>
                  )}
                </div>

                {/* Right: Clip Details & Metadata */}
                <div className="flex-1 min-w-0 flex flex-col justify-between space-y-4 overflow-hidden">
                  <div className="space-y-3">
                    {/* Top Header of Card */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center space-x-2">
                        {getViralityBadge(clip.virality_score)}
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-dark-900 text-slate-300 border border-dark-750">
                          {clip.duration_seconds} saniye
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-xs font-mono text-slate-400 bg-dark-900/80 px-2.5 py-1 rounded-lg border border-dark-750">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>{clip.start_time} - {clip.end_time}</span>
                      </div>
                    </div>

                    {/* Title */}
                    <h4 className="text-lg font-bold text-white group-hover:text-brand-purple transition-colors truncate">
                      {clip.title}
                    </h4>

                    {/* Hook Box */}
                    {(() => {
                      const rawHook = clip.hook_sentence
                        ? clip.hook_sentence.replace(/^[“"”\s]+|[“"”\s]+$/g, '').trim()
                        : '';
                      const displayHook = (rawHook && rawHook.length > 2 && rawHook !== '""')
                        ? rawHook
                        : (clip.title ? `🔥 ${clip.title}` : '🔥 Dikkat çekici açılış kancası');
                      return (
                        <div className="p-3.5 rounded-xl bg-dark-900/90 border border-brand-purple/20 space-y-1">
                          <span className="text-[10px] font-semibold text-brand-purple uppercase tracking-wider block">
                            İlk 3-5 Saniye Kancası (Hook)
                          </span>
                          <p className="text-sm italic text-slate-200 break-words line-clamp-2">
                            "{displayHook}"
                          </p>
                        </div>
                      );
                    })()}

                    {/* Reason */}
                    <p className="text-xs text-slate-400 leading-relaxed break-words line-clamp-2">
                      <strong className="text-slate-300 font-medium">Yapay Zeka Seçim Gerekçesi: </strong>
                      {clip.reason}
                    </p>

                    {/* Keywords */}
                    <div className="flex flex-wrap gap-1.5 pt-1 max-w-full overflow-hidden">
                      {clip.keywords.map((kw, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-lg bg-dark-900 text-[11px] font-medium text-slate-300 border border-dark-750"
                        >
                          #{kw}
                        </span>
                      ))}
                    </div>

                    {/* Art Director Thumbnail & QA Score (If generated by Agency) */}
                    {(clip.thumbnailPath || clip.qaScore) && (
                      <div className="p-3 rounded-2xl bg-dark-900/90 border border-brand-cyan/25 flex items-start gap-3 shadow-sm w-full overflow-hidden">
                        {clip.thumbnailPath && (
                          <img
                            src={`http://127.0.0.1:39821/stream?path=${encodeURIComponent(clip.thumbnailPath)}`}
                            alt=""
                            className="w-14 h-14 object-cover rounded-xl border border-dark-700 shrink-0 bg-black mt-0.5"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        )}
                        <div className="flex-1 min-w-0 space-y-1 overflow-hidden">
                          <div className="flex items-center flex-wrap gap-1.5">
                            <span className="text-[10px] font-bold text-brand-cyan uppercase tracking-wider flex items-center bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20 truncate">
                              <Eye className="w-3 h-3 mr-1 text-brand-cyan shrink-0" />
                              <span className="truncate">Qwen-VL Kapak {clip.thumbnailSecond !== undefined ? `(${clip.thumbnailSecond}s)` : ''}</span>
                            </span>
                            {clip.qaScore && (
                              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center shrink-0">
                                <ShieldCheck className="w-3 h-3 mr-1 text-emerald-400" />
                                QA: %{clip.qaScore}
                              </span>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setThumbnailStudioClip(clip);
                              }}
                              className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-lg bg-brand-purple/20 hover:bg-brand-purple/40 text-brand-purple border border-brand-purple/30 flex items-center gap-1 transition-all"
                              title="Gelişmiş AI Kapak & Thumbnail Tasarımcısı"
                            >
                              <Sparkles className="w-3 h-3 text-amber-400" />
                              <span>🎨 Kapak Tasarla</span>
                            </button>
                          </div>
                          {clip.directorNotes && (
                            <p className="text-[11px] text-slate-300 italic line-clamp-2 break-words leading-relaxed w-full" title={clip.directorNotes}>
                              "{clip.directorNotes}"
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bottom Actions */}
                  <div className="pt-4 border-t border-dark-750 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {hasOutput && (
                        <>
                          <button
                            onClick={() => onPreviewClip(clip)}
                            className="py-2 px-3.5 rounded-xl bg-brand-purple hover:bg-brand-violet text-white text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-md shadow-brand-purple/20 hover:scale-105 active:scale-95"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                            <span>Tam Ekran</span>
                          </button>
                          <button
                            onClick={() => onOpenTimeline(clip)}
                            className="py-2 px-3 rounded-xl bg-dark-900 hover:bg-dark-800 text-brand-purple hover:text-white border border-brand-purple/40 text-xs font-medium flex items-center space-x-1.5 transition-colors"
                            title="Timeline Stüdyosu (Kes, Altyazı, Müzik)"
                          >
                            <Scissors className="w-3.5 h-3.5" />
                            <span>Düzenle (Timeline)</span>
                          </button>
                          <button
                            onClick={() => setThumbnailStudioClip(clip)}
                            className="py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-brand-purple/20 hover:from-amber-500/25 hover:to-brand-purple/35 text-amber-300 hover:text-white border border-amber-500/30 text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-sm hover:scale-105 active:scale-95"
                            title="Klibin karesini seç, viral sticker ve kanca başlığı ekle"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                            <span>🎨 Kapak Tasarla</span>
                          </button>
                          <button
                            onClick={() => onShowInFolder(clip.outputPath!)}
                            className="p-2 rounded-xl bg-dark-900 hover:bg-dark-800 text-slate-300 hover:text-white border border-dark-700 transition-colors"
                            title="Klasörde Göster"
                          >
                            <FolderOpen className="w-4 h-4 text-brand-cyan" />
                          </button>
                          {onOpenSocialModal && (
                            <button
                              onClick={() => onOpenSocialModal(clip)}
                              className="py-2 px-3 rounded-xl bg-gradient-to-r from-pink-600/20 to-purple-600/20 hover:from-pink-600/30 hover:to-purple-600/30 text-pink-300 hover:text-white border border-pink-500/30 text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-sm hover:scale-105 active:scale-95"
                              title="Viral Başlık, Açıklama & Hashtag Asistanı"
                            >
                              <Share2 className="w-3.5 h-3.5 text-pink-400" />
                              <span>Sosyal Medya Metinleri</span>
                            </button>
                          )}
                        </>
                      )}
                    </div>

                    <button
                      onClick={() => onReRenderClip(clip)}
                      disabled={isProcessing}
                      className="text-xs text-slate-400 hover:text-brand-purple flex items-center space-x-1.5 px-3 py-1.5 rounded-xl hover:bg-dark-900 transition-colors border border-transparent hover:border-dark-700"
                      title="Altyazı veya düzen ayarlarıyla yeniden render et"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Yeniden Boyutlandır</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* AI Thumbnail Studio Modal */}
      {thumbnailStudioClip && (
        <ThumbnailStudioModal
          isOpen={true}
          onClose={() => setThumbnailStudioClip(null)}
          clip={thumbnailStudioClip}
          videoPath={videoPath || thumbnailStudioClip.outputPath}
          onUpdateClipThumbnail={(clipId, path) => {
            if (onUpdateClipThumbnail) {
              onUpdateClipThumbnail(clipId, path);
            }
            setThumbnailStudioClip((prev) => (prev ? { ...prev, thumbnailPath: path } : null));
          }}
        />
      )}
    </main>
  );
};
