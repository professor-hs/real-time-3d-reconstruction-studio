// Custom WebGL2 GLSL Shaders for Real-Time GPU Depth Reconstruction & Point Cloud Rendering

export const pointCloudVertexShader = /* glsl */ `
precision highp float;

uniform sampler2D uImage;
uniform sampler2D uDepthMap;
uniform int uDepthMethod;       // 0: Luminance, 1: Contrast, 2: Imported Depth Map
uniform float uDepthIntensity;  // Z displacement scaling
uniform float uContrast;        // Contrast adjustment
uniform float uBrightness;      // Brightness adjustment
uniform float uEdgeInfluence;   // Edge influence factor
uniform bool uInvertDepth;      // Depth inversion toggle
uniform vec2 uTexelSize;        // 1.0 / resolution for neighbor sampling
uniform float uPointSize;       // Point size in pixels
uniform float uAspectRatio;     // Image aspect ratio (width / height)
uniform float uTime;            // Elapsed time for animation
uniform bool uAnimatePoints;    // Subtle surface animation toggle

varying vec3 vColor;
varying float vDepth;
varying vec2 vUv;
varying vec3 vWorldPosition;

// ITU-R BT.601 standard luminance calculation
float getLuminance(vec3 rgb) {
  return 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
}

// Adjust contrast and brightness
float adjustLuma(float luma) {
  float adjusted = (luma - 0.5) * uContrast + 0.5 + (uBrightness - 1.0);
  return clamp(adjusted, 0.0, 1.0);
}

void main() {
  vUv = uv;

  // Sample original image color
  vec4 rawColor = texture2D(uImage, uv);
  
  // Apply brightness & contrast to RGB color
  vec3 rgbAdjusted = (rawColor.rgb - 0.5) * uContrast + 0.5 + (uBrightness - 1.0);
  vColor = clamp(rgbAdjusted, 0.0, 1.0);

  float zDisplacement = 0.0;
  float normalizedDepth = 0.5;

  if (uDepthMethod == 0) {
    // METHOD 1: GPU LUMINANCE DEPTH
    // Calculate image luminance
    float L = getLuminance(rawColor.rgb);
    L = adjustLuma(L);
    if (uInvertDepth) {
      L = 1.0 - L;
    }
    normalizedDepth = L;
    zDisplacement = (L - 0.5) * uDepthIntensity;

  } else if (uDepthMethod == 1) {
    // METHOD 2: GPU CONTRAST DEPTH
    // Sample 4-neighborhood to compute gradient magnitude
    vec3 cLeft  = texture2D(uImage, uv + vec2(-uTexelSize.x, 0.0)).rgb;
    vec3 cRight = texture2D(uImage, uv + vec2( uTexelSize.x, 0.0)).rgb;
    vec3 cDown  = texture2D(uImage, uv + vec2(0.0, -uTexelSize.y)).rgb;
    vec3 cUp    = texture2D(uImage, uv + vec2(0.0,  uTexelSize.y)).rgb;

    float lumLeft  = adjustLuma(getLuminance(cLeft));
    float lumRight = adjustLuma(getLuminance(cRight));
    float lumDown  = adjustLuma(getLuminance(cDown));
    float lumUp    = adjustLuma(getLuminance(cUp));

    float dx = (lumRight - lumLeft) * 0.5;
    float dy = (lumUp - lumDown) * 0.5;
    float edgeValue = sqrt(dx * dx + dy * dy);

    float baseLum = adjustLuma(getLuminance(rawColor.rgb));
    if (uInvertDepth) {
      baseLum = 1.0 - baseLum;
    }

    float combined = clamp(baseLum + edgeValue * uEdgeInfluence, 0.0, 1.5);
    normalizedDepth = clamp(combined, 0.0, 1.0);
    zDisplacement = (combined - 0.5) * uDepthIntensity;

  } else if (uDepthMethod == 2) {
    // METHOD 3: IMPORTED DEPTH MAP
    vec4 depthSample = texture2D(uDepthMap, uv);
    // Depth is derived from grayscale value
    float D = depthSample.r;
    D = adjustLuma(D);
    if (uInvertDepth) {
      D = 1.0 - D;
    }
    normalizedDepth = D;
    zDisplacement = (D - 0.5) * uDepthIntensity;
  }

  // Subtle dynamic oscillation if enabled
  if (uAnimatePoints) {
    float wave = sin(uTime * 2.5 + position.x * 6.0 + position.y * 6.0) * 0.03 * uDepthIntensity;
    zDisplacement += wave;
  }

  vDepth = normalizedDepth;

  // Scale XY according to aspect ratio
  vec3 displacedPosition = position;
  if (uAspectRatio >= 1.0) {
    displacedPosition.x = position.x * uAspectRatio;
  } else {
    displacedPosition.y = position.y / uAspectRatio;
  }
  displacedPosition.z = zDisplacement;

  vWorldPosition = (modelMatrix * vec4(displacedPosition, 1.0)).xyz;

  vec4 mvPosition = modelViewMatrix * vec4(displacedPosition, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // Perspective point size attenuation with distance
  // Avoid division by zero with -mvPosition.z
  float distanceScale = clamp(400.0 / -mvPosition.z, 0.5, 4.0);
  gl_PointSize = clamp(uPointSize * distanceScale, 1.0, 64.0);
}
`;

