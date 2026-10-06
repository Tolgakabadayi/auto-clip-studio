import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  X,
  Zap,
  Flame,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Film,
  Minimize2,
  Maximize2,
  Volume2,
  VolumeX,
  Compass,
  Navigation,
  MousePointerClick,
  RefreshCw,
  Cpu,
  Building2,
  Radio,
  ShieldCheck,
  Play,
  ArrowRight,
  Eye,
  SlidersHorizontal,
  FolderOpen
} from 'lucide-react';
import {
  CopilotMessage,
  CopilotSpeech,
  CopilotSpeechAction,
  PipelineProgress,
  AutopilotState,
  AgencyMessage
} from '../types';
import { novaVoice } from '../utils/novaVoice';
import { NovaInteractiveAvatar } from './NovaInteractiveAvatar';

interface CopilotWidgetProps {
  pipelineProgress: PipelineProgress;
  autopilotState: AutopilotState | null;
  agencyMessages: AgencyMessage[];
  onOpenAgencyRoom: () => void;
  onOpenPitches?: () => void;
  onOpenAutopilot: () => void;
  onOpenSettings?: () => void;
  onResetError?: () => void;
  onStartDiscoveryMeeting?: () => void;
  onDownloadYouTube?: (url: string) => void;
}

type DockStation = 'bottom_right' | 'center_right' | 'top_right' | 'bottom_left';

