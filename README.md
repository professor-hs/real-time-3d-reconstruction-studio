# GPU RECONSTRUCTION & PHOTO ENHANCEMENT STUDIO
## High-Performance Browser-Based GPU Computing, Video Processing & 3D Reconstruction Platform

[![WebGL 2.0](https://img.shields.io/badge/WebGL-2.0-blue.svg)](https://www.khronos.org/registry/webgl/specs/latest/2.0/)
[![GLSL 3.00 ES](https://img.shields.io/badge/GLSL-3.00%20ES-cyan.svg)](https://www.khronos.org/registry/OpenGL/specs/es/3.0/GLSL_ES_Specification_3.00.pdf)
[![WebCodecs MP4 Muxer](https://img.shields.io/badge/MP4-Muxer%20WebCodecs-emerald.svg)](https://w3c.github.io/webcodecs/)
[![Three.js](https://img.shields.io/badge/Three.js-r165-black.svg)](https://threejs.org/)
[![Vite + React](https://img.shields.io/badge/Vite-React%2018%20%2B%20TypeScript-61DAFB.svg)](https://vitejs.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 1. Project Overview

**GPU Reconstruction & Photo Enhancement Studio** is a complete, browser-native GPU computing platform developed to demonstrate genuine client-side hardware-accelerated image processing, video enhancement, 3D geometric reconstruction, and CPU vs GPU performance evaluation.

The application features **four dedicated workspaces**:

1. **3D Reconstruction**: Converts monocular photographs and videos into dynamic 3D displaced surface meshes, point clouds, and wireframes with analytical finite-difference surface normals and multi-view photogrammetric correspondence.
2. **Photo Enhancement**: GPU-accelerated $2\times$ and $4\times$ bicubic upscaling, bilateral edge-preserving denoising, unsharp mask sharpening, blur reduction, and non-linear color grading with interactive before/after split comparison.
3. **Video Processing**: Frame-by-frame GPU shader enhancement of MP4 videos, preserving original duration, frame order, and audio tracks via WebCodecs and `mp4-muxer`.
4. **CPU vs GPU Benchmark**: Fair, synchronized performance benchmarks comparing CPU pixel loops (`ImageData`) against GPU WebGL2 shaders with `gl.finish()` synchronization.

---

## 2. File Upload and Exact-Format Preservation

The application strictly enforces **same-format export**:

| Uploaded Format | Processed Download Format | MIME Type | Codec / Container |
|---|---|---|---|
| **PNG** | **PNG** | `image/png` | Lossless Deflate |
| **JPG** | **JPG** | `image/jpeg` | Configurable Quality ($50\% - 100\%$) |
| **JPEG** | **JPEG** | `image/jpeg` | Configurable Quality ($50\% - 100\%$) |
| **MP4** | **MP4** | `video/mp4` | H.264 / AVC Video + AAC Audio Track |

The system never renames extensions or fakes output formats. Output files preserve image dimensions unless upscaled, maintain video durations, and retain audio fidelity.

---

## 3. Four Core Workspaces

### Workspace 1: Photo Enhancement
* **GPU Upscaling ($2\times, 4\times$)**: Evaluates a 16-tap Catmull-Rom cubic spline interpolation kernel inside the GLSL fragment shader, rendering to an upscaled canvas buffer.
* **Bilateral Edge-Preserving Denoising**: Samples spatial Gaussian neighborhood combined with photometric range intensity difference to remove high-frequency noise while keeping edges sharp.
* **Unsharp Mask Sharpening & Deblur**: Computes 9-tap discrete Laplacian convolution to sharpen textures and compensate for camera blur.
* **Color & Tone Grading**: Non-linear brightness, contrast, gamma correction, saturation, and white balance (temperature & tint).
* **Interactive Split Slider**: Real-time draggable divider comparing original unedited image against live GPU-processed output.

### Workspace 2: Video Processing
* **MP4 Video Ingestion**: Loads and previews MP4 videos with duration, resolution, and playback controls.
* **Real-Time GPU Playback Shaders**: Applies sharpening, denoising, brightness, contrast, and color balance to live video frames at 60 FPS.
* **WebCodecs + MP4 Muxer Pipeline**:
  1. Decodes frames at native timestamps.
  2. Passes each frame through WebGL2 fragment shaders.
  3. Encodes frames using hardware-accelerated `VideoEncoder` (H.264 baseline/main profile).
  4. Decodes and encodes audio track using Web Audio API and `AudioEncoder` (AAC-LC).
  5. Muxes video and audio chunks into a standard, fully playable `.mp4` container.

### Workspace 3: 3D Reconstruction
* **Monocular 2.5D Displacement**: Generates elevation geometry ($128^2$ to $512^2$ vertices) from luminance ($L = 0.299R + 0.587G + 0.114B$) or contrast energy.
* **Dynamic Surface Normals**: Computes analytical central differences per-vertex:
  $$\mathbf{t}_u = (2\Delta u, 0, Z(u+\Delta u, v) - Z(u-\Delta u, v)), \quad \mathbf{t}_v = (0, 2\Delta v, Z(u, v+\Delta v) - Z(u, v-\Delta v))$$
  $$\mathbf{n} = \text{normalize}(\mathbf{t}_u \times \mathbf{t}_v)$$
* **Rendering Modes**: Solid Mesh with Blinn-Phong lighting, Point Cloud with circular sprites, and Wireframe.
* **Multi-View Photogrammetry**: Harris Corner Detection ($R = \det(M) - 0.04 \cdot \text{tr}(M)^2$) and Lowe's ratio test ($d_1 / d_2 < 0.75$) for stereo correspondence.
* **3D Exports**: Stanford ASCII PLY, Wavefront OBJ, and Medical Binary STL.

### Workspace 4: CPU vs GPU Benchmark
* **Comparable Operations**: 3x3 Laplacian Sharpening, 5x5 Bilateral Denoising, Color & Gamma Grading, and 2x Resampling.
* **Execution Rigor**:
  - CPU implementation executes on `ImageData` (Uint8ClampedArray).
  - GPU shader runs on WebGL2 texture with warm-up pass and `gl.finish()` synchronization.
  - Computes Speedup Multiplier ($X\text{x}$), Time Saved (ms), Percentage Time Reduction ($\%$) and Throughput (Megapixels/sec).
  - All figures are derived strictly from live hardware execution.

---

## 4. Technology Stack

* **Frontend**: React 18, TypeScript 5.5, Vite 5, Tailwind CSS, Lucide React.
* **GPU & Graphics**: WebGL2 (OpenGL ES 3.00), Three.js r165, OrbitControls.
* **Video & Media**: WebCodecs (`VideoEncoder`, `AudioEncoder`), `mp4-muxer`, HTML5 Canvas & Video APIs.
* **Zero Backend**: 100% Client-Side sandboxed execution. No images, videos, or user data leave the local browser.

---

## 5. Local Setup & Production Build

### Running Locally
```bash
npm install
npm run dev -- --host 0.0.0.0
# Open http://localhost:5173/ in your browser
```

### Production Build
```bash
npm run build
# Compiles static production bundle into dist/
```

### Netlify Deployment
The project includes `netlify.toml` configured for immediate deployment:
```toml
[build]
  command = "npm run build"
  publish = "dist"
```
Or drag and drop the `dist/` directory into [app.netlify.com/drop](https://app.netlify.com/drop).
