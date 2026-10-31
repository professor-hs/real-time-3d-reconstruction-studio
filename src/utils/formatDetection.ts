import { FileMetadata, SupportedFileFormat, SupportedImageFormat } from '../types';

export const SUPPORTED_IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg'];
export const SUPPORTED_VIDEO_EXTENSIONS = ['mp4'];
export const ALL_SUPPORTED_EXTENSIONS = [...SUPPORTED_IMAGE_EXTENSIONS, ...SUPPORTED_VIDEO_EXTENSIONS];

export interface FormatValidationResult {
  isValid: boolean;
  format?: SupportedFileFormat;
  extension?: string;
  errorMessage?: string;
}

/**
 * Validates whether the given File is supported (PNG, JPG, JPEG, MP4)
 * and accurately detects its format and normalized extension.
 */
export function validateAndDetectFormat(file: File): FormatValidationResult {
  const name = file.name.toLowerCase();
  const lastDot = name.lastIndexOf('.');
  if (lastDot === -1) {
    return {
      isValid: false,
      errorMessage: `File "${file.name}" has no extension. Supported formats: PNG, JPG, JPEG, MP4.`,
    };
  }

  const rawExt = name.slice(lastDot + 1);
  let detectedFormat: SupportedFileFormat | undefined;
  let normalizedExt: string = rawExt;

  if (rawExt === 'png') {
    detectedFormat = 'png';
    normalizedExt = 'png';
  } else if (rawExt === 'jpg') {
    detectedFormat = 'jpg';
    normalizedExt = 'jpg';
  } else if (rawExt === 'jpeg') {
    detectedFormat = 'jpeg';
    normalizedExt = 'jpeg';
  } else if (rawExt === 'mp4') {
    detectedFormat = 'mp4';
    normalizedExt = 'mp4';
  } else if (file.type === 'image/png') {
    detectedFormat = 'png';
    normalizedExt = 'png';
  } else if (file.type === 'image/jpeg') {
    detectedFormat = 'jpg';
    normalizedExt = 'jpg';
  } else if (file.type === 'video/mp4') {
    detectedFormat = 'mp4';
    normalizedExt = 'mp4';
  }

  if (!detectedFormat) {
    return {
      isValid: false,
      errorMessage: `Unsupported file format ".${rawExt}". Only PNG, JPG, JPEG, and MP4 are supported.`,
    };
  }

  return {
    isValid: true,
    format: detectedFormat,
    extension: normalizedExt,
  };
}

/**
 * Asynchronously extracts metadata from an uploaded image or video file.
 */
export async function extractFileMetadata(file: File): Promise<FileMetadata> {
  const validation = validateAndDetectFormat(file);
  if (!validation.isValid || !validation.format || !validation.extension) {
    throw new Error(validation.errorMessage || 'Invalid file format.');
  }

  const objectUrl = URL.createObjectURL(file);

  if (validation.format === 'mp4') {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.src = objectUrl;

      video.onloadedmetadata = () => {
        const width = video.videoWidth || 1920;
        const height = video.videoHeight || 1080;
        resolve({
          name: file.name,
          sizeBytes: file.size,
          format: 'mp4',
          extension: validation.extension!,
          mimeType: file.type || 'video/mp4',
          width,
          height,
          duration: video.duration || 0,
          aspectRatio: width / height,
          objectUrl,
        });
      };

      video.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error(`Failed to decode MP4 video metadata for "${file.name}".`));
      };
    });
  }

  // Image format
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = objectUrl;

    img.onload = () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      resolve({
        name: file.name,
        sizeBytes: file.size,
        format: validation.format as SupportedImageFormat,
        extension: validation.extension!,
        mimeType: file.type || (validation.format === 'png' ? 'image/png' : 'image/jpeg'),
        width,
        height,
        aspectRatio: width / height,
        objectUrl,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Failed to decode image metadata for "${file.name}".`));
    };
  });
}

/**
 * Builds the output filename preserving the original uploaded format and extension.
 */
export function buildOutputFilename(
  originalFilename: string,
  suffix: string = 'enhanced'
): string {
  const lastDot = originalFilename.lastIndexOf('.');
  if (lastDot === -1) {
    return `${originalFilename}_${suffix}`;
  }
  const base = originalFilename.slice(0, lastDot);
  const ext = originalFilename.slice(lastDot + 1);
  return `${base}_${suffix}.${ext}`;
}
