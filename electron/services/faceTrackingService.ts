import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

export interface FaceTrackingResult {
  crop_x: number;
  crop_y: number;
  crop_width: number;
  crop_height: number;
  face_detected: boolean;
  detection_confidence_pct?: number;
  filter_complex: string;
  message: string;
}

export class FaceTrackingService {
  private pythonPath: string;
  private scriptPath: string;
  private activeChild: any = null;

  constructor() {
    this.pythonPath = this.detectPython();
    const thisDir = path.dirname(fileURLToPath(import.meta.url));
    const candidatePaths = [
      path.resolve(thisDir, 'python', 'track_face.py'),
      path.resolve(thisDir, '..', 'python', 'track_face.py'),
      path.resolve(thisDir, '..', 'electron', 'python', 'track_face.py'),
      path.resolve(process.cwd(), 'electron', 'python', 'track_face.py'),
      path.resolve(process.cwd(), 'dist-electron', 'python', 'track_face.py'),
    ];
    this.scriptPath = candidatePaths.find((p) => fs.existsSync(p)) || candidatePaths[3];
    console.log(`[FaceTrackingService] Script path: ${this.scriptPath} (exists: ${fs.existsSync(this.scriptPath)})`);
  }

  private detectPython(): string {
    const commonPaths = ['python', 'python3', process.env.PYTHON_PATH].filter(Boolean) as string[];
    return commonPaths[0] || 'python';
  }

  public cancel(): void {
    if (this.activeChild) {
      try {
        console.log('[FaceTrackingService] Cancelling face tracking process...');
        if (process.platform === 'win32' && this.activeChild.pid) {
          spawn('taskkill', ['/pid', this.activeChild.pid.toString(), '/f', '/t']);
        } else {
          this.activeChild.kill('SIGKILL');
        }
      } catch (err) {
        console.warn('[FaceTrackingService] Error cancelling process:', err);
      }
      this.activeChild = null;
    }
  }

  public analyzeCrop(
    videoPath: string,
    startSeconds: number,
    durationSeconds: number,
    sampleFps = 4.0
  ): Promise<FaceTrackingResult> {
    return new Promise((resolve) => {
      const args = [
        this.scriptPath,
        '--video', videoPath,
        '--start', String(startSeconds),
        '--duration', String(durationSeconds),
        '--sample_fps', String(sampleFps),
      ];

      console.log(`[FaceTrackingService] Spawning: ${this.pythonPath} ${args.join(' ')}`);
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

      child.stdout.on('data', (chunk: Buffer) => {
        stdoutAccumulator += chunk.toString('utf-8');
      });

      child.stderr.on('data', (chunk: Buffer) => {
        stderrAccumulator += chunk.toString('utf-8');
      });

      child.on('error', (err) => {
        console.warn('[FaceTrackingService] Spawn error:', err.message);
        this.activeChild = null;
        resolve({
          crop_x: 0,
          crop_y: 0,
          crop_width: 608,
          crop_height: 1080,
          face_detected: false,
          filter_complex: 'scale=-1:1920,crop=1080:1920',
          message: 'Yüz takibi başlatılamadı, merkez kırpmaya dönüldü.',
        });
      });

      child.on('close', (code) => {
        this.activeChild = null;
        const match = stdoutAccumulator.match(/__RESULT__([\s\S]*?)__RESULT__/);
        if (match && match[1]) {
          try {
            const parsed = JSON.parse(match[1]);
            return resolve(parsed);
          } catch (e) {
            console.error('[FaceTrackingService] JSON parse error:', e);
          }
        }

        console.warn(`[FaceTrackingService] Process exited (code ${code}), stderr: ${stderrAccumulator}`);
        // Fallback to center crop
        resolve({
          crop_x: 0,
          crop_y: 0,
          crop_width: 608,
          crop_height: 1080,
          face_detected: false,
          filter_complex: 'scale=-1:1920,crop=1080:1920',
          message: 'Yüz analizi tamamlanamadı, standart merkez kırpma kullanıldı.',
        });
      });
    });
  }
}
