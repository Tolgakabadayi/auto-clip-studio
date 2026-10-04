import React, { useState } from 'react';
import { Terminal, ChevronUp, ChevronDown, ArrowLeftRight, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

interface TerminalLogsProps {
  logs: string[];
  position: 'left' | 'right' | 'bottom';
  onChangePosition: (pos: 'left' | 'right' | 'bottom') => void;
  isLocked: boolean;
}

export const TerminalLogs: React.FC<TerminalLogsProps> = ({
  logs,
  position,
  onChangePosition,
  isLocked,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(true);

  if (position === 'bottom') {
    return (
      <div className="border-t border-dark-700 bg-dark-900/95 backdrop-blur-md shadow-2xl z-30 transition-all select-none">
        <div className="px-6 py-2.5 flex items-center justify-between bg-dark-850/80 border-b border-dark-750">
          <div className="flex items-center space-x-3">
            <span className="flex items-center text-xs font-semibold text-white">
              <Terminal className="w-4 h-4 mr-2 text-brand-cyan" />
              İşlem Günlüğü (Terminal)
              {logs.length > 0 && (
                <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-mono bg-dark-750 text-slate-300">
                  {logs.length}
                </span>
              )}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {!isLocked && (
              <div className="flex items-center space-x-1 bg-dark-900 px-2 py-1 rounded-lg border border-dark-700 text-[10px] text-slate-400">
                <span className="mr-1 font-medium">Yerleşim:</span>
                <button
                  onClick={() => onChangePosition('left')}
                  className="px-1.5 py-0.5 rounded hover:bg-dark-750 hover:text-white"
                  title="Sol Panele Taşı"
                >
                  ⬅ Sol
                </button>
                <span>|</span>
                <button
                  onClick={() => onChangePosition('right')}
                  className="px-1.5 py-0.5 rounded hover:bg-dark-750 hover:text-white"
                  title="Sağ Panele Taşı"
                >
                  Sağ ➡
                </button>
              </div>
            )}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-1 rounded-lg hover:bg-dark-750 text-slate-400 hover:text-white transition-colors"
            >
              {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {isOpen && (
          <div className="p-3 max-h-48 overflow-y-auto font-mono text-[11px] text-slate-300 space-y-1 bg-dark-950 select-text">
            {logs.length === 0 ? (
              <p className="text-slate-600 italic">İşlem başlatıldığında sistem logları burada akacaktır.</p>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="leading-relaxed flex items-start space-x-2">
                  <span className="text-slate-600 shrink-0">›</span>
                  <span
                    className={
                      log.includes('HATA') || log.includes('✗')
                        ? 'text-rose-400 font-semibold'
                        : log.includes('✓')
                        ? 'text-emerald-400'
                        : 'text-slate-300'
                    }
                  >
                    {log}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    );
  }

  // Left or Right Side Panel Placement
  return (
    <div className="bg-dark-850 border border-dark-700 rounded-2xl overflow-hidden shadow-sm">
      <div className="w-full px-3.5 py-2.5 bg-dark-900/60 flex items-center justify-between text-xs font-semibold text-slate-300">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 hover:text-white transition-colors"
        >
          <Terminal className="w-3.5 h-3.5 text-brand-cyan" />
          <span>İşlem Günlüğü {logs.length > 0 && `(${logs.length})`}</span>
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {!isLocked && (
          <div className="flex items-center space-x-1 text-[10px] text-slate-400">
            {position === 'left' ? (
              <>
                <button
                  onClick={() => onChangePosition('right')}
                  className="p-1 rounded hover:bg-dark-750 hover:text-white"
                  title="Sağ Panele Taşı"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onChangePosition('bottom')}
                  className="p-1 rounded hover:bg-dark-750 hover:text-white"
                  title="Alta Genişlet"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => onChangePosition('left')}
                  className="p-1 rounded hover:bg-dark-750 hover:text-white"
                  title="Sol Panele Taşı"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onChangePosition('bottom')}
                  className="p-1 rounded hover:bg-dark-750 hover:text-white"
                  title="Alta Genişlet"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {isOpen && (
        <div className="p-3 max-h-48 overflow-y-auto font-mono text-[11px] text-slate-400 space-y-1 bg-dark-950/70 border-t border-dark-700 select-text">
          {logs.length === 0 ? (
            <p className="text-slate-600 italic">İşlem başlatıldığında loglar burada listelenecektir.</p>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="leading-relaxed flex items-start space-x-1.5">
                <span className="text-slate-600 shrink-0">›</span>
                <span
                  className={
                    log.includes('HATA') || log.includes('✗')
                      ? 'text-rose-400'
                      : log.includes('✓')
                      ? 'text-emerald-400'
                      : 'text-slate-300'
                  }
                >
                  {log}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
