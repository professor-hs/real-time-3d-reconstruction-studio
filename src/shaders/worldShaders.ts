// WebGL2 GLSL Shaders for World Reconstruction (Solid Mesh, Point Cloud, and Wireframe)

export const worldMeshVertexShader = /* glsl */ `
precision highp float;

uniform sampler2D uImage;
uniform sampler2D uDepthMap;
uniform int uDepthMethod;       // 0: Luminance, 1: Contrast, 2: Imported
uniform float uDepthIntensity;  // Z displacement scale
uniform float uContrast;
uniform float uBrightness;
uniform float uEdgeInfluence;
uniform bool uInvertDepth;
uniform vec2 uTexelSize;
uniform float uAspectRatio;

varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec2 vUv;
varying vec3 vColor;
varying float vDepth;

float getLuma(vec3 rgb) {
  return 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
}

float adjustLuma(float luma) {
  float adjusted = (luma - 0.5) * uContrast + 0.5 + (uBrightness - 1.0);
  return clamp(adjusted, 0.0, 1.0);
}

float sampleDisplacement(vec2 coord) {
  if (uDepthMethod == 2) {
    float d = texture2D(uDepthMap, coord).r;
    d = adjustLuma(d);
    if (uInvertDepth) d = 1.0 - d;
    return (d - 0.5) * uDepthIntensity;
  }

  vec3 rgb = texture2D(uImage, coord).rgb;
  float luma = adjustLuma(getLuma(rgb));
  if (uInvertDepth) luma = 1.0 - luma;

  if (uDepthMethod == 1) {
    vec3 cL = texture2D(uImage, coord + vec2(-uTexelSize.x, 0.0)).rgb;
    vec3 cR = texture2D(uImage, coord + vec2( uTexelSize.x, 0.0)).rgb;
    vec3 cD = texture2D(uImage, coord + vec2(0.0, -uTexelSize.y)).rgb;
    vec3 cU = texture2D(uImage, coord + vec2(0.0,  uTexelSize.y)).rgb;

    float lL = adjustLuma(getLuma(cL));
    float lR = adjustLuma(getLuma(cR));
    float lD = adjustLuma(getLuma(cD));
    float lU = adjustLuma(getLuma(cU));

    float edge = sqrt(pow((lR - lL) * 0.5, 2.0) + pow((lU - lD) * 0.5, 2.0));
    float combined = clamp(luma + edge * uEdgeInfluence, 0.0, 1.5);
    return (combined - 0.5) * uDepthIntensity;
  }

  return (luma - 0.5) * uDepthIntensity;
}

void main() {
  vUv = uv;

  // Sample color
  vec4 rawColor = texture2D(uImage, uv);
  vec3 rgbAdjusted = (rawColor.rgb - 0.5) * uContrast + 0.5 + (uBrightness - 1.0);
  vColor = clamp(rgbAdjusted, 0.0, 1.0);

  // Compute Z displacement
  float zDisp = sampleDisplacement(uv);
  vDepth = clamp((zDisp / max(uDepthIntensity, 0.001)) + 0.5, 0.0, 1.0);

  // Calculate dynamic surface normal using finite differences of neighbor displacements
  float zL = sampleDisplacement(uv - vec2(uTexelSize.x, 0.0));
  float zR = sampleDisplacement(uv + vec2(uTexelSize.x, 0.0));
  float zD = sampleDisplacement(uv - vec2(0.0, uTexelSize.y));
  float zU = sampleDisplacement(uv + vec2(0.0, uTexelSize.y));

  vec3 tangentX = vec3(2.0 * uTexelSize.x * uAspectRatio, 0.0, zR - zL);
  vec3 tangentY = vec3(0.0, 2.0 * uTexelSize.y, zU - zD);
  vec3 calcNormal = normalize(cross(tangentX, tangentY));

  vNormal = normalMatrix * calcNormal;

  // Position displacement
  vec3 displacedPos = position;
  if (uAspectRatio >= 1.0) {
    displacedPos.x = position.x * uAspectRatio;
  } else {
    displacedPos.y = position.y / uAspectRatio;
  }
  displacedPos.z = zDisp;

  vec4 mvPosition = modelViewMatrix * vec4(displacedPos, 1.0);
  vViewPosition = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}
`;

