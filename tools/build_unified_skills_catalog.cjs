/**
 * Generates skills_catalog.js from compact tables (single run: node tools/build_unified_skills_catalog.cjs).
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "skills_catalog.js");

/** @typedef {{ u:number,s:number,c:number,p?:0|1,bh?:number,bc?:number,k?:"phys"|"mag",pat:string,lv?:object[]}} Row */

const ORDER = [
  "Basic Physical Attack",
  "Basic Magical Attack",
  "Shield Bash",
  "Brace",
  "Heavy Strike",
  "Guarding Shout",
  "Iron Wall",
  "Taunt",
  "Guard Ally",
  "Shield Slam",
  "Earthbreaker",
  "Unbroken Line",
  "Precise Cut",
  "Footwork",
  "Twin Jab",
  "Feint",
  "Flow Step",
  "Expose Weakness",
  "Duelist Momentum",
  "Bleeding Flourish",
  "Deep Lunge",
  "Final Measure",
  "Arcane Bolt",
  "Spark",
  "Focused Casting",
  "Spell Preparation",
  "Arcane Wave",
  "Burning Field",
  "Spell Fracture",
  "Overload",
  "Arcane Collapse",
  "Event Horizon",
  "Quick Shot",
  "Smoke Step",
  "Mark Target",
  "Steady Shot",
  "Scatter Shot",
  "Pinning Shot",
  "Keen Eye",
  "Piercing Shot",
  "Reflex Volley",
  "Vanishing Shot",
  "Cleave",
  "Blood Price",
  "Heavy Cut",
  "War Hunger",
  "Rupture",
  "Brutal Rush",
  "Bonebreaker",
  "Kill Momentum",
  "Bloodstorm",
  "Execute",
  "Mend",
  "Protective Ward",
  "Encourage",
  "Regrowth",
  "Cleanse",
  "Steady Heart",
  "Group Mend",
  "Revitalizing Pulse",
  "Sanctuary",
  "Second Breath",
  "Toxin Dart",
  "Irritating Powder",
  "Weakening Flask",
  "Poison Dart",
  "Toxic Study",
  "Acid Vial",
  "Crippling Mixture",
  "Spread Contagion",
  "Collapse Immunity",
  "Plague Engine"
];

