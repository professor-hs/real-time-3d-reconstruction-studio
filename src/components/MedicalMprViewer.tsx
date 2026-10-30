// 2D Orthogonal Multi-Planar Reconstruction (MPR) Synchronized Slice Viewer
// Displays Axial (XY), Coronal (XZ), and Sagittal (YZ) planes with crosshairs and slice scrubbers.

import React, { useRef, useEffect } from 'react';
import { X, Crosshair } from 'lucide-react';
import { MedicalEngine } from '../engine/MedicalEngine';
import { MedicalSettings } from '../types';

interface MedicalMprViewerProps {
  medicalEngine: MedicalEngine | null;
  settings: MedicalSettings;
  onUpdateSettings: (newSettings: Partial<MedicalSettings>) => void;
  onClose: () => void;
}

export const MedicalMprViewer: React.FC<MedicalMprViewerProps> = ({
  medicalEngine,
  settings,
  onUpdateSettings,
  onClose,
}) => {
  const axialCanvasRef = useRef<HTMLCanvasElement>(null);
  const coronalCanvasRef = useRef<HTMLCanvasElement>(null);
  const sagittalCanvasRef = useRef<HTMLCanvasElement>(null);

  const [w, h, d] = medicalEngine ? medicalEngine.volumeData.dimensions : [128, 128, 64];

  const { axial, coronal, sagittal } = settings.activeSlice;

  // Render slices to canvases on slice change or window/level change
  useEffect(() => {
    if (!medicalEngine) return;

    if (axialCanvasRef.current) {
      medicalEngine.renderSliceToCanvas('axial', axial, axialCanvasRef.current);
    }
    if (coronalCanvasRef.current) {
      medicalEngine.renderSliceToCanvas('coronal', coronal, coronalCanvasRef.current);
    }
    if (sagittalCanvasRef.current) {
      medicalEngine.renderSliceToCanvas('sagittal', sagittal, sagittalCanvasRef.current);
    }
  }, [medicalEngine, axial, coronal, sagittal, settings.windowCenter, settings.windowWidth]);

  return (
    <div className="absolute bottom-4 left-4 right-4 bg-studio-panel/95 backdrop-blur-md border border-studio-border rounded-lg shadow-2xl p-3 z-30 select-none animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-studio-border">
        <div className="flex items-center space-x-2">
          <Crosshair className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-xs font-mono text-slate-100">
            SYNCHRONIZED ORTHOGONAL MULTI-PLANAR RECONSTRUCTION (MPR)
          </span>
          <span className="text-[10px] font-mono text-studio-dim">
            W:{Math.round(settings.windowWidth)} / L:{Math.round(settings.windowCenter)} HU
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-studio-panelHover text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 3 Orthogonal Views (Axial, Coronal, Sagittal) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        
        {/* 1. Axial (Transverse, XY Plane) */}
        <div className="bg-studio-bg border border-studio-border rounded p-2 space-y-1.5 flex flex-col items-center">
          <div className="w-full flex justify-between items-center text-[10px] font-mono text-studio-dim">
            <span className="text-cyan-300 font-semibold">1. AXIAL (Z: {axial + 1}/{d})</span>
            <span>XY Plane</span>
          </div>
          <div className="w-full aspect-square max-h-44 bg-black rounded overflow-hidden flex items-center justify-center relative border border-studio-border/60">
            <canvas ref={axialCanvasRef} className="w-full h-full object-contain" />
            {/* Crosshair indicator */}
            <div
              className="absolute left-0 right-0 border-t border-cyan-400/40 pointer-events-none"
              style={{ top: `${(coronal / h) * 100}%` }}
            />
            <div
              className="absolute top-0 bottom-0 border-l border-cyan-400/40 pointer-events-none"
              style={{ left: `${(sagittal / w) * 100}%` }}
            />
          </div>
          <div className="w-full flex items-center space-x-2 pt-1">
            <input
              type="range"
              min="0"
              max={d - 1}
              value={axial}
              onChange={(e) =>
                onUpdateSettings({
                  activeSlice: { ...settings.activeSlice, axial: parseInt(e.target.value, 10) },
                })
              }
              className="w-full"
            />
          </div>
        </div>

        {/* 2. Coronal (Frontal, XZ Plane) */}
        <div className="bg-studio-bg border border-studio-border rounded p-2 space-y-1.5 flex flex-col items-center">
          <div className="w-full flex justify-between items-center text-[10px] font-mono text-studio-dim">
            <span className="text-emerald-300 font-semibold">2. CORONAL (Y: {coronal + 1}/{h})</span>
            <span>XZ Plane</span>
          </div>
          <div className="w-full aspect-square max-h-44 bg-black rounded overflow-hidden flex items-center justify-center relative border border-studio-border/60">
            <canvas ref={coronalCanvasRef} className="w-full h-full object-contain" />
            {/* Crosshair indicator */}
            <div
              className="absolute left-0 right-0 border-t border-emerald-400/40 pointer-events-none"
              style={{ top: `${((d - 1 - axial) / d) * 100}%` }}
            />
            <div
              className="absolute top-0 bottom-0 border-l border-emerald-400/40 pointer-events-none"
              style={{ left: `${(sagittal / w) * 100}%` }}
            />
          </div>
          <div className="w-full flex items-center space-x-2 pt-1">
            <input
              type="range"
              min="0"
              max={h - 1}
              value={coronal}
              onChange={(e) =>
                onUpdateSettings({
                  activeSlice: { ...settings.activeSlice, coronal: parseInt(e.target.value, 10) },
                })
              }
              className="w-full"
            />
          </div>
        </div>

        {/* 3. Sagittal (Profile, YZ Plane) */}
        <div className="bg-studio-bg border border-studio-border rounded p-2 space-y-1.5 flex flex-col items-center">
          <div className="w-full flex justify-between items-center text-[10px] font-mono text-studio-dim">
            <span className="text-amber-300 font-semibold">3. SAGITTAL (X: {sagittal + 1}/{w})</span>
            <span>YZ Plane</span>
          </div>
          <div className="w-full aspect-square max-h-44 bg-black rounded overflow-hidden flex items-center justify-center relative border border-studio-border/60">
            <canvas ref={sagittalCanvasRef} className="w-full h-full object-contain" />
            {/* Crosshair indicator */}
            <div
              className="absolute left-0 right-0 border-t border-amber-400/40 pointer-events-none"
              style={{ top: `${((d - 1 - axial) / d) * 100}%` }}
            />
            <div
              className="absolute top-0 bottom-0 border-l border-amber-400/40 pointer-events-none"
              style={{ left: `${(coronal / h) * 100}%` }}
            />
          </div>
          <div className="w-full flex items-center space-x-2 pt-1">
            <input
              type="range"
              min="0"
              max={w - 1}
              value={sagittal}
              onChange={(e) =>
                onUpdateSettings({
                  activeSlice: { ...settings.activeSlice, sagittal: parseInt(e.target.value, 10) },
                })
              }
              className="w-full"
            />
          </div>
        </div>

      </div>
    </div>
  );
};
