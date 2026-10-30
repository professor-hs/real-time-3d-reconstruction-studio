import * as THREE from 'three';
import { EngineRenderer } from './Renderer';
import { PointCloudManager } from './PointCloud';
import { VideoProcessor } from './VideoProcessor';
import { DepthProcessor } from './DepthProcessor';
import { PlyExporter, PlyExportResult } from './PlyExporter';
import { BenchmarkRunner } from './Benchmark';
import { createProceduralSampleCanvas, createSampleDepthMapCanvas } from '../utils/sampleScene';
import { decodeAndValidateImage } from '../utils/fileValidation';
import {
  BenchmarkResult,
  GPUStats,
  MediaMetadata,
  ReconstructionSettings,
  Resolution,
  SourceType,
  ViewportMode,
} from '../types';

export class ReconstructionEngine {
  public renderer: EngineRenderer | null = null;
  public pointCloud: PointCloudManager;
  public videoProcessor: VideoProcessor;

  // Active sources
  private currentSourceType: SourceType = 'sample';
  private currentImageElement: HTMLCanvasElement | HTMLImageElement | null = null;
  private currentDepthElement: HTMLCanvasElement | HTMLImageElement | null = null;
  private currentTexture: THREE.Texture | null = null;
  private currentDepthTexture: THREE.Texture | null = null;

  // Metadata & Settings
  public metadata: MediaMetadata = {
    name: 'Procedural Sample Scene',
    width: 1024,
    height: 768,
    aspectRatio: 1024 / 768,
    fileSize: 0,
    type: 'sample',
  };

  public settings: ReconstructionSettings = {
    depthMethod: 'luminance',
    resolution: 256,
    depthIntensity: 1.2,
    pointSize: 3.5,
    contrast: 1.1,
    brightness: 1.0,
    edgeInfluence: 1.4,
    colorMode: 'rgb',
    invertDepth: false,
    wireframe: false,
    showGrid: true,
    showAxes: true,
    autoRotate: false,
    animatePoints: false,
    backgroundColor: '#0B0E13',
  };

  public viewportMode: ViewportMode = 'pointcloud';

  private onMetadataChange?: (meta: MediaMetadata) => void;
  private onStatsChange?: (stats: GPUStats) => void;

  constructor(
    onMetadataChange?: (meta: MediaMetadata) => void,
    onStatsChange?: (stats: GPUStats) => void
  ) {
    this.onMetadataChange = onMetadataChange;
    this.onStatsChange = onStatsChange;
    this.pointCloud = new PointCloudManager();
    this.videoProcessor = new VideoProcessor((videoState) => {
      if (this.currentSourceType === 'video') {
        this.metadata = {
          ...this.metadata,
          currentTime: videoState.currentTime,
          duration: videoState.duration,
          isPlaying: videoState.isPlaying,
        };
        this.onMetadataChange?.(this.metadata);
      }
    });
  }

  public init(canvas: HTMLCanvasElement): boolean {
    this.renderer = new EngineRenderer(canvas, (stats) => {
      this.onStatsChange?.(stats);
    });

    if (!this.renderer.getWebGL2Supported()) {
      return false;
    }

    // Default to loading procedural sample scene
    this.loadSampleScene();

    // Start render loop
    this.renderer.start((elapsedSec) => {
      this.pointCloud.updateTime(elapsedSec);
    });

    return true;
  }

  /**
   * Generates procedural canvas scene and initializes GPU point cloud
   */
  public loadSampleScene() {
    this.videoProcessor.dispose();
    this.currentSourceType = 'sample';

    const canvas = createProceduralSampleCanvas(1024, 768);
    this.currentImageElement = canvas;

    // Optional matching depth map
    const depthCanvas = createSampleDepthMapCanvas(1024, 768);
    this.currentDepthElement = depthCanvas;

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.currentTexture = texture;
    this.pointCloud.setImageTexture(texture);

    const dTexture = new THREE.CanvasTexture(depthCanvas);
    this.currentDepthTexture = dTexture;
    this.pointCloud.setDepthTexture(dTexture);

    this.metadata = {
      name: 'Synthetic Alpine Laboratory Scene',
      width: 1024,
      height: 768,
      aspectRatio: 1024 / 768,
      fileSize: 1024 * 768 * 4,
      type: 'sample',
    };
    this.onMetadataChange?.(this.metadata);

    this.rebuildPointCloud();
  }

  /**
   * Uploads and decodes user image file (JPG, PNG, WEBP)
   */
  public async loadImage(file: File): Promise<void> {
    this.videoProcessor.dispose();
    this.currentSourceType = 'image';

    const decoded = await decodeAndValidateImage(file);
    this.currentImageElement = decoded.image;

    const texture = new THREE.Texture(decoded.image);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    this.currentTexture = texture;
    this.pointCloud.setImageTexture(texture);

    this.metadata = {
      name: file.name,
      width: decoded.width,
      height: decoded.height,
      aspectRatio: decoded.width / decoded.height,
      fileSize: file.size,
      type: 'image',
    };
    this.onMetadataChange?.(this.metadata);

    this.rebuildPointCloud();
  }