/** str% per level (index 0 = L1) as integer percent (45 = 45%) */
const T = {
  "Basic Physical Attack": { u: 1, s: 2, c: 0, bh: 90, bc: 3, k: "phys", pat: "basic", str: [60, 60, 60, 60, 60] },
  "Basic Magical Attack": { u: 1, s: 2, c: 0, bh: 90, bc: 3, k: "mag", pat: "basic", int: [60, 60, 60, 60, 60] },
  "Shield Bash": {
    u: 2,
    s: 2,
    c: 1,
    bh: 88,
    bc: 2,
    k: "phys",
    pat: "strike_debuff",
    str: [45, 50, 55, 60, 65],
    deb: "physDmgDown",
    dch: [55, 58, 61, 64, 68],
    dv: [3, 4, 5, 6, 7],
    dt: [1, 1, 2, 2, 2]
  },
  Brace: {
    u: 2,
    s: 2,
    c: 3,
    pat: "brace",
    dr: [12, 14, 16, 18, 20],
    sr: [0, 1, 2, 3, 4],
    dur: [1, 1, 2, 2, 2]
  },
  "Heavy Strike": { u: 4, s: 3, c: 0, bh: 82, bc: 3, k: "phys", pat: "strike", str: [85, 92, 99, 106, 115] },
  "Guarding Shout": {
    u: 8,
    s: 2,
    c: 4,
    bh: 100,
    bc: 0,
    pat: "all_foes_debuff",
    deb: "allyPressure",
    dch: [55, 58, 62, 66, 70],
    dv: [3, 4, 5, 6, 8],
    dt: [1, 1, 2, 2, 2]
  },
  "Iron Wall": { u: 15, s: 0, c: 0, p: 1, pat: "passive_iron_wall", vit: [5, 8, 12, 16, 20], pr: [0, 1, 2, 3, 4], hp: [0, 0, 0, 50, 100] },
  Taunt: {
    u: 18,
    s: 3,
    c: 5,
    bh: 100,
    bc: 0,
    pat: "taunt_all",
    dch: [55, 58, 62, 66, 70],
    dvDmg: [0, 3, 4, 5, 7],
    dt: [1, 1, 2, 2, 2]
  },
  "Guard Ally": { u: 24, s: 3, c: 4, pat: "guard_ally", redir: [30, 35, 40, 45, 50], dur: [1, 1, 2, 2, 2] },
  "Shield Slam": {
    u: 32,
    s: 4,
    c: 4,
    bh: 80,
    bc: 2,
    k: "phys",
    pat: "strike_debuff",
    str: [55, 60, 65, 70, 75],
    deb: "stun",
    dch: [15, 18, 21, 24, 28],
    dv: [1, 1, 1, 1, 1],
    dt: [1, 1, 1, 1, 1]
  },
  Earthbreaker: {
    u: 44,
    s: 5,
    c: 5,
    bh: 78,
    bc: 2,
    k: "phys",
    pat: "earthbreaker",
    str: [55, 60, 65, 70, 75],
    adj: [1, 1, 2, 2, 3],
    d2ch: [0, 55, 60, 62, 65],
    d2v: [0, 4, 5, 5, 6],
    d2t: [0, 1, 1, 1, 2],
    stch: [0, 0, 0, 10, 15],
    stt: [0, 0, 0, 1, 1]
  },
  "Unbroken Line": { u: 54, s: 0, c: 0, p: 1, pat: "passive_unbroken", pr: [2, 3, 3, 4, 4], mr: [2, 3, 3, 4, 4], sr: [0, 0, 2, 3, 4], stacks: [2, 2, 3, 3, 3], dur: [2, 2, 2, 2, 2] },
  "Precise Cut": { u: 2, s: 2, c: 0, bh: 92, bc: 5, k: "phys", pat: "strike", str: [55, 60, 65, 70, 75] },
  Footwork: { u: 3, s: 0, c: 0, p: 1, pat: "passive_footwork", eva: [2, 3, 4, 5, 6], acc: [0, 0, 1, 2, 3] },
  "Twin Jab": {
    u: 6,
    s: 3,
    c: 1,
    bh: 88,
    bc: 4,
    k: "phys",
    pat: "twin_jab",
    str: [35, 38, 41, 44, 48],
    hits: 2
  },
  Feint: {
    u: 10,
    s: 2,
    c: 3,
    bh: 90,
    bc: 3,
    k: "phys",
    pat: "strike_debuff",
    str: [40, 45, 50, 55, 60],
    deb: "blind",
    dch: [40, 44, 48, 52, 56],
    dv: [4, 5, 6, 7, 8],
    dt: [2, 2, 2, 2, 2]
  },
  "Flow Step": { u: 16, s: 2, c: 4, pat: "flow_step", eva: [6, 8, 10, 12, 14], acc: [0, 0, 3, 4, 5], dur: [1, 1, 2, 2, 2] },
  "Expose Weakness": {
    u: 22,
    s: 3,
    c: 3,
    bh: 88,
    bc: 3,
    k: "phys",
    pat: "strike_debuff",
    str: [55, 60, 65, 70, 78],
    deb: "physResDown",
    dch: [40, 44, 48, 52, 56],
    dv: [5, 6, 7, 8, 10],
    dt: [2, 2, 2, 2, 2]
  },
  "Duelist Momentum": { u: 28, s: 0, c: 0, p: 1, pat: "passive_duelist_momentum", stamCh: [6, 8, 10, 12, 15] },
  "Bleeding Flourish": {
    u: 34,
    s: 3,
    c: 3,
    bh: 86,
    bc: 4,
    k: "phys",
    pat: "bleeding_flourish",
    str: [60, 65, 70, 75, 80],
    adj: [0, 0, 1, 1, 2],
    dch: [40, 43, 46, 49, 52],
    dot: [10, 11, 12, 12, 13],
    dt: [2, 2, 2, 3, 3]
  },
  "Deep Lunge": {
    u: 46,
    s: 4,
    c: 2,
    bh: 84,
    bc: 5,
    k: "phys",
    pat: "deep_lunge",
    str: [95, 102, 110, 118, 130],
    bonusVsPrd: [8, 8, 10, 10, 12]
  },
  "Final Measure": {
    u: 56,
    s: 5,
    c: 5,
    bh: 82,
    bc: 6,
    k: "phys",
    pat: "final_measure",
    str: [100, 108, 116, 124, 135],
    lowStr: [145, 155, 165, 178, 195]
  },
  "Arcane Bolt": { u: 2, s: 2, c: 0, bh: 90, bc: 3, k: "mag", pat: "strike", int: [55, 60, 65, 70, 78] },
  Spark: {
    u: 4,
    s: 2,
    c: 1,
    bh: 88,
    bc: 3,
    k: "mag",
    pat: "spark",
    int: [45, 50, 55, 60, 68],
    dch: [0, 0, 0, 25, 35],
    dot: [0, 0, 0, 10, 10],
    dt: [0, 0, 0, 2, 2]
  },
  "Focused Casting": { u: 8, s: 0, c: 0, p: 1, pat: "passive_focused_casting", mdmg: [3, 5, 7, 9, 12], acc: [0, 0, 2, 3, 4] },
  "Spell Preparation": {
    u: 12,
    s: 1,
    c: 4,
    pat: "spell_preparation",
    nMag: [1, 1, 2, 2, 2],
    mdmg: [0, 3, 0, 5, 8],
    dur: [2, 2, 3, 3, 3]
  },
  "Arcane Wave": { u: 18, s: 4, c: 3, bh: 85, bc: 3, k: "mag", pat: "aoe_mag_adj", int: [45, 50, 55, 60, 68], adj: [1, 1, 2, 2, 3] },
  "Burning Field": {
    u: 24,
    s: 4,
    c: 4,
    bh: 84,
    bc: 2,
    k: "mag",
    pat: "burning_field",
    int: [35, 40, 45, 50, 55],
    adj: [1, 1, 2, 2, 3],
    dch: [35, 39, 43, 47, 52],
    dot: [12, 12, 12, 12, 12],
    dt: [3, 3, 3, 3, 3]
  },
  "Spell Fracture": {
    u: 30,
    s: 3,
    c: 3,
    bh: 88,
    bc: 3,
    k: "mag",
    pat: "strike_debuff",
    int: [55, 60, 65, 70, 78],
    deb: "magResDown",
    dch: [40, 44, 48, 52, 56],
    dv: [5, 6, 7, 8, 10],
    dt: [2, 2, 2, 2, 2]
  },
  Overload: { u: 38, s: 3, c: 5, pat: "overload", mdmg: [12, 15, 18, 21, 25], acc: [0, 0, 3, 4, 5], dur: [2, 2, 2, 2, 2] },
  "Arcane Collapse": { u: 48, s: 5, c: 5, bh: 82, bc: 4, k: "mag", pat: "arcane_collapse", int: [70, 76, 82, 88, 100], adj: [2, 2, 3, 3, 99] },
  "Event Horizon": {
    u: 58,
    s: 6,
    c: 7,
    bh: 80,
    bc: 5,
    k: "mag",
    pat: "event_horizon",
    int: [85, 92, 100, 108, 120],
    burnBonus: [10, 12, 15, 18, 22]
  },
  "Quick Shot": { u: 3, s: 2, c: 0, bh: 95, bc: 3, k: "phys", pat: "strike", str: [45, 50, 55, 60, 68] },
  "Smoke Step": { u: 4, s: 2, c: 4, pat: "smoke_step", eva: [8, 10, 12, 14, 16], dur: [1, 1, 2, 2, 2] },
  "Mark Target": {
    u: 7,
    s: 2,
    c: 3,
    bh: 95,
    bc: 0,
    pat: "strike_debuff",
    str: [0, 0, 0, 0, 0],
    deb: "evaDown",
    dch: [55, 60, 65, 70, 75],
    dv: [6, 8, 10, 12, 14],
    dt: [2, 2, 3, 3, 3]
  },
  "Steady Shot": {
    u: 12,
    s: 3,
    c: 2,
    bh: 92,
    bc: 3,
    k: "phys",
    pat: "steady_shot",
    str: [60, 65, 70, 75, 82],
    hitB: [2, 3, 4, 5, 6]
  },
  "Scatter Shot": { u: 18, s: 4, c: 3, bh: 88, bc: 3, k: "phys", pat: "aoe_phys_adj", str: [40, 45, 50, 55, 62], adj: [1, 1, 2, 2, 3] },
  "Pinning Shot": {
    u: 24,
    s: 3,
    c: 4,
    bh: 88,
    bc: 3,
    k: "phys",
    pat: "strike_debuff",
    str: [55, 60, 65, 70, 78],
    deb: "cripple",
    dch: [30, 34, 38, 42, 48],
    dv: [1, 1, 1, 1, 1],
    dt: [1, 1, 1, 1, 2]
  },
  "Keen Eye": { u: 28, s: 0, c: 0, p: 1, pat: "passive_keen_eye", acc: [4, 6, 8, 10, 12], crit: [0, 0, 2, 3, 4] },
  "Piercing Shot": {
    u: 34,
    s: 4,
    c: 3,
    bh: 86,
    bc: 4,
    k: "phys",
    pat: "piercing_shot",
    str: [75, 82, 90, 98, 110],
    ignore: [5, 6, 8, 10, 12]
  },
  "Reflex Volley": {
    u: 46,
    s: 5,
    c: 5,
    bh: 85,
    bc: 3,
    k: "phys",
    pat: "reflex_volley",
    volleyHits: [3, 3, 4, 4, 5],
    str: [35, 38, 38, 42, 42]
  },
  "Vanishing Shot": {
    u: 56,
    s: 4,
    c: 6,
    bh: 88,
    bc: 5,
    k: "phys",
    pat: "vanishing_shot",
    str: [90, 98, 106, 115, 130],
    eva: [10, 12, 14, 16, 18],
    acc: [0, 0, 0, 0, 5],
    dur: [1, 1, 2, 2, 2]
  },
  Cleave: { u: 3, s: 3, c: 0, bh: 84, bc: 3, k: "phys", pat: "aoe_phys_adj", str: [50, 55, 60, 65, 72], adj: [1, 1, 1, 2, 2] },
  "Blood Price": { u: 5, s: 1, c: 4, pat: "blood_price", hpCost: [8, 8, 7, 7, 6], phys: [8, 10, 12, 15, 18], dur: [2, 2, 2, 3, 3] },
  "Heavy Cut": { u: 8, s: 3, c: 2, bh: 84, bc: 3, k: "phys", pat: "strike", str: [75, 82, 90, 98, 108] },
  "War Hunger": { u: 14, s: 0, c: 0, p: 1, pat: "passive_war_hunger", phys: [3, 5, 7, 9, 12], heal: [0, 0, 2, 3, 5] },
  Rupture: {
    u: 20,
    s: 3,
    c: 3,
    bh: 84,
    bc: 3,
    k: "phys",
    pat: "strike_debuff",
    str: [65, 72, 80, 88, 100],
    deb: "bleed",
    dch: [35, 39, 43, 48, 54],
    dot: [10, 11, 12, 13, 15],
    dt: [2, 2, 3, 3, 3]
  },
  "Brutal Rush": {
    u: 26,
    s: 4,
    c: 3,
    bh: 80,
    bc: 4,
    k: "phys",
    pat: "brutal_rush",
    str: [100, 108, 116, 126, 140],
    selfHp: [5, 5, 4, 4, 3]
  },
  Bonebreaker: {
    u: 34,
    s: 3,
    c: 4,
    bh: 82,
    bc: 3,
    k: "phys",
    pat: "strike_debuff",
    str: [65, 72, 80, 88, 100],
    deb: "cripple",
    dch: [35, 39, 43, 48, 54],
    dv: [1, 1, 1, 1, 1],
    dt: [1, 1, 2, 2, 2]
  },
  "Kill Momentum": { u: 40, s: 0, c: 0, p: 1, pat: "passive_kill_momentum", stam: [1, 1, 1, 2, 2], phys: [0, 4, 6, 6, 10] },
  Bloodstorm: {
    u: 50,
    s: 5,
    c: 5,
    bh: 78,
    bc: 4,
    k: "phys",
    pat: "bloodstorm",
    str: [55, 60, 65, 72, 82],
    adj: [2, 2, 3, 3, 99],
    selfHp: [6, 6, 5, 5, 4]
  },
  Execute: {
    u: 58,
    s: 5,
    c: 5,
    bh: 82,
    bc: 5,
    k: "phys",
    pat: "execute_skill",
    str: [90, 98, 106, 116, 130],
    lowStr: [150, 165, 180, 200, 230]
  },
  Mend: { u: 3, s: 2, c: 0, bc: 3, pat: "heal_ally", vit: [45, 50, 55, 60, 70] },
  "Protective Ward": { u: 4, s: 3, c: 3, bc: 2, pat: "ward_shield", vit: [55, 65, 75, 90, 110], dur: [2, 2, 2, 2, 2] },
  Encourage: { u: 8, s: 2, c: 3, pat: "encourage", acc: [3, 4, 5, 6, 8], heal: [0, 0, 3, 4, 5], dur: [1, 1, 2, 2, 2] },
  Regrowth: { u: 12, s: 3, c: 4, bc: 3, pat: "regrowth", vit: [22, 25, 28, 32, 38], dur: [2, 2, 3, 3, 3] },
  Cleanse: { u: 18, s: 2, c: 3, pat: "cleanse", cleanse: [1, 1, 2, 2, 3], vitHeal: [0, 15, 0, 25, 0] },
  "Steady Heart": { u: 24, s: 0, c: 0, p: 1, pat: "passive_steady_heart", heal: [4, 6, 8, 10, 13], sr: [0, 0, 3, 4, 5] },
  "Group Mend": { u: 30, s: 4, c: 4, bc: 2, pat: "heal_all", vit: [25, 30, 35, 40, 50] },
  "Revitalizing Pulse": { u: 38, s: 4, c: 5, pat: "rev_pulse", stam: [1, 1, 1, 1, 2], heal: [0, 4, 6, 8, 0], dur: [1, 1, 1, 1, 1] },
  Sanctuary: { u: 48, s: 5, c: 7, pat: "sanctuary_party", dr: [10, 12, 14, 16, 18], sr: [0, 0, 4, 6, 8], dur: [2, 2, 2, 2, 3] },
  "Second Breath": { u: 58, s: 0, c: 0, p: 1, pat: "passive_second_breath", vit: [40, 50, 60, 75, 90], cleanse: [0, 0, 1, 1, 2] },
  "Toxin Dart": {
    u: 3,
    s: 2,
    c: 0,
    bh: 90,
    bc: 2,
    k: "mag",
    pat: "toxin_dart",
    int: [40, 45, 50, 55, 60],
    dch: [0, 0, 20, 25, 30],
    dot: [0, 0, 10, 10, 10],
    dt: [0, 0, 1, 2, 2]
  },
  "Irritating Powder": {
    u: 5,
    s: 2,
    c: 3,
    bh: 92,
    bc: 0,
    pat: "strike_debuff",
    str: [0, 0, 0, 0, 0],
    deb: "blind",
    dch: [30, 34, 38, 42, 46],
    dv: [4, 5, 6, 7, 8],
    dt: [1, 1, 2, 2, 2]
  },
  "Weakening Flask": {
    u: 12,
    s: 3,
    c: 3,
    bh: 88,
    bc: 2,
    k: "mag",
    pat: "strike_debuff",
    int: [40, 45, 50, 55, 62],
    deb: "bothDmgDown",
    dch: [35, 39, 43, 47, 52],
    dv: [4, 5, 6, 7, 8],
    dt: [2, 2, 2, 3, 3]
  },
  "Poison Dart": {
    u: 18,
    s: 3,
    c: 2,
    bh: 88,
    bc: 2,
    k: "mag",
    pat: "strike_debuff",
    int: [45, 50, 55, 60, 68],
    deb: "poisonDot",
    dch: [40, 44, 48, 52, 58],
    dot: [12, 12, 13, 14, 15],
    dt: [2, 2, 3, 3, 4]
  },
  "Toxic Study": { u: 24, s: 0, c: 0, p: 1, pat: "passive_toxic_study", acc: [3, 5, 7, 9, 12], mdmg: [0, 0, 2, 3, 5] },
  "Acid Vial": {
    u: 30,
    s: 3,
    c: 3,
    bh: 88,
    bc: 2,
    k: "mag",
    pat: "strike_debuff",
    int: [45, 50, 55, 60, 68],
    deb: "bothResDown",
    dch: [40, 44, 48, 52, 58],
    dv: [4, 5, 6, 7, 8],
    dt: [2, 2, 2, 2, 2]
  },
  "Crippling Mixture": {
    u: 36,
    s: 3,
    c: 4,
    bh: 88,
    bc: 0,
    pat: "crippling_mixture",
    dch1: [35, 39, 43, 48, 54],
    dch2: [0, 30, 0, 35, 40],
    dt2: [0, 1, 0, 2, 2]
  },
  "Spread Contagion": {
    u: 42,
    s: 4,
    c: 5,
    bh: 90,
    bc: 0,
    pat: "spread_contagion",
    adj: [1, 1, 2, 2, 3],
    ch: [45, 50, 55, 60, 65],
    frac: [50, 60, 60, 75, 75]
  },
  "Collapse Immunity": {
    u: 50,
    s: 4,
    c: 6,
    bh: 88,
    bc: 0,
    pat: "strike_debuff",
    str: [0, 0, 0, 0, 0],
    deb: "statusResDown",
    dch: [40, 45, 50, 55, 60],
    dv: [8, 10, 12, 15, 18],
    dt: [2, 2, 3, 3, 3]
  },
  "Plague Engine": { u: 60, s: 0, c: 0, p: 1, pat: "passive_plague_engine", dot: [5, 8, 10, 13, 16], accDebuff: [0, 0, 0, 3, 4], stack2: [0, 0, 0, 0, 1] }
};