export const worldMeshFragmentShader = /* glsl */ `
precision highp float;

uniform int uColorMode; // 0: RGB, 1: Grayscale, 2: Turbo Height, 3: Neon
uniform float uRoughness;
uniform float uMetalness;

varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec2 vUv;
varying vec3 vColor;
varying float vDepth;

vec3 turboColormap(float t) {
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

vec3 neonColormap(float t) {
  vec3 deepBlue = vec3(0.04, 0.25, 0.95);
  vec3 cyan     = vec3(0.13, 0.83, 0.93);
  vec3 violet   = vec3(0.55, 0.15, 0.95);
  vec3 magenta  = vec3(0.98, 0.12, 0.65);

  if (t < 0.33) return mix(deepBlue, cyan, t / 0.33);
  if (t < 0.66) return mix(cyan, violet, (t - 0.33) / 0.33);
  return mix(violet, magenta, (t - 0.66) / 0.34);
}

void main() {
  vec3 baseColor = vColor;
  if (uColorMode == 1) {
    baseColor = vec3(vDepth);
  } else if (uColorMode == 2) {
    baseColor = turboColormap(vDepth);
  } else if (uColorMode == 3) {
    baseColor = neonColormap(vDepth);
  }

  // Directional illumination
  vec3 normal = normalize(vNormal);
  vec3 lightDir1 = normalize(vec3(0.5, 0.8, 1.0));
  vec3 lightDir2 = normalize(vec3(-0.6, -0.4, 0.5));
  vec3 viewDir = normalize(vViewPosition);

  // Diffuse
  float diff1 = max(dot(normal, lightDir1), 0.0);
  float diff2 = max(dot(normal, lightDir2), 0.0) * 0.4;
  vec3 diffuse = baseColor * (diff1 * 0.85 + diff2 + 0.35); // with ambient

  // Specular Blinn-Phong
  vec3 halfDir = normalize(lightDir1 + viewDir);
  float specAngle = max(dot(normal, halfDir), 0.0);
  float specular = pow(specAngle, 32.0) * (1.0 - uRoughness) * 0.4;

  vec3 finalColor = diffuse + vec3(specular);
  gl_FragColor = vec4(clamp(finalColor, 0.0, 1.0), 1.0);
}
`;

export const worldPointVertexShader = /* glsl */ `
precision highp float;

uniform sampler2D uImage;
uniform sampler2D uDepthMap;
uniform int uDepthMethod;
uniform float uDepthIntensity;
uniform float uContrast;
uniform float uBrightness;
uniform float uEdgeInfluence;
uniform bool uInvertDepth;
uniform vec2 uTexelSize;
uniform float uPointSize;
uniform float uAspectRatio;

varying vec3 vColor;
varying float vDepth;
varying vec2 vUv;

float getLuma(vec3 rgb) {
  return 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
}

float adjustLuma(float luma) {
  float adjusted = (luma - 0.5) * uContrast + 0.5 + (uBrightness - 1.0);
  return clamp(adjusted, 0.0, 1.0);
}

void main() {
  vUv = uv;
  vec4 raw = texture2D(uImage, uv);
  vec3 rgbAdjusted = (raw.rgb - 0.5) * uContrast + 0.5 + (uBrightness - 1.0);
  vColor = clamp(rgbAdjusted, 0.0, 1.0);

  float zDisp = 0.0;
  if (uDepthMethod == 2) {
    float d = texture2D(uDepthMap, uv).r;
    d = adjustLuma(d);
    if (uInvertDepth) d = 1.0 - d;
    zDisp = (d - 0.5) * uDepthIntensity;
  } else {
    float luma = adjustLuma(getLuma(raw.rgb));
    if (uInvertDepth) luma = 1.0 - luma;

    if (uDepthMethod == 1) {
      vec3 cL = texture2D(uImage, uv + vec2(-uTexelSize.x, 0.0)).rgb;
      vec3 cR = texture2D(uImage, uv + vec2( uTexelSize.x, 0.0)).rgb;
      vec3 cD = texture2D(uImage, uv + vec2(0.0, -uTexelSize.y)).rgb;
      vec3 cU = texture2D(uImage, uv + vec2(0.0,  uTexelSize.y)).rgb;
      float edge = sqrt(pow((adjustLuma(getLuma(cR)) - adjustLuma(getLuma(cL))) * 0.5, 2.0) +
                        pow((adjustLuma(getLuma(cU)) - adjustLuma(getLuma(cD))) * 0.5, 2.0));
      zDisp = (clamp(luma + edge * uEdgeInfluence, 0.0, 1.5) - 0.5) * uDepthIntensity;
    } else {
      zDisp = (luma - 0.5) * uDepthIntensity;
    }
  }

  vDepth = clamp((zDisp / max(uDepthIntensity, 0.001)) + 0.5, 0.0, 1.0);

  vec3 pos = position;
  if (uAspectRatio >= 1.0) pos.x *= uAspectRatio;
  else pos.y /= uAspectRatio;
  pos.z = zDisp;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  float distScale = clamp(350.0 / -mvPosition.z, 0.5, 4.0);
  gl_PointSize = clamp(uPointSize * distScale, 1.0, 64.0);
}
`;

export const worldPointFragmentShader = /* glsl */ `
precision highp float;

uniform int uColorMode;
varying vec3 vColor;
varying float vDepth;
varying vec2 vUv;

vec3 turboColormap(float t) {
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

void main() {
  vec2 coord = gl_PointCoord - vec2(0.5);
  float dist = length(coord);
  if (dist > 0.5) discard;
  float alpha = smoothstep(0.5, 0.42, dist);

  vec3 col = vColor;
  if (uColorMode == 1) col = vec3(vDepth);
  else if (uColorMode == 2) col = turboColormap(vDepth);
  else if (uColorMode == 3) col = mix(vec3(0.04, 0.7, 0.95), vec3(0.95, 0.1, 0.6), vDepth) + smoothstep(0.4, 0.0, dist) * 0.3;

  gl_FragColor = vec4(col, alpha);
}
`;
