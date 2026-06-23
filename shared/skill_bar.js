/**
 * Skill bar layout (client + server). Validates slotted skills against SKILL_CATALOG.
 */
(function (root) {
  const SKILL_BAR_SLOT_COUNT = 12;
  const BASIC_SKILLS = new Set(["Basic Physical Attack", "Basic Magical Attack"]);

  function getActorSkillLevel(actor, skillName) {
    if (BASIC_SKILLS.has(skillName)) return 1;
    const map = actor?.classSkillLevels && typeof actor.classSkillLevels === "object" ? actor.classSkillLevels : {};
    const lv = map[skillName];
    return typeof lv === "number" && lv > 0 ? Math.min(5, Math.floor(lv)) : 0;
  }

  function syncActorSkillList(actor, skillOrder) {
    if (!actor || typeof actor !== "object") return [];
    if (!actor.classSkillLevels || typeof actor.classSkillLevels !== "object") {
      actor.classSkillLevels = {};
    }
    const order = Array.isArray(skillOrder) ? skillOrder : [];
    const out = ["Basic Physical Attack", "Basic Magical Attack"];
    order.forEach((name) => {
      if (!name || BASIC_SKILLS.has(name)) return;
      if (getActorSkillLevel(actor, name) > 0) out.push(name);
    });
    actor.skills = out;
    return out;
  }

  function isCombatBarSkill(skillName, catalog) {
    if (!skillName || typeof skillName !== "string") return false;
    const cat = catalog && typeof catalog === "object" ? catalog[skillName] : null;
    return !!(cat && !cat.passiveOnly);
  }

  function defaultSkillBarSlotsFromSkills(actor, catalog) {
    const out = Array(SKILL_BAR_SLOT_COUNT).fill(null);
    const names = Array.isArray(actor?.skills) ? actor.skills : [];
    let i = 0;
    for (let k = 0; k < names.length && i < SKILL_BAR_SLOT_COUNT; k++) {
      const name = names[k];
      if (!name || typeof name !== "string") continue;
      if (!isCombatBarSkill(name, catalog)) continue;
      out[i++] = name;
    }
    return out;
  }

  function ensureActorSkillBar(actor, catalog, skillOrder) {
    if (!actor || typeof actor !== "object") return;
    syncActorSkillList(actor, skillOrder);
    if (!Array.isArray(actor.skillBarSlots) || actor.skillBarSlots.length !== SKILL_BAR_SLOT_COUNT) {
      actor.skillBarSlots = defaultSkillBarSlotsFromSkills(actor, catalog);
      return;
    }
    for (let i = 0; i < SKILL_BAR_SLOT_COUNT; i++) {
      const v = actor.skillBarSlots[i];
      if (v == null || v === "") {
        actor.skillBarSlots[i] = null;
        continue;
      }
      const s = String(v).trim();
      if (!s || !isCombatBarSkill(s, catalog) || getActorSkillLevel(actor, s) <= 0) {
        actor.skillBarSlots[i] = null;
      } else {
        actor.skillBarSlots[i] = s;
      }
    }
  }

  function isSkillSlottedOnBar(actor, skillName, catalog, skillOrder) {
    if (!skillName) return false;
    if (BASIC_SKILLS.has(skillName)) return true;
    ensureActorSkillBar(actor, catalog, skillOrder);
    return (actor.skillBarSlots || []).some((s) => s === skillName);
  }

  function applySkillBarPayload(actor, payload) {
    if (!actor || !payload || typeof payload !== "object") return;
    const slots = payload.skillBarSlots;
    if (!Array.isArray(slots) || slots.length !== SKILL_BAR_SLOT_COUNT) return;
    actor.skillBarSlots = slots.map((v) => {
      if (v == null || v === "") return null;
      const s = String(v).trim();
      return s || null;
    });
  }

  function prepareActorForCombat(actor, catalog, skillOrder) {
    if (!actor) return;
    ensureActorSkillBar(actor, catalog, skillOrder);
  }

  const api = Object.freeze({
    SKILL_BAR_SLOT_COUNT,
    getActorSkillLevel,
    syncActorSkillList,
    isCombatBarSkill,
    defaultSkillBarSlotsFromSkills,
    ensureActorSkillBar,
    isSkillSlottedOnBar,
    applySkillBarPayload,
    prepareActorForCombat
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.SkillBar = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : global);
