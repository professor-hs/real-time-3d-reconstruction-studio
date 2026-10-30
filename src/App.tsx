import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { Header } from './components/Header';
import { LeftSidebarWorld } from './components/LeftSidebarWorld';
import { LeftSidebarMedical } from './components/LeftSidebarMedical';
import { Viewport3D } from './components/Viewport3D';
import { RightInspectorWorld } from './components/RightInspectorWorld';
import { RightInspectorMedical } from './components/RightInspectorMedical';
import { BottomStatusBar } from './components/BottomStatusBar';
import { BenchmarkModal } from './components/BenchmarkModal';
import { MultiViewModal } from './components/MultiViewModal';
import { MedicalMprViewer } from './components/MedicalMprViewer';

import { EngineRenderer } from './engine/Renderer';
import { WorldEngine } from './engine/WorldEngine';
import { MedicalEngine } from './engine/MedicalEngine';
import { FeatureMatcher } from './engine/FeatureMatcher';
import { ModelExporter } from './engine/Exporters';
import { BenchmarkRunner } from './engine/Benchmark';

import {
  BenchmarkResult,
  GPUStats,
  MedicalSettings,
  MedicalVolumeMetadata,
  MultiViewResult,
  StudioModule,
  WorldMediaMetadata,
  WorldSettings,
} from './types';
import { formatBytes, formatNumber } from './utils/formatters';

