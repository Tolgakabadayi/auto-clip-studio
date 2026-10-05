process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

import { app, BrowserWindow, ipcMain, dialog, shell, protocol, net, screen } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
import http from 'http';
import { pathToFileURL, fileURLToPath } from 'url';
import { FFmpegService } from './services/ffmpegService';
import { WhisperService } from './services/whisperService';
import { LLMService } from './services/llmService';
import { generateAssSubtitles } from './services/assGenerator';
import { YouTubeService } from './services/youtubeService';
import { FaceTrackingService } from './services/faceTrackingService';
import { AgencyService } from './services/agencyService';
import { AutopilotService } from './services/autopilotService';
import { CopilotService } from './services/copilotService';
import { GoogleAuthService, YouTubeUploadPayload } from './services/googleAuthService';
import { UploadRegistryService } from './services/uploadRegistryService';
import {
  PipelineOptions,
  ViralClip,
  SystemHealth,
  TranscriptResult,
  AgencyMessage,
  AgencyProgressEvent,
  AgencyAgentConfig,
} from '../src/types';

// ESM __dirname polyfill
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Local HTTP Media Server for smooth HTML5 video streaming with full Range & CORS support
let localStreamPort = 39821;

function startLocalStreamServer() {
  const server = http.createServer((req, res) => {
    try {
      // Set global CORS headers
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Range, Content-Type, Accept',
        'Access-Control-Max-Age': '86400',
      };

      if (req.method === 'OPTIONS') {
        res.writeHead(204, corsHeaders);
        res.end();
        return;
      }

      const parsedUrl = new URL(req.url || '', `http://127.0.0.1:${localStreamPort}`);
      const rawPath = parsedUrl.searchParams.get('path');
      if (!rawPath) {
        res.writeHead(400, { 'Content-Type': 'text/plain', ...corsHeaders });
        res.end('Missing path');
        return;
      }

      const filePath = path.resolve(rawPath);
      if (!fs.existsSync(filePath)) {
        res.writeHead(404, { 'Content-Type': 'text/plain', ...corsHeaders });
        res.end('File not found: ' + filePath);
        return;
      }

      const stat = fs.statSync(filePath);
      const fileSize = stat.size;

      const ext = path.extname(filePath).toLowerCase();
      let contentType = 'video/mp4';
      if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
      else if (ext === '.png') contentType = 'image/png';
      else if (ext === '.webp') contentType = 'image/webp';
      else if (ext === '.wav') contentType = 'audio/wav';
      else if (ext === '.mp3') contentType = 'audio/mpeg';
      else if (ext === '.json') contentType = 'application/json';
      else if (ext === '.txt') contentType = 'text/plain';

      // Handle HEAD request (required for HTML5 media probing without sending body)
      if (req.method === 'HEAD') {
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': contentType,
          'Accept-Ranges': 'bytes',
          ...corsHeaders,
        });
        res.end();
        return;
      }

      const range = req.headers.range;

      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = end - start + 1;
        const file = fs.createReadStream(filePath, { start, end });
        const head = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': contentType,
          ...corsHeaders,
        };
        res.writeHead(206, head);
        file.pipe(res);
      } else {
        const head = {
          'Content-Length': fileSize,
          'Content-Type': contentType,
          'Accept-Ranges': 'bytes',
          ...corsHeaders,
        };
        res.writeHead(200, head);
        fs.createReadStream(filePath).pipe(res);
      }
    } catch (err: any) {
      console.error('[StreamServer] Error:', err);
      res.writeHead(500, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
      res.end('Server error: ' + err.message);
    }
  });

  server.listen(localStreamPort, '127.0.0.1', () => {
    console.log(`[StreamServer] Local video server streaming on http://127.0.0.1:${localStreamPort}`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as any;
        localStreamPort = addr.port;
        console.log(`[StreamServer] Dynamic streaming on http://127.0.0.1:${localStreamPort}`);
      });
    }
  });
}

// Allow media autoplay in Electron without user gesture constraint
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

// Start HTTP stream server
startLocalStreamServer();

// Register local-media protocol as privileged so HTML5 <video> can stream content
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'local-media',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      bypassCSP: true,
    },
  },
]);

let mainWindow: BrowserWindow | null = null;
let dockWindow: BrowserWindow | null = null;
let warRoomWindow: BrowserWindow | null = null;

function broadcastToWindows(channel: string, data: any) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
  if (dockWindow && !dockWindow.isDestroyed()) {
    dockWindow.webContents.send(channel, data);
  }
  if (warRoomWindow && !warRoomWindow.isDestroyed()) {
    warRoomWindow.webContents.send(channel, data);
  }
}

const ffmpegService = new FFmpegService();
const whisperService = new WhisperService();
const llmService = new LLMService();
const youtubeService = new YouTubeService();
const faceTrackingService = new FaceTrackingService();
const uploadRegistryService = new UploadRegistryService();
const agencyService = new AgencyService(ffmpegService, youtubeService, uploadRegistryService);
const googleAuthService = new GoogleAuthService();
const autopilotService = new AutopilotService(
  youtubeService,
  whisperService,
  agencyService,
  ffmpegService,
  faceTrackingService,
  googleAuthService,
  uploadRegistryService
);

autopilotService.onStateChange = (state) => {
  broadcastToWindows('autopilot:state', state);
};
autopilotService.onAgencyMessage = (msg) => {
  broadcastToWindows('agency:message', msg);
};
autopilotService.onProgress = (prog) => {
  broadcastToWindows('agency:progress', prog);
};
autopilotService.onLog = (log) => {
  broadcastToWindows('pipeline:log', log);
};
autopilotService.onClipUploaded = (record) => {
  broadcastToWindows('clip:uploaded', record);
};

const copilotService = new CopilotService(
  autopilotService,
  youtubeService,
  agencyService,
  llmService
);

copilotService.onSpeech = (speech) => {
  broadcastToWindows('copilot:speech', speech);
};
copilotService.onMessage = (msg) => {
  broadcastToWindows('copilot:message', msg);
};
copilotService.onOpenModal = (modal) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send('copilot:open-modal', modal);
  }
};

// State cache strictly isolated per video path
let activeTranscript: TranscriptResult | null = null;
let activeTranscriptVideoPath: string | null = null;
let activeVideoPath: string | null = null;
let isCancelled = false;

