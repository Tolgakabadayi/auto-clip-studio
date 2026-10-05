import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  FileVideo,
  Play,
  Settings,
  Cpu,
  Sparkles,
  Key,
  Check,
  Terminal,
  Loader2,
  FolderOpen,
  Scissors,
  Clock,
  Sliders,
  CheckCircle2,
  Download,
  Link2,
  ArrowRight,
  Globe,
  Film,
  RotateCcw,
  Layers,
  XCircle,
  AlertCircle,
  X,
  Trash2,
  ArrowLeft,
  Lock,
  Maximize2,
  Smartphone,
  Tv,
  Type,
  Palette,
  Bot,
  Zap,
} from 'lucide-react';
import { VideoMetadata, PipelineProgress, PipelineStep, SubtitleStyleConfig, AutopilotState } from '../types';
import { TerminalLogs } from './TerminalLogs';

const YouTubeIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

type LeftTab = 'source' | 'clips' | 'models' | 'layout' | 'logs';

interface LeftPanelProps {
  videoMetadata: VideoMetadata | null;
  onSelectVideo: () => void;
  onDropVideoFile: (fileOrPath: any) => void;
  onClearVideo?: () => void;
  onStartPipeline: () => void;
  onCancelPipeline?: () => void;
  onDownloadYouTube?: (url: string, autoStart: boolean, quality?: string) => Promise<void>;
  pipelineProgress: PipelineProgress;
  isProcessing: boolean;
  logs: string[];
  logsPosition?: 'left' | 'right' | 'bottom';
  onChangeLogsPosition?: (pos: 'left' | 'right' | 'bottom') => void;
  isLayoutLocked?: boolean;
  // Settings
  llmProvider: 'ollama' | 'groq';
  setLlmProvider: (val: 'ollama' | 'groq') => void;
  groqApiKey: string;
  setGroqApiKey: (val: string) => void;
  ollamaModel: string;
  setOllamaModel: (val: string) => void;
  groqModel: string;
  setGroqModel: (val: string) => void;
  availableOllamaModels: string[];
  whisperModel: 'tiny' | 'base' | 'small' | 'medium' | 'large-v3';
  setWhisperModel: (val: any) => void;
  language: string;
  setLanguage: (val: string) => void;
  aspectRatio: '9:16' | '16:9';
  setAspectRatio: (ratio: '9:16' | '16:9') => void;
  layoutMode: 'blur_background' | 'crop_center' | 'smart_face_tracking';
  setLayoutMode: (mode: 'blur_background' | 'crop_center' | 'smart_face_tracking') => void;
  // Subtitle Styling
  subtitleConfig: SubtitleStyleConfig;
  setSubtitleConfig: React.Dispatch<React.SetStateAction<SubtitleStyleConfig>>;
  // Autonomous Agency Mode & 7/24 Autopilot
  agencyMode?: boolean;
  setAgencyMode?: (val: boolean) => void;
  onOpenAgencyRoom?: () => void;
  onOpenAutopilot?: () => void;
  autopilotState?: AutopilotState | null;
  enableSilenceRemoval?: boolean;
  setEnableSilenceRemoval?: (val: boolean) => void;
  // Clip Count & Duration
  clipCount: number;
  setClipCount: (count: number) => void;
  minClipDuration: number;
  setMinClipDuration: (dur: number) => void;
  maxClipDuration: number;
  setMaxClipDuration: (dur: number) => void;
}

