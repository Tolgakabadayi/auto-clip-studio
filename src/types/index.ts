export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
  probability?: number;
}

export interface TranscriptSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  words: WordTimestamp[];
}

export interface TranscriptResult {
  language: string;
  duration: number;
  text: string;
  segments: TranscriptSegment[];
}

export interface SocialCopyMetadata {
  titles: string[];
  description: string;
  hashtags: string[];
  callToAction: string;
}

export interface ViralClip {
  clip_id: number;
  title: string;
  start_time: string;
  end_time: string;
  start_seconds: number;
  end_seconds: number;
  duration_seconds: number;
  hook_sentence: string;
  virality_score: number;
  reason: string;
  keywords: string[];
  outputPath?: string;
  status?: 'pending' | 'rendering' | 'completed' | 'error';
  error?: string;
  renderProgress?: number;
  socialMetadata?: SocialCopyMetadata;
  thumbnailPath?: string;
  thumbnailSecond?: number;
  directorNotes?: string;
  qaScore?: number;
  createdAt?: string;
  isUploaded?: boolean;
  uploadedAt?: string;
  youtubeVideoId?: string;
  youtubeUrl?: string;
  sourceVideoId?: string;
  isSeries?: boolean;
  partNumber?: number;
  totalParts?: number;
  seriesGroupId?: string;
  seriesBannerText?: string;
  transcriptSnippet?: string;
}

export interface SubtitleStyleConfig {
  fontName: string;
  fontSize: number; // Point size for 1080x1920 layout (default: 72)
  primaryColor: string; // ASS BGR or Hex (e.g., #FFFFFF)
  highlightColor: string; // Color when word is active (e.g., #FFEE00 yellow)
  outlineColor: string; // Border color (e.g., #000000)
  outlineWidth: number; // e.g. 5
  shadowDepth: number; // e.g. 2
  alignment: number; // 2 = bottom-center, 5 = center
  marginV: number; // vertical distance from bottom in pixels (default: 420 for Reels/TikTok)
  wordsPerGroup: number; // words per subtitle card (e.g. 2 or 3)
  animationStyle: 'karaoke' | 'highlight' | 'zoom';
  uppercase: boolean;
}

export interface VideoMetadata {
  path: string;
  name: string;
  size: number;
  duration: number;
  width: number;
  height: number;
  format: string;
}

export type LLMProvider = 'ollama' | 'groq';

export interface PipelineOptions {
  videoPath: string;
  aspectRatio: '9:16' | '16:9' | '1:1';
  layoutMode: 'blur_background' | 'crop_center' | 'smart_face_tracking';
  whisperModel: 'tiny' | 'base' | 'small' | 'medium' | 'large-v3';
  language?: string;
  llmProvider: LLMProvider;
  ollamaModel?: string;
  ollamaHost?: string;
  groqApiKey?: string;
  groqModel?: string;
  subtitleConfig: SubtitleStyleConfig;
  outputDirectory?: string;
  clipCount?: number;
  minClipDuration?: number;
  maxClipDuration?: number;
  enableSubtitles?: boolean;
  audioVolume?: number;
  musicPath?: string;
  musicVolume?: number;
  agencyMode?: boolean;
  agencyAgents?: AgencyAgentConfig[];
  enableSilenceRemoval?: boolean; // WyattBlue/auto-editor style silence & dead air cutter
  seriesMode?: boolean;
  seriesPartNumber?: number;
  seriesTotalParts?: number;
  seriesBannerText?: string;
}

export type PipelineStep =
  | 'idle'
  | 'downloading_youtube'
  | 'extracting_audio'
  | 'transcribing'
  | 'detecting_highlights'
  | 'rendering_clips'
  | 'completed'
  | 'error';

export interface YouTubeTelemetry {
  percent: number;
  downloadedSize?: string;
  totalSize?: string;
  speed?: string;
  eta?: string;
  rawText?: string;
}

export interface PipelineProgress {
  step: PipelineStep;
  percent: number;
  message: string;
  activeClipIndex?: number;
  totalClips?: number;
  log?: string;
  downloadTelemetry?: YouTubeTelemetry;
  isError?: boolean;
}

export interface SystemHealth {
  ffmpeg: boolean;
  ffmpegVersion?: string;
  python: boolean;
  pythonVersion?: string;
  cuda: boolean;
  whisper: boolean;
  ollama: boolean;
  ollamaModels?: string[];
}