function buildLevels(name, row) {
  const out = [];
  for (let i = 0; i < 5; i++) {
    const L = { lv: i + 1 };
    if (row.str) L.strPct = row.str[i] / 100;
    if (row.int) L.intPct = row.int[i] / 100;
    if (row.vit && row.pat && String(row.pat).startsWith("heal")) L.vitHealPct = row.vit[i] / 100;
    if (row.vit && row.pat === "ward_shield") L.shieldVitPct = row.vit[i] / 100;
    if (row.vit && row.pat === "regrowth") L.regenVitPct = row.vit[i] / 100;
    if (row.vit && row.pat === "passive_iron_wall") {
      if (row.vit[i]) L.passiveVit = row.vit[i];
      if (row.pr) L.passivePhysRes = row.pr[i];
      if (row.hp) L.passiveHp = row.hp[i];
    }
    if (row.pat === "passive_footwork") {
      L.passive = { evasion: row.eva[i], accuracy: row.acc[i] };
    }
    if (row.pat === "passive_focused_casting") {
      L.passive = { magicDamage: row.mdmg[i], accuracy: row.acc[i] };
    }
    if (row.pat === "passive_duelist_momentum") {
      L.passive = { critStaminaChancePct: row.stamCh[i] };
    }
    if (row.pat === "passive_unbroken") {
      L.passive = {
        physResPerStack: row.pr[i],
        magResPerStack: row.mr[i],
        statusResPerStack: row.sr[i],
        maxStacks: row.stacks[i],
        duration: row.dur[i],
        allyDrAtStacks2: i >= 4 ? 4 : 0
      };
    }
    if (row.pat === "passive_war_hunger") {
      L.passive = { physDamage: row.phys[i], healing: row.heal[i] };
    }
    if (row.pat === "passive_keen_eye") {
      L.passive = { accuracy: row.acc[i], crit: row.crit[i] };
    }
    if (row.pat === "passive_kill_momentum") {
      L.passive = { staminaOnKill: row.stam[i], physDamageNextTurn: row.phys[i] };
    }
    if (row.pat === "passive_steady_heart") {
      L.passive = { healing: row.heal[i], statusResist: row.sr[i] };
    }
    if (row.pat === "passive_second_breath") {
      L.passive = { healVitPct: row.vit[i], cleanse: row.cleanse[i] };
    }
    if (row.pat === "passive_toxic_study") {
      L.passive = { accuracy: row.acc[i], magicDamage: row.mdmg[i] };
    }
    if (row.pat === "passive_plague_engine") {
      L.passive = { dotDamage: row.dot[i], debuffAccuracy: row.accDebuff[i], poisonStacks2: !!row.stack2[i] };
    }
    if (row.pat === "twin_jab") {
      L.strPct = row.str[i] / 100;
      L.hits = 2;
    }
    if (row.pat === "reflex_volley") {
      L.hits = row.volleyHits[i];
      L.strPct = row.str[i] / 100;
    }
    if (row.pat === "taunt_all") {
      L.debuff = {
        type: "playerTaunt",
        chance: row.dch[i],
        enemyDmgDownPct: row.dvDmg[i],
        turns: row.dt[i]
      };
    }
    if (row.pat === "all_foes_debuff") {
      L.debuff = { type: row.deb, chance: row.dch[i], value: row.dv[i], turns: row.dt[i] };
    }
    if (row.pat === "spark" && row.dch[i] > 0) {
      L.debuff = { type: "burn", chance: row.dch[i], dotPct: row.dot[i], turns: row.dt[i] };
    }
    if (row.pat === "toxin_dart" && row.dch[i] > 0) {
      L.debuff = { type: "poisonDot", chance: row.dch[i], dotPct: row.dot[i], turns: row.dt[i] };
    }
    if (row.pat === "brace") {
      L.self = { dr: row.dr[i], sr: row.sr[i], turns: row.dur[i] };
    }
    if (row.pat === "flow_step") {
      L.self = { eva: row.eva[i], acc: row.acc[i], turns: row.dur[i] };
    }
    if (row.pat === "smoke_step") {
      L.self = { eva: row.eva[i], turns: row.dur[i] };
    }
    if (row.pat === "overload") {
      L.self = { magDmg: row.mdmg[i], acc: row.acc[i], stamPenalty: 1, turns: row.dur[i] };
    }
    if (row.pat === "spell_preparation") {
      L.self = { nextMagical: row.nMag[i], magDmg: row.mdmg[i], maxTurns: row.dur[i] };
    }
    if (row.pat === "blood_price") {
      L.self = { hpCostPct: row.hpCost[i], physDmg: row.phys[i], turns: row.dur[i] };
    }
    if (row.pat === "guard_ally") {
      L.ally = { redirect: row.redir[i], turns: row.dur[i] };
    }
    if (row.pat === "encourage") {
      L.ally = { acc: row.acc[i], healPct: row.heal[i], turns: row.dur[i] };
    }
    if (row.pat === "sanctuary_party") {
      L.party = { dr: row.dr[i], sr: row.sr[i], turns: row.dur[i] };
    }
    if (row.pat === "earthbreaker") {
      L.strPct = row.str[i] / 100;
      L.aoeAdj = row.adj[i];
      if (row.d2ch[i] > 0) L.debuff2 = { type: "physDmgDown", chance: row.d2ch[i], value: row.d2v[i], turns: row.d2t[i] };
      if (row.stch[i] > 0) L.debuff3 = { type: "stun", chance: row.stch[i], turns: row.stt[i] };
    }
    if (row.pat === "bleeding_flourish") {
      L.strPct = row.str[i] / 100;
      L.aoeAdj = row.adj[i];
      L.debuff = { type: "bleed", chance: row.dch[i], dotPct: row.dot[i], turns: row.dt[i] };
    }
    if (row.pat === "deep_lunge") {
      L.strPct = row.str[i] / 100;
      L.vsPhysResDownBonusPct = row.bonusVsPrd[i];
    }
    if (row.pat === "final_measure") {
      L.strPct = row.str[i] / 100;
      L.strPctLow = row.lowStr[i] / 100;
    }
    if (row.pat === "arcane_collapse") {
      L.intPct = row.int[i] / 100;
      L.aoeAdj = row.adj[i];
    }
    if (row.pat === "event_horizon") {
      L.intPct = row.int[i] / 100;
      L.vsBurnBonusPct = row.burnBonus[i];
    }
    if (row.pat === "steady_shot") {
      L.strPct = row.str[i] / 100;
      L.hitBonus = row.hitB[i];
    }
    if (row.pat === "piercing_shot") {
      L.strPct = row.str[i] / 100;
      L.ignorePhysResPct = row.ignore[i];
    }
    if (row.pat === "vanishing_shot") {
      L.strPct = row.str[i] / 100;
      L.self = { eva: row.eva[i], acc: row.acc[i], turns: row.dur[i] };
    }
    if (row.pat === "brutal_rush") {
      L.strPct = row.str[i] / 100;
      L.selfDamageMaxHpPct = row.selfHp[i];
    }
    if (row.pat === "bloodstorm") {
      L.strPct = row.str[i] / 100;
      L.aoeAdj = row.adj[i];
      L.selfDamageMaxHpPct = row.selfHp[i];
    }
    if (row.pat === "execute_skill") {
      L.strPct = row.str[i] / 100;
      L.strPctLow = row.lowStr[i] / 100;
    }
    if (row.pat === "burning_field") {
      L.intPct = row.int[i] / 100;
      L.aoeAdj = row.adj[i];
      L.debuff = { type: "burn", chance: row.dch[i], dotPct: row.dot[i], turns: row.dt[i] };
    }
    if (row.pat === "aoe_mag_adj" || row.pat === "aoe_phys_adj") {
      if (row.str) L.strPct = row.str[i] / 100;
      if (row.int) L.intPct = row.int[i] / 100;
      L.aoeAdj = row.adj[i];
    }
    if (row.pat === "rupture" || row.pat === "strike_debuff") {
      if (row.str) L.strPct = row.str[i] / 100;
      if (row.int) L.intPct = row.int[i] / 100;
      if (row.deb && row.dch && row.deb === "bleed") {
        L.debuff = { type: "bleed", chance: row.dch[i], dotPct: row.dot[i], turns: row.dt[i] };
      }
      if (row.deb === "physDmgDown") {
        L.debuff = { type: "physDmgDown", chance: row.dch[i], value: row.dv[i], turns: row.dt[i] };
      }
      if (row.deb === "cripple") {
        L.debuff = { type: "cripple", chance: row.dch[i], value: row.dv[i], turns: row.dt[i] };
      }
      if (row.deb === "blind") {
        L.debuff = { type: "blind", chance: row.dch[i], accDown: row.dv[i], turns: row.dt[i] };
      }
      if (row.deb === "stun") {
        L.debuff = { type: "stun", chance: row.dch[i], turns: row.dt[i] };
      }
      if (row.deb === "physResDown") {
        L.debuff = { type: "physResDown", chance: row.dch[i], value: row.dv[i], turns: row.dt[i] };
      }
      if (row.deb === "magResDown") {
        L.debuff = { type: "magResDown", chance: row.dch[i], value: row.dv[i], turns: row.dt[i] };
      }
      if (row.deb === "bothDmgDown") {
        L.debuff = { type: "bothDmgDown", chance: row.dch[i], value: row.dv[i], turns: row.dt[i] };
      }
      if (row.deb === "bothResDown") {
        L.debuff = { type: "bothResDown", chance: row.dch[i], value: row.dv[i], turns: row.dt[i] };
      }
      if (row.deb === "evaDown") {
        L.debuff = { type: "evaDown", chance: row.dch[i], value: row.dv[i], turns: row.dt[i] };
      }
      if (row.deb === "statusResDown") {
        L.debuff = { type: "statusResDown", chance: row.dch[i], value: row.dv[i], turns: row.dt[i] };
      }
      if (row.deb === "poisonDot") {
        L.debuff = { type: "poisonDot", chance: row.dch[i], dotPct: row.dot[i], turns: row.dt[i] };
      }
    }
    if (row.pat === "cleanse") {
      L.cleanse = row.cleanse[i];
      L.vitHealPct = row.vitHeal[i] ? row.vitHeal[i] / 100 : 0;
    }
    if (row.pat === "rev_pulse") {
      L.party = { nextStamina: row.stam[i], healPct: row.heal[i], turns: row.dur[i] };
    }
    if (row.pat === "crippling_mixture") {
      L.debuff = { type: "cripple", chance: row.dch1[i], value: 1, turns: 2 };
      if (row.dch2[i] > 0) {
        L.debuff2 = { type: "blind", chance: row.dch2[i], accDown: i >= 4 ? 6 : i === 3 ? 6 : 4, turns: row.dt2[i] || 1 };
      }
      L.aoeAdj = i >= 4 ? 1 : 0;
    }
    if (row.pat === "spread_contagion") {
      L.adj = row.adj[i];
      L.chance = row.ch[i];
      L.durationFracPct = row.frac[i];
    }
    out.push(L);
  }
  return out;
}

