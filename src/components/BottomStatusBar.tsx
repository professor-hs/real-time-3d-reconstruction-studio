import React from 'react';
import { Activity, Cpu, CheckCircle, Layers, Box } from 'lucide-react';
import { GPUStats, StudioModule } from '../types';

interface BottomStatusBarProps {
  currentModule: StudioModule;
  stats: GPUStats;
  exportStatus: string | null;
}

export const BottomStatusBar: React.FC<BottomStatusBarProps> = ({
  currentModule,
  stats,
  exportStatus,
}) => {
  const isHealthyFps = stats.fps >= 50;

  return (
    <footer className="h-7 bg-studio-panel border-t border-studio-border px-4 flex items-center justify-between text-[11px] font-mono select-none z-20 flex-shrink-0 text-studio-dim">
      {/* Left Status */}
      <div className="flex items-center space-x-3 truncate">
        <div className="flex items-center space-x-1.5 text-emerald-400">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-medium">SYSTEM READY</span>
        </div>

        <span className="text-studio-border hidden sm:inline">•</span>

        <span className="hidden sm:inline text-slate-300">
          Active Pipeline: {currentModule === 'world' ? 'GLSL Vertex Displacement' : 'WebGL2 3D Volume Ray-Casting'}
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
        <div className="hidden md:flex items-center space-x-1 text-slate-400">
          {currentModule === 'world' ? (
            <Layers className="w-3 h-3 text-cyan-400" />
          ) : (
            <Box className="w-3 h-3 text-blue-400" />
          )}
          <span className="uppercase">{currentModule} MODE</span>
        </div>

        <span className="text-studio-border hidden md:inline">•</span>

        <div className="flex items-center space-x-1">
          <Activity className="w-3 h-3 text-blue-400" />
          <span className={isHealthyFps ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
            {stats.fps} FPS
          </span>
          <span className="text-studio-dim text-[10px]">({stats.frameTimeMs}ms)</span>
        </div>

        <span className="text-studio-border">•</span>

        <div className="flex items-center space-x-1 text-slate-300">
          <Cpu className="w-3 h-3 text-cyan-400" />
          <span className="hidden lg:inline">{stats.isWebGL2 ? 'WebGL 2.0 Accelerated' : 'Software Fallback'}</span>
        </div>
      </div>
    </footer>
  );
};
