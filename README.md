# REAL-TIME 3D WORLD RECONSTRUCTION STUDIO
### GPU-Accelerated Real-Time Image & Video to 3D Point-Cloud Reconstruction Engine

[![WebGL 2.0](https://img.shields.io/badge/WebGL-2.0-blue.svg)](https://www.khronos.org/registry/webgl/specs/latest/2.0/)
[![GLSL 3.00 ES](https://img.shields.io/badge/GLSL-3.00%20ES-cyan.svg)](https://www.khronos.org/registry/OpenGL/specs/es/3.0/GLSL_ES_Specification_3.00.pdf)
[![Three.js](https://img.shields.io/badge/Three.js-r165-black.svg)](https://threejs.org/)
[![Vite + React](https://img.shields.io/badge/Vite-React%2018%20%2B%20TypeScript-61DAFB.svg)](https://vitejs.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 1. Project Introduction

**Real-Time 3D World Reconstruction Studio** is an academic GPU computing and computer graphics application engineered to reconstruct 3D spatial geometry and point clouds from monocular images and real-time video streams inside the browser.

Unlike superficial image viewer applications that utilize 2D CSS tilt effects or precomputed static models, this studio implements a genuine hardware-accelerated GPU pipeline. Geometry is generated as a regular sampling grid ($N \times N$) in planar coordinates, and vertex displacement along the depth axis ($Z$) is calculated per-vertex at runtime inside custom WebGL2 GLSL vertex shaders.

---

## 2. Problem Statement

Monocular 3D spatial reconstruction traditionally suffers from high latency and significant computational overhead when processed sequentially on CPU architectures:
1. Transforming millions of pixels into 3D coordinates ($X, Y, Z, R, G, B$) in CPU memory creates memory-bandwidth bottlenecks.
2. High-frame-rate monocular video streams (30–60 FPS) cannot be processed or re-meshed in JavaScript loops without severe frame drops.
3. Client-server architectures incur network latency, bandwidth consumption, and privacy risks when transmitting raw imagery.

This project addresses these challenges by executing the depth approximation and coordinate transformation entirely on the user's local GPU using WebGL2 and custom GLSL vertex/fragment shaders.

---

## 3. Objectives

- **Hardware Acceleration**: Move all vertex displacement and depth estimation computations from CPU to the GPU.
- **Real-Time Video Reconstruction**: Ingest MP4 and WebM video streams at 60 FPS, continuously updating the GPU texture without re-allocating scene geometry.
- **Configurable Shader Pipelines**: Implement GPU Luminance Depth, GPU Contrast/Gradient Depth, and Imported Depth Map shaders.
- **Interactive Scientific Viewport**: Provide 6-DOF camera control (orbit, pan, zoom) with dynamic resolution scaling (16k to 262k points).
- **Direct 3D PLY Export**: Generate standardized ASCII PLY point clouds compatible with MeshLab, CloudCompare, and Blender.
- **Empirical Performance Benchmarking**: Provide side-by-side CPU vs. GPU benchmark comparisons with hardware-level synchronization.

---

## 4. Technology Stack

- **Graphics Core**: Three.js (r165), WebGL 2.0 (`WebGL2RenderingContext`), Custom GLSL Shaders (`GLSL ES 3.00`)
- **Frontend Architecture**: React 18, TypeScript 5.5, Vite 5.3
- **Styling**: Tailwind CSS (Dark Graphite Scientific Theme: `#0B0E13`, `#111722`, `#273244`, `#3B82F6`, `#22D3EE`)
- **Iconography**: Lucide React
- **Browser APIs**: WebGL2 API, HTML5 Canvas API, HTML5 Video API (`requestVideoFrameCallback`), File API, Blob API, High-Resolution Performance API

---

## 5. System Architecture

```
[ User Input: Image / Video / Procedural Sample ]
                      │
                      ▼
            [ HTML5 Canvas / Video ]
                      │
           Upload as THREE.Texture / THREE.VideoTexture
                      │
                      ▼
        [ GPU VRAM: Texture Sampler uImage ]
                      │
  ┌───────────────────┴───────────────────────┐
  │                                           │
  ▼                                           ▼
[ Static CPU Grid Geometry ]         [ Imported Depth Map (Optional) ]
(Float32Array: X, Y, UV)             (uDepthMap Texture Sampler)
  │                                           │
  └───────────────────┬───────────────────────┘
                      │
                      ▼
         [ WebGL2 Vertex Shader ]
     • UV Texture Sampling
     • Formula 1: Luminance Depth (BT.601)
     • Formula 2: Sobel-like 4-Neighbor Gradient Contrast
     • Formula 3: Ground-Truth Grayscale Map
     • Displace Z coordinate: Z = (D - 0.5) * uDepthIntensity
     • Point Size Distance Attenuation
                      │
                      ▼
        [ WebGL2 Fragment Shader ]
     • Circular Point Sprite Anti-Aliasing (gl_PointCoord)
     • Color Modes: Original RGB, Grayscale, Turbo Colormap, Neon
                      │
                      ▼
        [ Display: Center Viewport at 60 FPS ]
```

---

## 6. GPU Processing Pipeline

### 6.1 Geometry Buffer Layout
The CPU builds a planar mesh of vertices once when the resolution is selected:
- **128 × 128 Grid**: 16,384 vertices (~328 KB VRAM)
- **256 × 256 Grid**: 65,536 vertices (~1.31 MB VRAM)
- **512 × 512 Grid**: 262,144 vertices (~5.24 MB VRAM)

Each vertex holds:
- `position`: `vec3(x, y, 0.0)` in normalized device coordinate bounds $[-1, 1]$ scaled by aspect ratio.
- `uv`: `vec2(u, v)` mapping directly to texture coordinates $[0, 1]$.

### 6.2 GLSL Vertex Displacement
Every frame, the GPU executes the vertex shader for all vertices in parallel. The CPU never modifies vertex buffers.

---

## 7. Shader-Based Depth Approximation

The engine provides three depth reconstruction algorithms executed in GLSL:

### Method 1: GPU Luminance Depth
Computes relative optical luminance using standard ITU-R BT.601 coefficients:
$$L = 0.299 \cdot R + 0.587 \cdot G + 0.114 \cdot B$$
Applies user-controlled contrast and brightness:
$$L' = \text{clamp}((L - 0.5) \cdot \text{uContrast} + 0.5 + (\text{uBrightness} - 1.0), 0.0, 1.0)$$
Displaces the vertex along $Z$:
$$Z = (L' - 0.5) \cdot \text{uDepthIntensity}$$

### Method 2: GPU Contrast Depth
Samples four neighboring texels $(\pm \Delta u, \pm \Delta v)$ to extract spatial luminance gradients:
$$\Delta x = \frac{L(u + \Delta u, v) - L(u - \Delta u, v)}{2}, \quad \Delta y = \frac{L(u, v + \Delta v) - L(u, v - \Delta v)}{2}$$
$$\text{edgeValue} = \sqrt{\Delta x^2 + \Delta y^2}$$
Combines base luminance with edge relief:
$$Z = \left((L' - 0.5) + \text{edgeValue} \cdot \text{uEdgeInfluence}\right) \cdot \text{uDepthIntensity}$$

### Method 3: Imported Depth Map
Samples a dedicated second texture unit `uDepthMap`. Converts the red channel (or grayscale value) directly into metric displacement:
$$Z = (D - 0.5) \cdot \text{uDepthIntensity}$$

---

## 8. Real-Time Video Reconstruction

- Supports MP4 and WebM video formats.
- Utilizes `THREE.VideoTexture` and the modern browser `requestVideoFrameCallback` API with automatic fallback to `requestAnimationFrame`.
- Video frames are uploaded directly to the GPU texture buffer.
- The 3D point cloud continuously reflects video changes in real time (up to 60 FPS).
- Geometry is fully reused; zero CPU reallocations or GC pressure occur during playback.

---

## 9. 3D Point-Cloud PLY Export

Users can export the active reconstruction into standard **ASCII Stanford PLY** format:
- Structure includes vertex coordinates `x, y, z` and true colors `red, green, blue`.
- The export script uses the identical mathematical depth formulation as the active GLSL shader.
- Output files are generated via client-side Blob creation (`reconstruction_YYYYMMDD_HHMMSS.ply`).
- Validated for direct import into CloudCompare, MeshLab, and Blender.

---

## 10. Performance Benchmarking (CPU vs. GPU)

The application includes a built-in benchmark runner:
- **CPU Benchmark**: Executes single-threaded sequential float calculations in JavaScript over $N \times N$ pixels.
- **GPU Benchmark**: Dispatches shader draw passes with pipeline synchronization (`gl.finish()`) and tests for hardware `EXT_disjoint_timer_query_webgl2`.
- **Speedup Ratio**: Computes $T_{CPU} / T_{GPU}$ and provides an execution bar chart.
- **Browser Scheduling Explanation**: Acknowledges browser compositor scheduling and IPC command buffer overhead for transparent academic evaluation.

---

## 11. Installation & Local Execution

### Prerequisites
- Node.js (v18+ or v20+ recommended, tested on Node v24)
- WebGL 2.0 compatible browser (Chrome, Edge, Firefox, Safari)

### Local Setup
```bash
# Clone the repository
git clone <repository-url>
cd GPU

# Install dependencies
npm install

# Start development server on all network interfaces
npm run dev -- --host 0.0.0.0

# Open in browser:
# http://localhost:5173
```

### Production Build
```bash
# Compile TypeScript and bundle with Vite
npm run build

# Preview production build locally
npm run preview
```

---

## 12. Netlify Deployment

The project is configured for single-command static deployment on Netlify using the included `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Manual Deployment via Netlify CLI
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy production dist directory
netlify deploy --prod --dir=dist
```

### Continuous Deployment via GitHub
1. Push repository to GitHub.
2. Link the repository in Netlify Dashboard.
3. Build command: `npm run build`
4. Publish directory: `dist`
5. No backend server or environment variables required.

---

## 13. Limitations

> **SCIENTIFIC NOTICE**:
> 1. **Heuristic Depth**: Luminance and contrast depth approximation algorithms are empirical heuristic approximations based on scene illumination. They do **not** represent physically calibrated, metric monocular depth.
> 2. **Occlusions**: Monocular reconstruction cannot reconstruct unseen backside geometry (single-viewpoint 2.5D surface).
> 3. **GPU Utilization Privacy**: Browser WebGL2 sandboxing explicitly disallows access to physical GPU load percentages (e.g., NVIDIA NVML / AMD ADL) to prevent timing-based side-channel exploits.

---

## 14. Future Enhancements

- WebGPU compute shader implementation for direct spatial Delaunay triangulation.
- Client-side ONNX Runtime / WebNN integration with lightweight monocular depth models (e.g. Depth-Anything-V2 Small).
- Binary Little-Endian PLY and LAS/LAZ point cloud export for reduced file size.
- Multi-view camera fusion via WebGL point-cloud registration.
