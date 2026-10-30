import * as THREE from 'three';

export interface VideoStateCallback {
  (state: {
    currentTime: number;
    duration: number;
    isPlaying: boolean;
    isEnded: boolean;
  }): void;
}

export class VideoProcessor {
  private videoElement: HTMLVideoElement | null = null;
  public videoTexture: THREE.VideoTexture | null = null;
  private objectUrl: string | null = null;
  private frameCallbackId: number | null = null;
  private animFrameId: number | null = null;
  private onStateChange: VideoStateCallback | null = null;
  private isProcessing = false;

  constructor(onStateChange?: VideoStateCallback) {
    if (onStateChange) {
      this.onStateChange = onStateChange;
    }
  }

  /**
   * Initializes and loads a video file into an HTML5 Video Element and creates a THREE.VideoTexture
   */
  public async loadVideo(file: File): Promise<{
    texture: THREE.VideoTexture;
    width: number;
    height: number;
    duration: number;
  }> {
    this.dispose();

    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.playsInline = true;
    video.muted = true;
    video.loop = true;
    video.preload = 'auto';

    this.objectUrl = URL.createObjectURL(file);
    video.src = this.objectUrl;

    return new Promise((resolve, reject) => {
      const onLoadedMetadata = () => {
        video.removeEventListener('loadedmetadata', onLoadedMetadata);
        video.removeEventListener('error', onError);

        this.videoElement = video;
        this.videoTexture = new THREE.VideoTexture(video);
        this.videoTexture.minFilter = THREE.LinearFilter;
        this.videoTexture.magFilter = THREE.LinearFilter;
        this.videoTexture.format = THREE.RGBAFormat;
        this.videoTexture.generateMipmaps = false;

        this.setupEventListeners();
        this.startFrameLoop();

        resolve({
          texture: this.videoTexture,
          width: video.videoWidth || 1280,
          height: video.videoHeight || 720,
          duration: video.duration || 0,
        });
      };

      const onError = () => {
        video.removeEventListener('loadedmetadata', onLoadedMetadata);
        video.removeEventListener('error', onError);
        this.dispose();
        reject(new Error('Failed to load and decode video file.'));
      };

      video.addEventListener('loadedmetadata', onLoadedMetadata);
      video.addEventListener('error', onError);
      video.load();
    });
  }

  private setupEventListeners() {
    if (!this.videoElement) return;

    const emitState = () => {
      if (!this.videoElement || !this.onStateChange) return;
      this.onStateChange({
        currentTime: this.videoElement.currentTime,
        duration: this.videoElement.duration || 0,
        isPlaying: !this.videoElement.paused && !this.videoElement.ended,
        isEnded: this.videoElement.ended,
      });
    };

    this.videoElement.addEventListener('timeupdate', emitState);
    this.videoElement.addEventListener('play', emitState);
    this.videoElement.addEventListener('pause', emitState);
    this.videoElement.addEventListener('ended', emitState);
  }

  /**
   * Starts high-efficiency frame extraction using requestVideoFrameCallback or requestAnimationFrame
   */
  private startFrameLoop() {
    this.isProcessing = true;

    const onFrame = () => {
      if (!this.isProcessing || !this.videoElement) return;

      if (this.videoTexture) {
        this.videoTexture.needsUpdate = true;
      }

      // Check requestVideoFrameCallback support (modern Chrome, Edge, Safari)
      if ('requestVideoFrameCallback' in this.videoElement) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.frameCallbackId = (this.videoElement as any).requestVideoFrameCallback(() => {
          onFrame();
        });
      } else {
        this.animFrameId = requestAnimationFrame(onFrame);
      }
    };

    onFrame();
  }

  public async play(): Promise<void> {
    if (this.videoElement) {
      try {
        await this.videoElement.play();
      } catch (err) {
        console.warn('Auto-play blocked or failed:', err);
      }
    }
  }

  public pause(): void {
    if (this.videoElement) {
      this.videoElement.pause();
    }
  }

  public seek(timeSeconds: number): void {
    if (this.videoElement) {
      this.videoElement.currentTime = Math.max(0, Math.min(timeSeconds, this.videoElement.duration || 0));
    }
  }

  public restart(): void {
    this.seek(0);
    this.play();
  }

  public isPlaying(): boolean {
    return !!this.videoElement && !this.videoElement.paused && !this.videoElement.ended;
  }

  public getCurrentTime(): number {
    return this.videoElement?.currentTime || 0;
  }

  public getDuration(): number {
    return this.videoElement?.duration || 0;
  }

  public dispose(): void {
    this.isProcessing = false;

    if (this.videoElement) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (this.frameCallbackId !== null && 'cancelVideoFrameCallback' in this.videoElement) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this.videoElement as any).cancelVideoFrameCallback(this.frameCallbackId);
      }
      this.videoElement.pause();
      this.videoElement.removeAttribute('src');
      this.videoElement.load();
      this.videoElement = null;
    }

    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.videoTexture) {
      this.videoTexture.dispose();
      this.videoTexture = null;
    }

    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
  }
}