export const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<EngineRenderer | null>(null);
  const worldEngineRef = useRef<WorldEngine | null>(null);
  const medicalEngineRef = useRef<MedicalEngine | null>(null);

  // Application Module: 'world' or 'medical'
  const [currentModule, setCurrentModule] = useState<StudioModule>('world');
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

  // World Module State
  const [worldMetadata, setWorldMetadata] = useState<WorldMediaMetadata>({
    name: 'Synthetic Alpine Laboratory Scene',
    width: 1024,
    height: 768,
    aspectRatio: 1024 / 768,
    fileSize: 1024 * 768 * 4,
    type: 'sample',
  });

  const [worldSettings, setWorldSettings] = useState<WorldSettings>({
    renderMode: 'solid',
    depthMethod: 'luminance',
    resolution: 256,
    depthIntensity: 1.2,
    pointSize: 3.5,
    contrast: 1.1,
    brightness: 1.0,
    edgeInfluence: 1.4,
    smoothness: 1.0,
    colorMode: 'rgb',
    invertDepth: false,
    showGrid: true,
    showAxes: true,
    autoRotate: false,
    roughness: 0.4,
    metalness: 0.1,
    backgroundColor: '#090D13',
  });

  const [worldThumbnail, setWorldThumbnail] = useState<string | null>(null);

  // Multi-View State
  const [multiViewResult, setMultiViewResult] = useState<MultiViewResult | null>(null);
  const [multiViewImgs, setMultiViewImgs] = useState<{ img1: HTMLImageElement | null; img2: HTMLImageElement | null }>({
    img1: null,
    img2: null,
  });
  const [isMultiViewModalOpen, setIsMultiViewModalOpen] = useState(false);

  // Medical Module State
  const [medicalMetadata, setMedicalMetadata] = useState<MedicalVolumeMetadata>({
    seriesDescription: 'Synthetic Calibrated Neuro Head CT Phantom',
    modality: 'CT',
    dimensions: [128, 128, 64],
    voxelSpacing: [1.2, 1.2, 2.5],
    windowCenter: 40,
    windowWidth: 350,
    minHU: -1000,
    maxHU: 1500,
    sliceCount: 64,
    patientId: 'SYNTH-PHANTOM-001',
    isSynthetic: true,
  });

  const [medicalSettings, setMedicalSettings] = useState<MedicalSettings>({
    renderMode: 'dvr',
    windowCenter: 40,
    windowWidth: 350,
    opacity: 1.2,
    stepSize: 0.003,
    brightness: 1.2,
    isosurfaceThreshold: 250,
    surfaceColor: '#E2E8F0',
    surfaceOpacity: 1.0,
    showBoundingBox: true,
    showSlicesIn3D: false,
    activeSlice: {
      axial: 32,
      coronal: 64,
      sagittal: 64,
    },
  });

  const [showMprViewer, setShowMprViewer] = useState(false);

  // Modals & Status
  const [isBenchmarkOpen, setIsBenchmarkOpen] = useState(false);
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

  // Initialize Engines on mount
  useEffect(() => {
    if (!canvasRef.current) return;

    const worldEngine = new WorldEngine((newMeta) => {
      setWorldMetadata(newMeta);
    });
    worldEngineRef.current = worldEngine;

    const medicalEngine = new MedicalEngine();
    medicalEngine.buildVolumeMesh();
    medicalEngineRef.current = medicalEngine;
    setMedicalMetadata(medicalEngine.metadata);
    setMedicalSettings(medicalEngine.settings);

    // Initial scene is World
    const renderer = new EngineRenderer(
      canvasRef.current,
      worldEngine.scene,
      (newStats) => {
        setStats(newStats);
      }
    );

    if (!renderer.getWebGL2Supported()) {
      setIsWebGL2Supported(false);
    }

    rendererRef.current = renderer;
    renderer.start();
    refreshWorldThumbnail();

    // Resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          renderer.resize(width, height);
        }
      }
    });

    if (canvasRef.current.parentElement) {
      resizeObserver.observe(canvasRef.current.parentElement);
    }

    return () => {
      resizeObserver.disconnect();
      renderer.dispose();
      worldEngine.dispose();
      medicalEngine.dispose();
    };
  }, [refreshWorldThumbnail]);

  // Handle Module Switching without reloading WebGL context
  const handleSelectModule = (mod: StudioModule) => {
    setCurrentModule(mod);
    if (!rendererRef.current) return;

    if (mod === 'world' && worldEngineRef.current) {
      rendererRef.current.switchScene(worldEngineRef.current.scene, 2.8);
      refreshWorldThumbnail();
    } else if (mod === 'medical' && medicalEngineRef.current) {
      rendererRef.current.switchScene(medicalEngineRef.current.scene, 2.2);
    }
  };

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
      // Decode first image for primary texture
      await worldEngineRef.current?.loadImage(files[0]);
      if (worldEngineRef.current) {
        worldEngineRef.current.metadata.type = 'multi-image';
        worldEngineRef.current.metadata.imageCount = files.length;
        setWorldMetadata({ ...worldEngineRef.current.metadata });
      }
      refreshWorldThumbnail();

      // Decode first two images for feature matching
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

  // Medical Settings Handlers
  const handleUpdateMedicalSettings = (newSettings: Partial<MedicalSettings>) => {
    setMedicalSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      medicalEngineRef.current?.updateSettings(updated);
      return updated;
    });
  };

  const handleLoadMedicalPhantom = () => {
    medicalEngineRef.current?.loadSyntheticPhantom();
    if (medicalEngineRef.current) {
      setMedicalMetadata(medicalEngineRef.current.metadata);
      setMedicalSettings(medicalEngineRef.current.settings);
    }
  };

  const handleImportDicom = async (files: FileList) => {
    try {
      const buffers: ArrayBuffer[] = [];
      for (let i = 0; i < files.length; i++) {
        buffers.push(await files[i].arrayBuffer());
      }
      await medicalEngineRef.current?.loadDicomFiles(buffers);
      if (medicalEngineRef.current) {
        setMedicalMetadata(medicalEngineRef.current.metadata);
        setMedicalSettings(medicalEngineRef.current.settings);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to parse DICOM series.');
    }
  };

  const handleImportNifti = async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      await medicalEngineRef.current?.loadNiftiFile(buf, file.name);
      if (medicalEngineRef.current) {
        setMedicalMetadata(medicalEngineRef.current.metadata);
        setMedicalSettings(medicalEngineRef.current.settings);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to parse NIfTI volume.');
    }
  };

  // Camera & Background
  const handleResetView = () => {
    rendererRef.current?.resetCamera(currentModule === 'world' ? 2.8 : 2.2);
  };

  const handleChangeBackgroundColor = (color: string) => {
    if (rendererRef.current?.activeScene) {
      rendererRef.current.activeScene.background = new THREE.Color(color);
    }
    handleUpdateWorldSettings({ backgroundColor: color });
  };

  // Exporters
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
    setExportStatus(`Exported ${formatNumber(res.count)} ${includeFaces ? 'faces' : 'pts'} (${formatBytes(res.sizeBytes)})`);
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

  const handleExportMedicalSTL = () => {
    if (!medicalEngineRef.current) return;
    setExportStatus('Exporting Medical STL...');
    const obj = medicalEngineRef.current.surfaceMesh || medicalEngineRef.current.volumeMesh;
    if (!obj) return;
    const res = ModelExporter.exportMedicalSTL(obj);
    setExportStatus(`Exported 3D Print STL (${formatBytes(res.sizeBytes)})`);
    setTimeout(() => setExportStatus(null), 8000);
  };

  const handleExportMedicalPLY = () => {
    if (!medicalEngineRef.current) return;
    setExportStatus('Exporting Medical PLY...');
    const obj = medicalEngineRef.current.surfaceMesh || medicalEngineRef.current.volumeMesh;
    if (!obj) return;
    const res = ModelExporter.exportMedicalPLY(obj);
    setExportStatus(`Exported Medical PLY (${formatBytes(res.sizeBytes)})`);
    setTimeout(() => setExportStatus(null), 8000);
  };

  const handleExportMedicalOBJ = () => {
    if (!medicalEngineRef.current) return;
    setExportStatus('Exporting Medical OBJ...');
    const obj = medicalEngineRef.current.surfaceMesh || medicalEngineRef.current.volumeMesh;
    if (!obj) return;
    const res = ModelExporter.exportMedicalOBJ(obj);
    setExportStatus(`Exported Medical OBJ (${formatBytes(res.sizeBytes)})`);
    setTimeout(() => setExportStatus(null), 8000);
  };

  // Benchmark Runner
  const handleRunBenchmark = async (): Promise<BenchmarkResult> => {
    if (!rendererRef.current || !rendererRef.current.renderer || !worldEngineRef.current) {
      throw new Error('Renderer not ready.');
    }
    const src = worldEngineRef.current.getActiveSourceCanvas();
    if (!src) throw new Error('No source available.');

    return await BenchmarkRunner.runFullBenchmark(
      src,
      rendererRef.current.renderer,
      rendererRef.current.activeScene,
      rendererRef.current.camera,
      worldSettings.resolution
    );
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#090D13] text-slate-100 overflow-hidden font-sans">
      {/* 1. Header with Module Switcher */}
      <Header
        currentModule={currentModule}
        onSelectModule={handleSelectModule}
        stats={stats}
        onResetView={handleResetView}
        onOpenBenchmark={() => setIsBenchmarkOpen(true)}
        onExportWorldPLY={handleExportWorldPLY}
        onExportWorldOBJ={handleExportWorldOBJ}
        onExportMedicalSTL={handleExportMedicalSTL}
        onExportMedicalPLY={handleExportMedicalPLY}
        onExportMedicalOBJ={handleExportMedicalOBJ}
      />

      {/* 2. Main Work Area */}
      <main className="flex-1 flex flex-row overflow-hidden relative">
        {/* Dynamic Left Sidebar based on selected module */}
        {currentModule === 'world' ? (
          <LeftSidebarWorld
            metadata={worldMetadata}
            settings={worldSettings}
            onUpdateSettings={handleUpdateWorldSettings}
            onLoadSampleScene={handleLoadWorldSample}
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
        ) : (
          <LeftSidebarMedical
            metadata={medicalMetadata}
            settings={medicalSettings}
            onUpdateSettings={handleUpdateMedicalSettings}
            onLoadSyntheticPhantom={handleLoadMedicalPhantom}
            onImportDicomFiles={handleImportDicom}
            onImportNiftiFile={handleImportNifti}
            onToggleMprViewer={() => setShowMprViewer(!showMprViewer)}
            showMprViewer={showMprViewer}
          />
        )}

        {/* Central 3D Viewport */}
        <Viewport3D
          canvasRef={canvasRef}
          currentModule={currentModule}
          onResetCamera={handleResetView}
          isWebGL2Supported={isWebGL2Supported}
          backgroundColor={worldSettings.backgroundColor}
          onChangeBackgroundColor={handleChangeBackgroundColor}
          onToggleMprViewer={currentModule === 'medical' ? () => setShowMprViewer(!showMprViewer) : undefined}
          showMprViewer={showMprViewer}
        />

        {/* 2D Orthogonal MPR Viewer Overlay in Medical Mode */}
        {currentModule === 'medical' && showMprViewer && (
          <MedicalMprViewer
            medicalEngine={medicalEngineRef.current}
            settings={medicalSettings}
            onUpdateSettings={handleUpdateMedicalSettings}
            onClose={() => setShowMprViewer(false)}
          />
        )}

        {/* Dynamic Right Inspector based on selected module */}
        <div className="hidden lg:block">
          {currentModule === 'world' ? (
            <RightInspectorWorld
              stats={stats}
              metadata={worldMetadata}
              settings={worldSettings}
            />
          ) : (
            <RightInspectorMedical
              stats={stats}
              metadata={medicalMetadata}
              settings={medicalSettings}
            />
          )}
        </div>
      </main>

      {/* 3. Bottom Status Bar */}
      <BottomStatusBar
        currentModule={currentModule}
        stats={stats}
        exportStatus={exportStatus}
      />

      {/* Benchmark Modal */}
      <BenchmarkModal
        isOpen={isBenchmarkOpen}
        onClose={() => setIsBenchmarkOpen(false)}
        onRunBenchmark={handleRunBenchmark}
        currentResolution={worldSettings.resolution}
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
