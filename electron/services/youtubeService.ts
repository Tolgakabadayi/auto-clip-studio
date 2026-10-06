import { spawn, execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

export interface YouTubeProgressInfo {
  percent: number;
  downloadedSize?: string;
  totalSize?: string;
  speed?: string;
  eta?: string;
  rawText?: string;
}

export interface YouTubeProgressCallback {
  (percent: number, message: string, telemetry?: YouTubeProgressInfo): void;
}

export interface YouTubeDownloadOptions {
  url: string;
  outputDir?: string;
  ffmpegDir?: string;
  quality?: '1080p' | '720p' | '480p' | 'best';
  onProgress?: YouTubeProgressCallback;
  onLog?: (log: string) => void;
}

export class YouTubeService {
  private command: string;
  private baseArgs: string[];
  private activeChild: any = null;

  constructor() {
    const detected = this.detectYtDlp();
    this.command = detected.command;
    this.baseArgs = detected.baseArgs;
    console.log(`[YouTubeService] Using yt-dlp via: ${this.command} ${this.baseArgs.join(' ')}`);
  }

  public cancel(): void {
    if (this.activeChild) {
      try {
        console.log('[YouTubeService] Cancelling active yt-dlp process...');
        if (process.platform === 'win32' && this.activeChild.pid) {
          spawn('taskkill', ['/pid', this.activeChild.pid.toString(), '/f', '/t']);
        } else {
          this.activeChild.kill('SIGKILL');
        }
      } catch (err) {
        console.warn('[YouTubeService] Error cancelling process:', err);
      }
      this.activeChild = null;
    }
  }

  /**
   * Directly executes yt-dlp with arguments using detected executable
   */
  public async executeYtDlp(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const fullArgs = [...this.baseArgs, ...args];
      console.log(`[YouTubeService] Executing yt-dlp: ${this.command} ${fullArgs.join(' ')}`);
      const child = spawn(this.command, fullArgs, { windowsHide: true });
      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (d) => {
        stdout += d.toString();
      });

      child.stderr.on('data', (d) => {
        stderr += d.toString();
      });

      child.on('close', (code) => {
        if (code === 0 || stdout.trim().length > 0) {
          resolve(stdout);
        } else {
          reject(new Error(`yt-dlp failed (code ${code}): ${stderr || 'Bilinmeyen hata'}`));
        }
      });

      child.on('error', (err) => {
        reject(err);
      });
    });
  }

  /**
   * Validate if the given URL is a valid YouTube or YouTube Shorts URL
   */
  public static isValidYouTubeUrl(url: string): boolean {
    if (!url || typeof url !== 'string') return false;
    const trimmed = url.trim();
    // Handles watch?v=, shorts/, youtu.be/, live/, embed/
    const ytRegex = /^(https?:\/\/)?(www\.|m\.)?(youtube\.com\/(watch\?.*v=|shorts\/|live\/|embed\/)|youtu\.be\/)[a-zA-Z0-9_-]{6,}/i;
    return ytRegex.test(trimmed);
  }

  /**
   * Find available yt-dlp binary or fallback to python -m yt_dlp
   */
  private detectYtDlp(): { command: string; baseArgs: string[] } {
    // 1. Direct yt-dlp in PATH
    try {
      execSync('where yt-dlp', { stdio: 'ignore' });
      return { command: 'yt-dlp', baseArgs: [] };
    } catch {
      // not in PATH
    }

    // 2. Common Windows Python Scripts directories
    const userProfile = process.env.USERPROFILE || 'C:\\Users\\' + (process.env.USERNAME || '');
    const candidateDirs = [
      path.join(userProfile, 'AppData', 'Local', 'Packages'),
      path.join(userProfile, 'AppData', 'Local', 'Programs', 'Python'),
      path.join(userProfile, 'AppData', 'Roaming', 'Python'),
    ];

    for (const base of candidateDirs) {
      if (!fs.existsSync(base)) continue;
      try {
        const searchYtDlp = (dir: string, depth: number = 0): string | null => {
          if (depth > 5) return null;
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            const full = path.join(dir, entry.name);
            if (entry.isFile() && entry.name.toLowerCase() === 'yt-dlp.exe') {
              return full;
            }
            if (entry.isDirectory() && (entry.name.toLowerCase() === 'scripts' || depth < 3)) {
              const res = searchYtDlp(full, depth + 1);
              if (res) return res;
            }
          }
          return null;
        };
        const found = searchYtDlp(base);
        if (found) {
          return { command: found, baseArgs: [] };
        }
      } catch {
        // ignore read error
      }
    }

    // 3. Fallback to python module
    return { command: 'python', baseArgs: ['-m', 'yt_dlp'] };
  }

  /**
   * Fast probe to retrieve video title and info without downloading
   */
  public async probeVideo(url: string): Promise<{ title: string; duration?: number; license?: string; isCreativeCommons?: boolean; warning?: string }> {
    try {
      const full = await this.probeVideoFull(url);
      return {
        title: full.title,
        duration: full.duration,
        license: full.license,
        isCreativeCommons: full.isCreativeCommons,
        warning: full.copyrightWarning,
      };
    } catch {
      // Fallback to light probe if full probe fails
      return new Promise((resolve, reject) => {
        if (!YouTubeService.isValidYouTubeUrl(url)) {
          return reject(new Error('Geçersiz YouTube URL adresi.'));
        }

        const args = [
          ...this.baseArgs,
          '--force-ipv4',
          '--socket-timeout', '10',
          '--extractor-args', 'youtube:player_client=android,web;player_skip=webpage,configs',
          '--compat-options', 'no-youtube-channel-redirect',
          '--no-playlist',
          '--no-warnings',
          '--print', '%(title)s',
          '--print', '%(duration)s',
          url.trim(),
        ];

        const child = spawn(this.command, args, { windowsHide: true });
        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (d) => {
          stdout += d.toString();
        });

        child.stderr.on('data', (d) => {
          stderr += d.toString();
        });

        child.on('close', (code) => {
          if (code === 0 && stdout.trim()) {
            const lines = stdout.trim().split(/\r?\n/).filter(Boolean);
            const title = lines[0] || 'YouTube Video';
            const duration = lines[1] ? parseFloat(lines[1]) : 0;
            resolve({ title, duration });
          } else {
            reject(new Error(`YouTube video bilgisi alınamadı (kod ${code}): ${stderr || stdout}`));
          }
        });

        child.on('error', (err) => {
          reject(new Error(`yt-dlp çalıştırılamadı: ${err.message}`));
        });
      });
    }
  }

  /**
   * Deep metadata probe to verify license, commercial music, channel, and copyright status
   */
  public async probeVideoFull(url: string): Promise<{
    id: string;
    title: string;
    duration: number;
    license?: string;
    isCreativeCommons: boolean;
    channel?: string;
    uploader?: string;
    track?: string;
    artist?: string;
    album?: string;
    hasCommercialMusic: boolean;
    viewCount?: number;
    description?: string;
    thumbnailUrl?: string;
    copyrightWarning?: string;
  }> {
    return new Promise((resolve, reject) => {
      if (!YouTubeService.isValidYouTubeUrl(url)) {
        return reject(new Error('Geçersiz YouTube URL adresi.'));
      }

      const args = [
        ...this.baseArgs,
        '--force-ipv4',
        '--socket-timeout', '12',
        '--extractor-args', 'youtube:player_client=android,web;player_skip=webpage,configs',
        '--compat-options', 'no-youtube-channel-redirect',
        '--no-playlist',
        '--dump-json',
        '--skip-download',
        '--no-warnings',
        url.trim(),
      ];

      const child = spawn(this.command, args, { windowsHide: true });
      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (d) => {
        stdout += d.toString();
      });

      child.stderr.on('data', (d) => {
        stderr += d.toString();
      });

      child.on('close', (code) => {
        if (code === 0 && stdout.trim()) {
          try {
            const data = JSON.parse(stdout.trim());
            const license = data.license || '';
            const isCC = Boolean(
              license &&
              (license.toLowerCase().includes('creative commons') ||
               license.toLowerCase().includes('reuse allowed'))
            );
            const track = data.track || undefined;
            const artist = data.artist || undefined;
            const album = data.album || undefined;
            const hasCommercialMusic = Boolean(track || artist || album);

            let copyrightWarning: string | undefined;
            if (!isCC) {
              copyrightWarning = `Video Creative Commons lisanslı değildir (Lisans: ${license || 'Standart YouTube Lisansı'}). Bu video telif hakkı ihtarına veya gelir kaybına yol açabilir!`;
            } else if (hasCommercialMusic) {
              copyrightWarning = `Video CC lisanslı olsa da ticari müzik ("${track || artist}") içermektedir. Content ID ses hak talebine neden olabilir!`;
            }

            let thumb = '';
            if (Array.isArray(data.thumbnails) && data.thumbnails.length > 0) {
              thumb = data.thumbnails[data.thumbnails.length - 1]?.url || data.thumbnails[0]?.url || '';
            }

            resolve({
              id: data.id,
              title: data.title || 'YouTube Video',
              duration: data.duration || 0,
              license: license || undefined,
              isCreativeCommons: isCC,
              channel: data.uploader || data.channel,
              uploader: data.uploader,
              track,
              artist,
              album,
              hasCommercialMusic,
              viewCount: data.view_count || 0,
              description: data.description || '',
              thumbnailUrl: thumb,
              copyrightWarning,
            });
          } catch (e: any) {
            reject(new Error(`YouTube video meta verisi okunamadı: ${e.message}`));
          }
        } else {
          reject(new Error(`YouTube video bilgisi alınamadı (kod ${code}): ${stderr || stdout}`));
        }
      });

      child.on('error', (err) => {
        reject(new Error(`yt-dlp çalıştırılamadı: ${err.message}`));
      });
    });
  }

  /**
   * Downloads the YouTube video as high-quality merged MP4 with progress reporting
   */
  public async downloadVideo(options: YouTubeDownloadOptions): Promise<string> {
    return new Promise((resolve, reject) => {
      const { url, outputDir, ffmpegDir, onProgress, onLog } = options;

      if (!YouTubeService.isValidYouTubeUrl(url)) {
        return reject(new Error('Lütfen geçerli bir YouTube video linki girin.'));
      }

      // Determine downloads destination folder
      const targetDir = outputDir || path.join(os.homedir(), 'Downloads', 'AutoClips_Downloads');
      fs.mkdirSync(targetDir, { recursive: true });

      // Clean up any broken fragments from previous runs for this video to avoid HTTP 416
      const idMatch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/) || url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/) || url.match(/shorts\/([a-zA-Z0-9_-]+)/);
      const videoId = idMatch ? idMatch[1] : '';
      if (videoId && fs.existsSync(targetDir)) {
        try {
          const files = fs.readdirSync(targetDir);
          for (const f of files) {
            if (f.includes(videoId) && (f.endsWith('.part') || f.endsWith('.ytdl') || f.includes('.f') || f.endsWith('.temp'))) {
              try {
                fs.unlinkSync(path.join(targetDir, f));
                console.log(`[YouTubeService] Cleaned broken partial file: ${f}`);
              } catch {}
            }
          }
        } catch {}
      }

      // Output template: sanitized title + short ID
      const outputTemplate = path.join(targetDir, '%(title).100B [%(id)s].%(ext)s');

      // Determine quality format
      const quality = options.quality || '1080p';
      let formatArg = 'bv*[height<=1080][ext=mp4]+ba[ext=m4a]/b[height<=1080][ext=mp4]/bv*[height<=1080]+ba/b[height<=1080]/best';
      let formatSort = 'res:1080,ext:mp4:m4a';

      if (quality === '720p') {
        formatArg = 'bv*[height<=720][ext=mp4]+ba[ext=m4a]/b[height<=720][ext=mp4]/bv*[height<=720]+ba/b[height<=720]/best';
        formatSort = 'res:720,ext:mp4:m4a';
      } else if (quality === '480p') {
        formatArg = 'bv*[height<=480][ext=mp4]+ba[ext=m4a]/b[height<=480][ext=mp4]/bv*[height<=480]+ba/b[height<=480]/best';
        formatSort = 'res:480,ext:mp4:m4a';
      } else if (quality === 'best') {
        formatArg = 'bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/bv*+ba/best';
        formatSort = 'res,ext:mp4:m4a';
      }

      // High-speed yt-dlp arguments with accelerated network and fast format resolution
      const args = [
        ...this.baseArgs,
        '--force-ipv4', // Instant IPv4 connection (eliminates 15s Windows IPv6 timeout)
        '--socket-timeout', '15',
        '--extractor-args', 'youtube:player_client=android,web;player_skip=webpage,configs',
        '--no-check-certificates',
        '--compat-options', 'no-youtube-channel-redirect',
        '--no-playlist',
        '--newline',
        '--no-mtime',
        '--no-continue', // CRITICAL: Never send broken HTTP Range requests that trigger HTTP 416
        '--force-overwrites', // Overwrite corrupt partial files from earlier failed attempts
        '--no-part', // Write directly to target without Windows WinError 32 lock
        '--windows-filenames', // Sanitize characters for Windows filesystems
        '--concurrent-fragments', '1', // Single fragment download to prevent concurrent thread file lock race
        '--retries', '10',
        '--fragment-retries', '10',
        '--file-access-retries', '10',
        '--no-warnings',
        '--format-sort', formatSort,
        '-f', formatArg,
        '--merge-output-format', 'mp4',
        '-o', outputTemplate,
        '--print', 'after_move:filepath',
      ];

      if (ffmpegDir && fs.existsSync(ffmpegDir)) {
        args.push('--ffmpeg-location', ffmpegDir);
      }

      args.push(url.trim());

      console.log(`[YouTubeService] Downloading (${quality}): ${this.command} ${args.join(' ')}`);
      if (onLog) {
        onLog(`[YouTube] İndirme başlatılıyor (${quality.toUpperCase()}): ${url}`);
      }
      if (onProgress) {
        onProgress(10, `YouTube video akışı başlatılıyor (${quality.toUpperCase()})...`);
      }

      const child = spawn(this.command, args, { windowsHide: true });
      this.activeChild = child;
      let downloadedFilePath = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        const text = data.toString();
        const lines = text.split(/\r?\n/).filter(Boolean);

        for (const line of lines) {
          // Check for final filepath output from --print after_move:filepath
          const trimmedLine = line.trim();
          if (trimmedLine.endsWith('.mp4') && fs.existsSync(trimmedLine)) {
            downloadedFilePath = trimmedLine;
          }

          // Check for fallback destination or merger logs
          const mergerMatch = trimmedLine.match(/\[Merger\] Merging formats into "([^"]+)"/i);
          if (mergerMatch && mergerMatch[1]) {
            downloadedFilePath = mergerMatch[1];
            if (onProgress) onProgress(98, 'Ses ve video birleştiriliyor (MP4)...');
            if (onLog) onLog(`[YouTube] Ses ve video MP4 olarak birleştiriliyor...`);
            continue;
          }

          const destMatch = trimmedLine.match(/\[download\] Destination:\s*(.+)$/i);
          if (destMatch && destMatch[1] && destMatch[1].endsWith('.mp4')) {
            downloadedFilePath = destMatch[1].trim();
          }

          // Parse download progress: [download]  45.2% of  120.50MiB at  12.50MiB/s ETA 00:05
          const percentMatch = trimmedLine.match(/\[download\]\s*([\d\.]+)\s*%/i);
          if (percentMatch) {
            const pct = parseFloat(percentMatch[1]);
            const speedMatch = trimmedLine.match(/at\s+([^\s]+)/i);
            const etaMatch = trimmedLine.match(/ETA\s+([^\s]+)/i);
            const sizeMatch = trimmedLine.match(/of\s+(?:~)?([^\s]+)/i);

            const speedStr = speedMatch ? speedMatch[1] : undefined;
            const etaStr = etaMatch ? etaMatch[1] : undefined;
            const totalSizeStr = sizeMatch ? sizeMatch[1].replace('~', '') : undefined;

            let downloadedSizeStr: string | undefined = undefined;
            if (totalSizeStr) {
              const numMatch = totalSizeStr.match(/([\d\.]+)\s*([a-zA-Z]+)/);
              if (numMatch) {
                const totalNum = parseFloat(numMatch[1]);
                const unit = numMatch[2];
                const dlNum = (totalNum * pct) / 100;
                downloadedSizeStr = `${dlNum.toFixed(1)}${unit}`;
              }
            }

            const telemetry: YouTubeProgressInfo = {
              percent: pct,
              downloadedSize: downloadedSizeStr,
              totalSize: totalSizeStr,
              speed: speedStr,
              eta: etaStr,
              rawText: trimmedLine,
            };

            let msg = `YouTube indiriliyor: %${pct.toFixed(0)}`;
            const details: string[] = [];
            if (downloadedSizeStr && totalSizeStr) details.push(`${downloadedSizeStr} / ${totalSizeStr}`);
            else if (totalSizeStr) details.push(totalSizeStr);
            if (speedStr) details.push(speedStr);
            if (etaStr) details.push(`Kalan: ${etaStr}`);

            if (details.length > 0) {
              msg += ` (${details.join(' • ')})`;
            }

            if (onProgress) {
              // Map download percent to 5 - 95%
              const mappedPercent = Math.min(95, Math.max(5, Math.round(pct * 0.95)));
              onProgress(mappedPercent, msg, telemetry);
            }

            // Periodically log to terminal (every ~20% or if fast)
            if (onLog && Math.round(pct) % 20 === 0) {
              onLog(`[YouTube] İlerleme: %${pct.toFixed(0)} ${details.length > 0 ? `(${details.join(' • ')})` : ''}`);
            }
          }
        }
      });

      child.stderr.on('data', (d) => {
        const text = d.toString();
        stderr += text;
        // Sometimes yt-dlp outputs warnings on stderr that are harmless
        if (text.includes('ERROR:') && onLog) {
          onLog(`[YouTube Hata]: ${text.trim()}`);
        }
      });

      child.on('close', (code) => {
        this.activeChild = null;
        if (code === 0) {
          // If downloadedFilePath is found and exists
          if (downloadedFilePath && fs.existsSync(downloadedFilePath)) {
            if (onProgress) onProgress(100, 'YouTube videosu başarıyla indirildi!');
            if (onLog) onLog(`✓ YouTube videosu indirildi: ${path.basename(downloadedFilePath)}`);
            resolve(downloadedFilePath);
            return;
          }

          // Fallback: search directory for latest created .mp4
          try {
            const files = fs.readdirSync(targetDir)
              .filter(f => f.endsWith('.mp4'))
              .map(f => ({ name: f, time: fs.statSync(path.join(targetDir, f)).mtimeMs }))
              .sort((a, b) => b.time - a.time);

            if (files.length > 0) {
              const latestFile = path.join(targetDir, files[0].name);
              if (onProgress) onProgress(100, 'YouTube videosu başarıyla indirildi!');
              if (onLog) onLog(`✓ YouTube videosu indirildi: ${files[0].name}`);
              resolve(latestFile);
              return;
            }
          } catch (e) {
            // ignore
          }

          reject(new Error('İndirme tamamlandı fakat oluşturulan video dosyası bulunamadı.'));
        } else {
          reject(new Error(`YouTube indirme işlemi başarısız oldu (çıkış kodu ${code}): ${stderr || 'Bilinmeyen hata'}`));
        }
      });

      child.on('error', (err) => {
        reject(new Error(`yt-dlp yürütülürken hata: ${err.message}`));
      });
    });
  }
}
