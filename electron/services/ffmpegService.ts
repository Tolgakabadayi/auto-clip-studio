import { spawn, execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { SubtitleStyleConfig, VideoMetadata } from '../../src/types';

export interface FFmpegProgressCallback {
  (percent: number, message: string): void;
}

export class FFmpegService {
  private ffmpegPath: string;
  private ffprobePath: string;
  private activeChild: any = null;

  constructor(customFfmpegPath?: string) {
    this.ffmpegPath = customFfmpegPath || this.findFFmpeg();
    // Add ffmpeg bin directory to PATH so all child processes can find ffmpeg and ffprobe
    if (this.ffmpegPath && path.isAbsolute(this.ffmpegPath)) {
      const binDir = path.dirname(this.ffmpegPath);
      if (fs.existsSync(binDir) && !process.env.PATH?.includes(binDir)) {
        process.env.PATH = `${binDir};${process.env.PATH}`;
      }
    }
    this.ffprobePath = this.findFFprobe();
    console.log(`[FFmpegService] Initialized with ffmpeg: ${this.ffmpegPath}, ffprobe: ${this.ffprobePath}`);
  }

  public cancel(): void {
    if (this.activeChild) {
      try {
        console.log('[FFmpegService] Cancelling active FFmpeg process...');
        if (process.platform === 'win32' && this.activeChild.pid) {
          spawn('taskkill', ['/pid', this.activeChild.pid.toString(), '/f', '/t']);
        } else {
          this.activeChild.kill('SIGKILL');
        }
      } catch (err) {
        console.warn('[FFmpegService] Error cancelling process:', err);
      }
      this.activeChild = null;
    }
  }

  private findFFmpeg(): string {
    const userProfile = process.env.USERPROFILE || 'C:\\Users\\' + (process.env.USERNAME || '');
    
    // 1. Direct check in WinGet Packages (Gyan.FFmpeg)
    const wingetPkgDir = path.join(userProfile, 'AppData', 'Local', 'Microsoft', 'WinGet', 'Packages');
    if (fs.existsSync(wingetPkgDir)) {
      try {
        const dirs = fs.readdirSync(wingetPkgDir);
        for (const dir of dirs) {
          if (dir.toLowerCase().includes('ffmpeg')) {
            const fullDir = path.join(wingetPkgDir, dir);
            const search = (d: string): string | null => {
              const entries = fs.readdirSync(d, { withFileTypes: true });
              for (const entry of entries) {
                const full = path.join(d, entry.name);
                if (entry.isFile() && entry.name.toLowerCase() === 'ffmpeg.exe') {
                  return full;
                }
                if (entry.isDirectory()) {
                  const found = search(full);
                  if (found) return found;
                }
              }
              return null;
            };
            const foundExe = search(fullDir);
            if (foundExe) return foundExe;
          }
        }
      } catch (err) {
        // ignore
      }
    }

    // 2. Check common Windows installation paths
    const candidatePaths = [
      path.join(userProfile, 'AppData', 'Local', 'Microsoft', 'WinGet', 'Links', 'ffmpeg.exe'),
      'C:\\ffmpeg\\bin\\ffmpeg.exe',
      'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe',
    ];

    for (const p of candidatePaths) {
      if (fs.existsSync(p)) return p;
    }

    // 3. Try global command
    try {
      execSync('where ffmpeg', { stdio: 'ignore' });
      return 'ffmpeg';
    } catch (e) {
      // not in path
    }

    return 'ffmpeg';
  }

  private findFFprobe(): string {
    try {
      execSync('where ffprobe', { stdio: 'ignore' });
      return 'ffprobe';
    } catch (e) {
      // not in path
    }
    const ffmpegDir = path.dirname(this.ffmpegPath);
    const probeNextToFfmpeg = path.join(ffmpegDir, 'ffprobe.exe');
    if (fs.existsSync(probeNextToFfmpeg)) {
      return probeNextToFfmpeg;
    }
    return 'ffprobe';
  }

  public getBinaryPath(): string {
    return this.ffmpegPath;
  }

  public isAvailable(): boolean {
    if (this.ffmpegPath && path.isAbsolute(this.ffmpegPath) && fs.existsSync(this.ffmpegPath)) {
      return true;
    }
    try {
      execSync(`"${this.ffmpegPath}" -version`, { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Probes video metadata (duration, width, height, size)
   */
  public async probeVideo(videoPath: string): Promise<VideoMetadata> {
    const stats = fs.statSync(videoPath);
    const fileName = path.basename(videoPath);

    return new Promise((resolve, reject) => {
      const child = spawn(this.ffmpegPath, ['-i', videoPath], { windowsHide: true });
      let stderr = '';

      child.stderr.on('data', (d) => {
        stderr += d.toString();
      });

      child.on('close', () => {
        // Parse duration: Duration: 01:23:45.67
        const durationMatch = stderr.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
        let duration = 0;
        if (durationMatch) {
          const hours = parseInt(durationMatch[1], 10);
          const minutes = parseInt(durationMatch[2], 10);
          const seconds = parseFloat(durationMatch[3]);
          duration = hours * 3600 + minutes * 60 + seconds;
        }

        // Parse resolution: e.g. 1920x1080
        const resMatch = stderr.match(/Video:.*?,\s*(\d{3,5})x(\d{3,5})/);
        let width = 1920;
        let height = 1080;
        if (resMatch) {
          width = parseInt(resMatch[1], 10);
          height = parseInt(resMatch[2], 10);
        }

        resolve({
          path: videoPath,
          name: fileName,
          size: stats.size,
          duration: Math.round(duration),
          width,
          height,
          format: path.extname(videoPath).replace('.', '').toUpperCase(),
        });
      });

      child.on('error', (err) => {
        reject(new Error(`Failed to probe video: ${err.message}`));
      });
    });
  }

  /**
   * Extracts audio as 16kHz mono WAV for Whisper
   */
  public extractAudio(
    videoPath: string,
    outputWavPath: string,
    onProgress?: FFmpegProgressCallback
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const args = [
        '-y',
        '-i', videoPath,
        '-vn',
        '-acodec', 'pcm_s16le',
        '-ar', '16000',
        '-ac', '1',
        outputWavPath,
      ];

      console.log(`[FFmpegService] Extracting audio: ${this.ffmpegPath} ${args.join(' ')}`);
      const child = spawn(this.ffmpegPath, args, { windowsHide: true });
      this.activeChild = child;
      let stderr = '';

      child.stderr.on('data', (d) => {
        const text = d.toString();
        stderr += text;
        if (onProgress) {
          onProgress(50, 'Sesten transkript dalgaları ayıklanıyor...');
        }
      });

      child.on('close', (code) => {
        this.activeChild = null;
        if (code === 0 && fs.existsSync(outputWavPath)) {
          resolve(outputWavPath);
        } else {
          reject(new Error(`Audio extraction failed (code ${code}): ${stderr}`));
        }
      });

      child.on('error', (err) => {
        this.activeChild = null;
        reject(err);
      });
    });
  }

  /**
   * Extracts a single frame at a specific timestamp as JPEG.
   */
  public async extractFrame(videoPath: string, timestampSeconds: number, outputPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const outDir = path.dirname(outputPath);
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }

      const args = [
        '-y',
        '-ss', Math.max(0, timestampSeconds).toString(),
        '-i', videoPath,
        '-vframes', '1',
        '-q:v', '2',
        outputPath
      ];

      const child = spawn(this.ffmpegPath, args, { windowsHide: true });
      let stderr = '';
      child.stderr.on('data', (d) => { stderr += d.toString(); });
      child.on('close', (code) => {
        if (code === 0 && fs.existsSync(outputPath)) {
          resolve(outputPath);
        } else {
          reject(new Error(`Frame extraction failed (code ${code}): ${stderr.slice(-300)}`));
        }
      });
      child.on('error', (err) => reject(err));
    });
  }

  /**
   * Extracts a high-impact video frame with cinematic color grading (contrast & saturation boost)
   */
  public extractFrameWithColorGrade(
    videoPath: string,
    timestampSeconds: number,
    outputPath: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const args = [
        '-y',
        '-ss', Math.max(0, timestampSeconds).toString(),
        '-i', videoPath,
        '-vf', 'eq=contrast=1.18:saturation=1.28:brightness=0.02',
        '-vframes', '1',
        '-q:v', '2',
        outputPath
      ];

      const child = spawn(this.ffmpegPath, args, { windowsHide: true });
      let stderr = '';
      child.stderr.on('data', (d) => { stderr += d.toString(); });
      child.on('close', (code) => {
        if (code === 0 && fs.existsSync(outputPath)) {
          resolve(outputPath);
        } else {
          // Fallback to standard extraction if filter fails
          this.extractFrame(videoPath, timestampSeconds, outputPath)
            .then(resolve)
            .catch(reject);
        }
      });
      child.on('error', (err) => reject(err));
    });
  }

  /**
   * Escapes file path for FFmpeg subtitles/ass filter on Windows.
   * Colons and backslashes must be escaped: C\:/path/to/sub.ass
   */
  private escapeFilterPath(filePath: string): string {
    return filePath
      .replace(/\\/g, '/')
      .replace(/:/g, '\\:');
  }

  /**
   * Renders a vertical 9:16 clip with blurred background and burned-in ASS subtitles
   */
  public renderVerticalClip(options: {
    videoPath: string;
    startSeconds: number;
    durationSeconds: number;
    assSubtitlePath?: string;
    outputPath: string;
    aspectRatio?: '9:16' | '16:9' | '1:1';
    layoutMode?: 'blur_background' | 'crop_center' | 'smart_face_tracking';
    customVideoFilter?: string;
    audioVolume?: number; // 0 to 1.5
    musicPath?: string;
    musicVolume?: number; // 0 to 1
    enableSilenceRemoval?: boolean; // WyattBlue/auto-editor silence cutter
    onProgress?: FFmpegProgressCallback;
  }): Promise<string> {
    return new Promise((resolve, reject) => {
      const {
        videoPath,
        startSeconds,
        durationSeconds,
        assSubtitlePath,
        outputPath,
        aspectRatio = '9:16',
        layoutMode = 'blur_background',
        customVideoFilter,
        audioVolume = 1.0,
        musicPath,
        musicVolume = 0.3,
        enableSilenceRemoval = false,
        onProgress,
      } = options;

      // Ensure output directory exists
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });

      // Build complex video filter
      let filterComplex = '';

      if (aspectRatio === '16:9') {
        // Landscape 16:9 (1920x1080)
        filterComplex = '[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2[basev]';
      } else if (customVideoFilter) {
        filterComplex = customVideoFilter.startsWith('[0:v]')
          ? `${customVideoFilter}[basev]`
          : `[0:v]${customVideoFilter}[basev]`;
      } else if (layoutMode === 'crop_center' || layoutMode === 'smart_face_tracking') {
        // Scale to height 1920, crop width 1080 centered
        filterComplex = '[0:v]scale=-1:1920,crop=1080:1920[basev]';
      } else {
        // Blurred background + sharp centered overlay (TikTok / Reels standard)
        filterComplex =
          '[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=25:5[bg]; ' +
          '[0:v]scale=1080:1920:force_original_aspect_ratio=decrease[fg]; ' +
          '[bg][fg]overlay=(W-w)/2:(H-h)/2[basev]';
      }

      // Add subtitle filter if provided
      let finalVideoStream = '[basev]';
      let tempAssFile: string | null = null;

      if (assSubtitlePath && fs.existsSync(assSubtitlePath)) {
        try {
          // Copy to short ASCII path in os.tmpdir() to bypass Windows 260-char MAX_PATH limit in libass fopen
          tempAssFile = path.join(os.tmpdir(), `sub_${Date.now()}_${Math.floor(Math.random() * 100000)}.ass`);
          fs.copyFileSync(assSubtitlePath, tempAssFile);
          const escapedAss = this.escapeFilterPath(tempAssFile);
          filterComplex += `; [basev]ass='${escapedAss}'[finalv]`;
          finalVideoStream = '[finalv]';
        } catch (copyErr) {
          console.warn('[FFmpegService] Fallback to original ASS path:', copyErr);
          const escapedAss = this.escapeFilterPath(assSubtitlePath);
          filterComplex += `; [basev]ass='${escapedAss}'[finalv]`;
          finalVideoStream = '[finalv]';
        }
      }

      const hasMusic = musicPath && fs.existsSync(musicPath);
      let audioMapArgs: string[] = [];

      const silenceFilter = enableSilenceRemoval
        ? ',silenceremove=stop_periods=-1:stop_duration=0.35:stop_threshold=-35dB'
        : '';

      if (hasMusic) {
        // Mix original audio and music with optional silence trimming
        filterComplex += `; [0:a]volume=${Number(audioVolume.toFixed(2))}${silenceFilter}[maina]; [1:a]volume=${Number(musicVolume.toFixed(2))}[musica]; [maina][musica]amix=inputs=2:duration=first:dropout_transition=2[finala]`;
        audioMapArgs = ['-map', '[finala]'];
      } else if (audioVolume !== 1.0 || enableSilenceRemoval) {
        // Adjust original audio volume and apply silence trimming
        filterComplex += `; [0:a]volume=${Number(audioVolume.toFixed(2))}${silenceFilter}[finala]`;
        audioMapArgs = ['-map', '[finala]'];
      } else {
        // Default copy audio track
        audioMapArgs = ['-map', '0:a?'];
      }

      const args = [
        '-y',
        '-ss', String(startSeconds),
        '-t', String(durationSeconds),
        '-i', videoPath,
      ];

      if (hasMusic) {
        args.push('-i', musicPath!);
      }

      args.push(
        '-filter_complex', filterComplex,
        '-map', finalVideoStream,
        ...audioMapArgs,
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '20',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-movflags', '+faststart',
        outputPath
      );

      console.log(`[FFmpegService] Rendering clip: ${this.ffmpegPath} ${args.join(' ')}`);
      const child = spawn(this.ffmpegPath, args, { windowsHide: true });
      this.activeChild = child;
      let stderr = '';

      const cleanupTemp = () => {
        if (tempAssFile && fs.existsSync(tempAssFile)) {
          try {
            fs.unlinkSync(tempAssFile);
          } catch {}
        }
      };

      child.stderr.on('data', (d) => {
        const text = d.toString();
        stderr += text;

        // Parse time=HH:MM:SS.ms to calculate percentage
        const timeMatch = text.match(/time=(\d+):(\d+):(\d+\.\d+)/);
        if (timeMatch && onProgress && durationSeconds > 0) {
          const currentSec =
            parseInt(timeMatch[1], 10) * 3600 +
            parseInt(timeMatch[2], 10) * 60 +
            parseFloat(timeMatch[3]);
          const percent = Math.min(99, Math.round((currentSec / durationSeconds) * 100));
          onProgress(percent, `Klip işleniyor... %${percent}`);
        }
      });

      child.on('close', (code) => {
        this.activeChild = null;
        cleanupTemp();
        if (code === 0 && fs.existsSync(outputPath)) {
          if (onProgress) onProgress(100, 'Tamamlandı!');
          resolve(outputPath);
        } else {
          reject(new Error(`Clip rendering failed (code ${code}): ${stderr}`));
        }
      });

      child.on('error', (err) => {
        this.activeChild = null;
        cleanupTemp();
        reject(err);
      });
    });
  }
}
