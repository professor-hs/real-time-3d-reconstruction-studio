// WebGL2 GLSL ES 3.00 Shaders for GPU Image & Video Enhancement

export const quadVertexShader = `#version 300 es
in vec2 aPosition;
out vec2 vUv;

void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

/**
 * Composite Photo & Video Enhancement Fragment Shader
 * Includes:
 * 1. Bicubic Catmull-Rom Spline Resampling (for GPU 2x/4x upscaling)
 * 2. Bilateral Edge-Preserving Denoising
 * 3. Unsharp Mask Sharpening & Blur Reduction
 * 4. White Balance (Temperature & Tint)
 * 5. Brightness, Contrast & Gamma
 * 6. Color Saturation
 */
export const enhancementFragmentShader = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uTexture;
uniform vec2 uTexelSize;          // 1.0 / source resolution
uniform float uSharpen;           // 0.0 to 2.0
uniform float uDenoise;           // 0.0 to 1.0 (bilateral filter strength)
uniform float uBlurReduction;     // 0.0 to 1.0 (deblur / high-pass compensation)
uniform float uBrightness;        // -1.0 to 1.0
uniform float uContrast;          // 0.2 to 2.5
uniform float uGamma;             // 0.2 to 2.5
uniform float uSaturation;        // 0.0 to 2.5
uniform float uTemperature;       // -1.0 to 1.0 (cool -> warm)
uniform float uTint;              // -1.0 to 1.0 (green -> magenta)
uniform int uUpscaleFactor;       // 1, 2, or 4

// Catmull-Rom cubic weight evaluation
vec4 cubicWeight(float x) {
  float x2 = x * x;
  float x3 = x2 * x;
  vec4 w;
  w.x = -x3 + 2.0 * x2 - x;
  w.y = 3.0 * x3 - 5.0 * x2 + 2.0;
  w.z = -3.0 * x3 + 4.0 * x2 + x;
  w.w = x3 - x2;
  return 0.5 * w;
}

// 16-tap Catmull-Rom Bicubic Resampling for high-quality upscaling
vec4 sampleBicubic(sampler2D tex, vec2 uv, vec2 texelSize) {
  vec2 coord = uv / texelSize - 0.5;
  vec2 f = fract(coord);
  vec2 base = (floor(coord) + 0.5) * texelSize;

  vec4 wx = cubicWeight(f.x);
  vec4 wy = cubicWeight(f.y);

  vec4 color = vec4(0.0);
  for (int y = -1; y <= 2; y++) {
    for (int x = -1; x <= 2; x++) {
      vec2 sampleUv = base + vec2(float(x), float(y)) * texelSize;
      vec4 c = texture(tex, clamp(sampleUv, 0.0, 1.0));
      color += c * (wx[x + 1] * wy[y + 1]);
    }
  }
  return clamp(color, 0.0, 1.0);
}

// Bilateral filter for edge-preserving denoising
vec3 applyBilateralFilter(sampler2D tex, vec2 uv, vec2 texelSize, float strength) {
  vec3 center = texture(tex, uv).rgb;
  if (strength <= 0.01) {
    return center;
  }

  float sigmaSpatial = 1.5 + strength * 2.5;
  float sigmaColor = 0.08 + strength * 0.25;
  float twoSigmaSpatialSq = 2.0 * sigmaSpatial * sigmaSpatial;
  float twoSigmaColorSq = 2.0 * sigmaColor * sigmaColor;

  vec3 accumColor = vec3(0.0);
  float accumWeight = 0.0;
  int radius = int(clamp(floor(sigmaSpatial * 1.5), 1.0, 4.0));

  for (int dy = -radius; dy <= radius; dy++) {
    for (int dx = -radius; dx <= radius; dx++) {
      vec2 offset = vec2(float(dx), float(dy)) * texelSize;
      vec3 sampleCol = texture(tex, clamp(uv + offset, 0.0, 1.0)).rgb;

      float distSq = float(dx * dx + dy * dy);
      float spatialWeight = exp(-distSq / twoSigmaSpatialSq);

      vec3 diff = center - sampleCol;
      float colorDistSq = dot(diff, diff);
      float rangeWeight = exp(-colorDistSq / twoSigmaColorSq);

      float weight = spatialWeight * rangeWeight;
      accumColor += sampleCol * weight;
      accumWeight += weight;
    }
  }

  return (accumWeight > 0.0) ? (accumColor / accumWeight) : center;
}

// 9-tap Laplacian Sharpening and Blur Reduction
vec3 applySharpenAndDeblur(sampler2D tex, vec2 uv, vec2 texelSize, vec3 baseColor, float sharpen, float blurReduction) {
  float totalSharp = sharpen + blurReduction * 1.2;
  if (totalSharp <= 0.01) {
    return baseColor;
  }

  // 3x3 surrounding samples
  vec3 c00 = texture(tex, clamp(uv + vec2(-1.0, -1.0) * texelSize, 0.0, 1.0)).rgb;
  vec3 c10 = texture(tex, clamp(uv + vec2( 0.0, -1.0) * texelSize, 0.0, 1.0)).rgb;
  vec3 c20 = texture(tex, clamp(uv + vec2( 1.0, -1.0) * texelSize, 0.0, 1.0)).rgb;
  vec3 c01 = texture(tex, clamp(uv + vec2(-1.0,  0.0) * texelSize, 0.0, 1.0)).rgb;
  vec3 c21 = texture(tex, clamp(uv + vec2( 1.0,  0.0) * texelSize, 0.0, 1.0)).rgb;
  vec3 c02 = texture(tex, clamp(uv + vec2(-1.0,  1.0) * texelSize, 0.0, 1.0)).rgb;
  vec3 c12 = texture(tex, clamp(uv + vec2( 0.0,  1.0) * texelSize, 0.0, 1.0)).rgb;
  vec3 c22 = texture(tex, clamp(uv + vec2( 1.0,  1.0) * texelSize, 0.0, 1.0)).rgb;

  // Discrete Laplacian edge detection
  vec3 laplacian = (c10 + c01 + c21 + c12) * 2.0 + (c00 + c20 + c02 + c22) - baseColor * 12.0;

  // Unsharp mask: original - laplacian * factor
  vec3 sharpened = baseColor - laplacian * (totalSharp * 0.18);
  return clamp(sharpened, 0.0, 1.0);
}

// White Balance Adjustments
vec3 applyWhiteBalance(vec3 color, float temp, float tint) {
  // Temperature: Warm (boost R, cut B) / Cool (cut R, boost B)
  color.r += temp * 0.15;
  color.b -= temp * 0.15;

  // Tint: Magenta (cut G) / Green (boost G)
  color.g -= tint * 0.15;

  return clamp(color, 0.0, 1.0);
}

// Color grading: Contrast, Brightness, Gamma, Saturation
vec3 applyColorGrading(vec3 color, float brightness, float contrast, float gamma, float saturation) {
  // Brightness & Contrast (centered at 0.5)
  color = (color - 0.5) * contrast + 0.5 + brightness;
  color = clamp(color, 0.0, 1.0);

  // Gamma correction
  if (gamma > 0.01 && abs(gamma - 1.0) > 0.001) {
    color = pow(max(color, vec3(0.0001)), vec3(1.0 / gamma));
  }

  // Saturation (ITU-R BT.601 luma)
  float luma = dot(color, vec3(0.299, 0.587, 0.114));
  color = mix(vec3(luma), color, saturation);

  return clamp(color, 0.0, 1.0);
}

void main() {
  vec4 initialColor;

  // 1. Resampling / Upscaling
  if (uUpscaleFactor > 1) {
    initialColor = sampleBicubic(uTexture, vUv, uTexelSize);
  } else {
    initialColor = texture(uTexture, vUv);
  }

  vec3 rgb = initialColor.rgb;

  // 2. Bilateral Denoising (if enabled)
  if (uDenoise > 0.01) {
    rgb = applyBilateralFilter(uTexture, vUv, uTexelSize, uDenoise);
  }

  // 3. Sharpening & Blur Reduction
  if (uSharpen > 0.01 || uBlurReduction > 0.01) {
    rgb = applySharpenAndDeblur(uTexture, vUv, uTexelSize, rgb, uSharpen, uBlurReduction);
  }

  // 4. White Balance (Temperature / Tint)
  if (abs(uTemperature) > 0.01 || abs(uTint) > 0.01) {
    rgb = applyWhiteBalance(rgb, uTemperature, uTint);
  }

  // 5. Brightness, Contrast, Gamma, Saturation
  rgb = applyColorGrading(rgb, uBrightness, uContrast, uGamma, uSaturation);

  fragColor = vec4(rgb, initialColor.a);
}
`;