export type AgencyRole =
  | 'ceo'
  | 'scout'
  | 'art_director'
  | 'copywriter'
  | 'qa'
  | 'trend_hunter'
  | 'copyright_auditor'
  | 'scheduler'
  | 'seo_specialist'
  | 'sound_designer'
  | 'translator_multilingual'
  | 'hook_architect'
  | 'cliffhanger_architect'
  | 'security_supervisor'
  | 'youtube_manager';

export interface AgencyAgentConfig {
  role: AgencyRole;
  title: string;
  name: string;
  model: string;
  enabled: boolean;
  avatar: string;
  description: string;
}

export interface AgencyMessage {
  id: string;
  timestamp: string;
  role: AgencyRole;
  agentName: string;
  agentModel: string;
  type: 'thought' | 'action' | 'decision' | 'review' | 'approval' | 'error' | 'security';
  content: string;
  metadata?: any;
}

export interface AgencyProgressEvent {
  phase:
    | 'idle'
    | 'hunting'
    | 'scouting'
    | 'ceo_curation'
    | 'visual_inspection'
    | 'copywriting'
    | 'qa_audit'
    | 'scheduling'
    | 'seo_optimization'
    | 'audio_tuning'
    | 'translation'
    | 'hook_design'
    | 'security_audit'
    | 'completed';
  percent: number;
  message: string;
  activeAgent?: AgencyRole;
}

export interface AutopilotSettings {
  enabled: boolean;
  selectedNiche: string;
  customKeyword: string;
  postingSlots: string[]; // e.g. ["12:30", "18:30", "21:15"]
  clipsPerVideo: number;
  archiveDirectory: string;
  checkIntervalMinutes: number;
  creativeCommonsOnly: boolean;
  aspectRatio: '9:16' | '16:9';
  layoutMode: 'blur_background' | 'crop_center' | 'smart_face_tracking';
  autoPublishYouTube?: boolean; // Automatically upload to YouTube Shorts when slot arrives
  youtubePrivacy?: 'public' | 'unlisted' | 'private';
  prepareMinutesBeforeSlot?: number; // Minimum 10 mins before slot, default 15
  seriesModeEnabled?: boolean; // Seri & Partlı Shorts Modu (Part 1, Part 2, ...)
  seriesPartsCount?: number; // Kaç part üretilsin (2 veya 3, varsayılan: 2)
  seriesIntervalMinutes?: number; // Partlar arası yayın gecikmesi (dakika, varsayılan: 55)
  seriesOverlayBanner?: boolean; // Video üstüne "Part 1 | Devamı Part 2'de 👇" rozeti ekle (varsayılan: true)
  minSourceDurationSeconds?: number; // Kaynak video minimum süresi (varsayılan: 60)
  minViewCount?: number; // Minimum izlenme eşiği (varsayılan: 100000)
  brandSafetyConfig?: BrandSafetyConfig; // 🛡️ Kanal Güvenliği & Kelime Filtresi
}

export interface BrandSafetyConfig {
  blockPolitical: boolean; // Siyasi propaganda, parti ve liderler
  blockTerrorAndSeparatist: boolean; // Terör, bölücü, etnik çatışma (Kürt/PKK vb.)
  blockAdultAndNSFW: boolean; // +18, yetişkin, müstehcen içerik
  blockViolenceAndGore: boolean; // Şiddet, kan, vahşet
  blockSchoolAndLectures: boolean; // Okul dersleri, Tonguç Akademi, sınav (LGS/YKS vb.)
  blockCommercialMCNs: boolean; // Ticari MCN, GAİN, Netd, TV kanalları
  customBlacklistWords: string[]; // Kullanıcının eklediği özel yasaklı kelimeler
}

export const DEFAULT_BRAND_SAFETY_CONFIG: BrandSafetyConfig = {
  blockPolitical: true,
  blockTerrorAndSeparatist: true,
  blockAdultAndNSFW: true,
  blockViolenceAndGore: true,
  blockSchoolAndLectures: true,
  blockCommercialMCNs: true,
  customBlacklistWords: [],
};

