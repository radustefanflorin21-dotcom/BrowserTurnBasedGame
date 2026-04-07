#!/usr/bin/env python3
"""
Generate Assets/BiomeTransitions/<lo>_<hi>/blend.png for each biome pair that touches on the map.

- If both Assets/Biomes/<name>/texture.png exist, builds a soft horizontal composite (hand-drawn style).
- Otherwise builds a multi-scale noisy gradient from legend colors (matches map palette when textures are absent).

Run from repo root: py -3.11 tools/build_biome_transition_textures.py
Requires: pip install pillow
"""

from __future__ import annotations

import random
import re
import sys
from pathlib import Path

try:
    from PIL import Image, ImageFilter
except ImportError:
    print("Install Pillow: pip install pillow", file=sys.stderr)
    sys.exit(1)

# Must match config.js worldMap.biomes order (index = biome index).
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


def hex_to_rgb(h: str) -> tuple[int, int, int]:
    h = h.strip().lstrip("#")
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def smoothstep(t: float) -> float:
    t = max(0.0, min(1.0, t))
    return t * t * (3.0 - 2.0 * t)


def parse_map_width_height(root: Path) -> tuple[int, int]:
    p = root / "world_map_data.js"
    text = p.read_text(encoding="utf-8")
    mw = re.search(r"const\s+WIDTH\s*=\s*(\d+)", text)
    mh = re.search(r"const\s+HEIGHT\s*=\s*(\d+)", text)
    w = int(mw.group(1)) if mw else 50
    h = int(mh.group(1)) if mh else 100
    return w, h


def enumerate_pairs_from_map(root: Path) -> list[tuple[int, int]]:
    w, h = parse_map_width_height(root)
    p = root / "world_map_data.js"
    text = p.read_text(encoding="utf-8")
    i0 = text.index("new Uint8Array([")
    i1 = text.index("])", i0)
    inner = text[i0 + len("new Uint8Array([") : i1]
    arr = [int(x) for x in inner.replace("\n", " ").replace("\r", "").split(",") if x.strip()]
    if len(arr) < w * h:
        raise SystemExit(f"world_map_data length {len(arr)} < {w * h}")
    pairs: set[tuple[int, int]] = set()
    for y in range(h):
        for x in range(w):
            a = arr[y * w + x]
            if x + 1 < w:
                b = arr[y * w + x + 1]
                if a != b:
                    lo, hi = (a, b) if a < b else (b, a)
                    pairs.add((lo, hi))
            if y + 1 < h:
                b = arr[(y + 1) * w + x]
                if a != b:
                    lo, hi = (a, b) if a < b else (b, a)
                    pairs.add((lo, hi))
    return sorted(pairs)


def load_biome_texture(root: Path, biome_idx: int) -> Image.Image | None:
    if biome_idx < 0 or biome_idx >= len(BIOME_NAMES):
        return None
    path = root / "Assets" / "Biomes" / BIOME_NAMES[biome_idx] / "texture.png"
    if not path.is_file():
        return None
    try:
        return Image.open(path).convert("RGB")
    except OSError:
        return None


