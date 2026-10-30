// Procedural sample scene generator using HTML5 Canvas API
// Creates an attractive scientific/landscape scene with clear depth stratification:
// Background sky -> Distant mountain peaks -> Midground architecture -> Foreground foliage & geometry

export function createProceduralSampleCanvas(width = 1024, height = 768): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // 1. SKY & ATMOSPHERE (Deep twilight gradient - Far depth)
  const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.6);
  skyGrad.addColorStop(0, '#0F172A');
  skyGrad.addColorStop(0.3, '#1E293B');
  skyGrad.addColorStop(0.7, '#334155');
  skyGrad.addColorStop(1.0, '#F97316'); // Warm horizon glow
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, width, height);

  // Distant celestial body / Sun on horizon
  const sunGrad = ctx.createRadialGradient(width * 0.75, height * 0.42, 5, width * 0.75, height * 0.42, 70);
  sunGrad.addColorStop(0, '#FFFBEB');
  sunGrad.addColorStop(0.2, '#FDE047');
  sunGrad.addColorStop(0.6, '#F97316');
  sunGrad.addColorStop(1, 'rgba(249, 115, 22, 0)');
  ctx.fillStyle = sunGrad;
  ctx.beginPath();
  ctx.arc(width * 0.75, height * 0.42, 70, 0, Math.PI * 2);
  ctx.fill();

  // 2. DISTANT MOUNTAIN RANGES (Far-Mid depth)
  // Layer 1: Furthest mountain silhouette
  ctx.fillStyle = '#1E1B4B';
  ctx.beginPath();
  ctx.moveTo(0, height * 0.52);
  const mountainPoints1 = [
    [0.1, 0.40], [0.22, 0.35], [0.35, 0.45], [0.48, 0.32],
    [0.62, 0.42], [0.73, 0.30], [0.85, 0.44], [1.0, 0.38]
  ];
  for (const pt of mountainPoints1) {
    ctx.lineTo(width * pt[0], height * pt[1]);
  }
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();

  // Layer 2: Closer mountains with snowcaps & lighting
  ctx.fillStyle = '#312E81';
  ctx.beginPath();
  ctx.moveTo(0, height * 0.58);
  const mountainPoints2 = [
    [0.08, 0.45], [0.18, 0.38], [0.28, 0.48], [0.40, 0.36],
    [0.55, 0.49], [0.68, 0.39], [0.82, 0.46], [0.92, 0.41], [1.0, 0.50]
  ];
  for (const pt of mountainPoints2) {
    ctx.lineTo(width * pt[0], height * pt[1]);
  }
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();

  // Snowcaps on peaks
  ctx.fillStyle = '#E0E7FF';
  const peaks = [
    { x: 0.18, y: 0.38 },
    { x: 0.40, y: 0.36 },
    { x: 0.68, y: 0.39 },
    { x: 0.92, y: 0.41 }
  ];
  for (const p of peaks) {
    ctx.beginPath();
    ctx.moveTo(width * p.x, height * p.y);
    ctx.lineTo(width * (p.x - 0.03), height * (p.y + 0.05));
    ctx.lineTo(width * (p.x + 0.03), height * (p.y + 0.05));
    ctx.closePath();
    ctx.fill();
  }

  // 3. MIDGROUND ARCHITECTURE & BUILDINGS (City skyline on water/plateau)
  const cityY = height * 0.54;
  const buildings = [
    { x: 0.12, w: 0.04, h: 0.16, color: '#0F172A' },
    { x: 0.17, w: 0.05, h: 0.22, color: '#1E293B' },
    { x: 0.23, w: 0.03, h: 0.14, color: '#0F172A' },
    { x: 0.27, w: 0.06, h: 0.26, color: '#1E293B', spire: true },
    { x: 0.34, w: 0.04, h: 0.18, color: '#0F172A' },
    { x: 0.39, w: 0.05, h: 0.20, color: '#1E293B' },
    { x: 0.45, w: 0.03, h: 0.12, color: '#0F172A' },
  ];

  for (const b of buildings) {
    const bx = width * b.x;
    const bw = width * b.w;
    const bh = height * b.h;
    const by = cityY - bh + height * 0.08;

    ctx.fillStyle = b.color;
    ctx.fillRect(bx, by, bw, bh);

    // Illuminated windows (sharp contrast for depth)
    ctx.fillStyle = '#FEF08A';
    const rows = 6;
    const cols = 3;
    const winW = bw / (cols * 2);
    const winH = bh / (rows * 2.2);

    for (let r = 1; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if ((r + c) % 2 === 0 || Math.random() > 0.4) {
          ctx.fillRect(
            bx + (c * 2 + 0.5) * winW,
            by + (r * 2) * winH,
            winW * 0.8,
            winH * 0.8
          );
        }
      }
    }

    if (b.spire) {
      ctx.fillStyle = '#38BDF8';
      ctx.beginPath();
      ctx.moveTo(bx + bw * 0.5, by - height * 0.06);
      ctx.lineTo(bx + bw * 0.4, by);
      ctx.lineTo(bx + bw * 0.6, by);
      ctx.closePath();
      ctx.fill();
    }
  }

  // 4. WATER / REFLECTION BASIN (Middle zone)
  const waterGrad = ctx.createLinearGradient(0, height * 0.58, 0, height * 0.72);
  waterGrad.addColorStop(0, '#0284C7');
  waterGrad.addColorStop(0.5, '#0369A1');
  waterGrad.addColorStop(1, '#0C4A6E');
  ctx.fillStyle = waterGrad;
  ctx.fillRect(0, height * 0.58, width, height * 0.16);

  // Water ripples & highlights
  ctx.strokeStyle = 'rgba(224, 242, 254, 0.4)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 18; i++) {
    const ry = height * (0.60 + i * 0.007);
    const rx = width * (0.1 + (i % 7) * 0.12);
    const rw = width * (0.05 + ((i * 3) % 5) * 0.02);
    ctx.beginPath();
    ctx.moveTo(rx, ry);
    ctx.lineTo(rx + rw, ry);
    ctx.stroke();
  }

  // 5. FOREGROUND TERRAIN & ROLLING HILL (Close-Mid depth)
  const hillGrad = ctx.createLinearGradient(0, height * 0.68, 0, height);
  hillGrad.addColorStop(0, '#15803D');
  hillGrad.addColorStop(0.4, '#166534');
  hillGrad.addColorStop(1, '#14532D');
  ctx.fillStyle = hillGrad;
  ctx.beginPath();
  ctx.moveTo(0, height * 0.72);
  ctx.bezierCurveTo(width * 0.3, height * 0.66, width * 0.7, height * 0.74, width, height * 0.68);
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();

  // Trees on the hill (Varying sizes for depth perception)
  const treePositions = [
    { x: 0.05, y: 0.73, scale: 0.9 },
    { x: 0.12, y: 0.71, scale: 1.1 },
    { x: 0.18, y: 0.72, scale: 0.8 },
    { x: 0.52, y: 0.72, scale: 1.0 },
    { x: 0.58, y: 0.70, scale: 1.2 },
    { x: 0.64, y: 0.73, scale: 0.85 },
    { x: 0.88, y: 0.71, scale: 1.15 },
    { x: 0.94, y: 0.74, scale: 0.9 }
  ];

  for (const t of treePositions) {
    const tx = width * t.x;
    const ty = height * t.y;
    const sz = 28 * t.scale;

    // Trunk
    ctx.fillStyle = '#451A03';
    ctx.fillRect(tx - 3 * t.scale, ty, 6 * t.scale, 16 * t.scale);

    // Foliage layers (pine tree cones)
    ctx.fillStyle = '#065F46';
    for (let layer = 0; layer < 3; layer++) {
      ctx.beginPath();
      const ly = ty - layer * (sz * 0.35);
      const lw = sz * (1.0 - layer * 0.22);
      ctx.moveTo(tx, ly - sz * 0.5);
      ctx.lineTo(tx - lw, ly + sz * 0.2);
      ctx.lineTo(tx + lw, ly + sz * 0.2);
      ctx.closePath();
      ctx.fill();
    }
  }

  // 6. IMMEDIATE FOREGROUND OBJECTS (High contrast, closest geometry)
  // Geometric scientific observation pedestal & spherical sensor
  const pedX = width * 0.40;
  const pedY = height * 0.78;
  const pedW = width * 0.20;
  const pedH = height * 0.18;

  // Concrete pedestal
  const pedGrad = ctx.createLinearGradient(pedX, pedY, pedX + pedW, pedY + pedH);
  pedGrad.addColorStop(0, '#E2E8F0');
  pedGrad.addColorStop(0.5, '#94A3B8');
  pedGrad.addColorStop(1, '#475569');
  ctx.fillStyle = pedGrad;
  ctx.beginPath();
  ctx.roundRect(pedX, pedY, pedW, pedH, 8);
  ctx.fill();

  // Pedestal panel lines
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2;
  ctx.strokeRect(pedX + 10, pedY + 10, pedW - 20, pedH - 20);

  // Digital status gauge on pedestal
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(pedX + pedW * 0.2, pedY + pedH * 0.3, pedW * 0.6, pedH * 0.35);
  ctx.fillStyle = '#22D3EE';
  ctx.font = 'bold 16px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('GPU ACTIVE', pedX + pedW * 0.5, pedY + pedH * 0.55);

  // Foreground Sphere floating above pedestal (High luminance & curved depth)
  const sphereX = pedX + pedW * 0.5;
  const sphereY = pedY - height * 0.06;
  const sphereR = 36;
  const sphereGrad = ctx.createRadialGradient(
    sphereX - 10, sphereY - 12, 4,
    sphereX, sphereY, sphereR
  );
  sphereGrad.addColorStop(0, '#FFFFFF');
  sphereGrad.addColorStop(0.4, '#38BDF8');
  sphereGrad.addColorStop(0.8, '#0284C7');
  sphereGrad.addColorStop(1, '#0C4A6E');
  ctx.fillStyle = sphereGrad;
  ctx.beginPath();
  ctx.arc(sphereX, sphereY, sphereR, 0, Math.PI * 2);
  ctx.fill();

  // Scientific ring around sphere
  ctx.strokeStyle = '#F43F5E';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(sphereX, sphereY, sphereR * 1.5, sphereR * 0.45, -0.2, 0, Math.PI * 2);
  ctx.stroke();

  return canvas;
}