function createWindow() {
  // Resolve preload path: in production it's alongside main.js, in dev it's in electron/ source dir
  const preloadPath = fs.existsSync(path.join(__dirname, 'preload.cjs'))
    ? path.join(__dirname, 'preload.cjs')
    : path.join(__dirname, '..', 'electron', 'preload.cjs');
  console.log(`[Main] Preload path: ${preloadPath} (exists: ${fs.existsSync(preloadPath)})`);

  const appIconPath = fs.existsSync(path.join(__dirname, 'icon.png'))
    ? path.join(__dirname, 'icon.png')
    : fs.existsSync(path.join(__dirname, 'icon.ico'))
    ? path.join(__dirname, 'icon.ico')
    : fs.existsSync(path.join(__dirname, '../build/icon.png'))
    ? path.join(__dirname, '../build/icon.png')
    : undefined;

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1150,
    minHeight: 720,
    backgroundColor: '#090a0f',
    title: 'AURA Studio AI - Autonomous Viral Shorts & Reels Cinema',
    icon: appIconPath,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // allows local video preview
    },
    show: false,
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (dockWindow && !dockWindow.isDestroyed()) {
      dockWindow.close();
    }
  });

  // Handle local video loading with high-performance HTTP Range stream server
  protocol.handle('local-media', (request) => {
    let filePath = request.url.replace(/^local-media:\/\//i, '');
    if (filePath.startsWith('/')) {
      filePath = filePath.slice(1);
    }
    const decoded = decodeURIComponent(filePath);
    return net.fetch(`http://127.0.0.1:${localStreamPort}/stream?path=${encodeURIComponent(decoded)}`);
  });

  // Load Vite dev server or production index.html
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

function createDockWindow() {
  if (dockWindow && !dockWindow.isDestroyed()) {
    dockWindow.show();
    return;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth } = primaryDisplay.workAreaSize;
  const initialWidth = 440;
  const initialHeight = 56;
  const initialX = Math.round((screenWidth - initialWidth) / 2);
  const initialY = 10;

  const preloadPath = fs.existsSync(path.join(__dirname, 'preload.cjs'))
    ? path.join(__dirname, 'preload.cjs')
    : path.join(__dirname, '..', 'electron', 'preload.cjs');

  dockWindow = new BrowserWindow({
    width: initialWidth,
    height: initialHeight,
    x: initialX,
    y: initialY,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    focusable: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
    show: false,
  });

  dockWindow.setAlwaysOnTop(true, 'screen-saver');
  dockWindow.setVisibleOnAllWorkspaces(true);

  if (process.env.VITE_DEV_SERVER_URL) {
    dockWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}#dock`);
  } else {
    dockWindow.loadFile(path.join(__dirname, '../dist/index.html'), { hash: 'dock' });
  }

  dockWindow.once('ready-to-show', () => {
    dockWindow?.show();
  });

  dockWindow.on('closed', () => {
    dockWindow = null;
  });
}

