/** Shared helpers for skill targeting / damage modifiers (online combat). */

export function collectAoeFoes(st, centerUid, adj) {
  const living = (st.foes || []).filter((f) => f && f.hp > 0);
  const idx = living.findIndex((f) => f.uid === centerUid);
  if (idx < 0) return [];
  const spread = Math.max(0, Math.floor(adj || 0));
  if (spread >= 99) return living.slice();
  const out = [living[idx]];
  for (let j = 1; j <= spread && idx - j >= 0; j++) out.push(living[idx - j]);
  for (let j = 1; j <= spread && idx + j < living.length; j++) out.push(living[idx + j]);
  return out;
}

export function applySelfHpCost(member, st, maxHpPct) {
  if (!member || member.hp <= 0) return 0;
  const pct = Math.max(0, Number(maxHpPct) || 0);
  if (pct <= 0) return 0;
  const loss = Math.max(1, Math.floor((member.hp * pct) / 100));
  member.hp = Math.max(1, member.hp - loss);
  if (member.kind === "hero" && st) st.playerHp = member.hp;
  return loss;
}
