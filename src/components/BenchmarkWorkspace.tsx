import React, { useState, useEffect, useRef } from 'react';
import {
  Zap,
  Cpu,
  Gauge,
  Play,
  TrendingUp,
  Clock,
  Image as ImageIcon,
} from 'lucide-react';
import { BenchmarkMetrics, BenchmarkOperation, FileMetadata } from '../types';
import { CPUBenchmarkEngine } from '../gpu/CPUBenchmarkEngine';
import { FileUploader } from './FileUploader';

export const BenchmarkWorkspace: React.FC = () => {
  const [selectedOp, setSelectedOp] = useState<BenchmarkOperation>('sharpen');
  const [iterations, setIterations] = useState<number>(3);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [metrics, setMetrics] = useState<BenchmarkMetrics | null>(null);

  const [inputImageSrc, setInputImageSrc] = useState<string>('/samples/alpine_landscape.png');
  const [inputImageMeta, setInputImageMeta] = useState<{ name: string; width: number; height: number }>({
    name: 'alpine_landscape.png',
    width: 1024,
    height: 768,
  });

  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initialize input image on canvas
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || 1024;
      canvas.height = img.naturalHeight || 768;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        sourceCanvasRef.current = canvas;
      }
      setInputImageMeta({
        name: inputImageMeta.name,
        width: canvas.width,
        height: canvas.height,
      });
    };
    img.src = inputImageSrc;
  }, [inputImageSrc]);

  const handleFileLoaded = (meta: FileMetadata) => {
    setInputImageSrc(meta.objectUrl);
    setInputImageMeta({
      name: meta.name,
      width: meta.width,
      height: meta.height,
    });
    setMetrics(null);
  };

  const handleRunBenchmark = async () => {
    if (!sourceCanvasRef.current) return;
    setIsRunning(true);
    setMetrics(null);

    // Yield to UI to show running state
    await new Promise((r) => setTimeout(r, 50));

    try {
      const result = await CPUBenchmarkEngine.runBenchmarkComparison(
        sourceCanvasRef.current,
        selectedOp,
        iterations
      );
      setMetrics(result);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Benchmark execution failed.');
    } finally {
      setIsRunning(false);
    }
  };

  const opOptions: { id: BenchmarkOperation; name: string; desc: string }[] = [
    {
      id: 'sharpen',
      name: '3x3 Laplacian Convolution Sharpening',
      desc: 'High-frequency edge enhancement filter evaluated across all pixels',
    },
    {
      id: 'denoise',
      name: '5x5 Bilateral Edge-Preserving Denoising',
      desc: 'Non-linear spatial & photometric range Gaussian sampling',
    },
    {
      id: 'color_adjust',
      name: 'Brightness, Contrast, Gamma & Saturation',
      desc: 'Multi-parameter non-linear color grading and luminance transformation',
    },
    {
      id: 'resample_2x',
      name: '2x High-Fidelity Spatial Resampling',
      desc: 'Interpolation upscaling expanding pixel buffer by 4x',
    },
  ];

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden bg-[#090D13]">
      {/* LEFT: BENCHMARK CONFIGURATION PANEL */}
      <aside className="w-full lg:w-96 bg-studio-panel border-r border-studio-border flex flex-col h-full overflow-hidden flex-shrink-0 select-none">
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 text-xs text-slate-300">
          
          {/* Header */}
          <div className="space-y-1 pb-1.5 border-b border-studio-border">
            <div className="font-semibold text-slate-200 tracking-wider text-[11px] uppercase flex items-center space-x-1.5">
              <Gauge className="w-3.5 h-3.5 text-cyan-400" />
              <span>Benchmark Configuration</span>
            </div>
            <div className="text-[10px] text-studio-dim">
              Synchronized CPU pixel loop vs WebGL2 GPU shader execution
            </div>
          </div>

          {/* Input Workload */}
          <div className="space-y-2">
            <span className="font-semibold text-slate-200 text-[11px] uppercase tracking-wider flex items-center space-x-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
              <span>Benchmark Workload Image</span>
            </span>

            <FileUploader
              acceptedFormats={['png', 'jpg', 'jpeg']}
              onFileLoaded={handleFileLoaded}
              title="Upload Custom Image"
              description="Test CPU vs GPU on your own image"
              onLoadSample={() => {
                setInputImageSrc('/samples/alpine_landscape.png');
                setInputImageMeta({ name: 'alpine_landscape.png', width: 1024, height: 768 });
                setMetrics(null);
              }}
              sampleLabel="Load Alpine 1024×768"
            />

            <div className="bg-studio-bg border border-studio-border rounded p-2 text-[10px] font-mono text-studio-dim flex justify-between">
              <span>Resolution: {inputImageMeta.width} × {inputImageMeta.height}</span>
              <span>{(inputImageMeta.width * inputImageMeta.height).toLocaleString()} px</span>
            </div>
          </div>

          {/* Operation Selector */}
          <div className="space-y-2 pt-1 border-t border-studio-border/60">
            <span className="font-semibold text-slate-200 text-[11px] uppercase tracking-wider flex items-center space-x-1.5">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>Select Operation</span>
            </span>

            <div className="space-y-1.5">
              {opOptions.map((op) => (
                <button
                  key={op.id}
                  type="button"
                  onClick={() => {
                    setSelectedOp(op.id);
                    setMetrics(null);
                  }}
                  className={`w-full p-2.5 rounded border text-left transition-all ${
                    selectedOp === op.id
                      ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                      : 'bg-studio-bg border-studio-border hover:bg-studio-panelHover text-slate-300'
                  }`}
                >
                  <div className="text-[11px] font-medium leading-none mb-1">{op.name}</div>
                  <div className="text-[9px] text-studio-dim leading-tight">{op.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Iterations */}
          <div className="space-y-2 pt-1 border-t border-studio-border/60">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-300">Iterations (For Average Calculation)</span>
              <span className="font-mono text-cyan-400">{iterations} runs</span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {[1, 3, 5].map((it) => (
                <button
                  key={it}
                  type="button"
                  onClick={() => setIterations(it)}
                  className={`py-1.5 rounded border text-center text-[11px] font-mono transition-all ${
                    iterations === it
                      ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-bold'
                      : 'bg-studio-bg border-studio-border hover:bg-studio-panelHover text-slate-300'
                  }`}
                >
                  {it} {it === 1 ? 'Run' : 'Runs'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* BOTTOM RUN BUTTON */}
        <div className="p-3 border-t border-studio-border bg-studio-panel">
          <button
            type="button"
            onClick={handleRunBenchmark}
            disabled={isRunning}
            className="w-full py-2.5 px-3 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium text-[11px] flex items-center justify-center space-x-1.5 shadow-lg transition-all disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>{isRunning ? 'Benchmarking in Progress...' : 'Run CPU vs GPU Benchmark'}</span>
          </button>
        </div>
      </aside>

      {/* CENTER: RESULTS & PERFORMANCE CHART */}
      <main className="flex-1 flex flex-col p-6 overflow-y-auto bg-[#090D13]">
        <div className="max-w-4xl mx-auto w-full space-y-6">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-studio-border">
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center space-x-2">
                <span>Hardware Execution Comparison</span>
              </h2>
              <p className="text-xs text-studio-dim mt-0.5">
                Fair comparison: identical algorithm parameters, synchronized with GPU flush
              </p>
            </div>

            {metrics && (
              <div className="px-3 py-1 rounded bg-emerald-950/40 border border-emerald-800 text-emerald-300 font-mono text-xs font-bold flex items-center space-x-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>{metrics.speedup}x GPU SPEEDUP</span>
              </div>
            )}
          </div>

          {/* Results Cards */}
          {metrics ? (
            <div className="space-y-6 animate-fade-in">
              {/* Primary KPI Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="bg-studio-panel border border-studio-border rounded-lg p-3.5 space-y-1">
                  <div className="text-[10px] text-studio-dim uppercase tracking-wider flex items-center space-x-1">
                    <Cpu className="w-3.5 h-3.5 text-amber-400" />
                    <span>CPU Time (Avg)</span>
                  </div>
                  <div className="text-xl font-bold font-mono text-amber-300">
                    {metrics.cpuTimeMs} ms
                  </div>
                  <div className="text-[9px] text-studio-dim">
                    Throughput: {metrics.cpuMegapixelsPerSec} MP/s
                  </div>
                </div>

                <div className="bg-studio-panel border border-studio-border rounded-lg p-3.5 space-y-1">
                  <div className="text-[10px] text-studio-dim uppercase tracking-wider flex items-center space-x-1">
                    <Zap className="w-3.5 h-3.5 text-cyan-400" />
                    <span>GPU Time (Avg)</span>
                  </div>
                  <div className="text-xl font-bold font-mono text-cyan-300">
                    {metrics.gpuTimeMs} ms
                  </div>
                  <div className="text-[9px] text-studio-dim">
                    Throughput: {metrics.gpuMegapixelsPerSec} MP/s
                  </div>
                </div>

                <div className="bg-studio-panel border border-studio-border rounded-lg p-3.5 space-y-1">
                  <div className="text-[10px] text-studio-dim uppercase tracking-wider flex items-center space-x-1">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Speedup Factor</span>
                  </div>
                  <div className="text-xl font-bold font-mono text-emerald-300">
                    {metrics.speedup}x
                  </div>
                  <div className="text-[9px] text-studio-dim">
                    CPU time / GPU time
                  </div>
                </div>

                <div className="bg-studio-panel border border-studio-border rounded-lg p-3.5 space-y-1">
                  <div className="text-[10px] text-studio-dim uppercase tracking-wider flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    <span>Time Saved</span>
                  </div>
                  <div className="text-xl font-bold font-mono text-blue-300">
                    {metrics.timeSavedMs} ms
                  </div>
                  <div className="text-[9px] text-studio-dim">
                    {metrics.percentReduction}% reduction
                  </div>
                </div>
              </div>

              {/* Comparative Execution Time Bar Chart */}
              <div className="bg-studio-panel border border-studio-border rounded-lg p-5 space-y-4">
                <div className="text-xs font-semibold text-slate-200">
                  Execution Latency Comparison (Lower is Better)
                </div>

                <div className="space-y-3">
                  {/* CPU Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-amber-300 flex items-center space-x-1.5">
                        <Cpu className="w-3.5 h-3.5 text-amber-400" />
                        <span>CPU Thread (Uint8ClampedArray)</span>
                      </span>
                      <span className="font-bold text-amber-300">{metrics.cpuTimeMs} ms</span>
                    </div>
                    <div className="w-full h-5 bg-slate-900 rounded overflow-hidden p-0.5">
                      <div
                        className="h-full bg-amber-500 rounded transition-all duration-500"
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>

                  {/* GPU Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-cyan-300 flex items-center space-x-1.5">
                        <Zap className="w-3.5 h-3.5 text-cyan-400" />
                        <span>GPU Hardware (WebGL2 Shader)</span>
                      </span>
                      <span className="font-bold text-cyan-300">{metrics.gpuTimeMs} ms</span>
                    </div>
                    <div className="w-full h-5 bg-slate-900 rounded overflow-hidden p-0.5">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded transition-all duration-500"
                        style={{
                          width: `${Math.max(2, (metrics.gpuTimeMs / metrics.cpuTimeMs) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Technical Details Card */}
              <div className="bg-studio-bg border border-studio-border rounded-lg p-4 space-y-2 text-xs font-mono text-studio-dim">
                <div className="text-slate-200 font-semibold text-[11px] uppercase tracking-wider">
                  Test Execution Audit
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-1 text-[11px]">
                  <div>Operation: {metrics.operationName}</div>
                  <div>Resolution: {metrics.imageWidth} × {metrics.imageHeight}</div>
                  <div>Total Pixels: {metrics.totalPixels.toLocaleString()}</div>
                  <div>Averaged Runs: {metrics.iterations}</div>
                  <div>GPU Sync Method: gl.finish() Barrier</div>
                  <div>Measurement: Browser Performance API</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-studio-panel border border-studio-border rounded-lg p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-cyan-400">
                <Gauge className="w-6 h-6" />
              </div>
              <div className="text-sm font-semibold text-slate-200">
                {isRunning ? 'Executing Benchmark on CPU & GPU...' : 'Ready to Run Benchmark'}
              </div>
              <p className="text-xs text-studio-dim max-w-md mx-auto">
                {isRunning
                  ? 'Executing CPU pixel loops and synchronized WebGL2 shader passes. Please wait...'
                  : 'Select an operation on the left panel and click "Run CPU vs GPU Benchmark" to record real hardware execution timings.'}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