export const CopilotWidget: React.FC<CopilotWidgetProps> = ({
  pipelineProgress,
  autopilotState,
  agencyMessages,
  onOpenAgencyRoom,
  onOpenPitches,
  onOpenAutopilot,
  onOpenSettings,
  onResetError,
  onStartDiscoveryMeeting,
  onDownloadYouTube,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSpeechVisible, setIsSpeechVisible] = useState(true);
  const [isCompactBubble, setIsCompactBubble] = useState(false);
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('autoclip_copilot_muted') === 'true';
    } catch {
      return false;
    }
  });

  const [isRoaming, setIsRoaming] = useState(true);
  const [currentStation, setCurrentStation] = useState<DockStation>('bottom_right');
  const [clickPing, setClickPing] = useState<{ x: number; y: number; label: string } | null>(null);
  const [isSpeakingVoice, setIsSpeakingVoice] = useState(false);

  // Mode: 'ambient' vs 'active_notification'
  const [copilotMode, setCopilotMode] = useState<'ambient' | 'active_notification'>('ambient');
  const [ambientTipIndex, setAmbientTipIndex] = useState(0);

  const decayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastPipelineStepRef = useRef<string | null>(null);
  const lastAgencyMsgIdRef = useRef<string | null>(null);

  useEffect(() => {
    return novaVoice.subscribe((speaking) => {
      setIsSpeakingVoice(speaking);
    });
  }, []);

  const [currentSpeech, setCurrentSpeech] = useState<CopilotSpeech>({
    message: '👋 Selam patron! "Toplantı başlat" veya "Röportaj videosu bul 3M+" de, gerisini bana bırak!',
    mood: 'idle',
  });

  const [inputPrompt, setInputPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'init_1',
      sender: 'assistant',
      text: 'Selam patron! Ben AutoClip AI Stüdyo Baş Danışmanın NOVA. Uygulama üzerinde tam yetkiye sahibim. "Toplantı başlat", "Viral adayları göster", "Röportaj videosu bul 3M+" veya YouTube linki gibi tüm emirleri anında yerine getiririm!',
      timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      status: 'done',
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Dynamic Rotating Ambient Tips & Suggestions
  const ambientTips = useMemo(() => [
    {
      text: '🚀 12 Ajanlı Keşif Toplantısı: YouTube Creative Commons ağından en yüksek viral potansiyelli videoları tarayıp masana sunabilirim.',
      action: { label: '🚀 Toplantı Başlat', action: 'start_meeting' as const },
    },
    {
      text: '🎯 "Röportaj videosu bul 3M+" de, milyonluk telifsiz kaynakları keşfedip stüdyo kurgusuna hazır edeyim!',
      action: { label: '🎬 Video Bul (3M+)', action: 'start_meeting' as const, payload: { query: 'röportaj videosu bul 3M+' } },
    },
    {
      text: autopilotState?.isRunning
        ? '⚡ 7/24 Otopilot aktif: Belirlenen altın yayın saatlerinde otomatik üretim ve arşivi devrede.'
        : '⚡ 7/24 Otopilot hazır: Günün altın saatlerinde otonom klip üretimi için dilediğin zaman başlatabilirsin.',
      action: { label: '⚡ Otopilot Paneli', action: 'open_autopilot' as const },
    },
    {
      text: '🛡️ Kanal Güvenliği: Siyasi propaganda, bölücü terör ve +18 filtreleri stüdyo radarına bağlı.',
      action: { label: '⚙️ Güvenlik Filtreleri', action: 'open_settings' as const },
    },
    {
      text: '📊 Stüdyo Teşhisi: Whisper AI deşifre motoru, Ollama LLM modelleri ve 12 ajan hazır bekliyor.',
      action: { label: '📊 Durum Raporu', action: 'start_meeting' as const, payload: { query: 'durum raporu' } },
    },
    {
      text: '✂️ Hızlı Kurgu: Herhangi bir YouTube videosu bağlantısını bana yapıştır, anında 9:16 Shorts kurgulayalım!',
      action: undefined,
    },
  ], [autopilotState?.isRunning]);

  // Ambient Mode Tip Rotator (every 18 seconds)
  useEffect(() => {
    if (copilotMode !== 'ambient') return;
    const interval = setInterval(() => {
      setAmbientTipIndex((prev) => (prev + 1) % ambientTips.length);
    }, 18000);
    return () => clearInterval(interval);
  }, [copilotMode, ambientTips.length]);

  // Method to trigger an active notification with auto-decay
  const triggerNotification = (speech: CopilotSpeech, decayDurationMs = 12000) => {
    if (decayTimerRef.current) {
      clearTimeout(decayTimerRef.current);
      decayTimerRef.current = null;
    }

    setCurrentSpeech(speech);
    setCopilotMode('active_notification');
    if (!isMuted) {
      setIsSpeechVisible(true);
      if (speech.message) {
        novaVoice.speak(speech.message);
      }
    }

    // Sticky action notifications (like meeting pitches ready) stay visible longer
    const timeout = speech.action?.action === 'open_pitches' ? 35000 : decayDurationMs;

    decayTimerRef.current = setTimeout(() => {
      setCopilotMode('ambient');
      decayTimerRef.current = null;
    }, timeout);
  };

  // Toggle Mute Handler
  const toggleMute = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('autoclip_copilot_muted', String(next));
      } catch {}
      novaVoice.setMuted(next);
      if (next) novaVoice.cancel();
      return next;
    });
  };

  const handleDismissError = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setCurrentSpeech({ message: 'Patron hatayı yoksaydım, emirlerini bekliyorum!', mood: 'idle' });
    setCopilotMode('ambient');
    if (onResetError) onResetError();
    if (window.electronAPI?.resetPipelineProgress) {
      await window.electronAPI.resetPipelineProgress();
    }
  };

  // Trigger holographic click ripple on target UI coordinates
  const triggerClickAnimation = (targetX: number, targetY: number, label: string) => {
    setClickPing({ x: targetX, y: targetY, label });
    setTimeout(() => {
      setClickPing(null);
    }, 1800);
  };

  // Action Dispatcher for Clickable Speech Balloon & Chat Buttons
  const handleExecuteAction = (action?: CopilotSpeechAction, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!action) return;

    if (action.action === 'open_pitches') {
      triggerClickAnimation(window.innerWidth / 2, window.innerHeight / 2, '🎯 Viral Adaylar Sunumu');
      if (onOpenPitches) onOpenPitches();
      else onOpenAgencyRoom();
    } else if (action.action === 'start_meeting') {
      if (action.payload?.query) {
        handleSendCommand(action.payload.query);
      } else {
        triggerClickAnimation(window.innerWidth / 2, window.innerHeight / 2, '🚀 Toplantı Başlatıldı');
        if (onStartDiscoveryMeeting) onStartDiscoveryMeeting();
        else if (window.electronAPI?.startDiscoveryMeeting) window.electronAPI.startDiscoveryMeeting();
      }
    } else if (action.action === 'open_agency') {
      triggerClickAnimation(200, window.innerHeight - 80, '🏢 Ajans Masası');
      onOpenAgencyRoom();
    } else if (action.action === 'open_autopilot') {
      triggerClickAnimation(200, window.innerHeight - 40, '⚡ Otopilot');
      onOpenAutopilot();
    } else if (action.action === 'open_settings') {
      triggerClickAnimation(window.innerWidth - 100, 60, '⚙️ Ayarlar');
      if (onOpenSettings) onOpenSettings();
    }

    if (window.electronAPI?.copilotTriggerAction) {
      window.electronAPI.copilotTriggerAction(action).catch(console.error);
    }
  };

  // Station roaming coordinates for smooth gliding across the app
  const stationStyles = useMemo<React.CSSProperties>(() => {
    if (isOpen) {
      return { bottom: '24px', right: '24px' };
    }

    switch (currentStation) {
      case 'center_right':
        return { top: '48%', right: '24px', transform: 'translateY(-50%)' };
      case 'top_right':
        return { top: '80px', right: '24px' };
      case 'bottom_left':
        return { bottom: '32px', left: '260px' };
      case 'bottom_right':
      default:
        return { bottom: '24px', right: '24px' };
    }
  }, [currentStation, isOpen]);

  // Periodic autonomous roaming between docks when enabled
  useEffect(() => {
    if (!isRoaming || isOpen) return;

    const stations: DockStation[] = ['bottom_right', 'center_right', 'top_right', 'bottom_left'];
    const interval = setInterval(() => {
      setCurrentStation((curr) => {
        const nextIdx = (stations.indexOf(curr) + 1) % stations.length;
        return stations[nextIdx];
      });
    }, 24000);

    return () => clearInterval(interval);
  }, [isRoaming, isOpen]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Initial load of messages & listeners
  useEffect(() => {
    if (window.electronAPI?.copilotGetMessages) {
      window.electronAPI.copilotGetMessages().then((msgs: any) => {
        if (Array.isArray(msgs) && msgs.length > 0) {
          setMessages(msgs);
        }
      }).catch(console.error);
    }

    const unregSpeech = window.electronAPI?.onCopilotSpeech?.((speech: CopilotSpeech) => {
      triggerNotification(speech, speech.action?.action === 'open_pitches' ? 35000 : 12000);
    });

    const unregMessage = window.electronAPI?.onCopilotMessage?.((msg: CopilotMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    const unregOpenModal = window.electronAPI?.onCopilotOpenModal?.((modal: 'agency' | 'autopilot' | 'settings' | 'pitches') => {
      if (modal === 'agency') {
        triggerClickAnimation(200, window.innerHeight - 80, '🏢 Ajans Masası Açıldı');
        onOpenAgencyRoom();
      } else if (modal === 'pitches') {
        triggerClickAnimation(window.innerWidth / 2, window.innerHeight / 2, '🎯 Viral Adaylar Açıldı');
        if (onOpenPitches) onOpenPitches();
        else onOpenAgencyRoom();
      } else if (modal === 'autopilot') {
        triggerClickAnimation(200, window.innerHeight - 40, '🤖 7/24 Otopilot Açıldı');
        onOpenAutopilot();
      } else if (modal === 'settings') {
        triggerClickAnimation(window.innerWidth - 100, 60, '⚙️ Ayarlar Açıldı');
        if (onOpenSettings) onOpenSettings();
      }
    });

    return () => {
      if (unregSpeech) unregSpeech();
      if (unregMessage) unregMessage();
      if (unregOpenModal) unregOpenModal();
    };
  }, [onOpenAgencyRoom, onOpenPitches, onOpenAutopilot, onOpenSettings, isMuted]);

  // Context-aware speech updates with automatic decay (preventing permanent freeze)
  useEffect(() => {
    if (!pipelineProgress) return;
    const { step, isError, message, percent, downloadTelemetry } = pipelineProgress;

    if (isError || step === 'error') {
      triggerNotification({
        message: `🚨 Hata Oluştu Patron! ${message}`,
        mood: 'alert',
      }, 25000);
      lastPipelineStepRef.current = 'error';
      return;
    }

    if (step === 'downloading_youtube') {
      const tel = downloadTelemetry;
      const speed = tel?.speed ? ` • ${tel.speed}` : '';
      const size = tel?.downloadedSize && tel?.totalSize ? ` • ${tel.downloadedSize} / ${tel.totalSize}` : '';
      const eta = tel?.eta ? ` (Kalan: ${tel.eta})` : '';
      setCurrentSpeech({
        message: `📥 YouTube İndiriliyor (%${percent}): ${tel?.rawText || message}${speed}${size}${eta}`,
        mood: 'working',
      });
      setCopilotMode('active_notification');
      if (decayTimerRef.current) clearTimeout(decayTimerRef.current);
      decayTimerRef.current = setTimeout(() => {
        setCopilotMode('ambient');
      }, 10000);
      lastPipelineStepRef.current = 'downloading_youtube';
      return;
    }

    if (percent > 0 && percent < 100 && step !== 'idle') {
      setCurrentSpeech({
        message: `🎙️ Deşifre & Kurgu Devam Ediyor (%${percent}): ${message}`,
        mood: 'working',
      });
      setCopilotMode('active_notification');
      if (decayTimerRef.current) clearTimeout(decayTimerRef.current);
      decayTimerRef.current = setTimeout(() => {
        setCopilotMode('ambient');
      }, 10000);
      lastPipelineStepRef.current = step;
      return;
    }

    if (step === 'completed' && lastPipelineStepRef.current !== 'completed') {
      lastPipelineStepRef.current = 'completed';
      triggerNotification({
        message: '🎉 Kurgu başarıyla tamamlandı patron! Klipler ana masada incelenmeye hazır.',
        mood: 'success',
      }, 14000);
      return;
    }

    if (step === 'idle' && lastPipelineStepRef.current && lastPipelineStepRef.current !== 'idle') {
      lastPipelineStepRef.current = 'idle';
      setCopilotMode('ambient');
    }
  }, [pipelineProgress]);

  // Agency message live stream: show each for 8 seconds, then decay back to ambient
  useEffect(() => {
    if (!agencyMessages || agencyMessages.length === 0) return;
    const latest = agencyMessages[agencyMessages.length - 1];
    if (latest && latest.id !== lastAgencyMsgIdRef.current) {
      lastAgencyMsgIdRef.current = latest.id;
      triggerNotification({
        message: `🏢 [${latest.agentName}]: "${(latest.content || '').slice(0, 80)}${latest.content?.length > 80 ? '...' : ''}"`,
        mood: 'excited',
      }, 8000);
    }
  }, [agencyMessages]);

  const handleSendCommand = async (cmdText?: string) => {
    const textToSend = (cmdText || inputPrompt).trim();
    if (!textToSend || isSubmitting) return;

    setInputPrompt('');
    setIsSubmitting(true);

    // Optimistically push user command to chat stream
    const userMsg: CopilotMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMsg]);

    // Show simulated click animation
    triggerClickAnimation(window.innerWidth - 60, window.innerHeight - 60, '🚀 NOVA Göreve Başladı');

    try {
      if (window.electronAPI?.copilotSendCommand) {
        const responseMsg = await window.electronAPI.copilotSendCommand(textToSend);
        if (responseMsg) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === responseMsg.id)) return prev;
            return [...prev, responseMsg];
          });
          if (responseMsg.text && !isMuted) {
            novaVoice.speak(responseMsg.text);
          }
        }
      } else {
        // Fallback response outside Electron
        setTimeout(() => {
          const fallbackText = '⚡ Emredersin patron! Komutun başarıyla alındı ve ajans ağına iletildi.';
          setMessages((prev) => [
            ...prev,
            {
              id: `asst_${Date.now()}`,
              sender: 'assistant',
              text: fallbackText,
              timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
              status: 'done',
            },
          ]);
          if (!isMuted) {
            novaVoice.speak(fallbackText);
          }
        }, 600);
      }
    } catch (e: any) {
      console.error('[CopilotWidget] Error sending command:', e);
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: 'assistant',
          text: `⚠️ Komut işlenirken bir sorun oluştu: ${e.message}`,
          timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
          status: 'error',
        },
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const quickPrompts = [
    { label: '🚀 Toplantı Başlat', cmd: 'toplantı başlat' },
    { label: '🎯 Viral Adaylar', cmd: 'viral adayları göster' },
    { label: '⚡ Otopilot Paneli', cmd: 'otopilot panelini aç' },
    { label: '🎬 Video Bul (3M+)', cmd: 'röportaj videosu bul en az 3milyon izlenmesi olsun' },
    { label: '📊 Durum Raporu', cmd: 'stüdyo durum raporu ver' },
    { label: '⚙️ Ayarlar & Güvenlik', cmd: 'ayarları ve kanal güvenliğini aç' },
  ];

  const currentAmbientTip = ambientTips[ambientTipIndex] || ambientTips[0];

  return (
    <>
      {/* Visual Simulated Click Ping & Ripple on Screen */}
      {clickPing && (
        <div
          className="fixed pointer-events-none z-[9999] flex flex-col items-center justify-center -translate-x-1/2 -translate-y-1/2 transition-opacity duration-300"
          style={{ left: clickPing.x, top: clickPing.y }}
        >
          <span className="w-16 h-16 rounded-full border-2 border-brand-cyan animate-ping absolute" />
          <span className="w-8 h-8 rounded-full border border-purple-400 bg-brand-cyan/30 animate-pulse absolute" />
          <div className="absolute -top-8 px-2.5 py-1 rounded-lg bg-dark-950/95 border border-brand-cyan/50 text-[10px] font-bold text-brand-cyan shadow-xl flex items-center space-x-1 whitespace-nowrap animate-bounce">
            <MousePointerClick className="w-3 h-3 text-brand-cyan" />
            <span>{clickPing.label}</span>
          </div>
        </div>
      )}

      {/* Main Floating Bot Container */}
      <div
        className="fixed z-50 flex flex-col items-end pointer-events-none select-none transition-all duration-1000 ease-in-out"
        style={stationStyles}
      >
        {/* 1. Live Floating Speech Bubble */}
        {isSpeechVisible && !isMuted && !isOpen && (
          <div
            className={`pointer-events-auto mb-3 text-white rounded-2xl rounded-br-sm shadow-2xl relative group transition-all duration-300 subpixel-antialiased ${
              isCompactBubble
                ? 'px-3 py-1.5 bg-[#0c0d16]/95 border border-brand-purple/50 cursor-pointer hover:border-brand-purple'
                : 'max-w-xs sm:max-w-sm p-3.5 bg-[#0c0d16] border-2 shadow-brand-purple/20 cursor-pointer ' +
                  (copilotMode === 'active_notification' && currentSpeech.action?.action === 'open_pitches'
                    ? 'border-amber-400/90 ring-2 ring-amber-400/30'
                    : 'border-brand-purple/70 hover:border-brand-purple')
            }`}
            onClick={() => {
              if (isCompactBubble) setIsCompactBubble(false);
              else setIsOpen(true);
            }}
          >
            {/* Action buttons (Close 'X', Compact Toggle, Mute Toggle) */}
            <div className="absolute -top-2.5 -right-2 flex items-center space-x-1 z-30 pointer-events-auto">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCompactBubble(!isCompactBubble);
                }}
                className="w-5 h-5 bg-dark-800 hover:bg-dark-700 text-slate-300 hover:text-white rounded-full flex items-center justify-center border border-dark-600 text-[10px] shadow-md transition-colors"
                title={isCompactBubble ? 'Genişlet' : 'Küçült'}
              >
                {isCompactBubble ? <Maximize2 className="w-2.5 h-2.5" /> : <Minimize2 className="w-2.5 h-2.5" />}
              </button>
              <button
                type="button"
                onClick={toggleMute}
                className="w-5 h-5 bg-dark-800 hover:bg-dark-700 text-slate-300 hover:text-white rounded-full flex items-center justify-center border border-dark-600 text-[10px] shadow-md transition-colors"
                title={isMuted ? 'Sesi Aç' : 'Sessize Al'}
              >
                {isMuted ? <VolumeX className="w-2.5 h-2.5 text-rose-400" /> : <Volume2 className="w-2.5 h-2.5 text-slate-300" />}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsSpeechVisible(false);
                }}
                className="w-5 h-5 bg-dark-800 hover:bg-rose-900/80 text-slate-300 hover:text-white rounded-full flex items-center justify-center border border-dark-600 text-[10px] shadow-md transition-colors"
                title="Baloncuğu Kapat"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>

            {isCompactBubble ? (
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] font-bold text-slate-200">NOVA Dinliyor...</span>
                <span className="text-[9px] text-brand-cyan underline">Aç</span>
              </div>
            ) : (
              <div className="flex items-start space-x-2.5">
                <div className="w-6 h-6 rounded-lg bg-brand-purple/20 text-brand-purple flex items-center justify-center shrink-0 mt-0.5 border border-brand-purple/30">
                  {copilotMode === 'ambient' ? (
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  ) : currentSpeech.mood === 'working' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-cyan" />
                  ) : currentSpeech.mood === 'excited' || currentSpeech.action?.action === 'open_pitches' ? (
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                  ) : currentSpeech.mood === 'alert' ? (
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-brand-purple" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Status Mode Badge */}
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                      {copilotMode === 'ambient' ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                          ORTAM MODU • DİNLİYOR
                        </span>
                      ) : (
                        <span className="text-brand-cyan flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse inline-block" />
                          NOVA • BAŞ DANIŞMAN
                        </span>
                      )}
                    </span>
                    <span className="text-[9px] text-slate-400 font-semibold bg-dark-800 px-1.5 py-0.5 rounded">Tıkla & Konuş</span>
                  </div>

                  {/* Speech Message Text */}
                  <p className="text-xs text-slate-100 font-medium leading-relaxed break-words">
                    {copilotMode === 'ambient' ? currentAmbientTip.text : currentSpeech.message}
                  </p>

                  {/* ACTIONABLE BUTTON: Active Notification Action (e.g. [🎯 Viral Adayları İncele & Seç]) */}
                  {copilotMode === 'active_notification' && currentSpeech.action && (
                    <div className="mt-2.5 pt-1.5 border-t border-dark-750/80">
                      <button
                        type="button"
                        onClick={(e) => handleExecuteAction(currentSpeech.action, e)}
                        className={`w-full py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-lg transition-all animate-bounce ${
                          currentSpeech.action.action === 'open_pitches'
                            ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-amber-500/30'
                            : 'bg-gradient-to-r from-brand-purple to-brand-cyan hover:from-purple-600 hover:to-cyan-600 text-white shadow-purple-600/30'
                        }`}
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>{currentSpeech.action.label}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* ACTIONABLE BUTTON: Ambient Tip Action (when in ambient mode) */}
                  {copilotMode === 'ambient' && (
                    <div className="mt-2 pt-1 border-t border-dark-800/80 flex items-center justify-between gap-1.5">
                      {currentAmbientTip.action ? (
                        <button
                          type="button"
                          onClick={(e) => handleExecuteAction(currentAmbientTip.action, e)}
                          className="py-1 px-2.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold transition-all flex items-center gap-1 shadow-sm"
                        >
                          <Zap className="w-3 h-3 text-emerald-400" />
                          <span>{currentAmbientTip.action.label}</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Gelişmiş komutlar için paneli aç</span>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsOpen(true);
                        }}
                        className="text-[10px] text-brand-cyan font-bold hover:underline flex items-center gap-0.5"
                      >
                        <span>Paneli Aç</span>
                        <ArrowRight className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  )}

                  {/* Error Reset Action if in error state */}
                  {(currentSpeech.mood === 'alert' || pipelineProgress?.step === 'error') && (
                    <button
                      type="button"
                      onClick={handleDismissError}
                      className="mt-2 w-full py-1.5 px-2.5 bg-rose-600/40 hover:bg-rose-600/70 border border-rose-500/50 rounded-xl text-rose-100 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-md"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-rose-300" />
                      <span>Hatayı Yoksay & Sıfırla</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Pointer tail */}
            <div className="absolute -bottom-2 right-6 w-3 h-3 bg-[#0c0d16] border-r-2 border-b-2 border-brand-purple/70 transform rotate-45" />
          </div>
        )}

        {/* 2. Animated Character Avatar & Dock Controller */}
        <div className="pointer-events-auto relative flex items-center space-x-2">
          {/* Quick roaming & mute micro controls */}
          {!isOpen && (
            <div className="flex flex-col space-y-1 mr-1 opacity-80 hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={toggleMute}
                className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs shadow-lg border transition-all ${
                  isMuted
                    ? 'bg-rose-950/80 border-rose-500/50 text-rose-300'
                    : 'bg-dark-900/90 border-dark-700 text-slate-300 hover:text-white'
                }`}
                title={isMuted ? 'Sesi Aç (Baloncukları Göster)' : 'Sessize Al (Baloncukları Gizle)'}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-slate-300" />}
              </button>
              <button
                type="button"
                onClick={() => setIsRoaming(!isRoaming)}
                className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs shadow-lg border transition-all ${
                  isRoaming
                    ? 'bg-brand-purple/30 border-brand-purple text-brand-cyan'
                    : 'bg-dark-900/90 border-dark-700 text-slate-400'
                }`}
                title={isRoaming ? 'Gezgin Modu Aktif (Ekranda Dolanır)' : 'Sabitlendi (Köşede Bekler)'}
              >
                <Compass className={`w-3.5 h-3.5 ${isRoaming ? 'animate-spin' : ''}`} />
              </button>
            </div>
          )}

          {/* Interactive Nova Avatar with Physics Eye-Tracking & Emotion System */}
          <div className="relative group/nova">
            <NovaInteractiveAvatar
              size="lg"
              externalMood={currentSpeech.mood}
              isSpeaking={isSpeakingVoice}
              isBusy={pipelineProgress?.step !== 'completed' && pipelineProgress?.step !== 'idle'}
              onOpenChat={() => {
                setIsOpen(!isOpen);
                if (!isMuted) setIsSpeechVisible(true);
              }}
              enableVoiceReactions={!isMuted}
            />

            {/* Quick Open Console Button on Hover / Status Badge */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(!isOpen);
                if (!isMuted) setIsSpeechVisible(true);
              }}
              className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full border-2 border-dark-950 flex items-center justify-center shadow-md transition-transform hover:scale-110 ${
                isOpen
                  ? 'bg-brand-purple text-white'
                  : isSpeakingVoice
                  ? 'bg-emerald-400 ring-2 ring-emerald-400/50'
                  : isMuted
                  ? 'bg-amber-500'
                  : 'bg-brand-cyan'
              }`}
              title={isOpen ? 'Paneli Kapat' : 'Danışman Panelini Aç'}
            >
              {isOpen ? (
                <X className="w-3 h-3 text-white" />
              ) : (
                <span className={`w-2 h-2 rounded-full ${isSpeakingVoice ? 'bg-white animate-ping' : isMuted ? 'bg-amber-200' : 'bg-white'}`} />
              )}
            </button>
          </div>
        </div>

        {/* 3. Interactive Full Command Console / Chat Modal */}
        {isOpen && (
          <div className="pointer-events-auto fixed bottom-24 right-6 w-96 max-w-[calc(100vw-3rem)] h-[560px] max-h-[82vh] bg-dark-900/98 border border-brand-purple/40 rounded-3xl shadow-2xl shadow-black/95 flex flex-col overflow-hidden backdrop-blur-2xl z-50 animate-fadeIn">
            {/* Header */}
            <div className="px-5 py-3.5 bg-gradient-to-r from-dark-950 via-dark-900 to-brand-purple/20 border-b border-dark-750 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-brand-purple/20 border border-brand-purple/40 text-brand-purple flex items-center justify-center shadow-inner">
                  <Bot className="w-4 h-4 text-brand-cyan" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>NOVA</span>
                    <span className="text-[9px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded-full">
                      TAM YETKİLİ
                    </span>
                  </h3>
                  <p className="text-[10px] text-slate-400">AutoClip Studio Baş Danışmanı & Kurgu Amiri</p>
                </div>
              </div>

              {/* Header Right Actions */}
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={toggleMute}
                  className={`p-1.5 rounded-lg border text-xs transition-colors ${
                    isMuted
                      ? 'bg-rose-950/80 border-rose-500/40 text-rose-300'
                      : 'bg-dark-800 hover:bg-dark-750 text-slate-400 hover:text-white border-dark-700'
                  }`}
                  title={isMuted ? 'Sesi Aç' : 'Sessize Al'}
                >
                  {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg bg-dark-800 hover:bg-dark-750 text-slate-400 hover:text-white transition-colors border border-dark-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Feature Action Bar */}
            <div className="px-3 py-2 bg-dark-950/90 border-b border-dark-800 grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => handleExecuteAction({ label: 'Toplantı Başlat', action: 'start_meeting' })}
                className="py-1 px-2 rounded-lg bg-brand-purple/20 hover:bg-brand-purple/40 border border-brand-purple/40 text-[10px] font-bold text-white transition-all flex items-center justify-center gap-1"
              >
                <Zap className="w-3 h-3 text-amber-400" />
                <span className="truncate">Toplantı Başlat</span>
              </button>
              <button
                type="button"
                onClick={() => handleExecuteAction({ label: 'Viral Adaylar', action: 'open_pitches' })}
                className="py-1 px-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-[10px] font-bold text-amber-300 transition-all flex items-center justify-center gap-1"
              >
                <Flame className="w-3 h-3 text-amber-400" />
                <span className="truncate">Viral Adaylar</span>
              </button>
              <button
                type="button"
                onClick={() => handleExecuteAction({ label: 'Otopilot', action: 'open_autopilot' })}
                className="py-1 px-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-[10px] font-bold text-emerald-300 transition-all flex items-center justify-center gap-1"
              >
                <Bot className="w-3 h-3 text-emerald-400" />
                <span className="truncate">Otopilot</span>
              </button>
            </div>

            {/* Messages Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-dark-700">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl p-3 text-xs leading-relaxed ${
                      m.sender === 'user'
                        ? 'bg-gradient-to-r from-brand-purple to-purple-600 text-white rounded-br-none shadow-md'
                        : 'bg-dark-850/90 border border-dark-700 text-slate-200 rounded-bl-none shadow-sm'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.text}</p>

                    {/* Interactive Action Button in Chat Card */}
                    {m.action && (
                      <div className="mt-2.5 pt-2 border-t border-dark-700/80">
                        <button
                          type="button"
                          onClick={(e) => handleExecuteAction(m.action, e)}
                          className="w-full py-1.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 transition-all"
                        >
                          <Play className="w-3 h-3 fill-slate-950" />
                          <span>{m.action.label}</span>
                        </button>
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-slate-500 mt-1 px-1">{m.timestamp}</span>
                </div>
              ))}
              {isSubmitting && (
                <div className="flex items-center space-x-2 p-3 rounded-2xl bg-dark-850/60 border border-dark-700 text-slate-400 text-xs">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-purple" />
                  <span>NOVA YouTube ve Ajans ağını tarıyor, emirleri uyguluyor...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompt Chips */}
            <div className="p-2.5 bg-dark-950/80 border-t border-dark-800 overflow-x-auto flex space-x-1.5 no-scrollbar">
              {quickPrompts.map((qp, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendCommand(qp.cmd)}
                  className="whitespace-nowrap px-2.5 py-1 rounded-xl bg-dark-850 hover:bg-brand-purple/20 border border-dark-750 hover:border-brand-purple/40 text-[10px] font-medium text-slate-300 hover:text-white transition-all flex items-center space-x-1 shrink-0"
                >
                  <Zap className="w-2.5 h-2.5 text-amber-400" />
                  <span>{qp.label}</span>
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <div className="p-3 bg-dark-950 border-t border-dark-750 flex items-center space-x-2">
              <input
                type="text"
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendCommand();
                }}
                placeholder="Patrona nasıl yardımcı olabilirim? (Örn: Toplantı başlat, Video bul 3M+)..."
                disabled={isSubmitting}
                className="flex-1 bg-dark-900 border border-dark-700 focus:border-brand-purple rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => handleSendCommand()}
                disabled={!inputPrompt.trim() || isSubmitting}
                className="p-2 rounded-xl bg-brand-purple hover:bg-brand-violet disabled:opacity-40 text-white transition-all shadow-md shadow-brand-purple/20 flex items-center justify-center shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
