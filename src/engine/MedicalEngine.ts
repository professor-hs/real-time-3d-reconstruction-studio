// Master GPU Medical Imaging Engine for NeuroVision 3D
// Manages WebGL2 3D Data Texture, Volume Ray-Casting Shaders, Marching Cubes Surfaces,
// Orthogonal MPR Slice Extraction, and Medical Model Exporters.

import * as THREE from 'three';
import { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js';
import { volumeRaycastVertexShader, volumeRaycastFragmentShader } from '../shaders/volumeRaycastShaders';
import { MedicalRenderMode, MedicalSettings, MedicalVolumeData, MedicalVolumeMetadata } from '../types';
import { createSyntheticBrainPhantom } from './SyntheticBrainPhantom';
import { DicomParser } from './DicomParser';
import { NiftiParser } from './NiftiParser';

export class MedicalEngine {
  public scene: THREE.Scene;
  public volumeData: MedicalVolumeData;
  public metadata: MedicalVolumeMetadata;
  public settings: MedicalSettings;

  // 3D Rendering Objects
  public volumeMesh: THREE.Mesh | null = null;
  public volumeMaterial: THREE.ShaderMaterial | null = null;
  public volumeTexture: THREE.Data3DTexture | null = null;
  public surfaceMesh: MarchingCubes | null = null;
  public boundingBoxHelper: THREE.BoxHelper | null = null;

  // Slices in 3D orthogonal planes
  public slicePlanesGroup: THREE.Group;

  constructor() {
    this.scene = new THREE.Scene();
    this.slicePlanesGroup = new THREE.Group();
    this.scene.add(this.slicePlanesGroup);

    // Initial default synthetic phantom
    const initial = createSyntheticBrainPhantom(128, 128, 64);
    this.volumeData = initial.data;
    this.metadata = initial.metadata;

    this.settings = {
      renderMode: 'dvr',
      windowCenter: 40,
      windowWidth: 350,
      opacity: 1.2,
      stepSize: 0.003,
      brightness: 1.2,
      isosurfaceThreshold: 250, // Bone / hard tissue
      surfaceColor: '#E2E8F0',
      surfaceOpacity: 1.0,
      showBoundingBox: true,
      showSlicesIn3D: false,
      activeSlice: {
        axial: 32,
        coronal: 64,
        sagittal: 64,
      },
    };
  }

  /**
   * Initializes or updates GPU 3D Data Texture from volume scalar array
   */
  public updateVolumeTexture(): THREE.Data3DTexture {
    if (this.volumeTexture) {
      this.volumeTexture.dispose();
    }

    const [w, h, d] = this.volumeData.dimensions;
    const total = w * h * d;

    // Normalize Float32Array to 0..255 Uint8 for fast 3D texture sampling in WebGL2
    const min = this.volumeData.minVal;
    const range = Math.max(this.volumeData.maxVal - min, 1.0);
    const byteData = new Uint8Array(total);

    for (let i = 0; i < total; i++) {
      const norm = (this.volumeData.data[i] - min) / range;
      byteData[i] = Math.round(Math.max(0.0, Math.min(1.0, norm)) * 255.0);
    }

    const texture = new THREE.Data3DTexture(byteData, w, h, d);
    texture.format = THREE.RedFormat;
    texture.type = THREE.UnsignedByteType;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.wrapR = THREE.ClampToEdgeWrapping;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;

    this.volumeTexture = texture;
    return texture;
  }

  /**
   * Builds the GPU Volume Ray-Casting box mesh
   */
  public buildVolumeMesh(): THREE.Mesh {
    if (this.volumeMesh) {
      this.scene.remove(this.volumeMesh);
      this.volumeMesh.geometry.dispose();
    }

    this.updateVolumeTexture();

    const [w, h, d] = this.volumeData.dimensions;
    const [dx, dy, dz] = this.volumeData.spacing;

    // Physical dimensions in mm, normalized to around unit scale
    const physW = w * dx;
    const physH = h * dy;
    const physD = d * dz;
    const maxDim = Math.max(physW, physH, physD);

    const scaleX = physW / maxDim;
    const scaleY = physH / maxDim;
    const scaleZ = physD / maxDim;

    const geometry = new THREE.BoxGeometry(scaleX, scaleY, scaleZ);

    const modeMap: Record<MedicalRenderMode, number> = { dvr: 0, mip: 1, minip: 2, avgip: 3, isosurface: 0 };

    const min = this.volumeData.minVal;
    const range = Math.max(this.volumeData.maxVal - min, 1.0);
    const normWc = (this.settings.windowCenter - min) / range;
    const normWw = this.settings.windowWidth / range;

    const uniforms = {
      uVolume: { value: this.volumeTexture },
      uRenderMode: { value: modeMap[this.settings.renderMode] },
      uWindowCenter: { value: normWc },
      uWindowWidth: { value: normWw },
      uOpacity: { value: this.settings.opacity },
      uStepSize: { value: this.settings.stepSize },
      uBrightness: { value: this.settings.brightness },
      uVoxelSpacing: { value: new THREE.Vector3(scaleX, scaleY, scaleZ) },
    };

    this.volumeMaterial = new THREE.ShaderMaterial({
      vertexShader: volumeRaycastVertexShader,
      fragmentShader: volumeRaycastFragmentShader,
      uniforms,
      transparent: true,
      side: THREE.BackSide, // Render from inside / back faces so camera can enter volume
      depthWrite: false,
    });

    this.volumeMesh = new THREE.Mesh(geometry, this.volumeMaterial);
    this.scene.add(this.volumeMesh);

    // Bounding Box Helper
    if (this.boundingBoxHelper) {
      this.scene.remove(this.boundingBoxHelper);
    }
    this.boundingBoxHelper = new THREE.BoxHelper(this.volumeMesh, 0x3b82f6);
    this.boundingBoxHelper.visible = this.settings.showBoundingBox;
    this.scene.add(this.boundingBoxHelper);

    return this.volumeMesh;
  }

  /**
   * Updates ray casting shader uniforms continuously
   */
  public updateSettings(newSettings: Partial<MedicalSettings>) {
    this.settings = { ...this.settings, ...newSettings };

    if (!this.volumeMaterial) return;

    const modeMap: Record<MedicalRenderMode, number> = { dvr: 0, mip: 1, minip: 2, avgip: 3, isosurface: 0 };
    const min = this.volumeData.minVal;
    const range = Math.max(this.volumeData.maxVal - min, 1.0);
    const normWc = (this.settings.windowCenter - min) / range;
    const normWw = this.settings.windowWidth / range;

    const u = this.volumeMaterial.uniforms;
    u.uRenderMode.value = modeMap[this.settings.renderMode];
    u.uWindowCenter.value = normWc;
    u.uWindowWidth.value = normWw;
    u.uOpacity.value = this.settings.opacity;
    u.uStepSize.value = this.settings.stepSize;
    u.uBrightness.value = this.settings.brightness;

    if (this.volumeMesh) {
      this.volumeMesh.visible = this.settings.renderMode !== 'isosurface';
    }

    if (this.boundingBoxHelper) {
      this.boundingBoxHelper.visible = this.settings.showBoundingBox;
    }

    if (this.settings.renderMode === 'isosurface') {
      this.updateIsosurface();
    } else if (this.surfaceMesh) {
      this.surfaceMesh.visible = false;
    }
  }

  /**
   * Generates or updates Anatomical 3D Iso-Surface using Marching Cubes
   */
  public updateIsosurface() {
    if (!this.surfaceMesh) {
      const res = Math.min(64, this.volumeData.dimensions[0]);
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(this.settings.surfaceColor),
        roughness: 0.35,
        metalness: 0.1,
        side: THREE.DoubleSide,
      });

      this.surfaceMesh = new MarchingCubes(res, material, true, true, 100000);
      const [w, h, d] = this.volumeData.dimensions;
      const [dx, dy, dz] = this.volumeData.spacing;
      const maxDim = Math.max(w * dx, h * dy, d * dz);
      this.surfaceMesh.scale.set((w * dx) / maxDim, (h * dy) / maxDim, (d * dz) / maxDim);
      this.scene.add(this.surfaceMesh);
    }

    this.surfaceMesh.visible = this.settings.renderMode === 'isosurface';
    (this.surfaceMesh.material as THREE.MeshStandardMaterial).color.set(this.settings.surfaceColor);

    // Fill marching cubes scalar field
    const mc = this.surfaceMesh;
    mc.reset();

    const [vw, vh, vd] = this.volumeData.dimensions;
    const res = mc.resolution;
    const min = this.volumeData.minVal;
    const range = Math.max(this.volumeData.maxVal - min, 1.0);
    const normIso = (this.settings.isosurfaceThreshold - min) / range;
    mc.isolation = normIso;

    for (let k = 0; k < res; k++) {
      const vz = Math.floor((k / (res - 1)) * (vd - 1));
      for (let j = 0; j < res; j++) {
        const vy = Math.floor((j / (res - 1)) * (vh - 1));
        for (let i = 0; i < res; i++) {
          const vx = Math.floor((i / (res - 1)) * (vw - 1));
          const idx = vz * (vw * vh) + vy * vw + vx;
          const val = (this.volumeData.data[idx] - min) / range;
          mc.setCell(i, j, k, val);
        }
      }
    }

    mc.update();
  }

  /**
   * Loads synthetic brain phantom volume
   */
  public loadSyntheticPhantom() {
    const res = createSyntheticBrainPhantom(128, 128, 64);
    this.volumeData = res.data;
    this.metadata = res.metadata;
    this.settings.activeSlice = {
      axial: Math.floor(res.data.dimensions[2] / 2),
      coronal: Math.floor(res.data.dimensions[1] / 2),
      sagittal: Math.floor(res.data.dimensions[0] / 2),
    };
    this.buildVolumeMesh();
  }

  /**
   * Loads DICOM files from array of ArrayBuffers
   */
  public async loadDicomFiles(buffers: ArrayBuffer[]) {
    const slices = buffers.map((buf) => DicomParser.parseSlice(buf));
    const assembled = DicomParser.assembleSeries(slices);
    this.volumeData = assembled.volumeData;
    this.metadata = assembled.metadata;
    this.settings.windowCenter = assembled.metadata.windowCenter;
    this.settings.windowWidth = assembled.metadata.windowWidth;
    this.settings.activeSlice = {
      axial: Math.floor(assembled.volumeData.dimensions[2] / 2),
      coronal: Math.floor(assembled.volumeData.dimensions[1] / 2),
      sagittal: Math.floor(assembled.volumeData.dimensions[0] / 2),
    };
    this.buildVolumeMesh();
  }

  /**
   * Loads NIfTI volume from ArrayBuffer
   */
  public async loadNiftiFile(buffer: ArrayBuffer, filename: string) {
    const decompressed = await NiftiParser.decompressIfGzip(buffer);
    const parsed = NiftiParser.parse(decompressed, filename);
    this.volumeData = parsed.volumeData;
    this.metadata = parsed.metadata;
    this.settings.windowCenter = parsed.metadata.windowCenter;
    this.settings.windowWidth = parsed.metadata.windowWidth;
    this.settings.activeSlice = {
      axial: Math.floor(parsed.volumeData.dimensions[2] / 2),
      coronal: Math.floor(parsed.volumeData.dimensions[1] / 2),
      sagittal: Math.floor(parsed.volumeData.dimensions[0] / 2),
    };
    this.buildVolumeMesh();
  }

  /**
   * Extracts a 2D slice cross-section onto an HTMLCanvasElement for the MPR viewer
   */
  public renderSliceToCanvas(
    plane: 'axial' | 'coronal' | 'sagittal',
    sliceIndex: number,
    canvas: HTMLCanvasElement
  ) {
    const [w, h, d] = this.volumeData.dimensions;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let sliceW = 0;
    let sliceH = 0;

    if (plane === 'axial') {
      sliceW = w;
      sliceH = h;
      sliceIndex = Math.max(0, Math.min(d - 1, sliceIndex));
    } else if (plane === 'coronal') {
      sliceW = w;
      sliceH = d;
      sliceIndex = Math.max(0, Math.min(h - 1, sliceIndex));
    } else {
      sliceW = h;
      sliceH = d;
      sliceIndex = Math.max(0, Math.min(w - 1, sliceIndex));
    }

    if (canvas.width !== sliceW || canvas.height !== sliceH) {
      canvas.width = sliceW;
      canvas.height = sliceH;
    }

    const imgData = ctx.createImageData(sliceW, sliceH);
    const pixels = imgData.data;

    const wc = this.settings.windowCenter;
    const ww = Math.max(this.settings.windowWidth, 1.0);
    const lower = wc - ww / 2.0;

    const raw = this.volumeData.data;

    let ptr = 0;

    if (plane === 'axial') {
      // z is sliceIndex, loop y (0..h-1), x (0..w-1)
      const zOffset = sliceIndex * (w * h);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const val = raw[zOffset + y * w + x];
          const norm = Math.max(0.0, Math.min(1.0, (val - lower) / ww));
          const gray = Math.round(norm * 255);
          pixels[ptr++] = gray;
          pixels[ptr++] = gray;
          pixels[ptr++] = gray;
          pixels[ptr++] = 255;
        }
      }
    } else if (plane === 'coronal') {
      // y is sliceIndex, loop z (0..d-1), x (0..w-1)
      // Display with superior (+Z) on top
      for (let z = d - 1; z >= 0; z--) {
        const zOffset = z * (w * h) + sliceIndex * w;
        for (let x = 0; x < w; x++) {
          const val = raw[zOffset + x];
          const norm = Math.max(0.0, Math.min(1.0, (val - lower) / ww));
          const gray = Math.round(norm * 255);
          pixels[ptr++] = gray;
          pixels[ptr++] = gray;
          pixels[ptr++] = gray;
          pixels[ptr++] = 255;
        }
      }
    } else {
      // sagittal: x is sliceIndex, loop z (0..d-1), y (0..h-1)
      for (let z = d - 1; z >= 0; z--) {
        const zOffset = z * (w * h) + sliceIndex;
        for (let y = 0; y < h; y++) {
          const val = raw[zOffset + y * w];
          const norm = Math.max(0.0, Math.min(1.0, (val - lower) / ww));
          const gray = Math.round(norm * 255);
          pixels[ptr++] = gray;
          pixels[ptr++] = gray;
          pixels[ptr++] = gray;
          pixels[ptr++] = 255;
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }

  /**
   * Export extracted anatomical surface as STL
   */
  public dispose() {
    if (this.volumeTexture) this.volumeTexture.dispose();
    if (this.volumeMesh) {
      this.scene.remove(this.volumeMesh);
      this.volumeMesh.geometry.dispose();
    }
    if (this.volumeMaterial) this.volumeMaterial.dispose();
    if (this.surfaceMesh) {
      this.scene.remove(this.surfaceMesh);
      this.surfaceMesh.geometry.dispose();
    }
    if (this.boundingBoxHelper) {
      this.scene.remove(this.boundingBoxHelper);
      this.boundingBoxHelper.geometry.dispose();
    }
  }
}
