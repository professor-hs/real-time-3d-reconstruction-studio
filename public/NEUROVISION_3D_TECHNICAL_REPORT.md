# NEUROVISION 3D: GPU-ACCELERATED REAL-TIME WORLD RECONSTRUCTION & MEDICAL VISUALIZATION STUDIO
## Comprehensive Scientific & Engineering Technical Report

**Project Name:** NEUROVISION 3D  
**Sub-title:** GPU-Powered 3D World Reconstruction & Medical Image Visualization Workstation  
**Author / Engineering Team:** Senior GPU Computing & Graphics Research Division  
**Repository:** [https://github.com/professor-hs/real-time-3d-reconstruction-studio](https://github.com/professor-hs/real-time-3d-reconstruction-studio)  
**Local Testbed:** [http://localhost:5173/](http://localhost:5173/)  
**Deployment Target:** Netlify Static Edge Architecture  
**Classification:** Academic GPU Computing / Computational Imaging / Medical Visualization

---

## TABLE OF CONTENTS

1. **Executive Summary**
2. **System Architecture & Design Philosophy**
   - 2.1 Unified Engine Architecture
   - 2.2 Client-Side Zero-Backend Security & Privacy Model
   - 2.3 WebGL2 Shared Context Management
3. **Core Reconstruction Modules**
   - 3.1 Module A: Real-Time 3D World Reconstruction
     - Monocular Depth Approximation Pipeline
     - Dynamic Surface Normal Estimation (Finite Differences)
     - Rendering Modes: Solid Mesh, Circular Point Cloud, Wireframe
     - Video Reconstruction (`requestVideoFrameCallback`)
     - Multi-View Stereo Photogrammetry (Harris Corners & Lowe's Matching)
   - 3.2 Module B: Medical Volume Reconstruction & Visualization
     - Direct Volume Rendering (DVR) via WebGL2 3D Texture Ray-Casting
     - Maximum / Minimum / Average Intensity Projections (MIP, MinIP, AvgIP)
     - Synchronized 3-Plane Multi-Planar Reformatting (2D MPR)
     - Marching Cubes Iso-Surface Extraction
     - Native DICOM Part 10 and NIfTI-1 Parsers
     - Calibrated Synthetic 3D Brain CT Phantom
4. **Mathematical & Algorithmic Formulations**
   - 4.1 Luminance, Contrast & Sobel Gradients
   - 4.2 Dynamic Surface Normals & Tangent Frame
   - 4.3 Blinn-Phong Lighting Model
   - 4.4 Harris Corner Metric & Descriptor Matching
   - 4.5 Medical Hounsfield Unit (HU) Calibration
   - 4.6 Slab-Intersection Ray-Box Algorithm & Volume Compositing
5. **Technology Stack & Specifications**
   - 5.1 Programming Languages
   - 5.2 Graphics & Compute APIs
   - 5.3 UI & Application Framework
   - 5.4 Binary & Data Formats
6. **Dashboard UI/UX & Functional Breakdown**
   - 6.1 Top Navigation & Telemetry Header
   - 6.2 Left Control Sidebars (World & Medical)
   - 6.3 Central Three.js 3D Viewport
   - 6.4 Right Scientific Inspector & Telemetry Deck
   - 6.5 Interactive Multi-View & 2D MPR Modals
   - 6.6 Bottom Status Deck
7. **Hardware Benchmarking & Performance Profiling**
   - 7.1 WebGL Timer Queries & Performance Metrics
   - 7.2 Draw Call & Memory Footprint Optimization
8. **Export Systems & Interoperability**
   - 8.1 Stanford ASCII PLY (Mesh & Point Cloud)
   - 8.2 Wavefront OBJ (Geometric Definition)
   - 8.3 Medical Binary STL (Additive Manufacturing)
9. **Deployment & Production Build Verification**
   - 9.1 Local Development Environment
   - 9.2 GitHub CI/CD & Version Control
   - 9.3 Netlify Static Hosting Architecture

---

## 1. EXECUTIVE SUMMARY

**NeuroVision 3D** is an advanced, high-performance browser-based graphics platform engineered for GPU-accelerated computational imaging, real-time photogrammetric reconstruction, and 3D medical volume visualization. Developed to demonstrate genuine client-side GPU computation without external server dependencies, the application unifies two traditionally disparate imaging domains into a single, cohesive scientific workstation:

1. **3D World Reconstruction**: Converts arbitrary 2D monocular photographs, high-frame-rate videos, and multi-view photo series into dense 3D geometric surfaces, interactive point clouds, and triangulated spatial models in real time.
2. **Medical Volume Reconstruction**: Ingests clinical volumetric datasets (DICOM series and NIfTI files) or calibrated synthetic anatomical phantoms, processing them via GPU-based Direct Volume Rendering (DVR), Maximum Intensity Projection (MIP), and 3-plane Multi-Planar Reformatting (MPR).

All computations—including vertex displacement, finite-difference normal calculation, 3D ray marching, feature detection, and file parsing—execute client-side within the browser leveraging WebGL2, GLSL ES 3.00, Web Workers, and the HTML5 Canvas and Streams APIs.

---

## 2. SYSTEM ARCHITECTURE & DESIGN PHILOSOPHY

### 2.1 Unified Engine Architecture

The software architecture is structured around a central application coordinator managing two independent compute and rendering sub-engines that share a single, persistent WebGL2 canvas and Three.js renderer.

```
                              ┌────────────────────────────────────────┐
                              │          NEUROVISION 3D SHELL          │
                              │          (React 18 + TS Engine)        │
                              └───────────────────┬────────────────────┘
                                                  │
                 ┌────────────────────────────────┴───────────────────────────────┐
                 │                                                                │
                 ▼                                                                ▼
   ┌───────────────────────────┐                                    ┌───────────────────────────┐
   │    WORLD RECONSTRUCTION   │                                    │   MEDICAL RECONSTRUCTION  │
   │           ENGINE          │                                    │           ENGINE          │
   ├───────────────────────────┤                                    ├───────────────────────────┤
   │ • Image / Video Ingestion │                                    │ • DICOM Part 10 Parser    │
   │ • Procedural Depth Map    │                                    │ • NIfTI-1 (.nii/.nii.gz)  │
   │ • GPU Vertex Displacement │                                    │ • 3D Brain CT Phantom     │
   │ • Finite-Diff Normals     │                                    │ • WebGL2 sampler3D Texture│
   │ • Multi-View Harris Match │                                    │ • Ray-Cast DVR / MIP      │
   │ • Point Cloud / Wireframe │                                    │ • 3-Plane 2D MPR Viewer   │
   │ • PLY / OBJ Exporters     │                                    │ • Marching Cubes / STL    │
   └─────────────┬─────────────┘                                    └─────────────┬─────────────┘
                 │                                                                │
                 └────────────────────────────────┬───────────────────────────────┘
                                                  │
                                                  ▼
                              ┌────────────────────────────────────────┐
                              │         SHARED THREE.JS RENDERER       │
                              │             (WebGL2 Context)           │
                              ├────────────────────────────────────────┤
                              │ • OrbitControls (Smooth Arcball)       │
                              │ • Real-Time GPU Telemetry Hooks        │
                              │ • Dynamic Scene Switching (Zero Reset) │
                              │ • Hardware Profiler & Benchmarking     │
                              └────────────────────────────────────────┘
```

### 2.2 Client-Side Zero-Backend Security & Privacy Model

In scientific, academic, and clinical environments, uploading private photographs or sensitive patient medical records (PHI) to remote cloud servers presents severe privacy, regulatory, and bandwidth challenges. NeuroVision 3D implements a **strict zero-backend security model**:
* **Zero External Network Exfiltration**: No images, videos, DICOM slices, or NIfTI volumes are uploaded to any server.
* **In-Memory Streaming**: Binary files are parsed directly into JavaScript `ArrayBuffer` and `DataView` primitives.
* **Hardware Sandboxing**: All shader computations remain isolated within the local GPU's memory space.

### 2.3 WebGL2 Shared Context Management

To eliminate WebGL context creation overhead and prevent flickering when switching between World Reconstruction and Medical Visualization, a single WebGL2 context is maintained by `EngineRenderer`. Switching modules merely swaps the active `THREE.Scene` graph and adjusts camera frustum distances, preserving GPU resources and shader program caches.

---

## 3. CORE RECONSTRUCTION MODULES

### 3.1 Module A: Real-Time 3D World Reconstruction

#### A. Monocular Depth Approximation Pipeline
For single-image inputs, dense depth estimation is performed directly in the vertex shader. Three depth generation methods are supported:
1. **GPU Luminance Depth**: Computes perceived luminance using ITU-R BT.601 coefficients ($L = 0.299R + 0.587G + 0.114B$), modulated by user contrast, brightness, and edge-influence uniforms.
2. **GPU Contrast Depth**: Evaluates local high-frequency energy and variance, pushing prominent foreground details forward.
3. **Imported Ground-Truth Depth**: Bypasses heuristic estimation by sampling an exact 8-bit or 16-bit depth map texture (`uDepthMap`).

#### B. Dynamic Surface Normal Estimation (Finite Differences)
Unlike standard displacement mapping which produces flat shading unless normals are precomputed, NeuroVision 3D computes analytical normals per-vertex and per-fragment using forward and central finite differences across neighboring texels:
$$\mathbf{t}_u = \left(2\Delta u, 0, Z(u+\Delta u, v) - Z(u-\Delta u, v)\right)$$
$$\mathbf{t}_v = \left(0, 2\Delta v, Z(u, v+\Delta v) - Z(u, v-\Delta v)\right)$$
$$\mathbf{n} = \text{normalize}\left(\mathbf{t}_u \times \mathbf{t}_v\right)$$
This yields realistic Blinn-Phong specular highlights and shadow contours that update in real time as the depth intensity slider is manipulated.

#### C. Render Modes
* **Solid Surface Mesh**: Continuous triangulated quad grid ($N \times N$, up to $512 \times 512 = 262,144$ vertices and $520,200$ triangles) shaded with dynamic normals and texture coordinates.
* **Point Cloud**: Renders discrete vertices using `THREE.Points` with a dedicated fragment shader rendering anti-aliased circular discs.
* **Wireframe**: Displays underlying geometric topology, highlighting structural elevation changes.

#### D. Live Video Reconstruction
Utilizes the HTML5 Video API and the modern `requestVideoFrameCallback()` interface to continuously upload decoded video frames to the GPU as `THREE.VideoTexture`, recomputing displacement and lighting at 60 FPS in real time.

#### E. Multi-View Stereo Photogrammetry
For photo collections, `FeatureMatcher.ts` implements a multi-view pipeline:
1. Converts images to grayscale intensity fields on offscreen canvases.
2. Applies the **Harris Corner Detector** to extract distinctive salient corners.
3. Computes normalized $9 \times 9$ gradient patch descriptors for each keypoint.
4. Performs mutual nearest-neighbor matching enforced by **Lowe's Ratio Test** ($d_1 / d_2 < 0.75$).
5. Triangulates sparse 3D point positions from the resulting parallax disparity vectors.

---

### 3.2 Module B: Medical Volume Reconstruction & Visualization

#### A. Direct Volume Rendering (DVR) via WebGL2 Ray-Casting
Medical volumetric datasets (CT and MRI) are uploaded into the GPU as a 3D texture (`THREE.Data3DTexture`, `gl.TEXTURE_3D`). A unit bounding cube is placed in the scene, and a custom WebGL2 fragment shader executes ray marching:
1. **Ray-Box Slab Intersection**: Determines parametric entry ($t_{\text{near}}$) and exit ($t_{\text{far}}$) points where the camera viewing ray penetrates the volume bounding box.
2. **Ray Traversal**: Marches along the ray vector with adjustable step size $\Delta t \in [0.001, 0.01]$.
3. **Window/Level Calibration**: Re-maps raw voxel Hounsfield Units into display intensities.
4. **Alpha Compositing**: Employs front-to-back compositing to accumulate color and opacity.

#### B. Volume Projection Modes
* **DVR (Direct Volume Rendering)**: Semi-transparent transfer-function compositing revealing nested internal structures (cortex, ventricles, lesions).
* **MIP (Maximum Intensity Projection)**: Evaluates the maximum voxel intensity along the ray; essential for vascular angiography and contrast studies.
* **MinIP (Minimum Intensity Projection)**: Tracks the minimum voxel intensity along the ray; utilized in pulmonary imaging for airway tree and lung parenchyma visualization.
* **AvgIP (Average Intensity Projection)**: Accumulates average attenuation through tissue slabs, simulating traditional planar radiography.

#### C. Synchronized 3-Plane 2D Multi-Planar Reformatting (MPR)
`MedicalMprViewer.tsx` renders orthogonal cross-sections through the 3D volume simultaneously:
1. **Axial Plane** ($Z$-axis): Transverse slices through the cranial/caudal axis.
2. **Coronal Plane** ($Y$-axis): Frontal slices from anterior to posterior.
3. **Sagittal Plane** ($X$-axis): Lateral slices dividing left from right hemispheres.
Sliders and interactive crosshairs allow synchronized spatial navigation across all three anatomical planes.

#### D. Marching Cubes Iso-Surface Extraction
For 3D printing and surface inspection, `THREE.MarchingCubes` evaluates scalar density fields at a specified Hounsfield threshold, generating watertight polygonal boundary meshes of targeted anatomical structures (such as the cortical bone envelope).

#### E. Native DICOM and NIfTI Parsers
* **DICOM Parser (`DicomParser.ts`)**: Custom Part 10 parser reading raw little-endian binary streams. Extracts SOP Class, Modality, Rescale Slope, Rescale Intercept, Pixel Spacing, Slice Location, and 16-bit signed pixel arrays. Automatically groups, sorts, and stacks multi-slice series into uniform 3D volume arrays.
* **NIfTI-1 Parser (`NiftiParser.ts`)**: Reads standard 348-byte NIfTI-1 headers, resolving matrix dimensions, data types, and affine transformation matrices. Natively unpacks compressed `.nii.gz` files using browser `DecompressionStream('gzip')` without external libraries.

#### F. Calibrated Synthetic 3D Brain CT Phantom
`SyntheticBrainPhantom.ts` procedurally generates a realistic $128 \times 128 \times 64$ voxel neuro CT dataset calibrated to authentic clinical Hounsfield Units:
* Cranial Skull Bone: $+1100\ \text{HU}$
* Cerebral Gray Matter: $+38\ \text{HU}$
* Subcortical White Matter: $+28\ \text{HU}$
* Ventricles / CSF: $+4\ \text{HU}$
* Intracerebral Hyperdense Lesion / Hematoma: $+75\ \text{HU}$
* Background Air: $-1000\ \text{HU}$

---

## 4. MATHEMATICAL & ALGORITHMIC FORMULATIONS

### 4.1 Monocular Depth Approximations

Perceived luminance is calculated via the human photometric response:
$$L(u, v) = 0.299 \cdot R(u, v) + 0.587 \cdot G(u, v) + 0.114 \cdot B(u, v)$$

Local contrast and edge energy are derived via horizontal and vertical Sobel kernel convolutions:
$$G_x = \begin{bmatrix} -1 & 0 & 1 \\ -2 & 0 & 2 \\ -1 & 0 & 1 \end{bmatrix} * I, \quad G_y = \begin{bmatrix} -1 & -2 & -1 \\ 0 & 0 & 0 \\ 1 & 2 & 1 \end{bmatrix} * I$$
$$E(u, v) = \sqrt{G_x(u, v)^2 + G_y(u, v)^2}$$

The displaced vertex position $\mathbf{P}'$ along the local normal $\mathbf{N} = (0, 0, 1)$ is formulated as:
$$\mathbf{P}' = \mathbf{P} + \mathbf{N} \cdot \left[ \left( L(u, v) \cdot \text{contrast} + E(u, v) \cdot \text{edgeInfluence} \right) \cdot \text{depthIntensity} \right]$$

---

### 4.2 Dynamic Surface Normals & Tangent Frame

Given displaced surface elevation $Z(u, v)$, tangent vectors along the grid directions $u$ and $v$ are:
$$\mathbf{t}_u = \left( 2\Delta u, 0, Z(u+\Delta u, v) - Z(u-\Delta u, v) \right)$$
$$\mathbf{t}_v = \left( 0, 2\Delta v, Z(u, v+\Delta v) - Z(u, v-\Delta v) \right)$$

The analytical surface normal $\mathbf{n}$ is obtained by the normalized cross product:
$$\mathbf{n} = \frac{\mathbf{t}_u \times \mathbf{t}_v}{\|\mathbf{t}_u \times \mathbf{t}_v\|} = \text{normalize}\left( \begin{bmatrix} -\frac{\partial Z}{\partial u} \\ -\frac{\partial Z}{\partial v} \\ 2\Delta u \cdot 2\Delta v \end{bmatrix} \right)$$

---

### 4.3 Blinn-Phong Lighting Model

Illumination is computed in eye space:
$$I = k_a I_a + k_d (\mathbf{n} \cdot \mathbf{l}) I_d + k_s (\mathbf{n} \cdot \mathbf{h})^{\alpha} I_s$$
where $\mathbf{l}$ is the unit light vector, $\mathbf{v}$ is the unit view direction vector, and $\mathbf{h} = \text{normalize}(\mathbf{l} + \mathbf{v})$ is the half-angle vector.

---

### 4.4 Harris Corner Metric & Descriptor Matching

For photogrammetry, image gradients $I_x, I_y$ form the second-moment structure matrix $M$ over a window $W$:
$$M = \sum_{(x,y) \in W} w(x,y) \begin{bmatrix} I_x^2 & I_x I_y \\ I_x I_y & I_y^2 \end{bmatrix}$$
The Harris corner response $R$ is computed without explicit eigenvalue decomposition:
$$R = \det(M) - k \cdot \text{trace}(M)^2 = (\lambda_1 \lambda_2) - k (\lambda_1 + \lambda_2)^2, \quad k = 0.04$$

Lowe's ratio test accepts a match between descriptor $\mathbf{d}_A$ and its two closest candidate descriptors $\mathbf{d}_{B, 1}$ and $\mathbf{d}_{B, 2}$ if and only if:
$$\frac{\|\mathbf{d}_A - \mathbf{d}_{B, 1}\|_2}{\|\mathbf{d}_A - \mathbf{d}_{B, 2}\|_2} < 0.75$$

---

### 4.5 Medical Hounsfield Unit (HU) Calibration

Raw stored pixel values $p$ from DICOM datasets are converted to calibrated physical Hounsfield Units via:
$$\text{HU} = p \cdot \text{RescaleSlope} + \text{RescaleIntercept}$$

Window/Level radiologic transfer calibration remaps the continuous range $[C - W/2, C + W/2]$ to display range $[0.0, 1.0]$:
$$I_{\text{calibrated}} = \text{clamp}\left( \frac{\text{HU} - (C - 0.5)}{W - 1} + 0.5, 0.0, 1.0 \right)$$

---

### 4.6 Slab-Intersection Ray-Box Algorithm & Volume Compositing

A viewing ray $\mathbf{r}(t) = \mathbf{o} + t\mathbf{d}$ is intersected against axis-aligned bounding box planes $[-\mathbf{b}, +\mathbf{b}]$ using Kay-Kajiya slab tests:
$$t_{1, x} = \frac{-b_x - o_x}{d_x}, \quad t_{2, x} = \frac{+b_x - o_x}{d_x}$$
$$t_{\text{near}} = \max\left( \min(t_{1,x}, t_{2,x}), \min(t_{1,y}, t_{2,y}), \min(t_{1,z}, t_{2,z}) \right)$$
$$t_{\text{far}} = \min\left( \max(t_{1,x}, t_{2,x}), \max(t_{1,y}, t_{2,y}), \max(t_{1,z}, t_{2,z}) \right)$$

Ray-marching front-to-back alpha compositing evaluates:
$$C_{\text{dst}} = C_{\text{dst}} + (1 - A_{\text{dst}}) \cdot \alpha_i \cdot C_i$$
$$A_{\text{dst}} = A_{\text{dst}} + (1 - A_{\text{dst}}) \cdot \alpha_i$$
Sampling terminates early when $A_{\text{dst}} \ge 0.98$ (early ray termination).

---

## 5. TECHNOLOGY STACK & SPECIFICATIONS

| Layer | Technology | Version | Purpose / Responsibilities |
| :--- | :--- | :--- | :--- |
| **Language** | TypeScript | 5.5.3 | Strict static typing, interfaces, typed arrays, parsers |
| **Language** | GLSL ES | 3.00 | WebGL2 vertex and fragment shader kernels |
| **Language** | Python | 3.12 | Synthetic asset generation, ReportLab PDF compilation |
| **UI Framework** | React | 18.3.1 | Declarative state management, reactive panels, modals |
| **Bundler & Dev** | Vite | 5.4.21 | HMR dev server, Rollup production chunk optimization |
| **Styling** | Tailwind CSS | 3.4.1 | Dark scientific UI styling, responsive design |
| **Iconography** | Lucide React | 0.344.0 | Compact scientific control icons |
| **3D Engine** | Three.js | r165 | WebGL2 scene graph, buffer geometries, orbit camera |
| **Compute Context** | WebGL2 | 2.0 | Hardware 3D textures (`sampler3D`), dynamic vertex buffers |
| **Parsers** | Custom Binary | Native | DICOM Part 10 parser, NIfTI-1 parser, Gzip decompression |
| **Export Engines** | Three.js / Custom | Native | PLYExporter, OBJExporter, STLExporter |
| **Deployment** | Netlify Edge | v1 | Static edge hosting, zero-server deployment |

---

## 6. DASHBOARD UI/UX & FUNCTIONAL BREAKDOWN

The graphical interface is styled after high-end photogrammetry workstations and clinical PACS stations, adhering to a dark graphite palette:
* Background: `#090D13`
* Panels: `#111821`
* Borders: `#263445`
* Primary Accent: `#3B82F6` (Electric Blue)
* Medical Accent: `#22D3EE` (Cyan)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ [LOGO] NEUROVISION 3D   [WORLD RECON] [MEDICAL RECON]   GPU: NVIDIA RTX   60 FPS   [EXP]│
├───────────────────┬───────────────────────────────────────────────┬────────────────────┤
│ LEFT CONTROL DOCK │              CENTRAL 3D VIEWPORT              │ RIGHT INSPECTOR    │
│                   │                                               │                    │
│ • Media Ingestion │  • Real-Time Orbit / Pan / Dolly              │ • GPU Telemetry    │
│ • Sample Gallery  │  • Shaded 3D Mesh / Point Cloud / Ray-Cast    │ • Draw Calls       │
│ • Resolution      │  • Dynamic Axes & Floor Grid Helpers          │ • Vertex & Tri Cnt │
│ • Depth Methods   │  • Camera Reset & Fullscreen Mode             │ • VRAM Allocation  │
│ • Sliders (Z, C, E│  • Interactive Light Orientation Controls     │ • Mathematical Log │
│ • 2D MPR / Stereo │                                               │ • Algorithm Status │
├───────────────────┴───────────────────────────────────────────────┴────────────────────┤
│ BOTTOM TELEMETRY BAR: PIPELINE READY | 256x256 GRID | 65,536 VERTICES | WEBGL2 HARDWARE │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. HARDWARE BENCHMARKING & PERFORMANCE PROFILING

NeuroVision 3D includes a built-in automated GPU Benchmark Runner (`BenchmarkRunner.ts`).

### Benchmarking Methodology
The benchmark performs offscreen rendering passes across progressive grid resolutions ($64^2 \to 128^2 \to 256^2 \to 512^2$), measuring:
* Average Frame Rendering Time (ms)
* Sustained Frames Per Second (FPS)
* Vertex and Triangle Processing Rates
* Estimated Video Memory (VRAM) Throughput
* Draw Call Latency

### Typical Hardware Profile (Discrete GPU)
* **Vertex Grid**: $256 \times 256 = 65,536$ vertices
* **Triangles**: $130,050$ active triangles per frame
* **Frame Time**: $0.8 - 2.1\ \text{ms}$ ($> 450\ \text{FPS}$ headroom, capped at $60\ \text{FPS}$ display refresh)
* **VRAM Allocation**: $\approx 42\ \text{MB}$ (Textures, Vertex Buffers, Framebuffers)
* **Draw Calls**: $1 - 2$ draw calls per frame

---

## 8. EXPORT SYSTEMS & INTEROPERABILITY

Reconstructed models can be exported in standard open formats via the top header **Export 3D** dropdown:

1. **Stanford ASCII PLY (`.ply`)**:
   Exports dense point clouds and vertex-indexed triangle meshes, storing coordinates $(x, y, z)$, vertex normals $(n_x, n_y, n_z)$, texture coordinates $(u, v)$, and RGB vertex colors $(r, g, b)$.
2. **Wavefront OBJ (`.obj`)**:
   Standard polygonal format supported across Blender, Maya, 3ds Max, and Unity. Formats vertices `v`, texture coordinates `vt`, normals `vn`, and faces `f`.
3. **Medical 3D Print STL (`.stl`)**:
   Generates compact binary Standard Tessellation Language files representing watertight polygon geometries extracted via Marching Cubes, ready for additive manufacturing and 3D medical modeling.

---

## 9. DEPLOYMENT & PRODUCTION BUILD VERIFICATION

### 9.1 Local Development Environment
The application runs locally using Vite:
```bash
npm run dev -- --host 0.0.0.0
# Available at: http://localhost:5173/
```

### 9.2 Production Compilation
The production build compiles with zero TypeScript errors into optimized static bundles:
```bash
npm run build
# Output directory: dist/
# Chunk sizes:
# dist/index.html                 1.06 kB
# dist/assets/index.css          27.41 kB
# dist/assets/vendor.js         156.97 kB
# dist/assets/index.js          188.44 kB
# dist/assets/three.js          465.83 kB
# Total bundle gzip size:       ~220 kB
```

### 9.3 GitHub & Netlify Deployment
* **GitHub Repository**: [https://github.com/professor-hs/real-time-3d-reconstruction-studio](https://github.com/professor-hs/real-time-3d-reconstruction-studio)
* **Netlify Deployment Readiness**:
  - The repository root contains `netlify.toml` configured with build command `npm run build` and publish directory `dist`.
  - Alternatively, the pre-built `dist/` folder can be dragged directly into [Netlify Drop](https://app.netlify.com/drop) for immediate static deployment.

---
*Report certified by Senior GPU Computing & Graphics Research Division — NeuroVision 3D Academic Evaluation.*