function normalize(name, row) {
  const levels = buildLevels(name, row);
  return {
    name,
    unlock: row.u,
    stamina: row.s,
    cooldown: row.c,
    passiveOnly: !!row.p,
    pattern: row.pat,
    damageKind: row.k === "mag" ? "magic" : row.k === "phys" ? "physical" : null,
    baseHit: row.bh == null ? null : row.bh,
    baseCrit: row.bc == null ? 0 : row.bc,
    levels,
    twinHits: row.hits === 2 ? 2 : undefined
  };
}

const lines = [];
lines.push("/** Auto-generated by tools/build_unified_skills_catalog.cjs — do not edit by hand. */");
lines.push("(function () {");
lines.push(`  const ORDER = ${JSON.stringify(ORDER)};`);
lines.push("  const CATALOG = {};");
for (const name of ORDER) {
  const row = T[name];
  if (!row) throw new Error("Missing table row: " + name);
  lines.push(`  CATALOG[${JSON.stringify(name)}] = ${JSON.stringify(normalize(name, row))};`);
}
lines.push("  window.UNIFIED_SKILL_ORDER = ORDER;");
lines.push("  window.SKILL_CATALOG = CATALOG;");
lines.push("})();");
lines.push("");

fs.writeFileSync(OUT, lines.join("\n"), "utf8");
console.log("Wrote", OUT);
