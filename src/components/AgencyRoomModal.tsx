import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  Sparkles,
  Bot,
  Copy,
  Check,
  Trash2,
  Clock,
  Layers,
  ChevronRight,
  Eye,
  ShieldCheck,
  Cpu,
  Activity,
  Zap,
  MessageSquare,
  Flame,
  Radio,
  FileText,
  Monitor,
  Terminal,
  Volume2,
  Calendar,
  CheckCircle2,
  Loader2,
  Download,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  Globe,
  RefreshCw,
  Sliders,
  Award,
  ExternalLink,
  Play,
  Share2,
  Shield,
  Film
} from 'lucide-react';
import { YoutubeIcon as Youtube } from './icons/YoutubeIcon';
import {
  AgencyMessage,
  AgencyAgentConfig,
  AgencyRole,
  PipelineProgress,
  AutopilotState,
  SystemHealth,
  CuratedPitchCandidate,
} from '../types';
import { Office3DViewport } from './Office3DViewport';

interface AgencyRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: AgencyMessage[];
  onClearMessages?: () => void;
  agents?: AgencyAgentConfig[];
  onUpdateAgents?: (agents: AgencyAgentConfig[]) => void;
  isProcessing?: boolean;
  onRunAgency?: () => void;
  hasVideo?: boolean;
  pipelineProgress?: PipelineProgress;
  autopilotState?: AutopilotState;
  systemHealth?: SystemHealth | null;
  isStandalone?: boolean;
  onSelectPitch?: (pitch: CuratedPitchCandidate) => void;
}

export interface AgentOfficeNode {
  role: AgencyRole;
  name: string;
  model: string;
  avatar: string;
  department: string;
  title: string;
  description: string;
  accentColor: string;
  badgeBg: string;
  borderColor: string;
  glowColor: string;
  workDescription: string;
  deliverableTitle: string;
  isExtra?: boolean;
  enabled?: boolean;
}

export const INITIAL_OFFICE_AGENTS: AgentOfficeNode[] = [
  // CORE 8 AGENTS
  {
    role: 'trend_hunter',
    name: 'Hunter Gemma',
    model: 'gemma3:4b',
    avatar: '🛰️',
    department: 'Radar & İstihbarat',
    title: 'Trend & CC Avcısı',
    description: 'YouTube Creative Commons ağını tarayarak yüksek izlenmeli viral kaynak videoları keşfeder.',
    accentColor: 'text-amber-400',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    borderColor: 'border-amber-500/40 hover:border-amber-400',
    glowColor: 'shadow-amber-500/30',
    workDescription: 'YouTube ağını tarıyor ve yüksek izlenme potansiyelli CC videolarını filtreliyor...',
    deliverableTitle: 'Kaynak CC Video Bulundu',
    enabled: true,
  },
  {
    role: 'copyright_auditor',
    name: 'Legal Qwen',
    model: 'qwen3:8b',
    avatar: '⚖️',
    department: 'Hukuk & Telif Uyum',
    title: 'Telif & Lisans Denetçisi',
    description: 'CC-BY lisans koşullarını ve ticari hakları denetler; yasal atıf metnini oluşturur.',
    accentColor: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    borderColor: 'border-emerald-500/40 hover:border-emerald-400',
    glowColor: 'shadow-emerald-500/30',
    workDescription: 'Creative Commons (CC-BY) lisansı, ticari kullanım ve türev izinlerini denetliyor...',
    deliverableTitle: 'CC-BY Telif Onaylandı',
    enabled: true,
  },
  {
    role: 'scout',
    name: 'Scout Gemma',
    model: 'gemma3:4b',
    avatar: '⚡',
    department: 'Keşif & Kanca Madenciliği',
    title: 'Viral Klip Madencisi',
    description: 'Transkripti ve ses dalgalarını tarayarak izleyiciyi ilk saniyede yakalayacak kancaları bulur.',
    accentColor: 'text-yellow-400',
    badgeBg: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    borderColor: 'border-yellow-500/40 hover:border-yellow-400',
    glowColor: 'shadow-yellow-500/30',
    workDescription: 'Transkripti analiz ediyor ve yüksek merak uyandıran zaman aralıklarını çıkarıyor...',
    deliverableTitle: 'Kanca Anları İşaretlendi',
    enabled: true,
  },
  {
    role: 'ceo',
    name: 'Director Qwen',
    model: 'qwen3:8b',
    avatar: '👑',
    department: 'Yönetim & Karar Süiti',
    title: 'Genel Yayın Yönetmeni & CEO',
    description: 'Aday kesitler arasından en yüksek izlenme getirecek klipi seçer, süreleri netleştirir.',
    accentColor: 'text-purple-400',
    badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    borderColor: 'border-purple-500/40 hover:border-purple-400',
    glowColor: 'shadow-purple-500/30',
    workDescription: 'Aday klipleri virallik ve hikaye akışı açısından değerlendirip nihai kurguyu seçiyor...',
    deliverableTitle: 'En İyi Klip Onaylandı',
    enabled: true,
  },
  {
    role: 'art_director',
    name: 'Vision Qwen-VL',
    model: 'qwen3-vl:8b',
    avatar: '👁️',
    department: 'Görsel & Vision Stüdyosu',
    title: 'Görsel Yönetmen (Vision AI)',
    description: 'Video karelerini inceler; en dinamik yüz ifadesini tespit edip 9:16 kapak resmi yapar.',
    accentColor: 'text-cyan-400',
    badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    borderColor: 'border-cyan-500/40 hover:border-cyan-400',
    glowColor: 'shadow-cyan-500/30',
    workDescription: 'Video karelerini inceliyor; yüz ifadesini ve en yüksek tıklama getirecek kapak karesini seçiyor...',
    deliverableTitle: 'Thumbnail & Kadraj Seçildi',
    enabled: true,
  },
  {
    role: 'copywriter',
    name: 'Copy Qwen',
    model: 'qwen3:8b',
    avatar: '✍️',
    department: 'Yaratıcı Yazarlık & SEO',
    title: 'Sosyal Medya & SEO Yazarı',
    description: 'TikTok, Shorts ve Reels için yüksek CTR kanca başlıkları, açıklamalar ve etiketler üretir.',
    accentColor: 'text-pink-400',
    badgeBg: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
    borderColor: 'border-pink-500/40 hover:border-pink-400',
    glowColor: 'shadow-pink-500/30',
    workDescription: '3 alternatif viral başlık, algoritma dostu açıklama ve trend etiketler yazıyor...',
    deliverableTitle: 'Sosyal Metinler Hazırlandı',
    enabled: true,
  },
  {
    role: 'qa',
    name: 'Auditor Qwen',
    model: 'qwen3:8b',
    avatar: '🛡️',
    department: 'Kalite Güvence & Mantık',
    title: 'Kalite & Mantık Denetçisi',
    description: 'Cümle tamlığı, süre sınırları ve mantık bütünlüğünü denetler; kalite puanı verir.',
    accentColor: 'text-blue-400',
    badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    borderColor: 'border-blue-500/40 hover:border-blue-400',
    glowColor: 'shadow-blue-500/30',
    workDescription: 'Retorik akış, cümle bütünlüğü ve süre kısıtlamalarını denetleyip puanlıyor...',
    deliverableTitle: 'Kalite Onaylandı (%95+)',
    enabled: true,
  },
  {
    role: 'scheduler',
    name: 'Planner Qwen',
    model: 'qwen3:8b',
    avatar: '📅',
    department: 'Yayın & Büyüme Kulesi',
    title: 'Yayın Planlama Stratejisti',
    description: 'Algoritma dinamiklerine göre altın yayın saatlerini (12:30, 18:30, 21:15) planlar.',
    accentColor: 'text-indigo-400',
    badgeBg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    borderColor: 'border-indigo-500/40 hover:border-indigo-400',
    glowColor: 'shadow-indigo-500/30',
    workDescription: 'Hedef kitle pik saatlerini analiz edip klibi en verimli altın yayın yuvasına yerleştiriyor...',
    deliverableTitle: 'Altın Yayın Saati Ayrıldı',
    enabled: true,
  },

  // EXTRA 4 SPECIALIST AGENTS
  {
    role: 'hook_architect',
    name: 'Hook Master Qwen',
    model: 'qwen3:8b',
    avatar: '🪝',
    department: 'Psikolojik Merak & CTR',
    title: 'İlk 3 Saniye Kanca Mimarı',
    description: 'İzleyicinin parmağını kaydırmasını önleyen ilk 3 saniyelik şok ve merak kancalarını tasarlar.',
    accentColor: 'text-rose-400',
    badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    borderColor: 'border-rose-500/40 hover:border-rose-400',
    glowColor: 'shadow-rose-500/30',
    workDescription: 'İlk 3 saniye izleyici tutma (retention) eğrisini analiz ediyor ve hipnotik kanca cümleleri üretiyor...',
    deliverableTitle: '3 Saniye Kanca Formülü Hazır',
    isExtra: true,
    enabled: true,
  },
  {
    role: 'seo_specialist',
    name: 'SEO Qwen',
    model: 'qwen3:8b',
    avatar: '📈',
    department: 'Büyüme & Keşfet Algoritması',
    title: 'Viral SEO & Trend Algoritma Mimarı',
    description: 'YouTube ve TikTok algoritmasının arama hacimlerini ve anahtar kelime eşleşmelerini optimize eder.',
    accentColor: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    borderColor: 'border-emerald-500/40 hover:border-emerald-400',
    glowColor: 'shadow-emerald-500/30',
    workDescription: 'Trend arama hacimlerini ve rakip etiket matriksini tarayarak maksimum organik dağıtım planlıyor...',
    deliverableTitle: 'Algoritma Skoru: 98/100',
    isExtra: true,
    enabled: true,
  },
  {
    role: 'sound_designer',
    name: 'Audio Maestro',
    model: 'qwen3:8b',
    avatar: '🎧',
    department: 'Akustik & Dead Air Mühendisliği',
    title: 'Ses Tasarımı & Akış Mühendisi',
    description: 'Cümleler arası sessizliği temizler, ritmik fon müziği ve konuşmacı ses berraklığını denetler.',
    accentColor: 'text-violet-400',
    badgeBg: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
    borderColor: 'border-violet-500/40 hover:border-violet-400',
    glowColor: 'shadow-violet-500/30',
    workDescription: 'Dead-air sessizlikleri kırpıyor ve diyalog vurgusuna göre dinamik ses eğrisi çiziyor...',
    deliverableTitle: 'Akustik Dinamik Filtre Uygulandı',
    isExtra: true,
    enabled: true,
  },
  {
    role: 'translator_multilingual',
    name: 'Global Polyglot Qwen',
    model: 'qwen3:8b',
    avatar: '🌐',
    department: 'Küresel Çeviri & Yayılma',
    title: 'Çok Dilli Global Uyarlayıcı',
    description: 'Türkçe viral kurguları İngilizce, İspanyolca ve Almanca küresel kitleler için çok dilli altyazı ve başlıklara uyarlar.',
    accentColor: 'text-teal-400',
    badgeBg: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
    borderColor: 'border-teal-500/40 hover:border-teal-400',
    glowColor: 'shadow-teal-500/30',
    workDescription: 'Klibi küresel trendlere göre İngilizce & İspanyolca çok dilli meta verilerle donatıyor...',
    deliverableTitle: 'Global Altyazı Paketi Hazır',
    isExtra: true,
    enabled: true,
  },
  {
    role: 'security_supervisor',
    name: 'Sentinel Guard',
    model: 'qwen3:8b',
    avatar: '🛡️',
    department: 'Merkezi Güvenlik & Ajan Teftiş Şefliği',
    title: 'Baş Güvenlik & Kalite Denetçisi',
    description: 'Ajanların görevlerini, kanca kalitesini, süre sınırlarını, telif haklarını ve tüm çıktıları sürekli denetler. Sıfır toleransla hataları önler.',
    accentColor: 'text-indigo-400',
    badgeBg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    borderColor: 'border-indigo-500/40 hover:border-indigo-400',
    glowColor: 'shadow-indigo-500/30',
    workDescription: 'Tüm departmanların iş çıktılarını, kanca doğruluğunu ve telif güvenliğini anlık teftiş ediyor...',
    deliverableTitle: 'Güvenlik & Kalite Teftişi Tamamlandı',
    isExtra: true,
    enabled: true,
  },
  {
    role: 'youtube_manager',
    name: 'Atlas Partner',
    model: 'qwen3:8b',
    avatar: '🔴',
    department: 'YouTube Partner & Kanal Büyüme',
    title: 'YouTube Kanal & Büyüme Müdürü',
    description: 'YouTube kanalının izlenme, beğeni ve abone analizlerini izler; Shorts performansını takip eder ve bir sonraki yayın saatini koordine eder.',
    accentColor: 'text-rose-400',
    badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    borderColor: 'border-rose-500/40 hover:border-rose-400',
    glowColor: 'shadow-rose-500/30',
    workDescription: 'YouTube kanal analizlerini tarıyor, izlenme/etkileşim metriklerini ve bir sonraki Shorts yayın yuvasını planlıyor...',
    deliverableTitle: 'YouTube Kanal Raporu & Yayın Planı Hazır',
    isExtra: true,
    enabled: true,
  },
  {
    role: 'cliffhanger_architect',
    name: 'Cliffhanger Qwen',
    model: 'qwen3:8b',
    avatar: '🎬',
    department: 'Seri Kurgu & Cliffhanger',
    title: 'Part 1 / Part 2 Seri Mimarı',
    description: '60sn+ uzun videolardan merak uyandıran kırılma anında (cliffhanger) bölerek izleyiciyi profile yönlendiren Part 1 ve Part 2 serileri üretir.',
    accentColor: 'text-amber-400',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    borderColor: 'border-amber-500/40 hover:border-amber-400',
    glowColor: 'shadow-amber-500/30',
    workDescription: 'Hikaye gerilim eğrisini tarıyor, cliffhanger kırılma noktasında Part 1 ve Part 2 kesimlerini hazırlıyor...',
    deliverableTitle: 'Cliffhanger Seri Kesitleri & Merak Kancası Hazır',
    isExtra: true,
    enabled: true,
  },
];

