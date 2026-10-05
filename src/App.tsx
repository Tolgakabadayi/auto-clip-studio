import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { LeftPanel } from './components/LeftPanel';
import { CenterPanel } from './components/CenterPanel';
import { RightPanel } from './components/RightPanel';
import { VideoPlayerModal } from './components/VideoPlayerModal';
import { TimelineEditor } from './components/TimelineEditor';
import { TerminalLogs } from './components/TerminalLogs';
import { SocialCopyModal } from './components/SocialCopyModal';
import { AgencyRoomModal } from './components/AgencyRoomModal';
import { AutopilotModal } from './components/AutopilotModal';
import { SettingsModal } from './components/SettingsModal';
import { OperationSummaryModal, LatestOperationResult } from './components/OperationSummaryModal';
import {
  VideoMetadata,
  ViralClip,
  PipelineProgress,
  SubtitleStyleConfig,
  SystemHealth,
  PipelineOptions,
  LLMProvider,
  SocialCopyMetadata,
  AgencyMessage,
  AgencyAgentConfig,
  AutopilotState,
} from './types';

export const App: React.FC = () => {
  // Video & Pipeline State
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | null>(() => { const s = localStorage.getItem('autoclip_metadata'); return s ? JSON.parse(s) : null; });
  const [isProcessing, setIsProcessing] = useState(false);
  const [agencyMode, setAgencyMode] = useState<boolean>(true);
  const [enableSilenceRemoval, setEnableSilenceRemoval] = useState<boolean>(false);
  const [agencyMessages, setAgencyMessages] = useState<AgencyMessage[]>([]);
  const [agencyAgents, setAgencyAgents] = useState<AgencyAgentConfig[]>([]);
  const [isAgencyModalOpen, setIsAgencyModalOpen] = useState<boolean>(false);
  const [isAutopilotModalOpen, setIsAutopilotModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);
  const [latestOperationResult, setLatestOperationResult] = useState<LatestOperationResult | null>(null);
  const handleSelectVideoRef = useRef<() => void>(() => {});
  const handleAutonomousDockNewVideoRef = useRef<() => void>(() => {});
  const [autopilotState, setAutopilotState] = useState<AutopilotState | null>(null);
  const [pipelineProgress, setPipelineProgress] = useState<PipelineProgress>({
    step: 'idle',
    percent: 0,
    message: 'Hazır',
  });
  const [logs, setLogs] = useState<string[]>([]);
  const [clips, setClips] = useState<ViralClip[]>(() => { const s = localStorage.getItem('autoclip_clips'); return s ? JSON.parse(s) : []; });
  const [previewClip, setPreviewClip] = useState<ViralClip | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);

  // Settings State
  const [llmProvider, setLlmProvider] = useState<LLMProvider>('ollama');
  const [groqApiKey, setGroqApiKey] = useState(() => localStorage.getItem('autoclip_groq_key') || '');
  const [ollamaModel, setOllamaModel] = useState('gemma3:4b');
  const [groqModel, setGroqModel] = useState('llama-3.3-70b-versatile');
  const [whisperModel, setWhisperModel] = useState<'tiny' | 'base' | 'small' | 'medium' | 'large-v3'>('small');
  const [language, setLanguage] = useState<string>(() => localStorage.getItem('autoclip_lang') || 'tr');
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9'>('9:16');
  const [layoutMode, setLayoutMode] = useState<'blur_background' | 'crop_center' | 'smart_face_tracking'>('smart_face_tracking');
  const [outputDirectory, setOutputDirectory] = useState('');

  // Clip Count & Duration State
  const [clipCount, setClipCount] = useState(3);
  const [minClipDuration, setMinClipDuration] = useState(30);
  const [maxClipDuration, setMaxClipDuration] = useState(60);

  // Layout Customization & Moveable Panels
  const [isLayoutLocked, setIsLayoutLocked] = useState<boolean>(true);
  const [panelsSwapped, setPanelsSwapped] = useState<boolean>(false);
  const [logsPosition, setLogsPosition] = useState<'left' | 'right' | 'bottom'>('left');
  const [timelineClip, setTimelineClip] = useState<ViralClip | null>(null);
  const [socialModalClip, setSocialModalClip] = useState<ViralClip | null>(null);

  const handleUpdateClipSocialMetadata = (clipId: number, metadata: SocialCopyMetadata, newTitle?: string) => {
    setClips((prev) =>
      prev.map((c) => {
        if (c.clip_id === clipId) {
          const updatedTitle = newTitle || (metadata.titles && metadata.titles[0]) || c.title;
          return {
            ...c,
            title: updatedTitle,
            socialMetadata: metadata,
          };
        }
        return c;
      })
    );
  };

  const handleUpdateClipThumbnail = (clipId: number, newThumbPath: string) => {
    setClips((prev) =>
      prev.map((c) => (c.clip_id === clipId ? { ...c, thumbnailPath: newThumbPath } : c))
    );
  };

  
  useEffect(() => {
    if (videoMetadata) localStorage.setItem('autoclip_metadata', JSON.stringify(videoMetadata));
    else localStorage.removeItem('autoclip_metadata');
  }, [videoMetadata]);

  useEffect(() => {
    if (clips.length > 0) localStorage.setItem('autoclip_clips', JSON.stringify(clips));
  }, [clips]);

  useEffect(() => {
    if (language) localStorage.setItem('autoclip_lang', language);
  }, [language]);


  // Subtitle Styling State
  const [subtitleConfig, setSubtitleConfig] = useState<SubtitleStyleConfig>({
    fontName: 'Montserrat',
    fontSize: 72,
    primaryColor: '#FFFFFF',
    highlightColor: '#FFE600',
    outlineColor: '#000000',
    outlineWidth: 5,
    shadowDepth: 2,
    alignment: 2,
    marginV: 420,
    wordsPerGroup: 3,
    animationStyle: 'karaoke',
    uppercase: true,
  });

  // Initial health check & IPC subscriptions
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getSystemHealth().then(setSystemHealth).catch(console.error);

      if (window.electronAPI.getAgencyDefaultAgents) {
        window.electronAPI.getAgencyDefaultAgents().then(setAgencyAgents).catch(console.error);
      }

      if (window.electronAPI.autopilotGetState) {
        window.electronAPI.autopilotGetState().then(setAutopilotState).catch(console.error);
      }

      const unregisterProgress = window.electronAPI.onPipelineProgress((data) => {
        setPipelineProgress(data);
      });

      const unregisterLog = window.electronAPI.onPipelineLog((log) => {
        setLogs((prev) => [...prev, log]);

        // Dual safety fallback: If log starts with [Ajans:AgentName], sync to agencyMessages
        if (log.startsWith('[Ajans:')) {
          const match = log.match(/^\[Ajans:([^\]]+)\]\s+(.*)$/);
          if (match) {
            const agentName = match[1];
            const content = match[2];
            setAgencyMessages((prev) => {
              if (prev.some((m) => m.content === content)) return prev;
              let role: any = 'scout';
              let model = 'gemma3:4b';
              if (agentName.includes('Hunter') || agentName.includes('Avcı')) {
                role = 'trend_hunter';
                model = 'gemma3:4b';
              } else if (agentName.includes('Legal') || agentName.includes('Hukuk') || agentName.includes('Telif')) {
                role = 'copyright_auditor';
                model = 'llama3:latest';
              } else if (agentName.includes('Planner') || agentName.includes('Plan')) {
                role = 'scheduler';
                model = 'qwen3:8b';
              } else if (agentName.includes('Qwen') && !agentName.includes('VL') && !agentName.includes('Copy')) {
                role = 'ceo';
                model = 'qwen3:8b';
              } else if (agentName.includes('VL')) {
                role = 'art_director';
                model = 'qwen3-vl:8b';
              } else if (agentName.includes('Copy')) {
                role = 'copywriter';
                model = 'qwen3:8b';
              } else if (agentName.includes('Llama') || agentName.includes('Auditor')) {
                role = 'qa';
                model = 'llama3:latest';
              }
              return [
                ...prev,
                {
                  id: `fallback_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                  timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                  role,
                  agentName,
                  agentModel: model,
                  type: content.includes('ONAY') ? 'approval' : content.includes('seçildi') ? 'decision' : 'thought',
                  content,
                },
              ];
            });
          }
        }
      });

      const unregisterAgencyMsg = window.electronAPI.onAgencyMessage?.((msg) => {
        setAgencyMessages((prev) => {
          if (prev.some((m) => m.id === msg.id || m.content === msg.content)) return prev;
          return [...prev, msg];
        });
      });

      const unregisterAutopilot = window.electronAPI.onAutopilotState?.((s) => {
        setAutopilotState(s);
      });

      const unregisterDock = window.electronAPI?.onDockTriggerFeature?.((feat: string) => {
        if (feat === 'agency') setIsAgencyModalOpen(true);
        if (feat === 'autopilot') setIsAutopilotModalOpen(true);
        if (feat === 'terminal') setLogsPosition('bottom');
        if (feat === 'settings') setIsSettingsModalOpen(true);
        if (feat === 'new_video') handleAutonomousDockNewVideoRef.current?.();
      });

      // Synchronize initial clips with permanent Upload Registry
      if (window.electronAPI.uploadRegistryGetAll) {
        window.electronAPI.uploadRegistryGetAll().then((records: any[]) => {
          if (records && records.length > 0) {
            setClips((prev) =>
              prev.map((c) => {
                const match = records.find(
                  (r) =>
                    (r.clipId !== undefined && r.clipId === c.clip_id) ||
                    (r.filePath && c.outputPath && r.filePath === c.outputPath) ||
                    (r.title && c.title && r.title.trim().toLowerCase() === c.title.trim().toLowerCase())
                );
                if (match) {
                  return {
                    ...c,
                    isUploaded: true,
                    uploadedAt: match.uploadedAt,
                    youtubeVideoId: match.youtubeVideoId,
                    youtubeUrl: match.youtubeUrl,
                  };
                }
                return c;
              })
            );
          }
        }).catch(console.error);
      }

      // Live subscription for any manual or autopilot uploads
      const unregisterClipUploaded = window.electronAPI.onClipUploaded?.((record: any) => {
        setClips((prev) =>
          prev.map((c) => {
            const match =
              (record.clipId !== undefined && record.clipId === c.clip_id) ||
              (record.filePath && c.outputPath && record.filePath === c.outputPath) ||
              (record.title && c.title && record.title.trim().toLowerCase() === c.title.trim().toLowerCase());
            if (match) {
              return {
                ...c,
                isUploaded: true,
                uploadedAt: record.uploadedAt,
                youtubeVideoId: record.youtubeVideoId,
                youtubeUrl: record.youtubeUrl,
              };
            }
            return c;
          })
        );
      });

      return () => {
        unregisterProgress();
        unregisterLog();
        if (unregisterAgencyMsg) unregisterAgencyMsg();
        if (unregisterAutopilot) unregisterAutopilot();
        if (unregisterDock) unregisterDock();
        if (unregisterClipUploaded) unregisterClipUploaded();
      };
    }
  }, []);

  // Handlers
  const handleSelectVideo = async () => {
    if (!window.electronAPI) return;
    try {
      const meta = await window.electronAPI.selectVideoFile();
      if (meta) {
        setVideoMetadata(meta);
        setLogs((prev) => [...prev, `Seçilen video: ${meta.name} (${(meta.duration / 60).toFixed(1)} dk)`]);
      }
    } catch (err: any) {
      console.error('Video seçim hatası:', err);
    }
  };
  handleSelectVideoRef.current = handleSelectVideo;

  const handleAutonomousDockNewVideo = async () => {
    // 1. Open the 2D Agency Room modal immediately so user sees the 2D live office working!
    setIsAgencyModalOpen(true);

    // 2. Announce through Nova / Copilot
    if (window.electronAPI?.copilotSendCommand) {
      window.electronAPI.copilotSendCommand(
        'Patron emretti! YouTube Creative Commons radarından en viral video taranıyor ve 13 ajanlı ajans masasında klip üretimi başlatılıyor!'
      ).catch(() => {});
    }

    setLogs((prev) => [
      ...prev,
      `🚀 [AURA Stüdyo AI]: Nova Docker üzerinden otonom klip üretimi tetiklendi. YouTube CC radarı taranıyor ve 13 ajanlı ajans masası toplanıyor...`,
    ]);

    // 3. Trigger autonomous YouTube CC cycle
    if (window.electronAPI?.autopilotRunCycle) {
      try {
        await window.electronAPI.autopilotRunCycle();
      } catch (err: any) {
        console.error('Nova Docker otonom üretim hatası:', err);
        setLogs((prev) => [
          ...prev,
          `⚠️ [AURA Stüdyo Hata]: Otonom üretim sırasında hata oluştu: ${err.message}`,
        ]);
      }
    }
  };
  handleAutonomousDockNewVideoRef.current = handleAutonomousDockNewVideo;

  const handleDropVideoFile = async (fileOrPath: any) => {
    try {
      const filePath = typeof fileOrPath === 'string' ? fileOrPath : fileOrPath?.path;
      if (filePath && window.electronAPI) {
        const meta = await window.electronAPI.probeVideoPath(filePath);
        if (meta) {
          setVideoMetadata(meta);
          setLogs((prev) => [...prev, `Video yüklendi: ${meta.name} (${(meta.duration / 60).toFixed(1)} dk)`]);
          return;
        }
      }
      if (fileOrPath?.name) {
        setVideoMetadata({
          path: filePath || fileOrPath.name,
          name: fileOrPath.name,
          size: fileOrPath.size || 0,
          duration: 0,
          width: 1920,
          height: 1080,
          format: fileOrPath.name.split('.').pop()?.toUpperCase() || 'MP4',
        });
        setLogs((prev) => [...prev, `Dosya seçildi: ${fileOrPath.name}`]);
      }
    } catch (err: any) {
      console.error('Video yükleme hatası:', err);
      alert(`Video yüklenirken hata oluştu: ${err.message}`);
    }
  };

  const handleClearVideo = () => {
    setVideoMetadata(null);
    setLogs((prev) => [...prev, 'ℹ Seçili video iptal edildi / kaldırıldı.']);
  };

  const handleSelectOutputFolder = async () => {
    if (!window.electronAPI) return;
    const folder = await window.electronAPI.selectOutputFolder();
    if (folder) {
      setOutputDirectory(folder);
    }
  };

  const runPipelineWithVideo = async (targetVideo: VideoMetadata) => {
    if (!window.electronAPI) {
      alert('Electron API erişilemiyor. Uygulamayı yeniden başlatın.');
      return;
    }

    if (llmProvider === 'groq' && !groqApiKey.trim()) {
      setLogs((prev) => [...prev, '[HATA] Groq API anahtarı girilmemiş.']);
      alert('Lütfen ayarlardan geçerli bir Groq API anahtarı girin.');
      setIsProcessing(false);
      return;
    }

    setIsProcessing(true);
    const usedModel = llmProvider === 'ollama' ? ollamaModel : groqModel;
    setLogs((prev) => [
      ...prev,
      `Pipeline başlatılıyor: ${targetVideo.name}`,
      `LLM: ${llmProvider.toUpperCase()} (${usedModel})`,
      `Whisper: ${whisperModel} | Klip: ${clipCount} adet (${minClipDuration}-${maxClipDuration}s)`,
    ]);
    setClips([]);

    const options: PipelineOptions = {
      videoPath: targetVideo.path,
      aspectRatio,
      layoutMode,
      whisperModel,
      language,
      llmProvider,
      ollamaModel: ollamaModel || 'gemma3:4b',
      groqApiKey: groqApiKey.trim(),
      groqModel: groqModel || 'llama-3.3-70b-versatile',
      subtitleConfig,
      outputDirectory: outputDirectory || undefined,
      clipCount,
      minClipDuration,
      maxClipDuration,
      agencyMode: llmProvider === 'ollama' ? agencyMode : false,
      agencyAgents,
      enableSilenceRemoval,
    };

    const startTime = Date.now();
    try {
      const result = await window.electronAPI.startFullPipeline(options);
      if (result && result.clips) {
        const taggedClips = (result.clips || []).map((c: any, idx: number) => ({
          ...c,
          createdAt: c.createdAt || new Date(Date.now() - idx * 1000).toISOString(),
        }));
        setClips((prev) => [...taggedClips, ...prev]);
        const elapsedSeconds = Math.max(1, Math.round((Date.now() - startTime) / 1000));
        setLatestOperationResult({
          videoName: targetVideo.name,
          clips: taggedClips,
          projectDir: result.projectDir || '',
          elapsedSeconds,
          completedAt: new Date(),
          totalClips: taggedClips.length,
        });
        setShowSummaryModal(true);
      }
    } catch (err: any) {
      console.error('Pipeline hatası:', err);
      alert(`İşlem sırasında bir hata oluştu: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRunAgencyBrainstorm = async () => {
    if (!window.electronAPI) return;
    setIsProcessing(true);

    if (!videoMetadata) {
      setLogs((prev) => [
        ...prev,
        '👑 [3D Ajans Odası]: Video seçilmediği için YouTube Creative Commons viral arama motoru devreye girdi. En viral kaynak video taranıyor ve 12 ajan masaya toplanıyor...',
      ]);
      try {
        if (window.electronAPI.autopilotRunCycle) {
          await window.electronAPI.autopilotRunCycle();
        }
      } catch (err: any) {
        setLogs((prev) => [...prev, `[HATA] Otonom arama hatası: ${err.message}`]);
        alert(`Ajans toplantısı hatası: ${err.message}`);
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    setLogs((prev) => [...prev, '👑 [3D Ajans Odası] Canlı toplantı ve analiz doğrudan başlatıldı...']);
    const startTime = Date.now();
    try {
      const options: PipelineOptions = {
        videoPath: videoMetadata.path,
        aspectRatio,
        layoutMode,
        whisperModel,
        language,
        llmProvider: 'ollama',
        ollamaModel: ollamaModel || 'gemma3:4b',
        groqApiKey: groqApiKey.trim(),
        groqModel: groqModel || 'llama-3.3-70b-versatile',
        subtitleConfig,
        outputDirectory: outputDirectory || undefined,
        clipCount,
        minClipDuration,
        maxClipDuration,
        agencyMode: true,
        agencyAgents,
      };
      const resultClips = await window.electronAPI.runAgencyPipeline(options);
      if (resultClips && resultClips.length > 0) {
        setClips(resultClips);
        setLogs((prev) => [...prev, `👑 [Ajans Odası] Toplantı tamamlandı! ${resultClips.length} klip onaylandı.`]);
        const elapsedSeconds = Math.max(1, Math.round((Date.now() - startTime) / 1000));
        setLatestOperationResult({
          videoName: videoMetadata?.name || 'Otonom Video',
          clips: resultClips,
          projectDir: outputDirectory || '',
          elapsedSeconds,
          completedAt: new Date(),
          totalClips: resultClips.length,
        });
        setShowSummaryModal(true);
      }
    } catch (err: any) {
      setLogs((prev) => [...prev, `[HATA] Ajans toplantısı hatası: ${err.message}`]);
      alert(`Ajans toplantısı hatası: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartPipeline = async () => {
    if (!videoMetadata) {
      alert('Lütfen önce bir video dosyası seçin veya YouTube linki girin.');
      return;
    }
    await runPipelineWithVideo(videoMetadata);
  };

  const handleCancelPipeline = async () => {
    if (window.electronAPI) {
      try {
        await window.electronAPI.cancelPipeline();
      } catch (e) {
        console.error('Cancel error:', e);
      }
    }
    setIsProcessing(false);
    setPipelineProgress({
      step: 'idle',
      percent: 0,
      message: 'İşlem iptal edildi.',
    });
    setLogs((prev) => [...prev, '⚠ İşlem kullanıcı tarafından durduruldu ve iptal edildi.']);
  };

  const handleClearTerminalAndAgency = () => {
    setLogs([]);
    setAgencyMessages([]);
    setPipelineProgress({
      step: 'idle',
      percent: 0,
      message: 'Terminal ve ajans konuşmaları temizlendi, yeni işleme hazır.',
    });
    setShowSummaryModal(false);
    if (window.electronAPI?.resetPipelineProgress) {
      window.electronAPI.resetPipelineProgress();
    }
  };

  const handleResetError = async () => {
    setIsProcessing(false);
    setPipelineProgress({
      step: 'idle',
      percent: 0,
      message: 'Sistem hazır',
    });
    if (window.electronAPI?.resetPipelineProgress) {
      await window.electronAPI.resetPipelineProgress();
    }
  };

  const handleDownloadYouTube = async (url: string, autoStart: boolean, quality: string = '1080p') => {
    if (!window.electronAPI) {
      alert('Electron API erişilemiyor. Uygulamayı yeniden başlatın.');
      return;
    }

    setIsProcessing(true);
    setLogs((prev) => [...prev, `[YouTube] Video indirme başlatıldı (${quality}): ${url}`]);
    setPipelineProgress({
      step: 'downloading_youtube',
      percent: 5,
      message: `YouTube bağlantısı kuruluyor (${quality})...`,
    });

    try {
      const meta = await window.electronAPI.downloadYouTubeVideo(url, quality);
      if (meta) {
        setVideoMetadata(meta);
        setLogs((prev) => [
          ...prev,
          `✓ YouTube videosu başarıyla yüklendi: ${meta.name} (${(meta.duration / 60).toFixed(1)} dk)`,
        ]);

        if (autoStart) {
          await runPipelineWithVideo(meta);
        } else {
          setPipelineProgress({
            step: 'idle',
            percent: 100,
            message: 'Video indirildi ve hazır!',
          });
          setIsProcessing(false);
        }
      }
    } catch (err: any) {
      console.error('YouTube indirme hatası:', err);
      setLogs((prev) => [...prev, `[HATA] YouTube indirme başarısız: ${err.message}`]);
      setPipelineProgress({
        step: 'error',
        percent: 0,
        message: `İndirme hatası: ${err.message}`,
      });
      setIsProcessing(false);
      alert(`YouTube indirme hatası: ${err.message}`);
    }
  };

  const handleReRenderClip = async (clip: ViralClip) => {
    if (!videoMetadata || !window.electronAPI) return;
    setIsProcessing(true);

    const options: PipelineOptions = {
      videoPath: videoMetadata.path,
      aspectRatio: '9:16',
      layoutMode,
      whisperModel,
      language: 'tr',
      llmProvider,
      subtitleConfig,
      outputDirectory: outputDirectory || undefined,
    };

    try {
      const updatedPath = await window.electronAPI.renderSingleClip(clip, options);
      const updatedClip = { ...clip, outputPath: updatedPath };
      setClips((prev) => prev.map((c) => (c.clip_id === clip.clip_id ? updatedClip : c)));
      setPreviewClip(updatedClip);
    } catch (err: any) {
      alert(`Yeniden render hatası: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleShowInFolder = (targetPath: string) => {
    if (window.electronAPI) {
      window.electronAPI.showItemInFolder(targetPath);
    }
  };

  const handleOpenFolder = () => {
    if (window.electronAPI && outputDirectory) {
      window.electronAPI.openPath(outputDirectory);
    }
  };

  const handleApplyTimelineChanges = async (
    clip: ViralClip,
    options: {
      startSeconds: number;
      durationSeconds: number;
      enableSubtitles: boolean;
      audioVolume: number;
      musicPath?: string;
      musicVolume?: number;
    }
  ) => {
    if (!videoMetadata || !window.electronAPI) return;
    setIsProcessing(true);

    const pipelineOpts: PipelineOptions = {
      videoPath: videoMetadata.path,
      aspectRatio,
      layoutMode,
      whisperModel,
      language: 'tr',
      llmProvider,
      subtitleConfig,
      outputDirectory: outputDirectory || undefined,
      enableSubtitles: options.enableSubtitles,
      audioVolume: options.audioVolume,
      musicPath: options.musicPath,
      musicVolume: options.musicVolume,
    };

    const updatedClipData: ViralClip = {
      ...clip,
      start_seconds: options.startSeconds,
      end_seconds: options.startSeconds + options.durationSeconds,
      duration_seconds: options.durationSeconds,
    };

    try {
      const updatedClip = await window.electronAPI.renderSingleClip(updatedClipData, pipelineOpts);
      setClips((prev) =>
        prev.map((c) => (c.clip_id === clip.clip_id ? updatedClip : c))
      );
      setTimelineClip(null);
      setPreviewClip(updatedClip);
    } catch (err: any) {
      alert(`Klip düzenleme ve render hatası: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const leftPanelElement = (
    <LeftPanel
      videoMetadata={videoMetadata}
      onSelectVideo={handleSelectVideo}
      onDropVideoFile={handleDropVideoFile}
      onClearVideo={handleClearVideo}
      onStartPipeline={handleStartPipeline}
      onCancelPipeline={handleCancelPipeline}
      onDownloadYouTube={handleDownloadYouTube}
      pipelineProgress={pipelineProgress}
      isProcessing={isProcessing}
      logs={logs}
      logsPosition={logsPosition}
      onChangeLogsPosition={setLogsPosition}
      isLayoutLocked={isLayoutLocked}
      llmProvider={llmProvider}
      setLlmProvider={setLlmProvider}
      groqApiKey={groqApiKey}
      setGroqApiKey={setGroqApiKey}
      ollamaModel={ollamaModel}
      setOllamaModel={setOllamaModel}
      groqModel={groqModel}
      setGroqModel={setGroqModel}
      availableOllamaModels={systemHealth?.ollamaModels || ['gemma3:4b', 'qwen3:8b', 'qwen3-vl:8b']}
      whisperModel={whisperModel}
      setWhisperModel={setWhisperModel}
      language={language}
      setLanguage={setLanguage}
      clipCount={clipCount}
      setClipCount={setClipCount}
      minClipDuration={minClipDuration}
      setMinClipDuration={setMinClipDuration}
      maxClipDuration={maxClipDuration}
      setMaxClipDuration={setMaxClipDuration}
      aspectRatio={aspectRatio}
      setAspectRatio={setAspectRatio}
      layoutMode={layoutMode}
      setLayoutMode={setLayoutMode}
      subtitleConfig={subtitleConfig}
      setSubtitleConfig={setSubtitleConfig}
      agencyMode={agencyMode}
      setAgencyMode={setAgencyMode}
      onOpenAgencyRoom={() => setIsAgencyModalOpen(true)}
      onOpenAutopilot={() => setIsAutopilotModalOpen(true)}
      autopilotState={autopilotState}
      enableSilenceRemoval={enableSilenceRemoval}
      setEnableSilenceRemoval={setEnableSilenceRemoval}
    />
  );

  const rightPanelElement = (
    <RightPanel
      logs={logs}
      onClearLogs={() => setLogs([])}
      outputDirectory={outputDirectory}
      onSelectOutputFolder={handleSelectOutputFolder}
      onOpenFolder={handleOpenFolder}
      isProcessing={isProcessing}
      agencyMessages={agencyMessages}
      onOpenAgencyModal={() => setIsAgencyModalOpen(true)}
    />
  );

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-dark-950 select-none">
      {/* Top Header with Layout Customizer Controls */}
      <Header
        health={systemHealth}
        isLayoutLocked={isLayoutLocked}
        onToggleLock={() => setIsLayoutLocked(!isLayoutLocked)}
        onSwapPanels={() => setPanelsSwapped(!panelsSwapped)}
        panelsSwapped={panelsSwapped}
        onOpenAgencyRoom={() => setIsAgencyModalOpen(true)}
        agencyMessageCount={agencyMessages.length}
        onOpenAutopilot={() => setIsAutopilotModalOpen(true)}
        isAutopilotRunning={autopilotState?.isRunning || false}
        autopilotQueueCount={autopilotState?.packages?.length || 0}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
      />

      {/* Main Workspace (3 columns - swap support) */}
      <div className="flex-1 flex overflow-hidden">
        {panelsSwapped ? (
          <>
            {rightPanelElement}
            <CenterPanel
              clips={clips}
              autopilotPackages={autopilotState?.packages || []}
              onPreviewClip={setPreviewClip}
              onShowInFolder={handleShowInFolder}
              onReRenderClip={handleReRenderClip}
              onOpenTimeline={(c) => setTimelineClip(c)}
              onOpenSocialModal={(c) => setSocialModalClip(c)}
              isProcessing={isProcessing}
              videoPath={videoMetadata?.path}
              onUpdateClipThumbnail={handleUpdateClipThumbnail}
            />
            {leftPanelElement}
          </>
        ) : (
          <>
            {leftPanelElement}
            <CenterPanel
              clips={clips}
              autopilotPackages={autopilotState?.packages || []}
              onPreviewClip={setPreviewClip}
              onShowInFolder={handleShowInFolder}
              onReRenderClip={handleReRenderClip}
              onOpenTimeline={(c) => setTimelineClip(c)}
              onOpenSocialModal={(c) => setSocialModalClip(c)}
              isProcessing={isProcessing}
              videoPath={videoMetadata?.path}
              onUpdateClipThumbnail={handleUpdateClipThumbnail}
            />
            {rightPanelElement}
          </>
        )}
      </div>

      {/* Bottom Drawer for Terminal Logs when positioned at bottom */}
      {logsPosition === 'bottom' && (
        <TerminalLogs
          logs={logs}
          position="bottom"
          onChangePosition={setLogsPosition}
          isLocked={isLayoutLocked}
        />
      )}

      {/* Timeline & Post-Editing Studio Modal */}
      {timelineClip && (
        <TimelineEditor
          clip={timelineClip}
          originalVideoPath={videoMetadata?.path || ''}
          onClose={() => setTimelineClip(null)}
          onApplyChanges={handleApplyTimelineChanges}
          isProcessing={isProcessing}
        />
      )}

      {/* Social Media Copy & Viral Hashtags Assistant Modal */}
      {socialModalClip && (
        <SocialCopyModal
          clip={socialModalClip}
          onClose={() => setSocialModalClip(null)}
          options={{
            videoPath: videoMetadata?.path || '',
            aspectRatio,
            layoutMode,
            whisperModel,
            language,
            llmProvider,
            ollamaModel,
            groqApiKey,
            groqModel,
            subtitleConfig,
          }}
          onUpdateClipSocialMetadata={handleUpdateClipSocialMetadata}
        />
      )}

      {/* Autonomous Agency HQ Room Modal */}
      <AgencyRoomModal
        isOpen={isAgencyModalOpen}
        onClose={() => setIsAgencyModalOpen(false)}
        messages={agencyMessages}
        onClearMessages={() => setAgencyMessages([])}
        agents={agencyAgents}
        onUpdateAgents={setAgencyAgents}
        isProcessing={isProcessing}
        onRunAgency={handleRunAgencyBrainstorm}
        hasVideo={!!videoMetadata}
        pipelineProgress={pipelineProgress}
        autopilotState={autopilotState}
        systemHealth={systemHealth}
      />

      {/* 🤖 7/24 Autonomous Media Agency & Publishing Archive Modal */}
      <AutopilotModal
        isOpen={isAutopilotModalOpen}
        onClose={() => setIsAutopilotModalOpen(false)}
        onPreviewClip={(clip) => setPreviewClip(clip)}
      />

      {/* ⚙️ Comprehensive Studio & System Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        llmProvider={llmProvider}
        setLlmProvider={setLlmProvider}
        ollamaModel={ollamaModel}
        setOllamaModel={setOllamaModel}
        groqApiKey={groqApiKey}
        setGroqApiKey={setGroqApiKey}
        groqModel={groqModel}
        setGroqModel={setGroqModel}
        whisperModel={whisperModel}
        setWhisperModel={setWhisperModel}
        language={language}
        setLanguage={setLanguage}
        onUpdateAgents={setAgencyAgents}
        aspectRatio={aspectRatio}
        setAspectRatio={setAspectRatio}
        layoutMode={layoutMode}
        setLayoutMode={setLayoutMode}
        clipCount={clipCount}
        setClipCount={setClipCount}
        minClipDuration={minClipDuration}
        setMinClipDuration={setMinClipDuration}
        maxClipDuration={maxClipDuration}
        setMaxClipDuration={setMaxClipDuration}
        enableSilenceRemoval={enableSilenceRemoval}
        setEnableSilenceRemoval={setEnableSilenceRemoval}
        outputDirectory={outputDirectory}
        setOutputDirectory={setOutputDirectory}
        subtitleConfig={subtitleConfig}
        setSubtitleConfig={setSubtitleConfig}
        systemHealth={systemHealth}
        autopilotState={autopilotState}
      />

      {/* Full Screen Video Preview Modal (Rendered on top of all modals) */}
      {previewClip && (
        <VideoPlayerModal
          clip={previewClip}
          onClose={() => setPreviewClip(null)}
          onShowInFolder={handleShowInFolder}
          onOpenSocialModal={(c) => setSocialModalClip(c)}
        />
      )}

      {/* 🎬 Operation & Meeting Summary Modal */}
      <OperationSummaryModal
        isOpen={showSummaryModal}
        onClose={() => setShowSummaryModal(false)}
        result={latestOperationResult}
        onClearTerminalAndAgency={handleClearTerminalAndAgency}
        onOpenFolder={handleOpenFolder}
        onPreviewClip={(clip) => setPreviewClip(clip)}
      />
    </div>
  );
};
