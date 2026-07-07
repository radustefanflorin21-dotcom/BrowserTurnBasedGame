# Tactical board 3D unit models (GLB)

Place rigged **GLB** files here. Units reference them from `config.js` via `model3d.url`.

## Required animation clips

Each model should include clips named (or mapped in config):

| State | When played | Loop |
|-------|-------------|------|
| **idle** | Waiting, other units' turns | Yes |
| **walk** | Moving one tactical square | No (once per square, timed to step) |
| **attack** | Basic attack | No → returns to idle |
| **skill** | Using a skill | No → returns to idle |
| **fall** | Unit dies | No → token removed after clip |

Default clip names tried automatically: `Idle`, `Walk`, `Attack`, `Skill`, `Death` (see `shared/unit_visual_states.js`).

## Example config (`config.js` enemy entry)

```js
{
  name: "Gorilla",
  combatScript: "gorilla",
  image: "Assets/Monsters/greenleaf_gorilla.png", // 2D fallback
  model3d: {
    url: "Assets/Models/gorilla.glb",
    scale: 1,
    baseScale: 1.6,  // target size in scene units (auto-fit from mesh bounds)
    yOffset: 0,
    animations: {
      idle: "Idle",
      walk: "Walk",
      attack: "Attack",
      skill: "Skill",
      fall: "Death"
    }
  }
}
```

## Layout

Per-unit position/scale on the board still uses `tactical_token_presets.js` (same as 2D tokens).

## Fallback

If the GLB is missing or fails to load, the game uses the existing PNG/sprite for that unit.
