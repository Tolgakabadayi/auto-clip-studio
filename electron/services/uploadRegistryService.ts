import { app } from 'electron';
import path from 'path';
import fs from 'fs';

export interface UploadRecord {
  id: string; // Unique registry record ID
  title: string;
  youtubeVideoId: string;
  youtubeUrl: string;
  uploadedAt: string; // ISO date string
  uploadMode: 'manual' | 'autopilot';
  clipId?: number;
  packageId?: string;
  filePath?: string;
  thumbnailPath?: string;
  sourceVideoId?: string; // YouTube ID of original CC video e.g. "dQw4w9WgXcQ"
  sourceVideoTitle?: string;
  sourceVideoChannel?: string;
  sourceVideoUrl?: string;
}

export class UploadRegistryService {
  private filePath: string;
  private records: UploadRecord[] = [];

  constructor() {
    this.filePath = path.join(app.getPath('userData'), 'autoclip_upload_registry.json');
    this.load();
  }

  private load(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.records = parsed;
        }
      }
    } catch (err) {
      console.warn('[UploadRegistryService] Could not load registry:', err);
      this.records = [];
    }
  }

  private save(): void {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.records, null, 2), 'utf-8');
    } catch (err) {
      console.error('[UploadRegistryService] Error saving registry:', err);
    }
  }

  /**
   * Register a new video upload in the persistent database
   */
  public recordUpload(data: Omit<UploadRecord, 'id' | 'uploadedAt'> & { id?: string; uploadedAt?: string }): UploadRecord {
    // Check if a record with the same youtubeVideoId or filePath already exists
    const existingIndex = this.records.findIndex(
      (r) =>
        (data.youtubeVideoId && r.youtubeVideoId === data.youtubeVideoId) ||
        (data.filePath && r.filePath === data.filePath) ||
        (data.packageId && r.packageId === data.packageId)
    );

    const record: UploadRecord = {
      id: data.id || `up_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: data.title,
      youtubeVideoId: data.youtubeVideoId,
      youtubeUrl: data.youtubeUrl,
      uploadedAt: data.uploadedAt || new Date().toISOString(),
      uploadMode: data.uploadMode,
      clipId: data.clipId,
      packageId: data.packageId,
      filePath: data.filePath,
      thumbnailPath: data.thumbnailPath,
      sourceVideoId: data.sourceVideoId,
      sourceVideoTitle: data.sourceVideoTitle,
      sourceVideoChannel: data.sourceVideoChannel,
      sourceVideoUrl: data.sourceVideoUrl,
    };

    if (existingIndex >= 0) {
      this.records[existingIndex] = { ...this.records[existingIndex], ...record };
    } else {
      this.records.unshift(record);
    }

    this.save();
    console.log(`[UploadRegistryService] Registered upload: "${record.title}" -> ${record.youtubeUrl} (${record.uploadMode})`);
    return record;
  }

  /**
   * Check if a video/clip/source has already been uploaded to YouTube
   */
  public isUploaded(query: {
    filePath?: string;
    clipId?: number;
    packageId?: string;
    sourceVideoId?: string;
    title?: string;
    youtubeVideoId?: string;
  }): boolean {
    return this.records.some((r) => {
      if (query.youtubeVideoId && r.youtubeVideoId === query.youtubeVideoId) return true;
      if (query.packageId && r.packageId && r.packageId === query.packageId) return true;
      if (query.filePath && r.filePath && path.resolve(r.filePath) === path.resolve(query.filePath)) return true;
      if (query.clipId !== undefined && r.clipId !== undefined && r.clipId === query.clipId) return true;
      if (query.sourceVideoId && r.sourceVideoId && r.sourceVideoId === query.sourceVideoId) return true;
      if (query.title && r.title && r.title.trim().toLowerCase() === query.title.trim().toLowerCase()) return true;
      return false;
    });
  }

  /**
   * Retrieve the specific upload record if found
   */
  public getRecord(query: {
    filePath?: string;
    clipId?: number;
    packageId?: string;
    sourceVideoId?: string;
    title?: string;
  }): UploadRecord | undefined {
    return this.records.find((r) => {
      if (query.packageId && r.packageId && r.packageId === query.packageId) return true;
      if (query.filePath && r.filePath && path.resolve(r.filePath) === path.resolve(query.filePath)) return true;
      if (query.clipId !== undefined && r.clipId !== undefined && r.clipId === query.clipId) return true;
      if (query.sourceVideoId && r.sourceVideoId && r.sourceVideoId === query.sourceVideoId) return true;
      if (query.title && r.title && r.title.trim().toLowerCase() === query.title.trim().toLowerCase()) return true;
      return false;
    });
  }

  /**
   * Get all uploaded records
   */
  public getAll(): UploadRecord[] {
    return [...this.records];
  }

  /**
   * Get set of all uploaded CC source video IDs to prevent any re-use
   */
  public getAllSourceVideoIds(): Set<string> {
    const set = new Set<string>();
    for (const r of this.records) {
      if (r.sourceVideoId) set.add(r.sourceVideoId);
    }
    return set;
  }

  /**
   * Remove a record if needed
   */
  public removeRecord(recordId: string): boolean {
    const initialLen = this.records.length;
    this.records = this.records.filter((r) => r.id !== recordId && r.youtubeVideoId !== recordId);
    if (this.records.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }
}
