import React from 'react';
import {
  Cpu,
  RotateCcw,
  Download,
  Gauge,
  Sparkles,
  Layers,
  Activity
} from 'lucide-react';
import { GPUStats } from '../types';

interface HeaderProps {
  stats: GPUStats;
  onResetScene: () => void;
  onOpenExport: () => void;
  onOpenBenchmark: () => void;
  onOpenPreview: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  stats,
  onResetScene,
  onOpenExport,
  onOpenBenchmark,
  onOpenPreview,
}) => {
  const isHealthyFps = stats.fps >= 50;
  const isModerateFps = stats.fps >= 25;

  return (
    <header className="h-14 bg-studio-panel border-b border-studio-border px-4 flex items-center justify-between select-none z-20 flex-shrink-0">
      {/* Brand & Title */}
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-600 to-cyan-400 p-[1px] flex items-center justify-center shadow-lg shadow-blue-500/10">
          <div className="w-full h-full bg-studio-bg rounded flex items-center justify-center">
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-bold tracking-wider text-xs md:text-sm text-slate-100 font-mono">
              REAL-TIME 3D RECONSTRUCTION STUDIO
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/30">
              GPU PIPELINE
            </span>
          </div>
          <div className="text-[10px] text-studio-dim font-mono hidden md:block">
            WebGL2 Custom GLSL Vertex Displacement & Point Cloud Shader
          </div>
        </div>
      </div>

      {/* Center GPU & Hardware Indicators */}
      <div className="hidden lg:flex items-center space-x-4 bg-studio-bg/60 border border-studio-border px-3 py-1 rounded-md text-xs font-mono">
        {/* GPU Status */}
        <div className="flex items-center space-x-1.5">
          <div className={`w-2 h-2 rounded-full ${stats.isWebGL2 ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
          <span className="text-studio-dim text-[11px]">GPU:</span>
          <span className="text-slate-200 text-[11px] font-medium">
            {stats.isWebGL2 ? 'WebGL2 ACTIVE' : 'UNAVAILABLE'}
          </span>
        </div>

        <div className="w-px h-3 bg-studio-border" />

        {/* Renderer Name snippet */}
        <div className="flex items-center space-x-1 max-w-[220px] truncate" title={stats.rendererName}>
          <Cpu className="w-3.5 h-3.5 text-studio-cyan" />
          <span className="text-studio-muted text-[11px] truncate">
            {stats.rendererName}
          </span>
        </div>

        <div className="w-px h-3 bg-studio-border" />

        {/* FPS Indicator */}
        <div className="flex items-center space-x-1.5">
          <Activity className="w-3.5 h-3.5 text-blue-400" />
          <span
            className={`font-semibold ${
              isHealthyFps
                ? 'text-emerald-400'
                : isModerateFps
                ? 'text-amber-400'
                : 'text-rose-400'
            }`}
          >
            {stats.fps} FPS
          </span>
          <span className="text-studio-dim text-[10px]">({stats.frameTimeMs}ms)</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-2">
        {/* 2D Preview Button */}
        <button
          onClick={onOpenPreview}
          className="px-2.5 py-1.5 rounded bg-studio-panelHover hover:bg-studio-border text-slate-300 hover:text-white border border-studio-border text-xs flex items-center space-x-1.5 transition-colors"
          title="Compare Source, Estimated Depth, and Imported Map"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">2D Depth Maps</span>
        </button>

        {/* Benchmark Button */}
        <button
          onClick={onOpenBenchmark}
          className="px-2.5 py-1.5 rounded bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 hover:text-blue-300 border border-blue-500/30 text-xs flex items-center space-x-1.5 transition-colors"
          title="Compare CPU vs GPU execution speeds"
        >
          <Gauge className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Benchmark</span>
        </button>

        {/* Reset Scene Button */}
        <button
          onClick={onResetScene}
          className="p-1.5 sm:px-2.5 sm:py-1.5 rounded bg-studio-panelHover hover:bg-studio-border text-slate-300 hover:text-white border border-studio-border text-xs flex items-center space-x-1 transition-colors"
          title="Reset Camera and Parameters"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Reset</span>
        </button>

        {/* Export PLY Button */}
        <button
          onClick={onOpenExport}
          className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center space-x-1.5 shadow-md shadow-blue-600/20 transition-all hover:shadow-blue-500/30"
          title="Export 3D Point Cloud as ASCII PLY"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export PLY</span>
        </button>
      </div>
    </header>
  );
};
