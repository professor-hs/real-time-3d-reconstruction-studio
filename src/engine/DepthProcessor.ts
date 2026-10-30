import { ReconstructionSettings } from '../types';

export class DepthProcessor {
  /**
   * Generates a 2D canvas representing the estimated depth map according to
   * the exact same mathematical formula executed in the GLSL vertex shader.
   */
  public static generateDepthPreviewCanvas(
    sourceCanvasOrImage: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement,
    settings: ReconstructionSettings,
    targetWidth = 512,
    targetHeight = 512
  ): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return canvas;

    // Draw source scaled to target resolution
    ctx.drawImage(sourceCanvasOrImage, 0, 0, targetWidth, targetHeight);
    const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
    const data = imgData.data;
    const outputData = ctx.createImageData(targetWidth, targetHeight);
    const out = outputData.data;

    const { depthMethod, contrast, brightness, edgeInfluence, invertDepth } = settings;

    // Helper for luminance (ITU-R BT.601)
    const getLuma = (r: number, g: number, b: number) => {
      const rawL = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0;
      let adj = (rawL - 0.5) * contrast + 0.5 + (brightness - 1.0);
      adj = Math.max(0.0, Math.min(1.0, adj));
      return invertDepth ? 1.0 - adj : adj;
    };

    if (depthMethod === 'luminance') {
      for (let i = 0; i < data.length; i += 4) {
        const luma = getLuma(data[i], data[i + 1], data[i + 2]);
        const val = Math.round(luma * 255);
        out[i] = val;
        out[i + 1] = val;
        out[i + 2] = val;
        out[i + 3] = 255;
      }
    } else if (depthMethod === 'contrast') {
      // Precompute luminance grid for edge detection
      const lumaGrid = new Float32Array(targetWidth * targetHeight);
      for (let y = 0; y < targetHeight; y++) {
        for (let x = 0; x < targetWidth; x++) {
          const idx = (y * targetWidth + x) * 4;
          lumaGrid[y * targetWidth + x] = getLuma(data[idx], data[idx + 1], data[idx + 2]);
        }
      }

      for (let y = 0; y < targetHeight; y++) {
        const yTop = Math.max(0, y - 1);
        const yBottom = Math.min(targetHeight - 1, y + 1);

        for (let x = 0; x < targetWidth; x++) {
          const xLeft = Math.max(0, x - 1);
          const xRight = Math.min(targetWidth - 1, x + 1);

          const lLeft = lumaGrid[y * targetWidth + xLeft];
          const lRight = lumaGrid[y * targetWidth + xRight];
          const lUp = lumaGrid[yTop * targetWidth + x];
          const lDown = lumaGrid[yBottom * targetWidth + x];

          const dx = (lRight - lLeft) * 0.5;
          const dy = (lDown - lUp) * 0.5;
          const edge = Math.sqrt(dx * dx + dy * dy);

          const base = lumaGrid[y * targetWidth + x];
          const combined = Math.max(0.0, Math.min(1.0, base + edge * edgeInfluence));
          const val = Math.round(combined * 255);

          const idx = (y * targetWidth + x) * 4;
          out[idx] = val;
          out[idx + 1] = val;
          out[idx + 2] = val;
          out[idx + 3] = 255;
        }
      }
    } else {
      // Imported depth map: already grayscale
      for (let i = 0; i < data.length; i += 4) {
        let d = data[i] / 255.0;
        let adj = (d - 0.5) * contrast + 0.5 + (brightness - 1.0);
        adj = Math.max(0.0, Math.min(1.0, adj));
        if (invertDepth) adj = 1.0 - adj;
        const val = Math.round(adj * 255);
        out[i] = val;
        out[i + 1] = val;
        out[i + 2] = val;
        out[i + 3] = 255;
      }
    }

    ctx.putImageData(outputData, 0, 0);
    return canvas;
  }
}
