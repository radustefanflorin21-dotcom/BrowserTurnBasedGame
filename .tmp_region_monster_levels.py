import pathlib
import re

cfg = pathlib.Path(r"d:/Projects/OnlineGameAttempt/BrowserTurnBasedGame/config.js").read_text(encoding="utf-8")


def find_matching_brace(src, start_idx):
    depth = 0
    in_str = False
    esc = False
    for i in range(start_idx, len(src)):
        ch = src[i]
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
            continue
        if ch == '"':
            in_str = True
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return i
    return -1


# Parse enemies
enemies_pos = cfg.find("  enemies: [")
enemies_open = cfg.find("[", enemies_pos)
enemies_close = cfg.find("\n  ],", enemies_open)
enemies_blob = cfg[enemies_open:enemies_close]

monster_levels = {}
for name, levels in re.findall(r'name:\s*"([^"]+)".*?possibleLevels:\s*\[([^\]]+)\]', enemies_blob, re.S):
    vals = [int(v.strip()) for v in levels.split(",") if v.strip().isdigit()]
    if vals:
        monster_levels[name] = f"{min(vals)}-{max(vals)}"

# Parse biomes (passable true only)
wm_pos = cfg.find("biomes: [")
wm_open = cfg.find("[", wm_pos)
wm_close = find_matching_brace(cfg, cfg.find("{", wm_pos))  # not used directly
biomes_end = cfg.find("\n    ]", wm_pos)
biomes_blob = cfg[wm_open:biomes_end]

region_entries = re.findall(
    r'name:\s*"([^"]+)".*?passable:\s*true.*?possibleEnemies:\s*\[([^\]]*)\]',
    biomes_blob,
    re.S,
)

for region, enemies in region_entries:
    names = [n.strip().strip('"') for n in enemies.split(",") if n.strip()]
    print(region)
    for n in names:
        lv = monster_levels.get(n, "?")
        print(f"- {n} (Lv {lv})")
    print()
