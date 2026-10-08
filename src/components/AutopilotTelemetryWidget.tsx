import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Bot,
  Zap,
  Activity,
  Play,
  Clock,
  Radio,
  Flame,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Layers,
  ArrowRight,
  TrendingUp,
  Cpu
} from 'lucide-react';
import { AutopilotState, PipelineProgress } from '../types';

interface AutopilotTelemetryWidgetProps {
  autopilotState: AutopilotState | null;
  pipelineProgress?: PipelineProgress;
  onOpenAutopilot: () => void;
}

export const AutopilotTelemetryWidget: React.FC<AutopilotTelemetryWidgetProps> = ({
  autopilotState,
  pipelineProgress,
  onOpenAutopilot,
}) => {
  // Live Millisecond Telemetry Clock (updates every 50ms)
  const [msTicker, setMsTicker] = useState<string>('00:00:00.000');

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      const ms = String(now.getMilliseconds()).padStart(3, '0');
      setMsTicker(`${h}:${m}:${s}.${ms}`);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const isBusy = !!autopilotState?.isBusy || (!!pipelineProgress && pipelineProgress.percent > 0 && pipelineProgress.percent < 100);
  const isRunning = !!autopilotState?.isRunning;

  // Determine active action & progress
  const activePercent = isBusy
    ? Math.max(5, autopilotState?.activeProgress?.percent || pipelineProgress?.percent || 15)
    : isRunning
    ? 100
    : 0;

  const activeStepTitle = autopilotState?.activeProgress?.stepTitle ||
    (pipelineProgress?.step === 'downloading_youtube' ? 'YouTube İndiriliyor' :
     pipelineProgress?.step === 'transcribing' ? 'Whisper AI Deşifre' :
     pipelineProgress?.step === 'detecting_highlights' ? 'Viral Kanca Tespiti' :
     pipelineProgress?.step === 'rendering_clips' ? '9:16 Render & Altyazı' :
     isRunning ? 'Altın Saat Radarı Devriyede' : 'Otonom Sistem Hazır');

  const activeActionText = autopilotState?.currentAction ||
    pipelineProgress?.message ||
    (isRunning
      ? `Sonraki otomatik yayın: ${autopilotState?.nextSlotInfo?.slotTime || '18:30'} (${autopilotState?.nextSlotInfo?.minutesRemaining || 0} dk)`
      : '7/24 otonom klip üretimi ve yayın için başlatılabilir.');

  const totalGenerated = autopilotState?.stats?.totalGenerated || 0;
  const packagesCount = autopilotState?.packages?.length || 0;
  const nextSlot = autopilotState?.nextSlotInfo?.slotTime || '18:30';

  // SVG Gauge calculations
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (activePercent / 100) * circumference;

  return (
    <div
      onClick={onOpenAutopilot}
      className="group relative overflow-hidden rounded-2xl p-3.5 bg-gradient-to-br from-[#0a0c1e] via-[#070815] to-[#04050d] border border-amber-500/30 hover:border-amber-400 text-left transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] shadow-xl hover:shadow-amber-500/20 cursor-pointer select-none"
    >
      {/* Background Animated Cyber Matrix & Pulse Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.12),transparent_60%)] pointer-events-none" />
      <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all pointer-events-none" />

      {/* TOP HEADER ROW: Title, Live Status Pill & Real-Time Millisecond Clock */}
      <div className="flex items-center justify-between relative z-10 mb-2.5 pb-2 border-b border-dark-750/70">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-inner">
            <Radio className={`w-3.5 h-3.5 ${isBusy ? 'animate-spin' : isRunning ? 'animate-pulse' : ''}`} />
          </div>
          <div>
            <span className="text-[10px] font-black tracking-wider uppercase text-amber-300 flex items-center gap-1.5">
              <span>7/24 OTOPİLOT WIDGET</span>
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Millisecond-level Telemetry Ticker */}
          <span className="font-mono text-[9px] font-bold text-amber-400/90 bg-dark-950 px-1.5 py-0.5 rounded border border-dark-750 tracking-wider">
            {msTicker}
          </span>

          {/* Status Badge */}
          <span
            className={`text-[9px] font-black px-2 py-0.5 rounded-full border flex items-center gap-1 uppercase tracking-wider ${
              isBusy
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                : isRunning
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : 'bg-dark-800 text-slate-400 border-dark-700'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isBusy ? 'bg-amber-400 animate-ping' : isRunning ? 'bg-emerald-400' : 'bg-slate-500'
              }`}
            />
            {isBusy ? 'İŞLEMDE' : isRunning ? '7/24 AKTİF' : 'BEKLEMEDE'}
          </span>
        </div>
      </div>

      {/* CENTER COCKPIT: Circular Gauge + Live Real-Time Telemetry Feed */}
      <div className="flex items-center space-x-3.5 relative z-10 mb-2.5">
        {/* 1. Circular Telemetry Gauge */}
        <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
          <svg className="w-16 h-16 transform -rotate-90">
            {/* Background Track */}
            <circle
              cx="32"
              cy="32"
              r={radius}
              className="text-dark-800 stroke-current"
              strokeWidth="5"
              fill="transparent"
            />
            {/* Active Glow Bar */}
            <circle
              cx="32"
              cy="32"
              r={radius}
              className={`stroke-current transition-all duration-300 ${
                isBusy ? 'text-amber-400' : isRunning ? 'text-emerald-400' : 'text-slate-600'
              }`}
              strokeWidth="5"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>

          {/* Center Info in Gauge */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            {isBusy ? (
              <>
                <span className="text-[11px] font-black text-white font-mono leading-none">
                  %{activePercent}
                </span>
                <span className="text-[8px] font-bold text-amber-400 uppercase mt-0.5">CANLI</span>
              </>
            ) : isRunning ? (
              <>
                <Cpu className="w-4 h-4 text-emerald-400" />
                <span className="text-[8px] font-bold text-emerald-400 uppercase mt-0.5">RADAR</span>
              </>
            ) : (
              <>
                <Bot className="w-4 h-4 text-slate-400" />
                <span className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">HAZIR</span>
              </>
            )}
          </div>
        </div>

        {/* 2. Live Action Telemetry Details */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center space-x-1.5">
            <span className="text-[11px] font-extrabold text-white truncate group-hover:text-amber-300 transition-colors">
              {activeStepTitle}
            </span>
            {autopilotState?.activeAgent && (
              <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-brand-purple/20 text-brand-cyan border border-brand-purple/30 truncate">
                {autopilotState.activeAgent}
              </span>
            )}
          </div>

          <p className="text-[10px] text-slate-300 font-medium leading-tight line-clamp-2">
            {activeActionText}
          </p>

          {/* Real-time horizontal segmented activity strip */}
          <div className="w-full bg-dark-900 rounded-full h-1.5 overflow-hidden border border-dark-750/80">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isBusy
                  ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-300 animate-pulse'
                  : isRunning
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                  : 'bg-slate-700'
              }`}
              style={{ width: `${Math.max(8, activePercent)}%` }}
            />
          </div>
        </div>
      </div>

      {/* BOTTOM TELEMETRY GRID: Micro Stat Badges & Direct Launch Arrow */}
      <div className="relative z-10 grid grid-cols-3 gap-1.5 pt-2 border-t border-dark-750/70 font-mono text-center">
        <div className="bg-[#0c0e22] p-1.5 rounded-lg border border-dark-750/80">
          <span className="text-[8px] text-slate-400 block uppercase">Sıradaki</span>
          <span className="text-[10px] font-black text-amber-300 block truncate">
            {nextSlot}
          </span>
        </div>

        <div className="bg-[#0c0e22] p-1.5 rounded-lg border border-dark-750/80">
          <span className="text-[8px] text-slate-400 block uppercase">Hazır Paket</span>
          <span className="text-[10px] font-black text-brand-cyan block truncate">
            {packagesCount} adet
          </span>
        </div>

        <div className="bg-[#0c0e22] p-1.5 rounded-lg border border-dark-750/80">
          <span className="text-[8px] text-slate-400 block uppercase">Toplam Üretim</span>
          <span className="text-[10px] font-black text-emerald-400 block truncate">
            {totalGenerated} klip
          </span>
        </div>
      </div>

      {/* Click Hover Prompt */}
      <div className="mt-2 pt-1 flex items-center justify-between text-[9px] text-slate-400 group-hover:text-amber-300 transition-colors">
        <span className="flex items-center gap-1 font-sans">
          <Activity className="w-3 h-3 text-amber-400" />
          <span>7/24 Otonom Yayın & Arşiv Kontrolü</span>
        </span>
        <span className="flex items-center gap-0.5 font-bold">
          <span>Paneli Aç</span>
          <ArrowRight className="w-2.5 h-2.5 group-hover:translate-x-1 transition-transform" />
        </span>
      </div>
    </div>
  );
};
