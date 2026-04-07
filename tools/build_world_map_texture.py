#!/usr/bin/env python3
"""
Build Assets/WorldMap/full_map_texture.png (terrain, no labels) and full_map_labels.png (region names only).

Baseline v2.3: world map layout is complete; this script is the source for the full-grid painted texture.

Painterly fantasy style (hand-painted reference palette): deeper seas, muted parchment, NW light,
multi-scale luminance noise, organic biome blends, soft ink + symbols.

Regenerate after changing world_map_data.js or biome colors (keep BIOME_HEX in sync with config.js).

Run: py -3.11 tools/build_world_map_texture.py
"""

from __future__ import annotations

import json
import math
import os
import random
import re
import sys
import urllib.request
from pathlib import Path

try:
    from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageFont
except ImportError:
    print("Install Pillow: pip install pillow", file=sys.stderr)
    sys.exit(1)

# Must match config.js worldMap.biomes order (epic hand-painted legend palette).
BIOME_HEX = [
    "#1E6F86",
    "#2F6F9E",
    "#7A1F14",
    "#C7D8E8",
    "#9E4A4A",
    "#14232F",
    "#1C5F78",
    "#E6C48A",
    "#1F4F1F",
    "#6DA544",
    "#A63A1F",
    "#6E6A64",
    "#4B4B4F",
    "#D2A26B",
    "#8FB7D1",
    "#E8EEF2",
    "#E6C48A",
]

# Must match config.js worldMap.biomes[].name order.
BIOME_NAMES = [
    "World's Belt",
    "North Titan",
    "South Titan",
    "North Titan's Shield",
    "South Titan's Sword",
    "The World's End",
    "Tears of God",
    "Paradise South",
    "Heart of Gaia",
    "Skin of Gaia",
    "Hatred of the World",
    "The held breath",
    "Aftermath of War",
    "The misery of life",
    "The apathy of the World",
    "Innocence of North",
    "Paradise North",
]

# Cinzel (SIL OFL) — roman capitals, medieval fantasy map feel.
CINZEL_URL = "https://raw.githubusercontent.com/google/fonts/main/ofl/cinzel/Cinzel%5Bwght%5D.ttf"


def hex_to_rgb(h: str) -> tuple[int, int, int]:
    h = h.strip().lstrip("#")
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def parse_world_map(root: Path) -> tuple[int, int, list[int]]:
    p = root / "world_map_data.js"
    text = p.read_text(encoding="utf-8")
    mw = re.search(r"const\s+WIDTH\s*=\s*(\d+)", text)
    mh = re.search(r"const\s+HEIGHT\s*=\s*(\d+)", text)
    w = int(mw.group(1)) if mw else 50
    h = int(mh.group(1)) if mh else 100
    i0 = text.index("new Uint8Array([")
    i1 = text.index("])", i0)
    inner = text[i0 + len("new Uint8Array([") : i1]
    arr = [int(x) for x in inner.replace("\n", " ").replace("\r", "").split(",") if x.strip()]
    if len(arr) < w * h:
        raise SystemExit(f"Expected {w*h} biome indices, got {len(arr)}")
    return w, h, arr[: w * h]


def parse_city_names_from_world_map_js(root: Path) -> dict[tuple[int, int], str]:
    """Read CITY_NAMES from world_map_data.js (export_world_map.py)."""
    p = root / "world_map_data.js"
    if not p.is_file():
        return {}
    text = p.read_text(encoding="utf-8")
    m = re.search(r"const\s+CITY_NAMES\s*=\s*(\{[^;]*\})\s*;", text, re.DOTALL)
    if not m:
        return {}
    try:
        obj = json.loads(m.group(1))
    except json.JSONDecodeError:
        return {}
    out: dict[tuple[int, int], str] = {}
    for k, v in obj.items():
        if not isinstance(v, str) or not v.strip():
            continue
        parts = str(k).split(",")
        if len(parts) != 2:
            continue
        try:
            x, y = int(parts[0].strip()), int(parts[1].strip())
        except ValueError:
            continue
        out[(x, y)] = v.strip()
    return out


def cluster_city_icon_centers(
    cities: dict[tuple[int, int], str],
    grid_w: int,
    grid_h: int,
    bi: list[int],
    cw: int,
    ch: int,
) -> list[tuple[float, float, int]]:
    """One icon per 4-connected region of cells sharing the same city name (e.g. 2×2 blocks)."""
    if not cities:
        return []
    cellset = set(cities.keys())
    visited: set[tuple[int, int]] = set()
    out: list[tuple[float, float, int]] = []
    for start in cities.keys():
        if start in visited:
            continue
        name = cities[start]
        comp: list[tuple[int, int]] = []
        stack = [start]
        visited.add(start)
        while stack:
            x, y = stack.pop()
            if cities.get((x, y)) != name:
                continue
            comp.append((x, y))
            for dx, dy in ((0, 1), (0, -1), (1, 0), (-1, 0)):
                nx, ny = x + dx, y + dy
                if (nx, ny) in cellset and (nx, ny) not in visited and cities.get((nx, ny)) == name:
                    visited.add((nx, ny))
                    stack.append((nx, ny))
        ax = sum(p[0] for p in comp) / len(comp)
        ay = sum(p[1] for p in comp) / len(comp)
        cx = ax * cw + cw / 2
        cy = ay * ch + ch / 2
        xi = int(max(0, min(grid_w - 1, round(ax))))
        yi = int(max(0, min(grid_h - 1, round(ay))))
        bidx = bi[yi * grid_w + xi]
        out.append((cx, cy, bidx))
    return out


def draw_medieval_city_icon(
    draw: ImageDraw.ImageDraw,
    cx: float,
    cy: float,
    cw: int,
    ch: int,
    rng: random.Random,
    biome: int,
) -> None:
    """Cartographic settlement — same footprint as before, 'walled town + donjon' ink style."""
    w = max(9.0, cw * 0.62)
    h = max(9.0, ch * 0.88)
    ink = (32, 22, 14, 255)
    ink_soft = (48, 38, 28, 220)
    wall_fill = (228, 210, 175, 200)
    tower_fill = (210, 188, 148, 220)
    halo = (20, 14, 10, 100)
    if biome in (11, 10):  # hatred, held breath — darker
        ink = (42, 20, 14, 255)
        ink_soft = (62, 38, 28, 220)
        wall_fill = (200, 175, 155, 200)
    elif biome in (14, 6):  # apathy, tears
        ink = (22, 30, 38, 255)
        ink_soft = (38, 48, 56, 215)
        wall_fill = (185, 195, 205, 195)
    elif biome in (8, 16, 7):  # paradise tones
        ink = (48, 34, 20, 255)
        ink_soft = (68, 52, 36, 215)
        wall_fill = (235, 218, 185, 205)
    elif biome in (9,):  # gaia
        ink = (24, 36, 22, 255)
        ink_soft = (40, 58, 34, 215)
        wall_fill = (200, 215, 185, 200)
    elif biome == 13:
        ink = (58, 42, 14, 255)
        ink_soft = (78, 58, 28, 215)
        wall_fill = (225, 205, 155, 200)
    elif biome == 12:
        ink = (34, 34, 34, 255)
        ink_soft = (56, 56, 56, 215)
        wall_fill = (200, 200, 200, 195)
    elif biome == 15:
        ink = (40, 36, 44, 255)
        ink_soft = (58, 54, 64, 215)
        wall_fill = (210, 205, 215, 200)

    x0, y0 = cx - w, cy - h * 0.35
    x1, y1 = cx + w, cy + h * 0.48
    tw = w * 0.36
    top_y = y0 - h * 0.5
    # Soft ground halo (unchanged size)
    draw.ellipse([cx - w - 5, cy - h * 0.55, cx + w + 5, cy + h * 0.62], fill=halo)
    # Round corner bastions
    bt = w * 0.26
    for sx in (-1, 1):
        ox = cx + sx * (w * 0.72)
        draw.ellipse([ox - bt, y0 - bt * 0.15, ox + bt, y0 + bt * 1.05], fill=wall_fill, outline=ink, width=2)
    # Curtain wall (trapezoid: slightly wider at base)
    wall_poly = [
        (x0 + w * 0.08, y0),
        (x1 - w * 0.08, y0),
        (x1, y1),
        (x0, y1),
    ]
    draw.polygon(wall_poly, fill=wall_fill, outline=ink, width=3)
    # Crenellation teeth along top of wall
    teeth = 5
    for i in range(teeth):
        tx0 = x0 + (x1 - x0) * (i / teeth) + w * 0.06
        tx1 = x0 + (x1 - x0) * ((i + 1) / teeth) - w * 0.06
        mid = (tx0 + tx1) / 2
        twt = (tx1 - tx0) * 0.35
        draw.rectangle([mid - twt / 2, y0 - h * 0.08, mid + twt / 2, y0], fill=tower_fill, outline=ink, width=1)
    # Donjon: rectangle + triangular roof (not a second box)
    draw.rectangle([cx - tw, top_y + h * 0.12, cx + tw, y0], fill=tower_fill, outline=ink, width=2)
    roof = [(cx - tw * 1.15, top_y + h * 0.12), (cx + tw * 1.15, top_y + h * 0.12), (cx, top_y - h * 0.08)]
    draw.polygon(roof, fill=wall_fill, outline=ink, width=2)
    if biome in (9, 10, 15):
        for sx in (-w * 0.68, w * 0.68):
            draw.line([(cx + sx, y0 - h * 0.02), (cx + sx, y0 + h * 0.14)], fill=ink_soft, width=2)
    if biome == 11:
        draw.line([(x0, y0), (x0 - 4, y0 - 4)], fill=ink, width=2)
        draw.line([(x1, y0), (x1 + 4, y0 - 4)], fill=ink, width=2)
    if biome == 14:
        draw.ellipse([cx - 3, top_y - 2, cx + 3, top_y + 4], outline=ink, width=2)
    gate_w = w * 0.34
    draw.arc(
        [cx - gate_w, y1 - gate_w * 1.12, cx + gate_w, y1 + gate_w * 0.38],
        180,
        360,
        fill=ink,
        width=2,
    )
    for gx in range(-1, 2):
        gxx = cx + gx * gate_w * 0.28
        draw.line([(gxx, y1 - gate_w * 0.35), (gxx, y1)], fill=ink_soft, width=1)