def make_noise_layer(size: int, seed: int, grain: int = 96) -> Image.Image:
    """Soft low-frequency color noise, blurred to read as painted terrain."""
    random.seed(seed)
    small_w = max(8, size // grain)
    small_h = max(8, size // grain)
    im = Image.new("RGB", (small_w, small_h))
    px = im.load()
    for y in range(small_h):
        for x in range(small_w):
            px[x, y] = (
                random.randint(40, 220),
                random.randint(40, 220),
                random.randint(40, 220),
            )
    up = im.resize((size, size), Image.Resampling.LANCZOS)
    return up.filter(ImageFilter.GaussianBlur(radius=max(1, size // 256)))


def tint_noise(noise: Image.Image, rgb: tuple[int, int, int], strength: float) -> Image.Image:
    """Multiply-blend noise toward biome color."""
    r, g, b = rgb
    n = noise.load()
    out = Image.new("RGB", noise.size)
    o = out.load()
    w, h = noise.size
    for y in range(h):
        for x in range(w):
            nr, ng, nb = n[x, y]
            tr = int(r * (0.35 + 0.65 * nr / 255))
            tg = int(g * (0.35 + 0.65 * ng / 255))
            tb = int(b * (0.35 + 0.65 * nb / 255))
            o[x, y] = (tr, tg, tb)
    return out


def make_gradient_mask(size: int, seed: int) -> Image.Image:
    """Grayscale mask: 255 left (biome lo) -> 0 right (biome hi), soft center band."""
    random.seed(seed + 11)
    m = Image.new("L", (size, size))
    mx = m.load()
    edge_lo = 0.22 + random.uniform(-0.04, 0.04)
    edge_hi = 0.78 + random.uniform(-0.04, 0.04)
    for y in range(size):
        for x in range(size):
            u = x / (size - 1) if size > 1 else 0.0
            v = y / (size - 1) if size > 1 else 0.0
            t = (u * 0.92 + v * 0.08 - edge_lo) / max(1e-6, (edge_hi - edge_lo))
            a = int(255 * (1.0 - smoothstep(t)))
            mx[x, y] = max(0, min(255, a))
    return m.filter(ImageFilter.GaussianBlur(radius=max(1.5, size / 200)))


def blend_from_textures(
    ta: Image.Image, tb: Image.Image, size: int, seed: int
) -> Image.Image:
    ta = ta.resize((size, size), Image.Resampling.LANCZOS)
    tb = tb.resize((size, size), Image.Resampling.LANCZOS)
    mask = make_gradient_mask(size, seed)
    comp = Image.composite(ta, tb, mask)
    grain = make_noise_layer(size, seed + 902, grain=80)
    return Image.blend(comp, grain, 0.1)


def procedural_blend(lo: int, hi: int, size: int, seed: int) -> Image.Image:
    c0 = hex_to_rgb(BIOME_HEX[lo])
    c1 = hex_to_rgb(BIOME_HEX[hi])
    random.seed(seed)
    n0 = tint_noise(make_noise_layer(size, seed, grain=72), c0, 0.6)
    n1 = tint_noise(make_noise_layer(size, seed + 1, grain=72), c1, 0.6)
    mask = make_gradient_mask(size, seed)
    comp = Image.composite(n0, n1, mask)
    base = Image.new("RGB", (size, size))
    bx = base.load()
    for y in range(size):
        for x in range(size):
            u = x / (size - 1) if size > 1 else 0.0
            v = y / (size - 1) if size > 1 else 0.0
            t = smoothstep(u * 0.88 + v * 0.12)
            r = int(c0[0] * (1 - t) + c1[0] * t)
            g = int(c0[1] * (1 - t) + c1[1] * t)
            b = int(c0[2] * (1 - t) + c1[2] * t)
            bx[x, y] = (r, g, b)
    out = Image.blend(base, comp, 0.72)
    grain = make_noise_layer(size, seed + 404, grain=48)
    grain = grain.point(lambda p: int(p * 0.08))
    out = Image.blend(out, grain, 0.22)
    return out


def make_blend_png(lo: int, hi: int, out_path: Path, root: Path, size: int = 512) -> None:
    seed = lo * 10007 + hi * 10009
    ta = load_biome_texture(root, lo)
    tb = load_biome_texture(root, hi)
    if ta is not None and tb is not None:
        img = blend_from_textures(ta, tb, size, seed)
    elif ta is not None:
        tb_fill = tint_noise(
            make_noise_layer(size, seed + 303, 72), hex_to_rgb(BIOME_HEX[hi]), 0.6
        )
        img = blend_from_textures(ta, tb_fill, size, seed)
    elif tb is not None:
        ta_fill = tint_noise(
            make_noise_layer(size, seed + 203, 72), hex_to_rgb(BIOME_HEX[lo]), 0.6
        )
        img = blend_from_textures(ta_fill, tb, size, seed)
    else:
        img = procedural_blend(lo, hi, size, seed)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(out_path, "PNG", optimize=True)


def main() -> None:
    root = Path(__file__).resolve().parent.parent
    pairs = enumerate_pairs_from_map(root)
    out_root = root / "Assets" / "BiomeTransitions"
    for lo, hi in pairs:
        if lo >= len(BIOME_HEX) or hi >= len(BIOME_HEX):
            print("skip invalid indices", lo, hi, file=sys.stderr)
            continue
        dest = out_root / f"{lo}_{hi}" / "blend.png"
        make_blend_png(lo, hi, dest, root)
        print(dest.relative_to(root))
    print("done,", len(pairs), "pairs")


if __name__ == "__main__":
    main()