function createWarRoomWindow() {
  if (warRoomWindow && !warRoomWindow.isDestroyed()) {
    if (warRoomWindow.isMinimized()) warRoomWindow.restore();
    warRoomWindow.show();
    warRoomWindow.focus();
    return;
  }

  const preloadPath = fs.existsSync(path.join(__dirname, 'preload.cjs'))
    ? path.join(__dirname, 'preload.cjs')
    : path.join(__dirname, '..', 'electron', 'preload.cjs');

  const appIconPath = fs.existsSync(path.join(__dirname, 'icon.png'))
    ? path.join(__dirname, 'icon.png')
    : fs.existsSync(path.join(__dirname, 'icon.ico'))
    ? path.join(__dirname, 'icon.ico')
    : undefined;

  // Detect external monitor (secondary screen) if available
  const allDisplays = screen.getAllDisplays();
  const primaryDisplay = screen.getPrimaryDisplay();
  const secondaryDisplay = allDisplays.find((d) => d.id !== primaryDisplay.id);

  let winX: number | undefined = undefined;
  let winY: number | undefined = undefined;
  let winWidth = 1560;
  let winHeight = 920;

  if (secondaryDisplay) {
    winX = secondaryDisplay.bounds.x + 30;
    winY = secondaryDisplay.bounds.y + 30;
    winWidth = Math.min(1600, secondaryDisplay.workAreaSize.width - 60);
    winHeight = Math.min(960, secondaryDisplay.workAreaSize.height - 60);
  }

  warRoomWindow = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x: winX,
    y: winY,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#090a10',
    title: '⚡ NEXUS WAR ROOM: 24/7 Canlı Operasyon & YouTube Büyüme Üssü',
    icon: appIconPath,
    autoHideMenuBar: true,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
      backgroundThrottling: false, // Guarantees 60 FPS Three.js rendering on external screen
    },
    show: false,
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    warRoomWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}#war-room`);
  } else {
    warRoomWindow.loadFile(path.join(__dirname, '../dist/index.html'), { hash: 'war-room' });
  }

  warRoomWindow.once('ready-to-show', () => {
    warRoomWindow?.show();
    warRoomWindow?.focus();
  });

  warRoomWindow.on('closed', () => {
    warRoomWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();
  createDockWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
      createDockWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handler: File Picker for Video
ipcMain.handle('dialog:select-video', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'İşlenecek Videoyu Seçin',
    properties: ['openFile'],
    filters: [
      { name: 'Video Dosyaları', extensions: ['mp4', 'mkv', 'mov', 'webm', 'avi', 'flv'] },
      { name: 'Tüm Dosyalar', extensions: ['*'] },
    ],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const selectedPath = result.filePaths[0];
  try {
    const metadata = await ffmpegService.probeVideo(selectedPath);
    activeVideoPath = selectedPath;
    return metadata;
  } catch (err: any) {
    console.error('Probe error:', err);
    return {
      path: selectedPath,
      name: path.basename(selectedPath),
      size: fs.statSync(selectedPath).size,
      duration: 0,
      width: 1920,
      height: 1080,
      format: path.extname(selectedPath).toUpperCase(),
    };
  }
});

// IPC Handler: Probe video by given path (for Drag & Drop)
ipcMain.handle('video:probe-path', async (_event, filePath: string) => {
  if (!filePath) return null;
  const normalized = path.normalize(filePath);
  if (!fs.existsSync(normalized)) {
    throw new Error(`Dosya bulunamadı: ${filePath}`);
  }
  try {
    const metadata = await ffmpegService.probeVideo(normalized);
    activeVideoPath = normalized;
    return metadata;
  } catch (err: any) {
    console.error('Probe drag-drop error:', err);
    activeVideoPath = normalized;
    return {
      path: normalized,
      name: path.basename(normalized),
      size: fs.statSync(normalized).size,
      duration: 0,
      width: 1920,
      height: 1080,
      format: path.extname(normalized).toUpperCase(),
    };
  }
});

// IPC Handler: Get local HTTP streaming URL for any video file
ipcMain.handle('video:get-stream-url', (_event, filePath: string) => {
  if (!filePath) return '';
  return `http://127.0.0.1:${localStreamPort}/stream?path=${encodeURIComponent(filePath)}`;
});

// IPC Handler: Extract Frame with Color Grade at specified timestamp
ipcMain.handle('video:extract-frame', async (_event, { videoPath, second, outputPath }: { videoPath: string; second: number; outputPath: string }) => {
  if (!videoPath || !outputPath) throw new Error('Geçersiz parametre');
  return await ffmpegService.extractFrameWithColorGrade(videoPath, second, outputPath);
});

// IPC Handler: Save Base64 Thumbnail Image directly to disk
ipcMain.handle('video:save-thumbnail-base64', async (_event, { outputPath, base64Data }: { outputPath: string; base64Data: string }) => {
  if (!outputPath || !base64Data) throw new Error('Geçersiz parametre');
  const targetPath = path.isAbsolute(outputPath) ? outputPath : path.join(app.getPath('userData'), outputPath);
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const rawBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
  fs.writeFileSync(targetPath, Buffer.from(rawBase64, 'base64'));
  return { success: true, path: targetPath };
});

// IPC Handler: Probe YouTube video metadata (title, duration)
ipcMain.handle('youtube:probe', async (_event, url: string) => {
  return await youtubeService.probeVideo(url);
});

// IPC Handler: Download YouTube video and return probed VideoMetadata
ipcMain.handle('youtube:download', async (_event, payload: string | { url: string; quality?: '1080p' | '720p' | '480p' | 'best' }) => {
  if (!mainWindow) throw new Error('Pencere bulunamadı.');

  const url = typeof payload === 'string' ? payload : payload.url;
  const quality = typeof payload === 'string' ? '1080p' : (payload.quality || '1080p');

  const sendProgress = (percent: number, message: string, telemetry?: any) => {
    broadcastToWindows('pipeline:progress', {
      step: 'downloading_youtube',
      percent,
      message,
      downloadTelemetry: telemetry,
    });
  };

  const sendLog = (log: string) => {
    broadcastToWindows('pipeline:log', log);
  };

  sendLog(`[YouTube] Video indirme isteği alındı (${quality.toUpperCase()}): ${url}`);
  sendProgress(5, `YouTube bağlantısı kuruluyor (${quality.toUpperCase()})...`);

  try {
    const ffmpegDir = path.dirname(ffmpegService.getBinaryPath());
    const downloadedPath = await youtubeService.downloadVideo({
      url,
      ffmpegDir,
      quality,
      onProgress: (p, msg, telemetry) => {
        sendProgress(p, msg, telemetry);
      },
      onLog: (msg) => {
        sendLog(msg);
      },
    });

    // Probe downloaded video metadata
    const metadata = await ffmpegService.probeVideo(downloadedPath);
    activeVideoPath = downloadedPath;
    sendLog(`[YouTube] Video başarıyla indirildi ve yüklendi: ${metadata.name} (${(metadata.duration / 60).toFixed(1)} dk)`);
    sendProgress(100, 'İndirme tamamlandı! Video işlenmeye hazır.');

    // Notify Nova Copilot of successful download
    broadcastToWindows('copilot:speech', {
      message: `🎬 Video başarıyla indirildi patron! 2. Aşamaya (Klip Ayarları) geçtin. Klip sayısı ve sürelerini belirleyebilirsin.`,
      mood: 'success',
    });

    return metadata;
  } catch (error: any) {
    sendLog(`[HATA] YouTube indirme başarısız: ${error.message}`);
    broadcastToWindows('pipeline:progress', {
      step: 'error',
      percent: 0,
      message: `YouTube indirme hatası: ${error.message}`,
      isError: true,
    });
    broadcastToWindows('copilot:speech', {
      message: `🚨 Hata oluştu patron! YouTube videosu indirilemedi: ${error.message}`,
      mood: 'alert',
    });
    throw error;
  }
});

// IPC Handler: Folder Picker for Export
ipcMain.handle('dialog:select-output-folder', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Kliplerin Kaydedileceği Klasörü Seçin',
    properties: ['openDirectory', 'createDirectory'],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

// IPC Handler: System Health
ipcMain.handle('system:health', async (): Promise<SystemHealth> => {
  let isFFmpeg = ffmpegService.isAvailable();
  let hasOllama = false;
  let ollamaModels: string[] = [];

  try {
    const res = await fetch('http://localhost:11434/api/tags');
    if (res.ok) {
      hasOllama = true;
      const data = await res.json();
      if (Array.isArray(data.models)) {
        ollamaModels = data.models.map((m: any) => m.name);
      }
    }
  } catch {
    hasOllama = false;
  }

  return {
    ffmpeg: isFFmpeg,
    ffmpegVersion: ffmpegService.getBinaryPath(),
    python: true,
    cuda: true,
    whisper: true,
    ollama: hasOllama,
    ollamaModels,
  };
});

// Utilities
ipcMain.handle('system:open-path', async (_e, targetPath: string) => {
  await shell.openPath(targetPath);
});

ipcMain.handle('system:show-item-in-folder', async (_e, targetPath: string) => {
  shell.showItemInFolder(targetPath);
});

// Helper to broadcast log & progress
function sendProgress(step: string, percent: number, message: string, extra = {}) {
  broadcastToWindows('pipeline:progress', {
    step,
    percent: Math.round(percent),
    message,
    ...extra,
  });
}

function sendLog(message: string) {
  broadcastToWindows('pipeline:log', message);
}

// IPC Handler: Cancel Pipeline
ipcMain.handle('pipeline:cancel', () => {
  isCancelled = true;
  whisperService.cancel();
  ffmpegService.cancel();
  youtubeService.cancel();
  faceTrackingService.cancel();
  sendProgress('idle', 0, 'İşlem iptal edildi.');
  sendLog('⚠ İşlem kullanıcı tarafından durduruldu ve iptal edildi.');
  return { success: true };
});

// IPC Handler: Reset / Dismiss Error and Restore Nova
ipcMain.handle('pipeline:reset-error', () => {
  isCancelled = false;
  activeTranscript = null;
  activeTranscriptVideoPath = null;
  sendProgress('idle', 0, '');
  copilotService.emitSpeech({
    message: 'Patron, sistem sıfırlandı ve temizlendi. Yeni emirlerini bekliyorum!',
    mood: 'idle',
  });
  sendLog('🛡️ Sistem ve hata durumu sıfırlandı, yeni işleme hazır.');
  return { success: true };
});

// IPC Handler: Start Pipeline
ipcMain.handle('pipeline:start', async (_event, options: PipelineOptions) => {
  try {
    isCancelled = false;
    const { videoPath, outputDirectory, whisperModel, language, llmProvider, subtitleConfig } = options;

    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video dosyası bulunamadı: ${videoPath}`);
    }

    activeVideoPath = videoPath;
    const currentFileName = path.basename(videoPath);
    const safeVideoName = path.basename(videoPath, path.extname(videoPath))
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .substring(0, 32);

    // Ensure projectDir is unique to this video and doesn't inherit a previous video's _Clips folder
    let baseOutputDir = outputDirectory && outputDirectory.trim() ? outputDirectory : path.join(path.dirname(videoPath), 'AutoClips_Output');
    if (baseOutputDir.endsWith('_Clips')) {
      baseOutputDir = path.dirname(baseOutputDir);
    }
    const projectDir = path.join(baseOutputDir, `${safeVideoName}_Clips`);
    
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }

    sendLog(`Pipeline başlatıldı: ${currentFileName}`);
    sendLog(`Çıktı klasörü: ${projectDir}`);

    // Probe actual video file to get exact duration for cross-contamination verification
    let videoDuration = 0;
    try {
      const probeData = await ffmpegService.probeVideo(videoPath);
      videoDuration = probeData.duration;
    } catch {}

    // SMART CACHE & SENTINEL INTEGRITY CHECK:
    // Only reuse transcript if it precisely belongs to THIS exact video file (prevents cross-contamination)
    let transcriptResult: TranscriptResult | null = null;
    if (activeTranscriptVideoPath === videoPath && activeTranscript && activeTranscript.segments && activeTranscript.segments.length > 0) {
      sendLog('✓ [Sentinel & Auditor Onayı]: Mevcut video için transkript doğrulandı ve hafızadan alındı.');
      transcriptResult = activeTranscript;
    } else {
      activeTranscript = null;
      activeTranscriptVideoPath = null;
      try {
        const candidate = path.join(projectDir, 'transcript_word_level.json');
        if (fs.existsSync(candidate)) {
          const loaded = JSON.parse(fs.readFileSync(candidate, 'utf-8'));
          const cachedFileName = loaded.sourceVideoName || '';
          const cachedDuration = loaded.duration || (loaded.segments && loaded.segments.length > 0 ? loaded.segments[loaded.segments.length - 1].end : 0);

          // VERIFICATION GUARD: Check if candidate really belongs to this exact video
          const isSameFile = loaded.sourceVideoPath === videoPath;
          const isSameNameAndDuration = cachedFileName === currentFileName && (!videoDuration || Math.abs(cachedDuration - videoDuration) < 3.0);

          if ((isSameFile || isSameNameAndDuration) && loaded.segments && loaded.segments.length > 0) {
            sendLog(`✓ [Sentinel & Auditor Onayı]: Bu video için kaydedilen transkript doğrulandı (${currentFileName}), deşifre adımı atlanıyor.`);
            transcriptResult = loaded;
            activeTranscript = loaded;
            activeTranscriptVideoPath = videoPath;
          } else {
            sendLog(`🛡️ [Sentinel Guard Uyarısı]: Eski klasörde farklı bir videoya ait transkript tespit edildi (${cachedFileName || 'Bilinmeyen'} != ${currentFileName}). Altyazı karışmasını önlemek için eski önbellek yok sayılıyor ve sıfırdan Whisper deşifresi yapılıyor!`);
          }
        }
      } catch (cacheErr) {
        // ignore cache load errors and re-transcribe
      }
    }

    if (!transcriptResult) {
      if (isCancelled) throw new Error('İşlem kullanıcı tarafından iptal edildi.');

      // STEP 1: Audio Extraction
      sendProgress('extracting_audio', 10, 'Videodan ses dalgaları ayıklanıyor (16kHz WAV)...');
      const wavPath = path.join(projectDir, 'audio_extracted.wav');
      
      await ffmpegService.extractAudio(videoPath, wavPath, (p, msg) => {
        sendProgress('extracting_audio', 10 + (p * 0.15), msg);
      });
      if (isCancelled) throw new Error('İşlem kullanıcı tarafından iptal edildi.');
      sendLog(`Ses ayıklandı: ${wavPath}`);

      // STEP 2: Whisper Word-Level Transcription
      sendProgress('transcribing', 25, 'Whisper modeli çalışıyor, kelime zaman damgaları çıkarılıyor...');
      sendLog(`Whisper modeli başlatılıyor (${whisperModel || 'small'})...`);

      transcriptResult = await whisperService.transcribe(
        wavPath,
        whisperModel || 'small',
        language || 'auto',
        (p, msg) => {
          // Map whisper percent (0-100) to pipeline progress (25 - 65)
          const mappedPercent = 25 + (p * 0.40);
          sendProgress('transcribing', mappedPercent, msg);
        }
      );

      if (isCancelled) throw new Error('İşlem kullanıcı tarafından iptal edildi.');
      activeTranscript = transcriptResult;
      activeTranscriptVideoPath = videoPath;
    }

    if (isCancelled) throw new Error('İşlem kullanıcı tarafından iptal edildi.');
    const transcriptJsonPath = path.join(projectDir, 'transcript_word_level.json');
    const cachePayload = {
      sourceVideoPath: videoPath,
      sourceVideoName: currentFileName,
      cachedAt: new Date().toISOString(),
      ...transcriptResult,
    };
    fs.writeFileSync(transcriptJsonPath, JSON.stringify(cachePayload, null, 2), 'utf-8');
    sendLog(`Transkript hazır. Video: ${currentFileName}, Toplam süre: ${transcriptResult.duration}s, Segment sayısı: ${transcriptResult.segments.length}`);

    // GUARD: Check if video actually has any spoken dialogue
    if (!transcriptResult.segments || transcriptResult.segments.length === 0 || !transcriptResult.text.trim()) {
      throw new Error('Bu videoda herhangi bir konuşma veya diyalog tespit edilemedi. Video sessiz veya sadece arka plan müziğinden oluşuyor olabilir. Lütfen konuşma/diyalog içeren (podcast, röportaj, vlog, gameplay vb.) bir video seçin.');
    }

    if (isCancelled) throw new Error('İşlem kullanıcı tarafından iptal edildi.');

    // STEP 3: Highlight Detection (Single LLM or Multi-Agent Agency)
    let clips: ViralClip[] = [];

    if (options.agencyMode) {
      sendProgress('detecting_highlights', 68, 'Otonom Ajans (Scout, CEO, Görsel Yönetmen, Metin Yazarı) göreve başladı...');
      sendLog('👑 [Otonom Ajans Modu] Multi-Agent Ollama ekibi devreye girdi.');

      const sendAgencyMessage = (msg: AgencyMessage) => {
        mainWindow?.webContents.send('agency:message', msg);
      };
      const sendAgencyProgress = (p: AgencyProgressEvent) => {
        mainWindow?.webContents.send('agency:progress', p);
      };

      clips = await agencyService.runAgencyPipeline(transcriptResult, {
        ollamaHost: options.ollamaHost,
        clipCount: options.clipCount || 3,
        minClipDuration: options.minClipDuration || 30,
        maxClipDuration: options.maxClipDuration || 60,
        videoPath,
        outputDirectory: projectDir,
        agents: options.agencyAgents,
        onMessage: sendAgencyMessage,
        onProgress: sendAgencyProgress,
        onLog: (l) => sendLog(l),
        isCancelled: () => isCancelled,
      });
    } else {
      sendProgress('detecting_highlights', 68, 'Yapay zeka viral kesitleri analiz ediyor ve kancaları seçiyor...');
      sendLog(`LLM servisi çağrılıyor (${llmProvider.toUpperCase()})...`);

      clips = await llmService.detectHighlights(transcriptResult, {
        provider: options.llmProvider,
        ollamaModel: options.ollamaModel,
        ollamaHost: options.ollamaHost,
        groqApiKey: options.groqApiKey,
        groqModel: options.groqModel,
        clipCount: options.clipCount || 3,
        minClipDuration: options.minClipDuration || 30,
        maxClipDuration: options.maxClipDuration || 60,
      });
    }

    if (isCancelled) throw new Error('İşlem kullanıcı tarafından iptal edildi.');
    sendLog(`Analiz Başarılı! ${clips.length} adet onaylı viral kesit teslim alındı.`);

    // STEP 4: Render Vertical Clips & Subtitles
    const renderedClips: ViralClip[] = [];
    const totalClips = clips.length;

    // Collect all words into a flat array for easy interval slicing
    const allWords = transcriptResult.segments.flatMap(s => s.words || []);

    for (let i = 0; i < totalClips; i++) {
      if (isCancelled) throw new Error('İşlem kullanıcı tarafından iptal edildi.');
      const clip = clips[i];
      const clipIndex = i + 1;
      const progressBase = 70 + ((i / totalClips) * 28);

      sendProgress('rendering_clips', progressBase, `Klip ${clipIndex}/${totalClips} hazırlanıyor: "${clip.title}"...`, {
        activeClipIndex: clipIndex,
        totalClips,
      });

      sendLog(`Klip ${clipIndex}/${totalClips} işleniyor: [${clip.start_seconds}s - ${clip.end_seconds}s] "${clip.title}"`);

      // 4a. Generate ASS Subtitle File
      const assPath = path.join(projectDir, `clip_${clip.clip_id}_subtitles.ass`);
      generateAssSubtitles(
        allWords,
        clip.start_seconds,
        clip.end_seconds,
        subtitleConfig,
        assPath,
        options.aspectRatio || '9:16',
        clip.seriesBannerText || (clip.isSeries && clip.partNumber ? (clip.partNumber === (clip.totalParts || 2) ? `PART ${clip.partNumber} (FİNAL) | Başı Profilde 👈` : `PART ${clip.partNumber} | Devamı Part ${clip.partNumber + 1}'de 👇`) : undefined)
      );

      // 4b. Optional Smart Face Tracking 9:16 Analysis (only in 9:16 mode)
      let customVideoFilter: string | undefined = undefined;
      if (options.aspectRatio !== '16:9' && options.layoutMode === 'smart_face_tracking') {
        sendLog(`[Yüz Takibi] Klip ${clipIndex}/${totalClips}: Konuşmacı tespiti ve akıllı 9:16 kadraj hesaplanıyor...`);
        try {
          const faceResult = await faceTrackingService.analyzeCrop(
            videoPath,
            clip.start_seconds,
            clip.duration_seconds
          );
          customVideoFilter = faceResult.filter_complex;
          sendLog(`[Yüz Takibi] ${faceResult.message}`);
        } catch (faceErr: any) {
          console.warn('[FaceTracking] Failed:', faceErr);
        }
      }

      if (isCancelled) throw new Error('İşlem kullanıcı tarafından iptal edildi.');

      // 4c. Render vertical or landscape video with FFmpeg
      const sanitizedTitle = clip.title.replace(/[^a-zA-Z0-9çğıöşüÇĞİÖŞÜ\s_-]/g, '').trim().substring(0, 40);
      const clipFileName = `ViralClip_${clip.clip_id}_${sanitizedTitle}.mp4`;
      const clipOutputPath = path.join(projectDir, clipFileName);

      try {
        await ffmpegService.renderVerticalClip({
          videoPath,
          startSeconds: clip.start_seconds,
          durationSeconds: clip.duration_seconds,
          assSubtitlePath: assPath,
          outputPath: clipOutputPath,
          aspectRatio: options.aspectRatio || '9:16',
          layoutMode: options.layoutMode || 'blur_background',
          customVideoFilter,
          onProgress: (p, msg) => {
            const clipPercent = progressBase + ((p / 100) * (28 / totalClips));
            sendProgress('rendering_clips', clipPercent, `Klip ${clipIndex}/${totalClips}: %${p}`, {
              activeClipIndex: clipIndex,
              totalClips,
            });
          },
        });

        if (isCancelled) throw new Error('İşlem kullanıcı tarafından iptal edildi.');

        renderedClips.push({
          ...clip,
          outputPath: clipOutputPath,
          status: 'completed',
        });
        sendLog(`✓ Klip hazırlandı: ${clipFileName}`);
      } catch (renderErr: any) {
        if (isCancelled) throw renderErr;
        console.error(`Clip ${clip.clip_id} render failed:`, renderErr);
        renderedClips.push({
          ...clip,
          status: 'error',
          error: renderErr.message,
        });
        sendLog(`✗ Klip ${clip.clip_id} üretilemedi: ${renderErr.message}`);
      }
    }

    sendProgress('completed', 100, 'Tüm viral klipler başarıyla üretildi!');
    sendLog(`İşlem tamamlandı! Toplam ${renderedClips.length} klip oluşturuldu.`);

    return {
      success: true,
      projectDir,
      transcript: transcriptResult,
      clips: renderedClips,
    };
  } catch (error: any) {
    if (isCancelled || error.message?.includes('iptal')) {
      sendProgress('idle', 0, 'İşlem iptal edildi.');
      sendLog('ℹ İşlem iptali tamamlandı.');
    } else {
      console.error('[Pipeline Error]:', error);
      sendProgress('error', 0, `Hata oluştu: ${error.message}`);
      sendLog(`[HATA]: ${error.message}`);
    }
    throw error;
  }
});