def draw_map_cities_global(
    overlay: Image.Image,
    grid_w: int,
    grid_h: int,
    bi: list[int],
    cw: int,
    ch: int,
    cities: dict[tuple[int, int], str],
) -> None:
    if not cities:
        return
    pts = cluster_city_icon_centers(cities, grid_w, grid_h, bi, cw, ch)
    rng = random.Random(44117)
    draw = ImageDraw.Draw(overlay)
    for cx, cy, bidx in pts:
        draw_medieval_city_icon(draw, cx, cy, cw, ch, rng, bidx)


def clamp_rgb(t: tuple[int, int, int]) -> tuple[int, int, int]:
    return tuple(max(0, min(255, x)) for x in t)  # type: ignore


def build_cell_grid(w: int, h: int, bi: list[int], seed: int) -> Image.Image:
    random.seed(seed)
    im = Image.new("RGB", (w, h))
    px = im.load()
    for y in range(h):
        for x in range(w):
            idx = bi[y * w + x]
            if idx < 0 or idx >= len(BIOME_HEX):
                idx = 0
            r, g, b = hex_to_rgb(BIOME_HEX[idx])
            r2 = r + random.randint(-10, 10)
            g2 = g + random.randint(-10, 10)
            b2 = b + random.randint(-10, 10)
            px[x, y] = clamp_rgb((r2, g2, b2))
    return im


