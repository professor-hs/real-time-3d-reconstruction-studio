import React from 'react';
import {
  Activity,
  Cpu,
  Box,
  HardDrive,
  Info,
  Clock,
  Zap,
  ShieldCheck,
  Boxes
} from 'lucide-react';
import { GPUStats, WorldMediaMetadata, WorldSettings } from '../types';
import { formatBytes, formatNumber } from '../utils/formatters';

interface RightInspectorWorldProps {
  stats: GPUStats;
  metadata: WorldMediaMetadata;
  settings: WorldSettings;
}

export const RightInspectorWorld: React.FC<RightInspectorWorldProps> = ({
  stats,
  metadata,
  settings,
}) => {
  const totalVertices = settings.resolution * settings.resolution;
  const totalTriangles = (settings.resolution - 1) * (settings.resolution - 1) * 2;

  const boundX = metadata.aspectRatio >= 1.0 ? (2.0 * metadata.aspectRatio).toFixed(2) : '2.00';
  const boundY = metadata.aspectRatio < 1.0 ? (2.0 / metadata.aspectRatio).toFixed(2) : '2.00';
  const boundZ = settings.depthIntensity.toFixed(2);

  return (
    <aside className="w-72 md:w-80 bg-studio-panel border-l border-studio-border flex flex-col h-full overflow-hidden flex-shrink-0 select-none">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 text-xs text-slate-300">
        
        {/* PANEL 1: WORLD GEOMETRY & TOPOLOGY */}
        <div className="space-y-2">
          <div className="flex items-center justify-between pb-1 border-b border-studio-border">
            <span className="font-semibold text-slate-200 tracking-wider text-[11px] uppercase flex items-center space-x-1.5">
              <Boxes className="w-3.5 h-3.5 text-studio-accent" />
              <span>World Geometry & Mesh</span>
            </span>
            <span className="text-[10px] text-cyan-400 font-mono">
              3D BUFFER
            </span>
          </div>

          <div className="bg-studio-bg border border-studio-border rounded p-2.5 space-y-1.5 text-[11px] font-mono">
            <div className="flex justify-between items-center">
              <span className="text-studio-dim">Input Source:</span>
              <span className="text-slate-200 capitalize font-sans">{metadata.type}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-studio-dim">Input Resolution:</span>
              <span className="text-slate-200">{metadata.width} × {metadata.height}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-studio-dim">Mesh Grid Matrix:</span>
              <span className="text-cyan-300">{settings.resolution} × {settings.resolution}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-studio-dim">Vertex Count:</span>
              <span className="text-emerald-400 font-semibold">{formatNumber(totalVertices)}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-studio-dim">Triangle Faces:</span>
              <span className="text-cyan-400 font-semibold">
                {settings.renderMode === 'points' ? 'N/A (Points)' : formatNumber(totalTriangles)}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-studio-dim">Render Mode:</span>
              <span className="text-slate-200 uppercase">{settings.renderMode}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-studio-dim">Depth Algorithm:</span>
              <span className="text-slate-200 uppercase">{settings.depthMethod}</span>
            </div>

            <div className="flex justify-between items-center pt-1 border-t border-studio-border/60">
              <span className="text-studio-dim flex items-center space-x-1">
                <Box className="w-3 h-3 text-studio-dim" />
                <span>Bounding Box:</span>
              </span>
              <span className="text-slate-300 text-[10px]">
                {boundX} × {boundY} × {boundZ}
              </span>
            </div>
          </div>
        </div>

        {/* PANEL 2: GPU HARDWARE PIPELINE */}
        <div className="space-y-2">
          <div className="flex items-center justify-between pb-1 border-b border-studio-border">
            <span className="font-semibold text-slate-200 tracking-wider text-[11px] uppercase flex items-center space-x-1.5">
              <Cpu className="w-3.5 h-3.5 text-studio-cyan" />
              <span>GPU Pipeline & Context</span>
            </span>
            <span className="text-[10px] text-emerald-400 font-mono">
              HW ACCEL
            </span>
          </div>

          <div className="bg-studio-bg border border-studio-border rounded p-2.5 space-y-1.5 text-[11px] font-mono">
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

            <div className="pt-1.5 border-t border-studio-border/60">
              <div className="flex items-center justify-between text-studio-dim">
                <span className="flex items-center space-x-1">
                  <ShieldCheck className="w-3 h-3 text-studio-dim" />
                  <span>GPU % Utilization:</span>
                </span>
                <span className="text-slate-400 italic text-[10px]">Unavailable</span>
              </div>
              <p className="text-[9px] text-studio-dim mt-0.5 leading-normal">
                Standard WebGL2 browser security sandbox restricts reading low-level kernel GPU counters to prevent side-channel timing attacks.
              </p>
            </div>
          </div>
        </div>

        {/* PANEL 3: REAL-TIME PERFORMANCE & VRAM */}
        <div className="space-y-2">
          <div className="flex items-center justify-between pb-1 border-b border-studio-border">
            <span className="font-semibold text-slate-200 tracking-wider text-[11px] uppercase flex items-center space-x-1.5">
              <Activity className="w-3.5 h-3.5 text-blue-400" />
              <span>Real-Time Performance</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-studio-bg border border-studio-border p-2 rounded">
              <div className="text-[10px] text-studio-dim flex items-center space-x-1">
                <Zap className="w-3 h-3 text-emerald-400" />
                <span>FPS</span>
              </div>
              <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
                {stats.fps}
              </div>
              <div className="text-[8px] text-studio-dim">Frames / sec</div>
            </div>

            <div className="bg-studio-bg border border-studio-border p-2 rounded">
              <div className="text-[10px] text-studio-dim flex items-center space-x-1">
                <Clock className="w-3 h-3 text-cyan-400" />
                <span>Frame Time</span>
              </div>
              <div className="text-lg font-bold font-mono text-cyan-400 mt-0.5">
                {stats.frameTimeMs} <span className="text-xs font-normal">ms</span>
              </div>
              <div className="text-[8px] text-studio-dim">Render duration</div>
            </div>
          </div>

          <div className="bg-studio-bg border border-studio-border rounded p-2 space-y-1 text-[10px] font-mono">
            <div className="flex justify-between items-center">
              <span className="text-studio-dim flex items-center space-x-1">
                <HardDrive className="w-3 h-3 text-studio-dim" />
                <span>VRAM Geometry Buffer:</span>
              </span>
              <span className="text-cyan-300 font-semibold">{formatBytes(stats.estimatedVramBytes)}</span>
            </div>
          </div>
        </div>

        <div className="p-2.5 rounded bg-blue-950/20 border border-blue-900/40 text-[10px] text-slate-400 space-y-1">
          <div className="flex items-center space-x-1 text-blue-400 font-medium">
            <Info className="w-3 h-3 flex-shrink-0" />
            <span>GPU Mesh Generation Fact</span>
          </div>
          <p className="leading-relaxed">
            CPU creates indexed $(N-1)^2 \times 2$ triangle connectivity once. 100% of spatial depth ($Z$) and surface normal vectors are dynamically evaluated on the GPU inside GLSL vertex shaders.
          </p>
        </div>

      </div>
    </aside>
  );
};
