import React from 'react';
import {
  Activity,
  Cpu,
  Box,
  HardDrive,
  Info,
  Clock,
  Zap,
  ShieldCheck
} from 'lucide-react';
import { GPUStats, MedicalSettings, MedicalVolumeMetadata } from '../types';
import { formatBytes, formatNumber } from '../utils/formatters';

interface RightInspectorMedicalProps {
  stats: GPUStats;
  metadata: MedicalVolumeMetadata;
  settings: MedicalSettings;
}

export const RightInspectorMedical: React.FC<RightInspectorMedicalProps> = ({
  stats,
  metadata,
  settings,
}) => {
  const [w, h, d] = metadata.dimensions;
  const [dx, dy, dz] = metadata.voxelSpacing;
  const physX = (w * dx).toFixed(1);
  const physY = (h * dy).toFixed(1);
  const physZ = (d * dz).toFixed(1);

  const totalVoxels = w * h * d;

  return (
    <aside className="w-72 md:w-80 bg-studio-panel border-l border-studio-border flex flex-col h-full overflow-hidden flex-shrink-0 select-none">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 text-xs text-slate-300">
        
        {/* PANEL 1: MEDICAL VOLUME METADATA */}
        <div className="space-y-2">
          <div className="flex items-center justify-between pb-1 border-b border-studio-border">
            <span className="font-semibold text-slate-200 tracking-wider text-[11px] uppercase flex items-center space-x-1.5">
              <Box className="w-3.5 h-3.5 text-cyan-400" />
              <span>Medical Volume Metadata</span>
            </span>
            <span className="text-[10px] text-cyan-400 font-mono">
              {metadata.modality}
            </span>
          </div>

          <div className="bg-studio-bg border border-studio-border rounded p-2.5 space-y-1.5 text-[11px] font-mono">
            <div>
              <div className="text-studio-dim text-[10px]">Study / Series:</div>
              <div className="text-slate-200 font-sans text-xs truncate" title={metadata.seriesDescription}>
                {metadata.seriesDescription}
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-studio-dim">Patient / ID:</span>
              <span className="text-slate-300 text-[10px]">{metadata.patientId}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-studio-dim">Matrix Dimensions:</span>
              <span className="text-cyan-300">{w} × {h} × {d}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-studio-dim">Total Voxels:</span>
              <span className="text-emerald-400 font-semibold">{formatNumber(totalVoxels)}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-studio-dim">Voxel Spacing:</span>
              <span className="text-slate-200">{dx.toFixed(2)} × {dy.toFixed(2)} × {dz.toFixed(2)} mm</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-studio-dim">Physical Size:</span>
              <span className="text-slate-200">{physX} × {physY} × {physZ} mm</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-studio-dim">Calibrated HU Range:</span>
              <span className="text-slate-300">[{Math.round(metadata.minHU)}, {Math.round(metadata.maxHU)}]</span>
            </div>

            <div className="flex justify-between items-center pt-1 border-t border-studio-border/60">
              <span className="text-studio-dim">Active W/L:</span>
              <span className="text-cyan-400">W:{Math.round(settings.windowWidth)} / L:{Math.round(settings.windowCenter)}</span>
            </div>
          </div>
        </div>

        {/* PANEL 2: GPU 3D TEXTURE & SHADER ENGINE */}
        <div className="space-y-2">
          <div className="flex items-center justify-between pb-1 border-b border-studio-border">
            <span className="font-semibold text-slate-200 tracking-wider text-[11px] uppercase flex items-center space-x-1.5">
              <Cpu className="w-3.5 h-3.5 text-studio-cyan" />
              <span>GPU Volume Pipeline</span>
            </span>
            <span className="text-[10px] text-emerald-400 font-mono">
              3D TEXTURE
            </span>
          </div>

          <div className="bg-studio-bg border border-studio-border rounded p-2.5 space-y-1.5 text-[11px] font-mono">
            <div className="flex justify-between items-center">
              <span className="text-studio-dim">Volume Shader:</span>
              <span className="text-cyan-300 uppercase">{settings.renderMode}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-studio-dim">Texture Format:</span>
              <span className="text-slate-200">THREE.Data3DTexture (Red)</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-studio-dim">Ray Step Interval:</span>
              <span className="text-slate-200">{settings.stepSize}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-studio-dim">GPU Draw Calls:</span>
              <span className="text-blue-300 font-semibold">{stats.drawCalls} call / frame</span>
            </div>

            <div>
              <div className="text-studio-dim text-[10px] mb-0.5">Unmasked Renderer:</div>
              <div className="text-slate-200 text-[10px] leading-tight break-words font-mono bg-studio-panel p-1.5 rounded border border-studio-border/80">
                {stats.rendererName}
              </div>
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
                Browser security isolation prohibits direct kernel queries of GPU load to prevent microarchitectural side-channel attacks.
              </p>
            </div>
          </div>
        </div>

        {/* PANEL 3: REAL-TIME FPS & VRAM */}
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
              <div className="text-[8px] text-studio-dim">Ray-cast latency</div>
            </div>
          </div>

          <div className="bg-studio-bg border border-studio-border rounded p-2 space-y-1 text-[10px] font-mono">
            <div className="flex justify-between items-center">
              <span className="text-studio-dim flex items-center space-x-1">
                <HardDrive className="w-3 h-3 text-studio-dim" />
                <span>3D Texture VRAM:</span>
              </span>
              <span className="text-cyan-300 font-semibold">{formatBytes(totalVoxels)}</span>
            </div>
          </div>
        </div>

        {/* Clinical Disclaimer */}
        <div className="p-2.5 rounded bg-amber-950/20 border border-amber-900/40 text-[10px] text-amber-200/80 space-y-1">
          <div className="flex items-center space-x-1 text-amber-400 font-medium">
            <Info className="w-3 h-3 flex-shrink-0" />
            <span>Academic Visualization Notice</span>
          </div>
          <p className="leading-relaxed">
            Direct volume rendering and threshold-based surface extractions are computational visualizations for educational, research, and technical evaluation. They are <strong>not intended for primary medical diagnosis</strong>.
          </p>
        </div>

      </div>
    </aside>
  );
};
