import React, { useRef } from 'react';
import {
  Upload,
  Box,
  Layers,
  Sparkles,
  Sliders,
  Activity,
  Maximize2
} from 'lucide-react';
import { MedicalRenderMode, MedicalSettings, MedicalVolumeMetadata } from '../types';

interface LeftSidebarMedicalProps {
  metadata: MedicalVolumeMetadata;
  settings: MedicalSettings;
  onUpdateSettings: (newSettings: Partial<MedicalSettings>) => void;
  onLoadSyntheticPhantom: () => void;
  onImportDicomFiles: (files: FileList) => void;
  onImportNiftiFile: (file: File) => void;
  onToggleMprViewer: () => void;
  showMprViewer: boolean;
}

export const LeftSidebarMedical: React.FC<LeftSidebarMedicalProps> = ({
  metadata,
  settings,
  onUpdateSettings,
  onLoadSyntheticPhantom,
  onImportDicomFiles,
  onImportNiftiFile,
  onToggleMprViewer,
  showMprViewer,
}) => {
  const dicomInputRef = useRef<HTMLInputElement>(null);
  const niftiInputRef = useRef<HTMLInputElement>(null);

  const applyClinicalPreset = (w: number, c: number) => {
    onUpdateSettings({ windowWidth: w, windowCenter: c });
  };

  return (
    <aside className="w-80 md:w-84 bg-studio-panel border-r border-studio-border flex flex-col h-full overflow-hidden flex-shrink-0 select-none">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 text-xs text-slate-300">
        
        {/* =========================================================================
            SECTION 1: MEDICAL DATASET INPUT
        ========================================================================= */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between pb-1.5 border-b border-studio-border">
            <span className="font-semibold text-slate-200 tracking-wider text-[11px] uppercase flex items-center space-x-1.5">
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              <span>Medical Volume Source</span>
            </span>
            <span className="text-[10px] text-cyan-400 font-mono">
              {metadata.modality}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={onLoadSyntheticPhantom}
              className={`p-2 rounded border flex items-center space-x-2 transition-all ${
                metadata.isSynthetic
                  ? 'bg-cyan-600/20 border-cyan-500 text-cyan-300'
                  : 'bg-studio-bg border-studio-border hover:bg-studio-panelHover text-slate-300'
              }`}
            >
              <Sparkles className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <div className="text-left">
                <div className="text-[11px] font-medium leading-none">Brain Phantom</div>
                <div className="text-[9px] text-studio-dim">Calibrated 3D CT</div>
              </div>
            </button>

            <button
              onClick={() => dicomInputRef.current?.click()}
              className="p-2 rounded border bg-studio-bg border-studio-border hover:bg-studio-panelHover text-slate-300 flex items-center space-x-2 transition-all"
            >
              <Box className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <div className="text-left">
                <div className="text-[11px] font-medium leading-none">Import DICOM</div>
                <div className="text-[9px] text-studio-dim">Series / Slices</div>
              </div>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-1.5">
            <button
              onClick={() => niftiInputRef.current?.click()}
              className="p-2 rounded border bg-studio-bg border-studio-border hover:bg-studio-panelHover text-slate-300 flex items-center space-x-2 transition-all"
            >
              <Layers className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <div className="text-left">
                <div className="text-[11px] font-medium leading-none">Import NIfTI Volume</div>
                <div className="text-[9px] text-studio-dim">.nii or .nii.gz format</div>
              </div>
            </button>
          </div>

          {/* Hidden Inputs */}
          <input
            ref={dicomInputRef}
            type="file"
            multiple
            accept=".dcm,.dicom,image/dicom,*/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                onImportDicomFiles(e.target.files);
              }
              e.target.value = '';
            }}
          />
          <input
            ref={niftiInputRef}
            type="file"
            accept=".nii,.gz"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onImportNiftiFile(file);
              e.target.value = '';
            }}
          />

          {/* Volume Summary Card */}
          <div className="bg-studio-bg border border-studio-border rounded p-2.5 space-y-1.5 font-mono text-[11px]">
            <div className="text-[11px] font-sans font-semibold text-slate-200 truncate" title={metadata.seriesDescription}>
              {metadata.seriesDescription}
            </div>
            <div className="flex justify-between items-center text-studio-dim text-[10px]">
              <span>Matrix Grid:</span>
              <span className="text-slate-200">{metadata.dimensions.join(' × ')}</span>
            </div>
            <div className="flex justify-between items-center text-studio-dim text-[10px]">
              <span>Voxel Spacing:</span>
              <span className="text-slate-200">{metadata.voxelSpacing.map((s: number) => s.toFixed(1)).join(' × ')} mm</span>
            </div>
            <div className="flex justify-between items-center text-studio-dim text-[10px]">
              <span>Slice Count:</span>
              <span className="text-cyan-400 font-semibold">{metadata.sliceCount} Slices</span>
            </div>

            {/* Toggle 2D MPR Viewer button */}
            <div className="pt-2 border-t border-studio-border/60">
              <button
                onClick={onToggleMprViewer}
                className={`w-full py-1.5 px-2 rounded border text-[10px] font-mono flex items-center justify-center space-x-1.5 transition-colors ${
                  showMprViewer
                    ? 'bg-cyan-600/25 border-cyan-400 text-cyan-200'
                    : 'bg-studio-panelHover hover:bg-studio-border text-slate-300'
                }`}
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>{showMprViewer ? 'Hide Orthogonal Slices' : 'Open 2D Orthogonal Slices (MPR)'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* =========================================================================
            SECTION 2: GPU VOLUME RECONSTRUCTION MODES
        ========================================================================= */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between pb-1.5 border-b border-studio-border">
            <span className="font-semibold text-slate-200 tracking-wider text-[11px] uppercase flex items-center space-x-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>GPU Volume Ray-Casting</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {(
              [
                { id: 'dvr', label: 'Volume Rendering (DVR)', desc: 'Alpha Compositing' },
                { id: 'mip', label: 'Maximum Intensity (MIP)', desc: 'Angio / Vessels' },
                { id: 'minip', label: 'Minimum Intensity (MinIP)', desc: 'Airways / Lungs' },
                { id: 'avgip', label: 'Average Intensity (AvgIP)', desc: 'Digital Radiograph' },
                { id: 'isosurface', label: 'Marching Cubes Surface', desc: 'Iso-Surface Mesh' },
              ] as { id: MedicalRenderMode; label: string; desc: string }[]
            ).map((m) => (
              <button
                key={m.id}
                onClick={() => onUpdateSettings({ renderMode: m.id })}
                className={`p-2 rounded border text-left transition-all ${
                  settings.renderMode === m.id
                    ? 'bg-cyan-600 text-white border-cyan-400 font-semibold shadow-sm col-span-2'
                    : 'bg-studio-bg border-studio-border hover:bg-studio-panelHover text-slate-300'
                }`}
              >
                <div className="text-[11px]">{m.label}</div>
                <div className="text-[8px] opacity-70 truncate">{m.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* =========================================================================
            SECTION 3: CLINICAL WINDOW / LEVEL & TRANSFER FUNCTION
        ========================================================================= */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-1.5 border-b border-studio-border">
            <span className="font-semibold text-slate-200 tracking-wider text-[11px] uppercase flex items-center space-x-1.5">
              <Sliders className="w-3.5 h-3.5 text-studio-accent" />
              <span>Window / Level & Transfer Function</span>
            </span>
          </div>

          {/* Clinical Presets */}
          <div className="space-y-1">
            <span className="text-[10px] text-studio-dim">Clinical Presets (HU)</span>
            <div className="grid grid-cols-4 gap-1 text-[9px] font-mono">
              <button
                onClick={() => applyClinicalPreset(80, 40)}
                className="py-1 px-1 rounded bg-studio-bg border border-studio-border hover:bg-studio-panelHover text-slate-300 truncate"
              >
                Brain
              </button>
              <button
                onClick={() => applyClinicalPreset(1500, 400)}
                className="py-1 px-1 rounded bg-studio-bg border border-studio-border hover:bg-studio-panelHover text-slate-300 truncate"
              >
                Bone
              </button>
              <button
                onClick={() => applyClinicalPreset(1500, -600)}
                className="py-1 px-1 rounded bg-studio-bg border border-studio-border hover:bg-studio-panelHover text-slate-300 truncate"
              >
                Lung
              </button>
              <button
                onClick={() => applyClinicalPreset(350, 50)}
                className="py-1 px-1 rounded bg-studio-bg border border-studio-border hover:bg-studio-panelHover text-slate-300 truncate"
              >
                Soft
              </button>
            </div>
          </div>

          {/* Window Center (Level) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-300">Window Center (Level)</span>
              <span className="text-[10px] font-mono text-cyan-400">{Math.round(settings.windowCenter)} HU</span>
            </div>
            <input
              type="range"
              min="-1000"
              max="1500"
              step="5"
              value={settings.windowCenter}
              onChange={(e) => onUpdateSettings({ windowCenter: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>

          {/* Window Width */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-300">Window Width</span>
              <span className="text-[10px] font-mono text-cyan-400">{Math.round(settings.windowWidth)} HU</span>
            </div>
            <input
              type="range"
              min="10"
              max="2500"
              step="10"
              value={settings.windowWidth}
              onChange={(e) => onUpdateSettings({ windowWidth: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>

          {/* Global Ray Opacity */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-300">Volume Opacity Multiplier</span>
              <span className="text-[10px] font-mono text-slate-400">{settings.opacity.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="3.0"
              step="0.05"
              value={settings.opacity}
              onChange={(e) => onUpdateSettings({ opacity: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>

          {/* Ray Step Size (Quality) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-300">Ray-Marching Step Interval</span>
              <span className="text-[10px] font-mono text-slate-400">{settings.stepSize.toFixed(4)}</span>
            </div>
            <input
              type="range"
              min="0.001"
              max="0.015"
              step="0.0005"
              value={settings.stepSize}
              onChange={(e) => onUpdateSettings({ stepSize: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>

          {/* If Marching Cubes Isosurface active, show threshold slider */}
          {settings.renderMode === 'isosurface' && (
            <div className="p-2.5 rounded bg-blue-950/20 border border-blue-900/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-blue-300">Surface Threshold</span>
                <span className="text-[10px] font-mono text-blue-300">{Math.round(settings.isosurfaceThreshold)} HU</span>
              </div>
              <input
                type="range"
                min="-200"
                max="1000"
                step="10"
                value={settings.isosurfaceThreshold}
                onChange={(e) => onUpdateSettings({ isosurfaceThreshold: parseFloat(e.target.value) })}
                className="w-full"
              />
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-studio-dim">Surface Color</span>
                <input
                  type="color"
                  value={settings.surfaceColor}
                  onChange={(e) => onUpdateSettings({ surfaceColor: e.target.value })}
                  className="w-6 h-6 rounded border border-studio-border bg-transparent cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Toggles */}
          <div className="pt-2 border-t border-studio-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-300">Show Bounding Box</span>
              <input
                type="checkbox"
                checked={settings.showBoundingBox}
                onChange={(e) => onUpdateSettings({ showBoundingBox: e.target.checked })}
                className="rounded bg-studio-bg border-studio-border text-cyan-500 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
              />
            </div>
          </div>
        </div>

      </div>
    </aside>
  );
};
