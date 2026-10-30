// Central 3D Viewport Component for NeuroVision 3D
// Renders active Three.js WebGL2 scene (World or Medical) with full camera controls & HUD.

import React, { useRef, useState, useEffect } from 'react';
import {
  RotateCcw,
  Maximize2,
  Minimize2,
  Palette,
  AlertTriangle,
  Boxes,
  Box
} from 'lucide-react';
import { StudioModule } from '../types';

interface Viewport3DProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  currentModule: StudioModule;
  onResetCamera: () => void;
  isWebGL2Supported: boolean;
  backgroundColor: string;
  onChangeBackgroundColor: (color: string) => void;
  onToggleMprViewer?: () => void;
  showMprViewer?: boolean;
}

export const Viewport3D: React.FC<Viewport3DProps> = ({
  canvasRef,
  currentModule,
  onResetCamera,
  isWebGL2Supported,
  backgroundColor,
  onChangeBackgroundColor,
  onToggleMprViewer,
  showMprViewer,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

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
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex-1 h-full relative bg-[#090D13] overflow-hidden flex flex-col select-none"
    >
      {/* Top Floating Viewport Control Toolbar */}
      <div className="absolute top-3 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        
        {/* Module Status Pill */}
        <div className="pointer-events-auto flex items-center space-x-2 bg-studio-panel/90 backdrop-blur-md border border-studio-border px-3 py-1.5 rounded-md shadow-xl text-xs font-mono">
          {currentModule === 'world' ? (
            <div className="flex items-center space-x-1.5 text-cyan-300">
              <Boxes className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-semibold">WORLD 3D VIEWPORT</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1.5 text-blue-300">
                <Box className="w-3.5 h-3.5 text-blue-400" />
                <span className="font-semibold">MEDICAL 3D VOLUME VIEWPORT</span>
              </div>
              {onToggleMprViewer && (
                <button
                  onClick={onToggleMprViewer}
                  className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
                    showMprViewer
                      ? 'bg-cyan-600/30 border-cyan-400 text-cyan-300'
                      : 'bg-studio-bg border-studio-border text-slate-300 hover:text-white'
                  }`}
                >
                  {showMprViewer ? 'Hide 2D Slices' : 'Show 2D Slices'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Floating Actions: Camera Reset, Background Color, Fullscreen */}
        <div className="pointer-events-auto flex items-center space-x-1.5 bg-studio-panel/90 backdrop-blur-md border border-studio-border p-1 rounded-md shadow-xl">
          {/* Background selector */}
          <div className="relative">
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="p-1.5 rounded hover:bg-studio-panelHover text-slate-300 hover:text-white transition-colors"
              title="Change Viewport Background"
            >
              <Palette className="w-4 h-4 text-cyan-400" />
            </button>

            {showColorPicker && (
              <div className="absolute right-0 top-10 bg-studio-panel border border-studio-border p-2 rounded shadow-2xl z-30 flex space-x-1.5">
                {[
                  { color: '#090D13', name: 'Dark Graphite' },
                  { color: '#000000', name: 'Pitch Black' },
                  { color: '#0F172A', name: 'Deep Slate' },
                  { color: '#18181B', name: 'Zinc' },
                ].map((bg) => (
                  <button
                    key={bg.color}
                    onClick={() => {
                      onChangeBackgroundColor(bg.color);
                      setShowColorPicker(false);
                    }}
                    className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                      backgroundColor === bg.color ? 'border-cyan-400' : 'border-studio-border'
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
        <canvas ref={canvasRef} className="w-full h-full outline-none block" />

        {/* WebGL2 Compatibility Warning */}
        {!isWebGL2Supported && (
          <div className="absolute inset-0 bg-studio-bg/95 flex flex-col items-center justify-center p-6 text-center z-30">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mb-4 text-rose-400">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">WebGL 2.0 Graphics Acceleration Required</h2>
            <p className="text-sm text-studio-muted max-w-md mb-4">
              NeuroVision 3D requires a WebGL2 rendering context with 3D texture support for volumetric ray-casting and hardware-accelerated vertex displacement.
            </p>
          </div>
        )}
      </div>

      {/* Interaction Hint Overlay */}
      <div className="absolute bottom-3 left-4 pointer-events-none hidden md:flex items-center space-x-3 text-[11px] font-mono text-studio-dim bg-studio-panel/70 backdrop-blur px-3 py-1 rounded border border-studio-border/60 z-10">
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
    </div>
  );
};
