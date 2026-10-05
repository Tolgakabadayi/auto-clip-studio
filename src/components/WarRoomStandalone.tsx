import React, { useState, useEffect } from 'react';
import { AgencyRoomModal } from './AgencyRoomModal';
import {
  AgencyMessage,
  AgencyAgentConfig,
  PipelineProgress,
  AutopilotState,
  SystemHealth,
} from '../types';

export const WarRoomStandalone: React.FC = () => {
  const [messages, setMessages] = useState<AgencyMessage[]>([]);
  const [agents, setAgents] = useState<AgencyAgentConfig[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [pipelineProgress, setPipelineProgress] = useState<PipelineProgress>({
    step: 'idle',
    percent: 0,
    message: 'NEXUS WAR ROOM Canlı İzleme Aktif',
  });
  const [autopilotState, setAutopilotState] = useState<AutopilotState | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);

  // Subscribe to all live agency & autopilot IPC streams
  useEffect(() => {
    if (!window.electronAPI) return;

    // Fetch initial autopilot state
    window.electronAPI.autopilotGetState?.().then((st: any) => {
      if (st) setAutopilotState(st);
    }).catch(() => {});

    // Live Agency Messages
    const unsubMsg = window.electronAPI.onAgencyMessage?.((msg: AgencyMessage) => {
      setMessages((prev) => [...prev, msg]);
      if (msg.type === 'action' || msg.type === 'thought') {
        setIsProcessing(true);
      } else if (msg.type === 'approval' || msg.type === 'decision') {
        setIsProcessing(false);
      }
    });

    // Live Agency Progress
    const unsubProg = window.electronAPI.onAgencyProgress?.((prog: any) => {
      if (prog) {
        setPipelineProgress({
          step: prog.phase || 'processing',
          percent: prog.percent || 0,
          message: prog.message || '',
        });
        if (prog.percent >= 100) {
          setIsProcessing(false);
        } else {
          setIsProcessing(true);
        }
      }
    });

    // Autopilot State Stream
    const unsubAp = window.electronAPI.onAutopilotState?.((state: AutopilotState) => {
      setAutopilotState(state);
      setIsProcessing(state?.isBusy || false);
    });

    // Fetch system health
    window.electronAPI.getSystemHealth?.().then((h: any) => {
      if (h) setSystemHealth(h);
    }).catch(() => {});

    return () => {
      unsubMsg?.();
      unsubProg?.();
      unsubAp?.();
    };
  }, []);

  const handleStartMeeting = () => {
    // If user clicks start meeting from detached window, trigger via agency
    setIsProcessing(true);
  };

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#090a10]">
      <AgencyRoomModal
        isOpen={true}
        isStandalone={true}
        onClose={() => {
          if (window.electronAPI?.closeWarRoomWindow) {
            window.electronAPI.closeWarRoomWindow();
          }
        }}
        messages={messages}
        onClearMessages={() => setMessages([])}
        agents={agents}
        onUpdateAgents={setAgents}
        isProcessing={isProcessing}
        onRunAgency={handleStartMeeting}
        hasVideo={true}
        pipelineProgress={pipelineProgress}
        autopilotState={autopilotState || undefined}
        systemHealth={systemHealth}
      />
    </div>
  );
};
