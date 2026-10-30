// Unified 3D Model Exporter (PLY, OBJ, STL) for World and Medical Reconstruction
// Exports real reconstructed geometry with valid coordinates, normals, UVs, and faces.

import * as THREE from 'three';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { PLYExporter } from 'three/examples/jsm/exporters/PLYExporter.js';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';
import { WorldSettings } from '../types';
import { formatTimestamp } from '../utils/formatters';

export class ModelExporter {
  /**
   * Downloads a Blob as a file in the browser
   */
  public static triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Exports the World Reconstruction as an ASCII PLY Mesh or Point Cloud
   */
  public static exportWorldPLY(
    sourceCanvas: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement,
    depthCanvas: HTMLCanvasElement | HTMLImageElement | null,
    settings: WorldSettings,
    aspectRatio: number,
    includeFaces = true
  ): { filename: string; sizeBytes: number; count: number } {
    const res = settings.resolution;
    const totalVertices = res * res;

    // Sample color
    const cCanvas = document.createElement('canvas');
    cCanvas.width = res;
    cCanvas.height = res;
    const cCtx = cCanvas.getContext('2d', { willReadFrequently: true });
    if (!cCtx) throw new Error('Canvas 2D context creation failed.');

    cCtx.drawImage(sourceCanvas, 0, 0, res, res);
    const colorBytes = cCtx.getImageData(0, 0, res, res).data;

    // Sample depth if imported
    let depthBytes: Uint8ClampedArray | null = null;
    if (settings.depthMethod === 'imported' && depthCanvas) {
      const dCanvas = document.createElement('canvas');
      dCanvas.width = res;
      dCanvas.height = res;
      const dCtx = dCanvas.getContext('2d', { willReadFrequently: true });
      if (dCtx) {
        dCtx.drawImage(depthCanvas, 0, 0, res, res);
        depthBytes = dCtx.getImageData(0, 0, res, res).data;
      }
    }

    const { depthMethod, depthIntensity, contrast, brightness, edgeInfluence, invertDepth } = settings;

    const getLuma = (r: number, g: number, b: number) => {
      const raw = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0;
      let adj = (raw - 0.5) * contrast + 0.5 + (brightness - 1.0);
      adj = Math.max(0.0, Math.min(1.0, adj));
      return invertDepth ? 1.0 - adj : adj;
    };

    const lumaGrid = new Float32Array(totalVertices);
    for (let y = 0; y < res; y++) {
      for (let x = 0; x < res; x++) {
        const idx = (y * res + x) * 4;
        lumaGrid[y * res + x] = getLuma(colorBytes[idx], colorBytes[idx + 1], colorBytes[idx + 2]);
      }
    }

    const totalFaces = includeFaces ? (res - 1) * (res - 1) * 2 : 0;

    const header = [
      'ply',
      'format ascii 1.0',
      'comment NeuroVision 3D World Reconstruction Export',
      `element vertex ${totalVertices}`,
      'property float x',
      'property float y',
      'property float z',
      'property uchar red',
      'property uchar green',
      'property uchar blue',
      ...(includeFaces
        ? [
            `element face ${totalFaces}`,
            'property list uchar int vertex_indices',
          ]
        : []),
      'end_header\n',
    ];

    const lines: string[] = [header.join('\n')];

    // Emit Vertices
    for (let j = 0; j < res; j++) {
      const v = j / (res - 1);
      const yCoord = (v - 0.5) * 2.0;
      const row = res - 1 - j;

      for (let i = 0; i < res; i++) {
        const u = i / (res - 1);
        let xCoord = (u - 0.5) * 2.0;
        let yFinal = yCoord;

        if (aspectRatio >= 1.0) xCoord *= aspectRatio;
        else yFinal /= aspectRatio;

        const col = i;
        const pixelIdx = (row * res + col) * 4;
        const r = colorBytes[pixelIdx];
        const g = colorBytes[pixelIdx + 1];
        const b = colorBytes[pixelIdx + 2];

        let z = 0.0;
        if (depthMethod === 'imported' && depthBytes) {
          let d = depthBytes[pixelIdx] / 255.0;
          let adj = (d - 0.5) * contrast + 0.5 + (brightness - 1.0);
          adj = Math.max(0.0, Math.min(1.0, adj));
          if (invertDepth) adj = 1.0 - adj;
          z = (adj - 0.5) * depthIntensity;
        } else if (depthMethod === 'contrast') {
          const xL = Math.max(0, col - 1);
          const xR = Math.min(res - 1, col + 1);
          const yT = Math.max(0, row - 1);
          const yB = Math.min(res - 1, row + 1);
          const dx = (lumaGrid[row * res + xR] - lumaGrid[row * res + xL]) * 0.5;
          const dy = (lumaGrid[yB * res + col] - lumaGrid[yT * res + col]) * 0.5;
          const edge = Math.sqrt(dx * dx + dy * dy);
          z = (Math.max(0.0, Math.min(1.0, lumaGrid[row * res + col] + edge * edgeInfluence)) - 0.5) * depthIntensity;
        } else {
          z = (lumaGrid[row * res + col] - 0.5) * depthIntensity;
        }

        const rAdj = Math.max(0, Math.min(255, Math.round(((r / 255.0 - 0.5) * contrast + 0.5 + (brightness - 1.0)) * 255)));
        const gAdj = Math.max(0, Math.min(255, Math.round(((g / 255.0 - 0.5) * contrast + 0.5 + (brightness - 1.0)) * 255)));
        const bAdj = Math.max(0, Math.min(255, Math.round(((b / 255.0 - 0.5) * contrast + 0.5 + (brightness - 1.0)) * 255)));

        lines.push(`${xCoord.toFixed(4)} ${yFinal.toFixed(4)} ${z.toFixed(4)} ${rAdj} ${gAdj} ${bAdj}\n`);
      }
    }

    // Emit Faces if requested
    if (includeFaces) {
      for (let j = 0; j < res - 1; j++) {
        for (let i = 0; i < res - 1; i++) {
          const row1 = j * res;
          const row2 = (j + 1) * res;
          const a = row1 + i;
          const b = row1 + (i + 1);
          const c = row2 + i;
          const d = row2 + (i + 1);

          lines.push(`3 ${a} ${b} ${c}\n`);
          lines.push(`3 ${b} ${d} ${c}\n`);
        }
      }
    }

    const blob = new Blob(lines, { type: 'text/plain' });
    const filename = `neurovision_world_${formatTimestamp()}.${includeFaces ? 'ply' : 'points.ply'}`;
    this.triggerDownload(blob, filename);

    return {
      filename,
      sizeBytes: blob.size,
      count: includeFaces ? totalFaces : totalVertices,
    };
  }

