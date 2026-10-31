import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import { GPUProcessor } from '../gpu/GPUProcessor';
import { VideoProcessingProgress, VideoProcessingSettings } from '../types';

export interface ProcessVideoOptions {
  file: File;
  settings: VideoProcessingSettings;
  onProgress?: (progress: VideoProcessingProgress) => void;
}

export class VideoEncoderPipeline {
  private isAborted = false;

  public abort() {
    this.isAborted = true;
  }

  /**
   * Checks whether the current browser supports native WebCodecs MP4 encoding.
   */
  public static isSupported(): { supported: boolean; reason?: string } {
    if (typeof window === 'undefined') {
      return { supported: false, reason: 'SSR environment' };
    }
    if (typeof (window as any).VideoEncoder === 'undefined') {
      return {
        supported: false,
        reason: 'WebCodecs VideoEncoder API is not supported in this browser. Please use Chrome, Edge, or a modern browser with WebCodecs enabled.',
      };
    }
    return { supported: true };
  }

  /**
   * Fully processes an MP4 video file frame-by-frame on the GPU,
   * preserves audio, and muxes it into a valid, playable MP4 file.
   */
  public async processAndExportMP4({
    file,
    settings,
    onProgress,
  }: ProcessVideoOptions): Promise<Blob> {
    this.isAborted = false;

    const support = VideoEncoderPipeline.isSupported();
    if (!support.supported) {
      throw new Error(support.reason || 'MP4 video encoding is not supported in this browser.');
    }

    const gpu = GPUProcessor.getInstance();

    // 1. Load video element for frame stepping
    const videoUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.src = videoUrl;
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';

    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('Failed to load video metadata.'));
    });

    const duration = video.duration || 1;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    // Standardize to even dimensions for H.264
    const encWidth = width % 2 === 0 ? width : width - 1;
    const encHeight = height % 2 === 0 ? height : height - 1;

    // Detect approximate frame rate (default 30 FPS if unknown)
    const fps = 30;
    const totalFrames = Math.max(1, Math.round(duration * fps));
    const frameDurationMicrosec = Math.round(1_000_000 / fps);

    // 2. Extract and decode audio track if present
    let audioBuffer: AudioBuffer | null = null;
    let audioCtx: AudioContext | null = null;
    try {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const rawBuffer = await file.arrayBuffer();
      audioBuffer = await audioCtx.decodeAudioData(rawBuffer.slice(0));
    } catch {
      // Video has no audio or audio decode failed
      audioBuffer = null;
    }

    const hasAudio = audioBuffer !== null && audioBuffer.numberOfChannels > 0;
    const audioSampleRate = audioBuffer ? audioBuffer.sampleRate : 48000;
    const audioChannels = audioBuffer ? Math.min(2, audioBuffer.numberOfChannels) : 0;

    // 3. Initialize MP4 Muxer with ArrayBufferTarget
    const muxerTarget = new ArrayBufferTarget();
    const muxer = new Muxer({
      target: muxerTarget,
      video: {
        codec: 'avc',
        width: encWidth,
        height: encHeight,
      },
      audio: hasAudio
        ? {
            codec: 'aac',
            numberOfChannels: audioChannels,
            sampleRate: audioSampleRate,
          }
        : undefined,
      fastStart: 'in-memory',
    });

    // 4. Initialize VideoEncoder
    let videoEncoderError: Error | null = null;
    const videoEncoder = new (window as any).VideoEncoder({
      output: (chunk: any, meta: any) => {
        muxer.addVideoChunk(chunk, meta);
      },
      error: (err: any) => {
        videoEncoderError = err instanceof Error ? err : new Error(String(err));
      },
    });

    // Choose H.264 configuration
    const videoBitrate = Math.round(encWidth * encHeight * fps * 0.15); // Adaptive bitrate
    await videoEncoder.configure({
      codec: 'avc1.42001f', // Baseline profile
      width: encWidth,
      height: encHeight,
      bitrate: Math.max(1_500_000, Math.min(10_000_000, videoBitrate)),
      framerate: fps,
    });

    // 5. Initialize AudioEncoder if audio exists and browser supports it
    let audioEncoder: any = null;
    if (hasAudio && typeof (window as any).AudioEncoder !== 'undefined') {
      try {
        audioEncoder = new (window as any).AudioEncoder({
          output: (chunk: any, meta: any) => {
            muxer.addAudioChunk(chunk, meta);
          },
          error: (err: any) => {
            console.warn('AudioEncoder error:', err);
          },
        });

        await audioEncoder.configure({
          codec: 'mp4a.40.2', // AAC-LC
          numberOfChannels: audioChannels,
          sampleRate: audioSampleRate,
          bitrate: 128_000,
        });

        // Encode full audio buffer in chunks
        const channelData: Float32Array[] = [];
        for (let ch = 0; ch < audioChannels; ch++) {
          channelData.push(audioBuffer!.getChannelData(ch));
        }

        const audioChunkSize = 2048;
        const totalAudioSamples = audioBuffer!.length;

        for (let offset = 0; offset < totalAudioSamples; offset += audioChunkSize) {
          const numSamples = Math.min(audioChunkSize, totalAudioSamples - offset);
          const pcmData = new Float32Array(numSamples * audioChannels);

          for (let s = 0; s < numSamples; s++) {
            for (let ch = 0; ch < audioChannels; ch++) {
              pcmData[s * audioChannels + ch] = channelData[ch][offset + s];
            }
          }

          const audioData = new (window as any).AudioData({
            format: 'f32',
            sampleRate: audioSampleRate,
            numberOfFrames: numSamples,
            numberOfChannels: audioChannels,
            timestamp: Math.round((offset / audioSampleRate) * 1_000_000),
            data: pcmData,
          });

          audioEncoder.encode(audioData);
          audioData.close();
        }

        await audioEncoder.flush();
      } catch (audioErr) {
        console.warn('Audio encoding not available or failed; exporting video track only.', audioErr);
      }
    }

    // 6. Frame-by-Frame GPU Processing & Video Encoding
    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = encWidth;
    offscreenCanvas.height = encHeight;

    const startTime = performance.now();

    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
      if (this.isAborted) {
        URL.revokeObjectURL(videoUrl);
        videoEncoder.close();
        if (audioEncoder) audioEncoder.close();
        throw new Error('Video processing was cancelled by user.');
      }

      if (videoEncoderError) {
        throw videoEncoderError;
      }

      const frameTimeSec = frameIndex / fps;
      video.currentTime = Math.min(duration, frameTimeSec);

      await new Promise<void>((res) => {
        const onSeeked = () => {
          video.removeEventListener('seeked', onSeeked);
          res();
        };
        video.addEventListener('seeked', onSeeked);
      });

      // Pass video frame through GPU WebGL2 Shader
      gpu.processVideoFrame(video, settings, offscreenCanvas);

      // Create VideoFrame for WebCodecs
      const timestampMicrosec = frameIndex * frameDurationMicrosec;
      const videoFrame = new (window as any).VideoFrame(offscreenCanvas, {
        timestamp: timestampMicrosec,
        duration: frameDurationMicrosec,
      });

      const isKeyFrame = frameIndex % (fps * 2) === 0;
      videoEncoder.encode(videoFrame, { keyFrame: isKeyFrame });
      videoFrame.close();

      // Progress reporting
      const percent = Math.round(((frameIndex + 1) / totalFrames) * 100);
      const elapsedSec = (performance.now() - startTime) / 1000;
      const avgSecPerFrame = elapsedSec / (frameIndex + 1);
      const remainingSec = Math.round(avgSecPerFrame * (totalFrames - frameIndex - 1));

      if (onProgress) {
        onProgress({
          isProcessing: true,
          currentFrame: frameIndex + 1,
          totalFrames,
          percent,
          estimatedTimeSec: remainingSec,
          statusMessage: `GPU processing frame ${frameIndex + 1} of ${totalFrames} (${percent}%)`,
        });
      }
    }

    // 7. Finalize Encoding and Muxing
    await videoEncoder.flush();
    muxer.finalize();

    URL.revokeObjectURL(videoUrl);
    if (audioCtx) {
      audioCtx.close().catch(() => {});
    }

    const outputBuffer = muxer.target.buffer;
    return new Blob([outputBuffer], { type: 'video/mp4' });
  }
}