// IPC Handler: Re-render a single clip with new styling, trimming, audio, or subtitles
ipcMain.handle('pipeline:render-clip', async (_event, payload: {
  clip: ViralClip;
  options: PipelineOptions & {
    enableSubtitles?: boolean;
    audioVolume?: number;
    musicPath?: string;
    musicVolume?: number;
  };
}) => {
  const { clip, options } = payload;
  const videoPath = options.videoPath || activeVideoPath;

  if (!videoPath || !fs.existsSync(videoPath)) {
    throw new Error('Orijinal video dosyası bulunamadı.');
  }

  const baseDir = options.outputDirectory || path.dirname(videoPath);
  const outDir = path.join(baseDir, 'Custom_Renders');
  fs.mkdirSync(outDir, { recursive: true });

  const sanitizedTitle = clip.title.replace(/[^a-zA-Z0-9çğıöşüÇĞİÖŞÜ\s_-]/g, '').trim().substring(0, 35);
  const outputPath = path.join(outDir, `Clip_${clip.clip_id}_${sanitizedTitle}_${Date.now()}.mp4`);

  let assPath: string | undefined = undefined;

  // Only generate subtitles if user didn't disable them
  if (options.enableSubtitles !== false) {
    assPath = path.join(outDir, `clip_${clip.clip_id}_style_${Date.now()}.ass`);

    // In-memory transcript recovery fallback
    if (!activeTranscript) {
      const candidates = [
        path.join(baseDir, 'transcript_word_level.json'),
        path.join(path.dirname(clip.outputPath || ''), 'transcript_word_level.json')
      ];
      for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
          try {
            activeTranscript = JSON.parse(fs.readFileSync(candidate, 'utf-8'));
            break;
          } catch (e) {}
        }
      }
    }

    const allWords = activeTranscript?.segments?.flatMap(s => s.words || []) || [];
    if (allWords.length > 0) {
      generateAssSubtitles(
        allWords,
        clip.start_seconds,
        clip.end_seconds,
        options.subtitleConfig,
        assPath,
        options.aspectRatio || '9:16',
        clip.seriesBannerText || (clip.isSeries && clip.partNumber ? (clip.partNumber === (clip.totalParts || 2) ? `PART ${clip.partNumber} (FİNAL) | Başı Profilde 👈` : `PART ${clip.partNumber} | Devamı Part ${clip.partNumber + 1}'de 👇`) : undefined)
      );
    }
  }

  let customVideoFilter: string | undefined = undefined;
  if (options.aspectRatio !== '16:9' && options.layoutMode === 'smart_face_tracking') {
    try {
      const faceResult = await faceTrackingService.analyzeCrop(
        videoPath,
        clip.start_seconds,
        clip.duration_seconds
      );
      customVideoFilter = faceResult.filter_complex;
    } catch (faceErr: any) {
      console.warn('[FaceTracking] Failed:', faceErr);
    }
  }

  await ffmpegService.renderVerticalClip({
    videoPath,
    startSeconds: clip.start_seconds,
    durationSeconds: clip.duration_seconds,
    assSubtitlePath: assPath,
    outputPath,
    aspectRatio: options.aspectRatio || '9:16',
    layoutMode: options.layoutMode || 'blur_background',
    customVideoFilter,
    audioVolume: options.audioVolume,
    musicPath: options.musicPath,
    musicVolume: options.musicVolume,
  });

  return {
    ...clip,
    outputPath,
    status: 'completed',
  };
});

