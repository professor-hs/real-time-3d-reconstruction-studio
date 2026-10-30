import math
import os
from PIL import Image, ImageDraw

os.makedirs("public/samples", exist_ok=True)

# -----------------------------------------------------------------------------
# 1. ALPINE LANDSCAPE (1024 x 768) + MATCHING GROUND-TRUTH DEPTH MAP
# -----------------------------------------------------------------------------
W, H = 1024, 768

img_rgb = Image.new("RGB", (W, H))
draw_rgb = ImageDraw.Draw(img_rgb)

img_depth = Image.new("L", (W, H))
draw_depth = ImageDraw.Draw(img_depth)

# Sky Gradient (Deep twilight sky -> Warm horizon)
for y in range(H):
    t = y / H
    d_val = int(15 + t * 20)
    draw_depth.line([(0, y), (W, y)], fill=d_val)

    if t < 0.6:
        st = t / 0.6
        r = int(15 * (1 - st) + 249 * st)
        g = int(23 * (1 - st) + 115 * st)
        b = int(42 * (1 - st) + 22 * st)
    else:
        st = (t - 0.6) / 0.4
        r = int(249 * (1 - st) + 14 * st)
        g = int(115 * (1 - st) + 74 * st)
        b = int(22 * (1 - st) + 110 * st)
    draw_rgb.line([(0, y), (W, y)], fill=(r, g, b))

# Sun on horizon
sun_x, sun_y = int(W * 0.78), int(H * 0.42)
for r in range(65, 0, -1):
    alpha = 1.0 - (r / 65.0)
    col = (255, int(220 * alpha + 180 * (1 - alpha)), int(100 * alpha + 30 * (1 - alpha)))
    draw_rgb.ellipse([sun_x - r, sun_y - r, sun_x + r, sun_y + r], fill=col)
    draw_depth.ellipse([sun_x - r, sun_y - r, sun_x + r, sun_y + r], fill=25)

# Mountain Range 1 (Far background: Depth ~ 60)
pts_m1 = [(0, int(H * 0.52))]
depth_m1 = [(0, int(H * 0.52))]
m1_data = [(0.12, 0.38), (0.24, 0.34), (0.38, 0.44), (0.50, 0.31), (0.64, 0.41), (0.75, 0.28), (0.88, 0.42), (1.0, 0.36)]
for px, py in m1_data:
    pts_m1.append((int(W * px), int(H * py)))
    depth_m1.append((int(W * px), int(H * py)))
pts_m1.extend([(W, H), (0, H)])
depth_m1.extend([(W, H), (0, H)])
draw_rgb.polygon(pts_m1, fill=(35, 30, 85))
draw_depth.polygon(depth_m1, fill=60)

# Mountain Range 2 (Mid-distance: Depth ~ 95)
pts_m2 = [(0, int(H * 0.58))]
depth_m2 = [(0, int(H * 0.58))]
m2_data = [(0.09, 0.45), (0.20, 0.37), (0.32, 0.47), (0.44, 0.35), (0.58, 0.48), (0.70, 0.38), (0.84, 0.45), (0.94, 0.40), (1.0, 0.49)]
for px, py in m2_data:
    pts_m2.append((int(W * px), int(H * py)))
    depth_m2.append((int(W * px), int(H * py)))
pts_m2.extend([(W, H), (0, H)])
depth_m2.extend([(W, H), (0, H)])
draw_rgb.polygon(pts_m2, fill=(50, 48, 125))
draw_depth.polygon(depth_m2, fill=95)

# Snowcaps on peaks
for px, py in [(0.20, 0.37), (0.44, 0.35), (0.70, 0.38), (0.94, 0.40)]:
    sx, sy = int(W * px), int(H * py)
    draw_rgb.polygon([(sx, sy), (sx - 25, sy + 35), (sx + 25, sy + 35)], fill=(230, 235, 255))
    draw_depth.polygon([(sx, sy), (sx - 25, sy + 35), (sx + 25, sy + 35)], fill=100)

# Cityscape / Buildings (Depth ~ 140)
buildings = [
    (0.12, 0.04, 0.16, (15, 23, 42)),
    (0.17, 0.05, 0.22, (30, 41, 59)),
    (0.23, 0.03, 0.14, (15, 23, 42)),
    (0.27, 0.06, 0.26, (30, 41, 59)),
    (0.34, 0.04, 0.18, (15, 23, 42)),
    (0.39, 0.05, 0.20, (30, 41, 59)),
    (0.45, 0.03, 0.12, (15, 23, 42)),
]
city_y = int(H * 0.58)
for bx_f, bw_f, bh_f, col in buildings:
    bx = int(W * bx_f)
    bw = int(W * bw_f)
    bh = int(H * bh_f)
    by = city_y - bh + int(H * 0.05)
    draw_rgb.rectangle([bx, by, bx + bw, city_y], fill=col)
    draw_depth.rectangle([bx, by, bx + bw, city_y], fill=140)

    # Windows
    for r in range(1, 6):
        for c in range(1, 3):
            wx = bx + int(c * bw * 0.32)
            wy = by + int(r * bh * 0.15)
            draw_rgb.rectangle([wx, wy, wx + 6, wy + 8], fill=(254, 240, 138))
            draw_depth.rectangle([wx, wy, wx + 6, wy + 8], fill=142)

