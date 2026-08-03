// StorageService — abstraction layer for file storage.
// Phase 1 uses local disk under /home/z/my-project/uploads.
// S3 (or any object store) can be swapped in by replacing the method bodies.

import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export interface StoredFile {
  /** Relative path used as the canonical "key" (e.g. <userId>/<resumeId>/<filename>). */
  key: string;
  /** Absolute path on disk. */
  absolutePath: string;
  /** Original file name as uploaded. */
  fileName: string;
  /** Size in bytes. */
  size: number;
  /** MIME type. */
  mimeType: string;
}

export interface IStorageService {
  saveFile(params: {
    userId: string;
    ownerId: string; // resumeId / generatedResumeId / etc.
    fileName: string;
    mimeType: string;
    data: Buffer;
  }): Promise<StoredFile>;

  getFile(key: string): Promise<Buffer | null>;

  deleteFile(key: string): Promise<void>;

  /**
   * Returns a "signed URL" — for local storage we return a relative `/api/storage/<key>`
   * path that the gateway can resolve. For S3 this would be a presigned GET URL.
   * (Phase 1 does not expose this publicly; the route handler may use it internally.)
   */
  getSignedUrl(key: string, ttlSeconds?: number): Promise<string>;
}

class LocalDiskStorageService implements IStorageService {
  private rootDir: string;

  constructor(rootDir: string) {
    this.rootDir = path.resolve(rootDir);
  }

  private resolve(key: string): string {
    const abs = path.resolve(this.rootDir, key);
    // Guard against path traversal.
    if (!abs.startsWith(this.rootDir + path.sep) && abs !== this.rootDir) {
      throw new Error("Invalid storage key: path traversal detected");
    }
    return abs;
  }

  async saveFile(params: {
    userId: string;
    ownerId: string;
    fileName: string;
    mimeType: string;
    data: Buffer;
  }): Promise<StoredFile> {
    const safeName = path.basename(params.fileName).replace(/[^\w.\-]+/g, "_");
    // Add a short random suffix to avoid collisions on identical filenames.
    const suffix = crypto.randomBytes(4).toString("hex");
    const key = path.posix.join(
      params.userId,
      params.ownerId,
      `${suffix}-${safeName}`,
    );
    const abs = this.resolve(key);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, params.data);
    return {
      key,
      absolutePath: abs,
      fileName: params.fileName,
      size: params.data.length,
      mimeType: params.mimeType,
    };
  }

  async getFile(key: string): Promise<Buffer | null> {
    try {
      const abs = this.resolve(key);
      return await fs.readFile(abs);
    } catch {
      return null;
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const abs = this.resolve(key);
      await fs.unlink(abs);
    } catch {
      // Best-effort delete; missing file is fine.
    }
  }

  async getSignedUrl(key: string, _ttlSeconds = 300): Promise<string> {
    // For local storage we return a relative path; the gateway layer can serve it.
    // Phase 1 does not expose this publicly — recruiters only see metadata.
    return `/api/storage/${encodeURIComponent(key)}`;
  }
}

const UPLOADS_DIR =
  process.env.UPLOADS_DIR ?? "/home/z/my-project/uploads";

export const storage: IStorageService = new LocalDiskStorageService(UPLOADS_DIR);
