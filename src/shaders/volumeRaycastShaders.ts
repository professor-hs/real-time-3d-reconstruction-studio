// WebGL2 GLSL Volume Ray-Casting Shaders for 3D Medical Imaging
// Supports: Direct Volume Rendering (DVR), Maximum Intensity Projection (MIP),
// Minimum Intensity Projection (MinIP), and Average Intensity Projection (AvgIP).

export const volumeRaycastVertexShader = /* glsl */ `
precision highp float;

varying vec3 vModelPosition;
varying vec3 vWorldPosition;
varying vec3 vCameraPositionModel;

void main() {
  // Model position is inside [0, 1]^3
  vModelPosition = position + vec3(0.5); // unit box centered at (0,0,0) -> shifted to [0,1]
  
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;

  // Transform camera position into model space for ray generation
  vCameraPositionModel = (inverse(modelMatrix) * vec4(cameraPosition, 1.0)).xyz + vec3(0.5);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const volumeRaycastFragmentShader = /* glsl */ `
#version 300 es
precision highp float;
precision highp sampler3D;

uniform sampler3D uVolume;
uniform int uRenderMode;         // 0: DVR, 1: MIP, 2: MinIP, 3: AvgIP
uniform float uWindowCenter;     // HU Level
uniform float uWindowWidth;      // HU Width
uniform float uOpacity;          // Global opacity multiplier
uniform float uStepSize;         // Ray marching step size (e.g. 0.003)
uniform float uBrightness;       // Brightness gain
uniform vec3 uVoxelSpacing;      // Anisotropic spacing adjustment

in vec3 vModelPosition;
in vec3 vWorldPosition;
in vec3 vCameraPositionModel;

out vec4 fragColor;

// Intersect ray with unit cube [0, 1]^3 using Slab method
bool intersectBox(vec3 rayOrig, vec3 rayDir, out float tNear, out float tFar) {
  vec3 boxMin = vec3(0.0);
  vec3 boxMax = vec3(1.0);
  vec3 invDir = 1.0 / rayDir;
  vec3 t0 = (boxMin - rayOrig) * invDir;
  vec3 t1 = (boxMax - rayOrig) * invDir;

  vec3 tMin = min(t0, t1);
  vec3 tMax = max(t0, t1);

  tNear = max(max(tMin.x, tMin.y), tMin.z);
  tFar  = min(min(tMax.x, tMax.y), tMax.z);

  return tNear <= tFar && tFar > 0.0;
}

// Compute 3D central difference gradient for surface lighting
vec3 computeGradient(vec3 pos, float delta) {
  float dx = texture(uVolume, pos + vec3(delta, 0.0, 0.0)).r - texture(uVolume, pos - vec3(delta, 0.0, 0.0)).r;
  float dy = texture(uVolume, pos + vec3(0.0, delta, 0.0)).r - texture(uVolume, pos - vec3(0.0, delta, 0.0)).r;
  float dz = texture(uVolume, pos + vec3(0.0, 0.0, delta)).r - texture(uVolume, pos - vec3(0.0, 0.0, delta)).r;
  return -normalize(vec3(dx, dy, dz) + vec3(0.0001));
}

// Medical transfer function for Direct Volume Rendering (DVR)
vec4 applyTransferFunction(float intensity, vec3 normal, vec3 viewDir) {
  // Intensity is normalized in [0, 1]
  vec3 color = vec3(0.0);
  float alpha = 0.0;

  if (intensity < 0.15) {
    // Air / background
    alpha = 0.0;
  } else if (intensity < 0.40) {
    // Soft tissue / Brain gray & white matter
    float t = (intensity - 0.15) / 0.25;
    color = mix(vec3(0.75, 0.45, 0.35), vec3(0.9, 0.7, 0.6), t);
    alpha = pow(t, 2.0) * 0.18 * uOpacity;
  } else if (intensity < 0.70) {
    // Cartilage / Vessels / High soft tissue
    float t = (intensity - 0.40) / 0.30;
    color = mix(vec3(0.9, 0.7, 0.6), vec3(0.85, 0.2, 0.2), t);
    alpha = (0.2 + t * 0.4) * uOpacity;
  } else {
    // Cortical bone / High-density structures
    float t = (intensity - 0.70) / 0.30;
    color = mix(vec3(0.95, 0.9, 0.8), vec3(1.0, 1.0, 1.0), t);
    alpha = (0.6 + t * 0.4) * uOpacity;
  }

  // Phong lighting using gradient normal
  if (alpha > 0.01 && length(normal) > 0.1) {
    vec3 lightDir = normalize(vec3(0.6, 0.8, 1.0));
    float diff = max(dot(normal, lightDir), 0.0);
    vec3 halfVec = normalize(lightDir + viewDir);
    float spec = pow(max(dot(normal, halfVec), 0.0), 16.0) * 0.3;
    color = color * (diff * 0.7 + 0.3) + vec3(spec);
  }

  return vec4(color * uBrightness, alpha);
}

