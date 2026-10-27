import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');
const UPLOADS_DIR = path.join(projectRoot, 'data', 'uploads', 'avatars');

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * Inspects binary magic numbers to determine image type
 */
export function detectImageType(buffer) {
  if (!buffer || buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return { ext: 'jpg', mime: 'image/jpeg' };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4E &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0D &&
    buffer[5] === 0x0A &&
    buffer[6] === 0x1A &&
    buffer[7] === 0x0A
  ) {
    return { ext: 'png', mime: 'image/png' };
  }

  // WebP: 'RIFF' .... 'WEBP'
  const isRiff = buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46;
  const isWebp = buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;
  if (isRiff && isWebp) {
    return { ext: 'webp', mime: 'image/webp' };
  }

  return null;
}

/**
 * Validates buffer size and authentic image signature
 */
export function validateImageBuffer(buffer) {
  if (!Buffer.isBuffer(buffer)) {
    throw Object.assign(new Error('Invalid image payload. Expected binary data.'), { status: 400 });
  }

  if (buffer.length === 0) {
    throw Object.assign(new Error('Uploaded file is empty.'), { status: 400 });
  }

  if (buffer.length > MAX_FILE_SIZE) {
    throw Object.assign(new Error('Image exceeds the maximum allowed size of 5 MB.'), { status: 400 });
  }

  const detected = detectImageType(buffer);
  if (!detected) {
    throw Object.assign(
      new Error('Invalid image format. Only authentic JPEG, PNG, and WebP images are supported.'),
      { status: 400 }
    );
  }

  return detected;
}

/**
 * Stores uploaded avatar to disk safely with collision-proof UUID filename
 */
export function saveAvatar({ accountId, buffer }) {
  const { ext, mime } = validateImageBuffer(buffer);

  fs.mkdirSync(UPLOADS_DIR, { recursive: true });

  const safeAccountId = String(accountId).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 36) || 'guest';
  const filename = `avatar-${safeAccountId}-${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
  const targetPath = path.join(UPLOADS_DIR, filename);

  fs.writeFileSync(targetPath, buffer);

  return {
    filename,
    url: `/api/uploads/avatars/${filename}`,
    mimeType: mime,
    size: buffer.length
  };
}

/**
 * Safely resolves avatar file path and prevents path traversal attacks
 */
export function getAvatarFilePath(filename) {
  if (!filename || typeof filename !== 'string') return null;

  // Strict whitelist: alphanumeric, dash, dot, underscore only
  if (!/^[a-zA-Z0-9_\-\.]+$/.test(filename) || filename.includes('..')) {
    return null;
  }

  const resolved = path.resolve(UPLOADS_DIR, filename);
  if (!resolved.startsWith(UPLOADS_DIR)) {
    return null;
  }

  if (fs.existsSync(resolved)) {
    const ext = path.extname(resolved).toLowerCase().slice(1);
    const mimeMap = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp'
    };
    return {
      filePath: resolved,
      mimeType: mimeMap[ext] || 'application/octet-stream'
    };
  }

  return null;
}

/**
 * Deletes previously uploaded avatar file
 */
export function deleteAvatarFile(avatarUrlOrFilename) {
  if (!avatarUrlOrFilename || typeof avatarUrlOrFilename !== 'string') return false;

  const filename = avatarUrlOrFilename.startsWith('/api/uploads/avatars/')
    ? avatarUrlOrFilename.replace('/api/uploads/avatars/', '').split('?')[0]
    : path.basename(avatarUrlOrFilename);

  const fileInfo = getAvatarFilePath(filename);
  if (fileInfo && fs.existsSync(fileInfo.filePath)) {
    try {
      fs.unlinkSync(fileInfo.filePath);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

export default {
  saveAvatar,
  getAvatarFilePath,
  deleteAvatarFile,
  detectImageType,
  validateImageBuffer,
  MAX_FILE_SIZE
};
