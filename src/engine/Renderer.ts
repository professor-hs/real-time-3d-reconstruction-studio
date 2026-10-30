import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GPUStats, ReconstructionSettings, ViewportMode } from '../types';

export class EngineRenderer {
  public canvas: HTMLCanvasElement;
  public renderer: THREE.WebGLRenderer | null = null;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public controls: OrbitControls | null = null;
  public gridHelper: THREE.GridHelper | null = null;
  public axesHelper: THREE.AxesHelper | null = null;

  private isWebGL2Supported = false;
  private rendererInfo: { renderer: string; vendor: string; glVersion: string; slVersion: string; hasTimerQuery: boolean } = {
    renderer: 'Unknown',
    vendor: 'Unknown',
    glVersion: 'Unknown',
    slVersion: 'Unknown',
    hasTimerQuery: false,
  };

  private animationFrameId: number | null = null;
  private isRunning = false;
  private lastFrameTimestamp = performance.now();
  private frameCount = 0;
  private fpsAccumulator = 0;
  private currentFps = 60;
  private currentFrameTimeMs = 16.6;

  private onStatsCallback?: (stats: GPUStats) => void;

  constructor(canvas: HTMLCanvasElement, onStats?: (stats: GPUStats) => void) {
    this.canvas = canvas;
    this.onStatsCallback = onStats;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0B0E13');

    // Camera with 60 deg FOV, aspect set later
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    this.camera.position.set(0, 0, 3.2);

    this.initWebGL2Renderer();
  }

  private initWebGL2Renderer(): boolean {
    // Probe for WebGL2 capability
    const testContext = this.canvas.getContext('webgl2');
    if (!testContext) {
      this.isWebGL2Supported = false;
      return false;
    }
    this.isWebGL2Supported = true;

    // Detect actual hardware renderer and unmasked vendor
    const debugInfo = testContext.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      this.rendererInfo.vendor = testContext.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || 'Browser WebGL2';
      this.rendererInfo.renderer = testContext.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'GPU Accelerator';
    } else {
      this.rendererInfo.vendor = testContext.getParameter(testContext.VENDOR) || 'WebGL2 Vendor';
      this.rendererInfo.renderer = testContext.getParameter(testContext.RENDERER) || 'WebGL2 Device';
    }

    this.rendererInfo.glVersion = testContext.getParameter(testContext.VERSION) || 'WebGL 2.0';
    this.rendererInfo.slVersion = testContext.getParameter(testContext.SHADING_LANGUAGE_VERSION) || 'GLSL ES 3.00';
    this.rendererInfo.hasTimerQuery = !!testContext.getExtension('EXT_disjoint_timer_query_webgl2');

    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        context: testContext,
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;

      // OrbitControls for intuitive navigation
      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
      this.controls.rotateSpeed = 0.8;
      this.controls.zoomSpeed = 1.0;
      this.controls.panSpeed = 0.8;
      this.controls.minDistance = 0.5;
      this.controls.maxDistance = 20;

      // Coordinate axes & Ground Grid
      this.gridHelper = new THREE.GridHelper(4, 20, 0x3b82f6, 0x1e293b);
      this.gridHelper.rotation.x = Math.PI / 2;
      this.gridHelper.position.z = -0.05;
      this.scene.add(this.gridHelper);

      this.axesHelper = new THREE.AxesHelper(1.2);
      this.scene.add(this.axesHelper);

      this.setupContextLossHandling();
      return true;
    } catch (err) {
      console.error('Failed to initialize WebGL2 renderer:', err);
      this.isWebGL2Supported = false;
      return false;
    }
  }

  private setupContextLossHandling() {
    this.canvas.addEventListener(
      'webglcontextlost',
      (e) => {
        e.preventDefault();
        console.warn('WebGL context lost. Pausing rendering.');
        this.stop();
      },
      false
    );

    this.canvas.addEventListener(
      'webglcontextrestored',
      () => {
        console.info('WebGL context restored. Reinitializing pipeline.');
        this.initWebGL2Renderer();
        this.start();
      },
      false
    );
  }

  public resize(width: number, height: number) {
    if (!this.renderer || width === 0 || height === 0) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  public resetCamera() {
    this.camera.position.set(0, 0, 3.2);
    this.camera.lookAt(0, 0, 0);
    if (this.controls) {
      this.controls.target.set(0, 0, 0);
      this.controls.update();
    }
  }

  public applySettings(settings: ReconstructionSettings, viewportMode: ViewportMode) {
    if (this.scene) {
      this.scene.background = new THREE.Color(settings.backgroundColor);
    }

    if (this.controls) {
      this.controls.autoRotate = settings.autoRotate;
      this.controls.autoRotateSpeed = 1.8;
    }

    const showGrid = (viewportMode === 'pointcloud-grid' || settings.showGrid) && viewportMode !== 'original' && viewportMode !== 'depthmap';
    if (this.gridHelper) {
      this.gridHelper.visible = showGrid;
    }

    if (this.axesHelper) {
      this.axesHelper.visible = settings.showAxes && viewportMode !== 'original' && viewportMode !== 'depthmap';
    }
  }

  public start(onRenderTick?: (timeSec: number) => void) {
    if (this.isRunning) return;
    this.isRunning = true;

    const clock = new THREE.Clock();

    const loop = () => {
      if (!this.isRunning) return;
      this.animationFrameId = requestAnimationFrame(loop);

      const frameStart = performance.now();
      const elapsedSec = clock.getElapsedTime();

      if (this.controls) {
        this.controls.update();
      }

      if (onRenderTick) {
        onRenderTick(elapsedSec);
      }

      if (this.renderer) {
        this.renderer.render(this.scene, this.camera);
      }

      const frameEnd = performance.now();
      const frameDuration = frameEnd - frameStart;

      // FPS tracking
      this.frameCount++;
      this.fpsAccumulator += (1000.0 / Math.max(frameDuration, 1.0));

      if (frameEnd - this.lastFrameTimestamp >= 500) {
        this.currentFps = Math.round(this.fpsAccumulator / this.frameCount);
        this.currentFrameTimeMs = parseFloat((500 / this.frameCount).toFixed(1));
        this.frameCount = 0;
        this.fpsAccumulator = 0;
        this.lastFrameTimestamp = frameEnd;

        if (this.onStatsCallback && this.renderer) {
          const info = this.renderer.info;
          this.onStatsCallback({
            isWebGL2: this.isWebGL2Supported,
            rendererName: this.rendererInfo.renderer,
            vendorName: this.rendererInfo.vendor,
            fps: Math.min(this.currentFps, 120),
            frameTimeMs: this.currentFrameTimeMs,
            pointCount: info.render.points,
            drawCalls: info.render.calls,
            geometriesCount: info.memory.geometries,
            texturesCount: info.memory.textures,
            estimatedBufferBytes: info.render.points * 20,
            hasTimerQuery: this.rendererInfo.hasTimerQuery,
            glVersion: this.rendererInfo.glVersion,
            shadingLanguageVersion: this.rendererInfo.slVersion,
          });
        }
      }
    };

    loop();
  }

  public stop() {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public getWebGL2Supported(): boolean {
    return this.isWebGL2Supported;
  }

  public getRendererInfo() {
    return this.rendererInfo;
  }

  public dispose() {
    this.stop();
    if (this.controls) {
      this.controls.dispose();
      this.controls = null;
    }
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
    if (this.gridHelper) {
      this.scene.remove(this.gridHelper);
      this.gridHelper.geometry.dispose();
    }
    if (this.axesHelper) {
      this.scene.remove(this.axesHelper);
      this.axesHelper.geometry.dispose();
    }
  }
}
