import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Zap,
  Flame,
  Volume2,
  VolumeX,
  Maximize2,
  Send,
  Loader2,
  Building2,
  Film,
  Terminal,
  ChevronDown,
  ChevronUp,
  Settings,
  CheckCircle2,
  ShieldCheck,
  Play,
  Scissors,
  Eye,
  Type,
  Video
} from 'lucide-react';
import {
  CopilotSpeech,
  PipelineProgress,
  AutopilotState
} from '../types';
import { novaVoice } from '../utils/novaVoice';
import { NovaInteractiveAvatar } from './NovaInteractiveAvatar';

export const DesktopDock: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('autoclip_copilot_muted') === 'true';
    } catch {
      return false;
    }
  });

  const [isSpeakingVoice, setIsSpeakingVoice] = useState(false);
  const [currentSpeech, setCurrentSpeech] = useState<CopilotSpeech>({
    message: '👋 Selam patron! Masaüstü komuta adasındayım. Bir emrin var mı?',
    mood: 'idle',
  });
  const [pipelineProgress, setPipelineProgress] = useState<PipelineProgress | null>(null);
  const [autopilotState, setAutopilotState] = useState<AutopilotState | null>(null);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Subscribe to Nova Voice state
  useEffect(() => {
    return novaVoice.subscribe((speaking) => {
      setIsSpeakingVoice(speaking);
    });
  }, []);

  // Eye Animation States
  const [isBlinking, setIsBlinking] = useState(false);
  const [gazeDirection, setGazeDirection] = useState<'center' | 'left' | 'right'>('center');
  const collapseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInputFocusedRef = useRef(false);

  // Periodically blink eyes every 3.5 to 5.5 seconds
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 160);
    }, 4000);

    const gazeInterval = setInterval(() => {
      const dirs: ('center' | 'left' | 'right')[] = ['center', 'left', 'right', 'center'];
      const nextDir = dirs[Math.floor(Math.random() * dirs.length)];
      setGazeDirection(nextDir);
    }, 3200);

    return () => {
      clearInterval(blinkInterval);
      clearInterval(gazeInterval);
    };
  }, []);

  // Listen for IPC events
  useEffect(() => {
    if (window.electronAPI?.autopilotGetState) {
      window.electronAPI.autopilotGetState().then(setAutopilotState).catch(console.error);
    }

    const unregSpeech = window.electronAPI?.onCopilotSpeech?.((speech: CopilotSpeech) => {
      setCurrentSpeech(speech);
      if (!isMuted && speech.message) {
        novaVoice.speak(speech.message);
      }
    });

    const unregProgress = window.electronAPI?.onPipelineProgress?.((prog: PipelineProgress) => {
      setPipelineProgress(prog);
    });

    const unregAutopilot = window.electronAPI?.onAutopilotState?.((state: AutopilotState) => {
      setAutopilotState(state);
    });

    return () => {
      if (unregSpeech) unregSpeech();
      if (unregProgress) unregProgress();
      if (unregAutopilot) unregAutopilot();
    };
  }, [isMuted]);

  // Expand / Collapse Handlers with Window Resizing
  const handleSetExpanded = (expanded: boolean) => {
    setIsExpanded(expanded);
    if (window.electronAPI?.dockSetExpanded) {
      window.electronAPI.dockSetExpanded(expanded);
    }
  };

  const handleMouseEnter = () => {
    if (collapseTimeoutRef.current) {
      clearTimeout(collapseTimeoutRef.current);
      collapseTimeoutRef.current = null;
    }
    if (!isExpanded) {
      handleSetExpanded(true);
    }
  };

  const handleMouseLeave = () => {
    if (isInputFocusedRef.current) return;
    if (collapseTimeoutRef.current) clearTimeout(collapseTimeoutRef.current);
    collapseTimeoutRef.current = setTimeout(() => {
      handleSetExpanded(false);
    }, 700);
  };

  const toggleMute = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setIsMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('autoclip_copilot_muted', String(next));
      } catch {}
      novaVoice.setMuted(next);
      if (next) {
        novaVoice.cancel();
      }
      return next;
    });
  };

  const handleDismissError = async () => {
    setCurrentSpeech({ message: 'Patron, sistem sıfırlandı ve hazır. Yeni emirlerini bekliyorum!', mood: 'idle' });
    setPipelineProgress({ step: 'idle', percent: 0, message: '' });
    if (window.electronAPI?.resetPipelineProgress) {
      await window.electronAPI.resetPipelineProgress();
    }
  };

  const handleSendCommand = async () => {
    const text = inputPrompt.trim();
    if (!text || isSubmitting) return;

    setInputPrompt('');
    setIsSubmitting(true);
    try {
      if (window.electronAPI?.copilotSendCommand) {
        const result = await window.electronAPI.copilotSendCommand(text);
        if (result && result.text && !isMuted) {
          novaVoice.speak(result.text);
        }
      }
    } catch (e) {
      console.error('[DesktopDock] Command failed:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleAutopilot = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (autopilotState?.isRunning) {
        const next = await window.electronAPI?.autopilotStop?.();
        if (next) setAutopilotState(next);
      } else {
        const next = await window.electronAPI?.autopilotStart?.();
        if (next) setAutopilotState(next);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRunDailyBatch = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await window.electronAPI?.autopilotRunBatch?.(3);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenFeature = (feature: 'agency' | 'autopilot' | 'terminal' | 'new_video' | 'settings', e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (window.electronAPI?.dockOpenFeature) {
      window.electronAPI.dockOpenFeature(feature);
    }
  };

  const handleToggleMainWindow = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (window.electronAPI?.dockToggleMainWindow) {
      window.electronAPI.dockToggleMainWindow();
    }
  };

  const isBusy = (pipelineProgress && pipelineProgress.percent > 0 && pipelineProgress.percent < 100) || !!autopilotState?.isBusy;

  // Determine active pipeline stage step (1 to 5)
  const getActiveStepIndex = (): number => {
    if (autopilotState?.isBusy && autopilotState.activeProgress) {
      const idx = autopilotState.activeProgress.stepIndex;
      if (idx <= 2) return 1;
      if (idx === 3) return 2;
      if (idx === 4) return 3;
      if (idx === 5) return 4;
      if (idx >= 6) return 5;
    }
    if (pipelineProgress && pipelineProgress.step !== 'idle') {
      switch (pipelineProgress.step) {
        case 'downloading_youtube':
        case 'extracting_audio':
          return 1;
        case 'transcribing':
          return 2;
        case 'detecting_highlights':
          return 3;
        case 'rendering_clips':
          return 4;
        case 'completed':
          return 5;
        default:
          return 2;
      }
    }
    return 1;
  };

  const activeStep = getActiveStepIndex();
  const activePercent = Math.max(5, pipelineProgress?.percent || autopilotState?.activeProgress?.percent || 35);

  const activeStatusText = (() => {
    if (pipelineProgress?.step === 'downloading_youtube') {
      const tel = pipelineProgress.downloadTelemetry;
      const speed = tel?.speed ? ` • ${tel.speed}` : '';
      const size = tel?.downloadedSize && tel?.totalSize ? ` • ${tel.downloadedSize}/${tel.totalSize}` : '';
      const eta = tel?.eta ? ` • Kalan: ${tel.eta}` : '';
      return `📥 YouTube İndiriliyor: %${pipelineProgress.percent}${speed}${size}${eta}`;
    }
    if (pipelineProgress?.step === 'error' || pipelineProgress?.isError) {
      return `🚨 Hata Oluştu: ${pipelineProgress.message}`;
    }
    if (pipelineProgress && pipelineProgress.percent > 0 && pipelineProgress.percent < 100) {
      return `🎙️ Deşifre & Kurgu: %${pipelineProgress.percent} - ${pipelineProgress.message}`;
    }
    if (autopilotState?.isBusy) {
      return `🤖 [Otopilot: ${autopilotState.activeAgent || 'Ekibi'}] ${autopilotState.currentAction}`;
    }
    return currentSpeech.message;
  })();

  const liveNarration = (() => {
    if (pipelineProgress?.step === 'downloading_youtube') {
      const tel = pipelineProgress.downloadTelemetry;
      return `Patron, YouTube videosunu indiriyorum! ${tel?.speed ? 'Hız: ' + tel.speed : ''} ${tel?.downloadedSize && tel?.totalSize ? '• ' + tel.downloadedSize + ' / ' + tel.totalSize : ''} ${tel?.eta ? '(Kalan: ' + tel.eta + ')' : ''}`;
    }
    if (pipelineProgress?.step === 'error' || pipelineProgress?.isError) {
      return `Patron, YouTube indirme veya işlem sırasında bir hata oluştu: ${pipelineProgress.message}. Kırmızı alarm durumundayım!`;
    }
    if (activeStep === 1) return 'Patron, şu anda Creative Commons kaynak videosunu indiriyor ve ses akışını hazırlıyorum.';
    if (activeStep === 2) return 'Whisper AI devrede! Konuşmadaki tüm cümleleri kelime kelime milisaniyelik zaman damgalarıyla deşifre ediyorum.';
    if (activeStep === 3) return 'Ajans Masası CEO ve Trend analistleri kancaları inceliyor, izleyiciyi ilk 3 saniyede bağlayacak viral anları seçiyor.';
    if (activeStep === 4) return '1080x1920 dikey kadrajlama yapılıyor. Akıllı yüz takibi ile konuşmacıyı merkeze alıp sahneyi kırpıyorum.';
    if (activeStep === 5) return 'Son rötuşlar! TikTok dinamik kelime vurgulu altyazıları basılıyor ve kalite kontrol (QA) puanlaması yapılıyor.';
    return currentSpeech.message;
  })();

  const processStages = [
    { id: 1, title: 'Keşif & Kaynak', icon: Film },
    { id: 2, title: 'Whisper AI', icon: Zap },
    { id: 3, title: 'CEO Virallik', icon: Flame },
    { id: 4, title: '9:16 Kadraj', icon: Scissors },
    { id: 5, title: 'Altyazı & QA', icon: Sparkles },
  ];

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="w-full h-full flex items-center justify-center select-none text-slate-100 font-sans"
    >
      {!isExpanded ? (
        /* ======================================================== */
        /* 1. COLLAPSED COMPACT SOLID CAPSULE PILL                  */
        /* ======================================================== */
        <div
          onClick={() => handleSetExpanded(true)}
          className="w-full max-w-[420px] h-[48px] px-3.5 py-1.5 rounded-full bg-[#070814] border-2 border-brand-purple/80 hover:border-brand-purple shadow-[0_10px_35px_rgba(0,0,0,0.95)] flex items-center justify-between cursor-pointer transition-all duration-300 group"
        >
          {/* Left: Cyber Robot Head Visor with Eyes */}
          <div className="flex items-center space-x-2.5 shrink-0">
            <NovaInteractiveAvatar
              size="sm"
              externalMood={currentSpeech.mood}
              isBusy={isBusy}
              isSpeaking={isSpeakingVoice}
              enableVoiceReactions={!isMuted}
            />
            <span className="text-[11px] font-black tracking-wider text-brand-cyan flex items-center gap-1 uppercase">
              NOVA
              <span className={`w-1.5 h-1.5 rounded-full ${isBusy ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
            </span>
          </div>

          {/* Center: Live Marquee Status Text */}
          <div className="flex-1 mx-3 overflow-hidden text-center">
            <p className="text-[11px] text-slate-200 font-medium truncate group-hover:text-amber-300 transition-colors">
              {activeStatusText}
            </p>
          </div>

          {/* Right: Micro Actions */}
          <div className="flex items-center space-x-1.5 shrink-0">
            <button
              onClick={toggleMute}
              className={`p-1 rounded-full transition-colors ${
                isMuted ? 'text-rose-400 bg-rose-950/60' : 'text-slate-400 hover:text-white'
              }`}
              title={isMuted ? 'Sesi Aç' : 'Sessize Al'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
            <ChevronDown className="w-4 h-4 text-brand-purple group-hover:text-brand-cyan transition-colors" />
          </div>
        </div>
      ) : (
        /* ======================================================== */
        /* 2. EXPANDED SOLID STUDIO COMMAND ISLAND                  */
        /* ======================================================== */
        <div className="w-full max-w-[710px] h-[260px] p-4 rounded-3xl bg-[#070814] border-2 border-brand-purple/80 shadow-[0_15px_50px_rgba(0,0,0,0.98)] flex flex-col justify-between animate-fadeIn">
          
          {isBusy ? (
            /* ---------------------------------------------------- */
            /* CASE A: ACTIVE OPERATION -> SPLIT COCKPIT VIEW       */
            /* Left: Large Robot Face | Right: Process Flow Tree    */
            /* ---------------------------------------------------- */
            <div className="w-full h-full flex gap-4 items-stretch">
              
              {/* Left Side: Large Prominent Cyber Robot Face */}
              <div className="w-[185px] shrink-0 border-r border-dark-750/80 pr-4 flex flex-col items-center justify-center text-center bg-[#090a18] rounded-2xl p-2.5">
                <NovaInteractiveAvatar
                  size="xl"
                  externalMood={currentSpeech.mood}
                  isBusy={true}
                  isSpeaking={isSpeakingVoice}
                  enableVoiceReactions={!isMuted}
                />

                <div className="mt-2.5 space-y-1">
                  <h4 className="text-xs font-black text-white tracking-wider flex items-center justify-center gap-1">
                    <span>NOVA AI</span>
                  </h4>
                  {pipelineProgress?.step === 'error' || currentSpeech.mood === 'alert' ? (
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                      HATA OLUŞTU
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                      İŞLEMDE • %{activePercent}
                    </span>
                  )}
                </div>
              </div>

              {/* Right Side: Narration & 5-Step Process Flow Tree */}
              <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                
                {/* Header Row: Stage Name & Window Controls */}
                <div className="flex items-center justify-between pb-1 border-b border-dark-750">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] uppercase font-black tracking-widest text-brand-cyan">
                      İŞLEM SIRASI AĞACI
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      (Adım {activeStep}/5)
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    {(pipelineProgress?.step === 'error' || currentSpeech.mood === 'alert') && (
                      <button
                        type="button"
                        onClick={handleDismissError}
                        className="px-2 py-0.5 rounded-lg bg-rose-600/30 hover:bg-rose-600/60 border border-rose-500/50 text-[10px] font-bold text-rose-200 transition-colors flex items-center gap-1 shadow-sm"
                        title="Hatayı Yoksay ve Sistemi Sıfırla"
                      >
                        <ShieldCheck className="w-3 h-3 text-rose-400" />
                        <span>Hatayı Yoksay</span>
                      </button>
                    )}

                    <button
                      onClick={toggleMute}
                      className={`p-1 rounded-lg border text-xs transition-colors ${
                        isMuted ? 'bg-rose-950/80 border-rose-500/40 text-rose-300' : 'bg-dark-800 hover:bg-dark-750 text-slate-400 hover:text-white border-dark-750'
                      }`}
                      title={isMuted ? 'Sesi Aç' : 'Sessize Al'}
                    >
                      {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      onClick={handleToggleMainWindow}
                      className="p-1 rounded-lg bg-dark-800 hover:bg-dark-750 text-slate-300 hover:text-white border border-dark-750 text-xs transition-colors"
                      title="Ana Stüdyo Penceresini Öne Getir"
                    >
                      <Maximize2 className="w-3.5 h-3.5 text-brand-cyan" />
                    </button>

                    <button
                      onClick={() => handleSetExpanded(false)}
                      className="p-1 rounded-lg bg-dark-800 hover:bg-dark-750 text-slate-400 hover:text-white border border-dark-750 text-xs transition-colors"
                      title="Kapsüle Küçült"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Speech Narration Box from NOVA */}
                <div className={`p-2.5 rounded-xl border space-y-1 transition-colors ${
                  pipelineProgress?.step === 'error' || currentSpeech.mood === 'alert'
                    ? 'bg-rose-950/40 border-rose-500/40'
                    : 'bg-[#090a18] border-dark-750'
                }`}>
                  <div className="flex items-center justify-between text-[10px] font-bold text-amber-300">
                    <div className="flex items-center space-x-1.5">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>NOVA Anlatımı:</span>
                    </div>
                    {isSpeakingVoice && (
                      <span className="text-[9px] text-emerald-400 font-bold flex items-center gap-1 animate-pulse">
                        <Volume2 className="w-3 h-3" />
                        <span>Seslendiriliyor</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-100 leading-snug line-clamp-2">
                    “{liveNarration}”
                  </p>
                  {(pipelineProgress?.step === 'error' || currentSpeech.mood === 'alert') && (
                    <div className="pt-1 flex justify-end">
                      <button
                        type="button"
                        onClick={handleDismissError}
                        className="px-2.5 py-0.5 rounded-lg bg-rose-600/40 hover:bg-rose-600/70 border border-rose-400/50 text-[10px] font-bold text-rose-100 transition-all flex items-center gap-1 shadow-sm"
                      >
                        <ShieldCheck className="w-3 h-3 text-rose-300" />
                        <span>Hatayı Yoksay ve Sıfırla</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Visual Process Flow Tree (Connected 5-Step Pipeline) */}
                <div className="space-y-1.5">
                  <div className="relative flex items-center justify-between px-2 pt-1">
                    {/* Connecting Background Line */}
                    <div className="absolute top-[18px] left-6 right-6 h-0.5 bg-dark-750 -z-0" />
                    <div
                      className="absolute top-[18px] left-6 h-0.5 bg-gradient-to-r from-emerald-500 via-brand-purple to-brand-cyan -z-0 transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, ((activeStep - 1) / 4) * 100))}%` }}
                    />

                    {processStages.map((stage) => {
                      const isPast = stage.id < activeStep;
                      const isCurrent = stage.id === activeStep;
                      const isUpcoming = stage.id > activeStep;
                      const StageIcon = stage.icon;

                      return (
                        <div key={stage.id} className="flex flex-col items-center relative z-10">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all ${
                              isPast
                                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-400 shadow-md shadow-emerald-500/20'
                                : isCurrent
                                ? 'bg-amber-500/20 border-amber-400 text-amber-300 animate-pulse shadow-md shadow-amber-500/30 ring-2 ring-amber-400/30'
                                : 'bg-[#080914] border-dark-700 text-slate-500'
                            }`}
                          >
                            {isPast ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : isCurrent ? (
                              <StageIcon className="w-3.5 h-3.5" />
                            ) : (
                              <span className="text-[10px] font-mono font-bold">{stage.id}</span>
                            )}
                          </div>
                          <span
                            className={`text-[9px] font-bold mt-1 text-center transition-colors truncate max-w-[65px] ${
                              isCurrent
                                ? 'text-amber-300 font-extrabold'
                                : isPast
                                ? 'text-emerald-400'
                                : 'text-slate-500'
                            }`}
                          >
                            {stage.title}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Tiny Progress Bar */}
                  <div className="w-full bg-[#080914] rounded-full h-1.5 overflow-hidden border border-dark-750">
                    <div
                      className="bg-gradient-to-r from-emerald-500 via-brand-purple to-brand-cyan h-full rounded-full transition-all duration-300"
                      style={{ width: `${activePercent}%` }}
                    />
                  </div>
                </div>

              </div>
            </div>
          ) : (
            /* ---------------------------------------------------- */
            /* CASE B: IDLE STATE -> SLEEK COMMAND CENTER DOCK      */
            /* ---------------------------------------------------- */
            <>
              {/* Top Bar: Identity, Visor Eyes & Controls */}
              <div className="flex items-center justify-between border-b border-dark-750 pb-2">
                <div className="flex items-center space-x-3">
                  <NovaInteractiveAvatar
                    size="md"
                    externalMood={currentSpeech.mood}
                    isBusy={false}
                    isSpeaking={isSpeakingVoice}
                    enableVoiceReactions={!isMuted}
                  />
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-xs font-black text-white tracking-wide flex items-center gap-1.5">
                        <span>NOVA</span>
                        <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          WINDOWS DOCKER
                        </span>
                      </h3>
                      <span className="text-[10px] text-slate-400">• Baş Danışman & War Room Şefi</span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate max-w-sm">
                      Masaüstü tam yetkili otonom yapay zeka kontrolü
                    </p>
                  </div>
                </div>

                {/* Quick Window & Mute Actions */}
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={toggleMute}
                    className={`p-1.5 rounded-lg border text-xs transition-colors ${
                      isMuted ? 'bg-rose-950/80 border-rose-500/40 text-rose-300' : 'bg-dark-800 hover:bg-dark-750 text-slate-400 hover:text-white border-dark-750'
                    }`}
                    title={isMuted ? 'Sesi Aç' : 'Sessize Al'}
                  >
                    {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={handleToggleMainWindow}
                    className="p-1.5 rounded-lg bg-dark-800 hover:bg-dark-750 text-slate-300 hover:text-white border border-dark-750 text-xs transition-colors flex items-center gap-1"
                    title="Ana AutoClip Studio Uygulamasını Öne Getir / Küçült"
                  >
                    <Maximize2 className="w-3.5 h-3.5 text-brand-cyan" />
                  </button>

                  <button
                    onClick={() => handleSetExpanded(false)}
                    className="p-1.5 rounded-lg bg-dark-800 hover:bg-dark-750 text-slate-400 hover:text-white border border-dark-750 text-xs transition-colors"
                    title="Kapsüle Küçült"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Live Message / Speech Box */}
              <div className="my-1 px-3 py-2 rounded-xl bg-[#090a18] border border-dark-750 flex items-start space-x-2">
                <span className="text-amber-400 font-serif text-sm leading-none mt-0.5">“</span>
                <div className="flex-1 min-w-0">
                  {isSpeakingVoice && (
                    <div className="flex items-center space-x-1.5 text-[9px] text-emerald-400 font-bold mb-0.5 animate-pulse">
                      <Volume2 className="w-3 h-3 text-emerald-400" />
                      <span>NOVA SESLİ YANIT VERİYOR...</span>
                    </div>
                  )}
                  <p className="text-xs text-slate-100 leading-snug line-clamp-2">
                    {currentSpeech.message}
                  </p>
                </div>
              </div>

              {/* Quick Operations Button Matrix */}
              <div className="grid grid-cols-6 gap-1.5 mb-1.5">
                {/* 1. Dedicated New Video Production Button */}
                <button
                  onClick={(e) => handleOpenFeature('new_video', e)}
                  className="px-2 py-1.5 rounded-xl bg-gradient-to-r from-brand-purple to-brand-cyan hover:from-purple-600 hover:to-cyan-600 text-white text-[11px] font-bold transition-all flex items-center justify-center space-x-1 shadow-md shadow-brand-purple/20 col-span-2"
                  title="YouTube Creative Commons ağını otomatik tarar, en viral videoyu bulur ve 13 ajanlı ajans masasında kurgular"
                >
                  <Film className="w-3.5 h-3.5 text-white" />
                  <span className="truncate">🎬 Yeni Video Üret</span>
                </button>

                {/* 2. 7/24 Autopilot Toggle */}
                <button
                  onClick={handleToggleAutopilot}
                  className={`px-2 py-1.5 rounded-xl border text-[11px] font-bold transition-all flex items-center justify-center space-x-1 shadow-sm ${
                    autopilotState?.isRunning
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                      : 'bg-[#090a18] hover:bg-dark-800 text-slate-300 border-dark-750'
                  }`}
                  title="7/24 Otopilot Otonom Motorunu Aç/Kapat"
                >
                  <span className={`w-2 h-2 rounded-full ${autopilotState?.isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                  <span className="truncate">{autopilotState?.isRunning ? '7/24 Aktif' : 'Otopilot'}</span>
                </button>

                {/* 3. Run Daily Batch */}
                <button
                  onClick={handleRunDailyBatch}
                  disabled={isBusy}
                  className="px-2 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 text-[11px] font-bold transition-all flex items-center justify-center space-x-1 disabled:opacity-40"
                  title="Günün 3 altın saati için 3 farklı video üretir"
                >
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span className="truncate">3 Klip</span>
                </button>

                {/* 4. Open Agency Room */}
                <button
                  onClick={(e) => handleOpenFeature('agency', e)}
                  className="px-2 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 text-[11px] font-bold transition-all flex items-center justify-center space-x-1"
                  title="12 Ajanlı 2D Sanal Ajans Masasını Açar"
                >
                  <Building2 className="w-3.5 h-3.5 text-purple-400" />
                  <span className="truncate">Ajans</span>
                </button>

                {/* 5. Open Settings */}
                <button
                  onClick={(e) => handleOpenFeature('settings', e)}
                  className="px-2 py-1.5 rounded-xl bg-[#090a18] hover:bg-dark-800 border border-dark-750 text-slate-300 hover:text-white text-[11px] font-bold transition-all flex items-center justify-center space-x-1"
                  title="Stüdyo ve Sistem Ayarlarını Açar"
                >
                  <Settings className="w-3.5 h-3.5 text-brand-cyan" />
                  <span className="truncate">Ayarlar</span>
                </button>
              </div>

              {/* Micro Command Input Bar */}
              <div className="flex items-center space-x-1.5 bg-[#090a18] border border-dark-750 rounded-xl px-2.5 py-1">
                <input
                  type="text"
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  onFocus={() => { isInputFocusedRef.current = true; }}
                  onBlur={() => { isInputFocusedRef.current = false; }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendCommand();
                  }}
                  placeholder="NOVA'ya komut ver (Örn: Röportaj bul 3M+)..."
                  disabled={isSubmitting}
                  className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
                />
                <button
                  onClick={handleSendCommand}
                  disabled={!inputPrompt.trim() || isSubmitting}
                  className="p-1 rounded-lg bg-brand-purple hover:bg-purple-600 disabled:opacity-40 text-white transition-colors"
                >
                  {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                </button>
              </div>
            </>
          )}

        </div>
      )}
    </div>
  );
};

/**
 * Animated Cyber Robot Visor & Interactive OLED Eyes Component
 */
interface RobotVisorProps {
  mood?: 'idle' | 'working' | 'excited' | 'alert' | 'success';
  isBlinking: boolean;
  gazeDirection: 'center' | 'left' | 'right';
  isBusy: boolean;
  isSpeaking?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const RobotVisor: React.FC<RobotVisorProps> = ({
  mood = 'idle',
  isBlinking,
  gazeDirection,
  isBusy,
  isSpeaking = false,
  size = 'md',
}) => {
  const isSm = size === 'sm';
  const isLg = size === 'lg';
  const isAlert = mood === 'alert';
  const isVoiceActive = isBusy || isSpeaking;

  // Pupil horizontal offset based on gaze direction
  const pupilTranslateX = gazeDirection === 'left' ? '-3px' : gazeDirection === 'right' ? '3px' : '0px';

  const eyeColorClass = isAlert
    ? 'bg-rose-500 shadow-sm shadow-rose-500 animate-pulse'
    : isSpeaking
    ? 'bg-emerald-400 shadow-md shadow-emerald-400 animate-pulse'
    : 'bg-brand-cyan shadow-sm shadow-brand-cyan';

  return (
    <div
      className={`relative rounded-2xl bg-[#040409] flex flex-col items-center justify-center overflow-hidden shadow-inner shrink-0 transition-all ${
        isAlert
          ? 'border-2 border-rose-500 shadow-lg shadow-rose-500/40 animate-pulse'
          : isSpeaking
          ? 'border-2 border-emerald-400/80 shadow-lg shadow-emerald-500/30 ring-1 ring-emerald-400/40'
          : 'border border-brand-purple/60'
      } ${
        isSm ? 'w-8 h-8 rounded-xl' : isLg ? 'w-28 h-28 border-2 border-brand-purple' : 'w-11 h-11'
      }`}
    >
      {/* Outer ambient glow */}
      <div
        className={`absolute inset-0 pointer-events-none transition-opacity ${
          isAlert
            ? 'bg-rose-500/30 animate-pulse opacity-90'
            : isSpeaking
            ? 'bg-emerald-500/20 animate-pulse opacity-90'
            : 'bg-gradient-to-tr from-brand-purple/30 via-brand-cyan/20 to-amber-500/20 opacity-60'
        }`}
      />

      {/* OLED Visor Screen */}
      <div
        className={`relative rounded-xl bg-black flex items-center justify-center space-x-1.5 overflow-hidden shadow-sm transition-colors ${
          isAlert
            ? 'border-2 border-rose-500 shadow-md shadow-rose-500/50'
            : isSpeaking
            ? 'border-2 border-emerald-400/80 shadow-md shadow-emerald-500/40'
            : 'border border-cyan-500/50'
        } ${
          isSm ? 'w-6 h-4 rounded-md space-x-1' : isLg ? 'w-20 h-12 rounded-xl space-x-2.5 border-2 border-cyan-400/80 shadow-lg shadow-cyan-500/20' : 'w-8 h-5'
        }`}
      >
        {/* Animated Robot Left Eye */}
        <div
          className={`rounded-full transition-all duration-150 flex items-center justify-center ${eyeColorClass} ${
            isSm ? 'w-1.5' : isLg ? 'w-4' : 'w-2'
          }`}
          style={{
            height: isBlinking ? '2px' : (mood === 'excited' || isSpeaking) ? (isLg ? '6px' : '3px') : isSm ? '8px' : isLg ? '22px' : '10px',
            borderRadius: (mood === 'excited' || isSpeaking) ? '4px 4px 0 0' : '9999px',
            transform: `translateX(${pupilTranslateX})`,
          }}
        >
          {/* Inner bright pupil */}
          {!isBlinking && (
            <span className={`bg-white rounded-full opacity-90 ${isLg ? 'w-1.5 h-2.5' : 'w-0.5 h-1'}`} />
          )}
        </div>

        {/* Animated Robot Right Eye */}
        <div
          className={`rounded-full transition-all duration-150 flex items-center justify-center ${eyeColorClass} ${
            isSm ? 'w-1.5' : isLg ? 'w-4' : 'w-2'
          }`}
          style={{
            height: isBlinking ? '2px' : (mood === 'excited' || isSpeaking) ? (isLg ? '6px' : '3px') : isSm ? '8px' : isLg ? '22px' : '10px',
            borderRadius: (mood === 'excited' || isSpeaking) ? '4px 4px 0 0' : '9999px',
            transform: `translateX(${pupilTranslateX})`,
          }}
        >
          {!isBlinking && (
            <span className={`bg-white rounded-full opacity-90 ${isLg ? 'w-1.5 h-2.5' : 'w-0.5 h-1'}`} />
          )}
        </div>

        {/* Laser Scanning Line when busy or alert */}
        {(isBusy || isAlert || isSpeaking) && (
          <div
            className={`absolute inset-x-0 h-0.5 bg-gradient-to-r animate-pulse ${
              isAlert
                ? 'from-transparent via-rose-400 to-transparent'
                : isSpeaking
                ? 'from-transparent via-emerald-300 to-transparent'
                : 'from-transparent via-cyan-300 to-transparent'
            }`}
          />
        )}

        {/* Scanline reflection overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
      </div>

      {/* Audio Wave Visualizer Bars */}
      {!isSm && (
        <div className="flex items-center space-x-1 mt-1.5">
          <span className={`w-0.5 rounded-full ${isVoiceActive ? 'bg-emerald-400 animate-bounce h-3' : 'bg-brand-purple h-1'}`} style={{ animationDelay: '0ms' }} />
          <span className={`w-0.5 rounded-full ${isVoiceActive ? 'bg-brand-cyan animate-bounce h-4.5' : 'bg-brand-cyan h-1.5'}`} style={{ animationDelay: '150ms' }} />
          <span className={`w-0.5 rounded-full ${isVoiceActive ? 'bg-amber-400 animate-bounce h-3.5' : 'bg-amber-400 h-1'}`} style={{ animationDelay: '300ms' }} />
          {isLg && (
            <>
              <span className={`w-0.5 rounded-full ${isVoiceActive ? 'bg-emerald-400 animate-bounce h-4' : 'bg-emerald-400 h-1.5'}`} style={{ animationDelay: '200ms' }} />
              <span className={`w-0.5 rounded-full ${isVoiceActive ? 'bg-brand-purple animate-bounce h-2.5' : 'bg-brand-purple h-1'}`} style={{ animationDelay: '400ms' }} />
            </>
          )}
        </div>
      )}
    </div>
  );
};