// IPC Handler: Generate Social Copy (Viral Titles, Captions, Hashtags)
ipcMain.handle('llm:generate-social-copy', async (_event, payload: { clip: ViralClip; options: PipelineOptions }) => {
  const { clip, options } = payload;
  return await llmService.generateSocialCopy(clip, {
    provider: options.llmProvider || 'ollama',
    ollamaModel: options.ollamaModel || 'gemma3:4b',
    ollamaHost: options.ollamaHost,
    groqApiKey: options.groqApiKey,
    groqModel: options.groqModel,
  });
});

// IPC Handler: Get default agency agent roster
ipcMain.handle('agency:get-default-agents', () => {
  return AgencyService.DEFAULT_AGENTS;
});

// IPC Handler: Run agency pipeline directly
ipcMain.handle('agency:run-pipeline', async (_event, payload: {
  transcript?: TranscriptResult;
  options: PipelineOptions;
}) => {
  const currentTranscript = payload.transcript || activeTranscript;
  if (!currentTranscript || !currentTranscript.segments || currentTranscript.segments.length === 0) {
    throw new Error('Aktif bir transkript bulunamadı. Önce bir video seçilmeli veya deşifre edilmelidir.');
  }

  const sendAgencyMessage = (msg: AgencyMessage) => {
    broadcastToWindows('agency:message', msg);
  };
  const sendAgencyProgress = (p: AgencyProgressEvent) => {
    broadcastToWindows('agency:progress', p);
  };
  const sendLog = (l: string) => {
    broadcastToWindows('pipeline:log', l);
  };

  return await agencyService.runAgencyPipeline(currentTranscript, {
    ollamaHost: payload.options.ollamaHost,
    clipCount: payload.options.clipCount || 3,
    minClipDuration: payload.options.minClipDuration || 30,
    maxClipDuration: payload.options.maxClipDuration || 60,
    videoPath: payload.options.videoPath || activeVideoPath || undefined,
    outputDirectory: payload.options.outputDirectory,
    agents: payload.options.agencyAgents,
    onMessage: sendAgencyMessage,
    onProgress: sendAgencyProgress,
    onLog: sendLog,
    isCancelled: () => isCancelled,
  });
});

