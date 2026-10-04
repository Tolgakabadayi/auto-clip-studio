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
  Volume2,
  VolumeX,
  Compass,
  Navigation,
  MousePointerClick,
  RefreshCw,
  Cpu,
  Building2,
  Radio,
  ShieldCheck
} from 'lucide-react';
import {
  CopilotMessage,
  CopilotSpeech,
  PipelineProgress,
  AutopilotState,
  AgencyMessage
} from '../types';
import { novaVoice } from '../utils/novaVoice';

interface CopilotWidgetProps {
  pipelineProgress: PipelineProgress;
  autopilotState: AutopilotState | null;
  agencyMessages: AgencyMessage[];
  onOpenAgencyRoom: () => void;
  onOpenAutopilot: () => void;
  onResetError?: () => void;
}

type DockStation = 'bottom_right' | 'center_right' | 'top_right' | 'bottom_left';

export const CopilotWidget: React.FC<CopilotWidgetProps> = ({
  pipelineProgress,
  autopilotState,
  agencyMessages,
  onOpenAgencyRoom,
  onOpenAutopilot,
  onResetError,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSpeechVisible, setIsSpeechVisible] = useState(true);
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

  useEffect(() => {
    return novaVoice.subscribe((speaking) => {
      setIsSpeakingVoice(speaking);
    });
  }, []);

  const [currentSpeech, setCurrentSpeech] = useState<CopilotSpeech>({
    message: '👋 Selam patron! "Röportaj videosu bul en az 3m izlensin" de, gerisini bana bırak!',
    mood: 'idle',
  });
  const [inputPrompt, setInputPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'init_1',
      sender: 'assistant',
      text: 'Selam patron! Ben AutoClip AI Stüdyo Baş Danışmanın NOVA. Uygulama üzerinde tam yetkiye sahibim. Bana "röportaj videosu en az 3milyon izlenmesi olsun bul hazır et" gibi sesli veya yazılı emirler verebilirsin!',
      timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      status: 'done',
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  // Station roaming coordinates for smooth gliding across the app
  const stationStyles = useMemo<React.CSSProperties>(() => {
    if (isOpen) {
      // When chat modal is open, anchor to bottom right
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
    }, 22000); // Glides to another post every 22 seconds

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
      setCurrentSpeech(speech);
      if (!isMuted) {
        setIsSpeechVisible(true);
        if (speech.message) {
          novaVoice.speak(speech.message);
        }
      }
    });

    const unregMessage = window.electronAPI?.onCopilotMessage?.((msg: CopilotMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    const unregOpenModal = window.electronAPI?.onCopilotOpenModal?.((modal: 'agency' | 'autopilot') => {
      if (modal === 'agency') {
        triggerClickAnimation(200, window.innerHeight - 80, '🏢 Ajans Masası Açıldı');
        onOpenAgencyRoom();
      }
      if (modal === 'autopilot') {
        triggerClickAnimation(200, window.innerHeight - 40, '🤖 7/24 Otopilot Açıldı');
        onOpenAutopilot();
      }
    });

    return () => {
      if (unregSpeech) unregSpeech();
      if (unregMessage) unregMessage();
      if (unregOpenModal) unregOpenModal();
    };
  }, [onOpenAgencyRoom, onOpenAutopilot, isMuted]);

  // Context-aware speech bubble updates based on live studio activity
  useEffect(() => {
    if (pipelineProgress?.step === 'error' || pipelineProgress?.isError) {
      setCurrentSpeech({
        message: `🚨 Hata Oluştu Patron! ${pipelineProgress.message}`,
        mood: 'alert',
      });
      if (!isMuted) setIsSpeechVisible(true);
      return;
    }

    if (pipelineProgress?.step === 'downloading_youtube') {
      const tel = pipelineProgress.downloadTelemetry;
      const speed = tel?.speed ? ` • ${tel.speed}` : '';
      const size = tel?.downloadedSize && tel?.totalSize ? ` • ${tel.downloadedSize} / ${tel.totalSize}` : '';
      const eta = tel?.eta ? ` (Kalan: ${tel.eta})` : '';
      setCurrentSpeech({
        message: `📥 YouTube İndiriliyor (%${pipelineProgress.percent}): ${tel?.rawText || pipelineProgress.message}${speed}${size}${eta}`,
        mood: 'working',
      });
      if (!isMuted) setIsSpeechVisible(true);
      return;
    }

    if (pipelineProgress && pipelineProgress.percent > 0 && pipelineProgress.percent < 100) {
      setCurrentSpeech({
        message: `🎙️ Deşifre & Kurgu Devam Ediyor (%${pipelineProgress.percent}): ${pipelineProgress.message}`,
        mood: 'working',
      });
      if (!isMuted) setIsSpeechVisible(true);
      return;
    }

    if (autopilotState?.isBusy) {
      setCurrentSpeech({
        message: `🤖 [Otopilot ${autopilotState.activeAgent || 'Ekibi'}] ${autopilotState.currentAction}`,
        mood: 'working',
      });
      if (!isMuted) setIsSpeechVisible(true);
      return;
    }

    if (agencyMessages && agencyMessages.length > 0) {
      const last = agencyMessages[agencyMessages.length - 1];
      if (last) {
        setCurrentSpeech({
          message: `🏢 [${last.agentName}]: "${(last.content || '').slice(0, 75)}..."`,
          mood: 'excited',
        });
      }
    }
  }, [pipelineProgress, autopilotState, agencyMessages, isMuted]);

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
          const fallbackText = '⚡ Emredersin patron! Komutun başarıyla alındı ve ajans ajanlarına iletildi.';
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
    '🎯 Röportaj videosu en az 3milyon izlenmesi olsun bul hazır et',
    '⚡ Günlük 3 klip için otopilotu hemen başlat',
    '🏢 Ajans masasını aç ve toplantı başlat',
    '🤖 7/24 Otopilot radarına geç',
  ];

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
        {/* 1. Live Floating Speech Bubble (Only visible when NOT muted and NOT closed) */}
        {isSpeechVisible && !isMuted && !isOpen && (
          <div
            className="pointer-events-auto mb-3 max-w-xs sm:max-w-sm bg-[#0c0d16] border-2 border-brand-purple/70 text-white p-3.5 rounded-2xl rounded-br-sm shadow-2xl shadow-brand-purple/20 relative group cursor-pointer transition-colors hover:border-brand-purple subpixel-antialiased"
            onClick={() => setIsOpen(true)}
          >
            {/* Action buttons (Close 'X' + Mute Toggle) */}
            <div className="absolute -top-2.5 -right-2 flex items-center space-x-1 z-30 pointer-events-auto">
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

            <div className="flex items-start space-x-2.5">
              <div className="w-6 h-6 rounded-lg bg-brand-purple/20 text-brand-purple flex items-center justify-center shrink-0 mt-0.5 border border-brand-purple/30">
                {currentSpeech.mood === 'working' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-cyan" />
                ) : currentSpeech.mood === 'excited' ? (
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-brand-purple" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand-cyan flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                    NOVA • Baş Danışman
                  </span>
                  <span className="text-[9px] text-slate-400 font-semibold bg-dark-800 px-1.5 py-0.5 rounded">Tıkla & Konuş</span>
                </div>
                <p className="text-xs text-slate-100 font-medium leading-relaxed break-words">
                  {currentSpeech.message}
                </p>

                {(currentSpeech.mood === 'alert' || pipelineProgress?.step === 'error') && (
                  <button
                    type="button"
                    onClick={handleDismissError}
                    className="mt-2 w-full py-1 px-2.5 bg-rose-600/40 hover:bg-rose-600/70 border border-rose-500/50 rounded-lg text-rose-100 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-md"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-rose-300" />
                    <span>Hatayı Yoksay & Sıfırla</span>
                  </button>
                )}
              </div>
            </div>

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

          {/* Interactive Bot Avatar Head */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(!isOpen);
              if (!isMuted) setIsSpeechVisible(true);
            }}
            className={`relative group w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-2xl active:scale-95 ${
              isOpen
                ? 'bg-gradient-to-tr from-brand-purple to-purple-600 ring-4 ring-brand-purple/40 shadow-brand-purple/50 scale-105'
                : 'bg-gradient-to-tr from-dark-900 via-dark-850 to-brand-purple/30 border border-brand-purple/40 hover:border-brand-purple ring-2 ring-brand-purple/20 shadow-black/80 hover:scale-105'
            }`}
            title="Stüdyo Baş Danışmanı NOVA ile Konuş"
          >
            {/* Animated Holographic Outer Rings */}
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-brand-purple via-brand-cyan to-amber-500 opacity-40 group-hover:opacity-100 blur-sm transition-all duration-500 animate-pulse" />

            {/* Robot / Avatar Body */}
            <div className={`relative w-12 h-12 rounded-xl bg-dark-950 flex flex-col items-center justify-center overflow-hidden shadow-inner transition-colors ${
              isSpeakingVoice ? 'border-2 border-emerald-400 shadow-emerald-500/30' : 'border border-brand-purple/50'
            }`}>
              {/* Holographic Visor / Face */}
              <div className={`w-9 h-5 rounded-md bg-dark-900 flex items-center justify-center space-x-1.5 relative overflow-hidden transition-colors ${
                isSpeakingVoice ? 'border border-emerald-400/80 shadow-sm shadow-emerald-400/30' : 'border border-cyan-500/40'
              }`}>
                {/* Animated Eyes */}
                <div className={`w-1.5 h-2.5 rounded-full transition-colors ${
                  isSpeakingVoice ? 'bg-emerald-300 shadow-sm shadow-emerald-300 animate-bounce' : 'bg-brand-cyan shadow-sm shadow-brand-cyan animate-pulse'
                }`} />
                <div className={`w-1.5 h-2.5 rounded-full transition-colors ${
                  isSpeakingVoice ? 'bg-emerald-300 shadow-sm shadow-emerald-300 animate-bounce' : 'bg-brand-cyan shadow-sm shadow-brand-cyan animate-pulse'
                }`} />
                {/* Scanline reflection */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
              </div>

              {/* Speaking / Audio Equalizer Bars */}
              <div className="flex items-center space-x-0.5 mt-1">
                <span className={`w-1 rounded-full ${isSpeakingVoice ? 'bg-emerald-400 h-2.5 animate-pulse' : 'bg-brand-purple h-1.5 animate-bounce'}`} style={{ animationDelay: '0ms' }} />
                <span className={`w-1 rounded-full ${isSpeakingVoice ? 'bg-cyan-300 h-3 animate-pulse' : 'bg-brand-cyan h-2 animate-bounce'}`} style={{ animationDelay: '150ms' }} />
                <span className={`w-1 rounded-full ${isSpeakingVoice ? 'bg-emerald-400 h-2 animate-pulse' : 'bg-amber-400 h-1 animate-bounce'}`} style={{ animationDelay: '300ms' }} />
              </div>
            </div>

            {/* Status indicator badge */}
            <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-dark-950 flex items-center justify-center shadow-md ${
              isSpeakingVoice ? 'bg-emerald-400 ring-2 ring-emerald-400/50' : isMuted ? 'bg-amber-500' : 'bg-brand-cyan'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isSpeakingVoice ? 'bg-white animate-ping' : isMuted ? 'bg-amber-200' : 'bg-white'}`} />
            </span>
          </button>
        </div>

        {/* 3. Interactive Full Command Console / Chat Modal */}
        {isOpen && (
          <div className="pointer-events-auto fixed bottom-24 right-6 w-96 max-w-[calc(100vw-3rem)] h-[540px] max-h-[80vh] bg-dark-900/98 border border-brand-purple/40 rounded-3xl shadow-2xl shadow-black/95 flex flex-col overflow-hidden backdrop-blur-2xl z-50 animate-fadeIn">
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

            {/* Messages Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-dark-700">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                      m.sender === 'user'
                        ? 'bg-gradient-to-r from-brand-purple to-purple-600 text-white rounded-br-none shadow-md'
                        : 'bg-dark-850/90 border border-dark-700 text-slate-200 rounded-bl-none shadow-sm'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.text}</p>
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

            {/* Quick Action Suggestion Chips */}
            <div className="p-2.5 bg-dark-950/80 border-t border-dark-800 overflow-x-auto flex space-x-1.5 no-scrollbar">
              {quickPrompts.map((qp, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendCommand(qp)}
                  className="whitespace-nowrap px-2.5 py-1 rounded-xl bg-dark-850 hover:bg-brand-purple/20 border border-dark-750 hover:border-brand-purple/40 text-[10px] font-medium text-slate-300 hover:text-white transition-all flex items-center space-x-1 shrink-0"
                >
                  <Zap className="w-2.5 h-2.5 text-amber-400" />
                  <span>{qp}</span>
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
                placeholder="Patrona nasıl yardımcı olabilirim? (Örn: Röportaj videosu bul 3M+)..."
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
