import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import {
  AutopilotSettings,
  AutopilotState,
  CCVideoCandidate,
  ScheduledClipPackage,
  ViralClip,
  AgencyMessage,
  AgencyProgressEvent,
  UploadRecord,
} from '../../src/types';
import { YouTubeService } from './youtubeService';
import { WhisperService } from './whisperService';
import { AgencyService } from './agencyService';
import { FFmpegService } from './ffmpegService';
import { FaceTrackingService } from './faceTrackingService';
import { generateAssSubtitles } from './assGenerator';
import { GoogleAuthService } from './googleAuthService';
import { UploadRegistryService } from './uploadRegistryService';

export class AutopilotService {
  private youtubeService: YouTubeService;
  private whisperService: WhisperService;
  private agencyService: AgencyService;
  private ffmpegService: FFmpegService;
  private faceTrackingService: FaceTrackingService;
  private googleAuthService?: GoogleAuthService;
  private uploadRegistryService?: UploadRegistryService;

  private settings: AutopilotSettings;
  private state: AutopilotState;
  private processedVideoIds: Set<string> = new Set();
  private processedChannels: Set<string> = new Set();
  private storageDir: string;
  private configFilePath: string;
  private archiveFilePath: string;
  private schedulerTimer: NodeJS.Timeout | null = null;
  private isBusy = false;

  // Brand Safety Blacklist: Zero tolerance for political polemics, terrorism, ethnic conflict, and +18 / adult content
  private static BRAND_SAFETY_BLACKLIST = [
    // Political parties, political figures, elections & propaganda
    'akp', 'ak parti', 'chp', 'mhp', 'hdp', 'dem parti', 'iyip', 'zafer partisi',
    'erdoğan', 'erdogan', 'recep tayyip', 'özgür özel', 'kılıçdaroğlu', 'mansur yavaş', 'ekrem imamoğlu',
    'devlet bahçeli', 'selahattin demirtaş', 'siyaset', 'siyasi', 'seçim', 'milletvekili', 'meclis',
    'tbmm', 'belediye başkanı', 'propaganda', 'hükümet', 'muhalefet', 'koalisyon', 'bakanlık',

    // Terrorism, militant organizations, separatist / ethnic propaganda
    'pkk', 'ypg', 'pyd', 'kck', 'hpg', 'dhkp-c', 'fetö', 'feto', 'deaş', 'işid', 'terör', 'terörist',
    'gerilla', 'öcalan', 'ocalan', 'kandil', 'halkların demokratik', 'kürt hareketi', 'bölücü',
    'kürt', 'kurt', 'kürdistan', 'kurdistan', 'peşmerge', 'pesmerge', 'rojava',

    // +18, Adult, NSFW, vulgar content
    '+18', '18+', 'cinsel', 'müstehcen', 'porno', 'erotik', 'seks', 'çıplak', 'mastürbasyon',
    'escort', 'jigolo', 'lezbiyen', 'gay', 'fahişe', 'aldatma itirafı +18',

    // Violence, gore, brutality, severe crimes
    'vahşet', 'kanlı', 'cinayet anı', 'katliam', 'infaz', 'intihar', 'tecavüz', 'taciz', 'işkence',

    // School, Exam prep & Academic lectures (Permanently exclude Tonguç Akademi & test prep!)
    'tonguç', 'tonguc', 'tonguç akademi', 'tonguc akademi', 'hocalara geldik', 'benim hocam',
    'rehber matematik', 'rüştü hoca', 'mert hoca', 'şeref hoca', 'dershane', 'lgs', 'yks', 'kpss',
    'öabt', 'ayt', 'tyt', 'soru çözümü', 'konu anlatımı', 'sınav hazırlık', 'ders notları',
    'yazılıya hazırlık', 'eğitimhane', 'meb', 'okul dersi', 'sınav taktikleri'
  ];

  // Callbacks for broadcasting
  public onStateChange?: (state: AutopilotState) => void;
  public onAgencyMessage?: (msg: AgencyMessage) => void;
  public onProgress?: (progress: AgencyProgressEvent) => void;
  public onLog?: (log: string) => void;
  public onClipUploaded?: (record: UploadRecord) => void;

  constructor(
    youtubeService: YouTubeService,
    whisperService: WhisperService,
    agencyService: AgencyService,
    ffmpegService: FFmpegService,
    faceTrackingService: FaceTrackingService,
    googleAuthService?: GoogleAuthService,
    uploadRegistryService?: UploadRegistryService
  ) {
    this.youtubeService = youtubeService;
    this.whisperService = whisperService;
    this.agencyService = agencyService;
    this.ffmpegService = ffmpegService;
    this.faceTrackingService = faceTrackingService;
    this.googleAuthService = googleAuthService;
    this.uploadRegistryService = uploadRegistryService;

    // Determine storage paths
    this.storageDir = path.join(os.homedir(), 'Downloads', 'AutoClips_Downloads');
    fs.mkdirSync(this.storageDir, { recursive: true });

    this.configFilePath = path.join(this.storageDir, 'autopilot_config.json');
    this.archiveFilePath = path.join(this.storageDir, 'autopilot_archive.json');

    const defaultArchiveDir = path.join(this.storageDir, 'Publish_Archive');
    fs.mkdirSync(defaultArchiveDir, { recursive: true });

    // Default settings: Focused on Interviews & Real Life Stories + Series Module Ready
    this.settings = {
      enabled: false,
      selectedNiche: 'Röportaj & Gerçek Hayat Hikayeleri',
      customKeyword: '',
      postingSlots: ['12:30', '18:30', '21:15'],
      clipsPerVideo: 1,
      archiveDirectory: defaultArchiveDir,
      checkIntervalMinutes: 30,
      creativeCommonsOnly: true,
      aspectRatio: '9:16',
      layoutMode: 'blur_background',
      autoPublishYouTube: true,
      youtubePrivacy: 'public',
      prepareMinutesBeforeSlot: 15,
      seriesModeEnabled: false,
      seriesPartsCount: 2,
      seriesIntervalMinutes: 55,
      seriesOverlayBanner: true,
      minSourceDurationSeconds: 60,
      minViewCount: 100000,
    };

    // Initial state
    this.state = {
      isRunning: false,
      isBusy: false,
      currentAction: 'Beklemede',
      packages: [],
      candidates: [],
      stats: {
        totalGenerated: 0,
        pendingPosts: 0,
      },
    };

    this.loadPersistence();
  }

  /**
   * Check text against brand safety blacklist (siyasi / terör / +18 / şiddet)
   */
  public checkBrandSafety(text: string): { safe: boolean; reason?: string } {
    if (!text) return { safe: true };
    const lower = text.toLowerCase();
    for (const banned of AutopilotService.BRAND_SAFETY_BLACKLIST) {
      const regex = new RegExp(`(^|[^a-zA-Z0-9çğıöşüÇĞİÖŞÜ])${banned}([^a-zA-Z0-9çğıöşüÇĞİÖŞÜ]|$)`, 'i');
      if (regex.test(lower) || lower.includes(banned)) {
        return { safe: false, reason: banned };
      }
    }
    return { safe: true };
  }

  /**
   * Channel Diversity: Check if a channel has been recently used in previous uploads or packages
   */
  public isChannelRecentlyUsed(channelName: string): boolean {
    if (!channelName) return false;
    const clean = channelName.trim().toLowerCase();
    if (this.processedChannels.has(clean)) return true;
    const recent = this.state.packages.slice(0, 10);
    return recent.some((p) => (p.sourceVideo?.channel || '').trim().toLowerCase() === clean);
  }

  /**
   * Load saved config, queue, and processed IDs from disk
   */
  private loadPersistence(): void {
    try {
      if (fs.existsSync(this.configFilePath)) {
        const rawConfig = fs.readFileSync(this.configFilePath, 'utf-8');
        const parsed = JSON.parse(rawConfig);
        this.settings = { ...this.settings, ...parsed };
      }
    } catch (e) {
      console.warn('[AutopilotService] Config load warning:', e);
    }

    try {
      if (fs.existsSync(this.archiveFilePath)) {
        const rawArchive = fs.readFileSync(this.archiveFilePath, 'utf-8');
        const parsed = JSON.parse(rawArchive);
        if (Array.isArray(parsed.packages)) {
          this.state.packages = parsed.packages;
        }
        if (Array.isArray(parsed.processedIds)) {
          this.processedVideoIds = new Set(parsed.processedIds);
        }
        if (Array.isArray(parsed.processedChannels)) {
          this.processedChannels = new Set(parsed.processedChannels.map((c: string) => c.toLowerCase()));
        }
      }
    } catch (e) {
      console.warn('[AutopilotService] Archive load warning:', e);
    }

    // Populate channels from existing packages to ensure channel diversity
    for (const pkg of this.state.packages) {
      if (pkg.sourceVideo?.channel) {
        this.processedChannels.add(pkg.sourceVideo.channel.trim().toLowerCase());
      }
    }

    // STRICT RE-SYNC: Pull all uploaded IDs from UploadRegistry to permanently prevent duplicate uploads
    if (this.uploadRegistryService) {
      const uploadedSourceIds = this.uploadRegistryService.getAllSourceVideoIds();
      for (const id of uploadedSourceIds) {
        this.processedVideoIds.add(id);
      }

      const allRecords = this.uploadRegistryService.getAll();
      for (const rec of allRecords) {
        if (rec.sourceVideoChannel) {
          this.processedChannels.add(rec.sourceVideoChannel.trim().toLowerCase());
        }
      }

      // Re-tag any existing packages if already uploaded manually or in previous runs
      for (const pkg of this.state.packages) {
        const record = this.uploadRegistryService.getRecord({
          packageId: pkg.id,
          filePath: pkg.videoPath,
        });
        if (record) {
          pkg.status = 'published';
          pkg.isUploaded = true;
          pkg.youtubeVideoId = record.youtubeVideoId;
          pkg.youtubeUrl = record.youtubeUrl;
          pkg.uploadedAt = record.uploadedAt;
        }
      }

      // Auto-heal: Ensure duplicate assignments from previous clipId matching bug are cleared
      const seenYtIds = new Set<string>();
      for (const pkg of this.state.packages) {
        if (pkg.youtubeVideoId) {
          if (seenYtIds.has(pkg.youtubeVideoId)) {
            console.log(`[Autopilot:AutoHeal] Resetting duplicate package "${pkg.title}" back to ready status`);
            pkg.status = 'ready';
            pkg.isUploaded = false;
            delete pkg.youtubeVideoId;
            delete pkg.youtubeUrl;
            delete pkg.uploadedAt;
          } else {
            seenYtIds.add(pkg.youtubeVideoId);
          }
        }
      }
    }
    this.updateStats();
  }