def make_grain(size_w: int, size_h: int, seed: int) -> Image.Image:
    random.seed(seed + 777)
    g = Image.new("RGB", (max(1, size_w // 4), max(1, size_h // 4)))
    gx = g.load()
    for y in range(g.height):
        for x in range(g.width):
            v = random.randint(200, 255)
            gx[x, y] = (v, v, v)
    return g.resize((size_w, size_h), Image.Resampling.LANCZOS)


def make_warm_canvas_texture(size_w: int, size_h: int, seed: int) -> Image.Image:
    """Subtle warm parchment / canvas weave."""
    random.seed(seed + 1203)
    sw = max(2, size_w // 24)
    sh = max(2, size_h // 24)
    im = Image.new("RGB", (sw, sh))
    px = im.load()
    for y in range(sh):
        for x in range(sw):
            r = random.randint(218, 248)
            g = random.randint(208, 238)
            b = random.randint(188, 222)
            px[x, y] = (r, g, b)
    up = im.resize((size_w, size_h), Image.Resampling.LANCZOS)
    return up.filter(ImageFilter.GaussianBlur(radius=0.85))


def apply_directional_light(rgb: Image.Image) -> Image.Image:
    """Light from NW (top-left): brighter highlights, deeper read toward SE — fantasy map shading."""
    w, h = rgb.size
    L = Image.new("L", (w, h))
    lx = L.load()
    for y in range(h):
        for x in range(w):
            fx = x / (w - 1) if w > 1 else 0.0
            fy = y / (h - 1) if h > 1 else 0.0
            lum = 0.54 + 0.46 * ((1.0 - fx) * 0.52 + (1.0 - fy) * 0.48)
            lx[x, y] = int(255 * lum)
    L = L.filter(ImageFilter.GaussianBlur(radius=max(2.0, w / 95.0)))
    L3 = Image.merge("RGB", (L, L, L))
    return ImageChops.multiply(rgb, L3)


def add_painterly_luminance(rgb: Image.Image, seed: int) -> Image.Image:
    """Multi-scale luminance noise — brushy surface, not flat digital fills."""
    w, h = rgb.size
    rng = random.Random(seed + 404)
    bump = Image.new("L", (max(2, w // 14), max(2, h // 14)))
    bp = bump.load()
    for y in range(bump.height):
        for x in range(bump.width):
            bp[x, y] = rng.randint(200, 255)
    bump = bump.resize((w, h), Image.Resampling.LANCZOS)
    bump = bump.filter(ImageFilter.GaussianBlur(radius=1.35))
    bump2 = Image.new("L", (max(2, w // 40), max(2, h // 40)))
    b2 = bump2.load()
    for y in range(bump2.height):
        for x in range(bump2.width):
            b2[x, y] = rng.randint(228, 255)
    bump2 = bump2.resize((w, h), Image.Resampling.LANCZOS)
    bump2 = bump2.filter(ImageFilter.GaussianBlur(radius=2.2))
    bump = ImageChops.multiply(bump, bump2)
    L3 = Image.merge("RGB", (bump, bump, bump))
    return ImageChops.multiply(rgb, L3)


def soften_rgba_overlay(overlay: Image.Image, factor: float) -> Image.Image:
    if overlay.mode != "RGBA":
        return overlay
    r, g, b, a = overlay.split()
    a = a.point(lambda p: int(p * factor))
    return Image.merge("RGBA", (r, g, b, a))


def ensure_cinzel_font(root: Path) -> Path | None:
    # Filename avoids [] (shell glob issues on Windows).
    dest = root / "Assets" / "Fonts" / "Cinzel-wght.ttf"
    if dest.is_file():
        return dest
    dest.parent.mkdir(parents=True, exist_ok=True)
    try:
        req = urllib.request.Request(
            CINZEL_URL,
            headers={"User-Agent": "browser-rpg-map-build/1.0"},
        )
        with urllib.request.urlopen(req, timeout=60) as resp:  # noqa: S310
            dest.write_bytes(resp.read())
    except OSError:
        return None
    return dest if dest.is_file() else None


def resolve_truetype_font(root: Path, size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates: list[Path] = []
    for name in ("Cinzel-wght.ttf", "Cinzel[wght].ttf", "Cinzel-Regular.ttf"):
        p = root / "Assets" / "Fonts" / name
        if p.is_file():
            candidates.append(p)
    windir = Path(os.environ.get("WINDIR", "C:/Windows"))
    for name in (
        "CinzelDecorative-Regular.ttf",
        "times.ttf",
        "timesbd.ttf",
        "GARA.TTF",
        "GARAIT.TTF",
        "OLDENGL.TTF",
    ):
        candidates.append(windir / "Fonts" / name)
    for p in candidates:
        if p.is_file():
            try:
                return ImageFont.truetype(str(p), size=size)
            except OSError:
                continue
    return ImageFont.load_default()


def format_biome_label(name: str) -> str:
    if len(name) <= 16:
        return name
    parts = name.split()
    if len(parts) < 2:
        return name
    mid = (len(parts) + 1) // 2
    return " ".join(parts[:mid]) + "\n" + " ".join(parts[mid:])


def enumerate_biome_regions(grid_w: int, grid_h: int, bi: list[int]) -> list[tuple[int, list[tuple[int, int]]]]:
    visited = [False] * (grid_w * grid_h)
    out: list[tuple[int, list[tuple[int, int]]]] = []

    def idx(x: int, y: int) -> int:
        return y * grid_w + x

    for y in range(grid_h):
        for x in range(grid_w):
            i = idx(x, y)
            if visited[i]:
                continue
            biome = bi[i]
            stack = [(x, y)]
            visited[i] = True
            cells: list[tuple[int, int]] = []
            while stack:
                cx, cy = stack.pop()
                cells.append((cx, cy))
                for dx, dy in ((0, 1), (0, -1), (1, 0), (-1, 0)):
                    nx, ny = cx + dx, cy + dy
                    if nx < 0 or nx >= grid_w or ny < 0 or ny >= grid_h:
                        continue
                    ni = idx(nx, ny)
                    if visited[ni] or bi[ni] != biome:
                        continue
                    visited[ni] = True
                    stack.append((nx, ny))
            out.append((biome, cells))
    return out


def label_font_size(n_cells: int, text: str) -> int:
    base = 7 + math.sqrt(max(1, n_cells)) * 1.08
    if len(text) > 22:
        base *= 0.82
    if "\n" in text:
        base *= 0.9
    return max(8, min(19, int(base)))


def _normalize_angle_deg(a: float) -> float:
    """Keep in [-90, 90] for readable map labels (flip 180° if needed)."""
    a = a % 360.0
    if a > 180.0:
        a -= 360.0
    if a > 90.0:
        a -= 180.0
    if a < -90.0:
        a += 180.0
    return a


def pca_region_angle_deg(cells: list[tuple[int, int]], cw: int, ch: int) -> float:
    """Dominant elongation angle (degrees, horizontal = 0). Blobby regions → 0."""
    n = len(cells)
    if n < 4:
        return 0.0
    pts = [(float(cx * cw + cw / 2), float(cy * ch + ch / 2)) for cx, cy in cells]
    mx = sum(p[0] for p in pts) / n
    my = sum(p[1] for p in pts) / n
    cxx = sum((p[0] - mx) ** 2 for p in pts) / n + 1e-6
    cyy = sum((p[1] - my) ** 2 for p in pts) / n + 1e-6
    cxy = sum((p[0] - mx) * (p[1] - my) for p in pts) / n
    trace = cxx + cyy
    disc = math.hypot(cxx - cyy, 2.0 * cxy)
    lam_max = (trace + disc) / 2.0
    lam_min = (trace - disc) / 2.0
    if lam_min < 1e-2 or lam_max / lam_min < 1.4:
        return 0.0
    theta = 0.5 * math.atan2(2.0 * cxy, cxx - cyy)
    return _normalize_angle_deg(math.degrees(theta))


def rotation_angle_candidates(cells: list[tuple[int, int]], cw: int, ch: int) -> list[float]:
    """Try PCA axis, perpendicular, horizontal, and common tilts to reduce overlap."""
    p = pca_region_angle_deg(cells, cw, ch)
    raw = [
        p,
        p + 90.0,
        p - 90.0,
        0.0,
        -12.0,
        12.0,
        -24.0,
        24.0,
        -36.0,
        36.0,
        -48.0,
        48.0,
        -60.0,
        60.0,
        -72.0,
        72.0,
        80.0,
        -80.0,
    ]
    seen: set[float] = set()
    out: list[float] = []
    for a in raw:
        a = _normalize_angle_deg(a)
        k = round(a, 2)
        if k not in seen:
            seen.add(k)
            out.append(a)
    return out


def _aabb_overlap(
    ax0: float,
    ay0: float,
    ax1: float,
    ay1: float,
    bx0: float,
    by0: float,
    bx1: float,
    by1: float,
    pad: float,
) -> bool:
    return not (ax1 + pad < bx0 or bx1 + pad < ax0 or ay1 + pad < by0 or by1 + pad < ay0)


def render_biome_labels_rgba(
    out_w: int,
    out_h: int,
    grid_w: int,
    grid_h: int,
    bi: list[int],
    cw: int,
    ch: int,
    root: Path,
) -> Image.Image:
    """Transparent RGBA layer with region name labels only (for world map modal overlay)."""
    ensure_cinzel_font(root)
    canvas = Image.new("RGBA", (out_w, out_h), (0, 0, 0, 0))
    regions = enumerate_biome_regions(grid_w, grid_h, bi)
    min_cells = 5
    placed_boxes: list[tuple[float, float, float, float]] = []
    pad_px = 4.0

    indexed: list[tuple[int, int, list[tuple[int, int]]]] = []
    for biome, cells in regions:
        if len(cells) < min_cells:
            continue
        if biome < 0 or biome >= len(BIOME_NAMES):
            continue
        indexed.append((biome, len(cells), cells))
    indexed.sort(key=lambda t: -t[1])

    for biome, _n, cells in indexed:
        name = BIOME_NAMES[biome]
        label = format_biome_label(name)
        ax = sum(c[0] for c in cells) / len(cells)
        ay = sum(c[1] for c in cells) / len(cells)
        px = ax * cw + cw / 2
        py = ay * ch + ch / 2
        # Per-biome nudges so labels clear neighbours (grid is cw×ch px per cell).
        if biome == 0:
            px -= 16.5 * cw
            px = max(0.9 * cw, px)
        elif biome == 1:
            px -= 0.85 * cw
            py -= 0.7 * ch
        elif biome == 4:
            px += 0.9 * cw
            py += 0.7 * ch
        elif biome == 12:
            # Aftermath of War — nudge down so it clears Widow's Ash city label to the north.
            py += 0.85 * ch
        fs = label_font_size(len(cells), label)
        if biome == 5:
            fs = min(22, max(fs + 1, int(round(fs * 1.22))))
        font = resolve_truetype_font(root, fs)
        r, g, b = hex_to_rgb(BIOME_HEX[biome])
        lum = 0.299 * r + 0.587 * g + 0.114 * b
        if lum > 145:
            fill = (28, 22, 16, 255)
            stroke_fill = (252, 248, 238, 255)
        else:
            fill = (238, 232, 218, 255)
            stroke_fill = (12, 10, 8, 255)
        stroke_w = 2 if fs >= 12 else 1

        margin = 12
        _meas = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
        bbox = _meas.multiline_textbbox((0, 0), label, font=font, spacing=3)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        slab_w = int(tw + margin * 2)
        slab_h = int(th + margin * 2)
        slab = Image.new("RGBA", (slab_w, slab_h), (0, 0, 0, 0))
        sd = ImageDraw.Draw(slab)
        sd.multiline_text(
            (margin - bbox[0], margin - bbox[1]),
            label,
            font=font,
            fill=fill,
            stroke_width=stroke_w,
            stroke_fill=stroke_fill,
            spacing=3,
        )

        candidates = rotation_angle_candidates(cells, cw, ch)
        chosen_angle = candidates[0]
        best_box: tuple[float, float, float, float] | None = None
        for angle in candidates:
            rot = slab.rotate(-angle, expand=True, resample=Image.Resampling.BICUBIC)
            rw, rh = rot.size
            left = px - rw / 2
            top = py - rh / 2
            ax0, ay0, ax1, ay1 = left, top, left + rw, top + rh
            ok = all(
                not _aabb_overlap(ax0, ay0, ax1, ay1, bx0, by0, bx1, by1, pad_px)
                for bx0, by0, bx1, by1 in placed_boxes
            )
            if ok:
                chosen_angle = angle
                best_box = (ax0, ay0, ax1, ay1)
                break

        if best_box is None:
            chosen_angle = candidates[0]
            rot = slab.rotate(-chosen_angle, expand=True, resample=Image.Resampling.BICUBIC)
            rw, rh = rot.size
            left = px - rw / 2
            top = py - rh / 2
            best_box = (left, top, left + rw, top + rh)

        final_rot = slab.rotate(-chosen_angle, expand=True, resample=Image.Resampling.BICUBIC)
        fl = px - final_rot.width / 2
        ft = py - final_rot.height / 2
        canvas.paste(final_rot, (int(fl), int(ft)), final_rot)
        placed_boxes.append(best_box)

    return canvas


def _rng_cell(x: int, y: int, salt: int) -> random.Random:
    return random.Random((x * 92837111) ^ (y * 689287499) ^ salt)


def wavy_vertical_line(
    draw: ImageDraw.ImageDraw,
    x_center: float,
    y0: float,
    y1: float,
    ink: tuple[int, int, int, int],
    width: int,
    rng: random.Random,
) -> None:
    if y1 < y0:
        y0, y1 = y1, y0
    n = max(5, int((y1 - y0) / 3))
    for i in range(n):
        t0 = i / n
        t1 = (i + 1) / n
        ya = y0 + t0 * (y1 - y0)
        yb = y0 + t1 * (y1 - y0)
        ox = rng.uniform(-1.0, 1.0) + 0.6 * math.sin(ya * 0.09)
        draw.line(
            [(x_center + ox, ya), (x_center + ox + rng.uniform(-0.4, 0.4), yb)],
            fill=ink,
            width=width,
        )


def wavy_horizontal_line(
    draw: ImageDraw.ImageDraw,
    y_center: float,
    x0: float,
    x1: float,
    ink: tuple[int, int, int, int],
    width: int,
    rng: random.Random,
) -> None:
    if x1 < x0:
        x0, x1 = x1, x0
    n = max(5, int((x1 - x0) / 4))
    for i in range(n):
        t0 = i / n
        t1 = (i + 1) / n
        xa = x0 + t0 * (x1 - x0)
        xb = x0 + t1 * (x1 - x0)
        oy = rng.uniform(-1.0, 1.0) + 0.55 * math.sin(xa * 0.085)
        draw.line(
            [(xa, y_center + oy), (xb, y_center + oy + rng.uniform(-0.4, 0.4))],
            fill=ink,
            width=width,
        )


def draw_ink_edges(
    overlay: Image.Image,
    w: int,
    h: int,
    bi: list[int],
    cw: int,
    ch: int,
) -> None:
    draw = ImageDraw.Draw(overlay)
    ink_main = (48, 36, 26, 165)
    ink_water = (22, 42, 58, 175)
    for y in range(h):
        for x in range(1, w):
            a = bi[y * w + x - 1]
            b = bi[y * w + x]
            if a == b:
                continue
            ink = ink_water if (a == 0 or b == 0) else ink_main
            wv = 2 if (a == 0 or b == 0) else 1
            rng = _rng_cell(x, y, 1001)
            x_line = x * cw
            wavy_vertical_line(draw, float(x_line), y * ch, (y + 1) * ch, ink, wv, rng)
    for y in range(1, h):
        for x in range(w):
            a = bi[(y - 1) * w + x]
            b = bi[y * w + x]
            if a == b:
                continue
            ink = ink_water if (a == 0 or b == 0) else ink_main
            wv = 2 if (a == 0 or b == 0) else 1
            rng = _rng_cell(x, y, 2002)
            y_line = y * ch
            wavy_horizontal_line(draw, float(y_line), x * cw, (x + 1) * cw, ink, wv, rng)


def draw_mountains(
    draw: ImageDraw.ImageDraw,
    x0: int,
    y0: int,
    cw: int,
    ch: int,
    rng: random.Random,
    ink: tuple[int, int, int, int],
) -> None:
    n = rng.randint(2, 4)
    for _ in range(n):
        cx = x0 + rng.randint(int(cw * 0.2), int(cw * 0.75))
        cy = y0 + rng.randint(int(ch * 0.35), int(ch * 0.85))
        s = rng.randint(max(3, ch // 5), max(4, ch // 3))
        pts = [
            (cx - s, cy + s // 2),
            (cx, cy - s // 2),
            (cx + s, cy + s // 2),
        ]
        draw.polygon(pts, outline=ink, width=1)


def draw_trees(
    draw: ImageDraw.ImageDraw,
    x0: int,
    y0: int,
    cw: int,
    ch: int,
    rng: random.Random,
    ink: tuple[int, int, int, int],
    *,
    min_trees: int = 2,
    max_trees: int = 4,
) -> None:
    lo = min(min_trees, max_trees)
    hi = max(min_trees, max_trees)
    for _ in range(rng.randint(lo, hi)):
        tx = x0 + rng.randint(int(cw * 0.15), int(cw * 0.85))
        ty = y0 + rng.randint(int(ch * 0.2), int(ch * 0.55))
        r = rng.randint(2, max(3, ch // 6))
        draw.ellipse([tx - r, ty - r, tx + r, ty + r], outline=ink, width=1)
        draw.line([(tx, ty + r), (tx, ty + r + max(2, ch // 8))], fill=ink, width=1)


def draw_pine_trees(
    draw: ImageDraw.ImageDraw,
    x0: int,
    y0: int,
    cw: int,
    ch: int,
    rng: random.Random,
    ink: tuple[int, int, int, int],
) -> None:
    """Small cartographic pine: stacked narrow triangles + thin trunk."""
    for _ in range(rng.randint(1, 3)):
        tx = x0 + rng.randint(int(cw * 0.18), int(cw * 0.82))
        base = y0 + rng.randint(int(ch * 0.52), int(ch * 0.92))
        tw = max(2, min(cw, ch) // 5)
        h_layer = max(2, ch // 7)
        tip_y = base - h_layer * 2 - max(1, tw // 2)
        for layer in range(2):
            off = layer * (tw // 3 + 1)
            yb = base - layer * (h_layer + 1)
            half = max(2, tw - off)
            pts = [(tx, yb - h_layer), (tx - half, yb), (tx + half, yb)]
            draw.polygon(pts, outline=ink, width=1)
        trunk = max(2, ch // 10)
        draw.line([(tx, base), (tx, base + trunk)], fill=ink, width=1)


def draw_cactus(
    draw: ImageDraw.ImageDraw,
    x0: int,
    y0: int,
    cw: int,
    ch: int,
    rng: random.Random,
    ink: tuple[int, int, int, int],
) -> None:
    """Tiny saguara-style cactus (map symbol)."""
    cx = x0 + rng.randint(int(cw * 0.25), int(cw * 0.75))
    y_bot = y0 + rng.randint(int(ch * 0.55), int(ch * 0.92))
    h = rng.randint(max(4, ch // 3), max(5, ch // 2))
    y_top = y_bot - h
    draw.line([(cx, y_bot), (cx, y_top)], fill=ink, width=1)
    arm_h = max(2, h // 3)
    side = 1 if rng.random() < 0.5 else -1
    ax = cx + side * max(2, cw // 8)
    ay = y_top + arm_h
    draw.line([(cx, ay + arm_h // 2), (ax, ay + arm_h // 2), (ax, ay - arm_h)], fill=ink, width=1)
    if rng.random() < 0.65:
        side2 = -side
        ax2 = cx + side2 * max(2, cw // 9)
        ay2 = y_top + arm_h + rng.randint(1, 2)
        draw.line([(cx, ay2 + arm_h // 3), (ax2, ay2 + arm_h // 3), (ax2, ay2 - arm_h + 1)], fill=ink, width=1)


def draw_bushes(
    draw: ImageDraw.ImageDraw,
    x0: int,
    y0: int,
    cw: int,
    ch: int,
    rng: random.Random,
    ink: tuple[int, int, int, int],
) -> None:
    """Low scrub: small arcs and dots."""
    for _ in range(rng.randint(2, 4)):
        bx = x0 + rng.randint(int(cw * 0.1), int(cw * 0.9))
        by = y0 + rng.randint(int(ch * 0.55), int(ch * 0.95))
        rr = rng.randint(2, max(3, min(cw, ch) // 5))
        draw.arc([bx - rr, by - rr, bx + rr, by + rr], 200, 340, fill=ink, width=1)
        if rng.random() < 0.5:
            draw.ellipse([bx - 1, by - 1, bx + 1, by + 1], fill=ink)


def draw_burnt_trees(
    draw: ImageDraw.ImageDraw,
    x0: int,
    y0: int,
    cw: int,
    ch: int,
    rng: random.Random,
    ink: tuple[int, int, int, int],
) -> None:
    """Charred snags: jagged branches, no crown."""
    for _ in range(rng.randint(1, 2)):
        tx = x0 + rng.randint(int(cw * 0.2), int(cw * 0.8))
        base = y0 + rng.randint(int(ch * 0.5), int(ch * 0.9))
        trunk = rng.randint(max(3, ch // 4), max(4, ch // 2))
        top = base - trunk
        draw.line([(tx, base), (tx, top)], fill=ink, width=1)
        for sign in (-1, 1):
            if rng.random() < 0.85:
                br = rng.randint(2, max(3, cw // 5))
                mid = top + rng.randint(0, trunk // 2)
                draw.line([(tx, mid), (tx + sign * br, mid - rng.randint(1, 3))], fill=ink, width=1)


def draw_smoke_plume(
    draw: ImageDraw.ImageDraw,
    x0: int,
    y0: int,
    cw: int,
    ch: int,
    rng: random.Random,
    ink: tuple[int, int, int, int],
) -> None:
    """Wispy rising smoke curls (faint)."""
    sx = x0 + rng.randint(int(cw * 0.25), int(cw * 0.75))
    sy = y0 + rng.randint(int(ch * 0.15), int(ch * 0.55))
    pts: list[tuple[float, float]] = [(float(sx), float(sy))]
    for i in range(1, 6):
        pts.append(
            (
                sx + 2.0 * math.sin(i * 0.9 + rng.uniform(0, 0.5)),
                sy - i * (ch / 10.0) * rng.uniform(0.7, 1.1),
            )
        )
    if len(pts) > 1:
        draw.line(pts, fill=ink, width=1)


def draw_burning_trees(
    draw: ImageDraw.ImageDraw,
    x0: int,
    y0: int,
    cw: int,
    ch: int,
    rng: random.Random,
    ink: tuple[int, int, int, int],
    ink_flame: tuple[int, int, int, int],
) -> None:
    """Small pine-like silhouette with flame tongues at top."""
    for _ in range(rng.randint(1, 2)):
        tx = x0 + rng.randint(int(cw * 0.2), int(cw * 0.78))
        base = y0 + rng.randint(int(ch * 0.5), int(ch * 0.9))
        tw = max(2, min(cw, ch) // 5)
        h_layer = max(2, ch // 7)
        for layer in range(2):
            yb = base - layer * (h_layer + 1)
            half = max(2, tw - layer * (tw // 4))
            pts = [(tx, yb - h_layer), (tx - half, yb), (tx + half, yb)]
            draw.polygon(pts, outline=ink, width=1)
        tip = base - 2 * (h_layer + 1) - h_layer
        for k in range(3):
            fx = tx + (k - 1) * max(1, tw // 4)
            fy = tip - rng.randint(1, 3)
            flame = [
                (fx, fy + 3),
                (fx - 2, fy),
                (fx, fy - rng.randint(2, 4)),
                (fx + 2, fy),
            ]
            draw.polygon(flame, outline=ink_flame, width=1)
        draw.line([(tx, base), (tx, base + max(2, ch // 10))], fill=ink, width=1)


def draw_fire_marks(
    draw: ImageDraw.ImageDraw,
    x0: int,
    y0: int,
    cw: int,
    ch: int,
    rng: random.Random,
    ink_flame: tuple[int, int, int, int],
) -> None:
    """Standalone small flame glyphs."""
    for _ in range(rng.randint(1, 2)):
        fx = x0 + rng.randint(int(cw * 0.2), int(cw * 0.8))
        fy = y0 + rng.randint(int(ch * 0.35), int(ch * 0.75))
        flame = [
            (fx, fy + 4),
            (fx - 2, fy),
            (fx, fy - rng.randint(3, 5)),
            (fx + 2, fy),
        ]
        draw.polygon(flame, outline=ink_flame, width=1)


def draw_lake_symbol(
    draw: ImageDraw.ImageDraw,
    x0: int,
    y0: int,
    cw: int,
    ch: int,
    rng: random.Random,
    ink: tuple[int, int, int, int],
) -> None:
    """Closed wavy outline + inner ripple — cartographic lake."""
    cx = x0 + cw // 2 + rng.randint(-cw // 6, cw // 6)
    cy = y0 + ch // 2 + rng.randint(-ch // 6, ch // 6)
    rw = rng.randint(max(3, cw // 5), max(4, cw // 3))
    rh = rng.randint(max(2, ch // 5), max(3, ch // 3))
    pts: list[tuple[float, float]] = []
    for i in range(13):
        ang = (i / 12.0) * math.tau
        px = cx + rw * math.cos(ang) * (0.92 + 0.08 * math.sin(ang * 3))
        py = cy + rh * math.sin(ang) * (0.92 + 0.08 * math.cos(ang * 2.5))
        pts.append((px, py))
    if len(pts) > 2:
        draw.line(pts + [pts[0]], fill=ink, width=1)
    r2 = max(1, rw - 2)
    r2h = max(1, rh - 1)
    draw.arc([cx - r2, cy - r2h, cx + r2, cy + r2h], 30, 200, fill=ink, width=1)


def draw_dunes(
    draw: ImageDraw.ImageDraw,
    x0: int,
    y0: int,
    cw: int,
    ch: int,
    rng: random.Random,
    ink: tuple[int, int, int, int],
) -> None:
    for i in range(3):
        yy = y0 + int(ch * (0.25 + i * 0.22))
        pts = []
        for k in range(8):
            px = x0 + int(cw * (0.1 + 0.11 * k))
            wobble = rng.randint(-2, 2)
            pts.append((px, yy + wobble))
        if len(pts) > 1:
            draw.line(pts, fill=ink, width=1)


def draw_ruins(
    draw: ImageDraw.ImageDraw,
    x0: int,
    y0: int,
    cw: int,
    ch: int,
    rng: random.Random,
    ink: tuple[int, int, int, int],
) -> None:
    cx = x0 + cw // 2
    cy = y0 + ch // 2
    s = max(3, min(cw, ch) // 5)
    draw.rectangle([cx - s, cy - s, cx + s, cy + s], outline=ink, width=1)
    draw.line([(cx - s, cy), (cx + s, cy)], fill=ink, width=1)


def draw_water_ripples(
    draw: ImageDraw.ImageDraw,
    x0: int,
    y0: int,
    cw: int,
    ch: int,
    rng: random.Random,
    ink: tuple[int, int, int, int],
) -> None:
    for _ in range(rng.randint(2, 4)):
        cx = x0 + rng.randint(int(cw * 0.2), int(cw * 0.8))
        cy = y0 + rng.randint(int(ch * 0.25), int(ch * 0.75))
        r = rng.randint(3, max(4, min(cw, ch) // 4))
        draw.arc([cx - r, cy - r, cx + r, cy + r], 20, 220, fill=ink, width=1)


def draw_beach_marks(
    draw: ImageDraw.ImageDraw,
    x0: int,
    y0: int,
    cw: int,
    ch: int,
    rng: random.Random,
    ink: tuple[int, int, int, int],
) -> None:
    for _ in range(rng.randint(3, 6)):
        px = x0 + rng.randint(2, cw - 2)
        py = y0 + rng.randint(2, ch - 2)
        draw.arc([px - 3, py - 2, px + 4, py + 5], 200, 340, fill=ink, width=1)


def draw_ocean_currents(
    draw: ImageDraw.ImageDraw,
    x0: int,
    y0: int,
    cw: int,
    ch: int,
    rng: random.Random,
    ink: tuple[int, int, int, int],
) -> None:
    """Flowing lines suggesting currents (map ink style)."""
    for _ in range(rng.randint(2, 4)):
        pts: list[tuple[float, float]] = []
        n = rng.randint(6, 10)
        base_y = y0 + rng.uniform(ch * 0.12, ch * 0.88)
        phase = rng.uniform(0, math.pi * 2)
        for i in range(n):
            t = i / max(1, n - 1)
            px = x0 + t * cw * (0.08 + rng.uniform(0.7, 0.9))
            py = base_y + 5.0 * math.sin(t * math.pi * 2.8 + phase) + rng.uniform(-0.8, 0.8)
            pts.append((px, py))
        if len(pts) > 1:
            draw.line(pts, fill=ink, width=1)
    if rng.random() < 0.55:
        pts2: list[tuple[float, float]] = []
        n2 = rng.randint(5, 8)
        base_x = x0 + rng.uniform(cw * 0.1, cw * 0.9)
        for j in range(n2):
            t = j / max(1, n2 - 1)
            py = y0 + t * ch * 0.85
            px = base_x + 4.0 * math.sin(t * math.pi * 2.2) + rng.uniform(-0.8, 0.8)
            pts2.append((px, py))
        if len(pts2) > 1:
            draw.line(pts2, fill=ink, width=1)


def draw_sea_serpent(
    draw: ImageDraw.ImageDraw,
    x0: int,
    y0: int,
    cw: int,
    ch: int,
    rng: random.Random,
    ink: tuple[int, int, int, int],
) -> None:
    """Long sinuous sea-serpent / Jörmungandr-style stroke."""
    cx = x0 + rng.randint(int(cw * 0.2), int(cw * 0.8))
    cy = y0 + rng.randint(int(ch * 0.2), int(ch * 0.8))
    amp = max(4.0, min(cw, ch) * 0.35)
    pts: list[tuple[float, float]] = []
    for i in range(14):
        t = i / 13.0
        ang = t * math.pi * 2.5
        px = cx + int(amp * (t - 0.5) * 2.0 * (1.0 + 0.1 * rng.uniform(-1, 1)))
        py = cy + int(amp * 0.55 * math.sin(ang))
        pts.append((float(px), float(py)))
    if len(pts) > 2:
        draw.line(pts, fill=ink, width=2)
    hx, hy = pts[-1]
    draw.ellipse([hx - 2, hy - 2, hx + 4, hy + 4], outline=ink, width=1)


def draw_kraken_tentacles(
    draw: ImageDraw.ImageDraw,
    x0: int,
    y0: int,
    cw: int,
    ch: int,
    rng: random.Random,
    ink: tuple[int, int, int, int],
) -> None:
    """A few curling tentacles from a central mass (mythological sea beast)."""
    cx = x0 + cw // 2
    cy = y0 + ch // 2
    for leg in range(rng.randint(3, 5)):
        ang = leg * (2 * math.pi / 5) + rng.uniform(-0.3, 0.3)
        pts: list[tuple[float, float]] = [(float(cx), float(cy))]
        for s in range(1, 7):
            r = s * max(2.5, min(cw, ch) / 12)
            px = cx + r * math.cos(ang + s * 0.18)
            py = cy + r * math.sin(ang + s * 0.18)
            pts.append((px, py))
        if len(pts) > 1:
            draw.line(pts, fill=ink, width=1)
    draw.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], outline=ink, width=1)


def draw_spiral_leviathan(
    draw: ImageDraw.ImageDraw,
    x0: int,
    y0: int,
    cw: int,
    ch: int,
    rng: random.Random,
    ink: tuple[int, int, int, int],
) -> None:
    """Tight spiral suggesting coiled sea beast / whirlpool."""
    cx = x0 + rng.randint(int(cw * 0.25), int(cw * 0.75))
    cy = y0 + rng.randint(int(ch * 0.25), int(ch * 0.75))
    pts: list[tuple[float, float]] = []
    for i in range(18):
        t = i * 0.35
        px = cx + t * math.cos(t * 1.7)
        py = cy + t * math.sin(t * 1.7)
        pts.append((px, py))
    if len(pts) > 2:
        draw.line(pts, fill=ink, width=1)


def draw_worlds_belt_ocean_art(
    draw: ImageDraw.ImageDraw,
    x0: int,
    y0: int,
    cw: int,
    ch: int,
    rng: random.Random,
) -> None:
    """World's Belt: currents only (sea monsters are drawn globally, max 4)."""
    ink_current = (28, 52, 68, 125)
    draw_ocean_currents(draw, x0, y0, cw, ch, rng, ink_current)


def draw_symbols_for_cell(
    draw: ImageDraw.ImageDraw,
    biome: int,
    cx: int,
    cy: int,
    cw: int,
    ch: int,
) -> None:
    rng = _rng_cell(cx, cy, 5005)
    x0 = cx * cw
    y0 = cy * ch
    ink = (35, 28, 20, 160)
    ink_faint = (45, 38, 28, 110)
    ink_smoke = (55, 52, 50, 95)
    ink_flame = (120, 55, 28, 155)
    ink_flame_hot = (140, 65, 32, 165)
    # 0 World's Belt (ocean): currents + rare sea monsters; draw most cells
    if biome == 0:
        if rng.random() < 0.88:
            draw_worlds_belt_ocean_art(draw, x0, y0, cw, ch, rng)
        return
    # Paradise — no decorative symbols (clean beaches / groves)
    if biome in (7, 16):
        return
    # 8 Heart of Gaia — dense canopy
    # 8 / 9 Gaia — world_map export uses 9 for the large forest mass (Heart) and 8 for the ring (Skin);
    #    config.js lists Heart=8 / Skin=9, so tree density follows the map grid, not the numeric order.
    # 8 Skin (outer ring) — sparse
    if biome == 8:
        if rng.random() > 0.82:
            return
        draw_trees(draw, x0, y0, cw, ch, rng, ink, min_trees=1, max_trees=2)
        return
    # 9 Heart (main forest) — most cells, 1–3 trees each (max 3)
    if biome == 9:
        if rng.random() > 0.1:
            return
        draw_trees(draw, x0, y0, cw, ch, rng, ink, min_trees=1, max_trees=3)
        return
    if rng.random() > 0.4:
        return
    # 1–3,5 Titans / shields / World's End — peaks (not South Titan's Sword)
    if biome in (1, 2, 3, 5):
        draw_mountains(draw, x0, y0, cw, ch, rng, ink)
        return
    # 4 South Titan's Sword — burning trees + fire
    if biome == 4:
        draw_burning_trees(draw, x0, y0, cw, ch, rng, ink, ink_flame_hot)
        if rng.random() < 0.65:
            draw_fire_marks(draw, x0, y0, cw, ch, rng, ink_flame)
        return
    # 6 Tears of God — ripples
    if biome == 6:
        draw_water_ripples(draw, x0, y0, cw, ch, rng, ink_faint)
        return
    # 10 Hatred
    if biome == 10:
        cxp = x0 + cw // 2
        cyp = y0 + ch // 2
        for _ in range(3):
            dx = rng.randint(-cw // 3, cw // 3)
            dy = rng.randint(-ch // 3, ch // 3)
            draw.line([(cxp, cyp), (cxp + dx, cyp + dy)], fill=(90, 20, 20, 140), width=1)
        return
    # 11 The held breath — dunes
    if biome == 11:
        draw_dunes(draw, x0, y0, cw, ch, rng, ink_faint)
        return
    # 12 Aftermath of War — burnt snags + smoke
    if biome == 12:
        draw_burnt_trees(draw, x0, y0, cw, ch, rng, ink)
        if rng.random() < 0.7:
            draw_smoke_plume(draw, x0, y0, cw, ch, rng, ink_smoke)
        return
    # 13 The misery of life — cactus + scrub
    if biome == 13:
        draw_cactus(draw, x0, y0, cw, ch, rng, ink)
        draw_bushes(draw, x0, y0, cw, ch, rng, ink_faint)
        return
    # 14 The apathy of the World — lake symbols
    if biome == 14:
        draw_lake_symbol(draw, x0, y0, cw, ch, rng, ink_faint)
        return
    # 15 Innocence of North — pine forest (map pines)
    if biome == 15:
        draw_pine_trees(draw, x0, y0, cw, ch, rng, ink_faint)
        return


def draw_map_symbols(
    overlay: Image.Image,
    w: int,
    h: int,
    bi: list[int],
    cw: int,
    ch: int,
) -> None:
    draw = ImageDraw.Draw(overlay)
    for cy in range(h):
        for cx in range(w):
            b = bi[cy * w + cx]
            draw_symbols_for_cell(draw, b, cx, cy, cw, ch)


def draw_sea_serpent_large_global(
    draw: ImageDraw.ImageDraw,
    cx: float,
    cy: float,
    rng: random.Random,
    ink: tuple[int, int, int, int],
    cw: int,
    ch: int,
) -> None:
    """Procedural fallback when sea_monsters_sheet.png is missing."""
    span_w = cw * 6.5
    amp = ch * 4.0
    pts: list[tuple[float, float]] = []
    for i in range(28):
        t = i / 27.0
        px = cx + (t - 0.5) * span_w
        py = cy + amp * 0.55 * math.sin(t * math.pi * 2.45 + rng.uniform(0, 0.35))
        pts.append((px, py))
    if len(pts) > 2:
        draw.line(pts, fill=ink, width=4)
    hx, hy = pts[-1]
    draw.ellipse([hx - 6, hy - 6, hx + 7, hy + 7], outline=ink, width=2)


def draw_kraken_large_global(
    draw: ImageDraw.ImageDraw,
    cx: float,
    cy: float,
    rng: random.Random,
    ink: tuple[int, int, int, int],
    cw: int,
    ch: int,
) -> None:
    arm = max(cw, ch) * 0.85
    for leg in range(6):
        ang = leg * (2 * math.pi / 6) + rng.uniform(-0.25, 0.25)
        pts: list[tuple[float, float]] = [(cx, cy)]
        for s in range(1, 12):
            r = s * arm * 0.07
            px = cx + r * math.cos(ang + s * 0.11)
            py = cy + r * math.sin(ang + s * 0.11)
            pts.append((px, py))
        if len(pts) > 1:
            draw.line(pts, fill=ink, width=3)
    r0 = arm * 0.1
    draw.ellipse([cx - r0, cy - r0, cx + r0, cy + r0], outline=ink, width=2)


def draw_spiral_leviathan_large_global(
    draw: ImageDraw.ImageDraw,
    cx: float,
    cy: float,
    rng: random.Random,
    ink: tuple[int, int, int, int],
    cw: int,
    ch: int,
) -> None:
    span = max(cw, ch) * 2.5
    pts: list[tuple[float, float]] = []
    for i in range(45):
        t = i * 0.11
        px = cx + t * math.cos(t * 1.65 + rng.uniform(0, 0.2))
        py = cy + t * math.sin(t * 1.65)
        pts.append((px, py))
    if len(pts) > 2:
        draw.line(pts, fill=ink, width=3)


def _crop_sea_monster_sprite(sheet: Image.Image, index: int) -> Image.Image:
    """4×3 grid of engravings on the reference sheet (12 monsters)."""
    W, H = sheet.size
    cols, rows = 4, 3
    cell_w = W // cols
    cell_h = H // rows
    idx = index % (cols * rows)
    r = idx // cols
    c = idx % cols
    return sheet.crop((c * cell_w, r * cell_h, (c + 1) * cell_w, (r + 1) * cell_h))


def _woodcut_sprite_to_map_ink(rgba_src: Image.Image) -> Image.Image:
    """Vintage woodcut: near-white → transparent; lines → cool ink for water."""
    rgb = rgba_src.convert("RGB")
    w, h = rgb.size
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    px = rgb.load()
    po = out.load()
    ink = (12, 24, 36)
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            lum = 0.299 * r + 0.587 * g + 0.114 * b
            if lum > 250:
                continue
            alpha = int(min(255, (255 - lum) * 1.05 + 55))
            po[x, y] = ink + (alpha,)
    bb = out.getbbox()
    if bb:
        out = out.crop(bb)
    return out


def _world_end_pixel_bounds(
    bi: list[int], grid_w: int, grid_h: int, cw: int, ch: int
) -> tuple[float, float, float, float] | None:
    """Axis-aligned bounds of The World's End (biome index 5) in pixel space."""
    x0 = y0 = None
    x1 = y1 = None
    for yy in range(grid_h):
        for xx in range(grid_w):
            if bi[yy * grid_w + xx] != 5:
                continue
            ax, ay = xx * cw, yy * ch
            ax2, ay2 = (xx + 1) * cw, (yy + 1) * ch
            if x0 is None:
                x0, y0, x1, y1 = ax, ay, ax2, ay2
            else:
                x0 = min(x0, ax)
                y0 = min(y0, ay)
                x1 = max(x1, ax2)
                y1 = max(y1, ay2)
    if x0 is None:
        return None
    return float(x0), float(y0), float(x1), float(y1)


# Biome index for "The World's End" — must match BIOME_NAMES / config.js worldMap.biomes order.
WORLD_END_BIOME_INDEX = 5
# World's Belt (ocean strip) — used for whirlpool diameter vs map width.
WORLDS_BELT_BIOME_INDEX = 0


def _smoothstep01(t: float) -> float:
    t = max(0.0, min(1.0, t))
    return t * t * (3.0 - 2.0 * t)


def _world_end_pebble_hash(ix: int, iy: int) -> float:
    n = (ix * 374761393 + iy * 668265263) & 0xFFFFFFFF
    n = (n ^ (n >> 13)) * 1274126177 & 0xFFFFFFFF
    return ((n ^ (n >> 16)) & 0xFFFF) / 65535.0


def paint_worlds_end_whirlpool(
    out: Image.Image,
    bi: list[int],
    grid_w: int,
    grid_h: int,
    cw: int,
    ch: int,
    seed: int = 4242,
) -> tuple[Image.Image, float | None, float | None, float | None]:
    """
    Painterly spiral vortex (muted cyan water, dark rock bands, central void) in the same cartographic
    language as the rest of the map. Radius r_max = half the vertical span of World's Belt in px,
    scaled by 0.8 (20% smaller). Centered on the map bitmap center (out_w/2, out_h/2).
    """
    rng = random.Random(seed)
    has_we = any(bi[i] == WORLD_END_BIOME_INDEX for i in range(grid_w * grid_h))
    if not has_we:
        return out, None, None, None

    belt_x0 = belt_x1 = belt_y0 = belt_y1 = None
    for yy in range(grid_h):
        for xx in range(grid_w):
            if bi[yy * grid_w + xx] != WORLDS_BELT_BIOME_INDEX:
                continue
            if belt_x0 is None:
                belt_x0 = belt_x1 = xx
                belt_y0 = belt_y1 = yy
            else:
                belt_x0 = min(belt_x0, xx)
                belt_x1 = max(belt_x1, xx)
                belt_y0 = min(belt_y0, yy)
                belt_y1 = max(belt_y1, yy)
    if belt_x0 is None:
        return out, None, None, None

    # Superior / inferior Y of World's Belt (min/max grid row), height in pixels.
    belt_h_px = float((belt_y1 - belt_y0 + 1) * ch)
    # Base radius = half of vertical belt span; 20% reduction on diameter (scale 0.8).
    r_max = (belt_h_px / 2.0 + rng.uniform(-0.5, 0.5)) * 0.8
    r_max = max(12.0, r_max)

    out_w, out_h = out.size
    cx = out_w / 2.0
    cy = out_h / 2.0
    px = out.load()
    x0 = max(0, int(cx - r_max - 2))
    y0 = max(0, int(cy - r_max - 2))
    x1 = min(out_w, int(cx + r_max + 3))
    y1 = min(out_h, int(cy + r_max + 3))

    for y in range(y0, y1):
        for x in range(x0, x1):
            dx = x - cx + 0.25
            dy = y - cy + 0.25
            d = math.hypot(dx, dy)
            if d > r_max:
                continue
            r_norm = d / r_max if r_max > 1e-6 else 0.0
            # Soft rim into existing map (parchment / sea) — keep round falloff
            if r_norm < 0.74:
                edge_w = 1.0
            else:
                edge_w = 1.0 - _smoothstep01((r_norm - 0.74) / 0.255)
            if edge_w < 0.004:
                continue

            orig = px[x, y]
            theta = math.atan2(dy, dx)
            # Clockwise churn + inward tightening (reference: big spiral arms)
            phase = -theta + math.log(max(d, 1.2)) * 0.88 + 2.35 * ((1.0 - r_norm) ** 1.05)

            if r_norm < 0.048:
                br, bg, bb = 4, 6, 11
            elif r_norm < 0.078:
                t = (r_norm - 0.048) / 0.03
                br = int(4 + 10 * t)
                bg = int(6 + 18 * t)
                bb = int(11 + 28 * t)
            else:
                w_wave = math.sin(phase * 6.8)
                r_wave = math.sin(phase * 6.8 + math.pi * 0.52)
                foam = math.sin(phase * 13.0)
                ph = _world_end_pebble_hash(x >> 1, y >> 1)

                br, bg, bb = 15, 28, 42
                depth = 1.0 - 0.42 * r_norm
                if w_wave > 0.12:
                    tw = ((w_wave - 0.12) / 0.88) ** 1.05
                    br += int((52 + ph * 18) * tw * depth)
                    bg += int((82 + ph * 12) * tw * depth)
                    bb += int((92 + ph * 10) * tw * depth)
                if r_wave > 0.18:
                    tr = ((r_wave - 0.18) / 0.82) ** 0.95
                    br += int((-14 + ph * 10) * tr)
                    bg += int((-12 + ph * 8) * tr)
                    bb += int((-10 + ph * 6) * tr)
                    if ph > 0.86:
                        br -= 10
                        bg -= 9
                        bb -= 7
                # Brighter foam ring near the eye (cyan glow)
                if 0.078 < r_norm < 0.22:
                    ring = math.sin((r_norm - 0.078) / 0.142 * math.pi)
                    br += int(35 * ring * (1.0 - r_norm))
                    bg += int(58 * ring * (1.0 - r_norm))
                    bb += int(68 * ring * (1.0 - r_norm))
                # Thin ink striations (map-style)
                if abs(foam) > 0.94:
                    br = int(br * 0.86)
                    bg = int(bg * 0.86)
                    bb = int(bb * 0.86)

                br = max(0, min(255, br))
                bg = max(0, min(255, bg))
                bb = max(0, min(255, bb))

            rgb = (br, bg, bb)
            if edge_w < 1.0:
                rgb = (
                    int(orig[0] * (1.0 - edge_w) + rgb[0] * edge_w),
                    int(orig[1] * (1.0 - edge_w) + rgb[1] * edge_w),
                    int(orig[2] * (1.0 - edge_w) + rgb[2] * edge_w),
                )
            px[x, y] = rgb

    return out, cx, cy, r_max


def draw_worlds_end_spiral_ink_overlay(
    overlay: Image.Image,
    cx: float,
    cy: float,
    r_max: float,
    rng: random.Random,
) -> None:
    """Loose ink spiral strokes (water-edge palette), clipped to the vortex disk."""
    draw = ImageDraw.Draw(overlay)
    ink = (18, 42, 58, 118)
    ink_hi = (70, 120, 135, 72)
    for arm in range(3):
        base = arm * (2 * math.pi / 3) + rng.uniform(-0.12, 0.12)
        pts: list[tuple[float, float]] = []
        t = 0.0
        while t < 48.0:
            rr = 6.5 * math.exp(0.104 * t) + rng.uniform(-0.8, 0.8)
            if rr > r_max * 0.96:
                break
            th = base + t * 0.285 + 0.04 * math.sin(t * 0.4)
            px = cx + rr * math.cos(th)
            py = cy + rr * math.sin(th)
            pts.append((px, py))
            t += 0.38
        if len(pts) > 2:
            draw.line(pts, fill=ink, width=2)
            draw.line(pts, fill=ink_hi, width=1)


def _dist_point_to_axis_rect(
    px: float, py: float, rx0: float, ry0: float, rx1: float, ry1: float
) -> float:
    """Distance from point to axis-aligned rectangle (0 if inside)."""
    cx = max(rx0, min(px, rx1))
    cy = max(ry0, min(py, ry1))
    return math.hypot(px - cx, py - cy)


def _pick_worlds_belt_sea_monster_centers_midline(
    bi: list[int],
    grid_w: int,
    grid_h: int,
    cw: int,
    ch: int,
    out_h: int,
    clear_r: float,
    min_sep: float,
    max_count: int = 4,
) -> list[tuple[float, float]]:
    """
    Ocean anchors on the map vertical midline (same y), spaced along x, kept clear of The World's End.
    """
    mid_y = out_h / 2.0
    wb = _world_end_pixel_bounds(bi, grid_w, grid_h, cw, ch)
    margin = 16.0
    wxb: tuple[float, float, float, float] | None = None
    if wb is not None:
        wx0, wy0, wx1, wy1 = wb
        wxb = (wx0 - margin, wy0 - margin, wx1 + margin, wy1 + margin)

    def collect(strict_clear: float) -> list[tuple[float, float]]:
        out: list[tuple[float, float]] = []
        for yy in range(grid_h):
            if not (yy * ch <= mid_y < (yy + 1) * ch):
                continue
            for xx in range(grid_w):
                if bi[yy * grid_w + xx] != 0:
                    continue
                cx = xx * cw + cw / 2
                if wxb is not None:
                    d = _dist_point_to_axis_rect(cx, mid_y, wxb[0], wxb[1], wxb[2], wxb[3])
                    if d < strict_clear:
                        continue
                out.append((cx, mid_y))
        out.sort(key=lambda t: t[0])
        return out

    candidates = collect(clear_r)
    if not candidates and wxb is not None:
        candidates = collect(max(clear_r * 0.62, 36.0))

    if not candidates:
        rows_by_mid = sorted(range(grid_h), key=lambda yy: abs((yy + 0.5) * ch - mid_y))
        for yy in rows_by_mid:
            row_cands: list[tuple[float, float]] = []
            cy = yy * ch + ch / 2
            for xx in range(grid_w):
                if bi[yy * grid_w + xx] != 0:
                    continue
                cx = xx * cw + cw / 2
                if wxb is not None:
                    d = _dist_point_to_axis_rect(cx, cy, wxb[0], wxb[1], wxb[2], wxb[3])
                    if d < clear_r:
                        continue
                row_cands.append((cx, cy))
            if row_cands:
                mid_y = cy
                candidates = sorted(row_cands, key=lambda t: t[0])
                break

    picked: list[tuple[float, float]] = []
    for c in candidates:
        if len(picked) >= max_count:
            break
        if all(math.hypot(c[0] - p[0], c[1] - p[1]) >= min_sep for p in picked):
            picked.append(c)

    return picked[:max_count]


def draw_worlds_belt_sea_monsters_global(
    overlay: Image.Image,
    grid_w: int,
    grid_h: int,
    bi: list[int],
    cw: int,
    ch: int,
    root: Path,
) -> None:
    """At most 4 sea creatures on World's Belt — vintage sheet if present, else procedural."""
    out_w = grid_w * cw
    out_h = grid_h * ch
    sheet_path = root / "Assets" / "WorldMap" / "sea_monsters_sheet.png"
    sheet: Image.Image | None = None
    if sheet_path.is_file():
        try:
            sheet = Image.open(sheet_path).convert("RGB")
        except OSError:
            sheet = None

    rng = random.Random(7283)
    max_side = max(105, min(128, int(min(out_w, out_h) * 0.088)))
    clear_r = max_side * 0.62 + 22.0
    min_sep = max(115.0, min(out_w, out_h) * 0.11)
    picked = _pick_worlds_belt_sea_monster_centers_midline(
        bi, grid_w, grid_h, cw, ch, out_h, clear_r, min_sep, 4
    )
    if not picked:
        return

    if sheet is not None:
        order = list(range(12))
        rng.shuffle(order)
        for i, (pcx, pcy) in enumerate(picked):
            spr_i = order[i % len(order)]
            crop = _crop_sea_monster_sprite(sheet, spr_i)
            rgba = _woodcut_sprite_to_map_ink(crop)
            rw, rh = rgba.size
            m = max(rw, rh)
            if m > max_side:
                s = max_side / m
                rgba = rgba.resize((max(1, int(rw * s)), max(1, int(rh * s))), Image.Resampling.LANCZOS)
            ang = rng.uniform(-5.5, 5.5)
            if abs(ang) > 0.4:
                rgba = rgba.rotate(
                    ang, expand=True, resample=Image.Resampling.BICUBIC, fillcolor=(0, 0, 0, 0)
                )
            fl = pcx - rgba.width / 2
            ft = pcy - rgba.height / 2
            overlay.paste(rgba, (int(fl), int(ft)), rgba)
        return

    draw = ImageDraw.Draw(overlay)
    ink_serpent = (10, 26, 42, 235)
    ink_kraken = (12, 30, 48, 235)
    ink_spiral = (14, 28, 46, 230)
    drawers = (
        draw_sea_serpent_large_global,
        draw_kraken_large_global,
        draw_spiral_leviathan_large_global,
    )
    for i, (pcx, pcy) in enumerate(picked):
        fn = drawers[i % len(drawers)]
        ink = (ink_serpent, ink_kraken, ink_spiral)[i % 3]
        fn(draw, pcx, pcy, rng, ink, cw, ch)


def draw_parchment_frame(overlay: Image.Image, out_w: int, out_h: int) -> None:
    draw = ImageDraw.Draw(overlay)
    margin = max(4, min(out_w, out_h) // 80)
    ink = (62, 48, 34, 130)
    ink2 = (85, 68, 48, 85)
    for i in range(2):
        m = margin + i * 3
        draw.rectangle([m, m, out_w - 1 - m, out_h - 1 - m], outline=ink if i == 0 else ink2, width=2 if i == 0 else 1)
    # Tiny compass rose (decorative)
    cx, cy = out_w - margin * 6, margin * 6
    r = margin * 2
    rose = (80, 60, 40, 130)
    draw.polygon([(cx, cy - r), (cx - r // 3, cy), (cx + r // 3, cy)], fill=rose)
    draw.polygon([(cx, cy + r), (cx - r // 3, cy), (cx + r // 3, cy)], fill=rose)
    draw.line([(cx, cy - r - 2), (cx, cy + r + 2)], fill=rose, width=1)
    draw.line([(cx - r - 2, cy), (cx + r + 2, cy)], fill=rose, width=1)


def vignette_parchment(base_rgb: Image.Image) -> Image.Image:
    w, h = base_rgb.size
    g = Image.new("L", (w, h))
    gx = g.load()
    cx, cy = w / 2, h / 2
    max_d = math.hypot(cx, cy) or 1.0
    for y in range(h):
        for x in range(w):
            d = math.hypot(x - cx, y - cy) / max_d
            v = int(255 * (1.0 - 0.2 * (d**1.35)))
            gx[x, y] = max(0, min(255, v))
    g = g.filter(ImageFilter.GaussianBlur(radius=max(3, w // 200)))
    edge = Image.new("RGB", (w, h), (22, 18, 14))
    return Image.composite(base_rgb, edge, g)


def main() -> None:
    root = Path(__file__).resolve().parent.parent
    w, h, bi = parse_world_map(root)
    px_per_cell_h = 12
    cw = 2 * px_per_cell_h
    ch = px_per_cell_h
    out_w = w * cw
    out_h = h * ch

    grid = build_cell_grid(w, h, bi, seed=42)
    smooth = grid.resize((out_w, out_h), Image.Resampling.LANCZOS)
    smooth = smooth.filter(ImageFilter.GaussianBlur(radius=1.55))
    sharp = grid.resize((out_w, out_h), Image.Resampling.LANCZOS)
    out = Image.blend(sharp, smooth, 0.48)

    out = apply_directional_light(out)
    out = add_painterly_luminance(out, seed=101)
    out = ImageEnhance.Color(out).enhance(1.14)
    out = ImageEnhance.Contrast(out).enhance(1.07)

    warm = make_warm_canvas_texture(out_w, out_h, seed=77)
    out = Image.blend(out, warm, 0.15)

    grain = make_grain(out_w, out_h, seed=99)
    out = Image.blend(out, grain, 0.1)
    out = vignette_parchment(out)
    out, wcx, wcy, wR = paint_worlds_end_whirlpool(out, bi, w, h, cw, ch, seed=4242)
    if wcx is not None and wR is not None:
        ov_we = Image.new("RGBA", (out_w, out_h), (0, 0, 0, 0))
        draw_worlds_end_spiral_ink_overlay(ov_we, wcx, wcy, wR, random.Random(42421))
        out = Image.alpha_composite(out.convert("RGBA"), ov_we).convert("RGB")

    overlay = Image.new("RGBA", (out_w, out_h), (0, 0, 0, 0))
    # No draw_ink_edges: biome boundary lines removed so regions read as continuous color in the map UI.
    draw_map_symbols(overlay, w, h, bi, cw, ch)
    cities = parse_city_names_from_world_map_js(root)
    draw_map_cities_global(overlay, w, h, bi, cw, ch, cities)
    draw_worlds_belt_sea_monsters_global(overlay, w, h, bi, cw, ch, root)
    draw_parchment_frame(overlay, out_w, out_h)
    overlay = soften_rgba_overlay(overlay, 0.52)

    base = out.convert("RGBA")
    combined = Image.alpha_composite(base, overlay)
    out_final = combined.convert("RGB")

    dest = root / "Assets" / "WorldMap" / "full_map_texture.png"
    dest.parent.mkdir(parents=True, exist_ok=True)
    out_final.save(dest, "PNG", optimize=True)
    print("Wrote", dest.relative_to(root), out_final.size)

    labels = render_biome_labels_rgba(out_w, out_h, w, h, bi, cw, ch, root)
    labels_path = root / "Assets" / "WorldMap" / "full_map_labels.png"
    labels.save(labels_path, "PNG", optimize=True)
    print("Wrote", labels_path.relative_to(root), labels.size)


if __name__ == "__main__":
    main()
