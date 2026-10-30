// Shared High-Performance WebGL2 Three.js Renderer for NeuroVision 3D
// Manages WebGL2 Rendering Context, OrbitControls, Camera, Lighting, and Hardware Telemetry.

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GPUStats } from '../types';

export class EngineRenderer {
  public canvas: HTMLCanvasElement;
  public renderer: THREE.WebGLRenderer | null = null;
  public camera: THREE.PerspectiveCamera;
  public controls: OrbitControls | null = null;

  // Active scene pointer (swappable between World and Medical scenes)
  public activeScene: THREE.Scene;
  public gridHelper: THREE.GridHelper;
  public axesHelper: THREE.AxesHelper;
  public dirLight: THREE.DirectionalLight;
  public ambLight: THREE.AmbientLight;

  private isWebGL2Supported = false;
  private rendererInfo = {
    renderer: 'Hardware GPU',
    vendor: 'Unmasked Vendor',
    glVersion: 'WebGL 2.0',
    slVersion: 'GLSL ES 3.00',
  };

  private animationFrameId: number | null = null;
  private isRunning = false;
  private lastFrameTimestamp = performance.now();
  private frameCount = 0;
  private fpsAccumulator = 0;
  private currentFps = 60;
  private currentFrameTimeMs = 16.6;

  private onStatsCallback?: (stats: GPUStats) => void;

  constructor(
    canvas: HTMLCanvasElement,
    initialScene: THREE.Scene,
    onStats?: (stats: GPUStats) => void
  ) {
    this.canvas = canvas;
    this.activeScene = initialScene;
    this.onStatsCallback = onStats;

    this.camera = new THREE.PerspectiveCamera(55, 1, 0.05, 100);
    this.camera.position.set(0, 0, 2.8);

    // Helpers
    this.gridHelper = new THREE.GridHelper(3.5, 18, 0x3b82f6, 0x1e293b);
    this.gridHelper.rotation.x = Math.PI / 2;
    this.gridHelper.position.z = -0.05;

    this.axesHelper = new THREE.AxesHelper(0.8);

    // Lights
    this.dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    this.dirLight.position.set(2, 4, 3);

    this.ambLight = new THREE.AmbientLight(0xffffff, 0.4);

    this.initWebGL2Renderer();
  }

  private initWebGL2Renderer(): boolean {
    const testContext = this.canvas.getContext('webgl2', {
      alpha: false,
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
    });

    if (!testContext) {
      this.isWebGL2Supported = false;
      return false;
    }
    this.isWebGL2Supported = true;

    // Detect unmasked hardware GPU
    const debugInfo = testContext.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      this.rendererInfo.vendor = testContext.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || 'Browser Vendor';
      this.rendererInfo.renderer = testContext.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'GPU Accelerator';
    } else {
      this.rendererInfo.vendor = testContext.getParameter(testContext.VENDOR) || 'WebGL2 Vendor';
      this.rendererInfo.renderer = testContext.getParameter(testContext.RENDERER) || 'WebGL2 Device';
    }

    this.rendererInfo.glVersion = testContext.getParameter(testContext.VERSION) || 'WebGL 2.0';
    this.rendererInfo.slVersion = testContext.getParameter(testContext.SHADING_LANGUAGE_VERSION) || 'GLSL ES 3.00';

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

      // OrbitControls for 3D interaction
      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
      this.controls.rotateSpeed = 0.8;
      this.controls.zoomSpeed = 1.0;
      this.controls.panSpeed = 0.8;
      this.controls.minDistance = 0.2;
      this.controls.maxDistance = 25;

      this.attachHelpersAndLights(this.activeScene);
      return true;
    } catch (err) {
      console.error('Failed to initialize WebGL2 renderer:', err);
      this.isWebGL2Supported = false;
      return false;
    }
  }

  /**
   * Switches the active scene without destroying the WebGL2 context
   */
  public switchScene(newScene: THREE.Scene, defaultCameraDist = 2.8) {
    if (this.activeScene) {
      this.detachHelpersAndLights(this.activeScene);
    }
    this.activeScene = newScene;
    this.attachHelpersAndLights(newScene);

    this.camera.position.set(0, 0, defaultCameraDist);
    this.camera.lookAt(0, 0, 0);
    if (this.controls) {
      this.controls.target.set(0, 0, 0);
      this.controls.update();
    }
  }

  private attachHelpersAndLights(scene: THREE.Scene) {
    scene.add(this.gridHelper);
    scene.add(this.axesHelper);
    scene.add(this.dirLight);
    scene.add(this.ambLight);
  }

  private detachHelpersAndLights(scene: THREE.Scene) {
    scene.remove(this.gridHelper);
    scene.remove(this.axesHelper);
    scene.remove(this.dirLight);
    scene.remove(this.ambLight);
  }

  public resize(width: number, height: number) {
    if (!this.renderer || width === 0 || height === 0) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  public resetCamera(targetDist = 2.8) {
    this.camera.position.set(0, 0, targetDist);
    this.camera.lookAt(0, 0, 0);
    if (this.controls) {
      this.controls.target.set(0, 0, 0);
      this.controls.update();
    }
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;

    const loop = () => {
      if (!this.isRunning) return;
      this.animationFrameId = requestAnimationFrame(loop);

      const frameStart = performance.now();

      if (this.controls) {
        this.controls.update();
      }

      if (this.renderer && this.activeScene) {
        this.renderer.render(this.activeScene, this.camera);
      }

      const frameEnd = performance.now();
      const frameDuration = frameEnd - frameStart;

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
            drawCalls: info.render.calls,
            verticesCount: info.render.triangles * 3 + info.render.points,
            trianglesCount: info.render.triangles,
            pointCount: info.render.points,
            texturesCount: info.memory.textures,
            estimatedVramBytes: (info.render.triangles * 3 + info.render.points) * 24,
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
    this.detachHelpersAndLights(this.activeScene);
    this.gridHelper.geometry.dispose();
    this.axesHelper.geometry.dispose();
  }
}
