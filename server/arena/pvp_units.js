/**
 * Build arena combat units from player snapshots (hero only, no companions).
 */

import { preparePlayerForCombat } from "../combat/player_prep.js";
import { totalStat } from "../combat/formulas.js";
import { initUnitTacticalFields } from "../combat/tactical.js";
import { getActorCombatMaxStamina } from "../combat/stamina.js";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const TacticalGrid = require("../../shared/tactical_grid.js");

export function buildArenaHeroUnit(player, userId, uid, teamSide) {
  preparePlayerForCombat(player);
  const maxHp = typeof player.maxHp === "number" ? player.maxHp : 100;
  const hp = Math.max(1, Math.min(maxHp, typeof player.hp === "number" ? player.hp : maxHp));
  const unit = {
    uid,
    kind: "hero",
    name: player.name || "Hero",
    hp,
    maxHp,
    dex: totalStat(player, "dex"),
    str: totalStat(player, "str"),
    vit: totalStat(player, "vit"),
    int: totalStat(player, "int"),
    flatArmor: 0,
    acted: false,
    companionSlotIndex: null,
    controllerUserId: userId,
    ownerUserId: userId,
    portraitGender: player.portraitGender || player.gender || null,
    portraitClass: player.class || null,
    portraitImage: player.portraitImage || "",
    equipment: player.equipment ? { ...player.equipment } : {},
    arenaTeam: teamSide,
    isPvpUnit: teamSide === "foe",
    pvpControllerUserId: teamSide === "foe" ? userId : null,
    maxStamina: getActorCombatMaxStamina(player),
    stamina: getActorCombatMaxStamina(player),
    skillCooldowns: {},
    classState: null
  };
  if (teamSide === "foe") {
    unit.isPvpUnit = true;
    unit.pvpControllerUserId = userId;
    unit.combatScript = null;
    unit.image = unit.portraitImage || "";
  }
  return unit;
}

export function buildArenaTeamParty(players, teamSide, uidStart = 0) {
  let uid = uidStart;
  const units = [];
  for (const entry of players) {
    if (!entry?.player) continue;
    units.push(buildArenaHeroUnit(entry.player, entry.userId, uid++, teamSide));
  }
  return units;
}

export function ensureArenaUnitsPlaced(st) {
  const occ = TacticalGrid.buildOccupancy(TacticalGrid.allCombatUnits(st));
  const mark = (unit, x, y) => {
    const { w, h } = TacticalGrid.getUnitFootprint(unit);
    for (const c of TacticalGrid.footprintCells(x, y, w, h)) {
      occ.set(TacticalGrid.coordKey(c.x, c.y), unit.uid);
    }
  };
  for (const m of st.party || []) {
    if (!m || (typeof m.gridX === "number" && typeof m.gridY === "number")) continue;
    const cells = TacticalGrid.enumerateAllySpawnCells();
    const { w, h } = TacticalGrid.getUnitFootprint(m);
    const spot = TacticalGrid.firstFreeFootprintCell(cells, w, h, occ, m.uid);
    if (spot) {
      m.gridX = spot.x;
      m.gridY = spot.y;
      mark(m, spot.x, spot.y);
    }
  }
  for (const f of st.foes || []) {
    if (!f?.isPvpUnit || (typeof f.gridX === "number" && typeof f.gridY === "number")) continue;
    const cells = TacticalGrid.enumerateEnemyPlacementAnchorCells(
      TacticalGrid.getUnitFootprint(f).w,
      TacticalGrid.getUnitFootprint(f).h
    );
    const { w, h } = TacticalGrid.getUnitFootprint(f);
    const spot = TacticalGrid.firstFreeFootprintCell(cells, w, h, occ, f.uid);
    if (spot) {
      f.gridX = spot.x;
      f.gridY = spot.y;
      mark(f, spot.x, spot.y);
    }
  }
}

export function getArenaUnitForUser(st, session, userId) {
  const uid = Number(userId);
  if (st.activePvpFoeUid != null) {
    const foe = (st.foes || []).find(
      (f) =>
        f &&
        f.isPvpUnit &&
        f.uid === st.activePvpFoeUid &&
        Number(f.pvpControllerUserId) === uid &&
        f.hp > 0 &&
        !f.acted
    );
    if (foe) return { unit: foe, side: "foe" };
  }
  const ally = (st.party || []).find(
    (m) =>
      m &&
      m.uid === st.activePartyUid &&
      Number(m.controllerUserId) === uid &&
      m.hp > 0 &&
      !m.acted
  );
  if (ally) return { unit: ally, side: "ally" };
  return null;
}

export function getArenaParticipantPlayer(session, userId, unit) {
  const part = session.participants.get(userId);
  return part?.player || null;
}