export const BRAND_SAFETY_DICTIONARIES = {
  political: [
    'akp', 'ak parti', 'chp', 'mhp', 'hdp', 'dem parti', 'iyip', 'zafer partisi',
    'erdoğan', 'erdogan', 'recep tayyip', 'özgür özel', 'kılıçdaroğlu', 'mansur yavaş', 'ekrem imamoğlu',
    'devlet bahçeli', 'selahattin demirtaş', 'siyaset', 'siyasi', 'seçim', 'milletvekili', 'meclis',
    'tbmm', 'belediye başkanı', 'propaganda', 'hükümet', 'muhalefet', 'koalisyon', 'bakanlık'
  ],
  terror_separatist: [
    'pkk', 'ypg', 'pyd', 'kck', 'hpg', 'dhkp-c', 'fetö', 'feto', 'deaş', 'işid', 'terör', 'terörist',
    'gerilla', 'öcalan', 'ocalan', 'kandil', 'halkların demokratik', 'kürt hareketi', 'bölücü',
    'kürt', 'kurt', 'kürdistan', 'kurdistan', 'peşmerge', 'pesmerge', 'rojava'
  ],
  adult_nsfw: [
    '+18', '18+', 'cinsel', 'müstehcen', 'porno', 'erotik', 'seks', 'çıplak', 'mastürbasyon',
    'escort', 'jigolo', 'lezbiyen', 'gay', 'fahişe', 'aldatma itirafı +18'
  ],
  violence_gore: [
    'vahşet', 'kanlı', 'cinayet anı', 'katliam', 'infaz', 'intihar', 'tecavüz', 'taciz', 'işkence'
  ],
  school_lectures: [
    'tonguç', 'tonguc', 'tonguç akademi', 'tonguc akademi', 'hocalara geldik', 'benim hocam',
    'rehber matematik', 'rüştü hoca', 'mert hoca', 'şeref hoca', 'dershane', 'lgs', 'yks', 'kpss',
    'öabt', 'ayt', 'tyt', 'soru çözümü', 'konu anlatımı', 'sınav hazırlık', 'ders notları',
    'yazılıya hazırlık', 'eğitimhane', 'meb', 'okul dersi', 'sınav taktikleri'
  ],
  commercial_mcns: [
    'vevo', 'topic', 'netflix', 'disney', 'bbc', 'trt', 'acun', 'exxen', 'paramount', 'warner',
    'wediacorp', 'wedia corp', 'gain', 'netd', 'doğan', 'ciner', 'kanald', 'showtv', 'startv',
    'atv', 'blutv', 'turkuvaz', 'ay yapım', 'ayyapim', 'medyapım', 'medyapim', 'timsprod',
    'poll production', 'dmc', 'sony music', 'universal music', 'believe music'
  ]
};

export function compileActiveBrandSafetyBlacklist(config?: BrandSafetyConfig): string[] {
  const words: string[] = [];
  const cfg = config || DEFAULT_BRAND_SAFETY_CONFIG;

  if (cfg.blockPolitical !== false) words.push(...BRAND_SAFETY_DICTIONARIES.political);
  if (cfg.blockTerrorAndSeparatist !== false) words.push(...BRAND_SAFETY_DICTIONARIES.terror_separatist);
  if (cfg.blockAdultAndNSFW !== false) words.push(...BRAND_SAFETY_DICTIONARIES.adult_nsfw);
  if (cfg.blockViolenceAndGore !== false) words.push(...BRAND_SAFETY_DICTIONARIES.violence_gore);
  if (cfg.blockSchoolAndLectures !== false) words.push(...BRAND_SAFETY_DICTIONARIES.school_lectures);
  if (cfg.blockCommercialMCNs !== false) words.push(...BRAND_SAFETY_DICTIONARIES.commercial_mcns);

  if (Array.isArray(cfg.customBlacklistWords)) {
    for (const w of cfg.customBlacklistWords) {
      const trimmed = w.trim().toLowerCase();
      if (trimmed && !words.includes(trimmed)) {
        words.push(trimmed);
      }
    }
  }

  return words;
}

export interface CCVideoCandidate {
  id: string;
  url: string;
  title: string;
  duration: number;
  durationFormatted: string;
  channel: string;
  viewCount?: number;
  thumbnailUrl?: string;
  license: string;
  verifiedCC: boolean;
  discoveredAt: string;
  category?: string;
}

