// Upgraded World 3D Reconstruction Engine for NeuroVision 3D
// Implements Genuine GPU GLSL Vertex Displacement with 3 True Render Modes:
// 1. Solid Mesh (Indexed Triangles, Dynamic Normals, Directional Lighting)
// 2. Point Cloud (Circular Sprites, Perspective Attenuation)
// 3. Wireframe (True Displaced Triangle Edges)

import * as THREE from 'three';
import {
  worldMeshVertexShader,
  worldMeshFragmentShader,
  worldPointVertexShader,
  worldPointFragmentShader,
} from '../shaders/worldShaders';
import { VideoProcessor } from './VideoProcessor';
import { createProceduralSampleCanvas, createSampleDepthMapCanvas } from '../utils/sampleScene';
import { decodeAndValidateImage } from '../utils/fileValidation';
import {
  Resolution,
  WorldMediaMetadata,
  WorldRenderMode,
  WorldSettings,
} from '../types';

export class WorldEngine {
  public scene: THREE.Scene;
  public videoProcessor: VideoProcessor;

  // Active rendering objects
  public mesh: THREE.Mesh | null = null;
  public points: THREE.Points | null = null;
  public meshMaterial: THREE.ShaderMaterial | null = null;
  public wireframeMaterial: THREE.ShaderMaterial | null = null;
  public pointMaterial: THREE.ShaderMaterial | null = null;
  public geometry: THREE.BufferGeometry | null = null;

  // Active textures
  private imageTexture: THREE.Texture | null = null;
  private depthTexture: THREE.Texture | null = null;
  private defaultEmptyTexture: THREE.DataTexture;

  // Source elements
  private currentImageElement: HTMLCanvasElement | HTMLImageElement | null = null;
  private currentDepthElement: HTMLCanvasElement | HTMLImageElement | null = null;

  public metadata: WorldMediaMetadata;
  public settings: WorldSettings;

