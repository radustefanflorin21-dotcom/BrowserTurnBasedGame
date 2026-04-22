import pathlib
import re

cfg = pathlib.Path(r"d:/Projects/OnlineGameAttempt/BrowserTurnBasedGame/config.js").read_text(encoding="utf-8")

# Build monster -> min-max level from enemy definitions
monster_levels = {}
for m in re.finditer(r'name:\s*"([^"]+)"(.*?)possibleLevels:\s*\[([^\]]+)\]', cfg, re.S):
    name = m.group(1).strip()
    nums = [int(x) for x in re.findall(r"\d+", m.group(3))]
    if nums:
        monster_levels[name] = (min(nums), max(nums))

# Extract passable biome regions with monster lists
regions = []
for m in re.finditer(r'name:\s*"([^"]+)"\s*,\s*passable:\s*true.*?possibleEnemies:\s*\[([^\]]*)\]', cfg, re.S):
    region = m.group(1).strip()
    mons = [x.strip().strip('"') for x in m.group(2).split(",") if x.strip()]
    regions.append((region, mons))

for region, mons in regions:
    print(region)
    for mon in mons:
        if mon in monster_levels:
            lo, hi = monster_levels[mon]
            print(f"- {mon}: {lo}-{hi}")
        else:
            print(f"- {mon}: ?")
    print()
