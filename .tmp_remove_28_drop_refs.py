import pathlib
import re

path = pathlib.Path(r"d:/Projects/OnlineGameAttempt/BrowserTurnBasedGame/monster_drop_tables.js")
text = path.read_text(encoding="utf-8")

to_remove = {
    "Abyss Ring",
    "Anchor Boots",
    "Bonebreaker Wraps",
    "Brine Staff",
    "Bulwark Chest",
    "Coil Ring",
    "Crust Helm",
    "Dartneedle",
    "Earthroot Boots",
    "Flow Loop",
    "Frozen Helm",
    "Harrow Amulet",
    "Hunter Bracelet",
    "Idol Core Armor",
    "Molten Crest Helm",
    "Primal Bone Club",
    "Prowler Boots",
    "Revenant Core",
    "Ripple Rod",
    "Rustblade",
    "Skull Helm",
    "Talon Cleaver",
    "Thorn Carapace",
    "Tidal Wraps",
    "Tidemeld Focus",
    "Trample Boots",
    "Venom Fang",
    "Withered Focus",
}

lines = text.splitlines()
out = []
removed = 0
for line in lines:
    m = re.search(r'item:\s*"([^"]+)"', line)
    if m and m.group(1) in to_remove:
        removed += 1
        continue
    out.append(line)

path.write_text("\n".join(out) + "\n", encoding="utf-8")
print(f"Removed gear entries: {removed}")