export const LeftPanel: React.FC<LeftPanelProps> = ({
  videoMetadata,
  onSelectVideo,
  onDropVideoFile,
  onClearVideo,
  onStartPipeline,
  onCancelPipeline,
  onDownloadYouTube,
  pipelineProgress,
  isProcessing,
  logs,
  logsPosition = 'left',
  onChangeLogsPosition = () => {},
  isLayoutLocked = true,
  llmProvider,
  setLlmProvider,
  groqApiKey,
  setGroqApiKey,
  ollamaModel,
  setOllamaModel,
  groqModel,
  setGroqModel,
  availableOllamaModels,
  whisperModel,
  setWhisperModel,
  language,
  setLanguage,
  aspectRatio = '9:16',
  setAspectRatio,
  layoutMode = 'smart_face_tracking',
  setLayoutMode,
  subtitleConfig,
  setSubtitleConfig,
  agencyMode = true,
  setAgencyMode,
  onOpenAgencyRoom,
  onOpenAutopilot,
  autopilotState,
  enableSilenceRemoval = false,
  setEnableSilenceRemoval,
  clipCount,
  setClipCount,
  minClipDuration,
  setMinClipDuration,
  maxClipDuration,
  setMaxClipDuration,
}) => {
  // Navigation Tab State & Step Stepper
  const [activeTab, setActiveTab] = useState<LeftTab>('source');
  const [maxUnlockedStep, setMaxUnlockedStep] = useState<number>(1);
  const [sourceType, setSourceType] = useState<'youtube' | 'local'>('youtube');

  // Drag and Drop & File Input
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Clear current selected video & reset file input
  const handleClearSelection = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onClearVideo) {
      onClearVideo();
    }
  };

  // Synchronize unlocked steps based on videoMetadata presence
  useEffect(() => {
    if (videoMetadata) {
      setMaxUnlockedStep((prev) => Math.max(prev, 2));
    } else {
      setMaxUnlockedStep(1);
      if (activeTab !== 'source') {
        setActiveTab('source');
      }
    }
  }, [videoMetadata]);

  // Stepper mappings (1 to 5)
  const stepNumbers: Record<LeftTab, number> = {
    source: 1,
    clips: 2,
    models: 3,
    layout: 4,
    logs: 5,
  };

  const isTabAccessible = (tab: LeftTab) => {
    if (tab === 'source') return true;
    if (!videoMetadata) return false;
    return maxUnlockedStep >= stepNumbers[tab];
  };

  const goToStep = (tab: LeftTab) => {
    const target = stepNumbers[tab];
    if (target > 1 && !videoMetadata) return;
    setMaxUnlockedStep((prev) => Math.max(prev, target));
    setActiveTab(tab);
  };

  // YouTube Downloader State
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeQuality, setYoutubeQuality] = useState<'1080p' | '720p' | '480p' | 'best'>('1080p');
  const [isDownloadingYt, setIsDownloadingYt] = useState(false);
  const [ytError, setYtError] = useState('');

  // Auto-switch to logs tab ONLY when active clip generation pipeline is running
  useEffect(() => {
    const activePipelineSteps: PipelineStep[] = [
      'extracting_audio',
      'transcribing',
      'detecting_highlights',
      'rendering_clips',
    ];
    if (isProcessing && activePipelineSteps.includes(pipelineProgress.step)) {
      setMaxUnlockedStep(5);
      setActiveTab('logs');
    }
  }, [isProcessing, pipelineProgress.step]);

  const isValidYt = (url: string) => {
    return /^(https?:\/\/)?(www\.|m\.)?(youtube\.com\/(watch\?.*v=|shorts\/|live\/|embed\/)|youtu\.be\/)[a-zA-Z0-9_-]{6,}/i.test(url.trim());
  };

  const handleDownloadClick = async () => {
    if (!youtubeUrl.trim()) {
      setYtError('Lütfen bir YouTube veya Shorts linki girin.');
      return;
    }
    if (!isValidYt(youtubeUrl)) {
      setYtError('Geçerli bir YouTube veya Shorts bağlantısı giriniz.');
      return;
    }
    setYtError('');
    setIsDownloadingYt(true);
    try {
      if (onDownloadYouTube) {
        await onDownloadYouTube(youtubeUrl.trim(), false, youtubeQuality);
        setYoutubeUrl('');
        setMaxUnlockedStep((prev) => Math.max(prev, 2));
        setActiveTab('clips');
      }
    } catch (err: any) {
      setYtError(err.message || 'İndirme hatası oluştu.');
    } finally {
      setIsDownloadingYt(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins} dk ${secs} sn`;
  };

  const formatFileSize = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      onDropVideoFile(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      onDropVideoFile(file);
    }
  };

  // Step active / completed helper
  const getStepState = (stepKey: PipelineStep) => {
    const stepOrder: PipelineStep[] = [
      'downloading_youtube',
      'extracting_audio',
      'transcribing',
      'detecting_highlights',
      'rendering_clips',
      'completed',
    ];
    const currentIndex = stepOrder.indexOf(pipelineProgress.step);
    const targetIndex = stepOrder.indexOf(stepKey);

    if (pipelineProgress.step === 'completed') return 'completed';
    if (pipelineProgress.step === stepKey) return 'active';
    if (currentIndex > targetIndex && currentIndex !== -1) return 'completed';
    return 'pending';
  };

  const stepsConfig: { key: PipelineStep; title: string; desc: string }[] = [
    { key: 'extracting_audio', title: '1. Ses Ayıklama', desc: '16kHz mono WAV çıkarılıyor' },
    { key: 'transcribing', title: '2. Whisper Deşifre', desc: 'Kelime bazlı zaman damgaları' },
    { key: 'detecting_highlights', title: '3. Viral Analiz', desc: 'LLM kanca & viral kesit tespiti' },
    { key: 'rendering_clips', title: '4. Render & Altyazı', desc: `${aspectRatio} formatında altyazı gömme` },
  ];

  const durationPresets = [
    { label: '30-45s (Hızlı)', min: 30, max: 45 },
    { label: '45-60s (Standart)', min: 45, max: 60 },
    { label: '60-90s (Detaylı)', min: 60, max: 90 },
  ];

  return (
    <aside className="w-96 border-r border-dark-700 bg-dark-900/90 backdrop-blur flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden select-none">
      {/* Hidden file input fallback */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept="video/mp4,video/mkv,video/quicktime,video/webm,video/*,.mp4,.mkv,.mov,.webm"
        className="hidden"
      />

      {/* TOP STAGE TABS BAR - 5 STAGES */}
      <div className="p-2 border-b border-dark-700 bg-dark-900/95 shrink-0">
        <div className="grid grid-cols-5 gap-1 bg-dark-850 p-1 rounded-xl border border-dark-700 text-xs font-semibold">
          {/* Tab 1: Source */}
          <button
            type="button"
            onClick={() => goToStep('source')}
            className={`py-1.5 px-0.5 rounded-lg flex flex-col items-center justify-center transition-all ${
              activeTab === 'source'
                ? 'bg-brand-purple text-white shadow-sm shadow-brand-purple/20'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Aşama 1: Video Kaynağı"
          >
            <span className="text-[10px] leading-tight">1. Kaynak</span>
          </button>

          {/* Tab 2: Clips */}
          <button
            type="button"
            disabled={!isTabAccessible('clips')}
            onClick={() => goToStep('clips')}
            className={`py-1.5 px-0.5 rounded-lg flex flex-col items-center justify-center transition-all ${
              activeTab === 'clips'
                ? 'bg-brand-purple text-white shadow-sm shadow-brand-purple/20'
                : !isTabAccessible('clips')
                ? 'text-slate-600 opacity-40 cursor-not-allowed'
                : 'text-slate-400 hover:text-white'
            }`}
            title={!isTabAccessible('clips') ? 'Önce video seçmelisiniz' : 'Aşama 2: Klip Sayısı & Süre'}
          >
            <span className="text-[10px] leading-tight flex items-center space-x-0.5">
              <span>2. Süre</span>
              {!isTabAccessible('clips') && <Lock className="w-2.5 h-2.5 text-slate-500" />}
            </span>
          </button>

          {/* Tab 3: Models */}
          <button
            type="button"
            disabled={!isTabAccessible('models')}
            onClick={() => goToStep('models')}
            className={`py-1.5 px-0.5 rounded-lg flex flex-col items-center justify-center transition-all ${
              activeTab === 'models'
                ? 'bg-brand-purple text-white shadow-sm shadow-brand-purple/20'
                : !isTabAccessible('models')
                ? 'text-slate-600 opacity-40 cursor-not-allowed'
                : 'text-slate-400 hover:text-white'
            }`}
            title={!isTabAccessible('models') ? 'Aşama 2\'yi tamamlayın' : 'Aşama 3: Model & Dil'}
          >
            <span className="text-[10px] leading-tight flex items-center space-x-0.5">
              <span>3. Model</span>
              {!isTabAccessible('models') && <Lock className="w-2.5 h-2.5 text-slate-500" />}
            </span>
          </button>

          {/* Tab 4: Layout */}
          <button
            type="button"
            disabled={!isTabAccessible('layout')}
            onClick={() => goToStep('layout')}
            className={`py-1.5 px-0.5 rounded-lg flex flex-col items-center justify-center transition-all ${
              activeTab === 'layout'
                ? 'bg-brand-purple text-white shadow-sm shadow-brand-purple/20'
                : !isTabAccessible('layout')
                ? 'text-slate-600 opacity-40 cursor-not-allowed'
                : 'text-slate-400 hover:text-white'
            }`}
            title={!isTabAccessible('layout') ? 'Aşama 3\'ü tamamlayın' : 'Aşama 4: Video Düzeni'}
          >
            <span className="text-[10px] leading-tight flex items-center space-x-0.5">
              <span>4. Düzen</span>
              {!isTabAccessible('layout') && <Lock className="w-2.5 h-2.5 text-slate-500" />}
            </span>
          </button>

          {/* Tab 5: Logs */}
          <button
            type="button"
            disabled={!isTabAccessible('logs') && !isProcessing}
            onClick={() => goToStep('logs')}
            className={`py-1.5 px-0.5 rounded-lg flex flex-col items-center justify-center transition-all relative ${
              activeTab === 'logs'
                ? 'bg-brand-purple text-white shadow-sm shadow-brand-purple/20'
                : isProcessing
                ? 'text-brand-cyan animate-pulse bg-brand-cyan/10 border border-brand-cyan/30'
                : !isTabAccessible('logs')
                ? 'text-slate-600 opacity-40 cursor-not-allowed'
                : 'text-slate-400 hover:text-white'
            }`}
            title={!isTabAccessible('logs') ? 'Aşama 4\'ü tamamlayın' : 'Aşama 5: Üretim & Günlük'}
          >
            <span className="text-[10px] leading-tight flex items-center space-x-0.5">
              <span>5. Günlük</span>
              {!isTabAccessible('logs') && !isProcessing && <Lock className="w-2.5 h-2.5 text-slate-500" />}
              {isProcessing && (
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping inline-block" />
              )}
            </span>
          </button>
        </div>
      </div>

      {/* SCROLLABLE TAB CONTENTS */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* ======================================================== */}
        {/* TAB 1: İÇERİK / KAYNAK YÜKLE (YOUTUBE VEYA YEREL DOSYA) */}
        {/* ======================================================== */}
        {activeTab === 'source' && (
          <div className="space-y-4">
            {/* Sub-toggle: YouTube vs Local */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Kaynak Türünü Seçin
              </label>
              <div className="grid grid-cols-2 gap-1.5 bg-dark-950 p-1 rounded-xl border border-dark-750">
                <button
                  type="button"
                  onClick={() => setSourceType('youtube')}
                  className={`py-2 px-2 text-xs font-semibold rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
                    sourceType === 'youtube'
                      ? 'bg-red-600/20 text-red-400 border border-red-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <YouTubeIcon className="w-3.5 h-3.5 text-red-500" />
                  <span>YouTube / Shorts</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSourceType('local')}
                  className={`py-2 px-2 text-xs font-semibold rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
                    sourceType === 'local'
                      ? 'bg-brand-purple/20 text-brand-purple border border-brand-purple/40 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileVideo className="w-3.5 h-3.5 text-brand-purple" />
                  <span>Yerel Dosya (MP4)</span>
                </button>
              </div>
            </div>

            {/* Option A: YouTube Downloader */}
            {sourceType === 'youtube' && (
              <div className="bg-dark-850 border border-dark-700 hover:border-red-500/40 rounded-2xl p-4 space-y-3 transition-colors shadow-sm">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-200 flex items-center space-x-1.5">
                    <YouTubeIcon className="w-4 h-4 text-red-500" />
                    <span>YouTube Linki Girin</span>
                  </label>
                  <span className="text-[10px] text-slate-400 bg-dark-900 px-2 py-0.5 rounded-full border border-dark-750">
                    Otomatik MP4 İndirme
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2 bg-dark-900 border border-dark-700 focus-within:border-red-500/60 rounded-xl px-3 py-2 transition-colors">
                    <Link2 className="w-4 h-4 text-slate-500 shrink-0" />
                    <input
                      type="text"
                      value={youtubeUrl}
                      onChange={(e) => {
                        setYoutubeUrl(e.target.value);
                        if (ytError) setYtError('');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !isDownloadingYt && !isProcessing) {
                          handleDownloadClick();
                        }
                      }}
                      disabled={isDownloadingYt || isProcessing}
                      placeholder="https://youtube.com/watch?v=... veya Shorts"
                      className="w-full bg-transparent text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none"
                    />
                    {youtubeUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setYoutubeUrl('');
                          if (ytError) setYtError('');
                        }}
                        className="text-slate-500 hover:text-rose-400 p-0.5 rounded transition-colors"
                        title="Linki Temizle"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {ytError && (
                    <p className="text-[11px] text-rose-400 font-medium px-1 flex items-center">
                      ⚠ {ytError}
                    </p>
                  )}
                </div>

                {/* YouTube Download Quality Selector */}
                <div className="flex items-center justify-between gap-1 p-2 bg-dark-900/80 rounded-xl border border-dark-750">
                  <div className="flex items-center space-x-1.5 text-[11px] text-slate-300 font-medium">
                    <Sliders className="w-3.5 h-3.5 text-red-500" />
                    <span>İndirme Kalitesi:</span>
                  </div>
                  <div className="flex items-center gap-1 bg-dark-950/80 p-0.5 rounded-lg border border-dark-800">
                    {[
                      { id: '1080p', label: '1080p FHD' },
                      { id: '720p', label: '720p HD' },
                      { id: '480p', label: '480p' },
                      { id: 'best', label: '⚡ En Yüksek' },
                    ].map((q) => (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => setYoutubeQuality(q.id as any)}
                        disabled={isDownloadingYt}
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all ${
                          youtubeQuality === q.id
                            ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-sm shadow-red-600/30'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-dark-800'
                        } disabled:opacity-50`}
                      >
                        {q.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Download Progress Bar with Live Telemetry if active */}
                {isDownloadingYt && (
                  <div className="p-3.5 bg-dark-900 border border-red-500/30 rounded-xl space-y-2 shadow-lg">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-white font-bold flex items-center">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-red-500 mr-1.5" />
                        YouTube İndiriliyor...
                      </span>
                      <span className="text-red-400 font-mono font-bold text-xs">
                        %{pipelineProgress.percent || 10}
                      </span>
                    </div>

                    <div className="w-full bg-dark-800 rounded-full h-2 overflow-hidden border border-dark-750">
                      <div
                        className="bg-gradient-to-r from-red-600 to-rose-500 h-2 transition-all duration-300 rounded-full shadow-sm shadow-red-500/50"
                        style={{ width: `${Math.max(5, pipelineProgress.percent || 10)}%` }}
                      />
                    </div>

                    {/* Rich Telemetry Grid: Speed, Downloaded / Total, ETA */}
                    <div className="grid grid-cols-3 gap-1.5 pt-1 text-[10px] font-mono border-t border-dark-800">
                      <div className="bg-dark-950/80 p-1.5 rounded-lg border border-dark-800 text-center">
                        <span className="text-slate-400 block text-[9px]">İndirme Hızı</span>
                        <span className="text-emerald-400 font-bold truncate block">
                          {pipelineProgress.downloadTelemetry?.speed || 'Hesaplanıyor'}
                        </span>
                      </div>
                      <div className="bg-dark-950/80 p-1.5 rounded-lg border border-dark-800 text-center">
                        <span className="text-slate-400 block text-[9px]">Veri Boyutu</span>
                        <span className="text-brand-cyan font-bold truncate block" title={pipelineProgress.downloadTelemetry?.totalSize}>
                          {pipelineProgress.downloadTelemetry?.downloadedSize && pipelineProgress.downloadTelemetry?.totalSize
                            ? `${pipelineProgress.downloadTelemetry.downloadedSize} / ${pipelineProgress.downloadTelemetry.totalSize}`
                            : pipelineProgress.downloadTelemetry?.totalSize || 'Hesaplanıyor'}
                        </span>
                      </div>
                      <div className="bg-dark-950/80 p-1.5 rounded-lg border border-dark-800 text-center">
                        <span className="text-slate-400 block text-[9px]">Kalan Süre</span>
                        <span className="text-amber-400 font-bold truncate block">
                          {pipelineProgress.downloadTelemetry?.eta || 'Hesaplanıyor'}
                        </span>
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-300 truncate font-sans">{pipelineProgress.message}</p>
                  </div>
                )}

                {/* Download Button -> Progressively unlocks Step 2 */}
                <button
                  type="button"
                  onClick={handleDownloadClick}
                  disabled={!youtubeUrl.trim() || isDownloadingYt || isProcessing}
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold flex items-center justify-center space-x-2 transition-all shadow-md shadow-red-600/20 hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Videoyu indirir ve otomatik olarak Aşama 2'ye (Süre Ayarları) geçer"
                >
                  {isDownloadingYt ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                      <span>İndiriliyor...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>Videoyu İndir ve Ayarlara Geç</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Option B: Local Video Dropzone */}
            {sourceType === 'local' && (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => {
                  if (window.electronAPI) {
                    onSelectVideo();
                  } else {
                    fileInputRef.current?.click();
                  }
                }}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-brand-cyan bg-brand-cyan/10 scale-[1.02] shadow-lg shadow-brand-cyan/20'
                    : 'border-dark-600 hover:border-brand-purple/70 bg-dark-850/60 hover:bg-dark-800/80'
                } group`}
              >
                <div className="w-12 h-12 mx-auto rounded-full bg-brand-purple/10 text-brand-purple group-hover:scale-110 transition-transform flex items-center justify-center mb-3">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-200 group-hover:text-white">
                  {isDragging ? 'Videoyu Buraya Bırakın!' : 'Videoyu Sürükleyin veya Tıklayın'}
                </p>
                <p className="text-xs text-slate-400 mt-1">MP4, MKV, MOV, WEBM desteklenir</p>

                <div className="mt-4 inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-dark-800 hover:bg-dark-700 text-xs font-semibold text-slate-200 border border-dark-600 transition-colors">
                  <FileVideo className="w-4 h-4 text-brand-purple" />
                  <span>Bilgisayardan Dosya Seç</span>
                </div>
              </div>
            )}

            {/* Current Loaded Video Card */}
            {videoMetadata && (
              <div className="bg-dark-850 border border-emerald-500/30 rounded-2xl p-4 space-y-3 shadow-md shadow-emerald-500/5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 flex items-center">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                    Seçili Video
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (window.electronAPI) onSelectVideo();
                        else fileInputRef.current?.click();
                      }}
                      className="text-[11px] text-slate-400 hover:text-white underline font-medium px-1"
                      title="Farklı bir video seç"
                    >
                      Değiştir
                    </button>
                    {onClearVideo && (
                      <button
                        type="button"
                        onClick={handleClearSelection}
                        className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors"
                        title="Seçili videoyu kaldır / iptal et"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Seçimi İptal Et</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-dark-900 border border-dark-750 flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-purple/20 text-brand-purple flex items-center justify-center shrink-0">
                    <Film className="w-5 h-5" />
                  </div>
                  <div className="overflow-hidden flex-1">
                    <p className="text-xs font-bold text-white truncate" title={videoMetadata.name}>
                      {videoMetadata.name}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {formatDuration(videoMetadata.duration)} • {formatFileSize(videoMetadata.size)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                  <span>Çözünürlük: <strong className="text-slate-200">{videoMetadata.width}x{videoMetadata.height}</strong></span>
                  <span>Format: <strong className="text-slate-200">{videoMetadata.format}</strong></span>
                </div>

                {/* Wizard Next Button */}
                <button
                  type="button"
                  onClick={() => goToStep('clips')}
                  className="w-full py-2.5 px-3 rounded-xl bg-dark-800 hover:bg-dark-750 border border-dark-600 text-xs font-bold text-slate-200 hover:text-white transition-all flex items-center justify-center space-x-1.5 shadow-sm"
                >
                  <span>Sonraki Adım: Klip ve Süre Ayarları</span>
                  <ArrowRight className="w-3.5 h-3.5 text-brand-cyan" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: KLİP SAYISI VE SÜRE AYARLARI                      */}
        {/* ======================================================== */}
        {activeTab === 'clips' && (
          <div className="space-y-4">
            <div className="bg-dark-850 border border-dark-700 rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center">
                  <Scissors className="w-4 h-4 text-brand-cyan mr-1.5" />
                  Klip Adedi ve Hedef Süre
                </label>
                <span className="text-[10px] text-slate-400 bg-dark-900 px-2 py-0.5 rounded-full border border-dark-750">
                  Aşama 2 / 5
                </span>
              </div>

              {/* Klip Sayısı Seçimi */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">Üretilecek Klip Sayısı:</span>
                  <span className="font-bold text-brand-purple px-2.5 py-0.5 rounded-full bg-brand-purple/10 border border-brand-purple/20">
                    {clipCount} Klip
                  </span>
                </div>
                <div className="grid grid-cols-6 gap-1.5">
                  {[1, 2, 3, 4, 5, 8].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setClipCount(count)}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                        clipCount === count
                          ? 'bg-brand-purple text-white border-brand-purple shadow-sm shadow-brand-purple/30 scale-105'
                          : 'bg-dark-900 text-slate-400 border-dark-700 hover:border-dark-600 hover:text-white'
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>

              {/* Klip Süre Aralıkları */}
              <div className="space-y-2.5 pt-2 border-t border-dark-750">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium flex items-center">
                    <Clock className="w-3.5 h-3.5 text-brand-purple mr-1.5" />
                    Hedef Klip Süresi:
                  </span>
                  <span className="font-mono text-xs text-brand-cyan font-bold bg-brand-cyan/10 px-2 py-0.5 rounded border border-brand-cyan/20">
                    {minClipDuration}s - {maxClipDuration}s
                  </span>
                </div>

                {/* Presets */}
                <div className="grid grid-cols-3 gap-1.5">
                  {durationPresets.map((preset) => {
                    const isSelected = minClipDuration === preset.min && maxClipDuration === preset.max;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          setMinClipDuration(preset.min);
                          setMaxClipDuration(preset.max);
                        }}
                        className={`py-2 px-2 text-[11px] font-semibold rounded-xl border transition-all ${
                          isSelected
                            ? 'bg-brand-cyan/20 text-brand-cyan border-brand-cyan/60 shadow-sm'
                            : 'bg-dark-900 text-slate-400 border-dark-700 hover:border-dark-600 hover:text-white'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>

                {/* Fine-tuning range sliders */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Min Süre</span>
                      <span className="text-slate-200 font-bold">{minClipDuration} sn</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="60"
                      step="5"
                      value={minClipDuration}
                      onChange={(e) => setMinClipDuration(Math.min(parseInt(e.target.value, 10), maxClipDuration - 10))}
                      className="w-full accent-brand-purple"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Max Süre</span>
                      <span className="text-slate-200 font-bold">{maxClipDuration} sn</span>
                    </div>
                    <input
                      type="range"
                      min="40"
                      max="120"
                      step="5"
                      value={maxClipDuration}
                      onChange={(e) => setMaxClipDuration(Math.max(parseInt(e.target.value, 10), minClipDuration + 10))}
                      className="w-full accent-brand-purple"
                    />
                  </div>
                </div>
              </div>

              {/* Wizard Navigation Buttons */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => goToStep('source')}
                  className="py-2.5 px-3 rounded-xl bg-dark-900 hover:bg-dark-800 border border-dark-700 text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center justify-center space-x-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Geri</span>
                </button>
                <button
                  type="button"
                  onClick={() => goToStep('models')}
                  className="col-span-2 py-2.5 px-3 rounded-xl bg-dark-800 hover:bg-dark-750 border border-dark-600 text-xs font-bold text-slate-200 hover:text-white transition-all flex items-center justify-center space-x-1.5 shadow-sm"
                >
                  <span>Sonraki: Model ve Dil</span>
                  <ArrowRight className="w-3.5 h-3.5 text-brand-cyan" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: YAPAY ZEKA MOTORU & DİL MODELLERİ                 */}
        {/* ======================================================== */}
        {activeTab === 'models' && (
          <div className="space-y-4">
            <div className="bg-dark-850 border border-dark-700 rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center">
                  <Sparkles className="w-4 h-4 text-brand-purple mr-1.5" />
                  Yapay Zeka Analiz Motoru
                </label>
                <span className="text-[10px] text-slate-400 bg-dark-900 px-2 py-0.5 rounded-full border border-dark-750">
                  Aşama 3 / 5
                </span>
              </div>

              {/* LLM Provider Selector */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLlmProvider('ollama')}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all ${
                    llmProvider === 'ollama'
                      ? 'bg-brand-purple/20 border-brand-purple text-brand-purple shadow-sm'
                      : 'bg-dark-900 border-dark-700 text-slate-400 hover:border-dark-600'
                  }`}
                >
                  Yerel Ollama (Önerilen)
                </button>
                <button
                  type="button"
                  onClick={() => setLlmProvider('groq')}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all ${
                    llmProvider === 'groq'
                      ? 'bg-brand-purple/20 border-brand-purple text-brand-purple shadow-sm'
                      : 'bg-dark-900 border-dark-700 text-slate-400 hover:border-dark-600'
                  }`}
                >
                  Groq API (Bulut / Hızlı)
                </button>
              </div>

              {/* Provider Options */}
              {llmProvider === 'ollama' && (
                <div className="space-y-2.5">
                  {/* Agency Mode Card */}
                  <div className="p-3.5 rounded-xl bg-gradient-to-br from-brand-purple/20 via-dark-850 to-dark-900 border border-brand-purple/40 space-y-2.5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Bot className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-bold text-white">👑 Otonom Ajans Modu</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAgencyMode && setAgencyMode(!agencyMode)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border transition-all ${
                          agencyMode
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                            : 'bg-dark-800 text-slate-400 border-dark-700'
                        }`}
                      >
                        {agencyMode ? 'AKTİF (5 AJAN)' : 'TEK MODEL'}
                      </button>
                    </div>

                    {agencyMode ? (
                      <div className="space-y-2 pt-1 border-t border-brand-purple/20">
                        <p className="text-[11px] text-slate-200 leading-snug">
                          <strong>5 Yerel Model İşbirliği Yapar:</strong> Scout Gemma (4B) ➜ CEO Qwen (8B) ➜ Görsel Qwen-VL ➜ Metin Yazarı ➜ QA Llama.
                        </p>
                        {onOpenAgencyRoom && (
                          <button
                            type="button"
                            onClick={onOpenAgencyRoom}
                            className="w-full py-1.5 px-3 rounded-lg bg-brand-purple/20 hover:bg-brand-purple/35 border border-brand-purple/50 text-white text-xs font-semibold transition-all flex items-center justify-center space-x-1.5 shadow-sm"
                          >
                            <Bot className="w-3.5 h-3.5 text-amber-400" />
                            <span>⚡ NEXUS WAR ROOM (14 Ajan)</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-400 leading-snug">
                        Standart mod: Aşağıda seçeceğiniz tek model analiz için kullanılır.
                      </p>
                    )}
                  </div>

                  {/* Single Model Selector (Visible when agencyMode is off) */}
                  {!agencyMode && (
                    <div className="p-3 rounded-xl bg-dark-900 border border-dark-700 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-300">Ollama Modeli</span>
                        <span className="flex items-center text-[10px] text-emerald-400 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse" />
                          localhost:11434
                        </span>
                      </div>

                      <select
                        value={ollamaModel}
                        onChange={(e) => setOllamaModel(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-xs bg-dark-850 border border-dark-600 text-white focus:outline-none focus:border-brand-purple"
                      >
                        <option value="gemma3:4b">💎 Gemma 3:4b (Kullanılan - Hızlı & Kararlı)</option>
                        <option value="qwen3:8b">🧠 Qwen3:8b (Yüksek Zeka & Akıcı Türkçe)</option>
                        <option value="qwen3-vl:8b">👁️ Qwen3-VL:8b (Görsel & Dil Modeli)</option>
                        <option value="qwen2.5:7b">🔥 Qwen 2.5:7b (Önerilen - Güçlü Mantık)</option>
                        {availableOllamaModels
                          .filter((m) => !['gemma3:4b', 'qwen3:8b', 'qwen3-vl:8b', 'qwen2.5:7b', 'llama3:latest', 'llama3'].includes(m))
                          .map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {llmProvider === 'groq' && (
                <div className="p-3 rounded-xl bg-dark-900 border border-dark-700 space-y-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-300 font-medium flex items-center">
                      <Key className="w-3 h-3 text-slate-400 mr-1" />
                      Groq API Anahtarı
                    </label>
                    <input
                      type="password"
                      placeholder="gsk_..."
                      value={groqApiKey}
                      onChange={(e) => setGroqApiKey(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg text-xs glass-input text-white placeholder-slate-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-300 font-medium">Groq Modeli</label>
                    <select
                      value={groqModel}
                      onChange={(e) => setGroqModel(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg text-xs bg-dark-850 border border-dark-600 text-white focus:outline-none focus:border-brand-purple"
                    >
                      <option value="llama-3.3-70b-versatile">Llama 3.3 70B Versatile (Önerilen)</option>
                      <option value="openai/gpt-oss-120b">GPT-OSS 120B (Groq/OpenAI Özel)</option>
                      <option value="deepseek-r1-distill-llama-70b">DeepSeek R1 Distill (70B)</option>
                      <option value="llama3-70b-8192">Llama 3 70B</option>
                      <option value="llama3-8b-8192">Llama 3 8B</option>
                      <option value="gemma2-9b-it">Gemma 2 9B</option>
                      <option value="mixtral-8x7b-32768">Mixtral 8x7B</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Language & Whisper Model Selection */}
              <div className="space-y-3 pt-2 border-t border-dark-750">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 flex items-center">
                    <Globe className="w-3.5 h-3.5 text-brand-cyan mr-1.5" />
                    Video Konuşma Dili
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-dark-900 border border-dark-700 text-white focus:outline-none focus:border-brand-purple"
                  >
                    <option value="auto">🌐 Otomatik Algıla (Auto-Detect)</option>
                    <option value="tr">🇹🇷 Türkçe</option>
                    <option value="en">🇬🇧 İngilizce</option>
                    <option value="de">🇩🇪 Almanca</option>
                    <option value="es">🇪🇸 İspanyolca</option>
                    <option value="fr">🇫🇷 Fransızca</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 flex items-center">
                    <Cpu className="w-3.5 h-3.5 text-brand-purple mr-1.5" />
                    Whisper Deşifre Modeli
                  </label>
                  <select
                    value={whisperModel}
                    onChange={(e) => setWhisperModel(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-dark-900 border border-dark-700 text-white focus:outline-none focus:border-brand-purple"
                  >
                    <option value="tiny">Tiny (Ultra Hızlı)</option>
                    <option value="base">Base (Hızlı)</option>
                    <option value="small">Small (Önerilen - Dengeli & Hassas)</option>
                    <option value="medium">Medium (Yüksek Doğruluk)</option>
                    <option value="large-v3">Large-v3 (Maksimum Hassasiyet)</option>
                  </select>
                </div>
              </div>

              {/* Hardware Spec Info */}
              <div className="p-3 rounded-xl bg-dark-900/60 border border-dark-700/60 text-[11px] text-slate-400 space-y-1">
                <span className="text-emerald-400 font-semibold flex items-center">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Donanım İle Optimize Edildi
                </span>
                <p>Nvidia CUDA GPU ve 8GB VRAM ile kelime kelime hızlı transkripsiyon gerçekleştirilir.</p>
              </div>

              {/* Wizard Navigation Buttons */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => goToStep('clips')}
                  className="py-2.5 px-3 rounded-xl bg-dark-900 hover:bg-dark-800 border border-dark-700 text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center justify-center space-x-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Geri</span>
                </button>
                <button
                  type="button"
                  onClick={() => goToStep('layout')}
                  className="col-span-2 py-2.5 px-3 rounded-xl bg-dark-800 hover:bg-dark-750 border border-dark-600 text-xs font-bold text-slate-200 hover:text-white transition-all flex items-center justify-center space-x-1.5 shadow-sm"
                >
                  <span>Sonraki: Video Düzeni</span>
                  <ArrowRight className="w-3.5 h-3.5 text-brand-cyan" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: VİDEO DÜZENİ & EN/BOY ORANI (YENİ AŞAMA 4)        */}
        {/* ======================================================== */}
        {activeTab === 'layout' && (
          <div className="space-y-4">
            <div className="bg-dark-850 border border-dark-700 rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center">
                  <Maximize2 className="w-4 h-4 text-brand-cyan mr-1.5" />
                  Video Düzeni ve Kadraj
                </label>
                <span className="text-[10px] text-slate-400 bg-dark-900 px-2 py-0.5 rounded-full border border-dark-750">
                  Aşama 4 / 5
                </span>
              </div>

              {/* Aspect Ratio Selector (9:16 vs 16:9) */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">
                  En/Boy Oranı (Format):
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAspectRatio('9:16')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      aspectRatio === '9:16'
                        ? 'bg-brand-purple/20 border-brand-purple text-white shadow-md shadow-brand-purple/10 ring-1 ring-brand-purple'
                        : 'bg-dark-900 border-dark-700 text-slate-400 hover:border-dark-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <Smartphone className={`w-4 h-4 ${aspectRatio === '9:16' ? 'text-brand-purple' : 'text-slate-400'}`} />
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-dark-800 text-slate-300 border border-dark-700">
                        1080x1920
                      </span>
                    </div>
                    <p className="text-xs font-bold">9:16 Dikey Format</p>
                    <p className="text-[10px] text-slate-400 mt-1">Shorts, Reels, TikTok için optimize dikey video.</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAspectRatio('16:9')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      aspectRatio === '16:9'
                        ? 'bg-brand-purple/20 border-brand-purple text-white shadow-md shadow-brand-purple/10 ring-1 ring-brand-purple'
                        : 'bg-dark-900 border-dark-700 text-slate-400 hover:border-dark-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <Tv className={`w-4 h-4 ${aspectRatio === '16:9' ? 'text-brand-purple' : 'text-slate-400'}`} />
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-dark-800 text-slate-300 border border-dark-700">
                        1920x1080
                      </span>
                    </div>
                    <p className="text-xs font-bold">16:9 Yatay Format</p>
                    <p className="text-[10px] text-slate-400 mt-1">Standart YouTube ve geniş ekranlar için yatay video.</p>
                  </button>
                </div>
              </div>

              {/* 9:16 Specific Framing Modes */}
              {aspectRatio === '9:16' ? (
                <div className="space-y-2 pt-2 border-t border-dark-750">
                  <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span>9:16 Kırpma / Kadraj Modu:</span>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                      AI Destekli
                    </span>
                  </label>

                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setLayoutMode('smart_face_tracking')}
                      className={`w-full p-3 rounded-xl border text-left flex items-start space-x-3 transition-all ${
                        layoutMode === 'smart_face_tracking'
                          ? 'bg-brand-purple/20 border-brand-purple text-white shadow-sm ring-1 ring-brand-purple'
                          : 'bg-dark-900 border-dark-700 text-slate-400 hover:border-dark-600'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="text-xs font-bold text-white">Yüz & Konuşmacı Takibi (Önerilen)</p>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-semibold">AI YuNet</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                          OpenCV YuNet AI ile konuşan kişiyi otomatik algılar ve 9:16 kadrajı konuşmacının yüzüne ortalayarak sinematik takip uygular.
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setLayoutMode('blur_background')}
                      className={`w-full p-3 rounded-xl border text-left flex items-start space-x-3 transition-all ${
                        layoutMode === 'blur_background'
                          ? 'bg-brand-purple/20 border-brand-purple text-white shadow-sm ring-1 ring-brand-purple'
                          : 'bg-dark-900 border-dark-700 text-slate-400 hover:border-dark-600'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-lg bg-brand-purple/20 flex items-center justify-center shrink-0 mt-0.5">
                        <Layers className="w-4 h-4 text-brand-purple" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">Bulanık Arka Plan</p>
                        <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                          Orijinal yatay video merkezde tutulur, arka plana sinematik bulanıklaştırılmış katman eklenir.
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setLayoutMode('crop_center')}
                      className={`w-full p-3 rounded-xl border text-left flex items-start space-x-3 transition-all ${
                        layoutMode === 'crop_center'
                          ? 'bg-brand-purple/20 border-brand-purple text-white shadow-sm ring-1 ring-brand-purple'
                          : 'bg-dark-900 border-dark-700 text-slate-400 hover:border-dark-600'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-lg bg-brand-purple/20 flex items-center justify-center shrink-0 mt-0.5">
                        <Scissors className="w-4 h-4 text-brand-purple" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">Sabit Merkez Kırpma</p>
                        <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                          Videonun tam merkezi 1080x1920 dikey alana sığdırılacak şekilde doğrudan kesilir.
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              ) : (
                /* 16:9 Info Card */
                <div className="p-3.5 rounded-xl bg-dark-900 border border-dark-750 text-xs text-slate-300 space-y-2">
                  <div className="flex items-center space-x-2 text-brand-cyan font-bold">
                    <Tv className="w-4 h-4" />
                    <span>Orijinal Yatay Format (Kırpmasız)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Videonuz orijinal geniş ekran oranında işlenir. Dikey kırpma uygulanmaz. Karaoke altyazılar alt banda geniş ekran standartlarına göre otomatik olarak yerleştirilir.
                  </p>
                </div>
              )}

              {/* ⚡ WyattBlue/Auto-Editor Sessizlik ve Ölü Boşluk Budama Modülü */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-dark-850 to-brand-purple/10 border border-amber-500/30 flex items-center justify-between">
                <div className="space-y-0.5 pr-2">
                  <div className="flex items-center space-x-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-xs font-bold text-white">Auto-Editor: Sessizlikleri Temizle</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    0.3s+ ölü boşlukları ve duraksamaları budar. Klibin izlenme süresini artırır.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEnableSilenceRemoval && setEnableSilenceRemoval(!enableSilenceRemoval)}
                  className={`w-10 h-5 rounded-full transition-colors relative p-0.5 shrink-0 ${
                    enableSilenceRemoval ? 'bg-amber-500' : 'bg-dark-750'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      enableSilenceRemoval ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* ======================================================== */}
              {/* KARAOKE ALTYAZI STİLİ VE TASARIM AYARLARI                */}
              {/* ======================================================== */}
              <div className="space-y-3 pt-3 border-t border-dark-750">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center">
                    <Type className="w-4 h-4 text-brand-cyan mr-1.5" />
                    Karaoke Altyazı Stili
                  </label>
                  <span className="text-[10px] text-brand-purple font-semibold bg-brand-purple/10 px-2 py-0.5 rounded-full border border-brand-purple/20">
                    Reels & TikTok
                  </span>
                </div>

                {/* Subtitle Live Preview Box */}
                <div className="p-3.5 rounded-xl bg-dark-950 border border-dark-750 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-inner min-h-[90px]">
                  <span className="absolute top-1.5 left-2 text-[9px] font-mono text-slate-500 uppercase tracking-wider">
                    Canlı Önizleme
                  </span>
                  <div
                    style={{
                      fontFamily: subtitleConfig.fontName,
                      fontSize: `${Math.max(16, Math.round(subtitleConfig.fontSize * 0.32))}px`,
                      fontWeight: 800,
                      textTransform: subtitleConfig.uppercase ? 'uppercase' : 'none',
                      lineHeight: 1.2,
                    }}
                    className="select-none tracking-tight flex items-center justify-center space-x-1.5"
                  >
                    <span
                      style={{
                        color: subtitleConfig.primaryColor,
                        WebkitTextStroke: `${Math.max(1, Math.round(subtitleConfig.outlineWidth * 0.3))}px ${subtitleConfig.outlineColor}`,
                        textShadow: `0px 2px 4px rgba(0,0,0,0.8)`
                      }}
                    >
                      {subtitleConfig.uppercase ? 'BU BİR' : 'Bu bir'}
                    </span>
                    <span
                      style={{
                        color: subtitleConfig.highlightColor,
                        WebkitTextStroke: `${Math.max(1, Math.round(subtitleConfig.outlineWidth * 0.3))}px ${subtitleConfig.outlineColor}`,
                        textShadow: `0px 2px 8px ${subtitleConfig.highlightColor}66`
                      }}
                    >
                      {subtitleConfig.uppercase ? 'VİRAL KLİP' : 'Viral Klip'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-2 font-mono">
                    {subtitleConfig.fontName} • {subtitleConfig.fontSize}pt • {subtitleConfig.wordsPerGroup} kelime/kart
                  </span>
                </div>

                {/* Font Family Selection */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Yazı Tipi (Font)</label>
                  <select
                    value={subtitleConfig.fontName}
                    onChange={(e) => setSubtitleConfig(prev => ({ ...prev, fontName: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-dark-900 border border-dark-700 text-white focus:outline-none focus:border-brand-purple"
                  >
                    <option value="Montserrat">Montserrat (Önerilen - TikTok & Reels Standardı)</option>
                    <option value="Impact">Impact (Kalın & Dikkat Çekici)</option>
                    <option value="Rubik">Rubik (Modern & Akıcı)</option>
                    <option value="Bebas Neue">Bebas Neue (Uzun & Çarpıcı)</option>
                    <option value="Arial">Arial (Sistem Standardı)</option>
                    <option value="Poppins">Poppins (Yuvarlak & Temiz)</option>
                    <option value="Inter">Inter (Minimalist & Net)</option>
                  </select>
                </div>

                {/* Highlight Color Presets + Custom Color Picker */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-slate-300 flex items-center">
                      <Palette className="w-3 h-3 text-brand-purple mr-1" />
                      Aktif Kelime Vurgu Rengi
                    </label>
                    <div className="flex items-center space-x-1.5">
                      <input
                        type="color"
                        value={subtitleConfig.highlightColor}
                        onChange={(e) => setSubtitleConfig(prev => ({ ...prev, highlightColor: e.target.value }))}
                        className="w-5 h-5 rounded cursor-pointer border border-dark-600 bg-transparent p-0"
                        title="Özel renk seç"
                      />
                      <span className="text-[10px] font-mono text-slate-400">{subtitleConfig.highlightColor}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-6 gap-1.5">
                    {[
                      { color: '#FFE600', name: 'Sarı' },
                      { color: '#00F0FF', name: 'Cyan' },
                      { color: '#10B981', name: 'Yeşil' },
                      { color: '#FF007F', name: 'Pembe' },
                      { color: '#FF7A00', name: 'Turuncu' },
                      { color: '#FFFFFF', name: 'Beyaz' },
                    ].map((item) => (
                      <button
                        key={item.color}
                        type="button"
                        onClick={() => setSubtitleConfig(prev => ({ ...prev, highlightColor: item.color }))}
                        className={`h-7 rounded-lg border flex items-center justify-center transition-all ${
                          subtitleConfig.highlightColor.toLowerCase() === item.color.toLowerCase()
                            ? 'border-white scale-105 shadow-md shadow-brand-purple/20 ring-1 ring-white'
                            : 'border-dark-700 hover:border-dark-500'
                        }`}
                        style={{ backgroundColor: item.color }}
                        title={item.name}
                      >
                        {subtitleConfig.highlightColor.toLowerCase() === item.color.toLowerCase() && (
                          <Check className={`w-3.5 h-3.5 ${item.color === '#FFFFFF' || item.color === '#FFE600' ? 'text-black' : 'text-white'}`} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Words Per Subtitle Card */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-300">
                    Kart Başına Kelime Sayısı:
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[1, 2, 3, 4].map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setSubtitleConfig(prev => ({ ...prev, wordsPerGroup: count }))}
                        className={`py-1.5 rounded-lg text-xs font-bold border transition-all ${
                          subtitleConfig.wordsPerGroup === count
                            ? 'bg-brand-purple text-white border-brand-purple shadow-sm'
                            : 'bg-dark-900 border-dark-700 text-slate-400 hover:border-dark-600'
                        }`}
                      >
                        {count === 1 ? '1 (Hızlı)' : count === 3 ? '3 (Önerilen)' : `${count} Kelime`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sliders Grid: Font Size, Stroke Width, MarginV, Uppercase */}
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  {/* Font Size */}
                  <div className="space-y-1 p-2.5 rounded-xl bg-dark-900 border border-dark-750">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-medium">Yazı Boyutu</span>
                      <span className="text-[10px] font-mono text-brand-cyan font-bold">{subtitleConfig.fontSize}pt</span>
                    </div>
                    <input
                      type="range"
                      min={40}
                      max={110}
                      step={2}
                      value={subtitleConfig.fontSize}
                      onChange={(e) => setSubtitleConfig(prev => ({ ...prev, fontSize: Number(e.target.value) }))}
                      className="w-full accent-brand-purple h-1.5 bg-dark-750 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Outline Width */}
                  <div className="space-y-1 p-2.5 rounded-xl bg-dark-900 border border-dark-750">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-medium">Kenarlık (Stroke)</span>
                      <span className="text-[10px] font-mono text-brand-cyan font-bold">{subtitleConfig.outlineWidth}px</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={12}
                      step={1}
                      value={subtitleConfig.outlineWidth}
                      onChange={(e) => setSubtitleConfig(prev => ({ ...prev, outlineWidth: Number(e.target.value) }))}
                      className="w-full accent-brand-purple h-1.5 bg-dark-750 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Margin V (Vertical Position) */}
                  <div className="space-y-1 p-2.5 rounded-xl bg-dark-900 border border-dark-750">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-medium">Dikey Konum</span>
                      <span className="text-[10px] font-mono text-brand-cyan font-bold">{subtitleConfig.marginV}px</span>
                    </div>
                    <input
                      type="range"
                      min={100}
                      max={700}
                      step={20}
                      value={subtitleConfig.marginV}
                      onChange={(e) => setSubtitleConfig(prev => ({ ...prev, marginV: Number(e.target.value) }))}
                      className="w-full accent-brand-purple h-1.5 bg-dark-750 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Uppercase Toggle */}
                  <div className="space-y-1 p-2.5 rounded-xl bg-dark-900 border border-dark-750 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-medium">Büyük Harf</span>
                      <span className={`text-[10px] font-bold ${subtitleConfig.uppercase ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {subtitleConfig.uppercase ? 'AÇIK' : 'KAPALI'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSubtitleConfig(prev => ({ ...prev, uppercase: !prev.uppercase }))}
                      className={`w-full py-1 rounded text-[11px] font-bold border transition-all ${
                        subtitleConfig.uppercase
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                          : 'bg-dark-800 border-dark-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      {subtitleConfig.uppercase ? 'BÜYÜK HARF' : 'Standart'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Wizard Navigation Buttons */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => goToStep('models')}
                  className="py-2.5 px-3 rounded-xl bg-dark-900 hover:bg-dark-800 border border-dark-700 text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center justify-center space-x-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Geri</span>
                </button>
                <button
                  type="button"
                  onClick={() => goToStep('logs')}
                  className="col-span-2 py-2.5 px-3 rounded-xl bg-dark-800 hover:bg-dark-750 border border-dark-600 text-xs font-bold text-slate-200 hover:text-white transition-all flex items-center justify-center space-x-1.5 shadow-sm"
                >
                  <span>Sonraki: Üretime Geç</span>
                  <ArrowRight className="w-3.5 h-3.5 text-brand-cyan" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 5: İŞLEM GÜNLÜĞÜ, KONTROL & ÜRETİM                   */}
        {/* ======================================================== */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            {/* Pre-flight Confirmation Summary Card */}
            {videoMetadata && !isProcessing && (
              <div className="bg-dark-850 border border-brand-purple/30 rounded-2xl p-3.5 space-y-2.5 shadow-md shadow-brand-purple/5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-200 uppercase tracking-wider flex items-center">
                    <Sparkles className="w-3.5 h-3.5 text-brand-purple mr-1.5" />
                    Üretim Öncesi Kontrol Özeti
                  </span>
                  <button
                    type="button"
                    onClick={() => goToStep('layout')}
                    className="text-[10px] text-brand-cyan hover:underline font-semibold"
                  >
                    Değiştir
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded-lg bg-dark-900 border border-dark-750">
                    <span className="text-slate-400 block text-[10px]">Hedef Klip</span>
                    <strong className="text-white font-mono">{clipCount} Klip ({minClipDuration}-{maxClipDuration}s)</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-dark-900 border border-dark-750">
                    <span className="text-slate-400 block text-[10px]">Format & Kadraj</span>
                    <strong className="text-emerald-400 truncate block">
                      {aspectRatio === '16:9'
                        ? '📺 16:9 Yatay'
                        : layoutMode === 'smart_face_tracking'
                        ? '🎯 9:16 Yüz Takibi'
                        : layoutMode === 'blur_background'
                        ? '🌫️ 9:16 Bulanık'
                        : '✂️ 9:16 Merkez'}
                    </strong>
                  </div>
                  <div className="p-2 rounded-lg bg-dark-900 border border-dark-750">
                    <span className="text-slate-400 block text-[10px]">AI Motoru</span>
                    <strong className="text-white truncate block">
                      {llmProvider === 'ollama' && agencyMode
                        ? '👑 Otonom Ajans (5 Model)'
                        : `${llmProvider.toUpperCase()} (${llmProvider === 'ollama' ? ollamaModel : groqModel})`}
                    </strong>
                  </div>
                  <div className="p-2 rounded-lg bg-dark-900 border border-dark-750">
                    <span className="text-slate-400 block text-[10px]">Whisper Model & Dil</span>
                    <strong className="text-white truncate block">{whisperModel} ({language.toUpperCase()})</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-dark-900 border border-dark-750 col-span-2 flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Altyazı Stili & Font</span>
                      <strong className="text-white text-[11px] truncate block">
                        {subtitleConfig.fontName} ({subtitleConfig.fontSize}pt • {subtitleConfig.wordsPerGroup} kelime/kart)
                      </strong>
                    </div>
                    <div className="flex items-center space-x-1.5 bg-dark-800 px-2 py-1 rounded-lg border border-dark-700 shrink-0">
                      <span
                        className="w-3 h-3 rounded-full border border-white/20"
                        style={{ backgroundColor: subtitleConfig.highlightColor }}
                      />
                      <span className="text-[10px] text-slate-300 font-mono font-medium">Vurgu</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Header: Processing status */}
            <div className="bg-dark-850 border border-dark-700 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center">
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 text-brand-cyan animate-spin mr-1.5" />
                  ) : (
                    <Terminal className="w-4 h-4 text-brand-cyan mr-1.5" />
                  )}
                  <span>{isProcessing ? 'Videonuz Hazırlanıyor' : 'İşlem Aşamaları'}</span>
                </h4>
                {isProcessing && (
                  <span className="text-xs font-mono font-bold text-brand-cyan">
                    %{pipelineProgress.percent}
                  </span>
                )}
              </div>

              {/* Progress Bar */}
              {isProcessing && (
                <div className="space-y-1.5">
                  <div className="w-full bg-dark-900 rounded-full h-2 overflow-hidden border border-dark-750">
                    <div
                      className="bg-gradient-to-r from-brand-purple to-brand-cyan h-2 transition-all duration-300 rounded-full shadow-sm"
                      style={{ width: `${Math.max(5, pipelineProgress.percent)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">{pipelineProgress.message}</p>
                </div>
              )}

              {/* Steps Checklist */}
              <div className="space-y-2 pt-2 border-t border-dark-750">
                {stepsConfig.map((s) => {
                  const state = getStepState(s.key);
                  return (
                    <div
                      key={s.key}
                      className={`flex items-center justify-between p-2 rounded-xl transition-colors ${
                        state === 'active'
                          ? 'bg-brand-purple/10 border border-brand-purple/30 text-white'
                          : state === 'completed'
                          ? 'bg-dark-900/60 text-slate-300'
                          : 'text-slate-500'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        {state === 'completed' ? (
                          <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3" />
                          </div>
                        ) : state === 'active' ? (
                          <div className="w-5 h-5 rounded-full bg-brand-cyan/20 text-brand-cyan flex items-center justify-center shrink-0">
                            <Loader2 className="w-3 h-3 animate-spin" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-dark-750 flex items-center justify-center shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                          </div>
                        )}
                        <div>
                          <p className={`text-xs font-semibold ${state === 'active' ? 'text-white' : ''}`}>
                            {s.title}
                          </p>
                          <p className="text-[10px] text-slate-400">{s.desc}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Moveable Terminal Logs (if placed in Left Panel) */}
            {logsPosition === 'left' && (
              <div className="pt-2">
                <TerminalLogs
                  logs={logs}
                  position={logsPosition}
                  onChangePosition={onChangeLogsPosition}
                  isLocked={isLayoutLocked}
                />
              </div>
            )}

            {/* Start / Cancel Action Buttons */}
            <div className="pt-2 space-y-2">
              {!isProcessing ? (
                <button
                  type="button"
                  onClick={onStartPipeline}
                  disabled={!videoMetadata}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-brand-purple to-purple-600 hover:from-brand-purple/90 hover:to-purple-500 text-white text-sm font-bold flex items-center justify-center space-x-2 shadow-lg shadow-brand-purple/25 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Sparkles className="w-4 h-4 text-brand-cyan animate-spin" />
                  <span>✨ {clipCount} Adet Viral Klip Üret</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onCancelPipeline}
                  className="w-full py-3.5 px-4 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white text-sm font-bold flex items-center justify-center space-x-2 shadow-lg shadow-rose-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <XCircle className="w-4 h-4" />
                  <span>⏹ İşlemi Durdur / İptal Et</span>
                </button>
              )}

              {/* Back to Step 4 button */}
              <button
                type="button"
                onClick={() => goToStep('layout')}
                disabled={isProcessing}
                className="w-full py-2 px-3 rounded-xl bg-dark-900 hover:bg-dark-800 border border-dark-700 text-xs font-semibold text-slate-400 hover:text-white transition-all flex items-center justify-center space-x-1 disabled:opacity-40"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Video Düzeni Ayarlarına Dön</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* ⚡ ALT BÖLÜM: ANİMASYONLU AJANS MASASI & OTOPİLOT KUTULARI */}
      {/* ======================================================== */}
      <div className="shrink-0 border-t border-dark-750 bg-gradient-to-b from-dark-950 via-dark-900 to-black p-3 space-y-2 shadow-2xl relative z-10">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan animate-pulse inline-block" />
            Otonom Ajans & Kurgu Masası
          </span>
          <span className="text-[9px] font-semibold text-brand-purple bg-brand-purple/15 px-2 py-0.5 rounded-full border border-brand-purple/30">
            7/24 Aktif
          </span>
        </div>

        {/* 2 Animated Interactive Tiles Grid */}
        <div className="grid grid-cols-1 gap-2">
          {/* Tile 1: 🏢 Ajans Masası (Virtual Agency Room) */}
          <button
            type="button"
            onClick={onOpenAgencyRoom}
            className="group relative overflow-hidden rounded-2xl p-3 bg-gradient-to-br from-brand-purple/15 via-dark-850 to-dark-900 border border-brand-purple/30 hover:border-brand-purple/80 text-left transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-brand-purple/20 flex items-center justify-between cursor-pointer"
          >
            {/* Background Ambient Glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-brand-purple/10 to-brand-cyan/10 opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="flex items-center space-x-3 relative z-10">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-purple to-purple-600 text-white flex items-center justify-center shadow-md shadow-brand-purple/30 group-hover:rotate-6 transition-transform">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-1.5">
                  <h4 className="text-xs font-bold text-white group-hover:text-brand-purple transition-colors">
                    ⚡ NEXUS WAR ROOM
                  </h4>
                  <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded-full bg-brand-purple/20 text-brand-purple border border-brand-purple/30">
                    14 Ajan
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 truncate mt-0.5">
                  3D Operasyon Masası • Canlı YouTube Scoreboard TV
                </p>
              </div>
            </div>

            <div className="relative z-10 flex items-center space-x-1 text-brand-cyan text-[10px] font-bold bg-dark-950/80 px-2 py-1 rounded-lg border border-dark-750 group-hover:border-brand-cyan/40">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
              <span>Görüntüle</span>
            </div>
          </button>

          {/* Tile 2: 🤖 7/24 Otopilot (Autopilot Radar & Queue) */}
          <button
            type="button"
            onClick={onOpenAutopilot}
            className="group relative overflow-hidden rounded-2xl p-3 bg-gradient-to-br from-amber-500/15 via-dark-850 to-dark-900 border border-amber-500/30 hover:border-amber-500/80 text-left transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-amber-500/20 flex items-center justify-between cursor-pointer"
          >
            {/* Background Ambient Glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="flex items-center space-x-3 relative z-10">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white flex items-center justify-center shadow-md shadow-amber-500/30 group-hover:rotate-6 transition-transform">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-1.5">
                  <h4 className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
                    🤖 7/24 Otopilot Radarı
                  </h4>
                  <span className={`text-[9px] font-semibold px-1.5 py-0.2 rounded-full border ${
                    autopilotState?.isRunning
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : 'bg-dark-800 text-slate-400 border-dark-700'
                  }`}>
                    {autopilotState?.isRunning ? 'AKTİF' : 'HAZIR'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 truncate mt-0.5">
                  CC Video Avcısı • 3 Altın Yayın Saati
                </p>
              </div>
            </div>

            <div className="relative z-10 flex items-center space-x-1 text-amber-400 text-[10px] font-bold bg-dark-950/80 px-2 py-1 rounded-lg border border-dark-750 group-hover:border-amber-400/40">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" />
              <span>Arşiv & Radar</span>
            </div>
          </button>
        </div>
      </div>
    </aside>
  );
};
