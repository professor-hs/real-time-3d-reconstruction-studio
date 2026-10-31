// Comprehensive Type Definitions for GPU Reconstruction & Photo Enhancement Studio

export type StudioWorkspace = 'reconstruction' | 'enhancement' | 'video' | 'benchmark';
export type StudioModule = 'world' | 'medical';

// ============================================================================
// FILE FORMAT & METADATA TYPES
// ============================================================================
export type SupportedImageFormat = 'png' | 'jpg' | 'jpeg';
export type SupportedVideoFormat = 'mp4';
export type SupportedFileFormat = SupportedImageFormat | SupportedVideoFormat;

export interface FileMetadata {
  name: string;
  sizeBytes: number;
  format: SupportedFileFormat;
  extension: string;
  mimeType: string;
  width: number;
  height: number;
  duration?: number;
  aspectRatio: number;
  objectUrl: string;
}

// ============================================================================
// PHOTO ENHANCEMENT TYPES
// ============================================================================
export type UpscaleFactor = 1 | 2 | 4;

export interface PhotoEnhancementSettings {
  upscale: UpscaleFactor;
  sharpen: number;         // 0.0 to 2.0
  denoise: number;         // 0.0 to 1.0 (bilateral filter)
  blurReduction: number;   // 0.0 to 1.0 (deblur / high-pass compensation)
  brightness: number;      // -1.0 to 1.0 (0.0 is neutral)
  contrast: number;        // 0.2 to 2.5 (1.0 is neutral)
  gamma: number;           // 0.2 to 2.5 (1.0 is neutral)
  saturation: number;      // 0.0 to 2.5 (1.0 is neutral)
  temperature: number;     // -1.0 to 1.0 (cool to warm white balance)
  tint: number;            // -1.0 to 1.0 (green to magenta tint)
  jpegQuality: number;     // 0.5 to 1.0 (for jpg/jpeg export)
}

export const DEFAULT_PHOTO_SETTINGS: PhotoEnhancementSettings = {
  upscale: 1,
  sharpen: 0.0,
  denoise: 0.0,
  blurReduction: 0.0,
  brightness: 0.0,
  contrast: 1.0,
  gamma: 1.0,
  saturation: 1.0,
  temperature: 0.0,
  tint: 0.0,
  jpegQuality: 0.92,
};

// ============================================================================
// VIDEO PROCESSING TYPES
// ============================================================================
export interface VideoProcessingSettings {
  brightness: number;      // -1.0 to 1.0
  contrast: number;        // 0.2 to 2.5
  gamma: number;           // 0.2 to 2.5
  saturation: number;      // 0.0 to 2.5
  sharpen: number;         // 0.0 to 2.0
  denoise: number;         // 0.0 to 1.0
  temperature: number;     // -1.0 to 1.0
  tint: number;            // -1.0 to 1.0
}

export const DEFAULT_VIDEO_SETTINGS: VideoProcessingSettings = {
  brightness: 0.0,
  contrast: 1.0,
  gamma: 1.0,
  saturation: 1.0,
  sharpen: 0.0,
  denoise: 0.0,
  temperature: 0.0,
  tint: 0.0,
};

export interface VideoProcessingProgress {
  isProcessing: boolean;
  currentFrame: number;
  totalFrames: number;
  percent: number;
  estimatedTimeSec: number;
  statusMessage: string;
}

// ============================================================================
// 3D RECONSTRUCTION TYPES
// ============================================================================
export type WorldRenderMode = 'solid' | 'points' | 'wireframe';
export type DepthMethod = 'luminance' | 'contrast' | 'imported';
export type ColorMode = 'rgb' | 'grayscale' | 'height' | 'neon';
export type Resolution = 128 | 256 | 512;

export interface WorldSettings {
  renderMode: WorldRenderMode;
  depthMethod: DepthMethod;
  resolution: Resolution;
  depthIntensity: number;  // 0.0 to 4.0
  pointSize: number;       // 1.0 to 12.0
  contrast: number;        // 0.2 to 2.5
  brightness: number;      // 0.2 to 2.0
  edgeInfluence: number;   // 0.0 to 3.0
  smoothness: number;      // 0.0 to 2.0
  colorMode: ColorMode;
  invertDepth: boolean;
  showGrid: boolean;
  showAxes: boolean;
  autoRotate: boolean;
  roughness: number;
  metalness: number;
  backgroundColor: string;
}