// 🎯 IPC Handler: Start Collaborative Strategic Discovery Meeting & Pitch Deck
ipcMain.handle('agency:start-discovery-meeting', async (_event, payload?: { niche?: string; keyword?: string }) => {
  const sendAgencyMessage = (msg: AgencyMessage) => {
    broadcastToWindows('agency:message', msg);
  };
  const sendAgencyProgress = (p: AgencyProgressEvent) => {
    broadcastToWindows('agency:progress', p);
  };
  const sendLog = (l: string) => {
    broadcastToWindows('pipeline:log', l);
  };

  const apSettings = autopilotService.getSettings();
  const niche = payload?.niche || apSettings.selectedNiche || 'Röportaj & Gerçek Hayat Hikayeleri';
  const keyword = payload?.keyword || apSettings.customKeyword || undefined;

  const result = await agencyService.runStrategicDiscoveryMeeting({
    niche,
    keyword,
    minViewCount: apSettings.minViewCount,
    onMessage: sendAgencyMessage,
    onProgress: sendAgencyProgress,
    onLog: sendLog,
  });

  // Broadcast curated candidate pitches to all windows (main + external war room)
  broadcastToWindows('agency:pitches-ready', result.candidates);

  return result;
});

ipcMain.handle('agency:approve-pitch', (_event, pitch: any) => {
  broadcastToWindows('agency:pitch-approved', pitch);
  return { success: true };
});

