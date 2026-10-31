import {
  enhancementFragmentShader,
  quadVertexShader,
  benchmarkSharpenShader,
  benchmarkDenoiseShader,
  benchmarkColorShader,
} from '../shaders/enhancementShaders';
import { BenchmarkOperation, PhotoEnhancementSettings, VideoProcessingSettings } from '../types';

export class GPUProcessor {
  private static instance: GPUProcessor | null = null;

  public canvas: HTMLCanvasElement;
  public gl: WebGL2RenderingContext;
  private quadBuffer: WebGLBuffer | null = null;
  private vao: WebGLVertexArrayObject | null = null;

  // Shader Programs
  private compositeProgram: WebGLProgram | null = null;
  private benchmarkSharpenProg: WebGLProgram | null = null;
  private benchmarkDenoiseProg: WebGLProgram | null = null;
  private benchmarkColorProg: WebGLProgram | null = null;

  // Cached uniform locations
  private compositeUniforms: Record<string, WebGLUniformLocation | null> = {};
  private inputTexture: WebGLTexture | null = null;

  private isContextLost = false;

  private constructor() {
    this.canvas = document.createElement('canvas');
    // Default offscreen canvas resolution
    this.canvas.width = 1920;
    this.canvas.height = 1080;

    const gl = this.canvas.getContext('webgl2', {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });

    if (!gl) {
      throw new Error('WebGL2 is not supported on this device/browser. GPU processing requires WebGL2.');
    }

    this.gl = gl;

    this.initGL();
    this.setupContextLossHandlers();
  }

  public static getInstance(): GPUProcessor {
    if (!GPUProcessor.instance) {
      GPUProcessor.instance = new GPUProcessor();
    }
    return GPUProcessor.instance;
  }

  private initGL() {
    const gl = this.gl;

    // Full-screen quad (triangle strip: [-1,-1], [1,-1], [-1,1], [1,1])
    const quadVertices = new Float32Array([
      -1.0, -1.0,
       1.0, -1.0,
      -1.0,  1.0,
       1.0,  1.0,
    ]);

    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);

    this.quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

    // Compile programs
    this.compositeProgram = this.createProgram(quadVertexShader, enhancementFragmentShader);
    this.benchmarkSharpenProg = this.createProgram(quadVertexShader, benchmarkSharpenShader);
    this.benchmarkDenoiseProg = this.createProgram(quadVertexShader, benchmarkDenoiseShader);
    this.benchmarkColorProg = this.createProgram(quadVertexShader, benchmarkColorShader);

    // Cache composite uniforms
    if (this.compositeProgram) {
      const p = this.compositeProgram;
      this.compositeUniforms = {
        uTexture: gl.getUniformLocation(p, 'uTexture'),
        uTexelSize: gl.getUniformLocation(p, 'uTexelSize'),
        uSharpen: gl.getUniformLocation(p, 'uSharpen'),
        uDenoise: gl.getUniformLocation(p, 'uDenoise'),
        uBlurReduction: gl.getUniformLocation(p, 'uBlurReduction'),
        uBrightness: gl.getUniformLocation(p, 'uBrightness'),
        uContrast: gl.getUniformLocation(p, 'uContrast'),
        uGamma: gl.getUniformLocation(p, 'uGamma'),
        uSaturation: gl.getUniformLocation(p, 'uSaturation'),
        uTemperature: gl.getUniformLocation(p, 'uTemperature'),
        uTint: gl.getUniformLocation(p, 'uTint'),
        uUpscaleFactor: gl.getUniformLocation(p, 'uUpscaleFactor'),
      };
    }

