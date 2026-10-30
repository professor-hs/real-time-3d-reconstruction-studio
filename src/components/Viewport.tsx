import React, { useRef, useEffect, useState } from 'react';
import {
  RotateCcw,
  Maximize2,
  Minimize2,
  Layers,
  Grid,
  Image as ImageIcon,
  Sparkles,
  Sliders,
  AlertTriangle,
  Palette
} from 'lucide-react';
import { ReconstructionSettings, ViewportMode } from '../types';

interface ViewportProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  viewportMode: ViewportMode;
  onSetViewportMode: (mode: ViewportMode) => void;
  onResetCamera: () => void;
  settings: ReconstructionSettings;
  onUpdateSettings: (newSettings: Partial<ReconstructionSettings>) => void;
  isWebGL2Supported: boolean;
  thumbnailUrl: string | null;
  depthThumbnailUrl: string | null;
}

export const Viewport: React.FC<ViewportProps> = ({
  canvasRef,
  viewportMode,
  onSetViewportMode,
  onResetCamera,
  settings,
  onUpdateSettings,
  isWebGL2Supported,
  thumbnailUrl,
  depthThumbnailUrl,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => console.warn(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch((err) => console.warn(err));
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex-1 h-full relative bg-[#0B0E13] overflow-hidden flex flex-col select-none"
    >
      {/* Top Floating Viewport Control Toolbar */}
      <div className="absolute top-3 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
        
        {/* Viewport Mode Switcher Tabs */}
        <div className="pointer-events-auto flex items-center bg-studio-panel/90 backdrop-blur-md border border-studio-border p-1 rounded-md shadow-xl">
          <button
            onClick={() => onSetViewportMode('pointcloud')}
            className={`px-2.5 py-1 rounded text-xs flex items-center space-x-1.5 transition-colors ${
              viewportMode === 'pointcloud'
                ? 'bg-blue-600 text-white font-medium shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-studio-panelHover'
            }`}
            title="3D Point Cloud"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-300" />
            <span className="hidden sm:inline">3D Cloud</span>
          </button>

          <button
            onClick={() => onSetViewportMode('pointcloud-grid')}
            className={`px-2.5 py-1 rounded text-xs flex items-center space-x-1.5 transition-colors ${
              viewportMode === 'pointcloud-grid'
                ? 'bg-blue-600 text-white font-medium shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-studio-panelHover'
            }`}
            title="Point Cloud with Reference Grid"
          >
            <Grid className="w-3.5 h-3.5 text-blue-300" />
            <span className="hidden sm:inline">Cloud + Grid</span>
          </button>

          <button
            onClick={() => onSetViewportMode('original')}
            className={`px-2.5 py-1 rounded text-xs flex items-center space-x-1.5 transition-colors ${
              viewportMode === 'original'
                ? 'bg-blue-600 text-white font-medium shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-studio-panelHover'
            }`}
            title="Original 2D RGB media"
          >
            <ImageIcon className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden sm:inline">2D Original</span>
          </button>

          <button
            onClick={() => onSetViewportMode('depthmap')}
            className={`px-2.5 py-1 rounded text-xs flex items-center space-x-1.5 transition-colors ${
              viewportMode === 'depthmap'
                ? 'bg-blue-600 text-white font-medium shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-studio-panelHover'
            }`}
            title="Estimated 2D Depth Map"
          >
            <Sliders className="w-3.5 h-3.5 text-emerald-300" />
            <span className="hidden sm:inline">2D Depth Map</span>
          </button>
        </div>

        {/* Right Floating Actions (Reset Camera, Fullscreen, Background) */}
        <div className="pointer-events-auto flex items-center space-x-1.5 bg-studio-panel/90 backdrop-blur-md border border-studio-border p-1 rounded-md shadow-xl">
          {/* Background color selector */}
          <div className="relative">
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="p-1.5 rounded hover:bg-studio-panelHover text-slate-300 hover:text-white transition-colors"
              title="Change Background Color"
            >
              <Palette className="w-4 h-4 text-studio-cyan" />
            </button>

            {showColorPicker && (
              <div className="absolute right-0 top-10 bg-studio-panel border border-studio-border p-2 rounded shadow-2xl z-20 flex space-x-1.5">
                {[
                  { color: '#0B0E13', name: 'Dark Graphite' },
                  { color: '#000000', name: 'Pitch Black' },
                  { color: '#0F172A', name: 'Deep Slate' },
                  { color: '#18181B', name: 'Zinc' },
                ].map((bg) => (
                  <button
                    key={bg.color}
                    onClick={() => {
                      onUpdateSettings({ backgroundColor: bg.color });
                      setShowColorPicker(false);
                    }}
                    className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                      settings.backgroundColor === bg.color ? 'border-cyan-400' : 'border-studio-border'
                    }`}
                    style={{ backgroundColor: bg.color }}
                    title={bg.name}
                  />
                ))}
              </div>
            )}
          </div>

          <button
            onClick={onResetCamera}
            className="p-1.5 rounded hover:bg-studio-panelHover text-slate-300 hover:text-white transition-colors"
            title="Reset Camera Target and Angle"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded hover:bg-studio-panelHover text-slate-300 hover:text-white transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Three.js WebGL Canvas */}
      <div className="w-full h-full relative flex items-center justify-center">
        {/* Three.js canvas element */}
        <canvas
          ref={canvasRef}
          className={`w-full h-full outline-none block ${
            viewportMode === 'original' || viewportMode === 'depthmap' ? 'hidden' : 'block'
          }`}
        />

        {/* 2D Original Image Overlay View */}
        {viewportMode === 'original' && (
          <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-[#0B0E13]">
            {thumbnailUrl ? (
              <div className="max-w-3xl max-h-[80%] border border-studio-border rounded-lg overflow-hidden shadow-2xl relative">
                <img
                  src={thumbnailUrl}
                  alt="Original 2D View"
                  className="w-full h-full object-contain max-h-[70vh]"
                />
                <div className="absolute top-3 left-3 bg-studio-panel/80 backdrop-blur border border-studio-border px-2.5 py-1 rounded text-xs font-mono text-cyan-300">
                  SOURCE RGB TEXTURE
                </div>
              </div>
            ) : (
              <div className="text-studio-dim text-sm font-mono">No visual source loaded</div>
            )}
          </div>
        )}

        {/* 2D Depth Map Overlay View */}
        {viewportMode === 'depthmap' && (
          <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-[#0B0E13]">
            {depthThumbnailUrl ? (
              <div className="max-w-3xl max-h-[80%] border border-studio-border rounded-lg overflow-hidden shadow-2xl relative">
                <img
                  src={depthThumbnailUrl}
                  alt="Depth Map View"
                  className="w-full h-full object-contain max-h-[70vh]"
                />
                <div className="absolute top-3 left-3 bg-studio-panel/80 backdrop-blur border border-studio-border px-2.5 py-1 rounded text-xs font-mono text-amber-300">
                  ESTIMATED DEPTH MAP ({settings.depthMethod.toUpperCase()})
                </div>
              </div>
            ) : (
              <div className="text-studio-dim text-sm font-mono">Generating depth map preview...</div>
            )}
          </div>
        )}

        {/* WebGL2 Compatibility Warning if unavailable */}
        {!isWebGL2Supported && (
          <div className="absolute inset-0 bg-studio-bg/95 flex flex-col items-center justify-center p-6 text-center z-30">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mb-4 text-rose-400">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">WebGL 2.0 Graphics Acceleration Required</h2>
            <p className="text-sm text-studio-muted max-w-md mb-4">
              This application utilizes hardware-accelerated GLSL vertex shaders to reconstruct 3D geometry in real time.
              Your current browser environment or GPU driver does not expose a WebGL2 rendering context.
            </p>
            <div className="bg-studio-panel border border-studio-border p-3 rounded text-xs font-mono text-slate-300 max-w-sm text-left space-y-1">
              <div>• Ensure hardware acceleration is enabled in browser flags.</div>
              <div>• Test with a modern Chromium, Firefox, or Safari browser.</div>
              <div>• Verify GPU drivers support OpenGL ES 3.0 / WebGL2.</div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Floating Interaction Hint Overlay */}
      <div className="absolute bottom-3 left-4 pointer-events-none hidden md:flex items-center space-x-3 text-[11px] font-mono text-studio-dim bg-studio-panel/70 backdrop-blur px-3 py-1 rounded border border-studio-border/60">
        <span className="flex items-center space-x-1">
          <span className="text-slate-200">LMB Drag:</span>
          <span>Rotate</span>
        </span>
        <span className="text-studio-border">•</span>
        <span className="flex items-center space-x-1">
          <span className="text-slate-200">RMB Drag:</span>
          <span>Pan</span>
        </span>
        <span className="text-studio-border">•</span>
        <span className="flex items-center space-x-1">
          <span className="text-slate-200">Scroll:</span>
          <span>Zoom</span>
        </span>
      </div>

      {/* Subtle indicator of current vertex shader mode */}
      <div className="absolute bottom-3 right-4 pointer-events-none flex items-center space-x-1.5 text-[11px] font-mono text-cyan-400 bg-studio-panel/70 backdrop-blur px-2.5 py-1 rounded border border-studio-border/60">
        <Sparkles className="w-3.5 h-3.5" />
        <span className="uppercase text-[10px] tracking-wide">
          {settings.depthMethod} | {settings.colorMode}
        </span>
      </div>
    </div>
  );
};