  /**
   * Uploads and connects user video file (MP4, WEBM)
   */
  public async loadVideo(file: File): Promise<void> {
    this.currentSourceType = 'video';

    const videoData = await this.videoProcessor.loadVideo(file);
    this.currentImageElement = null;
    this.currentTexture = videoData.texture;
    this.pointCloud.setImageTexture(videoData.texture);

    this.metadata = {
      name: file.name,
      width: videoData.width,
      height: videoData.height,
      aspectRatio: videoData.width / videoData.height,
      fileSize: file.size,
      type: 'video',
      duration: videoData.duration,
      currentTime: 0,
      isPlaying: true,
    };
    this.onMetadataChange?.(this.metadata);

    this.rebuildPointCloud();
    await this.videoProcessor.play();
  }

  /**
   * Uploads a separate grayscale depth map
   */
  public async loadDepthMap(file: File): Promise<void> {
    const decoded = await decodeAndValidateImage(file);
    this.currentDepthElement = decoded.image;

    const texture = new THREE.Texture(decoded.image);
    texture.needsUpdate = true;
    this.currentDepthTexture = texture;
    this.pointCloud.setDepthTexture(texture);

    // Auto-select Imported depth map method
    this.settings.depthMethod = 'imported';
    this.pointCloud.updateSettings(this.settings, this.metadata.aspectRatio);
  }

  public clearDepthMap(): void {
    this.currentDepthElement = null;
    this.currentDepthTexture = null;
    this.pointCloud.setDepthTexture(null);
    if (this.settings.depthMethod === 'imported') {
      this.settings.depthMethod = 'luminance';
    }
    this.pointCloud.updateSettings(this.settings, this.metadata.aspectRatio);
  }

  public rebuildPointCloud() {
    if (!this.renderer) return;

    const pointsObj = this.pointCloud.buildPointCloud(this.settings, this.metadata.aspectRatio);

    if (!this.renderer.scene.children.includes(pointsObj)) {
      this.renderer.scene.add(pointsObj);
    }

    this.renderer.applySettings(this.settings, this.viewportMode);
  }

  public updateSettings(newSettings: Partial<ReconstructionSettings>) {
    const prevResolution = this.settings.resolution;
    this.settings = { ...this.settings, ...newSettings };

    if (this.settings.resolution !== prevResolution) {
      this.rebuildPointCloud();
    } else {
      this.pointCloud.updateSettings(this.settings, this.metadata.aspectRatio);
      if (this.renderer) {
        this.renderer.applySettings(this.settings, this.viewportMode);
      }
    }
  }

  public setResolution(resolution: Resolution) {
    this.updateSettings({ resolution });
  }

  public setViewportMode(mode: ViewportMode) {
    this.viewportMode = mode;
    if (this.renderer) {
      this.renderer.applySettings(this.settings, mode);
    }
  }

  public resetCamera() {
    this.renderer?.resetCamera();
  }

  /**
   * Exports reconstructed 3D point cloud into ASCII PLY
   */
  public async exportPly(): Promise<PlyExportResult> {
    let sourceElement: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement | null = this.currentImageElement;

    if (this.currentSourceType === 'video' && this.videoProcessor.videoTexture?.image) {
      sourceElement = this.videoProcessor.videoTexture.image as HTMLVideoElement;
    }

    if (!sourceElement) {
      throw new Error('No valid visual media source available for point cloud export.');
    }

    return await PlyExporter.exportPly(
      sourceElement,
      this.currentDepthElement,
      this.settings,
      this.metadata.aspectRatio
    );
  }

  /**
   * Runs CPU vs GPU Benchmark
   */
  public async runBenchmark(): Promise<BenchmarkResult> {
    if (!this.renderer || !this.renderer.renderer) {
      throw new Error('WebGL2 Renderer is not active.');
    }

    let sourceElement: HTMLCanvasElement | HTMLImageElement | null = null;
    if (this.currentImageElement instanceof HTMLCanvasElement || this.currentImageElement instanceof HTMLImageElement) {
      sourceElement = this.currentImageElement;
    } else {
      // Fallback: draw video or sample canvas to temporary canvas
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 512;
      tempCanvas.height = 512;
      const ctx = tempCanvas.getContext('2d');
      if (this.videoProcessor.videoTexture?.image && ctx) {
        ctx.drawImage(this.videoProcessor.videoTexture.image, 0, 0, 512, 512);
      }
      sourceElement = tempCanvas;
    }

    return await BenchmarkRunner.runFullBenchmark(
      sourceElement,
      this.renderer.renderer,
      this.renderer.scene,
      this.renderer.camera,
      this.settings.resolution
    );
  }

  public getDepthPreviewCanvas(): HTMLCanvasElement | null {
    let sourceElement: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement | null = this.currentImageElement;
    if (this.currentSourceType === 'video' && this.videoProcessor.videoTexture?.image) {
      sourceElement = this.videoProcessor.videoTexture.image as HTMLVideoElement;
    }
    if (!sourceElement) return null;

    if (this.settings.depthMethod === 'imported' && this.currentDepthElement) {
      return DepthProcessor.generateDepthPreviewCanvas(this.currentDepthElement, this.settings, 256, 256);
    }

    return DepthProcessor.generateDepthPreviewCanvas(sourceElement, this.settings, 256, 256);
  }

  public getActiveSourceCanvas(): HTMLCanvasElement | HTMLImageElement | null {
    return this.currentImageElement;
  }

  public getActiveDepthCanvas(): HTMLCanvasElement | HTMLImageElement | null {
    return this.currentDepthElement;
  }

  public dispose() {
    this.videoProcessor.dispose();
    this.pointCloud.dispose();
    this.renderer?.dispose();
    if (this.currentTexture) {
      this.currentTexture.dispose();
    }
    if (this.currentDepthTexture) {
      this.currentDepthTexture.dispose();
    }
  }
}
