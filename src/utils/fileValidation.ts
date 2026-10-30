// File validation and safe loading utilities

export const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/webm'];

export const MAX_IMAGE_SIZE_BYTES = 30 * 1024 * 1024; // 30 MB
export const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  type?: 'image' | 'video';
}

export function validateMediaFile(file: File): FileValidationResult {
  const type = file.type.toLowerCase();

  if (SUPPORTED_IMAGE_TYPES.includes(type)) {
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return { valid: false, error: `Image exceeds maximum allowed size of 30 MB (${(file.size / (1024 * 1024)).toFixed(1)} MB)` };
    }
    return { valid: true, type: 'image' };
  }

  if (SUPPORTED_VIDEO_TYPES.includes(type)) {
    if (file.size > MAX_VIDEO_SIZE_BYTES) {
      return { valid: false, error: `Video exceeds maximum allowed size of 100 MB (${(file.size / (1024 * 1024)).toFixed(1)} MB)` };
    }
    return { valid: true, type: 'video' };
  }

  return {
    valid: false,
    error: `Unsupported format (${file.type || 'unknown'}). Supported: JPG, JPEG, PNG, WEBP, MP4, WEBM.`
  };
}

export function validateDepthMapFile(file: File): FileValidationResult {
  const type = file.type.toLowerCase();
  if (!SUPPORTED_IMAGE_TYPES.includes(type)) {
    return { valid: false, error: 'Depth map must be an image (PNG, JPG, or WEBP).' };
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return { valid: false, error: 'Depth map file too large (Max 30 MB).' };
  }
  return { valid: true, type: 'image' };
}

/**
 * Safely decodes an image file and validates that it can be rendered onto an HTMLCanvasElement
 */
export async function decodeAndValidateImage(file: File): Promise<{ image: HTMLImageElement; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      if (img.naturalWidth === 0 || img.naturalHeight === 0) {
        reject(new Error('Image has zero dimensions or is corrupted.'));
        return;
      }
      resolve({
        image: img,
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to decode image data. The file might be corrupted or in an unsupported encoding.'));
    };

    img.src = objectUrl;
  });
}
