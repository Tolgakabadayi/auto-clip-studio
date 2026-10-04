import React, { useState, useEffect } from 'react';
import { Sparkles, Cpu, Film, Terminal, CheckCircle2, AlertCircle, Lock, Unlock, ArrowLeftRight, Bot, Settings } from 'lucide-react';
import { SystemHealth } from '../types';

interface HeaderProps {
  health: SystemHealth | null;
  isLayoutLocked?: boolean;
  onToggleLock?: () => void;
  onSwapPanels?: () => void;
  panelsSwapped?: boolean;
  onOpenAgencyRoom?: () => void;
  agencyMessageCount?: number;
  onOpenAutopilot?: () => void;
  isAutopilotRunning?: boolean;
  autopilotQueueCount?: number;
  onOpenSettings?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  health,
  isLayoutLocked = true,
  onToggleLock,
  onSwapPanels,
  panelsSwapped = false,
  onOpenAgencyRoom,
  agencyMessageCount = 0,
  onOpenAutopilot,
  isAutopilotRunning = false,
  autopilotQueueCount = 0,
  onOpenSettings,
}) => {
  const [isDockVisible, setIsDockVisible] = useState(true);

  useEffect(() => {
    if (window.electronAPI?.dockIsVisible) {
      window.electronAPI.dockIsVisible().then((vis) => {
        if (typeof vis === 'boolean') setIsDockVisible(vis);
      }).catch(console.error);
    }

    const unreg = window.electronAPI?.onDockVisibilityChange?.((visible) => {
      setIsDockVisible(visible);
    });

    return () => {
      if (unreg) unreg();
    };
  }, []);

  const handleToggleDock = async () => {
    if (window.electronAPI?.dockToggle) {
      const next = await window.electronAPI.dockToggle();
      setIsDockVisible(next);
    }
  };
  return (
    <header className="h-14 border-b border-dark-700 bg-dark-900/90 backdrop-blur-md px-6 flex items-center justify-between z-20">
      {/* Luxury Brand & Geometric Prism Emblem */}
      <div className="flex items-center space-x-3.5">
        <div className="relative group cursor-pointer">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500 via-brand-purple to-brand-cyan rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-500 animate-pulse" />
          <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-[#0c0d1b] via-[#121324] to-[#1a1230] border border-amber-400/40 flex items-center justify-center shadow-xl shadow-purple-950/50">
            <svg
              viewBox="0 0 40 40"
              className="w-6 h-6"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="auraGold" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#F59E0B" />
                  <stop offset="50%" stopColor="#EC4899" />
                  <stop offset="100%" stopColor="#8B5CF6" />
                </linearGradient>
                <linearGradient id="auraCyan" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#06B6D4" />
                  <stop offset="100%" stopColor="#3B82F6" />
                </linearGradient>
              </defs>
              <path
                d="M20 3L35 12V28L20 37L5 28V12L20 3Z"
                stroke="url(#auraGold)"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path
                d="M20 10L30 26H10L20 10Z"
                fill="url(#auraCyan)"
                fillOpacity="0.25"
                stroke="url(#auraGold)"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <circle cx="20" cy="20" r="2.5" fill="#FFE600" />
            </svg>
          </div>
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-base font-black tracking-wider bg-gradient-to-r from-amber-200 via-white to-brand-cyan bg-clip-text text-transparent">
              AURA STUDIO <span className="text-amber-400 font-extrabold text-xs ml-0.5">AI</span>
            </h1>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-brand-purple/20 text-amber-300 border border-amber-500/30 shadow-sm">
              ELITE v2.0
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium tracking-wide">
            Otonom Viral Sinema, Kanca Madenciliği & Shorts Motoru
          </p>
        </div>
      </div>

      {/* Top Header Actions */}
      <div className="flex items-center space-x-3 text-xs">

        {onSwapPanels && !isLayoutLocked && (
          <button
            onClick={onSwapPanels}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-dark-850 hover:bg-dark-750 border border-dark-700 text-slate-300 hover:text-white transition-colors"
            title="Sol ve Sağ panellerin yerini değiştir"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-brand-cyan" />
            <span className="text-[11px] font-medium">{panelsSwapped ? 'Orijinal Düzen' : 'Panelleri Değiş'}</span>
          </button>
        )}

        {onToggleLock && (
          <button
            onClick={onToggleLock}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all ${
              isLayoutLocked
                ? 'bg-dark-850 border-dark-700 text-slate-400 hover:text-white'
                : 'bg-brand-purple/20 border-brand-purple text-brand-purple'
            }`}
            title={isLayoutLocked ? 'Düzen kilitli. Değiştirmek için tıklayın.' : 'Düzen serbest. Panelleri taşıyabilirsiniz.'}
          >
            {isLayoutLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5 text-brand-purple animate-pulse" />}
            <span>{isLayoutLocked ? 'Düzen Kilitli' : 'Düzeni Düzenle'}</span>
          </button>
        )}

        {/* Windows Desktop Docker Toggle Button */}
        <button
          onClick={handleToggleDock}
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all ${
            isDockVisible
              ? 'bg-brand-purple/20 border-brand-purple text-brand-purple shadow-sm shadow-brand-purple/20'
              : 'bg-dark-850 hover:bg-dark-750 border-dark-700 text-slate-400 hover:text-white'
          }`}
          title={isDockVisible ? 'Windows Docker Açık (Kapatmak için tıklayın)' : 'Windows Docker Kapalı (Açmak için tıklayın)'}
        >
          <Bot className={`w-3.5 h-3.5 ${isDockVisible ? 'text-brand-purple animate-pulse' : 'text-slate-400'}`} />
          <span>Windows Docker</span>
          <span className={`w-1.5 h-1.5 rounded-full ${isDockVisible ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-slate-500'}`} />
        </button>

        {/* Global Settings Button */}
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-dark-850 hover:bg-dark-750 border border-dark-700 text-slate-300 hover:text-white transition-colors"
            title="Stüdyo ve Sistem Ayarlarını Aç (Yapay Zeka, Docker, Video)"
          >
            <Settings className="w-3.5 h-3.5 text-brand-cyan" />
            <span className="text-[11px] font-medium">Ayarlar</span>
          </button>
        )}
      </div>
    </header>
  );
};
