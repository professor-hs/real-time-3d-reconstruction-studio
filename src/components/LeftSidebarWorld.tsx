import React, { useRef } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Images,
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
  Compass,
  Boxes
} from 'lucide-react';
import {
  ColorMode,
  Resolution,
  WorldMediaMetadata,
  WorldRenderMode,
  WorldSettings,
} from '../types';
import { formatBytes, formatSeconds } from '../utils/formatters';

interface LeftSidebarWorldProps {
  metadata: WorldMediaMetadata;
  settings: WorldSettings;
  onUpdateSettings: (newSettings: Partial<WorldSettings>) => void;
  onLoadSampleScene: () => void;
  onLoadSamplePreset: (presetId: 'alpine' | 'relief' | 'temple_pair' | 'alpine_depth') => void;
  onUploadImage: (file: File) => void;
  onUploadMultiImages: (files: FileList) => void;
  onUploadVideo: (file: File) => void;
  onUploadDepthMap: (file: File) => void;
  onClearDepthMap: () => void;
  hasImportedDepthMap: boolean;
  onPlayVideo: () => void;
  onPauseVideo: () => void;
  onRestartVideo: () => void;
  onSeekVideo: (time: number) => void;
  onOpenMultiViewModal: () => void;
  thumbnailUrl: string | null;
}

