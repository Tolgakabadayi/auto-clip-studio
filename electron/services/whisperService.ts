import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { TranscriptResult } from '../../src/types';

export interface WhisperProgressCallback {
  (percent: number, message: string): void;
}

export class WhisperService {
  private pythonPath: string;
  private scriptPath: string;
  private activeChild: any = null;

  constructor() {
    this.pythonPath = this.detectPython();
    // Derive directory from this file's location (works in both dev and built ESM)
    const thisDir = path.dirname(fileURLToPath(import.meta.url));
    const resourcesPath = (process as any).resourcesPath;
    const candidatePaths = [
      // 1. Packaged Electron extraResources
      resourcesPath ? path.join(resourcesPath, 'python', 'transcribe.py') : null,
      resourcesPath ? path.join(resourcesPath, 'electron', 'python', 'transcribe.py') : null,
      // 2. Relative to dist-electron
      path.resolve(thisDir, 'python', 'transcribe.py'),
      path.resolve(thisDir, '..', 'python', 'transcribe.py'),
      path.resolve(thisDir, '..', 'electron', 'python', 'transcribe.py'),
      // 3. Process cwd candidates (dev mode or unpacked root)
      path.resolve(process.cwd(), 'resources', 'python', 'transcribe.py'),
      path.resolve(process.cwd(), 'electron', 'python', 'transcribe.py'),
      path.resolve(process.cwd(), 'dist-electron', 'python', 'transcribe.py'),
      path.resolve(process.cwd(), '..', 'electron', 'python', 'transcribe.py'),
    ].filter(Boolean) as string[];

    const found = candidatePaths.find(p => fs.existsSync(p));
    this.scriptPath = found || (resourcesPath ? path.join(resourcesPath, 'python', 'transcribe.py') : candidatePaths[0]);
    console.log(`[WhisperService] Script path resolved to: ${this.scriptPath} (exists: ${fs.existsSync(this.scriptPath)})`);
  }

  public cancel(): void {
    if (this.activeChild) {
      try {
        console.log('[WhisperService] Cancelling active Python worker process...');
        if (process.platform === 'win32' && this.activeChild.pid) {
          spawn('taskkill', ['/pid', this.activeChild.pid.toString(), '/f', '/t']);
        } else {
          this.activeChild.kill('SIGKILL');
        }
      } catch (err) {
        console.warn('[WhisperService] Error cancelling process:', err);
      }
      this.activeChild = null;
    }
  }

  private detectPython(): string {
    // Check known windows paths or fallback to python
    const commonPaths = [
      'python',
      'python3',
      process.env.PYTHON_PATH,
    ].filter(Boolean) as string[];

    return commonPaths[0] || 'python';
  }

  public transcribe(
    audioPath: string,
    modelName = 'small',
    language?: string,
    onProgress?: WhisperProgressCallback
  ): Promise<TranscriptResult> {
    return new Promise((resolve, reject) => {
      const args = [
        this.scriptPath,
        '--audio', audioPath,
        '--model', modelName,
        '--device', 'auto',
      ];

      if (language && language !== 'auto') {
        args.push('--language', language);
      }

      console.log(`[WhisperService] Spawning Python worker: ${this.pythonPath} ${args.join(' ')}`);
      
      const child = spawn(this.pythonPath, args, {
        windowsHide: true,
        env: {
          ...process.env,
          PYTHONIOENCODING: 'utf-8',
          PYTHONUNBUFFERED: '1',
        },
      });

      this.activeChild = child;

      let stdoutAccumulator = '';
      let stderrAccumulator = '';
      let finalResult: TranscriptResult | null = null;

      child.stdout.on('data', (chunk: Buffer) => {
        const str = chunk.toString('utf-8');
        stdoutAccumulator += str;

        // Parse line by line
        const lines = str.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('__PROGRESS__') && trimmed.endsWith('__PROGRESS__')) {
            try {
              const jsonStr = trimmed.replace(/__PROGRESS__/g, '');
              const payload = JSON.parse(jsonStr);
              if (onProgress) {
                onProgress(payload.percent, payload.message);
              }
            } catch (err) {
              // ignore parse errors in log
            }
          } else if (trimmed.startsWith('__RESULT__') && trimmed.endsWith('__RESULT__')) {
            try {
              const jsonStr = trimmed.replace(/__RESULT__/g, '');
              finalResult = JSON.parse(jsonStr);
            } catch (err) {
              console.error('[WhisperService] Failed to parse result JSON:', err);
            }
          }
        }
      });

      child.stderr.on('data', (chunk: Buffer) => {
        const errStr = chunk.toString('utf-8');
        stderrAccumulator += errStr;
        console.warn('[WhisperService stderr]:', errStr);
      });

      child.on('error', (err) => {
        this.activeChild = null;
        reject(new Error(`Failed to start Whisper process: ${err.message}`));
      });

      child.on('close', (code) => {
        this.activeChild = null;
        if (code === 0 && finalResult) {
          resolve(finalResult);
        } else if (finalResult) {
          resolve(finalResult);
        } else {
          // If we couldn't parse directly from stdout stream, try finding __RESULT__ in accumulated output
          const match = stdoutAccumulator.match(/__RESULT__([\s\S]*?)__RESULT__/);
          if (match && match[1]) {
            try {
              const parsed = JSON.parse(match[1]);
              return resolve(parsed);
            } catch (e) {
              // ignore
            }
          }
          reject(new Error(`Whisper transcription failed (exit code ${code}): ${stderrAccumulator || 'Unknown error'}`));
        }
      });
    });
  }
}
