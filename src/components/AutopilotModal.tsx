import React, { useState, useEffect } from 'react';
import {
  X,
  Bot,
  Sparkles,
  Play,
  Folder,
  Copy,
  Check,
  Trash2,
  Clock,
  Calendar,
  ShieldCheck,
  Search,
  RefreshCw,
  Plus,
  ExternalLink,
  Settings,
  Film,
  CheckCircle2,
  ChevronRight,
  Eye,
  AlertCircle,
  Radio,
  Layers,
  Loader2,
} from 'lucide-react';
import {
  AutopilotSettings,
  AutopilotState,
  ScheduledClipPackage,
  CCVideoCandidate,
  ViralClip,
  YouTubeAuthStatus,
} from '../types';
import { YoutubeIcon as Youtube } from './icons/YoutubeIcon';

interface AutopilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPreviewClip?: (clip: ViralClip) => void;
}

export const AutopilotModal: React.FC<AutopilotModalProps> = ({
  isOpen,
  onClose,
  onPreviewClip,
}) => {
  const [activeTab, setActiveTab] = useState<'queue' | 'radar' | 'settings'>('queue');
  const [settings, setSettings] = useState<AutopilotSettings | null>(null);
  const [state, setState] = useState<AutopilotState>({
    isRunning: false,
    isBusy: false,
    currentAction: 'Beklemede',
    packages: [],
    candidates: [],
    stats: { totalGenerated: 0, pendingPosts: 0 },
  });

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchingCC, setIsSearchingCC] = useState(false);
  const [newSlotTime, setNewSlotTime] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [isPublishingNow, setIsPublishingNow] = useState<string | null>(null);
  const [ytStatus, setYtStatus] = useState<YouTubeAuthStatus | null>(null);

  const niches = [
    'Röportaj & Gerçek Hayat Hikayeleri',
    'Derin Sohbet & Podcast',
    'İlham Verici Yaşam Öyküleri',
    'Sokak Röportajları & İtiraflar',
    'Yapay Zeka & Teknoloji',
    'Girişimcilik & Finans',
    'Felsefe & Psikoloji',
    'Bilim & Uzay',
    'Motivasyon & Başarı',
  ];

  // Fetch initial settings & state
  useEffect(() => {
    if (!isOpen || !window.electronAPI) return;

    if (window.electronAPI.autopilotGetSettings) {
      window.electronAPI.autopilotGetSettings().then(setSettings).catch(console.error);
    }
    if (window.electronAPI.autopilotGetState) {
      window.electronAPI.autopilotGetState().then(setState).catch(console.error);
    }

    if (window.electronAPI.youtubeGetAuthStatus) {
      window.electronAPI.youtubeGetAuthStatus().then(setYtStatus).catch(console.warn);
    }

    const unregister = window.electronAPI.onAutopilotState?.((newState: AutopilotState) => {
      setState(newState);
    });

    const unregisterYt = window.electronAPI.onYouTubeAuthUpdated?.((st: YouTubeAuthStatus) => {
      setYtStatus(st);
    });

    return () => {
      if (unregister) unregister();
      if (unregisterYt) unregisterYt();
    };
  }, [isOpen]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handlePublishNow = async (packageId: string) => {
    if (!window.electronAPI?.autopilotPublishNow) return;
    setIsPublishingNow(packageId);
    try {
      showToast('🚀 Klip YouTube Shorts\'a yükleniyor...');
      await window.electronAPI.autopilotPublishNow(packageId);
      showToast('🎉 Harika! Klip YouTube Shorts\'a yüklendi!');
    } catch (err: any) {
      alert(`YouTube yükleme hatası: ${err.message}`);
    } finally {
      setIsPublishingNow(null);
    }
  };

  if (!isOpen) return null;

  const handleToggleAutopilot = async () => {
    if (!window.electronAPI) return;
    try {
      if (state.isRunning) {
        const res = await window.electronAPI.autopilotStop();
        setState(res);
        showToast('🛑 7/24 Otopilot durduruldu.');
      } else {
        const res = await window.electronAPI.autopilotStart();
        setState(res);
        showToast('🟢 7/24 Otopilot aktif edildi!');
      }
    } catch (e: any) {
      alert(`Hata: ${e.message}`);
    }
  };

  const handleRunManualCycle = async (candidate?: CCVideoCandidate) => {
    if (!window.electronAPI) return;
    try {
      showToast('⚡ Otopilot döngüsü başlatıldı! Ajanlar devrede...');
      await window.electronAPI.autopilotRunCycle(candidate);
      showToast('🎉 Yeni klip üretildi ve arşive eklendi!');
    } catch (e: any) {
      alert(`Döngü hatası: ${e.message}`);
    }
  };

  const handleRunBatch = async (count: number = 3) => {
    if (!window.electronAPI) return;
    setIsBatchGenerating(true);
    showToast(`⚡ Günlük ${count} klip için parti üretimi başlatıldı!`);
    try {
      if (typeof (window.electronAPI as any).autopilotRunBatch === 'function') {
        await (window.electronAPI as any).autopilotRunBatch(count);
      } else {
        // Fallback: Sequentially run cycles for each target slot
        for (let i = 0; i < count; i++) {
          showToast(`⚡ Parti [${i + 1}/${count}] klibi işleniyor...`);
          await window.electronAPI.autopilotRunCycle();
        }
      }
      showToast(`🎉 ${count} adet farklı viral klip üretildi ve arşive eklendi!`);
    } catch (e: any) {
      console.error('Batch generation error:', e);
      alert(`Parti üretim hatası: ${e.message}`);
    } finally {
      setIsBatchGenerating(false);
    }
  };

  const handleSearchCC = async (nicheToSearch?: string) => {
    if (!window.electronAPI) return;
    setIsSearchingCC(true);
    try {
      const niche = nicheToSearch || settings?.selectedNiche || 'Yapay Zeka';
      const results = await window.electronAPI.autopilotSearchCC(niche, searchQuery);
      setState((prev) => ({ ...prev, candidates: results }));
      showToast(`${results.length} adet telifsiz Creative Commons videosu bulundu!`);
    } catch (e: any) {
      alert(`Arama hatası: ${e.message}`);
    } finally {
      setIsSearchingCC(false);
    }
  };

  const handleCopyPackageMeta = (pkg: ScheduledClipPackage) => {
    const text = `=========================================
🎬 AUTOCLIP AI YAYIN ARŞİVİ
📅 Planlanan Zaman: ${pkg.dayLabel} (Saat: ${pkg.slotTime})
⭐ Virallik Skoru: ${pkg.viralityScore}/100
=========================================

📌 BAŞLIK ALTERNATİFLERİ:
1. ${pkg.socialMetadata.titles[0] || pkg.title}
2. ${pkg.socialMetadata.titles[1] || pkg.title}
3. ${pkg.socialMetadata.titles[2] || pkg.title}

📝 AÇIKLAMA (CAPTION):
${pkg.socialMetadata.description}

🏷️ HASHTAGLER:
${pkg.socialMetadata.hashtags.join(' ')}

📢 ÇAĞRI (CALL TO ACTION):
${pkg.socialMetadata.callToAction}

⚖️ TELİF VE ATIF (CREATIVE COMMONS CC-BY):
Kaynak: ${pkg.sourceVideo.channel} - "${pkg.sourceVideo.title}"
Link: ${pkg.sourceVideo.url}
Lisans: Creative Commons Attribution (CC-BY)
=========================================`;

    navigator.clipboard.writeText(text);
    setCopiedId(pkg.id);
    showToast('📋 Sosyal medya metinleri ve atıf panoya kopyalandı!');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleDeletePackage = async (id: string) => {
    if (!window.electronAPI) return;
    if (!confirm('Bu klip paketini arşivden silmek istediğinize emin misiniz?')) return;
    try {
      await window.electronAPI.autopilotDeletePackage(id);
      showToast('🗑️ Paket silindi.');
    } catch (e: any) {
      alert(`Silme hatası: ${e.message}`);
    }
  };

  const handleOpenArchiveDir = async () => {
    if (window.electronAPI?.autopilotOpenArchiveFolder) {
      await window.electronAPI.autopilotOpenArchiveFolder();
    }
  };

  const handleAddSlot = () => {
    if (!settings || !newSlotTime.trim()) return;
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(newSlotTime.trim())) {
      alert('Lütfen geçerli bir saat girin (Örnek: 14:00 veya 19:45)');
      return;
    }
    const formatted = newSlotTime.trim();
    if (settings.postingSlots.includes(formatted)) {
      alert('Bu yayın saati zaten ekli.');
      return;
    }
    const updated = [...settings.postingSlots, formatted].sort();
    updateSettingsField({ postingSlots: updated });
    setNewSlotTime('');
    showToast(`✅ Yeni yayın yuvası eklendi: ${formatted}`);
  };

  const handleRemoveSlot = (slotToRemove: string) => {
    if (!settings) return;
    if (settings.postingSlots.length <= 1) {
      alert('En az bir yayın saati bulunmalıdır.');
      return;
    }
    const updated = settings.postingSlots.filter((s) => s !== slotToRemove);
    updateSettingsField({ postingSlots: updated });
  };

  const updateSettingsField = async (partial: Partial<AutopilotSettings>) => {
    if (!window.electronAPI) return;
    try {
      const res = await window.electronAPI.autopilotUpdateSettings(partial);
      setSettings(res);
    } catch (e: any) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-brand-purple text-white px-4 py-2.5 rounded-xl shadow-2xl border border-purple-400/30 flex items-center space-x-2 text-sm font-semibold animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="bg-dark-900 border border-dark-700/80 w-full max-w-6xl h-[90vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-dark-700 bg-dark-850 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-brand-purple flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  7/24 Otonom Medya Ajansı
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" /> %100 Telifsiz Creative Commons
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Günde {settings?.postingSlots?.length || 3} altın saatte otomatik video keşfi, telif denetimi, kurgu ve yayın arşivi
              </p>
            </div>
          </div>

          {/* Top Quick Actions */}
          <div className="flex items-center space-x-3">
            {/* 7/24 Switch */}
            <button
              onClick={handleToggleAutopilot}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border shadow-sm ${
                state.isRunning
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 hover:bg-emerald-500/30'
                  : 'bg-dark-750 text-slate-400 border-dark-700 hover:text-white'
              }`}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  state.isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                }`}
              />
              <span>{state.isRunning ? '7/24 Otopilot: AKTİF' : '7/24 Otopilot: PASİF'}</span>
            </button>

            {/* Open Archive Folder */}
            <button
              onClick={handleOpenArchiveDir}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-dark-800 hover:bg-dark-750 border border-dark-700 text-slate-300 hover:text-white text-xs font-medium transition-colors"
            >
              <Folder className="w-3.5 h-3.5 text-amber-400" />
              <span>Arşivi Aç</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-dark-750 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Status Radar Bar */}
        <div className="bg-dark-900 border-b border-dark-750 px-6 py-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Radio className={`w-3.5 h-3.5 ${state.isBusy ? 'text-amber-400 animate-ping' : 'text-emerald-400'}`} />
              <span className="text-slate-400 font-medium">Durum:</span>
              <span className="text-white font-semibold">{state.currentAction}</span>
            </div>

            {state.activeAgent && (
              <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono text-[11px]">
                Aktif Ajan: {state.activeAgent}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-4 text-slate-400 text-[11px]">
            <span>
              Toplam Hazır Klip:{' '}
              <strong className="text-emerald-400 font-bold">{state.stats.totalGenerated}</strong>
            </span>
            <span>•</span>
            <span>
              Bekleyen Yayınlar:{' '}
              <strong className="text-amber-400 font-bold">{state.stats.pendingPosts}</strong>
            </span>
            <span>•</span>
            <span>
              Son Döngü: <strong className="text-slate-300">{state.lastRunAt || 'Henüz Yok'}</strong>
            </span>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="px-6 border-b border-dark-750 bg-dark-850/50 flex space-x-2 shrink-0">
          <button
            onClick={() => setActiveTab('queue')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center space-x-2 transition-all ${
              activeTab === 'queue'
                ? 'border-brand-purple text-brand-purple'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Yayın Takvimi & Arşiv</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-dark-750 text-slate-300 font-mono">
              {state.packages.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('radar')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center space-x-2 transition-all ${
              activeTab === 'radar'
                ? 'border-brand-purple text-brand-purple'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Creative Commons Radarı & Keşif</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-dark-750 text-slate-300 font-mono">
              {state.candidates.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center space-x-2 transition-all ${
              activeTab === 'settings'
                ? 'border-brand-purple text-brand-purple'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Otopilot & Saat Ayarları</span>
          </button>
        </div>

        {/* Step 5-Style Real-time Production Progress Card */}
        {state.isBusy && (
          <div className="mx-6 mt-4 p-4 rounded-2xl bg-gradient-to-r from-dark-850 via-purple-950/30 to-dark-850 border border-brand-purple/50 shadow-2xl space-y-3 shrink-0 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-brand-purple/20 border border-brand-purple/40 flex items-center justify-center shadow-inner">
                  <Loader2 className="w-5 h-5 text-brand-purple animate-spin" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <span>🎬 {state.activeProgress?.stepTitle || 'Otonom Üretim Hattı Çalışıyor'}</span>
                    </h4>
                    {state.activeProgress?.batchTotal && state.activeProgress.batchTotal > 1 ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Parti: Klip {state.activeProgress.batchCurrent} / {state.activeProgress.batchTotal} (Farklı CC Videosu)
                      </span>
                    ) : null}
                  </div>
                  <p className="text-[11px] text-slate-300 font-medium">
                    {state.activeProgress?.message || state.currentAction}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-base font-mono font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-brand-purple to-brand-cyan">
                  %{state.activeProgress?.percent || 10}
                </span>
              </div>
            </div>

            {/* Glowing Animated Progress Bar */}
            <div className="w-full bg-dark-900 rounded-full h-2.5 overflow-hidden border border-dark-700/80 p-0.5">
              <div
                className="bg-gradient-to-r from-amber-500 via-brand-purple to-brand-cyan h-full rounded-full transition-all duration-300 shadow-sm shadow-brand-purple/50 animate-pulse"
                style={{ width: `${Math.max(6, state.activeProgress?.percent || 10)}%` }}
              />
            </div>

            {/* 6 Stage Pipeline Tracker */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-1 text-[11px]">
              {[
                { index: 1, title: '1. Viral Keşif', agent: 'Hunter Gemma', icon: '🛰️' },
                { index: 2, title: '2. Telif Denetimi', agent: 'Legal Llama', icon: '⚖️' },
                { index: 3, title: '3. Video İndirme', agent: 'yt-dlp', icon: '📥' },
                { index: 4, title: '4. AI Deşifre', agent: 'Whisper GPU', icon: '🎙️' },
                { index: 5, title: '5. Ajans Analizi', agent: 'Qwen & Vision', icon: '🧠' },
                { index: 6, title: '6. Render & Paket', agent: 'FFmpeg 9:16', icon: '🎬' },
              ].map((step) => {
                const currentStep = state.activeProgress?.stepIndex || 1;
                const isCurrent = step.index === currentStep;
                const isDone = step.index < currentStep;

                return (
                  <div
                    key={step.index}
                    className={`p-2 rounded-xl border flex flex-col justify-between transition-all ${
                      isCurrent
                        ? 'bg-brand-purple/25 border-brand-purple/70 text-white shadow-md shadow-brand-purple/20 ring-1 ring-brand-purple/40'
                        : isDone
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-dark-900/60 border-dark-750 text-slate-500'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs">{step.icon}</span>
                      {isDone ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : isCurrent ? (
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-slate-700" />
                      )}
                    </div>
                    <div className="truncate font-bold text-[10px]">{step.title}</div>
                    <div className="truncate text-[9px] text-slate-400">{step.agent}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-dark-950/60 custom-scrollbar">
          {/* TAB 1: YAYIN TAKVİMİ & ARŞİV */}
          {activeTab === 'queue' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    Yayına Hazır Klipler & Altın Yayın Saatleri
                  </h3>
                  <p className="text-xs text-slate-400">
                    Ajanlar tarafından Creative Commons kaynaklarından üretilen, 9:16 altyazılı ve sosyal medya metinleri hazır paketler.
                  </p>
                </div>
                <button
                  onClick={handleOpenArchiveDir}
                  className="text-xs text-brand-purple hover:underline flex items-center gap-1 font-semibold"
                >
                  <Folder className="w-3.5 h-3.5" /> Klasörde Görüntüle ({settings?.archiveDirectory})
                </button>
              </div>

              {state.packages.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-center border border-dashed border-dark-700 rounded-2xl bg-dark-900/40 p-8">
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
                    <Film className="w-8 h-8 text-amber-400" />
                  </div>
                  <h4 className="text-base font-bold text-slate-200 mb-1">Henüz Hazırlanmış Yayın Paketi Yok</h4>
                  <p className="text-xs text-slate-400 max-w-md mb-5">
                    7/24 Otopilot'u başlatarak veya aşağıdaki butona tıklayarak ilk Creative Commons viral klibinizi oluşturabilirsiniz.
                  </p>
                  <button
                    onClick={() => handleRunManualCycle()}
                    disabled={state.isBusy}
                    className="px-5 py-2.5 rounded-xl bg-brand-purple hover:bg-purple-600 text-white font-bold text-xs flex items-center space-x-2 shadow-lg shadow-brand-purple/20 transition-all"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>İlk Klibi Otomatik Üret</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {state.packages.map((pkg) => (
                    <div
                      key={pkg.id}
                      className="bg-dark-900 border border-dark-700/80 rounded-xl p-4 flex flex-col justify-between hover:border-brand-purple/50 transition-all shadow-md group"
                    >
                      <div>
                        {/* Slot Badge & Virality Score */}
                        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                          <div className="flex items-center space-x-2">
                            {pkg.status === 'published' || pkg.isUploaded ? (
                              <button
                                type="button"
                                onClick={() => {
                                  const url =
                                    pkg.youtubeUrl ||
                                    (pkg.youtubeVideoId ? `https://youtube.com/shorts/${pkg.youtubeVideoId}` : null);
                                  if (url) {
                                    if (window.electronAPI?.openPath) window.electronAPI.openPath(url);
                                    else window.open(url, '_blank');
                                  }
                                }}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 flex items-center gap-1.5 transition-all shadow-sm group/yt"
                                title="YouTube Shorts Yayında - Açmak için tıklayın"
                              >
                                <Youtube className="w-3.5 h-3.5 text-rose-500" />
                                <span>Shorts Yayında</span>
                                <ExternalLink className="w-3 h-3 text-rose-300 group-hover/yt:translate-x-0.5 transition-transform" />
                              </button>
                            ) : pkg.status === 'publishing' ? (
                              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5 animate-pulse">
                                <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                                <span>YouTube'a Yükleniyor...</span>
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                                <span>{pkg.dayLabel} ({pkg.slotTime})</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                              ⭐ {pkg.viralityScore}/100
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {new Date(pkg.createdAt).toLocaleDateString('tr-TR')}
                            </span>
                          </div>
                        </div>

                        {/* Title & Thumbnail */}
                        <div className="flex space-x-3 mb-3">
                          <div className="w-24 h-32 bg-dark-950 rounded-lg overflow-hidden shrink-0 border border-dark-750 relative group/thumb flex items-center justify-center">
                            {pkg.thumbnailPath ? (
                              <img
                                src={`http://127.0.0.1:39821/stream?path=${encodeURIComponent(pkg.thumbnailPath)}`}
                                alt=""
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  if (pkg.sourceVideo?.thumbnailUrl && target.src !== pkg.sourceVideo.thumbnailUrl) {
                                    target.src = pkg.sourceVideo.thumbnailUrl;
                                  } else {
                                    target.style.display = 'none';
                                  }
                                }}
                              />
                            ) : (pkg.sourceVideo && (pkg.sourceVideo as any).thumbnailUrl) ? (
                              <img
                                src={(pkg.sourceVideo as any).thumbnailUrl}
                                alt=""
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <Film className="w-8 h-8 text-slate-600" />
                            )}
                            {onPreviewClip && (
                              <button
                                onClick={() =>
                                  onPreviewClip({
                                    clip_id: pkg.clipId,
                                    title: pkg.title,
                                    outputPath: pkg.videoPath,
                                    start_time: '00:00',
                                    end_time: '00:45',
                                    start_seconds: 0,
                                    end_seconds: 45,
                                    duration_seconds: 45,
                                    hook_sentence: pkg.title,
                                    virality_score: pkg.viralityScore,
                                    reason: '',
                                    keywords: [],
                                    thumbnailPath: pkg.thumbnailPath,
                                    socialMetadata: pkg.socialMetadata,
                                  })
                                }
                                className="absolute inset-0 bg-black/60 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center text-white transition-opacity"
                                title="Videoyu Tam Ekran Oynat"
                              >
                                <Play className="w-6 h-6 fill-white" />
                              </button>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap mb-1">
                              {pkg.isSeries && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                                  🎬 Part {pkg.partNumber || 1}/{pkg.totalParts || 2}
                                </span>
                              )}
                              <h4 className="text-sm font-bold text-white line-clamp-2 leading-snug">
                                {pkg.title}
                              </h4>
                            </div>
                            <p className="text-xs text-slate-400 line-clamp-2 mb-2 italic">
                              "{pkg.socialMetadata.description}"
                            </p>

                            {/* CC Source Attribution & Channel Diversity badge */}
                            <div className="text-[10px] text-slate-400 bg-dark-850 px-2 py-1 rounded border border-dark-750 flex items-center gap-1.5 truncate">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span className="truncate">
                                Kaynak Kanal: <strong className="text-slate-200">{pkg.sourceVideo.channel}</strong> (CC-BY)
                              </span>
                            </div>

                            {/* Scheduler Strategy Note */}
                            {pkg.schedulerNote && (
                              <p className="text-[10px] text-indigo-300 mt-1.5 line-clamp-1">
                                💡 Strateji: {pkg.schedulerNote}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="pt-3 border-t border-dark-750 flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleCopyPackageMeta(pkg)}
                            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                              copiedId === pkg.id
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : 'bg-dark-800 hover:bg-dark-750 text-white border-dark-700'
                            }`}
                          >
                            {copiedId === pkg.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Kopyalandı!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-amber-400" />
                                <span>Metinleri Kopyala</span>
                              </>
                            )}
                          </button>

                          {pkg.status !== 'published' && !pkg.isUploaded && (
                            <button
                              onClick={() => handlePublishNow(pkg.id)}
                              disabled={isPublishingNow === pkg.id || pkg.status === 'publishing'}
                              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white border border-rose-500 text-xs font-bold transition-all shadow-sm shadow-rose-950/40 hover:scale-105 active:scale-95"
                              title="Planlanan altın saati beklemeden hemen YouTube Shorts'a yükle"
                            >
                              {isPublishingNow === pkg.id || pkg.status === 'publishing' ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Youtube className="w-3.5 h-3.5" />
                              )}
                              <span>Şimdi Yayınla</span>
                            </button>
                          )}
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => onClose()}
                            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-dark-800 hover:bg-brand-purple/20 text-slate-300 hover:text-brand-purple border border-dark-700 transition-colors text-xs font-semibold"
                            title="Otopilot penceresini kapat ve ana stüdyo masasında incele"
                          >
                            <Film className="w-3.5 h-3.5 text-brand-purple" />
                            <span>Ana Masada Aç</span>
                          </button>

                          <button
                            onClick={() => {
                              if (window.electronAPI?.showItemInFolder) {
                                window.electronAPI.showItemInFolder(pkg.videoPath);
                              }
                            }}
                            className="p-1.5 rounded-lg bg-dark-800 hover:bg-dark-750 text-slate-300 hover:text-white border border-dark-700 transition-colors"
                            title="Dosyayı klasörde göster"
                          >
                            <Folder className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeletePackage(pkg.id)}
                            className="p-1.5 rounded-lg bg-dark-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-dark-700 transition-colors"
                            title="Paketi sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CREATIVE COMMONS RADARI & KEŞİF */}
          {activeTab === 'radar' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Search className="w-4 h-4 text-brand-purple" />
                  YouTube Creative Commons (CC-BY) Video Radarı
                </h3>
                <p className="text-xs text-slate-400">
                  Hunter Gemma tarafından telifsiz ve yeniden kullanıma açık filtreyle taranan viral podcast & röportaj adayları.
                </p>
              </div>

              {/* Niche Pills & Custom Search */}
              <div className="space-y-3 bg-dark-900 border border-dark-750 p-4 rounded-xl">
                <div className="flex flex-wrap gap-2">
                  {niches.map((niche) => (
                    <button
                      key={niche}
                      onClick={() => {
                        updateSettingsField({ selectedNiche: niche });
                        handleSearchCC(niche);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                        settings?.selectedNiche === niche
                          ? 'bg-brand-purple text-white border-brand-purple shadow-sm'
                          : 'bg-dark-800 text-slate-400 border-dark-700 hover:text-white'
                      }`}
                    >
                      {niche}
                    </button>
                  ))}
                </div>

                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Özel arama terimi (örn: kuantum fiziği podcast, elon musk röportaj)..."
                    className="flex-1 bg-dark-850 border border-dark-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-purple"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSearchCC();
                    }}
                  />
                  <button
                    onClick={() => handleSearchCC()}
                    disabled={isSearchingCC}
                    className="px-4 py-2 rounded-xl bg-brand-purple hover:bg-purple-600 text-white font-bold text-xs flex items-center space-x-2 transition-all disabled:opacity-50"
                  >
                    <Search className={`w-3.5 h-3.5 ${isSearchingCC ? 'animate-spin' : ''}`} />
                    <span>{isSearchingCC ? 'Taranıyor...' : 'Radar Taraması'}</span>
                  </button>
                </div>
              </div>

              {/* Candidates Grid */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Bulunan Creative Commons Adayları ({state.candidates.length})
                </h4>

                {state.candidates.length === 0 ? (
                  <div className="py-14 text-center border border-dashed border-dark-700 rounded-xl bg-dark-900/30 p-6">
                    <p className="text-xs text-slate-400 mb-3">
                      Yukarıdaki kategorilerden birine tıklayarak veya arama yaparak Creative Commons videolarını tarayın.
                    </p>
                    <button
                      onClick={() => handleSearchCC()}
                      className="px-4 py-2 rounded-lg bg-dark-800 hover:bg-dark-750 text-white text-xs font-semibold border border-dark-700"
                    >
                      Örnek Arama Başlat
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {state.candidates.map((cand) => (
                      <div
                        key={cand.id}
                        className="bg-dark-900 border border-dark-750 rounded-xl p-3 flex space-x-3 items-center hover:border-dark-600 transition-all"
                      >
                        <div className="w-28 h-20 bg-dark-950 rounded-lg overflow-hidden shrink-0 relative">
                          {cand.thumbnailUrl ? (
                            <img src={cand.thumbnailUrl} alt={cand.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-600">
                              <Film className="w-6 h-6" />
                            </div>
                          )}
                          <span className="absolute bottom-1 right-1 bg-black/80 px-1 py-0.5 rounded text-[10px] font-mono text-white">
                            {cand.durationFormatted}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <h5 className="text-xs font-bold text-white line-clamp-1 mb-1" title={cand.title}>
                            {cand.title}
                          </h5>
                          <p className="text-[11px] text-slate-400 line-clamp-1 mb-1.5">{cand.channel}</p>
                          <div className="flex items-center space-x-2">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-emerald-400" /> CC-BY Lisanslı
                            </span>
                            {cand.viewCount && (
                              <span className="text-[10px] text-slate-500">
                                {cand.viewCount.toLocaleString()} görüntülenme
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => handleRunManualCycle(cand)}
                          disabled={state.isBusy}
                          className="px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs shrink-0 shadow-md shadow-amber-500/10 transition-all disabled:opacity-50"
                          title="Bu videoyu hemen indirip klip paketine dönüştür"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: OTOPİLOT & SAAT AYARLARI */}
          {activeTab === 'settings' && (
            <div className="max-w-3xl space-y-6">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Settings className="w-4 h-4 text-brand-purple" />
                  7/24 Otonom Çalışma & Yayın Saatleri Konfigürasyonu
                </h3>
                <p className="text-xs text-slate-400">
                  Sistemin hangi saatlerde paylaşım yapmaya hazır hale geleceğini ve hedef kategorileri belirleyin.
                </p>
              </div>

              {/* Günlük Altın Yayın Saatleri */}
              <div className="bg-dark-900 border border-dark-750 p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-indigo-400" />
                    Günlük Altın Yayın Saatleri (Pik Saatler)
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Günde {settings?.postingSlots.length || 0} adet video zamanlanır
                  </span>
                </div>

                <p className="text-xs text-slate-400">
                  Sosyal medya platformlarının (TikTok, YouTube Shorts, Instagram Reels) Türkiye ve dünya genelinde en yüksek izlenme aldığı tepe noktalarıdır.
                </p>

                {/* Slots Pill List */}
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  {settings?.postingSlots.map((slot) => (
                    <div
                      key={slot}
                      className="px-3 py-1.5 rounded-xl bg-dark-800 border border-dark-700 text-xs font-bold text-white flex items-center space-x-2 group hover:border-indigo-500/50 transition-colors"
                    >
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{slot}</span>
                      <button
                        onClick={() => handleRemoveSlot(slot)}
                        className="text-slate-400 hover:text-rose-400 transition-colors ml-1"
                        title="Bu saati kaldır"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {/* Add Slot Input */}
                  <div className="flex items-center space-x-1.5">
                    <input
                      type="text"
                      placeholder="HH:mm (örn: 15:30)"
                      value={newSlotTime}
                      onChange={(e) => setNewSlotTime(e.target.value)}
                      className="w-28 bg-dark-850 border border-dark-700 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-purple"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddSlot();
                      }}
                    />
                    <button
                      onClick={handleAddSlot}
                      className="px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center space-x-1 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Ekle</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* YouTube Shorts Otonom Yayınlama & Zamanlama Ayarları */}
              <div className="bg-dark-900 border border-rose-500/30 p-4 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-500 flex items-center justify-center">
                      <Youtube className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>YouTube Shorts Otomatik Yayınlama</span>
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold">
                          Otonom
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Belirlenen altın saat geldiğinde klip paketlerini doğrudan YouTube Shorts'a yükler.
                      </p>
                    </div>
                  </div>

                  {/* Toggle Button */}
                  <button
                    type="button"
                    onClick={() => updateSettingsField({ autoPublishYouTube: !settings?.autoPublishYouTube })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings?.autoPublishYouTube !== false ? 'bg-rose-600' : 'bg-dark-750'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings?.autoPublishYouTube !== false ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 border-t border-dark-750/70">
                  {/* Hazırlık Süresi (Kaç dk önce başlasın) */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-amber-400" />
                      <span>Otonom Hazırlık Başlama Zamanı</span>
                    </label>
                    <select
                      value={settings?.prepareMinutesBeforeSlot || 15}
                      onChange={(e) => updateSettingsField({ prepareMinutesBeforeSlot: Number(e.target.value) })}
                      className="w-full bg-dark-850 border border-dark-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                    >
                      <option value="10">Yayın saatinden 10 dakika önce (Hızlı)</option>
                      <option value="15">Yayın saatinden 15 dakika önce (Önerilen)</option>
                      <option value="20">Yayın saatinden 20 dakika önce</option>
                      <option value="30">Yayın saatinden 30 dakika önce (Geniş Pay)</option>
                    </select>
                    <span className="text-[10px] text-slate-500 block">
                      Ajanlar videoyu bu süre öncesinde bulup kurgular, vakit gelince yayına sürer.
                    </span>
                  </div>

                  {/* Yayın Gizliliği */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                      <ShieldCheck className="w-3 h-3 text-brand-purple" />
                      <span>Shorts Gizlilik Durumu</span>
                    </label>
                    <select
                      value={settings?.youtubePrivacy || 'public'}
                      onChange={(e) => updateSettingsField({ youtubePrivacy: e.target.value as any })}
                      className="w-full bg-dark-850 border border-dark-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                    >
                      <option value="public">Herkese Açık (Doğrudan Canlı)</option>
                      <option value="unlisted">Liste Dışı (Gizli Önizleme)</option>
                      <option value="private">Gizli (Yalnızca Kanal Sahibi)</option>
                    </select>
                    <span className="text-[10px] text-slate-500 block">
                      Otopilotun yüklediği videoların varsayılan görünürlük ayarı.
                    </span>
                  </div>
                </div>

                {/* Kanal Durumu */}
                <div className="p-2.5 rounded-xl bg-dark-850 border border-dark-750 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="text-slate-400">Bağlı YouTube Kanalı:</span>
                    {ytStatus?.isAuthenticated && ytStatus.channel ? (
                      <span className="font-bold text-white flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        {ytStatus.channel.title}
                      </span>
                    ) : (
                      <span className="font-semibold text-amber-400 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Kanal Bağlı Değil (Ayarlar &gt; YouTube'dan bağlayın)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 🎬 SERİ & PARTLI SHORTS MODU (Cliffhanger Qwen) */}
              <div className="bg-dark-900 border border-amber-500/30 p-4 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                      <Film className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>🎬 Seri & Partlı Shorts Modu (Part 1 / Part 2)</span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                          Cliffhanger Qwen
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        60sn+ kaynak videoyu merak uyandıran kırılma noktasında bölerek ardışık Part 1 ve Part 2 üretir.
                      </p>
                    </div>
                  </div>

                  {/* Toggle Button */}
                  <button
                    type="button"
                    onClick={() => updateSettingsField({ seriesModeEnabled: !settings?.seriesModeEnabled })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings?.seriesModeEnabled ? 'bg-amber-600' : 'bg-dark-750'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings?.seriesModeEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {settings?.seriesModeEnabled && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-dark-750/70">
                    {/* Kaç Part */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-300">Bölüm Sayısı</label>
                      <select
                        value={settings?.seriesPartsCount || 2}
                        onChange={(e) => updateSettingsField({ seriesPartsCount: Number(e.target.value) })}
                        className="w-full bg-dark-850 border border-dark-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="2">2 Parça (Part 1 + Part 2)</option>
                        <option value="3">3 Parça (Part 1 + Part 2 + Part 3)</option>
                      </select>
                    </div>

                    {/* Partlar Arası Gecikme */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-300">Partlar Arası Yayın Aralığı</label>
                      <select
                        value={settings?.seriesIntervalMinutes || 55}
                        onChange={(e) => updateSettingsField({ seriesIntervalMinutes: Number(e.target.value) })}
                        className="w-full bg-dark-850 border border-dark-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="45">45 Dakika Arayla</option>
                        <option value="55">55 Dakika Arayla (Önerilen)</option>
                        <option value="60">60 Dakika (1 Saat)</option>
                        <option value="90">90 Dakika (1.5 Saat)</option>
                      </select>
                    </div>

                    {/* Video Üstü Rozet / Banner */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-300">Video Üstü Banner Rozeti</label>
                      <button
                        type="button"
                        onClick={() => updateSettingsField({ seriesOverlayBanner: !settings?.seriesOverlayBanner })}
                        className={`w-full py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${
                          settings?.seriesOverlayBanner !== false
                            ? 'bg-amber-950/40 border-amber-500 text-amber-200'
                            : 'bg-dark-850 border-dark-700 text-slate-400'
                        }`}
                      >
                        <span>"Part 1 | Devamı Part 2'de"</span>
                        <span className="font-bold">{settings?.seriesOverlayBanner !== false ? 'AÇIK' : 'KAPALI'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Niş & Kategori Ayarları */}
              <div className="bg-dark-900 border border-dark-750 p-4 rounded-xl space-y-3">
                <label className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-amber-400" />
                  Varsayılan İçerik Nişi
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={settings?.selectedNiche}
                    onChange={(e) => updateSettingsField({ selectedNiche: e.target.value })}
                    className="bg-dark-850 border border-dark-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-purple"
                  >
                    {niches.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    value={settings?.customKeyword || ''}
                    onChange={(e) => updateSettingsField({ customKeyword: e.target.value })}
                    placeholder="Özel arama kelimesi (opsiyonel)"
                    className="bg-dark-850 border border-dark-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-purple"
                  />
                </div>
              </div>

              {/* Düzen & Format */}
              <div className="bg-dark-900 border border-dark-750 p-4 rounded-xl space-y-3">
                <label className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Film className="w-4 h-4 text-cyan-400" />
                  Video Formatı ve Düzeni
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">En-Boy Oranı</label>
                    <select
                      value={settings?.aspectRatio || '9:16'}
                      onChange={(e) => updateSettingsField({ aspectRatio: e.target.value as any })}
                      className="w-full bg-dark-850 border border-dark-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-purple"
                    >
                      <option value="9:16">9:16 Dikey (TikTok, Reels, Shorts)</option>
                      <option value="16:9">16:9 Yatay (Klasik YouTube)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Yerleşim Modu</label>
                    <select
                      value={settings?.layoutMode || 'blur_background'}
                      onChange={(e) => updateSettingsField({ layoutMode: e.target.value as any })}
                      className="w-full bg-dark-850 border border-dark-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-purple"
                    >
                      <option value="blur_background">Arka Plan Bulanıklığı (En Popüler)</option>
                      <option value="smart_face_tracking">Yüz Takibi ile Akıllı Kırpma</option>
                      <option value="crop_center">Merkezi Kırpma (Center Crop)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Telif & Güvenlik Bildirimi */}
              <div className="bg-emerald-950/20 border border-emerald-600/30 p-4 rounded-xl flex items-start space-x-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-200">
                  <h4 className="font-bold text-emerald-300 mb-0.5">Telif ve Lisans Güvenliği Garantisi</h4>
                  <p className="text-slate-300 leading-relaxed">
                    Sistem yalnızca YouTube'un resmi <code>Creative Commons Attribution (CC-BY)</code> lisansına sahip videolarını seçer.
                    Legal Llama ajanı tarafından her video için zorunlu yasal atıf açıklaması hazırlanır ve paketlenir.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
