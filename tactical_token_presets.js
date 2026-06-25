/** Per-enemy tactical board token layout (visual only — does not affect grid occupancy).
 * Keys match `combatScript` from config.js (fallback: slugified enemy name).
 * Edit in combat with Layout Edit on: drag foe token art, Shift+drag/wheel scale art,
 * Ctrl+wheel resize token box. Export JSON → paste into `tacticalTokenPresets` below.
 *
 * Layout fields:
 * - offsetXPct, offsetYPct, rotDeg, scalePct — transform on art inside the token box
 * - tokenWidthPct, tokenHeightPct — token box size (% of default foe token dimensions)
 */
(function () {
  const presets = {
    gorilla: {
      offsetXPct: -20.2361,
      offsetYPct: -0.852874,
      rotDeg: 0,
      scalePct: 262,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    greenleaf_fox: {
      offsetXPct: -1.3490725126475547,
      offsetYPct: -5.970149253731343,
      rotDeg: 10,
      scalePct: 178,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    greenleaf_squirrel: {
      offsetXPct: -9.44351,
      offsetYPct: -5.97015,
      rotDeg: 0,
      scalePct: 106,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    greenleaf_parrot: {
      offsetXPct: 4.0472175379426645,
      offsetYPct: -1.7057569296375266,
      rotDeg: 0,
      scalePct: 178,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    greenleaf_stag: {
      offsetXPct: -8.094435075885329,
      offsetYPct: -4.264392324093817,
      rotDeg: 0,
      scalePct: 196,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    burrow_hare: {
      offsetXPct: -1.3490725126475547,
      offsetYPct: -13.646055437100213,
      rotDeg: 0,
      scalePct: 88,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    plains_raptor: {
      offsetXPct: -13.490725126475548,
      offsetYPct: -13.646055437100213,
      rotDeg: 0,
      scalePct: 202,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    field_wolf: {
      offsetXPct: -2.69815,
      offsetYPct: -0.852878,
      rotDeg: 0,
      scalePct: 172,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    tusk_boar: {
      offsetXPct: -10.792580101180437,
      offsetYPct: 0,
      rotDeg: 0,
      scalePct: 196,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    grass_snake: {
      offsetXPct: -6.745362563237774,
      offsetYPct: -13.646055437100213,
      rotDeg: 0,
      scalePct: 118,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    rock_lizard: {
      offsetXPct: 4.047212613827993,
      offsetYPct: -6.822979957356075,
      rotDeg: 0,
      scalePct: 154,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    rock_lynx: {
      offsetXPct: 2.6981450252951094,
      offsetYPct: -11.087420042643924,
      rotDeg: 0,
      scalePct: 226,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    rock_serpent: {
      offsetXPct: -12.1417,
      offsetYPct: -11.9403,
      rotDeg: 0,
      scalePct: 172,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    rock_ibex: {
      offsetXPct: -6.74536,
      offsetYPct: -8.52878,
      rotDeg: -1,
      scalePct: 184,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    lava_basilisk: {
      offsetXPct: 1.3490725632377742,
      offsetYPct: -11.087407675906185,
      rotDeg: 0,
      scalePct: 202,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    magma_boar: {
      offsetXPct: -24.283290050590217,
      offsetYPct: -19.61622153518124,
      rotDeg: 0,
      scalePct: 172,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    ember_scuttler: {
      offsetXPct: -21.585162563237773,
      offsetYPct: -10.2346,
      rotDeg: 0,
      scalePct: 124,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    cinder_stalker: {
      offsetXPct: -10.792609949409782,
      offsetYPct: -18.763321535181237,
      rotDeg: 0,
      scalePct: 190,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    ash_lizard: {
      offsetXPct: -8.094435075885329,
      offsetYPct: -11.940298507462686,
      rotDeg: 0,
      scalePct: 160,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    hermit_crab: {
      offsetXPct: -17.5379,
      offsetYPct: 17.0576,
      rotDeg: 0,
      scalePct: 100,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    driftling: {
      offsetXPct: -20.2361,
      offsetYPct: 4.26439,
      rotDeg: 0,
      scalePct: 124,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    tide_hopper: {
      offsetXPct: -13.490725126475548,
      offsetYPct: -19.616204690831555,
      rotDeg: 0,
      scalePct: 100,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    coastal_horror: {
      offsetXPct: -6.74536,
      offsetYPct: 11.9403,
      rotDeg: 0,
      scalePct: 202,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    tidemeld_revenant: {
      offsetXPct: -16.188867639123103,
      offsetYPct: -3.411513859275053,
      rotDeg: 0,
      scalePct: 142,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    tideharrow: {
      offsetXPct: -14.839797639123104,
      offsetYPct: -4.264392324093817,
      rotDeg: 0,
      scalePct: 190,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    brinegullet_spitter: {
      offsetXPct: 1.34907,
      offsetYPct: -7.675907675906184,
      rotDeg: 0,
      scalePct: 136,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    saltwind_skimmer: {
      offsetXPct: 10.792580101180437,
      offsetYPct: -12.79317697228145,
      rotDeg: 0,
      scalePct: 172,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    wavebreaker_idol: {
      offsetXPct: -13.490745025295109,
      offsetYPct: -10.234543070362474,
      rotDeg: 0,
      scalePct: 214,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    cliff_lurker: {
      offsetXPct: 6.745362563237774,
      offsetYPct: 5.970149253731343,
      rotDeg: 0,
      scalePct: 178,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    cinder_husk: {
      offsetXPct: -13.490725126475548,
      offsetYPct: 11.087420042643924,
      rotDeg: 0,
      scalePct: 142,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    ash_skulker: {
      offsetXPct: 0,
      offsetYPct: 5.11727078891258,
      rotDeg: 0,
      scalePct: 178,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    ash_horror: {
      offsetXPct: -28.330522765598655,
      offsetYPct: 26.439232409381663,
      rotDeg: 0,
      scalePct: 202,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    faded_war_wraith: {
      offsetXPct: -21.585172512647556,
      offsetYPct: 28.997855437100213,
      rotDeg: 0,
      scalePct: 178,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    remnant_of_rust: {
      offsetXPct: -16.1889,
      offsetYPct: 36.6738,
      rotDeg: 0,
      scalePct: 226,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    witherling: {
      offsetXPct: -20.236087689713322,
      offsetYPct: 6.823027718550106,
      rotDeg: 0,
      scalePct: 154,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    desert_thornback_crawler: {
      offsetXPct: -16.188909949409783,
      offsetYPct: 7.675910831556505,
      rotDeg: 0,
      scalePct: 232,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    mirage_lurker: {
      offsetXPct: -17.537954974704892,
      offsetYPct: 14.498923240938165,
      rotDeg: 0,
      scalePct: 322,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    dust_carver: {
      offsetXPct: -20.236090151770657,
      offsetYPct: -0.8528822814498938,
      rotDeg: 0,
      scalePct: 160,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    dune_devourer: {
      offsetXPct: -8.094454974704892,
      offsetYPct: 4.2643831556503216,
      rotDeg: 0,
      scalePct: 292,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    ice_tusked_boar: {
      offsetXPct: -29.6796,
      offsetYPct: -3.41149,
      rotDeg: 0,
      scalePct: 268,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    frozen_pinecone: {
      offsetXPct: -12.141650050590219,
      offsetYPct: -11.087458422174839,
      rotDeg: 0,
      scalePct: 148,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    pinebound_fawn: {
      offsetXPct: -16.188875075885328,
      offsetYPct: -4.26442302771855,
      rotDeg: 0,
      scalePct: 184,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    barkhide_spriggan: {
      offsetXPct: -8.09444,
      offsetYPct: -5.117250746268658,
      rotDeg: 0,
      scalePct: 256,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    winter_guardian: {
      offsetXPct: -36.425027487352445,
      offsetYPct: 8.528809253731342,
      rotDeg: 0,
      scalePct: 370,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    frost_skitter: {
      offsetXPct: -5.396292462057335,
      offsetYPct: -4.26442302771855,
      rotDeg: 0,
      scalePct: 190,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    icy_mink: {
      offsetXPct: 0.0000024620573357836406,
      offsetYPct: 2.558612324093817,
      rotDeg: 0,
      scalePct: 172,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    glacier_turtoise: {
      offsetXPct: -10.792627487352446,
      offsetYPct: -0.0000014925373150731502,
      rotDeg: 0,
      scalePct: 238,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    frozen_stalker: {
      offsetXPct: -4.04722,
      offsetYPct: -2.5586761407249465,
      rotDeg: 0,
      scalePct: 214,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    icy_serpent: {
      offsetXPct: -9.44351005059022,
      offsetYPct: -4.264415351812367,
      rotDeg: 0,
      scalePct: 172,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    }
  };
  if (typeof GAME_CONFIG !== "undefined" && GAME_CONFIG) {
    GAME_CONFIG.tacticalTokenPresets = presets;
  }
})();