export const pointCloudFragmentShader = /* glsl */ `
precision highp float;

uniform int uColorMode;        // 0: Original RGB, 1: Depth Grayscale, 2: Height Colormap, 3: Neon
uniform bool uWireframe;

varying vec3 vColor;
varying float vDepth;
varying vec2 vUv;
varying vec3 vWorldPosition;

// Turbo / Scientific Colormap Approximation (Polynomial fit for vibrant scientific visualization)
vec3 turboColormap(float t) {
  // Approximate Google Turbo colormap (low: deep blue, mid: green/yellow, high: bright red)
  t = clamp(t, 0.0, 1.0);
  const vec4 kRedVec4   = vec4(0.13572138,  4.61539260, -42.66032258,  132.13108234);
  const vec4 kGreenVec4 = vec4(0.09140261,  2.19418839,   4.84296658,  -14.18503333);
  const vec4 kBlueVec4  = vec4(0.10667330, 12.64194608, -60.58204836,  110.36276771);
  const vec2 kRedVec2   = vec2(-152.94239396, 59.28637943);
  const vec2 kGreenVec2 = vec2(   4.27729857,  2.82956604);
  const vec2 kBlueVec2  = vec2( -89.90310912, 27.34824973);

  vec4 v4 = vec4(1.0, t, t * t, t * t * t);
  vec2 v2 = v4.zw * v4.z;

  return vec3(
    dot(v4, kRedVec4)   + dot(v2, kRedVec2),
    dot(v4, kGreenVec4) + dot(v2, kGreenVec2),
    dot(v4, kBlueVec4)  + dot(v2, kBlueVec2)
  );
}

// Scientific Neon Palette (Cyan -> Electric Indigo -> Violet -> Magenta)
vec3 neonColormap(float t, float pointDist) {
  t = clamp(t, 0.0, 1.0);
  vec3 deepBlue = vec3(0.04, 0.25, 0.95);
  vec3 cyan     = vec3(0.13, 0.83, 0.93);
  vec3 violet   = vec3(0.55, 0.15, 0.95);
  vec3 magenta  = vec3(0.98, 0.12, 0.65);

  vec3 col;
  if (t < 0.33) {
    col = mix(deepBlue, cyan, t / 0.33);
  } else if (t < 0.66) {
    col = mix(cyan, violet, (t - 0.33) / 0.33);
  } else {
    col = mix(violet, magenta, (t - 0.66) / 0.34);
  }

  // Core highlight glow in center of point
  float coreGlow = smoothstep(0.4, 0.0, pointDist) * 0.4;
  return col + vec3(coreGlow);
}

void main() {
  // Anti-aliased circular point sprite
  vec2 coord = gl_PointCoord - vec2(0.5);
  float dist = length(coord);
  
  if (dist > 0.5) {
    discard;
  }

  // Soft edge antialiasing for point sprites
  float alpha = smoothstep(0.5, 0.42, dist);

  vec3 finalColor = vColor;

  if (uColorMode == 0) {
    // Original RGB
    finalColor = vColor;
  } else if (uColorMode == 1) {
    // Depth Grayscale
    finalColor = vec3(vDepth);
  } else if (uColorMode == 2) {
    // Scientific Height Visualization
    finalColor = turboColormap(vDepth);
  } else if (uColorMode == 3) {
    // Scientific Neon
    finalColor = neonColormap(vDepth, dist);
  }

  // Ring wireframe effect if wireframe mode enabled
  if (uWireframe) {
    if (dist < 0.3) {
      alpha *= 0.2; // hollow center
    }
  }

  gl_FragColor = vec4(finalColor, alpha);
}
`;
