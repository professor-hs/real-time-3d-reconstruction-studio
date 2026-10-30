import React, { useRef } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Film,
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  Sliders,
  Eye,
  Grid,
  CheckCircle2,
  X,
  Compass
} from 'lucide-react';
import {
  ColorMode,
  MediaMetadata,
  ReconstructionSettings,
  Resolution,
} from '../types';
import { formatBytes, formatSeconds } from '../utils/formatters';

interface LeftSidebarProps {
  metadata: MediaMetadata;
  settings: ReconstructionSettings;
  onUpdateSettings: (newSettings: Partial<ReconstructionSettings>) => void;
  onLoadSampleScene: () => void;
  onUploadImage: (file: File) => void;
  onUploadVideo: (file: File) => void;
  onUploadDepthMap: (file: File) => void;
  onClearDepthMap: () => void;
  hasImportedDepthMap: boolean;
  onPlayVideo: () => void;
  onPauseVideo: () => void;
  onRestartVideo: () => void;
  onSeekVideo: (time: number) => void;
  thumbnailUrl: string | null;
  depthThumbnailUrl: string | null;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  metadata,
  settings,
  onUpdateSettings,
  onLoadSampleScene,
  onUploadImage,
  onUploadVideo,
  onUploadDepthMap,
  onClearDepthMap,
  hasImportedDepthMap,
  onPlayVideo,
  onPauseVideo,
  onRestartVideo,
  onSeekVideo,
  thumbnailUrl,
  depthThumbnailUrl,
}) => {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const depthInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadImage(file);
      e.target.value = '';
    }
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadVideo(file);
      e.target.value = '';
    }
  };

  const handleDepthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadDepthMap(file);
      e.target.value = '';
    }
  };

  return (
    <aside className="w-80 md:w-84 bg-studio-panel border-r border-studio-border flex flex-col h-full overflow-hidden flex-shrink-0 select-none">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 text-xs text-slate-300">
        
        {/* =========================================================================
            SECTION A: INPUT SOURCE
        ========================================================================= */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-1.5 border-b border-studio-border">
            <span className="font-semibold text-slate-200 tracking-wider text-[11px] uppercase flex items-center space-x-1.5">
              <Upload className="w-3.5 h-3.5 text-studio-accent" />
              <span>Input Source</span>
            </span>
            <span className="text-[10px] text-studio-dim font-mono">
              {metadata.type.toUpperCase()}
            </span>
          </div>

          {/* Action Buttons: Sample, Image, Video */}
          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={onLoadSampleScene}
              className={`p-2 rounded border flex flex-col items-center justify-center space-y-1 transition-all ${
                metadata.type === 'sample'
                  ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                  : 'bg-studio-bg border-studio-border hover:bg-studio-panelHover text-slate-300'
              }`}
              title="Load procedural test scene"
            >
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span className="text-[10px] font-medium">Sample Scene</span>
            </button>

            <button
              onClick={() => imageInputRef.current?.click()}
              className={`p-2 rounded border flex flex-col items-center justify-center space-y-1 transition-all ${
                metadata.type === 'image'
                  ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                  : 'bg-studio-bg border-studio-border hover:bg-studio-panelHover text-slate-300'
              }`}
              title="Upload JPG, PNG, WEBP"
            >
              <ImageIcon className="w-4 h-4 text-blue-400" />
              <span className="text-[10px] font-medium">Upload Image</span>
            </button>

            <button
              onClick={() => videoInputRef.current?.click()}
              className={`p-2 rounded border flex flex-col items-center justify-center space-y-1 transition-all ${
                metadata.type === 'video'
                  ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                  : 'bg-studio-bg border-studio-border hover:bg-studio-panelHover text-slate-300'
              }`}
              title="Upload MP4, WEBM"
            >
              <Film className="w-4 h-4 text-amber-400" />
              <span className="text-[10px] font-medium">Upload Video</span>
            </button>
          </div>

          {/* Hidden File Inputs */}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleImageChange}
          />
          <input
            ref={videoInputRef}
            type="file"
            accept="video/mp4,video/webm"
            className="hidden"
            onChange={handleVideoChange}
          />
          <input
            ref={depthInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleDepthChange}
          />

          {/* Media Info Card with Dual Previews (RGB + Estimated Depth) */}
          <div className="bg-studio-bg/80 border border-studio-border rounded p-2.5 space-y-2">
            <div className="flex items-center space-x-2">
              <div className="w-16 h-12 rounded bg-studio-panel border border-studio-border overflow-hidden relative flex-shrink-0 flex items-center justify-center">
                {thumbnailUrl ? (
                  <img src={thumbnailUrl} alt="RGB Source" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-4 h-4 text-studio-dim" />
                )}
                <div className="absolute bottom-0 right-0 bg-black/70 px-1 py-0.2 text-[8px] font-mono text-cyan-300">
                  RGB
                </div>
              </div>

              <div className="w-16 h-12 rounded bg-studio-panel border border-studio-border overflow-hidden relative flex-shrink-0 flex items-center justify-center">
                {depthThumbnailUrl ? (
                  <img src={depthThumbnailUrl} alt="Depth Estimate" className="w-full h-full object-cover" />
                ) : (
                  <Sliders className="w-4 h-4 text-studio-dim" />
                )}
                <div className="absolute bottom-0 right-0 bg-black/70 px-1 py-0.2 text-[8px] font-mono text-amber-300">
                  Z-MAP
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-medium text-slate-100 truncate" title={metadata.name}>
                  {metadata.name}
                </div>
                <div className="text-[10px] text-studio-dim font-mono">
                  {metadata.width} × {metadata.height} ({metadata.aspectRatio.toFixed(2)}:1)
                </div>
                <div className="text-[10px] text-studio-dim font-mono">
                  {formatBytes(metadata.fileSize)}
                </div>
              </div>
            </div>

            {/* Video Playback Bar if video is loaded */}
            {metadata.type === 'video' && (
              <div className="pt-2 border-t border-studio-border/60 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-mono text-studio-dim">
                  <span>{formatSeconds(metadata.currentTime || 0)}</span>
                  <span>{formatSeconds(metadata.duration || 0)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={metadata.duration || 10}
                  step="0.05"
                  value={metadata.currentTime || 0}
                  onChange={(e) => onSeekVideo(parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="flex items-center justify-center space-x-2 pt-1">
                  <button
                    onClick={onRestartVideo}
                    className="p-1 rounded bg-studio-panel hover:bg-studio-border text-slate-300"
                    title="Restart Video"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  {metadata.isPlaying ? (
                    <button
                      onClick={onPauseVideo}
                      className="px-3 py-1 rounded bg-amber-600/20 text-amber-400 border border-amber-500/30 flex items-center space-x-1"
                    >
                      <Pause className="w-3.5 h-3.5" />
                      <span>Pause</span>
                    </button>
                  ) : (
                    <button
                      onClick={onPlayVideo}
                      className="px-3 py-1 rounded bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Play</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* =========================================================================
            SECTION B: RECONSTRUCTION & DEPTH SOURCE
        ========================================================================= */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-1.5 border-b border-studio-border">
            <span className="font-semibold text-slate-200 tracking-wider text-[11px] uppercase flex items-center space-x-1.5">
              <Sliders className="w-3.5 h-3.5 text-studio-cyan" />
              <span>Depth Approximation Source</span>
            </span>
          </div>

          {/* Depth Method Radio Tabs */}
          <div className="space-y-1.5">
            <label
              className={`flex items-start p-2 rounded border cursor-pointer transition-all ${
                settings.depthMethod === 'luminance'
                  ? 'bg-blue-600/15 border-blue-500 text-slate-100'
                  : 'bg-studio-bg border-studio-border hover:bg-studio-panelHover text-slate-400'
              }`}
            >
              <input
                type="radio"
                name="depthMethod"
                checked={settings.depthMethod === 'luminance'}
                onChange={() => onUpdateSettings({ depthMethod: 'luminance' })}
                className="mt-0.5 text-blue-500 focus:ring-0 mr-2"
              />
              <div>
                <div className="font-medium text-[11px] text-slate-200">1. GPU Luminance Depth</div>
                <div className="text-[10px] text-studio-dim">
                  L = 0.299R + 0.587G + 0.114B (Hardware shader sampling)
                </div>
              </div>
            </label>

            <label
              className={`flex items-start p-2 rounded border cursor-pointer transition-all ${
                settings.depthMethod === 'contrast'
                  ? 'bg-blue-600/15 border-blue-500 text-slate-100'
                  : 'bg-studio-bg border-studio-border hover:bg-studio-panelHover text-slate-400'
              }`}
            >
              <input
                type="radio"
                name="depthMethod"
                checked={settings.depthMethod === 'contrast'}
                onChange={() => onUpdateSettings({ depthMethod: 'contrast' })}
                className="mt-0.5 text-blue-500 focus:ring-0 mr-2"
              />
              <div>
                <div className="font-medium text-[11px] text-slate-200">2. GPU Contrast Depth</div>
                <div className="text-[10px] text-studio-dim">
                  Local 4-neighborhood gradient difference + base luminance
                </div>
              </div>
            </label>

            <div
              className={`p-2 rounded border transition-all ${
                settings.depthMethod === 'imported'
                  ? 'bg-blue-600/15 border-blue-500 text-slate-100'
                  : 'bg-studio-bg border-studio-border text-slate-400'
              }`}
            >
              <label className="flex items-start cursor-pointer">
                <input
                  type="radio"
                  name="depthMethod"
                  checked={settings.depthMethod === 'imported'}
                  onChange={() => {
                    if (hasImportedDepthMap) {
                      onUpdateSettings({ depthMethod: 'imported' });
                    } else {
                      depthInputRef.current?.click();
                    }
                  }}
                  className="mt-0.5 text-blue-500 focus:ring-0 mr-2"
                />
                <div className="flex-1">
                  <div className="font-medium text-[11px] text-slate-200">3. Imported Depth Map</div>
                  <div className="text-[10px] text-studio-dim">
                    Separate grayscale texture sampled in vertex shader
                  </div>
                </div>
              </label>

              {/* Depth Map Upload or Clear button */}
              <div className="mt-2 pl-5 flex items-center space-x-2">
                <button
                  onClick={() => depthInputRef.current?.click()}
                  className="px-2 py-1 rounded bg-studio-panelHover hover:bg-studio-border text-slate-200 text-[10px] border border-studio-border"
                >
                  {hasImportedDepthMap ? 'Replace Depth Map' : 'Upload Depth Map'}
                </button>
                {hasImportedDepthMap && (
                  <button
                    onClick={onClearDepthMap}
                    className="p-1 rounded bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40"
                    title="Remove imported depth map"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Invert Depth Toggle */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-300">Invert Depth Values</span>
            <input
              type="checkbox"
              checked={settings.invertDepth}
              onChange={(e) => onUpdateSettings({ invertDepth: e.target.checked })}
              className="rounded bg-studio-bg border-studio-border text-blue-500 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
            />
          </div>
        </div>

        {/* =========================================================================
            SECTION C: QUALITY & SHADER SETTINGS
        ========================================================================= */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between pb-1.5 border-b border-studio-border">
            <span className="font-semibold text-slate-200 tracking-wider text-[11px] uppercase flex items-center space-x-1.5">
              <Eye className="w-3.5 h-3.5 text-studio-accent" />
              <span>Shader & Geometry Controls</span>
            </span>
          </div>

          {/* Resolution Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-300">Grid Resolution</span>
              <span className="text-[10px] font-mono text-cyan-400">
                {(settings.resolution * settings.resolution).toLocaleString()} Points
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {([128, 256, 512] as Resolution[]).map((res) => (
                <button
                  key={res}
                  onClick={() => onUpdateSettings({ resolution: res })}
                  className={`py-1.5 px-2 rounded border text-[11px] font-mono transition-all ${
                    settings.resolution === res
                      ? 'bg-blue-600 text-white border-blue-400 font-semibold'
                      : 'bg-studio-bg border-studio-border hover:bg-studio-panelHover text-slate-300'
                  }`}
                >
                  {res}×{res}
                </button>
              ))}
            </div>
          </div>

          {/* Depth Intensity Slider */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-300">Depth Displacement (Z)</span>
              <span className="text-[10px] font-mono text-slate-400">{settings.depthIntensity.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="3.5"
              step="0.05"
              value={settings.depthIntensity}
              onChange={(e) => onUpdateSettings({ depthIntensity: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>

          {/* Point Size Slider */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-300">Point Sprite Size</span>
              <span className="text-[10px] font-mono text-slate-400">{settings.pointSize.toFixed(1)}px</span>
            </div>
            <input
              type="range"
              min="1.0"
              max="12.0"
              step="0.5"
              value={settings.pointSize}
              onChange={(e) => onUpdateSettings({ pointSize: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>

          {/* Edge Influence (Only active/visible for Contrast mode, or always adjustable) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-300">Edge Gradient Influence</span>
              <span className="text-[10px] font-mono text-slate-400">{settings.edgeInfluence.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="3.5"
              step="0.1"
              value={settings.edgeInfluence}
              onChange={(e) => onUpdateSettings({ edgeInfluence: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>

          {/* Contrast Slider */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-300">Image Contrast</span>
              <span className="text-[10px] font-mono text-slate-400">{settings.contrast.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.3"
              max="2.5"
              step="0.05"
              value={settings.contrast}
              onChange={(e) => onUpdateSettings({ contrast: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>

          {/* Brightness Slider */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-300">Image Brightness</span>
              <span className="text-[10px] font-mono text-slate-400">{settings.brightness.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.3"
              max="2.0"
              step="0.05"
              value={settings.brightness}
              onChange={(e) => onUpdateSettings({ brightness: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>

          {/* Color Mode Selector */}
          <div className="space-y-1.5">
            <span className="text-[11px] text-slate-300">Color Palette Mode</span>
            <div className="grid grid-cols-2 gap-1.5">
              {(
                [
                  { id: 'rgb', label: 'Original RGB' },
                  { id: 'grayscale', label: 'Depth Grayscale' },
                  { id: 'height', label: 'Height (Turbo)' },
                  { id: 'neon', label: 'Scientific Neon' },
                ] as { id: ColorMode; label: string }[]
              ).map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => onUpdateSettings({ colorMode: mode.id })}
                  className={`py-1.5 px-2 rounded border text-[10px] transition-all text-center truncate ${
                    settings.colorMode === mode.id
                      ? 'bg-blue-600/25 border-blue-400 text-blue-200 font-medium'
                      : 'bg-studio-bg border-studio-border hover:bg-studio-panelHover text-slate-400'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          {/* Viewport Toggles (Grid, Wireframe, Animation, Auto-rotate) */}
          <div className="pt-2 border-t border-studio-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-300 flex items-center space-x-1.5">
                <Grid className="w-3.5 h-3.5 text-studio-dim" />
                <span>Reference Grid</span>
              </span>
              <input
                type="checkbox"
                checked={settings.showGrid}
                onChange={(e) => onUpdateSettings({ showGrid: e.target.checked })}
                className="rounded bg-studio-bg border-studio-border text-blue-500 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-300 flex items-center space-x-1.5">
                <Compass className="w-3.5 h-3.5 text-studio-dim" />
                <span>Coordinate Axes</span>
              </span>
              <input
                type="checkbox"
                checked={settings.showAxes}
                onChange={(e) => onUpdateSettings({ showAxes: e.target.checked })}
                className="rounded bg-studio-bg border-studio-border text-blue-500 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-300 flex items-center space-x-1.5">
                <RotateCcw className="w-3.5 h-3.5 text-studio-dim" />
                <span>Auto-Rotation</span>
              </span>
              <input
                type="checkbox"
                checked={settings.autoRotate}
                onChange={(e) => onUpdateSettings({ autoRotate: e.target.checked })}
                className="rounded bg-studio-bg border-studio-border text-blue-500 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-300 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-studio-dim" />
                <span>Point Dynamics / Wave</span>
              </span>
              <input
                type="checkbox"
                checked={settings.animatePoints}
                onChange={(e) => onUpdateSettings({ animatePoints: e.target.checked })}
                className="rounded bg-studio-bg border-studio-border text-blue-500 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-300 flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-studio-dim" />
                <span>Wireframe / Point Rings</span>
              </span>
              <input
                type="checkbox"
                checked={settings.wireframe}
                onChange={(e) => onUpdateSettings({ wireframe: e.target.checked })}
                className="rounded bg-studio-bg border-studio-border text-blue-500 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
              />
            </div>
          </div>
        </div>

      </div>
    </aside>
  );
};
