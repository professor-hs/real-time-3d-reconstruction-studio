import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Header } from './components/Header';
import { LeftSidebar } from './components/LeftSidebar';
import { Viewport } from './components/Viewport';
import { RightInspector } from './components/RightInspector';
import { BottomStatusBar } from './components/BottomStatusBar';
import { BenchmarkModal } from './components/BenchmarkModal';
import { PreviewModal } from './components/PreviewModal';
import { ReconstructionEngine } from './engine/ReconstructionEngine';
import {
  BenchmarkResult,
  GPUStats,
  MediaMetadata,
  ReconstructionSettings,
  ViewportMode,
} from './types';
import { formatBytes, formatNumber } from './utils/formatters';

export const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ReconstructionEngine | null>(null);

  // Application State
  const [isWebGL2Supported, setIsWebGL2Supported] = useState(true);
  const [stats, setStats] = useState<GPUStats>({
    isWebGL2: true,
    rendererName: 'Detecting GPU...',
    vendorName: 'Detecting Vendor...',
    fps: 60,
    frameTimeMs: 16.6,
    pointCount: 65536,
    drawCalls: 1,
    geometriesCount: 1,
    texturesCount: 2,
    estimatedBufferBytes: 65536 * 20,
    hasTimerQuery: false,
    glVersion: 'WebGL 2.0',
    shadingLanguageVersion: 'GLSL ES 3.00',
  });

  const [metadata, setMetadata] = useState<MediaMetadata>({
    name: 'Synthetic Alpine Laboratory Scene',
    width: 1024,
    height: 768,
    aspectRatio: 1024 / 768,
    fileSize: 1024 * 768 * 4,
    type: 'sample',
  });

  const [settings, setSettings] = useState<ReconstructionSettings>({
    depthMethod: 'luminance',
    resolution: 256,
    depthIntensity: 1.2,
    pointSize: 3.5,
    contrast: 1.1,
    brightness: 1.0,
    edgeInfluence: 1.4,
    colorMode: 'rgb',
    invertDepth: false,
    wireframe: false,
    showGrid: true,
    showAxes: true,
    autoRotate: false,
    animatePoints: false,
    backgroundColor: '#0B0E13',
  });

  const [viewportMode, setViewportMode] = useState<ViewportMode>('pointcloud');
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [depthThumbnailUrl, setDepthThumbnailUrl] = useState<string | null>(null);
  const [importedDepthUrl, setImportedDepthUrl] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  // Modals state
  const [isBenchmarkOpen, setIsBenchmarkOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Refresh thumbnail previews from engine
  const refreshPreviews = useCallback(() => {
    if (!engineRef.current) return;

    // RGB source thumbnail
    const srcCanvas = engineRef.current.getActiveSourceCanvas();
    if (srcCanvas) {
      if (srcCanvas instanceof HTMLCanvasElement) {
        setThumbnailUrl(srcCanvas.toDataURL('image/jpeg', 0.8));
      } else if (srcCanvas instanceof HTMLImageElement) {
        setThumbnailUrl(srcCanvas.src);
      }
    }

    // Depth thumbnail
    const depthCanvas = engineRef.current.getDepthPreviewCanvas();
    if (depthCanvas) {
      setDepthThumbnailUrl(depthCanvas.toDataURL('image/jpeg', 0.8));
    }

    // Imported depth thumbnail
    const importedCanvas = engineRef.current.getActiveDepthCanvas();
    if (importedCanvas) {
      if (importedCanvas instanceof HTMLCanvasElement) {
        setImportedDepthUrl(importedCanvas.toDataURL('image/jpeg', 0.8));
      } else if (importedCanvas instanceof HTMLImageElement) {
        setImportedDepthUrl(importedCanvas.src);
      }
    } else {
      setImportedDepthUrl(null);
    }
  }, []);

  // Initialize engine on mount
  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new ReconstructionEngine(
      (newMeta) => {
        setMetadata(newMeta);
      },
      (newStats) => {
        setStats(newStats);
      }
    );

    const initialized = engine.init(canvasRef.current);
    if (!initialized) {
      setIsWebGL2Supported(false);
      setStats((prev) => ({ ...prev, isWebGL2: false }));
    }

    engineRef.current = engine;
    refreshPreviews();

    // Resize observer for responsive viewport
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          engine.renderer?.resize(width, height);
        }
      }
    });

    if (canvasRef.current.parentElement) {
      resizeObserver.observe(canvasRef.current.parentElement);
    }

    return () => {
      resizeObserver.disconnect();
      engine.dispose();
      engineRef.current = null;
    };
  }, [refreshPreviews]);

  // Update engine settings when settings state change
  const handleUpdateSettings = (newSettings: Partial<ReconstructionSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      engineRef.current?.updateSettings(updated);
      return updated;
    });

    // If depth-affecting parameters changed, update depth preview
    if (
      newSettings.depthMethod !== undefined ||
      newSettings.contrast !== undefined ||
      newSettings.brightness !== undefined ||
      newSettings.edgeInfluence !== undefined ||
      newSettings.invertDepth !== undefined
    ) {
      setTimeout(refreshPreviews, 50);
    }
  };

  const handleSetViewportMode = (mode: ViewportMode) => {
    setViewportMode(mode);
    engineRef.current?.setViewportMode(mode);
  };

  const handleResetScene = () => {
    engineRef.current?.resetCamera();
    handleUpdateSettings({
      depthIntensity: 1.2,
      pointSize: 3.5,
      contrast: 1.1,
      brightness: 1.0,
      edgeInfluence: 1.4,
      autoRotate: false,
      animatePoints: false,
      wireframe: false,
      showGrid: true,
      showAxes: true,
      colorMode: 'rgb',
    });
  };

  const handleLoadSampleScene = () => {
    engineRef.current?.loadSampleScene();
    refreshPreviews();
  };

  const handleUploadImage = async (file: File) => {
    try {
      await engineRef.current?.loadImage(file);
      refreshPreviews();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to load image.');
    }
  };

  const handleUploadVideo = async (file: File) => {
    try {
      await engineRef.current?.loadVideo(file);
      refreshPreviews();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to load video.');
    }
  };

  const handleUploadDepthMap = async (file: File) => {
    try {
      await engineRef.current?.loadDepthMap(file);
      setSettings((prev) => ({ ...prev, depthMethod: 'imported' }));
      refreshPreviews();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to load depth map.');
    }
  };

  const handleClearDepthMap = () => {
    engineRef.current?.clearDepthMap();
    setSettings((prev) => ({ ...prev, depthMethod: 'luminance' }));
    refreshPreviews();
  };

  // Video playback handlers
  const handlePlayVideo = () => engineRef.current?.videoProcessor.play();
  const handlePauseVideo = () => engineRef.current?.videoProcessor.pause();
  const handleRestartVideo = () => engineRef.current?.videoProcessor.restart();
  const handleSeekVideo = (time: number) => engineRef.current?.videoProcessor.seek(time);

  // Export PLY
  const handleExportPly = async () => {
    if (!engineRef.current) return;
    try {
      setExportStatus('Generating PLY...');
      const res = await engineRef.current.exportPly();
      setExportStatus(`Exported ${formatNumber(res.pointCount)} pts (${formatBytes(res.fileSizeBytes)})`);
      setTimeout(() => setExportStatus(null), 8000);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'PLY export failed.');
      setExportStatus(null);
    }
  };

  // Benchmark Runner
  const handleRunBenchmark = async (): Promise<BenchmarkResult> => {
    if (!engineRef.current) throw new Error('Engine not initialized');
    return await engineRef.current.runBenchmark();
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0B0E13] text-slate-100 overflow-hidden font-sans">
      {/* 1. Header */}
      <Header
        stats={stats}
        onResetScene={handleResetScene}
        onOpenExport={handleExportPly}
        onOpenBenchmark={() => setIsBenchmarkOpen(true)}
        onOpenPreview={() => setIsPreviewOpen(true)}
      />

      {/* 2. Main Work Area (Left Sidebar + Center Viewport + Right Inspector) */}
      <main className="flex-1 flex flex-row overflow-hidden relative">
        {/* Left Sidebar */}
        <LeftSidebar
          metadata={metadata}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onLoadSampleScene={handleLoadSampleScene}
          onUploadImage={handleUploadImage}
          onUploadVideo={handleUploadVideo}
          onUploadDepthMap={handleUploadDepthMap}
          onClearDepthMap={handleClearDepthMap}
          hasImportedDepthMap={!!importedDepthUrl}
          onPlayVideo={handlePlayVideo}
          onPauseVideo={handlePauseVideo}
          onRestartVideo={handleRestartVideo}
          onSeekVideo={handleSeekVideo}
          thumbnailUrl={thumbnailUrl}
          depthThumbnailUrl={depthThumbnailUrl}
        />

        {/* Center 3D Three.js Viewport */}
        <Viewport
          canvasRef={canvasRef}
          viewportMode={viewportMode}
          onSetViewportMode={handleSetViewportMode}
          onResetCamera={handleResetScene}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          isWebGL2Supported={isWebGL2Supported}
          thumbnailUrl={thumbnailUrl}
          depthThumbnailUrl={depthThumbnailUrl}
        />

        {/* Right Scene Inspector */}
        <div className="hidden lg:block">
          <RightInspector
            stats={stats}
            metadata={metadata}
            settings={settings}
          />
        </div>
      </main>

      {/* 3. Bottom Status Bar */}
      <BottomStatusBar
        stats={stats}
        metadata={metadata}
        settings={settings}
        exportStatus={exportStatus}
      />

      {/* Benchmark Modal */}
      <BenchmarkModal
        isOpen={isBenchmarkOpen}
        onClose={() => setIsBenchmarkOpen(false)}
        onRunBenchmark={handleRunBenchmark}
        currentResolution={settings.resolution}
      />

      {/* 2D Preview Modal */}
      <PreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        thumbnailUrl={thumbnailUrl}
        depthThumbnailUrl={depthThumbnailUrl}
        importedDepthUrl={importedDepthUrl}
        depthMethod={settings.depthMethod}
      />
    </div>
  );
};
export default App;