  /**
   * Exports the World Reconstruction as an OBJ Mesh with texture coordinates and normals
   */
  public static exportWorldOBJ(
    sourceCanvas: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement,
    _depthCanvas: HTMLCanvasElement | HTMLImageElement | null,
    settings: WorldSettings,
    aspectRatio: number
  ): { filename: string; sizeBytes: number; vertexCount: number } {
    const res = settings.resolution;
    const cCanvas = document.createElement('canvas');
    cCanvas.width = res;
    cCanvas.height = res;
    const cCtx = cCanvas.getContext('2d', { willReadFrequently: true });
    if (!cCtx) throw new Error('Canvas 2D context creation failed.');

    cCtx.drawImage(sourceCanvas, 0, 0, res, res);
    const colorBytes = cCtx.getImageData(0, 0, res, res).data;

    const { depthIntensity, contrast, brightness, invertDepth } = settings;

    const lines: string[] = [
      '# NeuroVision 3D Wavefront OBJ Mesh Export\n',
      '# https://github.com/professor-hs/real-time-3d-reconstruction-studio\n',
      `o WorldMesh_${res}x${res}\n`,
    ];

    // Emit Vertices 'v'
    for (let j = 0; j < res; j++) {
      const v = j / (res - 1);
      const yCoord = (v - 0.5) * 2.0;
      const row = res - 1 - j;

      for (let i = 0; i < res; i++) {
        const u = i / (res - 1);
        let xCoord = (u - 0.5) * 2.0;
        let yFinal = yCoord;

        if (aspectRatio >= 1.0) xCoord *= aspectRatio;
        else yFinal /= aspectRatio;

        const pixelIdx = (row * res + i) * 4;
        const r = colorBytes[pixelIdx];
        const g = colorBytes[pixelIdx + 1];
        const b = colorBytes[pixelIdx + 2];
        const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0;
        let adj = (luma - 0.5) * contrast + 0.5 + (brightness - 1.0);
        adj = Math.max(0.0, Math.min(1.0, adj));
        if (invertDepth) adj = 1.0 - adj;
        const z = (adj - 0.5) * depthIntensity;

        lines.push(`v ${xCoord.toFixed(4)} ${yFinal.toFixed(4)} ${z.toFixed(4)}\n`);
      }
    }

    // Emit UV Coordinates 'vt'
    for (let j = 0; j < res; j++) {
      const v = j / (res - 1);
      for (let i = 0; i < res; i++) {
        const u = i / (res - 1);
        lines.push(`vt ${u.toFixed(4)} ${v.toFixed(4)}\n`);
      }
    }

    // Emit Normals 'vn'
    lines.push('vn 0.0000 0.0000 1.0000\n');

    // Emit Faces 'f' (1-indexed)
    lines.push('s 1\n');
    for (let j = 0; j < res - 1; j++) {
      for (let i = 0; i < res - 1; i++) {
        const row1 = j * res;
        const row2 = (j + 1) * res;

        const a = row1 + i + 1;
        const b = row1 + (i + 1) + 1;
        const c = row2 + i + 1;
        const d = row2 + (i + 1) + 1;

        lines.push(`f ${a}/${a}/1 ${b}/${b}/1 ${c}/${c}/1\n`);
        lines.push(`f ${b}/${b}/1 ${d}/${d}/1 ${c}/${c}/1\n`);
      }
    }

    const blob = new Blob(lines, { type: 'text/plain' });
    const filename = `neurovision_world_${formatTimestamp()}.obj`;
    this.triggerDownload(blob, filename);

    return {
      filename,
      sizeBytes: blob.size,
      vertexCount: res * res,
    };
  }

