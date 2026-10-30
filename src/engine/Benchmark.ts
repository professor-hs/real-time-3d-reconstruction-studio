import * as THREE from 'three';
import { BenchmarkResult, Resolution } from '../types';

export class BenchmarkRunner {
  /**
   * Runs CPU depth calculation reference benchmark
   */
  public static runCpuBenchmark(
    sourceCanvasOrImage: HTMLCanvasElement | HTMLImageElement,
    resolution: Resolution,
    iterations = 5
  ): { timeMs: number; pixels: number } {
    const totalPixels = resolution * resolution;
    const canvas = document.createElement('canvas');
    canvas.width = resolution;
    canvas.height = resolution;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return { timeMs: 0, pixels: totalPixels };

    ctx.drawImage(sourceCanvasOrImage, 0, 0, resolution, resolution);
    const imgData = ctx.getImageData(0, 0, resolution, resolution);
    const data = imgData.data;
    const outputZ = new Float32Array(totalPixels);

    const start = performance.now();

    for (let it = 0; it < iterations; it++) {
      for (let i = 0; i < totalPixels; i++) {
        const idx = i * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0;
        outputZ[i] = (luma - 0.5) * 1.5;
      }
    }

    const elapsed = (performance.now() - start) / iterations;
    return { timeMs: elapsed, pixels: totalPixels };
  }

  /**
   * Runs GPU shader execution benchmark using Three.js WebGLRenderer
   */
  public static async runGpuBenchmark(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    _resolution: Resolution,
    iterations = 20
  ): Promise<{ timeMs: number; isDisjointTimer: boolean }> {
    const gl = renderer.getContext() as WebGL2RenderingContext;
    const extTimer = gl.getExtension('EXT_disjoint_timer_query_webgl2');

    // Warm-up pass
    renderer.render(scene, camera);
    gl.finish();

    if (extTimer) {
      // Hardware GPU Timer Query
      const query = gl.createQuery();
      if (query) {
        gl.beginQuery(extTimer.TIME_ELAPSED_EXT, query);
        for (let i = 0; i < iterations; i++) {
          renderer.render(scene, camera);
        }
        gl.endQuery(extTimer.TIME_ELAPSED_EXT);

        // Wait for disjoint query result asynchronously
        const elapsedNs = await new Promise<number>((resolve) => {
          const check = () => {
            const available = gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE);
            const disjoint = gl.getParameter(extTimer.GPU_DISJOINT_EXT);

            if (available && !disjoint) {
              const timeNanoseconds = gl.getQueryParameter(query, gl.QUERY_RESULT);
              gl.deleteQuery(query);
              resolve(timeNanoseconds);
            } else if (disjoint) {
              gl.deleteQuery(query);
              resolve(0);
            } else {
              requestAnimationFrame(check);
            }
          };
          requestAnimationFrame(check);
        });

        if (elapsedNs > 0) {
          const timeMs = (elapsedNs / 1_000_000) / iterations;
          return { timeMs, isDisjointTimer: true };
        }
      }
    }

    // High-resolution wall-clock fallback with gl.finish() synchronization
    const t0 = performance.now();
    for (let i = 0; i < iterations; i++) {
      renderer.render(scene, camera);
    }
    gl.finish(); // Synchronize GPU command queue
    const t1 = performance.now();
    const timeMs = (t1 - t0) / iterations;

    return { timeMs, isDisjointTimer: false };
  }

  /**
   * Runs full comparative benchmark
   */
  public static async runFullBenchmark(
    sourceCanvasOrImage: HTMLCanvasElement | HTMLImageElement,
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    resolution: Resolution
  ): Promise<BenchmarkResult> {
    const cpuRes = this.runCpuBenchmark(sourceCanvasOrImage, resolution);
    const gpuRes = await this.runGpuBenchmark(renderer, scene, camera, resolution);

    const speedup = (gpuRes.timeMs > 0 && cpuRes.timeMs > 0)
      ? parseFloat((cpuRes.timeMs / gpuRes.timeMs).toFixed(2))
      : null;

    return {
      resolution,
      pixelCount: cpuRes.pixels,
      cpuTimeMs: parseFloat(cpuRes.timeMs.toFixed(3)),
      gpuTimeMs: parseFloat(gpuRes.timeMs.toFixed(3)),
      speedup,
      method: 'Luminance Depth Reconstruction',
      timestamp: new Date().toLocaleTimeString(),
      isApproximateGpu: !gpuRes.isDisjointTimer,
    };
  }
}