  constructor(onMetadataChange?: (meta: WorldMediaMetadata) => void) {
    this.scene = new THREE.Scene();

    const whitePixel = new Uint8Array([255, 255, 255, 255]);
    this.defaultEmptyTexture = new THREE.DataTexture(whitePixel, 1, 1, THREE.RGBAFormat);
    this.defaultEmptyTexture.needsUpdate = true;

    this.settings = {
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

    this.metadata = {
      name: 'Synthetic Alpine Laboratory Scene',
      width: 1024,
      height: 768,
      aspectRatio: 1024 / 768,
      fileSize: 1024 * 768 * 4,
      type: 'sample',
    };

    this.videoProcessor = new VideoProcessor((videoState) => {
      if (this.metadata.type === 'video') {
        this.metadata = {
          ...this.metadata,
          currentTime: videoState.currentTime,
          duration: videoState.duration,
          isPlaying: videoState.isPlaying,
        };
        onMetadataChange?.(this.metadata);
      }
    });

    // Default: load offline procedural sample
    this.loadSampleScene();
  }

  /**
   * Builds an indexed regular triangular mesh geometry for resolution N x N
   */
  public initGeometry(resolution: Resolution): THREE.BufferGeometry {
    if (this.geometry) {
      this.geometry.dispose();
    }

    const totalVertices = resolution * resolution;
    const positions = new Float32Array(totalVertices * 3);
    const uvs = new Float32Array(totalVertices * 2);

    let ptrPos = 0;
    let ptrUv = 0;

    for (let j = 0; j < resolution; j++) {
      const v = j / (resolution - 1);
      const y = (v - 0.5) * 2.0;

      for (let i = 0; i < resolution; i++) {
        const u = i / (resolution - 1);
        const x = (u - 0.5) * 2.0;

        positions[ptrPos++] = x;
        positions[ptrPos++] = y;
        positions[ptrPos++] = 0.0; // Z is dynamically displaced on the GPU in vertex shader

        uvs[ptrUv++] = u;
        uvs[ptrUv++] = v;
      }
    }

    // Build triangle index buffer: 2 triangles per quad cell
    const numQuads = (resolution - 1) * (resolution - 1);
    const indices = new Uint32Array(numQuads * 6);
    let ptrIndex = 0;

    for (let j = 0; j < resolution - 1; j++) {
      for (let i = 0; i < resolution - 1; i++) {
        const row1 = j * resolution;
        const row2 = (j + 1) * resolution;

        const a = row1 + i;
        const b = row1 + (i + 1);
        const c = row2 + i;
        const d = row2 + (i + 1);

        // Triangle 1: a -> b -> c
        indices[ptrIndex++] = a;
        indices[ptrIndex++] = b;
        indices[ptrIndex++] = c;

        // Triangle 2: b -> d -> c
        indices[ptrIndex++] = b;
        indices[ptrIndex++] = d;
        indices[ptrIndex++] = c;
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(new THREE.BufferAttribute(indices, 1));
    geo.computeBoundingSphere();

    this.geometry = geo;
    return geo;
  }

  /**
   * Initializes or updates GPU Shader Materials for Solid Mesh, Wireframe, and Point Cloud
   */
  public initMaterials() {
    const depthMethodMap = { luminance: 0, contrast: 1, imported: 2 };
    const colorModeMap = { rgb: 0, grayscale: 1, height: 2, neon: 3 };

    const commonUniforms = {
      uImage: { value: this.imageTexture || this.defaultEmptyTexture },
      uDepthMap: { value: this.depthTexture || this.defaultEmptyTexture },
      uDepthMethod: { value: depthMethodMap[this.settings.depthMethod] },
      uDepthIntensity: { value: this.settings.depthIntensity },
      uContrast: { value: this.settings.contrast },
      uBrightness: { value: this.settings.brightness },
      uEdgeInfluence: { value: this.settings.edgeInfluence },
      uInvertDepth: { value: this.settings.invertDepth },
      uTexelSize: { value: new THREE.Vector2(1.0 / this.settings.resolution, 1.0 / this.settings.resolution) },
      uAspectRatio: { value: this.metadata.aspectRatio },
      uColorMode: { value: colorModeMap[this.settings.colorMode] },
    };

    // 1. Solid Mesh Material with Dynamic Normals and Lighting
    this.meshMaterial = new THREE.ShaderMaterial({
      vertexShader: worldMeshVertexShader,
      fragmentShader: worldMeshFragmentShader,
      uniforms: {
        ...commonUniforms,
        uRoughness: { value: this.settings.roughness },
        uMetalness: { value: this.settings.metalness },
      },
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: true,
    });

    // 2. Wireframe Material
    this.wireframeMaterial = new THREE.ShaderMaterial({
      vertexShader: worldMeshVertexShader,
      fragmentShader: worldMeshFragmentShader,
      uniforms: {
        ...commonUniforms,
        uRoughness: { value: 0.8 },
        uMetalness: { value: 0.0 },
      },
      wireframe: true,
      side: THREE.DoubleSide,
    });

    // 3. Point Cloud Material
    this.pointMaterial = new THREE.ShaderMaterial({
      vertexShader: worldPointVertexShader,
      fragmentShader: worldPointFragmentShader,
      uniforms: {
        ...commonUniforms,
        uPointSize: { value: this.settings.pointSize },
      },
      transparent: true,
      depthTest: true,
      depthWrite: true,
    });
  }

  /**
   * Rebuilds 3D scene objects according to active renderMode (solid, points, wireframe)
   */
  public rebuildWorld() {
    const geo = this.initGeometry(this.settings.resolution);
    this.initMaterials();

    // Clean up previous objects from scene
    if (this.mesh) {
      this.scene.remove(this.mesh);
    }
    if (this.points) {
      this.scene.remove(this.points);
    }

    if (this.settings.renderMode === 'solid') {
      this.mesh = new THREE.Mesh(geo, this.meshMaterial!);
      this.scene.add(this.mesh);
    } else if (this.settings.renderMode === 'wireframe') {
      this.mesh = new THREE.Mesh(geo, this.wireframeMaterial!);
      this.scene.add(this.mesh);
    } else {
      this.points = new THREE.Points(geo, this.pointMaterial!);
      this.scene.add(this.points);
    }
  }

  /**
   * Updates uniforms on the fly without geometry re-creation
   */
  public updateSettings(newSettings: Partial<WorldSettings>) {
    const prevRes = this.settings.resolution;
    const prevMode = this.settings.renderMode;

    this.settings = { ...this.settings, ...newSettings };

    if (this.settings.resolution !== prevRes || this.settings.renderMode !== prevMode) {
      this.rebuildWorld();
      return;
    }

    const depthMethodMap = { luminance: 0, contrast: 1, imported: 2 };
    const colorModeMap = { rgb: 0, grayscale: 1, height: 2, neon: 3 };

    const mats = [this.meshMaterial, this.wireframeMaterial, this.pointMaterial];
    for (const mat of mats) {
      if (!mat) continue;
      const u = mat.uniforms;
      u.uDepthMethod.value = depthMethodMap[this.settings.depthMethod];
      u.uDepthIntensity.value = this.settings.depthIntensity;
      u.uContrast.value = this.settings.contrast;
      u.uBrightness.value = this.settings.brightness;
      u.uEdgeInfluence.value = this.settings.edgeInfluence;
      u.uInvertDepth.value = this.settings.invertDepth;
      u.uAspectRatio.value = this.metadata.aspectRatio;
      u.uColorMode.value = colorModeMap[this.settings.colorMode];
      u.uTexelSize.value.set(1.0 / this.settings.resolution, 1.0 / this.settings.resolution);

      if (u.uPointSize) {
        u.uPointSize.value = this.settings.pointSize;
      }
      if (u.uRoughness) {
        u.uRoughness.value = this.settings.roughness;
      }
      if (u.uMetalness) {
        u.uMetalness.value = this.settings.metalness;
      }
    }
  }

  public setRenderMode(mode: WorldRenderMode) {
    this.updateSettings({ renderMode: mode });
  }

  public loadSampleScene() {
    this.videoProcessor.dispose();
    const canvas = createProceduralSampleCanvas(1024, 768);
    const depthCanvas = createSampleDepthMapCanvas(1024, 768);

    this.currentImageElement = canvas;
    this.currentDepthElement = depthCanvas;

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.imageTexture = texture;

    const dTexture = new THREE.CanvasTexture(depthCanvas);
    this.depthTexture = dTexture;

    this.metadata = {
      name: 'Synthetic Alpine Laboratory Scene',
      width: 1024,
      height: 768,
      aspectRatio: 1024 / 768,
      fileSize: 1024 * 768 * 4,
      type: 'sample',
    };

    this.rebuildWorld();
  }

  public async loadImage(file: File) {
    this.videoProcessor.dispose();
    const decoded = await decodeAndValidateImage(file);
    this.currentImageElement = decoded.image;

    const texture = new THREE.Texture(decoded.image);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    this.imageTexture = texture;

    this.metadata = {
      name: file.name,
      width: decoded.width,
      height: decoded.height,
      aspectRatio: decoded.width / decoded.height,
      fileSize: file.size,
      type: 'image',
    };

    this.rebuildWorld();
  }

  public async loadVideo(file: File) {
    const videoData = await this.videoProcessor.loadVideo(file);
    this.currentImageElement = null;
    this.imageTexture = videoData.texture;

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

    this.rebuildWorld();
    await this.videoProcessor.play();
  }

  public async loadDepthMap(file: File) {
    const decoded = await decodeAndValidateImage(file);
    this.currentDepthElement = decoded.image;
    const texture = new THREE.Texture(decoded.image);
    texture.needsUpdate = true;
    this.depthTexture = texture;
    this.settings.depthMethod = 'imported';
    this.updateSettings({ depthMethod: 'imported' });
  }

  public async loadFromUrl(url: string, name: string, isDepth = false): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const texture = new THREE.Texture(img);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.needsUpdate = true;
        if (isDepth) {
          this.currentDepthElement = img;
          this.depthTexture = texture;
          this.settings.depthMethod = 'imported';
          this.updateSettings({ depthMethod: 'imported' });
        } else {
          this.videoProcessor.dispose();
          this.currentImageElement = img;
          this.imageTexture = texture;
          this.metadata = {
            name,
            width: img.naturalWidth || 800,
            height: img.naturalHeight || 600,
            aspectRatio: (img.naturalWidth || 800) / (img.naturalHeight || 600),
            fileSize: 25000,
            type: 'image',
          };
          this.rebuildWorld();
        }
        resolve();
      };
      img.onerror = () => reject(new Error(`Failed to load asset from ${url}`));
      img.src = url;
    });
  }

  public clearDepthMap() {
    this.currentDepthElement = null;
    this.depthTexture = null;
    if (this.settings.depthMethod === 'imported') {
      this.settings.depthMethod = 'luminance';
    }
    this.updateSettings({ depthMethod: 'luminance' });
  }

  public getActiveSourceCanvas(): HTMLCanvasElement | HTMLImageElement | null {
    return this.currentImageElement;
  }

  public getActiveDepthCanvas(): HTMLCanvasElement | HTMLImageElement | null {
    return this.currentDepthElement;
  }

  public dispose() {
    this.videoProcessor.dispose();
    if (this.geometry) this.geometry.dispose();
    if (this.meshMaterial) this.meshMaterial.dispose();
    if (this.wireframeMaterial) this.wireframeMaterial.dispose();
    if (this.pointMaterial) this.pointMaterial.dispose();
    if (this.imageTexture) this.imageTexture.dispose();
    if (this.depthTexture) this.depthTexture.dispose();
    if (this.defaultEmptyTexture) this.defaultEmptyTexture.dispose();
  }
}