// Procedural Synthetic Depth Map matching the sample scene
// Near is white (1.0), Far is black (0.0)
export function createSampleDepthMapCanvas(width = 1024, height = 768): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Background sky: deep black (far, depth ~0.05)
  ctx.fillStyle = '#080808';
  ctx.fillRect(0, 0, width, height);

  // Mountains: dark gray (depth ~0.25 - 0.35)
  ctx.fillStyle = '#404040';
  ctx.beginPath();
  ctx.moveTo(0, height * 0.55);
  ctx.lineTo(width * 0.18, height * 0.38);
  ctx.lineTo(width * 0.40, height * 0.36);
  ctx.lineTo(width * 0.68, height * 0.39);
  ctx.lineTo(width * 0.92, height * 0.41);
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();

  // Buildings & Water: medium gray (depth ~0.45 - 0.55)
  ctx.fillStyle = '#737373';
  ctx.fillRect(0, height * 0.56, width, height * 0.18);

  // Foreground terrain: bright gray (depth ~0.75)
  ctx.fillStyle = '#B0B0B0';
  ctx.beginPath();
  ctx.moveTo(0, height * 0.72);
  ctx.bezierCurveTo(width * 0.3, height * 0.66, width * 0.7, height * 0.74, width, height * 0.68);
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();

  // Pedestal & Sphere: pure white (closest, depth ~0.95 - 1.0)
  const pedX = width * 0.40;
  const pedY = height * 0.78;
  const pedW = width * 0.20;
  const pedH = height * 0.18;
  ctx.fillStyle = '#E4E4E4';
  ctx.beginPath();
  ctx.roundRect(pedX, pedY, pedW, pedH, 8);
  ctx.fill();

  const sphereX = pedX + pedW * 0.5;
  const sphereY = pedY - height * 0.06;
  const sphereGrad = ctx.createRadialGradient(
    sphereX - 5, sphereY - 8, 2,
    sphereX, sphereY, 36
  );
  sphereGrad.addColorStop(0, '#FFFFFF');
  sphereGrad.addColorStop(1, '#D4D4D4');
  ctx.fillStyle = sphereGrad;
  ctx.beginPath();
  ctx.arc(sphereX, sphereY, 36, 0, Math.PI * 2);
  ctx.fill();

  return canvas;
}
