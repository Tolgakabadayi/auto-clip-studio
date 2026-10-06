import { contextBridge, ipcRenderer } from 'electron';
import { PipelineOptions, ViralClip, SubtitleStyleConfig } from '../src/types';

export const electronAPI = {
  // File dialogues & probes
  selectVideoFile: () => ipcRenderer.invoke('dialog:select-video'),
  probeVideoPath: (filePath: string) => ipcRenderer.invoke('video:probe-path', filePath),
  selectOutputFolder: () => ipcRenderer.invoke('dialog:select-output-folder'),
  getVideoStreamUrl: (filePath: string) => ipcRenderer.invoke('video:get-stream-url', filePath),

  // YouTube Downloader
  downloadYouTubeVideo: (url: string, quality?: string) => ipcRenderer.invoke('youtube:download', { url, quality }),
  probeYouTubeVideo: (url: string) => ipcRenderer.invoke('youtube:probe', url),

  // Pipeline execution
  startFullPipeline: (options: PipelineOptions) => ipcRenderer.invoke('pipeline:start', options),
  cancelPipeline: () => ipcRenderer.invoke('pipeline:cancel'),
  resetPipelineProgress: () => ipcRenderer.invoke('pipeline:reset-error'),
  renderSingleClip: (clip: ViralClip, options: PipelineOptions) =>
    ipcRenderer.invoke('pipeline:render-clip', { clip, options }),
  generateSocialCopy: (clip: ViralClip, options: PipelineOptions) =>
    ipcRenderer.invoke('llm:generate-social-copy', { clip, options }),

  // System & Utilities
  getSystemHealth: () => ipcRenderer.invoke('system:health'),
  openPath: (targetPath: string) => ipcRenderer.invoke('system:open-path', targetPath),
  showItemInFolder: (targetPath: string) => ipcRenderer.invoke('system:show-item-in-folder', targetPath),
  extractFrame: (args: { videoPath: string; second: number; outputPath: string }) =>
    ipcRenderer.invoke('video:extract-frame', args),
  saveThumbnailBase64: (args: { outputPath: string; base64Data: string }) =>
    ipcRenderer.invoke('video:save-thumbnail-base64', args),

  // Multi-Agent Agency
  getAgencyDefaultAgents: () => ipcRenderer.invoke('agency:get-default-agents'),
  runAgencyPipeline: (options: PipelineOptions, transcript?: any) =>
    ipcRenderer.invoke('agency:run-pipeline', { options, transcript }),

  // 🤖 7/24 Autopilot & Scheduler Subsystem
  autopilotGetSettings: () => ipcRenderer.invoke('autopilot:get-settings'),
  autopilotUpdateSettings: (settings: any) => ipcRenderer.invoke('autopilot:update-settings', settings),
  autopilotGetState: () => ipcRenderer.invoke('autopilot:get-state'),
  autopilotStart: () => ipcRenderer.invoke('autopilot:start'),
  autopilotStop: () => ipcRenderer.invoke('autopilot:stop'),
  autopilotRunCycle: (candidate?: any) => ipcRenderer.invoke('autopilot:run-cycle', candidate),
  autopilotRunBatch: (count?: number) => ipcRenderer.invoke('autopilot:run-batch', count),
  autopilotSearchCC: (niche?: string, keyword?: string) =>
    ipcRenderer.invoke('autopilot:search-cc', { niche, keyword }),
  autopilotDeletePackage: (packageId: string) => ipcRenderer.invoke('autopilot:delete-package', packageId),
  autopilotOpenArchiveFolder: () => ipcRenderer.invoke('autopilot:open-archive-folder'),

  // Subscriptions
  onPipelineProgress: (callback: (progress: any) => void) => {
    const subscription = (_event: any, value: any) => callback(value);
    ipcRenderer.on('pipeline:progress', subscription);
    return () => ipcRenderer.removeListener('pipeline:progress', subscription);
  },
  onPipelineLog: (callback: (log: string) => void) => {
    const subscription = (_event: any, value: string) => callback(value);
    ipcRenderer.on('pipeline:log', subscription);
    return () => ipcRenderer.removeListener('pipeline:log', subscription);
  },
  onAgencyMessage: (callback: (message: any) => void) => {
    const subscription = (_event: any, value: any) => callback(value);
    ipcRenderer.on('agency:message', subscription);
    return () => ipcRenderer.removeListener('agency:message', subscription);
  },
  onAgencyProgress: (callback: (progress: any) => void) => {
    const subscription = (_event: any, value: any) => callback(value);
    ipcRenderer.on('agency:progress', subscription);
    return () => ipcRenderer.removeListener('agency:progress', subscription);
  },
  onAutopilotState: (callback: (state: any) => void) => {
    const subscription = (_event: any, value: any) => callback(value);
    ipcRenderer.on('autopilot:state', subscription);
    return () => ipcRenderer.removeListener('autopilot:state', subscription);
  },

  // 🤖 Interactive Copilot AI (NOVA)
  copilotSendCommand: (command: string) => ipcRenderer.invoke('copilot:send-command', command),
  copilotGetMessages: () => ipcRenderer.invoke('copilot:get-messages'),
  onCopilotMessage: (callback: (msg: any) => void) => {
    const subscription = (_event: any, value: any) => callback(value);
    ipcRenderer.on('copilot:message', subscription);
    return () => ipcRenderer.removeListener('copilot:message', subscription);
  },
  onCopilotSpeech: (callback: (speech: any) => void) => {
    const subscription = (_event: any, value: any) => callback(value);
    ipcRenderer.on('copilot:speech', subscription);
    return () => ipcRenderer.removeListener('copilot:speech', subscription);
  },
  onCopilotOpenModal: (callback: (modal: 'agency' | 'autopilot' | 'settings' | 'pitches') => void) => {
    const subscription = (_event: any, value: any) => callback(value);
    ipcRenderer.on('copilot:open-modal', subscription);
    return () => ipcRenderer.removeListener('copilot:open-modal', subscription);
  },
  copilotTriggerAction: (action: any) => ipcRenderer.invoke('copilot:trigger-action', action),

  // 🪟 Windows Desktop Docker (NOVA Top Dock)
  dockSetExpanded: (isExpanded: boolean) => ipcRenderer.invoke('dock:set-expanded', isExpanded),
  dockToggleMainWindow: () => ipcRenderer.invoke('dock:toggle-main-window'),
  dockRestoreMainWindow: () => ipcRenderer.invoke('dock:restore-main-window'),
  dockOpenFeature: (feature: 'agency' | 'autopilot' | 'terminal' | 'new_video' | 'settings' | 'pitches') => ipcRenderer.invoke('dock:open-feature', feature),
  dockClose: () => ipcRenderer.invoke('dock:close'),
  dockShow: () => ipcRenderer.invoke('dock:show'),
  dockToggle: () => ipcRenderer.invoke('dock:toggle'),
  dockIsVisible: () => ipcRenderer.invoke('dock:is-visible'),
  onDockVisibilityChange: (callback: (visible: boolean) => void) => {
    const subscription = (_event: any, value: boolean) => callback(value);
    ipcRenderer.on('dock:visibility-change', subscription);
    return () => ipcRenderer.removeListener('dock:visibility-change', subscription);
  },
  onDockTriggerFeature: (callback: (feature: string) => void) => {
    const subscription = (_event: any, value: string) => callback(value);
    ipcRenderer.on('dock:trigger-feature', subscription);
    return () => ipcRenderer.removeListener('dock:trigger-feature', subscription);
  },
  // 🎥 YouTube API & Google OAuth Integration
  youtubeGetAuthStatus: () => ipcRenderer.invoke('youtube-auth:get-status'),
  youtubeLogin: () => ipcRenderer.invoke('youtube-auth:login'),
  youtubeLogout: () => ipcRenderer.invoke('youtube-auth:logout'),
  youtubeUploadVideo: (payload: any) => ipcRenderer.invoke('youtube-auth:upload-video', payload),
  youtubeGetAnalytics: () => ipcRenderer.invoke('youtube-auth:get-analytics'),
  autopilotPublishNow: (packageId: string) => ipcRenderer.invoke('autopilot:publish-now', packageId),
  uploadRegistryGetAll: () => ipcRenderer.invoke('upload-registry:get-all'),
  uploadRegistryIsUploaded: (query: any) => ipcRenderer.invoke('upload-registry:is-uploaded', query),
  onYouTubeAuthUpdated: (callback: (status: any) => void) => {
    const subscription = (_event: any, value: any) => callback(value);
    ipcRenderer.on('youtube-auth:updated', subscription);
    return () => ipcRenderer.removeListener('youtube-auth:updated', subscription);
  },
  onYouTubeUploadProgress: (callback: (progress: any) => void) => {
    const subscription = (_event: any, value: any) => callback(value);
    ipcRenderer.on('youtube-upload:progress', subscription);
    return () => ipcRenderer.removeListener('youtube-upload:progress', subscription);
  },
  openWarRoomWindow: () => ipcRenderer.invoke('window:open-war-room'),
  closeWarRoomWindow: () => ipcRenderer.invoke('window:close-war-room'),
  onClipUploaded: (callback: (record: any) => void) => {
    const subscription = (_event: any, value: any) => callback(value);
    ipcRenderer.on('clip:uploaded', subscription);
    return () => ipcRenderer.removeListener('clip:uploaded', subscription);
  },
  // 🎯 Strategic Discovery Meeting & Pitch Deck
  startDiscoveryMeeting: (options?: { niche?: string; keyword?: string }) =>
    ipcRenderer.invoke('agency:start-discovery-meeting', options),
  onAgencyPitchesReady: (callback: (pitches: any[]) => void) => {
    const subscription = (_event: any, value: any) => callback(value);
    ipcRenderer.on('agency:pitches-ready', subscription);
    return () => ipcRenderer.removeListener('agency:pitches-ready', subscription);
  },
  approveAgencyPitch: (pitch: any) => ipcRenderer.invoke('agency:approve-pitch', pitch),
  onAgencyPitchApproved: (callback: (pitch: any) => void) => {
    const subscription = (_event: any, value: any) => callback(value);
    ipcRenderer.on('agency:pitch-approved', subscription);
    return () => ipcRenderer.removeListener('agency:pitch-approved', subscription);
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

declare global {
  interface Window {
    electronAPI: typeof electronAPI;
  }
}
