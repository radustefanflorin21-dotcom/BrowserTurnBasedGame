#!/usr/bin/env python3
"""
Regenerate Assets/Biomes/The World's End/texture.png — same procedural vortex as full_map_texture
(build_world_map_texture.paint_worlds_end_whirlpool) so adventure UVs match the map art.

Run from repo root:
  py -3.11 tools/generate_worlds_end_texture.py
Then rebuild BiomeTransitions that touch biome 5:
  py -3.11 tools/build_biome_transition_textures.py
"""

from __future__ import annotations

import importlib.util
import random
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Install Pillow: pip install pillow", file=sys.stderr)
    sys.exit(1)

SIZE = 1280


def _load_build_world_map():
    p = Path(__file__).resolve().parent / "build_world_map_texture.py"
    spec = importlib.util.spec_from_file_location("build_world_map_texture", p)
    if spec is None or spec.loader is None:
        raise RuntimeError("Cannot load build_world_map_texture.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def main() -> None:
    root = Path(__file__).resolve().parent.parent
    dest = root / "Assets" / "Biomes" / "The World's End" / "texture.png"
    dest.parent.mkdir(parents=True, exist_ok=True)

    mod = _load_build_world_map()
    # 4×4: World's Belt (0) around a 2×2 World's End (5) so belt width matches paint_worlds_end_whirlpool.
    gw, gh = 4, 4
    cw, ch = SIZE // gw, SIZE // gh
    out = Image.new("RGB", (gw * cw, gh * ch), (18, 30, 42))
    bi: list[int] = []
    for yy in range(gh):
        for xx in range(gw):
            bi.append(
                mod.WORLD_END_BIOME_INDEX
                if xx in (1, 2) and yy in (1, 2)
                else mod.WORLDS_BELT_BIOME_INDEX
            )
    out, wcx, wcy, wR = mod.paint_worlds_end_whirlpool(out, bi, gw, gh, cw, ch, seed=4242)
    if wcx is not None and wR is not None:
        ov = Image.new("RGBA", (out.size[0], out.size[1]), (0, 0, 0, 0))
        mod.draw_worlds_end_spiral_ink_overlay(ov, wcx, wcy, wR, random.Random(42421))
        out = Image.alpha_composite(out.convert("RGBA"), ov).convert("RGB")

    out.save(dest, "PNG", optimize=True)
    print("Wrote", dest.relative_to(root), out.size)


if __name__ == "__main__":
    main()
