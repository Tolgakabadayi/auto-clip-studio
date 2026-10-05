import React, { useState, useEffect } from 'react';
import {
  X,
  Settings,
  Cpu,
  Film,
  Sparkles,
  Bot,
  Zap,
  Volume2,
  VolumeX,
  FolderOpen,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Eye,
  Sliders,
  Type,
  Maximize2,
  Scissors,
  Save,
  RotateCcw,
  Check,
  Building2,
  AlertTriangle,
  Play,
  Radio,
  ExternalLink,
  BarChart3,
  ThumbsUp,
  MessageSquare,
  TrendingUp,
  Calendar,
  Loader2
} from 'lucide-react';
import { YoutubeIcon as Youtube } from './icons/YoutubeIcon';
import {
  LLMProvider,
  SubtitleStyleConfig,
  SystemHealth,
  AutopilotState,
  AgencyAgentConfig,
  AgencyRole,
  YouTubeAuthStatus,
  YouTubeAnalyticsData,
  YouTubeVideoStat
} from '../types';
import { INITIAL_OFFICE_AGENTS, AgentOfficeNode } from './AgencyRoomModal';
import { novaVoice } from '../utils/novaVoice';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  // AI Settings
  llmProvider: LLMProvider;
  setLlmProvider: (provider: LLMProvider) => void;
  ollamaModel: string;
  setOllamaModel: (model: string) => void;
  groqApiKey: string;
  setGroqApiKey: (key: string) => void;
  groqModel: string;
  setGroqModel: (model: string) => void;
  whisperModel: 'tiny' | 'base' | 'small' | 'medium' | 'large-v3';
  setWhisperModel: (model: 'tiny' | 'base' | 'small' | 'medium' | 'large-v3') => void;
  language: string;
  setLanguage: (lang: string) => void;
  onUpdateAgents?: (agents: AgencyAgentConfig[]) => void;
  // Video & Clipping Settings
  aspectRatio: '9:16' | '16:9';
  setAspectRatio: (ar: '9:16' | '16:9') => void;
  layoutMode: 'blur_background' | 'crop_center' | 'smart_face_tracking';
  setLayoutMode: (lm: 'blur_background' | 'crop_center' | 'smart_face_tracking') => void;
  clipCount: number;
  setClipCount: (count: number) => void;
  minClipDuration: number;
  setMinClipDuration: (dur: number) => void;
  maxClipDuration: number;
  setMaxClipDuration: (dur: number) => void;
  enableSilenceRemoval: boolean;
  setEnableSilenceRemoval: (val: boolean) => void;
  outputDirectory: string;
  setOutputDirectory: (dir: string) => void;
  // Subtitle Settings
  subtitleConfig: SubtitleStyleConfig;
  setSubtitleConfig: React.Dispatch<React.SetStateAction<SubtitleStyleConfig>>;
  // System Health & Autopilot
  systemHealth: SystemHealth | null;
  autopilotState: AutopilotState | null;
}