export const LeftSidebarWorld: React.FC<LeftSidebarWorldProps> = ({
  metadata,
  settings,
  onUpdateSettings,
  onLoadSampleScene,
  onLoadSamplePreset,
  onUploadImage,
  onUploadMultiImages,
  onUploadVideo,
  onUploadDepthMap,
  onClearDepthMap,
  hasImportedDepthMap,
  onPlayVideo,
  onPauseVideo,
  onRestartVideo,
  onSeekVideo,
  onOpenMultiViewModal,
  thumbnailUrl,
}) => {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const multiImageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const depthInputRef = useRef<HTMLInputElement>(null);

  return (
    <aside className="w-80 md:w-84 bg-studio-panel border-r border-studio-border flex flex-col h-full overflow-hidden flex-shrink-0 select-none">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 text-xs text-slate-300">
        
        {/* =========================================================================
            SECTION 1: INPUT SOURCE
        ========================================================================= */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between pb-1.5 border-b border-studio-border">
            <span className="font-semibold text-slate-200 tracking-wider text-[11px] uppercase flex items-center space-x-1.5">
              <Upload className="w-3.5 h-3.5 text-studio-accent" />
              <span>World Media Input</span>
            </span>
            <span className="text-[10px] text-cyan-400 font-mono">
              {metadata.type.toUpperCase()}
            </span>
          </div>

          {/* Action Buttons: Sample, Single Image, Multi Image, Video */}
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={onLoadSampleScene}
              className={`p-2 rounded border flex items-center space-x-2 transition-all ${
                metadata.type === 'sample'
                  ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                  : 'bg-studio-bg border-studio-border hover:bg-studio-panelHover text-slate-300'
              }`}
            >
              <Sparkles className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <div className="text-left">
                <div className="text-[11px] font-medium leading-none">Sample Scene</div>
                <div className="text-[9px] text-studio-dim">Built-in Landscape</div>
              </div>
            </button>

            <button
              onClick={() => imageInputRef.current?.click()}
              className={`p-2 rounded border flex items-center space-x-2 transition-all ${
                metadata.type === 'image'
                  ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                  : 'bg-studio-bg border-studio-border hover:bg-studio-panelHover text-slate-300'
              }`}
            >
              <ImageIcon className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <div className="text-left">
                <div className="text-[11px] font-medium leading-none">Upload Image</div>
                <div className="text-[9px] text-studio-dim">JPG, PNG, WEBP</div>
              </div>
            </button>

            <button
              onClick={() => multiImageInputRef.current?.click()}
              className={`p-2 rounded border flex items-center space-x-2 transition-all ${
                metadata.type === 'multi-image'
                  ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                  : 'bg-studio-bg border-studio-border hover:bg-studio-panelHover text-slate-300'
              }`}
              title="Upload multi-view photo series for feature matching & sparse triangulation"
            >
              <Images className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <div className="text-left">
                <div className="text-[11px] font-medium leading-none">Multi-View</div>
                <div className="text-[9px] text-studio-dim">Photo Series</div>
              </div>
            </button>

            <button
              onClick={() => videoInputRef.current?.click()}
              className={`p-2 rounded border flex items-center space-x-2 transition-all ${
                metadata.type === 'video'
                  ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                  : 'bg-studio-bg border-studio-border hover:bg-studio-panelHover text-slate-300'
              }`}
            >
              <Film className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <div className="text-left">
                <div className="text-[11px] font-medium leading-none">Upload Video</div>
                <div className="text-[9px] text-studio-dim">MP4, WEBM</div>
              </div>
            </button>
          </div>

          {/* Preset Benchmark Datasets */}
          <div className="pt-2 border-t border-studio-border/60">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Preset Sample Datasets</span>
              <span className="text-[9px] text-cyan-400 font-mono">1-CLICK LOAD</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => onLoadSamplePreset('alpine')}
                className="p-1.5 rounded bg-studio-bg border border-studio-border hover:border-studio-accent hover:bg-studio-panelHover text-left flex items-center space-x-2 transition-all group"
                title="Load high-resolution alpine mountain landscape"
              >
                <div className="w-6 h-6 rounded bg-slate-800 border border-slate-700 overflow-hidden flex-shrink-0">
                  <img src="/samples/alpine_landscape.png" alt="Alpine" className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-medium text-slate-200 group-hover:text-blue-400 truncate">Alpine Mountain</div>
                  <div className="text-[8px] text-studio-dim">1024×768 RGB</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onLoadSamplePreset('alpine_depth')}
                className="p-1.5 rounded bg-studio-bg border border-studio-border hover:border-cyan-500 hover:bg-studio-panelHover text-left flex items-center space-x-2 transition-all group"
                title="Load alpine photo with ground-truth depth map"
              >
                <div className="w-6 h-6 rounded bg-slate-800 border border-slate-700 overflow-hidden flex-shrink-0">
                  <img src="/samples/alpine_depth_map.png" alt="Depth" className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-medium text-slate-200 group-hover:text-cyan-400 truncate">Alpine + Depth</div>
                  <div className="text-[8px] text-studio-dim">Ground-Truth</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onLoadSamplePreset('relief')}
                className="p-1.5 rounded bg-studio-bg border border-studio-border hover:border-amber-500 hover:bg-studio-panelHover text-left flex items-center space-x-2 transition-all group"
                title="Load high-contrast geometric 3D relief sculpture"
              >
                <div className="w-6 h-6 rounded bg-slate-800 border border-slate-700 overflow-hidden flex-shrink-0">
                  <img src="/samples/relief_sculpture.png" alt="Relief" className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-medium text-slate-200 group-hover:text-amber-400 truncate">3D Relief</div>
                  <div className="text-[8px] text-studio-dim">Stepped Mesh</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onLoadSamplePreset('temple_pair')}
                className="p-1.5 rounded bg-studio-bg border border-studio-border hover:border-emerald-500 hover:bg-studio-panelHover text-left flex items-center space-x-2 transition-all group"
                title="Load temple stereo pair for multi-view feature correspondence"
              >
                <div className="w-6 h-6 rounded bg-slate-800 border border-slate-700 overflow-hidden flex-shrink-0">
                  <img src="/samples/temple_view_left.png" alt="Temple" className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-medium text-slate-200 group-hover:text-emerald-400 truncate">Temple Stereo</div>
                  <div className="text-[8px] text-studio-dim">Multi-View (2)</div>
                </div>
              </button>
            </div>
          </div>

          {/* Hidden File Inputs */}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUploadImage(file);
              e.target.value = '';
            }}
          />
          <input
            ref={multiImageInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                onUploadMultiImages(e.target.files);
              }
              e.target.value = '';
            }}
          />
          <input
            ref={videoInputRef}
            type="file"
            accept="video/mp4,video/webm"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUploadVideo(file);
              e.target.value = '';
            }}
          />
          <input
            ref={depthInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUploadDepthMap(file);
              e.target.value = '';
            }}
          />

          {/* Media Info Card */}
          <div className="bg-studio-bg border border-studio-border rounded p-2.5 space-y-2">
            <div className="flex items-center space-x-2.5">
              <div className="w-16 h-12 rounded bg-studio-panel border border-studio-border overflow-hidden relative flex-shrink-0 flex items-center justify-center">
                {thumbnailUrl ? (
                  <img src={thumbnailUrl} alt="Source" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-4 h-4 text-studio-dim" />
                )}
                <div className="absolute bottom-0 right-0 bg-black/80 px-1 text-[8px] font-mono text-cyan-300">
                  RGB
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
                  {metadata.imageCount ? `${metadata.imageCount} Views • ` : ''}
                  {formatBytes(metadata.fileSize)}
                </div>
              </div>
            </div>

            {/* If Multi-View is active, show Photogrammetry feature matching modal button */}
            {metadata.type === 'multi-image' && (
              <button
                onClick={onOpenMultiViewModal}
                className="w-full py-1.5 px-2 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono flex items-center justify-center space-x-1.5 transition-colors"
              >
                <Boxes className="w-3.5 h-3.5" />
                <span>Inspect Multi-View Correspondences</span>
              </button>
            )}

            {/* Video Playback Bar if video is loaded */}
            {metadata.type === 'video' && (
              <div className="pt-2 border-t border-studio-border space-y-1.5">
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
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  {metadata.isPlaying ? (
                    <button
                      onClick={onPauseVideo}
                      className="px-3 py-1 rounded bg-amber-600/20 text-amber-400 border border-amber-500/30 flex items-center space-x-1 text-[11px]"
                    >
                      <Pause className="w-3 h-3" />
                      <span>Pause</span>
                    </button>
                  ) : (
                    <button
                      onClick={onPlayVideo}
                      className="px-3 py-1 rounded bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1 text-[11px]"
                    >
                      <Play className="w-3 h-3" />
                      <span>Play</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* =========================================================================
            SECTION 2: 3D RENDERING MODE (SOLID MESH, POINTS, WIREFRAME)
        ========================================================================= */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between pb-1.5 border-b border-studio-border">
            <span className="font-semibold text-slate-200 tracking-wider text-[11px] uppercase flex items-center space-x-1.5">
              <Boxes className="w-3.5 h-3.5 text-cyan-400" />
              <span>3D Geometry Representation</span>
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {(
              [
                { id: 'solid', label: 'Solid Mesh', desc: 'Triangles + Lighting' },
                { id: 'points', label: 'Point Cloud', desc: 'GPU Point Sprites' },
                { id: 'wireframe', label: 'Wireframe', desc: 'Displaced Edges' },
              ] as { id: WorldRenderMode; label: string; desc: string }[]
            ).map((m) => (
              <button
                key={m.id}
                onClick={() => onUpdateSettings({ renderMode: m.id })}
                className={`p-2 rounded border text-left transition-all ${
                  settings.renderMode === m.id
                    ? 'bg-blue-600 text-white border-blue-400 font-semibold shadow-sm'
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
            SECTION 3: DEPTH APPROXIMATION SOURCE
        ========================================================================= */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between pb-1.5 border-b border-studio-border">
            <span className="font-semibold text-slate-200 tracking-wider text-[11px] uppercase flex items-center space-x-1.5">
              <Sliders className="w-3.5 h-3.5 text-studio-cyan" />
              <span>Depth Approximation Source</span>
            </span>
          </div>

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
                <div className="text-[9px] text-studio-dim">
                  L = 0.299R + 0.587G + 0.114B (Vertex Shader)
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
                <div className="text-[9px] text-studio-dim">
                  4-Neighborhood Sobel Gradient + Base Luminance
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
                  <div className="text-[9px] text-studio-dim">
                    Dedicated Grayscale LiDAR/Sensor Texture
                  </div>
                </div>
              </label>

              <div className="mt-2 pl-5 flex items-center space-x-2">
                <button
                  onClick={() => depthInputRef.current?.click()}
                  className="px-2 py-1 rounded bg-studio-panelHover hover:bg-studio-border text-slate-200 text-[10px] border border-studio-border"
                >
                  {hasImportedDepthMap ? 'Replace Map' : 'Upload Depth Map'}
                </button>
                {hasImportedDepthMap && (
                  <button
                    onClick={onClearDepthMap}
                    className="p-1 rounded bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40"
                    title="Remove depth map"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            SECTION 4: QUALITY & SHADER SETTINGS
        ========================================================================= */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-1.5 border-b border-studio-border">
            <span className="font-semibold text-slate-200 tracking-wider text-[11px] uppercase flex items-center space-x-1.5">
              <Eye className="w-3.5 h-3.5 text-studio-accent" />
              <span>Shader & Geometry Parameters</span>
            </span>
          </div>

          {/* Grid Resolution */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-300">Reconstruction Grid</span>
              <span className="text-[10px] font-mono text-cyan-400">
                {(settings.resolution * settings.resolution).toLocaleString()} Vertices
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {([128, 256, 512] as Resolution[]).map((res) => (
                <button
                  key={res}
                  onClick={() => onUpdateSettings({ resolution: res })}
                  className={`py-1.5 rounded border text-[11px] font-mono transition-all ${
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

          {/* Depth Displacement */}
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

          {/* Point Size (Only relevant for point cloud) */}
          {settings.renderMode === 'points' && (
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
          )}

          {/* Surface Roughness (for solid mesh) */}
          {settings.renderMode === 'solid' && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-300">Surface Roughness</span>
                <span className="text-[10px] font-mono text-slate-400">{settings.roughness.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={settings.roughness}
                onChange={(e) => onUpdateSettings({ roughness: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>
          )}

          {/* Edge Influence (for contrast depth) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-300">Edge Gradient Influence</span>
              <span className="text-[10px] font-mono text-slate-400">{settings.edgeInfluence.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="3.0"
              step="0.1"
              value={settings.edgeInfluence}
              onChange={(e) => onUpdateSettings({ edgeInfluence: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>

          {/* Contrast & Brightness */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-300">Contrast</span>
                <span className="text-[9px] font-mono text-slate-400">{settings.contrast.toFixed(1)}</span>
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

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-300">Brightness</span>
                <span className="text-[9px] font-mono text-slate-400">{settings.brightness.toFixed(1)}</span>
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
          </div>

          {/* Color Mode Selector */}
          <div className="space-y-1">
            <span className="text-[11px] text-slate-300">Color Palette Mode</span>
            <div className="grid grid-cols-2 gap-1.5">
              {(
                [
                  { id: 'rgb', label: 'Original RGB' },
                  { id: 'grayscale', label: 'Depth Grayscale' },
                  { id: 'height', label: 'Turbo Colormap' },
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

          {/* Toggles */}
          <div className="pt-2 border-t border-studio-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-300">Invert Depth Direction</span>
              <input
                type="checkbox"
                checked={settings.invertDepth}
                onChange={(e) => onUpdateSettings({ invertDepth: e.target.checked })}
                className="rounded bg-studio-bg border-studio-border text-blue-500 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-300 flex items-center space-x-1.5">
                <Grid className="w-3.5 h-3.5 text-studio-dim" />
                <span>Reference Ground Grid</span>
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
                <CheckCircle2 className="w-3.5 h-3.5 text-studio-dim" />
                <span>Camera Auto-Rotation</span>
              </span>
              <input
                type="checkbox"
                checked={settings.autoRotate}
                onChange={(e) => onUpdateSettings({ autoRotate: e.target.checked })}
                className="rounded bg-studio-bg border-studio-border text-blue-500 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
              />
            </div>
          </div>
        </div>

      </div>
    </aside>
  );
};
