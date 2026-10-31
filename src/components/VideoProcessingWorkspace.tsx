import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  Download,
  Film,
  Sparkles,
  Volume2,
  AlertCircle,
  Zap,
} from 'lucide-react';
import {
  DEFAULT_VIDEO_SETTINGS,
  FileMetadata,
  VideoProcessingProgress,
  VideoProcessingSettings,
} from '../types';
import { GPUProcessor } from '../gpu/GPUProcessor';
import { VideoEncoderPipeline } from '../processing/VideoEncoderPipeline';
import { buildOutputFilename } from '../utils/formatDetection';
import { formatBytes, formatSeconds } from '../utils/formatters';
import { FileUploader } from './FileUploader';

export const VideoProcessingWorkspace: React.FC = () => {
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<FileMetadata | null>(null);
  const [settings, setSettings] = useState<VideoProcessingSettings>(DEFAULT_VIDEO_SETTINGS);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  const [progress, setProgress] = useState<VideoProcessingProgress>({
    isProcessing: false,
    currentFrame: 0,
    totalFrames: 0,
    percent: 0,
    estimatedTimeSec: 0,
    statusMessage: '',
  });

  const [downloadBlob, setDownloadBlob] = useState<Blob | null>(null);
  const [downloadFilename, setDownloadFilename] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const outputCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const pipelineRef = useRef<VideoEncoderPipeline | null>(null);

  // Render video frame on GPU continuously during playback
  const renderFrameToGPU = useCallback(() => {
    if (!videoRef.current || !outputCanvasRef.current || videoRef.current.paused || videoRef.current.ended) {
      return;
    }

    try {
      const gpu = GPUProcessor.getInstance();
      gpu.processVideoFrame(videoRef.current, settings, outputCanvasRef.current);
    } catch (err) {
      console.error('Video GPU render error:', err);
    }

    animationFrameRef.current = requestAnimationFrame(renderFrameToGPU);
  }, [settings]);

  // Update canvas on seek or pause
  const renderSingleFrame = useCallback(() => {
    if (!videoRef.current || !outputCanvasRef.current) return;
    try {
      const gpu = GPUProcessor.getInstance();
      gpu.processVideoFrame(videoRef.current, settings, outputCanvasRef.current);
    } catch (err) {
      console.error('Video single frame render error:', err);
    }
  }, [settings]);

  useEffect(() => {
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(renderFrameToGPU);
    } else {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      renderSingleFrame();
    }
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, renderFrameToGPU, renderSingleFrame]);

  // Handle uploaded video
  const handleFileLoaded = (newMeta: FileMetadata, file: File) => {
    setCurrentFile(file);
    setMetadata(newMeta);
    setDuration(newMeta.duration || 0);
    setCurrentTime(0);
    setIsPlaying(false);
    setDownloadBlob(null);
    setErrorMsg(null);

    if (videoRef.current) {
      videoRef.current.src = newMeta.objectUrl;
      videoRef.current.currentTime = 0;
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleSeek = (timeSec: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = timeSec;
    setCurrentTime(timeSec);
    renderSingleFrame();
  };

  // Process Entire Video on GPU & Export MP4
  const handleProcessAndExport = async () => {
    if (!currentFile || !metadata) {
      setErrorMsg('Please upload an MP4 video file to process.');
      return;
    }

    const support = VideoEncoderPipeline.isSupported();
    if (!support.supported) {
      setErrorMsg(support.reason || 'WebCodecs MP4 encoding is not supported in this browser.');
      return;
    }

    setErrorMsg(null);
    setDownloadBlob(null);
    pipelineRef.current = new VideoEncoderPipeline();

    try {
      const resultBlob = await pipelineRef.current.processAndExportMP4({
        file: currentFile,
        settings,
        onProgress: (prog) => setProgress(prog),
      });

      const outName = buildOutputFilename(metadata.name, 'gpu_processed');
      setDownloadBlob(resultBlob);
      setDownloadFilename(outName);

      setProgress({
        isProcessing: false,
        currentFrame: 0,
        totalFrames: 0,
        percent: 100,
        estimatedTimeSec: 0,
        statusMessage: 'Completed successfully! Ready for download.',
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Video processing failed.');
      setProgress((prev) => ({ ...prev, isProcessing: false }));
    }
  };

  const handleCancel = () => {
    if (pipelineRef.current) {
      pipelineRef.current.abort();
    }
  };

  const handleDownload = () => {
    if (!downloadBlob) return;
    const url = URL.createObjectURL(downloadBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = downloadFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden bg-[#090D13]">
      {/* Hidden Video element for decoding frames */}
      <video
        ref={videoRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setIsPlaying(false)}
        onLoadedData={() => {
          if (videoRef.current && outputCanvasRef.current) {
            outputCanvasRef.current.width = videoRef.current.videoWidth || 1280;
            outputCanvasRef.current.height = videoRef.current.videoHeight || 720;
            renderSingleFrame();
          }
        }}
        className="hidden"
        playsInline
      />

      {/* LEFT: CONTROLS SIDEBAR */}
      <aside className="w-full lg:w-96 bg-studio-panel border-r border-studio-border flex flex-col h-full overflow-hidden flex-shrink-0 select-none">
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 text-xs text-slate-300">
          
          {/* Section 1: Video Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-studio-border">
              <span className="font-semibold text-slate-200 tracking-wider text-[11px] uppercase flex items-center space-x-1.5">
                <Film className="w-3.5 h-3.5 text-cyan-400" />
                <span>MP4 Video Source</span>
              </span>
              <span className="text-[10px] text-cyan-400 font-mono font-bold">
                .MP4
              </span>
            </div>

            <FileUploader
              acceptedFormats={['mp4']}
              onFileLoaded={handleFileLoaded}
              currentMetadata={metadata}
              title="Upload MP4 Video"
              description="Genuine MP4 decoding, GPU enhancement & muxing"
            />
          </div>

          {/* Section 2: Video Metadata Card */}
          {metadata && (
            <div className="bg-studio-bg border border-studio-border rounded p-2.5 space-y-1.5 font-mono text-[10px]">
              <div className="text-slate-200 font-medium truncate">{metadata.name}</div>
              <div className="grid grid-cols-2 gap-1 text-studio-dim">
                <div>Resolution: {metadata.width}×{metadata.height}</div>
                <div>Duration: {formatSeconds(metadata.duration || 0)}</div>
                <div>Size: {formatBytes(metadata.sizeBytes)}</div>
                <div>Format: MP4 (H.264/AAC)</div>
              </div>
            </div>
          )}

          {/* Section 3: GPU Enhancement Controls */}
          <div className="space-y-3 pt-1 border-t border-studio-border/60">
            <div className="font-semibold text-slate-200 text-[11px] uppercase tracking-wider flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Real-Time GPU Filters</span>
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

            {/* Denoising */}
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
                <span className="text-slate-300">Temperature</span>
                <span className="font-mono text-cyan-400">{settings.temperature.toFixed(2)}</span>
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
          </div>
        </div>

        {/* BOTTOM ACTION & PROGRESS PANEL */}
        <div className="p-3 border-t border-studio-border bg-studio-panel space-y-2">
          {errorMsg && (
            <div className="p-2 rounded bg-red-950/40 border border-red-800 text-red-300 text-[10px] flex items-start space-x-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {progress.isProcessing && (
            <div className="space-y-1.5 p-2 rounded bg-studio-bg border border-studio-border">
              <div className="flex justify-between text-[10px] text-cyan-300 font-mono">
                <span>{progress.statusMessage}</span>
                <span>{progress.percent}%</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-200"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-studio-dim">
                <span>Est. remaining: {progress.estimatedTimeSec}s</span>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="text-red-400 hover:text-red-300 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {downloadBlob ? (
            <button
              type="button"
              onClick={handleDownload}
              className="w-full py-2.5 px-3 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-[11px] flex items-center justify-center space-x-1.5 shadow-lg transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Download Processed MP4 ({formatBytes(downloadBlob.size)})</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleProcessAndExport}
              disabled={!metadata || progress.isProcessing}
              className="w-full py-2.5 px-3 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium text-[11px] flex items-center justify-center space-x-1.5 shadow-lg transition-all disabled:opacity-50"
            >
              <Zap className="w-4 h-4 text-cyan-300" />
              <span>
                {progress.isProcessing
                  ? 'Processing on GPU...'
                  : 'Process Entire Video & Export MP4'}
              </span>
            </button>
          )}
        </div>
      </aside>

      {/* CENTER: VIDEO VIEWPORT & PLAYBACK CONTROLS */}
      <main className="flex-1 flex flex-col p-4 overflow-hidden relative">
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-200">GPU Video Viewport</span>
            <span className="text-[10px] text-cyan-400 font-mono">
              [REAL-TIME SHADER PIPELINE]
            </span>
          </div>

          {metadata && (
            <div className="flex items-center space-x-2 text-[10px] text-studio-dim font-mono">
              <span>{metadata.width} × {metadata.height}</span>
              <span>•</span>
              <span>{formatSeconds(currentTime)} / {formatSeconds(duration)}</span>
            </div>
          )}
        </div>

        {/* Video Canvas Display */}
        <div className="flex-1 min-h-0 bg-[#070A0F] border border-studio-border rounded-lg overflow-hidden flex items-center justify-center relative">
          <canvas
            ref={outputCanvasRef}
            className="w-full h-full object-contain"
          />

          {!metadata && (
            <div className="absolute inset-0 flex flex-col items-center justify-center space-y-2 text-slate-500 pointer-events-none">
              <Film className="w-12 h-12 text-slate-700" />
              <div className="text-xs">No video loaded. Upload an MP4 to start GPU enhancement.</div>
            </div>
          )}
        </div>

        {/* Video Timeline & Controls */}
        {metadata && (
          <div className="mt-3 p-3 bg-studio-panel border border-studio-border rounded-lg flex items-center space-x-4">
            <button
              type="button"
              onClick={togglePlay}
              className="w-8 h-8 rounded bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center transition-all flex-shrink-0"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>

            <span className="text-[11px] font-mono text-slate-300 min-w-[36px]">
              {formatSeconds(currentTime)}
            </span>

            <input
              type="range"
              min="0"
              max={duration || 100}
              step="0.05"
              value={currentTime}
              onChange={(e) => handleSeek(parseFloat(e.target.value))}
              className="flex-1 h-1.5 bg-studio-bg rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />

            <span className="text-[11px] font-mono text-studio-dim min-w-[36px]">
              {formatSeconds(duration)}
            </span>

            <div className="flex items-center space-x-1 text-studio-dim">
              <Volume2 className="w-4 h-4" />
              <span className="text-[10px] font-mono">Audio Track Preserved</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
