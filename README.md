# NEUROVISION 3D
## GPU-Powered World Reconstruction & Medical Image Visualization Studio

[![WebGL 2.0](https://img.shields.io/badge/WebGL-2.0-blue.svg)](https://www.khronos.org/registry/webgl/specs/latest/2.0/)
[![GLSL 3.00 ES](https://img.shields.io/badge/GLSL-3.00%20ES-cyan.svg)](https://www.khronos.org/registry/OpenGL/specs/es/3.0/GLSL_ES_Specification_3.00.pdf)
[![Three.js](https://img.shields.io/badge/Three.js-r165-black.svg)](https://threejs.org/)
[![Vite + React](https://img.shields.io/badge/Vite-React%2018%20%2B%20TypeScript-61DAFB.svg)](https://vitejs.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 1. Project Overview

**NeuroVision 3D** is an academic GPU computing and computational visualization platform that unifies two distinct computer graphics domains into a single browser-native workstation:
1. **Module A — Real-Time 3D World Reconstruction**: Displaces planar surface grids on the GPU in real time from monocular imagery and video streams, and performs multi-view photogrammetric feature correspondence matching.
2. **Module B — GPU-Based Medical Volume Reconstruction**: Performs volumetric ray-casting on WebGL2 3D textures (`sampler3D`) for clinical CT and MRI datasets, synchronized 3-plane orthogonal multi-planar reconstruction (MPR), and Marching Cubes anatomical iso-surface extraction.

All calculations execute client-side on the user's hardware graphics card without transmitting patient data or photographs to external cloud services.

---

## 2. Problem Statement

Both natural world photogrammetry and volumetric medical visualization require processing millions of spatial samples:
- **World Reconstruction**: Displacing hundreds of thousands of vertices in JavaScript CPU loops stalls the main event thread, dropping frame rates below acceptable levels.
- **Medical Volume Rendering**: Ray-marching through a $128 \times 128 \times 64$ to $512 \times 512 \times 256$ 3D voxel grid requires evaluating hundreds of millions of ray-box intersection steps per second.
- **Privacy & Latency**: Transmitting sensitive medical imaging (DICOM / NIfTI) or private user imagery to cloud inference servers poses major data-privacy risks and introduces multi-second round-trip network delays.

NeuroVision 3D resolves these constraints by delegating 100% of spatial displacement, normal derivation, and volumetric ray-marching to the local GPU hardware via WebGL2 and custom GLSL vertex and fragment shaders.

---

## 3. System Architecture

```
                               ┌────────────────────────────────────────────────────────┐
                               │                    NEUROVISION 3D                      │
                               │           Shared Application & GPU Engine              │
                               └───────────────────────────┬────────────────────────────┘
                                                           │
                        ┌──────────────────────────────────┴──────────────────────────────────┐
                        │                                                                     │
                        ▼                                                                     ▼
           [ MODULE A: WORLD RECONSTRUCTION ]                                   [ MODULE B: MEDICAL VISUALIZATION ]
     ┌──────────────────────────────────────────────┐                     ┌──────────────────────────────────────────────┐
     │ • Input: Image / Multi-View / Video / Sample │                     │ • Input: DICOM Series / NIfTI / Synthetic CT │
     │ • Planar Mesh Geometry Buffer (CPU)          │                     │ • 3D Volumetric Texture Unit: sampler3D      │
     │ • GLSL Vertex Shader:                        │                     │ • GLSL Volume Ray-Casting Shader:            │
     │   - Luminance / Contrast / Imported Depth    │                     │   - DVR (Alpha Compositing + Gradient Phong) │
     │   - Finite-Difference Dynamic Normals        │                     │   - MIP (Maximum Intensity Projection)       │
     │   - Spatial Z-Displacement                   │                     │   - MinIP (Airway / Cavity Projection)       │
     │ • Three Render Modes:                        │                     │   - AvgIP (Digitally Reconstructed Radiograph│
     │   - Solid Mesh (Triangles + Lighting)        │                     │ • Synchronized Orthogonal 2D MPR:            │
     │   - Dense Point Cloud (Circular Sprites)     │                     │   - Axial (XY), Coronal (XZ), Sagittal (YZ)  │
     │   - Wireframe (Displaced Edges)              │                     │ • Marching Cubes 3D Anatomical Iso-Surface   │
     │ • Multi-View Feature Matching (Harris/FAST)  │                     │ • Window / Level Calibration (Hounsfield)    │
     │ • Export: PLY (Mesh/Points), OBJ (v/vt/vn/f) │                     │ • Export: STL (3D Print), PLY, OBJ           │
     └──────────────────────────────────────────────┘                     └──────────────────────────────────────────────┘
                                                           │
                                                           ▼
                                         [ WebGL2 Hardware Framebuffer ]
                                        (60 FPS Interactive OrbitControls)
```

---

## 4. Module A: World Reconstruction Pipeline

### 4.1 True Solid Mesh, Point Cloud, and Wireframe
Unlike simple particle displays, the engine generates an indexed regular grid of $(N-1)^2 \times 2$ triangles in `THREE.BufferGeometry`:
- **Solid Mesh**: The vertex shader dynamically derives the surface normal $\mathbf{n} = \text{normalize}(\mathbf{t}_x \times \mathbf{t}_y)$ from finite difference displacements $z(x \pm \Delta x), z(y \pm \Delta y)$. The fragment shader applies Blinn-Phong directional illumination with specular highlights.
- **Point Cloud**: Renders anti-aliased circular point sprites via `gl_PointCoord` with perspective distance attenuation.
- **Wireframe**: Displays the true displaced triangle mesh edges without visual artifacts.

### 4.2 Multi-View Photogrammetry & Feature Matching
- Implements corner feature extraction via the Harris corner response:
  $$R = \det(M) - k \cdot (\text{trace}(M))^2, \quad M = \sum w(x,y) \begin{bmatrix} I_x^2 & I_x I_y \\ I_x I_y & I_y^2 \end{bmatrix}$$
- Normalized $9 \times 9$ patch descriptors with Lowe's ratio test ($d_1 / d_2 < 0.82$).
- Epipolar disparity analysis: validates baseline parallax and triangulates sparse 3D spatial points with camera viewpoint representations.

---

## 5. Module B: Medical Reconstruction & Volume Ray-Casting

### 5.1 WebGL2 3D Texture Ray-Caster (`sampler3D`)
The volume scalar field is uploaded as a `THREE.Data3DTexture` in `RedFormat`. The custom GLSL shader executes ray marching inside a normalized unit bounding box:
1. **Ray Intersection**: Employs the Slab method to calculate entry point $t_{near}$ and exit point $t_{far}$.
2. **Ray Marching Loop**: Advances sampling position $\mathbf{x} = \mathbf{x}_0 + t \cdot \mathbf{d}$ at step interval $\Delta t$.
3. **Clinical Window/Level Mapping**:
   $$\text{normalized} = \text{clamp}\left(\frac{\text{HU} - (W_L - W_W / 2)}{W_W}, 0.0, 1.0\right)$$
4. **Rendering Modes**:
   - **DVR**: Front-to-back compositing with gradient-based illumination:
     $$C_{accum} = C_{accum} + (1 - A_{accum}) \cdot C_{sample} \cdot A_{sample}, \quad A_{accum} = A_{accum} + (1 - A_{accum}) \cdot A_{sample}$$
     Includes early ray termination when $A_{accum} \ge 0.98$.
   - **MIP**: Evaluates maximum intensity along the viewing ray (angiography standard).
   - **MinIP**: Evaluates minimum intensity along the ray (airway/trachea contrast).
   - **AvgIP**: Averages density along the ray, simulating digital plain film X-rays.

### 5.2 Synchronized Orthogonal Multi-Planar Reconstruction (MPR)
Provides 3 simultaneous orthogonal viewports:
- **Axial (Transverse, XY Plane)**
- **Coronal (Frontal, XZ Plane)**
- **Sagittal (Profile, YZ Plane)**
With synchronized crosshairs indicating slice coordinates across planes in real time.

### 5.3 Anatomical Iso-Surface Extraction
Applies the Marching Cubes algorithm over the 3D scalar volume at user-selected Hounsfield thresholds (e.g., Bone at $+250\text{ HU}$, Soft tissue at $+30\text{ HU}$).

---

## 6. Built-in Offline Sample Data

Both modules function completely offline without external network dependencies:
- **World Module**: Procedural alpine research laboratory landscape with sky, mountain peaks, water reflections, foliage, and high-contrast foreground geometry.
- **Medical Module**: High-fidelity 3D CT/MRI Neuro Head Phantom ($128 \times 128 \times 64$ voxels) featuring skull calvarium, gray matter cortex, subcortical white matter, lateral ventricles, and a focal high-contrast hyperdense lesion.

---

## 7. Model Export Capabilities

- **World Reconstruction**:
  - **ASCII PLY Mesh**: Includes full triangular connectivity (`element face`) and vertex colors.
  - **ASCII PLY Point Cloud**: Vertex cloud with `x, y, z, red, green, blue`.
  - **Wavefront OBJ**: Geometric vertices `v`, texture coordinates `vt`, normals `vn`, and polygonal faces `f`.
- **Medical Visualization**:
  - **Binary STL**: Stereolithography file ready for 3D anatomical printing.
  - **Binary PLY**: Surface mesh with smooth normals.
  - **Wavefront OBJ**: Universal polygon mesh.

---

## 8. Installation & Local Execution

### Prerequisites
- Node.js (v18+, v20+, or v24+)
- WebGL2 compatible browser (Chrome, Edge, Firefox, Safari)

### Local Setup
```bash
# Clone the repository
git clone https://github.com/professor-hs/real-time-3d-reconstruction-studio.git
cd real-time-3d-reconstruction-studio

# Install dependencies
npm install

# Start development server
npm run dev -- --host 0.0.0.0

# Open in browser:
# http://localhost:5173
```

### Production Build
```bash
npm run build
npm run preview
```

---

## 9. Netlify Deployment

The project is configured for static zero-backend deployment with `netlify.toml`:
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Deployment Steps:
1. Push to GitHub (`origin/main`).
2. Link the repository on [Netlify](https://app.netlify.com).
3. Netlify automatically executes `npm run build` and serves `dist/`.

---

## 10. Limitations & Scientific Disclaimers

> **SCIENTIFIC & CLINICAL NOTICES**:
> 1. **Heuristic Depth**: Monocular depth reconstruction is an empirical photometric approximation and is not a calibrated physical depth measurement.
> 2. **Multi-View Parallax**: Photogrammetric triangulation strictly requires translational baseline displacement. Stationary cameras with pure pan/tilt produce zero triangulation disparity.
> 3. **Medical Disclaimer**: Direct volume rendering and Marching Cubes extractions are computational visualizations intended for research, education, and technical evaluation. They are **not intended for primary clinical diagnosis**.
> 4. **Hardware Telemetry**: Browser security isolation explicitly restricts access to low-level kernel GPU load counters to protect against timing side-channel attacks.