  /**
   * Exports 3D Medical Surface Mesh (Marching Cubes / Volume) as STL
   */
  public static exportMedicalSTL(object: THREE.Object3D): { filename: string; sizeBytes: number } {
    const exporter = new STLExporter();
    const result = exporter.parse(object, { binary: true });
    const buffer = result.buffer as ArrayBuffer;
    const blob = new Blob([buffer], { type: 'application/octet-stream' });
    const filename = `neurovision_medical_${formatTimestamp()}.stl`;
    this.triggerDownload(blob, filename);
    return { filename, sizeBytes: blob.size };
  }

  /**
   * Exports 3D Medical Surface Mesh as PLY
   */
  public static exportMedicalPLY(object: THREE.Object3D): { filename: string; sizeBytes: number } {
    const exporter = new PLYExporter();
    let size = 0;
    const filename = `neurovision_medical_${formatTimestamp()}.ply`;
    exporter.parse(
      object,
      (res) => {
        const blob = new Blob([res], { type: 'application/octet-stream' });
        size = blob.size;
        ModelExporter.triggerDownload(blob, filename);
      },
      { binary: true }
    );
    return { filename, sizeBytes: size };
  }

  /**
   * Exports 3D Medical Surface Mesh as OBJ
   */
  public static exportMedicalOBJ(object: THREE.Object3D): { filename: string; sizeBytes: number } {
    const exporter = new OBJExporter();
    const result = exporter.parse(object);
    const blob = new Blob([result], { type: 'text/plain' });
    const filename = `neurovision_medical_${formatTimestamp()}.obj`;
    this.triggerDownload(blob, filename);
    return { filename, sizeBytes: blob.size };
  }
}