# Water Basin (Depth ~ 160)
draw_rgb.rectangle([0, int(H * 0.58), W, int(H * 0.72)], fill=(3, 105, 161))
draw_depth.rectangle([0, int(H * 0.58), W, int(H * 0.72)], fill=160)

# Rolling Green Hills (Depth ~ 195)
draw_rgb.polygon([(0, int(H * 0.72)), (int(W * 0.35), int(H * 0.67)), (int(W * 0.75), int(H * 0.73)), (W, int(H * 0.68)), (W, H), (0, H)], fill=(22, 101, 52))
draw_depth.polygon([(0, int(H * 0.72)), (int(W * 0.35), int(H * 0.67)), (int(W * 0.75), int(H * 0.73)), (W, int(H * 0.68)), (W, H), (0, H)], fill=195)

# Pine Trees (Depth ~ 210)
for tx_f, ty_f, sc in [(0.06, 0.73, 1.0), (0.15, 0.71, 1.2), (0.55, 0.71, 1.1), (0.65, 0.73, 0.9), (0.90, 0.72, 1.2)]:
    tx, ty = int(W * tx_f), int(H * ty_f)
    draw_rgb.rectangle([tx - 4, ty, tx + 4, ty + 18], fill=(69, 26, 3))
    draw_depth.rectangle([tx - 4, ty, tx + 4, ty + 18], fill=210)
    for lyr in range(3):
        ly = ty - int(lyr * 18 * sc)
        lw = int((30 - lyr * 6) * sc)
        draw_rgb.polygon([(tx, ly - int(18 * sc)), (tx - lw, ly + int(8 * sc)), (tx + lw, ly + int(8 * sc))], fill=(6, 95, 70))
        draw_depth.polygon([(tx, ly - int(18 * sc)), (tx - lw, ly + int(8 * sc)), (tx + lw, ly + int(8 * sc))], fill=215)

# High-Contrast Foreground Pedestal and Spherical Sensor (Depth ~ 250)
ped_x = int(W * 0.38)
ped_y = int(H * 0.76)
ped_w = int(W * 0.24)
ped_h = int(H * 0.22)
draw_rgb.rounded_rectangle([ped_x, ped_y, ped_x + ped_w, ped_y + ped_h], radius=12, fill=(148, 163, 184), outline=(51, 65, 85), width=3)
draw_depth.rounded_rectangle([ped_x, ped_y, ped_x + ped_w, ped_y + ped_h], radius=12, fill=245)

# Spherical Orb on Pedestal
orb_x = ped_x + ped_w // 2
orb_y = ped_y - 38
orb_r = 44
for r in range(orb_r, 0, -1):
    ratio = r / orb_r
    col = (int(56 * (1 - ratio) + 255 * ratio), int(189 * (1 - ratio) + 255 * ratio), int(248 * (1 - ratio) + 255 * ratio))
    draw_rgb.ellipse([orb_x - r, orb_y - r, orb_x + r, orb_y + r], fill=col)
    d_orb = int(225 + (1.0 - ratio) * 30)
    draw_depth.ellipse([orb_x - r, orb_y - r, orb_x + r, orb_y + r], fill=d_orb)

img_rgb.save("public/samples/alpine_landscape.png")
img_depth.save("public/samples/alpine_depth_map.png")
print("Saved alpine_landscape.png & alpine_depth_map.png")

# -----------------------------------------------------------------------------
# 2. MULTI-VIEW ARCHITECTURAL PAIR (TEMPLE VIEW A & B WITH BASELINE DISPARITY)
# -----------------------------------------------------------------------------
MW, MH = 800, 600