void main() {
  vec3 rayDir = normalize(vModelPosition - vCameraPositionModel);
  vec3 rayOrig = vCameraPositionModel;

  float tNear, tFar;
  if (!intersectBox(rayOrig, rayDir, tNear, tFar)) {
    discard;
  }

  tNear = max(tNear, 0.0);
  vec3 startPos = rayOrig + rayDir * tNear;
  float totalDist = tFar - tNear;
  int numSteps = int(totalDist / uStepSize);
  numSteps = clamp(numSteps, 10, 450); // Balance performance & quality

  vec3 stepVec = rayDir * uStepSize;
  vec3 currentPos = startPos;

  if (uRenderMode == 0) {
    // -------------------------------------------------------------
    // MODE 0: DIRECT VOLUME RENDERING (DVR) - Front-to-back compositing
    // -------------------------------------------------------------
    vec4 accumColor = vec4(0.0);
    float gradDelta = uStepSize * 1.5;

    for (int i = 0; i < numSteps; i++) {
      if (accumColor.a >= 0.98) break; // Early ray termination

      float rawVal = texture(uVolume, currentPos).r;
      // Window / Level mapping
      float normVal = clamp((rawVal - (uWindowCenter - uWindowWidth * 0.5)) / uWindowWidth, 0.0, 1.0);

      if (normVal > 0.05) {
        vec3 grad = computeGradient(currentPos, gradDelta);
        vec4 sampleColor = applyTransferFunction(normVal, grad, -rayDir);

        // Front-to-back opacity accumulation
        accumColor.rgb += (1.0 - accumColor.a) * sampleColor.rgb * sampleColor.a;
        accumColor.a   += (1.0 - accumColor.a) * sampleColor.a;
      }

      currentPos += stepVec;
    }

    if (accumColor.a < 0.01) discard;
    fragColor = vec4(accumColor.rgb, accumColor.a);

  } else if (uRenderMode == 1) {
    // -------------------------------------------------------------
    // MODE 1: MAXIMUM INTENSITY PROJECTION (MIP)
    // -------------------------------------------------------------
    float maxVal = 0.0;
    for (int i = 0; i < numSteps; i++) {
      float rawVal = texture(uVolume, currentPos).r;
      float normVal = clamp((rawVal - (uWindowCenter - uWindowWidth * 0.5)) / uWindowWidth, 0.0, 1.0);
      maxVal = max(maxVal, normVal);
      currentPos += stepVec;
    }

    if (maxVal < 0.02) discard;
    vec3 col = vec3(maxVal * uBrightness);
    fragColor = vec4(col, min(1.0, maxVal * uOpacity * 1.5));

  } else if (uRenderMode == 2) {
    // -------------------------------------------------------------
    // MODE 2: MINIMUM INTENSITY PROJECTION (MinIP)
    // -------------------------------------------------------------
    float minVal = 1.0;
    bool found = false;

    for (int i = 0; i < numSteps; i++) {
      float rawVal = texture(uVolume, currentPos).r;
      float normVal = clamp((rawVal - (uWindowCenter - uWindowWidth * 0.5)) / uWindowWidth, 0.0, 1.0);
      if (normVal > 0.02) {
        minVal = min(minVal, normVal);
        found = true;
      }
      currentPos += stepVec;
    }

    if (!found) discard;
    // Invert display for airway/cavity contrast
    float disp = (1.0 - minVal) * uBrightness;
    fragColor = vec4(vec3(disp), uOpacity);

  } else if (uRenderMode == 3) {
    // -------------------------------------------------------------
    // MODE 3: AVERAGE INTENSITY PROJECTION (AvgIP - Digitally Reconstructed Radiograph)
    // -------------------------------------------------------------
    float sumVal = 0.0;
    int count = 0;

    for (int i = 0; i < numSteps; i++) {
      float rawVal = texture(uVolume, currentPos).r;
      float normVal = clamp((rawVal - (uWindowCenter - uWindowWidth * 0.5)) / uWindowWidth, 0.0, 1.0);
      sumVal += normVal;
      count++;
      currentPos += stepVec;
    }

    float avg = count > 0 ? (sumVal / float(count)) * 2.5 * uBrightness : 0.0;
    if (avg < 0.01) discard;
    fragColor = vec4(vec3(avg), min(1.0, avg * uOpacity));
  }
}
`;
