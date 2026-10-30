import React, { useState } from 'react';
import { X, Gauge, Play, AlertCircle, Info, Cpu, Layers } from 'lucide-react';
import { BenchmarkResult, Resolution } from '../types';
import { formatNumber } from '../utils/formatters';

interface BenchmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRunBenchmark: () => Promise<BenchmarkResult>;
  currentResolution: Resolution;
}

export const BenchmarkModal: React.FC<BenchmarkModalProps> = ({
  isOpen,
  onClose,
  onRunBenchmark,
  currentResolution,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<BenchmarkResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRun = async () => {
    setIsRunning(true);
    setError(null);
    try {
      const res = await onRunBenchmark();
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Benchmark execution failed.');
    } finally {
      setIsRunning(false);
    }
  };

  // Compute visual bar ratio
  const maxTime = result ? Math.max(result.cpuTimeMs, result.gpuTimeMs || 1) : 1;
  const cpuBarWidth = result ? Math.min(100, Math.max(8, (result.cpuTimeMs / maxTime) * 100)) : 0;
  const gpuBarWidth = result && result.gpuTimeMs ? Math.min(100, Math.max(8, (result.gpuTimeMs / maxTime) * 100)) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none animate-fadeIn">
      <div className="bg-studio-panel border border-studio-border rounded-lg max-w-xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-studio-border flex items-center justify-between bg-studio-bg/60">
          <div className="flex items-center space-x-2">
            <Gauge className="w-4 h-4 text-studio-accent" />
            <h2 className="text-sm font-semibold text-slate-100 font-mono tracking-wide">
              CPU VS GPU PERFORMANCE BENCHMARK
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-studio-panelHover text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto text-xs text-slate-300">
          <p className="text-studio-dim leading-relaxed">
            This benchmark measures the computational throughput of luminance depth approximation across{' '}
            <span className="text-cyan-400 font-mono font-medium">
              {formatNumber(currentResolution * currentResolution)} pixels ({currentResolution}×{currentResolution})
            </span>.
            The CPU method executes sequential JavaScript floating-point transformations, while the GPU executes massive SIMD parallel vertex displacement in WebGL2 hardware shaders.
          </p>

          {/* Action Button */}
          <div className="flex items-center space-x-3">
            <button
              onClick={handleRun}
              disabled={isRunning}
              className={`px-4 py-2 rounded text-xs font-medium flex items-center space-x-2 transition-all ${
                isRunning
                  ? 'bg-blue-600/50 text-slate-300 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20'
              }`}
            >
              {isRunning ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Benchmarking Pipeline...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>{result ? 'Run Benchmark Again' : 'Start Benchmark'}</span>
                </>
              )}
            </button>
            <span className="text-studio-dim text-[11px] font-mono">
              Target Resolution: {currentResolution}×{currentResolution}
            </span>
          </div>

          {error && (
            <div className="p-3 rounded bg-rose-950/40 border border-rose-800/40 text-rose-300 flex items-center space-x-2 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Results Display */}
          {result && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-studio-bg border border-studio-border p-3 rounded">
                  <div className="text-[10px] text-studio-dim font-mono mb-1">CPU Sequential</div>
                  <div className="text-lg font-bold font-mono text-amber-400">
                    {result.cpuTimeMs} <span className="text-xs font-normal">ms</span>
                  </div>
                  <div className="text-[9px] text-studio-dim mt-0.5">JS Float32 Array</div>
                </div>

                <div className="bg-studio-bg border border-studio-border p-3 rounded">
                  <div className="text-[10px] text-studio-dim font-mono mb-1">GPU WebGL2 Shader</div>
                  <div className="text-lg font-bold font-mono text-emerald-400">
                    {result.gpuTimeMs} <span className="text-xs font-normal">ms</span>
                  </div>
                  <div className="text-[9px] text-studio-dim mt-0.5">
                    {result.isApproximateGpu ? 'Wall-clock sync' : 'Hardware Timer'}
                  </div>
                </div>

                <div className="bg-studio-bg border border-studio-border p-3 rounded">
                  <div className="text-[10px] text-studio-dim font-mono mb-1">Measured Speedup</div>
                  <div className="text-lg font-bold font-mono text-cyan-400">
                    {result.speedup ? `${result.speedup}x` : 'N/A'}
                  </div>
                  <div className="text-[9px] text-studio-dim mt-0.5">GPU Acceleration</div>
                </div>
              </div>

              {/* Graphical Performance Bar Chart */}
              <div className="bg-studio-bg border border-studio-border rounded p-3.5 space-y-3">
                <div className="text-[11px] font-semibold text-slate-200">Execution Duration Comparison (Lower is Faster)</div>

                {/* CPU Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-amber-300 font-medium flex items-center space-x-1">
                      <Cpu className="w-3 h-3 text-amber-400" />
                      <span>CPU Sequential Execution</span>
                    </span>
                    <span className="text-slate-300">{result.cpuTimeMs} ms</span>
                  </div>
                  <div className="w-full bg-studio-panel h-3 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-amber-500 to-amber-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${cpuBarWidth}%` }}
                    />
                  </div>
                </div>

                {/* GPU Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-emerald-300 font-medium flex items-center space-x-1">
                      <Layers className="w-3 h-3 text-emerald-400" />
                      <span>GPU Hardware Shader Dispatch</span>
                    </span>
                    <span className="text-slate-300">{result.gpuTimeMs} ms</span>
                  </div>
                  <div className="w-full bg-studio-panel h-3 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${gpuBarWidth}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Explanatory Scientific Note */}
              <div className="bg-studio-bg/60 border border-studio-border rounded p-3 space-y-1.5 text-[10px] text-slate-400">
                <div className="flex items-center space-x-1.5 text-blue-400 font-medium">
                  <Info className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Technical Evaluation & Browser Overhead Note</span>
                </div>
                <p className="leading-relaxed">
                  As required by rigorous graphics engineering standards, GPU timings measured via WebGL2 include browser compositor scheduling, command buffer submission, and synchronization overhead (<code>gl.finish()</code>). As a result, the GPU throughput gain becomes especially pronounced at high grid resolutions (512×512 = 262,144 points), where GPU hardware thread scheduling dominates memory latency.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-studio-border bg-studio-bg/60 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-studio-panelHover hover:bg-studio-border text-slate-200 text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