def draw_temple(offset_x=0):
    img = Image.new("RGB", (MW, MH), (15, 23, 42))
    d = ImageDraw.Draw(img)

    for y in range(int(MH * 0.6)):
        t = y / (MH * 0.6)
        d.line([(0, y), (MW, y)], fill=(int(20 + t * 40), int(35 + t * 50), int(70 + t * 80)))

    d.polygon([(0, int(MH * 0.7)), (MW, int(MH * 0.7)), (MW, MH), (0, MH)], fill=(71, 85, 105))

    roof_x = int(MW * 0.5) + offset_x
    d.polygon([(roof_x, int(MH * 0.20)), (roof_x - 280, int(MH * 0.35)), (roof_x + 280, int(MH * 0.35))], fill=(226, 232, 240), outline=(30, 41, 59), width=3)
    d.rectangle([roof_x - 290, int(MH * 0.35), roof_x + 290, int(MH * 0.38)], fill=(203, 213, 225), outline=(30, 41, 59), width=2)

    for c in range(6):
        cx = roof_x - 250 + c * 100
        d.rectangle([cx - 16, int(MH * 0.38), cx + 16, int(MH * 0.70)], fill=(241, 245, 249), outline=(100, 116, 139), width=2)
        d.line([(cx - 8, int(MH * 0.38)), (cx - 8, int(MH * 0.70))], fill=(148, 163, 184), width=2)
        d.line([(cx + 8, int(MH * 0.38)), (cx + 8, int(MH * 0.70))], fill=(148, 163, 184), width=2)
        d.rectangle([cx - 24, int(MH * 0.38), cx + 24, int(MH * 0.40)], fill=(203, 213, 225))
        d.rectangle([cx - 24, int(MH * 0.68), cx + 24, int(MH * 0.70)], fill=(203, 213, 225))

    statue_x = int(MW * 0.5) + int(offset_x * 1.8)
    statue_y = int(MH * 0.72)
    d.rectangle([statue_x - 30, statue_y, statue_x + 30, statue_y + 80], fill=(148, 163, 184), outline=(30, 41, 59), width=2)
    d.ellipse([statue_x - 36, statue_y - 70, statue_x + 36, statue_y + 2], fill=(248, 250, 252), outline=(51, 65, 85), width=2)

    return img

img_viewA = draw_temple(offset_x=-25)
img_viewB = draw_temple(offset_x=+25)
img_viewA.save("public/samples/temple_view_left.png")
img_viewB.save("public/samples/temple_view_right.png")
print("Saved temple_view_left.png & temple_view_right.png")

# -----------------------------------------------------------------------------
# 3. HIGH-CONTRAST 3D GEOMETRIC RELIEF SCULPTURE (800 x 800)
# -----------------------------------------------------------------------------
SW, SH = 800, 800
img_sculpt = Image.new("RGB", (SW, SH), (17, 24, 39))
draw_s = ImageDraw.Draw(img_sculpt)

center_x, center_y = SW // 2, SH // 2
for step in range(8, 0, -1):
    size = step * 45
    intensity = int(40 + (8 - step) * 24)
    angle = step * 0.12
    cos_a = math.cos(angle)
    sin_a = math.sin(angle)
    pts = []
    for ox, oy in [(-size, -size), (size, -size), (size, size), (-size, size)]:
        rx = center_x + int(ox * cos_a - oy * sin_a)
        ry = center_y + int(ox * sin_a + oy * cos_a)
        pts.append((rx, ry))
    draw_s.polygon(pts, fill=(intensity, int(intensity * 1.05), int(intensity * 1.15)), outline=(30, 41, 59), width=2)

sph_r = 75
for r in range(sph_r, 0, -1):
    factor = 1.0 - (r / sph_r)
    col = (
        int(34 * (1 - factor) + 255 * factor),
        int(211 * (1 - factor) + 255 * factor),
        int(238 * (1 - factor) + 255 * factor),
    )
    draw_s.ellipse([center_x - r, center_y - r, center_x + r, center_y + r], fill=col)

img_sculpt.save("public/samples/relief_sculpture.png")
print("Saved relief_sculpture.png")

# -----------------------------------------------------------------------------
# 4. MEDICAL CT BRAIN AXIAL SLICE (512 x 512)
# -----------------------------------------------------------------------------
CW, CH = 512, 512
img_ct = Image.new("RGB", (CW, CH), (0, 0, 0))
draw_ct = ImageDraw.Draw(img_ct)

cx, cy = CW // 2, CH // 2
rx, ry = int(CW * 0.42), int(CH * 0.38)

draw_ct.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=(245, 245, 245))
draw_ct.ellipse([cx - (rx - 16), cy - (ry - 14), cx + (rx - 16), cy + (ry - 14)], fill=(45, 45, 45))
draw_ct.ellipse([cx - (rx - 20), cy - (ry - 18), cx + (rx - 20), cy + (ry - 18)], fill=(85, 85, 85))
draw_ct.ellipse([cx - int(rx * 0.7), cy - int(ry * 0.7), cx + int(rx * 0.7), cy + int(ry * 0.7)], fill=(65, 65, 65))
draw_ct.polygon([(cx - 40, cy - 35), (cx - 15, cy - 20), (cx - 15, cy + 30), (cx - 35, cy + 10)], fill=(12, 12, 12))
draw_ct.polygon([(cx + 40, cy - 35), (cx + 15, cy - 20), (cx + 15, cy + 30), (cx + 35, cy + 10)], fill=(12, 12, 12))
draw_ct.ellipse([cx + 55, cy + 25, cx + 115, cy + 85], fill=(210, 210, 210))
draw_ct.ellipse([cx + 48, cy + 18, cx + 122, cy + 92], outline=(38, 38, 38), width=3)

img_ct.save("public/samples/brain_ct_slice.png")
print("Saved brain_ct_slice.png")
