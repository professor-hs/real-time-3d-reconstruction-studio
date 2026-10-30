import React from 'react';
import {
  Activity,
  Cpu,
  Layers,
  Box,
  HardDrive,
  Info,
  Clock,
  Zap,
  ShieldCheck
} from 'lucide-react';
import { GPUStats, MediaMetadata, ReconstructionSettings } from '../types';
import { formatBytes, formatNumber } from '../utils/formatters';

interface RightInspectorProps {
  stats: GPUStats;
  metadata: MediaMetadata;
  settings: ReconstructionSettings;
}

export const RightInspector: React.FC<RightInspectorProps> = ({
  stats,
  metadata,
  settings,
}) => {
  // Estimated 3D bounding volume dimensions
  const boundX = metadata.aspectRatio >= 1.0 ? (2.0 * metadata.aspectRatio).toFixed(2) : '2.00';
  const boundY = metadata.aspectRatio < 1.0 ? (2.0 / metadata.aspectRatio).toFixed(2) : '2.00';
  const boundZ = (settings.depthIntensity).toFixed(2);

  return (
    <aside className="w-72 md:w-80 bg-studio-panel border-l border-studio-border flex flex-col h-full overflow-hidden flex-shrink-0 select-none">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 text-xs text-slate-300">
        
        {/* =========================================================================
            PANEL 1: SCENE & GEOMETRY METRICS
        ========================================================================= */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between pb-1.5 border-b border-studio-border">
            <span className="font-semibold text-slate-200 tracking-wider text-[11px] uppercase flex items-center space-x-1.5">
              <Layers className="w-3.5 h-3.5 text-studio-accent" />
              <span>Geometry & Scene</span>
            </span>
            <span className="text-[10px] text-cyan-400 font-mono">
              3D BUFFER
            </span>
          </div>

          <div className="bg-studio-bg/60 border border-studio-border rounded p-2.5 space-y-2 text-[11px] font-mono">
            <div className="flex justify-between items-center">
              <span className="text-studio-dim">Input Source:</span>
              <span className="text-slate-200 capitalize font-sans">{metadata.type}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-studio-dim">Input Resolution:</span>
              <span className="text-slate-200">{metadata.width} × {metadata.height}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-studio-dim">Reconstruction Grid:</span>
              <span className="text-cyan-300">{settings.resolution} × {settings.resolution}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-studio-dim">Reconstructed Points:</span>
              <span className="text-emerald-400 font-semibold">{formatNumber(stats.pointCount || (settings.resolution * settings.resolution))}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-studio-dim">Depth Mode:</span>
              <span className="text-slate-200 uppercase">{settings.depthMethod}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-studio-dim">Depth Intensity (Z):</span>
              <span className="text-slate-200">{settings.depthIntensity.toFixed(2)}x</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-studio-dim">Color Mode:</span>
              <span className="text-slate-200 uppercase">{settings.colorMode}</span>
            </div>

            <div className="flex justify-between items-center pt-1 border-t border-studio-border/60">
              <span className="text-studio-dim flex items-center space-x-1">
                <Box className="w-3 h-3 text-studio-dim" />
                <span>Bounding Box:</span>
              </span>
              <span className="text-slate-300 text-[10px]">
                {boundX} × {boundY} × {boundZ} units
              </span>
            </div>
          </div>
        </div>

        {/* =========================================================================
            PANEL 2: GPU HARDWARE & PIPELINE
        ========================================================================= */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between pb-1.5 border-b border-studio-border">
            <span className="font-semibold text-slate-200 tracking-wider text-[11px] uppercase flex items-center space-x-1.5">
              <Cpu className="w-3.5 h-3.5 text-studio-cyan" />
              <span>GPU Pipeline & Context</span>
            </span>
            <span className="text-[10px] text-emerald-400 font-mono">
              HW ACCEL
            </span>
          </div>

          <div className="bg-studio-bg/60 border border-studio-border rounded p-2.5 space-y-2 text-[11px] font-mono">
            <div>
              <div className="text-studio-dim text-[10px] mb-0.5">GPU Unmasked Renderer:</div>
              <div className="text-slate-200 text-[10px] leading-tight break-words font-mono bg-studio-panel p-1.5 rounded border border-studio-border/80">
                {stats.rendererName}
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-studio-dim">Vendor:</span>
              <span className="text-slate-200 text-[10px] truncate max-w-[150px]">{stats.vendorName}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-studio-dim">WebGL Context:</span>
              <span className="text-emerald-400 font-semibold">{stats.isWebGL2 ? 'WebGL 2.0 (Active)' : 'Disabled'}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-studio-dim">Shading Language:</span>
              <span className="text-slate-300 text-[10px]">{stats.shadingLanguageVersion}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-studio-dim">Draw Calls:</span>
              <span className="text-blue-300 font-semibold">{stats.drawCalls} call / frame</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-studio-dim">Hardware Disjoint Timer:</span>
              <span className={stats.hasTimerQuery ? 'text-emerald-400' : 'text-amber-400'}>
                {stats.hasTimerQuery ? 'Supported' : 'Unavailable (Safe)'}
              </span>
            </div>

            {/* GPU Utilization Notice as explicitly mandated */}
            <div className="pt-2 border-t border-studio-border/60">
              <div className="flex items-center justify-between text-studio-dim">
                <span className="flex items-center space-x-1">
                  <ShieldCheck className="w-3 h-3 text-studio-dim" />
                  <span>GPU % Utilization:</span>
                </span>
                <span className="text-slate-400 italic text-[10px]">Unavailable</span>
              </div>
              <p className="text-[9px] text-studio-dim mt-1 leading-normal">
                Standard WebGL2 browser security sandbox restricts reading low-level kernel GPU load counters to prevent side-channel timing attacks.
              </p>
            </div>
          </div>
        </div>

        {/* =========================================================================
            PANEL 3: REAL-TIME PERFORMANCE & MEMORY
        ========================================================================= */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between pb-1.5 border-b border-studio-border">
            <span className="font-semibold text-slate-200 tracking-wider text-[11px] uppercase flex items-center space-x-1.5">
              <Activity className="w-3.5 h-3.5 text-blue-400" />
              <span>Real-Time Performance</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-studio-bg/60 border border-studio-border p-2.5 rounded">
              <div className="text-[10px] text-studio-dim flex items-center space-x-1">
                <Zap className="w-3 h-3 text-emerald-400" />
                <span>FPS</span>
              </div>
              <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                {stats.fps}
              </div>
              <div className="text-[9px] text-studio-dim">Frames / sec</div>
            </div>

            <div className="bg-studio-bg/60 border border-studio-border p-2.5 rounded">
              <div className="text-[10px] text-studio-dim flex items-center space-x-1">
                <Clock className="w-3 h-3 text-cyan-400" />
                <span>Frame Time</span>
              </div>
              <div className="text-xl font-bold font-mono text-cyan-400 mt-1">
                {stats.frameTimeMs} <span className="text-xs font-normal">ms</span>
              </div>
              <div className="text-[9px] text-studio-dim">Render duration</div>
            </div>
          </div>

          <div className="bg-studio-bg/60 border border-studio-border rounded p-2.5 space-y-1.5 text-[11px] font-mono">
            <div className="flex justify-between items-center">
              <span className="text-studio-dim flex items-center space-x-1">
                <HardDrive className="w-3 h-3 text-studio-dim" />
                <span>VRAM Point Buffer:</span>
              </span>
              <span className="text-cyan-300 font-semibold">{formatBytes(stats.estimatedBufferBytes)}</span>
            </div>

            <div className="flex justify-between items-center text-[10px] text-studio-dim">
              <span>Vertex Layout:</span>
              <span>5 floats / vertex (20 bytes)</span>
            </div>

            <div className="flex justify-between items-center text-[10px] text-studio-dim">
              <span>Active Textures:</span>
              <span>{stats.texturesCount} loaded</span>
            </div>
          </div>
        </div>

        {/* Technical Architecture Note */}
        <div className="p-2.5 rounded bg-blue-950/20 border border-blue-900/40 text-[10px] text-slate-400 space-y-1">
          <div className="flex items-center space-x-1 text-blue-400 font-medium">
            <Info className="w-3 h-3 flex-shrink-0" />
            <span>GPU Architecture Fact</span>
          </div>
          <p className="leading-relaxed">
            CPU creates a static 2D planar vertex mesh once. 100% of spatial depth displacement ($Z$) is computed per vertex in parallel on the GPU every frame inside the GLSL vertex shader.
          </p>
        </div>

      </div>
    </aside>
  );
};
