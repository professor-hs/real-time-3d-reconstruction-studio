import React from 'react';
import { X, Image as ImageIcon, Sliders, AlertTriangle } from 'lucide-react';
import { DepthMethod } from '../types';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  thumbnailUrl: string | null;
  depthThumbnailUrl: string | null;
  importedDepthUrl: string | null;
  depthMethod: DepthMethod;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({
  isOpen,
  onClose,
  thumbnailUrl,
  depthThumbnailUrl,
  importedDepthUrl,
  depthMethod,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none animate-fadeIn">
      <div className="bg-studio-panel border border-studio-border rounded-lg max-w-4xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-studio-border flex items-center justify-between bg-studio-bg/60">
          <div className="flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-studio-cyan" />
            <h2 className="text-sm font-semibold text-slate-100 font-mono tracking-wide">
              2D SOURCE & DEPTH MAP PREVIEW INSPECTOR
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-studio-panelHover text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto text-xs text-slate-300">
          {/* Side-by-side or 3-column view */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* 1. Original RGB */}
            <div className="bg-studio-bg border border-studio-border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200 text-xs flex items-center space-x-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                  <span>1. Source Media (RGB)</span>
                </span>
                <span className="text-[10px] font-mono text-cyan-400">TEXTURE 0</span>
              </div>
              <div className="w-full aspect-[4/3] bg-studio-panel rounded border border-studio-border overflow-hidden flex items-center justify-center">
                {thumbnailUrl ? (
                  <img src={thumbnailUrl} alt="RGB Source" className="w-full h-full object-contain" />
                ) : (
                  <span className="text-studio-dim text-xs">No image loaded</span>
                )}
              </div>
              <p className="text-[10px] text-studio-dim">
                Source color channels sampled by GLSL shader <code>texture2D(uImage, uv)</code>.
              </p>
            </div>

            {/* 2. Generated GPU Depth Approximation */}
            <div className="bg-studio-bg border border-studio-border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200 text-xs flex items-center space-x-1.5">
                  <Sliders className="w-3.5 h-3.5 text-amber-400" />
                  <span>2. Estimated Depth Map</span>
                </span>
                <span className="text-[10px] font-mono text-amber-400 uppercase">{depthMethod}</span>
              </div>
              <div className="w-full aspect-[4/3] bg-studio-panel rounded border border-studio-border overflow-hidden flex items-center justify-center">
                {depthThumbnailUrl ? (
                  <img src={depthThumbnailUrl} alt="Depth Estimate" className="w-full h-full object-contain" />
                ) : (
                  <span className="text-studio-dim text-xs">Generating map...</span>
                )}
              </div>
              <p className="text-[10px] text-studio-dim">
                Calculated on the GPU in vertex shader via {depthMethod === 'contrast' ? 'Luma + 4-neighbor spatial gradients' : 'ITU-R BT.601 luminance heuristics'}.
              </p>
            </div>

            {/* 3. Imported Depth Map (if available) */}
            <div className="bg-studio-bg border border-studio-border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200 text-xs flex items-center space-x-1.5">
                  <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                  <span>3. Imported Depth Texture</span>
                </span>
                <span className="text-[10px] font-mono text-emerald-400">TEXTURE 1</span>
              </div>
              <div className="w-full aspect-[4/3] bg-studio-panel rounded border border-studio-border overflow-hidden flex items-center justify-center">
                {importedDepthUrl ? (
                  <img src={importedDepthUrl} alt="Imported Depth Map" className="w-full h-full object-contain" />
                ) : (
                  <div className="text-center p-3 text-studio-dim">
                    <span className="text-[11px] block">No separate depth map uploaded</span>
                    <span className="text-[9px] mt-1 block">Upload a grayscale depth image in the left sidebar</span>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-studio-dim">
                {importedDepthUrl
                  ? 'Sampled directly by vertex shader when Depth Source is set to Imported.'
                  : 'Allows ground-truth depth from LiDAR, depth sensors, or MiDaS/DPT neural depth estimators.'}
              </p>
            </div>

          </div>

          {/* Scientific Heuristic Notice */}
          <div className="bg-amber-950/20 border border-amber-900/40 rounded-lg p-3.5 flex items-start space-x-3 text-amber-200/90 text-xs">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-semibold text-amber-300">Scientific Calibration Notice</div>
              <p className="text-[11px] leading-relaxed text-amber-200/80">
                Luminance and contrast depth approximation methods are empirical heuristic visual approximations. They estimate relative spatial relief from local photometric brightness and gradient contrast. They are <strong>not physically calibrated metric depth measurements</strong>. For calibrated metric reconstruction, provide a ground-truth LiDAR or depth sensor map via the Imported Depth Map slot.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-studio-border bg-studio-bg/60 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-studio-panelHover hover:bg-studio-border text-slate-200 text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