  /**
   * Save config, queue, and processed IDs & channels to disk
   */
  private savePersistence(): void {
    try {
      fs.writeFileSync(this.configFilePath, JSON.stringify(this.settings, null, 2), 'utf-8');
      const archiveData = {
        packages: this.state.packages,
        processedIds: Array.from(this.processedVideoIds),
        processedChannels: Array.from(this.processedChannels),
      };
      fs.writeFileSync(this.archiveFilePath, JSON.stringify(archiveData, null, 2), 'utf-8');
    } catch (e) {
      console.error('[AutopilotService] Save persistence error:', e);
    }
  }

  private updateStats(): void {
    const total = this.state.packages.length;
    const pending = this.state.packages.filter((p) => p.status === 'scheduled' || p.status === 'ready').length;
    this.state.stats = {
      totalGenerated: total,
      pendingPosts: pending,
    };
  }

  private emitState(): void {
    this.updateStats();
    if (this.onStateChange) {
      this.onStateChange({ ...this.state });
    }
  }

  private emitLog(msg: string): void {
    if (this.onLog) {
      this.onLog(msg);
    }
  }

  public getSettings(): AutopilotSettings {
    return { ...this.settings };
  }

  public updateSettings(partial: Partial<AutopilotSettings>): AutopilotSettings {
    this.settings = { ...this.settings, ...partial };
    if (this.settings.archiveDirectory) {
      fs.mkdirSync(this.settings.archiveDirectory, { recursive: true });
    }
    this.savePersistence();
    this.emitState();
    return this.settings;
  }

  public getState(): AutopilotState {
    return { ...this.state };
  }