/**
 * Dedicated benchmark fragment shader for discrete GPU-vs-CPU comparisons
 */
export const benchmarkSharpenShader = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uTexture;
uniform vec2 uTexelSize;
uniform float uSharpenStrength;

void main() {
  vec4 center = texture(uTexture, vUv);
  vec4 top    = texture(uTexture, vUv + vec2(0.0, -1.0) * uTexelSize);
  vec4 bottom = texture(uTexture, vUv + vec2(0.0,  1.0) * uTexelSize);
  vec4 left   = texture(uTexture, vUv + vec2(-1.0, 0.0) * uTexelSize);
  vec4 right  = texture(uTexture, vUv + vec2( 1.0, 0.0) * uTexelSize);

  vec4 sharpened = center * (1.0 + 4.0 * uSharpenStrength) - (top + bottom + left + right) * uSharpenStrength;
  fragColor = clamp(sharpened, 0.0, 1.0);
}
`;

export const benchmarkDenoiseShader = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uTexture;
uniform vec2 uTexelSize;
uniform float uStrength;

void main() {
  vec3 center = texture(uTexture, vUv).rgb;
  float twoSigmaSpatialSq = 2.0 * 2.5 * 2.5;
  float twoSigmaColorSq = 2.0 * (0.1 + uStrength * 0.2) * (0.1 + uStrength * 0.2);

  vec3 accumColor = vec3(0.0);
  float accumWeight = 0.0;

  for (int dy = -2; dy <= 2; dy++) {
    for (int dx = -2; dx <= 2; dx++) {
      vec2 offset = vec2(float(dx), float(dy)) * uTexelSize;
      vec3 sampleCol = texture(uTexture, vUv + offset).rgb;

      float distSq = float(dx * dx + dy * dy);
      float spatialWeight = exp(-distSq / twoSigmaSpatialSq);

      vec3 diff = center - sampleCol;
      float colorDistSq = dot(diff, diff);
      float rangeWeight = exp(-colorDistSq / twoSigmaColorSq);

      float weight = spatialWeight * rangeWeight;
      accumColor += sampleCol * weight;
      accumWeight += weight;
    }
  }

  fragColor = vec4(accumColor / accumWeight, 1.0);
}
`;

export const benchmarkColorShader = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uTexture;
uniform float uBrightness;
uniform float uContrast;
uniform float uGamma;
uniform float uSaturation;

void main() {
  vec4 color = texture(uTexture, vUv);
  vec3 rgb = color.rgb;

  // Contrast & Brightness
  rgb = (rgb - 0.5) * uContrast + 0.5 + uBrightness;
  rgb = clamp(rgb, 0.0, 1.0);

  // Gamma
  rgb = pow(max(rgb, vec3(0.0001)), vec3(1.0 / uGamma));

  // Saturation
  float luma = dot(rgb, vec3(0.299, 0.587, 0.114));
  rgb = mix(vec3(luma), rgb, uSaturation);

  fragColor = vec4(clamp(rgb, 0.0, 1.0), color.a);
}
`;