// ==========================================
// 🤖 AUTOPILOT 7/24 AUTONOMOUS ENGINE IPC
// ==========================================
ipcMain.handle('autopilot:get-settings', () => {
  return autopilotService.getSettings();
});

ipcMain.handle('autopilot:update-settings', (_event, partialSettings) => {
  return autopilotService.updateSettings(partialSettings);
});

ipcMain.handle('autopilot:get-state', () => {
  return autopilotService.getState();
});

ipcMain.handle('autopilot:start', () => {
  autopilotService.startScheduler();
  return autopilotService.getState();
});

ipcMain.handle('autopilot:stop', () => {
  autopilotService.stopScheduler();
  return autopilotService.getState();
});

ipcMain.handle('autopilot:run-cycle', async (_event, candidate) => {
  return await autopilotService.runAutopilotCycle(candidate);
});

ipcMain.handle('autopilot:run-batch', async (_event, count?: number) => {
  return await autopilotService.runAutopilotDailyBatch(count || 3);
});

ipcMain.handle('autopilot:search-cc', async (_event, payload?: { niche?: string; keyword?: string }) => {
  return await autopilotService.searchCreativeCommons(payload?.niche, payload?.keyword);
});

ipcMain.handle('autopilot:delete-package', (_event, packageId: string) => {
  return autopilotService.deletePackage(packageId);
});

ipcMain.handle('autopilot:open-archive-folder', () => {
  const dir = autopilotService.getSettings().archiveDirectory;
  shell.openPath(dir);
  return { success: true };
});

ipcMain.handle('autopilot:publish-now', async (_event, packageId: string) => {
  return await autopilotService.publishPackageNow(packageId);
});

ipcMain.handle('upload-registry:get-all', () => {
  return uploadRegistryService.getAll();
});

ipcMain.handle('upload-registry:is-uploaded', (_event, query: any) => {
  return uploadRegistryService.isUploaded(query);
});

// 🤖 Interactive Copilot AI (NOVA)
ipcMain.handle('copilot:send-command', async (_event, command: string) => {
  return await copilotService.handleUserCommand(command);
});

ipcMain.handle('copilot:get-messages', () => {
  return copilotService.getMessages();
});

// ==========================================
// 🪟 WINDOWS DESKTOP DOCKER (NOVA TOP ISLAND)
// ==========================================
ipcMain.handle('dock:set-expanded', (_event, isExpanded: boolean) => {
  if (!dockWindow || dockWindow.isDestroyed()) return { success: false };
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth } = primaryDisplay.workAreaSize;

  const targetWidth = isExpanded ? 720 : 440;
  const targetHeight = isExpanded ? 275 : 56;
  const x = Math.round((screenWidth - targetWidth) / 2);
  const y = 10;

  dockWindow.setBounds({
    x,
    y,
    width: targetWidth,
    height: targetHeight,
  });
  return { success: true, isExpanded };
});

ipcMain.handle('dock:toggle-main-window', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return false;
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
    return true;
  } else if (!mainWindow.isVisible()) {
    mainWindow.show();
    mainWindow.focus();
    return true;
  } else {
    mainWindow.minimize();
    return false;
  }
});

ipcMain.handle('dock:restore-main-window', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.show();
  mainWindow.focus();
});

ipcMain.handle('dock:open-feature', (_event, feature: 'agency' | 'autopilot' | 'terminal' | 'new_video' | 'settings') => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send('dock:trigger-feature', feature);
  }
});

ipcMain.handle('dock:close', () => {
  if (dockWindow && !dockWindow.isDestroyed()) {
    dockWindow.hide();
    broadcastToWindows('dock:visibility-change', false);
  }
});

ipcMain.handle('dock:show', () => {
  if (dockWindow && !dockWindow.isDestroyed()) {
    dockWindow.show();
    broadcastToWindows('dock:visibility-change', true);
  } else {
    createDockWindow();
    broadcastToWindows('dock:visibility-change', true);
  }
});

