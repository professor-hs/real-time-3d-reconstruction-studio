// Comprehensive Type Definitions for NeuroVision 3D Studio

export type StudioModule = 'world' | 'medical';

// ============================================================================
// MODULE A: WORLD RECONSTRUCTION TYPES
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
// MODULE B: MEDICAL RECONSTRUCTION TYPES
// ============================================================================
export type MedicalRenderMode = 'dvr' | 'mip' | 'minip' | 'avgip' | 'isosurface';
export type MedicalModality = 'CT' | 'MR' | 'PET' | 'SYNTHETIC';

export interface MedicalVolumeData {
  dimensions: [number, number, number]; // [width, height, depth]
  spacing: [number, number, number];    // [dx, dy, dz] in mm
  data: Float32Array;                   // Calibrated scalar field (HU for CT, normalized intensity for MR)
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
  windowCenter: number;       // HU Level (e.g. 40 for soft tissue, 400 for bone)
  windowWidth: number;        // HU Width (e.g. 400 for soft tissue, 1500 for bone)
  opacity: number;            // 0.1 to 3.0
  stepSize: number;           // 0.001 to 0.02
  brightness: number;         // 0.2 to 2.5
  isosurfaceThreshold: number;// HU isovalue for Marching Cubes (e.g. 200 for bone)
  surfaceColor: string;       // Hex color for anatomical surface
  surfaceOpacity: number;
  showBoundingBox: boolean;
  showSlicesIn3D: boolean;
  activeSlice: {
    axial: number;
    coronal: number;
    sagittal: number;
  };
}

// ============================================================================
// SHARED GPU ENGINE & TELEMETRY TYPES
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

export interface BenchmarkResult {
  resolution: number;
  pixelCount: number;
  cpuTimeMs: number;
  gpuTimeMs: number | null;
  speedup: number | null;
  method: string;
  timestamp: string;
  isApproximateGpu: boolean;
}
