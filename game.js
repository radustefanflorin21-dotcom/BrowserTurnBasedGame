/** Gladiatus-style slot ids — positions set in CSS (weapon | chest | shield row, etc.) */
const EQUIP_SLOTS = [
  { id: "head", label: "Head", cls: "paper-slot--head" },
  { id: "amulet", label: "Amulet", cls: "paper-slot--amulet" },
  { id: "weapon", label: "Weapon", cls: "paper-slot--weapon" },
  { id: "chest", label: "Chest", cls: "paper-slot--chest" },
  { id: "offhand", label: "Shield", cls: "paper-slot--offhand" },
  { id: "gloves", label: "Gloves", cls: "paper-slot--gloves" },
  { id: "legs", label: "Legs", cls: "paper-slot--legs" },
  { id: "feet", label: "Boots", cls: "paper-slot--feet" },
  { id: "ring1", label: "Ring", cls: "paper-slot--ring1" },
  { id: "ring2", label: "Ring", cls: "paper-slot--ring2" }
];

let currentPage = "adventure";
let inventoryTab = "equipment";
/** "characteristics" | "skills" | "professions" — overview stats panel */
let overviewStatsTab = "characteristics";
let activeMenuPanel = null;
let dragPayload = null;
/** Respawn label updates on adventure (no full re-render — avoids image flash) */
let adventureRespawnTick = null;
/** Reposition world encounter panels on a timer (config.worldMap.mobPanelWanderMs). */
let adventureCampWanderTick = null;
/** Invalidates pending RAF from startAdventureCampWanderTimer when navigating away quickly. */
let adventureWanderStartGen = 0;
/** Per-tile panel positions until wander bucket changes — avoids re-rolling on every render (no micro-jump on map open). */
const campPanelLayoutCache = new Map();
/** Sampled average RGB from each tile's adventure background image (world map + minimap). */
const mapCellArtColorByTileKey = new Map();
const mapCellArtColorByUrl = new Map();
const mapCellArtProbePending = new Set();
const mapCellArtProbeFailed = new Set();
let mapArtNotifyRaf = null;
/** Cells visible in each direction from player when opening world map modal (20 → 41×41 tiles) */
const WORLD_MAP_MODAL_NEIGHBOR_RADIUS = 20;
/** Landscape tiles: width = height × this ratio (length = 2× width in the sense of horizontal span). */
const WORLD_MAP_CELL_WIDTH_PER_HEIGHT = 2;
/** Most zoomed-out tile size (cell height in px; width = height × {@link WORLD_MAP_CELL_WIDTH_PER_HEIGHT}). */
const WORLD_MAP_MODAL_MIN_CELL_HEIGHT_PX = 10;
/** Pixel height of each map cell in the world map modal (zoom); width = height × {@link WORLD_MAP_CELL_WIDTH_PER_HEIGHT}. Persists for the session. */
let worldMapModalCellPx = 8;

function worldMapModalCellDims() {
  const cellH = worldMapModalCellPx;
  return { cellW: cellH * WORLD_MAP_CELL_WIDTH_PER_HEIGHT, cellH };
}
/** First time the world map modal opens this session, apply a stronger default zoom; after that, reuse {@link worldMapModalCellPx}. */
let worldMapModalZoomInitialized = false;
const WORLD_MAP_MODAL_FIRST_OPEN_ZOOM_MULT = 10;
const WORLD_MAP_MODAL_ZOOM_STEP = 1.08;

function emptyEquipment() {
  return {
    head: null,
    amulet: null,
    chest: null,
    weapon: null,
    offhand: null,
    gloves: null,
    legs: null,
    feet: null,
    ring1: null,
    ring2: null
  };
}

function buildStartingInventory() {
  const loadout = GAME_CONFIG && Array.isArray(GAME_CONFIG.startingLoadout) ? GAME_CONFIG.startingLoadout : [];
  const out = [];
  for (const entry of loadout) {
    if (!entry || typeof entry.name !== "string") continue;
    const name = entry.name.trim();
    if (!name || !Object.prototype.hasOwnProperty.call(GAME_CONFIG.items || {}, name)) continue;
    const rawCount = typeof entry.count === "number" ? entry.count : 1;
    const count = Math.max(1, Math.floor(rawCount));
    for (let i = 0; i < count; i++) out.push(name);
  }
  return out;
}

function getLevelingConfig() {
  return GAME_CONFIG.leveling && typeof GAME_CONFIG.leveling === "object" ? GAME_CONFIG.leveling : {};
}

function getPlayerMaxLevel() {
  const c = getLevelingConfig();
  return typeof c.maxLevel === "number" && c.maxLevel > 1 ? Math.floor(c.maxLevel) : 50;
}

/**
 * XP required to advance from `level` to `level + 1`. Returns 0 at or above max level.
 * Default curve from config: 150 + level²×4 (e.g. L1→154, L10→550).
 */
function xpToNextLevel(level) {
  const lv = Math.floor(typeof level === "number" && level > 0 ? level : 1);
  const maxLv = getPlayerMaxLevel();
  if (lv >= maxLv) return 0;
  const c = getLevelingConfig();
  const a = typeof c.xpToNextConst === "number" && Number.isFinite(c.xpToNextConst) ? c.xpToNextConst : 150;
  const b =
    typeof c.xpToNextLevelSquare === "number" && Number.isFinite(c.xpToNextLevelSquare) ? c.xpToNextLevelSquare : 4;
  return Math.max(1, Math.floor(a + lv * lv * b));
}

const defaultPlayer = () => {
  const st = GAME_CONFIG.worldMap.defaultStart;
  return {
    name: "Hero",
    level: 1,
    xp: 0,
    hp: 100,
    maxHp: 100,
    str: 10,
    dex: 10,
    vit: 10,
    int: 10,
    baseAttack: 10,
    charPoints: 0,
    gold: 0,
    skills: ["Power Strike", "Heavy Blow", "Precise Shot", "Arcane Strike", "Quick Reflexes"],
    inventory: buildStartingInventory(),
    equipment: emptyEquipment(),
    theme: "medieval",
    charPointsRetroDone: true,
    worldMap: {
      x: st.x,
      y: st.y,
      cells: {},
      scenePickups: {},
      sceneLayout: {},
      sceneEdits: {},
      portalWorldById: {},
      spawnPressure: { monsters: {} }
    },
    editMode: false
  };
};

let player = loadPlayer();
save();

/** Merge {@link GAME_CONFIG.worldMap.cityPortals} into coordinateCells (one waygate per entry, only on the anchor tile x,y). */
function applyCityPortalsFromConfig() {
  const wm = GAME_CONFIG.worldMap;
  if (!wm || !Array.isArray(wm.cityPortals)) return;
  wm.coordinateBackgrounds = wm.coordinateBackgrounds && typeof wm.coordinateBackgrounds === "object" ? wm.coordinateBackgrounds : {};
  wm.coordinateCells = wm.coordinateCells && typeof wm.coordinateCells === "object" ? wm.coordinateCells : {};
  for (const p of wm.cityPortals) {
    if (typeof p.x !== "number" || typeof p.y !== "number" || typeof p.name !== "string" || !p.name.trim()) continue;
    const nameTrim = p.name.trim();
    const anchorKey = worldMapKey(p.x, p.y);
    const theme = typeof p.theme === "string" && /^[a-zA-Z0-9_-]+$/.test(p.theme) ? p.theme : "portal-theme-default";
    const label = typeof p.label === "string" && p.label.trim() ? p.label.trim() : "Waygate";
    const portalId = `portal_${anchorKey}`;
    const portalEl = { type: "portal", id: portalId, label, city: nameTrim, theme, editable: true };
    if (typeof p.leftPct === "number" && Number.isFinite(p.leftPct)) portalEl.leftPct = clampScenePct(p.leftPct);
    if (typeof p.topPct === "number" && Number.isFinite(p.topPct)) portalEl.topPct = clampScenePct(p.topPct);
    if (typeof p.scalePct === "number" && Number.isFinite(p.scalePct)) portalEl.scalePct = clampSceneScalePct(p.scalePct);
    const prev = wm.coordinateCells[anchorKey];
    if (prev && prev.kind === "scene") {
      const raw = Array.isArray(prev.elements) ? prev.elements : [];
      const elements = raw.map((e) => (e && typeof e === "object" ? { ...e } : e));
      const idx = elements.findIndex((e) => e && e.type === "portal" && e.id === portalId);
      if (idx >= 0) elements[idx] = { ...elements[idx], ...portalEl };
      else elements.push(portalEl);
      wm.coordinateCells[anchorKey] = {
        kind: "scene",
        title: typeof prev.title === "string" ? prev.title : "",
        description: typeof prev.description === "string" ? prev.description : "",
        elements
      };
    } else {
      wm.coordinateCells[anchorKey] = {
        kind: "scene",
        title: "",
        description: "",
        elements: [portalEl]
      };
    }
  }
}

/**
 * Removes the config city portal waygate from other tiles in the same city when saved in {@link player.worldMap.sceneEdits}
 * (e.g. after older builds replicated the portal to every city cell).
 */
function pruneDuplicateCityPortalsFromSceneEdits() {
  const wm = GAME_CONFIG.worldMap;
  if (!wm || !Array.isArray(wm.cityPortals)) return;
  const edits = player.worldMap.sceneEdits;
  if (!edits || typeof edits !== "object") return;
  let changed = false;
  for (const p of wm.cityPortals) {
    if (typeof p.x !== "number" || typeof p.y !== "number" || typeof p.name !== "string" || !p.name.trim()) continue;
    const anchorKey = worldMapKey(p.x, p.y);
    const portalId = `portal_${anchorKey}`;
    const nameTrim = p.name.trim();
    for (const k of Object.keys(edits)) {
      if (k === anchorKey) continue;
      const { x, y } = parseWorldMapKey(k);
      if (getWorldMapCityName(x, y) !== nameTrim) continue;
      const edit = edits[k];
      if (!edit || edit.kind !== "scene" || !Array.isArray(edit.elements)) continue;
      const next = edit.elements.filter((el) => !(el && el.type === "portal" && el.id === portalId));
      if (next.length === edit.elements.length) continue;
      changed = true;
      const titleEmpty = !edit.title || !String(edit.title).trim();
      const descEmpty = !edit.description || !String(edit.description).trim();
      if (next.length === 0 && titleEmpty && descEmpty) {
        delete edits[k];
      } else {
        edit.elements = next;
      }
    }
  }
  if (changed) save();
}

applyCityPortalsFromConfig();
pruneDuplicateCityPortalsFromSceneEdits();

function loadPlayer() {
  try {
    const raw = localStorage.getItem("player");
    const p = raw ? JSON.parse(raw) : defaultPlayer();
    migratePlayer(p);
    return p;
  } catch {
    return defaultPlayer();
  }
}

function migratePlayer(p) {
  if (typeof p.name !== "string" || !p.name.trim()) p.name = "Hero";
  const maxLv = getPlayerMaxLevel();
  if (typeof p.level !== "number" || p.level < 1) p.level = 1;
  else if (p.level > maxLv) p.level = maxLv;
  if (typeof p.str !== "number") p.str = 10;
  if (typeof p.dex !== "number") {
    p.dex = typeof p.agi === "number" && Number.isFinite(p.agi) ? p.agi : 10;
  }
  if (Object.prototype.hasOwnProperty.call(p, "agi")) delete p.agi;
  if (typeof p.vit !== "number") p.vit = 10;
  if (typeof p.int !== "number") p.int = 10;
  if (!p.theme || !GAME_CONFIG.themes[p.theme]) p.theme = "medieval";
  if (!Array.isArray(p.inventory)) p.inventory = [];
  if (!Array.isArray(p.skills)) p.skills = defaultPlayer().skills.slice();
  else {
    ["Heavy Blow", "Precise Shot", "Arcane Strike"].forEach((name) => {
      const def = GAME_CONFIG.skills.find((s) => s.name === name);
      if (def && !p.skills.includes(name)) p.skills.push(name);
    });
  }
  const eq = p.equipment || {};
  const base = emptyEquipment();
  EQUIP_SLOTS.forEach((s) => {
    if (Object.prototype.hasOwnProperty.call(eq, s.id)) base[s.id] = eq[s.id];
  });
  if (Object.prototype.hasOwnProperty.call(eq, "armor") && base.chest == null) base.chest = eq.armor;
  p.equipment = base;
  if (typeof p.charPoints !== "number" || p.charPoints < 0) p.charPoints = 0;
  /** One-time retrospective: earned = (level−1)×5; STR/AGI/VIT above 10 count as already spent (1:1). */
  if (!p.charPointsRetroDone) {
    const level = typeof p.level === "number" && p.level >= 1 ? p.level : 1;
    const earned = Math.max(0, (level - 1) * 5);
    const s = Math.max(0, p.str - 10);
    const dexVal = typeof p.dex === "number" ? p.dex : 10;
    const a = Math.max(0, dexVal - 10);
    const v = Math.max(0, p.vit - 10);
    const inc = Math.max(0, (typeof p.int === "number" ? p.int : 10) - 10);
    const allocatedToStats = s + a + v + inc;
    p.charPoints = Math.max(0, earned - allocatedToStats);
    p.charPointsRetroDone = true;
  }
  p.maxHp = computeMaxHp(p);
  if (typeof p.hp !== "number" || p.hp <= 0) p.hp = p.maxHp;
  p.hp = Math.min(p.hp, p.maxHp);
  if (!p.worldMap || typeof p.worldMap.x !== "number" || typeof p.worldMap.y !== "number") {
    const st = GAME_CONFIG.worldMap.defaultStart;
    const prevCells = p.worldMap && typeof p.worldMap.cells === "object" ? p.worldMap.cells : {};
    const prevPickups = p.worldMap && typeof p.worldMap.scenePickups === "object" ? p.worldMap.scenePickups : {};
    const prevLayout = p.worldMap && typeof p.worldMap.sceneLayout === "object" ? p.worldMap.sceneLayout : {};
    const prevEdits = p.worldMap && typeof p.worldMap.sceneEdits === "object" ? p.worldMap.sceneEdits : {};
    const prevPortalWorld =
      p.worldMap && typeof p.worldMap.portalWorldById === "object" ? p.worldMap.portalWorldById : {};
    const prevSpawnPressure =
      p.worldMap && p.worldMap.spawnPressure && typeof p.worldMap.spawnPressure === "object"
        ? p.worldMap.spawnPressure
        : { monsters: {} };
    p.worldMap = {
      x: st.x,
      y: st.y,
      cells: prevCells,
      scenePickups: prevPickups,
      sceneLayout: prevLayout,
      sceneEdits: prevEdits,
      portalWorldById: prevPortalWorld,
      spawnPressure: prevSpawnPressure
    };
  } else if (!p.worldMap.cells || typeof p.worldMap.cells !== "object") {
    p.worldMap.cells = {};
  }
  if (!p.worldMap.scenePickups || typeof p.worldMap.scenePickups !== "object") p.worldMap.scenePickups = {};
  if (!p.worldMap.sceneLayout || typeof p.worldMap.sceneLayout !== "object") p.worldMap.sceneLayout = {};
  if (!p.worldMap.sceneEdits || typeof p.worldMap.sceneEdits !== "object") p.worldMap.sceneEdits = {};
  if (!p.worldMap.portalWorldById || typeof p.worldMap.portalWorldById !== "object") p.worldMap.portalWorldById = {};
  if (!p.worldMap.spawnPressure || typeof p.worldMap.spawnPressure !== "object") p.worldMap.spawnPressure = { monsters: {} };
  if (!p.worldMap.spawnPressure.monsters || typeof p.worldMap.spawnPressure.monsters !== "object") {
    p.worldMap.spawnPressure.monsters = {};
  }
  if (p.worldMap.cityPortalCoords && typeof p.worldMap.cityPortalCoords === "object") delete p.worldMap.cityPortalCoords;
  if (typeof p.editMode !== "boolean") p.editMode = false;
  if (p.worldMap && p.worldMap.cells && typeof p.worldMap.cells === "object") {
    Object.keys(p.worldMap.cells).forEach((k) => {
      const c = p.worldMap.cells[k];
      if (!c || typeof c !== "object") return;
      if (!Array.isArray(c.defeated)) c.defeated = [];
      if (!Array.isArray(c.defeatedUnits)) c.defeatedUnits = [];
      if (!Array.isArray(c.mobPreviews)) c.mobPreviews = [];
    });
  }
  const mpv =
    GAME_CONFIG.worldMap && typeof GAME_CONFIG.worldMap.mobPreviewVersion === "number"
      ? GAME_CONFIG.worldMap.mobPreviewVersion
      : 0;
  if (p.worldMap && p.worldMap.cells && typeof p.worldMap.cells === "object" && mpv > 0) {
    const prevGen = p.worldMap.mobPreviewGeneration;
    if (prevGen !== mpv) {
      Object.keys(p.worldMap.cells).forEach((k) => {
        const c = p.worldMap.cells[k];
        if (c && typeof c === "object" && Array.isArray(c.mobPreviews)) c.mobPreviews = [];
      });
      p.worldMap.mobPreviewGeneration = mpv;
    }
  }
}

function save() {
  localStorage.setItem("player", JSON.stringify(player));
}

function sumEquippedBonusStatsFromEquipment(equipment) {
  const out = { str: 0, dex: 0, vit: 0, int: 0, stamina: 0 };
  const eq = equipment && typeof equipment === "object" ? equipment : emptyEquipment();
  EQUIP_SLOTS.forEach((s) => {
    const n = eq[s.id];
    if (!n) return;
    const def = getItemDef(n);
    if (!def || !def.bonusStats || typeof def.bonusStats !== "object") return;
    for (const [k, v] of Object.entries(def.bonusStats)) {
      const nk = normalizeEquipmentStatKey(k);
      if (!nk || typeof v !== "number" || !Number.isFinite(v)) continue;
      if (nk === "stamina") {
        out.stamina += Math.floor(v);
        continue;
      }
      out[nk] += v;
    }
  });
  return out;
}

function totalVitFromPlayerRecord(p) {
  if (!p) return 0;
  const base = typeof p.vit === "number" && Number.isFinite(p.vit) ? p.vit : 10;
  const gearVit = sumEquippedBonusStatsFromEquipment(p.equipment).vit;
  return base + gearVit;
}

function computeMaxHp(p) {
  const sys = getStatSystem();
  const lv = typeof p.level === "number" && p.level >= 1 ? p.level : 1;
  const baseHp = getBaseHpFromLevel(lv);
  const vitPer = typeof sys.vitHpPerPoint === "number" ? sys.vitHpPerPoint : 12;
  return Math.max(1, Math.floor(baseHp + vitPer * totalVitFromPlayerRecord(p)));
}

function getItemDef(name) {
  return GAME_CONFIG.items[name] || null;
}

function getItemImage(itemName) {
  const def = getItemDef(itemName);
  if (def && def.image) return def.image;
  const t = encodeURIComponent(itemName.slice(0, 16));
  return `https://via.placeholder.com/72/3d3d3d/ddd?text=${t}`;
}

function getSkillImage(skillName) {
  const def = GAME_CONFIG.skills.find((s) => s.name === skillName);
  if (def && def.image) return def.image;
  return `Assets/Skills/${String(skillName)
    .toLowerCase()
    .replace(/\s+/g, "-")}.svg`;
}

function getArmorDefense() {
  let d = 0;
  EQUIP_SLOTS.forEach((s) => {
    const n = player.equipment[s.id];
    if (!n) return;
    const def = getItemDef(n);
    if (def && def.defense) d += def.defense;
  });
  return d;
}

function getStatSystem() {
  return GAME_CONFIG.statSystem && typeof GAME_CONFIG.statSystem === "object" ? GAME_CONFIG.statSystem : {};
}

function normalizeEquipmentStatKey(k) {
  const u = String(k).toUpperCase();
  if (u === "STR" || u === "STRENGTH") return "str";
  if (u === "DEX" || u === "AGI" || u === "AGILITY" || u === "DEXTERITY") return "dex";
  if (u === "VIT" || u === "VITALITY") return "vit";
  if (u === "INT" || u === "INTELLIGENCE") return "int";
  if (u === "STA" || u === "STAMINA" || u === "STAMINA_MAX" || u === "MAX_STAMINA") return "stamina";
  return null;
}

function sumEquippedBonusStats() {
  return sumEquippedBonusStatsFromEquipment(player.equipment || emptyEquipment());
}

function getPlayerCombatMaxStamina() {
  const sys = getStatSystem();
  const base =
    typeof sys.staminaPerTurn === "number" && sys.staminaPerTurn > 0 ? Math.floor(sys.staminaPerTurn) : 6;
  const fromGear = sumEquippedBonusStats().stamina || 0;
  return Math.max(1, base + fromGear);
}

function getFoeCombatMaxStamina(source) {
  const sys = getStatSystem();
  const base =
    typeof sys.staminaPerTurn === "number" && sys.staminaPerTurn > 0 ? Math.floor(sys.staminaPerTurn) : 6;
  const src = source && typeof source === "object" ? source : null;
  const fromSource =
    src && typeof src.staminaPerTurn === "number" && src.staminaPerTurn > 0
      ? Math.floor(src.staminaPerTurn)
      : src && typeof src.maxStamina === "number" && src.maxStamina > 0
        ? Math.floor(src.maxStamina)
        : src && typeof src.stamina === "number" && src.stamina > 0
          ? Math.floor(src.stamina)
          : base;
  return Math.max(1, fromSource);
}

function getPlayerStatBase(statKey) {
  if (statKey === "dex") {
    if (typeof player.dex === "number" && Number.isFinite(player.dex)) return player.dex;
    if (typeof player.agi === "number" && Number.isFinite(player.agi)) return player.agi;
    return 10;
  }
  const v = player[statKey];
  return typeof v === "number" && Number.isFinite(v) ? v : 10;
}

function getEffectiveStr() {
  return getPlayerStatBase("str") + sumEquippedBonusStats().str;
}
function getEffectiveDex() {
  return getPlayerStatBase("dex") + sumEquippedBonusStats().dex;
}
function getEffectiveVit() {
  return getPlayerStatBase("vit") + sumEquippedBonusStats().vit;
}
function getEffectiveInt() {
  return getPlayerStatBase("int") + sumEquippedBonusStats().int;
}

/** Total stats = base + invested + gear (buffs not implemented). */
function totalStr() {
  return Math.max(0, getEffectiveStr());
}
function totalDex() {
  return Math.max(0, getEffectiveDex());
}
function totalVit() {
  return Math.max(0, getEffectiveVit());
}
function totalInt() {
  return Math.max(0, getEffectiveInt());
}

function formulaStrPhysicalDamageBonusPct(str) {
  str = Math.max(0, str);
  return (90 * str) / (str + 180);
}
function formulaStrArmorPenetrationPct(str) {
  str = Math.max(0, str);
  return (25 * str) / (str + 180);
}
function formulaStrPhysicalResistPct(str) {
  str = Math.max(0, str);
  return (20 * str) / (str + 220);
}
function formulaStrStaggerChancePct(str) {
  str = Math.max(0, str);
  return (20 * str) / (str + 250);
}
function formulaDexCritChancePct(dex) {
  dex = Math.max(0, dex);
  return 3 + (32 * dex) / (dex + 240);
}
function formulaDexCritDamageBonusPct(dex) {
  dex = Math.max(0, dex);
  return (25 * dex) / (dex + 260);
}
function formulaDexEvasionPct(dex) {
  dex = Math.max(0, dex);
  return (30 * dex) / (dex + 260);
}
function formulaDexAccuracyPct(dex) {
  dex = Math.max(0, dex);
  return 85 + (15 * dex) / (dex + 120);
}
function formulaDexComboChancePct(dex) {
  dex = Math.max(0, dex);
  return (15 * dex) / (dex + 300);
}
function formulaVitFlatDamageReduction(vit) {
  vit = Math.max(0, vit);
  return Math.floor(vit / 40);
}
function formulaVitStatusResistPct(vit) {
  vit = Math.max(0, vit);
  return (35 * vit) / (vit + 220);
}
function formulaVitDotReductionPct(vit) {
  vit = Math.max(0, vit);
  return (30 * vit) / (vit + 200);
}
function formulaVitHealingReceivedBonusPct(vit) {
  vit = Math.max(0, vit);
  return (20 * vit) / (vit + 200);
}
function formulaIntSkillPowerBonusPct(int_) {
  int_ = Math.max(0, int_);
  return (90 * int_) / (int_ + 180);
}
function formulaIntMagicResistPct(int_) {
  int_ = Math.max(0, int_);
  return (20 * int_) / (int_ + 220);
}
function formulaIntStatusPotencyPct(int_) {
  int_ = Math.max(0, int_);
  return (40 * int_) / (int_ + 240);
}
function formulaIntStaminaCostReductionPct(int_) {
  int_ = Math.max(0, int_);
  return (20 * int_) / (int_ + 300);
}
function formulaIntDebuffDurationBonusPct(int_) {
  int_ = Math.max(0, int_);
  return (25 * int_) / (int_ + 260);
}

function getBaseHpFromLevel(level) {
  const sys = getStatSystem();
  const base = typeof sys.baseHpFromLevel === "number" ? sys.baseHpFromLevel : 50;
  const per = typeof sys.hpPerLevel === "number" ? sys.hpPerLevel : 10;
  const lv = Math.max(1, Math.floor(typeof level === "number" ? level : 1));
  return base + (lv - 1) * per;
}

function getEnemyDefCombatFields(foe) {
  const def = foe && foe.name ? getEnemyDefByName(foe.name) : null;
  return def && typeof def === "object" ? def : {};
}

function getFoeEvasionPct(foe) {
  const d = getEnemyDefCombatFields(foe);
  const fromDef = typeof d.evasionPct === "number" && Number.isFinite(d.evasionPct) ? Math.max(0, d.evasionPct) : 0;
  const ms = getMonsterScalingConfig();
  const dexC = typeof ms.evadeDexCoeff === "number" ? ms.evadeDexCoeff : 0.15;
  const dex = typeof foe.dex === "number" && Number.isFinite(foe.dex) ? Math.max(0, foe.dex) : 0;
  return Math.max(0, fromDef + dex * dexC);
}

function getFoePhysicalResistPct(foe) {
  const d = getEnemyDefCombatFields(foe);
  if (typeof d.physicalResistPct === "number" && Number.isFinite(d.physicalResistPct)) return Math.max(0, d.physicalResistPct);
  return 0;
}

function getFoeMagicResistPct(foe) {
  const d = getEnemyDefCombatFields(foe);
  if (typeof d.magicResistPct === "number" && Number.isFinite(d.magicResistPct)) return Math.max(0, d.magicResistPct);
  return 0;
}

function getFoeFlatDamageReduction(foe) {
  const d = getEnemyDefCombatFields(foe);
  if (typeof d.flatDamageReduction === "number" && Number.isFinite(d.flatDamageReduction))
    return Math.max(0, Math.floor(d.flatDamageReduction));
  return 0;
}

/**
 * Full outgoing damage resolution vs one foe (hit, crit, resists, flat, then thick hide / mitigation).
 * @returns {{ damage: number, missed: boolean, crit: boolean }}
 */
function resolvePlayerOutgoingDamageVsFoe(foe, baseSkillDamage, kind, skillName) {
  const sys = getStatSystem();
  const str = totalStr();
  const dex = totalDex();
  const int = totalInt();
  const sk = skillName ? GAME_CONFIG.skills.find((s) => s.name === skillName) : null;
  let dmgKind = "physical";
  if (sk && sk.damageKind === "magic") dmgKind = "magic";
  if (kind !== "skill") dmgKind = "physical";

  const minH = typeof sys.minHitChancePct === "number" ? sys.minHitChancePct : 15;
  const maxH = typeof sys.maxHitChancePct === "number" ? sys.maxHitChancePct : 100;
  const acc = formulaDexAccuracyPct(dex);
  const evF = getFoeEvasionPct(foe);
  const hitPct = Math.min(maxH, Math.max(minH, acc - evF));
  if (Math.random() * 100 >= hitPct) return { damage: 0, missed: true, crit: false };

  let d1 = Math.max(1, baseSkillDamage);
  if (dmgKind === "physical") {
    d1 *= 1 + formulaStrPhysicalDamageBonusPct(str) / 100;
  } else {
    d1 *= 1 + formulaIntSkillPowerBonusPct(int) / 100;
  }

  const critChance = formulaDexCritChancePct(dex) / 100;
  const crit = Math.random() < critChance;
  const baseCrit = typeof sys.baseCritMultiplierPct === "number" ? sys.baseCritMultiplierPct : 150;
  let d2 = d1;
  if (crit) {
    const critMulPct = baseCrit + formulaDexCritDamageBonusPct(dex);
    d2 = d1 * (critMulPct / 100);
  }

  let d3 = d2;
  if (dmgKind === "physical") {
    const pen = formulaStrArmorPenetrationPct(str);
    const resF = getFoePhysicalResistPct(foe);
    const effRes = Math.max(0, resF - pen);
    d3 = d2 * (1 - effRes / 100);
  } else {
    const mrF = getFoeMagicResistPct(foe);
    d3 = d2 * (1 - mrF / 100);
  }

  const foeFlat = getFoeFlatDamageReduction(foe);
  let flatSub = foeFlat;
  if (dmgKind === "magic") flatSub = Math.max(0, Math.floor(foeFlat / 2));
  let fin = Math.max(1, Math.floor(d3 - flatSub));

  const msMon = getMonsterScalingConfig();
  const vitF = typeof foe.vit === "number" && foe.vit > 0 ? foe.vit : 0;
  const drPer = typeof msMon.vitDamageReductionPerPoint === "number" ? msMon.vitDamageReductionPerPoint : 0.01;
  const drCap = typeof msMon.vitDamageReductionCapPct === "number" ? msMon.vitDamageReductionCapPct : 45;
  const drPct = Math.min(drCap / 100, vitF * drPer);
  fin = Math.max(1, Math.floor(fin * (1 - drPct)));

  let takenMult = typeof foe.damageTakenMult === "number" && foe.damageTakenMult > 0 ? foe.damageTakenMult : 1;
  if (foe.combat && typeof foe.combat.thickHideTurns === "number" && foe.combat.thickHideTurns > 0) {
    const th =
      typeof foe.combat.thickHideDamagedMult === "number" && foe.combat.thickHideDamagedMult > 0
        ? foe.combat.thickHideDamagedMult
        : 0.6;
    takenMult *= th;
  }
  if (
    foe.combat &&
    typeof foe.combat.mitigationTurns === "number" &&
    foe.combat.mitigationTurns > 0 &&
    typeof foe.combat.mitigationMult === "number" &&
    foe.combat.mitigationMult > 0
  ) {
    takenMult *= foe.combat.mitigationMult;
  }
  fin = Math.max(1, Math.floor(fin * takenMult));

  return { damage: fin, missed: false, crit };
}

function tryApplyStaggerFromSkill(foe, skillCfg) {
  if (!foe || !foe.combat || !skillCfg || !Array.isArray(skillCfg.combatTags)) return;
  const tags = skillCfg.combatTags.map((t) => String(t).toLowerCase());
  if (!tags.includes("heavy") && !tags.includes("crushing")) return;
  const p = formulaStrStaggerChancePct(totalStr()) / 100;
  if (Math.random() >= p) return;
  const sys = getStatSystem();
  const mult =
    typeof sys.staggerNextAttackMult === "number" && sys.staggerNextAttackMult > 0 && sys.staggerNextAttackMult < 1
      ? sys.staggerNextAttackMult
      : 0.85;
  foe.combat.staggerNextAttackMult = mult;
  appendFightLog(`${foe.name} is staggered — next strike is weaker (disrupted tempo).`);
}

function tryDexComboRefundAfterSkill(st) {
  if (!st || typeof st.stamina !== "number" || typeof st.maxStamina !== "number") return;
  if (st.comboRefundedThisTurn) return;
  const p = formulaDexComboChancePct(totalDex()) / 100;
  if (Math.random() >= p) return;
  st.comboRefundedThisTurn = true;
  st.stamina = Math.min(st.maxStamina, st.stamina + 1);
  appendFightLog("Combo rhythm: you recover 1 stamina.");
}

/** @returns {{ taken: number, evaded: boolean }} */
function computeHeroIncomingDamage(rawDamage) {
  const sys = getStatSystem();
  const dexE = totalDex();
  const strE = totalStr();
  const intE = totalInt();
  const vitE = totalVit();
  const enemyHit =
    typeof sys.enemyBaseHitChancePct === "number" && Number.isFinite(sys.enemyBaseHitChancePct)
      ? sys.enemyBaseHitChancePct
      : 100;
  const eva = formulaDexEvasionPct(dexE);
  const minH = typeof sys.minHitChancePct === "number" ? sys.minHitChancePct : 15;
  const maxH = typeof sys.maxHitChancePct === "number" ? sys.maxHitChancePct : 100;
  const hitPct = Math.min(maxH, Math.max(minH, enemyHit - eva));
  if (Math.random() * 100 >= hitPct) return { taken: 0, evaded: true };

  const physW =
    typeof sys.incomingPhysicalWeight === "number" && sys.incomingPhysicalWeight > 0 && sys.incomingPhysicalWeight < 1
      ? sys.incomingPhysicalWeight
      : 0.55;
  const pr = formulaStrPhysicalResistPct(strE) / 100;
  const mr = formulaIntMagicResistPct(intE) / 100;
  let r = rawDamage * (physW * (1 - pr) + (1 - physW) * (1 - mr));
  const flatArmor = getArmorDefense();
  const flatVit = formulaVitFlatDamageReduction(vitE);
  const physFlat = flatArmor + flatVit;
  const magFlat = Math.max(0, Math.floor(physFlat / 2));
  r -= physW * physFlat + (1 - physW) * magFlat;
  return { taken: Math.max(1, Math.floor(r)), evaded: false };
}

function initCombatStamina(st) {
  const maxS = getPlayerCombatMaxStamina();
  st.maxStamina = maxS;
  st.stamina = maxS;
  st.comboRefundedThisTurn = false;
}

function refillCombatStamina(st) {
  if (!st) return;
  const maxS = getPlayerCombatMaxStamina();
  st.maxStamina = maxS;
  st.stamina = maxS;
}

function getAttackStaminaCost() {
  const sys = getStatSystem();
  return typeof sys.attackStaminaCost === "number" && sys.attackStaminaCost > 0 ? Math.floor(sys.attackStaminaCost) : 2;
}

function getSkillStaminaCost(skillName) {
  const cfg = skillName ? GAME_CONFIG.skills.find((s) => s.name === skillName) : null;
  if (cfg && typeof cfg.staminaCost === "number" && cfg.staminaCost > 0) return Math.floor(cfg.staminaCost);
  return typeof getStatSystem().defaultSkillStamina === "number" && getStatSystem().defaultSkillStamina > 0
    ? Math.floor(getStatSystem().defaultSkillStamina)
    : 3;
}

/** Basic attack: fixed config cost (no Intelligence reduction). */
function resolveAttackStaminaCost() {
  const sys = getStatSystem();
  const b = getAttackStaminaCost();
  const minA = typeof sys.minAttackStaminaCost === "number" ? Math.max(1, Math.floor(sys.minAttackStaminaCost)) : 1;
  return Math.max(minA, b);
}

/** Skills: Intelligence reduces cost; minimum skill cost from config. */
function resolveSkillStaminaCost(baseCost) {
  const sys = getStatSystem();
  const b = Math.max(1, Math.floor(baseCost));
  const redPct = formulaIntStaminaCostReductionPct(totalInt());
  let c = Math.ceil(b * (1 - redPct / 100));
  const minSkill = typeof sys.minSkillStaminaCost === "number" ? Math.max(1, Math.floor(sys.minSkillStaminaCost)) : 2;
  c = Math.max(minSkill, c);
  return Math.max(1, c);
}

function endPlayerTurn() {
  const st = combatState;
  if (!st || st.phase !== "player") return;
  clearPlayerTurnTimer();
  tickPlayerTurnEndBuffs(st);
  runEnemyPhase();
}

/** Core attack before bonuses from skills that define combatMultiplier (those are applied in combat only). */
function getPlayerDamageCore() {
  let atk = player.baseAttack + Math.floor(getEffectiveStr() / 2);
  const w = player.equipment.weapon;
  if (w) atk += getItemDef(w)?.attack || 0;
  player.skills.forEach((s) => {
    const sk = GAME_CONFIG.skills.find((x) => x.name === s);
    if (sk && typeof sk.bonus === "number" && typeof sk.combatMultiplier !== "number") atk += sk.bonus;
  });
  return Math.max(1, atk);
}

function getPlayerDamage() {
  let atk = getPlayerDamageCore();
  player.skills.forEach((s) => {
    const sk = GAME_CONFIG.skills.find((x) => x.name === s);
    if (sk && typeof sk.bonus === "number" && typeof sk.combatMultiplier === "number") atk += sk.bonus;
  });
  return Math.max(1, Math.floor(atk));
}

/** Basic attack uses full listed damage; active combat skills use core + that skill’s bonus × multiplier. */
function getCombatDamage(kind, skillName) {
  if (kind !== "skill" || !skillName) return getPlayerDamage();
  const cfg = GAME_CONFIG.skills.find((x) => x.name === skillName);
  if (!cfg || typeof cfg.combatMultiplier !== "number" || !player.skills.includes(skillName)) {
    return getPlayerDamage();
  }
  const core = getPlayerDamageCore();
  const base = core + (typeof cfg.bonus === "number" ? cfg.bonus : 0);
  return Math.max(1, Math.floor(base * cfg.combatMultiplier));
}

function getDamageRange() {
  const base = getCombatDamage("attack");
  const strB = formulaStrPhysicalDamageBonusPct(totalStr()) / 100;
  const mid = Math.max(1, Math.floor(base * (1 + strB)));
  return { min: Math.max(1, mid - 2), max: mid + 2 };
}

/** @param {null | { playerBleed?: { dmg: number, turns: number } | null, playerPoison?: { dmg: number, turns: number } | null, playerAttackDebuffTurns?: number, playerHamstringSlowTurns?: number, packHowlTurns?: number }} [status] */
function getPlayerOutgoingDamageMultFromStatus(status) {
  if (!status) return 1;
  let m = 1;
  if (typeof status.playerAttackDebuffTurns === "number" && status.playerAttackDebuffTurns > 0) m *= 0.8;
  if (typeof status.playerHamstringSlowTurns === "number" && status.playerHamstringSlowTurns > 0) m *= 0.9;
  if (typeof status.playerBrineWeakTurns === "number" && status.playerBrineWeakTurns > 0) m *= 0.85;
  return m;
}

function ensureCombatStatus(st) {
  if (!st.status || typeof st.status !== "object") {
    st.status = {
      playerBleed: null,
      playerPoison: null,
      playerBurn: null,
      playerAttackDebuffTurns: 0,
      playerHamstringSlowTurns: 0,
      playerBrineWeakTurns: 0,
      playerFragileTurns: 0,
      playerStunTurns: 0,
      packHowlTurns: 0
    };
  }
}

function initFoeCombatRuntime(foe) {
  const def = getEnemyDefByName(foe.name);
  const script = def && typeof def.combatScript === "string" ? def.combatScript.trim() : "";
  foe.combat = {
    script,
    skillCd: {},
    raptorActCount: 0,
    wolfHowlDone: false,
    boarOpened: false
  };
}

function getFoeEffectiveAttackForCombat(foe) {
  const ms = getMonsterScalingConfig();
  const strCoeff = typeof ms.damageStrCoeff === "number" ? ms.damageStrCoeff : 0.015;
  const base = typeof foe.attack === "number" && foe.attack > 0 ? foe.attack : 1;
  const str = typeof foe.str === "number" && foe.str > 0 ? foe.str : 0;
  let a = Math.max(1, Math.floor(base * (1 + str * strCoeff)));
  if (foe.combat && foe.combat.script === "tusk_boar" && typeof foe.combat.rageStacks === "number" && foe.combat.rageStacks > 0) {
    a = Math.max(1, Math.floor(a * (1 + 0.05 * foe.combat.rageStacks)));
  }
  if (foe.combat && foe.combat.script === "gorilla" && typeof foe.combat.gorillaRampStacks === "number" && foe.combat.gorillaRampStacks > 0) {
    a = Math.max(1, Math.floor(a * (1 + 0.1 * Math.min(6, foe.combat.gorillaRampStacks))));
  }
  if (foe.combat && typeof foe.combat.staggerNextAttackMult === "number" && foe.combat.staggerNextAttackMult > 0 && foe.combat.staggerNextAttackMult < 1) {
    a = Math.max(1, Math.floor(a * foe.combat.staggerNextAttackMult));
    foe.combat.staggerNextAttackMult = undefined;
  }
  return a;
}

function getFoeOutgoingDamageMultiplier(st, foe) {
  let m = 1;
  if (st && st.status && typeof st.status.packHowlTurns === "number" && st.status.packHowlTurns > 0) {
    const pm =
      typeof st.status.packHowlAttackMult === "number" && st.status.packHowlAttackMult > 0
        ? st.status.packHowlAttackMult
        : 1.25;
    m *= pm;
  }
  if (foe.combat && typeof foe.combat.echoCryBonusTurns === "number" && foe.combat.echoCryBonusTurns > 0) m *= 1.25;
  return m;
}

const COMBAT_PARTY_MAX = 8;
const COMBAT_FOES_MAX = 8;

function ensureCombatParty(st) {
  if (Array.isArray(st.party) && st.party.length) {
    syncCombatPartyHeroMirror(st);
    return;
  }
  const maxH = typeof st.playerMax === "number" && st.playerMax > 0 ? st.playerMax : player.maxHp;
  const hp = Math.max(0, Math.min(maxH, typeof st.playerHp === "number" ? st.playerHp : player.hp));
  st.party = [
    {
      uid: 0,
      name: player.name,
      hp,
      maxHp: maxH,
      kind: "hero",
      dex: getEffectiveDex(),
      flatArmor: getArmorDefense()
    }
  ];
  syncCombatPartyHeroMirror(st);
}

function syncCombatPartyHeroMirror(st) {
  if (!Array.isArray(st.party) || !st.party.length) return;
  const hero = st.party.find((m) => m && m.kind === "hero");
  if (hero) {
    st.playerHp = hero.hp;
    st.playerMax = hero.maxHp;
  }
}

function syncHeroHpFromPlayerMirror(st) {
  ensureCombatParty(st);
  const hero = st.party.find((m) => m && m.kind === "hero");
  if (!hero || typeof st.playerHp !== "number") return;
  if (st.playerHp < 0) st.playerHp = 0;
  if (st.playerHp > hero.maxHp) st.playerHp = hero.maxHp;
  hero.hp = st.playerHp;
}

function isPartyAlive(st) {
  return Array.isArray(st.party) && st.party.some((m) => m && m.hp > 0);
}

function isAnyPartyMemberHpFractionBelow(st, frac) {
  ensureCombatParty(st);
  return st.party.some((m) => m && m.hp > 0 && m.maxHp > 0 && m.hp / m.maxHp < frac);
}

function buildCombatPartyForMob(mob) {
  const heroHp = Math.min(player.hp, player.maxHp);
  const party = [
    {
      uid: 0,
      name: player.name,
      hp: heroHp,
      maxHp: player.maxHp,
      kind: "hero",
      dex: getEffectiveDex(),
      flatArmor: getArmorDefense()
    }
  ];
  const extras = mob && Array.isArray(mob.partyAllies) ? mob.partyAllies : [];
  let uid = 1;
  for (let i = 0; i < extras.length && party.length < COMBAT_PARTY_MAX; i++) {
    const a = extras[i] || {};
    const name = typeof a.name === "string" && a.name.trim() ? a.name.trim() : "Companion";
    const maxHp = Math.max(12, Math.floor(typeof a.maxHp === "number" && a.maxHp > 0 ? a.maxHp : player.maxHp * 0.55));
    const hp = Math.max(1, Math.min(maxHp, typeof a.hp === "number" ? a.hp : maxHp));
    party.push({
      uid: uid++,
      name,
      hp,
      maxHp,
      kind: "companion",
      dex: typeof a.dex === "number" ? a.dex : typeof a.agi === "number" ? a.agi : Math.max(4, Math.floor(getEffectiveDex() * 0.65)),
      flatArmor: typeof a.armor === "number" ? a.armor : 0
    });
  }
  return party;
}

function pickPartyTargetLowestHpUid(st) {
  ensureCombatParty(st);
  const living = st.party.filter((m) => m && m.hp > 0);
  if (!living.length) return null;
  return living.reduce((a, b) => a.hp / Math.max(1, a.maxHp) <= b.hp / Math.max(1, b.maxHp) ? a : b).uid;
}

function getLivingPartyMembers(st) {
  ensureCombatParty(st);
  return st.party.filter((m) => m && m.hp > 0);
}

function pickPartyTargetLowestMaxHpUid(st) {
  const living = getLivingPartyMembers(st);
  if (!living.length) return null;
  return living.reduce((a, b) => (a.maxHp <= b.maxHp ? a : b)).uid;
}

function pickPartyTargetHighestMaxHpUid(st) {
  const living = getLivingPartyMembers(st);
  if (!living.length) return null;
  return living.reduce((a, b) => (a.maxHp >= b.maxHp ? a : b)).uid;
}

function pickPartyTargetStrongestUid(st) {
  const living = getLivingPartyMembers(st);
  if (!living.length) return null;
  const score = (m) => {
    const dex = typeof m.dex === "number" ? m.dex : typeof m.agi === "number" ? m.agi : 0;
    const heroBonus = m.kind === "hero" ? 10 : 0;
    return (m.maxHp || 0) * 0.1 + dex + heroBonus;
  };
  return living.reduce((a, b) => (score(a) >= score(b) ? a : b)).uid;
}

function formatPartyHitLog(foeName, logVerb, memberName, taken) {
  const v = typeof logVerb === "string" ? logVerb.trim() : "hits you";
  const phrase = /\byou\b/i.test(v) ? v.replace(/\byou\b/gi, memberName) : `${v} on ${memberName}`;
  return `${foeName} ${phrase} for ${taken} damage.`;
}

function dealRawDamageToPartyMember(st, partyUid, rawDamage, foeName, logVerb) {
  ensureCombatParty(st);
  const m = st.party.find((x) => x && x.uid === partyUid);
  if (!m || m.hp <= 0) return;
  let raw = rawDamage;
  if (m.kind === "hero") {
    ensureCombatStatus(st);
    if (typeof st.status.playerFragileTurns === "number" && st.status.playerFragileTurns > 0) raw += 2;
    const hit = computeHeroIncomingDamage(raw);
    if (hit.evaded) {
      appendFightLog(`${foeName} attacks ${m.name} — ${m.name} evades!`);
      syncCombatPartyHeroMirror(st);
      return;
    }
    const taken = hit.taken;
    m.hp -= taken;
    if (m.hp < 0) m.hp = 0;
    appendFightLog(formatPartyHitLog(foeName, logVerb, m.name, taken));
  } else {
    const dexPart = typeof m.dex === "number" ? m.dex : m.agi || 0;
    const taken = Math.max(1, raw - Math.floor(dexPart / 4) - (m.flatArmor || 0));
    m.hp -= taken;
    if (m.hp < 0) m.hp = 0;
    appendFightLog(formatPartyHitLog(foeName, logVerb, m.name, taken));
  }
  syncCombatPartyHeroMirror(st);
}

/**
 * Damages one party member (default: lowest % HP) or the whole party when `opts.aoeAllParty` is true.
 * @param {object} st
 * @param {number} rawDamage
 * @param {string} foeName
 * @param {string} logVerb
 * @param {{ aoeAllParty?: boolean, partyUid?: number } | null} [opts]
 */
function dealRawDamageToPlayer(st, rawDamage, foeName, logVerb, opts) {
  let rawDamageAdj = rawDamage;
  const src = st && st.__monsterDamageSourceFoe;
  if (src && src.name === foeName && typeof src.dex === "number") {
    rawDamageAdj = applyMonsterCritToRaw(src, rawDamageAdj);
  }
  ensureCombatParty(st);
  const o = opts && typeof opts === "object" ? opts : null;
  if (o && o.aoeAllParty) {
    const living = st.party.filter((m) => m && m.hp > 0);
    for (const m of living) {
      dealRawDamageToPartyMember(st, m.uid, rawDamageAdj, foeName, logVerb);
    }
    return;
  }
  const uid = o && typeof o.partyUid === "number" ? o.partyUid : pickPartyTargetLowestHpUid(st);
  if (uid == null) return;
  dealRawDamageToPartyMember(st, uid, rawDamageAdj, foeName, logVerb);
}

function tickEnemySkillCooldownsEndOfTurn(foe) {
  if (!foe.combat || !foe.combat.skillCd || typeof foe.combat.skillCd !== "object") return;
  for (const k of Object.keys(foe.combat.skillCd)) {
    const v = foe.combat.skillCd[k];
    if (typeof v === "number" && v > 0) foe.combat.skillCd[k] = v - 1;
  }
}

/** Bleed/poison damage and DoT duration — runs when your turn begins (after the enemy phase). */
function tickEffectsAtStartOfPlayerTurn(st) {
  ensureCombatStatus(st);
  const s = st.status;
  if (s.playerPoison && s.playerPoison.turns > 0 && s.playerPoison.dmg > 0) {
    const dotRed = formulaVitDotReductionPct(totalVit()) / 100;
    const d = Math.max(1, Math.floor(s.playerPoison.dmg * (1 - dotRed)));
    st.playerHp -= d;
    appendFightLog(`Poison deals ${d} damage to you.`);
    s.playerPoison.turns -= 1;
    if (s.playerPoison.turns <= 0) s.playerPoison = null;
  }
  if (s.playerBleed && s.playerBleed.turns > 0 && s.playerBleed.dmg > 0) {
    const dotRed = formulaVitDotReductionPct(totalVit()) / 100;
    const d = Math.max(1, Math.floor(s.playerBleed.dmg * (1 - dotRed)));
    st.playerHp -= d;
    appendFightLog(`Bleeding deals ${d} damage to you.`);
    s.playerBleed.turns -= 1;
    if (s.playerBleed.turns <= 0) s.playerBleed = null;
  }
  if (s.playerBurn && s.playerBurn.turns > 0 && s.playerBurn.dmg > 0) {
    const dotRed = formulaVitDotReductionPct(totalVit()) / 100;
    const d = Math.max(1, Math.floor(s.playerBurn.dmg * (1 - dotRed)));
    st.playerHp -= d;
    appendFightLog(`Burn deals ${d} damage to you.`);
    s.playerBurn.turns -= 1;
    if (s.playerBurn.turns <= 0) s.playerBurn = null;
  }
  syncHeroHpFromPlayerMirror(st);
}

/** Buff/debuff durations counted in “player turns” — end of your turn, before the enemy phase. */
function tickPlayerTurnEndBuffs(st) {
  ensureCombatStatus(st);
  const s = st.status;
  if (typeof s.playerAttackDebuffTurns === "number" && s.playerAttackDebuffTurns > 0) s.playerAttackDebuffTurns -= 1;
  if (typeof s.playerHamstringSlowTurns === "number" && s.playerHamstringSlowTurns > 0) s.playerHamstringSlowTurns -= 1;
  if (typeof s.packHowlTurns === "number" && s.packHowlTurns > 0) s.packHowlTurns -= 1;
  if (typeof s.playerBrineWeakTurns === "number" && s.playerBrineWeakTurns > 0) s.playerBrineWeakTurns -= 1;
  if (typeof s.playerFragileTurns === "number" && s.playerFragileTurns > 0) s.playerFragileTurns -= 1;
  st.foes.forEach((f) => {
    if (!f.combat) return;
    if (typeof f.combat.thickHideTurns === "number" && f.combat.thickHideTurns > 0) f.combat.thickHideTurns -= 1;
    if (typeof f.combat.echoCryBonusTurns === "number" && f.combat.echoCryBonusTurns > 0) f.combat.echoCryBonusTurns -= 1;
    if (typeof f.combat.mitigationTurns === "number" && f.combat.mitigationTurns > 0) f.combat.mitigationTurns -= 1;
    if (typeof f.combat.reflectTurns === "number" && f.combat.reflectTurns > 0) f.combat.reflectTurns -= 1;
  });
}

function applyBleedToPlayer(st, dmgPerTurn, turns) {
  ensureCombatStatus(st);
  const sr = formulaVitStatusResistPct(totalVit()) / 100;
  const t = Math.max(1, Math.min(3, Math.round(Math.floor(turns) * (1 - sr))));
  const d = Math.max(1, Math.floor(dmgPerTurn));
  const prev = st.status.playerBleed;
  st.status.playerBleed = {
    dmg: Math.max(prev && prev.dmg ? prev.dmg : 0, d),
    turns: Math.max(prev && prev.turns ? prev.turns : 0, t)
  };
}

function applyPoisonToPlayer(st, dmgPerTurn, turns) {
  ensureCombatStatus(st);
  const sr = formulaVitStatusResistPct(totalVit()) / 100;
  const t = Math.max(1, Math.min(4, Math.round(Math.floor(turns) * (1 - sr))));
  const d = Math.max(1, Math.floor(dmgPerTurn));
  st.status.playerPoison = { dmg: d, turns: t };
}

function applyBurnToPlayer(st, dmgPerTurn, turns) {
  ensureCombatStatus(st);
  const sr = formulaVitStatusResistPct(totalVit()) / 100;
  const t = Math.max(1, Math.min(4, Math.round(Math.floor(turns) * (1 - sr))));
  const d = Math.max(1, Math.floor(dmgPerTurn));
  const prev = st.status.playerBurn;
  st.status.playerBurn = {
    dmg: Math.max(prev && prev.dmg ? prev.dmg : 0, d),
    turns: Math.max(prev && prev.turns ? prev.turns : 0, t)
  };
}

function tryPlayerStun(st, chance) {
  ensureCombatStatus(st);
  const p = Math.min(1, Math.max(0, chance));
  const resist = formulaVitStatusResistPct(totalVit()) / 100;
  const finalP = p * (1 - resist);
  if (finalP >= 1 || Math.random() < finalP) {
    st.status.playerStunTurns = (st.status.playerStunTurns || 0) + 1;
    appendFightLog("You are stunned!");
    return true;
  }
  return false;
}

function getNextCombatFoeUid(st) {
  let m = -1;
  for (const f of st.foes) {
    if (typeof f.uid === "number" && f.uid > m) m = f.uid;
  }
  return m + 1;
}

function summonCombatMinion(st, summoner, label, hpFrac, atkFrac) {
  const baseAtk = summoner.attack || 1;
  const hp = Math.max(1, Math.floor((summoner.maxHp || 40) * hpFrac));
  const frac = Math.max(0.12, Math.min(1, atkFrac));
  const matt = Math.max(1, Math.floor(baseAtk * atkFrac));
  const uid = getNextCombatFoeUid(st);
  const minion = {
    uid,
    name: label,
    level: typeof summoner.level === "number" ? summoner.level : 1,
    moodId: summoner.moodId,
    moodName: summoner.moodName || "Neutral",
    str: Math.max(1, Math.round((summoner.str || 10) * frac)),
    dex: Math.max(1, Math.round((summoner.dex || 10) * frac)),
    vit: Math.max(1, Math.round((summoner.vit || 10) * frac)),
    int: Math.max(1, Math.round((summoner.int || 10) * frac)),
    hp,
    maxHp: hp,
    attack: matt,
    damageTakenMult: 1,
    drops: null,
    image: summoner.image,
    images: summoner.images,
    sprites: summoner.sprites
  };
  initFoeCombatRuntime(minion);
  minion.combat.script = "";
  st.foes.push(minion);
  appendFightLog(`${summoner.name} summons ${label}!`);
}

function healLowestHpFractionAlly(st, healer, pctOfMax) {
  const allies = st.foes.filter((f) => f.hp > 0 && f.uid !== healer.uid);
  if (!allies.length) return false;
  const target = allies.reduce((a, b) => (a.hp / Math.max(1, a.maxHp) <= b.hp / Math.max(1, b.maxHp) ? a : b));
  const amt = Math.max(1, Math.floor(target.maxHp * pctOfMax));
  target.hp = Math.min(target.maxHp, target.hp + amt);
  appendFightLog(`${healer.name} heals ${target.name} for ${amt}.`);
  return true;
}

function buffStrongestAllyEcho(st, buffer, turns) {
  const allies = st.foes.filter((f) => f.hp > 0 && f.uid !== buffer.uid);
  if (!allies.length) return false;
  const target = allies.reduce((a, b) => ((a.attack || 0) >= (b.attack || 0) ? a : b));
  if (!target.combat) initFoeCombatRuntime(target);
  target.combat.echoCryBonusTurns = Math.max(target.combat.echoCryBonusTurns || 0, turns);
  appendFightLog(`${buffer.name} uses Echo Cry — ${target.name} hits harder (${turns} rounds).`);
  return true;
}

function buffAllAlliesEcho(st, buffer, turns) {
  const allies = st.foes.filter((f) => f.hp > 0 && f.uid !== buffer.uid);
  if (!allies.length) return false;
  allies.forEach((target) => {
    if (!target.combat) initFoeCombatRuntime(target);
    target.combat.echoCryBonusTurns = Math.max(target.combat.echoCryBonusTurns || 0, turns);
  });
  appendFightLog(`${buffer.name} uses Echo Cry — allies are empowered (${turns} rounds).`);
  return true;
}

function setFoeMitigation(foe, turns, mult) {
  if (!foe.combat) initFoeCombatRuntime(foe);
  foe.combat.mitigationTurns = Math.max(foe.combat.mitigationTurns || 0, turns);
  foe.combat.mitigationMult = mult;
}

function setFoeReflect(foe, turns, frac) {
  if (!foe.combat) initFoeCombatRuntime(foe);
  foe.combat.reflectTurns = Math.max(foe.combat.reflectTurns || 0, turns);
  foe.combat.reflectFrac = frac;
}

/**
 * @returns {boolean} true if this script handled the turn
 */
function runExtendedBiomeEnemyScripts(scriptId, foe, st, atk, outMult, cd, setCd, ready) {
  if (scriptId === "tide_hopper") {
    const low = foe.maxHp > 0 && foe.hp / foe.maxHp < 0.6;
    if (!foe.combat.tideOpened && ready("splash_kick")) {
      foe.combat.tideOpened = true;
      setCd("splash_kick", 1);
      const targetUid =
        st.status && typeof st.status.playerHamstringSlowTurns === "number" && st.status.playerHamstringSlowTurns > 0
          ? 0
          : pickPartyTargetLowestMaxHpUid(st);
      dealRawDamageToPlayer(
        st,
        Math.max(1, Math.floor(monsterPhysicalDamageFromBase(foe, 11, 0.018) * outMult)),
        foe.name,
        "Splash Kicks you",
        targetUid == null ? null : { partyUid: targetUid }
      );
      ensureCombatStatus(st);
      st.status.playerHamstringSlowTurns = Math.max(st.status.playerHamstringSlowTurns || 0, 1);
      appendFightLog("You feel sluggish.");
      return true;
    }
    if (low && ready("foam_feint")) {
      setCd("foam_feint", 3);
      foe.combat.evadeNextChance = Math.min(0.75, 0.25 + (typeof foe.dex === "number" ? foe.dex : 0) * 0.01);
      appendFightLog(`${foe.name} uses Foam Feint.`);
      return true;
    }
    if (ready("backwash_nip")) {
      setCd("backwash_nip", 2);
      const targetUid = pickPartyTargetLowestMaxHpUid(st);
      dealRawDamageToPlayer(
        st,
        Math.max(1, Math.floor(monsterPhysicalDamageFromBase(foe, 8, 0.016) * outMult)),
        foe.name,
        "Backwash Nips you",
        targetUid == null ? null : { partyUid: targetUid }
      );
      ensureCombatStatus(st);
      const p = Math.min(0.55, 0.12 + (typeof foe.str === "number" ? foe.str : 0) * 0.006 + (typeof foe.dex === "number" ? foe.dex : 0) * 0.004);
      if (Math.random() < p) st.status.playerBrineWeakTurns = Math.max(st.status.playerBrineWeakTurns || 0, 1);
      return true;
    }
    dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.5 * outMult)), foe.name, "kicks you", { partyUid: pickPartyTargetLowestMaxHpUid(st) });
    return true;
  }

  if (scriptId === "hermit_crab") {
    if (!foe.combat.hermitOpened && ready("shell_guard")) {
      foe.combat.hermitOpened = true;
      setCd("shell_guard", 3);
      setFoeMitigation(foe, 1, Math.max(0.35, 1 - Math.min(0.65, 0.32 + (typeof foe.vit === "number" ? foe.vit : 0) * 0.008)));
      appendFightLog(`${foe.name} uses Shell Guard (-50% damage taken).`);
      return true;
    }
    foe.combat.hermitRot = (foe.combat.hermitRot || 0) + 1;
    const defend = foe.combat.hermitRot % 2 === 1;
    if (defend && ready("anchored_stance")) {
      setCd("anchored_stance", 3);
      setFoeMitigation(foe, 2, 0.72);
      appendFightLog(`${foe.name} braces in Anchored Stance.`);
      return true;
    }
    const targetUid = pickPartyTargetStrongestUid(st);
    dealRawDamageToPlayer(
      st,
      Math.max(1, Math.floor(monsterPhysicalDamageFromBase(foe, 14, 0.02) * outMult)),
      foe.name,
      "Claw Snaps you",
      targetUid == null ? null : { partyUid: targetUid }
    );
    return true;
  }

  if (scriptId === "driftling") {
    const allyLow = st.foes.some((f) => f.uid !== foe.uid && f.hp > 0 && f.maxHp > 0 && f.hp / f.maxHp < 0.65);
    if (allyLow && ready("tidal_mend")) {
      setCd("tidal_mend", 3);
      if (!healLowestHpFractionAlly(st, foe, 0.22)) {
        foe.hp = Math.min(foe.maxHp, foe.hp + Math.max(1, Math.floor(foe.maxHp * 0.15)));
        appendFightLog(`${foe.name} uses Tidal Mend on itself.`);
      }
      return true;
    }
    if (ready("mist_veil")) {
      const allies = st.foes.filter((f) => f.uid !== foe.uid && f.hp > 0);
      if (allies.length) {
        setCd("mist_veil", 3);
        const target = allies.reduce((a, b) => (a.hp / Math.max(1, a.maxHp) <= b.hp / Math.max(1, b.maxHp) ? a : b));
        if (!target.combat) initFoeCombatRuntime(target);
        target.combat.evadeNextChance = Math.max(target.combat.evadeNextChance || 0, 0.25);
        appendFightLog(`${foe.name} shrouds ${target.name} with Mist Veil.`);
        return true;
      }
    }
    if (ready("salt_rot")) {
      setCd("salt_rot", 2);
      dealRawDamageToPlayer(st, Math.max(1, Math.floor(monsterIntScaledValue(foe, 12, "effect") * outMult)), foe.name, "Salt Rots you");
      applyPoisonToPlayer(st, Math.max(1, Math.floor(monsterIntScaledValue(foe, 6, "dot"))), 2);
      appendFightLog("Salt eats at you.");
      return true;
    }
    dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.55 * outMult)), foe.name, "strikes you");
    return true;
  }

  if (scriptId === "tidemeld_revenant") {
    const livingAllies = st.foes.filter((f) => f.hp > 0 && f.uid !== foe.uid);
    const summoned = st.foes.some((f) => f.name === "Drowned Thrall" && f.hp > 0);
    if (!summoned && !livingAllies.length && ready("drowned_call")) {
      setCd("drowned_call", 4);
      summonCombatMinion(st, foe, "Drowned Thrall", 0.12, 0.22);
      return true;
    }
    if (ready("brine_curse")) {
      setCd("brine_curse", 2);
      const targetUid = pickPartyTargetStrongestUid(st);
      dealRawDamageToPlayer(st, Math.max(1, Math.floor(monsterIntScaledValue(foe, 12, "effect") * outMult)), foe.name, "Brine Curses you", targetUid == null ? null : { partyUid: targetUid });
      applyPoisonToPlayer(st, Math.max(1, Math.floor(monsterIntScaledValue(foe, 5, "dot"))), 2);
      ensureCombatStatus(st);
      st.status.playerBrineWeakTurns = Math.max(st.status.playerBrineWeakTurns || 0, 2);
      appendFightLog("Brine weakens your strikes.");
      return true;
    }
    if (ready("undertow_pull")) {
      setCd("undertow_pull", 2);
      const targetUid = pickPartyTargetStrongestUid(st);
      dealRawDamageToPlayer(st, Math.max(1, Math.floor(monsterIntScaledValue(foe, 14, "effect") * outMult)), foe.name, "Undertow Pulls you", targetUid == null ? null : { partyUid: targetUid });
      ensureCombatStatus(st);
      st.status.playerAttackDebuffTurns = Math.max(st.status.playerAttackDebuffTurns || 0, 1);
      return true;
    }
    dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.55 * outMult)), foe.name, "strikes you", { partyUid: pickPartyTargetStrongestUid(st) });
    return true;
  }

  if (scriptId === "coastal_horror") {
    const weakest = pickPartyTargetLowestHpUid(st);
    const strongest = pickPartyTargetStrongestUid(st);
    const partyAlive = getLivingPartyMembers(st).length;
    if (!foe.combat.horrorOpened && ready("grasping_tentacles")) {
      foe.combat.horrorOpened = true;
      setCd("grasping_tentacles", 3);
      dealRawDamageToPlayer(st, Math.max(1, Math.floor(monsterIntScaledValue(foe, 13, "effect") * outMult)), foe.name, "Tentacle Grasps you", strongest == null ? null : { partyUid: strongest });
      tryPlayerStun(st, Math.min(0.65, 0.2 + (typeof foe.int === "number" ? foe.int : 0) * 0.005));
      return true;
    }
    if (partyAlive >= 2 && ready("abyssal_pulse")) {
      setCd("abyssal_pulse", 2);
      dealRawDamageToPlayer(st, Math.max(1, Math.floor(monsterIntScaledValue(foe, 11, "effect") * outMult)), foe.name, "unleashes Abyssal Pulse", { aoeAllParty: true });
      return true;
    }
    const weakExists = st.party && st.party.some((m) => m && m.hp > 0 && m.maxHp > 0 && m.hp / m.maxHp < 0.35);
    if (weakExists && ready("tide_crush")) {
      setCd("tide_crush", 2);
      dealRawDamageToPlayer(st, Math.max(1, Math.floor(monsterPhysicalDamageFromBase(foe, 20, 0.02) * outMult)), foe.name, "Tide Crushes you", weakest == null ? null : { partyUid: weakest });
      if (Math.random() < Math.min(0.45, 0.08 + ((typeof foe.str === "number" ? foe.str : 0) + (typeof foe.int === "number" ? foe.int : 0)) * 0.004)) {
        tryPlayerStun(st, 1);
      }
      return true;
    }
    if (ready("grasping_tentacles")) {
      setCd("grasping_tentacles", 3);
      dealRawDamageToPlayer(st, Math.max(1, Math.floor(monsterIntScaledValue(foe, 13, "effect") * outMult)), foe.name, "Grasping Tentacles lash you", strongest == null ? null : { partyUid: strongest });
      tryPlayerStun(st, Math.min(0.65, 0.2 + (typeof foe.int === "number" ? foe.int : 0) * 0.005));
      return true;
    }
    dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.6 * outMult)), foe.name, "strikes you");
    return true;
  }

  if (scriptId === "greenleaf_squirrel") {
    const allyLow = st.foes.some((f) => f.uid !== foe.uid && f.hp > 0 && f.maxHp > 0 && f.hp / f.maxHp < 0.5);
    if (allyLow && ready("forest_gift")) {
      setCd("forest_gift", 3);
      if (!healLowestHpFractionAlly(st, foe, 0.18)) {
        foe.hp = Math.min(foe.maxHp, foe.hp + Math.max(1, Math.floor(foe.maxHp * 0.12)));
        appendFightLog(`${foe.name} channels Forest Gift on itself.`);
      }
      appendFightLog(`${foe.name} boosts ally tempo.`);
      return true;
    }
    const threatened = foe.maxHp > 0 && foe.hp / foe.maxHp < 0.7;
    if (threatened && ready("scurry_shift")) {
      setCd("scurry_shift", 3);
      foe.combat.evadeNextChance = Math.max(foe.combat.evadeNextChance || 0, Math.min(0.65, 0.28 + (typeof foe.dex === "number" ? foe.dex : 0) * 0.004));
      appendFightLog(`${foe.name} uses Scurry Shift.`);
      return true;
    }
    if (ready("scurry_shift")) {
      const allies = st.foes.filter((f) => f.uid !== foe.uid && f.hp > 0);
      if (allies.length) {
        setCd("scurry_shift", 3);
        const target = allies.reduce((a, b) => ((a.attack || 0) >= (b.attack || 0) ? a : b));
        if (!target.combat) initFoeCombatRuntime(target);
        target.combat.evadeNextChance = Math.max(target.combat.evadeNextChance || 0, 0.22);
        appendFightLog(`${foe.name} enables ${target.name} with Scurry Shift.`);
        return true;
      }
    }
    const leafdart = Math.max(1, Math.floor(monsterPhysicalDamageFromBase(foe, 11, 0.017) * outMult));
    dealRawDamageToPlayer(st, leafdart, foe.name, "Leafdarts you", { partyUid: pickPartyTargetLowestMaxHpUid(st) });
    if (Math.random() < Math.min(0.32, 0.08 + (typeof foe.dex === "number" ? foe.dex : 0) * 0.0035)) {
      dealRawDamageToPlayer(st, Math.max(1, Math.floor(leafdart * 0.65)), foe.name, "follows up with a second Leafdart");
    }
    return true;
  }

  if (scriptId === "greenleaf_parrot") {
    const hasAllies = st.foes.some((f) => f.uid !== foe.uid && f.hp > 0);
    if (!foe.combat.parrotOpened && hasAllies && ready("echo_cry")) {
      foe.combat.parrotOpened = true;
      setCd("echo_cry", 4);
      buffAllAlliesEcho(st, foe, 2);
      return true;
    }
    if (ready("distracting_screech")) {
      setCd("distracting_screech", 3);
      const targetUid = pickPartyTargetStrongestUid(st);
      dealRawDamageToPlayer(st, Math.max(1, Math.floor(monsterPhysicalDamageFromBase(foe, 10, 0.014) * outMult)), foe.name, "uses Disorienting Shriek", targetUid == null ? null : { partyUid: targetUid });
      ensureCombatStatus(st);
      st.status.playerAttackDebuffTurns = Math.max(st.status.playerAttackDebuffTurns || 0, 1);
      st.status.playerBrineWeakTurns = Math.max(st.status.playerBrineWeakTurns || 0, 1);
      appendFightLog(`${foe.name} uses Distracting Screech.`);
      return true;
    }
    dealRawDamageToPlayer(st, Math.max(1, Math.floor(monsterPhysicalDamageFromBase(foe, 12, 0.015) * outMult)), foe.name, "Sonic Pecks you", { partyUid: pickPartyTargetStrongestUid(st) });
    return true;
  }

  if (scriptId === "greenleaf_fox") {
    const full = st.playerMax > 0 && st.playerHp >= st.playerMax * 0.8;
    const weakExists = st.party && st.party.some((m) => m && m.hp > 0 && m.maxHp > 0 && m.hp / m.maxHp < 0.45);
    if (weakExists && ready("fade_step")) {
      setCd("fade_step", 3);
      foe.combat.evadeNextChance = 0.45;
      appendFightLog(`${foe.name} uses Fade Step.`);
      return true;
    }
    if (ready("ambush_bite")) {
      setCd("ambush_bite", 2);
      const mul = full ? 1.5 : 1;
      dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.85 * mul * outMult)), foe.name, "Ambush Bites you");
      return true;
    }
    if (ready("rending_snap")) {
      setCd("rending_snap", 2);
      dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.65 * outMult)), foe.name, "Rending Snaps you");
      applyBleedToPlayer(st, Math.max(1, Math.floor(monsterPhysicalDamageFromBase(foe, 5, 0.012))), 2);
      if (Math.random() < Math.min(0.35, 0.08 + (typeof foe.str === "number" ? foe.str : 0) * 0.0035)) {
        tryPlayerStun(st, 1);
      }
      return true;
    }
    dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.52 * outMult)), foe.name, "bites you");
    return true;
  }

  if (scriptId === "greenleaf_stag") {
    const allyLow = st.foes.some((f) => f.uid !== foe.uid && f.hp > 0 && f.maxHp > 0 && f.hp / f.maxHp < 0.6);
    if (allyLow && ready("natures_blessing")) {
      setCd("natures_blessing", 3);
      if (!healLowestHpFractionAlly(st, foe, 0.28)) {
        foe.hp = Math.min(foe.maxHp, foe.hp + Math.max(1, Math.floor(foe.maxHp * 0.2)));
        appendFightLog(`${foe.name} heals itself with Nature's Blessing.`);
      }
      return true;
    }
    if (ready("verdant_ward")) {
      const allies = st.foes.filter((f) => f.uid !== foe.uid && f.hp > 0);
      if (allies.length) {
        setCd("verdant_ward", 3);
        let target =
          allies.find((a) => a.name === "Gorilla" || a.name === "Greenleaf Fox") ||
          allies.reduce((a, b) => ((a.maxHp || 0) >= (b.maxHp || 0) ? a : b));
        setFoeMitigation(target, 1, 0.8);
        appendFightLog(`${foe.name} grants Verdant Ward to ${target.name}.`);
        return true;
      }
    }
    if (ready("root_bind")) {
      setCd("root_bind", 2);
      dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.55 * outMult)), foe.name, "Root Binds you", { partyUid: pickPartyTargetStrongestUid(st) });
      ensureCombatStatus(st);
      st.status.playerHamstringSlowTurns = Math.max(st.status.playerHamstringSlowTurns || 0, 2);
      st.status.playerAttackDebuffTurns = Math.max(st.status.playerAttackDebuffTurns || 0, 2);
      appendFightLog("You are slowed and weakened.");
      return true;
    }
    dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.5 * outMult)), foe.name, "charges you");
    return true;
  }

  if (scriptId === "gorilla") {
    if (!foe.combat.gorillaOpened && ready("rage_roar")) {
      foe.combat.gorillaOpened = true;
      setCd("rage_roar", 3);
      foe.combat.gorillaRampStacks = (foe.combat.gorillaRampStacks || 0) + 1;
      appendFightLog(`${foe.name} uses Rage Roar (+damage ramp).`);
      return true;
    }
    foe.combat.gorillaAlt = !foe.combat.gorillaAlt;
    if (foe.combat.gorillaAlt && ready("ground_rupture")) {
      setCd("ground_rupture", 3);
      dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.74 * outMult)), foe.name, "Ground Ruptures", { aoeAllParty: true });
      ensureCombatStatus(st);
      st.status.playerBrineWeakTurns = Math.max(st.status.playerBrineWeakTurns || 0, 1);
      return true;
    }
    if (!foe.combat.gorillaAlt && ready("crushing_slam")) {
      setCd("crushing_slam", 2);
      dealRawDamageToPlayer(st, Math.max(1, Math.floor(monsterPhysicalDamageFromBase(foe, 24, 0.02) * outMult)), foe.name, "Crushing Slams you", { partyUid: pickPartyTargetStrongestUid(st) });
      return true;
    }
    dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.75 * outMult)), foe.name, "hits you");
    return true;
  }

  if (scriptId === "ash_lizard") {
    const focused = foe.maxHp > 0 && foe.hp / foe.maxHp < 0.7;
    if (focused && ready("heat_skin")) {
      setCd("heat_skin", 3);
      setFoeReflect(foe, 2, 0.22);
      appendFightLog(`${foe.name} uses Heat Skin (reflects damage).`);
      return true;
    }
    if (ready("scorch_trail")) {
      setCd("scorch_trail", 3);
      dealRawDamageToPlayer(st, Math.max(1, Math.floor(monsterIntScaledValue(foe, 10, "effect") * outMult)), foe.name, "Scorch Trails through your team", { aoeAllParty: true });
      applyBurnToPlayer(st, Math.max(1, Math.floor(monsterIntScaledValue(foe, 5, "dot"))), 2);
      return true;
    }
    if (ready("ember_bite")) {
      setCd("ember_bite", 1);
      dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.52 * outMult)), foe.name, "Ember Bites you");
      applyBurnToPlayer(st, Math.max(1, Math.floor(atk * 0.12)), 2);
      appendFightLog("You are burning.");
      return true;
    }
    dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.48 * outMult)), foe.name, "bites you");
    return true;
  }

  if (scriptId === "cinder_stalker") {
    if (ready("blazing_pounce")) {
      setCd("blazing_pounce", 2);
      dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.95 * outMult)), foe.name, "Blazing Pounces you");
      return true;
    }
    if (ready("smoke_veil")) {
      setCd("smoke_veil", 3);
      foe.combat.evadeNextChance = 0.42;
      appendFightLog(`${foe.name} uses Smoke Veil.`);
      return true;
    }
    if (ready("cinder_claw")) {
      setCd("cinder_claw", 2);
      dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.68 * outMult)), foe.name, "Cinder Claws you");
      applyBurnToPlayer(st, Math.max(1, Math.floor(monsterIntScaledValue(foe, 3, "dot"))), 1);
      return true;
    }
    dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.55 * outMult)), foe.name, "scratches you");
    return true;
  }

  if (scriptId === "ember_scuttler") {
    if (ready("fire_web")) {
      setCd("fire_web", 2);
      dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.45 * outMult)), foe.name, "Fire Webs you");
      ensureCombatStatus(st);
      st.status.playerHamstringSlowTurns = Math.max(st.status.playerHamstringSlowTurns || 0, 2);
      appendFightLog("You are slowed.");
      return true;
    }
    if (ready("ignite")) {
      setCd("ignite", 2);
      dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.5 * outMult)), foe.name, "Ignites you");
      applyBurnToPlayer(st, Math.max(1, Math.floor(atk * 0.11)), 2);
      appendFightLog("Flames cling to you.");
      return true;
    }
    if (ready("scuttle_burst")) {
      setCd("scuttle_burst", 2);
      dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.32 * outMult)), foe.name, "Scuttle Bursts you");
      dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.32 * outMult)), foe.name, "Scuttle Bursts you again");
      return true;
    }
    dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.45 * outMult)), foe.name, "nips you");
    return true;
  }

  if (scriptId === "magma_boar") {
    foe.combat.magmaRot = (foe.combat.magmaRot || 0) + 1;
    const tank = foe.combat.magmaRot % 2 === 1;
    if (tank && ready("lava_armor")) {
      setCd("lava_armor", 4);
      setFoeMitigation(foe, 2, 0.55);
      setFoeReflect(foe, 1, 0.12);
      appendFightLog(`${foe.name} uses Lava Armor.`);
      return true;
    }
    if (ready("boiling_rage")) {
      setCd("boiling_rage", 3);
      foe.combat.gorillaRampStacks = (foe.combat.gorillaRampStacks || 0) + 1;
      appendFightLog(`${foe.name} enters Boiling Rage.`);
      return true;
    }
    if (!tank && ready("molten_charge")) {
      setCd("molten_charge", 2);
      dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 1.08 * outMult)), foe.name, "Molten Charges you");
      return true;
    }
    if (ready("molten_charge")) {
      setCd("molten_charge", 2);
      dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 1.08 * outMult)), foe.name, "Molten Charges you");
      return true;
    }
    if (ready("lava_armor")) {
      setCd("lava_armor", 4);
      setFoeMitigation(foe, 2, 0.55);
      appendFightLog(`${foe.name} uses Lava Armor.`);
      return true;
    }
    dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.65 * outMult)), foe.name, "charges you");
    return true;
  }

  if (scriptId === "lava_basilisk") {
    if (ready("petrifying_heat")) {
      setCd("petrifying_heat", 3);
      const gazePhys = Math.floor(monsterPhysicalDamageFromBase(foe, 30, 0.015) * outMult);
      dealRawDamageToPlayer(st, Math.max(1, gazePhys), foe.name, "Petrifying Heats you");
      tryPlayerStun(st, Math.min(0.95, 0.2 + (typeof foe.int === "number" ? foe.int : 0) * 0.0025));
      appendFightLog(`${foe.name} channels Petrifying Heat.`);
      return true;
    }
    if (ready("inferno_gaze")) {
      setCd("inferno_gaze", 2);
      const inferno = Math.floor(monsterPhysicalDamageFromBase(foe, 30, 0.015) * outMult);
      dealRawDamageToPlayer(st, Math.max(1, inferno), foe.name, "Inferno Gazes you");
      const burnDmg = Math.max(2, Math.floor(monsterIntScaledValue(foe, 10, "dot")));
      const burnTurns = Math.max(1, Math.round(2 + (typeof foe.int === "number" ? foe.int : 0) / 50));
      applyBurnToPlayer(st, burnDmg, burnTurns);
      appendFightLog("Searing burn!");
      return true;
    }
    if (ready("molten_sheen")) {
      setCd("molten_sheen", 3);
      setFoeMitigation(foe, 1, 0.72);
      appendFightLog(`${foe.name} uses Molten Sheen.`);
      return true;
    }
    dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.52 * outMult)), foe.name, "strikes you");
    return true;
  }

  if (scriptId === "stone_marmot") {
    const focused = foe.maxHp > 0 && foe.hp / foe.maxHp < 0.75;
    if (focused && ready("burrow_guard")) {
      setCd("burrow_guard", 3);
      setFoeMitigation(foe, 2, 0.55);
      appendFightLog(`${foe.name} uses Burrow Guard.`);
      return true;
    }
    if (ready("stone_nerves")) {
      setCd("stone_nerves", 3);
      setFoeMitigation(foe, 1, 0.8);
      appendFightLog(`${foe.name} steadies with Stone Nerves.`);
      return true;
    }
    dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.48 * outMult)), foe.name, "Pebble Tosses you");
    return true;
  }

  if (scriptId === "rock_lynx") {
    const threatened = foe.maxHp > 0 && foe.hp / foe.maxHp < 0.6;
    if (threatened && ready("agile_reflex")) {
      setCd("agile_reflex", 3);
      foe.combat.evadeNextChance = 0.38;
      appendFightLog(`${foe.name} uses Agile Reflex.`);
      return true;
    }
    if (ready("cliff_strike")) {
      setCd("cliff_strike", 2);
      dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.92 * outMult)), foe.name, "Cliff Strikes you");
      return true;
    }
    dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.55 * outMult)), foe.name, "claws you");
    return true;
  }

  if (scriptId === "rock_ibex") {
    foe.combat.ibexRot = (foe.combat.ibexRot || 0) + 1;
    const attackTurn = foe.combat.ibexRot % 2 === 1;
    if (attackTurn && ready("headbutt")) {
      setCd("headbutt", 2);
      dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.88 * outMult)), foe.name, "Headbutts you");
      return true;
    }
    if (!attackTurn && ready("stone_skin")) {
      setCd("stone_skin", 3);
      setFoeMitigation(foe, 2, 0.65);
      appendFightLog(`${foe.name} uses Stone Skin.`);
      return true;
    }
    if (ready("headbutt")) {
      setCd("headbutt", 2);
      dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.88 * outMult)), foe.name, "Headbutts you");
      return true;
    }
    if (ready("stone_skin")) {
      setCd("stone_skin", 3);
      setFoeMitigation(foe, 2, 0.65);
      appendFightLog(`${foe.name} uses Stone Skin.`);
      return true;
    }
    dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.58 * outMult)), foe.name, "rams you");
    return true;
  }

  if (scriptId === "rock_serpent") {
    if (ready("dust_suffocation")) {
      setCd("dust_suffocation", 2);
      dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.5 * outMult)), foe.name, "Dust Suffocates you");
      applyPoisonToPlayer(st, Math.max(1, Math.floor(atk * 0.1)), 2);
      ensureCombatStatus(st);
      st.status.playerAttackDebuffTurns = Math.max(st.status.playerAttackDebuffTurns || 0, 1);
      return true;
    }
    if (ready("stone_slither")) {
      setCd("stone_slither", 3);
      setFoeMitigation(foe, 1, 0.75);
      appendFightLog(`${foe.name} uses Stone Slither.`);
      return true;
    }
    if (ready("crush_coil")) {
      setCd("crush_coil", 2);
      dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.78 * outMult)), foe.name, "Crush Coils you");
      return true;
    }
    dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.55 * outMult)), foe.name, "strikes you");
    return true;
  }

  if (scriptId === "rock_lizard") {
    if (ready("harden")) {
      setCd("harden", 4);
      setFoeMitigation(foe, 2, 0.45);
      appendFightLog(`${foe.name} uses Harden.`);
      return true;
    }
    if (ready("tail_slam")) {
      setCd("tail_slam", 2);
      dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 1.02 * outMult)), foe.name, "Tail Slams you");
      if (Math.random() < Math.min(0.45, 0.05 + ((typeof foe.str === "number" ? foe.str : 0) * 0.004))) {
        tryPlayerStun(st, 1);
      }
      return true;
    }
    if (ready("bask_in_dust")) {
      setCd("bask_in_dust", 3);
      foe.hp = Math.min(foe.maxHp, foe.hp + Math.max(1, Math.floor(monsterIntScaledValue(foe, 8, "effect"))));
      setFoeMitigation(foe, 1, 0.82);
      appendFightLog(`${foe.name} basks in dust and hardens its scales.`);
      return true;
    }
    dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.55 * outMult)), foe.name, "strikes you");
    return true;
  }

  if (scriptId === "ash_horror") {
    if (ready("ash_touch")) {
      setCd("ash_touch", 1);
      dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.5 * outMult)), foe.name, "Ash Touches you");
      applyPoisonToPlayer(st, Math.max(1, Math.floor(atk * 0.07)), 2);
      return true;
    }
    if (ready("decay_aura")) {
      setCd("decay_aura", 3);
      applyPoisonToPlayer(st, Math.max(1, Math.floor(atk * 0.08)), 2);
      ensureCombatStatus(st);
      st.status.playerBrineWeakTurns = Math.max(st.status.playerBrineWeakTurns || 0, 1);
      appendFightLog(`${foe.name} radiates Decay Aura.`);
      return true;
    }
    if (ready("smother")) {
      setCd("smother", 2);
      dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.5 * outMult)), foe.name, "Smothers you");
      ensureCombatStatus(st);
      st.status.playerAttackDebuffTurns = Math.max(st.status.playerAttackDebuffTurns || 0, 1);
      return true;
    }
    dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.45 * outMult)), foe.name, "strikes you");
    return true;
  }

  if (scriptId === "cinder_husk") {
    if (ready("dead_flesh")) {
      setCd("dead_flesh", 3);
      setFoeMitigation(foe, 2, 0.5);
      appendFightLog(`${foe.name} uses Dead Flesh.`);
      return true;
    }
    if (ready("grave_fortitude")) {
      setCd("grave_fortitude", 3);
      setFoeMitigation(foe, 1, 0.78);
      appendFightLog(`${foe.name} steels itself with Grave Fortitude.`);
      return true;
    }
    dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.62 * outMult)), foe.name, "Slow Swings at you");
    return true;
  }

  if (scriptId === "ash_skulker") {
    if (ready("ash_mark")) {
      setCd("ash_mark", 3);
      ensureCombatStatus(st);
      st.status.playerFragileTurns = Math.max(st.status.playerFragileTurns || 0, 1);
      appendFightLog(`${foe.name} marks you with ash.`);
      return true;
    }
    if (ready("backstab")) {
      setCd("backstab", 2);
      dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.98 * outMult)), foe.name, "Backstabs you");
      return true;
    }
    if (ready("fade")) {
      setCd("fade", 3);
      foe.combat.evadeNextChance = 0.4;
      appendFightLog(`${foe.name} Fades into shadow.`);
      return true;
    }
    dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.52 * outMult)), foe.name, "strikes you");
    return true;
  }

  if (scriptId === "remnant_of_rust") {
    if (ready("corrode_armor")) {
      setCd("corrode_armor", 3);
      ensureCombatStatus(st);
      st.status.playerFragileTurns = Math.max(st.status.playerFragileTurns || 0, 2);
      appendFightLog(`${foe.name} Corrodes your armor (+incoming damage).`);
      return true;
    }
    if (ready("rust_strike")) {
      setCd("rust_strike", 2);
      dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.55 * outMult)), foe.name, "Rust Strikes you");
      ensureCombatStatus(st);
      st.status.playerAttackDebuffTurns = Math.max(st.status.playerAttackDebuffTurns || 0, 2);
      appendFightLog("Rust weakens your arms.");
      return true;
    }
    if (ready("grinding_lock")) {
      setCd("grinding_lock", 2);
      ensureCombatStatus(st);
      st.status.playerHamstringSlowTurns = Math.max(st.status.playerHamstringSlowTurns || 0, 1);
      st.status.playerBrineWeakTurns = Math.max(st.status.playerBrineWeakTurns || 0, 1);
      appendFightLog(`${foe.name} applies Grinding Lock.`);
      return true;
    }
    dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.5 * outMult)), foe.name, "strikes you");
    return true;
  }

  if (scriptId === "faded_war_wraith") {
    const hasFallen = st.foes.some((f) => f.name === "Fallen Echo");
    if (!hasFallen && ready("call_fallen")) {
      setCd("call_fallen", 4);
      summonCombatMinion(st, foe, "Fallen Echo", 0.14, 0.2);
      return true;
    }
    if (ready("haunt")) {
      setCd("haunt", 2);
      dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.58 * outMult)), foe.name, "Haunts you");
      ensureCombatStatus(st);
      st.status.playerAttackDebuffTurns = Math.max(st.status.playerAttackDebuffTurns || 0, 1);
      return true;
    }
    if (ready("soul_chill")) {
      setCd("soul_chill", 3);
      dealRawDamageToPlayer(st, Math.max(1, Math.floor(monsterIntScaledValue(foe, 9, "effect") * outMult)), foe.name, "unleashes Soul Chill", { aoeAllParty: true });
      ensureCombatStatus(st);
      st.status.playerHamstringSlowTurns = Math.max(st.status.playerHamstringSlowTurns || 0, 1);
      return true;
    }
    dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.5 * outMult)), foe.name, "chills you");
    return true;
  }

  if (scriptId === "dust_carver") {
    const threatened = foe.maxHp > 0 && foe.hp / foe.maxHp < 0.6;
    if (threatened && ready("drystep")) {
      setCd("drystep", 3);
      foe.combat.evadeNextChance = 0.4;
      appendFightLog(`${foe.name} uses Drystep.`);
      return true;
    }
    if (ready("blind_dust")) {
      setCd("blind_dust", 3);
      ensureCombatStatus(st);
      st.status.playerHamstringSlowTurns = Math.max(st.status.playerHamstringSlowTurns || 0, 2);
      appendFightLog(`${foe.name} throws Blind Dust.`);
      return true;
    }
    if (ready("sand_slash")) {
      setCd("sand_slash", 1);
      dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.82 * outMult)), foe.name, "Sand Slashes you");
      return true;
    }
    dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.55 * outMult)), foe.name, "slashes you");
    return true;
  }

  if (scriptId === "witherling") {
    if (ready("life_drain")) {
      setCd("life_drain", 2);
      const dmg = Math.max(1, Math.floor(atk * 0.55 * outMult));
      dealRawDamageToPlayer(st, dmg, foe.name, "Life Drains you");
      foe.hp = Math.min(foe.maxHp, foe.hp + Math.max(1, Math.floor(dmg * 0.4)));
      appendFightLog(`${foe.name} steals vitality.`);
      return true;
    }
    if (ready("decay_bite")) {
      setCd("decay_bite", 1);
      dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.5 * outMult)), foe.name, "Decay Bites you");
      applyPoisonToPlayer(st, Math.max(1, Math.floor(atk * 0.08)), 2);
      return true;
    }
    if (ready("brittle_breath")) {
      setCd("brittle_breath", 3);
      ensureCombatStatus(st);
      st.status.playerAttackDebuffTurns = Math.max(st.status.playerAttackDebuffTurns || 0, 2);
      appendFightLog(`${foe.name} exhales Brittle Breath.`);
      return true;
    }
    dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.48 * outMult)), foe.name, "strikes you");
    return true;
  }

  if (scriptId === "desert_thornback_crawler") {
    if (ready("spiked_shell")) {
      setCd("spiked_shell", 3);
      setFoeMitigation(foe, 2, 0.5);
      appendFightLog(`${foe.name} raises a Spiked Shell.`);
      return true;
    }
    if (ready("impale")) {
      setCd("impale", 2);
      dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.92 * outMult)), foe.name, "Impales you");
      applyBleedToPlayer(st, Math.max(1, Math.floor(atk * 0.1)), 2);
      return true;
    }
    if (ready("dry_carapace")) {
      setCd("dry_carapace", 3);
      setFoeMitigation(foe, 1, 0.8);
      appendFightLog(`${foe.name} hardens with Dry Carapace.`);
      return true;
    }
    dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.55 * outMult)), foe.name, "strikes you");
    return true;
  }

  if (scriptId === "mirage_lurker") {
    const groups = getLivingPartyMembers(st).length >= 2;
    if (groups && ready("heat_haze")) {
      setCd("heat_haze", 3);
      ensureCombatStatus(st);
      st.status.playerAttackDebuffTurns = Math.max(st.status.playerAttackDebuffTurns || 0, 1);
      st.status.playerBrineWeakTurns = Math.max(st.status.playerBrineWeakTurns || 0, 1);
      appendFightLog(`${foe.name} spreads a Heat Haze.`);
      return true;
    }
    if (ready("mirage_shift")) {
      setCd("mirage_shift", 3);
      foe.combat.evadeNextChance = 0.45;
      appendFightLog(`${foe.name} Mirage Shifts.`);
      return true;
    }
    if (ready("illusion_strike")) {
      setCd("illusion_strike", 2);
      dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.78 * outMult)), foe.name, "Illusion Strikes you");
      return true;
    }
    dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.52 * outMult)), foe.name, "strikes you");
    return true;
  }

  if (scriptId === "dune_devourer") {
    if (ready("burrow_ambush")) {
      setCd("burrow_ambush", 3);
      dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 1.05 * outMult)), foe.name, "Burrow Ambushes you");
      return true;
    }
    if (ready("sand_devour")) {
      setCd("sand_devour", 2);
      const dmg = Math.max(1, Math.floor(atk * 0.88 * outMult));
      dealRawDamageToPlayer(st, dmg, foe.name, "Sand Devours you");
      foe.hp = Math.min(foe.maxHp, foe.hp + Math.max(1, Math.floor(dmg * 0.25)));
      return true;
    }
    if (ready("grinding_maw")) {
      setCd("grinding_maw", 2);
      dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.72 * outMult)), foe.name, "Grinding Maws you");
      ensureCombatStatus(st);
      st.status.playerFragileTurns = Math.max(st.status.playerFragileTurns || 0, 1);
      return true;
    }
    dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.65 * outMult)), foe.name, "strikes you");
    return true;
  }

  if (scriptId === "icy_mink") {
    const weak = st.party.some((m) => m && m.hp > 0 && m.maxHp > 0 && m.hp / m.maxHp < 0.45);
    if (weak && ready("shiver_cut")) {
      setCd("shiver_cut", 2);
      dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.9 * outMult)), foe.name, "Shiver Cuts you");
      return true;
    }
    if (ready("slipstep")) {
      setCd("slipstep", 3);
      foe.combat.evadeNextChance = 0.42;
      appendFightLog(`${foe.name} uses Slipstep.`);
      return true;
    }
    if (ready("frost_bite")) {
      setCd("frost_bite", 1);
      dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.72 * outMult)), foe.name, "Frost Bites you");
      return true;
    }
    dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.5 * outMult)), foe.name, "nips you");
    return true;
  }

  if (scriptId === "icy_serpent") {
    if (ready("freeze_skin")) {
      setCd("freeze_skin", 3);
      setFoeReflect(foe, 2, 0.15);
      appendFightLog(`${foe.name} uses Freeze Skin.`);
      return true;
    }
    if (ready("cold_venom")) {
      setCd("cold_venom", 2);
      dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.55 * outMult)), foe.name, "Cold Venoms you");
      applyPoisonToPlayer(st, Math.max(1, Math.floor(atk * 0.1)), 2);
      return true;
    }
    if (ready("constriction_chill")) {
      setCd("constriction_chill", 3);
      dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.6 * outMult)), foe.name, "Constriction Chills you");
      ensureCombatStatus(st);
      st.status.playerAttackDebuffTurns = Math.max(st.status.playerAttackDebuffTurns || 0, 2);
      st.status.playerHamstringSlowTurns = Math.max(st.status.playerHamstringSlowTurns || 0, 1);
      return true;
    }
    dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.5 * outMult)), foe.name, "strikes you");
    return true;
  }

  if (scriptId === "glacier_turtoise") {
    if (ready("ice_shell")) {
      setCd("ice_shell", 4);
      setFoeMitigation(foe, 2, 0.45);
      appendFightLog(`${foe.name} uses Ice Shell.`);
      return true;
    }
    if (ready("slow_crush")) {
      setCd("slow_crush", 2);
      dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.95 * outMult)), foe.name, "Slow Crushes you");
      ensureCombatStatus(st);
      st.status.playerHamstringSlowTurns = Math.max(st.status.playerHamstringSlowTurns || 0, 1);
      return true;
    }
    if (ready("frozen_core")) {
      setCd("frozen_core", 3);
      setFoeMitigation(foe, 1, 0.78);
      appendFightLog(`${foe.name} hardens its Frozen Core.`);
      return true;
    }
    dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.55 * outMult)), foe.name, "bites you");
    return true;
  }

  if (scriptId === "frozen_stalker") {
    if (ready("frozen_ambush")) {
      setCd("frozen_ambush", 2);
      dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.95 * outMult)), foe.name, "Frozen Ambushes you");
      return true;
    }
    if (ready("chill_mark")) {
      setCd("chill_mark", 2);
      dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.55 * outMult)), foe.name, "Chill Marks you");
      applyBurnToPlayer(st, Math.max(1, Math.floor(atk * 0.08)), 2);
      return true;
    }
    if (ready("whiteout_veil")) {
      setCd("whiteout_veil", 3);
      foe.combat.evadeNextChance = 0.45;
      appendFightLog(`${foe.name} vanishes in Whiteout Veil.`);
      return true;
    }
    dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.55 * outMult)), foe.name, "strikes you");
    return true;
  }

  if (scriptId === "frost_skitter") {
    if (ready("absolute_zero")) {
      setCd("absolute_zero", 4);
      ensureCombatStatus(st);
      const freezeTurns = Math.max(1, 1 + Math.floor((typeof foe.int === "number" ? foe.int : 0) / 60));
      st.status.playerStunTurns = Math.max(st.status.playerStunTurns || 0, freezeTurns);
      appendFightLog(`${foe.name} unleashes Absolute Zero!`);
      return true;
    }
    if (ready("ice_web")) {
      setCd("ice_web", 2);
      dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.52 * outMult)), foe.name, "Ice Webs you");
      ensureCombatStatus(st);
      st.status.playerHamstringSlowTurns = Math.max(st.status.playerHamstringSlowTurns || 0, 2);
      applyBurnToPlayer(st, Math.max(1, Math.floor(monsterIntScaledValue(foe, 8, "dot"))), 2);
      return true;
    }
    if (ready("crystal_nerves")) {
      setCd("crystal_nerves", 3);
      setFoeMitigation(foe, 1, 0.78);
      foe.combat.evadeNextChance = Math.max(foe.combat.evadeNextChance || 0, 0.22);
      appendFightLog(`${foe.name} reinforces itself with Crystal Nerves.`);
      return true;
    }
    dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.48 * outMult)), foe.name, "strikes you");
    return true;
  }

  if (scriptId === "pinebound_fawn") {
    if (ready("gentle_heal")) {
      setCd("gentle_heal", 3);
      if (!healLowestHpFractionAlly(st, foe, 0.2)) {
        foe.hp = Math.min(foe.maxHp, foe.hp + Math.max(1, Math.floor(foe.maxHp * 0.15)));
        appendFightLog(`${foe.name} heals itself gently.`);
      }
      return true;
    }
    if (ready("winter_grace")) {
      const allies = st.foes.filter((f) => f.uid !== foe.uid && f.hp > 0);
      if (allies.length) {
        setCd("winter_grace", 3);
        const target = allies.reduce((a, b) => (a.maxHp >= b.maxHp ? a : b));
        if (!target.combat) initFoeCombatRuntime(target);
        target.combat.evadeNextChance = Math.max(target.combat.evadeNextChance || 0, 0.22);
        appendFightLog(`${foe.name} grants Winter Grace to ${target.name}.`);
        return true;
      }
    }
    dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.45 * outMult)), foe.name, "Kicks you");
    return true;
  }

  if (scriptId === "frozen_pinecone") {
    if (ready("freeze_burst")) {
      setCd("freeze_burst", 3);
      dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.62 * outMult)), foe.name, "Freeze Bursts you");
      ensureCombatStatus(st);
      st.status.playerHamstringSlowTurns = Math.max(st.status.playerHamstringSlowTurns || 0, 1);
      return true;
    }
    if (ready("drop_strike")) {
      setCd("drop_strike", 1);
      dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.55 * outMult)), foe.name, "Drop Strikes you");
      return true;
    }
    if (ready("needle_scatter")) {
      setCd("needle_scatter", 3);
      dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.35 * outMult)), foe.name, "Needle Scatters", { aoeAllParty: true });
      ensureCombatStatus(st);
      st.status.playerBrineWeakTurns = Math.max(st.status.playerBrineWeakTurns || 0, 1);
      return true;
    }
    dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.48 * outMult)), foe.name, "bumps you");
    return true;
  }

  if (scriptId === "ice_tusked_boar") {
    if (ready("ice_armor")) {
      setCd("ice_armor", 3);
      setFoeMitigation(foe, 2, 0.55);
      appendFightLog(`${foe.name} uses Ice Armor.`);
      return true;
    }
    if (ready("frost_charge")) {
      setCd("frost_charge", 2);
      dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 1 * outMult)), foe.name, "Frost Charges you");
      return true;
    }
    if (ready("cold_rage")) {
      setCd("cold_rage", 3);
      foe.combat.gorillaRampStacks = (foe.combat.gorillaRampStacks || 0) + 1;
      appendFightLog(`${foe.name} enters Cold Rage.`);
      return true;
    }
    dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.62 * outMult)), foe.name, "charges you");
    return true;
  }

  if (scriptId === "barkhide_spriggan") {
    if (ready("nature_guard")) {
      setCd("nature_guard", 3);
      if (!healLowestHpFractionAlly(st, foe, 0.24)) {
        foe.hp = Math.min(foe.maxHp, foe.hp + Math.max(1, Math.floor(foe.maxHp * 0.18)));
        appendFightLog(`${foe.name} Nature Guards itself.`);
      }
      return true;
    }
    if (ready("root_bind_sg")) {
      setCd("root_bind_sg", 2);
      dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.58 * outMult)), foe.name, "Root Binds you");
      ensureCombatStatus(st);
      st.status.playerHamstringSlowTurns = Math.max(st.status.playerHamstringSlowTurns || 0, 2);
      st.status.playerAttackDebuffTurns = Math.max(st.status.playerAttackDebuffTurns || 0, 1);
      return true;
    }
    if (ready("barkskin")) {
      const allies = st.foes.filter((f) => f.uid !== foe.uid && f.hp > 0);
      if (allies.length) {
        setCd("barkskin", 3);
        const target = allies.reduce((a, b) => (a.maxHp >= b.maxHp ? a : b));
        setFoeMitigation(target, 1, 0.75);
        appendFightLog(`${foe.name} reinforces ${target.name} with Barkskin.`);
        return true;
      }
    }
    dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.5 * outMult)), foe.name, "strikes you");
    return true;
  }

  if (scriptId === "winter_guardian") {
    if (ready("shield_wall")) {
      setCd("shield_wall", 4);
      setFoeMitigation(foe, 2, 0.4);
      appendFightLog(`${foe.name} raises Shield Wall.`);
      return true;
    }
    if (ready("frozen_slam")) {
      setCd("frozen_slam", 2);
      dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 1.05 * outMult)), foe.name, "Frozen Slams you");
      if (Math.random() < 0.2) tryPlayerStun(st, 1);
      return true;
    }
    if (ready("ice_ward")) {
      setCd("ice_ward", 3);
      setFoeMitigation(foe, 1, 0.8);
      appendFightLog(`${foe.name} raises Ice Ward.`);
      return true;
    }
    dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.6 * outMult)), foe.name, "strikes you");
    return true;
  }

  if (scriptId === "saltwind_skimmer") {
    const focused = foe.maxHp > 0 && foe.hp / foe.maxHp < 0.65;
    if (focused && ready("glide")) {
      setCd("glide", 3);
      foe.combat.evadeNextChance = 0.38;
      appendFightLog(`${foe.name} Glides aside.`);
      return true;
    }
    if (ready("wind_slice")) {
      setCd("wind_slice", 1);
      dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.72 * outMult)), foe.name, "Wind Slices you");
      return true;
    }
    if (ready("salt_peck")) {
      setCd("salt_peck", 2);
      dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.52 * outMult)), foe.name, "Salt Pecks you");
      ensureCombatStatus(st);
      st.status.playerFragileTurns = Math.max(st.status.playerFragileTurns || 0, 1);
      return true;
    }
    dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.55 * outMult)), foe.name, "strikes you");
    return true;
  }

  if (scriptId === "brinegullet_spitter") {
    if (!foe.combat.spitterOpened && ready("acid_spit")) {
      foe.combat.spitterOpened = true;
      setCd("acid_spit", 2);
      dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.58 * outMult)), foe.name, "Acid Spits you");
      applyPoisonToPlayer(st, Math.max(1, Math.floor(atk * 0.08)), 2);
      return true;
    }
    if (ready("corrosive_pool")) {
      setCd("corrosive_pool", 3);
      applyPoisonToPlayer(st, Math.max(1, Math.floor(atk * 0.1)), 2);
      ensureCombatStatus(st);
      st.status.playerFragileTurns = Math.max(st.status.playerFragileTurns || 0, 1);
      appendFightLog(`${foe.name} spits a Corrosive Pool.`);
      return true;
    }
    if (ready("acid_spit")) {
      setCd("acid_spit", 2);
      dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.58 * outMult)), foe.name, "Acid Spits you");
      applyPoisonToPlayer(st, Math.max(1, Math.floor(atk * 0.08)), 2);
      return true;
    }
    dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.5 * outMult)), foe.name, "spits at you");
    return true;
  }

  if (scriptId === "wavebreaker_idol") {
    if (ready("stone_guard")) {
      setCd("stone_guard", 4);
      setFoeMitigation(foe, 2, 0.42);
      appendFightLog(`${foe.name} uses Stone Guard.`);
      return true;
    }
    if (ready("wave_slam")) {
      setCd("wave_slam", 2);
      dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.98 * outMult)), foe.name, "Wave Slams you");
      return true;
    }
    if (ready("sea_ward")) {
      setCd("sea_ward", 3);
      setFoeMitigation(foe, 1, 0.78);
      appendFightLog(`${foe.name} raises Sea Ward.`);
      return true;
    }
    dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.58 * outMult)), foe.name, "strikes you");
    return true;
  }

  if (scriptId === "cliff_lurker") {
    if (ready("ambush_drop")) {
      setCd("ambush_drop", 2);
      dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.98 * outMult)), foe.name, "Ambush Drops on you");
      return true;
    }
    if (ready("grip_strike")) {
      setCd("grip_strike", 2);
      dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.72 * outMult)), foe.name, "Grip Strikes you");
      ensureCombatStatus(st);
      st.status.playerHamstringSlowTurns = Math.max(st.status.playerHamstringSlowTurns || 0, 1);
      return true;
    }
    if (ready("rock_skip")) {
      setCd("rock_skip", 3);
      foe.combat.evadeNextChance = 0.38;
      appendFightLog(`${foe.name} uses Rock Skip.`);
      return true;
    }
    dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.55 * outMult)), foe.name, "strikes you");
    return true;
  }

  if (scriptId === "tideharrow") {
    const ctrl = !foe.combat.altPhase;
    foe.combat.altPhase = !foe.combat.altPhase;
    if (ctrl && ready("riptide_pull")) {
      setCd("riptide_pull", 3);
      const targetUid = pickPartyTargetStrongestUid(st);
      dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.58 * outMult)), foe.name, "Riptide Pulls you", targetUid == null ? null : { partyUid: targetUid });
      ensureCombatStatus(st);
      st.status.playerBrineWeakTurns = Math.max(st.status.playerBrineWeakTurns || 0, 1);
      return true;
    }
    if (ready("drown_pulse")) {
      setCd("drown_pulse", 2);
      dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.88 * outMult)), foe.name, "Drown Pulses you", { aoeAllParty: true });
      return true;
    }
    if (ready("brine_shackles")) {
      setCd("brine_shackles", 2);
      const targetUid = pickPartyTargetStrongestUid(st);
      dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.52 * outMult)), foe.name, "Brine Shackles you", targetUid == null ? null : { partyUid: targetUid });
      ensureCombatStatus(st);
      st.status.playerHamstringSlowTurns = Math.max(st.status.playerHamstringSlowTurns || 0, 2);
      st.status.playerAttackDebuffTurns = Math.max(st.status.playerAttackDebuffTurns || 0, 1);
      return true;
    }
    dealRawDamageToPlayer(st, Math.max(1, Math.floor(atk * 0.55 * outMult)), foe.name, "strikes you");
    return true;
  }

  return false;
}

function enemyCombatRunScript(scriptId, foe, st) {
  ensureCombatStatus(st);
  const prevSrc = st.__monsterDamageSourceFoe;
  st.__monsterDamageSourceFoe = foe;
  try {
    enemyCombatRunScriptInner(scriptId, foe, st);
  } finally {
    st.__monsterDamageSourceFoe = prevSrc;
  }
}

function enemyCombatRunScriptInner(scriptId, foe, st) {
  const atk = getFoeEffectiveAttackForCombat(foe);
  const outMult = getFoeOutgoingDamageMultiplier(st, foe);
  const cd = foe.combat.skillCd;
  const setCd = (key, n) => {
    cd[key] = Math.max(0, Math.floor(n));
  };
  const ready = (key) => !cd[key] || cd[key] <= 0;

  if (scriptId === "burrow_hare") {
    const lowHp = foe.maxHp > 0 && foe.hp / foe.maxHp < 0.5;
    if (lowHp && ready("burrow_instinct")) {
      setCd("burrow_instinct", 3);
      foe.combat.evadeNextChance = 0.4;
      appendFightLog(`${foe.name} uses Burrow Instinct (40% evade on your next hit).`);
      return;
    }
    if (ready("dust_flick")) {
      setCd("dust_flick", 2);
      ensureCombatStatus(st);
      st.status.playerAttackDebuffTurns = Math.max(st.status.playerAttackDebuffTurns || 0, 1);
      st.status.playerBrineWeakTurns = Math.max(st.status.playerBrineWeakTurns || 0, 1);
      appendFightLog(`${foe.name} uses Dust Flick.`);
      return;
    }
    const bite = Math.max(1, Math.floor(atk * 0.48 * outMult));
    dealRawDamageToPlayer(st, bite, foe.name, "bites you with Quick Bite", { partyUid: pickPartyTargetLowestMaxHpUid(st) });
    applyBleedToPlayer(st, Math.max(1, Math.floor(atk * 0.14)), 1 + Math.floor(Math.random() * 2));
    appendFightLog("You are bleeding.");
    return;
  }

  if (scriptId === "plains_raptor") {
    foe.combat.raptorActCount = (foe.combat.raptorActCount || 0) + 1;
    const fullHpPlayer = st.playerMax > 0 && st.playerHp >= st.playerMax * 0.99;
    if (foe.combat.raptorActCount === 1 && ready("pounce")) {
      const mul = fullHpPlayer ? 1.5 : 1;
      const dmg = Math.max(1, Math.floor(atk * mul * outMult));
      setCd("pounce", 2);
      dealRawDamageToPlayer(st, dmg, foe.name, "Pounces you");
      return;
    }
    if (ready("claw_rend")) {
      setCd("claw_rend", 1);
      const dmg = Math.max(1, Math.floor(atk * 0.82 * outMult));
      dealRawDamageToPlayer(st, dmg, foe.name, "Claw Rends you");
      applyBleedToPlayer(st, Math.max(1, Math.floor(atk * 0.12)), 2);
      appendFightLog("You are bleeding.");
      return;
    }
    if (ready("predator_focus")) {
      setCd("predator_focus", 3);
      if (!foe.combat) initFoeCombatRuntime(foe);
      foe.combat.echoCryBonusTurns = Math.max(foe.combat.echoCryBonusTurns || 0, 1);
      appendFightLog(`${foe.name} uses Predator Focus.`);
      return;
    }
    if (ready("pounce")) {
      const mul = fullHpPlayer ? 1.5 : 1;
      const dmg = Math.max(1, Math.floor(atk * mul * outMult));
      setCd("pounce", 2);
      dealRawDamageToPlayer(st, dmg, foe.name, "Pounces you");
      return;
    }
    const dmg = Math.max(1, Math.floor(atk * outMult));
    dealRawDamageToPlayer(st, dmg, foe.name, "hits you");
    return;
  }

  if (scriptId === "grass_snake") {
    const debuffed = !!(foe.combat.markedByPlayer || foe.combat.snakeDebuffed);
    if (ready("shed_skin") && debuffed) {
      setCd("shed_skin", 4);
      foe.combat.markedByPlayer = false;
      foe.combat.snakeDebuffed = false;
      foe.combat.evadeNextChance = Math.max(foe.combat.evadeNextChance || 0, 0.2);
      appendFightLog(`${foe.name} uses Shed Skin and shakes off debuffs.`);
      return;
    }
    const venomReady = ready("venom_bite");
    const noPoison = !st.status.playerPoison || st.status.playerPoison.turns <= 0;
    if (venomReady && noPoison) {
      setCd("venom_bite", 2);
      const dmg = Math.max(1, Math.floor(atk * 0.55 * outMult));
      dealRawDamageToPlayer(st, dmg, foe.name, "Venom Bites you");
      applyPoisonToPlayer(st, Math.max(2, Math.floor(atk * 0.22)), 3);
      appendFightLog("Strong poison courses through you.");
      return;
    }
    if (ready("constriction")) {
      setCd("constriction", 3);
      const dmg = Math.max(1, Math.floor(atk * 0.7 * outMult));
      dealRawDamageToPlayer(st, dmg, foe.name, "Constricts you");
      st.status.playerAttackDebuffTurns = Math.max(st.status.playerAttackDebuffTurns || 0, 2);
      appendFightLog("Your attacks are weakened (2 turns).");
      return;
    }
    if (venomReady) {
      setCd("venom_bite", 2);
      const dmg = Math.max(1, Math.floor(atk * 0.55 * outMult));
      dealRawDamageToPlayer(st, dmg, foe.name, "Venom Bites you");
      applyPoisonToPlayer(st, Math.max(2, Math.floor(atk * 0.22)), 3);
      appendFightLog("Strong poison courses through you.");
      return;
    }
    const dmg = Math.max(1, Math.floor(atk * 0.65 * outMult));
    dealRawDamageToPlayer(st, dmg, foe.name, "bites you");
    return;
  }

  if (scriptId === "tusk_boar") {
    if (!foe.combat.boarOpened) {
      foe.combat.boarOpened = true;
      if (ready("thick_hide")) {
        setCd("thick_hide", 4);
        const ms = getMonsterScalingConfig();
        const cap = typeof ms.thickHideReductionCap === "number" ? ms.thickHideReductionCap : 0.65;
        const b = typeof ms.thickHideBase === "number" ? ms.thickHideBase : 0.25;
        const pv = typeof ms.thickHidePerVit === "number" ? ms.thickHidePerVit : 0.002;
        const red = Math.min(cap, b + (typeof foe.vit === "number" ? foe.vit : 0) * pv);
        foe.combat.thickHideDamagedMult = 1 - red;
        foe.combat.thickHideTurns = 2;
        appendFightLog(`${foe.name} uses Thick Hide (~${Math.round(red * 100)}% damage reduction, 2 rounds).`);
        return;
      }
    }
    if (ready("gore_charge")) {
      setCd("gore_charge", 2);
      const gore = Math.floor(monsterPhysicalDamageFromBase(foe, 22, 0.02) * outMult);
      dealRawDamageToPlayer(st, Math.max(1, gore), foe.name, "Gore Charges you");
      return;
    }
    const dmg = Math.max(1, Math.floor(atk * 0.75 * outMult));
    dealRawDamageToPlayer(st, dmg, foe.name, "hits you");
    return;
  }

  if (scriptId === "field_wolf") {
    if (!foe.combat.wolfHowlDone && ready("pack_howl")) {
      foe.combat.wolfHowlDone = true;
      setCd("pack_howl", 4);
      ensureCombatStatus(st);
      st.status.packHowlTurns = Math.max(st.status.packHowlTurns || 0, 2);
      const ms = getMonsterScalingConfig();
      const pb = typeof ms.packHowlBase === "number" ? ms.packHowlBase : 0.2;
      const pi = typeof ms.packHowlPerInt === "number" ? ms.packHowlPerInt : 0.003;
      st.status.packHowlAttackMult = 1 + pb + (typeof foe.int === "number" ? foe.int : 0) * pi;
      appendFightLog(`${foe.name} uses Pack Howl (allies deal extra damage, 2 rounds).`);
      return;
    }
    const low = isAnyPartyMemberHpFractionBelow(st, 0.3);
    if (low && ready("execution_bite")) {
      setCd("execution_bite", 1);
      const baseExec = monsterPhysicalDamageFromBase(foe, 25, 0.02) * 2 * outMult;
      dealRawDamageToPlayer(st, Math.max(1, Math.floor(baseExec)), foe.name, "Execution Bites you");
      return;
    }
    if (ready("hamstring")) {
      setCd("hamstring", 2);
      const dmg = Math.max(1, Math.floor(monsterPhysicalDamageFromBase(foe, 18, 0.015) * outMult));
      dealRawDamageToPlayer(st, dmg, foe.name, "Hamstring Bites you", { partyUid: pickPartyTargetLowestHpUid(st) });
      applyBleedToPlayer(
        st,
        Math.max(1, Math.floor(monsterIntScaledValue(foe, 5, "dot"))),
        2
      );
      ensureCombatStatus(st);
      st.status.playerHamstringSlowTurns = Math.max(st.status.playerHamstringSlowTurns || 0, 2);
      appendFightLog("You are bleeding and slowed.");
      return;
    }
    const dmg = Math.max(1, Math.floor(atk * outMult));
    dealRawDamageToPlayer(st, dmg, foe.name, "bites you");
    return;
  }

  if (runExtendedBiomeEnemyScripts(scriptId, foe, st, atk, outMult, cd, setCd, ready)) return;

  const dmg = Math.max(1, Math.floor(atk * outMult));
  dealRawDamageToPlayer(st, dmg, foe.name, "hits you");
}

function navigate(p) {
  if (p === "overview") {
    openCharacterPanel();
    return;
  }
  if (p === "arena" || p === "alliance" || p === "market") {
    openMenuPanel(p);
    return;
  }
  if (p === "adventure") {
    closeCharacterPanel();
    closeMenuPanel();
  }
  currentPage = p;
  render();
}

function setTheme(themeId) {
  if (!GAME_CONFIG.themes[themeId]) return;
  player.theme = themeId;
  applyTheme(themeId);
  save();
}

function applyTheme(themeId) {
  document.documentElement.dataset.theme = themeId;
}

function categorizeInventory() {
  const equipment = [];
  const resources = [];
  const consumables = [];
  player.inventory.forEach((name) => {
    const def = getItemDef(name);
    if (!def) {
      resources.push(name);
      return;
    }
    if (def.type === "consumable") consumables.push(name);
    else if (def.type === "resource") resources.push(name);
    else if (def.slot) equipment.push(name);
    else resources.push(name);
  });
  return { equipment, resources, consumables };
}

function removeOneFromInventory(itemName) {
  const i = player.inventory.indexOf(itemName);
  if (i !== -1) player.inventory.splice(i, 1);
}

function useConsumable(itemName) {
  const def = getItemDef(itemName);
  if (!def || def.type !== "consumable") return;
  if (def.effect === "heal") {
    const base = def.value || 0;
    const bonus = formulaVitHealingReceivedBonusPct(totalVit()) / 100;
    const amt = Math.max(1, Math.floor(base * (1 + bonus)));
    player.hp = Math.min(player.maxHp, player.hp + amt);
    removeOneFromInventory(itemName);
    save();
    render();
  }
}

function equipFromInventory(itemName) {
  const def = getItemDef(itemName);
  if (!def || !def.slot) return false;
  const i = player.inventory.indexOf(itemName);
  if (i === -1) return false;
  const slot = def.slot;
  const prev = player.equipment[slot];
  player.equipment[slot] = itemName;
  player.inventory.splice(i, 1);
  if (prev) player.inventory.push(prev);
  save();
  render();
  return true;
}

function unequipToInventory(slotId) {
  const name = player.equipment[slotId];
  if (!name) return;
  player.equipment[slotId] = null;
  player.inventory.push(name);
  save();
  render();
}

const HERO_PORTRAITS = {
  idle: "Assets/Character/hero.svg",
  walk: "Assets/Character/hero.svg",
  attack: "Assets/Character/hero.svg"
};

function normalizeVisualState(state) {
  if (state === "walk" || state === "attack") return state;
  return "idle";
}

/**
 * Supports both legacy single image (`image`) and state images (`images.idle|walk|attack`).
 * @param {{ image?: string, images?: { idle?: string, walk?: string, attack?: string } } | null | undefined} src
 * @param {"idle"|"walk"|"attack"|string} state
 */
function resolveImageByState(src, state) {
  const visual = normalizeVisualState(state);
  const images = src && src.images && typeof src.images === "object" ? src.images : null;
  const legacy = src && typeof src.image === "string" ? src.image : "";
  if (!images) return legacy;
  const pick =
    (typeof images[visual] === "string" && images[visual]) ||
    (typeof images.idle === "string" && images.idle) ||
    (typeof images.walk === "string" && images.walk) ||
    (typeof images.attack === "string" && images.attack) ||
    legacy;
  return typeof pick === "string" ? pick : legacy;
}

/**
 * Sprite format:
 * sprites: {
 *   idle: { sheet: "Assets/Monsters/foo_idle_sprite.png", frames: 12, fps: 12, loop: true, cols: 12, rows: 1 },
 *   walk: { sheet: "Assets/Monsters/foo_walk_sprite.png", frames: 10, fps: 14, loop: true, cols: 5, rows: 2 },
 *   attack: { sheet: "Assets/Monsters/foo_attack_sprite.png", frames: 10, fps: 18, loop: true, cols: 10, rows: 1 }
 * }
 */
function normalizeSpriteDef(raw) {
  if (!raw) return null;
  if (typeof raw === "string") {
    return { sheet: raw, frames: 1, fps: 1, loop: true, cols: 1, rows: 1 };
  }
  if (typeof raw !== "object" || typeof raw.sheet !== "string" || !raw.sheet) return null;
  const frames = Math.max(1, Math.floor(Number.isFinite(raw.frames) ? raw.frames : 1));
  const fps = Math.max(1, Math.floor(Number.isFinite(raw.fps) ? raw.fps : 12));
  const loop = raw.loop !== false;
  const colsRaw = Number.isFinite(raw.cols) ? raw.cols : Number.isFinite(raw.columns) ? raw.columns : frames;
  const rowsRaw = Number.isFinite(raw.rows) ? raw.rows : 1;
  let cols = Math.max(1, Math.floor(colsRaw));
  let rows = Math.max(1, Math.floor(rowsRaw));
  if (cols * rows < frames) rows = Math.max(rows, Math.ceil(frames / cols));
  cols = Math.max(cols, Math.ceil(frames / rows));
  return { sheet: raw.sheet, frames, fps, loop, cols, rows };
}

function resolveSpriteByState(src, state) {
  const visual = normalizeVisualState(state);
  const sprites = src && src.sprites && typeof src.sprites === "object" ? src.sprites : null;
  if (!sprites) return null;
  const pick = sprites[visual] || sprites.idle || sprites.walk || sprites.attack || null;
  return normalizeSpriteDef(pick);
}

function resolveVisualByState(src, state) {
  return {
    image: resolveImageByState(src, state),
    sprite: resolveSpriteByState(src, state)
  };
}

function getEnemyDefByName(name) {
  const aliases = {
    "Greenleaf Squirrel": "Leafdart Squirrel",
    "Greenleaf Parrot": "Canopy Screecher",
    "Greenleaf Stag": "Jungle Stag"
  };
  const direct = GAME_CONFIG.enemies.find((e) => e.name === name);
  if (direct) return direct;
  const mapped = aliases[name];
  if (!mapped) return null;
  return GAME_CONFIG.enemies.find((e) => e.name === mapped) || null;
}

/** @type {readonly string[]} */
const ENEMY_SPAWN_RARITY_ORDER = ["common", "rare", "epic", "myth", "ancient"];

function normalizeEnemySpawnRarity(raw) {
  const s = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (ENEMY_SPAWN_RARITY_ORDER.includes(s)) return s;
  return "common";
}

/**
 * Picks an enemy name from a biome/region pool using `GAME_CONFIG.enemySpawnRarityWeights`
 * and each enemy's `spawnRarity` (defaults to common), then applies per-monster pressure multipliers.
 * @param {string[]} pool
 * @returns {string | null}
 */
function pickRandomEnemyNameFromPool(pool) {
  if (!pool || !pool.length) return null;
  const cfg = GAME_CONFIG.enemySpawnRarityWeights;
  const weighted = [];
  let sum = 0;
  for (const name of pool) {
    const def = getEnemyDefByName(name);
    const tier = normalizeEnemySpawnRarity(def && def.spawnRarity);
    const baseWeight =
      cfg && typeof cfg === "object" && typeof cfg[tier] === "number" && Number.isFinite(cfg[tier])
        ? Math.max(0, cfg[tier])
        : 0;
    const perMonsterMult = getMonsterSpawnRateMultiplier(name);
    const w = Math.max(0, (baseWeight > 0 ? baseWeight : 1) * perMonsterMult);
    weighted.push({ name, w });
    sum += w;
  }
  if (sum <= 0) return randomFrom(pool);
  let r = Math.random() * sum;
  for (const entry of weighted) {
    r -= entry.w;
    if (r <= 0) return entry.name;
  }
  return weighted[weighted.length - 1] ? weighted[weighted.length - 1].name : randomFrom(pool);
}

function getEnemyVisualByName(name, state) {
  const def = getEnemyDefByName(name);
  if (!def) return { image: "", sprite: null };
  return resolveVisualByState(def, state);
}

function getHeroImageForState(state) {
  return resolveImageByState({ images: HERO_PORTRAITS, image: HERO_PORTRAITS.idle }, state);
}

function buildSpriteStyleAttr(sprite) {
  if (!sprite || !sprite.sheet) return "";
  return `background-image:url(${JSON.stringify(sprite.sheet)})`;
}

function buildVisualHtml(asset, className, altText, draggable) {
  const alt = altText || "";
  if (asset && asset.sprite && asset.sprite.sheet) {
    const style = buildSpriteStyleAttr(asset.sprite);
    const frames = Math.max(1, Math.floor(asset.sprite.frames || 1));
    const fps = Math.max(1, Math.floor(asset.sprite.fps || 12));
    const cols = Math.max(1, Math.floor(asset.sprite.cols || frames));
    const rows = Math.max(1, Math.floor(asset.sprite.rows || 1));
    const loop = asset.sprite.loop === false ? "0" : "1";
    return `<div class="${escapeAttr(className)} sprite-anim" style="${escapeAttr(style)}" data-sprite-frames="${frames}" data-sprite-fps="${fps}" data-sprite-cols="${cols}" data-sprite-rows="${rows}" data-sprite-loop="${loop}" role="img" aria-label="${escapeAttr(alt)}"${
      draggable ? ' draggable="false"' : ""
    }></div>`;
  }
  const img = asset && typeof asset.image === "string" ? asset.image : "";
  if (!img) return "";
  return `<img class="${escapeAttr(className)}" src="${escapeAttr(img)}" alt="${escapeAttr(alt)}"${
    draggable ? ' draggable="false"' : ""
  } />`;
}

const spriteEls = new Set();
let spriteRaf = null;

function readSpriteFrameWidth(el) {
  const cw = Math.max(1, Math.round(el.clientWidth || 0));
  if (cw > 1) return cw;
  const parsed = Math.round(parseFloat(getComputedStyle(el).width || "0"));
  return Math.max(1, parsed || 1);
}

function readSpriteFrameHeight(el) {
  const ch = Math.max(1, Math.round(el.clientHeight || 0));
  if (ch > 1) return ch;
  const parsed = Math.round(parseFloat(getComputedStyle(el).height || "0"));
  return Math.max(1, parsed || 1);
}

function syncSpriteGeometry(el, cols, rows) {
  const frameW = readSpriteFrameWidth(el);
  const frameH = readSpriteFrameHeight(el);
  const prevW = parseInt(el.dataset.spriteFrameW || "0", 10);
  const prevH = parseInt(el.dataset.spriteFrameH || "0", 10);
  if (frameW !== prevW || frameH !== prevH) {
    el.dataset.spriteFrameW = String(frameW);
    el.dataset.spriteFrameH = String(frameH);
    el.style.backgroundSize = `${frameW * Math.max(1, cols)}px ${frameH * Math.max(1, rows)}px`;
  }
  return { frameW, frameH };
}

function registerSpriteElement(el) {
  if (!el || !(el instanceof HTMLElement)) return;
  const frames = Math.max(1, parseInt(el.dataset.spriteFrames || "1", 10));
  const cols = Math.max(1, parseInt(el.dataset.spriteCols || String(frames), 10));
  const rows = Math.max(1, parseInt(el.dataset.spriteRows || "1", 10));
  syncSpriteGeometry(el, cols, rows);
  if (!el.dataset.spriteStart) {
    // Small random phase offset keeps packs from marching in lockstep.
    el.dataset.spriteStart = String(performance.now() - Math.floor(Math.random() * 400));
  }
  if (!el.dataset.spriteIndex) el.dataset.spriteIndex = "-1";
  spriteEls.add(el);
}

function tickSprites(now) {
  let active = 0;
  spriteEls.forEach((el) => {
    if (!el.isConnected) {
      spriteEls.delete(el);
      return;
    }
    const frames = Math.max(1, parseInt(el.dataset.spriteFrames || "1", 10));
    const fps = Math.max(1, parseInt(el.dataset.spriteFps || "12", 10));
    const cols = Math.max(1, parseInt(el.dataset.spriteCols || String(frames), 10));
    const rows = Math.max(1, parseInt(el.dataset.spriteRows || "1", 10));
    const capacity = Math.max(1, cols * rows);
    const frameCount = Math.min(frames, capacity);
    const loop = el.dataset.spriteLoop !== "0";
    const { frameW, frameH } = syncSpriteGeometry(el, cols, rows);
    const start = Number(el.dataset.spriteStart || now);
    let idx = Math.floor(((now - start) / 1000) * fps);
    if (loop) idx = ((idx % frameCount) + frameCount) % frameCount;
    else idx = Math.min(frameCount - 1, Math.max(0, idx));
    if (String(idx) !== el.dataset.spriteIndex) {
      el.dataset.spriteIndex = String(idx);
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      el.style.backgroundPosition = `${-col * frameW}px ${-row * frameH}px`;
    }
    active++;
  });
  if (active > 0) spriteRaf = requestAnimationFrame(tickSprites);
  else spriteRaf = null;
}

function hydrateSpriteAnimations(root) {
  const host = root && root.querySelectorAll ? root : document;
  host.querySelectorAll(".sprite-anim[data-sprite-frames]").forEach((el) => registerSpriteElement(el));
  if (spriteEls.size > 0 && spriteRaf == null) spriteRaf = requestAnimationFrame(tickSprites);
}

const PLAYER_TURN_SECONDS = 30;
/** @type {ReturnType<typeof setInterval> | null} */
let playerTurnTimerTick = null;

/** Mob size when spawning from a biome/region pool (inclusive). */
const MOB_SIZE_MIN = 1;
const MOB_SIZE_MAX = 8;
/**
 * Per encounter slot, mob "level" is the sum of all unit levels. That sum is rolled in
 * [ceil(d·(1−v)), floor(d·(1+v))] around anchor d (±25%). Individual unit levels respect each enemy's possibleLevels.
 */
const MOB_DIFFICULTY_LEVEL_VARIANCE = 0.25;

const MOB_DIFFICULTY_TIER_LABELS = ["easy", "medium", "hard"];

function randomFrom(arr) {
  if (!arr || !arr.length) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickMoodFromEnemyDef(def) {
  const moods = GAME_CONFIG.enemyMoods;
  const ids = def && def.possibleMoods;
  if (Array.isArray(ids) && ids.length) {
    const id = randomFrom(ids);
    const m = moods.find((x) => x.id === id);
    if (m) return m;
  }
  if (Array.isArray(moods) && moods.length) return randomFrom(moods);
  return { id: "neutral", name: "Neutral", attackBonus: 0, attackMult: 1, hpMult: 1, damageTakenMult: 1, description: "" };
}

function pickLevelFromEnemyDef(def) {
  const levels = def && def.possibleLevels;
  if (Array.isArray(levels) && levels.length) {
    const lv = randomFrom(levels);
    if (typeof lv === "number" && Number.isFinite(lv)) return Math.max(1, Math.floor(lv));
  }
  return 1;
}

/**
 * @param {{ mobDifficulty?: { easy?: number, medium?: number, hard?: number } } | null | undefined} biomeLike
 * @param {number} slotIndex encounter slot 0,1,2 → easy, medium, hard
 * @returns {number | null} anchor level, or null to use legacy rolling
 */
function getDifficultyAnchorForSlot(biomeLike, slotIndex) {
  const md = biomeLike && biomeLike.mobDifficulty;
  if (!md || typeof md !== "object") return null;
  const easy = typeof md.easy === "number" ? md.easy : NaN;
  const med = typeof md.medium === "number" ? md.medium : NaN;
  const hard = typeof md.hard === "number" ? md.hard : NaN;
  if (![easy, med, hard].every((n) => Number.isFinite(n) && n > 0)) return null;
  const tiers = [easy, med, hard];
  return tiers[slotIndex % 3];
}

/** Integer bounds for total mob level (sum of unit levels) around anchor d (±{@link MOB_DIFFICULTY_LEVEL_VARIANCE}). */
function difficultyTotalLevelRangeFromAnchor(d) {
  if (!Number.isFinite(d) || d <= 0) return { minL: 1, maxL: 1 };
  const lo = d * (1 - MOB_DIFFICULTY_LEVEL_VARIANCE);
  const hi = d * (1 + MOB_DIFFICULTY_LEVEL_VARIANCE);
  const minL = Math.max(1, Math.ceil(lo));
  const maxL = Math.max(minL, Math.floor(hi));
  return { minL, maxL };
}

function getNumericLevelsForDef(def) {
  const levels = def && def.possibleLevels;
  if (!Array.isArray(levels) || !levels.length) return null;
  const nums = [
    ...new Set(
      levels
        .filter((lv) => typeof lv === "number" && Number.isFinite(lv) && lv >= 1)
        .map((x) => Math.floor(x))
    )
  ].sort((a, b) => a - b);
  return nums.length ? nums : null;
}

function minLevelDef(def) {
  const ch = getNumericLevelsForDef(def);
  return ch ? ch[0] : 1;
}

function maxLevelDef(def) {
  const ch = getNumericLevelsForDef(def);
  return ch ? ch[ch.length - 1] : 200;
}

function minSumForDefs(defs) {
  return defs.reduce((s, d) => s + minLevelDef(d), 0);
}

function maxSumForDefs(defs) {
  return defs.reduce((s, d) => s + maxLevelDef(d), 0);
}

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = arr[i];
    arr[i] = arr[j];
    arr[j] = t;
  }
  return arr;
}

function candidateLevelsForDefSlot(def, minLv, maxLv) {
  const choices = getNumericLevelsForDef(def);
  if (choices) {
    const pool = choices.filter((lv) => lv >= minLv && lv <= maxLv);
    shuffleInPlace(pool);
    return pool;
  }
  const span = maxLv - minLv + 1;
  if (span <= 48) {
    const order = [];
    for (let lv = minLv; lv <= maxLv; lv++) order.push(lv);
    shuffleInPlace(order);
    return order;
  }
  const order = [];
  for (let t = 0; t < 48; t++) order.push(minLv + Math.floor(Math.random() * span));
  return order;
}

/**
 * Assigns one level per def so levels sum to target. Respects possibleLevels when set; otherwise any integer in range.
 * @returns {number[] | null}
 */
function assignLevelsToTargetSum(defs, target) {
  const n = defs.length;
  if (n === 0) return null;
  if (target < minSumForDefs(defs) || target > maxSumForDefs(defs)) return null;

  function dfs(i, remaining) {
    if (i === n) return remaining === 0 ? [] : null;
    const def = defs[i];
    const rest = defs.slice(i + 1);
    const minRest = minSumForDefs(rest);
    const maxRest = maxSumForDefs(rest);
    const minLv = Math.max(minLevelDef(def), remaining - maxRest);
    const maxLv = Math.min(maxLevelDef(def), remaining - minRest);
    if (minLv > maxLv) return null;
    const candidates = candidateLevelsForDefSlot(def, minLv, maxLv);
    for (const lv of candidates) {
      const sub = dfs(i + 1, remaining - lv);
      if (sub) return [lv, ...sub];
    }
    return null;
  }

  return dfs(0, target);
}

/** Picks a total level in [minT,maxT] that is achievable by defs (sum of per-unit levels). */
function pickTargetTotalLevel(minT, maxT, defs) {
  const minS = minSumForDefs(defs);
  const maxS = maxSumForDefs(defs);
  const lo = Math.max(minT, minS);
  const hi = Math.min(maxT, maxS);
  if (lo > hi) {
    const mid = Math.floor((minT + maxT) / 2);
    return Math.max(minS, Math.min(maxS, mid));
  }
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

function rollMobCompositionFallbackTotalAnchor(pool, anchor, tier, minTotal, maxTotal, biomeLike) {
  const name = pickRandomEnemyNameFromPool(pool) || randomFrom(pool);
  const def = GAME_CONFIG.enemies.find((e) => e.name === name);
  if (!def) {
    return { units: [], mobTotalLevel: 0, difficultyTier: tier, difficultyAnchor: anchor };
  }
  const mood = pickMoodFromEnemyDef(def);
  const ch = getNumericLevelsForDef(def);
  let level;
  if (ch) {
    const valid = ch.filter((l) => l >= minTotal && l <= maxTotal);
    if (valid.length) level = randomFrom(valid);
    else
      level = ch.reduce((best, l) => {
        const da = Math.abs(l - anchor);
        const db = Math.abs(best - anchor);
        return da < db ? l : best;
      }, ch[0]);
  } else {
    level = minTotal + Math.floor(Math.random() * (maxTotal - minTotal + 1));
  }
  return {
    units: [{ name, level, moodId: mood.id, moodName: mood.name }],
    mobTotalLevel: level,
    difficultyTier: tier,
    difficultyAnchor: anchor
  };
}

function getWorldMapEncounterSlotCount() {
  const n = GAME_CONFIG.worldMap && GAME_CONFIG.worldMap.encounterSlotsPerTile;
  return typeof n === "number" && n >= 1 ? Math.floor(n) : 3;
}

/**
 * Refreshes monster previews/visual defs from current config without wiping player progression.
 * By default it keeps encounter cooldowns (`defeated`) and only clears cached `mobPreviews`.
 * @param {{ resetDefeated?: boolean }} [opts]
 */
function reloadMonsters(opts) {
  const resetDefeated = !!(opts && opts.resetDefeated);
  if (player && player.worldMap && player.worldMap.cells && typeof player.worldMap.cells === "object") {
    Object.keys(player.worldMap.cells).forEach((k) => {
      const rec = player.worldMap.cells[k];
      if (!rec || typeof rec !== "object") return;
      rec.mobPreviews = [];
      if (resetDefeated && Array.isArray(rec.defeated)) rec.defeated = rec.defeated.map(() => null);
    });
  }

  if (combatState && Array.isArray(combatState.foes)) {
    combatState.foes = combatState.foes.map((foe) => {
      const def = getEnemyDefByName(foe.name);
      if (!def) return foe;
      return {
        ...foe,
        image: resolveImageByState(def, "idle"),
        images: def.images && typeof def.images === "object" ? def.images : null,
        sprites: def.sprites && typeof def.sprites === "object" ? def.sprites : null
      };
    });
  }

  save();
  render();
  if (combatState) renderTurnBattle();
}

/** One portrait per enemy in the current mob preview. */
function buildWorldCampMobThumbsHtmlFromUnits(units) {
  if (!units || !units.length) return "";
  return units
    .map((u) => {
      const visual = getEnemyVisualByName(u.name, "walk");
      return buildVisualHtml(visual, "mob-thumb mob-thumb--live", u.name, true);
    })
    .join("");
}

/** Rolls a full mob without per-slot difficulty (biome lacks mobDifficulty). */
function rollMobCompositionLegacy(pool, biomeLike) {
  const count = Math.floor(Math.random() * (MOB_SIZE_MAX - MOB_SIZE_MIN + 1)) + MOB_SIZE_MIN;
  const units = [];
  for (let i = 0; i < count; i++) {
    const name = pickRandomEnemyNameFromPool(pool) || randomFrom(pool);
    const def = GAME_CONFIG.enemies.find((e) => e.name === name);
    if (!def) continue;
    const mood = pickMoodFromEnemyDef(def);
    const level = pickLevelFromEnemyDef(def);
    units.push({ name, level, moodId: mood.id, moodName: mood.name });
  }
  if (!units.length && pool.length) {
    const name = pickRandomEnemyNameFromPool(pool) || randomFrom(pool);
    const def = GAME_CONFIG.enemies.find((e) => e.name === name);
    if (def) {
      const mood = pickMoodFromEnemyDef(def);
      const level = pickLevelFromEnemyDef(def);
      units.push({ name, level, moodId: mood.id, moodName: mood.name });
    }
  }
  return { units };
}

/**
 * Rolls a full mob: 1–8 enemies from the pool. If biomeLike.mobDifficulty is set, slot 0/1/2 maps to
 * easy/medium/hard anchors; the sum of unit levels is rolled in the ±25% band around that anchor (see game.js constants).
 * @param {string[]} pool
 * @param {number} [slotIndex]
 * @param {{ mobDifficulty?: { easy?: number, medium?: number, hard?: number } } | null} [biomeLike]
 */
function rollMobComposition(pool, slotIndex, biomeLike) {
  const anchor =
    biomeLike != null && typeof slotIndex === "number"
      ? getDifficultyAnchorForSlot(biomeLike, slotIndex)
      : null;
  if (anchor == null) {
    return rollMobCompositionLegacy(pool, biomeLike);
  }
  const { minL: minTotal, maxL: maxTotal } = difficultyTotalLevelRangeFromAnchor(anchor);
  const tier = MOB_DIFFICULTY_TIER_LABELS[slotIndex % 3];
  for (let attempt = 0; attempt < 100; attempt++) {
    const count = Math.floor(Math.random() * (MOB_SIZE_MAX - MOB_SIZE_MIN + 1)) + MOB_SIZE_MIN;
    const defs = [];
    for (let i = 0; i < count; i++) {
      const name = pickRandomEnemyNameFromPool(pool) || randomFrom(pool);
      const def = GAME_CONFIG.enemies.find((e) => e.name === name);
      if (def) defs.push(def);
    }
    if (!defs.length) continue;
    const targetTotal = pickTargetTotalLevel(minTotal, maxTotal, defs);
    const levels = assignLevelsToTargetSum(defs, targetTotal);
    if (!levels) continue;
    const units = [];
    let sum = 0;
    for (let i = 0; i < defs.length; i++) {
      const def = defs[i];
      const mood = pickMoodFromEnemyDef(def);
      const level = levels[i];
      sum += level;
      units.push({
        name: def.name,
        level,
        moodId: mood.id,
        moodName: mood.name
      });
    }
    return {
      units,
      mobTotalLevel: sum,
      difficultyTier: tier,
      difficultyAnchor: anchor
    };
  }
  return rollMobCompositionFallbackTotalAnchor(pool, anchor, tier, minTotal, maxTotal, biomeLike);
}

/**
 * Ensures a persisted mob preview for this map cell slot (used for thumbnails, tooltip, and combat).
 * Cleared on victory; rolled when missing and the slot is available.
 */
function ensureMobPreview(x, y, si) {
  const biome = getWorldBiomeDefAt(x, y);
  const pool = biome.possibleEnemies || [];
  if (!pool.length) return null;
  if (isWorldMobSetDefeated(x, y, si)) return null;
  const cellCfg = getCoordinateCellConfig(x, y);
  const slots = getEncounterSlotCountForCell(x, y, cellCfg);
  if (si < 0 || si >= slots) return null;
  const key = worldMapKey(x, y);
  if (!player.worldMap.cells[key]) player.worldMap.cells[key] = { defeated: [], defeatedUnits: [], mobPreviews: [] };
  const rec = player.worldMap.cells[key];
  if (!Array.isArray(rec.defeated)) rec.defeated = [];
  if (!Array.isArray(rec.defeatedUnits)) rec.defeatedUnits = [];
  if (!Array.isArray(rec.mobPreviews)) rec.mobPreviews = [];
  while (rec.defeated.length < slots) rec.defeated.push(null);
  while (rec.defeatedUnits.length < slots) rec.defeatedUnits.push(null);
  while (rec.mobPreviews.length < slots) rec.mobPreviews.push(null);
  if (rec.mobPreviews[si] && rec.mobPreviews[si].units && rec.mobPreviews[si].units.length) {
    return rec.mobPreviews[si];
  }
  const roll = rollMobComposition(pool, si, biome);
  rec.mobPreviews[si] = roll;
  if (roll && Array.isArray(roll.units) && roll.units.length) recordMonsterSpawnsFromUnits(roll.units);
  save();
  return roll;
}

function getMonsterScalingConfig() {
  return GAME_CONFIG.monsterScaling && typeof GAME_CONFIG.monsterScaling === "object" ? GAME_CONFIG.monsterScaling : {};
}

/** @type {Record<string, "tank"|"assassin"|"bruiser"|"mage"|"support"|"controller"|"summoner">} */
const MONSTER_ROLE_BY_SCRIPT_ID = {
  burrow_hare: "controller",
  plains_raptor: "bruiser",
  grass_snake: "mage",
  tusk_boar: "bruiser",
  field_wolf: "assassin",
  greenleaf_squirrel: "support",
  greenleaf_parrot: "support",
  greenleaf_fox: "assassin",
  greenleaf_stag: "support",
  gorilla: "bruiser",
  stone_marmot: "tank",
  rock_lynx: "assassin",
  rock_ibex: "bruiser",
  rock_serpent: "controller",
  rock_lizard: "tank",
  ash_lizard: "mage",
  cinder_stalker: "assassin",
  ember_scuttler: "controller",
  magma_boar: "bruiser",
  lava_basilisk: "controller",
  icy_mink: "assassin",
  icy_serpent: "mage",
  glacier_turtoise: "tank",
  frozen_stalker: "assassin",
  frost_skitter: "controller",
  pinebound_fawn: "support",
  frozen_pinecone: "controller",
  ice_tusked_boar: "tank",
  barkhide_spriggan: "support",
  winter_guardian: "tank",
  dust_carver: "assassin",
  desert_thornback_crawler: "tank",
  mirage_lurker: "controller",
  dune_devourer: "bruiser",
  witherling: "mage",
  remnant_of_rust: "controller",
  faded_war_wraith: "summoner",
  ash_horror: "mage",
  cinder_husk: "tank",
  ash_skulker: "assassin",
  tide_hopper: "controller",
  hermit_crab: "tank",
  driftling: "support",
  tidemeld_revenant: "summoner",
  coastal_horror: "controller",
  saltwind_skimmer: "assassin",
  brinegullet_spitter: "mage",
  wavebreaker_idol: "tank",
  cliff_lurker: "assassin",
  tideharrow: "controller"
};

function inferMonsterCombatRole(scriptId) {
  const s = typeof scriptId === "string" ? scriptId.trim() : "";
  return MONSTER_ROLE_BY_SCRIPT_ID[s] || "bruiser";
}

function getEnemyCombatRoleKey(def) {
  if (def && typeof def.combatRole === "string" && def.combatRole.trim()) {
    const k = def.combatRole.trim().toLowerCase();
    const roles = GAME_CONFIG.enemyRoles && typeof GAME_CONFIG.enemyRoles === "object" ? GAME_CONFIG.enemyRoles : null;
    if (roles && roles[k]) return k;
  }
  const sid = def && typeof def.combatScript === "string" ? def.combatScript.trim() : "";
  return inferMonsterCombatRole(sid);
}

function distributeMonsterStatBudget(level, roleKey) {
  const ms = getMonsterScalingConfig();
  const per = typeof ms.statsPerLevel === "number" && ms.statsPerLevel > 0 ? ms.statsPerLevel : 4.5;
  const budget = Math.max(4, Math.round(level * per));
  const roles = GAME_CONFIG.enemyRoles && typeof GAME_CONFIG.enemyRoles === "object" ? GAME_CONFIG.enemyRoles : {};
  const w = roles[roleKey] || roles.bruiser || { STR: 0.4, DEX: 0.2, VIT: 0.3, INT: 0.1 };
  const ws = { str: w.STR, dex: w.DEX, vit: w.VIT, int: w.INT };
  const keys = ["str", "dex", "vit", "int"];
  const raw = keys.map((k) => budget * ws[k]);
  const fl = raw.map((x) => Math.floor(x));
  let rem = budget - fl.reduce((a, b) => a + b, 0);
  const fracs = keys.map((k, i) => ({ i, f: raw[i] - fl[i] }));
  fracs.sort((a, b) => b.f - a.f);
  const out = { str: fl[0], dex: fl[1], vit: fl[2], int: fl[3] };
  for (let j = 0; j < rem; j++) out[keys[fracs[j % fracs.length].i]]++;
  return out;
}

function monsterPhysicalDamageFromBase(foe, baseDamage, strCoeffOverride) {
  const ms = getMonsterScalingConfig();
  const k =
    typeof strCoeffOverride === "number"
      ? strCoeffOverride
      : typeof ms.damageStrCoeff === "number"
        ? ms.damageStrCoeff
        : 0.015;
  const str = typeof foe.str === "number" && foe.str > 0 ? foe.str : 0;
  return Math.max(1, baseDamage * (1 + str * k));
}

function monsterIntScaledValue(foe, base, coeffKey) {
  const ms = getMonsterScalingConfig();
  const ck = coeffKey === "effect" ? "effectIntCoeff" : "dotIntCoeff";
  const k = typeof ms[ck] === "number" ? ms[ck] : 0.02;
  const intv = typeof foe.int === "number" && foe.int > 0 ? foe.int : 0;
  return Math.max(1, base * (1 + intv * k));
}

function applyMonsterCritToRaw(foe, raw) {
  const ms = getMonsterScalingConfig();
  const dex = typeof foe.dex === "number" && foe.dex > 0 ? foe.dex : 0;
  const base = typeof ms.enemyCritBasePct === "number" ? ms.enemyCritBasePct : 5;
  const perDex = typeof ms.enemyCritPerDexPct === "number" ? ms.enemyCritPerDexPct : 0.2;
  const p = Math.min(0.55, (base + dex * perDex) / 100);
  const mult = typeof ms.enemyCritDamageMult === "number" ? ms.enemyCritDamageMult : 1.5;
  if (Math.random() < p) return Math.max(1, Math.floor(raw * mult));
  return raw;
}

function buildSpawnedFoe(region, def, uid, level, mood) {
  const scale = region && typeof region.enemyScale === "number" ? region.enemyScale : 1;
  const attackBonus = typeof mood.attackBonus === "number" ? mood.attackBonus : 0;
  const attackMult = typeof mood.attackMult === "number" ? mood.attackMult : 1;
  const hpMult = typeof mood.hpMult === "number" ? mood.hpMult : 1;
  const damageTakenMult = typeof mood.damageTakenMult === "number" ? mood.damageTakenMult : 1;
  const roleKey = getEnemyCombatRoleKey(def);
  const stats = distributeMonsterStatBudget(level, roleKey);
  const ms = getMonsterScalingConfig();
  const hpPerVit = typeof ms.hpPerVit === "number" ? ms.hpPerVit : 8;
  const baseHp = (typeof def.hp === "number" ? def.hp : 20) * scale;
  const hp = Math.max(1, Math.round((baseHp + stats.vit * hpPerVit) * hpMult));
  const baseAtk = (typeof def.attack === "number" ? def.attack : 5) * scale;
  const attack = Math.max(1, Math.round(baseAtk * attackMult + attackBonus));
  const maxStamina = getFoeCombatMaxStamina(def);
  const foe = {
    uid,
    name: def.name,
    level,
    str: stats.str,
    dex: stats.dex,
    vit: stats.vit,
    int: stats.int,
    moodId: mood.id,
    moodName: mood.name,
    hp,
    maxHp: hp,
    attack,
    stamina: maxStamina,
    maxStamina,
    damageTakenMult,
    drops: def.drops,
    image: resolveImageByState(def, "idle"),
    images: def.images && typeof def.images === "object" ? def.images : null,
    sprites: def.sprites && typeof def.sprites === "object" ? def.sprites : null
  };
  initFoeCombatRuntime(foe);
  return foe;
}

function spawnEnemiesFromPreview(region, units) {
  const slice = (units || []).slice(0, COMBAT_FOES_MAX);
  return slice
    .map((u, uid) => {
      const def = GAME_CONFIG.enemies.find((e) => e.name === u.name);
      if (!def) return null;
      const moods = GAME_CONFIG.enemyMoods;
      const mood =
        (u.moodId && moods && moods.find((m) => m.id === u.moodId)) || pickMoodFromEnemyDef(def);
      const level = typeof u.level === "number" ? u.level : pickLevelFromEnemyDef(def);
      return buildSpawnedFoe(region, def, uid, level, mood);
    })
    .filter(Boolean);
}

function spawnEnemies(region, enemyNames) {
  const slice = (enemyNames || []).slice(0, COMBAT_FOES_MAX);
  return slice
    .map((n, uid) => {
      const def = GAME_CONFIG.enemies.find((e) => e.name === n);
      if (!def) return null;
      const mood = pickMoodFromEnemyDef(def);
      const level = pickLevelFromEnemyDef(def);
      return buildSpawnedFoe(region, def, uid, level, mood);
    })
    .filter(Boolean);
}

function getWorldMapData() {
  return typeof WORLD_MAP_DATA !== "undefined" ? WORLD_MAP_DATA : null;
}

function getWorldBiomeIndex(x, y) {
  const d = getWorldMapData();
  if (!d || x < 0 || y < 0 || x >= d.width || y >= d.height) return 0;
  return d.biomeIndex[y * d.width + x];
}

function getWorldBiomeDefAt(x, y) {
  const idx = getWorldBiomeIndex(x, y);
  return GAME_CONFIG.worldMap.biomes[idx] || GAME_CONFIG.worldMap.biomes[0];
}

function getWorldSpawnPressureConfig() {
  const wm = GAME_CONFIG.worldMap && typeof GAME_CONFIG.worldMap === "object" ? GAME_CONFIG.worldMap : {};
  const cfg = wm.spawnPressure && typeof wm.spawnPressure === "object" ? wm.spawnPressure : {};
  const windowMs =
    typeof cfg.windowMs === "number" && Number.isFinite(cfg.windowMs) && cfg.windowMs >= 1000 ? Math.floor(cfg.windowMs) : 10 * 60 * 1000;
  const windowStrength =
    typeof cfg.windowStrength === "number" && Number.isFinite(cfg.windowStrength) && cfg.windowStrength >= 0 ? cfg.windowStrength : 12;
  const recoveryFactor =
    typeof cfg.recoveryFactor === "number" && Number.isFinite(cfg.recoveryFactor) && cfg.recoveryFactor >= 0 ? cfg.recoveryFactor : 0.08;
  const spawnRateImpactPct =
    typeof cfg.spawnRateImpactPct === "number" && Number.isFinite(cfg.spawnRateImpactPct) && cfg.spawnRateImpactPct >= 0
      ? cfg.spawnRateImpactPct
      : 0.2;
  return { windowMs, windowStrength, recoveryFactor, spawnRateImpactPct };
}

function ensureSpawnPressureState() {
  if (!player.worldMap || typeof player.worldMap !== "object") player.worldMap = {};
  if (!player.worldMap.spawnPressure || typeof player.worldMap.spawnPressure !== "object") {
    player.worldMap.spawnPressure = { monsters: {} };
  }
  if (!player.worldMap.spawnPressure.monsters || typeof player.worldMap.spawnPressure.monsters !== "object") {
    player.worldMap.spawnPressure.monsters = {};
  }
  return player.worldMap.spawnPressure;
}

function normalizeMonsterPressureKey(monsterName) {
  return typeof monsterName === "string" && monsterName.trim() ? monsterName.trim() : "__unknown__";
}

function getMonsterSpawnPressureRecord(monsterName, nowMs) {
  const nm = normalizeMonsterPressureKey(monsterName);
  const now = typeof nowMs === "number" && Number.isFinite(nowMs) ? nowMs : Date.now();
  const root = ensureSpawnPressureState();
  const monsters = root.monsters;
  let rec = monsters[nm];
  if (!rec || typeof rec !== "object") {
    rec = { pressure: 0, spawned: 0, killed: 0, windowStartMs: now };
    monsters[nm] = rec;
  }
  if (typeof rec.pressure !== "number" || !Number.isFinite(rec.pressure)) rec.pressure = 0;
  if (typeof rec.spawned !== "number" || !Number.isFinite(rec.spawned) || rec.spawned < 0) rec.spawned = 0;
  if (typeof rec.killed !== "number" || !Number.isFinite(rec.killed) || rec.killed < 0) rec.killed = 0;
  if (typeof rec.windowStartMs !== "number" || !Number.isFinite(rec.windowStartMs) || rec.windowStartMs <= 0) {
    rec.windowStartMs = now;
  }
  return rec;
}

function advanceMonsterSpawnPressure(monsterName, nowMs) {
  const now = typeof nowMs === "number" && Number.isFinite(nowMs) ? nowMs : Date.now();
  const cfg = getWorldSpawnPressureConfig();
  const rec = getMonsterSpawnPressureRecord(monsterName, now);
  if (now <= rec.windowStartMs) return rec.pressure;
  const windows = Math.floor((now - rec.windowStartMs) / cfg.windowMs);
  if (windows <= 0) return rec.pressure;
  for (let i = 0; i < windows; i++) {
    let pressureChange = 0;
    if (rec.spawned > 0) {
      const killRatio = rec.killed / Math.max(1, rec.spawned);
      pressureChange = (0.5 - killRatio) * 2 * cfg.windowStrength;
    }
    const recoveryToZero = -rec.pressure * cfg.recoveryFactor;
    rec.pressure = Math.max(-100, Math.min(100, rec.pressure + pressureChange + recoveryToZero));
    rec.spawned = 0;
    rec.killed = 0;
    rec.windowStartMs += cfg.windowMs;
  }
  return rec.pressure;
}

function getMonsterSpawnPressure(monsterName, nowMs) {
  return advanceMonsterSpawnPressure(monsterName, nowMs);
}

function recordMonsterSpawned(monsterName, spawnedCount) {
  const n = Math.max(0, Math.floor(typeof spawnedCount === "number" ? spawnedCount : 0));
  if (!n) return;
  const now = Date.now();
  advanceMonsterSpawnPressure(monsterName, now);
  const rec = getMonsterSpawnPressureRecord(monsterName, now);
  rec.spawned += n;
}

function recordMonsterKilled(monsterName, killedCount) {
  const n = Math.max(0, Math.floor(typeof killedCount === "number" ? killedCount : 0));
  if (!n) return;
  const now = Date.now();
  advanceMonsterSpawnPressure(monsterName, now);
  const rec = getMonsterSpawnPressureRecord(monsterName, now);
  rec.killed += n;
}

function recordMonsterSpawnsFromUnits(units) {
  if (!Array.isArray(units)) return;
  units.forEach((u) => {
    const name = u && typeof u.name === "string" ? u.name : "";
    if (!name) return;
    recordMonsterSpawned(name, 1);
  });
}

function recordMonsterKillsFromNames(names) {
  if (!Array.isArray(names)) return;
  names.forEach((name) => {
    if (typeof name !== "string" || !name.trim()) return;
    recordMonsterKilled(name, 1);
  });
}

function getMonsterSpawnRateMultiplier(monsterName) {
  const cfg = getWorldSpawnPressureConfig();
  const p = getMonsterSpawnPressure(monsterName, Date.now());
  return Math.max(0.01, 1 + cfg.spawnRateImpactPct * (p / 100));
}

function getSpawnRateMultiplierForMonsterNames(names) {
  if (!Array.isArray(names) || !names.length) return 1;
  let sum = 0;
  let count = 0;
  names.forEach((name) => {
    if (typeof name !== "string" || !name.trim()) return;
    sum += getMonsterSpawnRateMultiplier(name);
    count++;
  });
  if (!count) return 1;
  return sum / count;
}

function getWorldMobRespawnMsAt(x, y, setIndex) {
  const wm = GAME_CONFIG.worldMap && typeof GAME_CONFIG.worldMap === "object" ? GAME_CONFIG.worldMap : {};
  const baseMs = typeof wm.mobRespawnMs === "number" && wm.mobRespawnMs > 0 ? wm.mobRespawnMs : 60000;
  const key = worldMapKey(x, y);
  const rec = player.worldMap && player.worldMap.cells ? player.worldMap.cells[key] : null;
  let names = [];
  if (rec && Array.isArray(rec.defeatedUnits) && typeof setIndex === "number") {
    const n = rec.defeatedUnits[setIndex];
    if (Array.isArray(n) && n.length) names = n;
  }
  if ((!names || !names.length) && rec && Array.isArray(rec.mobPreviews) && typeof setIndex === "number") {
    const pv = rec.mobPreviews[setIndex];
    if (pv && Array.isArray(pv.units)) names = pv.units.map((u) => (u && typeof u.name === "string" ? u.name : "")).filter(Boolean);
  }
  const spawnRateMult = getSpawnRateMultiplierForMonsterNames(names);
  return Math.max(1000, Math.floor(baseMs / spawnRateMult));
}

/** Optional Adventure background image URL for this exact grid coordinate (config.worldMap.coordinateBackgrounds). */
function getCoordinateBackgroundUrl(x, y) {
  const wm = GAME_CONFIG.worldMap;
  const map = wm && wm.coordinateBackgrounds && typeof wm.coordinateBackgrounds === "object" ? wm.coordinateBackgrounds : null;
  if (!map) return "";
  const u = map[worldMapKey(x, y)];
  return typeof u === "string" && u.trim() ? u.trim() : "";
}

const BIOME_BG_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];

/** Crossfade duration matches `.adventure-bg-stack--ready .adventure-bg-layer` in styles.css */
const ADVENTURE_BG_CROSSFADE_MS = 520;

/** Last resolved background URL (for crossfade); reset when leaving adventure. */
let adventureBgLastUrl = null;
/** Whether {@link adventureBgLastUrl} came from a city folder (for city-only sharpen styling). */
let adventureBgLastIsCity = false;
/** Which layer is logically “front” after the last completed transition: 0 = A, 1 = B */
let adventureBgActiveLayer = 0;

/** Stable 1–4 per coordinate (which of the four biome images to use). */
function biomeBackgroundVariantIndex(x, y) {
  const h = (Math.imul(x, 73856093) ^ Math.imul(y, 19349663)) >>> 0;
  return (h % 4) + 1;
}

/** URL base path for a biome folder under Assets/Biomes (name matches config biome `name`; capital B matches repo). */
function biomeBackgroundFolderBaseUrl(biomeName) {
  if (!biomeName || typeof biomeName !== "string") return "";
  return `Assets/Biomes/${encodeURIComponent(biomeName)}`;
}

/** City adventure art: same layout as biomes — `Assets/Biomes/{cityName}/{1|2|3|4}.{ext}` (folder name = Excel city name). */
function cityBackgroundFolderBaseUrl(cityName) {
  if (!cityName || typeof cityName !== "string") return "";
  return `Assets/Biomes/${encodeURIComponent(cityName.trim())}`;
}

/** Optional terrain art for world map / minimap (same folder as adventure backgrounds). */
const BIOME_TEXTURE_FILE = "texture.png";
const BIOME_BORDER_TEXTURE_FILE = "border_texture.png";
/** One image for the whole grid — terrain/symbols only (tools/build_world_map_texture.py). Minimap + world map base. */
const WORLD_MAP_FULL_TEXTURE_URL = "Assets/WorldMap/full_map_texture.png";
/** Region name labels only (RGBA); drawn on top of the world map modal, not on the minimap. */
const WORLD_MAP_LABELS_OVERLAY_URL = "Assets/WorldMap/full_map_labels.png";

/** Minimap grid cell size in CSS px — must match .minimap-cell / .minimap-grid in styles.css */
const MINIMAP_CELL_W_PX = 18;
const MINIMAP_CELL_H_PX = 10;

/** @type {Map<string, HTMLImageElement | 'loading' | 'fail'>} */
const biomeTextureByUrl = new Map();
let biomeTexturePreloadRequested = false;

/** Cached contiguous biome regions (4-connected); invalidated when map data reference changes. */
let biomeRegionsCacheDataRef = null;
/** @type {{ id: number, biomeIndex: number, cells: { x: number, y: number }[], minX: number, maxX: number, minY: number, maxY: number }[] | null} */
let biomeRegionsCacheRegions = null;
/** @type {Int32Array | null} */
let biomeRegionsCacheCellRegionId = null;

function getBiomeTextureFillUrlForBiomeIndex(biomeIndex) {
  const biome = GAME_CONFIG.worldMap.biomes[biomeIndex];
  if (!biome || !biome.name) return "";
  const base = biomeBackgroundFolderBaseUrl(biome.name);
  if (!base) return "";
  return `${base}/${BIOME_TEXTURE_FILE}`;
}

function getBiomeRegionsCache(d) {
  if (!d) return { regions: [], cellRegionId: null };
  if (biomeRegionsCacheDataRef === d && biomeRegionsCacheRegions && biomeRegionsCacheCellRegionId) {
    return { regions: biomeRegionsCacheRegions, cellRegionId: biomeRegionsCacheCellRegionId };
  }
  const w = d.width;
  const h = d.height;
  const bi = d.biomeIndex;
  const visited = new Uint8Array(w * h);
  const cellRegionId = new Int32Array(w * h);
  cellRegionId.fill(-1);
  const regions = [];
  let rid = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (visited[i]) continue;
      const b = bi[i];
      const cells = [];
      const q = [[x, y]];
      visited[i] = 1;
      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      for (let qi = 0; qi < q.length; qi++) {
        const [cx, cy] = q[qi];
        cells.push({ x: cx, y: cy });
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;
        const dirs = [
          [0, 1],
          [0, -1],
          [1, 0],
          [-1, 0]
        ];
        for (const [dx, dy] of dirs) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
          const ni = ny * w + nx;
          if (visited[ni]) continue;
          if (bi[ni] !== b) continue;
          visited[ni] = 1;
          q.push([nx, ny]);
        }
      }
      regions.push({ id: rid, biomeIndex: b, cells, minX, maxX, minY, maxY });
      for (const c of cells) {
        cellRegionId[c.y * w + c.x] = rid;
      }
      rid++;
    }
  }
  biomeRegionsCacheDataRef = d;
  biomeRegionsCacheRegions = regions;
  biomeRegionsCacheCellRegionId = cellRegionId;
  return { regions, cellRegionId };
}

function getBiomeTextureImageIfReady(url) {
  if (!url) return null;
  const v = biomeTextureByUrl.get(url);
  return v instanceof HTMLImageElement ? v : null;
}

function requestBiomeTextureLoad(url) {
  if (!url) return;
  const cur = biomeTextureByUrl.get(url);
  if (cur === "loading" || cur instanceof HTMLImageElement || cur === "fail") return;
  biomeTextureByUrl.set(url, "loading");
  const img = new Image();
  img.onload = () => {
    biomeTextureByUrl.set(url, img);
    notifyMapArtColorsUpdated();
  };
  img.onerror = () => {
    biomeTextureByUrl.set(url, "fail");
    notifyMapArtColorsUpdated();
  };
  img.src = url;
}

function requestAllBiomeTexturesFromConfig() {
  requestBiomeTextureLoad(WORLD_MAP_FULL_TEXTURE_URL);
  requestBiomeTextureLoad(WORLD_MAP_LABELS_OVERLAY_URL);
  const biomes = GAME_CONFIG.worldMap && GAME_CONFIG.worldMap.biomes;
  if (!Array.isArray(biomes)) return;
  for (const biome of biomes) {
    if (!biome || !biome.name) continue;
    const base = biomeBackgroundFolderBaseUrl(biome.name);
    if (!base) continue;
    requestBiomeTextureLoad(`${base}/${BIOME_TEXTURE_FILE}`);
    requestBiomeTextureLoad(`${base}/${BIOME_BORDER_TEXTURE_FILE}`);
  }
  for (const cname of getWorldMapCityUniqueNames()) {
    const cbase = cityBackgroundFolderBaseUrl(cname);
    if (!cbase) continue;
    for (let v = 1; v <= 4; v++) {
      for (let ei = 0; ei < BIOME_BG_EXTENSIONS.length; ei++) {
        requestBiomeTextureLoad(`${cbase}/${v}${BIOME_BG_EXTENSIONS[ei]}`);
      }
    }
  }
  const d = getWorldMapData();
  if (d) {
    const pairs = enumerateNeighborBiomePairs(d);
    for (let i = 0; i < pairs.length; i++) {
      const { lo, hi } = pairs[i];
      requestBiomeTextureLoad(getBiomePairTransitionTextureUrl(lo, hi));
    }
  }
}

function ensureBiomeTexturesPreloaded() {
  if (biomeTexturePreloadRequested) return;
  biomeTexturePreloadRequested = true;
  requestAllBiomeTexturesFromConfig();
}

/**
 * Single source of truth for map cell appearance (same UV as minimap CSS: one texture stretched per
 * contiguous biome region; each cell shows the matching slice).
 * @param {number} cellPxW pixel width of one grid cell (world map: modal cell width; minimap: MINIMAP_CELL_W_PX)
 * @param {number} cellPxH pixel height of one grid cell
 */
function getMapCellTexturePlanForCell(mx, my, cellPxW, cellPxH) {
  const d = getWorldMapData();
  if (!d || mx < 0 || my < 0 || mx >= d.width || my >= d.height) {
    return { kind: "oob", cellPxW, cellPxH };
  }
  const { regions, cellRegionId } = getBiomeRegionsCache(d);
  const ri = cellRegionId[my * d.width + mx];
  if (ri < 0 || ri >= regions.length) {
    return { kind: "color", color: getMapCellDisplayColor(mx, my), cellPxW, cellPxH };
  }
  const region = regions[ri];
  const url = getBiomeTextureFillUrlForBiomeIndex(region.biomeIndex);
  const img = getBiomeTextureImageIfReady(url);
  requestBiomeTextureLoad(url);
  const iw = img ? img.naturalWidth || img.width : 0;
  const ih = img ? img.naturalHeight || img.height : 0;
  if (img && iw > 0 && ih > 0) {
    const cols = region.maxX - region.minX + 1;
    const rows = region.maxY - region.minY + 1;
    return { kind: "texture", url, img, region, cols, rows, cellPxW, cellPxH };
  }
  return { kind: "color", color: getMapCellDisplayColor(mx, my), cellPxW, cellPxH };
}

function drawMapCellFromTexturePlan(ctx, mx, my, plan) {
  const cw = plan.cellPxW;
  const ch = plan.cellPxH;
  const x0 = Math.floor(mx * cw);
  const y0 = Math.floor(my * ch);
  const rw = Math.ceil(cw) + 1;
  const rh = Math.ceil(ch) + 1;
  if (plan.kind === "color" || plan.kind === "oob") {
    ctx.fillStyle = plan.kind === "oob" ? "#1a1a1a" : plan.color;
    ctx.fillRect(x0, y0, rw, rh);
    return;
  }
  if (plan.kind !== "texture") return;
  const { img, region, cols, rows } = plan;
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const sx = ((mx - region.minX) / cols) * iw;
  const sy = ((my - region.minY) / rows) * ih;
  const sw = iw / cols;
  const sh = ih / rows;
  ctx.drawImage(img, sx, sy, sw, sh, x0, y0, rw, rh);
}

/** Cosmetic blend layer between two biomes (same bbox UV as auxiliary transition region). */
function drawWorldMapTransitionOverlays(ctx, d, cellW, cellH) {
  const { pairRegions } = getTransitionAuxiliaryPairRegions(d);
  ctx.imageSmoothingEnabled = true;
  for (const [, reg] of pairRegions) {
    const url = getBiomePairTransitionTextureUrl(reg.lo, reg.hi);
    const img = getBiomeTextureImageIfReady(url);
    requestBiomeTextureLoad(url);
    if (!img) continue;
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    if (iw <= 0 || ih <= 0) continue;
    const cols = reg.maxX - reg.minX + 1;
    const rows = reg.maxY - reg.minY + 1;
    for (let ci = 0; ci < reg.cells.length; ci++) {
      const { x: mx, y: my } = parseWorldMapKey(reg.cells[ci]);
      const x0 = Math.floor(mx * cellW);
      const y0 = Math.floor(my * cellH);
      const rw = Math.ceil(cellW) + 1;
      const rh = Math.ceil(cellH) + 1;
      const sx = ((mx - reg.minX) / cols) * iw;
      const sy = ((my - reg.minY) / rows) * ih;
      const sw = iw / cols;
      const sh = ih / rows;
      ctx.drawImage(img, sx, sy, sw, sh, x0, y0, rw, rh);
    }
  }
}

function tryAdventureBackgroundExtensions(pathBase, onUrl) {
  let extIdx = 0;
  function tryNext() {
    if (extIdx >= BIOME_BG_EXTENSIONS.length) {
      onUrl(null);
      return;
    }
    const url = pathBase + BIOME_BG_EXTENSIONS[extIdx++];
    const img = new Image();
    img.onload = () => onUrl(url);
    img.onerror = tryNext;
    img.src = url;
  }
  tryNext();
}

/**
 * Resolves the same URL as adventure background (override, city, or biome).
 * @param {(url: string | null, isCityArt: boolean) => void} onResolved isCityArt true only for city folder images.
 */
function resolveAdventureBackgroundUrl(x, y, coordBgUrl, onResolved) {
  const override = coordBgUrl && String(coordBgUrl).trim() ? String(coordBgUrl).trim() : "";
  if (override) {
    onResolved(override, false);
    return;
  }
  const cityNm = getWorldMapCityName(x, y);
  if (cityNm) {
    const base = cityBackgroundFolderBaseUrl(cityNm);
    if (!base) {
      onResolved(null, false);
      return;
    }
    const variant = getCityAdventureBackgroundVariant(x, y, cityNm);
    tryAdventureBackgroundExtensions(`${base}/${variant}`, (url) => onResolved(url, true));
    return;
  }
  const biome = getWorldBiomeDefAt(x, y);
  if (!biome || !biome.name) {
    onResolved(null, false);
    return;
  }
  const base = biomeBackgroundFolderBaseUrl(biome.name);
  if (!base) {
    onResolved(null, false);
    return;
  }
  const variant = biomeBackgroundVariantIndex(x, y);
  tryAdventureBackgroundExtensions(`${base}/${variant}`, (url) => onResolved(url, false));
}

/**
 * Crossfades between two stacked layers when the image URL changes (moving to another cell).
 * @param {boolean} isCityArt city folder art only — adds {@link adventure-bg-layer--city} for sharpen styling.
 */
function crossfadeAdventureBackground(url, isCityArt) {
  const stack = document.getElementById("adventureBgStack");
  const la = document.getElementById("adventureBgLayerA");
  const lb = document.getElementById("adventureBgLayerB");
  if (!stack || !la || !lb) return;

  const markReady = () => stack.classList.add("adventure-bg-stack--ready");

  if (!url) {
    la.classList.remove("adventure-bg-layer--visible", "adventure-bg--visible", "adventure-bg-layer--city");
    lb.classList.remove("adventure-bg-layer--visible", "adventure-bg--visible", "adventure-bg-layer--city");
    la.removeAttribute("src");
    lb.removeAttribute("src");
    la.style.zIndex = "";
    lb.style.zIndex = "";
    adventureBgLastUrl = null;
    adventureBgLastIsCity = false;
    return;
  }

  if (url === adventureBgLastUrl) return;

  const img = new Image();
  img.onload = () => {
    if (!la.isConnected) return;
    if (adventureBgLastUrl === null) {
      la.src = url;
      la.classList.toggle("adventure-bg-layer--city", !!isCityArt);
      la.classList.add("adventure-bg--visible", "adventure-bg-layer--visible");
      lb.classList.remove("adventure-bg-layer--visible", "adventure-bg--visible", "adventure-bg-layer--city");
      lb.removeAttribute("src");
      la.style.zIndex = "1";
      lb.style.zIndex = "0";
      adventureBgLastUrl = url;
      adventureBgLastIsCity = !!isCityArt;
      adventureBgActiveLayer = 0;
      markReady();
      return;
    }
    const incoming = adventureBgActiveLayer === 0 ? lb : la;
    const outgoing = adventureBgActiveLayer === 0 ? la : lb;
    incoming.src = url;
    incoming.classList.toggle("adventure-bg-layer--city", !!isCityArt);
    incoming.classList.add("adventure-bg--visible");
    incoming.style.zIndex = "2";
    outgoing.style.zIndex = "1";
    requestAnimationFrame(() => {
      incoming.classList.add("adventure-bg-layer--visible");
      outgoing.classList.remove("adventure-bg-layer--visible");
      outgoing.classList.remove("adventure-bg--visible");
      adventureBgActiveLayer = 1 - adventureBgActiveLayer;
      adventureBgLastUrl = url;
      adventureBgLastIsCity = !!isCityArt;
      markReady();
      window.setTimeout(() => {
        if (!outgoing.isConnected) return;
        outgoing.removeAttribute("src");
        outgoing.classList.remove("adventure-bg-layer--city");
        outgoing.style.zIndex = "0";
        incoming.style.zIndex = "1";
      }, ADVENTURE_BG_CROSSFADE_MS + 40);
    });
  };
  img.onerror = () => crossfadeAdventureBackground(null, false);
  img.src = url;
}

/**
 * Loads the same image as the adventure screen for (x,y): coordinateBackgrounds override, else city folder (1–4), else biome.
 * @param {(img: HTMLImageElement) => void} onSuccess
 * @param {() => void} onFail
 */
function tryLoadTileBackgroundImage(x, y, onSuccess, onFail) {
  const override = getCoordinateBackgroundUrl(x, y);
  if (override) {
    const img = new Image();
    img.onload = () => onSuccess(img);
    img.onerror = () => onFail();
    img.src = override;
    return;
  }
  const cityNm = getWorldMapCityName(x, y);
  if (cityNm) {
    const base = cityBackgroundFolderBaseUrl(cityNm);
    if (!base) {
      onFail();
      return;
    }
    const variant = getCityAdventureBackgroundVariant(x, y, cityNm);
    const pathBase = `${base}/${variant}`;
    let extIdx = 0;
    function tryNextCity() {
      if (extIdx >= BIOME_BG_EXTENSIONS.length) {
        onFail();
        return;
      }
      const url = pathBase + BIOME_BG_EXTENSIONS[extIdx++];
      const img = new Image();
      img.onload = () => onSuccess(img);
      img.onerror = tryNextCity;
      img.src = url;
    }
    tryNextCity();
    return;
  }
  const biome = getWorldBiomeDefAt(x, y);
  if (!biome || !biome.name) {
    onFail();
    return;
  }
  const base = biomeBackgroundFolderBaseUrl(biome.name);
  if (!base) {
    onFail();
    return;
  }
  const variant = biomeBackgroundVariantIndex(x, y);
  const pathBase = `${base}/${variant}`;
  let extIdx = 0;
  function tryNext() {
    if (extIdx >= BIOME_BG_EXTENSIONS.length) {
      onFail();
      return;
    }
    const url = pathBase + BIOME_BG_EXTENSIONS[extIdx++];
    const img = new Image();
    img.onload = () => onSuccess(img);
    img.onerror = tryNext;
    img.src = url;
  }
  tryNext();
}

function normalizeUrlKeyForArtCache(img) {
  try {
    const u = new URL(img.src, window.location.href);
    return u.pathname;
  } catch {
    return img.src;
  }
}

function extractAverageColorFromImage(img) {
  const w = 28;
  const h = 28;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  try {
    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;
    let r = 0;
    let g = 0;
    let b = 0;
    let n = 0;
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a < 8) continue;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      n++;
    }
    if (!n) return null;
    return `rgb(${Math.round(r / n)},${Math.round(g / n)},${Math.round(b / n)})`;
  } catch {
    return null;
  }
}

/**
 * Same as extractAverageColorFromImage but loads bytes via fetch → blob URL so the canvas is not tainted
 * (needed for some file:// cases and when cross-origin images would block getImageData).
 */
function extractAverageColorFromImageUrl(url) {
  if (!url || typeof url !== "string") return Promise.resolve(null);
  return fetch(url)
    .then((res) => (res.ok ? res.blob() : Promise.reject(new Error("fetch"))))
    .then(
      (blob) =>
        new Promise((resolve) => {
          const objUrl = URL.createObjectURL(blob);
          const im = new Image();
          im.onload = () => {
            const col = extractAverageColorFromImage(im);
            URL.revokeObjectURL(objUrl);
            resolve(col);
          };
          im.onerror = () => {
            URL.revokeObjectURL(objUrl);
            resolve(null);
          };
          im.src = objUrl;
        })
    )
    .catch(() => null);
}

function notifyMapArtColorsUpdated() {
  if (mapArtNotifyRaf != null) return;
  mapArtNotifyRaf = requestAnimationFrame(() => {
    mapArtNotifyRaf = null;
    if (isWorldMapModalOpen()) drawWorldMapCanvas();
    refreshAdventureMinimapCellColors();
  });
}

function minimapBaseLayerCss(plan, mx, my) {
  if (plan.kind === "oob") return "background:#1a1a1a";
  if (plan.kind === "color") return `background:${plan.color}`;
  const { region, cols, rows, url } = plan;
  const totalW = cols * MINIMAP_CELL_W_PX;
  const totalH = rows * MINIMAP_CELL_H_PX;
  const offX = (mx - region.minX) * MINIMAP_CELL_W_PX;
  const offY = (my - region.minY) * MINIMAP_CELL_H_PX;
  return `background-color:transparent;background-image:url(${JSON.stringify(
    url
  )});background-repeat:no-repeat;background-size:${totalW}px ${totalH}px;background-position:${-offX}px ${-offY}px`;
}

/** Minimap: same base + transition blend layer as {@link drawWorldMapCanvas} when cell lies in an auxiliary band. */
function getMinimapCellBackgroundCss(mx, my) {
  const d = getWorldMapData();
  if (!d || mx < 0 || my < 0 || mx >= d.width || my >= d.height) {
    const plan = getMapCellTexturePlanForCell(mx, my, MINIMAP_CELL_W_PX, MINIMAP_CELL_H_PX);
    return plan.kind === "oob" ? "background:#1a1a1a" : minimapBaseLayerCss(plan, mx, my);
  }
  const fullImg = getBiomeTextureImageIfReady(WORLD_MAP_FULL_TEXTURE_URL);
  requestBiomeTextureLoad(WORLD_MAP_FULL_TEXTURE_URL);
  if (fullImg && (fullImg.naturalWidth || fullImg.width)) {
    const tw = d.width * MINIMAP_CELL_W_PX;
    const th = d.height * MINIMAP_CELL_H_PX;
    const offX = mx * MINIMAP_CELL_W_PX;
    const offY = my * MINIMAP_CELL_H_PX;
    return `background-color:transparent;background-image:url(${JSON.stringify(
      WORLD_MAP_FULL_TEXTURE_URL
    )});background-repeat:no-repeat;background-size:${tw}px ${th}px;background-position:${-offX}px ${-offY}px`;
  }
  const plan = getMapCellTexturePlanForCell(mx, my, MINIMAP_CELL_W_PX, MINIMAP_CELL_H_PX);
  if (plan.kind === "oob") return "background:#1a1a1a";
  const baseCss = minimapBaseLayerCss(plan, mx, my);
  const aux = getTransitionAuxiliaryPairRegions(d);
  const pk = aux.cellToPairKey.get(worldMapKey(mx, my));
  if (!pk) return baseCss;
  const reg = aux.pairRegions.get(pk);
  if (!reg) return baseCss;
  const url = getBiomePairTransitionTextureUrl(reg.lo, reg.hi);
  const img = getBiomeTextureImageIfReady(url);
  requestBiomeTextureLoad(url);
  if (!img || !(img.naturalWidth || img.width)) return baseCss;
  const tcols = reg.maxX - reg.minX + 1;
  const trows = reg.maxY - reg.minY + 1;
  const totalW = tcols * MINIMAP_CELL_W_PX;
  const totalH = trows * MINIMAP_CELL_H_PX;
  const offX = (mx - reg.minX) * MINIMAP_CELL_W_PX;
  const offY = (my - reg.minY) * MINIMAP_CELL_H_PX;
  if (plan.kind === "texture") {
    const { region, cols, rows, url: baseUrl } = plan;
    const bw = cols * MINIMAP_CELL_W_PX;
    const bh = rows * MINIMAP_CELL_H_PX;
    const bx = (mx - region.minX) * MINIMAP_CELL_W_PX;
    const by = (my - region.minY) * MINIMAP_CELL_H_PX;
    return `background-color:transparent;background-image:url(${JSON.stringify(
      url
    )}),url(${JSON.stringify(baseUrl)});background-repeat:no-repeat,no-repeat;background-size:${totalW}px ${totalH}px, ${bw}px ${bh}px;background-position:${-offX}px ${-offY}px, ${-bx}px ${-by}px`;
  }
  return `background-image:url(${JSON.stringify(url)});background-repeat:no-repeat;background-size:${totalW}px ${totalH}px;background-position:${-offX}px ${-offY}px;background-color:${plan.color}`;
}

function refreshAdventureMinimapCellColors() {
  if (currentPage !== "adventure") return;
  ensureBiomeTexturesPreloaded();
  document.querySelectorAll(".minimap-cell[data-map-x]").forEach((el) => {
    const mx = parseInt(el.getAttribute("data-map-x"), 10);
    const my = parseInt(el.getAttribute("data-map-y"), 10);
    if (Number.isNaN(mx) || Number.isNaN(my)) return;
    el.style.cssText = getMinimapCellBackgroundCss(mx, my);
  });
}

/** Display color for world map / minimap: sampled from cell art when available, else biome legend color. */
function getMapCellDisplayColor(x, y) {
  const d = getWorldMapData();
  if (!d || x < 0 || y < 0 || x >= d.width || y >= d.height) return "#1a1a1a";
  const key = worldMapKey(x, y);
  const sampled = mapCellArtColorByTileKey.get(key);
  if (sampled) return sampled;
  const bi = d.biomeIndex[y * d.width + x];
  const biome = GAME_CONFIG.worldMap.biomes[bi];
  return biome.color || "#444";
}

function probeMapTileArtColor(x, y) {
  const key = worldMapKey(x, y);
  if (mapCellArtColorByTileKey.has(key)) return;
  if (mapCellArtProbeFailed.has(key)) return;
  if (mapCellArtProbePending.has(key)) return;
  mapCellArtProbePending.add(key);
  tryLoadTileBackgroundImage(
    x,
    y,
    (img) => {
      mapCellArtProbePending.delete(key);
      const urlKey = normalizeUrlKeyForArtCache(img);
      const cachedCol = mapCellArtColorByUrl.get(urlKey);
      if (cachedCol) {
        mapCellArtColorByTileKey.set(key, cachedCol);
        notifyMapArtColorsUpdated();
        return;
      }
      let col = extractAverageColorFromImage(img);
      if (col) {
        mapCellArtColorByUrl.set(urlKey, col);
        mapCellArtColorByTileKey.set(key, col);
        notifyMapArtColorsUpdated();
        return;
      }
      let fetchUrl = img.src;
      try {
        fetchUrl = new URL(img.src, window.location.href).href;
      } catch {
        /* keep img.src */
      }
      extractAverageColorFromImageUrl(fetchUrl).then((col2) => {
        if (col2) {
          mapCellArtColorByUrl.set(urlKey, col2);
          mapCellArtColorByTileKey.set(key, col2);
          notifyMapArtColorsUpdated();
        } else {
          mapCellArtProbeFailed.add(key);
        }
      });
    },
    () => {
      mapCellArtProbePending.delete(key);
      mapCellArtProbeFailed.add(key);
    }
  );
}

function enqueueViewportTileProbes() {
  const scroll = document.getElementById("worldMapModalScroll");
  const d = getWorldMapData();
  if (!scroll || !d) return;
  const { cellW, cellH } = worldMapModalCellDims();
  const x0 = Math.floor(scroll.scrollLeft / cellW);
  const y0 = Math.floor(scroll.scrollTop / cellH);
  const x1 = Math.ceil((scroll.scrollLeft + scroll.clientWidth) / cellW);
  const y1 = Math.ceil((scroll.scrollTop + scroll.clientHeight) / cellH);
  const pad = 2;
  for (let y = Math.max(0, y0 - pad); y <= Math.min(d.height - 1, y1 + pad); y++) {
    for (let x = Math.max(0, x0 - pad); x <= Math.min(d.width - 1, x1 + pad); x++) {
      probeMapTileArtColor(x, y);
    }
  }
}

function scheduleMinimapArtProbes(px, py) {
  const d = getWorldMapData();
  if (!d) return;
  for (let dy = -5; dy <= 5; dy++) {
    for (let dx = -5; dx <= 5; dx++) {
      const nx = px + dx;
      const ny = py + dy;
      if (nx < 0 || ny < 0 || nx >= d.width || ny >= d.height) continue;
      probeMapTileArtColor(nx, ny);
    }
  }
}

function canEnterMap(x, y) {
  const d = getWorldMapData();
  if (!d || x < 0 || y < 0 || x >= d.width || y >= d.height) return false;
  const b = getWorldBiomeDefAt(x, y);
  return !!(b && b.passable);
}

/** BFS from (x,y) clamped into the map; used when saved tile is invalid (map changed, etc.). */
function findNearestPassableTile(x, y, d) {
  if (!d) return null;
  const w = d.width;
  const h = d.height;
  const cx = Math.max(0, Math.min(w - 1, Math.floor(x)));
  const cy = Math.max(0, Math.min(h - 1, Math.floor(y)));
  if (canEnterMap(cx, cy)) return { x: cx, y: cy };
  const visited = new Uint8Array(w * h);
  const q = [[cx, cy]];
  visited[cy * w + cx] = 1;
  for (let i = 0; i < q.length; i++) {
    const [bx, by] = q[i];
    for (const [dx, dy] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0]
    ]) {
      const nx = bx + dx;
      const ny = by + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const vi = ny * w + nx;
      if (visited[vi]) continue;
      visited[vi] = 1;
      if (canEnterMap(nx, ny)) return { x: nx, y: ny };
      q.push([nx, ny]);
    }
  }
  return null;
}

/**
 * BFS for the nearest passable tile among cells that share the same exported city name (same 4-connected city region on the map).
 * Avoids snapping the player to a random distant tile when a city cell is temporarily invalid.
 * @returns {{ x: number, y: number } | null}
 */
function findNearestPassableTileInSameCityName(x, y, cityName, d) {
  const cn = typeof cityName === "string" ? cityName.trim() : "";
  if (!d || !cn) return null;
  const w = d.width;
  const h = d.height;
  const cx = Math.max(0, Math.min(w - 1, Math.floor(x)));
  const cy = Math.max(0, Math.min(h - 1, Math.floor(y)));
  if (getWorldMapCityName(cx, cy) !== cn) return null;
  if (canEnterMap(cx, cy)) return { x: cx, y: cy };
  const visited = new Uint8Array(w * h);
  const q = [[cx, cy]];
  visited[cy * w + cx] = 1;
  for (let i = 0; i < q.length; i++) {
    const [bx, by] = q[i];
    for (const [dx, dy] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0]
    ]) {
      const nx = bx + dx;
      const ny = by + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const vi = ny * w + nx;
      if (visited[vi]) continue;
      if (getWorldMapCityName(nx, ny) !== cn) continue;
      visited[vi] = 1;
      if (canEnterMap(nx, ny)) return { x: nx, y: ny };
      q.push([nx, ny]);
    }
  }
  return null;
}

/** Keeps the last saved position; only adjusts when out of bounds or not passable (nearest passable tile). Never snaps to defaultStart when the saved tile is valid. */
function ensureWorldMapPosition() {
  const d = getWorldMapData();
  if (!d || !player.worldMap) return;
  const st = GAME_CONFIG.worldMap.defaultStart;
  let nx = player.worldMap.x;
  let ny = player.worldMap.y;
  if (typeof nx !== "number" || !Number.isFinite(nx)) nx = st.x;
  if (typeof ny !== "number" || !Number.isFinite(ny)) ny = st.y;
  nx = Math.floor(nx);
  ny = Math.floor(ny);
  if (nx < 0 || ny < 0 || nx >= d.width || ny >= d.height || !canEnterMap(nx, ny)) {
    let near = null;
    if (nx >= 0 && ny >= 0 && nx < d.width && ny < d.height) {
      const cn = getWorldMapCityName(nx, ny);
      if (cn && cn.trim()) near = findNearestPassableTileInSameCityName(nx, ny, cn, d);
    }
    if (!near) near = findNearestPassableTile(nx, ny, d);
    if (near) {
      nx = near.x;
      ny = near.y;
    } else {
      let fx = Math.max(0, Math.min(d.width - 1, Math.floor(st.x)));
      let fy = Math.max(0, Math.min(d.height - 1, Math.floor(st.y)));
      if (!canEnterMap(fx, fy)) {
        const near2 = findNearestPassableTile(fx, fy, d);
        if (near2) {
          fx = near2.x;
          fy = near2.y;
        }
      }
      nx = fx;
      ny = fy;
    }
  }
  if (nx !== player.worldMap.x || ny !== player.worldMap.y) {
    player.worldMap.x = nx;
    player.worldMap.y = ny;
    save();
  }
}

function worldMapKey(x, y) {
  return `${x},${y}`;
}

function parseWorldMapKey(key) {
  const parts = String(key).split(",");
  const x = parseInt(parts[0], 10);
  const y = parseInt(parts[1], 10);
  if (Number.isNaN(x) || Number.isNaN(y)) return { x: 0, y: 0 };
  return { x, y };
}

/**
 * If portal id was created by {@link applyCityPortalsFromConfig} as `portal_x,y`, returns that anchor tile for teleport.
 * Returns null for editor/custom ids (e.g. `portal_abc123`).
 * @returns {{ x: number, y: number } | null}
 */
function parseCoordsFromCityPortalElementId(id) {
  const s = typeof id === "string" ? id.trim() : "";
  const m = /^portal_(\d+),(\d+)$/.exec(s);
  if (!m) return null;
  return { x: parseInt(m[1], 10), y: parseInt(m[2], 10) };
}

function getWorldMapCityNamesRaw() {
  const d = getWorldMapData();
  if (!d || !d.cityNames || typeof d.cityNames !== "object") return null;
  return d.cityNames;
}

/** City name from Excel export (same cell as biome); empty if none. */
function getWorldMapCityName(x, y) {
  const m = getWorldMapCityNamesRaw();
  if (!m) return "";
  const v = m[worldMapKey(x, y)];
  return typeof v === "string" && v.trim() ? v.trim() : "";
}

/** @type { { ax: number, ay: number, name: string }[] | null } */
let worldMapCityCentroidsCache = null;

/** One label per 4-connected city region; centroid in grid coords for world map modal labels. */
function computeWorldMapCityCentroids() {
  const d = getWorldMapData();
  const m = getWorldMapCityNamesRaw();
  if (!d || !m) return [];
  const byKey = new Map();
  for (const k of Object.keys(m)) {
    const name = m[k];
    if (typeof name !== "string" || !name.trim()) continue;
    const parts = k.split(",");
    if (parts.length !== 2) continue;
    const x = parseInt(parts[0], 10);
    const y = parseInt(parts[1], 10);
    if (Number.isNaN(x) || Number.isNaN(y)) continue;
    if (x < 0 || y < 0 || x >= d.width || y >= d.height) continue;
    byKey.set(worldMapKey(x, y), name.trim());
  }
  const visited = new Set();
  const out = [];
  for (const [k, name] of byKey) {
    if (visited.has(k)) continue;
    const { x: sx, y: sy } = parseWorldMapKey(k);
    const stack = [[sx, sy]];
    visited.add(k);
    const comp = [];
    while (stack.length) {
      const [x, y] = stack.pop();
      if (byKey.get(worldMapKey(x, y)) !== name) continue;
      comp.push({ x, y });
      for (const [dx, dy] of [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0]
      ]) {
        const nx = x + dx;
        const ny = y + dy;
        const nk = worldMapKey(nx, ny);
        if (visited.has(nk)) continue;
        if (byKey.get(nk) === name) {
          visited.add(nk);
          stack.push([nx, ny]);
        }
      }
    }
    let sumX = 0;
    let sumY = 0;
    for (const p of comp) {
      sumX += p.x;
      sumY += p.y;
    }
    const n = comp.length;
    out.push({ ax: sumX / n, ay: sumY / n, name });
  }
  return out;
}

function getWorldMapCityCentroids() {
  if (!worldMapCityCentroidsCache) {
    worldMapCityCentroidsCache = computeWorldMapCityCentroids();
  }
  return worldMapCityCentroidsCache;
}

function getConnectedCityCellsSameName(x, y, cityName) {
  const d = getWorldMapData();
  const m = getWorldMapCityNamesRaw();
  if (!d || !m || !cityName) return [];
  const cn = cityName.trim();
  if (m[worldMapKey(x, y)] !== cn) return [];
  const stack = [[x, y]];
  const seen = new Set([worldMapKey(x, y)]);
  const out = [];
  while (stack.length) {
    const [cx, cy] = stack.pop();
    out.push({ x: cx, y: cy });
    for (const [dx, dy] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0]
    ]) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= d.width || ny >= d.height) continue;
      const nk = worldMapKey(nx, ny);
      if (seen.has(nk)) continue;
      if (m[nk] !== cn) continue;
      seen.add(nk);
      stack.push([nx, ny]);
    }
  }
  return out;
}

/** Row-major order over the village cells; maps to files 1–4 (index mod 4). */
function getCityAdventureBackgroundVariant(x, y, cityName) {
  const cells = getConnectedCityCellsSameName(x, y, cityName);
  if (!cells.length) return 1;
  cells.sort((a, b) => a.y - b.y || a.x - b.x);
  const idx = cells.findIndex((c) => c.x === x && c.y === y);
  const i = idx >= 0 ? idx : 0;
  return (i % 4) + 1;
}

function getWorldMapCityUniqueNames() {
  const m = getWorldMapCityNamesRaw();
  if (!m) return [];
  const s = new Set();
  for (const k of Object.keys(m)) {
    const n = m[k];
    if (typeof n === "string" && n.trim()) s.add(n.trim());
  }
  return [...s];
}

/** Paradise beach biomes use a 1-cell-wide transition band (see transition rings). */
function biomeIndexIsParadiseBeach(biIdx) {
  const b = GAME_CONFIG.worldMap.biomes[biIdx];
  const n = b && b.name;
  return n === "Paradise North" || n === "Paradise South";
}

/** Rings from shared boundary into each biome: 1 = boundary cells only; 2 = boundary + one cell inward. */
function transitionRingsForBiomePair(biA, biB) {
  if (biomeIndexIsParadiseBeach(biA) || biomeIndexIsParadiseBeach(biB)) return 1;
  return 2;
}

function getBiomePairTransitionTextureUrl(lo, hi) {
  const a = Math.min(lo, hi);
  const b = Math.max(lo, hi);
  return `Assets/BiomeTransitions/${a}_${b}/blend.png`;
}

function hasNeighborWithBiome(d, x, y, targetBiome) {
  const w = d.width;
  const h = d.height;
  const bi = d.biomeIndex;
  const dirs = [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0]
  ];
  for (const [dx, dy] of dirs) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
    if (bi[ny * w + nx] === targetBiome) return true;
  }
  return false;
}

/**
 * Cells in biome biA within `rings` layers of any edge where biA touches biB.
 * @param {number} rings 1 or 2
 */
function collectTransitionSideCells(d, biA, biB, rings) {
  const w = d.width;
  const h = d.height;
  const bi = d.biomeIndex;
  const visited = new Uint8Array(w * h);
  const out = [];
  const q = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (bi[i] !== biA) continue;
      if (!hasNeighborWithBiome(d, x, y, biB)) continue;
      visited[i] = 1;
      out.push(worldMapKey(x, y));
      q.push([x, y, 0]);
    }
  }
  for (let qi = 0; qi < q.length; qi++) {
    const [x, y, dist] = q[qi];
    if (dist + 1 >= rings) continue;
    for (const [dx, dy] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0]
    ]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
      const ni = ny * w + nx;
      if (bi[ni] !== biA) continue;
      if (visited[ni]) continue;
      visited[ni] = 1;
      out.push(worldMapKey(nx, ny));
      q.push([nx, ny, dist + 1]);
    }
  }
  return out;
}

function enumerateNeighborBiomePairs(d) {
  const w = d.width;
  const h = d.height;
  const bi = d.biomeIndex;
  const pairs = new Set();
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = bi[y * w + x];
      if (x + 1 < w) {
        const b = bi[y * w + x + 1];
        if (a !== b) {
          const lo = Math.min(a, b);
          const hi = Math.max(a, b);
          pairs.add(`${lo}_${hi}`);
        }
      }
      if (y + 1 < h) {
        const b = bi[(y + 1) * w + x];
        if (a !== b) {
          const lo = Math.min(a, b);
          const hi = Math.max(a, b);
          pairs.add(`${lo}_${hi}`);
        }
      }
    }
  }
  return [...pairs]
    .map((s) => {
      const [lo, hi] = s.split("_").map((n) => parseInt(n, 10));
      return { lo, hi };
    })
    .sort((p, q) => p.lo - q.lo || p.hi - q.hi);
}

let transitionAuxCacheDataRef = null;
/** @type {Map<string, { lo: number, hi: number, cells: string[], minX: number, maxX: number, minY: number, maxY: number }> | null} */
let transitionAuxPairRegions = null;
/** @type {Map<string, string> | null} worldMapKey -> pairKey "lo_hi" */
let transitionAuxCellToPairKey = null;

function getTransitionAuxiliaryPairRegions(d) {
  if (transitionAuxCacheDataRef === d && transitionAuxPairRegions && transitionAuxCellToPairKey) {
    return { pairRegions: transitionAuxPairRegions, cellToPairKey: transitionAuxCellToPairKey };
  }
  const pairRegions = new Map();
  const cellToPairKey = new Map();
  const pairs = enumerateNeighborBiomePairs(d);
  const claimed = new Set();
  for (const { lo, hi } of pairs) {
    const rings = transitionRingsForBiomePair(lo, hi);
    const left = collectTransitionSideCells(d, lo, hi, rings);
    const right = collectTransitionSideCells(d, hi, lo, rings);
    const merged = [...new Set([...left, ...right])];
    const cells = [];
    for (const key of merged) {
      if (claimed.has(key)) continue;
      claimed.add(key);
      cells.push(key);
    }
    if (!cells.length) continue;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const key of cells) {
      const { x, y } = parseWorldMapKey(key);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    const pk = `${lo}_${hi}`;
    pairRegions.set(pk, { lo, hi, cells, minX, maxX, minY, maxY });
    for (const key of cells) {
      cellToPairKey.set(key, pk);
    }
  }
  transitionAuxCacheDataRef = d;
  transitionAuxPairRegions = pairRegions;
  transitionAuxCellToPairKey = cellToPairKey;
  return { pairRegions, cellToPairKey };
}

/**
 * Per-coordinate adventure layout (config.worldMap.coordinateCells). Default: enemy encounters from biome.
 * Player {@link player.worldMap.sceneEdits} overrides config for the same coordinate when present.
 * @returns {{ kind: "encounters", encounterSlots: number | null } | { kind: "scene", title: string, description: string, elements: object[] }}
 */
function normalizeCoordinateCellRaw(raw) {
  if (!raw || typeof raw !== "object") {
    return { kind: "encounters", encounterSlots: null };
  }
  if (raw.kind === "scene") {
    return {
      kind: "scene",
      title: typeof raw.title === "string" ? raw.title : "",
      description: typeof raw.description === "string" ? raw.description : "",
      elements: Array.isArray(raw.elements) ? raw.elements : []
    };
  }
  let encounterSlots = null;
  if (Object.prototype.hasOwnProperty.call(raw, "encounterSlots")) {
    const n = raw.encounterSlots;
    if (typeof n === "number" && Number.isFinite(n)) encounterSlots = Math.max(0, Math.floor(n));
  }
  return { kind: "encounters", encounterSlots };
}

function getCoordinateCellConfigFromConfigOnly(x, y) {
  const wm = GAME_CONFIG.worldMap;
  const raw = wm && wm.coordinateCells && typeof wm.coordinateCells === "object" ? wm.coordinateCells[worldMapKey(x, y)] : null;
  return normalizeCoordinateCellRaw(raw);
}

function getCoordinateCellConfig(x, y) {
  const key = worldMapKey(x, y);
  const edit = player.worldMap.sceneEdits && player.worldMap.sceneEdits[key];
  if (edit && edit.kind === "scene" && Array.isArray(edit.elements)) {
    return {
      kind: "scene",
      title: typeof edit.title === "string" ? edit.title : "",
      description: typeof edit.description === "string" ? edit.description : "",
      elements: edit.elements
    };
  }
  return getCoordinateCellConfigFromConfigOnly(x, y);
}

function ensureSceneEditCopy(x, y) {
  if (!player.worldMap.sceneEdits || typeof player.worldMap.sceneEdits !== "object") player.worldMap.sceneEdits = {};
  const key = worldMapKey(x, y);
  if (player.worldMap.sceneEdits[key]) return;
  const base = getCoordinateCellConfigFromConfigOnly(x, y);
  if (base.kind === "scene") {
    player.worldMap.sceneEdits[key] = {
      kind: "scene",
      title: base.title,
      description: base.description,
      elements: JSON.parse(JSON.stringify(base.elements || []))
    };
  } else {
    player.worldMap.sceneEdits[key] = {
      kind: "scene",
      title: "",
      description: "",
      elements: []
    };
  }
}

function newSceneElementId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Catalog of addable editable scene objects (sidebar Add list). Each entry must produce `editable: true`.
 */
function getEditableSceneObjectCatalog() {
  const wm = GAME_CONFIG.worldMap;
  const portals = wm && Array.isArray(wm.cityPortals) ? wm.cityPortals : [];
  const firstCity = portals[0];
  const cityName = firstCity && typeof firstCity.name === "string" ? firstCity.name.trim() : "";
  const cityTheme =
    firstCity && typeof firstCity.theme === "string" && /^[a-zA-Z0-9_-]+$/.test(firstCity.theme.trim())
      ? firstCity.theme.trim()
      : "portal-theme-default";
  const inv0 = player.inventory && player.inventory[0] ? String(player.inventory[0]) : "Small Potion";
  return [
    {
      id: "portal",
      label: "Waygate (portal)",
      build: () => ({
        type: "portal",
        id: newSceneElementId("portal"),
        editable: true,
        label: "New waygate",
        city: cityName,
        theme: cityTheme
      })
    },
    {
      id: "door",
      label: "Door (same-map teleport)",
      build: () => ({
        type: "door",
        id: newSceneElementId("door"),
        editable: true,
        label: "Door",
        target: { x: player.worldMap.x, y: player.worldMap.y }
      })
    },
    {
      id: "npc",
      label: "NPC (dialog)",
      build: () => ({
        type: "npc",
        id: newSceneElementId("npc"),
        editable: true,
        label: "NPC",
        text: "…"
      })
    },
    {
      id: "note",
      label: "Note (modal text)",
      build: () => ({
        type: "note",
        id: newSceneElementId("note"),
        editable: true,
        label: "Read",
        text: "…"
      })
    },
    {
      id: "pickup",
      label: "Pickup (item)",
      build: () => ({
        type: "pickup",
        id: newSceneElementId("pickup"),
        editable: true,
        label: "Take",
        itemName: inv0,
        once: true
      })
    },
    {
      id: "usable",
      label: "Usable (grant item)",
      build: () => ({
        type: "usable",
        id: newSceneElementId("usable"),
        editable: true,
        label: "Use",
        itemName: inv0,
        once: true
      })
    }
  ];
}

function addSceneEditableObjectFromCatalog(catalogId) {
  const x = player.worldMap.x;
  const y = player.worldMap.y;
  ensureSceneEditCopy(x, y);
  const key = worldMapKey(x, y);
  const rec = player.worldMap.sceneEdits[key];
  const cat = getEditableSceneObjectCatalog().find((c) => c.id === catalogId);
  if (!cat || !rec || !Array.isArray(rec.elements)) return;
  const el = cat.build();
  if (!el || typeof el !== "object") return;
  el.editable = true;
  rec.elements.push(el);
  if (!player.worldMap.sceneLayout || typeof player.worldMap.sceneLayout !== "object") player.worldMap.sceneLayout = {};
  const lk = sceneLayoutStorageKey(x, y, el.id);
  player.worldMap.sceneLayout[lk] = { leftPct: 50, topPct: 50, scalePct: 100 };
  save();
  render();
}

function removeSceneEditableObject(elId) {
  const x = player.worldMap.x;
  const y = player.worldMap.y;
  const key = worldMapKey(x, y);
  ensureSceneEditCopy(x, y);
  const rec = player.worldMap.sceneEdits[key];
  if (!rec || !Array.isArray(rec.elements)) return;
  rec.elements = rec.elements.filter((e) => e && e.id !== elId);
  const lk = sceneLayoutStorageKey(x, y, elId);
  if (player.worldMap.sceneLayout && player.worldMap.sceneLayout[lk]) delete player.worldMap.sceneLayout[lk];
  save();
  render();
}

function getEncounterSlotCountForCell(x, y, cellCfg) {
  if (getWorldMapCityName(x, y)) return 0;
  const cfg = cellCfg || getCoordinateCellConfig(x, y);
  if (cfg.kind !== "encounters") return 0;
  if (cfg.encounterSlots != null) return cfg.encounterSlots;
  return getWorldMapEncounterSlotCount();
}

function scenePickupKey(x, y, elId) {
  return `${worldMapKey(x, y)}|${elId}`;
}

function isScenePickupTaken(x, y, elId) {
  const o = player.worldMap.scenePickups;
  return !!(o && o[scenePickupKey(x, y, elId)]);
}

function markScenePickupTaken(x, y, elId) {
  if (!player.worldMap.scenePickups) player.worldMap.scenePickups = {};
  player.worldMap.scenePickups[scenePickupKey(x, y, elId)] = true;
  save();
}

/** Persisted scene object positions: key `${mapKey}|${elementId}` → { leftPct, topPct } (0–100, adventure-body). */
function sceneLayoutStorageKey(x, y, elId) {
  return `${worldMapKey(x, y)}|${elId}`;
}

function clampScenePct(n) {
  if (typeof n !== "number" || Number.isNaN(n)) return 50;
  return Math.min(100, Math.max(0, n));
}

function clampSceneScalePct(n) {
  if (typeof n !== "number" || Number.isNaN(n)) return 100;
  return Math.min(200, Math.max(25, Math.round(n)));
}

/**
 * Layout baked on scene elements (e.g. city waygates from `cityPortals` in config). Used when the player has no `sceneLayout` override.
 * @returns {{ leftPct: number, topPct: number, scalePct: number } | null}}
 */
function getSceneLayoutDefaultsFromSceneElement(x, y, elId) {
  const cfg = getCoordinateCellConfig(x, y);
  if (!cfg || cfg.kind !== "scene" || !Array.isArray(cfg.elements)) return null;
  const el = cfg.elements.find((e) => e && e.id === elId);
  if (!el || typeof el !== "object") return null;
  const hasPos = typeof el.leftPct === "number" && typeof el.topPct === "number" && Number.isFinite(el.leftPct) && Number.isFinite(el.topPct);
  const hasScale = typeof el.scalePct === "number" && Number.isFinite(el.scalePct);
  if (!hasPos && !hasScale) return null;
  return {
    leftPct: hasPos ? clampScenePct(el.leftPct) : 50,
    topPct: hasPos ? clampScenePct(el.topPct) : 50,
    scalePct: hasScale ? clampSceneScalePct(el.scalePct) : 100
  };
}

function getSceneLayoutTransform(x, y, elId) {
  const key = sceneLayoutStorageKey(x, y, elId);
  if (player.worldMap.sceneLayout && typeof player.worldMap.sceneLayout === "object") {
    const o = player.worldMap.sceneLayout[key];
    if (o && typeof o.leftPct === "number" && typeof o.topPct === "number") {
      let scalePct = 100;
      if (typeof o.scalePct === "number" && Number.isFinite(o.scalePct)) {
        scalePct = clampSceneScalePct(o.scalePct);
      }
      return {
        leftPct: clampScenePct(o.leftPct),
        topPct: clampScenePct(o.topPct),
        scalePct
      };
    }
  }
  const fromEl = getSceneLayoutDefaultsFromSceneElement(x, y, elId);
  if (fromEl) return fromEl;
  return { leftPct: 50, topPct: 50, scalePct: 100 };
}

function saveSceneLayoutPosition(x, y, elId, leftPct, topPct) {
  if (!player.worldMap.sceneLayout || typeof player.worldMap.sceneLayout !== "object") player.worldMap.sceneLayout = {};
  const key = sceneLayoutStorageKey(x, y, elId);
  const prev = player.worldMap.sceneLayout[key] || {};
  const scalePct = typeof prev.scalePct === "number" ? clampSceneScalePct(prev.scalePct) : 100;
  player.worldMap.sceneLayout[key] = { leftPct: clampScenePct(leftPct), topPct: clampScenePct(topPct), scalePct };
  save();
}

function saveSceneLayoutScale(x, y, elId, scalePct) {
  if (!player.worldMap.sceneLayout || typeof player.worldMap.sceneLayout !== "object") player.worldMap.sceneLayout = {};
  const key = sceneLayoutStorageKey(x, y, elId);
  const prev = player.worldMap.sceneLayout[key] || {};
  const leftPct = typeof prev.leftPct === "number" ? clampScenePct(prev.leftPct) : 50;
  const topPct = typeof prev.topPct === "number" ? clampScenePct(prev.topPct) : 50;
  player.worldMap.sceneLayout[key] = { leftPct, topPct, scalePct: clampSceneScalePct(scalePct) };
  save();
}

/**
 * `cityPortals`-shaped list with `leftPct` / `topPct` / `scalePct` from the active save (player `sceneLayout` overrides config defaults).
 * Omit layout keys when still centered default so pasted config stays small.
 */
function buildCityPortalsLayoutExportObjects() {
  const wm = GAME_CONFIG.worldMap;
  const list = wm && Array.isArray(wm.cityPortals) ? wm.cityPortals : [];
  return list.map((p) => {
    const out = { ...p };
    if (typeof p.x !== "number" || typeof p.y !== "number" || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return out;
    const portalId = `portal_${worldMapKey(p.x, p.y)}`;
    const pos = getSceneLayoutTransform(p.x, p.y, portalId);
    const isDefault = pos.leftPct === 50 && pos.topPct === 50 && pos.scalePct === 100;
    const hadAny =
      (typeof p.leftPct === "number" && Number.isFinite(p.leftPct)) ||
      (typeof p.topPct === "number" && Number.isFinite(p.topPct)) ||
      (typeof p.scalePct === "number" && Number.isFinite(p.scalePct));
    if (!isDefault || hadAny) {
      out.leftPct = pos.leftPct;
      out.topPct = pos.topPct;
      out.scalePct = pos.scalePct;
    } else {
      delete out.leftPct;
      delete out.topPct;
      delete out.scalePct;
    }
    return out;
  });
}

function buildCityPortalsLayoutExportSnippet() {
  return JSON.stringify(buildCityPortalsLayoutExportObjects(), null, 2);
}

async function copyCityPortalLayoutExportToClipboard() {
  const text = buildCityPortalsLayoutExportSnippet();
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      showModal("Copied city portal list (with positions and sizes) to the clipboard. Replace `cityPortals` in config.js and reload.");
    } else {
      console.warn("cityPortals layout export (clipboard unavailable):\n", text);
      showModal("Clipboard API unavailable. The full JSON was written to the browser console (F12 → Console).");
    }
  } catch (err) {
    console.warn("cityPortals layout export:\n", text);
    showModal(
      `Could not copy to clipboard (${err && err.message ? err.message : String(err)}). The full JSON was written to the console.`
    );
  }
}

let sceneLayoutDragSuppressedClick = false;

function parseSceneLayoutStorageKey(key) {
  const i = key.indexOf("|");
  if (i <= 0) return null;
  const mapPart = key.slice(0, i);
  const elId = key.slice(i + 1);
  const comma = mapPart.indexOf(",");
  if (comma < 0) return null;
  const sx = parseInt(mapPart.slice(0, comma), 10);
  const sy = parseInt(mapPart.slice(comma + 1), 10);
  if (Number.isNaN(sx) || Number.isNaN(sy)) return null;
  return { x: sx, y: sy, elId };
}

function onSceneResizePointerDown(e) {
  if (!player.editMode) return;
  const handle = e.target.closest(".scene-object-resize[data-scene-resize]");
  if (!handle) return;
  if (e.button !== 0) return;
  e.preventDefault();
  e.stopPropagation();
  const elId = handle.getAttribute("data-scene-resize");
  if (!elId) return;
  const anchor = handle.closest(".scene-object-anchor");
  if (!anchor) return;
  const parsed = parseSceneLayoutStorageKey(anchor.getAttribute("data-scene-layout-key"));
  if (!parsed) return;
  const sx = player.worldMap.x;
  const sy = player.worldMap.y;
  const start = getSceneLayoutTransform(sx, sy, elId);
  const startY = e.clientY;
  const startX = e.clientX;
  let lastScale = start.scalePct;
  let ended = false;
  anchor.classList.add("scene-object-anchor--resizing");
  const move = (ev) => {
    const dy = ev.clientY - startY;
    const dx = ev.clientX - startX;
    lastScale = clampSceneScalePct(start.scalePct + dy * 0.28 + dx * 0.12);
    anchor.style.transform = `translate(-50%,-50%) scale(${lastScale / 100})`;
  };
  const done = (ev) => {
    if (ended) return;
    ended = true;
    document.removeEventListener("pointermove", move);
    document.removeEventListener("pointerup", done);
    document.removeEventListener("pointercancel", done);
    anchor.classList.remove("scene-object-anchor--resizing");
    sceneLayoutDragSuppressedClick = true;
    saveSceneLayoutScale(sx, sy, elId, lastScale);
    render();
  };
  document.addEventListener("pointermove", move);
  document.addEventListener("pointerup", done);
  document.addEventListener("pointercancel", done);
}

function onSceneLayoutPointerDown(e) {
  if (!player.editMode) return;
  if (e.target.closest(".scene-object-remove") || e.target.closest(".scene-object-resize")) return;
  const anchor = e.target.closest(".scene-object-anchor[data-scene-layout-key]");
  if (!anchor) return;
  if (e.button !== 0) return;
  const track =
    anchor.closest(".world-scene-actions--anchored") ||
    document.querySelector("#adventurePageRoot .adventure-body");
  if (!track) return;
  e.preventDefault();
  e.stopPropagation();
  const key = anchor.getAttribute("data-scene-layout-key");
  const parsed = parseSceneLayoutStorageKey(key);
  if (!parsed) return;
  const startX = e.clientX;
  const startY = e.clientY;
  let ended = false;
  anchor.classList.add("scene-object-anchor--dragging");
  try {
    anchor.setPointerCapture(e.pointerId);
  } catch (_) {}
  const move = (ev) => {
    const br = track.getBoundingClientRect();
    const cx = ev.clientX - br.left;
    const cy = ev.clientY - br.top;
    const leftPct = clampScenePct((cx / br.width) * 100);
    const topPct = clampScenePct((cy / br.height) * 100);
    anchor.style.left = `${leftPct}%`;
    anchor.style.top = `${topPct}%`;
  };
  const done = (ev) => {
    if (ended) return;
    ended = true;
    document.removeEventListener("pointermove", move);
    document.removeEventListener("pointerup", done);
    document.removeEventListener("pointercancel", done);
    anchor.classList.remove("scene-object-anchor--dragging");
    try {
      anchor.releasePointerCapture(ev.pointerId);
    } catch (_) {}
    const br = track.getBoundingClientRect();
    const cx = ev.clientX - br.left;
    const cy = ev.clientY - br.top;
    const leftPct = clampScenePct((cx / br.width) * 100);
    const topPct = clampScenePct((cy / br.height) * 100);
    const dist = Math.hypot(ev.clientX - startX, ev.clientY - startY);
    if (dist > 6) sceneLayoutDragSuppressedClick = true;
    saveSceneLayoutPosition(parsed.x, parsed.y, parsed.elId, leftPct, topPct);
  };
  document.addEventListener("pointermove", move);
  document.addEventListener("pointerup", done);
  document.addEventListener("pointercancel", done);
}

function syncEditModeUi() {
  const on = !!player.editMode;
  document.body.classList.toggle("edit-mode-on", on);
  const btn = document.getElementById("editModeToggle");
  if (btn) {
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.classList.toggle("sidebar-edit-mode-btn--active", on);
  }
  const addPanel = document.getElementById("editModeAddPanel");
  if (addPanel) addPanel.classList.toggle("hidden", !on);
  const addList = document.getElementById("editModeAddList");
  if (addList && !on) addList.classList.add("hidden");
}

function setEditMode(on) {
  player.editMode = !!on;
  save();
  syncEditModeUi();
}

/** Unique SVG defs id per portal instance (avoids duplicate ids if multiple SVGs). */
function portalSvgDefId(elId) {
  const s = String(elId).replace(/[^a-zA-Z0-9]/g, "");
  return s.length ? s : "waygate";
}

/**
 * Medieval stone waygate: rough arch ring, starry void, carved runes, mist — themed via CSS variables on `.portal-theme-*`.
 */
function buildPortalFrameSvgHtml(elId) {
  const fid = portalSvgDefId(elId);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120" class="world-portal-svg" aria-hidden="true">
  <defs>
    <linearGradient id="stoneGrad-${fid}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="var(--portal-stone-light)"/>
      <stop offset="45%" stop-color="var(--portal-stone-mid)"/>
      <stop offset="100%" stop-color="var(--portal-stone-dark)"/>
    </linearGradient>
    <radialGradient id="voidGrad-${fid}" cx="50%" cy="45%" r="58%">
      <stop offset="0%" stop-color="var(--portal-void-inner)"/>
      <stop offset="55%" stop-color="var(--portal-void-mid)"/>
      <stop offset="100%" stop-color="var(--portal-void-edge)"/>
    </radialGradient>
    <radialGradient id="mistGrad-${fid}" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="var(--portal-mist)"/>
      <stop offset="100%" stop-color="transparent"/>
    </radialGradient>
    <filter id="runeGlow-${fid}" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="0.55" result="r"/>
      <feMerge><feMergeNode in="r"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <ellipse cx="50" cy="112" rx="42" ry="8" fill="url(#mistGrad-${fid})" opacity="0.72"/>
  <ellipse cx="50" cy="49" rx="21" ry="23" fill="url(#voidGrad-${fid})"/>
  <path fill-rule="evenodd" fill="url(#stoneGrad-${fid})" stroke="var(--portal-stone-edge)" stroke-width="0.4" d="M6 110 L6 76 Q6 22 50 9 Q94 22 94 76 L94 110 Z M50 49 m-18 0 a18 18 0 1 0 36 0 a18 18 0 1 0 -36 0"/>
  <g stroke="var(--portal-stone-edge)" stroke-width="0.45" stroke-linecap="round" opacity="0.35" class="world-portal-masonry">
    <line x1="11" y1="82" x2="11" y2="108"/><line x1="11" y1="92" x2="17" y2="92"/>
    <line x1="89" y1="82" x2="89" y2="108"/><line x1="89" y1="92" x2="83" y2="92"/>
  </g>
  <g stroke="var(--portal-iron)" stroke-width="0.65" stroke-linecap="round" opacity="0.85" class="world-portal-iron">
    <line x1="7" y1="98" x2="19" y2="98"/><line x1="93" y1="98" x2="81" y2="98"/>
    <path d="M46 11 L54 11 L52 14 Z" fill="var(--portal-iron)" stroke="none" opacity="0.9"/>
  </g>
  <g fill="var(--portal-spark)" opacity="0.9" class="world-portal-sparkles">
    <circle cx="45" cy="43" r="0.55"/><circle cx="55" cy="47" r="0.5"/><circle cx="50" cy="54" r="0.45"/><circle cx="43" cy="51" r="0.38"/><circle cx="57" cy="44" r="0.38"/><circle cx="48" cy="47" r="0.32"/>
  </g>
  <g fill="none" stroke="var(--portal-rune)" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round" filter="url(#runeGlow-${fid})" opacity="0.94" class="world-portal-runes">
    <path d="M50 16.5 L50 25 M46 18.5 L54 18.5 M46 22.5 L54 22.5 M47 20.5 L53 20.5"/>
    <path d="M27 34.5 L31 31.5 L31 37.5 L27 37.5 Z"/>
    <path d="M73 34.5 L69 31.5 L69 37.5 L73 37.5 Z"/>
    <path d="M17 56 L21 52 L21 60 M17 56 L14 56"/>
    <path d="M83 56 L79 52 L79 60 M83 56 L86 56"/>
  </g>
  <circle cx="50" cy="49" r="16.8" fill="none" stroke="var(--portal-arc)" stroke-width="0.7" class="world-portal-svg__ring" opacity="0.88"/>
</svg>`;
}

function getWorldMapPortalImageUrl() {
  const wm = GAME_CONFIG.worldMap;
  const u = wm && typeof wm.portalImage === "string" ? wm.portalImage.trim() : "";
  return u;
}

/** Renders the shared portal PNG from {@link GAME_CONFIG.worldMap.portalImage}, or the SVG fallback if unset. */
function buildPortalVisualHtml(elId) {
  const url = getWorldMapPortalImageUrl();
  if (url) {
    return `<img src="${escapeAttr(url)}" alt="" class="world-portal-img" data-portal-el-id="${escapeAttr(
      elId
    )}" draggable="false" decoding="async" />`;
  }
  return buildPortalFrameSvgHtml(elId);
}

/** If {@link getWorldMapPortalImageUrl} is set but the image is missing or fails to load, replace with {@link buildPortalFrameSvgHtml}. */
function applyPortalImageFallbacks(root) {
  if (!root || !getWorldMapPortalImageUrl()) return;
  root.querySelectorAll("img.world-portal-img").forEach((img) => {
    const elId = typeof img.getAttribute("data-portal-el-id") === "string" ? img.getAttribute("data-portal-el-id") : "portal";
    const swap = () => {
      const wrap = img.parentElement;
      if (!wrap || !wrap.classList.contains("world-portal-visual")) return;
      wrap.innerHTML = buildPortalFrameSvgHtml(elId);
    };
    img.addEventListener("error", swap, { once: true });
    if (img.complete && img.naturalWidth === 0 && img.getAttribute("src")) swap();
  });
}

/**
 * @returns {{ html: string, hasAnchoredObjects: boolean }}
 */
function buildAdventureSceneHtml(x, y, cfg) {
  const title = cfg.title ? `<h2 class="world-scene-title">${escapeHtml(cfg.title)}</h2>` : "";
  const desc = cfg.description ? `<p class="world-scene-desc muted">${escapeHtml(cfg.description)}</p>` : "";
  const elems = cfg.elements || [];
  let hasAnchoredObjects = false;
  const wrapIfEditable = (elId, editable, inner) => {
    if (!editable) return inner;
    hasAnchoredObjects = true;
    const pos = getSceneLayoutTransform(x, y, elId);
    const k = sceneLayoutStorageKey(x, y, elId);
    const sc = pos.scalePct / 100;
    return `<div class="scene-object-anchor" data-scene-layout-key="${escapeAttr(k)}" style="left:${pos.leftPct}%;top:${pos.topPct}%;transform:translate(-50%,-50%) scale(${sc})"><button type="button" class="scene-object-remove" data-scene-remove="${escapeAttr(
      elId
    )}" aria-label="Remove object" title="Remove">&times;</button><span class="scene-object-resize" data-scene-resize="${escapeAttr(elId)}" aria-label="Resize" title="Resize"></span>${inner}</div>`;
  };
  const buttons = elems.map((el, i) => {
    if (!el || typeof el !== "object") return "";
    const type = el.type;
    const id = typeof el.id === "string" && el.id.trim() ? el.id.trim() : `el${i}`;
    const editable = el.editable === true;
    if (type === "npc" || type === "note") {
      const text = typeof el.text === "string" ? el.text : "";
      const payload = escapeAttr(JSON.stringify({ type: type === "note" ? "note" : "npc", text, id }));
      const label = escapeHtml(typeof el.label === "string" ? el.label : type);
      const tip = escapeHtml(text || label);
      return wrapIfEditable(
        id,
        editable,
        `<button type="button" class="btn-secondary world-scene-btn" data-world-scene="${payload}" title="${tip}">${label}</button>`
      );
    }
    if (type === "door") {
      const tx = el.target && typeof el.target.x === "number" ? el.target.x : 0;
      const ty = el.target && typeof el.target.y === "number" ? el.target.y : 0;
      const payload = escapeAttr(JSON.stringify({ type: "door", target: { x: tx, y: ty }, id }));
      const label = escapeHtml(typeof el.label === "string" ? el.label : "Go");
      return wrapIfEditable(
        id,
        editable,
        `<button type="button" class="btn-primary world-scene-btn" data-world-scene="${payload}">${label}</button>`
      );
    }
    if (type === "portal") {
      const city = typeof el.city === "string" ? el.city.trim() : "";
      const themeRaw = typeof el.theme === "string" ? el.theme.trim() : "portal-theme-default";
      const theme = /^[a-zA-Z0-9_-]+$/.test(themeRaw) ? themeRaw : "portal-theme-default";
      const labelText = typeof el.label === "string" && el.label.trim() ? el.label.trim() : "Waygate";
      const labelAttr = escapeAttr(labelText);
      const payload = escapeAttr(JSON.stringify({ type: "portal", city, id, label: labelText }));
      const visual = buildPortalVisualHtml(id);
      return wrapIfEditable(
        id,
        editable,
        `<button type="button" class="world-scene-btn world-portal-btn ${theme}" data-world-scene="${payload}" title="${labelAttr}" aria-label="${labelAttr}"><span class="world-portal-visual" aria-hidden="true">${visual}</span></button>`
      );
    }
    if (type === "pickup" || type === "usable") {
      const itemName = typeof el.itemName === "string" ? el.itemName.trim() : "";
      if (type === "usable" && !itemName) {
        const text = typeof el.text === "string" ? el.text : "";
        const payload = escapeAttr(JSON.stringify({ type: "note", text, id }));
        const label = escapeHtml(typeof el.label === "string" ? el.label : "Use");
        return wrapIfEditable(
          id,
          editable,
          `<button type="button" class="btn-secondary world-scene-btn" data-world-scene="${payload}">${label}</button>`
        );
      }
      if (type === "pickup" && !itemName) return "";
      const once = el.once !== false;
      const taken = once && isScenePickupTaken(x, y, id);
      if (taken) {
        const doneLabel = escapeHtml(typeof el.label === "string" ? `${el.label} (taken)` : "Taken");
        return `<div class="world-scene-stub muted" aria-disabled="true">${doneLabel}</div>`;
      }
      const payload = escapeAttr(JSON.stringify({ type: "pickup", itemName, id, once }));
      const label = escapeHtml(typeof el.label === "string" ? el.label : itemName || "Take");
      return wrapIfEditable(
        id,
        editable,
        `<button type="button" class="btn-secondary world-scene-btn" data-world-scene="${payload}">${label}</button>`
      );
    }
    return "";
  });
  const actionsClass = hasAnchoredObjects ? "world-scene-actions world-scene-actions--anchored" : "world-scene-actions";
  return {
    html: `<div class="world-scene">${title}${desc}<div class="${actionsClass}">${buttons.filter(Boolean).join("")}</div></div>`,
    hasAnchoredObjects
  };
}

/** @returns {boolean} true if a scene button handled the click */
function onAdventureSceneButtonClick(e) {
  if (sceneLayoutDragSuppressedClick) {
    sceneLayoutDragSuppressedClick = false;
    return true;
  }
  const btn = e.target.closest(".world-scene-btn[data-world-scene]");
  if (!btn) return false;
  if (player.editMode) return true;
  const raw = btn.getAttribute("data-world-scene");
  if (!raw) return false;
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return false;
  }
  const x = player.worldMap.x;
  const y = player.worldMap.y;
  if (payload.type === "portal" && typeof payload.id === "string" && payload.id.trim()) {
    openPortalNetworkModal(payload.id.trim());
    return true;
  }
  if (payload.type === "door" && payload.target && typeof payload.target.x === "number" && typeof payload.target.y === "number") {
    const tx = payload.target.x;
    const ty = payload.target.y;
    if (!canEnterMap(tx, ty)) {
      showModal("You cannot travel there.");
      return true;
    }
    player.worldMap.x = tx;
    player.worldMap.y = ty;
    save();
    render();
    return true;
  }
  if (payload.type === "pickup" && typeof payload.itemName === "string" && payload.itemName) {
    const id = typeof payload.id === "string" ? payload.id : "pickup";
    if (payload.once !== false && isScenePickupTaken(x, y, id)) return true;
    player.inventory.push(payload.itemName);
    if (payload.once !== false) markScenePickupTaken(x, y, id);
    else save();
    showModal(`You take: ${payload.itemName}.`);
    renderAdventure();
    return true;
  }
  if ((payload.type === "npc" || payload.type === "note") && typeof payload.text === "string") {
    showModal(payload.text);
    return true;
  }
  return false;
}

function isWorldMobSetDefeated(x, y, setIndex) {
  const rec = player.worldMap.cells[worldMapKey(x, y)];
  if (!rec || !Array.isArray(rec.defeated)) return false;
  const t = rec.defeated[setIndex];
  if (t == null) return false;
  const ms = getWorldMobRespawnMsAt(x, y, setIndex);
  if (Date.now() - t >= ms) {
    rec.defeated[setIndex] = null;
    if (Array.isArray(rec.defeatedUnits)) rec.defeatedUnits[setIndex] = null;
    save();
    return false;
  }
  return true;
}

function worldMobRespawnRemainingMs(x, y, setIndex) {
  const rec = player.worldMap.cells[worldMapKey(x, y)];
  if (!rec || !Array.isArray(rec.defeated)) return 0;
  const t = rec.defeated[setIndex];
  if (t == null) return 0;
  const ms = getWorldMobRespawnMsAt(x, y, setIndex);
  return Math.max(0, ms - (Date.now() - t));
}

/** True while this slot is on respawn cooldown (no DOM card; no side effects). */
function slotIsWorldMobOnRespawnCooldown(x, y, setIndex) {
  const rec = player.worldMap.cells[worldMapKey(x, y)];
  if (!rec || !Array.isArray(rec.defeated)) return false;
  const t = rec.defeated[setIndex];
  if (t == null) return false;
  const ms = getWorldMobRespawnMsAt(x, y, setIndex);
  return Date.now() - t < ms;
}

function moveWorldMap(dx, dy) {
  ensureWorldMapPosition();
  const nx = player.worldMap.x + dx;
  const ny = player.worldMap.y + dy;
  if (!canEnterMap(nx, ny)) return;
  player.worldMap.x = nx;
  player.worldMap.y = ny;
  save();
  render();
}

function startWorldMapFight(setIndex) {
  const x = player.worldMap.x;
  const y = player.worldMap.y;
  const cellCfg = getCoordinateCellConfig(x, y);
  if (cellCfg.kind !== "encounters") return;
  const slots = getEncounterSlotCountForCell(x, y, cellCfg);
  if (setIndex < 0 || setIndex >= slots) return;
  if (isWorldMobSetDefeated(x, y, setIndex)) return;
  const biome = getWorldBiomeDefAt(x, y);
  if (!biome.passable) return;
  const pool = biome.possibleEnemies;
  if (!pool || !pool.length) return;
  const preview = ensureMobPreview(x, y, setIndex);
  if (!preview || !preview.units || !preview.units.length) return;
  const region = { name: biome.name, enemyScale: biome.enemyScale || 1 };
  beginTurnCombat(region, { units: preview.units }, { x, y, setIndex });
}

/** @type {null | { region: object, mob: object, enemyNames: string[], foes: object[], party: { uid: number, name: string, hp: number, maxHp: number, kind: 'hero'|'companion', dex?: number, agi?: number, flatArmor: number }[], playerHp: number, playerMax: number, stamina?: number, maxStamina?: number, comboRefundedThisTurn?: boolean, phase: 'player'|'enemy'|'ended', selectedUid: number, fightLog: string[], enemyTurnIndex: number, heroAttackUntil?: number, worldMapContext: null | { x: number, y: number, setIndex: number } }} */
let combatState = null;
/** @type {ReturnType<typeof setTimeout> | null} */
let combatVisualTick = null;

function clearCombatVisualTimer() {
  if (combatVisualTick) {
    clearTimeout(combatVisualTick);
    combatVisualTick = null;
  }
}

function queueCombatVisualRefresh(delayMs) {
  clearCombatVisualTimer();
  combatVisualTick = setTimeout(() => {
    combatVisualTick = null;
    if (!combatState || combatState.phase === "ended") return;
    renderTurnBattle();
  }, Math.max(0, Number.isFinite(delayMs) ? delayMs : 0));
}

function getCombatHeroVisualState() {
  if (!combatState) return "idle";
  const until = typeof combatState.heroAttackUntil === "number" ? combatState.heroAttackUntil : 0;
  if (until > Date.now()) return "attack";
  return "idle";
}

function getCombatFoeVisualState(foe) {
  if (!foe || typeof foe !== "object") return "idle";
  const until = typeof foe.attackUntil === "number" ? foe.attackUntil : 0;
  if (until > Date.now()) return "attack";
  return "idle";
}

function getCombatFoeVisual(foe) {
  if (!foe || typeof foe !== "object") return { image: "", sprite: null };
  const state = getCombatFoeVisualState(foe);
  const out = resolveVisualByState({ image: foe.image, images: foe.images, sprites: foe.sprites }, state);
  if (!out.image && !out.sprite) out.image = getItemImage(foe.name);
  return out;
}

function getActiveCombatSkills() {
  const out = [];
  player.skills.forEach((name) => {
    const cfg = GAME_CONFIG.skills.find((s) => s.name === name);
    if (cfg && typeof cfg.combatMultiplier === "number") out.push(cfg);
  });
  return out;
}

/**
 * Resolves one loot table entry. String = guaranteed drop (100%).
 * Object: { name, dropRate } with dropRate in 0–100 (% chance per kill).
 */
function rollItemDropEntry(entry) {
  if (typeof entry === "string") {
    const t = entry.trim();
    return t ? t : null;
  }
  if (!entry || typeof entry !== "object" || typeof entry.name !== "string") return null;
  const name = entry.name.trim();
  if (!name) return null;
  let pct = entry.dropRate;
  if (pct == null || pct === "") pct = 100;
  pct = Number(pct);
  if (!Number.isFinite(pct)) return null;
  pct = Math.max(0, Math.min(100, pct));
  if (pct <= 0) return null;
  if (pct >= 100) return name;
  if (Math.random() * 100 < pct) return name;
  return null;
}

/**
 * Gold from enemy drops: a fixed integer, or `{ min, max }` for a uniform random integer in that range (inclusive).
 * @param {number | { min?: number, max?: number } | undefined | null} spec
 * @returns {number}
 */
function rollGoldDrop(spec) {
  if (spec == null) return 0;
  if (typeof spec === "number" && Number.isFinite(spec)) {
    return Math.max(0, Math.floor(spec));
  }
  if (typeof spec === "object" && spec !== null) {
    const a = typeof spec.min === "number" ? spec.min : 0;
    const b = typeof spec.max === "number" ? spec.max : a;
    const lo = Math.max(0, Math.floor(Math.min(a, b)));
    const hi = Math.max(0, Math.floor(Math.max(a, b)));
    if (hi < lo) return lo;
    return lo + Math.floor(Math.random() * (hi - lo + 1));
  }
  return 0;
}

/**
 * Kill XP: `baseXP` from rarity, then `floor(baseXP * clamp(minXpMult, maxXpMult, 1 + (M - P) * levelDiff)))` — see `GAME_CONFIG.victoryXp`.
 * @param {{ name: string, level?: number }} foe
 * @param {number} playerLevel
 */
function computeVictoryXpForFoe(foe, playerLevel) {
  const def = getEnemyDefByName(foe.name);
  const mlRaw =
    typeof foe.level === "number" && foe.level > 0 ? foe.level : def ? pickLevelFromEnemyDef(def) : 1;
  const ml = Math.max(1, Math.floor(mlRaw));
  const pl = Math.max(1, Math.floor(typeof playerLevel === "number" && playerLevel > 0 ? playerLevel : 1));
  const cfg = GAME_CONFIG.victoryXp;
  if (!cfg || typeof cfg !== "object") {
    if (def && def.drops && typeof def.drops.xp === "number") return Math.max(1, Math.floor(def.drops.xp));
    return 1;
  }
  const rarityId =
    def && typeof def.spawnRarity === "string" && def.spawnRarity.trim()
      ? def.spawnRarity.trim().toLowerCase()
      : "common";
  const byRarity = cfg.baseXpByRarity && typeof cfg.baseXpByRarity === "object" ? cfg.baseXpByRarity : {};
  let baseXp =
    typeof byRarity[rarityId] === "number" && byRarity[rarityId] > 0 ? byRarity[rarityId] : byRarity.common || 20;
  if (!(baseXp > 0)) baseXp = 20;
  const diffCo =
    typeof cfg.levelDiffPerPlayerLevel === "number" && Number.isFinite(cfg.levelDiffPerPlayerLevel)
      ? cfg.levelDiffPerPlayerLevel
      : 0.025;
  const minM = typeof cfg.minXpMult === "number" && Number.isFinite(cfg.minXpMult) ? cfg.minXpMult : 0.2;
  const maxM = typeof cfg.maxXpMult === "number" && Number.isFinite(cfg.maxXpMult) ? cfg.maxXpMult : 3;
  let addMult = 1 + (ml - pl) * diffCo;
  if (cfg.minLevelDiffMultiplier != null && Number.isFinite(cfg.minLevelDiffMultiplier)) {
    addMult = Math.max(cfg.minLevelDiffMultiplier, addMult);
  }
  if (cfg.maxLevelDiffMultiplier != null && Number.isFinite(cfg.maxLevelDiffMultiplier)) {
    addMult = Math.min(cfg.maxLevelDiffMultiplier, addMult);
  }
  addMult = Math.max(minM, Math.min(maxM, addMult));
  return Math.max(1, Math.floor(baseXp * addMult));
}

/**
 * @param {Array<{ name: string, level?: number }>} foes Defeated encounter units (use `combatState.foes`).
 */
function computeVictoryLoot(foes) {
  let gold = 0;
  let xp = 0;
  const items = [];
  const pl = typeof player.level === "number" && player.level > 0 ? player.level : 1;
  (foes || []).forEach((foe) => {
    if (!foe || typeof foe.name !== "string") return;
    const def = getEnemyDefByName(foe.name);
    if (!def || !def.drops) return;
    gold += rollGoldDrop(def.drops.gold);
    xp += computeVictoryXpForFoe(foe, pl);
    (def.drops.items || []).forEach((entry) => {
      const rolled = rollItemDropEntry(entry);
      if (rolled) items.push(rolled);
    });
  });
  return { gold, xp, items };
}

function appendFightLog(text) {
  if (!combatState) return;
  combatState.fightLog.push(text);
  const logEl = document.getElementById("fightLog");
  if (!logEl) return;
  const row = document.createElement("div");
  row.className = "fight-log-line";
  row.textContent = text;
  logEl.appendChild(row);
  logEl.scrollTop = logEl.scrollHeight;
}

function ensureCombatTarget() {
  if (!combatState) return;
  const alive = combatState.foes.filter((f) => f.hp > 0);
  if (!alive.length) return;
  const sel = combatState.selectedUid;
  if (sel == null || !alive.some((f) => f.uid === sel)) {
    combatState.selectedUid = alive[0].uid;
  }
}

function clearPlayerTurnTimer() {
  if (playerTurnTimerTick) {
    clearInterval(playerTurnTimerTick);
    playerTurnTimerTick = null;
  }
}

function syncFightTurnTimerDisplay() {
  const el = document.getElementById("fightTurnTimer");
  if (!el) return;
  const st = combatState;
  if (!st || st.phase !== "player") {
    el.textContent = "—";
    return;
  }
  const end = el.getAttribute("data-end-at");
  const endMs = end ? parseInt(end, 10) : 0;
  if (!endMs) {
    el.textContent = `${PLAYER_TURN_SECONDS}s`;
    return;
  }
  const left = Math.max(0, Math.ceil((endMs - Date.now()) / 1000));
  el.textContent = `${left}s`;
}

function startPlayerTurnTimer() {
  clearPlayerTurnTimer();
  const st = combatState;
  if (!st || st.phase !== "player") return;
  const el = document.getElementById("fightTurnTimer");
  const endMs = Date.now() + PLAYER_TURN_SECONDS * 1000;
  if (el) {
    el.setAttribute("data-end-at", String(endMs));
  }
  syncFightTurnTimerDisplay();
  playerTurnTimerTick = setInterval(() => {
    const cur = combatState;
    if (!cur || cur.phase !== "player") {
      clearPlayerTurnTimer();
      return;
    }
    syncFightTurnTimerDisplay();
    if (Date.now() >= endMs) {
      clearPlayerTurnTimer();
      playerCombatPass(true);
    }
  }, 250);
}

function updateFightTargetSelection() {
  const st = combatState;
  if (!st) return;
  const hud = document.getElementById("fightHud");
  if (!hud) return;
  ensureCombatTarget();
  hud.querySelectorAll("[data-fight-target]").forEach((card) => {
    const uid = parseInt(card.getAttribute("data-fight-target"), 10);
    const foe = st.foes.find((f) => f.uid === uid);
    const dead = !foe || foe.hp <= 0;
    const sel = st.selectedUid === uid && !dead;
    card.classList.toggle("fight-enemy-card--dead", dead);
    card.classList.toggle("fight-enemy-card--selected", sel);
    card.setAttribute("aria-pressed", sel ? "true" : "false");
  });
}

function shakeFightOverlay() {
  const overlay = document.getElementById("fightOverlay");
  if (!overlay) return;
  overlay.classList.remove("shake");
  void overlay.offsetWidth;
  overlay.classList.add("shake");
}

function renderTurnBattle() {
  const st = combatState;
  const hud = document.getElementById("fightHud");
  const actionsEl = document.getElementById("fightPlayerActions");
  const closeBtn = document.getElementById("fightCloseBtn");
  if (!hud || !st) return;

  /** Replacing fight DOM drops hovered elements without firing mouseout — clear stale tooltips. */
  hideItemTooltip();

  ensureCombatTarget();
  ensureCombatParty(st);

  let partyHtml = "";
  (st.party || []).forEach((m) => {
    const dead = !m || m.hp <= 0;
    const pct = m.maxHp ? (Math.max(0, m.hp) / m.maxHp) * 100 : 0;
    const imgSrc =
      m.kind === "hero"
        ? escapeAttr(getHeroImageForState(getCombatHeroVisualState()))
        : escapeAttr(getItemImage(m.name));
    partyHtml += `<div class="fight-ally-card ${dead ? "fight-ally-card--dead" : ""}" data-party-member="${m.uid}">
      <img class="fight-portrait-img fight-portrait-img--ally" src="${imgSrc}" alt="" />
      <span class="fight-card-name">${escapeHtml(m.name)}</span>
      <div class="hp-bar fight-card-hp"><div class="hp-bar-fill" style="width:${pct}%"></div></div>
      <span class="fight-card-hp-text">${Math.max(0, m.hp)} / ${m.maxHp}</span>
    </div>`;
  });

  let enemiesHtml = "";
  st.foes.forEach((f) => {
    const dead = f.hp <= 0;
    const pct = f.maxHp ? (Math.max(0, f.hp) / f.maxHp) * 100 : 0;
    const sel = st.selectedUid === f.uid && !dead;
    const label = escapeHtml(f.name);
    const moodLabel = escapeHtml(f.moodName || "—");
    const lvl = typeof f.level === "number" ? f.level : 1;
    const foeVisualHtml = buildVisualHtml(getCombatFoeVisual(f), "fight-portrait-img fight-portrait-img--enemy", f.name, false);
    enemiesHtml += `<div class="fight-enemy-card ${dead ? "fight-enemy-card--dead" : ""} ${sel ? "fight-enemy-card--selected" : ""}" data-fight-target="${f.uid}" role="button" tabindex="0" aria-pressed="${sel}">
      <div class="fight-enemy-panel">
        ${foeVisualHtml}
        <div class="hp-bar hp-bar-enemy fight-card-hp"><div class="hp-bar-fill" style="width:${pct}%"></div></div>
        <span class="fight-card-hp-text">${Math.max(0, f.hp)} / ${f.maxHp}</span>
      </div>
      <div class="fight-enemy-caption">
        <span class="fight-card-name">${label}</span>
        <span class="fight-card-level">Lv ${lvl}</span>
        <span class="fight-card-meta fight-card-mood">${moodLabel}</span>
      </div>
    </div>`;
  });

  hud.innerHTML = `<div class="fight-battlefield">
    <div class="fight-party-row">${partyHtml}</div>
    <div class="fight-enemies-row">${enemiesHtml}</div>
  </div>`;
  hydrateSpriteAnimations(hud);

  if (actionsEl) {
    if (st.phase === "ended") {
      actionsEl.classList.add("hidden");
      actionsEl.innerHTML = "";
    } else if (st.phase === "player") {
      actionsEl.classList.remove("hidden");
      const skills = getActiveCombatSkills();
      const hasAoeSkill = skills.some((s) => s.combatAoe === "all_enemies");
      const stam = typeof st.stamina === "number" ? st.stamina : 0;
      const maxS = typeof st.maxStamina === "number" ? st.maxStamina : getPlayerCombatMaxStamina();
      const atkBase = resolveAttackStaminaCost();
      const canAtk = stam >= atkBase;
      let skillBtns = "";
      skills.forEach((sk) => {
        const sImg = escapeAttr(getSkillImage(sk.name));
        const sc = resolveSkillStaminaCost(getSkillStaminaCost(sk.name));
        const canSk = stam >= sc;
        const dis = canSk ? "" : " disabled";
        skillBtns += `<button type="button" class="btn-secondary fight-skill-btn"${dis} data-fight-skill="${escapeAttr(sk.name)}" title="${escapeAttr(sk.name)} (${sc} stamina)"><img class="fight-skill-img" src="${sImg}" alt="" draggable="false" /></button>`;
      });
      const hint = hasAoeSkill
        ? "Stamina refills each turn. Spend it on attacks and skills; End turn when you are done. Area skills hit all enemies."
        : "Stamina refills each turn. Spend it on attacks and skills; End turn when you are done.";
      const atkDis = canAtk ? "" : " disabled";
      actionsEl.innerHTML = `<div class="fight-turn-timer-row" aria-live="polite"><span class="fight-turn-timer-label">Turn time</span><span id="fightTurnTimer" class="fight-turn-timer" data-end-at="">30s</span></div>
        <div class="fight-stamina-row" aria-live="polite"><span class="fight-stamina-label">Stamina</span><span class="fight-stamina-num">${stam} / ${maxS}</span></div>
        <p class="fight-hint">${hint}</p>
        <div class="fight-action-row">
          <button type="button" class="btn-primary"${atkDis} data-fight-action="attack">Attack (${atkBase})</button>
          <button type="button" class="btn-secondary fight-pass-btn" data-fight-action="pass">End turn</button>
          ${skillBtns}
        </div>`;
    } else {
      actionsEl.classList.remove("hidden");
      actionsEl.innerHTML = `<p class="fight-hint fight-hint--enemy">Enemies are attacking…</p>`;
    }
  }

  if (closeBtn) {
    if (st.phase === "ended") {
      closeBtn.classList.remove("hidden");
    } else {
      closeBtn.classList.add("hidden");
    }
  }

  if (st.phase === "player") {
    startPlayerTurnTimer();
  } else {
    clearPlayerTurnTimer();
    const tEl = document.getElementById("fightTurnTimer");
    if (tEl) {
      tEl.removeAttribute("data-end-at");
      tEl.textContent = "—";
    }
  }
}

function runEnemyPhase() {
  const st = combatState;
  if (!st) return;
  st.phase = "enemy";
  renderTurnBattle();

  const living = st.foes.filter((f) => f.hp > 0);
  if (!living.length) {
    finishCombatVictory();
    return;
  }

  let i = 0;
  function nextHit() {
    const cur = combatState;
    if (!cur || cur.phase !== "enemy") return;
    if (!isPartyAlive(cur)) {
      finishCombatDefeat();
      return;
    }
    if (i >= living.length) {
      tickEffectsAtStartOfPlayerTurn(cur);
      if (!isPartyAlive(cur)) {
        syncCombatPartyHeroMirror(cur);
        setTimeout(() => finishCombatDefeat(), 200);
        return;
      }
      ensureCombatStatus(cur);
      if ((cur.status.playerStunTurns || 0) > 0) {
        cur.status.playerStunTurns -= 1;
        appendFightLog("You are stunned and lose your turn!");
        tickPlayerTurnEndBuffs(cur);
        renderTurnBattle();
        setTimeout(() => runEnemyPhase(), 380);
        return;
      }
      cur.phase = "player";
      ensureCombatTarget();
      refillCombatStamina(cur);
      cur.comboRefundedThisTurn = false;
      renderTurnBattle();
      return;
    }
    const foe = living[i];
    i++;
    if (foe.hp <= 0) {
      nextHit();
      return;
    }
    foe.attackUntil = Date.now() + 320;
    queueCombatVisualRefresh(340);
    const def = getEnemyDefByName(foe.name);
    const scriptId = def && typeof def.combatScript === "string" ? def.combatScript.trim() : "";
    if (scriptId) {
      enemyCombatRunScript(scriptId, foe, cur);
    } else {
      const prev = cur.__monsterDamageSourceFoe;
      cur.__monsterDamageSourceFoe = foe;
      try {
        const raw = getFoeEffectiveAttackForCombat(foe) * getFoeOutgoingDamageMultiplier(cur, foe);
        dealRawDamageToPlayer(cur, raw, foe.name, "hits you");
      } finally {
        cur.__monsterDamageSourceFoe = prev;
      }
    }
    tickEnemySkillCooldownsEndOfTurn(foe);
    renderTurnBattle();
    shakeFightOverlay();
    if (!isPartyAlive(cur)) {
      syncCombatPartyHeroMirror(cur);
      setTimeout(() => finishCombatDefeat(), 400);
      return;
    }
    setTimeout(nextHit, 380);
  }

  setTimeout(nextHit, 200);
}

function hideFightResults() {
  hideItemTooltip();
  const el = document.getElementById("fightResults");
  if (el) {
    el.classList.add("hidden");
    el.innerHTML = "";
  }
}

function buildFightLootHtml(items) {
  if (!items.length) {
    return '<p class="fight-results-muted fight-results-no-loot">No items dropped.</p>';
  }
  return `<div class="fight-loot-grid">${items
    .map(
      (name) =>
        `<div class="fight-loot-cell" data-item-name="${escapeAttr(name)}">${invCellImg(name)}</div>`
    )
    .join("")}</div>
    <p class="fight-loot-hint">Double-click equipment here to equip. On Overview, double-click a worn item in the paper doll to unequip.</p>`;
}

function showFightResults(victory, result) {
  hideItemTooltip();
  const el = document.getElementById("fightResults");
  if (!el) return;
  el.classList.remove("hidden");
  if (victory) {
    const lootBlock = buildFightLootHtml(result.items);
    el.innerHTML = `<div class="fight-results-head fight-results-head--win">Victory</div>
      <div class="fight-results-body">
        <div class="fight-results-row"><span class="fight-results-k">XP gained</span><span class="fight-results-v">+${result.xp}</span></div>
        <div class="fight-results-row"><span class="fight-results-k">Gold</span><span class="fight-results-v">+${result.gold}</span></div>
        <div class="fight-results-loot">
          <span class="fight-results-loot-label">Loot</span>
          ${lootBlock}
        </div>
      </div>`;
  } else {
    el.innerHTML = `<div class="fight-results-head fight-results-head--lose">Defeat</div>
      <div class="fight-results-body">
        <p class="fight-results-msg">You were defeated. No XP, gold, or loot.</p>
      </div>`;
  }
}

function finishCombatVictory() {
  const st = combatState;
  if (!st) return;
  st.phase = "ended";
  syncCombatPartyHeroMirror(st);
  const { gold, xp, items } = computeVictoryLoot(st.foes);
  const result = {
    victory: true,
    finalPlayerHp: Math.max(0, st.playerHp),
    gold,
    xp,
    items
  };
  applyFightResult(result);
  if (st.worldMapContext) {
    const { x, y, setIndex } = st.worldMapContext;
    const key = worldMapKey(x, y);
    const cellCfg = getCoordinateCellConfig(x, y);
    const slots = getEncounterSlotCountForCell(x, y, cellCfg);
    if (!player.worldMap.cells[key]) player.worldMap.cells[key] = { defeated: [], defeatedUnits: [], mobPreviews: [] };
    if (!Array.isArray(player.worldMap.cells[key].defeated)) player.worldMap.cells[key].defeated = [];
    if (!Array.isArray(player.worldMap.cells[key].defeatedUnits)) player.worldMap.cells[key].defeatedUnits = [];
    if (!Array.isArray(player.worldMap.cells[key].mobPreviews)) player.worldMap.cells[key].mobPreviews = [];
    while (player.worldMap.cells[key].defeated.length < slots) player.worldMap.cells[key].defeated.push(null);
    while (player.worldMap.cells[key].defeatedUnits.length < slots) player.worldMap.cells[key].defeatedUnits.push(null);
    while (player.worldMap.cells[key].mobPreviews.length < slots) player.worldMap.cells[key].mobPreviews.push(null);
    const killedNames = Array.isArray(st.enemyNames) ? st.enemyNames.slice() : [];
    recordMonsterKillsFromNames(killedNames);
    player.worldMap.cells[key].defeated[setIndex] = Date.now();
    player.worldMap.cells[key].defeatedUnits[setIndex] = killedNames;
    player.worldMap.cells[key].mobPreviews[setIndex] = null;
    save();
  }
  showFightResults(true, result);
  renderTurnBattle();
  const closeBtn = document.getElementById("fightCloseBtn");
  if (closeBtn) closeBtn.onclick = () => closeFightOverlay();
}

function finishCombatDefeat() {
  const st = combatState;
  if (!st) return;
  st.phase = "ended";
  syncCombatPartyHeroMirror(st);
  const result = {
    victory: false,
    finalPlayerHp: Math.max(1, st.playerHp),
    gold: 0,
    xp: 0,
    items: []
  };
  applyFightResult(result);
  showFightResults(false, result);
  renderTurnBattle();
  const closeBtn = document.getElementById("fightCloseBtn");
  if (closeBtn) closeBtn.onclick = () => closeFightOverlay();
}

function applyReflectDamageToPartyHero(st, dmgDealtToFoe, foe) {
  if (
    dmgDealtToFoe <= 0 ||
    !foe.combat ||
    typeof foe.combat.reflectTurns !== "number" ||
    foe.combat.reflectTurns <= 0 ||
    typeof foe.combat.reflectFrac !== "number" ||
    foe.combat.reflectFrac <= 0
  ) {
    return;
  }
  const ref = Math.max(1, Math.floor(dmgDealtToFoe * foe.combat.reflectFrac));
  ensureCombatParty(st);
  const hero = st.party.find((m) => m && m.kind === "hero");
  if (hero) {
    hero.hp -= ref;
    if (hero.hp < 0) hero.hp = 0;
    st.playerHp = hero.hp;
  } else {
    st.playerHp -= ref;
  }
  appendFightLog(`${foe.name} reflects ${ref} damage.`);
}

function playerCombatAction(kind, skillName) {
  const st = combatState;
  if (!st || st.phase !== "player") return;
  ensureCombatTarget();
  if (typeof st.stamina !== "number") initCombatStamina(st);

  const skCfg = kind === "skill" && skillName ? GAME_CONFIG.skills.find((s) => s.name === skillName) : null;
  const aoeAllEnemies = skCfg && skCfg.combatAoe === "all_enemies";
  const baseStaminaCost = kind === "skill" && skillName ? getSkillStaminaCost(skillName) : getAttackStaminaCost();
  const cost =
    kind === "skill" && skillName ? resolveSkillStaminaCost(baseStaminaCost) : resolveAttackStaminaCost();
  if (st.stamina < cost) {
    appendFightLog(`Not enough stamina (need ${cost}, have ${st.stamina}).`);
    return;
  }
  st.stamina -= cost;

  function resolveOutgoingBaseDamage() {
    let raw =
      kind === "skill" && skillName ? getCombatDamage("skill", skillName) : getCombatDamage("attack");
    raw = Math.max(1, Math.floor(raw * getPlayerOutgoingDamageMultFromStatus(st.status)));
    return raw;
  }

  function afterHitsCommit() {
    if (kind === "skill") tryDexComboRefundAfterSkill(st);
    if (!isPartyAlive(st)) {
      syncCombatPartyHeroMirror(st);
      finishCombatDefeat();
      return;
    }
    if (!st.foes.some((f) => f.hp > 0)) {
      finishCombatVictory();
      return;
    }
    if (st.stamina <= 0) {
      endPlayerTurn();
      return;
    }
    renderTurnBattle();
    startPlayerTurnTimer();
  }

  if (aoeAllEnemies) {
    const living = st.foes.filter((f) => f.hp > 0);
    if (!living.length) {
      st.stamina += cost;
      appendFightLog("No enemies to hit.");
      return;
    }
    const label = skillName || "Attack";
    const baseDmg = resolveOutgoingBaseDamage();
    clearPlayerTurnTimer();
    st.heroAttackUntil = Date.now() + 320;
    queueCombatVisualRefresh(340);
    for (const foe of living) {
      if (foe.combat && typeof foe.combat.evadeNextChance === "number" && foe.combat.evadeNextChance > 0) {
        const p = Math.min(1, Math.max(0, foe.combat.evadeNextChance));
        foe.combat.evadeNextChance = 0;
        if (Math.random() < p) {
          appendFightLog(`${foe.name} evades ${label}!`);
          continue;
        }
      }
      const res = resolvePlayerOutgoingDamageVsFoe(foe, baseDmg, kind, skillName || null);
      if (res.missed) {
        appendFightLog(`${player.name} uses ${label} on ${foe.name}, but ${foe.name} evades.`);
        continue;
      }
      const dmg = res.damage;
      foe.hp -= dmg;
      if (foe.hp < 0) foe.hp = 0;
      appendFightLog(
        `${player.name} uses ${label} on ${foe.name} for ${dmg} damage${res.crit ? " (critical hit!)" : ""}.`
      );
      if (dmg > 0 && skCfg) tryApplyStaggerFromSkill(foe, skCfg);
      applyReflectDamageToPartyHero(st, dmg, foe);
      if (foe.combat && foe.combat.script === "tusk_boar") {
        foe.combat.rageStacks = (foe.combat.rageStacks || 0) + 1;
      }
      if (foe.combat && foe.combat.script === "grass_snake") {
        foe.combat.markedByPlayer = true;
      }
    }
    afterHitsCommit();
    return;
  }

  const uid = st.selectedUid;
  const foe = st.foes.find((f) => f.uid === uid && f.hp > 0);
  if (!foe) {
    st.stamina += cost;
    appendFightLog("Select a living enemy.");
    return;
  }

  const label = kind === "skill" && skillName ? skillName : "Attack";
  if (foe.combat && typeof foe.combat.evadeNextChance === "number" && foe.combat.evadeNextChance > 0) {
    const p = Math.min(1, Math.max(0, foe.combat.evadeNextChance));
    foe.combat.evadeNextChance = 0;
    if (Math.random() < p) {
      clearPlayerTurnTimer();
      st.heroAttackUntil = Date.now() + 320;
      queueCombatVisualRefresh(340);
      appendFightLog(`${player.name} uses ${label} on ${foe.name}, but ${foe.name} evades!`);
      if (!st.foes.some((f) => f.hp > 0)) {
        finishCombatVictory();
        return;
      }
      afterHitsCommit();
      return;
    }
  }

  const baseDmg = resolveOutgoingBaseDamage();
  const res = resolvePlayerOutgoingDamageVsFoe(foe, baseDmg, kind, skillName || null);
  clearPlayerTurnTimer();
  st.heroAttackUntil = Date.now() + 320;
  queueCombatVisualRefresh(340);
  if (res.missed) {
    appendFightLog(`${player.name} uses ${label} on ${foe.name}, but ${foe.name} evades.`);
    afterHitsCommit();
    return;
  }
  const dmg = res.damage;
  foe.hp -= dmg;
  if (foe.hp < 0) foe.hp = 0;
  appendFightLog(
    `${player.name} uses ${label} on ${foe.name} for ${dmg} damage${res.crit ? " (critical hit!)" : ""}.`
  );
  if (dmg > 0 && skCfg) tryApplyStaggerFromSkill(foe, skCfg);
  applyReflectDamageToPartyHero(st, dmg, foe);
  if (foe.combat && foe.combat.script === "tusk_boar") {
    foe.combat.rageStacks = (foe.combat.rageStacks || 0) + 1;
  }
  if (foe.combat && foe.combat.script === "grass_snake") {
    foe.combat.markedByPlayer = true;
  }

  afterHitsCommit();
}

function playerCombatPass(auto) {
  const st = combatState;
  if (!st || st.phase !== "player") return;
  clearPlayerTurnTimer();
  appendFightLog(auto ? `${player.name} runs out of time and ends their turn.` : `${player.name} ends their turn.`);
  endPlayerTurn();
}

function onFightOverlayDblClick(ev) {
  const loot = ev.target.closest(".fight-loot-cell[data-item-name]");
  if (!loot || !loot.dataset.itemName) return;
  const name = loot.dataset.itemName;
  const def = getItemDef(name);
  if (!def || !def.slot) return;
  hideItemTooltip();
  if (equipFromInventory(name)) loot.remove();
}

function onFightOverlayClick(ev) {
  const st = combatState;
  if (!st || st.phase !== "player") return;

  const t = ev.target;
  const card = t.closest("[data-fight-target]");
  if (card) {
    const uid = parseInt(card.getAttribute("data-fight-target"), 10);
    const foe = st.foes.find((f) => f.uid === uid);
    if (foe && foe.hp > 0) {
      st.selectedUid = uid;
      updateFightTargetSelection();
    }
    return;
  }

  if (t.closest("[data-fight-action='pass']")) {
    playerCombatPass(false);
    return;
  }

  if (t.closest("[data-fight-action='attack']")) {
    playerCombatAction("attack");
    return;
  }
  const skillBtn = t.closest("[data-fight-skill]");
  if (skillBtn) {
    const name = skillBtn.getAttribute("data-fight-skill");
    if (name) playerCombatAction("skill", name);
  }
}

function beginTurnCombat(region, mob, worldMapContext) {
  const cappedUnits = mob.units ? mob.units.slice(0, COMBAT_FOES_MAX) : null;
  const cappedEnemies = !mob.units && mob.enemies ? mob.enemies.slice(0, COMBAT_FOES_MAX) : [];
  const foes = mob.units ? spawnEnemiesFromPreview(region, cappedUnits) : spawnEnemies(region, cappedEnemies);
  const enemyNames = mob.units ? cappedUnits.map((u) => u.name) : cappedEnemies.slice();
  const party = buildCombatPartyForMob(mob);
  combatState = {
    region,
    mob,
    enemyNames,
    foes,
    party,
    playerHp: party[0] ? party[0].hp : Math.min(player.hp, player.maxHp),
    playerMax: party[0] ? party[0].maxHp : player.maxHp,
    phase: "player",
    selectedUid: null,
    fightLog: [],
    worldMapContext: worldMapContext || null,
    status: null
  };
  ensureCombatStatus(combatState);
  initCombatStamina(combatState);
  clearCombatVisualTimer();
  ensureCombatTarget();

  const overlay = document.getElementById("fightOverlay");
  const logEl = document.getElementById("fightLog");
  const closeBtn = document.getElementById("fightCloseBtn");
  if (!overlay || !logEl) return;

  overlay.classList.remove("hidden");
  overlay.classList.add("fight-active");
  hideFightResults();
  logEl.innerHTML = "";
  appendFightLog("— Fight start —");
  if (closeBtn) {
    closeBtn.classList.add("hidden");
    closeBtn.onclick = null;
  }
  renderTurnBattle();
}

function applyFightResult(result) {
  if (result.victory) {
    player.hp = Math.min(player.maxHp, result.finalPlayerHp);
    player.xp += result.xp;
    player.gold += result.gold;
    result.items.forEach((it) => player.inventory.push(it));
    levelUp();
  } else {
    player.hp = Math.max(1, result.finalPlayerHp);
  }
  save();
}

function closeFightOverlay() {
  clearPlayerTurnTimer();
  clearCombatVisualTimer();
  combatState = null;
  hideItemTooltip();
  hideFightResults();
  const overlay = document.getElementById("fightOverlay");
  if (overlay) {
    overlay.classList.add("hidden");
    overlay.classList.remove("fight-active", "shake");
  }
  const closeBtn = document.getElementById("fightCloseBtn");
  if (closeBtn) closeBtn.onclick = null;
  render();
}

function startFight(region, mob) {
  if (mob && Array.isArray(mob.enemies) && mob.enemies.length) {
    beginTurnCombat(region, { enemies: mob.enemies.slice() }, null);
    return;
  }
  if (region && Array.isArray(region.possibleEnemies) && region.possibleEnemies.length) {
    const roll = rollMobComposition(region.possibleEnemies, 1, region);
    beginTurnCombat(region, { units: roll.units }, null);
    return;
  }
}

function levelUp() {
  const maxLv = getPlayerMaxLevel();
  while (player.level < maxLv) {
    const need = xpToNextLevel(player.level);
    if (need <= 0 || player.xp < need) break;
    player.xp -= need;
    player.level++;
    player.charPoints += 5;
    player.baseAttack += 2;
    player.maxHp = computeMaxHp(player);
    player.hp = player.maxHp;
  }
}

function spendCharPoint(statKey) {
  if (!["str", "dex", "vit", "int"].includes(statKey)) return;
  if (player.charPoints <= 0) return;
  if (player[statKey] >= STAT_CAP) return;
  player.charPoints--;
  const prevMax = player.maxHp;
  player[statKey]++;
  player.maxHp = computeMaxHp(player);
  const gained = player.maxHp - prevMax;
  if (gained > 0) player.hp = Math.min(player.maxHp, player.hp + gained);
  save();
  render();
}

function escapeAttr(s) {
  return String(s).replace(/"/g, "&quot;");
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Stat bar fill (relative scale for display) */
const STAT_CAP = 50;

const INV_COLS = 5;
const INV_VISIBLE_ROWS = 10;
const INV_VISIBLE_SLOTS = INV_COLS * INV_VISIBLE_ROWS;

function invCellImg(name) {
  const src = escapeAttr(getItemImage(name));
  return `<img class="inv-cell-img" src="${src}" alt="" draggable="false" />`;
}

function buildInventoryGridHtml(names, tabKind) {
  const list = names.slice();
  const total = Math.max(list.length, INV_VISIBLE_SLOTS);
  const cells = [];
  for (let i = 0; i < total; i++) {
    const name = list[i];
    if (!name) {
      cells.push('<div class="inv-cell inv-empty" aria-hidden="true"></div>');
      continue;
    }
    const esc = escapeAttr(name);
    const img = invCellImg(name);
    if (tabKind === "equipment") {
      cells.push(
        `<div class="inv-cell" draggable="true" data-item="${esc}" data-item-name="${esc}">${img}</div>`
      );
    } else if (tabKind === "consumables") {
      cells.push(
        `<div class="inv-cell inv-use" data-item="${esc}" data-item-name="${esc}" data-use-consumable="${esc}">${img}</div>`
      );
    } else {
      cells.push(`<div class="inv-cell" data-item="${esc}" data-item-name="${esc}">${img}</div>`);
    }
  }
  return `<div class="inv-grid-scroll"><div class="inv-grid">${cells.join("")}</div></div>`;
}

function autoItemDescription(def, itemName) {
  if (!def) return "Unknown item.";
  if (def.type === "weapon") return `Weapon: adds attack when equipped in the weapon slot.`;
  if (def.type === "armor") return `Armor: adds armor when equipped in the matching slot.`;
  if (def.type === "consumable") return `Usable item. Effects apply when consumed.`;
  if (def.type === "resource") return `Crafting or trade material.`;
  return itemName;
}

function buildItemTooltipHtml(itemName) {
  const def = getItemDef(itemName);
  const parts = [`<div class="item-tip-name">${escapeHtml(itemName)}</div>`];
  if (!def) {
    parts.push(`<div class="item-tip-desc">No catalog entry. Resource or legacy stack.</div>`);
    return `<div class="item-tip">${parts.join("")}</div>`;
  }
  const desc = def.description || autoItemDescription(def, itemName);
  parts.push(`<div class="item-tip-desc">${escapeHtml(desc)}</div>`);

  const statParts = [];
  if (def.attack) statParts.push(`Attack +${def.attack}`);
  if (def.defense) statParts.push(`Armor +${def.defense}`);
  if (def.type === "consumable" && def.effect === "heal") statParts.push(`Restores ${def.value} HP`);
  const bs = def.bonusStats && typeof def.bonusStats === "object" ? def.bonusStats : {};
  Object.keys(bs).forEach((k) => statParts.push(`${k} +${bs[k]}`));
  if (statParts.length) {
    parts.push(`<div class="item-tip-section"><span class="item-tip-label">Bonus stats</span><div class="item-tip-stats">${statParts.map((s) => escapeHtml(s)).join(" · ")}</div></div>`);
  }

  const bsk = Array.isArray(def.bonusSkills) ? def.bonusSkills : [];
  if (bsk.length) {
    parts.push(
      `<div class="item-tip-section"><span class="item-tip-label">Bonus skills</span><div class="item-tip-skills">${bsk.map((s) => escapeHtml(s)).join(", ")}</div></div>`
    );
  }

  if (def.type === "consumable" && def.useHint) {
    parts.push(`<div class="item-tip-hint">${escapeHtml(def.useHint)}</div>`);
  }

  return `<div class="item-tip">${parts.join("")}</div>`;
}

function positionItemTooltip(clientX, clientY) {
  const el = document.getElementById("itemTooltip");
  if (!el || el.classList.contains("hidden")) return;
  const pad = 14;
  const tw = el.offsetWidth;
  const th = el.offsetHeight;
  let left = clientX + pad;
  let top = clientY + pad;
  if (left + tw > window.innerWidth - 6) left = Math.max(6, clientX - tw - pad);
  if (top + th > window.innerHeight - 6) top = Math.max(6, clientY - th - pad);
  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
}

function showTooltipHtml(html, clientX, clientY) {
  const el = document.getElementById("itemTooltip");
  if (!el) return;
  el.innerHTML = html;
  el.classList.remove("hidden");
  el.setAttribute("aria-hidden", "false");
  requestAnimationFrame(() => positionItemTooltip(clientX, clientY));
}

function showItemTooltip(itemName, clientX, clientY) {
  showTooltipHtml(buildItemTooltipHtml(itemName), clientX, clientY);
}

const STAT_TIP_LABELS = {
  level: "Level",
  hp: "Hit points",
  xp: "Experience",
  charPoints: "Characteristic points",
  str: "Strength",
  dex: "Dexterity",
  vit: "Vitality",
  int: "Intelligence",
  armor: "Armor",
  damage: "Damage"
};

function buildStatTooltipHtml(statKey) {
  const label = STAT_TIP_LABELS[statKey] || statKey;
  const help =
    (GAME_CONFIG.statHelp && GAME_CONFIG.statHelp[statKey]) ||
    "No description available.";
  return `<div class="item-tip"><div class="item-tip-name">${escapeHtml(label)}</div><div class="item-tip-desc">${escapeHtml(help)}</div></div>`;
}

function showStatTooltip(statKey, clientX, clientY) {
  showTooltipHtml(buildStatTooltipHtml(statKey), clientX, clientY);
}

function buildSkillTooltipHtml(skillName) {
  const def = GAME_CONFIG.skills.find((s) => s.name === skillName);
  const parts = [`<div class="item-tip-name">${escapeHtml(skillName)}</div>`];
  if (!def) {
    parts.push(`<div class="item-tip-desc">Unknown skill.</div>`);
    return `<div class="item-tip">${parts.join("")}</div>`;
  }
  if (def.image) {
    parts.push(`<img class="item-tip-skill-icon" src="${escapeAttr(def.image)}" alt="" />`);
  }
  let desc = def.description || "Learned skill with passive or combat effects.";
  if (typeof def.combatMultiplier === "number") {
    const baseSt = getSkillStaminaCost(skillName);
    const st = resolveSkillStaminaCost(baseSt);
    desc +=
      st !== baseSt
        ? ` Stamina cost: ${st} (base ${baseSt}; Intelligence can reduce this).`
        : ` Stamina cost: ${st}.`;
  } else {
    desc += " No stamina cost in turn combat (passive only).";
  }
  parts.push(`<div class="item-tip-desc">${escapeHtml(desc)}</div>`);
  const extra = [];
  if (typeof def.bonus === "number") extra.push(`Passive attack +${def.bonus}`);
  if (typeof def.combatMultiplier === "number") {
    extra.push(`Combat skill: ×${def.combatMultiplier} (core + this skill’s bonus)`);
  } else {
    extra.push("Passive only — no combat skill button.");
  }
  if (extra.length) {
    parts.push(
      `<div class="item-tip-section"><span class="item-tip-label">Mechanics</span><div class="item-tip-mechanics">${extra.map((s) => escapeHtml(s)).join(" · ")}</div></div>`
    );
  }
  return `<div class="item-tip">${parts.join("")}</div>`;
}

function showSkillTooltip(skillName, clientX, clientY) {
  showTooltipHtml(buildSkillTooltipHtml(skillName), clientX, clientY);
}

function formatCombatTurnsLabel(turns) {
  const n = Math.max(1, Math.floor(turns));
  return `${n} turn${n === 1 ? "" : "s"}`;
}

function formatCombatStaminaLabel(current, max) {
  const cur = Number.isFinite(current) ? Math.max(0, Math.floor(current)) : null;
  const mx = Number.isFinite(max) ? Math.max(0, Math.floor(max)) : null;
  if (cur != null && mx != null) return `${cur} / ${mx}`;
  if (cur != null) return String(cur);
  return "—";
}

function getFightEnemyStatusLabels(foe) {
  const out = [];
  const c = foe && foe.combat && typeof foe.combat === "object" ? foe.combat : null;
  if (!c) return out;
  if (typeof c.staggerNextAttackMult === "number" && c.staggerNextAttackMult > 0 && c.staggerNextAttackMult < 1) {
    out.push("Staggered (next attack weakened)");
  }
  if (typeof c.thickHideTurns === "number" && c.thickHideTurns > 0) {
    out.push(`Thick Hide (${formatCombatTurnsLabel(c.thickHideTurns)})`);
  }
  if (typeof c.mitigationTurns === "number" && c.mitigationTurns > 0) {
    out.push(`Guarded (${formatCombatTurnsLabel(c.mitigationTurns)})`);
  }
  if (typeof c.reflectTurns === "number" && c.reflectTurns > 0) {
    out.push(`Reflecting damage (${formatCombatTurnsLabel(c.reflectTurns)})`);
  }
  if (typeof c.echoCryBonusTurns === "number" && c.echoCryBonusTurns > 0) {
    out.push(`Echo Cry buff (${formatCombatTurnsLabel(c.echoCryBonusTurns)})`);
  }
  if (typeof c.evadeNextChance === "number" && c.evadeNextChance > 0) {
    out.push("Ready to evade next hit");
  }
  if (typeof c.rageStacks === "number" && c.rageStacks > 0) {
    out.push(`Rage x${Math.floor(c.rageStacks)}`);
  }
  if (typeof c.gorillaRampStacks === "number" && c.gorillaRampStacks > 0) {
    out.push(`Rampage x${Math.floor(c.gorillaRampStacks)}`);
  }
  if (c.markedByPlayer) out.push("Marked");
  if (c.snakeDebuffed) out.push("Debuffed");
  return out;
}

function getFightPartyStatusLabels(st, member) {
  if (!member || member.kind !== "hero") return [];
  ensureCombatStatus(st);
  const s = st.status;
  const out = [];
  if (s.playerPoison && s.playerPoison.turns > 0) {
    out.push(`Poison (${s.playerPoison.dmg}/turn, ${formatCombatTurnsLabel(s.playerPoison.turns)})`);
  }
  if (s.playerBleed && s.playerBleed.turns > 0) {
    out.push(`Bleed (${s.playerBleed.dmg}/turn, ${formatCombatTurnsLabel(s.playerBleed.turns)})`);
  }
  if (s.playerBurn && s.playerBurn.turns > 0) {
    out.push(`Burn (${s.playerBurn.dmg}/turn, ${formatCombatTurnsLabel(s.playerBurn.turns)})`);
  }
  if (typeof s.playerStunTurns === "number" && s.playerStunTurns > 0) {
    out.push(`Stunned (${formatCombatTurnsLabel(s.playerStunTurns)})`);
  }
  if (typeof s.playerAttackDebuffTurns === "number" && s.playerAttackDebuffTurns > 0) {
    out.push(`Weakened (${formatCombatTurnsLabel(s.playerAttackDebuffTurns)})`);
  }
  if (typeof s.playerHamstringSlowTurns === "number" && s.playerHamstringSlowTurns > 0) {
    out.push(`Slowed (${formatCombatTurnsLabel(s.playerHamstringSlowTurns)})`);
  }
  if (typeof s.playerBrineWeakTurns === "number" && s.playerBrineWeakTurns > 0) {
    out.push(`Brine weakness (${formatCombatTurnsLabel(s.playerBrineWeakTurns)})`);
  }
  if (typeof s.playerFragileTurns === "number" && s.playerFragileTurns > 0) {
    out.push(`Fragile (${formatCombatTurnsLabel(s.playerFragileTurns)})`);
  }
  if (typeof s.packHowlTurns === "number" && s.packHowlTurns > 0) {
    out.push(`Enemies empowered (${formatCombatTurnsLabel(s.packHowlTurns)})`);
  }
  return out;
}

function buildFightEnemyTooltipHtml(foe) {
  const moodDef = Array.isArray(GAME_CONFIG.enemyMoods) ? GAME_CONFIG.enemyMoods.find((m) => m.id === foe.moodId) : null;
  const desc = moodDef && moodDef.description ? moodDef.description : "";
  const moodLine = desc ? `${escapeHtml(foe.moodName || "—")} — ${escapeHtml(desc)}` : escapeHtml(foe.moodName || "—");
  const lv = typeof foe.level === "number" ? foe.level : 1;
  const statusLabels = getFightEnemyStatusLabels(foe);
  const def = getEnemyDefByName(foe.name);
  const fallbackMax = getFoeCombatMaxStamina(def || foe);
  const stamina = formatCombatStaminaLabel(
    typeof foe.stamina === "number" ? foe.stamina : fallbackMax,
    typeof foe.maxStamina === "number" ? foe.maxStamina : fallbackMax
  );
  const statusLine = statusLabels.length ? statusLabels.join(" · ") : "None";
  return `<div class="item-tip"><div class="item-tip-name">${escapeHtml(foe.name)}</div><div class="item-tip-desc">Level ${lv}</div><div class="item-tip-desc">${moodLine}</div><div class="item-tip-desc">Stamina: ${escapeHtml(stamina)}</div><div class="item-tip-section"><span class="item-tip-label">Statuses</span><div class="item-tip-mechanics">${escapeHtml(statusLine)}</div></div></div>`;
}

function buildFightPartyTooltipHtml(member, st) {
  const role = member.kind === "hero" ? "Player character" : "Companion";
  const maxStamina = member.kind === "hero" ? (typeof st.maxStamina === "number" ? st.maxStamina : getPlayerCombatMaxStamina()) : member.maxStamina;
  const currentStamina = member.kind === "hero" ? st.stamina : member.stamina;
  const stamina = formatCombatStaminaLabel(currentStamina, maxStamina);
  const statusLabels = getFightPartyStatusLabels(st, member);
  const statusLine = statusLabels.length ? statusLabels.join(" · ") : "None";
  return `<div class="item-tip"><div class="item-tip-name">${escapeHtml(member.name)}</div><div class="item-tip-desc">${escapeHtml(role)}</div><div class="item-tip-desc">Stamina: ${escapeHtml(stamina)}</div><div class="item-tip-section"><span class="item-tip-label">Statuses</span><div class="item-tip-mechanics">${escapeHtml(statusLine)}</div></div></div>`;
}

function buildWorldCampTooltipHtml(data) {
  if (data && typeof data === "object" && data.kind === "units" && Array.isArray(data.units)) {
    const rolledTotal = data.units.reduce((sum, u) => sum + (typeof u.level === "number" ? u.level : 0), 0);
    const totalLv = typeof data.totalLevel === "number" ? data.totalLevel : rolledTotal;
    const rows = data.units.map((u) => {
      const name = escapeHtml(u.name);
      const lv = typeof u.level === "number" ? u.level : "?";
      const mood = escapeHtml(u.mood || "—");
      return `<div class="camp-tip-row"><span class="camp-tip-name">${name}</span><span class="camp-tip-detail">Lv ${lv} · ${mood}</span></div>`;
    });
    return `<div class="item-tip"><div class="item-tip-name">Total level ${totalLv}</div>${rows.join("")}</div>`;
  }
  if (data && typeof data === "object" && data.kind === "pool") {
    const pool = data.pool || [];
    const names = pool.map((n) => escapeHtml(n)).join(", ");
    return `<div class="item-tip"><div class="item-tip-name">Encounter</div><div class="item-tip-desc">Possible enemies: ${names || "—"}.</div><div class="item-tip-desc">Each unit rolls level and mood from its enemy definition.</div></div>`;
  }
  if (!Array.isArray(data) || !data.length) {
    return `<div class="item-tip"><div class="item-tip-desc">Encounter</div></div>`;
  }
  const rows = data.map((e) => {
    const name = escapeHtml(e.name);
    const lv = typeof e.level === "number" ? e.level : "?";
    const mood = escapeHtml(e.mood || "—");
    return `<div class="camp-tip-row"><span class="camp-tip-name">${name}</span><span class="camp-tip-detail">Lv ${lv} · ${mood}</span></div>`;
  });
  return `<div class="item-tip"><div class="item-tip-name">Encounter</div>${rows.join("")}</div>`;
}

function buildMinimapCellTooltipHtml(mx, my) {
  const d = getWorldMapData();
  if (!d || mx < 0 || my < 0 || mx >= d.width || my >= d.height) {
    return `<div class="item-tip"><div class="item-tip-name">—</div><div class="item-tip-desc">[${mx}, ${my}]</div></div>`;
  }
  const bi = getWorldBiomeIndex(mx, my);
  const biome = GAME_CONFIG.worldMap.biomes[bi];
  const nm = biome && biome.name ? biome.name : "?";
  const city = getWorldMapCityName(mx, my);
  const cityLine = city
    ? `<div class="item-tip-desc item-tip-desc--city">${escapeHtml(city)}</div>`
    : "";
  return `<div class="item-tip"><div class="item-tip-name">${escapeHtml(nm)}</div>${cityLine}<div class="item-tip-desc">[${mx}, ${my}]</div></div>`;
}

function hideItemTooltip() {
  const el = document.getElementById("itemTooltip");
  if (!el) return;
  el.classList.add("hidden");
  el.innerHTML = "";
  el.setAttribute("aria-hidden", "true");
}

const TOOLTIP_HOST_SEL =
  ".inv-cell[data-item-name], .slot-drop[data-item-name], .skill-tile[data-skill-name], [data-stat-tip], .fight-loot-cell[data-item-name], .fight-skill-btn[data-fight-skill], .fight-enemy-card[data-fight-target], .fight-ally-card[data-party-member], .minimap-cell[data-map-x], .world-camp[data-camp-enemies]";

function onContentTooltipOver(e) {
  const fightAlly = e.target.closest(".fight-ally-card[data-party-member]");
  if (fightAlly && combatState) {
    const uid = parseInt(fightAlly.getAttribute("data-party-member"), 10);
    if (!Number.isNaN(uid)) {
      const member = combatState.party.find((m) => m.uid === uid);
      if (member) {
        showTooltipHtml(buildFightPartyTooltipHtml(member, combatState), e.clientX, e.clientY);
        return;
      }
    }
  }
  const fightEnemy = e.target.closest(".fight-enemy-card[data-fight-target]");
  if (fightEnemy && combatState) {
    const uid = parseInt(fightEnemy.getAttribute("data-fight-target"), 10);
    const foe = combatState.foes.find((f) => f.uid === uid);
    if (foe) {
      showTooltipHtml(buildFightEnemyTooltipHtml(foe), e.clientX, e.clientY);
      return;
    }
  }
  const mini = e.target.closest(".minimap-cell[data-map-x]");
  if (mini) {
    const mx = parseInt(mini.getAttribute("data-map-x"), 10);
    const my = parseInt(mini.getAttribute("data-map-y"), 10);
    if (!Number.isNaN(mx) && !Number.isNaN(my)) {
      showTooltipHtml(buildMinimapCellTooltipHtml(mx, my), e.clientX, e.clientY);
      return;
    }
  }
  const wc = e.target.closest(".world-camp[data-camp-enemies]");
  if (wc) {
    const raw = wc.getAttribute("data-camp-enemies");
    if (raw) {
      try {
        const list = JSON.parse(raw);
        showTooltipHtml(buildWorldCampTooltipHtml(list), e.clientX, e.clientY);
        return;
      } catch (_) {
        /* ignore */
      }
    }
  }
  const fLoot = e.target.closest(".fight-loot-cell[data-item-name]");
  if (fLoot && fLoot.dataset.itemName) {
    showItemTooltip(fLoot.dataset.itemName, e.clientX, e.clientY);
    return;
  }
  const cell = e.target.closest(".inv-cell[data-item-name]");
  if (cell && cell.dataset.itemName) {
    showItemTooltip(cell.dataset.itemName, e.clientX, e.clientY);
    return;
  }
  const slotDrop = e.target.closest(".slot-drop[data-item-name]");
  if (slotDrop && slotDrop.dataset.itemName) {
    showItemTooltip(slotDrop.dataset.itemName, e.clientX, e.clientY);
    return;
  }
  const fightSkillBtn = e.target.closest(".fight-skill-btn[data-fight-skill]");
  if (fightSkillBtn) {
    const name = fightSkillBtn.getAttribute("data-fight-skill");
    if (name) showSkillTooltip(name, e.clientX, e.clientY);
    return;
  }
  const skillTile = e.target.closest(".skill-tile[data-skill-name]");
  if (skillTile && skillTile.dataset.skillName) {
    showSkillTooltip(skillTile.dataset.skillName, e.clientX, e.clientY);
    return;
  }
  const statRow = e.target.closest("[data-stat-tip]");
  if (statRow && statRow.dataset.statTip) {
    showStatTooltip(statRow.dataset.statTip, e.clientX, e.clientY);
    return;
  }
}

function onContentTooltipOut(e) {
  const host = e.target.closest(TOOLTIP_HOST_SEL);
  if (!host) return;
  const rt = e.relatedTarget;
  if (rt && host.contains(rt)) return;
  hideItemTooltip();
}

function onContentTooltipMove(e) {
  const el = document.getElementById("itemTooltip");
  if (!el || el.classList.contains("hidden")) return;
  if (e.target.closest(TOOLTIP_HOST_SEL)) positionItemTooltip(e.clientX, e.clientY);
}

function statBarRow(label, value, max, variant, statTipKey) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const tip = statTipKey ? ` data-stat-tip="${escapeAttr(statTipKey)}"` : "";
  return `<div class="stat-bar-row stat-tip-row"${tip}>
    <span class="stat-bar-label">${label}</span>
    <span class="stat-bar-num">${value}</span>
    <div class="stat-bar-track stat-bar-${variant}"><div class="stat-bar-fill" style="width:${pct}%"></div></div>
  </div>`;
}

function statBarRowWithSpend(label, value, max, variant, statTipKey, statKey) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const can = player.charPoints > 0 && value < STAT_CAP;
  const btn = can
    ? `<button type="button" class="stat-alloc-btn" data-char-up="${escapeAttr(statKey)}">+</button>`
    : `<span class="stat-alloc-empty" aria-hidden="true"></span>`;
  return `<div class="stat-bar-row stat-bar-row--alloc">
    <div class="stat-bar-row-main stat-tip-row" data-stat-tip="${escapeAttr(statTipKey)}">
      <span class="stat-bar-label">${label}</span>
      <span class="stat-bar-num">${value}</span>
      <div class="stat-bar-track stat-bar-${variant}"><div class="stat-bar-fill" style="width:${pct}%"></div></div>
    </div>
    ${btn}
  </div>`;
}

function buildOverviewHtml() {
  player.maxHp = computeMaxHp(player);
  const cat = categorizeInventory();
  const tabs = ["equipment", "resources", "consumables"];
  const tabLabels = { equipment: "Equipment", resources: "Resources", consumables: "Consumables" };

  let invBlock = "";
  if (inventoryTab === "equipment") invBlock = buildInventoryGridHtml(cat.equipment, "equipment");
  else if (inventoryTab === "resources") invBlock = buildInventoryGridHtml(cat.resources, "resources");
  else invBlock = buildInventoryGridHtml(cat.consumables, "consumables");

  const slotHtml = EQUIP_SLOTS.map((s) => {
    const name = player.equipment[s.id];
    const drag = name ? 'draggable="true"' : "";
    const itemAttr = name ? ` data-item-name="${escapeAttr(name)}"` : "";
    let inner = "";
    if (name) {
      const src = escapeAttr(getItemImage(name));
      inner = `<img class="slot-item-img" src="${src}" alt="" draggable="false" />`;
    } else {
      inner = `<span class="slot-placeholder">—</span>`;
    }
    return `<div class="paper-slot ${s.cls}" data-slot="${s.id}">
      <span class="slot-label">${s.label}</span>
      <div class="slot-drop" data-slot="${s.id}"${itemAttr} ${drag}>${inner}</div>
    </div>`;
  }).join("");

  const dmg = getDamageRange();
  const maxLv = getPlayerMaxLevel();
  const xpNeed = player.level >= maxLv ? 0 : xpToNextLevel(player.level);
  const xpPct =
    player.level >= maxLv ? 100 : xpNeed > 0 ? Math.min(100, (player.xp / xpNeed) * 100) : 0;
  const xpNum =
    player.level >= maxLv ? `${player.xp} (max L${maxLv})` : `${player.xp} / ${xpNeed}`;
  const hpPct = player.maxHp > 0 ? (player.hp / player.maxHp) * 100 : 0;

  const hpRow = `<div class="stat-bar-row stat-tip-row" data-stat-tip="hp">
    <span class="stat-bar-label">Hit points</span>
    <span class="stat-bar-num">${player.hp} / ${player.maxHp}</span>
    <div class="stat-bar-track stat-bar-hp"><div class="stat-bar-fill" style="width:${hpPct}%"></div></div>
  </div>`;
  const xpRow = `<div class="stat-bar-row stat-tip-row" data-stat-tip="xp">
    <span class="stat-bar-label">Experience</span>
    <span class="stat-bar-num">${xpNum}</span>
    <div class="stat-bar-track stat-bar-xp"><div class="stat-bar-fill" style="width:${xpPct}%"></div></div>
  </div>`;

  const charPointsRow = `<div class="char-points-row stat-tip-row" data-stat-tip="charPoints">
    <span class="char-points-label">Characteristic points</span>
    <span class="char-points-num">${player.charPoints}</span>
  </div>`;

  const characteristicsTabHtml = `
    ${statBarRow("Level", player.level, getPlayerMaxLevel(), "level", "level")}
    ${hpRow}
    ${xpRow}
    ${charPointsRow}
    ${statBarRowWithSpend("Strength", player.str, STAT_CAP, "str", "str", "str")}
    ${statBarRowWithSpend("Dexterity", player.dex, STAT_CAP, "dex", "dex", "dex")}
    ${statBarRowWithSpend("Vitality", player.vit, STAT_CAP, "vit", "vit", "vit")}
    ${statBarRowWithSpend("Intelligence", player.int, STAT_CAP, "int", "int", "int")}
    <div class="stat-plain-row stat-tip-row" data-stat-tip="armor">
      <span>Armor</span><strong>${getArmorDefense()}</strong>
    </div>
    <div class="stat-plain-row stat-tip-row" data-stat-tip="damage">
      <span>Damage</span><strong>${dmg.min} – ${dmg.max}</strong>
    </div>`;

  const skillsTabHtml = `<div class="skills-tab-inner">
    <div class="skills-label">Learned skills</div>
    <div class="skills-tile-wrap">
      ${player.skills
        .map(
          (s) =>
            `<button type="button" class="skill-tile" data-skill-name="${escapeAttr(s)}" title="${escapeAttr(s)}"><img class="skill-tile-img" src="${escapeAttr(getSkillImage(s))}" alt="" draggable="false" /></button>`
        )
        .join("")}
    </div>
  </div>`;

  const profIntro =
    (GAME_CONFIG.professions && GAME_CONFIG.professions.intro) ||
    "Professions will be added in a future update.";
  const professionsTabHtml = `<div class="professions-tab-inner"><p class="professions-intro">${escapeHtml(profIntro)}</p></div>`;

  let statsBodyHtml = "";
  if (overviewStatsTab === "characteristics") statsBodyHtml = characteristicsTabHtml;
  else if (overviewStatsTab === "skills") statsBodyHtml = skillsTabHtml;
  else statsBodyHtml = professionsTabHtml;

  return `
    <div class="overview-page">
      <div class="overview-grid">
        <section class="panel-cell panel-character" aria-label="Character">
          <div class="character-panel">
            <div class="nameplate-wrap">
              <div class="nameplate">${escapeHtml(player.name)}</div>
              <div class="portrait-box">
                <img src="${escapeAttr(getHeroImageForState("idle"))}" alt="" class="portrait-img" />
              </div>
              <button type="button" class="btn-rename" data-rename-hero>Change</button>
              <button type="button" class="btn-reset-char" data-reset-character title="Delete this hero and start fresh">Reset character</button>
            </div>
          </div>
        </section>
        <section class="panel-cell panel-equipment equipment-panel" aria-label="Equipment">
          <div class="equipment-panel-head">Equipment</div>
          <div class="paper-doll">
            <div class="paper-slots gladiatus-layout">${slotHtml}</div>
          </div>
        </section>
        <section class="panel-cell panel-stats" aria-label="Characteristics and skills">
          <div class="stats-panel">
            <div class="stats-panel-head">Character</div>
            <div class="stats-tabs">
              <button type="button" class="stats-tab ${overviewStatsTab === "characteristics" ? "active" : ""}" data-stats-tab="characteristics">Characteristics</button>
              <button type="button" class="stats-tab ${overviewStatsTab === "skills" ? "active" : ""}" data-stats-tab="skills">Skills</button>
              <button type="button" class="stats-tab ${overviewStatsTab === "professions" ? "active" : ""}" data-stats-tab="professions">Professions</button>
            </div>
            <div class="stats-panel-body">${statsBodyHtml}</div>
          </div>
        </section>
        <section class="panel-cell panel-inventory inventory-panel" aria-label="Inventory">
          <div class="inventory-panel-head">Inventory</div>
          <div class="inv-tabs">
            ${tabs
              .map(
                (t) =>
                  `<button type="button" class="inv-tab ${inventoryTab === t ? "active" : ""}" data-inv-tab="${t}">${tabLabels[t]}</button>`
              )
              .join("")}
          </div>
          <div class="inv-grid-wrap">${invBlock}</div>
          <div class="currency-bar">Gold: <strong>${player.gold}</strong></div>
        </section>
      </div>
    </div>
  `;
}

function renderOverview() {
  const c = document.getElementById("content");
  c.innerHTML = buildOverviewHtml();
}

function isCharacterPanelOpen() {
  const modal = document.getElementById("characterPanelModal");
  return !!(modal && !modal.classList.contains("hidden"));
}

function renderCharacterPanelContent() {
  const host = document.getElementById("characterPanelContent");
  if (!host || !isCharacterPanelOpen()) return;
  host.innerHTML = buildOverviewHtml();
}

function openCharacterPanel() {
  closeMenuPanel();
  const modal = document.getElementById("characterPanelModal");
  if (!modal) return;
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  renderCharacterPanelContent();
  renderBottomHud();
}

function closeCharacterPanel() {
  hideItemTooltip();
  const modal = document.getElementById("characterPanelModal");
  if (!modal) return;
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
  const host = document.getElementById("characterPanelContent");
  if (host) host.innerHTML = "";
  renderBottomHud();
}

function isMenuPanelOpen() {
  const modal = document.getElementById("menuPanelModal");
  return !!(modal && !modal.classList.contains("hidden"));
}

function getMenuPanelMeta(kind) {
  if (kind === "arena") return { title: "Arena", lead: "To be defined later." };
  if (kind === "alliance") return { title: "Alliance", lead: "Coming soon." };
  if (kind === "market") return { title: "Market", lead: "Coming soon." };
  return null;
}

function buildMenuPanelHtml(kind) {
  const meta = getMenuPanelMeta(kind);
  if (!meta) return '<div class="game-page"><p class="game-page-lead muted">Panel unavailable.</p></div>';
  return `<div class="game-page"><h1 class="game-page-title">${escapeHtml(meta.title)}</h1><p class="game-page-lead muted">${escapeHtml(
    meta.lead
  )}</p></div>`;
}

function renderMenuPanelContent() {
  const host = document.getElementById("menuPanelContent");
  if (!host || !isMenuPanelOpen()) return;
  host.innerHTML = buildMenuPanelHtml(activeMenuPanel);
}

function openMenuPanel(kind) {
  const meta = getMenuPanelMeta(kind);
  if (!meta) return;
  closeCharacterPanel();
  const modal = document.getElementById("menuPanelModal");
  const title = document.getElementById("menuPanelTitle");
  if (!modal) return;
  activeMenuPanel = kind;
  if (title) title.textContent = meta.title;
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  renderMenuPanelContent();
  renderBottomHud();
}

function closeMenuPanel() {
  const modal = document.getElementById("menuPanelModal");
  if (!modal) return;
  hideItemTooltip();
  activeMenuPanel = null;
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
  const host = document.getElementById("menuPanelContent");
  if (host) host.innerHTML = "";
  renderBottomHud();
}

function toggleMenuPanel(kind) {
  if (isMenuPanelOpen() && activeMenuPanel === kind) closeMenuPanel();
  else openMenuPanel(kind);
}

function clearAdventureRespawnTimer() {
  if (adventureRespawnTick) {
    clearInterval(adventureRespawnTick);
    adventureRespawnTick = null;
  }
  clearAdventureCampWanderTimer();
}

function getMobPanelWanderMs() {
  const n = GAME_CONFIG.worldMap && typeof GAME_CONFIG.worldMap.mobPanelWanderMs === "number" ? GAME_CONFIG.worldMap.mobPanelWanderMs : 60000;
  return Math.max(3000, Math.floor(n));
}

function getMobPanelLayoutMarginFrac() {
  const wm = GAME_CONFIG.worldMap;
  const n = wm && typeof wm.mobPanelLayoutMarginPct === "number" ? wm.mobPanelLayoutMarginPct : 14;
  return Math.max(0.04, Math.min(0.38, n / 100));
}

function getMobPanelMinCenterDistFrac() {
  const wm = GAME_CONFIG.worldMap;
  const n = wm && typeof wm.mobPanelMinCenterDistPct === "number" ? wm.mobPanelMinCenterDistPct : 22;
  return Math.max(0.06, Math.min(0.5, n / 100));
}

function campPanelLayoutCacheKey(x, y, slotCount) {
  return `${worldMapKey(x, y)}|${slotCount}`;
}

/**
 * Random panel positions (center %) for this map tile; changes each wander bucket (see getMobPanelWanderMs).
 * Keeps centers away from edges and apart (rejection sampling; grid fallback if needed).
 */
function layoutWorldCampPositions(x, y, slotCount, wanderMs) {
  const ms = wanderMs;
  const bucket = ms <= 0 ? 0 : Math.floor(Date.now() / ms);
  let margin = getMobPanelLayoutMarginFrac();
  let minDist = getMobPanelMinCenterDistFrac();
  const lo = margin;
  const hi = 1 - margin;
  const span = Math.max(0.01, hi - lo);
  const gridN = Math.max(1, Math.ceil(Math.sqrt(slotCount)));
  const gridStep = span / (gridN + 1);
  minDist = Math.min(minDist, gridStep * 0.92);

  const out = [];
  const maxAttempts = 120;

  for (let si = 0; si < slotCount; si++) {
    let seed =
      ((x * 73856093) ^ (y * 19349663) ^ (bucket * 0x9e3779b9) ^ (slotCount * 0x45d9f3b3) ^ (si * 0x27d4eb2d)) >>> 0;
    const rnd = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 0xffffffff;
    };
    const minDistSq = minDist * minDist;
    let placed = false;
    let cx = lo + span * 0.5;
    let cy = lo + span * 0.5;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      cx = lo + rnd() * span;
      cy = lo + rnd() * span;
      let ok = true;
      for (let j = 0; j < out.length; j++) {
        const dx = cx - out[j].leftFrac;
        const dy = cy - out[j].topFrac;
        if (dx * dx + dy * dy < minDistSq) {
          ok = false;
          break;
        }
      }
      if (ok) {
        placed = true;
        break;
      }
    }
    if (!placed) {
      const ix = si % gridN;
      const iy = Math.floor(si / gridN);
      cx = lo + gridStep * (ix + 1);
      cy = lo + gridStep * (iy + 1);
      let bump = 0;
      while (bump < gridN * gridN) {
        let clash = false;
        for (let j = 0; j < out.length; j++) {
          const dx = cx - out[j].leftFrac;
          const dy = cy - out[j].topFrac;
          if (dx * dx + dy * dy < minDistSq) {
            clash = true;
            break;
          }
        }
        if (!clash) break;
        bump++;
        const bi = (si + bump) % (gridN * gridN);
        const bix = bi % gridN;
        const biy = Math.floor(bi / gridN);
        cx = lo + gridStep * (bix + 1);
        cy = lo + gridStep * (biy + 1);
      }
    }
    out.push({ leftFrac: cx, topFrac: cy });
  }

  return out.map((p) => ({
    leftPct: Math.round(p.leftFrac * 10000) / 100,
    topPct: Math.round(p.topFrac * 10000) / 100
  }));
}

/** Same positions for (x,y,slots) until the wander time bucket advances — not on every render. */
function getCachedCampPanelPositions(x, y, slotCount) {
  const wanderMs = getMobPanelWanderMs();
  const bucket = Math.floor(Date.now() / wanderMs);
  const key = campPanelLayoutCacheKey(x, y, slotCount);
  const prev = campPanelLayoutCache.get(key);
  if (prev && prev.bucket === bucket && Array.isArray(prev.positions) && prev.positions.length === slotCount) {
    return prev.positions;
  }
  const positions = layoutWorldCampPositions(x, y, slotCount, wanderMs);
  campPanelLayoutCache.set(key, { bucket, positions });
  return positions;
}

function applyWorldCampPositionsToDom() {
  const root = document.getElementById("adventurePageRoot");
  if (!root || currentPage !== "adventure") return;
  const cells = root.querySelectorAll(".world-camps--spread .world-camp[data-world-camp]");
  const n = cells.length;
  if (!n) return;
  const x = player.worldMap.x;
  const y = player.worldMap.y;
  const wanderMs = getMobPanelWanderMs();
  const positions = layoutWorldCampPositions(x, y, n, wanderMs);
  campPanelLayoutCache.set(campPanelLayoutCacheKey(x, y, n), {
    bucket: Math.floor(Date.now() / wanderMs),
    positions
  });
  cells.forEach((el, i) => {
    const p = positions[i];
    if (!p) return;
    el.style.left = `${p.leftPct}%`;
    el.style.top = `${p.topPct}%`;
  });
}

function clearAdventureCampWanderTimer() {
  if (adventureCampWanderTick) {
    clearInterval(adventureCampWanderTick);
    adventureCampWanderTick = null;
  }
}

/** Enables CSS transitions and starts the wander interval only after layout has settled (avoids animating initial positions). */
function startAdventureCampWanderTimer() {
  clearAdventureCampWanderTimer();
  const wanderMs = getMobPanelWanderMs();
  const gen = ++adventureWanderStartGen;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (currentPage !== "adventure" || gen !== adventureWanderStartGen) return;
      const wrap = document.querySelector("#adventurePageRoot .world-camps--spread");
      if (!wrap) return;
      wrap.classList.add("world-camps--spread--ready");
      adventureCampWanderTick = setInterval(() => {
        if (currentPage !== "adventure") {
          clearAdventureCampWanderTimer();
          return;
        }
        applyWorldCampPositionsToDom();
      }, wanderMs);
    });
  });
}

function syncWorldMapCanvasWrapSize() {
  const scroll = document.getElementById("worldMapModalScroll");
  const wrap = document.getElementById("worldMapModalCanvasWrap");
  const canvas = document.getElementById("worldMapCanvas");
  if (!scroll || !wrap || !canvas) return;
  const sw = scroll.clientWidth;
  const sh = scroll.clientHeight;
  const cw = canvas.width;
  const ch = canvas.height;
  wrap.style.minWidth = `${Math.max(sw, cw)}px`;
  wrap.style.minHeight = `${Math.max(sh, ch)}px`;
}

function computeWorldMapModalInitialCellPx() {
  const scroll = document.getElementById("worldMapModalScroll");
  const d = getWorldMapData();
  if (!scroll || !d) return 8;
  const vw = Math.max(1, scroll.clientWidth);
  const vh = Math.max(1, scroll.clientHeight);
  const span = 2 * WORLD_MAP_MODAL_NEIGHBOR_RADIUS + 1;
  const fitWindow = Math.min(vw / (span * WORLD_MAP_CELL_WIDTH_PER_HEIGHT), vh / span) * 0.98;
  const { min, max } = worldMapModalMinMaxCellPx();
  return Math.min(max, Math.max(min, fitWindow));
}

function tickAdventureRespawnOnly() {
  if (currentPage !== "adventure") return;
  const root = document.getElementById("adventurePageRoot");
  if (!root) return;
  const x = player.worldMap.x;
  const y = player.worldMap.y;
  const biome = getWorldBiomeDefAt(x, y);
  const pool = biome.possibleEnemies || [];
  const cellCfg = getCoordinateCellConfig(x, y);
  if (!biome.passable || cellCfg.kind === "scene" || !pool.length) return;
  const encounterSlots = getEncounterSlotCountForCell(x, y, cellCfg);
  const key = worldMapKey(x, y);
  const rec = player.worldMap.cells[key];
  const defArr = rec && Array.isArray(rec.defeated) ? rec.defeated : [];
  const ms = GAME_CONFIG.worldMap.mobRespawnMs;
  let needRefresh = false;
  for (let si = 0; si < encounterSlots; si++) {
    const t = defArr[si];
    if (t != null && Date.now() - t >= ms) needRefresh = true;
  }
  for (let si = 0; si < encounterSlots; si++) {
    isWorldMobSetDefeated(x, y, si);
  }
  if (needRefresh) renderAdventure();
}

function isWorldMapModalOpen() {
  const el = document.getElementById("worldMapModal");
  return !!(el && !el.classList.contains("hidden"));
}

function isFightOverlayOpen() {
  const el = document.getElementById("fightOverlay");
  return !!(el && !el.classList.contains("hidden"));
}

function worldMapModalMinMaxCellPx() {
  const scroll = document.getElementById("worldMapModalScroll");
  const d = getWorldMapData();
  if (!scroll || !d) return { min: 1, max: 40 };
  const vw = Math.max(1, scroll.clientWidth);
  const vh = Math.max(1, scroll.clientHeight);
  const minFit = Math.min(vw / (d.width * WORLD_MAP_CELL_WIDTH_PER_HEIGHT), vh / d.height) * 0.98;
  return { min: Math.max(WORLD_MAP_MODAL_MIN_CELL_HEIGHT_PX, minFit), max: 40 };
}

function updateWorldMapZoomValueDisplay() {
  const el = document.getElementById("worldMapZoomValue");
  if (!el) return;
  const { cellW, cellH } = worldMapModalCellDims();
  const w = Math.round(cellW * 10) / 10;
  const h = Math.round(cellH * 10) / 10;
  el.textContent = `${w}×${h}px`;
}

/**
 * Zoom the world map modal around the viewport center (same idea as scroll wheel).
 * @param {number} factor e.g. WORLD_MAP_MODAL_ZOOM_STEP or 1/WORLD_MAP_MODAL_ZOOM_STEP
 */
function applyWorldMapModalZoom(factor) {
  if (!isWorldMapModalOpen()) return;
  const scroll = document.getElementById("worldMapModalScroll");
  const d = getWorldMapData();
  if (!scroll || !d) return;
  const oldH = worldMapModalCellPx;
  const oldW = oldH * WORLD_MAP_CELL_WIDTH_PER_HEIGHT;
  const { min, max } = worldMapModalMinMaxCellPx();
  worldMapModalCellPx = Math.min(max, Math.max(min, oldH * factor));
  const mapPixelW = d.width * oldW;
  const mapPixelH = d.height * oldH;
  const centerPxX = scroll.scrollLeft + scroll.clientWidth / 2;
  const centerPxY = scroll.scrollTop + scroll.clientHeight / 2;
  const fracX = mapPixelW > 0 ? centerPxX / mapPixelW : 0.5;
  const fracY = mapPixelH > 0 ? centerPxY / mapPixelH : 0.5;
  drawWorldMapCanvas();
  const newH = worldMapModalCellPx;
  const newW = newH * WORLD_MAP_CELL_WIDTH_PER_HEIGHT;
  const newMapPixelW = d.width * newW;
  const newMapPixelH = d.height * newH;
  const newCenterPxX = fracX * newMapPixelW;
  const newCenterPxY = fracY * newMapPixelH;
  scroll.scrollLeft = Math.max(0, Math.min(scroll.scrollWidth - scroll.clientWidth, newCenterPxX - scroll.clientWidth / 2));
  scroll.scrollTop = Math.max(0, Math.min(scroll.scrollHeight - scroll.clientHeight, newCenterPxY - scroll.clientHeight / 2));
}

/** Map pointer position to tile indices; works when the canvas element is scaled by CSS vs its bitmap size. */
function worldMapCanvasPointerToTile(clientX, clientY) {
  const canvas = document.getElementById("worldMapCanvas");
  if (!canvas) return { mx: -1, my: -1 };
  const rect = canvas.getBoundingClientRect();
  const rw = Math.max(1, rect.width);
  const rh = Math.max(1, rect.height);
  const cw = canvas.width;
  const ch = canvas.height;
  const { cellW, cellH } = worldMapModalCellDims();
  const mx = Math.floor(((clientX - rect.left) / rw) * (cw / cellW));
  const my = Math.floor(((clientY - rect.top) / rh) * (ch / cellH));
  return { mx, my };
}

/** Parse #RRGGBB for luminance (matches tools/build_world_map_texture.py region labels). */
function parseHexColorRgb(hex) {
  const s = String(hex || "").trim();
  if (s[0] === "#" && s.length === 7) {
    const r = parseInt(s.slice(1, 3), 16);
    const g = parseInt(s.slice(3, 5), 16);
    const b = parseInt(s.slice(5, 7), 16);
    if (!Number.isNaN(r + g + b)) return [r, g, b];
  }
  return [128, 128, 128];
}

/** Same fill/stroke pairing as render_biome_labels_rgba in build_world_map_texture.py */
function worldMapRegionLabelColorsForCentroid(ax, ay) {
  const bi = getWorldBiomeIndex(Math.floor(ax + 0.5), Math.floor(ay + 0.5));
  const b = GAME_CONFIG.worldMap.biomes[bi];
  const [r, g, bch] = parseHexColorRgb(b && b.color);
  const lum = 0.299 * r + 0.587 * g + 0.114 * bch;
  if (lum > 145) {
    return { fill: "rgb(28,22,16)", stroke: "rgb(252,248,238)" };
  }
  return { fill: "rgb(238,232,218)", stroke: "rgb(12,10,8)" };
}

/** City names on the full world map modal — Cinzel 600; placed just under the city ink (see draw_medieval_city_icon). */
function drawWorldMapCityLabels(ctx, cellW, cellH) {
  const cities = getWorldMapCityCentroids();
  if (!cities.length) return;
  const fontPx = Math.max(12, Math.min(26, Math.round(cellH * 0.48)));
  ctx.save();
  ctx.font = `600 ${fontPx}px Cinzel, serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  const strokeW = fontPx >= 12 ? Math.max(2, Math.round(fontPx * 0.11)) : 1;
  /** Matches tools/build_world_map_texture.py: cy at cell center, h = max(9, ch*0.88), halo to cy + h*0.62 */
  const iconHPx = Math.max(9, cellH * 0.88);
  const gapPx = Math.max(2, Math.round(cellH * 0.035));
  for (const c of cities) {
    const px = c.ax * cellW + cellW / 2;
    const iconCy = c.ay * cellH + cellH / 2;
    const drawingBottomY = iconCy + iconHPx * 0.62;
    const py = drawingBottomY + gapPx;
    const { fill, stroke } = worldMapRegionLabelColorsForCentroid(c.ax, c.ay);
    ctx.lineJoin = "round";
    ctx.lineWidth = strokeW;
    ctx.strokeStyle = stroke;
    ctx.strokeText(c.name, px, py);
    ctx.fillStyle = fill;
    ctx.fillText(c.name, px, py);
  }
  ctx.restore();
}

function drawWorldMapCanvas() {
  const canvas = document.getElementById("worldMapCanvas");
  const d = getWorldMapData();
  if (!canvas || !d) return;
  ensureBiomeTexturesPreloaded();
  const { min, max } = worldMapModalMinMaxCellPx();
  worldMapModalCellPx = Math.min(max, Math.max(min, worldMapModalCellPx));
  const { cellW, cellH } = worldMapModalCellDims();
  const w = Math.ceil(d.width * cellW);
  const h = Math.ceil(d.height * cellH);
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  getBiomeRegionsCache(d);
  ctx.imageSmoothingEnabled = true;
  const fullImg = getBiomeTextureImageIfReady(WORLD_MAP_FULL_TEXTURE_URL);
  requestBiomeTextureLoad(WORLD_MAP_FULL_TEXTURE_URL);
  if (fullImg && (fullImg.naturalWidth || fullImg.width)) {
    ctx.drawImage(fullImg, 0, 0, w, h);
    const labelsImg = getBiomeTextureImageIfReady(WORLD_MAP_LABELS_OVERLAY_URL);
    requestBiomeTextureLoad(WORLD_MAP_LABELS_OVERLAY_URL);
    if (labelsImg && (labelsImg.naturalWidth || labelsImg.width)) {
      ctx.drawImage(labelsImg, 0, 0, w, h);
    }
  } else {
    for (let my = 0; my < d.height; my++) {
      for (let mx = 0; mx < d.width; mx++) {
        const plan = getMapCellTexturePlanForCell(mx, my, cellW, cellH);
        drawMapCellFromTexturePlan(ctx, mx, my, plan);
      }
    }
    drawWorldMapTransitionOverlays(ctx, d, cellW, cellH);
  }
  drawWorldMapCityLabels(ctx, cellW, cellH);
  ctx.imageSmoothingEnabled = false;
  const px = player.worldMap.x;
  const py = player.worldMap.y;
  ctx.strokeStyle = "rgba(255,255,255,0.95)";
  ctx.lineWidth = Math.max(1.5, cellH * 0.18);
  ctx.strokeRect(px * cellW + 1, py * cellH + 1, Math.max(1, cellW - 2), Math.max(1, cellH - 2));
  syncWorldMapCanvasWrapSize();
  updateWorldMapZoomValueDisplay();
  enqueueViewportTileProbes();
}

function scrollWorldMapModalToPlayer() {
  const scroll = document.getElementById("worldMapModalScroll");
  const d = getWorldMapData();
  if (!scroll || !d) return;
  const { cellW, cellH } = worldMapModalCellDims();
  const cx = player.worldMap.x * cellW + cellW / 2;
  const cy = player.worldMap.y * cellH + cellH / 2;
  scroll.scrollLeft = Math.max(0, Math.min(scroll.scrollWidth - scroll.clientWidth, cx - scroll.clientWidth / 2));
  scroll.scrollTop = Math.max(0, Math.min(scroll.scrollHeight - scroll.clientHeight, cy - scroll.clientHeight / 2));
}

function openWorldMapModal() {
  const modal = document.getElementById("worldMapModal");
  if (!modal) return;
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  const drawOnce = () => {
    if (!worldMapModalZoomInitialized) {
      const { min, max } = worldMapModalMinMaxCellPx();
      const base = computeWorldMapModalInitialCellPx();
      worldMapModalCellPx = Math.min(max, Math.max(min, base * WORLD_MAP_MODAL_FIRST_OPEN_ZOOM_MULT));
      worldMapModalZoomInitialized = true;
    }
    drawWorldMapCanvas();
    scrollWorldMapModalToPlayer();
  };
  const runDraw = () => {
    if (document.fonts && document.fonts.load) {
      const fs = Math.max(14, Math.min(28, worldMapModalCellPx * 0.55));
      document.fonts.load(`600 ${fs}px Cinzel`).then(drawOnce, drawOnce);
    } else {
      drawOnce();
    }
  };
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      runDraw();
      const scroll = document.getElementById("worldMapModalScroll");
      if (scroll && scroll.clientWidth < 8) setTimeout(runDraw, 150);
    });
  });
}

function closeWorldMapModal() {
  hideItemTooltip();
  const modal = document.getElementById("worldMapModal");
  if (!modal) return;
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
}

function onWorldMapModalWheel(e) {
  if (!isWorldMapModalOpen()) return;
  const scroll = document.getElementById("worldMapModalScroll");
  if (!scroll || !scroll.contains(e.target)) return;
  e.preventDefault();
  const factor = e.deltaY > 0 ? 1 / WORLD_MAP_MODAL_ZOOM_STEP : WORLD_MAP_MODAL_ZOOM_STEP;
  applyWorldMapModalZoom(factor);
}

function initWorldMapModal() {
  const scroll = document.getElementById("worldMapModalScroll");
  const closeBtn = document.getElementById("worldMapModalClose");
  if (!scroll) return;

  scroll.addEventListener("wheel", onWorldMapModalWheel, { passive: false });

  if (!scroll._mapArtScrollBound) {
    scroll._mapArtScrollBound = true;
    scroll.addEventListener(
      "scroll",
      () => {
        if (isWorldMapModalOpen()) enqueueViewportTileProbes();
      },
      { passive: true }
    );
  }

  let drag = false;
  let lx = 0;
  let ly = 0;
  scroll.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    drag = true;
    lx = e.clientX;
    ly = e.clientY;
    scroll.classList.add("world-map-modal-scroll--dragging");
  });
  window.addEventListener("mousemove", (e) => {
    if (!drag) return;
    scroll.scrollLeft -= e.clientX - lx;
    scroll.scrollTop -= e.clientY - ly;
    lx = e.clientX;
    ly = e.clientY;
  });
  window.addEventListener("mouseup", () => {
    if (!drag) return;
    drag = false;
    scroll.classList.remove("world-map-modal-scroll--dragging");
  });

  if (closeBtn) closeBtn.onclick = () => closeWorldMapModal();

  const zoomIn = document.getElementById("worldMapZoomIn");
  const zoomOut = document.getElementById("worldMapZoomOut");
  if (zoomIn) zoomIn.onclick = () => applyWorldMapModalZoom(WORLD_MAP_MODAL_ZOOM_STEP);
  if (zoomOut) zoomOut.onclick = () => applyWorldMapModalZoom(1 / WORLD_MAP_MODAL_ZOOM_STEP);

  const canvas = document.getElementById("worldMapCanvas");
  if (canvas) {
    canvas.addEventListener("mousemove", (e) => {
      if (!isWorldMapModalOpen()) return;
      const { mx, my } = worldMapCanvasPointerToTile(e.clientX, e.clientY);
      showTooltipHtml(buildMinimapCellTooltipHtml(mx, my), e.clientX, e.clientY);
    });
    canvas.addEventListener("mouseleave", () => {
      hideItemTooltip();
    });
  }

  window.addEventListener("resize", () => {
    if (!isWorldMapModalOpen()) return;
    drawWorldMapCanvas();
    scrollWorldMapModalToPlayer();
  });
}

function onDocumentKeydown(e) {
  if (e.key === "Escape" && isCharacterPanelOpen()) {
    e.preventDefault();
    closeCharacterPanel();
    return;
  }
  if (e.key === "Escape" && isMenuPanelOpen()) {
    e.preventDefault();
    closeMenuPanel();
    return;
  }
  if (e.key === "Escape" && isWorldMapModalOpen()) {
    e.preventDefault();
    closeWorldMapModal();
    return;
  }
  if (e.target && e.target.closest && e.target.closest("input, textarea, select")) return;
  if (currentPage !== "adventure") return;
  if (isFightOverlayOpen()) return;
  const k = String(e.key || "").toLowerCase();
  if (k === "c") {
    e.preventDefault();
    if (isWorldMapModalOpen()) return;
    if (isCharacterPanelOpen()) closeCharacterPanel();
    else openCharacterPanel();
    return;
  }
  if (k === "a" || k === "g" || k === "b") {
    e.preventDefault();
    if (isWorldMapModalOpen()) return;
    if (k === "a") toggleMenuPanel("arena");
    else if (k === "g") toggleMenuPanel("alliance");
    else toggleMenuPanel("market");
    return;
  }
  if (k === "r" && e.shiftKey) {
    e.preventDefault();
    reloadMonsters({ resetDefeated: false });
    return;
  }
  if (k === "h" && e.shiftKey) {
    e.preventDefault();
    player.hp = player.maxHp;
    save();
    render();
    return;
  }
  if (k !== "m") return;
  if (isCharacterPanelOpen() || isMenuPanelOpen()) return;
  e.preventDefault();
  if (isWorldMapModalOpen()) closeWorldMapModal();
  else openWorldMapModal();
}

function buildMinimapHtml(px, py) {
  const d = getWorldMapData();
  if (!d) return "";
  ensureBiomeTexturesPreloaded();
  const cells = [];
  for (let dy = -5; dy <= 5; dy++) {
    for (let dx = -5; dx <= 5; dx++) {
      const nx = px + dx;
      const ny = py + dy;
      const isYou = dx === 0 && dy === 0;
      const styleCss =
        nx >= 0 && ny >= 0 && nx < d.width && ny < d.height ? getMinimapCellBackgroundCss(nx, ny) : "background:#1a1a1a";
      cells.push(
        `<div class="minimap-cell${isYou ? " minimap-cell--you" : ""}" style="${escapeAttr(styleCss)}" data-map-x="${nx}" data-map-y="${ny}"></div>`
      );
    }
  }
  return `<div class="minimap-grid" aria-label="Minimap: 5 cells each direction">${cells.join("")}</div>`;
}

function renderAdventure() {
  clearAdventureRespawnTimer();
  const c = document.getElementById("content");
  const d = getWorldMapData();
  if (!d) {
    c.innerHTML =
      '<div class="game-page"><h1 class="game-page-title">Adventure</h1><p class="game-page-lead muted">World map data missing. Add <code>world_map_data.js</code> before <code>config.js</code> in index.html and run <code>tools/export_world_map.py</code> after editing World_map.xlsx.</p></div>';
    return;
  }
  ensureBiomeTexturesPreloaded();
  ensureWorldMapPosition();
  const x = player.worldMap.x;
  const y = player.worldMap.y;
  rebuildCityPortalCoordsFromWorld();
  const biome = getWorldBiomeDefAt(x, y);
  const nOk = canEnterMap(x, y - 1);
  const sOk = canEnterMap(x, y + 1);
  const eOk = canEnterMap(x + 1, y);
  const wOk = canEnterMap(x - 1, y);

  const navBtn = (dir, label, enabled, extraClass) =>
    `<button type="button" class="world-nav-btn ${extraClass || ""}${enabled ? "" : " world-nav-btn--disabled"}" ${
      enabled ? `data-world-nav="${dir}"` : "disabled"
    } aria-label="${escapeAttr(label)}">${label}</button>`;

  let campsHtml = "";
  let worldCampsClass = "world-camps";
  const pool = biome.possibleEnemies || [];
  const cellCfg = getCoordinateCellConfig(x, y);
  if (!biome.passable) {
    campsHtml = `<p class="world-camps-none muted">This land cannot be crossed.</p>`;
  } else if (cellCfg.kind === "scene") {
    const sceneBundle = buildAdventureSceneHtml(x, y, cellCfg);
    campsHtml = sceneBundle.html;
    if (sceneBundle.hasAnchoredObjects) worldCampsClass = "world-camps world-camps--spread world-camps--scene";
  } else if (!pool.length) {
    campsHtml = `<p class="world-camps-none muted">This land cannot be crossed.</p>`;
  } else {
    const encounterSlots = getEncounterSlotCountForCell(x, y, cellCfg);
    if (encounterSlots === 0) {
      campsHtml = getWorldMapCityName(x, y)
        ? ""
        : `<p class="world-camps-none muted">No hostile encounters here.</p>`;
    } else {
      let visibleCount = 0;
      for (let si = 0; si < encounterSlots; si++) {
        if (!slotIsWorldMobOnRespawnCooldown(x, y, si)) visibleCount++;
      }
      const campPos = visibleCount > 0 ? getCachedCampPanelPositions(x, y, visibleCount) : [];
      if (visibleCount > 0) worldCampsClass = "world-camps world-camps--spread";
      const campPosStyle = (idx) => {
        const p = campPos[idx];
        return p ? ` style="left:${p.leftPct}%;top:${p.topPct}%;transform:translate(-50%,-50%);"` : "";
      };
      let ri = 0;
      for (let si = 0; si < encounterSlots; si++) {
        if (slotIsWorldMobOnRespawnCooldown(x, y, si)) continue;
        isWorldMobSetDefeated(x, y, si);
        const preview = ensureMobPreview(x, y, si);
        const thumbsActive =
          preview && preview.units && preview.units.length ? buildWorldCampMobThumbsHtmlFromUnits(preview.units) : "";
        const tipPayload =
          preview && preview.units && preview.units.length
            ? {
                kind: "units",
                tier: preview.difficultyTier || MOB_DIFFICULTY_TIER_LABELS[si % 3],
                totalLevel:
                  typeof preview.mobTotalLevel === "number"
                    ? preview.mobTotalLevel
                    : preview.units.reduce((s, u) => s + (typeof u.level === "number" ? u.level : 0), 0),
                units: preview.units.map((u) => ({ name: u.name, level: u.level, mood: u.moodName }))
              }
            : { kind: "pool", pool: pool.slice(), min: MOB_SIZE_MIN, max: MOB_SIZE_MAX };
        const campPayload = escapeAttr(JSON.stringify(tipPayload));
        const ariaTier =
          preview && preview.units && preview.units.length
            ? preview.difficultyTier || MOB_DIFFICULTY_TIER_LABELS[si % 3]
            : "encounter";
        campsHtml += `<div class="mob-cell world-camp" data-world-camp="${si}" data-camp-enemies="${campPayload}" data-world-fight="${si}" aria-label="${escapeAttr(
          `${ariaTier} encounter ${si + 1}`
        )}"${campPosStyle(ri)}>
        <div class="mob-imgs mob-imgs--world">${thumbsActive}</div>
      </div>`;
        ri++;
      }
    }
  }

  const coordBgUrl = getCoordinateBackgroundUrl(x, y);
  const cityHudName = getWorldMapCityName(x, y);
  const adventureLocationLine = cityHudName
    ? `${cityHudName} (${biome.name})`
    : biome.name;

  c.innerHTML = `
    <div class="adventure-page" id="adventurePageRoot">
      <div class="adventure-bg-stack" id="adventureBgStack" aria-hidden="true">
        <img class="adventure-bg-layer" id="adventureBgLayerA" alt="" draggable="false" decoding="async" />
        <img class="adventure-bg-layer" id="adventureBgLayerB" alt="" draggable="false" decoding="async" />
      </div>
      <div class="adventure-hud-top">
        <span class="adventure-biome-name">${escapeHtml(adventureLocationLine)}</span>
        <span class="adventure-coords">[${x}, ${y}]</span>
      </div>
      ${navBtn("north", "▲", nOk, "world-nav-btn--edge world-nav-btn--north")}
      ${navBtn("south", "▼", sOk, "world-nav-btn--edge world-nav-btn--south")}
      ${navBtn("east", "▶", eOk, "world-nav-btn--edge world-nav-btn--east")}
      ${navBtn("west", "◀", wOk, "world-nav-btn--edge world-nav-btn--west")}
      <div class="adventure-body">
        <div class="${worldCampsClass}">${campsHtml}</div>
      </div>
    </div>`;
  hydrateSpriteAnimations(c);

  const pageRoot = document.getElementById("adventurePageRoot");
  if (pageRoot) {
    const tw =
      GAME_CONFIG.worldMap && typeof GAME_CONFIG.worldMap.mobPanelWanderTransitionMs === "number"
        ? GAME_CONFIG.worldMap.mobPanelWanderTransitionMs
        : 1400;
    pageRoot.style.setProperty("--mob-wander-transition", `${Math.max(0, tw)}ms`);
  }

  const stackEl = document.getElementById("adventureBgStack");
  const la0 = document.getElementById("adventureBgLayerA");
  const lb0 = document.getElementById("adventureBgLayerB");
  if (stackEl && la0 && lb0 && adventureBgLastUrl) {
    const front = adventureBgActiveLayer === 0 ? la0 : lb0;
    const back = adventureBgActiveLayer === 0 ? lb0 : la0;
    front.src = adventureBgLastUrl;
    front.classList.toggle("adventure-bg-layer--city", adventureBgLastIsCity);
    front.classList.add("adventure-bg--visible", "adventure-bg-layer--visible");
    back.classList.remove("adventure-bg-layer--visible", "adventure-bg--visible", "adventure-bg-layer--city");
    back.removeAttribute("src");
    front.style.zIndex = "1";
    back.style.zIndex = "0";
    stackEl.classList.add("adventure-bg-stack--ready");
  }

  resolveAdventureBackgroundUrl(x, y, coordBgUrl, (url, isCityArt) => crossfadeAdventureBackground(url, isCityArt));

  applyPortalImageFallbacks(c);

  c.querySelectorAll("[data-world-nav]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const dir = btn.getAttribute("data-world-nav");
      if (dir === "north") moveWorldMap(0, -1);
      else if (dir === "south") moveWorldMap(0, 1);
      else if (dir === "east") moveWorldMap(1, 0);
      else if (dir === "west") moveWorldMap(-1, 0);
    });
  });
  c.querySelectorAll("[data-world-fight]").forEach((el) => {
    el.addEventListener("click", () => {
      const si = parseInt(el.getAttribute("data-world-fight"), 10);
      if (!Number.isNaN(si)) startWorldMapFight(si);
    });
  });

  scheduleMinimapArtProbes(x, y);

  if (isWorldMapModalOpen()) {
    drawWorldMapCanvas();
    scrollWorldMapModalToPlayer();
  }

  adventureRespawnTick = setInterval(() => {
    if (currentPage !== "adventure") {
      clearAdventureRespawnTimer();
      return;
    }
    tickAdventureRespawnOnly();
  }, 1000);

  if (worldCampsClass.includes("world-camps--spread") && !worldCampsClass.includes("world-camps--scene")) {
    startAdventureCampWanderTimer();
  } else {
    clearAdventureCampWanderTimer();
  }
}

function renderBottomHud() {
  const hpFill = document.getElementById("bottomHudHpFill");
  const hpText = document.getElementById("bottomHudHpText");
  const nameEl = document.getElementById("bottomHudName");
  if (nameEl) nameEl.textContent = player.name || "Hero";
  const hpPct = player.maxHp > 0 ? Math.max(0, Math.min(100, (player.hp / player.maxHp) * 100)) : 0;
  if (hpFill) hpFill.style.width = `${hpPct.toFixed(1)}%`;
  if (hpText) hpText.textContent = `${Math.max(0, Math.floor(player.hp))} / ${Math.max(1, Math.floor(player.maxHp))} HP`;
  const portraitEl = document.getElementById("bottomHudPortrait");
  if (portraitEl && "src" in portraitEl) {
    let heroState = "idle";
    if (combatState && combatState.phase !== "ended") heroState = getCombatHeroVisualState();
    else if (currentPage === "adventure") heroState = "walk";
    portraitEl.src = getHeroImageForState(heroState);
  }

  const characterBtn = document.getElementById("characterPanelBtn");
  if (characterBtn) characterBtn.classList.toggle("is-active", isCharacterPanelOpen());
  const arenaBtn = document.getElementById("arenaPanelBtn");
  if (arenaBtn) arenaBtn.classList.toggle("is-active", isMenuPanelOpen() && activeMenuPanel === "arena");
  const allianceBtn = document.getElementById("alliancePanelBtn");
  if (allianceBtn) allianceBtn.classList.toggle("is-active", isMenuPanelOpen() && activeMenuPanel === "alliance");
  const marketBtn = document.getElementById("marketPanelBtn");
  if (marketBtn) marketBtn.classList.toggle("is-active", isMenuPanelOpen() && activeMenuPanel === "market");

  const miniSlot = document.getElementById("bottomHudMinimapSlot");
  if (!miniSlot) return;
  if (currentPage === "adventure") {
    ensureWorldMapPosition();
    miniSlot.innerHTML = `<div class="minimap-panel">${buildMinimapHtml(player.worldMap.x, player.worldMap.y)}</div>`;
  } else {
    miniSlot.innerHTML = "";
  }
}

function render() {
  const c = document.getElementById("content");
  if (currentPage !== "adventure") {
    clearAdventureRespawnTimer();
    adventureBgLastUrl = null;
    adventureBgLastIsCity = false;
    adventureBgActiveLayer = 0;
  }
  c.style.background = "";
  c.classList.remove("region-view");
  c.classList.toggle("content-overview", currentPage === "overview");
  c.classList.toggle("content-themed", currentPage !== "overview");

  if (currentPage === "overview") renderOverview();
  else if (currentPage === "adventure") renderAdventure();
  else if (currentPage === "arena") {
    c.innerHTML =
      '<div class="game-page"><h1 class="game-page-title">Arena</h1><p class="game-page-lead muted">To be defined later.</p></div>';
  } else if (currentPage === "alliance") {
    c.innerHTML =
      '<div class="game-page"><h1 class="game-page-title">Alliance</h1><p class="game-page-lead muted">Coming soon.</p></div>';
  } else if (currentPage === "market") {
    c.innerHTML =
      '<div class="game-page"><h1 class="game-page-title">Market</h1><p class="game-page-lead muted">Coming soon.</p></div>';
  }
  renderBottomHud();
  if (isCharacterPanelOpen()) renderCharacterPanelContent();
  if (isMenuPanelOpen()) renderMenuPanelContent();
}

function onDragStart(e) {
  hideItemTooltip();
  const cell = e.target.closest(".inv-cell[draggable=\"true\"]");
  const slot = e.target.closest(".slot-drop[draggable=\"true\"]");
  if (cell && cell.dataset.item) {
    dragPayload = { kind: "inventory", item: cell.dataset.item };
    e.dataTransfer.effectAllowed = "move";
  } else if (slot) {
    const slotId = slot.dataset.slot;
    const name = player.equipment[slotId];
    if (name) {
      dragPayload = { kind: "equipped", slot: slotId, item: name };
      e.dataTransfer.effectAllowed = "move";
    }
  } else {
    dragPayload = null;
  }
}

function onDragOver(e) {
  const drop = e.target.closest(".slot-drop");
  const inv = e.target.closest(".inv-grid") || e.target.closest(".inv-grid-scroll");
  if (drop || inv) e.preventDefault();
}

function onDrop(e) {
  e.preventDefault();
  if (!dragPayload) return;

  const slotEl = e.target.closest(".slot-drop");
  if (slotEl && dragPayload.kind === "inventory") {
    const slotId = slotEl.dataset.slot;
    const def = getItemDef(dragPayload.item);
    if (def && def.slot === slotId) {
      equipFromInventory(dragPayload.item);
    }
  }

  const invGrid = e.target.closest(".inv-grid") || e.target.closest(".inv-grid-scroll");
  if (invGrid && dragPayload.kind === "equipped") {
    unequipToInventory(dragPayload.slot);
  }

  dragPayload = null;
}

function onContentDblClick(e) {
  const invCell = e.target.closest(".inv-cell[data-item-name]");
  if (invCell && inventoryTab === "equipment") {
    const name = invCell.getAttribute("data-item-name");
    if (name && equipFromInventory(name)) {
      hideItemTooltip();
      return;
    }
  }
  const drop = e.target.closest(".slot-drop[data-item-name]");
  if (drop && drop.dataset.slot) {
    hideItemTooltip();
    unequipToInventory(drop.dataset.slot);
  }
}

function onContentClick(e) {
  if (player.editMode) {
    const rm = e.target.closest(".scene-object-remove[data-scene-remove]");
    if (rm) {
      e.preventDefault();
      e.stopPropagation();
      const id = rm.getAttribute("data-scene-remove");
      if (id) removeSceneEditableObject(id);
      return;
    }
  }
  if (onAdventureSceneButtonClick(e)) return;
  const alloc = e.target.closest("[data-char-up]");
  if (alloc && alloc.dataset.charUp) {
    spendCharPoint(alloc.dataset.charUp);
    return;
  }
  if (e.target.closest("[data-reset-character]")) {
    if (
      window.confirm(
        "Reset this hero? All progress (level, items, gold, stats) will be permanently deleted."
      ) &&
      window.confirm("This cannot be undone. Reset character now?")
    ) {
      localStorage.removeItem("player");
      player = loadPlayer();
      save();
      render();
    }
    return;
  }
  const stTab = e.target.closest("[data-stats-tab]");
  if (stTab && stTab.dataset.statsTab) {
    overviewStatsTab = stTab.dataset.statsTab;
    render();
    return;
  }
  const tab = e.target.closest("[data-inv-tab]");
  if (tab) {
    inventoryTab = tab.dataset.invTab;
    render();
    return;
  }
  const use = e.target.closest("[data-use-consumable]");
  if (use && use.dataset.useConsumable) {
    useConsumable(use.dataset.useConsumable);
    return;
  }
  if (e.target.closest("[data-rename-hero]")) {
    const next = window.prompt("Hero name", player.name);
    if (next != null && next.trim()) {
      player.name = next.trim().slice(0, 32);
      save();
      render();
    }
  }
}

function showModal(text) {
  const m = document.getElementById("modal");
  const mc = document.getElementById("modalContent");
  if (mc) mc.textContent = text;
  if (m) {
    m.classList.remove("hidden", "modal--portal-network");
  }
}

function showModalHtml(html, opts) {
  const m = document.getElementById("modal");
  const mc = document.getElementById("modalContent");
  if (mc) mc.innerHTML = html;
  if (m) {
    m.classList.remove("hidden");
    if (opts && opts.portalNetwork) m.classList.add("modal--portal-network");
    else m.classList.remove("modal--portal-network");
  }
}

/**
 * Display name for the portal travel list: map city at the portal tile, then config city, then label.
 * @returns {string}
 */
function getPortalTravelListDisplayName(el, x, y) {
  const mapCity = getWorldMapCityName(x, y);
  const cityField = typeof el.city === "string" && el.city.trim() ? el.city.trim() : "";
  const labelField = typeof el.label === "string" && el.label.trim() ? el.label.trim() : "";
  if (mapCity) return mapCity;
  if (cityField) return cityField;
  if (labelField) return labelField;
  return "Waygate";
}

/**
 * All portal elements on the map (merged coordinateCells + sceneEdits). `label` is the travel-list name (see {@link getPortalTravelListDisplayName}).
 * @returns {{ id: string, label: string, x: number, y: number }[]}
 */
function scanWorldPortals() {
  const wm = GAME_CONFIG.worldMap;
  const keys = new Set();
  if (wm && wm.coordinateCells && typeof wm.coordinateCells === "object") {
    Object.keys(wm.coordinateCells).forEach((k) => keys.add(k));
  }
  if (player.worldMap.sceneEdits && typeof player.worldMap.sceneEdits === "object") {
    Object.keys(player.worldMap.sceneEdits).forEach((k) => keys.add(k));
  }
  const sorted = Array.from(keys).sort((a, b) => {
    const pa = parseWorldMapKey(a);
    const pb = parseWorldMapKey(b);
    if (pa.x !== pb.x) return pa.x - pb.x;
    return pa.y - pb.y;
  });
  const out = [];
  const seenPortalIds = new Set();
  for (const k of sorted) {
    const { x: px, y: py } = parseWorldMapKey(k);
    const cfg = getCoordinateCellConfig(px, py);
    if (!cfg || cfg.kind !== "scene" || !Array.isArray(cfg.elements)) continue;
    for (const el of cfg.elements) {
      if (!el || el.type !== "portal") continue;
      const id = typeof el.id === "string" && el.id.trim() ? el.id.trim() : "";
      if (!id) continue;
      if (seenPortalIds.has(id)) continue;
      seenPortalIds.add(id);
      const label = getPortalTravelListDisplayName(el, px, py);
      out.push({ id, label, x: px, y: py });
    }
  }
  out.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
  return out;
}

/**
 * Rebuilds {@link player.worldMap.portalWorldById} from {@link scanWorldPortals} (element id → world tile).
 * @returns {{ id: string, label: string, x: number, y: number }[]}
 */
function rebuildCityPortalCoordsFromWorld() {
  const list = scanWorldPortals();
  const next = {};
  for (const p of list) {
    const canonical = parseCoordsFromCityPortalElementId(p.id);
    next[p.id] = canonical || { x: p.x, y: p.y };
  }
  if (!player.worldMap.portalWorldById || typeof player.worldMap.portalWorldById !== "object") {
    player.worldMap.portalWorldById = {};
  }
  const prevStr = JSON.stringify(player.worldMap.portalWorldById);
  const nextStr = JSON.stringify(next);
  player.worldMap.portalWorldById = next;
  if (prevStr !== nextStr) save();
  return list;
}

function getPortalWorldCoordsByPortalId(portalId) {
  rebuildCityPortalCoordsFromWorld();
  const want = typeof portalId === "string" ? portalId.trim() : "";
  if (!want) return null;
  const fromId = parseCoordsFromCityPortalElementId(want);
  if (fromId) return fromId;
  const stored = player.worldMap.portalWorldById && player.worldMap.portalWorldById[want];
  if (stored && typeof stored.x === "number" && typeof stored.y === "number") {
    return { x: stored.x, y: stored.y };
  }
  return null;
}

function openPortalNetworkModal(excludePortalId) {
  const exclude = typeof excludePortalId === "string" ? excludePortalId.trim() : "";
  const all = rebuildCityPortalCoordsFromWorld();
  const dests = all.filter((p) => p.id !== exclude);
  if (!dests.length) {
    showModal("No other waygates are known.");
    return;
  }
  const rows = dests
    .map((p) => {
      const nm = escapeHtml(p.label);
      const idAttr = escapeAttr(p.id);
      return `<button type="button" class="btn-primary portal-network-dest" data-portal-dest-id="${idAttr}">${nm}</button>`;
    })
    .join("");
  showModalHtml(
    `<h3 class="portal-network-title">Other waygates</h3><p class="portal-network-lead muted">Choose a destination (city).</p><div class="portal-network-list">${rows}</div>`,
    { portalNetwork: true }
  );
}

function closeModal() {
  const m = document.getElementById("modal");
  const mc = document.getElementById("modalContent");
  if (m) {
    m.classList.add("hidden");
    m.classList.remove("modal--portal-network");
  }
  if (mc) {
    mc.textContent = "";
    mc.innerHTML = "";
  }
}

function onPortalNetworkModalClick(e) {
  const b = e.target.closest(".portal-network-dest");
  if (!b || !document.getElementById("modal") || document.getElementById("modal").classList.contains("hidden")) return;
  const destId = b.getAttribute("data-portal-dest-id");
  if (!destId) return;
  const coords = getPortalWorldCoordsByPortalId(destId);
  if (!coords) return;
  const x = coords.x;
  const y = coords.y;
  if (!canEnterMap(x, y)) {
    showModal("You cannot travel there.");
    return;
  }
  closeModal();
  player.worldMap.x = x;
  player.worldMap.y = y;
  save();
  render();
}

function initUi() {
  if (GAME_CONFIG.version) {
    document.title = `Browser RPG — ${GAME_CONFIG.version}`;
  }
  applyTheme(player.theme);
  const themeSel = document.getElementById("themeSelect");
  if (themeSel) {
    themeSel.value = player.theme;
    themeSel.onchange = () => setTheme(themeSel.value);
  }
  syncEditModeUi();
  const editModeBtn = document.getElementById("editModeToggle");
  if (editModeBtn) {
    editModeBtn.addEventListener("click", () => setEditMode(!player.editMode));
  }
  const editModeAddBtn = document.getElementById("editModeAddBtn");
  const editModeAddList = document.getElementById("editModeAddList");
  if (editModeAddBtn && editModeAddList) {
    editModeAddBtn.addEventListener("click", () => {
      if (editModeAddList.classList.contains("hidden")) {
        editModeAddList.innerHTML = getEditableSceneObjectCatalog()
          .map(
            (c) =>
              `<button type="button" class="sidebar-add-item" data-catalog-add="${escapeAttr(c.id)}">${escapeHtml(c.label)}</button>`
          )
          .join("");
        editModeAddList.classList.remove("hidden");
      } else {
        editModeAddList.classList.add("hidden");
      }
    });
    editModeAddList.addEventListener("click", (e) => {
      const b = e.target.closest("[data-catalog-add]");
      if (!b) return;
      const id = b.getAttribute("data-catalog-add");
      if (id) addSceneEditableObjectFromCatalog(id);
      editModeAddList.classList.add("hidden");
    });
  }
  const exportPortalLayoutBtn = document.getElementById("exportPortalLayoutBtn");
  if (exportPortalLayoutBtn) {
    exportPortalLayoutBtn.addEventListener("click", () => {
      void copyCityPortalLayoutExportToClipboard();
    });
  }

  const fightOverlay = document.getElementById("fightOverlay");
  if (fightOverlay) {
    fightOverlay.addEventListener("click", onFightOverlayClick);
    fightOverlay.addEventListener("dblclick", onFightOverlayDblClick);
    fightOverlay.addEventListener("mouseover", onContentTooltipOver);
    fightOverlay.addEventListener("mouseout", onContentTooltipOut);
    fightOverlay.addEventListener("mousemove", onContentTooltipMove);
  }

  const modalEl = document.getElementById("modal");
  if (modalEl) modalEl.addEventListener("click", onPortalNetworkModalClick);
  const characterPanelModal = document.getElementById("characterPanelModal");
  const characterPanelClose = document.getElementById("characterPanelClose");
  const menuPanelModal = document.getElementById("menuPanelModal");
  const menuPanelClose = document.getElementById("menuPanelClose");
  if (characterPanelClose) {
    characterPanelClose.addEventListener("click", () => closeCharacterPanel());
  }
  if (menuPanelClose) {
    menuPanelClose.addEventListener("click", () => closeMenuPanel());
  }
  if (characterPanelModal) {
    characterPanelModal.addEventListener("click", (e) => {
      if (e.target === characterPanelModal) closeCharacterPanel();
    });
  }
  if (menuPanelModal) {
    menuPanelModal.addEventListener("click", (e) => {
      if (e.target === menuPanelModal) closeMenuPanel();
    });
  }

  const content = document.getElementById("content");
  content.addEventListener("pointerdown", onSceneResizePointerDown, true);
  content.addEventListener("pointerdown", onSceneLayoutPointerDown, true);
  content.addEventListener("click", onContentClick);
  content.addEventListener("dblclick", onContentDblClick);
  content.addEventListener("dragstart", onDragStart);
  content.addEventListener("dragover", onDragOver);
  content.addEventListener("drop", onDrop);
  content.addEventListener("mouseover", onContentTooltipOver);
  content.addEventListener("mouseout", onContentTooltipOut);
  content.addEventListener("mousemove", onContentTooltipMove);
  const characterPanelContent = document.getElementById("characterPanelContent");
  if (characterPanelContent) {
    characterPanelContent.addEventListener("click", onContentClick);
    characterPanelContent.addEventListener("dblclick", onContentDblClick);
    characterPanelContent.addEventListener("dragstart", onDragStart);
    characterPanelContent.addEventListener("dragover", onDragOver);
    characterPanelContent.addEventListener("drop", onDrop);
    characterPanelContent.addEventListener("mouseover", onContentTooltipOver);
    characterPanelContent.addEventListener("mouseout", onContentTooltipOut);
    characterPanelContent.addEventListener("mousemove", onContentTooltipMove);
  }

  const bottomMini = document.getElementById("bottomHudMinimapSlot");
  if (bottomMini) {
    bottomMini.addEventListener("mouseover", onContentTooltipOver);
    bottomMini.addEventListener("mouseout", onContentTooltipOut);
    bottomMini.addEventListener("mousemove", onContentTooltipMove);
  }

  document.addEventListener("keydown", onDocumentKeydown);
  initWorldMapModal();
}

function showLoadingOverlay() {
  const el = document.getElementById("loadingOverlay");
  if (el) el.classList.remove("hidden");
}

function hideLoadingOverlay() {
  const el = document.getElementById("loadingOverlay");
  if (el) el.classList.add("hidden");
}

function getMapAndMinimapPendingCount() {
  let pending = 0;
  biomeTextureByUrl.forEach((v) => {
    if (v === "loading") pending++;
  });
  pending += mapCellArtProbePending.size;
  return pending;
}

function waitForAllImagesToLoad({ idleMs = 600, maxWaitMs = 15000 } = {}) {
  return new Promise((resolve) => {
    const tracked = new Set();
    const pending = new Set();
    let loaded = 0;
    let total = 0;
    let lastMutation = Date.now();

    const textEl = document.getElementById("loadingText");
    const fillEl = document.getElementById("loadingBarFill");
    let externalPeakPending = 0;

    const setProgress = () => {
      if (!textEl || !fillEl) return;
      const externalPending = getMapAndMinimapPendingCount();
      if (externalPending > externalPeakPending) externalPeakPending = externalPending;
      const externalDone = Math.max(0, externalPeakPending - externalPending);
      const safeTotal = Math.max(1, total + externalPeakPending);
      const done = Math.min(safeTotal, loaded + externalDone);
      const pct = Math.round((done / safeTotal) * 100);
      textEl.textContent =
        externalPending > 0
          ? `Loading… ${done}/${safeTotal} (map ${externalPending})`
          : `Loading… ${done}/${safeTotal}`;
      fillEl.style.width = `${Math.max(0, Math.min(100, pct))}%`;
    };

    const trackImg = (img) => {
      if (!img || tracked.has(img)) return;
      tracked.add(img);
      total++;
      const done = () => {
        if (!pending.has(img)) return;
        pending.delete(img);
        loaded++;
        setProgress();
      };

      if (img.complete) {
        loaded++;
        setProgress();
        return;
      }

      pending.add(img);
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });
    };

    // Track current images.
    document.querySelectorAll("img").forEach((img) => trackImg(img));
    setProgress();

    const obs = new MutationObserver((muts) => {
      lastMutation = Date.now();
      muts.forEach((m) => {
        if (m.type !== "childList") return;
        m.addedNodes.forEach((n) => {
          if (!(n instanceof Element)) return;
          if (n.tagName === "IMG") trackImg(n);
          n.querySelectorAll?.("img")?.forEach((img) => trackImg(img));
        });
      });
    });

    obs.observe(document.body, { childList: true, subtree: true });

    const startedAt = Date.now();
    const tick = window.setInterval(() => {
      setProgress();
      if (Date.now() - startedAt > maxWaitMs) {
        obs.disconnect();
        hideLoadingOverlay();
        window.clearInterval(tick);
        resolve();
        return;
      }
      if (pending.size === 0 && getMapAndMinimapPendingCount() === 0 && Date.now() - lastMutation >= idleMs) {
        obs.disconnect();
        hideLoadingOverlay();
        window.clearInterval(tick);
        resolve();
      }
    }, 150);
  });
}

initUi();
showLoadingOverlay();
render();
window.reloadMonsters = reloadMonsters;
waitForAllImagesToLoad().catch(() => hideLoadingOverlay());
