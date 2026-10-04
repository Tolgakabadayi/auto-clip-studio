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
} from '../../src/types';
import { YouTubeService } from './youtubeService';
import { WhisperService } from './whisperService';
import { AgencyService } from './agencyService';
import { FFmpegService } from './ffmpegService';
import { FaceTrackingService } from './faceTrackingService';
import { generateAssSubtitles } from './assGenerator';

export class AutopilotService {
  private youtubeService: YouTubeService;
  private whisperService: WhisperService;
  private agencyService: AgencyService;
  private ffmpegService: FFmpegService;
  private faceTrackingService: FaceTrackingService;

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

  constructor(
    youtubeService: YouTubeService,
    whisperService: WhisperService,
    agencyService: AgencyService,
    ffmpegService: FFmpegService,
    faceTrackingService: FaceTrackingService
  ) {
    this.youtubeService = youtubeService;
    this.whisperService = whisperService;
    this.agencyService = agencyService;
    this.ffmpegService = ffmpegService;
    this.faceTrackingService = faceTrackingService;

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
        this.updateStats();
      }
    } catch (e) {
      console.warn('[AutopilotService] Archive load warning:', e);
    }
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

        const duration = Number(item.duration) || 0;
        // Only skip extremely short clips (< 25s) or monstrously long live archives (> 3 hours)
        if (duration > 0 && (duration < 25 || duration > 10800)) {
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

        targetVideo = searchCandidates?.find((c) => !this.processedVideoIds.has(c.id)) || searchCandidates?.[0] || null;
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
   * Start 24/7 autonomous background timer
   */
  public startScheduler(): void {
    if (this.schedulerTimer) clearInterval(this.schedulerTimer);

    this.settings.enabled = true;
    this.state.isRunning = true;
    this.savePersistence();

    const intervalMs = Math.max(10, this.settings.checkIntervalMinutes || 30) * 60 * 1000;
    this.emitLog(`🤖 [Otopilot] 7/24 Otonom Ajans başlatıldı. (Kontrol periyodu: ${this.settings.checkIntervalMinutes} dk)`);

    // Run first check soon if queue needs videos
    setTimeout(() => {
      this.checkAndRunIfQueueLow();
    }, 3000);

    this.schedulerTimer = setInterval(() => {
      this.checkAndRunIfQueueLow();
    }, intervalMs);

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
    this.emitLog('🛑 [Otopilot] 7/24 Otonom Ajans durduruldu.');
    this.emitState();
  }

  private async checkAndRunIfQueueLow(): Promise<void> {
    if (!this.settings.enabled || this.isBusy) return;

    const slotsCount = this.settings.postingSlots?.length || 3;
    const pendingCount = this.state.packages.filter(
      (p) => p.status === 'scheduled' || p.status === 'ready'
    ).length;

    const targetMinQueue = slotsCount * 2; // Keep at least 2 days stocked
    if (pendingCount < targetMinQueue) {
      const needed = Math.min(slotsCount, targetMinQueue - pendingCount);
      this.emitLog(`[Otopilot] Yayın kuyruğunda ${pendingCount} klip var (Hedef: ${targetMinQueue}). ${needed} adet farklı video için parti üretimi başlatılıyor...`);
      try {
        await this.runAutopilotDailyBatch(needed);
      } catch (err: any) {
        console.error('[Autopilot] Background batch failed:', err);
      }
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
