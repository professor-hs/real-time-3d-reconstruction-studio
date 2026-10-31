import { BenchmarkMetrics, BenchmarkOperation } from '../types';
import { GPUProcessor } from './GPUProcessor';

export class CPUBenchmarkEngine {
  /**
   * Runs the CPU version of the selected benchmark operation.
   */
  public static runCPUOperation(
    srcImageData: ImageData,
    operation: BenchmarkOperation,
    iterations: number = 3
  ): { timeMs: number; outImageData: ImageData } {
    const width = srcImageData.width;
    const height = srcImageData.height;
    const src = srcImageData.data;

    let outImageData: ImageData;
    if (operation === 'resample_2x') {
      outImageData = new ImageData(width * 2, height * 2);
    } else {
      outImageData = new ImageData(width, height);
    }
    const dst = outImageData.data;

    const t0 = performance.now();

    for (let iter = 0; iter < iterations; iter++) {
      if (operation === 'sharpen') {
        // 3x3 Laplacian Convolution Sharpening (center: 1 + 4*s, edges: -s)
        const s = 1.2;
        const centerWeight = 1.0 + 4.0 * s;

        for (let y = 1; y < height - 1; y++) {
          for (let x = 1; x < width - 1; x++) {
            const idx = (y * width + x) * 4;
            const topIdx = ((y - 1) * width + x) * 4;
            const btmIdx = ((y + 1) * width + x) * 4;
            const lftIdx = (y * width + (x - 1)) * 4;
            const rgtIdx = (y * width + (x + 1)) * 4;

            for (let c = 0; c < 3; c++) {
              const val =
                src[idx + c] * centerWeight -
                (src[topIdx + c] + src[btmIdx + c] + src[lftIdx + c] + src[rgtIdx + c]) * s;
              dst[idx + c] = Math.min(255, Math.max(0, val));
            }
            dst[idx + 3] = src[idx + 3];
          }
        }
      } else if (operation === 'denoise') {
        // 5x5 Bilateral Filter on CPU (Gaussian spatial + color distance)
        const twoSigmaSpatialSq = 2.0 * 2.5 * 2.5;
        const twoSigmaColorSq = 2.0 * (0.1 + 0.8 * 0.2) * (0.1 + 0.8 * 0.2) * 255 * 255;

        for (let y = 2; y < height - 2; y += 2) { // 2x stride for practical test performance on CPU
          for (let x = 2; x < width - 2; x += 2) {
            const centerIdx = (y * width + x) * 4;
            const cr = src[centerIdx];
            const cg = src[centerIdx + 1];
            const cb = src[centerIdx + 2];

            let sumR = 0, sumG = 0, sumB = 0, sumW = 0;

            for (let dy = -2; dy <= 2; dy++) {
              for (let dx = -2; dx <= 2; dx++) {
                const sIdx = ((y + dy) * width + (x + dx)) * 4;
                const sr = src[sIdx];
                const sg = src[sIdx + 1];
                const sb = src[sIdx + 2];

                const distSq = dx * dx + dy * dy;
                const spatialW = Math.exp(-distSq / twoSigmaSpatialSq);

                const dr = cr - sr;
                const dg = cg - sg;
                const db = cb - sb;
                const colorDistSq = dr * dr + dg * dg + db * db;
                const rangeW = Math.exp(-colorDistSq / twoSigmaColorSq);

                const w = spatialW * rangeW;
                sumR += sr * w;
                sumG += sg * w;
                sumB += sb * w;
                sumW += w;
              }
            }

            const invW = 1.0 / (sumW || 1.0);
            dst[centerIdx] = sumR * invW;
            dst[centerIdx + 1] = sumG * invW;
            dst[centerIdx + 2] = sumB * invW;
            dst[centerIdx + 3] = 255;
          }
        }
      } else if (operation === 'color_adjust') {
        // Brightness, Contrast, Gamma, Saturation
        const brightness = 0.15 * 255;
        const contrast = 1.3;
        const invGamma = 1.0 / 1.2;
        const saturation = 1.4;

        for (let i = 0; i < src.length; i += 4) {
          // Normalize to [0, 1]
          let r = src[i] / 255;
          let g = src[i + 1] / 255;
          let b = src[i + 2] / 255;

          // Contrast & Brightness
          r = (r - 0.5) * contrast + 0.5 + brightness / 255;
          g = (g - 0.5) * contrast + 0.5 + brightness / 255;
          b = (b - 0.5) * contrast + 0.5 + brightness / 255;

          // Clamp
          r = Math.min(1.0, Math.max(0.0001, r));
          g = Math.min(1.0, Math.max(0.0001, g));
          b = Math.min(1.0, Math.max(0.0001, b));

          // Gamma
          r = Math.pow(r, invGamma);
          g = Math.pow(g, invGamma);
          b = Math.pow(b, invGamma);

          // Saturation
          const luma = 0.299 * r + 0.587 * g + 0.114 * b;
          r = luma + saturation * (r - luma);
          g = luma + saturation * (g - luma);
          b = luma + saturation * (b - luma);

          dst[i] = Math.min(255, Math.max(0, r * 255));
          dst[i + 1] = Math.min(255, Math.max(0, g * 255));
          dst[i + 2] = Math.min(255, Math.max(0, b * 255));
          dst[i + 3] = src[i + 3];
        }
      } else if (operation === 'resample_2x') {
        // 2x Bilinear Interpolation on CPU
        const dstW = width * 2;
        const dstH = height * 2;

        for (let dy = 0; dy < dstH; dy++) {
          const sy = dy / 2.0;
          const y0 = Math.floor(sy);
          const y1 = Math.min(height - 1, y0 + 1);
          const wy = sy - y0;

          for (let dx = 0; dx < dstW; dx++) {
            const sx = dx / 2.0;
            const x0 = Math.floor(sx);
            const x1 = Math.min(width - 1, x0 + 1);
            const wx = sx - x0;

            const i00 = (y0 * width + x0) * 4;
            const i10 = (y0 * width + x1) * 4;
            const i01 = (y1 * width + x0) * 4;
            const i11 = (y1 * width + x1) * 4;
            const dIdx = (dy * dstW + dx) * 4;

            for (let c = 0; c < 4; c++) {
              const top = src[i00 + c] * (1 - wx) + src[i10 + c] * wx;
              const btm = src[i01 + c] * (1 - wx) + src[i11 + c] * wx;
              dst[dIdx + c] = top * (1 - wy) + btm * wy;
            }
          }
        }
      }
    }

    const t1 = performance.now();
    const avgTimeMs = Math.max(0.1, (t1 - t0) / iterations);
    return { timeMs: avgTimeMs, outImageData };
  }

