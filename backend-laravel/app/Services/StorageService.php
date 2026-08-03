<?php

namespace App\Services;

use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Filesystem\FilesystemManager;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * S3-compatible storage abstraction (§1 of spec).
 *
 * The default disk is "s3" (FILESYSTEM_DISK=s3 in production). For local dev
 * set FILESYSTEM_DISK=public or FILESYSTEM_DISK=local in .env — the StorageService
 * transparently uses whichever disk Laravel resolves.
 *
 * Stored paths use the convention: resumes/{userId}/{resumeId}/{fileName}.
 * file_path columns store the *key* (not a full URL); signed URLs are
 * generated on demand via getSignedUrl().
 */
class StorageService
{
    private FilesystemManager $fs;

    public function __construct(FilesystemManager $fs)
    {
        $this->fs = $fs;
    }

    public function disk(): Filesystem
    {
        // Resolve fresh so Storage::fake() in tests is picked up.
        return $this->fs->disk(config('filesystems.default', 'local'));
    }

    public function exists(string $key): bool
    {
        return $this->disk()->exists($key);
    }

    /**
     * Persist an uploaded resume PDF (or any binary buffer).
     */
    public function saveResumeUpload(UploadedFile|string $file, string $userId, string $resumeId, string $fileName): string
    {
        $key = $this->resumeKey($userId, $resumeId, $fileName);

        if ($file instanceof UploadedFile) {
            $stream = fopen($file->getRealPath(), 'r');
        } else {
            // $file is raw binary string
            $stream = fopen('php://memory', 'r+');
            fwrite($stream, $file);
            rewind($stream);
        }

        try {
            $this->disk()->writeStream($key, $stream);
        } finally {
            if (is_resource($stream)) {
                fclose($stream);
            }
        }
        return $key;
    }

    /**
     * Save arbitrary binary content (used for generated resume exports).
     */
    public function saveContent(string $key, string $content, string $visibility = 'private'): string
    {
        $options = $visibility === 'public' ? ['visibility' => 'public'] : [];
        $this->disk()->put($key, $content, $options);
        return $key;
    }

    public function get(string $key): ?string
    {
        if (! $this->exists($key)) {
            return null;
        }
        return $this->disk()->get($key);
    }

    public function delete(string $key): bool
    {
        if (! $this->exists($key)) {
            return true;
        }
        try {
            return $this->disk()->delete($key);
        } catch (\Throwable $e) {
            Log::warning(json_encode([
                'level' => 'warn', 'event' => 'storage_delete_failed',
                'key' => $key, 'error' => $e->getMessage(),
            ]));
            return false;
        }
    }

    /**
     * Best-effort signed URL (S3 / public disk). Falls back to a local
     * `/api/storage/{key}` route when the disk doesn't support temporary URLs.
     */
    public function getSignedUrl(string $key, \DateTimeInterface|int $expiresAt = null): string
    {
        $expiresAt = $expiresAt ?? now()->addMinutes(15);
        try {
            return $this->disk()->temporaryUrl($key, $expiresAt);
        } catch (\Throwable $e) {
            // Local disk doesn't support temporaryUrl() — return the public URL.
            return $this->disk()->url($key);
        }
    }

    public function resumeKey(string $userId, string $resumeId, string $fileName): string
    {
        $safe = Str::ascii($fileName);
        return sprintf('resumes/%s/%s/%s', $userId, $resumeId, $safe);
    }

    public function generatedResumeKey(string $userId, string $generatedResumeId, string $format): string
    {
        return sprintf('generated/%s/%s/resume.%s', $userId, $generatedResumeId, $format);
    }
}
