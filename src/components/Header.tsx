import React, { useState } from 'react';
import {
  RotateCcw,
  Download,
  Gauge,
  Activity,
  Box,
  Sparkles,
  Film,
  ChevronDown,
} from 'lucide-react';
import { GPUStats, StudioWorkspace } from '../types';

interface HeaderProps {
  currentWorkspace: StudioWorkspace;
  onSelectWorkspace: (ws: StudioWorkspace) => void;
  stats: GPUStats;
  onResetView?: () => void;
  onExportWorldPLY?: (includeFaces: boolean) => void;
  onExportWorldOBJ?: () => void;
  onExportMedicalSTL?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentWorkspace,
  onSelectWorkspace,
  stats,
  onResetView,
  onExportWorldPLY,
  onExportWorldOBJ,
  onExportMedicalSTL,
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const isHealthyFps = stats.fps >= 50;
  const isModerateFps = stats.fps >= 25;

  return (
    <header className="h-14 bg-studio-panel border-b border-studio-border px-4 flex items-center justify-between select-none z-30 flex-shrink-0">
      {/* Brand & Title */}
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-600 to-cyan-400 p-[1px] flex items-center justify-center shadow-lg shadow-blue-500/10">
          <div className="w-full h-full bg-studio-bg rounded flex items-center justify-center">
            {currentWorkspace === 'reconstruction' && <Box className="w-4 h-4 text-cyan-400" />}
            {currentWorkspace === 'enhancement' && <Sparkles className="w-4 h-4 text-blue-400" />}
            {currentWorkspace === 'video' && <Film className="w-4 h-4 text-amber-400" />}
            {currentWorkspace === 'benchmark' && <Gauge className="w-4 h-4 text-emerald-400" />}
          </div>
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-bold tracking-wider text-xs md:text-sm text-slate-100 font-mono">
              GPU STUDIO
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-blue-500/10 text-cyan-400 border border-blue-500/30 font-semibold">
              RECONSTRUCTION & PHOTO ENHANCEMENT
            </span>
          </div>
          <div className="text-[10px] text-studio-dim font-mono hidden md:block">
            {currentWorkspace === 'reconstruction' && '3D Reconstruction • Custom GLSL Mesh & Point Cloud Shaders'}
            {currentWorkspace === 'enhancement' && 'Photo Enhancement • GPU Bilateral Denoising, Sharpening & 4x Resampling'}
            {currentWorkspace === 'video' && 'Video Processing • GPU Frame Shader & WebCodecs MP4 Muxer with Audio'}
            {currentWorkspace === 'benchmark' && 'CPU vs GPU Benchmark • Synchronized Performance & Speedup Metrics'}
          </div>
        </div>
      </div>

      {/* Center: 4 Workspaces Selector */}
      <div className="hidden lg:flex items-center bg-studio-bg border border-studio-border p-1 rounded-md space-x-1">
        <button
          onClick={() => onSelectWorkspace('reconstruction')}
          className={`px-2.5 py-1.5 rounded text-xs font-mono font-medium flex items-center space-x-1.5 transition-all ${
            currentWorkspace === 'reconstruction'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-studio-panelHover'
          }`}
        >
          <Box className="w-3.5 h-3.5" />
          <span>3D RECONSTRUCTION</span>
        </button>

        <button
          onClick={() => onSelectWorkspace('enhancement')}
          className={`px-2.5 py-1.5 rounded text-xs font-mono font-medium flex items-center space-x-1.5 transition-all ${
            currentWorkspace === 'enhancement'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-studio-panelHover'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>PHOTO ENHANCEMENT</span>
        </button>

        <button
          onClick={() => onSelectWorkspace('video')}
          className={`px-2.5 py-1.5 rounded text-xs font-mono font-medium flex items-center space-x-1.5 transition-all ${
            currentWorkspace === 'video'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-studio-panelHover'
          }`}
        >
          <Film className="w-3.5 h-3.5" />
          <span>VIDEO PROCESSING</span>
        </button>

        <button
          onClick={() => onSelectWorkspace('benchmark')}
          className={`px-2.5 py-1.5 rounded text-xs font-mono font-medium flex items-center space-x-1.5 transition-all ${
            currentWorkspace === 'benchmark'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-studio-panelHover'
          }`}
        >
          <Gauge className="w-3.5 h-3.5" />
          <span>CPU VS GPU BENCHMARK</span>
        </button>
      </div>

      {/* Right Controls: Telemetry & Actions */}
      <div className="flex items-center space-x-2.5">
        {/* Mobile dropdown selector */}
        <select
          value={currentWorkspace}
          onChange={(e) => onSelectWorkspace(e.target.value as StudioWorkspace)}
          className="lg:hidden bg-studio-bg border border-studio-border text-slate-200 text-xs rounded px-2 py-1 font-mono"
        >
          <option value="reconstruction">3D Reconstruction</option>
          <option value="enhancement">Photo Enhancement</option>
          <option value="video">Video Processing</option>
          <option value="benchmark">CPU vs GPU Benchmark</option>
        </select>

        {/* GPU Status Indicator */}
        <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded bg-studio-bg border border-studio-border">
          <div
            className={`w-2 h-2 rounded-full ${
              stats.isWebGL2 ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-red-400'
            }`}
          />
          <span className="text-[11px] font-mono text-slate-300">
            {stats.isWebGL2 ? 'WEBGL2 ACCELERATED' : 'FALLBACK'}
          </span>
        </div>

        {/* FPS Indicator */}
        <div className="flex items-center space-x-1 px-2.5 py-1 rounded bg-studio-bg border border-studio-border">
          <Activity
            className={`w-3.5 h-3.5 ${
              isHealthyFps ? 'text-emerald-400' : isModerateFps ? 'text-amber-400' : 'text-red-400'
            }`}
          />
          <span className="text-[11px] font-mono text-slate-200 font-semibold">{stats.fps}</span>
          <span className="text-[9px] text-studio-dim font-mono">FPS</span>
        </div>

        {/* 3D Reconstruction Viewport Controls (only in 3D Reconstruction) */}
        {currentWorkspace === 'reconstruction' && onResetView && (
          <button
            onClick={onResetView}
            className="p-1.5 rounded bg-studio-bg border border-studio-border hover:bg-studio-panelHover text-slate-300 hover:text-white transition-all flex items-center space-x-1"
            title="Reset Camera Framing"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="text-xs hidden md:inline">Reset</span>
          </button>
        )}

        {/* 3D Model Export Dropdown (only in 3D Reconstruction) */}
        {currentWorkspace === 'reconstruction' && onExportWorldPLY && (
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-medium flex items-center space-x-1.5 transition-all shadow-md shadow-blue-600/20"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export 3D</span>
              <ChevronDown className="w-3 h-3 ml-0.5 opacity-70" />
            </button>

            {showExportMenu && (
              <div
                className="absolute right-0 mt-1 w-52 bg-studio-panel border border-studio-border rounded-lg shadow-2xl py-1 z-50 text-xs font-mono"
                onMouseLeave={() => setShowExportMenu(false)}
              >
                <div className="px-3 py-1.5 text-[9px] text-studio-dim font-semibold uppercase tracking-wider border-b border-studio-border/50">
                  Export 3D Geometry
                </div>

                <button
                  onClick={() => {
                    onExportWorldPLY(true);
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-studio-panelHover text-slate-200 flex items-center justify-between"
                >
                  <span>Stanford PLY (Mesh)</span>
                  <span className="text-[9px] text-cyan-400">.ply</span>
                </button>

                <button
                  onClick={() => {
                    onExportWorldPLY(false);
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-studio-panelHover text-slate-200 flex items-center justify-between"
                >
                  <span>Point Cloud PLY</span>
                  <span className="text-[9px] text-cyan-400">.ply</span>
                </button>

                {onExportWorldOBJ && (
                  <button
                    onClick={() => {
                      onExportWorldOBJ();
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-studio-panelHover text-slate-200 flex items-center justify-between"
                  >
                    <span>Wavefront OBJ</span>
                    <span className="text-[9px] text-blue-400">.obj</span>
                  </button>
                )}

                {onExportMedicalSTL && (
                  <button
                    onClick={() => {
                      onExportMedicalSTL();
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-studio-panelHover text-slate-200 flex items-center justify-between border-t border-studio-border/40"
                  >
                    <span>3D Print Surface STL</span>
                    <span className="text-[9px] text-emerald-400">.stl</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