export const DEFAULT_WORLD_SETTINGS: WorldSettings = {
  renderMode: 'solid',
  depthMethod: 'luminance',
  resolution: 256,
  depthIntensity: 1.2,
  pointSize: 3.5,
  contrast: 1.1,
  brightness: 1.0,
  edgeInfluence: 1.4,
  smoothness: 1.0,
  colorMode: 'rgb',
  invertDepth: false,
  showGrid: true,
  showAxes: true,
  autoRotate: false,
  roughness: 0.4,
  metalness: 0.1,
  backgroundColor: '#090D13',
};

export interface WorldMediaMetadata {
  name: string;
  width: number;
  height: number;
  aspectRatio: number;
  fileSize: number;
  type: 'sample' | 'image' | 'multi-image' | 'video';
  imageCount?: number;
  duration?: number;
  currentTime?: number;
  isPlaying?: boolean;
}

export interface FeaturePoint {
  x: number;
  y: number;
  score: number;
}

export interface FeatureMatch {
  p1: FeaturePoint;
  p2: FeaturePoint;
  distance: number;
}

export interface MultiViewResult {
  imageNames: string[];
  totalMatches: number;
  matches: FeatureMatch[];
  sparseCloud: { x: number; y: number; z: number; color: [number, number, number] }[];
  cameraPoses: { position: [number, number, number]; rotation: [number, number, number] }[];
  status: 'calibrated' | 'uncalibrated_features' | 'insufficient_overlap';
  statusExplanation: string;
}

// ============================================================================
// CPU VS GPU BENCHMARK TYPES
// ============================================================================
export type BenchmarkOperation = 'sharpen' | 'denoise' | 'color_adjust' | 'resample_2x';

export interface BenchmarkMetrics {
  operation: BenchmarkOperation;
  operationName: string;
  imageWidth: number;
  imageHeight: number;
  totalPixels: number;
  iterations: number;
  cpuTimeMs: number;
  gpuTimeMs: number;
  speedup: number;              // cpuTimeMs / gpuTimeMs
  timeSavedMs: number;          // cpuTimeMs - gpuTimeMs
  percentReduction: number;     // ((cpu - gpu) / cpu) * 100
  cpuMegapixelsPerSec: number;
  gpuMegapixelsPerSec: number;
}

export interface BenchmarkResult {
  resolution: number;
  pixelCount: number;
  cpuTimeMs: number;
  gpuTimeMs: number;
  speedup: number | null;
  method: string;
  timestamp: string;
  isApproximateGpu: boolean;
}

// ============================================================================
// GPU TELEMETRY TYPES
// ============================================================================
export interface GPUStats {
  isWebGL2: boolean;
  rendererName: string;
  vendorName: string;
  fps: number;
  frameTimeMs: number;
  drawCalls: number;
  verticesCount: number;
  trianglesCount: number;
  pointCount: number;
  texturesCount: number;
  estimatedVramBytes: number;
  glVersion: string;
  shadingLanguageVersion: string;
}

// ============================================================================
// MEDICAL MODULE TYPES (Preserved for compatibility)
// ============================================================================
export type MedicalRenderMode = 'dvr' | 'mip' | 'minip' | 'avgip' | 'isosurface';
export type MedicalModality = 'CT' | 'MR' | 'PET' | 'SYNTHETIC';

export interface MedicalVolumeData {
  dimensions: [number, number, number];
  spacing: [number, number, number];
  data: Float32Array;
  minVal: number;
  maxVal: number;
}

export interface MedicalVolumeMetadata {
  seriesDescription: string;
  modality: MedicalModality;
  dimensions: [number, number, number];
  voxelSpacing: [number, number, number];
  windowCenter: number;
  windowWidth: number;
  minHU: number;
  maxHU: number;
  sliceCount: number;
  patientId: string;
  isSynthetic: boolean;
}

export interface MedicalSettings {
  renderMode: MedicalRenderMode;
  windowCenter: number;
  windowWidth: number;
  opacity: number;
  stepSize: number;
  brightness: number;
  isosurfaceThreshold: number;
  surfaceColor: string;
  surfaceOpacity: number;
  showBoundingBox: boolean;
  showSlicesIn3D: boolean;
  activeSlice: {
    axial: number;
    coronal: number;
    sagittal: number;
  };
}