ipcMain.handle('dock:toggle', () => {
  if (!dockWindow || dockWindow.isDestroyed()) {
    createDockWindow();
    dockWindow?.show();
    broadcastToWindows('dock:visibility-change', true);
    return true;
  }
  if (dockWindow.isVisible()) {
    dockWindow.hide();
    broadcastToWindows('dock:visibility-change', false);
    return false;
  } else {
    dockWindow.show();
    broadcastToWindows('dock:visibility-change', true);
    return true;
  }
});

ipcMain.handle('dock:is-visible', () => {
  if (!dockWindow || dockWindow.isDestroyed()) return false;
  return dockWindow.isVisible();
});

// ========================================================
// 🎥 YOUTUBE DATA API & GOOGLE OAUTH 2.0 INTEGRATION
// ========================================================

ipcMain.handle('youtube-auth:get-status', async () => {
  try {
    return await googleAuthService.getStatus();
  } catch (err: any) {
    return {
      isConfigured: false,
      isAuthenticated: false,
      channel: null,
      error: err.message,
    };
  }
});

ipcMain.handle('youtube-auth:login', async () => {
  try {
    const channel = await googleAuthService.login(mainWindow);
    const status = await googleAuthService.getStatus();
    broadcastToWindows('youtube-auth:updated', status);
    broadcastToWindows('copilot:speech', {
      message: `🎉 Tebrikler patron! "${channel.title}" YouTube kanalın başarıyla bağlandı! Kliplerini doğrudan Shorts olarak yayınlayabilirsin!`,
      mood: 'success',
    });
    return channel;
  } catch (err: any) {
    broadcastToWindows('copilot:speech', {
      message: `Google girişinde hata oluştu patron: ${err.message}`,
      mood: 'alert',
    });
    throw err;
  }
});

ipcMain.handle('youtube-auth:logout', async () => {
  await googleAuthService.logout();
  const status = await googleAuthService.getStatus();
  broadcastToWindows('youtube-auth:updated', status);
  broadcastToWindows('copilot:speech', {
    message: 'YouTube kanalı bağlantısı kesildi patron.',
    mood: 'idle',
  });
  return true;
});

ipcMain.handle('youtube-auth:upload-video', async (_event, payload: YouTubeUploadPayload) => {
  try {
    broadcastToWindows('copilot:speech', {
      message: `🚀 "${payload.title.slice(0, 30)}..." klibi YouTube Shorts'a yükleniyor patron!`,
      mood: 'working',
    });

    const result = await googleAuthService.uploadVideo(payload, (percent, uploaded, total) => {
      broadcastToWindows('youtube-upload:progress', {
        percent,
        uploaded,
        total,
        title: payload.title,
      });
    });

    if (result.success && result.videoId) {
      const uploadedRecord = uploadRegistryService.recordUpload({
        title: result.title || payload.title,
        youtubeVideoId: result.videoId,
        youtubeUrl: result.videoUrl || `https://youtube.com/shorts/${result.videoId}`,
        uploadMode: 'manual',
        filePath: payload.filePath,
        thumbnailPath: payload.thumbnailPath,
      });

      autopilotService.registerExternalUpload(uploadedRecord);
      broadcastToWindows('clip:uploaded', uploadedRecord);
    }

    broadcastToWindows('copilot:speech', {
      message: `🔥 Harika haber patron! Klip YouTube Shorts'a yüklendi!`,
      mood: 'success',
    });

    return result;
  } catch (err: any) {
    broadcastToWindows('copilot:speech', {
      message: `YouTube yükleme hatası: ${err.message}`,
      mood: 'alert',
    });
    throw err;
  }
});

ipcMain.handle('youtube-auth:get-analytics', async () => {
  try {
    let nextScheduled = null;
    try {
      const apState = autopilotService.getState();
      if (apState.nextRunAt) {
        nextScheduled = {
          time: apState.nextRunAt,
          dayLabel: 'Otopilot Planı',
          title: apState.currentAction || 'Sıradaki Otomatik Shorts Yayını',
        };
      }
    } catch {}

    const data = await googleAuthService.getChannelAnalytics(nextScheduled);

    // Sync live channel videos: prune deleted videos from local registry & autopilot
    try {
      if (data.isAuthenticated && Array.isArray(data.videos)) {
        const liveIds = new Set<string>(data.videos.map((v: any) => v.id).filter(Boolean));
        if (liveIds.size > 0) {
          const deletedIds = uploadRegistryService.pruneDeletedYouTubeVideos(liveIds);
          autopilotService.syncWithLiveChannel(liveIds, deletedIds);
        }
      }

      // Merge only very recent uploads (< 10 minutes ago) that YouTube API might still be processing
      const localRecords = uploadRegistryService.getAll();
      if (Array.isArray(localRecords) && localRecords.length > 0) {
        const existingIds = new Set((data.videos || []).map((v: any) => v.id));
        const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
        const recentPendingClips = localRecords
          .filter((r) => {
            if (!r.youtubeVideoId || existingIds.has(r.youtubeVideoId)) return false;
            const upTime = r.uploadedAt ? new Date(r.uploadedAt).getTime() : 0;
            return !isNaN(upTime) && upTime > tenMinutesAgo;
          })
          .map((r) => ({
            id: r.youtubeVideoId,
            title: r.title,
            description: `#Shorts | Otomatik Yayınlandı`,
            publishedAt: r.uploadedAt,
            thumbnailUrl: r.thumbnailPath || '',
            viewCount: 0,
            likeCount: 0,
            commentCount: 0,
            privacyStatus: 'public',
            isShort: true,
            videoUrl: r.youtubeUrl,
          }));

        data.videos = [...(data.videos || []), ...recentPendingClips];
        data.localUploadsCount = localRecords.length;
      }
    } catch (syncErr: any) {
      console.warn('[Main] Live channel sync note:', syncErr.message);
    }

    return data;
  } catch (err: any) {
    console.error('[Main] YouTube analytics fetch error:', err.message);
    throw err;
  }
});

// ⚡ War Room Detached Window IPC Handlers
ipcMain.handle('window:open-war-room', () => {
  createWarRoomWindow();
  return { success: true };
});

ipcMain.handle('window:close-war-room', () => {
  if (warRoomWindow && !warRoomWindow.isDestroyed()) {
    warRoomWindow.close();
  }
  return { success: true };
});