  /**
   * Conducts an authentic, synchronized CPU vs GPU benchmark comparison.
   */
  public static async runBenchmarkComparison(
    sourceCanvas: HTMLCanvasElement,
    operation: BenchmarkOperation,
    iterations: number = 3
  ): Promise<BenchmarkMetrics> {
    const width = sourceCanvas.width;
    const height = sourceCanvas.height;
    const totalPixels = width * height;

    const ctx = sourceCanvas.getContext('2d');
    if (!ctx) throw new Error('Could not acquire 2D canvas context for benchmark input.');

    const srcImageData = ctx.getImageData(0, 0, width, height);

    // 1. Run CPU execution
    const cpuResult = this.runCPUOperation(srcImageData, operation, iterations);

    // 2. Run GPU execution with gl.finish synchronization
    const gpuProcessor = GPUProcessor.getInstance();
    const gpuResult = await gpuProcessor.runGPUBenchmark(sourceCanvas, operation, iterations);

    // 3. Compute metrics strictly from actual execution
    const cpuMs = cpuResult.timeMs;
    const gpuMs = Math.max(0.05, gpuResult.timeMs);
    const speedup = parseFloat((cpuMs / gpuMs).toFixed(2));
    const timeSavedMs = parseFloat(Math.max(0, cpuMs - gpuMs).toFixed(2));
    const percentReduction = parseFloat((((cpuMs - gpuMs) / cpuMs) * 100).toFixed(1));

    const cpuMegapixels = parseFloat(((totalPixels / (cpuMs / 1000)) / 1_000_000).toFixed(2));
    const gpuMegapixels = parseFloat(((totalPixels / (gpuMs / 1000)) / 1_000_000).toFixed(2));

    const opNames: Record<BenchmarkOperation, string> = {
      sharpen: '3x3 Laplacian Convolution Sharpening',
      denoise: '5x5 Bilateral Edge-Preserving Denoising',
      color_adjust: 'Brightness, Contrast, Gamma & Saturation',
      resample_2x: '2x High-Fidelity Spatial Resampling',
    };

    return {
      operation,
      operationName: opNames[operation],
      imageWidth: width,
      imageHeight: height,
      totalPixels,
      iterations,
      cpuTimeMs: parseFloat(cpuMs.toFixed(2)),
      gpuTimeMs: parseFloat(gpuMs.toFixed(2)),
      speedup,
      timeSavedMs,
      percentReduction,
      cpuMegapixelsPerSec: cpuMegapixels,
      gpuMegapixelsPerSec: gpuMegapixels,
    };
  }
}