    // Prepare primary texture
    this.inputTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.inputTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  }

  private setupContextLossHandlers() {
    this.canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.isContextLost = true;
      console.warn('[GPUProcessor] WebGL2 context lost.');
    });

    this.canvas.addEventListener('webglcontextrestored', () => {
      console.info('[GPUProcessor] WebGL2 context restored. Rebuilding GPU pipelines...');
      this.isContextLost = false;
      this.initGL();
    });
  }

  private createProgram(vsSource: string, fsSource: string): WebGLProgram {
    const gl = this.gl;
    const vs = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vs, vsSource);
    gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
      const err = gl.getShaderInfoLog(vs);
      gl.deleteShader(vs);
      throw new Error(`Vertex shader compilation failed: ${err}`);
    }

    const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fs, fsSource);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      const err = gl.getShaderInfoLog(fs);
      gl.deleteShader(fs);
      throw new Error(`Fragment shader compilation failed: ${err}`);
    }

    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const err = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(`Shader program link failed: ${err}`);
    }

    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return program;
  }

  /**
   * Genuine GPU execution: processes an image on the GPU using shaders
   * and renders the result onto an output canvas.
   */
  public processImage(
    source: TexImageSource,
    settings: PhotoEnhancementSettings,
    targetWidth?: number,
    targetHeight?: number
  ): HTMLCanvasElement {
    if (this.isContextLost) throw new Error('GPU context is lost.');

    const gl = this.gl;
    const srcWidth = (source as HTMLImageElement).naturalWidth || (source as HTMLVideoElement).videoWidth || (source as HTMLCanvasElement).width;
    const srcHeight = (source as HTMLImageElement).naturalHeight || (source as HTMLVideoElement).videoHeight || (source as HTMLCanvasElement).height;

    const outWidth = targetWidth || (srcWidth * settings.upscale);
    const outHeight = targetHeight || (srcHeight * settings.upscale);

    // Resize GL viewport & internal canvas
    if (this.canvas.width !== outWidth || this.canvas.height !== outHeight) {
      this.canvas.width = outWidth;
      this.canvas.height = outHeight;
    }
    gl.viewport(0, 0, outWidth, outHeight);

    // Upload source texture to GPU
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.inputTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, source);

    // Bind shader program
    gl.useProgram(this.compositeProgram);

    // Set uniforms
    const u = this.compositeUniforms;
    gl.uniform1i(u.uTexture, 0);
    gl.uniform2f(u.uTexelSize, 1.0 / srcWidth, 1.0 / srcHeight);
    gl.uniform1f(u.uSharpen, settings.sharpen);
    gl.uniform1f(u.uDenoise, settings.denoise);
    gl.uniform1f(u.uBlurReduction, settings.blurReduction);
    gl.uniform1f(u.uBrightness, settings.brightness);
    gl.uniform1f(u.uContrast, settings.contrast);
    gl.uniform1f(u.uGamma, settings.gamma);
    gl.uniform1f(u.uSaturation, settings.saturation);
    gl.uniform1f(u.uTemperature, settings.temperature);
    gl.uniform1f(u.uTint, settings.tint);
    gl.uniform1i(u.uUpscaleFactor, settings.upscale);

    // Draw full-screen quad
    gl.bindVertexArray(this.vao);
    const posLoc = gl.getAttribLocation(this.compositeProgram!, 'aPosition');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Clone output into a dedicated canvas to prevent race conditions
    const outCanvas = document.createElement('canvas');
    outCanvas.width = outWidth;
    outCanvas.height = outHeight;
    const outCtx = outCanvas.getContext('2d');
    if (outCtx) {
      outCtx.drawImage(this.canvas, 0, 0);
    }
    return outCanvas;
  }

  /**
   * Fast GPU frame processing directly into a target canvas for video playback and encoding.
   */
  public processVideoFrame(
    video: HTMLVideoElement | HTMLCanvasElement,
    settings: VideoProcessingSettings,
    targetCanvas: HTMLCanvasElement
  ): void {
    if (this.isContextLost) return;

    const gl = this.gl;
    const width = targetCanvas.width;
    const height = targetCanvas.height;

    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    gl.viewport(0, 0, width, height);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.inputTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, video);

    gl.useProgram(this.compositeProgram);

    const u = this.compositeUniforms;
    gl.uniform1i(u.uTexture, 0);
    gl.uniform2f(u.uTexelSize, 1.0 / width, 1.0 / height);
    gl.uniform1f(u.uSharpen, settings.sharpen);
    gl.uniform1f(u.uDenoise, settings.denoise);
    gl.uniform1f(u.uBlurReduction, 0.0);
    gl.uniform1f(u.uBrightness, settings.brightness);
    gl.uniform1f(u.uContrast, settings.contrast);
    gl.uniform1f(u.uGamma, settings.gamma);
    gl.uniform1f(u.uSaturation, settings.saturation);
    gl.uniform1f(u.uTemperature, settings.temperature);
    gl.uniform1f(u.uTint, settings.tint);
    gl.uniform1i(u.uUpscaleFactor, 1);

    gl.bindVertexArray(this.vao);
    const posLoc = gl.getAttribLocation(this.compositeProgram!, 'aPosition');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    const ctx = targetCanvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(this.canvas, 0, 0);
    }
  }

  /**
   * Runs an authentic GPU benchmark operation with GPU synchronization (gl.finish)
   * to accurately record hardware execution time without CPU overhead.
   */
  public async runGPUBenchmark(
    source: TexImageSource,
    operation: BenchmarkOperation,
    iterations: number = 3
  ): Promise<{ timeMs: number }> {
    const gl = this.gl;
    const width = (source as HTMLImageElement).naturalWidth || (source as HTMLCanvasElement).width;
    const height = (source as HTMLImageElement).naturalHeight || (source as HTMLCanvasElement).height;

    this.canvas.width = width;
    this.canvas.height = height;
    gl.viewport(0, 0, width, height);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.inputTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, source);

    let program: WebGLProgram | null = null;
    if (operation === 'sharpen') program = this.benchmarkSharpenProg;
    else if (operation === 'denoise') program = this.benchmarkDenoiseProg;
    else if (operation === 'color_adjust') program = this.benchmarkColorProg;
    else program = this.compositeProgram; // resample 2x

    if (!program) throw new Error(`Benchmark shader not found for operation: ${operation}`);

    gl.useProgram(program);
    gl.bindVertexArray(this.vao);
    const posLoc = gl.getAttribLocation(program, 'aPosition');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    // Set uniform values
    if (operation === 'sharpen') {
      gl.uniform1i(gl.getUniformLocation(program, 'uTexture'), 0);
      gl.uniform2f(gl.getUniformLocation(program, 'uTexelSize'), 1.0 / width, 1.0 / height);
      gl.uniform1f(gl.getUniformLocation(program, 'uSharpenStrength'), 1.2);
    } else if (operation === 'denoise') {
      gl.uniform1i(gl.getUniformLocation(program, 'uTexture'), 0);
      gl.uniform2f(gl.getUniformLocation(program, 'uTexelSize'), 1.0 / width, 1.0 / height);
      gl.uniform1f(gl.getUniformLocation(program, 'uStrength'), 0.8);
    } else if (operation === 'color_adjust') {
      gl.uniform1i(gl.getUniformLocation(program, 'uTexture'), 0);
      gl.uniform1f(gl.getUniformLocation(program, 'uBrightness'), 0.15);
      gl.uniform1f(gl.getUniformLocation(program, 'uContrast'), 1.3);
      gl.uniform1f(gl.getUniformLocation(program, 'uGamma'), 1.2);
      gl.uniform1f(gl.getUniformLocation(program, 'uSaturation'), 1.4);
    } else if (operation === 'resample_2x') {
      this.canvas.width = width * 2;
      this.canvas.height = height * 2;
      gl.viewport(0, 0, width * 2, height * 2);
      const u = this.compositeUniforms;
      gl.uniform1i(u.uTexture, 0);
      gl.uniform2f(u.uTexelSize, 1.0 / width, 1.0 / height);
      gl.uniform1i(u.uUpscaleFactor, 2);
    }

    // 1. Warm-up pass to compile pipeline states into GPU
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.finish();

    // 2. Timed iterations
    const t0 = performance.now();
    for (let i = 0; i < iterations; i++) {
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.finish(); // Ensure GPU queue has flushed and completed
    }
    const t1 = performance.now();

    const avgTimeMs = (t1 - t0) / iterations;
    return { timeMs: Math.max(0.05, avgTimeMs) };
  }

  public detectGPUCapabilities(): { isWebGL2: boolean; renderer: string; vendor: string } {
    const gl = this.gl;
    const dbgRenderInfo = gl.getExtension('WEBGL_debug_renderer_info');
    let renderer = 'WebGL2 Generic GPU';
    let vendor = 'Generic Vendor';

    if (dbgRenderInfo) {
      renderer = gl.getParameter(dbgRenderInfo.UNMASKED_RENDERER_WEBGL) || renderer;
      vendor = gl.getParameter(dbgRenderInfo.UNMASKED_VENDOR_WEBGL) || vendor;
    } else {
      renderer = gl.getParameter(gl.RENDERER) || renderer;
      vendor = gl.getParameter(gl.VENDOR) || vendor;
    }

    return {
      isWebGL2: true,
      renderer,
      vendor,
    };
  }

  public dispose() {
    const gl = this.gl;
    if (this.quadBuffer) gl.deleteBuffer(this.quadBuffer);
    if (this.vao) gl.deleteVertexArray(this.vao);
    if (this.inputTexture) gl.deleteTexture(this.inputTexture);
    if (this.compositeProgram) gl.deleteProgram(this.compositeProgram);
    if (this.benchmarkSharpenProg) gl.deleteProgram(this.benchmarkSharpenProg);
    if (this.benchmarkDenoiseProg) gl.deleteProgram(this.benchmarkDenoiseProg);
    if (this.benchmarkColorProg) gl.deleteProgram(this.benchmarkColorProg);
  }
}
