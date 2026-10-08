import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Video,
  MessageSquare,
  Cpu,
  Bot,
  User,
  AlertCircle,
  Clock,
  Radio,
  SlidersHorizontal,
  Activity
} from 'lucide-react';
import {
  CopilotSpeech,
  CopilotMessage,
  CopilotSpeechAction,
  PipelineProgress,
  AutopilotState,
  BrandSafetyConfig,
  DockerSizeConfig,
  DEFAULT_DOCKER_SIZE_CONFIG
} from '../types';
import { novaVoice } from '../utils/novaVoice';
import { NovaInteractiveAvatar } from './NovaInteractiveAvatar';

export const DesktopDock: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'cockpit' | 'chat'>('cockpit');
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('autoclip_copilot_muted') === 'true';
    } catch {
      return false;
    }
  });

  // Docker dynamic sizing configuration from Settings
  const [dockerSize, setDockerSize] = useState<DockerSizeConfig>(() => {
    try {
      const raw = localStorage.getItem('autoclip_docker_size_config');
      if (raw) return { ...DEFAULT_DOCKER_SIZE_CONFIG, ...JSON.parse(raw) };
    } catch {}
    return DEFAULT_DOCKER_SIZE_CONFIG;
  });

  // User custom dragged floating position for idle robot
  const [idlePos] = useState<{ x?: number; y?: number }>(() => {
    try {
      const saved = localStorage.getItem('autoclip_nova_idle_pos');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });
  const idlePosRef = useRef<{ x?: number; y?: number }>(idlePos);

  const [isSpeakingVoice, setIsSpeakingVoice] = useState(false);
  const [currentSpeech, setCurrentSpeech] = useState<CopilotSpeech>({
    message: '👋 Selam patron! Masaüstü komuta adasındayım. Bir emrin var mı?',
    mood: 'idle',
  });
  const [pipelineProgress, setPipelineProgress] = useState<PipelineProgress | null>(null);
  const [autopilotState, setAutopilotState] = useState<AutopilotState | null>(null);
  const [apSettings, setApSettings] = useState<any>(null);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStartingMeeting, setIsStartingMeeting] = useState(false);

  // Chat message stream
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'init_welcome',
      sender: 'assistant',
      text: 'Selam patron! Ben AutoClip AI Stüdyo Baş Danışmanın NOVA. YouTube Creative Commons avcısı, 14 ajanlı Ajans Masası ve 7/24 Otopilot emrinde. Bana dilediğin komutu verebilirsin!',
      timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      status: 'done',
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const collapseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInputFocusedRef = useRef(false);

  // Subscribe to Nova Voice speech activity
  useEffect(() => {
    return novaVoice.subscribe((speaking) => {
      setIsSpeakingVoice(speaking);
    });
  }, []);

  // Fetch real settings for dynamic Brand Safety reflection
  const fetchSettings = () => {
    if (window.electronAPI?.autopilotGetSettings) {
      window.electronAPI.autopilotGetSettings().then(setApSettings).catch(console.error);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [isExpanded]);

  // Compute actual active brand safety rules from real configuration
  const activeSafetyText = useMemo(() => {
    const cfg: BrandSafetyConfig | undefined = apSettings?.brandSafetyConfig;
    if (!cfg) return 'Standart Koruma';
    const active: string[] = [];
    if (cfg.blockPolitical) active.push('Siyasi');
    if (cfg.blockTerrorAndSeparatist) active.push('Terör/Bölücü');
    if (cfg.blockAdultAndNSFW) active.push('+18');
    if (cfg.blockViolenceAndGore) active.push('Şiddet');
    if (cfg.blockSchoolAndLectures) active.push('Ders/Eğitim');
    if (cfg.blockCommercialMCNs) active.push('MCN/Müzik');
    if (cfg.customBlacklistWords && cfg.customBlacklistWords.length > 0) {
      active.push(`+${cfg.customBlacklistWords.length} Özel Kelime`);
    }

    if (active.length === 0) return 'Tüm Filtreler Kapalı (Serbest)';
    return `${active.join(' • ')} Aktif`;
  }, [apSettings?.brandSafetyConfig]);

  const isBusy = (pipelineProgress && pipelineProgress.percent > 0 && pipelineProgress.percent < 100) ||
    !!autopilotState?.isBusy ||
    isStartingMeeting;

  // Listen for dynamic size config changes from Settings Modal
  useEffect(() => {
    const handleSizeUpdated = (e: any) => {
      if (e.detail) {
        setDockerSize(e.detail);
      } else {
        try {
          const raw = localStorage.getItem('autoclip_docker_size_config');
          if (raw) setDockerSize({ ...DEFAULT_DOCKER_SIZE_CONFIG, ...JSON.parse(raw) });
        } catch {}
      }
    };
    window.addEventListener('autoclip_docker_size_updated', handleSizeUpdated);
    return () => window.removeEventListener('autoclip_docker_size_updated', handleSizeUpdated);
  }, []);

  // Robust window resizing helper that synchronizes with Electron main process
  const updateWindowDimensions = async (
    expanded: boolean,
    tab: 'cockpit' | 'chat',
    busy: boolean,
    sizeCfg: DockerSizeConfig
  ) => {
    let targetWidth = sizeCfg.botSize + 16;
    let targetHeight = sizeCfg.botSize + 16;
    let targetX: number | undefined = undefined;
    let targetY: number | undefined = undefined;

    if (!expanded) {
      if (busy) {
        targetWidth = sizeCfg.dockWidth;
        targetHeight = sizeCfg.dockHeight;
        // Snap to top-center!
        targetX = undefined;
        targetY = 10;
      } else {
        targetWidth = sizeCfg.botSize + 16;
        targetHeight = sizeCfg.botSize + 16;
        // Restore custom dragged floating position if user moved Nova!
        if (idlePosRef.current.x !== undefined && idlePosRef.current.y !== undefined) {
          targetX = idlePosRef.current.x;
          targetY = idlePosRef.current.y;
        } else {
          targetX = undefined;
          targetY = 10;
        }
      }
    } else {
      targetWidth = sizeCfg.panelWidth;
      targetHeight = tab === 'cockpit' ? sizeCfg.panelHeight : 520;
      // Snap to top-center!
      targetX = undefined;
      targetY = 10;
    }

    if (window.electronAPI?.dockSetSize) {
      try {
        await window.electronAPI.dockSetSize({
          width: targetWidth,
          height: targetHeight,
          x: targetX,
          y: targetY,
        });
      } catch (err) {
        console.warn('[DesktopDock] dockSetSize error:', err);
      }
    }

    if (window.electronAPI?.dockSetExpanded) {
      try {
        await window.electronAPI.dockSetExpanded({
          isExpanded: expanded,
          width: targetWidth,
          height: targetHeight,
          x: targetX,
          y: targetY,
        });
      } catch (err) {
        console.warn('[DesktopDock] dockSetExpanded error:', err);
      }
    }
  };

  // Synchronize window size whenever isExpanded, activeTab, isBusy or dockerSize changes
  useEffect(() => {
    updateWindowDimensions(isExpanded, activeTab, isBusy, dockerSize);
  }, [isExpanded, activeTab, isBusy, dockerSize]);

  // Mouse drag & drop state for idle floating robot
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ screenX: 0, screenY: 0, winX: 0, winY: 0 });
  const hasMovedRef = useRef(false);

  const handleIdleBotMouseDown = async (e: React.MouseEvent) => {
    // Left click only for dragging and poking
    if (e.button !== 0) return;

    e.preventDefault();
    e.stopPropagation();

    hasMovedRef.current = false;
    isDraggingRef.current = true;
    dragStartRef.current.screenX = e.screenX;
    dragStartRef.current.screenY = e.screenY;

    let initialX = 0;
    let initialY = 0;
    if (window.electronAPI?.dockGetBounds) {
      try {
        const bounds = await window.electronAPI.dockGetBounds();
        if (bounds) {
          initialX = bounds.x;
          initialY = bounds.y;
        }
      } catch {}
    }
    dragStartRef.current.winX = initialX;
    dragStartRef.current.winY = initialY;

    const handleMouseMove = (moveEvt: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = moveEvt.screenX - dragStartRef.current.screenX;
      const dy = moveEvt.screenY - dragStartRef.current.screenY;

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        hasMovedRef.current = true;
      }

      if (hasMovedRef.current && window.electronAPI?.dockMove) {
        const newX = Math.round(dragStartRef.current.winX + dx);
        const newY = Math.round(dragStartRef.current.winY + dy);
        window.electronAPI.dockMove({ x: newX, y: newY });
        idlePosRef.current = { x: newX, y: newY };
        try {
          localStorage.setItem('autoclip_nova_idle_pos', JSON.stringify({ x: newX, y: newY }));
        } catch {}
      }
    };

    const handleMouseUp = (_upEvt: MouseEvent) => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      // If mouse moved <= 3px, it was a clean LEFT CLICK: poke & speak reaction!
      if (!hasMovedRef.current) {
        handleIdleBotPoke();
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleIdleBotPoke = () => {
    if (!isMuted) {
      const lines = [
        'Efendim patron? Bir klip mi patlatıyoruz?',
        'Buradayım patron! Kurgu ve keşif emrindeyim.',
        'AutoClip Stüdyo hazır patron! 14 ajan masada.',
        'Gözüm YouTube akışında patron, harika videolar bulacağız!',
        'Selam patron! Bugün Shorts akışını sallamaya hazır mıyız?',
        'Sistemler tam güç devrede patron!',
      ];
      const randomLine = lines[Math.floor(Math.random() * lines.length)];
      novaVoice.speak(randomLine);
      setCurrentSpeech({
        message: randomLine,
        mood: 'excited',
      });
      setTimeout(() => {
        setCurrentSpeech((prev) => ({ ...prev, mood: 'idle' }));
      }, 2500);
    }
  };

  const handleIdleBotContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // SAĞ TIK: Komuta kokpitini aç!
    handleSetExpanded(true, 'cockpit');
  };

  // Expand / Collapse Handlers
  const handleSetExpanded = (expanded: boolean, tab?: 'cockpit' | 'chat') => {
    if (tab) setActiveTab(tab);
    setIsExpanded(expanded);
  };

  const handleTabChange = (tab: 'cockpit' | 'chat') => {
    setActiveTab(tab);
    if (!isExpanded) setIsExpanded(true);
  };

  const handleMouseEnter = () => {
    if (collapseTimeoutRef.current) {
      clearTimeout(collapseTimeoutRef.current);
      collapseTimeoutRef.current = null;
    }
  };

  const handleMouseLeave = () => {
    if (isInputFocusedRef.current || activeTab === 'chat') return;
    if (collapseTimeoutRef.current) clearTimeout(collapseTimeoutRef.current);
    collapseTimeoutRef.current = setTimeout(() => {
      handleSetExpanded(false);
    }, 2500);
  };

  // Scroll chat to bottom on new messages
  useEffect(() => {
    if (activeTab === 'chat' && isExpanded) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab, isExpanded]);

  // Listen for IPC events
  useEffect(() => {
    if (window.electronAPI?.autopilotGetState) {
      window.electronAPI.autopilotGetState().then(setAutopilotState).catch(console.error);
    }

    if (window.electronAPI?.copilotGetMessages) {
      window.electronAPI.copilotGetMessages().then((msgs: any) => {
        if (Array.isArray(msgs) && msgs.length > 0) {
          setMessages(msgs);
        }
      }).catch(console.error);
    }

    const unregSpeech = window.electronAPI?.onCopilotSpeech?.((speech: CopilotSpeech) => {
      setCurrentSpeech(speech);
      if (!isMuted && speech.message) {
        novaVoice.speak(speech.message);
      }
    });

    const unregMessage = window.electronAPI?.onCopilotMessage?.((msg: CopilotMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    const unregProgress = window.electronAPI?.onPipelineProgress?.((prog: PipelineProgress) => {
      setPipelineProgress(prog);
    });

    const unregAutopilot = window.electronAPI?.onAutopilotState?.((state: AutopilotState) => {
      setAutopilotState(state);
    });

    const unregMeetingState = window.electronAPI?.onAgencyMeetingState?.((st: any) => {
      if (st) {
        setIsStartingMeeting(!!st.isRunning);
      }
    });

    const unregAgencyProg = window.electronAPI?.onAgencyProgress?.((p: any) => {
      if (p) {
        if (p.percent < 100) {
          setIsStartingMeeting(true);
        } else {
          setIsStartingMeeting(false);
        }
      }
    });

    return () => {
      if (unregSpeech) unregSpeech();
      if (unregMessage) unregMessage();
      if (unregProgress) unregProgress();
      if (unregAutopilot) unregAutopilot();
      if (unregMeetingState) unregMeetingState();
      if (unregAgencyProg) unregAgencyProg();
    };
  }, [isMuted]);

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

  const handleSendCommand = async (customText?: string) => {
    const text = (customText || inputPrompt).trim();
    if (!text || isSubmitting) return;

    setInputPrompt('');
    setIsSubmitting(true);

    const userMsg: CopilotMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      if (window.electronAPI?.copilotSendCommand) {
        const result = await window.electronAPI.copilotSendCommand(text);
        if (result) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === result.id)) return prev;
            return [...prev, result];
          });
          if (result.text && !isMuted) {
            novaVoice.speak(result.text);
          }
        }
      }
    } catch (e: any) {
      console.error('[DesktopDock] Command failed:', e);
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

  const handleToggleAutopilot = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
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

  const handleOpenFeature = (feature: 'agency' | 'autopilot' | 'terminal' | 'new_video' | 'settings' | 'pitches', e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (window.electronAPI?.dockOpenFeature) {
      window.electronAPI.dockOpenFeature(feature);
    }
  };

  const handleExecuteAction = (action?: CopilotSpeechAction, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!action) return;
    if (action.action === 'open_pitches') {
      handleOpenFeature('pitches');
    } else if (action.action === 'open_agency') {
      handleOpenFeature('agency');
    } else if (action.action === 'open_autopilot') {
      handleOpenFeature('autopilot');
    } else if (action.action === 'open_settings') {
      handleOpenFeature('settings');
    } else if (action.action === 'start_meeting') {
      handleStartMeeting();
    }
    if (window.electronAPI?.copilotTriggerAction) {
      window.electronAPI.copilotTriggerAction(action);
    }
  };

  const handleToggleMainWindow = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (window.electronAPI?.dockToggleMainWindow) {
      window.electronAPI.dockToggleMainWindow();
    }
  };

  // 🎙️ 1-Click Discovery Meeting Trigger with immediate audio, visual feedback & War Room activation
  const handleStartMeeting = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isStartingMeeting) return;

    setIsStartingMeeting(true);

    // 1. Give instant high-priority audio & speech notification
    const speechMsg = '🚀 14 Ajanlı Stratejik Keşif Toplantısı başlatıldı patron! Scout, Trend Hunter ve Sentinel masada YouTube ağını tarıyor...';
    setCurrentSpeech({
      message: speechMsg,
      mood: 'excited',
    });
    if (!isMuted) {
      novaVoice.speak(speechMsg);
    }

    // 2. Open the Agency Room / War Room in the main studio window
    handleOpenFeature('agency');

    // 3. Trigger strategic discovery meeting IPC
    try {
      if (window.electronAPI?.startDiscoveryMeeting) {
        await window.electronAPI.startDiscoveryMeeting();
      }
    } catch (err: any) {
      console.error('Meeting failed to start:', err);
      setCurrentSpeech({
        message: `⚠️ Toplantı sırasında sorun: ${err.message}`,
        mood: 'alert',
      });
    } finally {
      setIsStartingMeeting(false);
    }
  };

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
  const activePercent = Math.max(5, pipelineProgress?.percent || autopilotState?.activeProgress?.percent || (isStartingMeeting ? 45 : 35));

  const activeStatusText = (() => {
    if (isStartingMeeting) {
      return '🎙️ 14 Ajan Toplantıda: YouTube Creative Commons taranıyor...';
    }
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
    if (isStartingMeeting) {
      return 'Patron, 14 uzman ajan masada toplandı! Scout Gemma telifsiz kaynakları, Sentinel kanal güvenliğini ve Hook Master viralliği analiz ediyor.';
    }
    if (pipelineProgress?.step === 'downloading_youtube') {
      const tel = pipelineProgress.downloadTelemetry;
      return `Patron, YouTube videosunu indiriyorum! ${tel?.speed ? 'Hız: ' + tel.speed : ''} ${tel?.downloadedSize && tel?.totalSize ? '• ' + tel.downloadedSize + ' / ' + tel.totalSize : ''} ${tel?.eta ? '(Kalan: ' + tel.eta + ')' : ''}`;
    }
    if (pipelineProgress?.step === 'error' || pipelineProgress?.isError) {
      return `Patron, işlem sırasında bir hata oluştu: ${pipelineProgress.message}. Kırmızı alarm durumundayım!`;
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

  const quickPrompts = [
    { label: '🚀 Toplantı Başlat', cmd: 'toplantı başlat' },
    { label: '🎯 Viral Adaylar', cmd: 'viral adayları göster' },
    { label: '🎬 Video Bul (3M+)', cmd: 'röportaj videosu bul en az 3milyon izlenmesi olsun' },
    { label: '⚡ Otopilot Paneli', cmd: 'otopilot panelini aç' },
    { label: '📊 Durum Raporu', cmd: 'stüdyo durum raporu ver' },
    { label: '⚙️ Güvenlik & Ayarlar', cmd: 'ayarları ve kanal güvenliğini aç' },
  ];

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="w-full h-full flex flex-col items-center justify-start select-none text-slate-100 font-sans overflow-hidden box-border"
    >
      {!isExpanded ? (
        !isBusy ? (
          /* ======================================================== */
          /* 1A. IDLE STATE: FLOATING SLEEK NOVA BOT AVATAR           */
          /* ======================================================== */
          <div
            onMouseDown={handleIdleBotMouseDown}
            onContextMenu={handleIdleBotContextMenu}
            draggable={false}
            onDragStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
              return false;
            }}
            style={{
              width: dockerSize.botSize,
              height: dockerSize.botSize,
              userSelect: 'none',
              ...({ WebkitUserDrag: 'none' } as any),
            }}
            className="relative rounded-full cursor-grab active:cursor-grabbing select-none shrink-0 transition-transform duration-150 hover:scale-105 active:scale-95"
            title="NOVA AI: Sol tıkla etkileşime gir / konuş • Sağ tıkla kokpiti aç • Fareyle tut ve serbest taşı!"
          >
            {/* Living Interactive Nova Avatar (Pristine Circular Vector, matches reference photo) */}
            <NovaInteractiveAvatar
              size={dockerSize.botSize}
              externalMood={currentSpeech.mood}
              isBusy={false}
              isSpeaking={isSpeakingVoice}
              enableVoiceReactions={!isMuted}
            />
          </div>
        ) : (
          /* ======================================================== */
          /* 1B. ACTIVE BUSY STATE: LIVE MARQUEE PILL                 */
          /* ======================================================== */
          <div
            onClick={() => handleSetExpanded(true, 'cockpit')}
            style={{
              maxWidth: dockerSize.dockWidth,
              height: dockerSize.dockHeight,
            }}
            className="w-full px-4 py-1.5 rounded-full bg-[#070814] border-2 border-brand-purple/80 hover:border-brand-purple shadow-[0_10px_35px_rgba(0,0,0,0.95)] flex items-center justify-between cursor-pointer transition-all duration-300 group shrink-0"
          >
            {/* Left: Avatar + Badge */}
            <div className="flex items-center space-x-2 shrink-0">
              <NovaInteractiveAvatar
                size={Math.min(42, Math.max(30, dockerSize.dockHeight - 14))}
                externalMood={currentSpeech.mood}
                isBusy={true}
                isSpeaking={isSpeakingVoice}
                enableVoiceReactions={!isMuted}
              />
              <span className="text-[11px] font-black tracking-wider text-brand-cyan flex items-center gap-1 uppercase">
                NOVA
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              </span>
            </div>

            {/* Center: Live Status Marquee */}
            <div className="flex-1 mx-2.5 overflow-hidden text-center">
              <p className="text-[11px] text-slate-200 font-medium truncate group-hover:text-amber-300 transition-colors">
                {activeStatusText}
              </p>
            </div>

            {/* Right: Quick Action Controls */}
            <div className="flex items-center space-x-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => handleSetExpanded(true, 'chat')}
                className="p-1 rounded-full text-slate-400 hover:text-brand-cyan hover:bg-dark-800 transition-colors"
                title="NOVA ile Sohbet Et"
              >
                <MessageSquare className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={toggleMute}
                className={`p-1 rounded-full transition-colors ${
                  isMuted ? 'text-rose-400 bg-rose-950/60' : 'text-slate-400 hover:text-white'
                }`}
                title={isMuted ? 'Sesi Aç' : 'Sessize Al'}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => handleSetExpanded(true, 'cockpit')}
                className="p-1 rounded-full text-brand-purple group-hover:text-brand-cyan transition-colors"
                title="Komuta Merkezini Aç"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        )
      ) : (
        /* ======================================================== */
        /* 2. EXPANDED CYBER-PREMIUM STUDIO COCKPIT DOCK            */
        /* ======================================================== */
        <div
          style={{
            maxWidth: dockerSize.panelWidth,
          }}
          className="w-full h-full rounded-2xl bg-[#070814] border-2 border-brand-purple/80 shadow-[0_20px_60px_rgba(0,0,0,0.98)] flex flex-col overflow-hidden animate-fadeIn p-3.5 box-border"
        >
          {/* Top Master Header: Avatar, Symmetrical Tab Switcher & Window Controls */}
          <div className="flex items-center justify-between border-b border-dark-750 pb-2 mb-2 shrink-0">
            {/* Identity Badge */}
            <div className="flex items-center space-x-2.5">
              <NovaInteractiveAvatar
                size="sm"
                externalMood={currentSpeech.mood}
                isBusy={isBusy}
                isSpeaking={isSpeakingVoice}
                enableVoiceReactions={!isMuted}
              />
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-xs font-black text-white tracking-wide flex items-center gap-1.5">
                    <span>NOVA AI</span>
                    <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      WINDOWS DOCK
                    </span>
                  </h3>
                  <span className="text-[10px] text-slate-400 hidden sm:inline">• Baş Danışman & Komuta</span>
                </div>
              </div>
            </div>

            {/* Central Tab Switcher: Cockpit vs Chat */}
            <div className="flex items-center bg-dark-900/90 p-0.5 rounded-xl border border-dark-750">
              <button
                type="button"
                onClick={() => handleTabChange('cockpit')}
                className={`px-3.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                  activeTab === 'cockpit'
                    ? 'bg-gradient-to-r from-brand-purple to-purple-600 text-white shadow-md shadow-brand-purple/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>Operasyon Kokpiti</span>
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('chat')}
                className={`px-3.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 relative ${
                  activeTab === 'chat'
                    ? 'bg-gradient-to-r from-brand-cyan to-blue-600 text-white shadow-md shadow-brand-cyan/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>NOVA Chat</span>
                {messages.length > 1 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </button>
            </div>

            {/* Window & Voice Actions */}
            <div className="flex items-center space-x-1.5">
              {(pipelineProgress?.step === 'error' || currentSpeech.mood === 'alert') && (
                <button
                  type="button"
                  onClick={handleDismissError}
                  className="px-2 py-0.5 rounded-lg bg-rose-600/30 hover:bg-rose-600/60 border border-rose-500/50 text-[10px] font-bold text-rose-200 transition-colors flex items-center gap-1 shadow-sm"
                  title="Hatayı Yoksay ve Sistemi Sıfırla"
                >
                  <ShieldCheck className="w-3 h-3 text-rose-400" />
                  <span>Sıfırla</span>
                </button>
              )}

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
                className="p-1.5 rounded-lg bg-dark-800 hover:bg-dark-750 text-slate-300 hover:text-white border border-dark-750 text-xs transition-colors"
                title="Ana Stüdyo Penceresini Öne Getir / Küçült"
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

          {/* ======================================================== */}
          {/* TAB CONTENT A: ELITE OPERASYON KOKPİTİ                   */}
          {/* ======================================================== */}
          {activeTab === 'cockpit' && (
            <div className="flex-1 min-h-0 flex flex-col justify-between overflow-hidden">
              {isBusy ? (
                /* -------------------------------------------------- */
                /* BUSY COCKPIT: Large Avatar + 5-Step Process Tree   */
                /* -------------------------------------------------- */
                <div className="w-full h-full flex gap-3.5 items-stretch">
                  {/* Left Avatar Card */}
                  <div className="w-[170px] shrink-0 border-r border-dark-750/80 pr-3.5 flex flex-col items-center justify-center text-center bg-[#090a18] rounded-2xl p-2">
                    <NovaInteractiveAvatar
                      size="lg"
                      externalMood={currentSpeech.mood}
                      isBusy={true}
                      isSpeaking={isSpeakingVoice}
                      enableVoiceReactions={!isMuted}
                    />
                    <div className="mt-2 space-y-1">
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                        İŞLEMDE • %{activePercent}
                      </span>
                    </div>
                  </div>

                  {/* Right: Live Narration & Flow Tree */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                    <div className="p-2.5 rounded-xl border bg-[#090a18] border-dark-750 space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-bold text-amber-300">
                        <div className="flex items-center space-x-1.5">
                          <Sparkles className="w-3 h-3 text-amber-400" />
                          <span>NOVA Canlı Anlatımı:</span>
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
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <div className="relative flex items-center justify-between px-2 pt-1">
                        <div className="absolute top-[18px] left-6 right-6 h-0.5 bg-dark-750 -z-0" />
                        <div
                          className="absolute top-[18px] left-6 h-0.5 bg-gradient-to-r from-emerald-500 via-brand-purple to-brand-cyan -z-0 transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(0, ((activeStep - 1) / 4) * 100))}%` }}
                        />

                        {processStages.map((stage) => {
                          const isPast = stage.id < activeStep;
                          const isCurrent = stage.id === activeStep;
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
                                className={`text-[9px] font-bold mt-1 text-center truncate max-w-[65px] ${
                                  isCurrent ? 'text-amber-300 font-extrabold' : isPast ? 'text-emerald-400' : 'text-slate-500'
                                }`}
                              >
                                {stage.title}
                              </span>
                            </div>
                          );
                        })}
                      </div>

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
                /* -------------------------------------------------- */
                /* IDLE COCKPIT: ELITE SYMMETRICAL ACTION DASHBOARD   */
                /* -------------------------------------------------- */
                <div className="flex-1 min-h-0 flex flex-col justify-between space-y-2">
                  {/* Unified Live Telemetry HUD Bar */}
                  <div className="px-3.5 py-2 rounded-xl bg-[#090a18]/90 border border-slate-800/80 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2.5 truncate">
                      <span className="flex items-center space-x-1.5 text-brand-cyan font-bold shrink-0">
                        <Activity className="w-3.5 h-3.5 text-brand-cyan" />
                        <span>Sistem:</span>
                      </span>
                      <span className="text-[11px] text-slate-300 font-medium truncate">
                        Whisper AI & LLM Hazır • 🛡️ {activeSafetyText}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      {currentSpeech.action && (
                        <button
                          type="button"
                          onClick={(e) => handleExecuteAction(currentSpeech.action, e)}
                          className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-[10px] flex items-center gap-1 shadow-md shadow-amber-500/20 transition-all cursor-pointer animate-pulse"
                        >
                          <Play className="w-2.5 h-2.5 fill-slate-950" />
                          <span>{currentSpeech.action.label}</span>
                        </button>
                      )}

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        autopilotState?.isRunning
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : 'bg-dark-800 text-slate-400 border-dark-700'
                      }`}>
                        {autopilotState?.isRunning ? '⚡ 7/24 Otopilot Aktif' : '⚡ Otopilot Hazır'}
                      </span>
                    </div>
                  </div>

                  {/* Symmetrical 6-Card Cyber Action Grid (3 columns x 2 rows) */}
                  <div className="grid grid-cols-3 gap-2 flex-1 min-h-0">
                    {/* Card 1: Hızlı Video Üret */}
                    <button
                      type="button"
                      onClick={(e) => handleOpenFeature('new_video', e)}
                      className="rounded-xl bg-[#090a18] hover:bg-slate-900/90 border border-slate-800/80 hover:border-brand-purple/70 p-2.5 text-left transition-all duration-200 flex items-center space-x-3 cursor-pointer group shadow-sm hover:shadow-brand-purple/15"
                    >
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-purple to-purple-600 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                        <Film className="w-4 h-4 text-white" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white group-hover:text-brand-purple transition-colors truncate">
                          Yeni Video Üret
                        </h4>
                        <p className="text-[10px] text-slate-400 truncate">
                          Creative Commons Keşfi
                        </p>
                      </div>
                    </button>

                    {/* Card 2: Keşif Toplantısı (Reliable 1-Click Trigger) */}
                    <button
                      type="button"
                      onClick={handleStartMeeting}
                      disabled={isStartingMeeting}
                      className="rounded-xl bg-[#090a18] hover:bg-slate-900/90 border border-slate-800/80 hover:border-brand-cyan/70 p-2.5 text-left transition-all duration-200 flex items-center space-x-3 cursor-pointer group shadow-sm hover:shadow-brand-cyan/15 disabled:opacity-50"
                    >
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-cyan to-blue-600 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                        {isStartingMeeting ? (
                          <Loader2 className="w-4 h-4 text-white animate-spin" />
                        ) : (
                          <Radio className="w-4 h-4 text-white animate-pulse" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white group-hover:text-brand-cyan transition-colors truncate">
                          Keşif Toplantısı
                        </h4>
                        <p className="text-[10px] text-slate-400 truncate">
                          {isStartingMeeting ? 'Başlatılıyor...' : '14 Ajan Masada Toplan'}
                        </p>
                      </div>
                    </button>

                    {/* Card 3: Viral Adaylar */}
                    <button
                      type="button"
                      onClick={(e) => handleOpenFeature('pitches', e)}
                      className="rounded-xl bg-[#090a18] hover:bg-slate-900/90 border border-slate-800/80 hover:border-amber-500/70 p-2.5 text-left transition-all duration-200 flex items-center space-x-3 cursor-pointer group shadow-sm hover:shadow-amber-500/15"
                    >
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                        <Flame className="w-4 h-4 text-white" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors truncate">
                          Viral Adaylar
                        </h4>
                        <p className="text-[10px] text-slate-400 truncate">
                          Adayları İncele & Kurgula
                        </p>
                      </div>
                    </button>

                    {/* Card 4: 7/24 Otopilot Toggle */}
                    <button
                      type="button"
                      onClick={handleToggleAutopilot}
                      className="rounded-xl bg-[#090a18] hover:bg-slate-900/90 border border-slate-800/80 hover:border-emerald-500/70 p-2.5 text-left transition-all duration-200 flex items-center space-x-3 cursor-pointer group shadow-sm hover:shadow-emerald-500/15"
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform ${
                        autopilotState?.isRunning
                          ? 'bg-gradient-to-tr from-emerald-500 to-teal-600'
                          : 'bg-dark-800 border border-dark-700'
                      }`}>
                        <Zap className={`w-4 h-4 ${autopilotState?.isRunning ? 'text-white' : 'text-slate-400'}`} />
                      </div>
                      <div className="min-w-0">
                        <h4 className={`text-xs font-bold transition-colors truncate ${
                          autopilotState?.isRunning ? 'text-emerald-400' : 'text-white group-hover:text-emerald-400'
                        }`}>
                          {autopilotState?.isRunning ? '7/24 Otopilot (Aktif)' : '7/24 Otopilot (Kapalı)'}
                        </h4>
                        <p className="text-[10px] text-slate-400 truncate">
                          {autopilotState?.isRunning ? 'Altın Saatlerde Yayın' : 'Başlatmak İçin Tıkla'}
                        </p>
                      </div>
                    </button>

                    {/* Card 5: Nexus War Room */}
                    <button
                      type="button"
                      onClick={(e) => handleOpenFeature('agency', e)}
                      className="rounded-xl bg-[#090a18] hover:bg-slate-900/90 border border-slate-800/80 hover:border-indigo-500/70 p-2.5 text-left transition-all duration-200 flex items-center space-x-3 cursor-pointer group shadow-sm hover:shadow-indigo-500/15"
                    >
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-700 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                        <Building2 className="w-4 h-4 text-white" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white group-hover:text-indigo-400 transition-colors truncate">
                          Nexus War Room
                        </h4>
                        <p className="text-[10px] text-slate-400 truncate">
                          3D / 2D Operasyon Masası
                        </p>
                      </div>
                    </button>

                    {/* Card 6: Kanal Güvenliği & Ayarlar */}
                    <button
                      type="button"
                      onClick={(e) => handleOpenFeature('settings', e)}
                      className="rounded-xl bg-[#090a18] hover:bg-slate-900/90 border border-slate-800/80 hover:border-rose-500/70 p-2.5 text-left transition-all duration-200 flex items-center space-x-3 cursor-pointer group shadow-sm hover:shadow-rose-500/15"
                    >
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-500 to-purple-600 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                        <ShieldCheck className="w-4 h-4 text-white" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white group-hover:text-rose-400 transition-colors truncate">
                          Güvenlik & Ayarlar
                        </h4>
                        <p className="text-[10px] text-slate-400 truncate">
                          Filtreler & Stüdyo Tercihleri
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB CONTENT B: FULL INTERACTIVE NOVA AI CHAT MODULE      */}
          {/* ======================================================== */}
          {activeTab === 'chat' && (
            <div className="flex-1 min-h-0 flex flex-col justify-between overflow-hidden">
              {/* Message Stream with auto-scroll */}
              <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1.5 my-1 custom-scrollbar">
                {messages.map((msg) => {
                  const isUser = msg.sender === 'user';

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} animate-fadeIn`}
                    >
                      <div className="flex items-center space-x-1.5 mb-0.5 px-1">
                        {isUser ? (
                          <>
                            <span className="text-[10px] text-slate-400 font-medium">{msg.timestamp}</span>
                            <span className="text-[10px] font-extrabold text-brand-purple">Patron</span>
                            <User className="w-3 h-3 text-brand-purple" />
                          </>
                        ) : (
                          <>
                            <Bot className="w-3 h-3 text-brand-cyan" />
                            <span className="text-[10px] font-extrabold text-brand-cyan">NOVA AI</span>
                            <span className="text-[10px] text-slate-400 font-medium">{msg.timestamp}</span>
                            {msg.status === 'acting' && (
                              <span className="text-[9px] font-bold text-amber-400 bg-amber-500/15 px-1.5 py-0.2 rounded border border-amber-500/30 flex items-center gap-1">
                                <Loader2 className="w-2.5 h-2.5 animate-spin" /> işlemde
                              </span>
                            )}
                            {msg.status === 'error' && (
                              <span className="text-[9px] font-bold text-rose-400 bg-rose-500/15 px-1.5 py-0.2 rounded border border-rose-500/30">
                                hata
                              </span>
                            )}
                          </>
                        )}
                      </div>

                      <div
                        className={`max-w-[90%] rounded-2xl p-2.5 text-xs leading-relaxed shadow-md ${
                          isUser
                            ? 'bg-gradient-to-r from-brand-purple to-purple-700 text-white rounded-tr-none'
                            : 'bg-[#090a18] border border-dark-750 text-slate-100 rounded-tl-none'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.text}</p>

                        {/* Interactive Message Action Card if attached */}
                        {msg.action && (
                          <div className="mt-2 pt-1.5 border-t border-dark-750/80 flex items-center justify-between gap-2">
                            <span className="text-[10px] text-slate-400 truncate">Önerilen Aksiyon:</span>
                            <button
                              type="button"
                              onClick={(e) => handleExecuteAction(msg.action, e)}
                              className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-[10px] flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all active:scale-95 cursor-pointer shrink-0"
                            >
                              <Play className="w-2.5 h-2.5 fill-slate-950" />
                              <span>{msg.action.label}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Prompt Chips - ALWAYS PINNED ABOVE INPUT */}
              <div className="shrink-0 py-1 border-t border-dark-750/80 flex items-center space-x-1.5 overflow-x-auto no-scrollbar">
                {quickPrompts.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendCommand(chip.cmd)}
                    className="px-2.5 py-1 rounded-lg bg-dark-850 hover:bg-dark-800 border border-dark-750 hover:border-brand-purple/50 text-[10px] font-semibold text-slate-300 hover:text-white whitespace-nowrap transition-all cursor-pointer shrink-0"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* Chat Input Bar - ALWAYS PINNED AT BOTTOM */}
              <div className="shrink-0 pt-1.5 border-t border-dark-750/80">
                <div className="flex items-center space-x-2 bg-[#090a18] border border-dark-750 rounded-2xl px-3 py-1.5 focus-within:border-brand-purple transition-colors">
                  <Bot className="w-4 h-4 text-brand-purple shrink-0" />
                  <input
                    type="text"
                    value={inputPrompt}
                    onChange={(e) => setInputPrompt(e.target.value)}
                    onFocus={() => { isInputFocusedRef.current = true; }}
                    onBlur={() => { isInputFocusedRef.current = false; }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSendCommand();
                    }}
                    placeholder="NOVA'ya bir emir ver (Örn: Toplantı başlat, Viral adayları göster)..."
                    disabled={isSubmitting}
                    className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleSendCommand()}
                    disabled={!inputPrompt.trim() || isSubmitting}
                    className="p-1.5 rounded-xl bg-gradient-to-r from-brand-purple to-purple-600 hover:from-purple-600 hover:to-purple-500 disabled:opacity-40 text-white transition-all shadow-md shadow-brand-purple/20 cursor-pointer"
                  >
                    {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