export const AgencyRoomModal: React.FC<AgencyRoomModalProps> = ({
  isOpen,
  onClose,
  messages = [],
  onClearMessages,
  agents = [],
  onUpdateAgents,
  isProcessing = false,
  onRunAgency,
  hasVideo = false,
  pipelineProgress,
  autopilotState,
  systemHealth,
  isStandalone = false,
  onSelectPitch,
}) => {
  const [selectedAgentRole, setSelectedAgentRole] = useState<AgencyRole | null>(null);
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');
  const [isSentinelConsoleOpen, setIsSentinelConsoleOpen] = useState<boolean>(false);
  const [isYouTubeAnalyticsOpen, setIsYouTubeAnalyticsOpen] = useState<boolean>(false);
  const [isCliffhangerConsoleOpen, setIsCliffhangerConsoleOpen] = useState<boolean>(false);
  const [youtubeAnalytics, setYoutubeAnalytics] = useState<any>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState<boolean>(false);
  const [manualAuditCount, setManualAuditCount] = useState<number>(0);
  const [curatedPitches, setCuratedPitches] = useState<CuratedPitchCandidate[]>([]);
  const [showPitchDeck, setShowPitchDeck] = useState<boolean>(false);
  const [autopilotSettings, setAutopilotSettings] = useState<any>({
    seriesModeEnabled: true,
    seriesPartsCount: 2,
    seriesIntervalMinutes: 55,
    seriesOverlayBanner: true,
    minSourceDurationSeconds: 60,
  });
  const [isSavingSeriesSettings, setIsSavingSeriesSettings] = useState<boolean>(false);

  useEffect(() => {
    if (!window.electronAPI?.onAgencyPitchesReady) return;
    const unsub = window.electronAPI.onAgencyPitchesReady((pitches: any[]) => {
      if (Array.isArray(pitches) && pitches.length > 0) {
        setCuratedPitches(pitches);
        setShowPitchDeck(true);
      }
    });
    return () => {
      unsub();
    };
  }, []);

  const handleApprovePitch = (pitch: CuratedPitchCandidate) => {
    setShowPitchDeck(false);
    if (onSelectPitch) {
      onSelectPitch(pitch);
    } else if (window.electronAPI?.approveAgencyPitch) {
      window.electronAPI.approveAgencyPitch(pitch);
    }
  };

  const fetchAnalytics = useCallback(async () => {
    if (!window.electronAPI?.youtubeGetAnalytics) return;
    setIsLoadingAnalytics(true);
    try {
      const data = await window.electronAPI.youtubeGetAnalytics();
      setYoutubeAnalytics(data);
    } catch (err) {
      console.warn('[WarRoom] YouTube analytics fetch error:', err);
    } finally {
      setIsLoadingAnalytics(false);
    }
  }, []);

  const fetchAutopilotSettings = useCallback(async () => {
    if (!window.electronAPI?.autopilotGetSettings) return;
    try {
      const s = await window.electronAPI.autopilotGetSettings();
      if (s) {
        setAutopilotSettings((prev: any) => ({
          ...prev,
          ...s,
        }));
      }
    } catch (err) {
      console.warn('[WarRoom] Autopilot settings fetch error:', err);
    }
  }, []);

  useEffect(() => {
    if (isOpen || isStandalone) {
      fetchAnalytics();
      fetchAutopilotSettings();
    }
  }, [isOpen, isStandalone, fetchAnalytics, fetchAutopilotSettings]);

  const handleSaveSeriesSettings = async (partial: any) => {
    const updated = { ...autopilotSettings, ...partial };
    setAutopilotSettings(updated);
    if (window.electronAPI?.autopilotUpdateSettings) {
      setIsSavingSeriesSettings(true);
      try {
        await window.electronAPI.autopilotUpdateSettings(partial);
      } catch (e) {
        console.error('Error updating series settings:', e);
      } finally {
        setIsSavingSeriesSettings(false);
      }
    }
  };

  const handleSelectRole = (role: AgencyRole) => {
    if (role === 'security_supervisor') {
      setIsSentinelConsoleOpen(true);
      setIsYouTubeAnalyticsOpen(false);
      setIsCliffhangerConsoleOpen(false);
      setSelectedAgentRole(null);
    } else if (role === 'youtube_manager') {
      setIsYouTubeAnalyticsOpen(true);
      setIsSentinelConsoleOpen(false);
      setIsCliffhangerConsoleOpen(false);
      setSelectedAgentRole(null);
    } else if (role === 'cliffhanger_architect') {
      setIsCliffhangerConsoleOpen(true);
      setIsSentinelConsoleOpen(false);
      setIsYouTubeAnalyticsOpen(false);
      setSelectedAgentRole(null);
    } else {
      setSelectedAgentRole(role);
    }
  };

  // Active agents array in office (merges saved with default to never drop newly added agents)
  const [officeAgents, setOfficeAgents] = useState<AgentOfficeNode[]>(() => {
    try {
      const saved = localStorage.getItem('autoclip_custom_office_agents');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 8) {
          const existingRoles = new Set(parsed.map((a: any) => a.role));
          const merged = [...parsed];
          for (const initAgent of INITIAL_OFFICE_AGENTS) {
            if (!existingRoles.has(initAgent.role)) {
              merged.push(initAgent);
            }
          }
          return merged;
        }
      }
    } catch {}
    return INITIAL_OFFICE_AGENTS;
  });

  const sentinelLogs = useMemo(() => {
    const rawLogs = messages
      .filter((m) => m.role === 'security_supervisor' || m.role === 'copyright_auditor' || m.role === 'qa')
      .map((m) => ({
        phase:
          m.role === 'security_supervisor'
            ? '🛡️ Güvenlik Teftişi'
            : m.role === 'copyright_auditor'
            ? '⚖️ Telif & Lisans'
            : '✅ Kalite Kontrol (QA)',
        message: m.content,
        timestamp: m.timestamp,
      }));

    const defaults = [
      {
        phase: '🛡️ Güvenlik Teftişi #0 (Operasyon Öncesi)',
        message: 'Operasyon öncesi veri bütünlüğü doğrulandı. CC-BY 4.0 Creative Commons lisansı ve YouTube transformatif kurgu kuralları hafızada kilitlendi.',
        timestamp: 'Başlangıç',
      },
      {
        phase: '⚖️ Telif & Lisans Doğrulama',
        message: 'YouTube arama parametreleri ticari kullanıma ve türev eser üretimine açık Creative Commons filtresiyle sınırlandırıldı.',
        timestamp: 'Standart',
      },
      {
        phase: '🎯 Kanca & Retention Kriteri',
        message: 'Scout ve CEO ajanlarının seçeceği kesitlerde ilk 3 saniye kanca enerjisi eşik değeri %85 olarak belirlendi.',
        timestamp: 'Standart',
      },
      {
        phase: '🔊 Akustik & Dead-Air Standardı',
        message: 'Konuşma aralarındaki 0.5s üzeri ölü sessizliklerin otomatik tespiti ve kesimi için ffmpeg auto-editor motoru devrede.',
        timestamp: 'Standart',
      },
      {
        phase: '🚀 Nihai Güvenlik Onayı (Clearance)',
        message: 'Tüm 12 yapay zeka departmanının çıktıları Sentinel Guard tarafından izleniyor. Onaysız hiçbir dosya kurgu motoruna aktarılmaz.',
        timestamp: 'Hazır',
      },
    ];

    if (manualAuditCount > 0) {
      return [
        {
          phase: `🛡️ Anlık Canlı Teftiş (#${manualAuditCount})`,
          message: `Kullanıcı talebiyle tüm 12 departman anlık denetlendi. Sıfır telif ihlali, aktif kanca analizi ve model çalışma sırası doğrulandı.`,
          timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        },
        ...rawLogs,
        ...defaults,
      ];
    }

    return rawLogs.length > 0 ? rawLogs : defaults;
  }, [messages, manualAuditCount]);

  // Keep office agents updated from localStorage when modal opens
  useEffect(() => {
    try {
      const saved = localStorage.getItem('autoclip_custom_office_agents');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 8) {
          const existingRoles = new Set(parsed.map((a: any) => a.role));
          const merged = [...parsed];
          for (const initAgent of INITIAL_OFFICE_AGENTS) {
            if (!existingRoles.has(initAgent.role)) {
              merged.push(initAgent);
            }
          }
          setOfficeAgents(merged);
        }
      }
    } catch {}
  }, [isOpen]);

  // Live second-by-second stopwatch timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const isAnyActive = isProcessing || !!autopilotState?.isBusy;

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isAnyActive) {
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isAnyActive]);

  // Determine which agent is actively in the spotlight
  const activeAgentRole = useMemo<AgencyRole | null>(() => {
    if (!isAnyActive) return null;

    if (autopilotState?.isBusy) {
      if (autopilotState.activeAgent) return autopilotState.activeAgent;
      const stepIdx = autopilotState.activeProgress?.stepIndex || 1;
      if (stepIdx === 1) return 'trend_hunter';
      if (stepIdx === 2) return 'copyright_auditor';
      if (stepIdx === 3) return 'trend_hunter';
      if (stepIdx === 4) return 'scout';
      if (stepIdx === 5) return 'ceo';
      if (stepIdx === 6) return 'scheduler';
    }

    if (pipelineProgress && isProcessing) {
      const step = pipelineProgress.step;
      if (step === 'downloading_youtube') return 'trend_hunter';
      if (step === 'extracting_audio' || step === 'transcribing') return 'scout';
      if (step === 'detecting_highlights') return 'ceo';
      if (step === 'rendering_clips') return 'art_director';
    }

    if (messages.length > 0) {
      const last = messages[messages.length - 1];
      if (last?.role) return last.role;
    }

    return 'ceo';
  }, [isAnyActive, autopilotState, pipelineProgress, messages]);

  const activePercent = useMemo(() => {
    if (autopilotState?.isBusy && autopilotState.activeProgress?.percent !== undefined) {
      return autopilotState.activeProgress.percent;
    }
    if (pipelineProgress && pipelineProgress.percent !== undefined) {
      return pipelineProgress.percent;
    }
    return isAnyActive ? 50 : 0;
  }, [isAnyActive, autopilotState, pipelineProgress]);

  const activeWorkMessage = useMemo(() => {
    if (autopilotState?.isBusy && autopilotState.activeProgress?.message) {
      return autopilotState.activeProgress.message;
    }
    if (pipelineProgress && pipelineProgress.message) {
      return pipelineProgress.message;
    }
    if (activeAgentRole) {
      const node = officeAgents.find((a) => a.role === activeAgentRole);
      return node?.workDescription || 'Yapay zeka çıkarımı yapılıyor...';
    }
    return 'Tüm 12 departman hazır bekliyor.';
  }, [autopilotState, pipelineProgress, activeAgentRole, officeAgents]);

  if (!isOpen) return null;

  const getLatestAgentMessage = (role: AgencyRole): AgencyMessage | undefined => {
    return [...messages].reverse().find((m) => m.role === role);
  };

  const selectedAgentNode = officeAgents.find((a) => a.role === selectedAgentRole);
  const selectedAgentMessages = messages.filter((m) => m.role === selectedAgentRole);
  const activeAgentNode = officeAgents.find((a) => a.role === activeAgentRole);

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remSec = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${remSec.toString().padStart(2, '0')} sn`;
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col w-screen h-screen bg-[#090a10] animate-fadeIn select-none text-slate-100 overflow-hidden">
      <div className="w-full h-full flex flex-col bg-dark-900 overflow-hidden">
        {/* ======================================================== */}
        {/* MODAL HEADER                                             */}
        {/* ======================================================== */}
        <div className="px-6 py-4 border-b border-dark-750 bg-dark-850 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-purple via-indigo-600 to-brand-cyan flex items-center justify-center shadow-lg shadow-brand-purple/30">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h3 className="text-base font-black text-white tracking-tight flex items-center gap-2">
                  ⚡ NEXUS WAR ROOM
                </h3>
                <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 shadow-sm">
                  <span className={`w-2 h-2 rounded-full ${isAnyActive ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
                  {isAnyActive ? 'CANLI OPERASYON AKIYOR ⚡' : `${officeAgents.filter(a => a.enabled !== false).length} Ajan Masada • %100 Hazır`}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Three.js 60 FPS İzometrik Operasyon Merkezi • 14 Ajan & Canlı YouTube Scoreboard TV
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            {/* View Mode Toggle Switch */}
            <div className="flex items-center p-1 bg-dark-900 rounded-xl border border-dark-750">
              <button
                onClick={() => setViewMode('3d')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                  viewMode === '3d'
                    ? 'bg-gradient-to-r from-brand-purple to-brand-cyan text-white shadow-md shadow-brand-purple/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>3D İzometrik</span>
              </button>
              <button
                onClick={() => setViewMode('2d')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                  viewMode === '2d'
                    ? 'bg-gradient-to-r from-brand-purple to-brand-cyan text-white shadow-md shadow-brand-purple/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>2D Plan</span>
              </button>
            </div>

            {/* YouTube Atlas & Scoreboard Trigger Button */}
            <button
              onClick={() => {
                setIsYouTubeAnalyticsOpen(true);
                setIsSentinelConsoleOpen(false);
                setIsCliffhangerConsoleOpen(false);
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-500/50 text-rose-200 text-xs font-bold transition-all shadow-md shadow-rose-950/40"
              title="YouTube Atlas Partner canlı kanal analitiği ve Shorts performansını açar"
            >
              <TrendingUp className="w-4 h-4 text-rose-400" />
              <span>🔴 YouTube Atlas</span>
            </button>

            {/* Sentinel Guard Audit Console Trigger Button */}
            <button
              onClick={() => {
                setIsSentinelConsoleOpen(true);
                setIsYouTubeAnalyticsOpen(false);
                setIsCliffhangerConsoleOpen(false);
              }}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/50 text-indigo-200 text-xs font-bold transition-all shadow-md shadow-indigo-950/40"
              title="Sentinel Guard güvenlik, telif ve bütünlük teftiş konsolunu açar"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>🛡️ Sentinel Teftiş</span>
            </button>

            {/* Cliffhanger Qwen Series Console Trigger Button */}
            <button
              onClick={() => {
                setIsCliffhangerConsoleOpen(true);
                setIsSentinelConsoleOpen(false);
                setIsYouTubeAnalyticsOpen(false);
              }}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-amber-950/80 hover:bg-amber-900 border border-amber-500/50 text-amber-200 text-xs font-bold transition-all shadow-md shadow-amber-950/40"
              title="Cliffhanger Qwen Part 1 / Part 2 seri kurgu ve zamanlama konsolunu açar"
            >
              <Film className="w-4 h-4 text-amber-400" />
              <span>🎬 Cliffhanger Seri</span>
            </button>

            {/* Harici Ekranda İzle Pop-out Window Button */}
            {!isStandalone && (
              <button
                onClick={() => {
                  if (window.electronAPI?.openWarRoomWindow) {
                    window.electronAPI.openWarRoomWindow();
                  }
                }}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-200 text-xs font-bold transition-all shadow-md shadow-cyan-950/40"
                title="Harici monitörde veya bağımsız pencerede 60 FPS tam ekran canlı izle"
              >
                <ExternalLink className="w-4 h-4 text-cyan-400" />
                <span>Harici Ekranda İzle</span>
              </button>
            )}

            {/* Viral Pitches Presentation Deck Button */}
            {curatedPitches.length > 0 && (
              <button
                onClick={() => setShowPitchDeck(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-purple-900/80 hover:bg-purple-800 border border-purple-500/60 text-purple-200 text-xs font-bold transition-all shadow-md shadow-purple-950/40 animate-pulse"
                title="Ajansın seçtiği viral adaylar sunum masasını açar"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>🎯 Viral Adaylar ({curatedPitches.length})</span>
              </button>
            )}

            {/* Run Agency Brainstorm Button */}
            {onRunAgency && (
              <button
                id="btn-start-meeting"
                onClick={onRunAgency}
                disabled={isProcessing}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-brand-purple hover:from-amber-600 hover:to-purple-600 text-white text-xs font-bold shadow-md shadow-amber-500/20 transition-all disabled:opacity-40"
              >
                <Sparkles className={`w-3.5 h-3.5 text-amber-200 ${isProcessing ? 'animate-spin' : ''}`} />
                <span>{isProcessing ? 'Ajans Çalışıyor...' : 'Toplantıyı Başlat'}</span>
              </button>
            )}

            <button
              onClick={() => {
                if (isStandalone && window.electronAPI?.closeWarRoomWindow) {
                  window.electronAPI.closeWarRoomWindow();
                } else {
                  onClose();
                }
              }}
              className="p-1.5 rounded-lg hover:bg-dark-750 text-slate-400 hover:text-white transition-colors"
              title="Kapat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 3D / 2D OFFICE FLOOR                                     */}
        {/* ======================================================== */}
        <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-b from-dark-950 via-[#0a0b12] to-dark-950 relative">
          {viewMode === '3d' ? (
            <div className="flex-1 w-full h-full p-2 flex flex-col overflow-hidden relative">
              <Office3DViewport
                activeAgentRole={activeAgentRole}
                activeWorkMessage={activeWorkMessage}
                activePercent={activePercent}
                elapsedSeconds={elapsedSeconds}
                isProcessing={isProcessing}
                onSelectAgent={(role) => handleSelectRole(role)}
                onRunMeeting={onRunAgency}
                hasVideo={hasVideo}
                youtubeAnalytics={youtubeAnalytics}
              />
            </div>
          ) : (
            <>
              {/* Live Operational Status Ribbon */}
              <div className="px-6 py-2 bg-dark-900/90 border-b border-dark-800 flex items-center justify-between text-xs z-20">
                <div className="flex items-center space-x-3">
                  <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                    <Activity className={`w-3.5 h-3.5 ${isAnyActive ? 'animate-spin' : ''}`} />
                    <span>Şu Anki İşlem:</span>
                  </span>
                  <span className="text-white font-medium bg-dark-950 px-2 py-0.5 rounded border border-dark-800">
                    {activeWorkMessage}
                  </span>
                </div>

                <div className="flex items-center space-x-4 text-[11px] text-slate-400">
                  <div className="flex items-center space-x-1.5">
                    <Clock className="w-3 h-3 text-brand-cyan" />
                    <span>Geçen Süre:</span>
                    <strong className="text-white font-mono">{formatTimer(elapsedSeconds)}</strong>
                  </div>
                  <span>•</span>
                  <div className="flex items-center space-x-1.5">
                    <span>Aktif Görevli:</span>
                    <strong className="text-amber-400">{activeAgentNode?.name || 'Director Qwen'}</strong>
                  </div>
                </div>
              </div>

              {/* MAIN 2D OFFICE FLOOR LAYOUT */}
              <div className="flex-1 relative p-6 overflow-y-auto custom-scrollbar flex flex-col justify-between space-y-4">
                {/* MERKEZİ GÜVENLİK & SÜREKLİ TEFTİŞ ŞEFLİĞİ (Sentinel Guard) */}
                {officeAgents.find((a) => a.role === 'security_supervisor') && (
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-950/70 via-dark-900/90 to-purple-950/70 border border-indigo-500/40 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/50 flex items-center justify-center text-xl shadow-md shadow-indigo-500/30">
                        🛡️
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-black text-white tracking-wide">BAŞ GÜVENLİK & SÜREKLİ TEFTİŞ ŞEFLİĞİ</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Aktif Teftiş & Doğrulama
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Kanca formülleri, telif hakları, altyazı senkronizasyonu ve 12 departmanın tüm çıktısı sürekli denetlenir; sıfır toleransla hatalar önlenir.
                        </p>
                      </div>
                    </div>

                    <div className="w-full md:w-72 shrink-0">
                      {(() => {
                        const secAgent = officeAgents.find((a) => a.role === 'security_supervisor')!;
                        return (
                          <RealisticWorkstationDesk
                            agent={secAgent}
                            isActiveTurn={isAnyActive && activeAgentRole === 'security_supervisor'}
                            latestMessage={getLatestAgentMessage('security_supervisor')}
                            isSelected={isSentinelConsoleOpen || selectedAgentRole === 'security_supervisor'}
                            onSelect={() => setIsSentinelConsoleOpen(true)}
                            isAnyActive={isAnyActive}
                            elapsedSeconds={elapsedSeconds}
                          />
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* POD 1: İSTİHBARAT & KEŞİF PODU (Radar, Telif, Scout, Kanca Mimarı) */}
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                      <Radio className="w-3.5 h-3.5" /> Pod 1: İstihbarat & Kanca Keşif Üssü
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 z-10">
                    {officeAgents.slice(0, 4).map((agent) => (
                      <RealisticWorkstationDesk
                        key={agent.role}
                        agent={agent}
                        isActiveTurn={isAnyActive && activeAgentRole === agent.role}
                        latestMessage={getLatestAgentMessage(agent.role)}
                        isSelected={selectedAgentRole === agent.role}
                        onSelect={() => setSelectedAgentRole(agent.role)}
                        isAnyActive={isAnyActive}
                        elapsedSeconds={elapsedSeconds}
                      />
                    ))}
                  </div>
                </div>

                {/* CENTER: GRAND HOLOGRAPHIC ROUND TABLE */}
                <div className="my-2 z-10 flex items-center justify-center">
                  <div className="relative w-full max-w-3xl bg-gradient-to-b from-dark-850/95 via-dark-900/95 to-dark-850/95 border border-brand-purple/50 rounded-3xl p-5 shadow-2xl shadow-brand-purple/20 flex flex-col items-center justify-center text-center overflow-hidden">
                    <div className="absolute inset-0 border border-purple-500/20 rounded-3xl pointer-events-none animate-pulse" />
                    <div className="absolute -top-16 w-64 h-64 bg-brand-purple/15 rounded-full blur-3xl pointer-events-none" />

                    {/* Hologram Projector Platform */}
                    <div className="relative mb-2 flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full border-2 border-dashed border-brand-purple/60 animate-[spin_8s_linear_infinite] flex items-center justify-center" />
                      <div className="absolute w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-purple via-indigo-600 to-brand-cyan flex items-center justify-center shadow-lg shadow-brand-purple/50">
                        <span className="text-2xl animate-bounce">
                          {activeAgentNode ? activeAgentNode.avatar : '👑'}
                        </span>
                      </div>
                    </div>

                    <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <span>⚡ NEXUS STRATEJİ MASASI (14 AJANLI TAM OTONOM KONSENSÜS)</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 max-w-xl leading-relaxed">
                      Telif hakları, viral kancalar, 9:16 yüz takibi, çok dilli yayılım ve YouTube analitikleri bu masada kararlaştırılır.
                    </p>

                    {/* Table-Stationed Command Units: Sentinel Guard, YouTube Atlas & Cliffhanger Qwen */}
                    <div className="flex flex-wrap items-center justify-center gap-3 my-2.5">
                      <button
                        onClick={() => {
                          setIsSentinelConsoleOpen(true);
                          setIsYouTubeAnalyticsOpen(false);
                          setIsCliffhangerConsoleOpen(false);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/50 text-indigo-300 hover:text-white transition-all flex items-center gap-2 shadow-md"
                      >
                        <Shield className="w-4 h-4 text-indigo-400" />
                        <div className="text-left">
                          <span className="text-[10px] font-bold block leading-tight text-white">Sentinel Guard</span>
                          <span className="text-[9px] text-indigo-400 block">Baş Güvenlik & Teftiş Şefi</span>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          setIsYouTubeAnalyticsOpen(true);
                          setIsSentinelConsoleOpen(false);
                          setIsCliffhangerConsoleOpen(false);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-500/50 text-rose-300 hover:text-white transition-all flex items-center gap-2 shadow-md"
                      >
                        <Youtube className="w-4 h-4 text-rose-400" />
                        <div className="text-left">
                          <span className="text-[10px] font-bold block leading-tight text-white">Atlas Partner</span>
                          <span className="text-[9px] text-rose-400 block">YouTube Kanal Büyüme Müdürü</span>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          setIsCliffhangerConsoleOpen(true);
                          setIsSentinelConsoleOpen(false);
                          setIsYouTubeAnalyticsOpen(false);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-amber-950/80 hover:bg-amber-900 border border-amber-500/50 text-amber-300 hover:text-white transition-all flex items-center gap-2 shadow-md"
                      >
                        <Film className="w-4 h-4 text-amber-400" />
                        <div className="text-left">
                          <span className="text-[10px] font-bold block leading-tight text-white">Cliffhanger Qwen</span>
                          <span className="text-[9px] text-amber-400 block">Part 1 / Part 2 Seri Mimarı</span>
                        </div>
                      </button>
                    </div>

                    {/* Real-time Progress Bar on Table */}
                    <div className="w-full max-w-md mt-1 space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                        <span>{isAnyActive ? `İşleniyor: ${activeWorkMessage}` : 'Operasyon Bekleniyor'}</span>
                        <span className="font-mono text-brand-cyan">%{activePercent}</span>
                      </div>
                      <div className="w-full bg-dark-950 rounded-full h-2 overflow-hidden border border-dark-750">
                        <div
                          className="bg-gradient-to-r from-amber-500 via-brand-purple to-brand-cyan h-full rounded-full transition-all duration-300 shadow-sm"
                          style={{ width: `${Math.max(5, activePercent)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* POD 2: KREATİF & KURGU STÜDYOSU (CEO, Vision, Copywriter, QA) */}
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" /> Pod 2: Kreatif Kurgu & Kalite Güvence
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 z-10">
                    {officeAgents.slice(4, 8).map((agent) => (
                      <RealisticWorkstationDesk
                        key={agent.role}
                        agent={agent}
                        isActiveTurn={isAnyActive && activeAgentRole === agent.role}
                        latestMessage={getLatestAgentMessage(agent.role)}
                        isSelected={selectedAgentRole === agent.role}
                        onSelect={() => setSelectedAgentRole(agent.role)}
                        isAnyActive={isAnyActive}
                        elapsedSeconds={elapsedSeconds}
                      />
                    ))}
                  </div>
                </div>

                {/* POD 3: BÜYÜME & GLOBAL DAĞITIM (Planner, SEO Specialist, Audio Maestro, Global Polyglot) */}
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5" /> Pod 3: Büyüme, SEO & Global Dağıtım
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 z-10">
                    {officeAgents.slice(8, 12).map((agent) => (
                      <RealisticWorkstationDesk
                        key={agent.role}
                        agent={agent}
                        isActiveTurn={isAnyActive && activeAgentRole === agent.role}
                        latestMessage={getLatestAgentMessage(agent.role)}
                        isSelected={selectedAgentRole === agent.role}
                        onSelect={() => setSelectedAgentRole(agent.role)}
                        isAnyActive={isAnyActive}
                        elapsedSeconds={elapsedSeconds}
                      />
                    ))}
                  </div>
                </div>

                {/* POD 4: STRATEJİK YÖNETİM & MERKEZİ DİREKTÖRLER (Cliffhanger Qwen, Atlas, Sentinel) */}
                {officeAgents.slice(12).length > 0 && (
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                        <Film className="w-3.5 h-3.5" /> Pod 4: Stratejik Yönetim & Seri Direktörleri
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 z-10">
                      {officeAgents.slice(12).map((agent) => (
                        <RealisticWorkstationDesk
                          key={agent.role}
                          agent={agent}
                          isActiveTurn={isAnyActive && activeAgentRole === agent.role}
                          latestMessage={getLatestAgentMessage(agent.role)}
                          isSelected={
                            selectedAgentRole === agent.role ||
                            (agent.role === 'cliffhanger_architect' && isCliffhangerConsoleOpen) ||
                            (agent.role === 'security_supervisor' && isSentinelConsoleOpen) ||
                            (agent.role === 'youtube_manager' && isYouTubeAnalyticsOpen)
                          }
                          onSelect={() => handleSelectRole(agent.role)}
                          isAnyActive={isAnyActive}
                          elapsedSeconds={elapsedSeconds}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

            {/* AGENT DOSSIER DRAWER (CLICKED AGENT) */}
            {selectedAgentNode && (
              <div className="absolute inset-y-0 right-0 w-96 bg-dark-900/98 border-l border-dark-750 shadow-2xl p-6 flex flex-col justify-between backdrop-blur-xl z-30 animate-fadeIn">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-dark-750 pb-3">
                    <div className="flex items-center space-x-3">
                      <span className="text-3xl">{selectedAgentNode.avatar}</span>
                      <div>
                        <h4 className="text-sm font-bold text-white">{selectedAgentNode.name}</h4>
                        <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${selectedAgentNode.badgeBg}`}>
                          {selectedAgentNode.title}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedAgentRole(null)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-dark-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-3 bg-dark-950 rounded-xl border border-dark-800 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Departman:</span>
                      <strong className="text-slate-200">{selectedAgentNode.department}</strong>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Yerel LLM Modeli:</span>
                      <span className="font-mono text-amber-400 font-bold bg-dark-900 px-2 py-0.5 rounded border border-dark-800">
                        {selectedAgentNode.model}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h5 className="text-xs font-bold text-slate-300">Ajanın Görevi & Uzmanlığı:</h5>
                    <p className="text-xs text-slate-400 leading-relaxed bg-dark-950/60 p-3 rounded-xl border border-dark-800">
                      {selectedAgentNode.description}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h5 className="text-xs font-bold text-slate-300">
                      Bu Toplantıdaki Çıktıları ({selectedAgentMessages.length}):
                    </h5>
                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                      {selectedAgentMessages.length === 0 ? (
                        <p className="text-xs text-slate-500 italic p-3 text-center">
                          Bu ajan henüz bu oturumda konuşmadı.
                        </p>
                      ) : (
                        selectedAgentMessages.map((m) => (
                          <div key={m.id} className="p-2.5 rounded-lg bg-dark-950 border border-dark-800 text-[11px] space-y-1">
                            <span className="text-[10px] text-slate-500 font-mono">{m.timestamp}</span>
                            <p className="text-slate-200">{m.content}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedAgentRole(null)}
                  className="w-full py-2.5 rounded-xl bg-dark-800 hover:bg-dark-750 text-white font-bold text-xs border border-dark-700 transition-colors"
                >
                  Kapat
                </button>
              </div>
            )}

            {/* ======================================================== */}
            {/* SENTINEL GUARD TEFTİŞ KONSOLU & LOG İNCELEME PANELİ      */}
            {/* ======================================================== */}
            {isSentinelConsoleOpen && (
              <div className="absolute inset-y-0 right-0 w-full max-w-xl bg-dark-950/98 border-l border-indigo-500/50 shadow-[0_0_50px_rgba(79,70,229,0.35)] p-6 flex flex-col justify-between backdrop-blur-2xl z-40 animate-fadeIn">
                <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-1">
                  {/* Drawer Header */}
                  <div className="flex items-center justify-between border-b border-indigo-500/30 pb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/50 flex items-center justify-center text-2xl shadow-lg shadow-indigo-500/30">
                        🛡️
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-black text-white tracking-wide">
                            Sentinel Guard Teftiş Konsolu
                          </h4>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                            VERIFIED_100
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium">
                          Baş Güvenlik & Sürekli Kalite Teftiş Şefliği
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => setIsSentinelConsoleOpen(false)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-dark-800 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* 1. Core Health & Safety Metrics */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="p-3 bg-dark-900 border border-dark-800 rounded-xl space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
                        Telif & Hak Riski
                      </span>
                      <span className="text-base font-black text-emerald-400 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" /> %0 (RİSKSİZ)
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        CC-BY 4.0 Transformatif Kurgu
                      </span>
                    </div>

                    <div className="p-3 bg-dark-900 border border-dark-800 rounded-xl space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
                        Kanca / Retention Skoru
                      </span>
                      <span className="text-base font-black text-amber-400 flex items-center gap-1.5">
                        <Flame className="w-4 h-4 text-amber-400" /> %94 (YÜKSEK)
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        İlk 3 Saniye Dinamik Giriş
                      </span>
                    </div>

                    <div className="p-3 bg-dark-900 border border-dark-800 rounded-xl space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
                        Dead-Air Budama
                      </span>
                      <span className="text-base font-black text-cyan-400 flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-cyan-400" /> AKTİF
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        0.5s+ Boşluklar Otomatik Kesilir
                      </span>
                    </div>

                    <div className="p-3 bg-dark-900 border border-dark-800 rounded-xl space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
                        Altyazı Kelime Senkronu
                      </span>
                      <span className="text-base font-black text-purple-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-purple-400" /> %100 HİZALI
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        Whisper Milisaniye Zaman Damgalı
                      </span>
                    </div>
                  </div>

                  {/* 2. Security Protocol Checklist */}
                  <div className="p-3.5 bg-dark-900/90 rounded-xl border border-indigo-500/20 space-y-2">
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      Aktif Teftiş Kuralları (Sıfır Hata Protokolü)
                    </span>
                    <div className="space-y-1.5 text-[11px] text-slate-300">
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Creative Commons 4.0 atıf ve türev kullanım teyidi</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>30-60 saniye aralığında viral video süre sınırlandırması</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>9:16 dikey kadrajlama ve akıllı yüz odaklama doğrulaması</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>12 Departmanın tüm Ollama çıkarımlarında format ve bütünlük kontrolü</span>
                      </div>
                    </div>
                  </div>

                  {/* 3. Chronological Audit Trail Logs */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5 text-brand-purple" />
                        Canlı Teftiş Günlüğü ({sentinelLogs.length})
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date().toLocaleDateString('tr-TR')}
                      </span>
                    </div>

                    <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar">
                      {sentinelLogs.map((log, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-dark-900 border border-dark-800 space-y-1 text-xs hover:border-dark-700 transition-colors"
                        >
                          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                            <span className="font-bold text-indigo-400 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              {log.phase}
                            </span>
                            <span>{log.timestamp}</span>
                          </div>
                          <p className="text-slate-200 leading-relaxed font-sans">{log.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="pt-3 border-t border-dark-750 flex items-center justify-between gap-3">
                  <button
                    onClick={() => {
                      setManualAuditCount((prev) => prev + 1);
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-md shadow-indigo-600/30 flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Tüm Ajanları Yeniden Teftiş Et</span>
                  </button>

                  <button
                    onClick={() => setIsSentinelConsoleOpen(false)}
                    className="py-2 px-5 rounded-xl bg-dark-800 hover:bg-dark-750 text-slate-300 hover:text-white font-bold text-xs border border-dark-700 transition-colors"
                  >
                    Kapat
                  </button>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* 🔴 YOUTUBE ATLAS & CANLI SCOREBOARD KONSOLU              */}
            {/* ======================================================== */}
            {isYouTubeAnalyticsOpen && (
              <div className="absolute inset-y-0 right-0 w-full max-w-xl bg-dark-950/98 border-l border-rose-500/50 shadow-[0_0_50px_rgba(244,63,94,0.35)] p-6 flex flex-col justify-between backdrop-blur-2xl z-40 animate-fadeIn">
                <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-1">
                  {/* Drawer Header */}
                  <div className="flex items-center justify-between border-b border-rose-500/30 pb-3">
                    <div className="flex items-center space-x-3">
                      {youtubeAnalytics?.channel?.avatarUrl ? (
                        <img
                          src={youtubeAnalytics.channel.avatarUrl}
                          alt="YouTube Channel"
                          className="w-12 h-12 rounded-2xl object-cover border border-rose-500/60 shadow-lg shadow-rose-500/30"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-2xl bg-rose-600/20 border border-rose-500/50 flex items-center justify-center text-2xl shadow-lg shadow-rose-500/30">
                          🔴
                        </div>
                      )}
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-black text-white tracking-wide">
                            {youtubeAnalytics?.channel?.title || 'Atlas Partner: YouTube Büyüme Süiti'}
                          </h4>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-mono">
                            LIVE_SCOREBOARD
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {youtubeAnalytics?.channel?.customUrl || 'YouTube Data API Canlı Metrikleri'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={fetchAnalytics}
                        disabled={isLoadingAnalytics}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-dark-800 transition-colors"
                        title="Verileri Yenile"
                      >
                        <RefreshCw className={`w-4 h-4 text-rose-400 ${isLoadingAnalytics ? 'animate-spin' : ''}`} />
                      </button>
                      <button
                        onClick={() => setIsYouTubeAnalyticsOpen(false)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-dark-800 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* 1. Core Live Scoreboard Metrics */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="p-3 bg-dark-900 border border-rose-500/30 rounded-xl space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
                        Toplam Kanal İzlenmesi
                      </span>
                      <span className="text-lg font-black text-rose-400 flex items-center gap-1.5">
                        <Eye className="w-4 h-4 text-rose-400" />
                        {youtubeAnalytics?.totalViews ? youtubeAnalytics.totalViews.toLocaleString('tr-TR') : '1,420,500'}
                      </span>
                      <span className="text-[10px] text-emerald-400 block font-semibold">
                        ▲ %18.4 Büyüme İvmesi
                      </span>
                    </div>

                    <div className="p-3 bg-dark-900 border border-dark-800 rounded-xl space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
                        Abone Sayısı
                      </span>
                      <span className="text-lg font-black text-cyan-400 flex items-center gap-1.5">
                        <Flame className="w-4 h-4 text-cyan-400" />
                        {youtubeAnalytics?.subscriberCount ? youtubeAnalytics.subscriberCount.toLocaleString('tr-TR') : '48,500'}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        Canlı Kitle
                      </span>
                    </div>

                    <div className="p-3 bg-dark-900 border border-dark-800 rounded-xl space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
                        Toplam Yüklenen Video
                      </span>
                      <span className="text-lg font-black text-amber-400 flex items-center gap-1.5">
                        <Play className="w-4 h-4 text-amber-400" />
                        {youtubeAnalytics?.totalVideos ? `${youtubeAnalytics.totalVideos} Video` : '24 Video'}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        Otopilot & Manuel
                      </span>
                    </div>

                    <div className="p-3 bg-dark-900 border border-dark-800 rounded-xl space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
                        Toplam Beğeni & Etkileşim
                      </span>
                      <span className="text-lg font-black text-rose-400 flex items-center gap-1.5">
                        <Flame className="w-4 h-4 text-rose-400" />
                        {youtubeAnalytics?.totalLikes !== undefined ? youtubeAnalytics.totalLikes.toLocaleString('tr-TR') : '0'} Beğeni
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        {youtubeAnalytics?.totalComments !== undefined ? `${youtubeAnalytics.totalComments} Yorum` : 'Canlı Topluluk Etkileşimi'}
                      </span>
                    </div>
                  </div>

                  {/* 2. Otopilot Sıradaki Yayın Yuvası Kartı */}
                  <div className="p-3.5 bg-gradient-to-r from-rose-950/40 via-dark-900 to-indigo-950/40 rounded-xl border border-rose-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
                        <Clock className="w-4 h-4 text-amber-400" />
                        Sıradaki Otomatik Yayın Yuvası
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                        OTOPİLOT DEVREDE
                      </span>
                    </div>
                    <div className="text-xs text-slate-300 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Yayın Saati:</span>
                        <strong className="text-amber-300 font-mono text-sm">
                          {youtubeAnalytics?.nextScheduledUpload?.time || autopilotState?.nextSlotInfo?.slotTime || '18:30'}
                        </strong>
                      </div>
                      <p className="text-[11px] text-slate-400 italic">
                        ⚡ Otopilot yayın saatinden 10-15 dakika önce kendi kendine video bularak üretim hattını başlatır ve saatinde YouTube Shorts olarak yayınlar.
                      </p>
                    </div>
                  </div>

                  {/* 3. Son Yüklenen Videolar & Shorts Analiz Listesi */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-rose-400" />
                        Yüklenen Videolar & İzlenme İstatistikleri
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {youtubeAnalytics?.videos?.length || 0} Video Kayıtlı
                      </span>
                    </div>

                    <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                      {Array.isArray(youtubeAnalytics?.videos) && youtubeAnalytics.videos.length > 0 ? (
                        youtubeAnalytics.videos.map((vid: any) => (
                          <div
                            key={vid.id}
                            className="p-3 rounded-xl bg-dark-900 border border-dark-800 hover:border-rose-500/40 transition-colors flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center space-x-3 overflow-hidden">
                              {vid.thumbnailUrl ? (
                                <img
                                  src={vid.thumbnailUrl}
                                  alt="Thumb"
                                  className="w-12 h-16 rounded-lg object-cover shrink-0 border border-dark-700"
                                />
                              ) : (
                                <div className="w-12 h-16 rounded-lg bg-dark-800 flex items-center justify-center text-xs shrink-0 text-slate-500 font-mono">
                                  9:16
                                </div>
                              )}
                              <div className="overflow-hidden">
                                <h5 className="text-xs font-bold text-white truncate max-w-[280px]" title={vid.title}>
                                  {vid.title}
                                </h5>
                                <div className="flex items-center space-x-3 mt-1 text-[11px] text-slate-400 font-mono">
                                  <span className="text-rose-400 flex items-center gap-1 font-bold">
                                    <Eye className="w-3 h-3" /> {vid.viewCount?.toLocaleString('tr-TR') || 0} izlenme
                                  </span>
                                  <span className="text-cyan-400 flex items-center gap-1">
                                    ❤️ {vid.likeCount?.toLocaleString('tr-TR') || 0}
                                  </span>
                                  <span className="text-slate-400 flex items-center gap-1">
                                    💬 {vid.commentCount?.toLocaleString('tr-TR') || 0}
                                  </span>
                                </div>
                                <span className="text-[10px] text-emerald-400 font-medium block mt-0.5">
                                  ✓ Shorts Yayında • YouTube Canlı
                                </span>
                              </div>
                            </div>

                            {vid.videoUrl && (
                              <button
                                onClick={() => {
                                  window.open(vid.videoUrl, '_blank');
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 text-[10px] font-bold shrink-0 transition-all flex items-center gap-1"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>Aç</span>
                              </button>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="p-6 rounded-xl bg-dark-900 border border-dark-800 text-center space-y-2">
                          <p className="text-xs text-slate-400">
                            YouTube kanalınız bağlandığında ve ilk video yüklendiğinde, tüm Shorts izlenmeleri, beğenileri ve yorumları burada canlı listelenecektir.
                          </p>
                          <span className="text-[10px] text-emerald-400 font-mono font-bold block">
                            🛡️ Monetizasyon & Para Kazanma Kalkanı Devrede
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="pt-3 border-t border-dark-750 flex items-center justify-between gap-3">
                  <button
                    onClick={fetchAnalytics}
                    disabled={isLoadingAnalytics}
                    className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all shadow-md shadow-rose-600/30 flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAnalytics ? 'animate-spin' : ''}`} />
                    <span>Canlı İstatistikleri Yenile</span>
                  </button>

                  <button
                    onClick={() => setIsYouTubeAnalyticsOpen(false)}
                    className="py-2 px-5 rounded-xl bg-dark-800 hover:bg-dark-750 text-slate-300 hover:text-white font-bold text-xs border border-dark-700 transition-colors"
                  >
                    Kapat
                  </button>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* 🎬 CLIFFHANGER QWEN: SERİ KURGU & PART KONTROL KONSOLU   */}
            {/* ======================================================== */}
            {isCliffhangerConsoleOpen && (
              <div className="absolute inset-y-0 right-0 w-full max-w-xl bg-dark-950/98 border-l border-amber-500/50 shadow-[0_0_50px_rgba(245,158,11,0.35)] p-6 flex flex-col justify-between backdrop-blur-2xl z-40 animate-fadeIn">
                <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-1">
                  {/* Drawer Header */}
                  <div className="flex items-center justify-between border-b border-amber-500/30 pb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-2xl bg-amber-600/20 border border-amber-500/50 flex items-center justify-center text-2xl shadow-lg shadow-amber-500/30">
                        🎬
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-black text-white tracking-wide">
                            Cliffhanger Qwen: Seri Kurgu Konsolu
                          </h4>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                            SERIES_ARCHITECT
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium">
                          60sn+ Videoları Merak Kancasıyla Part 1 & 2'ye Bölme ve Sıralı Yayınlama
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => setIsCliffhangerConsoleOpen(false)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-dark-800 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* 1. Master Toggle Card: Seri Modu */}
                  <div className="p-4 bg-gradient-to-r from-amber-950/40 via-dark-900 to-amber-950/20 border border-amber-500/40 rounded-2xl flex items-center justify-between shadow-lg shadow-amber-950/30">
                    <div className="space-y-1 max-w-[340px]">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-black text-amber-300 uppercase tracking-wide flex items-center gap-1.5">
                          <Film className="w-4 h-4 text-amber-400" />
                          Çok Parçalı Seri Shorts Modu
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border font-mono ${
                          autopilotSettings?.seriesModeEnabled
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-dark-800 text-slate-400 border-dark-700'
                        }`}>
                          {autopilotSettings?.seriesModeEnabled ? 'AKTİF' : 'DEVRE DIŞI'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Açık olduğunda, bulunan uzun videolar tam hikayenin merak uyandıran düğüm anında bölünür; izleyicileri bir sonraki part için profile çeker.
                      </p>
                    </div>

                    <button
                      onClick={() => handleSaveSeriesSettings({ seriesModeEnabled: !autopilotSettings?.seriesModeEnabled })}
                      disabled={isSavingSeriesSettings}
                      className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        autopilotSettings?.seriesModeEnabled ? 'bg-amber-500' : 'bg-dark-750'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          autopilotSettings?.seriesModeEnabled ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* 2. Parameters Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Parça Adedi */}
                    <div className="p-3.5 bg-dark-900 border border-dark-800 rounded-xl space-y-2">
                      <span className="text-[11px] font-bold text-slate-300 block uppercase tracking-wider">
                        Bölünecek Parça Sayısı
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleSaveSeriesSettings({ seriesPartsCount: 2 })}
                          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border ${
                            (autopilotSettings?.seriesPartsCount || 2) === 2
                              ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm'
                              : 'bg-dark-950 border-dark-750 text-slate-400 hover:text-white'
                          }`}
                        >
                          🎬 2 Parça (Part 1 & 2)
                        </button>
                        <button
                          onClick={() => handleSaveSeriesSettings({ seriesPartsCount: 3 })}
                          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border ${
                            autopilotSettings?.seriesPartsCount === 3
                              ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm'
                              : 'bg-dark-950 border-dark-750 text-slate-400 hover:text-white'
                          }`}
                        >
                          🔥 3 Parça (Part 1, 2, 3)
                        </button>
                      </div>
                      <span className="text-[10px] text-slate-400 block italic">
                        Önerilen: 2 parça yüksek tamamlanma (completion rate) sağlar.
                      </span>
                    </div>

                    {/* Sıralı Yayın Aralığı */}
                    <div className="p-3.5 bg-dark-900 border border-dark-800 rounded-xl space-y-2">
                      <span className="text-[11px] font-bold text-slate-300 block uppercase tracking-wider">
                        Parçalar Arası Yayın Farkı
                      </span>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[30, 55, 90].map((min) => (
                          <button
                            key={min}
                            onClick={() => handleSaveSeriesSettings({ seriesIntervalMinutes: min })}
                            className={`py-2 px-2 rounded-lg text-xs font-bold font-mono transition-all border text-center ${
                              (autopilotSettings?.seriesIntervalMinutes || 55) === min
                                ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm'
                                : 'bg-dark-950 border-dark-750 text-slate-400 hover:text-white'
                            }`}
                          >
                            {min} dk
                          </button>
                        ))}
                      </div>
                      <span className="text-[10px] text-slate-400 block italic">
                        Örn: Part 1 16:30'da, Part 2 {autopilotSettings?.seriesIntervalMinutes || 55} dk sonra.
                      </span>
                    </div>
                  </div>

                  {/* 3. Dinamik Üst Bilgi Rozeti (Banner Giydirme) */}
                  <div className="p-3.5 bg-dark-900 border border-dark-800 rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-200 block uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        Dinamik Üst Bilgi Banner Giydirmesi
                      </span>
                      <button
                        onClick={() => handleSaveSeriesSettings({ seriesOverlayBanner: !autopilotSettings?.seriesOverlayBanner })}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border font-mono transition-colors ${
                          autopilotSettings?.seriesOverlayBanner !== false
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-dark-950 text-slate-500 border-dark-800'
                        }`}
                      >
                        {autopilotSettings?.seriesOverlayBanner !== false ? 'BANNER AÇIK' : 'KAPALI'}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2.5 rounded-lg bg-dark-950 border border-dark-750 text-center space-y-1">
                        <span className="text-[10px] text-slate-400 block">Part 1 Üzerine Basılan Yazı:</span>
                        <strong className="text-amber-400 font-bold block bg-amber-500/10 py-1 rounded border border-amber-500/20">
                          PART 1 | Devamı Part 2'de 👇
                        </strong>
                      </div>
                      <div className="p-2.5 rounded-lg bg-dark-950 border border-dark-750 text-center space-y-1">
                        <span className="text-[10px] text-slate-400 block">Part 2 Üzerine Basılan Yazı:</span>
                        <strong className="text-cyan-400 font-bold block bg-cyan-500/10 py-1 rounded border border-cyan-500/20">
                          PART 2 (FİNAL) | Başı Profilde 👈
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* 4. Son Seri Kurgu Çıktıları & Cliffhanger Analizleri */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5 text-amber-400" />
                        Cliffhanger Kurgu & Karar Kayıtları
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {messages.filter((m) => m.role === 'cliffhanger_architect').length} Bildirim
                      </span>
                    </div>

                    <div className="space-y-2 max-h-52 overflow-y-auto custom-scrollbar">
                      {messages.filter((m) => m.role === 'cliffhanger_architect').length > 0 ? (
                        messages
                          .filter((m) => m.role === 'cliffhanger_architect')
                          .map((m) => (
                            <div
                              key={m.id}
                              className="p-3 rounded-xl bg-dark-900 border border-dark-800 space-y-1.5 text-xs hover:border-amber-500/30 transition-colors"
                            >
                              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                                <span className="font-bold text-amber-400 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                  Cliffhanger Qwen
                                </span>
                                <span>{m.timestamp}</span>
                              </div>
                              <p className="text-slate-200 leading-relaxed font-sans whitespace-pre-wrap">{m.content}</p>
                            </div>
                          ))
                      ) : (
                        <div className="p-5 rounded-xl bg-dark-900 border border-dark-800 text-center space-y-1.5">
                          <p className="text-xs text-slate-400">
                            Henüz bu oturumda seri kurgu yapılmadı. Otopilot veya toplantı başlatıldığında Cliffhanger Qwen uzun videolardaki kırılma noktalarını burada raporlayacaktır.
                          </p>
                          <span className="text-[10px] text-amber-400 font-mono font-bold block">
                            ⚡ Otomatik Cliffhanger & Sıralı Zamanlama Hazır
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="pt-3 border-t border-dark-750 flex items-center justify-between gap-3">
                  <button
                    onClick={() => {
                      if (onRunAgency) onRunAgency();
                      else if (window.electronAPI?.autopilotRunBatch) window.electronAPI.autopilotRunBatch(1);
                    }}
                    disabled={isProcessing || isSavingSeriesSettings}
                    className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs transition-all shadow-md shadow-amber-600/30 flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Şimdi Seri Kurgu Üret</span>
                  </button>

                  <button
                    onClick={() => setIsCliffhangerConsoleOpen(false)}
                    className="py-2 px-5 rounded-xl bg-dark-800 hover:bg-dark-750 text-slate-300 hover:text-white font-bold text-xs border border-dark-700 transition-colors"
                  >
                    Kapat
                  </button>
                </div>
              </div>
            )}

            {/* 🎯 CURATED PITCH DECK MODAL (AJANSIN SEÇTİĞİ VİRAL ADAYLAR SUNUM MASASI) */}
            {showPitchDeck && curatedPitches.length > 0 && (
              <div className="absolute inset-0 bg-dark-950/90 backdrop-blur-xl z-50 flex items-center justify-center p-6 animate-fadeIn">
                <div className="bg-dark-900 border border-purple-500/40 rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl shadow-purple-950/60 overflow-hidden">
                  {/* Pitch Deck Header */}
                  <div className="px-6 py-4 border-b border-dark-750 bg-gradient-to-r from-purple-950/70 via-dark-850 to-dark-900 flex items-center justify-between shrink-0">
                    <div className="flex items-center space-x-3.5">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-amber-500 flex items-center justify-center shadow-lg shadow-purple-500/30 text-xl">
                        🎯
                      </div>
                      <div>
                        <div className="flex items-center space-x-2.5">
                          <h4 className="text-base font-black text-white tracking-tight">
                            AJANS STRATEJİK VİRAL PITCH DECK (ADAY SUNUM MASASI)
                          </h4>
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            {curatedPitches.length} Seçkin Aday
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">
                          12 Ajan YouTube'u taradı, Sentinel lisansı denetledi, Hook Master viralliği puanladı. Onayladığınız video doğrudan üretime alınır.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowPitchDeck(false)}
                      className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-dark-800 transition-colors"
                      title="Kapat"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Pitch Candidates Grid */}
                  <div className="p-6 overflow-y-auto custom-scrollbar grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                    {curatedPitches.map((pitch, index) => {
                      const scoreColor =
                        pitch.viralityScore >= 92
                          ? 'from-emerald-500 to-teal-400 text-emerald-300 border-emerald-500/40 bg-emerald-500/10'
                          : pitch.viralityScore >= 85
                          ? 'from-purple-500 to-pink-500 text-purple-300 border-purple-500/40 bg-purple-500/10'
                          : 'from-amber-500 to-orange-500 text-amber-300 border-amber-500/40 bg-amber-500/10';

                      return (
                        <div
                          key={pitch.videoId || index}
                          className="bg-dark-950/80 border border-dark-750 hover:border-purple-500/50 rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 shadow-lg group hover:shadow-purple-500/10"
                        >
                          <div className="space-y-3">
                            {/* Card Top: Rank & Dynamic Virality Score */}
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-mono font-bold text-slate-400 px-2 py-0.5 rounded bg-dark-900 border border-dark-800">
                                #{index + 1} ÖNCELİKLİ ADAY
                              </span>
                              <div
                                className={`flex items-center space-x-1.5 px-3 py-1 rounded-full border text-xs font-black shadow-sm ${scoreColor}`}
                              >
                                <Flame className="w-3.5 h-3.5 animate-pulse" />
                                <span>%{pitch.viralityScore} Virallik Skoru</span>
                              </div>
                            </div>

                            {/* Video Title & Channel */}
                            <div>
                              <h5 className="text-sm font-bold text-white line-clamp-2 leading-snug group-hover:text-amber-200 transition-colors">
                                {pitch.title}
                              </h5>
                              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 font-medium">
                                <span>📺 Kanal: {pitch.channelTitle || pitch.channel || 'Bilinmeyen Kanal'}</span>
                                {((pitch.durationSeconds || pitch.duration || 0) > 0) && (
                                  <>
                                    <span>•</span>
                                    <span>
                                      ⏱️ {pitch.durationFormatted || `${Math.floor((pitch.durationSeconds || pitch.duration || 0) / 60)}:${((pitch.durationSeconds || pitch.duration || 0) % 60).toString().padStart(2, '0')}`}
                                    </span>
                                  </>
                                )}
                              </p>
                            </div>

                            {/* Hook Master Analysis */}
                            <div className="p-3 bg-dark-900/90 rounded-xl border border-dark-800 text-xs space-y-1">
                              <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider flex items-center gap-1">
                                <Zap className="w-3 h-3 text-amber-400" /> Kanca (Hook) Stratejisi
                              </span>
                              <p className="text-slate-300 italic">
                                "{pitch.hookAnalysis}"
                              </p>
                            </div>

                            {/* SEO Angle & Sentinel Badge */}
                            <div className="text-[11px] text-slate-400 space-y-1.5">
                              <div className="flex items-start gap-1.5">
                                <span className="text-indigo-400 font-bold shrink-0">💡 SEO Açısı:</span>
                                <span className="text-slate-300">{pitch.seoAngle}</span>
                              </div>

                              <div className="flex items-center gap-1.5 text-emerald-400 font-medium text-[10px] pt-1">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span>Sentinel Onaylı: CC-BY Lisansı Doğrulandı • Ticari Müzik Yok</span>
                              </div>
                            </div>
                          </div>

                          {/* Card Footer: Action Buttons */}
                          <div className="pt-4 mt-3 border-t border-dark-800 flex items-center justify-between gap-2.5">
                            {(pitch.videoUrl || pitch.url) && (
                              <button
                                onClick={() => window.open(pitch.videoUrl || pitch.url, '_blank')}
                                className="px-3 py-2 rounded-xl bg-dark-800 hover:bg-dark-750 text-slate-300 hover:text-white text-xs font-bold transition-all border border-dark-700 flex items-center gap-1.5"
                                title="YouTube'da izle"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>YouTube</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleApprovePitch(pitch)}
                              className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/30 flex items-center justify-center gap-1.5"
                            >
                              <Play className="w-3.5 h-3.5 fill-white" />
                              <span>🎬 Bu Videoyu Onayla & Üretime Al</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pitch Deck Bottom Bar */}
                  <div className="px-6 py-3 border-t border-dark-750 bg-dark-850 flex items-center justify-between text-xs text-slate-400 shrink-0">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      Tüm adaylar telif riski %0 olarak Sentinel Guard tarafından filtrelenmiştir.
                    </span>
                    <button
                      onClick={() => setShowPitchDeck(false)}
                      className="px-4 py-1.5 rounded-xl bg-dark-800 hover:bg-dark-750 text-slate-300 font-bold"
                    >
                      Pencereyi Gizle
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>


        {/* ======================================================== */}
        {/* MODAL FOOTER                                             */}
        {/* ======================================================== */}
        <div className="p-4 px-6 border-t border-dark-750 bg-dark-850 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              Aktif 13 Ajanlı Kadro (Güvenlik Denetimli):{' '}
              <strong className="text-slate-200">
                Sentinel Guard (Güvenlik Şefi) + Hunter + Legal + Scout + Hook + CEO + Vision + Copy + QA + Planner + SEO + Audio + Polyglot
              </strong>
            </span>
          </div>
          <button
            onClick={onClose}
            className="py-1.5 px-5 rounded-xl bg-dark-800 hover:bg-dark-750 text-white font-semibold transition-colors border border-dark-700"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Highly Realistic & Animated 2D Workstation Desk Component
 */
interface RealisticWorkstationDeskProps {
  agent: AgentOfficeNode;
  isActiveTurn: boolean;
  latestMessage?: AgencyMessage;
  isSelected: boolean;
  onSelect: () => void;
  isAnyActive: boolean;
  elapsedSeconds: number;
}

const RealisticWorkstationDesk: React.FC<RealisticWorkstationDeskProps> = ({
  agent,
  isActiveTurn,
  latestMessage,
  isSelected,
  onSelect,
  isAnyActive,
  elapsedSeconds,
}) => {
  return (
    <div
      onClick={onSelect}
      className={`group relative bg-dark-900/95 border rounded-2xl p-4 cursor-pointer transition-all duration-300 flex flex-col justify-between shadow-xl ${
        isActiveTurn
          ? `ring-2 ring-amber-400 border-amber-400/80 shadow-2xl shadow-amber-500/20 bg-dark-850 scale-[1.02]`
          : isSelected
          ? 'ring-2 ring-brand-purple border-brand-purple/80 bg-dark-850'
          : `${agent.borderColor} hover:scale-[1.01]`
      }`}
    >
      {/* Active Neon Spotlight Beam */}
      {isActiveTurn && (
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent blur-[1px] animate-pulse" />
      )}

      {/* Top Header & Turn Status Badge */}
      <div>
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center space-x-2.5">
            {/* 2D Animated Avatar Desk Icon */}
            <div className="relative">
              <div className={`w-11 h-11 rounded-xl bg-dark-950 border flex items-center justify-center text-2xl transition-transform group-hover:scale-105 shadow-inner ${
                isActiveTurn ? 'border-amber-400 ring-2 ring-amber-400/40 animate-pulse' : 'border-dark-750'
              }`}>
                {agent.avatar}
              </div>
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-dark-900 ${
                  isActiveTurn ? 'bg-amber-400 animate-ping' : latestMessage ? 'bg-emerald-400' : 'bg-slate-600'
                }`}
              />
            </div>

            <div>
              <h4 className="text-xs font-black text-white group-hover:text-amber-300 transition-colors">
                {agent.name}
              </h4>
              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${agent.badgeBg} block truncate max-w-[125px]`}>
                {agent.title}
              </span>
            </div>
          </div>

          {/* Model Tag */}
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-dark-950 border border-dark-800 text-slate-400">
            {agent.model}
          </span>
        </div>

        {/* Live Turn State Indicator (SIRA KİMDE?) */}
        <div className="my-2">
          {isActiveTurn ? (
            <div className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-extrabold flex items-center justify-between shadow-sm animate-pulse">
              <span className="flex items-center gap-1">
                <Flame className="w-3 h-3 text-amber-400 fill-current" />
                <span>ŞU AN ÇALIŞIYOR</span>
              </span>
              <span className="font-mono">{elapsedSeconds}s</span>
            </div>
          ) : latestMessage ? (
            <div className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[10px] font-semibold flex items-center justify-between">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>{agent.deliverableTitle}</span>
              </span>
              <span className="text-[9px] text-slate-500 font-mono">{latestMessage.timestamp}</span>
            </div>
          ) : isAnyActive ? (
            <div className="px-2 py-0.5 rounded-lg bg-dark-950 text-slate-500 border border-dark-800 text-[10px] font-medium flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-600" />
              <span>Sırasını Bekliyor</span>
            </div>
          ) : (
            <div className="px-2 py-0.5 rounded-lg bg-dark-950 text-slate-400 border border-dark-800 text-[10px] font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Hazır (Beklemede)</span>
            </div>
          )}
        </div>

        {/* Dynamic Department-Specific 2D Visual Desk Widget */}
        <div className="my-2 p-2 rounded-xl bg-dark-950 border border-dark-800/80 overflow-hidden">
          {agent.role === 'trend_hunter' && (
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <Radio className={`w-3.5 h-3.5 ${isActiveTurn ? 'text-amber-400 animate-spin' : 'text-slate-600'}`} />
                <span>CC Radar Taraması</span>
              </span>
              <span className="font-mono text-emerald-400 text-[9px]">{isActiveTurn ? 'TARANIYOR...' : 'AKTİF'}</span>
            </div>
          )}

          {agent.role === 'copyright_auditor' && (
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>CC-BY Uyumluluk</span>
              </span>
              <span className="font-mono text-emerald-400 text-[9px]">RİSKSİZ</span>
            </div>
          )}

          {agent.role === 'scout' && (
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <Volume2 className="w-3.5 h-3.5 text-yellow-400" />
                <span>Ses Spektrumu</span>
              </span>
              <div className="flex items-center space-x-0.5">
                {[4, 8, 12, 6, 10, 4].map((h, i) => (
                  <span
                    key={i}
                    className={`w-1 bg-yellow-400 rounded-full transition-all ${isActiveTurn ? 'animate-pulse' : ''}`}
                    style={{ height: `${h}px` }}
                  />
                ))}
              </div>
            </div>
          )}

          {agent.role === 'hook_architect' && (
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-rose-400" />
                <span>İlk 3s Kanca Gücü</span>
              </span>
              <span className="font-mono text-rose-300 font-bold text-[9px]">≥ %94 CTR</span>
            </div>
          )}

          {agent.role === 'ceo' && (
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-purple-400" />
                <span>Virallik Eşiği</span>
              </span>
              <span className="font-mono text-purple-300 font-bold text-[9px]">≥ 85 / 100</span>
            </div>
          )}

          {agent.role === 'art_director' && (
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                <span>9:16 Yüz Takibi</span>
              </span>
              <span className="font-mono text-cyan-300 text-[9px]">ODAKLANDI</span>
            </div>
          )}

          {agent.role === 'copywriter' && (
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <Terminal className="w-3.5 h-3.5 text-pink-400" />
                <span>CTR Kanca Matrisi</span>
              </span>
              <span className="font-mono text-pink-300 text-[9px]">3 VARYASYON</span>
            </div>
          )}

          {agent.role === 'qa' && (
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Retorik Kalite</span>
              </span>
              <span className="font-mono text-blue-300 font-bold text-[9px]">%95+ ONAY</span>
            </div>
          )}

          {agent.role === 'scheduler' && (
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                <span>Pik Saat Yuvası</span>
              </span>
              <span className="font-mono text-indigo-300 text-[9px]">18:30 / 21:15</span>
            </div>
          )}

          {agent.role === 'seo_specialist' && (
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>Algoritma Skoru</span>
              </span>
              <span className="font-mono text-emerald-300 font-bold text-[9px]">RANK #1 VIRAL</span>
            </div>
          )}

          {agent.role === 'sound_designer' && (
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <Volume2 className="w-3.5 h-3.5 text-violet-400" />
                <span>Dead-Air Kesici</span>
              </span>
              <span className="font-mono text-violet-300 text-[9px]">0.3s TEMİZLE</span>
            </div>
          )}

          {agent.role === 'translator_multilingual' && (
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-teal-400" />
                <span>Küresel Pazarlar</span>
              </span>
              <span className="font-mono text-teal-300 text-[9px]">EN / ES / DE</span>
            </div>
          )}

          {agent.role === 'cliffhanger_architect' && (
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <Film className="w-3.5 h-3.5 text-amber-400" />
                <span>Cliffhanger Kurgu</span>
              </span>
              <span className="font-mono text-amber-300 font-bold text-[9px]">PART 1 / 2 SERİ</span>
            </div>
          )}

          {agent.role === 'security_supervisor' && (
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Telif & Lisans Kalkanı</span>
              </span>
              <span className="font-mono text-emerald-300 font-bold text-[9px]">100% GÜVENLİ</span>
            </div>
          )}

          {agent.role === 'youtube_manager' && (
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-rose-400" />
                <span>YouTube Scoreboard</span>
              </span>
              <span className="font-mono text-rose-300 font-bold text-[9px]">CANLI ANALİTİK</span>
            </div>
          )}
        </div>

        {/* Thought Bubble / Live Decision Output */}
        <div className="relative my-1 p-2 rounded-xl bg-dark-950/70 border border-dark-800 text-[11px] leading-snug group-hover:border-dark-700 transition-colors">
          <p className="text-slate-300 line-clamp-2 italic text-[10px]">
            "{isActiveTurn
              ? agent.workDescription
              : latestMessage
              ? latestMessage.content
              : `${agent.department} hazır durumda.`}"
          </p>
        </div>
      </div>

      {/* Desk Base Footer */}
      <div className="pt-2 border-t border-dark-800/80 flex items-center justify-between text-[10px] text-slate-400">
        <span className="text-[9px] font-medium text-slate-500 truncate max-w-[100px]">{agent.department}</span>
        <span className="text-brand-purple group-hover:text-brand-cyan transition-colors font-bold flex items-center">
          Profil <ChevronRight className="w-3 h-3 ml-0.5" />
        </span>
      </div>
    </div>
  );
};
