import { ReconstructionSettings } from '../types';
import { formatTimestamp } from '../utils/formatters';

export interface PlyExportResult {
  filename: string;
  pointCount: number;
  fileSizeBytes: number;
}

export class PlyExporter {
  /**
   * Generates and downloads an ASCII PLY 3D point cloud file from the current reconstruction settings.
   */
  public static async exportPly(
    sourceCanvasOrImage: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement,
    depthCanvasOrImage: HTMLCanvasElement | HTMLImageElement | null,
    settings: ReconstructionSettings,
    aspectRatio: number
  ): Promise<PlyExportResult> {
    const resolution = settings.resolution;
    const totalPoints = resolution * resolution;

    // Offscreen canvas to sample colors at the reconstruction resolution
    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = resolution;
    sampleCanvas.height = resolution;
    const sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });
    if (!sampleCtx) throw new Error('Could not create offscreen canvas context.');

    sampleCtx.drawImage(sourceCanvasOrImage, 0, 0, resolution, resolution);
    const imgData = sampleCtx.getImageData(0, 0, resolution, resolution);
    const colorBytes = imgData.data;

    // Sample depth if imported depth map is used
    let depthBytes: Uint8ClampedArray | null = null;
    if (settings.depthMethod === 'imported' && depthCanvasOrImage) {
      const dCanvas = document.createElement('canvas');
      dCanvas.width = resolution;
      dCanvas.height = resolution;
      const dCtx = dCanvas.getContext('2d', { willReadFrequently: true });
      if (dCtx) {
        dCtx.drawImage(depthCanvasOrImage, 0, 0, resolution, resolution);
        depthBytes = dCtx.getImageData(0, 0, resolution, resolution).data;
      }
    }

    const { depthMethod, depthIntensity, contrast, brightness, edgeInfluence, invertDepth } = settings;

    // Helper for luminance (ITU-R BT.601)
    const getLuma = (r: number, g: number, b: number) => {
      const rawL = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0;
      let adj = (rawL - 0.5) * contrast + 0.5 + (brightness - 1.0);
      adj = Math.max(0.0, Math.min(1.0, adj));
      return invertDepth ? 1.0 - adj : adj;
    };

    // Precalculate luminance grid for edge detection if contrast method
    let lumaGrid: Float32Array | null = null;
    if (depthMethod === 'contrast') {
      lumaGrid = new Float32Array(resolution * resolution);
      for (let y = 0; y < resolution; y++) {
        for (let x = 0; x < resolution; x++) {
          const idx = (y * resolution + x) * 4;
          lumaGrid[y * resolution + x] = getLuma(colorBytes[idx], colorBytes[idx + 1], colorBytes[idx + 2]);
        }
      }
    }

    // Header lines
    const headerLines = [
      'ply',
      'format ascii 1.0',
      'comment Real-Time 3D World Reconstruction Studio Export',
      `comment Method: ${depthMethod}, Resolution: ${resolution}x${resolution}`,
      `element vertex ${totalPoints}`,
      'property float x',
      'property float y',
      'property float z',
      'property uchar red',
      'property uchar green',
      'property uchar blue',
      'end_header\n',
    ];

    const lines: string[] = [headerLines.join('\n')];

    // Compute vertices
    for (let j = 0; j < resolution; j++) {
      // In Three.js geometry, top is +Y, so v goes from top to bottom
      const v = j / (resolution - 1);
      const yCoord = (v - 0.5) * 2.0;
      // In image coordinates, row 0 is top
      const row = resolution - 1 - j;

      for (let i = 0; i < resolution; i++) {
        const u = i / (resolution - 1);
        let xCoord = (u - 0.5) * 2.0;
        let yFinal = yCoord;

        if (aspectRatio >= 1.0) {
          xCoord *= aspectRatio;
        } else {
          yFinal /= aspectRatio;
        }

        const col = i;
        const pixelIdx = (row * resolution + col) * 4;

        const r = colorBytes[pixelIdx];
        const g = colorBytes[pixelIdx + 1];
        const b = colorBytes[pixelIdx + 2];

        let z = 0.0;

        if (depthMethod === 'luminance') {
          const L = getLuma(r, g, b);
          z = (L - 0.5) * depthIntensity;
        } else if (depthMethod === 'contrast' && lumaGrid) {
          const xLeft = Math.max(0, col - 1);
          const xRight = Math.min(resolution - 1, col + 1);
          const yTop = Math.max(0, row - 1);
          const yBottom = Math.min(resolution - 1, row + 1);

          const lLeft = lumaGrid[row * resolution + xLeft];
          const lRight = lumaGrid[row * resolution + xRight];
          const lUp = lumaGrid[yTop * resolution + col];
          const lDown = lumaGrid[yBottom * resolution + col];

          const dx = (lRight - lLeft) * 0.5;
          const dy = (lDown - lUp) * 0.5;
          const edge = Math.sqrt(dx * dx + dy * dy);

          const base = lumaGrid[row * resolution + col];
          const combined = Math.max(0.0, Math.min(1.0, base + edge * edgeInfluence));
          z = (combined - 0.5) * depthIntensity;
        } else if (depthMethod === 'imported' && depthBytes) {
          let d = depthBytes[pixelIdx] / 255.0;
          let adj = (d - 0.5) * contrast + 0.5 + (brightness - 1.0);
          adj = Math.max(0.0, Math.min(1.0, adj));
          if (invertDepth) adj = 1.0 - adj;
          z = (adj - 0.5) * depthIntensity;
        } else {
          const L = getLuma(r, g, b);
          z = (L - 0.5) * depthIntensity;
        }

        // Color post-processing matching shader
        const rAdj = Math.max(0, Math.min(255, Math.round(((r / 255.0 - 0.5) * contrast + 0.5 + (brightness - 1.0)) * 255)));
        const gAdj = Math.max(0, Math.min(255, Math.round(((g / 255.0 - 0.5) * contrast + 0.5 + (brightness - 1.0)) * 255)));
        const bAdj = Math.max(0, Math.min(255, Math.round(((b / 255.0 - 0.5) * contrast + 0.5 + (brightness - 1.0)) * 255)));

        lines.push(`${xCoord.toFixed(4)} ${yFinal.toFixed(4)} ${z.toFixed(4)} ${rAdj} ${gAdj} ${bAdj}\n`);
      }
    }

    const plyBlob = new Blob(lines, { type: 'text/plain' });
    const filename = `reconstruction_${formatTimestamp()}.ply`;

    // Trigger download
    const url = URL.createObjectURL(plyBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return {
      filename,
      pointCount: totalPoints,
      fileSizeBytes: plyBlob.size,
    };
  }
}
