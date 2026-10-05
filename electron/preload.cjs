const { contextBridge, ipcRenderer } = require('electron');

const electronAPI = {
  // File dialogues & probes
  selectVideoFile: () => ipcRenderer.invoke('dialog:select-video'),
  probeVideoPath: (filePath) => ipcRenderer.invoke('video:probe-path', filePath),
  selectOutputFolder: () => ipcRenderer.invoke('dialog:select-output-folder'),
  getVideoStreamUrl: (filePath) => ipcRenderer.invoke('video:get-stream-url', filePath),

  // YouTube Downloader
  downloadYouTubeVideo: (url) => ipcRenderer.invoke('youtube:download', url),
  probeYouTubeVideo: (url) => ipcRenderer.invoke('youtube:probe', url),

  // Pipeline execution
  startFullPipeline: (options) => ipcRenderer.invoke('pipeline:start', options),
  cancelPipeline: () => ipcRenderer.invoke('pipeline:cancel'),
  renderSingleClip: (clip, options) =>
    ipcRenderer.invoke('pipeline:render-clip', { clip, options }),
  generateSocialCopy: (clip, options) =>
    ipcRenderer.invoke('llm:generate-social-copy', { clip, options }),

  // Multi-Agent Agency
  getAgencyDefaultAgents: () => ipcRenderer.invoke('agency:get-default-agents'),
  runAgencyPipeline: (options, transcript) =>
    ipcRenderer.invoke('agency:run-pipeline', { options, transcript }),

  // 🤖 7/24 Autopilot & Scheduler Subsystem
  autopilotGetSettings: () => ipcRenderer.invoke('autopilot:get-settings'),
  autopilotUpdateSettings: (settings) => ipcRenderer.invoke('autopilot:update-settings', settings),
  autopilotGetState: () => ipcRenderer.invoke('autopilot:get-state'),
  autopilotStart: () => ipcRenderer.invoke('autopilot:start'),
  autopilotStop: () => ipcRenderer.invoke('autopilot:stop'),
  autopilotRunCycle: (candidate) => ipcRenderer.invoke('autopilot:run-cycle', candidate),
  autopilotRunBatch: (count) => ipcRenderer.invoke('autopilot:run-batch', count),
  autopilotSearchCC: (niche, keyword) =>
    ipcRenderer.invoke('autopilot:search-cc', { niche, keyword }),
  autopilotDeletePackage: (packageId) => ipcRenderer.invoke('autopilot:delete-package', packageId),
  autopilotOpenArchiveFolder: () => ipcRenderer.invoke('autopilot:open-archive-folder'),

  // System & Utilities
  getSystemHealth: () => ipcRenderer.invoke('system:health'),
  openPath: (targetPath) => ipcRenderer.invoke('system:open-path', targetPath),
  showItemInFolder: (targetPath) => ipcRenderer.invoke('system:show-item-in-folder', targetPath),
  extractFrame: (args) => ipcRenderer.invoke('video:extract-frame', args),
  saveThumbnailBase64: (args) => ipcRenderer.invoke('video:save-thumbnail-base64', args),

  // Subscriptions
  onPipelineProgress: (callback) => {
    const subscription = (_event, value) => callback(value);
    ipcRenderer.on('pipeline:progress', subscription);
    return () => ipcRenderer.removeListener('pipeline:progress', subscription);
  },
  onPipelineLog: (callback) => {
    const subscription = (_event, value) => callback(value);
    ipcRenderer.on('pipeline:log', subscription);
    return () => ipcRenderer.removeListener('pipeline:log', subscription);
  },
  onAgencyMessage: (callback) => {
    const subscription = (_event, value) => callback(value);
    ipcRenderer.on('agency:message', subscription);
    return () => ipcRenderer.removeListener('agency:message', subscription);
  },
  onAgencyProgress: (callback) => {
    const subscription = (_event, value) => callback(value);
    ipcRenderer.on('agency:progress', subscription);
    return () => ipcRenderer.removeListener('agency:progress', subscription);
  },
  onAutopilotState: (callback) => {
    const subscription = (_event, value) => callback(value);
    ipcRenderer.on('autopilot:state', subscription);
    return () => ipcRenderer.removeListener('autopilot:state', subscription);
  },

  // 🤖 Interactive Copilot AI (NOVA)
  copilotSendCommand: (command) => ipcRenderer.invoke('copilot:send-command', command),
  copilotGetMessages: () => ipcRenderer.invoke('copilot:get-messages'),
  onCopilotMessage: (callback) => {
    const subscription = (_event, value) => callback(value);
    ipcRenderer.on('copilot:message', subscription);
    return () => ipcRenderer.removeListener('copilot:message', subscription);
  },
  onCopilotSpeech: (callback) => {
    const subscription = (_event, value) => callback(value);
    ipcRenderer.on('copilot:speech', subscription);
    return () => ipcRenderer.removeListener('copilot:speech', subscription);
  },
  onCopilotOpenModal: (callback) => {
    const subscription = (_event, value) => callback(value);
    ipcRenderer.on('copilot:open-modal', subscription);
    return () => ipcRenderer.removeListener('copilot:open-modal', subscription);
  },

  // 🪟 Windows Desktop Docker (NOVA Top Dock)
  dockSetExpanded: (isExpanded) => ipcRenderer.invoke('dock:set-expanded', isExpanded),
  dockToggleMainWindow: () => ipcRenderer.invoke('dock:toggle-main-window'),
  dockRestoreMainWindow: () => ipcRenderer.invoke('dock:restore-main-window'),
  dockOpenFeature: (feature) => ipcRenderer.invoke('dock:open-feature', feature),
  dockClose: () => ipcRenderer.invoke('dock:close'),
  dockShow: () => ipcRenderer.invoke('dock:show'),
  dockToggle: () => ipcRenderer.invoke('dock:toggle'),
  dockIsVisible: () => ipcRenderer.invoke('dock:is-visible'),
  onDockVisibilityChange: (callback) => {
    const subscription = (_event, value) => callback(value);
    ipcRenderer.on('dock:visibility-change', subscription);
    return () => ipcRenderer.removeListener('dock:visibility-change', subscription);
  },
  onDockTriggerFeature: (callback) => {
    const subscription = (_event, value) => callback(value);
    ipcRenderer.on('dock:trigger-feature', subscription);
    return () => ipcRenderer.removeListener('dock:trigger-feature', subscription);
  },

  // 🎥 YouTube API & Google OAuth Integration
  youtubeGetAuthStatus: () => ipcRenderer.invoke('youtube-auth:get-status'),
  youtubeLogin: () => ipcRenderer.invoke('youtube-auth:login'),
  youtubeLogout: () => ipcRenderer.invoke('youtube-auth:logout'),
  youtubeUploadVideo: (payload) => ipcRenderer.invoke('youtube-auth:upload-video', payload),
  youtubeGetAnalytics: () => ipcRenderer.invoke('youtube-auth:get-analytics'),
  autopilotPublishNow: (packageId) => ipcRenderer.invoke('autopilot:publish-now', packageId),
  uploadRegistryGetAll: () => ipcRenderer.invoke('upload-registry:get-all'),
  uploadRegistryIsUploaded: (query) => ipcRenderer.invoke('upload-registry:is-uploaded', query),
  onYouTubeAuthUpdated: (callback) => {
    const subscription = (_event, value) => callback(value);
    ipcRenderer.on('youtube-auth:updated', subscription);
    return () => ipcRenderer.removeListener('youtube-auth:updated', subscription);
  },
  onYouTubeUploadProgress: (callback) => {
    const subscription = (_event, value) => callback(value);
    ipcRenderer.on('youtube-upload:progress', subscription);
    return () => ipcRenderer.removeListener('youtube-upload:progress', subscription);
  },
  openWarRoomWindow: () => ipcRenderer.invoke('window:open-war-room'),
  closeWarRoomWindow: () => ipcRenderer.invoke('window:close-war-room'),
  onClipUploaded: (callback) => {
    const subscription = (_event, value) => callback(value);
    ipcRenderer.on('clip:uploaded', subscription);
    return () => ipcRenderer.removeListener('clip:uploaded', subscription);
  },
  // 🎯 Strategic Discovery Meeting & Pitch Deck
  startDiscoveryMeeting: (options) =>
    ipcRenderer.invoke('agency:start-discovery-meeting', options),
  onAgencyPitchesReady: (callback) => {
    const subscription = (_event, value) => callback(value);
    ipcRenderer.on('agency:pitches-ready', subscription);
    return () => ipcRenderer.removeListener('agency:pitches-ready', subscription);
  },
  approveAgencyPitch: (pitch) => ipcRenderer.invoke('agency:approve-pitch', pitch),
  onAgencyPitchApproved: (callback) => {
    const subscription = (_event, value) => callback(value);
    ipcRenderer.on('agency:pitch-approved', subscription);
    return () => ipcRenderer.removeListener('agency:pitch-approved', subscription);
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
