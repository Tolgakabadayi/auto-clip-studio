import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  Activity,
  Clock,
  Sparkles,
  RotateCcw,
  Users,
  Layers,
  Cpu,
  CheckCircle2,
  Terminal,
  Volume2
} from 'lucide-react';
import { IsometricOffice3D, AgentStatus3D, AGENTS_3D_ROSTER, Agent3DMeta } from '../office3d';
import { AgencyRole } from '../types';

interface Office3DViewportProps {
  activeAgentRole?: AgencyRole | null;
  activeWorkMessage?: string;
  activePercent?: number;
  elapsedSeconds?: number;
  isProcessing?: boolean;
  onSelectAgent?: (role: AgencyRole) => void;
  onRunMeeting?: () => void;
  hasVideo?: boolean;
  youtubeAnalytics?: any;
}

export const Office3DViewport: React.FC<Office3DViewportProps> = ({
  activeAgentRole,
  activeWorkMessage = '14 Ajan operasyon masalarında hazır bekliyor.',
  activePercent = 0,
  elapsedSeconds = 0,
  isProcessing = false,
  onSelectAgent,
  onRunMeeting,
  hasVideo = true,
  youtubeAnalytics,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const office3dRef = useRef<IsometricOffice3D | null>(null);
  const onSelectAgentRef = useRef(onSelectAgent);

  useEffect(() => {
    onSelectAgentRef.current = onSelectAgent;
  }, [onSelectAgent]);

  const [activeCount, setActiveCount] = useState<number>(0);
  const [meetingMode, setMeetingMode] = useState<boolean>(false);
  const [ollamaStatus, setOllamaStatus] = useState<'idle' | 'calling' | 'success' | 'error'>('idle');
  const [ollamaOutput, setOllamaOutput] = useState<string>('');
  const [hoveredAgent, setHoveredAgent] = useState<{
    meta: Agent3DMeta;
    pos: { x: number; y: number };
    status: AgentStatus3D;
  } | null>(null);

  // 1. Initialize Isometric 3D Office Engine ONCE without continuous disposal loop
  useEffect(() => {
    if (!containerRef.current) return;

    const office3d = new IsometricOffice3D(containerRef.current, {
      onSelectAgent: (agentId: string) => {
        // Map 3D agent id to AgencyRole
        const matched = AGENTS_3D_ROSTER.find((a) => a.id === agentId || a.role === agentId);
        if (matched && onSelectAgentRef.current) {
          onSelectAgentRef.current(matched.role as AgencyRole);
        }
      },
      onHoverAgent: (meta, screenPos) => {
        if (meta && screenPos && containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const relX = screenPos.x - rect.left;
          const relY = screenPos.y - rect.top;
          const status = office3dRef.current?.getAgentStatus(meta.id) || 'idle';
          setHoveredAgent({
            meta,
            pos: { x: relX, y: relY },
            status,
          });
        } else {
          setHoveredAgent(null);
        }
      },
    });

    office3dRef.current = office3d;

    return () => {
      office3d.dispose();
      office3dRef.current = null;
    };
  }, []);

  // Update 3D Wall Scoreboard when analytics arrive
  useEffect(() => {
    if (!office3dRef.current || !youtubeAnalytics) return;
    office3dRef.current.updateScoreboardStats({
      totalViews: youtubeAnalytics.totalViews,
      subscriberCount: youtubeAnalytics.subscriberCount,
      totalVideos: youtubeAnalytics.totalVideos,
      nextScheduled: youtubeAnalytics.nextScheduledUpload
        ? `${youtubeAnalytics.nextScheduledUpload.time || ''} (${youtubeAnalytics.nextScheduledUpload.dayLabel || 'Planlandı'})`
        : undefined,
      totalLikes: youtubeAnalytics.totalLikes,
      sumOfVideoViews: youtubeAnalytics.sumOfVideoViews,
    });
  }, [youtubeAnalytics]);

  // Matching active agent meta
  const activeAgentInfo = useMemo(() => {
    if (!activeAgentRole) return null;
    return (
      AGENTS_3D_ROSTER.find(
        (a) => a.role === activeAgentRole || a.id === activeAgentRole
      ) ||
      (activeAgentRole === 'security_supervisor'
        ? AGENTS_3D_ROSTER.find((a) => a.role === 'qa')
        : null)
    );
  }, [activeAgentRole]);

  // 2. React to active agent turn changes (Individual worker spotlight with flashing light & reaction)
  useEffect(() => {
    if (!office3dRef.current) return;

    if (activeAgentInfo) {
      if (!meetingMode) {
        // Set all other agents to idle, and active one to working
        AGENTS_3D_ROSTER.forEach((a) => {
          if (a.id !== activeAgentInfo.id) {
            office3dRef.current?.setAgentStatus(a.id, 'idle');
          }
        });
        office3dRef.current.setAgentStatus(activeAgentInfo.id, 'working');
        setActiveCount(1);
      }
    } else if (!isProcessing && !meetingMode) {
      AGENTS_3D_ROSTER.forEach((a) => {
        office3dRef.current?.setAgentStatus(a.id, 'idle');
      });
      setActiveCount(0);
    }
  }, [activeAgentInfo, isProcessing, meetingMode]);

  // Format timer
  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remSec = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${remSec.toString().padStart(2, '0')} sn`;
  };

  // Manual Reset Handler
  const handleResetOffice = useCallback(() => {
    if (office3dRef.current) {
      office3dRef.current.resetAllAgents();
      office3dRef.current.resetCameraView();
      setMeetingMode(false);
      setActiveCount(0);
      setOllamaOutput('');
    }
  }, []);

  // Direct Ollama Consensus Meeting Trigger
  const handleTriggerMeeting = useCallback(async () => {
    if (office3dRef.current) {
      setMeetingMode(true);
      office3dRef.current.startMeeting();
      setActiveCount(12);
    }

    if (onRunMeeting) {
      onRunMeeting();
      return;
    }

    if (!office3dRef.current) return;
    setOllamaStatus('calling');
    setOllamaOutput('Yerel Ollama (http://localhost:11434) konsensüs toplantısı başlatılıyor...');

    try {
      const results = await office3dRef.current.startMeetingConsensus(
        'Viral YouTube Shorts & TikTok Kurgusu'
      );
      setOllamaStatus('success');
      setOllamaOutput(results['ceo'] || 'Konsensüs tamamlandı!');
    } catch (err: any) {
      console.warn('Ollama direct call note:', err);
      setOllamaStatus('error');
      setOllamaOutput(`Ollama notu: ${err.message}`);
    } finally {
      setTimeout(() => {
        setOllamaStatus('idle');
        setMeetingMode(false);
      }, 4000);
    }
  }, [onRunMeeting]);

  return (
    <div
      id="office-3d-viewport"
      className="w-full h-full min-h-[640px] flex-1 rounded-2xl overflow-hidden relative border border-slate-800 bg-[#0c0d16] shadow-2xl select-none"
    >
      {/* 3D WebGL Canvas Container Mount */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* ======================================================== */}
      {/* FLOATING INTERACTIVE SPEECH BALLOON ON AGENT HOVER       */}
      {/* ======================================================== */}
      {hoveredAgent && (
        <div
          className="absolute pointer-events-none z-30 transition-transform duration-100 ease-out animate-fadeIn"
          style={{
            left: `${Math.min(Math.max(hoveredAgent.pos.x, 150), (containerRef.current?.clientWidth || 800) - 160)}px`,
            top: `${Math.max(hoveredAgent.pos.y - 25, 90)}px`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          {/* Futuristic Speech Balloon Card */}
          <div
            className="relative p-3.5 rounded-2xl bg-dark-950/95 backdrop-blur-xl border shadow-2xl flex flex-col space-y-2 max-w-xs min-w-[280px]"
            style={{
              borderColor: `#${hoveredAgent.meta.accentColor.toString(16).padStart(6, '0')}`,
              boxShadow: `0 12px 36px rgba(0,0,0,0.9), 0 0 24px #${hoveredAgent.meta.accentColor.toString(16).padStart(6, '0')}44`,
            }}
          >
            {/* Header: Avatar, Name, Department & Status */}
            <div className="flex items-center justify-between pb-1.5 border-b border-dark-800">
              <div className="flex items-center space-x-2">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-lg border shadow-sm"
                  style={{
                    backgroundColor: `#${hoveredAgent.meta.accentColor.toString(16).padStart(6, '0')}22`,
                    borderColor: `#${hoveredAgent.meta.accentColor.toString(16).padStart(6, '0')}66`,
                  }}
                >
                  {hoveredAgent.meta.avatar}
                </div>
                <div>
                  <div className="text-xs font-black text-white flex items-center gap-1.5">
                    <span>{hoveredAgent.meta.name}</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-dark-850 text-slate-400 border border-dark-750">
                      Pod {hoveredAgent.meta.pod}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium">
                    {hoveredAgent.meta.title}
                  </div>
                </div>
              </div>

              {/* Status Pill */}
              <span
                className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                  hoveredAgent.status === 'working'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                    : hoveredAgent.status === 'meeting'
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                }`}
              >
                {hoveredAgent.status === 'working'
                  ? '⚡ Çalışıyor'
                  : hoveredAgent.status === 'meeting'
                  ? '🤝 Toplantıda'
                  : '💤 Hazır'}
              </span>
            </div>

            {/* Live Dynamic Speech Quote */}
            <div className="p-2 rounded-xl bg-dark-900/90 border border-dark-800/80 text-[11px] text-slate-200 leading-snug">
              <span className="text-amber-400 mr-1 font-bold">💬</span>
              <span className="italic text-slate-100">
                "{hoveredAgent.meta.liveQuote[hoveredAgent.status] || hoveredAgent.meta.liveQuote.idle}"
              </span>
            </div>

            {/* Footer: Model & Interaction Hint */}
            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
              <span className="font-mono text-slate-400 flex items-center gap-1">
                <Cpu className="w-3 h-3 text-brand-purple" />
                <span>{hoveredAgent.meta.model}</span>
              </span>
              <span className="text-brand-cyan font-bold">
                🖱️ Ajan Dosyası için Tıkla
              </span>
            </div>

            {/* Speech Balloon Tail Triangle */}
            <div
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px]"
              style={{
                borderTopColor: `#${hoveredAgent.meta.accentColor.toString(16).padStart(6, '0')}`,
              }}
            />
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABSOLUTE OVERLAY: TOP-LEFT OPERATIONAL STATUS             */}
      {/* ======================================================== */}
      <div className="absolute top-4 left-4 z-20 pointer-events-auto flex flex-col space-y-2 max-w-md">
        <div className="p-3 rounded-xl bg-dark-950/85 backdrop-blur-md border border-dark-750/90 shadow-xl space-y-1.5">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-200">
              3D İZOMETRİK OFİS SİMÜLASYONU
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30">
              60 FPS WebGL
            </span>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="flex items-center gap-1 text-amber-400 font-bold shrink-0">
              <Activity className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
              <span>İşlem:</span>
            </span>
            <span className="text-white font-medium truncate" title={activeWorkMessage}>
              {activeWorkMessage}
            </span>
          </div>

          {activeAgentInfo && (
            <div className="flex items-center space-x-1.5 text-[11px] bg-amber-500/15 border border-amber-500/40 px-2 py-1 rounded-lg text-amber-300 font-semibold animate-pulse shadow-sm shadow-amber-500/20">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
              <span>⚡ Aktif Çalışan:</span>
              <strong className="text-white font-bold">{activeAgentInfo.avatar} {activeAgentInfo.name}</strong>
              <span className="text-[10px] text-amber-300/80 font-mono truncate">({activeAgentInfo.title})</span>
            </div>
          )}

          <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-dark-800 pt-1.5 mt-1">
            <div className="flex items-center space-x-1">
              <Clock className="w-3 h-3 text-brand-cyan" />
              <span>Süre:</span>
              <strong className="text-slate-200 font-mono">{formatTimer(elapsedSeconds)}</strong>
            </div>
            <div className="flex items-center space-x-1 font-mono text-[10px]">
              <span className="text-slate-400">İlerleme:</span>
              <span className="text-brand-cyan font-bold">%{activePercent}</span>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 border-t border-dark-800/60 pt-1 flex items-center justify-between">
            <span>🖱️ Sol Tık: Döndür • Tekerlek: Zoom</span>
            <button
              onClick={() => office3dRef.current?.resetCameraView()}
              className="text-brand-cyan hover:underline font-bold"
            >
              Açıyı Sıfırla
            </button>
          </div>
        </div>

        {/* Live Ollama Consensus Output Floating Box */}
        {ollamaOutput && (
          <div className="p-2.5 rounded-xl bg-dark-900/90 backdrop-blur-md border border-brand-purple/40 text-[11px] text-purple-200 shadow-lg animate-fadeIn line-clamp-2">
            <span className="font-bold text-white mr-1.5">🤖 Ollama (11434):</span>
            {ollamaOutput}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* ABSOLUTE OVERLAY: TOP-RIGHT ACTIVE AGENT COUNTER & ACTIONS */}
      {/* ======================================================== */}
      <div className="absolute top-4 right-4 z-20 pointer-events-auto flex items-center space-x-2.5">
        {/* Active Agents Badge */}
        <div className="px-3.5 py-1.5 rounded-xl bg-dark-950/85 backdrop-blur-md border border-dark-750/90 shadow-xl flex items-center space-x-2 text-xs">
          <Users className="w-4 h-4 text-brand-purple" />
          <span className="text-slate-300 font-medium">Ajan Durumu:</span>
          <span className={`font-bold font-mono px-2 py-0.5 rounded-md border flex items-center gap-1.5 ${
            meetingMode
              ? 'bg-purple-950/80 border-purple-600/70 text-purple-300'
              : activeAgentInfo
              ? 'bg-amber-950/80 border-amber-500/70 text-amber-300 shadow-md shadow-amber-500/20 animate-pulse'
              : 'bg-dark-850 border-dark-700 text-emerald-400'
          }`}>
            {meetingMode
              ? '🤝 12/12 Toplantıda'
              : activeAgentInfo
              ? `🔥 ${activeAgentInfo.name} (Çalışıyor)`
              : '12 Hazır (Beklemede)'}
          </span>
        </div>

        {/* Reset Positions & Camera Button */}
        <button
          onClick={handleResetOffice}
          className="p-2 rounded-xl bg-dark-950/85 hover:bg-dark-850 backdrop-blur-md border border-dark-750/90 text-slate-300 hover:text-white shadow-xl transition-all"
          title="Tüm ajanları masalarına geri döndür ve kamera açısını sıfırla"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* ======================================================== */}
      {/* ABSOLUTE OVERLAY: BOTTOM PODS LEGEND (POD 1 & POD 2)       */}
      {/* ======================================================== */}
      <div className="absolute bottom-4 inset-x-4 z-20 pointer-events-none flex items-center justify-between text-[11px]">
        {/* Pod 1 Legend */}
        <div className="pointer-events-auto px-3 py-1.5 rounded-xl bg-dark-950/80 backdrop-blur-md border border-amber-500/30 text-amber-300 shadow-lg flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span className="font-bold">Pod 1 (Sol Kanat):</span>
          <span className="text-slate-300">Hunter • Legal • Scout • Director • Vision • Copy</span>
        </div>

        {/* Pod 2 Legend */}
        <div className="pointer-events-auto px-3 py-1.5 rounded-xl bg-dark-950/80 backdrop-blur-md border border-brand-cyan/30 text-cyan-300 shadow-lg flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="font-bold">Pod 2 (Sağ Kanat):</span>
          <span className="text-slate-300">Auditor • Planner • Hook • SEO • Audio • Polyglot</span>
        </div>
      </div>
    </div>
  );
};
