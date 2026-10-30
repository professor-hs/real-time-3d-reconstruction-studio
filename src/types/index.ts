export type DepthMethod = 'luminance' | 'contrast' | 'imported';

export type ColorMode = 'rgb' | 'grayscale' | 'height' | 'neon';

export type Resolution = 128 | 256 | 512;

export type ViewportMode = 'pointcloud' | 'pointcloud-grid' | 'original' | 'depthmap';

export type SourceType = 'sample' | 'image' | 'video';

export interface ReconstructionSettings {
  depthMethod: DepthMethod;
  resolution: Resolution;
  depthIntensity: number; // 0.0 - 4.0
  pointSize: number;       // 1.0 - 15.0
  contrast: number;        // 0.2 - 3.0
  brightness: number;      // 0.2 - 2.0
  edgeInfluence: number;   // 0.0 - 4.0
  colorMode: ColorMode;
  invertDepth: boolean;
  wireframe: boolean;
  showGrid: boolean;
  showAxes: boolean;
  autoRotate: boolean;
  animatePoints: boolean;
  backgroundColor: string; // Hex color for background
}

export interface MediaMetadata {
  name: string;
  width: number;
  height: number;
  aspectRatio: number;
  fileSize: number; // bytes
  type: SourceType;
  duration?: number;
  currentTime?: number;
  isPlaying?: boolean;
}

export interface GPUStats {
  isWebGL2: boolean;
  rendererName: string;
  vendorName: string;
  fps: number;
  frameTimeMs: number;
  pointCount: number;
  drawCalls: number;
  geometriesCount: number;
  texturesCount: number;
  estimatedBufferBytes: number;
  hasTimerQuery: boolean;
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