type TabType = 'ai' | 'office' | 'video' | 'docker' | 'autopilot' | 'youtube';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  llmProvider,
  setLlmProvider,
  ollamaModel,
  setOllamaModel,
  groqApiKey,
  setGroqApiKey,
  groqModel,
  setGroqModel,
  whisperModel,
  setWhisperModel,
  language,
  setLanguage,
  onUpdateAgents,
  aspectRatio,
  setAspectRatio,
  layoutMode,
  setLayoutMode,
  clipCount,
  setClipCount,
  minClipDuration,
  setMinClipDuration,
  maxClipDuration,
  setMaxClipDuration,
  enableSilenceRemoval,
  setEnableSilenceRemoval,
  outputDirectory,
  setOutputDirectory,
  subtitleConfig,
  setSubtitleConfig,
  systemHealth,
  autopilotState,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('ai');
  const [isScanningOllama, setIsScanningOllama] = useState(false);
  const [scanNotice, setScanNotice] = useState<string | null>(null);
  const [ollamaModelsList, setOllamaModelsList] = useState<string[]>(systemHealth?.ollamaModels || []);
  const [ollamaHost, setOllamaHost] = useState('http://localhost:11434');
  const [isDockVisible, setIsDockVisible] = useState(true);
  const [dockerAutoStart, setDockerAutoStart] = useState<boolean>(() => {
    return localStorage.getItem('autoclip_dock_autostart') !== 'false';
  });
  const [dockerMuted, setDockerMuted] = useState<boolean>(() => {
    return localStorage.getItem('autoclip_copilot_muted') === 'true';
  });
  const [copilotTone, setCopilotTone] = useState<'energetic' | 'pro' | 'minimal'>(() => {
    return (localStorage.getItem('autoclip_copilot_tone') as any) || 'energetic';
  });
  const [showSaveToast, setShowSaveToast] = useState(false);

  // YouTube Data API & Google OAuth State
  const [youtubeAuth, setYoutubeAuth] = useState<YouTubeAuthStatus | null>(null);
  const [youtubeAnalytics, setYoutubeAnalytics] = useState<YouTubeAnalyticsData | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [isYoutubeLoading, setIsYoutubeLoading] = useState(false);
  const [youtubeError, setYoutubeError] = useState<string | null>(null);
  const [defaultPrivacy, setDefaultPrivacy] = useState<'public' | 'unlisted' | 'private'>(() => {
    try {
      return (localStorage.getItem('autoclip_youtube_privacy') as any) || 'public';
    } catch {
      return 'public';
    }
  });

  // Office Agents State for custom model assignments
  const [officeAgents, setOfficeAgents] = useState<AgentOfficeNode[]>(() => {
    try {
      const saved = localStorage.getItem('autoclip_custom_office_agents');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 8) return parsed;
      }
    } catch {}
    return INITIAL_OFFICE_AGENTS;
  });

  const handleAgentModelChange = (role: AgencyRole, newModel: string) => {
    const updated = officeAgents.map((a) => (a.role === role ? { ...a, model: newModel } : a));
    setOfficeAgents(updated);
    try {
      localStorage.setItem('autoclip_custom_office_agents', JSON.stringify(updated));
    } catch {}
    if (onUpdateAgents) {
      const parentConfigs: AgencyAgentConfig[] = updated.map((a) => ({
        role: a.role,
        title: a.title,
        name: a.name,
        model: a.model,
        enabled: a.enabled !== false,
        avatar: a.avatar,
        description: a.description,
      }));
      onUpdateAgents(parentConfigs);
    }
  };

  const handleResetOfficeAgents = () => {
    setOfficeAgents(INITIAL_OFFICE_AGENTS);
    try {
      localStorage.setItem('autoclip_custom_office_agents', JSON.stringify(INITIAL_OFFICE_AGENTS));
    } catch {}
    if (onUpdateAgents) {
      onUpdateAgents(INITIAL_OFFICE_AGENTS.map((a) => ({
        role: a.role,
        title: a.title,
        name: a.name,
        model: a.model,
        enabled: true,
        avatar: a.avatar,
        description: a.description,
      })));
    }
  };

  const evaluateModelSuitability = (agent: AgentOfficeNode, modelName: string) => {
    const lowerModel = (modelName || '').toLowerCase();
    const lowerRole = agent.role.toLowerCase();

    // 1. Critical Vision Check for Art Director
    if (lowerRole === 'art_director') {
      const isVision = lowerModel.includes('vl') || lowerModel.includes('vision') || lowerModel.includes('llava');
      if (!isVision) {
        return {
          level: 'danger' as const,
          badge: '🚨 KRİTİK HATA: VISION DESTEĞİ YOK',
          message:
            'Görsel Analiz Yeteneği Yok: Art Director video karelerini, konuşmacı mimiklerini ve thumbnail netliğini inceleyebilmek için multimodal (görsel) zeka gerektirir. Bu model salt metin tabanlıdır! Lütfen "qwen3-vl:8b" veya "llama3.2-vision:11b" seçin.',
        };
      }
    }

    // 2. High Parameter / VRAM Overflow Risk (12B+)
    const isHeavy =
      lowerModel.includes('12b') ||
      lowerModel.includes('13b') ||
      lowerModel.includes('14b') ||
      lowerModel.includes('32b') ||
      lowerModel.includes('70b');
    if (isHeavy) {
      return {
        level: 'danger' as const,
        badge: '⚠️ DONANIM DARBOĞAZI: 12B+ YÜKSEK VRAM',
        message:
          'Aşırı Bellek Tüketimi: 12B+ parametreli modeller en az 8-12 GB GPU VRAM gerektirir. Sistem RAM\'ine taşması durumunda bilgisayarınız kilitlenebilir, video kurgusu aşırı yavaşlar veya Out-of-Memory (OOM) çökmesi yaşanır.',
      };
    }

    // 3. DeepSeek R1 slow chain-of-thought on time-critical speed roles
    const isReasoning = lowerModel.includes('deepseek') || lowerModel.includes('r1') || lowerModel.includes('reason');
    if (isReasoning && (lowerRole === 'scout' || lowerRole === 'trend_hunter' || lowerRole === 'copywriter')) {
      return {
        level: 'danger' as const,
        badge: '⚠️ HIZ DARBOĞAZI: DEEPSEEK R1 (<think>)',
        message:
          'Aşırı Gecikme Riski: DeepSeek R1 düşünme blokları (<think>) ürettiği için en basit kanca veya arama adımında dahi 45-60 saniye bekletir. Bu ajanın ultra hızlı olması şarttır; gemma3:4b veya qwen3:8b kullanın.',
      };
    }

    // 4. Memory Thrashing warning: different family
    const distinctFamilies = new Set(
      officeAgents.map((a) => {
        const m = a.model.toLowerCase();
        if (m.includes('qwen')) return 'qwen';
        if (m.includes('gemma')) return 'gemma';
        if (m.includes('llama')) return 'llama';
        if (m.includes('deepseek')) return 'deepseek';
        return m;
      })
    );
    if (distinctFamilies.size >= 4) {
      const isIsolated = officeAgents.filter((a) => a.model === modelName).length === 1;
      if (isIsolated) {
        return {
          level: 'warning' as const,
          badge: '⚠️ VRAM TAKAS GECİKMESİ',
          message:
            'Model Değişim Uyarısı: Çok fazla farklı model ailesi yapılandırıldı. Bu ajana sıra geldiğinde Ollama GPU belleğini boşaltıp diskten yeni model yükleyeceğinden 15-20 saniye gecikme yaşanabilir.',
        };
      }
    }

    // 5. Model not in local ollama tags
    if (ollamaModelsList.length > 0 && !ollamaModelsList.some((m) => m.toLowerCase() === lowerModel)) {
      return {
        level: 'warning' as const,
        badge: 'ℹ️ YERELDE TESPİT EDİLMEDİ',
        message: `Bu model bilgisayarınızda henüz bulunamadı. Çalıştırmadan önce terminalde "ollama pull ${modelName}" ile indirildiğinden emin olun.`,
      };
    }

    return {
      level: 'safe' as const,
      badge: '✅ OPTİMUM DONANIM UYUMU',
      message: 'Mükemmel uyum: Düşük gecikme, kararlı GPU çıkarımı ve sıfır bellek darboğazı.',
    };
  };

  // Sync Ollama models from systemHealth when available
  useEffect(() => {
    if (systemHealth?.ollamaModels && systemHealth.ollamaModels.length > 0) {
      setOllamaModelsList(systemHealth.ollamaModels);
    }
  }, [systemHealth]);

  // Check dock visibility status
  useEffect(() => {
    if (window.electronAPI?.dockIsVisible) {
      window.electronAPI.dockIsVisible().then((vis) => {
        if (typeof vis === 'boolean') setIsDockVisible(vis);
      }).catch(console.error);
    }

    const unreg = window.electronAPI?.onDockVisibilityChange?.((vis) => {
      setIsDockVisible(vis);
    });
    return () => {
      if (unreg) unreg();
    };
  }, []);

  // YouTube OAuth Status & Sync
  const loadYouTubeStatus = async () => {
    if (!window.electronAPI?.youtubeGetAuthStatus) return;
    try {
      const status = await window.electronAPI.youtubeGetAuthStatus();
      setYoutubeAuth(status);
    } catch (err: any) {
      console.warn('YouTube status fetch failed:', err);
    }
  };

  useEffect(() => {
    loadYouTubeStatus();
    const unreg = window.electronAPI?.onYouTubeAuthUpdated?.((status: any) => {
      setYoutubeAuth(status);
    });
    return () => {
      if (unreg) unreg();
    };
  }, []);

  const handleConnectYouTube = async () => {
    if (!window.electronAPI?.youtubeLogin) return;
    setIsYoutubeLoading(true);
    setYoutubeError(null);
    try {
      await window.electronAPI.youtubeLogin();
      await loadYouTubeStatus();
    } catch (err: any) {
      setYoutubeError(err.message || 'Google girişi tamamlanamadı.');
    } finally {
      setIsYoutubeLoading(false);
    }
  };

  const handleDisconnectYouTube = async () => {
    if (!window.electronAPI?.youtubeLogout) return;
    setIsYoutubeLoading(true);
    setYoutubeError(null);
    try {
      await window.electronAPI.youtubeLogout();
      await loadYouTubeStatus();
      setYoutubeAnalytics(null);
    } catch (err: any) {
      setYoutubeError(err.message);
    } finally {
      setIsYoutubeLoading(false);
    }
  };

  const fetchYouTubeAnalytics = async () => {
    if (!window.electronAPI?.youtubeGetAnalytics) return;
    setIsLoadingAnalytics(true);
    try {
      const data = await window.electronAPI.youtubeGetAnalytics();
      setYoutubeAnalytics(data);
    } catch (err: any) {
      console.warn('YouTube analytics fetch error:', err);
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'youtube' && youtubeAuth?.isAuthenticated) {
      fetchYouTubeAnalytics();
    }
  }, [activeTab, youtubeAuth?.isAuthenticated]);

  if (!isOpen) return null;

  // Scan Ollama Models Handler
  const handleScanSystem = async () => {
    setIsScanningOllama(true);
    setScanNotice(null);
    try {
      if (window.electronAPI?.getSystemHealth) {
        const health = await window.electronAPI.getSystemHealth();
        if (health?.ollamaModels && health.ollamaModels.length > 0) {
          setOllamaModelsList(health.ollamaModels);
          if (!health.ollamaModels.includes(ollamaModel)) {
            setOllamaModel(health.ollamaModels[0]);
          }
          setScanNotice(
            `✅ Sistem başarıyla tarandı: ${health.ollamaModels.length} model algılandı (${health.ollamaModels.join(', ')}).`
          );
        } else {
          setScanNotice('⚠️ Ollama servisi aktif fakat henüz model indirilmemiş veya listelenemedi.');
        }
      } else {
        setScanNotice('ℹ️ Tarama tamamlandı (Varsayılan model kütüphanesi aktif).');
      }
    } catch (err: any) {
      setScanNotice(`⚠️ Tarama hatası: ${err.message}`);
    } finally {
      setIsScanningOllama(false);
    }
  };

  // Intelligent Matchmaking & Auto Distribution for 12 Agents
  const handleAutoDistributeModels = () => {
    const models = ollamaModelsList.length > 0 ? ollamaModelsList : ['qwen3:8b', 'qwen3-vl:8b', 'llama3:latest', 'gemma3:4b'];

    const findModel = (criteria: string[], fallback: string): string => {
      for (const crit of criteria) {
        const match = models.find((m) => m.toLowerCase().includes(crit.toLowerCase()));
        if (match) return match;
      }
      return fallback;
    };

    const visionModel = findModel(['vl', 'vision', 'llava'], 'qwen3-vl:8b');
    const fastModel = findModel(['gemma3:4b', 'gemma', 'phi', 'mini'], 'gemma3:4b');
    const coreSpeedModel = findModel(['qwen3:8b', 'qwen', 'llama3', 'mistral'], 'qwen3:8b');

    let baseAgents: AgentOfficeNode[] = INITIAL_OFFICE_AGENTS;
    try {
      const saved = localStorage.getItem('autoclip_custom_office_agents');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 8) baseAgents = parsed;
      }
    } catch {}

    const updated = baseAgents.map((agent) => {
      let assignedModel = agent.model;
      if (agent.role === 'art_director') {
        assignedModel = visionModel;
      } else if (agent.role === 'trend_hunter' || agent.role === 'scout') {
        assignedModel = fastModel;
      } else {
        // CEO, Hook, Copywriter, QA, Scheduler, SEO, Audio, Legal, Translator, Sentinel Guard all share coreSpeedModel
        // This keeps the model hot in GPU VRAM with 0 seconds load delay!
        assignedModel = coreSpeedModel;
      }

      return {
        ...agent,
        model: assignedModel,
        enabled: true,
      };
    });

    try {
      localStorage.setItem('autoclip_custom_office_agents', JSON.stringify(updated));
    } catch {}

    if (onUpdateAgents) {
      const parentConfigs: AgencyAgentConfig[] = updated.map((a) => ({
        role: a.role,
        title: a.title,
        name: a.name,
        model: a.model,
        enabled: true,
        avatar: a.avatar,
        description: a.description,
      }));
      onUpdateAgents(parentConfigs);
    }

    setScanNotice(
      `⚡ Harika! 12 Ajanın tamamı etkinleştirildi ve sıfır gecikmeli en hızlı yerel mimariye bağlandı (Temel: ${coreSpeedModel}, Madenci: ${fastModel}, Vision: ${visionModel})!`
    );
  };

  // Select Output Folder Handler
  const handleSelectOutputFolder = async () => {
    if (!window.electronAPI) return;
    try {
      const folder = await window.electronAPI.selectOutputFolder();
      if (folder) {
        setOutputDirectory(folder);
      }
    } catch (err) {
      console.error('Klasör seçim hatası:', err);
    }
  };

  // Toggle Windows Docker
  const handleToggleDocker = async () => {
    if (window.electronAPI?.dockToggle) {
      const next = await window.electronAPI.dockToggle();
      setIsDockVisible(next);
    }
  };

  // Save Settings
  const handleSaveSettings = () => {
    try {
      localStorage.setItem('autoclip_groq_key', groqApiKey);
      localStorage.setItem('autoclip_lang', language);
      localStorage.setItem('autoclip_dock_autostart', String(dockerAutoStart));
      localStorage.setItem('autoclip_copilot_muted', String(dockerMuted));
      localStorage.setItem('autoclip_copilot_tone', copilotTone);
    } catch (e) {
      console.error('Ayarlar kaydedilirken hata:', e);
    }

    setShowSaveToast(true);
    setTimeout(() => {
      setShowSaveToast(false);
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
      <div className="bg-[#0b0c16] border border-dark-700 w-full max-w-4xl h-[680px] rounded-3xl shadow-2xl shadow-brand-purple/20 flex flex-col overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="h-16 px-6 border-b border-dark-750 flex items-center justify-between bg-dark-900/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-purple to-brand-cyan flex items-center justify-center shadow-lg shadow-brand-purple/20">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Stüdyo & Sistem Ayarları</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-purple/20 text-brand-purple border border-brand-purple/30 font-semibold">
                  Tüm Modüller
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Yapay zeka modelleri, video kurgu parametreleri, Windows Docker ve otopilot yapılandırması
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-dark-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center px-6 border-b border-dark-800 bg-dark-950/40 gap-2 pt-2">
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex items-center space-x-2 px-4 py-2.5 border-b-2 font-bold text-xs transition-all ${
              activeTab === 'ai'
                ? 'border-brand-purple text-white bg-brand-purple/10 rounded-t-xl'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-4 h-4 text-brand-purple" />
            <span>🤖 AI & Modeller</span>
          </button>

          <button
            onClick={() => setActiveTab('office')}
            className={`flex items-center space-x-2 px-4 py-2.5 border-b-2 font-bold text-xs transition-all ${
              activeTab === 'office'
                ? 'border-indigo-400 text-white bg-indigo-400/10 rounded-t-xl'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4 text-indigo-400" />
            <span>🏢 Ofis & Ajan Kadrosu</span>
          </button>

          <button
            onClick={() => setActiveTab('video')}
            className={`flex items-center space-x-2 px-4 py-2.5 border-b-2 font-bold text-xs transition-all ${
              activeTab === 'video'
                ? 'border-brand-cyan text-white bg-brand-cyan/10 rounded-t-xl'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Film className="w-4 h-4 text-brand-cyan" />
            <span>🎬 Video, Kurgu & Altyazı</span>
          </button>

          <button
            onClick={() => setActiveTab('docker')}
            className={`flex items-center space-x-2 px-4 py-2.5 border-b-2 font-bold text-xs transition-all ${
              activeTab === 'docker'
                ? 'border-amber-400 text-white bg-amber-400/10 rounded-t-xl'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bot className="w-4 h-4 text-amber-400" />
            <span>🪟 Windows Desktop Docker</span>
          </button>

          <button
            onClick={() => setActiveTab('autopilot')}
            className={`flex items-center space-x-2 px-4 py-2.5 border-b-2 font-bold text-xs transition-all ${
              activeTab === 'autopilot'
                ? 'border-emerald-400 text-white bg-emerald-400/10 rounded-t-xl'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-4 h-4 text-emerald-400" />
            <span>🚀 7/24 Otopilot</span>
          </button>

          <button
            onClick={() => setActiveTab('youtube')}
            className={`flex items-center space-x-2 px-4 py-2.5 border-b-2 font-bold text-xs transition-all ${
              activeTab === 'youtube'
                ? 'border-rose-500 text-white bg-rose-500/10 rounded-t-xl'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Youtube className="w-4 h-4 text-rose-500" />
            <span>🔴 YouTube & Google API</span>
            {youtubeAuth?.isAuthenticated && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
            )}
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ======================================================== */}
          {/* TAB 1: AI & MODELLER                                      */}
          {/* ======================================================== */}
          {activeTab === 'ai' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Hardware Diagnostics & Core Engine Status (Moved from Header) */}
              <div className="p-4 rounded-2xl bg-dark-900 border border-dark-750 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-brand-purple" />
                    <span>Sistem Donanım & Çekirdek Motor Teşhisi</span>
                  </h4>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 font-semibold">
                    Gerçek Zamanlı Durum
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  {/* FFmpeg Status */}
                  <div className="p-3 rounded-xl bg-dark-850 border border-dark-750 flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                      <Film className="w-4 h-4 text-brand-cyan" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Video Render Motoru</span>
                      <strong className="text-white text-xs flex items-center gap-1 mt-0.5">
                        {systemHealth?.ffmpeg !== false ? (
                          <span className="text-emerald-400 flex items-center">
                            <CheckCircle2 className="w-3 h-3 mr-1 inline" /> FFmpeg (v9.0 Full Hazır)
                          </span>
                        ) : (
                          <span className="text-rose-400 flex items-center">
                            <AlertCircle className="w-3 h-3 mr-1 inline" /> FFmpeg Bulunamadı
                          </span>
                        )}
                      </strong>
                    </div>
                  </div>

                  {/* Whisper GPU Status */}
                  <div className="p-3 rounded-xl bg-dark-850 border border-dark-750 flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                      <Cpu className="w-4 h-4 text-brand-purple" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Ses Deşifre Motoru</span>
                      <strong className="text-white text-xs flex items-center gap-1 mt-0.5">
                        {systemHealth?.cuda ? (
                          <span className="text-emerald-400 flex items-center">
                            <CheckCircle2 className="w-3 h-3 mr-1 inline" /> Whisper (CUDA GPU Hızlandırmalı)
                          </span>
                        ) : (
                          <span className="text-slate-300">Whisper (CPU Modu)</span>
                        )}
                      </strong>
                    </div>
                  </div>

                  {/* AI LLM Provider */}
                  <div className="p-3 rounded-xl bg-dark-850 border border-dark-750 flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Yapay Zeka Mimarisi</span>
                      <strong className="text-white text-xs flex items-center gap-1 mt-0.5">
                        {llmProvider === 'ollama' ? (
                          <span className="text-brand-purple font-medium">
                            Yerel Ollama ({ollamaModel})
                          </span>
                        ) : (
                          <span className="text-brand-cyan font-medium">
                            Groq Cloud ({groqModel})
                          </span>
                        )}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* LLM Provider Selection */}
              <div className="p-4 rounded-2xl bg-dark-900 border border-dark-750 space-y-3">
                <label className="text-xs font-bold text-white flex items-center justify-between">
                  <span>Birincil LLM Sağlayıcısı</span>
                  <span className="text-[11px] text-brand-cyan font-mono font-normal">
                    {llmProvider === 'ollama' ? 'Tamamen Yerel & Ücretsiz' : 'Cloud GPU Hızlandırmalı'}
                  </span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setLlmProvider('ollama')}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      llmProvider === 'ollama'
                        ? 'bg-brand-purple/20 border-brand-purple text-white shadow-md shadow-brand-purple/20'
                        : 'bg-dark-850 border-dark-750 text-slate-400 hover:border-dark-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-white flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-brand-purple" />
                        Yerel Ollama (Gemma, Llama)
                      </span>
                      {systemHealth?.ollama ? (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                          Çalışıyor
                        </span>
                      ) : (
                        <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-bold">
                          Kapalı / Çevrimdışı
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Sıfır maliyet, internet bağlantısı gerektirmez, 12 Ajanlı Ajans Masası ile tam uyumlu.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLlmProvider('groq')}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      llmProvider === 'groq'
                        ? 'bg-brand-purple/20 border-brand-purple text-white shadow-md shadow-brand-purple/20'
                        : 'bg-dark-850 border-dark-750 text-slate-400 hover:border-dark-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-white flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-brand-cyan" />
                        Groq Cloud API
                      </span>
                      <span className="text-[10px] bg-brand-cyan/20 text-brand-cyan px-2 py-0.5 rounded-full font-bold">
                        Ultra Hızlı (LPUs)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Llama-3.3 70B & Mixtral modelleriyle saniyede 800+ token analiz hızı.
                    </p>
                  </button>
                </div>
              </div>

              {/* Ollama Configuration */}
              {llmProvider === 'ollama' && (
                <div className="p-4 rounded-2xl bg-dark-900 border border-dark-750 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-2">
                        <span>Ollama Modelleri & Sunucu</span>
                        <span className="text-[10px] font-mono text-slate-400">({ollamaHost})</span>
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Sisteminizde yüklü olan modeller taranır ve kurgu motoruna atanır
                      </p>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        onClick={handleScanSystem}
                        disabled={isScanningOllama}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-dark-800 hover:bg-dark-750 text-slate-200 hover:text-white border border-dark-700 text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                        title="Bilgisayarınızdaki Ollama servisini tarar ve yeni inen modelleri listeler"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 text-brand-cyan ${isScanningOllama ? 'animate-spin' : ''}`} />
                        <span>{isScanningOllama ? 'Taranıyor...' : '🔄 Sistemi Tara'}</span>
                      </button>

                      <button
                        onClick={handleAutoDistributeModels}
                        className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-brand-purple hover:from-amber-600 hover:to-purple-600 text-white text-xs font-bold shadow-md shadow-amber-500/20 transition-all active:scale-95"
                        title="Tüm 12 ajanı aktif eder ve indirdiğiniz modelleri yeteneklerine göre en uygun rollere paylaştırır"
                      >
                        <Zap className="w-3.5 h-3.5 text-amber-200 fill-current" />
                        <span>⚡ Bütün Ajanları Kullan</span>
                      </button>
                    </div>
                  </div>

                  {/* Scan / Auto Distribution Notice */}
                  {scanNotice && (
                    <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center justify-between animate-fadeIn">
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{scanNotice}</span>
                      </div>
                      <button onClick={() => setScanNotice(null)} className="text-slate-400 hover:text-white">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                        Varsayılan Analiz Modeli
                      </label>
                      <select
                        value={ollamaModel}
                        onChange={(e) => setOllamaModel(e.target.value)}
                        className="w-full bg-dark-850 border border-dark-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-purple"
                      >
                        {ollamaModelsList.length > 0 ? (
                          ollamaModelsList.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))
                        ) : (
                          <>
                            <option value="gemma3:4b">gemma3:4b (Önerilen Hızlı Model)</option>
                            <option value="llama3.2">llama3.2 (Meta Llama 3B)</option>
                            <option value="mistral">mistral (7B Güçlü Analiz)</option>
                            <option value="deepseek-r1:8b">deepseek-r1:8b (Derin Düşünme)</option>
                          </>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                        Ollama Sunucu Host Adresi
                      </label>
                      <input
                        type="text"
                        value={ollamaHost}
                        onChange={(e) => setOllamaHost(e.target.value)}
                        placeholder="http://localhost:11434"
                        className="w-full bg-dark-850 border border-dark-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-purple"
                      >
                      </input>
                    </div>
                  </div>

                  {/* Detected Installed Model Badges */}
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1.5 font-semibold">
                      Sistemde Algılanan Ollama Modelleri ({ollamaModelsList.length}):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {ollamaModelsList.length > 0 ? (
                        ollamaModelsList.map((model) => (
                          <span
                            key={model}
                            onClick={() => setOllamaModel(model)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono cursor-pointer border transition-colors ${
                              ollamaModel === model
                                ? 'bg-brand-purple/20 border-brand-purple text-brand-purple font-bold'
                                : 'bg-dark-850 border-dark-750 text-slate-400 hover:text-white'
                            }`}
                          >
                            {model}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500 italic">
                          Henüz model bulunamadı veya Ollama çevrimdışı. "Modelleri Canlı Tara" butonuna tıklayın.
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Groq Configuration */}
              {llmProvider === 'groq' && (
                <div className="p-4 rounded-2xl bg-dark-900 border border-dark-750 space-y-4">
                  <h4 className="text-xs font-bold text-white">Groq API Ayarları</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                        Groq API Key (gsk_...)
                      </label>
                      <input
                        type="password"
                        value={groqApiKey}
                        onChange={(e) => setGroqApiKey(e.target.value)}
                        placeholder="gsk_..."
                        className="w-full bg-dark-850 border border-dark-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-purple"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                        Groq Bulut Modeli
                      </label>
                      <select
                        value={groqModel}
                        onChange={(e) => setGroqModel(e.target.value)}
                        className="w-full bg-dark-850 border border-dark-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-purple"
                      >
                        <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile (En Yüksek Kalite)</option>
                        <option value="mixtral-8x7b-32768">mixtral-8x7b-32768 (Geniş Bağlam)</option>
                        <option value="gemma2-9b-it">gemma2-9b-it (Ultra Hızlı)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Whisper Speech Recognition */}
              <div className="p-4 rounded-2xl bg-dark-900 border border-dark-750 space-y-3">
                <h4 className="text-xs font-bold text-white flex items-center justify-between">
                  <span>Whisper Konuşma Deşifre Motoru</span>
                  <span className="text-[10px] text-emerald-400 font-semibold">CUDA GPU Hızlandırmalı</span>
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Model Boyutu & Doğruluk
                    </label>
                    <select
                      value={whisperModel}
                      onChange={(e) => setWhisperModel(e.target.value as any)}
                      className="w-full bg-dark-850 border border-dark-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-purple"
                    >
                      <option value="tiny">tiny (Ultra Hızlı / Düşük RAM)</option>
                      <option value="base">base (Hızlı / Standart)</option>
                      <option value="small">small (Dengeli - Önerilen)</option>
                      <option value="medium">medium (Yüksek Doğruluk)</option>
                      <option value="large-v3">large-v3 (Maksimum Hassasiyet)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Transkript Dili
                    </label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full bg-dark-850 border border-dark-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-purple"
                    >
                      <option value="tr">Türkçe (tr)</option>
                      <option value="en">İngilizce (en)</option>
                      <option value="auto">Otomatik Algıla</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB: OFİS & AJAN KADROSU                                  */}
          {/* ======================================================== */}
          {activeTab === 'office' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Office Header & Quick Presets */}
              <div className="p-4 rounded-2xl bg-dark-900 border border-dark-750 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-400" />
                    <span>Otonom Ajans Kadrosu & Model Konfigürasyonu</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold font-mono">
                      {officeAgents.length} Departman
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    13 ajanın her birine istediğiniz dil modelini atayabilirsiniz. Sistem donanım ve VRAM risklerini anlık denetler ve kırmızı uyarı notu düşer.
                  </p>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={handleAutoDistributeModels}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-brand-cyan hover:from-emerald-600 hover:to-cyan-600 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition-all active:scale-95"
                    title="Tüm kadroyu sıfır gecikmeli 2-Kademeli Hız Mimarisine kilitler (gemma3:4b + qwen3:8b)"
                  >
                    <Zap className="w-3.5 h-3.5 text-white fill-current" />
                    <span>⚡ Hızlı Hibrit Mimariye Kilitle</span>
                  </button>

                  <button
                    onClick={handleResetOfficeAgents}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-dark-800 hover:bg-dark-750 text-slate-300 hover:text-white border border-dark-700 text-xs font-bold transition-all"
                    title="Ajanların varsayılan modellerini geri yükler"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Sıfırla</span>
                  </button>
                </div>
              </div>

              {/* Agent Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {officeAgents.map((agent) => {
                  const evalResult = evaluateModelSuitability(agent, agent.model);
                  const isDanger = evalResult.level === 'danger';
                  const isWarning = evalResult.level === 'warning';

                  return (
                    <div
                      key={agent.role}
                      className={`p-3.5 rounded-2xl bg-dark-900 border transition-all space-y-3 ${
                        isDanger
                          ? 'border-rose-500/60 shadow-lg shadow-rose-950/40 bg-gradient-to-b from-rose-950/20 to-dark-900'
                          : isWarning
                          ? 'border-amber-500/50 shadow-md shadow-amber-950/30'
                          : 'border-dark-750 hover:border-dark-700'
                      }`}
                    >
                      {/* Top Header: Avatar, Name, Title & Role */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2.5">
                          <span className="text-2xl p-1.5 rounded-xl bg-dark-850 border border-dark-700 shrink-0">
                            {agent.avatar}
                          </span>
                          <div>
                            <div className="flex items-center space-x-1.5">
                              <h5 className="text-xs font-bold text-white">{agent.name}</h5>
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-dark-800 text-slate-400 border border-dark-750">
                                {agent.role}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-medium block">
                              {agent.title} • <span className="text-brand-cyan">{agent.department}</span>
                            </span>
                          </div>
                        </div>

                        {/* Status / Level Indicator */}
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                            isDanger
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                              : isWarning
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                          }`}
                        >
                          {evalResult.badge}
                        </span>
                      </div>

                      {/* Brief description */}
                      <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">
                        {agent.description}
                      </p>

                      {/* Model Selector */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-300 flex items-center justify-between">
                          <span>Atanan Dil Modeli:</span>
                          <span className="text-brand-purple font-mono text-[10px] font-bold">{agent.model}</span>
                        </label>

                        <div className="flex items-center space-x-2">
                          <select
                            value={agent.model}
                            onChange={(e) => handleAgentModelChange(agent.role, e.target.value)}
                            className={`flex-1 bg-dark-850 border rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none transition-colors ${
                              isDanger
                                ? 'border-rose-500/70 text-rose-200'
                                : isWarning
                                ? 'border-amber-500/70 text-amber-200'
                                : 'border-dark-700 focus:border-brand-purple'
                            }`}
                          >
                            {/* Dynamically detected models */}
                            {ollamaModelsList.length > 0 && (
                              <optgroup label="Sisteminizdeki Yüklü Modeller">
                                {ollamaModelsList.map((m) => (
                                  <option key={m} value={m}>
                                    {m}
                                  </option>
                                ))}
                              </optgroup>
                            )}

                            {/* Popular presets */}
                            <optgroup label="Popüler Yerel Modeller">
                              <option value="qwen3:8b">qwen3:8b (Tavsiye Edilen - Zeki & Hızlı)</option>
                              <option value="gemma3:4b">gemma3:4b (Ultra Hızlı - 80+ token/s)</option>
                              <option value="qwen3-vl:8b">qwen3-vl:8b (Görsel Zeka / Vision)</option>
                              <option value="llama3.2-vision:11b">llama3.2-vision:11b (Görsel Kadraj)</option>
                              <option value="llama3:latest">llama3:latest (8B Mantık)</option>
                              <option value="deepseek-r1:8b">deepseek-r1:8b (Düşünce Zinciri - Yavaş)</option>
                              <option value="gemma3:12b">gemma3:12b (12B Ağır Model)</option>
                            </optgroup>
                          </select>
                        </div>
                      </div>

                      {/* HARDWARE WARNING NOTIFICATION BOX (Kırmızı / Sarı / Yeşil Not) */}
                      {isDanger ? (
                        <div className="p-2.5 rounded-xl bg-rose-950/70 border border-rose-500/70 text-[11px] text-rose-200 flex items-start space-x-2 animate-fadeIn shadow-sm shadow-rose-950">
                          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                          <div className="space-y-0.5">
                            <span className="font-bold text-rose-300 block">
                              🚨 SİSTEM UYARISI: Donanım & Performans Riski
                            </span>
                            <p className="text-rose-200 leading-snug">{evalResult.message}</p>
                          </div>
                        </div>
                      ) : isWarning ? (
                        <div className="p-2.5 rounded-xl bg-amber-950/60 border border-amber-500/60 text-[11px] text-amber-200 flex items-start space-x-2 animate-fadeIn">
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <div className="space-y-0.5">
                            <span className="font-bold text-amber-300 block">⚠️ Dikkat: Olası Gecikme</span>
                            <p className="text-amber-200 leading-snug">{evalResult.message}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-300 flex items-center space-x-2 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{evalResult.message}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: VİDEO, KURGU & ALTYAZI                             */}
          {/* ======================================================== */}
          {activeTab === 'video' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Output Directory Picker */}
              <div className="p-4 rounded-2xl bg-dark-900 border border-dark-750 space-y-2">
                <label className="text-xs font-bold text-white block">
                  Varsayılan Klipler Çıktı Klasörü
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    readOnly
                    value={outputDirectory || 'Otomatik (Video Yanında: AutoClips_Output)'}
                    className="flex-1 bg-dark-850 border border-dark-700 rounded-xl px-3 py-2 text-xs text-slate-300 font-mono"
                  />
                  <button
                    onClick={handleSelectOutputFolder}
                    className="px-3.5 py-2 rounded-xl bg-brand-purple hover:bg-purple-600 text-white text-xs font-bold transition-colors flex items-center space-x-1.5 shrink-0"
                  >
                    <FolderOpen className="w-4 h-4" />
                    <span>Klasör Seç</span>
                  </button>
                </div>
              </div>

              {/* Clip Count & Duration Ranges */}
              <div className="p-4 rounded-2xl bg-dark-900 border border-dark-750 space-y-4">
                <h4 className="text-xs font-bold text-white">Kırpma Parametreleri</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Klip Sayısı
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={clipCount}
                      onChange={(e) => setClipCount(Number(e.target.value))}
                      className="w-full bg-dark-850 border border-dark-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-purple"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Min Süre (sn)
                    </label>
                    <input
                      type="number"
                      min={15}
                      max={180}
                      value={minClipDuration}
                      onChange={(e) => setMinClipDuration(Number(e.target.value))}
                      className="w-full bg-dark-850 border border-dark-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-purple"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Max Süre (sn)
                    </label>
                    <input
                      type="number"
                      min={30}
                      max={300}
                      value={maxClipDuration}
                      onChange={(e) => setMaxClipDuration(Number(e.target.value))}
                      className="w-full bg-dark-850 border border-dark-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-purple"
                    />
                  </div>
                </div>

                {/* Dead Air / Silence Removal Toggle */}
                <div className="pt-2 border-t border-dark-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Scissors className="w-3.5 h-3.5 text-brand-cyan" />
                      Akıllı Sessizlik & Duraklama Temizleme (Auto-Editor Dead-Air)
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Konuşmacının nefes veya duraklama yaptığı sessiz anları otomatik budar, videoyu hızlandırır.
                    </p>
                  </div>
                  <button
                    onClick={() => setEnableSilenceRemoval(!enableSilenceRemoval)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                      enableSilenceRemoval
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-dark-850 border-dark-700 text-slate-400'
                    }`}
                  >
                    {enableSilenceRemoval ? '✓ Aktif' : 'Kapalı'}
                  </button>
                </div>
              </div>

              {/* Aspect Ratio & Frame Layout */}
              <div className="p-4 rounded-2xl bg-dark-900 border border-dark-750 space-y-3">
                <h4 className="text-xs font-bold text-white">Kadraj & Format</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      En-Boy Oranı
                    </label>
                    <select
                      value={aspectRatio}
                      onChange={(e) => setAspectRatio(e.target.value as any)}
                      className="w-full bg-dark-850 border border-dark-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-purple"
                    >
                      <option value="9:16">9:16 (Dikey Shorts, Reels, TikTok)</option>
                      <option value="16:9">16:9 (Yatay YouTube)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Dikey Kadrajlama Modu
                    </label>
                    <select
                      value={layoutMode}
                      onChange={(e) => setLayoutMode(e.target.value as any)}
                      className="w-full bg-dark-850 border border-dark-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-purple"
                    >
                      <option value="smart_face_tracking">Akıllı Yüz Takibi (Face Tracking)</option>
                      <option value="blur_background">Bulanık Arka Plan (Blur Canvas)</option>
                      <option value="crop_center">Ortala & Kırp (Center Crop)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Subtitle Configuration */}
              <div className="p-4 rounded-2xl bg-dark-900 border border-dark-750 space-y-4">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Type className="w-4 h-4 text-brand-purple" />
                  TikTok Dinamik Altyazı Stili
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Yazı Tipi (Font)
                    </label>
                    <select
                      value={subtitleConfig.fontName}
                      onChange={(e) => setSubtitleConfig({ ...subtitleConfig, fontName: e.target.value })}
                      className="w-full bg-dark-850 border border-dark-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-purple"
                    >
                      <option value="Montserrat">Montserrat (Modern & Kalın)</option>
                      <option value="Impact">Impact (Klasik Meme & Viral)</option>
                      <option value="Arial">Arial Bold</option>
                      <option value="The Bold Font">The Bold Font (TikTok Trend)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Yazı Boyutu (px)
                    </label>
                    <input
                      type="number"
                      value={subtitleConfig.fontSize}
                      onChange={(e) => setSubtitleConfig({ ...subtitleConfig, fontSize: Number(e.target.value) })}
                      className="w-full bg-dark-850 border border-dark-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-purple"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Animasyon Tarzı
                    </label>
                    <select
                      value={subtitleConfig.animationStyle}
                      onChange={(e) => setSubtitleConfig({ ...subtitleConfig, animationStyle: e.target.value as any })}
                      className="w-full bg-dark-850 border border-dark-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-purple"
                    >
                      <option value="karaoke">Karaoke (Kelime Vurgusu)</option>
                      <option value="highlight">Highlight (Canlı Renk)</option>
                      <option value="zoom">Zoom (Patlama)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Ana Metin Rengi
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={subtitleConfig.primaryColor}
                        onChange={(e) => setSubtitleConfig({ ...subtitleConfig, primaryColor: e.target.value })}
                        className="w-8 h-8 rounded-lg bg-transparent border-0 cursor-pointer"
                      />
                      <span className="font-mono text-xs text-slate-400">{subtitleConfig.primaryColor}</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Vurgu (Highlight) Rengi
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={subtitleConfig.highlightColor}
                        onChange={(e) => setSubtitleConfig({ ...subtitleConfig, highlightColor: e.target.value })}
                        className="w-8 h-8 rounded-lg bg-transparent border-0 cursor-pointer"
                      />
                      <span className="font-mono text-xs text-slate-400">{subtitleConfig.highlightColor}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: WINDOWS DESKTOP DOCKER (NOVA)                      */}
          {/* ======================================================== */}
          {activeTab === 'docker' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Docker Live Status & Direct Toggle */}
              <div className="p-4 rounded-2xl bg-dark-900 border border-dark-750 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <span>Windows Desktop Docker (NOVA Island)</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                      isDockVisible
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : 'bg-slate-700/40 text-slate-400 border-slate-600'
                    }`}>
                      {isDockVisible ? '🟢 Şu Anda Ekranda Açık' : '⚪ Gizli / Kapalı'}
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Masaüstünüzün en tepesinde bağımsız çalışan akıllı asistan adası
                  </p>
                </div>

                <button
                  onClick={handleToggleDocker}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 ${
                    isDockVisible
                      ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30'
                      : 'bg-brand-purple hover:bg-purple-600 text-white shadow-brand-purple/20'
                  }`}
                >
                  <Bot className="w-4 h-4" />
                  <span>{isDockVisible ? 'Docker\'ı Kapat' : 'Docker\'ı Aç'}</span>
                </button>
              </div>

              {/* Behavior Settings */}
              <div className="p-4 rounded-2xl bg-dark-900 border border-dark-750 space-y-4">
                <h4 className="text-xs font-bold text-white">Docker Davranış & Tercihler</h4>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">
                        Uygulama Açıldığında Otomatik Göster
                      </span>
                      <span className="text-[11px] text-slate-400">
                        AutoClip Studio başlatıldığında Windows Docker adası masaüstünde otomatik olarak belirir.
                      </span>
                    </div>
                    <button
                      onClick={() => setDockerAutoStart(!dockerAutoStart)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                        dockerAutoStart
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                          : 'bg-dark-850 border-dark-700 text-slate-400'
                      }`}
                    >
                      {dockerAutoStart ? '✓ Açık' : 'Kapalı'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-dark-800">
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">
                        Sessiz Mod (Bildirim Sesleri)
                      </span>
                      <span className="text-[11px] text-slate-400">
                        NOVA'nın durum bildirimlerinde ses çıkarmasını engeller.
                      </span>
                    </div>
                    <button
                      onClick={() => setDockerMuted(!dockerMuted)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
                        dockerMuted
                          ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                          : 'bg-dark-850 border-dark-700 text-slate-400'
                      }`}
                    >
                      {dockerMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                      <span>{dockerMuted ? 'Sessizde' : 'Sesli'}</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-dark-800">
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">
                        NOVA Asistan Yanıt Tonu
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Masaüstü docker'ındaki asistanın iletişim tarzı ve kurgu anlatımı.
                      </span>
                    </div>
                    <select
                      value={copilotTone}
                      onChange={(e) => setCopilotTone(e.target.value as any)}
                      className="bg-dark-850 border border-dark-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-purple"
                    >
                      <option value="energetic">🔥 Enerjik & Heyecanlı (Şef)</option>
                      <option value="pro">💼 Profesyonel & Ciddi</option>
                      <option value="minimal">🎯 Minimalist & Sade</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-dark-800">
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">
                        NOVA Canlı Seslendirme & Konuşma (TTS)
                      </span>
                      <span className="text-[11px] text-slate-400">
                        NOVA'nın soru ve emirlerinize Türkçe sesli yanıt vermesini sağlar.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        novaVoice.speak('Selam patron! Ses sistemim devrede. Stüdyoyu emrine amade kıldım, bir emrin var mı?');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>🔊 Örnek Sesi Dinle</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Visual Appearance & Desktop Protection */}
              <div className="p-4 rounded-2xl bg-dark-900 border border-dark-750 space-y-2">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-brand-cyan" />
                  Görünüm & Opaklık Güvencesi
                </h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Windows Docker kutusu <strong className="text-slate-200">%100 solid opak arka plan</strong> ile tasarlanmıştır. Arkasındaki masaüstü tarayıcı veya diğer uygulamalarla karışmaz, parlak neon siber gözleri ve işlem sırası ağacı ile tam netlik sunar.
                </p>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: 7/24 OTOPİLOT OTOMASYONU                           */}
          {/* ======================================================== */}
          {activeTab === 'autopilot' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-dark-900 border border-dark-750 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <span>7/24 Otopilot Otonom Motor</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                      autopilotState?.isRunning
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : 'bg-slate-700/40 text-slate-400 border-slate-600'
                    }`}>
                      {autopilotState?.isRunning ? '🟢 7/24 Döngü Aktif' : '⚪ Durduruldu'}
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Günün 3 altın saatinde (11:30, 18:30, 21:30) Creative Commons videolarını otomatik bulur ve üretir.
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Üretilen Paket Sayısı</span>
                  <span className="text-sm font-bold text-white font-mono">
                    {autopilotState?.stats?.totalGenerated || 0} Video Hazır
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-dark-900 border border-dark-750 space-y-4">
                <h4 className="text-xs font-bold text-white">Otopilot Strateji Parametreleri</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Günlük Üretim Hedefi
                    </label>
                    <input
                      type="number"
                      readOnly
                      value={3}
                      className="w-full bg-dark-850 border border-dark-700 rounded-xl px-3 py-2 text-xs text-slate-400"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">Sabit 3 altın saat slotu</span>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Minimum İzlenme Eşiği
                    </label>
                    <select
                      defaultValue="300000"
                      className="w-full bg-dark-850 border border-dark-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-purple"
                    >
                      <option value="100000">100.000+ İzlenme</option>
                      <option value="300000">300.000+ İzlenme (Önerilen)</option>
                      <option value="1000000">1.000.000+ Viral Mega Hit</option>
                      <option value="3000000">3.000.000+ Süper Viral</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Takip Edilen Trend Nişler (Creative Commons)
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {['Röportaj & Sokak', 'Teknoloji & Yapay Zeka', 'Girişimcilik & Finans', 'Podcast Kesitleri', 'Motivasyon & Psikoloji'].map((niche) => (
                      <span key={niche} className="px-2.5 py-1 rounded-lg bg-dark-850 border border-dark-750 text-slate-300 text-[11px] font-medium flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-400" />
                        {niche}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 5: YOUTUBE DATA API & GOOGLE OAUTH                    */}
          {/* ======================================================== */}
          {activeTab === 'youtube' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Status Header */}
              <div className="p-4 rounded-2xl bg-dark-900 border border-dark-750 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600 to-red-500 flex items-center justify-center shadow-lg shadow-rose-600/30">
                    <Youtube className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>YouTube Shorts & Data API v3 Entegrasyonu</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                        youtubeAuth?.isAuthenticated
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : youtubeAuth?.isConfigured
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                      }`}>
                        {youtubeAuth?.isAuthenticated
                          ? '🟢 Kanal Bağlı & Yetkili'
                          : youtubeAuth?.isConfigured
                          ? '🟡 Giriş Bekleniyor'
                          : '🔴 Yapılandırma Eksik'}
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Üretilen 9:16 Shorts videolarını tek tıkla otomatik başlık, açıklama ve etiketlerle YouTube kanalınıza yükleyin.
                    </p>
                  </div>
                </div>

                {youtubeAuth?.isAuthenticated && (
                  <button
                    type="button"
                    onClick={handleDisconnectYouTube}
                    disabled={isYoutubeLoading}
                    className="px-3.5 py-1.5 rounded-xl bg-dark-850 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border border-dark-700 hover:border-rose-600/50 text-xs font-semibold transition-all disabled:opacity-50"
                  >
                    Bağlantıyı Kes
                  </button>
                )}
              </div>

              {/* Error Notice */}
              {youtubeError && (
                <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-2 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{youtubeError}</span>
                </div>
              )}

              {/* Google Client Configuration Info */}
              <div className="p-4 rounded-2xl bg-dark-900 border border-dark-750 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <Radio className="w-4 h-4 text-brand-purple" />
                    <span>Google OAuth 2.0 İstemci Bilgileri</span>
                  </h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-dark-800 text-slate-400 border border-dark-700">
                    Özel Proje: mozart-456719
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-dark-850 border border-dark-750">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold mb-1">
                      Algılanan Client ID
                    </span>
                    <p className="font-mono text-slate-200 truncate select-all" title={youtubeAuth?.clientId || 'Bulunamadı'}>
                      {youtubeAuth?.clientId || 'client_secret*.json aranıyor...'}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-dark-850 border border-dark-750">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold mb-1">
                      İzin Kapsamı (Scopes)
                    </span>
                    <span className="text-brand-cyan font-mono text-[11px]">
                      youtube.upload, youtube.readonly
                    </span>
                  </div>
                </div>
              </div>

              {/* Channel Profile Card (if connected) or Login Prompt */}
              {youtubeAuth?.isAuthenticated && youtubeAuth.channel ? (
                <div className="space-y-4">
                  {/* Channel Header Card */}
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-dark-900 via-dark-850 to-rose-950/20 border border-rose-500/30 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3.5">
                        {youtubeAuth.channel.avatarUrl ? (
                          <img
                            src={youtubeAuth.channel.avatarUrl}
                            alt="Channel Avatar"
                            className="w-14 h-14 rounded-2xl border-2 border-rose-500 shadow-md object-cover"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-2xl bg-rose-600 text-white flex items-center justify-center font-bold text-xl border-2 border-rose-500">
                            {youtubeAuth.channel.title.charAt(0)}
                          </div>
                        )}

                        <div>
                          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                            <span>{youtubeAuth.channel.title}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">
                              Yetkilendirildi
                            </span>
                          </h3>
                          {youtubeAuth.channel.customUrl && (
                            <span className="text-xs text-rose-400 font-mono block">
                              {youtubeAuth.channel.customUrl}
                            </span>
                          )}
                          <span className="text-[11px] text-slate-400 font-mono">
                            Kanal ID: {youtubeAuth.channel.id}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={fetchYouTubeAnalytics}
                        disabled={isLoadingAnalytics}
                        className="py-1.5 px-3 rounded-xl bg-dark-800 hover:bg-dark-750 text-slate-200 hover:text-white border border-dark-700 text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
                        title="Canlı YouTube verilerini ve izlenmeleri güncelle"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAnalytics ? 'animate-spin' : ''}`} />
                        <span>Analizleri Yenile</span>
                      </button>
                    </div>

                    {/* 4 Stat KPI Cards */}
                    <div className="grid grid-cols-4 gap-2.5 pt-2 border-t border-dark-750/70">
                      <div className="p-3 rounded-xl bg-dark-850/80 border border-dark-750">
                        <span className="text-[10px] text-slate-400 block font-semibold flex items-center gap-1">
                          <Eye className="w-3 h-3 text-cyan-400" />
                          <span>Toplam İzlenme</span>
                        </span>
                        <span className="text-base font-black text-white font-mono mt-0.5 block">
                          {youtubeAnalytics?.totalViews !== undefined
                            ? youtubeAnalytics.totalViews.toLocaleString()
                            : Number(youtubeAuth.channel.videoCount || 0) > 0 ? 'Hesaplanıyor...' : '0'}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-dark-850/80 border border-dark-750">
                        <span className="text-[10px] text-slate-400 block font-semibold flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-rose-400" />
                          <span>Abone Sayısı</span>
                        </span>
                        <span className="text-base font-black text-white font-mono mt-0.5 block">
                          {Number(youtubeAuth.channel.subscriberCount || 0).toLocaleString()}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-dark-850/80 border border-dark-750">
                        <span className="text-[10px] text-slate-400 block font-semibold flex items-center gap-1">
                          <Film className="w-3 h-3 text-purple-400" />
                          <span>Toplam Video</span>
                        </span>
                        <span className="text-base font-black text-white font-mono mt-0.5 block">
                          {Number(youtubeAuth.channel.videoCount || 0).toLocaleString()}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-dark-850/80 border border-dark-750">
                        <span className="text-[10px] text-slate-400 block font-semibold flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-amber-400" />
                          <span>Sıradaki Yayın</span>
                        </span>
                        <span className="text-xs font-bold text-amber-300 mt-1 block truncate" title={youtubeAnalytics?.nextScheduledUpload?.time || "Bugün 18:30 (Altın Saat)"}>
                          {youtubeAnalytics?.nextScheduledUpload?.time || "Bugün 18:30"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 🔴 Atlas Partner (YouTube Büyüme Müdürü) Guidance Note */}
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-950/30 to-purple-950/20 border border-rose-500/25 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-rose-600/30 border border-rose-500/40 text-rose-300 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                      🔴
                    </div>
                    <div className="text-xs space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">Atlas Partner</span>
                        <span className="text-[10px] font-mono text-rose-400 font-semibold">YouTube Büyüme & Kanal Müdürü</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        Kanalınız ve Shorts akışınız izleniyor. Yüklenen videolarda 9:16 dikey kadraj, özel kapak tasarımı ve ilk 3 saniye kancaları izleyici tutma (retention) oranını maksimum seviyede tutuyor.
                      </p>
                    </div>
                  </div>

                  {/* Video-by-Video Analytics List */}
                  <div className="p-4 rounded-2xl bg-dark-900 border border-dark-750 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-white flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-brand-cyan" />
                        <span>Yüklenen Videolar & Canlı İstatistikler ({youtubeAnalytics?.videos?.length || 0})</span>
                      </h4>
                      <span className="text-[10px] text-slate-400">
                        {isLoadingAnalytics ? 'Veriler güncelleniyor...' : 'En son yüklenen Shorts & videolar'}
                      </span>
                    </div>

                    {isLoadingAnalytics && !youtubeAnalytics ? (
                      <div className="py-8 flex flex-col items-center justify-center space-y-2 text-slate-400 text-xs">
                        <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
                        <span>YouTube Data API'den canlı izlenme ve etkileşimler alınıyor...</span>
                      </div>
                    ) : youtubeAnalytics?.videos && youtubeAnalytics.videos.length > 0 ? (
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {youtubeAnalytics.videos.map((vid: YouTubeVideoStat) => (
                          <div
                            key={vid.id}
                            className="p-2.5 rounded-xl bg-dark-850 border border-dark-750 hover:border-dark-600 transition-colors flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                              {vid.thumbnailUrl ? (
                                <img
                                  src={vid.thumbnailUrl}
                                  alt={vid.title}
                                  className="w-14 h-9 rounded-lg object-cover border border-dark-700 shrink-0"
                                />
                              ) : (
                                <div className="w-14 h-9 rounded-lg bg-dark-800 flex items-center justify-center text-slate-500 shrink-0">
                                  <Film className="w-4 h-4" />
                                </div>
                              )}
                              <div className="min-w-0 truncate">
                                <p className="font-semibold text-slate-200 truncate" title={vid.title}>
                                  {vid.title}
                                </p>
                                <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                  {vid.isShort && (
                                    <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                                      Shorts
                                    </span>
                                  )}
                                  <span>{new Date(vid.publishedAt).toLocaleDateString('tr-TR')}</span>
                                  <span className="capitalize text-slate-400">• {vid.privacyStatus === 'public' ? 'Herkese Açık' : vid.privacyStatus === 'unlisted' ? 'Liste Dışı' : 'Gizli'}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <div className="text-right flex items-center gap-3 text-xs">
                                <span className="flex items-center gap-1 font-mono font-bold text-white" title="İzlenme">
                                  <Eye className="w-3 h-3 text-cyan-400" />
                                  <span>{vid.viewCount.toLocaleString()}</span>
                                </span>
                                <span className="flex items-center gap-1 font-mono text-slate-300" title="Beğeni">
                                  <ThumbsUp className="w-3 h-3 text-emerald-400" />
                                  <span>{vid.likeCount.toLocaleString()}</span>
                                </span>
                                <span className="flex items-center gap-1 font-mono text-slate-400" title="Yorum">
                                  <MessageSquare className="w-3 h-3 text-purple-400" />
                                  <span>{vid.commentCount.toLocaleString()}</span>
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  if (window.electronAPI?.openPath) {
                                    window.electronAPI.openPath(vid.videoUrl);
                                  } else {
                                    window.open(vid.videoUrl, '_blank');
                                  }
                                }}
                                className="p-1.5 rounded-lg bg-dark-800 hover:bg-dark-750 text-slate-300 hover:text-white border border-dark-700 transition-colors"
                                title="YouTube'da Aç"
                              >
                                <ExternalLink className="w-3.5 h-3.5 text-rose-400" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-6 text-center text-xs text-slate-400 space-y-1">
                        <p>Kanalda henüz listelenen video bulunamadı veya yüklemeler işleniyor.</p>
                        <p className="text-[11px] text-slate-400">Yeni bir video yüklediğinizde istatistikler burada anlık belirecektir.</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-gradient-to-tr from-dark-900 to-dark-850 border border-dark-750 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-rose-600/20 border border-rose-500/40 text-rose-400 mx-auto flex items-center justify-center">
                    <Youtube className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-white">
                    Kanalınızı Şimdi Bağlayın
                  </h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                    Google hesabınızla tek seferlik giriş yaparak AutoClip Studio'nun Shorts videolarınızı doğrudan kanalınıza yüklemesine izin verin.
                  </p>

                  <button
                    type="button"
                    onClick={handleConnectYouTube}
                    disabled={isYoutubeLoading}
                    className="mt-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-500 hover:from-rose-500 hover:to-red-600 text-white font-bold text-xs transition-all shadow-lg shadow-rose-600/30 inline-flex items-center space-x-2 disabled:opacity-50"
                  >
                    {isYoutubeLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Google İle Bağlanıyor...</span>
                      </>
                    ) : (
                      <>
                        <Youtube className="w-4 h-4" />
                        <span>Google ile Giriş Yap & YouTube Kanalını Bağla</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Upload Privacy Default Setting */}
              <div className="p-4 rounded-2xl bg-dark-900 border border-dark-750 space-y-3">
                <h4 className="text-xs font-bold text-white">Varsayılan Yükleme Gizliliği</h4>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'public', label: 'Herkese Açık (Public)', desc: 'Tüm izleyicilere anında yayınlanır' },
                    { key: 'unlisted', label: 'Liste Dışı (Unlisted)', desc: 'Yalnızca bağlantıya sahip olanlar görür' },
                    { key: 'private', label: 'Gizli (Private)', desc: 'Sadece kanal sahibi görebilir' },
                  ].map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => {
                        setDefaultPrivacy(p.key as any);
                        try { localStorage.setItem('autoclip_youtube_privacy', p.key); } catch {}
                      }}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        defaultPrivacy === p.key
                          ? 'bg-rose-500/10 border-rose-500 text-white shadow-md'
                          : 'bg-dark-850 border-dark-750 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className="text-xs font-bold block">{p.label}</span>
                      <span className="text-[10px] text-slate-500 mt-0.5 block">{p.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="h-16 px-6 border-t border-dark-750 bg-dark-900/60 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-dark-800 hover:bg-dark-750 text-slate-300 hover:text-white text-xs font-bold transition-colors"
          >
            İptal
          </button>

          <div className="flex items-center space-x-3">
            {showSaveToast && (
              <span className="text-xs text-emerald-400 font-bold flex items-center gap-1.5 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4" />
                Ayarlar Başarıyla Kaydedildi!
              </span>
            )}

            <button
              onClick={handleSaveSettings}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-purple to-brand-cyan hover:from-purple-600 hover:to-cyan-600 text-white text-xs font-bold transition-all shadow-lg shadow-brand-purple/20 flex items-center space-x-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Ayarları Kaydet & Uygula</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
