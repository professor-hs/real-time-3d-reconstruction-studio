import * as THREE from 'three';
import { pointCloudVertexShader, pointCloudFragmentShader } from '../shaders/pointCloudShaders';
import { ReconstructionSettings, Resolution } from '../types';

export class PointCloudManager {
  private geometry: THREE.BufferGeometry | null = null;
  private material: THREE.ShaderMaterial | null = null;
  public points: THREE.Points | null = null;
  private currentResolution: Resolution = 256;
  private imageTexture: THREE.Texture | null = null;
  private depthTexture: THREE.Texture | null = null;
  private defaultEmptyTexture: THREE.DataTexture;

  constructor() {
    // Create a 1x1 default white texture to avoid unbound sampler errors in WebGL2
    const whitePixel = new Uint8Array([255, 255, 255, 255]);
    this.defaultEmptyTexture = new THREE.DataTexture(whitePixel, 1, 1, THREE.RGBAFormat);
    this.defaultEmptyTexture.needsUpdate = true;
  }

  /**
   * Initializes or rebuilds the point cloud geometry for a specific grid resolution.
   * CPU generates only flat grid (u, v) and positions; GPU vertex shader performs all depth reconstruction!
   */
  public initGeometry(resolution: Resolution): THREE.BufferGeometry {
    this.currentResolution = resolution;

    if (this.geometry) {
      this.geometry.dispose();
    }

    const totalPoints = resolution * resolution;
    const positions = new Float32Array(totalPoints * 3);
    const uvs = new Float32Array(totalPoints * 2);

    let ptrPos = 0;
    let ptrUv = 0;

    for (let j = 0; j < resolution; j++) {
      const v = j / (resolution - 1);
      // Flip Y in world space so top of image aligns with +Y
      const y = (v - 0.5) * 2.0;

      for (let i = 0; i < resolution; i++) {
        const u = i / (resolution - 1);
        const x = (u - 0.5) * 2.0;

        positions[ptrPos++] = x;
        positions[ptrPos++] = y;
        positions[ptrPos++] = 0.0; // Initial Z is zero; GPU displaces it

        uvs[ptrUv++] = u;
        uvs[ptrUv++] = v;
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.computeBoundingSphere();

    this.geometry = geo;
    return geo;
  }

  /**
   * Creates or updates the GPU ShaderMaterial
   */
  public initMaterial(settings: ReconstructionSettings, aspectRatio: number): THREE.ShaderMaterial {
    if (this.material) {
      this.material.dispose();
    }

    const depthMethodMap = {
      luminance: 0,
      contrast: 1,
      imported: 2,
    };

    const colorModeMap = {
      rgb: 0,
      grayscale: 1,
      height: 2,
      neon: 3,
    };

    const uniforms = {
      uImage: { value: this.imageTexture || this.defaultEmptyTexture },
      uDepthMap: { value: this.depthTexture || this.defaultEmptyTexture },
      uDepthMethod: { value: depthMethodMap[settings.depthMethod] },
      uDepthIntensity: { value: settings.depthIntensity },
      uContrast: { value: settings.contrast },
      uBrightness: { value: settings.brightness },
      uEdgeInfluence: { value: settings.edgeInfluence },
      uInvertDepth: { value: settings.invertDepth },
      uTexelSize: { value: new THREE.Vector2(1.0 / this.currentResolution, 1.0 / this.currentResolution) },
      uPointSize: { value: settings.pointSize },
      uAspectRatio: { value: aspectRatio },
      uColorMode: { value: colorModeMap[settings.colorMode] },
      uTime: { value: 0.0 },
      uAnimatePoints: { value: settings.animatePoints },
      uWireframe: { value: settings.wireframe },
    };

    this.material = new THREE.ShaderMaterial({
      vertexShader: pointCloudVertexShader,
      fragmentShader: pointCloudFragmentShader,
      uniforms,
      transparent: true,
      depthTest: true,
      depthWrite: true,
    });

    return this.material;
  }

  /**
   * Assembles or reconfigures the THREE.Points object in the scene
   */
  public buildPointCloud(
    settings: ReconstructionSettings,
    aspectRatio = 1.0
  ): THREE.Points {
    const geo = this.initGeometry(settings.resolution);
    const mat = this.initMaterial(settings, aspectRatio);

    if (this.points) {
      this.points.geometry = geo;
      this.points.material = mat;
    } else {
      this.points = new THREE.Points(geo, mat);
    }

    return this.points;
  }

  /**
   * Updates uniforms continuously without recreating geometry or materials
   */
  public updateSettings(settings: ReconstructionSettings, aspectRatio: number) {
    if (!this.material) return;

    const depthMethodMap = {
      luminance: 0,
      contrast: 1,
      imported: 2,
    };

    const colorModeMap = {
      rgb: 0,
      grayscale: 1,
      height: 2,
      neon: 3,
    };

    const u = this.material.uniforms;
    u.uDepthMethod.value = depthMethodMap[settings.depthMethod];
    u.uDepthIntensity.value = settings.depthIntensity;
    u.uContrast.value = settings.contrast;
    u.uBrightness.value = settings.brightness;
    u.uEdgeInfluence.value = settings.edgeInfluence;
    u.uInvertDepth.value = settings.invertDepth;
    u.uPointSize.value = settings.pointSize;
    u.uAspectRatio.value = aspectRatio;
    u.uColorMode.value = colorModeMap[settings.colorMode];
    u.uAnimatePoints.value = settings.animatePoints;
    u.uWireframe.value = settings.wireframe;
    u.uTexelSize.value.set(1.0 / this.currentResolution, 1.0 / this.currentResolution);
  }

  /**
   * Updates time uniform for subtle point cloud dynamics
   */
  public updateTime(time: number) {
    if (this.material && this.material.uniforms.uTime) {
      this.material.uniforms.uTime.value = time;
    }
  }

  /**
   * Sets the primary source texture (Image or VideoTexture)
   */
  public setImageTexture(texture: THREE.Texture) {
    this.imageTexture = texture;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;

    if (this.material) {
      this.material.uniforms.uImage.value = texture;
      this.material.needsUpdate = true;
    }
  }

  /**
   * Sets the imported grayscale depth map texture
   */
  public setDepthTexture(texture: THREE.Texture | null) {
    this.depthTexture = texture;
    if (texture) {
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;
    }

    if (this.material) {
      this.material.uniforms.uDepthMap.value = texture || this.defaultEmptyTexture;
      this.material.needsUpdate = true;
    }
  }

  public getPointCount(): number {
    return this.currentResolution * this.currentResolution;
  }

  public getResolution(): Resolution {
    return this.currentResolution;
  }

  public getEstimatedBufferBytes(): number {
    // 3 floats (pos) + 2 floats (uv) = 5 floats * 4 bytes = 20 bytes per point
    return this.getPointCount() * 20;
  }

  public dispose() {
    if (this.geometry) {
      this.geometry.dispose();
      this.geometry = null;
    }
    if (this.material) {
      this.material.dispose();
      this.material = null;
    }
    if (this.defaultEmptyTexture) {
      this.defaultEmptyTexture.dispose();
    }
    this.points = null;
  }
}
