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
  private storageDir: string;
  private configFilePath: string;
  private archiveFilePath: string;
  private schedulerTimer: NodeJS.Timeout | null = null;
  private isBusy = false;

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

    // Default settings
    this.settings = {
      enabled: false,
      selectedNiche: 'Yapay Zeka & Teknoloji',
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
      }
    } catch (e) {
      console.warn('[AutopilotService] Archive load warning:', e);
    }

    // STRICT RE-SYNC: Pull all uploaded IDs from UploadRegistry to permanently prevent duplicate uploads
    if (this.uploadRegistryService) {
      const uploadedSourceIds = this.uploadRegistryService.getAllSourceVideoIds();
      for (const id of uploadedSourceIds) {
        this.processedVideoIds.add(id);
      }

      // Re-tag any existing packages if already uploaded manually or in previous runs
      for (const pkg of this.state.packages) {
        const record = this.uploadRegistryService.getRecord({
          packageId: pkg.id,
          filePath: pkg.videoPath,
          sourceVideoId: pkg.sourceVideo?.id,
          title: pkg.title,
        });
        if (record) {
          pkg.status = 'published';
          pkg.isUploaded = true;
          pkg.youtubeVideoId = record.youtubeVideoId;
          pkg.youtubeUrl = record.youtubeUrl;
          pkg.uploadedAt = record.uploadedAt;
        }
      }
    }
    this.updateStats();
  }

  /**
   * Save config, queue, and processed IDs to disk
   */
  private savePersistence(): void {
    try {
      fs.writeFileSync(this.configFilePath, JSON.stringify(this.settings, null, 2), 'utf-8');
      const archiveData = {
        packages: this.state.packages,
        processedIds: Array.from(this.processedVideoIds),
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
  public async searchCreativeCommons(
    niche: string = this.settings.selectedNiche,
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
      customKeyword ? `${customKeyword} viral podcast` : '',
      `${niche} podcast`,
      `${niche} röportaj`,
      'yapay zeka podcast',
      'teknoloji sohbet podcast',
    ].filter(Boolean);

    for (const term of searchTerms) {
      try {
        // Strategy 1: YouTube Search with Sort by View Count (sp=CAMSAhAB) + Creative Commons
        const viralCCSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(term + ' creative commons')}&sp=CAMSAhAB`;
        const args1 = [
          viralCCSearchUrl,
          '--flat-playlist',
          '--dump-json',
          '-I', `1:${limit + 15}`,
          '--no-warnings',
        ];

        const rawOutput1 = await this.youtubeService.executeYtDlp(args1);
        const results1 = this.parseCCSearchResults(rawOutput1, limit);
        if (results1.length > 0) {
          this.state.candidates = results1;
          this.emitState();
          return results1;
        }

        // Strategy 2: Official YouTube CC Filter URL (&sp=EgQQARgB)
        const ccSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(term)}&sp=EgQQARgB`;
        const args2 = [
          ccSearchUrl,
          '--flat-playlist',
          '--dump-json',
          '-I', `1:${limit + 10}`,
          '--no-warnings',
        ];

        const rawOutput2 = await this.youtubeService.executeYtDlp(args2);
        const results2 = this.parseCCSearchResults(rawOutput2, limit);
        if (results2.length > 0) {
          this.state.candidates = results2;
          this.emitState();
          return results2;
        }

        // Strategy 3: Direct ytsearch query with view count priority
        const directQuery = `ytsearch${limit + 10}:${term} creative commons`;
        const directArgs = [
          directQuery,
          '--flat-playlist',
          '--dump-json',
          '--no-warnings',
        ];
        const directOutput = await this.youtubeService.executeYtDlp(directArgs);
        const directResults = this.parseCCSearchResults(directOutput, limit);
        if (directResults.length > 0) {
          this.state.candidates = directResults;
          this.emitState();
          return directResults;
        }
      } catch (err) {
        console.warn(`[Autopilot:Search] Search attempt for "${term}" warned:`, err);
      }
    }

    // Strategy 4: Reliable emergency fallback search
    try {
      const fallbackQuery = `ytsearch12:podcast sohbet creative commons`;
      const fallbackRaw = await this.youtubeService.executeYtDlp([
        fallbackQuery,
        '--flat-playlist',
        '--dump-json',
        '--no-warnings',
      ]);
      const fallbackResults = this.parseCCSearchResults(fallbackRaw, limit);
      this.state.candidates = fallbackResults;
      this.emitState();
      return fallbackResults;
    } catch (finalErr) {
      console.error('[Autopilot:Search] All CC search attempts failed:', finalErr);
      return [];
    }
  }

  private parseCCSearchResults(rawOutput: string, limit: number): CCVideoCandidate[] {
    const candidates: CCVideoCandidate[] = [];
    const lines = rawOutput.split(/\r?\n/).filter(Boolean);

    for (const line of lines) {
      try {
        const item = JSON.parse(line.trim());
        if (!item.id || !item.title) continue;

        // STRICT DEDUPLICATION: Exclude any video previously processed or uploaded (manually or auto)
        if (
          this.processedVideoIds.has(item.id) ||
          this.uploadRegistryService?.isUploaded({ sourceVideoId: item.id })
        ) {
          continue;
        }

        const duration = Number(item.duration) || 0;
        // Only skip extremely short clips (< 25s) or monstrously long live archives (> 3 hours)
        if (duration > 0 && (duration < 25 || duration > 10800)) {
          continue;
        }

        const channelName = (item.uploader || item.channel || '').toLowerCase();
        const descText = (item.description || '').toLowerCase();

        // 🛡️ COPYRIGHT & MONETIZATION SHIELD: Filter out risky networks & Content ID claims
        const riskyNetworks = ['vevo', 'topic', 'netflix', 'disney', 'bbc', 'trt', 'acun', 'exxen', 'paramount', 'warner bros'];
        if (riskyNetworks.some((r) => channelName.includes(r))) {
          continue;
        }

        if (
          descText.includes('provided to youtube by') ||
          descText.includes('music in this video') ||
          descText.includes('sound recording administered by') ||
          descText.includes('universal music group') ||
          descText.includes('sony music')
        ) {
          continue;
        }

        // Format duration mm:ss or hh:mm:ss
        const mins = Math.floor(duration / 60);
        const secs = Math.floor(duration % 60);
        const hours = Math.floor(mins / 60);
        const remMins = mins % 60;
        const durationFormatted =
          duration > 0
            ? hours > 0
              ? `${hours}:${remMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
              : `${mins}:${secs.toString().padStart(2, '0')}`
            : 'Belirsiz';

        let thumb = '';
        if (Array.isArray(item.thumbnails) && item.thumbnails.length > 0) {
          thumb = item.thumbnails[item.thumbnails.length - 1].url || item.thumbnails[0].url || '';
        }

        candidates.push({
          id: item.id,
          url: item.url || `https://www.youtube.com/watch?v=${item.id}`,
          title: item.title,
          duration,
          durationFormatted,
          channel: item.uploader || item.channel || 'Bilinmeyen Kanal',
          viewCount: Number(item.view_count) || 0,
          thumbnailUrl: thumb,
          license: 'Creative Commons Attribution (CC-BY)',
          verifiedCC: true,
          discoveredAt: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        });
      } catch (e) {
        // ignore parse error
      }
    }

    // STRICT VIRALITY SORT: Always order candidates by view count descending
    candidates.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));

    // Prioritize videos with significant view counts if available
    const highView = candidates.filter((c) => (c.viewCount || 0) >= 1000);
    if (highView.length >= limit) {
      return highView.slice(0, limit);
    }

    return candidates.slice(0, limit);
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
    const slots =
      this.settings.postingSlots && this.settings.postingSlots.length > 0
        ? [...this.settings.postingSlots].sort()
        : ['12:30', '18:30', '21:15'];

    const now = new Date();
    // Search up to 14 days ahead for the next free slot
    for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
      const targetDate = new Date(now.getTime() + dayOffset * 24 * 60 * 60 * 1000);
      const year = targetDate.getFullYear();
      const month = (targetDate.getMonth() + 1).toString().padStart(2, '0');
      const day = targetDate.getDate().toString().padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      for (const slot of slots) {
        const [slotHours, slotMins] = slot.split(':').map((s) => parseInt(s, 10));
        const slotDateTime = new Date(year, targetDate.getMonth(), targetDate.getDate(), slotHours, slotMins, 0);

        // If today, slot must be at least 10 minutes in the future
        if (dayOffset === 0 && slotDateTime.getTime() <= now.getTime() + 10 * 60 * 1000) {
          continue;
        }

        const scheduledFor = `${dateStr} ${slot}`;
        // Check if any existing package already occupies this slot
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

    // Default fallback
    return {
      slotTime: slots[0],
      scheduledFor: `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')} ${slots[0]}`,
      dayLabel: `Bugün ${slots[0]}`,
      timestamp: now.getTime() + 2 * 60 * 60 * 1000,
    };
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

        targetVideo = searchCandidates?.find(
          (c) =>
            !this.processedVideoIds.has(c.id) &&
            !this.uploadRegistryService?.isUploaded({ sourceVideoId: c.id, title: c.title })
        ) || null;

        if (!targetVideo) {
          this.emitLog('[Otopilot:Avcı] Daha önce işlenmemiş taze videolar için genişletilmiş arama yapılıyor...');
          const deepCandidates = await this.searchCreativeCommons('Teknoloji Bilim Podcast Röportaj', '', 12);
          targetVideo = deepCandidates?.find(
            (c) =>
              !this.processedVideoIds.has(c.id) &&
              !this.uploadRegistryService?.isUploaded({ sourceVideoId: c.id, title: c.title })
          ) || null;
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

      let availableCandidates = candidates.filter((c) => !this.processedVideoIds.has(c.id));
      if (availableCandidates.length < targetCount) {
        const fallbackCandidates = await this.searchCreativeCommons('Podcast Röportaj Sohbet', '', targetCount + 15);
        for (const fc of fallbackCandidates) {
          if (!this.processedVideoIds.has(fc.id) && !availableCandidates.some((ac) => ac.id === fc.id)) {
            availableCandidates.push(fc);
          }
        }
      }

      for (let i = 0; i < targetCount; i++) {
        let candidate = availableCandidates[i];
        if (!candidate) {
          // Additional fallback if still missing candidates
          candidate = candidates[i % candidates.length];
        }

        if (!candidate) continue;

        this.emitLog(`\n🎬 PARTİ GÖREVİ [${i + 1}/${targetCount}]: "${candidate.title}"`);
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

    // STEP 5: MULTI-AGENT AGENCY PIPELINE (Scout -> CEO -> Vision -> Copy -> QA)
    this.state.activeAgent = 'ceo';
    this.updateProgress(5, 'Ajans Analizi', 62, 'Yapay Zeka Ajansı viral kesitleri ve kancaları üretiyor...', batchCurrent, batchTotal);

    const producedClips = await this.agencyService.runAgencyPipeline(transcript, {
      clipCount: this.settings.clipsPerVideo || 1,
      minClipDuration: 30,
      maxClipDuration: 60,
      videoPath: rawVideoPath,
      outputDirectory: this.settings.archiveDirectory,
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

    const nextSlot = this.calculateNextSlot();
    const schedulePlan = await this.agencyService.planScheduleSlot(bestClip, this.settings.postingSlots, {
      onMessage: this.onAgencyMessage,
      onLog: this.onLog,
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

    // STEP 8: BUILD SOCIAL METADATA & BUNDLE PACKAGE
    const socialMeta = bestClip.socialMetadata || {
      titles: [bestClip.title, `🔥 ${bestClip.title}`, `Bunu Biliyor Muydunuz? | ${bestClip.title}`],
      description: `${bestClip.hook_sentence}\n\nİzlediğiniz için teşekkürler! Devamı için takip etmeyi unutmayın.`,
      hashtags: ['#kesfet', '#viral', '#podcast', '#shorts', '#reels'],
      callToAction: 'Düşüncelerinizi yorumlarda paylaşın! 👇',
    };

    const socialTextContent = `======================================================================
🎬 AUTOCLIP AI YAYIN ARŞİVİ - YAYINA HAZIR PAKET
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

⚖️ TELİF VE ATIF BİLGİSİ (CREATIVE COMMONS CC-BY):
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

    // Add to state queue
    this.state.packages.unshift(readyPackage);
    this.state.lastRunAt = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    this.updateProgress(6, 'Yayın & Render', 100, `Tamamlandı! Yeni klip arşive eklendi (${nextSlot.dayLabel})`, batchCurrent, batchTotal);
    this.savePersistence();
    this.emitState();

    this.emitLog(`🎉 [Otopilot] Başarıyla paketlendi ve arşivlendi: "${bestClip.title}" -> ${nextSlot.dayLabel}`);

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
      // 1. STRICT DEDUPLICATION CHECK: Check if this video was already uploaded
      const alreadyUploaded = this.uploadRegistryService?.isUploaded({
        packageId: pkg.id,
        filePath: pkg.videoPath,
        clipId: pkg.clipId,
        sourceVideoId: pkg.sourceVideo?.id,
        title: pkg.title,
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
  public async publishPackageToYouTube(pkg: ScheduledClipPackage): Promise<void> {
    if (!this.googleAuthService) {
      throw new Error('GoogleAuthService mevcut değil.');
    }

    if (!fs.existsSync(pkg.videoPath)) {
      throw new Error(`Video dosyası bulunamadı: ${pkg.videoPath}`);
    }

    // Prevent duplicate upload if already uploaded
    if (
      this.uploadRegistryService?.isUploaded({
        packageId: pkg.id,
        filePath: pkg.videoPath,
        clipId: pkg.clipId,
        sourceVideoId: pkg.sourceVideo?.id,
      })
    ) {
      this.emitLog(`[Otopilot] "${pkg.title}" daha önce yüklenmiş olduğu için mükerrer yükleme durduruldu.`);
      pkg.status = 'published';
      pkg.isUploaded = true;
      this.savePersistence();
      this.emitState();
      return;
    }

    pkg.status = 'publishing';
    this.state.currentAction = `YouTube Shorts'a yükleniyor: "${pkg.title.slice(0, 25)}..."`;
    this.savePersistence();
    this.emitState();

    this.emitLog(`🚀 [Otopilot:Yayın] Altın yayın saati geldi (${pkg.slotTime})! YouTube Shorts'a yükleniyor: "${pkg.title}"`);

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
    await this.publishPackageToYouTube(pkg);
    return true;
  }

  /**
   * External upload notification (called when user uploads manually via Social Modal)
   */
  public registerExternalUpload(record: UploadRecord): void {
    if (record.sourceVideoId) {
      this.processedVideoIds.add(record.sourceVideoId);
    }

    // Match and update any corresponding package
    for (const pkg of this.state.packages) {
      const match =
        (record.packageId && pkg.id === record.packageId) ||
        (record.filePath && path.resolve(pkg.videoPath) === path.resolve(record.filePath)) ||
        (record.clipId !== undefined && pkg.clipId === record.clipId) ||
        (record.title && pkg.title.trim().toLowerCase() === record.title.trim().toLowerCase());

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