export interface CuratedPitchCandidate {
  id: string;
  url: string;
  title: string;
  channel: string;
  duration: number;
  durationFormatted: string;
  viewCount: number;
  thumbnailUrl: string;
  viralityScore: number;
  hookAnalysis: string;
  seoAngle: string;
  targetAudience: string;
  license: string;
  verifiedSafe: boolean;
  discoveredAt: string;
  category?: string;
  categoryBadge?: string;
  // Aliases
  videoId?: string;
  videoUrl?: string;
  channelTitle?: string;
  durationSeconds?: number;
}

export interface ScheduledClipPackage {
  id: string;
  clipId: number;
  title: string;
  scheduledFor: string; // e.g. "2026-10-04 18:30"
  slotTime: string; // e.g. "18:30"
  dayLabel: string; // e.g. "Bugün" or "Yarın"
  videoPath: string;
  thumbnailPath?: string;
  packageDir: string;
  socialMetadata: SocialCopyMetadata;
  sourceVideo: {
    id: string;
    title: string;
    channel: string;
    url: string;
    license: string;
    thumbnailUrl?: string;
  };
  viralityScore: number;
  qaScore?: number;
  schedulerNote?: string;
  createdAt: string;
  status: 'ready' | 'scheduled' | 'publishing' | 'published' | 'failed';
  isUploaded?: boolean;
  uploadedAt?: string;
  youtubeVideoId?: string;
  youtubeUrl?: string;
  uploadError?: string;
  isSeries?: boolean;
  partNumber?: number;
  totalParts?: number;
  seriesGroupId?: string;
  seriesBannerText?: string;
}

export interface AutopilotProgressInfo {
  percent: number;
  message: string;
  stepIndex: number; // 1 to 6
  stepTitle: string;
  batchCurrent: number; // e.g. 1
  batchTotal: number; // e.g. 3
}

export interface AutopilotState {
  isRunning: boolean;
  isBusy: boolean;
  currentAction: string;
  activeAgent?: AgencyRole;
  activeProgress?: AutopilotProgressInfo;
  lastRunAt?: string;
  nextRunAt?: string;
  nextSlotInfo?: {
    slotTime: string;
    scheduledFor: string;
    dayLabel: string;
    minutesRemaining: number;
    hasPackage: boolean;
  };
  packages: ScheduledClipPackage[];
  candidates: CCVideoCandidate[];
  stats: {
    totalGenerated: number;
    pendingPosts: number;
  };
}

export interface UploadRecord {
  id: string;
  title: string;
  youtubeVideoId: string;
  youtubeUrl: string;
  uploadedAt: string;
  uploadMode: 'manual' | 'autopilot';
  clipId?: number;
  packageId?: string;
  filePath?: string;
  thumbnailPath?: string;
  sourceVideoId?: string;
  sourceVideoTitle?: string;
  sourceVideoChannel?: string;
  sourceVideoUrl?: string;
}

export interface CopilotMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  actionTaken?: string;
  status?: 'thinking' | 'acting' | 'done' | 'error';
  metadata?: any;
}

export interface CopilotSpeech {
  message: string;
  mood: 'idle' | 'working' | 'excited' | 'success' | 'alert';
  actionHint?: string;
}

export interface YouTubeChannelInfo {
  id: string;
  title: string;
  customUrl?: string;
  avatarUrl?: string;
  subscriberCount?: string;
  videoCount?: string;
}

export interface YouTubeAuthStatus {
  isConfigured: boolean;
  isAuthenticated: boolean;
  clientId?: string;
  clientSecretFile?: string;
  channel: YouTubeChannelInfo | null;
  error?: string;
}

export interface YouTubeUploadPayload {
  filePath: string;
  title: string;
  description: string;
  tags?: string[];
  privacyStatus?: 'public' | 'unlisted' | 'private';
  isShort?: boolean;
  thumbnailPath?: string;
}

export interface YouTubeUploadResult {
  success: boolean;
  videoId?: string;
  videoUrl?: string;
  title?: string;
  error?: string;
}

export interface YouTubeVideoStat {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  thumbnailUrl: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  privacyStatus: 'public' | 'unlisted' | 'private' | string;
  isShort: boolean;
  videoUrl: string;
}

export interface YouTubeAnalyticsData {
  channel: YouTubeChannelInfo | null;
  totalViews: number;
  subscriberCount: number;
  totalVideos: number;
  videos: YouTubeVideoStat[];
  nextScheduledUpload?: {
    time: string;
    dayLabel: string;
    title?: string;
  } | null;
  lastUpdated: string;
}



