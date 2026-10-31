import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Header } from './components/Header';
import { LeftSidebarWorld } from './components/LeftSidebarWorld';
import { Viewport3D } from './components/Viewport3D';
import { RightInspectorWorld } from './components/RightInspectorWorld';
import { BottomStatusBar } from './components/BottomStatusBar';
import { MultiViewModal } from './components/MultiViewModal';

import { PhotoEnhancementWorkspace } from './components/PhotoEnhancementWorkspace';
import { VideoProcessingWorkspace } from './components/VideoProcessingWorkspace';
import { BenchmarkWorkspace } from './components/BenchmarkWorkspace';

import { EngineRenderer } from './engine/Renderer';
import { WorldEngine } from './engine/WorldEngine';
import { FeatureMatcher } from './engine/FeatureMatcher';
import { ModelExporter } from './engine/Exporters';

import {
  DEFAULT_WORLD_SETTINGS,
  GPUStats,
  MultiViewResult,
  StudioWorkspace,
  WorldMediaMetadata,
  WorldSettings,
} from './types';
import { formatBytes, formatNumber } from './utils/formatters';

export const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<EngineRenderer | null>(null);
  const worldEngineRef = useRef<WorldEngine | null>(null);

  // Active Workspace: 'reconstruction' | 'enhancement' | 'video' | 'benchmark'
  const [currentWorkspace, setCurrentWorkspace] = useState<StudioWorkspace>('reconstruction');
  const [isWebGL2Supported, setIsWebGL2Supported] = useState(true);

  // Shared GPU Telemetry
  const [stats, setStats] = useState<GPUStats>({
    isWebGL2: true,
    rendererName: 'Detecting GPU Hardware...',
    vendorName: 'Detecting Vendor...',
    fps: 60,
    frameTimeMs: 16.6,
    drawCalls: 1,
    verticesCount: 65536,
    trianglesCount: 130050,
    pointCount: 0,
    texturesCount: 2,
    estimatedVramBytes: 65536 * 24,
    glVersion: 'WebGL 2.0',
    shadingLanguageVersion: 'GLSL ES 3.00',
  });

  // World 3D Module State
  const [worldMetadata, setWorldMetadata] = useState<WorldMediaMetadata>({
    name: 'Synthetic Alpine Laboratory Scene',
    width: 1024,
    height: 768,
    aspectRatio: 1024 / 768,
    fileSize: 1024 * 768 * 4,
    type: 'sample',
  });

  const [worldSettings, setWorldSettings] = useState<WorldSettings>(DEFAULT_WORLD_SETTINGS);
  const [worldThumbnail, setWorldThumbnail] = useState<string | null>(null);

  // Multi-View State
  const [multiViewResult, setMultiViewResult] = useState<MultiViewResult | null>(null);
  const [multiViewImgs, setMultiViewImgs] = useState<{ img1: HTMLImageElement | null; img2: HTMLImageElement | null }>({
    img1: null,
    img2: null,
  });
  const [isMultiViewModalOpen, setIsMultiViewModalOpen] = useState(false);

  // Export Status Feedback
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  // Helper to refresh world thumbnail
  const refreshWorldThumbnail = useCallback(() => {
    if (!worldEngineRef.current) return;
    const canvas = worldEngineRef.current.getActiveSourceCanvas();
    if (canvas instanceof HTMLCanvasElement) {
      setWorldThumbnail(canvas.toDataURL('image/jpeg', 0.8));
    } else if (canvas instanceof HTMLImageElement) {
      setWorldThumbnail(canvas.src);
    }
  }, []);

  // Initialize Three.js WebGL2 Engine for 3D Reconstruction
  useEffect(() => {
    if (!canvasRef.current) return;

    try {
      const glTest = canvasRef.current.getContext('webgl2');
      if (!glTest) {
        setIsWebGL2Supported(false);
      }
    } catch {
      setIsWebGL2Supported(false);
    }

    const worldEngine = new WorldEngine();
    worldEngineRef.current = worldEngine;

    const renderer = new EngineRenderer(canvasRef.current, worldEngine.scene, (newStats: GPUStats) => {
      setStats((prev) => ({
        ...prev,
        ...newStats,
      }));
    });
    rendererRef.current = renderer;

    // Load initial 3D sample scene
    worldEngine.loadSampleScene();
    setWorldMetadata(worldEngine.metadata);
    refreshWorldThumbnail();

    renderer.switchScene(worldEngine.scene, 2.8);

    return () => {
      renderer.dispose();
      worldEngine.dispose();
    };
  }, [refreshWorldThumbnail]);

  // World Settings Handlers
  const handleUpdateWorldSettings = (newSettings: Partial<WorldSettings>) => {
    setWorldSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      worldEngineRef.current?.updateSettings(updated);
      return updated;
    });
  };

  const handleLoadWorldSample = () => {
    worldEngineRef.current?.loadSampleScene();
    if (worldEngineRef.current) {
      setWorldMetadata(worldEngineRef.current.metadata);
    }
    refreshWorldThumbnail();
  };

  const handleLoadSamplePreset = async (presetId: 'alpine' | 'relief' | 'temple_pair' | 'alpine_depth') => {
    if (!worldEngineRef.current) return;
    try {
      if (presetId === 'alpine') {
        await worldEngineRef.current.loadFromUrl('/samples/alpine_landscape.png', 'alpine_landscape.png');
        setWorldMetadata(worldEngineRef.current.metadata);
        refreshWorldThumbnail();
      } else if (presetId === 'alpine_depth') {
        await worldEngineRef.current.loadFromUrl('/samples/alpine_landscape.png', 'alpine_landscape.png');
        await worldEngineRef.current.loadFromUrl('/samples/alpine_depth_map.png', 'alpine_depth_map.png', true);
        setWorldSettings((prev) => ({ ...prev, depthMethod: 'imported' }));
        setWorldMetadata(worldEngineRef.current.metadata);
        refreshWorldThumbnail();
      } else if (presetId === 'relief') {
        await worldEngineRef.current.loadFromUrl('/samples/relief_sculpture.png', 'relief_sculpture.png');
        setWorldMetadata(worldEngineRef.current.metadata);
        refreshWorldThumbnail();
      } else if (presetId === 'temple_pair') {
        await worldEngineRef.current.loadFromUrl('/samples/temple_view_left.png', 'temple_view_left.png');
        if (worldEngineRef.current) {
          worldEngineRef.current.metadata.type = 'multi-image';
          worldEngineRef.current.metadata.imageCount = 2;
          setWorldMetadata({ ...worldEngineRef.current.metadata });
        }
        refreshWorldThumbnail();

        // Perform feature match on the stereo pair
        const img1 = new Image();
        const img2 = new Image();
        await Promise.all([
          new Promise((res) => {
            img1.onload = res;
            img1.src = '/samples/temple_view_left.png';
          }),
          new Promise((res) => {
            img2.onload = res;
            img2.src = '/samples/temple_view_right.png';
          }),
        ]);
        const matchRes = FeatureMatcher.matchImagePair(img1, img2, 'temple_view_left.png', 'temple_view_right.png');
        setMultiViewResult(matchRes);
        setMultiViewImgs({ img1, img2 });
        setIsMultiViewModalOpen(true);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to load sample preset.');
    }
  };

  const handleUploadWorldImage = async (file: File) => {
    try {
      await worldEngineRef.current?.loadImage(file);
      if (worldEngineRef.current) setWorldMetadata(worldEngineRef.current.metadata);
      refreshWorldThumbnail();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to load image.');
    }
  };

  const handleUploadWorldMultiImages = async (files: FileList) => {
    if (files.length < 2) {
      alert('Multi-view photogrammetry requires at least 2 distinct viewpoint images.');
      return;
    }

    try {
      await worldEngineRef.current?.loadImage(files[0]);
      if (worldEngineRef.current) {
        worldEngineRef.current.metadata.type = 'multi-image';
        worldEngineRef.current.metadata.imageCount = files.length;
        setWorldMetadata({ ...worldEngineRef.current.metadata });
      }
      refreshWorldThumbnail();

      const img1 = new Image();
      const img2 = new Image();
      const url1 = URL.createObjectURL(files[0]);
      const url2 = URL.createObjectURL(files[1]);

      await Promise.all([
        new Promise((resolve) => {
          img1.onload = resolve;
          img1.src = url1;
        }),
        new Promise((resolve) => {
          img2.onload = resolve;
          img2.src = url2;
        }),
      ]);

      const matchRes = FeatureMatcher.matchImagePair(img1, img2, files[0].name, files[1].name);
      setMultiViewResult(matchRes);
      setMultiViewImgs({ img1, img2 });
      setIsMultiViewModalOpen(true);
    } catch (err) {
      alert('Error processing multi-view images.');
    }
  };

  const handleUploadWorldVideo = async (file: File) => {
    try {
      await worldEngineRef.current?.loadVideo(file);
      if (worldEngineRef.current) setWorldMetadata(worldEngineRef.current.metadata);
      refreshWorldThumbnail();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to load video.');
    }
  };

  const handleUploadWorldDepth = async (file: File) => {
    try {
      await worldEngineRef.current?.loadDepthMap(file);
      setWorldSettings((prev) => ({ ...prev, depthMethod: 'imported' }));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to load depth map.');
    }
  };

  const handleClearWorldDepth = () => {
    worldEngineRef.current?.clearDepthMap();
    setWorldSettings((prev) => ({ ...prev, depthMethod: 'luminance' }));
  };

  const handleResetView = () => {
    rendererRef.current?.resetCamera(2.8);
  };

  const handleChangeBackgroundColor = (color: string) => {
    handleUpdateWorldSettings({ backgroundColor: color });
    rendererRef.current?.renderer?.setClearColor(color);
  };

  // 3D Model Exporters
  const handleExportWorldPLY = (includeFaces: boolean) => {
    if (!worldEngineRef.current) return;
    const src = worldEngineRef.current.getActiveSourceCanvas();
    if (!src) return;

    setExportStatus('Exporting PLY...');
    const res = ModelExporter.exportWorldPLY(
      src,
      worldEngineRef.current.getActiveDepthCanvas(),
      worldSettings,
      worldMetadata.aspectRatio,
      includeFaces
    );
    setExportStatus(`Exported PLY ${formatNumber(res.count)} vertices (${formatBytes(res.sizeBytes)})`);
    setTimeout(() => setExportStatus(null), 8000);
  };

  const handleExportWorldOBJ = () => {
    if (!worldEngineRef.current) return;
    const src = worldEngineRef.current.getActiveSourceCanvas();
    if (!src) return;

    setExportStatus('Exporting OBJ...');
    const res = ModelExporter.exportWorldOBJ(
      src,
      worldEngineRef.current.getActiveDepthCanvas(),
      worldSettings,
      worldMetadata.aspectRatio
    );
    setExportStatus(`Exported OBJ ${formatNumber(res.vertexCount)} vertices (${formatBytes(res.sizeBytes)})`);
    setTimeout(() => setExportStatus(null), 8000);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#090D13] text-slate-100 overflow-hidden font-sans">
      {/* 1. Top Header with Workspace Navigation & Global Telemetry */}
      <Header
        currentWorkspace={currentWorkspace}
        onSelectWorkspace={setCurrentWorkspace}
        stats={stats}
        onResetView={handleResetView}
        onExportWorldPLY={handleExportWorldPLY}
        onExportWorldOBJ={handleExportWorldOBJ}
      />

      {/* 2. Main Workspaces Container */}
      <main className="flex-1 flex flex-row overflow-hidden relative">
        {/* Workspace 1: 3D Reconstruction (Keeps Three.js scene alive without re-initializing WebGL) */}
        <div
          className={`flex-1 flex flex-row overflow-hidden relative ${
            currentWorkspace === 'reconstruction' ? '' : 'hidden'
          }`}
        >
          {/* Left Sidebar: 3D Controls */}
          <LeftSidebarWorld
            metadata={worldMetadata}
            settings={worldSettings}
            onUpdateSettings={handleUpdateWorldSettings}
            onLoadSampleScene={handleLoadWorldSample}
            onLoadSamplePreset={handleLoadSamplePreset}
            onUploadImage={handleUploadWorldImage}
            onUploadMultiImages={handleUploadWorldMultiImages}
            onUploadVideo={handleUploadWorldVideo}
            onUploadDepthMap={handleUploadWorldDepth}
            onClearDepthMap={handleClearWorldDepth}
            hasImportedDepthMap={worldSettings.depthMethod === 'imported'}
            onPlayVideo={() => worldEngineRef.current?.videoProcessor.play()}
            onPauseVideo={() => worldEngineRef.current?.videoProcessor.pause()}
            onRestartVideo={() => worldEngineRef.current?.videoProcessor.restart()}
            onSeekVideo={(t) => worldEngineRef.current?.videoProcessor.seek(t)}
            onOpenMultiViewModal={() => setIsMultiViewModalOpen(true)}
            thumbnailUrl={worldThumbnail}
          />

          {/* Central 3D Viewport */}
          <Viewport3D
            canvasRef={canvasRef}
            currentModule="world"
            onResetCamera={handleResetView}
            isWebGL2Supported={isWebGL2Supported}
            backgroundColor={worldSettings.backgroundColor}
            onChangeBackgroundColor={handleChangeBackgroundColor}
          />

          {/* Right Inspector: 3D Telemetry */}
          <div className="hidden lg:block">
            <RightInspectorWorld
              stats={stats}
              metadata={worldMetadata}
              settings={worldSettings}
            />
          </div>
        </div>

        {/* Workspace 2: Photo Enhancement */}
        {currentWorkspace === 'enhancement' && <PhotoEnhancementWorkspace />}

        {/* Workspace 3: Video Processing */}
        {currentWorkspace === 'video' && <VideoProcessingWorkspace />}

        {/* Workspace 4: CPU vs GPU Benchmark */}
        {currentWorkspace === 'benchmark' && <BenchmarkWorkspace />}
      </main>

      {/* 3. Bottom Status Bar */}
      <BottomStatusBar
        currentWorkspace={currentWorkspace}
        stats={stats}
        exportStatus={exportStatus}
      />

      {/* Multi-View Feature Matching Modal */}
      <MultiViewModal
        isOpen={isMultiViewModalOpen}
        onClose={() => setIsMultiViewModalOpen(false)}
        result={multiViewResult}
        img1Element={multiViewImgs.img1}
        img2Element={multiViewImgs.img2}
      />
    </div>
  );
};

export default App;
