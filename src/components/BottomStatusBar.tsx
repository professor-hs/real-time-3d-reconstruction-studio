import React from 'react';
import {
  Activity,
  Layers,
  Cpu,
  CheckCircle,
  FileText
} from 'lucide-react';
import { GPUStats, MediaMetadata, ReconstructionSettings } from '../types';
import { formatNumber } from '../utils/formatters';

interface BottomStatusBarProps {
  stats: GPUStats;
  metadata: MediaMetadata;
  settings: ReconstructionSettings;
  exportStatus: string | null;
}

export const BottomStatusBar: React.FC<BottomStatusBarProps> = ({
  stats,
  metadata,
  settings,
  exportStatus,
}) => {
  const isHealthyFps = stats.fps >= 50;

  return (
    <footer className="h-7 bg-studio-panel border-t border-studio-border px-4 flex items-center justify-between text-[11px] font-mono select-none z-20 flex-shrink-0 text-studio-dim">
      {/* Left Status */}
      <div className="flex items-center space-x-3 truncate">
        <div className="flex items-center space-x-1.5 text-emerald-400">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-medium">ENGINE READY</span>
        </div>

        <span className="text-studio-border hidden sm:inline">•</span>

        <span className="hidden sm:inline text-slate-300">
          Pipeline: GLSL Vertex Displacement ({settings.depthMethod.toUpperCase()})
        </span>

        {exportStatus && (
          <>
            <span className="text-studio-border">•</span>
            <span className="text-cyan-300 flex items-center space-x-1">
              <CheckCircle className="w-3 h-3 text-cyan-400" />
              <span>{exportStatus}</span>
            </span>
          </>
        )}
      </div>

      {/* Right Metrics */}
      <div className="flex items-center space-x-4">
        {/* Dimensions */}
        <div className="hidden md:flex items-center space-x-1">
          <FileText className="w-3 h-3 text-studio-dim" />
          <span className="text-slate-400">Input:</span>
          <span className="text-slate-200">{metadata.width}×{metadata.height}</span>
        </div>

        <span className="text-studio-border hidden md:inline">•</span>

        {/* Rendered Points */}
        <div className="flex items-center space-x-1">
          <Layers className="w-3 h-3 text-studio-dim" />
          <span className="text-slate-400 hidden sm:inline">Rendered Points:</span>
          <span className="text-cyan-300 font-semibold">{formatNumber(stats.pointCount || (settings.resolution * settings.resolution))}</span>
        </div>

        <span className="text-studio-border">•</span>

        {/* FPS */}
        <div className="flex items-center space-x-1">
          <Activity className="w-3 h-3 text-blue-400" />
          <span className={isHealthyFps ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
            {stats.fps} FPS
          </span>
        </div>

        <span className="text-studio-border">•</span>

        {/* GPU Status */}
        <div className="flex items-center space-x-1 text-slate-300">
          <Cpu className="w-3 h-3 text-cyan-400" />
          <span className="hidden lg:inline">{stats.isWebGL2 ? 'WebGL2 Accelerated' : 'Software Fallback'}</span>
        </div>
      </div>
    </footer>
  );
};