  /**
   * Search for Creative Commons videos on YouTube using yt-dlp with multi-tier fallback
   */
  /**
   * Search for Creative Commons videos on YouTube using yt-dlp with multi-tier fallback & channel diversity
   */
  public async searchCreativeCommons(
    niche: string = this.settings.selectedNiche || 'Röportaj & Gerçek Hayat Hikayeleri',
    customKeyword: string = this.settings.customKeyword,
    limit: number = 8
  ): Promise<CCVideoCandidate[]> {
    this.emitLog(`[Otopilot:Avcı] YouTube Creative Commons filtresiyle aranıyor: "${customKeyword || niche}"`);

    // Let Hunter Gemma generate viral queries or use fallback
    let queries: string[] = [];
    try {
      queries = await this.agencyService.huntTrendSearchQuery(niche, customKeyword, {
        onMessage: this.onAgencyMessage,
        onLog: this.onLog,
      });
    } catch (e) {
      console.warn('[Autopilot] Agency query generation warning:', e);
    }

    const searchTerms = [
      queries[0] || '',
      customKeyword ? `${customKeyword} gerçek hayat hikayesi röportaj` : '',
      'gerçek hayat hikayesi röportaj',
      'hayat dersleri röportaj podcast',
      'sokak röportajı gerçek hayat',
      'derin sohbet röportaj podcast',
      `${niche} röportaj`,
      `${niche} podcast`,
      queries[1] || '',
      queries[2] || '',
    ].filter(Boolean);

    const aggregatedCandidates: CCVideoCandidate[] = [];
    const seenCandidateIds = new Set<string>();
    const seenBatchChannels = new Set<string>();
    // Rotate and shuffle search terms to guarantee freshness across scans
    const shuffledTerms = [...searchTerms].sort(() => 0.5 - Math.random());

    for (const term of shuffledTerms) {
      try {
        const randomStart = 1 + Math.floor(Math.random() * 3);
        const ccSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(term)}&sp=EgIwAQ%253D%253D`;
        const args = [
          ccSearchUrl,
          '--flat-playlist',
          '--dump-json',
          '-I', `${randomStart}:${randomStart + limit + 8}`,
          '--no-warnings',
        ];

        const rawOutput = await this.youtubeService.executeYtDlp(args);
        const batchResults = await this.parseAndVerifyCCSearchResults(rawOutput, limit + 5);

        for (const cand of batchResults) {
          if (!seenCandidateIds.has(cand.id)) {
            seenCandidateIds.add(cand.id);
            const chanKey = cand.channel.trim().toLowerCase();

            // Channel Diversity: Enforce 1 candidate per channel per search pool
            if (!seenBatchChannels.has(chanKey)) {
              seenBatchChannels.add(chanKey);
              aggregatedCandidates.push(cand);
            }
          }
        }

        if (aggregatedCandidates.length >= limit) {
          break;
        }
      } catch (err) {
        console.warn(`[Autopilot:Search] Search attempt for "${term}" warned:`, err);
      }
    }

    // STRICT DIVERSITY SORT: Fresh channels (never used) come FIRST, then sort by viewCount
    aggregatedCandidates.sort((a, b) => {
      const aUsed = this.isChannelRecentlyUsed(a.channel) ? 1 : 0;
      const bUsed = this.isChannelRecentlyUsed(b.channel) ? 1 : 0;
      if (aUsed !== bUsed) return aUsed - bUsed; // 0 (unused) before 1 (used)
      return (b.viewCount || 0) - (a.viewCount || 0);
    });

    const finalCandidates = aggregatedCandidates.slice(0, limit);
    this.state.candidates = finalCandidates;
    this.emitState();
    return finalCandidates;
  }

  private async parseAndVerifyCCSearchResults(rawOutput: string, limit: number): Promise<CCVideoCandidate[]> {
    const candidates: CCVideoCandidate[] = [];
    const lines = rawOutput.split(/\r?\n/).filter(Boolean);
    const seenChannelsInBatch = new Set<string>();

    // Comprehensive blacklist of TV channels, commercial MCNs, music labels, and school lecture channels
    const riskyEntities = [
      'vevo', 'topic', 'netflix', 'disney', 'bbc', 'trt', 'acun', 'exxen', 'paramount', 'warner',
      'wediacorp', 'wedia corp', 'gain', 'netd', 'doğan', 'ciner', 'kanald', 'showtv', 'startv',
      'atv', 'blutv', 'turkuvaz', 'ay yapım', 'ayyapim', 'medyapım', 'medyapim', 'timsprod',
      'poll production', 'dmc', 'sony music', 'universal music', 'believe music',
      // School, curriculum & exam prep channels (permanently block Tonguç Akademi and course lectures)
      'tonguç', 'tonguc', 'dershane', 'lgs', 'yks', 'kpss', 'öabt', 'akademi', 'hocalara', 'benim hocam',
      'rehber matematik', 'rüştü hoca', 'mert hoca', 'soru çözümü', 'konu anlatımı'
    ];

    for (const line of lines) {
      try {
        const item = JSON.parse(line.trim());
        if (!item.id || !item.title) continue;

        // STRICT DEDUPLICATION: Exclude any video previously processed or uploaded
        if (
          this.processedVideoIds.has(item.id) ||
          this.uploadRegistryService?.isUploaded({ sourceVideoId: item.id })
        ) {
          continue;
        }

        const duration = Number(item.duration) || 0;
        // Skip clips < 25s or extremely long live archives > 3 hours
        if (duration > 0 && (duration < 25 || duration > 10800)) {
          continue;
        }

        // Series Mode duration guard: Video must be at least minSourceDurationSeconds (default 60s)
        if (this.settings.seriesModeEnabled && duration > 0 && duration < (this.settings.minSourceDurationSeconds || 60)) {
          continue;
        }

        const channelName = (item.uploader || item.channel || '').toLowerCase();
        const descText = (item.description || '').toLowerCase();

        // 🛡️ Pre-filter known risky commercial TV & MCN networks
        if (riskyEntities.some((r) => channelName.includes(r))) {
          this.emitLog(`🛡️ [Telif Kalkanı: REDDEDİLDİ] "${item.title}" ticari medya ağı (${channelName}) nedeniyle güvenlik gereği elendi.`);
          continue;
        }

        // 🛡️ BRAND SAFETY PRE-FILTER: Strictly reject political polemics, terrorism, ethnic conflict, and +18 content
        const itemSafety = this.checkBrandSafety(`${item.title} ${channelName} ${descText}`);
        if (!itemSafety.safe) {
          this.emitLog(`🛡️ [Güvenlik Kalkanı: REDDEDİLDİ] "${item.title}" (${itemSafety.reason}) siyasi/terör/+18 filtresi nedeniyle elendi.`);
          continue;
        }

        // Channel Diversity within current batch: Don't take duplicates
        if (seenChannelsInBatch.has(channelName)) {
          continue;
        }

        if (
          descText.includes('provided to youtube by') ||
          descText.includes('music in this video') ||
          descText.includes('sound recording administered by') ||
          descText.includes('universal music group') ||
          descText.includes('sony music') ||
          descText.includes('wediacorp')
        ) {
          this.emitLog(`🛡️ [Telif Kalkanı: REDDEDİLDİ] "${item.title}" açıklamasında telifli müzik / Content ID kaydı tespit edildi.`);
          continue;
        }

        // 🛡️ DEEP PROBE: Fetch full metadata to strictly verify CC license and zero commercial music
        const videoUrl = item.url || `https://www.youtube.com/watch?v=${item.id}`;
        try {
          const probe = await this.youtubeService.probeVideoFull(videoUrl);

          // 1. MUST have genuine Creative Commons license on YouTube
          if (!probe.isCreativeCommons) {
            this.emitLog(`🛡️ [Telif Kalkanı: REDDEDİLDİ] "${probe.title}" YouTube'da Creative Commons lisansına sahip değil (Lisans: ${probe.license || 'Standart Telifli'}).`);
            continue;
          }

          // 2. MUST NOT have registered commercial music tracks (Dexter Britain, etc.)
          if (probe.hasCommercialMusic) {
            this.emitLog(`🛡️ [Telif Kalkanı: REDDEDİLDİ] "${probe.title}" ticari müzik parçası ("${probe.track || probe.artist}") içerdiği için Content ID ses riskiyle elendi.`);
            continue;
          }

          // 3. Probed description safety check
          const probedDesc = (probe.description || '').toLowerCase();
          if (
            probedDesc.includes('provided to youtube by') ||
            probedDesc.includes('music in this video') ||
            probedDesc.includes('sound recording administered by') ||
            probedDesc.includes('universal music group') ||
            probedDesc.includes('sony music') ||
            probedDesc.includes('wediacorp')
          ) {
            this.emitLog(`🛡️ [Telif Kalkanı: REDDEDİLDİ] "${probe.title}" açıklamasında Content ID telif izi bulundu.`);
            continue;
          }

          // 4. BRAND SAFETY PROBE CHECK: Verify probed title, channel, and description
          const probeSafety = this.checkBrandSafety(
            `${probe.title} ${probe.channel || ''} ${probe.description || ''}`
          );
          if (!probeSafety.safe) {
            this.emitLog(`🛡️ [Güvenlik Kalkanı: REDDEDİLDİ] "${probe.title}" (${probeSafety.reason}) siyasi/terör/+18 filtresi nedeniyle elendi.`);
            continue;
          }

          // Format duration mm:ss or hh:mm:ss
          const effectiveDuration = probe.duration || duration;

          // Series Mode duration verification
          if (this.settings.seriesModeEnabled && effectiveDuration < (this.settings.minSourceDurationSeconds || 60)) {
            continue;
          }

          const mins = Math.floor(effectiveDuration / 60);
          const secs = Math.floor(effectiveDuration % 60);
          const hours = Math.floor(mins / 60);
          const remMins = mins % 60;
          const durationFormatted =
            effectiveDuration > 0
              ? hours > 0
                ? `${hours}:${remMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
                : `${mins}:${secs.toString().padStart(2, '0')}`
              : 'Belirsiz';

          candidates.push({
            id: probe.id || item.id,
            url: videoUrl,
            title: probe.title || item.title,
            duration: effectiveDuration,
            durationFormatted,
            channel: probe.channel || item.uploader || 'Bilinmeyen Kanal',
            viewCount: probe.viewCount || Number(item.view_count) || 0,
            thumbnailUrl: probe.thumbnailUrl || (Array.isArray(item.thumbnails) && item.thumbnails[0]?.url) || '',
            license: probe.license || 'Creative Commons Attribution (CC-BY 4.0)',
            verifiedCC: true,
            discoveredAt: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
          });

          seenChannelsInBatch.add(channelName);
          this.emitLog(`🛡️ [Telif Kalkanı: ONAYLANDI] "${probe.title}" %100 Creative Commons lisansı doğrulandı ve müzik telifsiz olarak güvenceye alındı.`);

          if (candidates.length >= limit) {
            break;
          }
        } catch (probeErr: any) {
          console.warn(`[Autopilot:Probe] Video probe failed for ${item.id}:`, probeErr.message);
        }
      } catch (e) {
        // ignore parse error
      }
    }

    // Prioritize candidates meeting minViewCount threshold
    const minThreshold = this.settings.minViewCount || 0;
    let filtered = candidates;
    if (minThreshold > 0) {
      const qualified = candidates.filter((c) => (c.viewCount || 0) >= minThreshold);
      if (qualified.length >= Math.min(2, limit)) {
        filtered = qualified;
      }
    }

    // STRICT VIRALITY SORT: Order candidates by view count descending
    filtered.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));

    return filtered.slice(0, limit);
  }

  /**
   * Slot Calculator: Finds the next available posting slot across today, tomorrow, etc.
   */
  public calculateNextSlot(): {
    slotTime: string;
    scheduledFor: string;
    dayLabel: string;
    timestamp: number;
  } {
    return this.calculateNextSlotAfter(Date.now() + 10 * 60 * 1000);
  }

  /**
   * Calculates the next available slot after a specific minimum timestamp (used for sequential series scheduling)
   */
  public calculateNextSlotAfter(minTimestamp: number): {
    slotTime: string;
    scheduledFor: string;
    dayLabel: string;
    timestamp: number;
  } {
    const slots =
      this.settings.postingSlots && this.settings.postingSlots.length > 0
        ? [...this.settings.postingSlots].sort()
        : ['12:30', '18:30', '21:15'];

    for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
      const targetDate = new Date(Date.now() + dayOffset * 24 * 60 * 60 * 1000);
      const year = targetDate.getFullYear();
      const month = (targetDate.getMonth() + 1).toString().padStart(2, '0');
      const day = targetDate.getDate().toString().padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      for (const slot of slots) {
        const [slotHours, slotMins] = slot.split(':').map((s) => parseInt(s, 10));
        const slotDateTime = new Date(year, targetDate.getMonth(), targetDate.getDate(), slotHours, slotMins, 0);

        if (slotDateTime.getTime() < minTimestamp) {
          continue;
        }

        const scheduledFor = `${dateStr} ${slot}`;
        const isOccupied = this.state.packages.some(
          (p) => p.scheduledFor === scheduledFor && p.status !== 'published'
        );

        if (!isOccupied) {
          let dayLabel = `${day}.${month}.${year} ${slot}`;
          if (dayOffset === 0) dayLabel = `Bugün ${slot}`;
          else if (dayOffset === 1) dayLabel = `Yarın ${slot}`;

          return {
            slotTime: slot,
            scheduledFor,
            dayLabel,
            timestamp: slotDateTime.getTime(),
          };
        }
      }
    }

    const fallbackDate = new Date(minTimestamp);
    const h = fallbackDate.getHours().toString().padStart(2, '0');
    const m = fallbackDate.getMinutes().toString().padStart(2, '0');
    const timeStr = `${h}:${m}`;
    const dateStr = `${fallbackDate.getFullYear()}-${(fallbackDate.getMonth() + 1).toString().padStart(2, '0')}-${fallbackDate.getDate().toString().padStart(2, '0')}`;
    return {
      slotTime: timeStr,
      scheduledFor: `${dateStr} ${timeStr}`,
      dayLabel: `${dateStr} ${timeStr}`,
      timestamp: minTimestamp,
    };
  }

  /**
   * Calculates sequential consecutive slots with minimum interval for Multi-Part Series
   */
  public calculateSequentialSlots(
    count: number,
    minIntervalMinutes: number = 55
  ): Array<{
    slotTime: string;
    scheduledFor: string;
    dayLabel: string;
    timestamp: number;
  }> {
    const results: Array<{
      slotTime: string;
      scheduledFor: string;
      dayLabel: string;
      timestamp: number;
    }> = [];

    let currentMinTimestamp = Date.now() + 10 * 60 * 1000;

    for (let i = 0; i < count; i++) {
      const slot = this.calculateNextSlotAfter(currentMinTimestamp);
      results.push(slot);
      currentMinTimestamp = slot.timestamp + minIntervalMinutes * 60 * 1000;
    }

    return results;
  }

  /**
   * Chronological next slot query for live tracking and auto-preparation
   */
  public getNextUpcomingSlot(): {
    slotTime: string;
    scheduledFor: string;
    dayLabel: string;
    timestamp: number;
    minutesRemaining: number;
    hasReadyPackage: boolean;
    package?: ScheduledClipPackage;
  } {
    const slots =
      this.settings.postingSlots && this.settings.postingSlots.length > 0
        ? [...this.settings.postingSlots].sort()
        : ['12:30', '18:30', '21:15'];

    const now = new Date();
    for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
      const targetDate = new Date(now.getTime() + dayOffset * 24 * 60 * 60 * 1000);
      const year = targetDate.getFullYear();
      const month = (targetDate.getMonth() + 1).toString().padStart(2, '0');
      const day = targetDate.getDate().toString().padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      for (const slot of slots) {
        const [slotHours, slotMins] = slot.split(':').map((s) => parseInt(s, 10));
        const slotDateTime = new Date(year, targetDate.getMonth(), targetDate.getDate(), slotHours, slotMins, 0);

        // If today and slot has already passed by more than 1 minute, skip
        if (dayOffset === 0 && slotDateTime.getTime() <= now.getTime() - 60 * 1000) {
          continue;
        }

        const scheduledFor = `${dateStr} ${slot}`;
        const existingPkg = this.state.packages.find(
          (p) => p.scheduledFor === scheduledFor && p.status !== 'failed'
        );

        let dayLabel = `${day}.${month}.${year} ${slot}`;
        if (dayOffset === 0) dayLabel = `Bugün ${slot}`;
        else if (dayOffset === 1) dayLabel = `Yarın ${slot}`;

        const minutesRemaining = Math.max(0, Math.round((slotDateTime.getTime() - now.getTime()) / (60 * 1000)));

        return {
          slotTime: slot,
          scheduledFor,
          dayLabel,
          timestamp: slotDateTime.getTime(),
          minutesRemaining,
          hasReadyPackage: !!(
            existingPkg &&
            (existingPkg.status === 'ready' ||
              existingPkg.status === 'scheduled' ||
              existingPkg.status === 'published' ||
              existingPkg.status === 'publishing')
          ),
          package: existingPkg,
        };
      }
    }

    return {
      slotTime: slots[0],
      scheduledFor: `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')} ${slots[0]}`,
      dayLabel: `Bugün ${slots[0]}`,
      timestamp: now.getTime() + 60 * 60 * 1000,
      minutesRemaining: 60,
      hasReadyPackage: false,
    };
  }

  /**
   * Helper to broadcast progress updates to UI and state
   */
  private updateProgress(
    stepIndex: number,
    stepTitle: string,
    percent: number,
    message: string,
    batchCurrent: number = 1,
    batchTotal: number = 1
  ): void {
    this.state.activeProgress = {
      stepIndex,
      stepTitle,
      percent: Math.min(100, Math.max(0, percent)),
      message,
      batchCurrent,
      batchTotal,
    };
    this.state.currentAction = message;
    this.emitState();
  }

  /**
   * Main Autonomous Workflow Cycle (Single Clip)
   */
  public async runAutopilotCycle(
    customCandidate?: CCVideoCandidate,
    batchCurrent: number = 1,
    batchTotal: number = 1
  ): Promise<ScheduledClipPackage | null> {
    if (this.isBusy) {
      this.emitLog('⚠ Otopilot zaten aktif bir döngü yürütüyor. Yeni istek sıraya alınamaz.');
      return null;
    }

    this.isBusy = true;
    this.state.isBusy = true;
    this.updateProgress(1, 'Viral CC Keşfi', 5, 'Creative Commons videosu aranıyor ve seçiliyor...', batchCurrent, batchTotal);

    try {
      let targetVideo: CCVideoCandidate | null = customCandidate || null;

      if (!targetVideo) {
        this.state.activeAgent = 'trend_hunter';
        this.updateProgress(1, 'Viral CC Keşfi', 10, 'Hunter Gemma viral trend videolarını tarıyor...', batchCurrent, batchTotal);

        let searchCandidates = await this.searchCreativeCommons(
          this.settings.selectedNiche,
          this.settings.customKeyword,
          8
        );

        if (!searchCandidates || searchCandidates.length === 0) {
          this.emitLog('[Otopilot:Avcı] Alternatif genel arama terimleri taranıyor...');
          searchCandidates = await this.searchCreativeCommons('Podcast & Röportaj', '', 8);
        }

        // Priority 1: Fresh channel that has not been recently used
        targetVideo = searchCandidates?.find(
          (c) =>
            !this.processedVideoIds.has(c.id) &&
            !this.uploadRegistryService?.isUploaded({ sourceVideoId: c.id, title: c.title }) &&
            !this.isChannelRecentlyUsed(c.channel)
        ) || null;

        // Priority 2: Any unprocessed video from candidates
        if (!targetVideo) {
          targetVideo = searchCandidates?.find(
            (c) =>
              !this.processedVideoIds.has(c.id) &&
              !this.uploadRegistryService?.isUploaded({ sourceVideoId: c.id, title: c.title })
          ) || null;
        }

        if (!targetVideo) {
          this.emitLog('[Otopilot:Avcı] Daha önce işlenmemiş taze videolar için genişletilmiş arama yapılıyor...');
          const deepCandidates = await this.searchCreativeCommons('Röportaj Gerçek Hayat Hikayeleri', '', 12);
          targetVideo =
            deepCandidates?.find(
              (c) =>
                !this.processedVideoIds.has(c.id) &&
                !this.uploadRegistryService?.isUploaded({ sourceVideoId: c.id, title: c.title }) &&
                !this.isChannelRecentlyUsed(c.channel)
            ) ||
            deepCandidates?.find(
              (c) =>
                !this.processedVideoIds.has(c.id) &&
                !this.uploadRegistryService?.isUploaded({ sourceVideoId: c.id, title: c.title })
            ) ||
            null;
        }
      }

      if (!targetVideo) {
        throw new Error('Creative Commons aramasında video bulunamadı. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.');
      }

      return await this.executeClipProduction(targetVideo, batchCurrent, batchTotal);
    } catch (err: any) {
      this.emitLog(`✗ [Otopilot Hata]: ${err.message}`);
      this.state.currentAction = `Hata: ${err.message}`;
      this.emitState();
      throw err;
    } finally {
      this.isBusy = false;
      this.state.isBusy = false;
      this.state.activeAgent = undefined;
      this.state.activeProgress = undefined;
      this.emitState();
    }
  }

  /**
   * Run daily multi-clip batch generation across multiple distinct Creative Commons videos
   */
  public async runAutopilotDailyBatch(targetCount: number = 3): Promise<ScheduledClipPackage[]> {
    if (this.isBusy) {
      this.emitLog('⚠ Otopilot zaten aktif bir döngü yürütüyor. Yeni parti başlatılamaz.');
      return [];
    }

    this.isBusy = true;
    this.state.isBusy = true;
    this.updateProgress(1, 'Parti Keşfi', 5, `Günlük ${targetCount} farklı video aranıyor...`, 1, targetCount);
    this.emitLog(`🚀 [Otopilot:Toplu Üretim] Günlük ${targetCount} farklı videodan klip üretimi başlatılıyor...`);

    const generatedPackages: ScheduledClipPackage[] = [];

    try {
      // Search for candidates
      let candidates = await this.searchCreativeCommons(
        this.settings.selectedNiche,
        this.settings.customKeyword,
        targetCount + 15
      );

      const availableCandidates = candidates.filter(
        (c) => !this.processedVideoIds.has(c.id) && !this.uploadRegistryService?.isUploaded({ sourceVideoId: c.id })
      );

      // STRICT CHANNEL DIVERSITY: Ensure every video in the daily batch is from a DIFFERENT channel
      const seenBatchChannels = new Set<string>();
      const distinctChannelCandidates: CCVideoCandidate[] = [];

      for (const cand of availableCandidates) {
        const chanKey = (cand.channel || '').trim().toLowerCase();
        if (!seenBatchChannels.has(chanKey) && !this.isChannelRecentlyUsed(cand.channel)) {
          seenBatchChannels.add(chanKey);
          distinctChannelCandidates.push(cand);
        }
      }

      // Fallback: Fill remaining slots from other available candidates if needed
      if (distinctChannelCandidates.length < targetCount) {
        for (const cand of availableCandidates) {
          const chanKey = (cand.channel || '').trim().toLowerCase();
          if (!seenBatchChannels.has(chanKey)) {
            seenBatchChannels.add(chanKey);
            distinctChannelCandidates.push(cand);
          }
        }
      }

      for (let i = 0; i < targetCount; i++) {
        let candidate = distinctChannelCandidates[i] || availableCandidates[i];
        if (!candidate && candidates.length > 0) {
          candidate = candidates[i % candidates.length];
        }

        if (!candidate) continue;

        this.emitLog(`\n🎬 PARTİ GÖREVİ [${i + 1}/${targetCount}]: "${candidate.title}" (Kanal: ${candidate.channel})`);
        try {
          const pkg = await this.executeClipProduction(candidate, i + 1, targetCount);
          if (pkg) {
            generatedPackages.push(pkg);
          }
        } catch (err: any) {
          this.emitLog(`❌ Parti klip [${i + 1}/${targetCount}] üretiminde hata: ${err.message}`);
        }
      }

      this.emitLog(`✅ [Otopilot:Toplu Üretim] Tamamlandı! ${generatedPackages.length}/${targetCount} benzersiz klip arşive eklendi.`);
      return generatedPackages;
    } catch (batchErr: any) {
      this.emitLog(`❌ Parti üretim hatası: ${batchErr.message}`);
      throw batchErr;
    } finally {
      this.isBusy = false;
      this.state.isBusy = false;
      this.state.activeAgent = undefined;
      this.state.activeProgress = undefined;
      this.emitState();
    }
  }

  /**
   * Internal Execution Core for a Single Video Clip Production
   */
  private async executeClipProduction(
    targetVideo: CCVideoCandidate,
    batchCurrent: number = 1,
    batchTotal: number = 1
  ): Promise<ScheduledClipPackage> {
    this.processedVideoIds.add(targetVideo.id);
    this.savePersistence();
    this.emitLog(`✓ Kaynak CC Video Seçildi: "${targetVideo.title}" (${targetVideo.channel})`);

    // STEP 2: LEGAL LLAMA - Audit Creative Commons license & generate attribution
    this.state.activeAgent = 'copyright_auditor';
    this.updateProgress(2, 'Telif Denetimi', 20, 'Legal Llama CC-BY telif ve lisans denetimi yapıyor...', batchCurrent, batchTotal);

    const auditResult = await this.agencyService.auditCopyrightLicense(
      {
        title: targetVideo.title,
        channel: targetVideo.channel,
        url: targetVideo.url,
        license: targetVideo.license,
      },
      {
        onMessage: this.onAgencyMessage,
        onLog: this.onLog,
      }
    );

    if (!auditResult.approved) {
      this.emitLog(`❌ [Telif Kalkanı Reddi]: "${targetVideo.title}" elendi: ${auditResult.notes}`);
      throw new Error(`Telif Kalkanı Reddi: ${auditResult.notes}`);
    }

    // STEP 3: DOWNLOAD VIDEO
    this.state.activeAgent = 'trend_hunter';
    this.updateProgress(3, 'Video İndirme', 25, 'YouTube CC videosu yüksek kalitede indiriliyor...', batchCurrent, batchTotal);
    this.emitLog(`[YouTube] İndiriliyor: ${targetVideo.url}`);

    const rawVideoPath = await this.youtubeService.downloadVideo({
      url: targetVideo.url,
      outputDir: path.join(this.storageDir, 'Source_Videos'),
      onLog: (l) => this.emitLog(l),
      onProgress: (pct, msg) => {
        this.updateProgress(
          3,
          'Video İndirme',
          25 + Math.round(pct * 0.15),
          `Video indiriliyor: %${pct} - ${msg}`,
          batchCurrent,
          batchTotal
        );
        if (this.onProgress) {
          this.onProgress({
            phase: 'hunting',
            percent: Math.round(pct * 0.3),
            message: `Video indiriliyor: %${pct} - ${msg}`,
            activeAgent: 'trend_hunter',
          });
        }
      },
    });

    // STEP 4: WHISPER GPU TRANSCRIBE
    this.state.activeAgent = 'scout';
    this.updateProgress(4, 'Whisper Deşifre', 42, 'Videodan ses dalgaları ayıklanıyor (16kHz WAV)...', batchCurrent, batchTotal);
    const wavPath = path.join(path.dirname(rawVideoPath), `${path.basename(rawVideoPath, path.extname(rawVideoPath))}_audio.wav`);
    await this.ffmpegService.extractAudio(rawVideoPath, wavPath);

    this.updateProgress(4, 'Whisper Deşifre', 45, 'Whisper modeli çalışıyor, kelime zaman damgaları çıkarılıyor...', batchCurrent, batchTotal);
    this.emitLog(`[Whisper] Ses analiz ediliyor: ${path.basename(rawVideoPath)}`);

    const transcript = await this.whisperService.transcribe(
      wavPath,
      'small',
      'tr',
      (pct, msg) => {
        this.updateProgress(
          4,
          'Whisper Deşifre',
          45 + Math.round(pct * 0.15),
          `Whisper kelimeleri deşifre ediyor: %${pct} - ${msg}`,
          batchCurrent,
          batchTotal
        );
        if (this.onProgress) {
          this.onProgress({
            phase: 'scouting',
            percent: 30 + Math.round(pct * 0.25),
            message: `Whisper deşifre ediyor: %${pct} - ${msg}`,
            activeAgent: 'scout',
          });
        }
      }
    );

    // STEP 4.5: BRAND SAFETY AUDIT ON TRANSCRIPT
    const transcriptSafety = this.checkBrandSafety(transcript.text || '');
    if (!transcriptSafety.safe) {
      throw new Error(
        `Kanal Güvenlik Kalkanı: Video transkriptinde "${transcriptSafety.reason}" içeriği tespit edildi. Siyasi propaganda, terör veya +18 içerikler kanal güvenliği ve YouTube politikaları gereği derhal engellendi.`
      );
    }

    // =========================================================================
    // BRANCH A: SERIES MODE (Cliffhanger Qwen - Multi-Part Consecutive Shorts)
    // =========================================================================
    if (this.settings.seriesModeEnabled) {
      this.state.activeAgent = 'cliffhanger_architect';
      this.updateProgress(
        5,
        'Seri Kurgu & Cliffhanger',
        70,
        'Cliffhanger Qwen video hikayesini analiz ediyor ve Part 1 / Part 2 kırılma noktasını belirliyor...',
        batchCurrent,
        batchTotal
      );

      const partsCount = this.settings.seriesPartsCount || 2;
      const seriesClips = await this.agencyService.generateCliffhangerSeriesClips(transcript, {
        partsCount,
        baseTitle: targetVideo.title,
        overlayBanner: this.settings.seriesOverlayBanner ?? true,
        onMessage: this.onAgencyMessage,
        onLog: this.onLog,
      });

      const sequentialSlots = this.calculateSequentialSlots(
        seriesClips.length,
        this.settings.seriesIntervalMinutes || 55
      );
      const seriesPackages: ScheduledClipPackage[] = [];
      const seriesGroupId = `grp_${Date.now()}`;

      for (let i = 0; i < seriesClips.length; i++) {
        const sClip = seriesClips[i];
        const sSlot = sequentialSlots[i];

        this.updateProgress(
          6,
          'Seri Render',
          75 + Math.round((i / seriesClips.length) * 20),
          `Part ${sClip.partNumber}/${sClip.totalParts} 9:16 formatında ve bannerlı render ediliyor...`,
          batchCurrent,
          batchTotal
        );

        const sanitizedTitle = sClip.title
          .replace(/[^a-zA-Z0-9çğıöşüÇĞİÖŞÜ\s_-]/g, '')
          .trim()
          .replace(/\s+/g, '_')
          .substring(0, 30);

        const packageFolderName = `${sSlot.scheduledFor.replace(/[: ]/g, '_')}_Part${sClip.partNumber}_${sanitizedTitle}`;
        const packageDir = path.join(this.settings.archiveDirectory, packageFolderName);
        fs.mkdirSync(packageDir, { recursive: true });

        const finalVideoPath = path.join(packageDir, 'video.mp4');
        const assPath = path.join(packageDir, 'subtitles.ass');

        // Generate ASS Subtitles with persistent series banner overlay
        const allWords = transcript.segments?.flatMap((s) => s.words || []) || [];
        generateAssSubtitles(
          allWords,
          sClip.start_seconds,
          sClip.end_seconds,
          {
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
          },
          assPath,
          this.settings.aspectRatio,
          sClip.seriesBannerText
        );

        let customVideoFilter: string | undefined = undefined;
        if (this.settings.layoutMode === 'smart_face_tracking') {
          try {
            const faceResult = await this.faceTrackingService.analyzeCrop(
              rawVideoPath,
              sClip.start_seconds,
              sClip.duration_seconds
            );
            customVideoFilter = faceResult.filter_complex;
          } catch (faceErr) {
            console.warn('[Autopilot:FaceTracking] Failed:', faceErr);
          }
        }

        this.emitLog(`[FFmpeg] Render başlıyor (Part ${sClip.partNumber}/${sClip.totalParts}) -> ${path.basename(finalVideoPath)}`);

        await this.ffmpegService.renderVerticalClip({
          videoPath: rawVideoPath,
          startSeconds: sClip.start_seconds,
          durationSeconds: sClip.duration_seconds,
          assSubtitlePath: assPath,
          outputPath: finalVideoPath,
          aspectRatio: this.settings.aspectRatio,
          layoutMode: this.settings.layoutMode,
          customVideoFilter,
        });

        // Thumbnail
        let finalThumbnailPath = path.join(packageDir, 'thumbnail.jpg');
        const frameSec = sClip.start_seconds + Math.min(4, sClip.duration_seconds / 2);
        try {
          await this.ffmpegService.extractFrame(rawVideoPath, frameSec, finalThumbnailPath);
        } catch {}

        // Rich dialogue & clean metadata: NO links, NO app promos!
        const sMeta = sClip.socialMetadata || {
          titles: [sClip.title, `${sClip.title} #Shorts`],
          description: `⚡ ${sClip.hook_sentence}\n\n👉 Devamı için takipte kalın!`,
          hashtags: ['#Shorts', '#Viral', '#Hikaye', '#Röportaj'],
          callToAction: 'Devamı için takip edin! 👇',
        };

        const pkg: ScheduledClipPackage = {
          id: `pkg_${Date.now()}_part${sClip.partNumber}_${Math.random().toString(36).substring(2, 6)}`,
          clipId: sClip.clip_id,
          title: sClip.title,
          scheduledFor: sSlot.scheduledFor,
          slotTime: sSlot.slotTime,
          dayLabel: sSlot.dayLabel,
          videoPath: finalVideoPath,
          thumbnailPath: fs.existsSync(finalThumbnailPath) ? finalThumbnailPath : undefined,
          packageDir,
          socialMetadata: sMeta,
          sourceVideo: {
            id: targetVideo.id,
            title: targetVideo.title,
            channel: targetVideo.channel,
            url: targetVideo.url,
            license: targetVideo.license,
            thumbnailUrl: targetVideo.thumbnailUrl,
          },
          viralityScore: sClip.virality_score,
          qaScore: 96,
          schedulerNote: `Cliffhanger Seri Modu (Part ${sClip.partNumber}/${sClip.totalParts}) - ${sSlot.dayLabel}`,
          createdAt: new Date().toISOString(),
          status: 'ready',
          isSeries: true,
          partNumber: sClip.partNumber,
          totalParts: sClip.totalParts,
          seriesGroupId,
          seriesBannerText: sClip.seriesBannerText,
        };

        fs.writeFileSync(path.join(packageDir, 'package_info.json'), JSON.stringify(pkg, null, 2), 'utf-8');
        seriesPackages.push(pkg);
        this.state.packages.unshift(pkg);
      }

      // Record channel and ID as processed to maintain diversity
      if (targetVideo.channel) {
        this.processedChannels.add(targetVideo.channel.trim().toLowerCase());
      }
      this.processedVideoIds.add(targetVideo.id);
      this.state.lastRunAt = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      this.updateProgress(
        6,
        'Yayın & Render',
        100,
        `Tamamlandı! ${seriesPackages.length} parçalı seri başarıyla hazırlandı ve kuyruğa eklendi.`,
        batchCurrent,
        batchTotal
      );
      this.savePersistence();
      this.emitState();

      this.emitLog(`🎉 [Otopilot:Seri Modu] ${seriesPackages.length} parçalık seri başarıyla oluşturuldu ve sıralı saatlere planlandı.`);
      return seriesPackages[0];
    }

    // =========================================================================
    // BRANCH B: STANDARD SINGLE VIRAL CLIP
    // =========================================================================

    // STEP 5: MULTI-AGENT AGENCY PIPELINE (14 Ajanlı Tam Otonom Senkronizasyon)
    this.state.activeAgent = 'ceo';
    this.updateProgress(5, 'Ajans Analizi', 62, 'Yapay Zeka Ajansı viral kesitleri ve kancaları üretiyor...', batchCurrent, batchTotal);

    const nextSlot = this.calculateNextSlot();

    const producedClips = await this.agencyService.runAgencyPipeline(transcript, {
      clipCount: this.settings.clipsPerVideo || 1,
      minClipDuration: 30,
      maxClipDuration: 60,
      videoPath: rawVideoPath,
      outputDirectory: this.settings.archiveDirectory,
      currentSlot: nextSlot,
      onMessage: this.onAgencyMessage,
      onProgress: (prog) => {
        this.updateProgress(
          5,
          'Ajans Analizi',
          62 + Math.round(prog.percent * 0.18),
          `Ajans: ${prog.message}`,
          batchCurrent,
          batchTotal
        );
        if (this.onProgress) {
          this.onProgress({
            ...prog,
            percent: 55 + Math.round(prog.percent * 0.3),
          });
        }
      },
      onLog: this.onLog,
    });

    if (!producedClips || producedClips.length === 0) {
      throw new Error('Ajans bu videodan viral klip adayı çıkaramadı.');
    }

    const bestClip: ViralClip = producedClips[0];

    // STEP 6: PLANNER QWEN - Slot Scheduling & Virality Boost
    this.state.activeAgent = 'scheduler';
    this.updateProgress(6, 'Yayın & Render', 82, 'Planner Qwen altın yayın saatini planlıyor...', batchCurrent, batchTotal);

    const schedulePlan = await this.agencyService.planScheduleSlot(bestClip, this.settings.postingSlots, {
      onMessage: this.onAgencyMessage,
      onLog: this.onLog,
      currentSlot: nextSlot,
    });

    // STEP 7: RENDER VERTICAL 9:16 CLIP
    this.updateProgress(6, 'Yayın & Render', 86, 'Klip 9:16 formatında ve altyazılı olarak render ediliyor...', batchCurrent, batchTotal);

    const sanitizedTitle = bestClip.title
      .replace(/[^a-zA-Z0-9çğıöşüÇĞİÖŞÜ\s_-]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .substring(0, 30);

    const packageFolderName = `${nextSlot.scheduledFor.replace(/[: ]/g, '_')}_${sanitizedTitle}`;
    const packageDir = path.join(this.settings.archiveDirectory, packageFolderName);
    fs.mkdirSync(packageDir, { recursive: true });

    const finalVideoPath = path.join(packageDir, 'video.mp4');
    const assPath = path.join(packageDir, 'subtitles.ass');

    // Generate ASS Subtitles
    const allWords = transcript.segments?.flatMap((s) => s.words || []) || [];
    generateAssSubtitles(
      allWords,
      bestClip.start_seconds,
      bestClip.end_seconds,
      {
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
      },
      assPath,
      this.settings.aspectRatio
    );

    // Face tracking / layout
    let customVideoFilter: string | undefined = undefined;
    if (this.settings.layoutMode === 'smart_face_tracking') {
      try {
        const faceResult = await this.faceTrackingService.analyzeCrop(
          rawVideoPath,
          bestClip.start_seconds,
          bestClip.duration_seconds
        );
        customVideoFilter = faceResult.filter_complex;
      } catch (faceErr) {
        console.warn('[Autopilot:FaceTracking] Failed:', faceErr);
      }
    }

    this.emitLog(`[FFmpeg] Render başlıyor -> ${path.basename(finalVideoPath)}`);

    await this.ffmpegService.renderVerticalClip({
      videoPath: rawVideoPath,
      startSeconds: bestClip.start_seconds,
      durationSeconds: bestClip.duration_seconds,
      assSubtitlePath: assPath,
      outputPath: finalVideoPath,
      aspectRatio: this.settings.aspectRatio,
      layoutMode: this.settings.layoutMode,
      customVideoFilter,
    });

    // Thumbnail handling
    let finalThumbnailPath = path.join(packageDir, 'thumbnail.jpg');
    if (bestClip.thumbnailPath && fs.existsSync(bestClip.thumbnailPath)) {
      try {
        fs.copyFileSync(bestClip.thumbnailPath, finalThumbnailPath);
      } catch {}
    } else {
      const frameSec = bestClip.start_seconds + Math.min(5, bestClip.duration_seconds / 2);
      try {
        await this.ffmpegService.extractFrame(rawVideoPath, frameSec, finalThumbnailPath);
      } catch (thumbErr) {
        console.warn('[Autopilot] Thumbnail extraction fallback failed:', thumbErr);
      }
    }

    // STEP 8: BUILD SOCIAL METADATA & BUNDLE PACKAGE (100% video-focused, dialogue quotes, NO app promos or links!)
    const matchingSegs = transcript.segments?.filter(
      (s) => s.start >= bestClip.start_seconds && s.end <= bestClip.end_seconds
    ) || [];
    const dialogueQuote =
      matchingSegs.map((s) => s.text.trim()).filter(Boolean).join(' ').substring(0, 160) ||
      bestClip.hook_sentence;

    let cleanDesc =
      bestClip.socialMetadata?.description ||
      `🔥 "${dialogueQuote}..."\n\nBu kesitte konuşmacının aktardığı sarsıcı detaylar ve yaşam tecrübesi ele alınıyor. Gerçek hayatın içinden çıkarılacak en kilit dersler.\n\nSizce konuşmacı bu tespitinde haklı mı? Düşüncelerinizi yorumlarda paylaşmayı unutmayın! 👇`;
    cleanDesc = cleanDesc
      .replace(/https?:\/\/[^\s]+/gi, '')
      .replace(/⚡\s*Bu video AutoClip[^\n]*/gi, '')
      .replace(/🚀\s*Proje & Kaynak Kod:[^\n]*/gi, '')
      .replace(/#AutoClipAI/gi, '#Keşfet')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    const socialMeta = {
      titles: bestClip.socialMetadata?.titles || [
        bestClip.title,
        `🔥 ${bestClip.title}`,
        `Bunu Biliyor Muydunuz? | ${bestClip.title}`,
      ],
      description: cleanDesc,
      hashtags: (
        bestClip.socialMetadata?.hashtags || [
          '#Shorts',
          '#Röportaj',
          '#Hikaye',
          '#Keşfet',
          '#Viral',
          '#Podcast',
        ]
      ).filter((h: string) => !/autoclip|autocut/i.test(h)),
      callToAction:
        bestClip.socialMetadata?.callToAction || 'Düşüncelerinizi yorumlarda paylaşın! 👇',
    };

    const socialTextContent = `======================================================================
🎬 YAYINA HAZIR VİRAL KLİP PAKETİ
📅 Planlanan Yayın Zamanı: ${nextSlot.dayLabel} (Yuva: ${nextSlot.slotTime})
⭐ Virallik Skoru: ${bestClip.virality_score}/100
🎯 Kanca Cümlesi: "${bestClip.hook_sentence}"
📈 Algoritma Stratejisi: ${schedulePlan.strategyNote}
======================================================================

📌 3 ALTERNATİF BAŞLIK:
1. ${socialMeta.titles[0] || bestClip.title}
2. ${socialMeta.titles[1] || bestClip.title}
3. ${socialMeta.titles[2] || bestClip.title}

📝 AÇIKLAMA (CAPTION):
${socialMeta.description}

🏷️ HASHTAGLER:
${socialMeta.hashtags.join(' ')}

📢 ÇAĞRI (CALL TO ACTION):
${socialMeta.callToAction}

⚖️ LİSANS BİLGİSİ (CREATIVE COMMONS CC-BY):
${auditResult.attribution}
Orijinal Video: ${targetVideo.title}
Kanal: ${targetVideo.channel}
Video Linki: ${targetVideo.url}
Lisans: Creative Commons Attribution (CC-BY - Yeniden kullanıma izin verilir)
======================================================================`;

    fs.writeFileSync(path.join(packageDir, 'social_metadata.txt'), socialTextContent, 'utf-8');

    const packageInfoData = {
      id: `pkg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      clipId: bestClip.clip_id,
      title: bestClip.title,
      scheduledFor: nextSlot.scheduledFor,
      slotTime: nextSlot.slotTime,
      dayLabel: nextSlot.dayLabel,
      videoPath: finalVideoPath,
      thumbnailPath: fs.existsSync(finalThumbnailPath) ? finalThumbnailPath : undefined,
      packageDir,
      socialMetadata: socialMeta,
      sourceVideo: {
        id: targetVideo.id,
        title: targetVideo.title,
        channel: targetVideo.channel,
        url: targetVideo.url,
        license: targetVideo.license,
        thumbnailUrl: targetVideo.thumbnailUrl,
      },
      viralityScore: bestClip.virality_score,
      qaScore: bestClip.qaScore || 95,
      schedulerNote: schedulePlan.strategyNote,
      createdAt: new Date().toISOString(),
      status: 'ready' as const,
    };

    fs.writeFileSync(
      path.join(packageDir, 'package_info.json'),
      JSON.stringify(packageInfoData, null, 2),
      'utf-8'
    );

    const readyPackage: ScheduledClipPackage = packageInfoData;

    // Track channel and ID
    if (targetVideo.channel) {
      this.processedChannels.add(targetVideo.channel.trim().toLowerCase());
    }
    this.processedVideoIds.add(targetVideo.id);

    // Add to state queue
    this.state.packages.unshift(readyPackage);
    this.state.lastRunAt = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    this.updateProgress(6, 'Yayın & Render', 100, `Tamamlandı! Yeni klip arşive eklendi (${nextSlot.dayLabel})`, batchCurrent, batchTotal);
    this.savePersistence();
    this.emitState();

    this.emitLog(`🎉 [Otopilot] Başarıyla paketlendi ve arşivlendi: "${bestClip.title}" (${targetVideo.channel}) -> ${nextSlot.dayLabel}`);

    return readyPackage;
  }

  /**
   * Start 24/7 autonomous background timer & YouTube Shorts publishing loop
   */
  public startScheduler(): void {
    if (this.schedulerTimer) clearInterval(this.schedulerTimer);

    this.settings.enabled = true;
    this.state.isRunning = true;
    this.savePersistence();

    this.emitLog(`🤖 [Otopilot] 7/24 Otonom YouTube Yayıncısı başlatıldı! Yayın saatlerinden önce videolar hazırlanacak ve vaktinde YouTube Shorts'a yüklenecek.`);

    // Run first check soon (1.5 seconds)
    setTimeout(() => {
      this.checkScheduleTick();
    }, 1500);

    // Active ticking interval: every 20 seconds (low overhead, responsive to publishing slots)
    this.schedulerTimer = setInterval(() => {
      this.checkScheduleTick();
    }, 20_000);

    this.emitState();
  }

  /**
   * Stop 24/7 autonomous scheduler
   */
  public stopScheduler(): void {
    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
    this.settings.enabled = false;
    this.state.isRunning = false;
    this.state.currentAction = 'Durduruldu';
    this.savePersistence();
    this.emitLog('🛑 [Otopilot] 7/24 Otonom Yayıncı durduruldu.');
    this.emitState();
  }

  /**
   * Main scheduler tick: handles both auto-production (min 10 mins before slot) and auto-publishing (on time)
   */
  public async checkScheduleTick(): Promise<void> {
    if (!this.settings.enabled) return;

    // 1. Refresh next upcoming slot info for state & UI
    const upcoming = this.getNextUpcomingSlot();
    this.state.nextSlotInfo = {
      slotTime: upcoming.slotTime,
      scheduledFor: upcoming.scheduledFor,
      dayLabel: upcoming.dayLabel,
      minutesRemaining: upcoming.minutesRemaining,
      hasPackage: upcoming.hasReadyPackage,
    };
    this.state.nextRunAt = `${upcoming.dayLabel} (Kalan: ${upcoming.minutesRemaining} dk)`;

    // 2. Publish any packages whose scheduled slot time has arrived
    await this.publishDuePackages();

    // 3. Check if upcoming slot needs a clip produced (at least 10-15 mins in advance)
    if (!this.isBusy) {
      await this.prepareUpcomingSlotIfNeeded(upcoming);
    }
  }

  /**
   * Publishes any packages whose scheduled time has arrived or passed
   */
  private async publishDuePackages(): Promise<void> {
    if (this.isBusy) return;

    const now = Date.now();
    // Find packages ready to publish: status is 'ready' or 'scheduled'
    const duePackages = this.state.packages.filter((pkg) => {
      if (pkg.status !== 'ready' && pkg.status !== 'scheduled') return false;
      if (!pkg.scheduledFor) return false;

      try {
        const [datePart, timePart] = pkg.scheduledFor.split(' ');
        if (!datePart || !timePart) return false;
        const [year, month, day] = datePart.split('-').map(Number);
        const [hour, min] = timePart.split(':').map(Number);
        const scheduledTime = new Date(year, month - 1, day, hour, min, 0).getTime();

        // If scheduled time has arrived (or is within 1 minute past)
        return now >= scheduledTime;
      } catch {
        return false;
      }
    });

    for (const pkg of duePackages) {
      // 1. STRICT DEDUPLICATION CHECK: Check if this specific package was already uploaded
      const alreadyUploaded =
        (pkg.isUploaded && pkg.youtubeVideoId) ||
        this.uploadRegistryService?.isUploaded({
          packageId: pkg.id,
          filePath: pkg.videoPath,
          youtubeVideoId: pkg.youtubeVideoId,
        });

      if (alreadyUploaded) {
        this.emitLog(`[Otopilot] ℹ️ "${pkg.title}" zaten YouTube'a yüklenmiş. Mükerrer yayınlama engellendi.`);
        pkg.status = 'published';
        pkg.isUploaded = true;
        this.savePersistence();
        this.emitState();
        continue;
      }

      // 2. Check if YouTube auto-publish is enabled
      if (this.settings.autoPublishYouTube === false) {
        this.emitLog(`[Otopilot] Yayın saati geldi (${pkg.slotTime}), fakat YouTube otomatik yayınlama ayarı pasif.`);
        continue;
      }

      // 3. Check YouTube channel connection
      const isAuth = this.googleAuthService ? (await this.googleAuthService.getStatus()).isAuthenticated : false;
      if (!isAuth) {
        this.emitLog(`[Otopilot] ⚠️ Yayın saati geldi (${pkg.slotTime} - "${pkg.title}"), fakat YouTube hesabı bağlı değil! Lütfen Ayarlar > YouTube sekmesinden hesabınızı bağlayın.`);
        continue;
      }

      // 4. Execute upload
      try {
        await this.publishPackageToYouTube(pkg);
      } catch (err: any) {
        this.emitLog(`❌ [Otopilot:Yayın Hatası] "${pkg.title}" YouTube'a yüklenemedi: ${err.message}`);
      }
    }
  }

  /**
   * Prepares a clip for the upcoming slot if none exists, starting at least 10 minutes in advance
   */
  private async prepareUpcomingSlotIfNeeded(upcoming: ReturnType<typeof this.getNextUpcomingSlot>): Promise<void> {
    if (this.isBusy) return;

    // If upcoming slot already has a package ready, scheduled, or published, nothing to do
    if (upcoming.hasReadyPackage) {
      return;
    }

    // Default preparation buffer: minimum 10 minutes, default 15 minutes before slot
    const bufferMinutes = Math.max(10, this.settings.prepareMinutesBeforeSlot || 15);

    // If time remaining is within buffer window (e.g. <= 15 mins), start production immediately
    if (upcoming.minutesRemaining <= bufferMinutes) {
      this.emitLog(
        `⏰ [Otopilot:Zamanlayıcı] Sıradaki altın yayın saatine (${upcoming.slotTime} - ${upcoming.dayLabel}) ${upcoming.minutesRemaining} dakika kaldı! Otonom CC video keşfi ve ajans üretimi başlatılıyor...`
      );

      try {
        await this.runAutopilotCycle();
      } catch (err: any) {
        this.emitLog(`❌ [Otopilot] Otomatik klip üretimi hatası: ${err.message}`);
      }
    }
  }

  /**
   * Uploads a scheduled package directly to YouTube Shorts with thumbnail and tags
   */
  public async publishPackageToYouTube(pkg: ScheduledClipPackage, options?: { force?: boolean }): Promise<void> {
    if (!this.googleAuthService) {
      throw new Error('GoogleAuthService mevcut değil.');
    }

    if (!fs.existsSync(pkg.videoPath)) {
      throw new Error(`Video dosyası bulunamadı: ${pkg.videoPath}`);
    }

    // Prevent duplicate upload if already uploaded (unless user explicitly forced upload via "Şimdi Yayınla")
    if (!options?.force) {
      if (
        (pkg.isUploaded && pkg.youtubeVideoId) ||
        this.uploadRegistryService?.isUploaded({
          packageId: pkg.id,
          filePath: pkg.videoPath,
          youtubeVideoId: pkg.youtubeVideoId,
        })
      ) {
        this.emitLog(`[Otopilot] "${pkg.title}" daha önce yüklenmiş olduğu için mükerrer yükleme durduruldu.`);
        pkg.status = 'published';
        pkg.isUploaded = true;
        this.savePersistence();
        this.emitState();
        return;
      }
    }

    pkg.status = 'publishing';
    this.state.currentAction = `YouTube Shorts'a yükleniyor: "${pkg.title.slice(0, 25)}..."`;
    this.savePersistence();
    this.emitState();

    this.emitLog(`🚀 [Otopilot:Yayın] YouTube Shorts'a yükleme başlatıldı: "${pkg.title}"`);

    try {
      const uploadPayload = {
        filePath: pkg.videoPath,
        title: pkg.socialMetadata?.titles?.[0] || pkg.title,
        description: pkg.socialMetadata?.description || pkg.title,
        tags: pkg.socialMetadata?.hashtags || ['#Shorts', '#viral', '#ai'],
        privacyStatus: this.settings.youtubePrivacy || 'public',
        isShort: true,
        thumbnailPath: pkg.thumbnailPath && fs.existsSync(pkg.thumbnailPath) ? pkg.thumbnailPath : undefined,
      };

      const result = await this.googleAuthService.uploadVideo(uploadPayload, (percent) => {
        this.state.currentAction = `YouTube Yükleniyor: %${percent} - "${pkg.title.slice(0, 20)}..."`;
        this.emitState();
      });

      if (!result.success || !result.videoId) {
        throw new Error(result.error || 'YouTube yükleme yanıtı başarısız.');
      }

      pkg.status = 'published';
      pkg.isUploaded = true;
      pkg.youtubeVideoId = result.videoId;
      pkg.youtubeUrl = result.videoUrl;
      pkg.uploadedAt = new Date().toISOString();
      delete pkg.uploadError;

      // Register in upload tracker for permanent deduplication
      const uploadedRecord: UploadRecord = {
        id: `up_${Date.now()}`,
        title: pkg.title,
        youtubeVideoId: result.videoId,
        youtubeUrl: result.videoUrl || `https://youtube.com/shorts/${result.videoId}`,
        uploadedAt: pkg.uploadedAt,
        uploadMode: 'autopilot',
        clipId: pkg.clipId,
        packageId: pkg.id,
        filePath: pkg.videoPath,
        thumbnailPath: pkg.thumbnailPath,
        sourceVideoId: pkg.sourceVideo?.id,
        sourceVideoTitle: pkg.sourceVideo?.title,
        sourceVideoChannel: pkg.sourceVideo?.channel,
        sourceVideoUrl: pkg.sourceVideo?.url,
      };

      this.uploadRegistryService?.recordUpload(uploadedRecord);
      if (pkg.sourceVideo?.id) {
        this.processedVideoIds.add(pkg.sourceVideo.id);
      }

      this.savePersistence();
      this.emitState();
      this.emitLog(`🎉 [Otopilot:Yayın Başarılı] "${pkg.title}" YouTube Shorts'a yüklendi! 🔗 ${result.videoUrl}`);

      if (this.onClipUploaded) {
        this.onClipUploaded(uploadedRecord);
      }
    } catch (err: any) {
      pkg.status = 'failed';
      pkg.uploadError = err.message;
      this.savePersistence();
      this.emitState();
      throw err;
    }
  }

  /**
   * Manually trigger immediate upload of a ready package
   */
  public async publishPackageNow(packageId: string): Promise<boolean> {
    const pkg = this.state.packages.find((p) => p.id === packageId);
    if (!pkg) {
      throw new Error(`Paket bulunamadı: ${packageId}`);
    }
    // Force upload: even if pkg was previously tagged as published by bug, perform real YouTube upload!
    await this.publishPackageToYouTube(pkg, { force: true });
    return true;
  }

  /**
   * External upload notification (called when user uploads manually via Social Modal)
   */
  public registerExternalUpload(record: UploadRecord): void {
    if (record.sourceVideoId) {
      this.processedVideoIds.add(record.sourceVideoId);
    }

    // Match and update ONLY exact packageId or identical video file path (NEVER clipId!)
    for (const pkg of this.state.packages) {
      const match =
        (record.packageId && pkg.id === record.packageId) ||
        (record.filePath && pkg.videoPath && path.resolve(pkg.videoPath) === path.resolve(record.filePath));

      if (match) {
        pkg.status = 'published';
        pkg.isUploaded = true;
        pkg.youtubeVideoId = record.youtubeVideoId;
        pkg.youtubeUrl = record.youtubeUrl;
        pkg.uploadedAt = record.uploadedAt;
      }
    }

    this.savePersistence();
    this.emitState();
  }

  /**
   * Synchronize package states with live YouTube channel.
   * If a package is marked as published with a video ID that was deleted on YouTube,
   * reset the package back to 'ready' status so the user can re-upload or edit it!
   */
  public syncWithLiveChannel(liveVideoIds: Set<string>, deletedVideoIds?: string[]): void {
    if (!liveVideoIds || liveVideoIds.size === 0) return;

    let changed = false;
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    const seenVideoIds = new Set<string>();

    for (const pkg of this.state.packages) {
      if (pkg.isUploaded && pkg.youtubeVideoId) {
        const uploadedTime = pkg.uploadedAt ? new Date(pkg.uploadedAt).getTime() : 0;
        const isRecent = !isNaN(uploadedTime) && uploadedTime > tenMinutesAgo;

        const isDuplicate = seenVideoIds.has(pkg.youtubeVideoId);
        const isDeletedOnYouTube = !isRecent && !liveVideoIds.has(pkg.youtubeVideoId);
        const isExplicitlyDeleted = deletedVideoIds && deletedVideoIds.includes(pkg.youtubeVideoId);

        if (isDuplicate || isDeletedOnYouTube || isExplicitlyDeleted) {
          this.emitLog(`[Otopilot:Sync] "${pkg.title}" YouTube'dan silindiği veya mükerrer eşleştiği için hazır ('ready') durumuna geri alındı.`);
          pkg.status = 'ready';
          pkg.isUploaded = false;
          delete pkg.youtubeVideoId;
          delete pkg.youtubeUrl;
          delete pkg.uploadedAt;
          changed = true;
        } else {
          seenVideoIds.add(pkg.youtubeVideoId);
        }
      } else if (pkg.status === 'published' && !pkg.youtubeVideoId) {
        pkg.status = 'ready';
        pkg.isUploaded = false;
        changed = true;
      }
    }

    if (changed) {
      this.savePersistence();
      this.emitState();
    }
  }

  /**
   * Delete an archived package from queue & disk
   */
  public deletePackage(packageId: string): boolean {
    const pkg = this.state.packages.find((p) => p.id === packageId);
    if (!pkg) return false;

    // Remove package directory
    try {
      if (pkg.packageDir && fs.existsSync(pkg.packageDir)) {
        fs.rmSync(pkg.packageDir, { recursive: true, force: true });
      }
    } catch (e) {
      console.warn('[Autopilot] Could not remove package dir:', e);
    }

    this.state.packages = this.state.packages.filter((p) => p.id !== packageId);
    this.savePersistence();
    this.emitState();
    this.emitLog(`🗑️ Klip paketi arşivden silindi: ${pkg.title}`);
    return true;
  }
}
