import React, { useState, useEffect, useRef } from 'react';
import {
  Sliders,
  Sparkles,
  Download,
  RotateCcw,
  Image as ImageIcon,
  CheckCircle2,
  Maximize,
} from 'lucide-react';
import { DEFAULT_PHOTO_SETTINGS, FileMetadata, PhotoEnhancementSettings, UpscaleFactor } from '../types';
import { GPUProcessor } from '../gpu/GPUProcessor';
import { buildOutputFilename } from '../utils/formatDetection';
import { formatBytes } from '../utils/formatters';
import { BeforeAfterSlider } from './BeforeAfterSlider';
import { FileUploader } from './FileUploader';

export const PhotoEnhancementWorkspace: React.FC = () => {
  const [metadata, setMetadata] = useState<FileMetadata>({
    name: 'alpine_landscape.png',
    sizeBytes: 15156,
    format: 'png',
    extension: 'png',
    mimeType: 'image/png',
    width: 1024,
    height: 768,
    aspectRatio: 1024 / 768,
    objectUrl: '/samples/alpine_landscape.png',
  });

  const [settings, setSettings] = useState<PhotoEnhancementSettings>(DEFAULT_PHOTO_SETTINGS);
  const [enhancedCanvas, setEnhancedCanvas] = useState<HTMLCanvasElement | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [downloadSuccessMsg, setDownloadSuccessMsg] = useState<string | null>(null);

  const activeImageElementRef = useRef<HTMLImageElement | null>(null);

  // Initialize or update active image element
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      activeImageElementRef.current = img;
      renderGPUPreview();
    };
    img.src = metadata.objectUrl;
  }, [metadata.objectUrl]);

  // Real-time GPU rendering when settings change
  const renderGPUPreview = () => {
    if (!activeImageElementRef.current) return;
    try {
      const gpu = GPUProcessor.getInstance();
      const canvas = gpu.processImage(activeImageElementRef.current, settings);
      setEnhancedCanvas(canvas);
    } catch (err) {
      console.error('GPU rendering failed:', err);
    }
  };

  useEffect(() => {
    renderGPUPreview();
  }, [settings]);

  const handleFileLoaded = (newMeta: FileMetadata) => {
    setMetadata(newMeta);
    setSettings(DEFAULT_PHOTO_SETTINGS);
  };

  const handleLoadSample = (samplePath: string, name: string, fmt: 'png' | 'jpg') => {
    setMetadata({
      name,
      sizeBytes: 25000,
      format: fmt,
      extension: fmt,
      mimeType: fmt === 'png' ? 'image/png' : 'image/jpeg',
      width: 1024,
      height: 768,
      aspectRatio: 1024 / 768,
      objectUrl: samplePath,
    });
    setSettings(DEFAULT_PHOTO_SETTINGS);
  };

  const handleDownload = async () => {
    if (!activeImageElementRef.current) return;

    setIsProcessing(true);
    setDownloadSuccessMsg(null);

    try {
      const gpu = GPUProcessor.getInstance();
      // Execute full-resolution GPU pass
      const targetW = metadata.width * settings.upscale;
      const targetH = metadata.height * settings.upscale;
      const outputCanvas = gpu.processImage(activeImageElementRef.current, settings, targetW, targetH);

      // Preserve exact format
      const isJpeg = metadata.format === 'jpg' || metadata.format === 'jpeg';
      const mimeType = isJpeg ? 'image/jpeg' : 'image/png';
      const outputFilename = buildOutputFilename(metadata.name, 'gpu_enhanced');

      outputCanvas.toBlob(
        (blob) => {
          if (!blob) {
            alert('Failed to generate export blob.');
            setIsProcessing(false);
            return;
          }

          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = outputFilename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(blobUrl);

          setIsProcessing(false);
          setDownloadSuccessMsg(`Downloaded ${outputFilename} (${formatBytes(blob.size)})`);
          setTimeout(() => setDownloadSuccessMsg(null), 6000);
        },
        mimeType,
        isJpeg ? settings.jpegQuality : undefined
      );
    } catch (err) {
      setIsProcessing(false);
      alert(err instanceof Error ? err.message : 'Error exporting image.');
    }
  };

  const resetSettings = () => {
    setSettings(DEFAULT_PHOTO_SETTINGS);
  };

  const outWidth = metadata.width * settings.upscale;
  const outHeight = metadata.height * settings.upscale;

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden bg-[#090D13]">
      {/* LEFT: CONTROLS & SETTINGS SIDEBAR */}
      <aside className="w-full lg:w-96 bg-studio-panel border-r border-studio-border flex flex-col h-full overflow-hidden flex-shrink-0 select-none">
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 text-xs text-slate-300">
          
          {/* Section 1: Upload Source */}
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-studio-border">
              <span className="font-semibold text-slate-200 tracking-wider text-[11px] uppercase flex items-center space-x-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                <span>Input Photo</span>
              </span>
              <span className="text-[10px] text-cyan-400 font-mono uppercase font-bold">
                .{metadata.extension}
              </span>
            </div>

            <FileUploader
              acceptedFormats={['png', 'jpg', 'jpeg']}
              onFileLoaded={handleFileLoaded}
              currentMetadata={metadata}
              title="Upload Image"
              description="PNG, JPG, or JPEG supported"
              onLoadSample={() => handleLoadSample('/samples/alpine_landscape.png', 'alpine_landscape.png', 'png')}
              sampleLabel="Load Alpine Sample"
            />
          </div>

          {/* Section 2: GPU Upscaling & Resampling */}
          <div className="space-y-2.5 pt-1 border-t border-studio-border/60">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200 text-[11px] uppercase tracking-wider flex items-center space-x-1.5">
                <Maximize className="w-3.5 h-3.5 text-cyan-400" />
                <span>GPU Upscaling</span>
              </span>
              <span className="text-[10px] text-studio-dim font-mono">
                {outWidth} × {outHeight} px
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {([1, 2, 4] as UpscaleFactor[]).map((factor) => (
                <button
                  key={factor}
                  type="button"
                  onClick={() => setSettings({ ...settings, upscale: factor })}
                  className={`py-1.5 px-2 rounded border text-center transition-all ${
                    settings.upscale === factor
                      ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-bold'
                      : 'bg-studio-bg border-studio-border hover:bg-studio-panelHover text-slate-300'
                  }`}
                >
                  <div className="text-[11px]">{factor}x Resampling</div>
                  <div className="text-[8px] text-studio-dim">
                    {factor === 1 ? 'Native' : factor === 2 ? 'Double' : 'Quad'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Section 3: Detail & Noise Reduction (Bilateral & Unsharp) */}
          <div className="space-y-3 pt-1 border-t border-studio-border/60">
            <div className="font-semibold text-slate-200 text-[11px] uppercase tracking-wider flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Detail & Restoration</span>
            </div>

            {/* Sharpening */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-300">GPU Sharpening</span>
                <span className="font-mono text-cyan-400">{settings.sharpen.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="2.0"
                step="0.05"
                value={settings.sharpen}
                onChange={(e) => setSettings({ ...settings, sharpen: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-studio-bg rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {/* Bilateral Denoising */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-300">Bilateral Denoising</span>
                <span className="font-mono text-cyan-400">{settings.denoise.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={settings.denoise}
                onChange={(e) => setSettings({ ...settings, denoise: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-studio-bg rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {/* Blur Reduction / Deblur */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-300">Blur Reduction</span>
                <span className="font-mono text-cyan-400">{settings.blurReduction.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={settings.blurReduction}
                onChange={(e) => setSettings({ ...settings, blurReduction: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-studio-bg rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>
          </div>

          {/* Section 4: Tone & Color Balance */}
          <div className="space-y-3 pt-1 border-t border-studio-border/60">
            <div className="font-semibold text-slate-200 text-[11px] uppercase tracking-wider flex items-center space-x-1.5">
              <Sliders className="w-3.5 h-3.5 text-blue-400" />
              <span>Color & Lighting</span>
            </div>

            {/* Brightness */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-300">Brightness</span>
                <span className="font-mono text-cyan-400">
                  {settings.brightness > 0 ? `+${settings.brightness.toFixed(2)}` : settings.brightness.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="-1.0"
                max="1.0"
                step="0.05"
                value={settings.brightness}
                onChange={(e) => setSettings({ ...settings, brightness: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-studio-bg rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            {/* Contrast */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-300">Contrast</span>
                <span className="font-mono text-cyan-400">{settings.contrast.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="2.5"
                step="0.05"
                value={settings.contrast}
                onChange={(e) => setSettings({ ...settings, contrast: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-studio-bg rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            {/* Gamma */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-300">Gamma</span>
                <span className="font-mono text-cyan-400">{settings.gamma.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="2.5"
                step="0.05"
                value={settings.gamma}
                onChange={(e) => setSettings({ ...settings, gamma: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-studio-bg rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            {/* Saturation */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-300">Saturation</span>
                <span className="font-mono text-cyan-400">{settings.saturation.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="2.5"
                step="0.05"
                value={settings.saturation}
                onChange={(e) => setSettings({ ...settings, saturation: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-studio-bg rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            {/* White Balance: Temperature */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-300">Temperature (Cool / Warm)</span>
                <span className="font-mono text-cyan-400">
                  {settings.temperature > 0 ? `+${settings.temperature.toFixed(2)}` : settings.temperature.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="-1.0"
                max="1.0"
                step="0.05"
                value={settings.temperature}
                onChange={(e) => setSettings({ ...settings, temperature: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-studio-bg rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>

            {/* White Balance: Tint */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-300">Tint (Green / Magenta)</span>
                <span className="font-mono text-cyan-400">
                  {settings.tint > 0 ? `+${settings.tint.toFixed(2)}` : settings.tint.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="-1.0"
                max="1.0"
                step="0.05"
                value={settings.tint}
                onChange={(e) => setSettings({ ...settings, tint: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-studio-bg rounded-lg appearance-none cursor-pointer accent-fuchsia-400"
              />
            </div>

            {/* JPEG Quality Slider (only shown for JPG / JPEG) */}
            {(metadata.format === 'jpg' || metadata.format === 'jpeg') && (
              <div className="space-y-1 pt-1 border-t border-studio-border/40">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-300">JPEG Quality</span>
                  <span className="font-mono text-cyan-400">{Math.round(settings.jpegQuality * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.0"
                  step="0.02"
                  value={settings.jpegQuality}
                  onChange={(e) => setSettings({ ...settings, jpegQuality: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-studio-bg rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM ACTION BUTTONS */}
        <div className="p-3 border-t border-studio-border bg-studio-panel space-y-2">
          {downloadSuccessMsg && (
            <div className="p-2 rounded bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-[10px] flex items-center space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span className="truncate">{downloadSuccessMsg}</span>
            </div>
          )}

          <div className="flex space-x-2">
            <button
              type="button"
              onClick={resetSettings}
              className="px-3 py-2 rounded bg-studio-bg border border-studio-border hover:bg-studio-panelHover text-slate-300 flex items-center justify-center space-x-1 transition-all"
              title="Reset all settings to default"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="text-[11px]">Reset</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={isProcessing}
              className="flex-1 py-2 px-3 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium text-[11px] flex items-center justify-center space-x-1.5 shadow-lg transition-all disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>
                {isProcessing
                  ? 'Processing on GPU...'
                  : `Download .${metadata.extension.toUpperCase()}`}
              </span>
            </button>
          </div>
        </div>
      </aside>

      {/* CENTER: INTERACTIVE BEFORE / AFTER SLIDER PREVIEW */}
      <main className="flex-1 flex flex-col p-4 overflow-hidden relative">
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-200">Interactive Preview</span>
            <span className="text-[10px] text-cyan-400 font-mono">
              [DRAG SLIDER TO COMPARE]
            </span>
          </div>

          <div className="flex items-center space-x-3 text-[10px] text-studio-dim font-mono">
            <span>Input: {metadata.width} × {metadata.height}</span>
            <span>•</span>
            <span>Output: {outWidth} × {outHeight} (.{metadata.extension})</span>
          </div>
        </div>

        <div className="flex-1 min-h-0 relative">
          <BeforeAfterSlider
            originalSrc={metadata.objectUrl}
            enhancedCanvas={enhancedCanvas}
            className="w-full h-full"
            originalLabel={`ORIGINAL (.${metadata.extension.toUpperCase()})`}
            enhancedLabel={`GPU ENHANCED (${settings.upscale}X)`}
          />
        </div>
      </main>
    </div>
  );
};
