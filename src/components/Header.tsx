import React, { useState } from 'react';
import {
  RotateCcw,
  Download,
  Gauge,
  Activity,
  Box,
  Layers,
  ChevronDown
} from 'lucide-react';
import { GPUStats, StudioModule } from '../types';

interface HeaderProps {
  currentModule: StudioModule;
  onSelectModule: (mod: StudioModule) => void;
  stats: GPUStats;
  onResetView: () => void;
  onOpenBenchmark: () => void;
  onExportWorldPLY: (includeFaces: boolean) => void;
  onExportWorldOBJ: () => void;
  onExportMedicalSTL: () => void;
  onExportMedicalPLY: () => void;
  onExportMedicalOBJ: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentModule,
  onSelectModule,
  stats,
  onResetView,
  onOpenBenchmark,
  onExportWorldPLY,
  onExportWorldOBJ,
  onExportMedicalSTL,
  onExportMedicalPLY,
  onExportMedicalOBJ,
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
            {currentModule === 'world' ? (
              <Layers className="w-4 h-4 text-cyan-400" />
            ) : (
              <Box className="w-4 h-4 text-blue-400" />
            )}
          </div>
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-bold tracking-wider text-xs md:text-sm text-slate-100 font-mono">
              NEUROVISION 3D
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-blue-500/10 text-cyan-400 border border-blue-500/30">
              GPU STUDIO
            </span>
          </div>
          <div className="text-[10px] text-studio-dim font-mono hidden md:block">
            {currentModule === 'world'
              ? 'World Reconstruction • Custom GLSL Mesh & Point Cloud Shader'
              : 'Medical Visualization • WebGL2 3D Texture Ray-Caster'}
          </div>
        </div>
      </div>

      {/* Center: Module Switcher (World Reconstruction vs Medical Reconstruction) */}
      <div className="flex items-center bg-studio-bg border border-studio-border p-1 rounded-md">
        <button
          onClick={() => onSelectModule('world')}
          className={`px-3 py-1.5 rounded text-xs font-mono font-medium flex items-center space-x-1.5 transition-all ${
            currentModule === 'world'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-studio-panelHover'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>WORLD RECONSTRUCTION</span>
        </button>

        <button
          onClick={() => onSelectModule('medical')}
          className={`px-3 py-1.5 rounded text-xs font-mono font-medium flex items-center space-x-1.5 transition-all ${
            currentModule === 'medical'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-studio-panelHover'
          }`}
        >
          <Box className="w-3.5 h-3.5" />
          <span>MEDICAL RECONSTRUCTION</span>
        </button>
      </div>

      {/* Right Controls: Telemetry & Actions */}
      <div className="flex items-center space-x-2.5">
        {/* GPU Status & FPS */}
        <div className="hidden xl:flex items-center space-x-3 bg-studio-bg border border-studio-border px-3 py-1 rounded text-xs font-mono">
          <div className="flex items-center space-x-1.5">
            <div className={`w-2 h-2 rounded-full ${stats.isWebGL2 ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
            <span className="text-studio-dim text-[11px]">GPU:</span>
            <span className="text-slate-200 text-[11px] font-medium">WebGL2</span>
          </div>

          <div className="w-px h-3 bg-studio-border" />

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

        {/* Benchmark */}
        <button
          onClick={onOpenBenchmark}
          className="px-2.5 py-1.5 rounded bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 hover:text-blue-300 border border-blue-500/30 text-xs flex items-center space-x-1.5 transition-colors"
          title="CPU vs GPU Performance Benchmark"
        >
          <Gauge className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Benchmark</span>
        </button>

        {/* Reset View */}
        <button
          onClick={onResetView}
          className="p-1.5 sm:px-2.5 sm:py-1.5 rounded bg-studio-panelHover hover:bg-studio-border text-slate-300 hover:text-white border border-studio-border text-xs flex items-center space-x-1 transition-colors"
          title="Reset Camera View"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Reset View</span>
        </button>

        {/* Export Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center space-x-1.5 shadow-md shadow-blue-600/20 transition-all hover:shadow-blue-500/30"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export 3D</span>
            <ChevronDown className="w-3 h-3 ml-0.5" />
          </button>

          {showExportMenu && (
            <div className="absolute right-0 top-10 bg-studio-panel border border-studio-border rounded-md shadow-2xl py-1.5 w-48 z-40 text-xs font-mono">
              {currentModule === 'world' ? (
                <>
                  <button
                    onClick={() => {
                      onExportWorldPLY(true);
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-studio-panelHover text-slate-200 flex items-center justify-between"
                  >
                    <span>Export PLY Mesh</span>
                    <span className="text-[10px] text-cyan-400">Faces</span>
                  </button>
                  <button
                    onClick={() => {
                      onExportWorldPLY(false);
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-studio-panelHover text-slate-200 flex items-center justify-between"
                  >
                    <span>Export PLY Cloud</span>
                    <span className="text-[10px] text-studio-dim">Points</span>
                  </button>
                  <button
                    onClick={() => {
                      onExportWorldOBJ();
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-studio-panelHover text-slate-200 flex items-center justify-between"
                  >
                    <span>Export Wavefront OBJ</span>
                    <span className="text-[10px] text-blue-400">OBJ</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      onExportMedicalSTL();
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-studio-panelHover text-slate-200 flex items-center justify-between"
                  >
                    <span>Export 3D STL</span>
                    <span className="text-[10px] text-emerald-400">3D Print</span>
                  </button>
                  <button
                    onClick={() => {
                      onExportMedicalPLY();
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-studio-panelHover text-slate-200 flex items-center justify-between"
                  >
                    <span>Export PLY Surface</span>
                    <span className="text-[10px] text-cyan-400">PLY</span>
                  </button>
                  <button
                    onClick={() => {
                      onExportMedicalOBJ();
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-studio-panelHover text-slate-200 flex items-center justify-between"
                  >
                    <span>Export OBJ Model</span>
                    <span className="text-[10px] text-blue-400">OBJ</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
