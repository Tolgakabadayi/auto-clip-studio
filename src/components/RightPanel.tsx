import React, { useRef, useEffect, useState } from 'react';
import {
  Terminal,
  Folder,
  ExternalLink,
  Copy,
  Check,
  Trash2,
  Loader2,
  Sparkles,
  Bot,
  Maximize2
} from 'lucide-react';
import { AgencyMessage } from '../types';

interface RightPanelProps {
  logs: string[];
  onClearLogs?: () => void;
  outputDirectory: string;
  onSelectOutputFolder: () => void;
  onOpenFolder: () => void;
  isProcessing?: boolean;
  agencyMessages?: AgencyMessage[];
  onOpenAgencyModal?: () => void;
}

export const RightPanel: React.FC<RightPanelProps> = ({
  logs = [],
  onClearLogs,
  outputDirectory,
  onSelectOutputFolder,
  onOpenFolder,
  isProcessing = false,
  agencyMessages = [],
  onOpenAgencyModal,
}) => {
  const [activeTab, setActiveTab] = useState<'terminal' | 'agency'>('terminal');
  const logEndRef = useRef<HTMLDivElement | null>(null);
  const agencyEndRef = useRef<HTMLDivElement | null>(null);
  const [copied, setCopied] = useState(false);

  // Auto-scroll to bottom on new logs or agency messages
  useEffect(() => {
    if (activeTab === 'terminal' && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    } else if (activeTab === 'agency' && agencyEndRef.current) {
      agencyEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, agencyMessages, activeTab]);

  // Auto-switch to agency tab when agency starts talking
  useEffect(() => {
    if (agencyMessages.length === 1) {
      setActiveTab('agency');
    }
  }, [agencyMessages.length]);

  const handleCopy = () => {
    if (activeTab === 'terminal') {
      if (logs.length === 0) return;
      navigator.clipboard.writeText(logs.join('\n'));
    } else {
      if (agencyMessages.length === 0) return;
      const text = agencyMessages
        .map((m) => `[${m.timestamp}] [${m.agentName} (${m.agentModel})]: ${m.content}`)
        .join('\n\n');
      navigator.clipboard.writeText(text);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getLogStyle = (log: string) => {
    if (log.includes('HATA') || log.includes('✗') || log.includes('failed') || log.includes('Error')) {
      return 'text-rose-400 font-semibold bg-rose-500/10 px-1 py-0.5 rounded';
    }
    if (log.includes('✓') || log.includes('başarıyla') || log.includes('Tamamlandı')) {
      return 'text-emerald-400 font-medium';
    }
    if (log.includes('[YouTube]') || log.includes('indirme')) {
      return 'text-amber-400 font-medium';
    }
    if (log.includes('[Yüz Takibi]') || log.includes('FaceTracking')) {
      return 'text-brand-cyan font-medium';
    }
    if (log.includes('[LLM') || log.includes('Gemma') || log.includes('Qwen') || log.includes('Groq') || log.includes('[Ajans:')) {
      return 'text-purple-400 font-medium';
    }
    if (log.includes('Pipeline başlatıldı') || log.includes('Klip')) {
      return 'text-white font-semibold';
    }
    return 'text-slate-300';
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'trend_hunter':
        return { label: 'Avcı', avatar: '🛰️', color: 'text-orange-300 bg-orange-500/20 border-orange-500/30' };
      case 'copyright_auditor':
        return { label: 'Hukuk', avatar: '⚖️', color: 'text-emerald-300 bg-emerald-500/20 border-emerald-500/30' };
      case 'scheduler':
        return { label: 'Planlayıcı', avatar: '📅', color: 'text-indigo-300 bg-indigo-500/20 border-indigo-500/30' };
      case 'ceo':
        return { label: 'CEO', avatar: '👑', color: 'text-purple-300 bg-purple-500/20 border-purple-500/30' };
      case 'scout':
        return { label: 'Scout', avatar: '⚡', color: 'text-amber-300 bg-amber-500/20 border-amber-500/30' };
      case 'art_director':
        return { label: 'Görsel', avatar: '👁️', color: 'text-cyan-300 bg-cyan-500/20 border-cyan-500/30' };
      case 'copywriter':
        return { label: 'Metin', avatar: '✍️', color: 'text-emerald-300 bg-emerald-500/20 border-emerald-500/30' };
      case 'qa':
        return { label: 'QA', avatar: '🛡️', color: 'text-blue-300 bg-blue-500/20 border-blue-500/30' };
      default:
        return { label: 'Ajan', avatar: '🤖', color: 'text-slate-300 bg-slate-500/20 border-slate-500/30' };
    }
  };

  return (
    <aside className="w-80 border-l border-dark-700 bg-dark-900/90 backdrop-blur flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden select-none">
      {/* Top Tab Bar: Terminal vs Ajans Akışı */}
      <div className="p-2 border-b border-dark-700 bg-dark-900/95 shrink-0 flex items-center justify-between">
        <div className="grid grid-cols-2 gap-1 bg-dark-850 p-1 rounded-xl border border-dark-750 flex-1 mr-2">
          <button
            type="button"
            onClick={() => setActiveTab('terminal')}
            className={`py-1 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'terminal'
                ? 'bg-brand-purple text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Terminal</span>
            <span className="text-[10px] font-mono opacity-70">({logs.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('agency')}
            className={`py-1 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 relative ${
              activeTab === 'agency'
                ? 'bg-brand-purple text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-amber-400" />
            <span>👑 Ajans</span>
            {agencyMessages.length > 0 && (
              <span className="text-[10px] px-1 rounded-full bg-amber-400 text-black font-bold">
                {agencyMessages.length}
              </span>
            )}
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-1 shrink-0">
          {activeTab === 'agency' && onOpenAgencyModal && (
            <button
              type="button"
              onClick={onOpenAgencyModal}
              className="p-1.5 rounded-lg text-brand-cyan hover:bg-dark-800 transition-colors"
              title="Ajans Odasını Büyüt"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-dark-800 transition-colors"
            title="Kopyala"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          {activeTab === 'terminal' && onClearLogs && (
            <button
              type="button"
              onClick={onClearLogs}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-dark-800 transition-colors"
              title="Temizle"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Content Area: Terminal Tab */}
      {activeTab === 'terminal' && (
        <div className="flex-1 overflow-y-auto p-3.5 font-mono text-[11px] leading-relaxed bg-dark-950/80 space-y-1.5 select-text">
          {logs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-2 text-slate-500">
              <Terminal className="w-8 h-8 opacity-40" />
              <p className="text-xs">İşlem günlüğü hazır.</p>
              <p className="text-[10px] text-slate-600 max-w-[200px]">
                Video indirme, deşifre, LLM analizi ve render logları burada canlı olarak listelenir.
              </p>
            </div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="flex items-start space-x-2">
                <span className="text-slate-600 select-none shrink-0 text-[10px] mt-0.5">›</span>
                <span className={`break-words flex-1 ${getLogStyle(log)}`}>
                  {log}
                </span>
              </div>
            ))
          )}
          <div ref={logEndRef} />
        </div>
      )}

      {/* Content Area: Agency Chat Feed Tab */}
      {activeTab === 'agency' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-dark-950/90 select-text">
          {agencyMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-2.5 text-slate-500">
              <div className="w-12 h-12 rounded-2xl bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center text-brand-purple">
                <Bot className="w-6 h-6" />
              </div>
              <p className="text-xs font-semibold text-slate-300">Ajans Odası Beklemede</p>
              <p className="text-[10px] text-slate-500 max-w-[210px] leading-relaxed">
                Klip üretimi başladığında; Scout, CEO, Görsel Yönetmen ve Metin Yazarı burada canlı konuşarak kararları alacaktır.
              </p>
              {onOpenAgencyModal && (
                <button
                  type="button"
                  onClick={onOpenAgencyModal}
                  className="mt-2 text-[11px] text-brand-cyan hover:underline font-semibold"
                >
                  Ajans Masasını İncele →
                </button>
              )}
            </div>
          ) : (
            agencyMessages.map((msg) => {
              const meta = getRoleBadge(msg.role);
              return (
                <div
                  key={msg.id}
                  className="p-2.5 rounded-xl bg-dark-850/90 border border-dark-750 space-y-1.5 shadow-sm text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-sm">{meta.avatar}</span>
                      <span className="font-bold text-white text-[11px]">{msg.agentName}</span>
                      <span className={`text-[9px] font-semibold px-1.5 py-0.2 rounded border ${meta.color}`}>
                        {meta.label}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">{msg.timestamp}</span>
                  </div>
                  <p className="text-[11px] text-slate-200 leading-snug whitespace-pre-wrap">
                    {msg.content}
                  </p>
                </div>
              );
            })
          )}
          <div ref={agencyEndRef} />
        </div>
      )}

      {/* PINNED / STICKY EXPORT CONTAINER AT THE BOTTOM */}
      <div className="p-3.5 border-t border-dark-700 bg-dark-900/95 backdrop-blur shrink-0 space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center">
            <Folder className="w-3.5 h-3.5 text-brand-cyan mr-1.5" />
            Dışa Aktarma Klasörü
          </label>
          <button
            type="button"
            onClick={onSelectOutputFolder}
            className="text-[11px] font-semibold text-brand-purple hover:text-brand-purple/80 transition-colors"
          >
            Değiştir
          </button>
        </div>

        <p
          className="text-[11px] font-mono text-slate-400 truncate bg-dark-950 px-2.5 py-1.5 rounded-lg border border-dark-750"
          title={outputDirectory || 'Otomatik (Video Yanı)'}
        >
          {outputDirectory || 'Otomatik (Video Yanı)'}
        </p>

        <button
          type="button"
          onClick={onOpenFolder}
          className="w-full py-2.5 px-3 rounded-xl bg-dark-850 hover:bg-dark-800 border border-dark-600 text-xs font-bold text-slate-200 hover:text-white transition-all flex items-center justify-center space-x-2 shadow-sm hover:scale-[1.01]"
        >
          <ExternalLink className="w-3.5 h-3.5 text-brand-cyan" />
          <span>Kayıt Klasörünü Aç (Explorer)</span>
        </button>
      </div>
    </aside>
  );
};
