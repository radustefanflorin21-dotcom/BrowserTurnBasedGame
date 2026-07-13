/** Per-enemy tactical board token layout (visual only — does not affect grid occupancy).
 * Keys match `combatScript` from config.js (fallback: slugified enemy name).
 * Ally board tokens: `tactical_ally_male` and `tactical_ally_female` (separate resize/position per gender).
 * Edit in combat with Layout Edit on: drag token, Shift+drag/wheel scale, Ctrl+wheel resize box.
 * Export JSON → paste into `tacticalTokenPresets` below.
 *
 * Layout fields:
 * - offsetXPct, offsetYPct, rotDeg, scalePct — transform on the token (feet-anchored)
 * - tokenWidthPct, tokenHeightPct — token box size (% of default ally token dimensions)
 */
(function () {
  const presets = {
    tactical_ally_male: {
      offsetXPct: -20.440603013089856,
      offsetYPct: -20.8294,
      rotDeg: 0,
      scalePct: 112,
      tokenWidthPct: 100,
      tokenHeightPct: 100,
      modelRotationY: 0,
      cameraPitch: 0,
      cameraYaw: 0
    },
    tactical_ally_female: {
      offsetXPct: -16.94309491521011,
      offsetYPct: -18.508716551854143,
      rotDeg: 0,
      scalePct: 136,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
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
      offsetXPct: -0.43358157386480367,
      offsetYPct: 8.510016054032992,
      rotDeg: 0,
      scalePct: 100,
      tokenWidthPct: 76,
      tokenHeightPct: 76,
      modelRotationY: 0,
      cameraPitch: 18.5,
      cameraYaw: 20
    },
    driftling: {
      offsetXPct: 4.344592605428934,
      offsetYPct: 25.611168498567974,
      rotDeg: 0,
      scalePct: 124,
      tokenWidthPct: 84,
      tokenHeightPct: 84,
      modelRotationY: 0,
      cameraPitch: 47,
      cameraYaw: -153.5
    },
    tide_hopper: {
      offsetXPct: -4.0962,
      offsetYPct: 18.6724,
      rotDeg: 0,
      scalePct: 112,
      tokenWidthPct: 80,
      tokenHeightPct: 80,
      modelRotationY: -45.5,
      cameraPitch: 33,
      cameraYaw: 0
    },
    tide_echo: {
      offsetXPct: 2.5545667854243352,
      offsetYPct: 24.602261667269893,
      rotDeg: 0,
      scalePct: 120,
      tokenWidthPct: 72,
      tokenHeightPct: 72,
      modelRotationY: -45.5,
      cameraPitch: 30.5,
      cameraYaw: -21.5
    },
    coastal_horror: {
      offsetXPct: 2.30133,
      offsetYPct: 33.2607,
      rotDeg: 0,
      scalePct: 136,
      tokenWidthPct: 100,
      tokenHeightPct: 100,
      modelRotationY: 0,
      cameraPitch: 28.5,
      cameraYaw: 7
    },
    tidemeld_revenant: {
      offsetXPct: 1.2659,
      offsetYPct: 8.64951,
      rotDeg: 0,
      scalePct: 112,
      tokenWidthPct: 100,
      tokenHeightPct: 100,
      modelRotationY: 0,
      cameraPitch: 19,
      cameraYaw: 39.5
    },
    tideharrow: {
      offsetXPct: -2.74211,
      offsetYPct: 30.5956,
      rotDeg: 0,
      scalePct: 130,
      tokenWidthPct: 100,
      tokenHeightPct: 100,
      modelRotationY: 0,
      cameraPitch: 21,
      cameraYaw: 38
    },
    brinegullet_spitter: {
      offsetXPct: 6.92736,
      offsetYPct: 29.1042,
      rotDeg: 0,
      scalePct: 136,
      tokenWidthPct: 88,
      tokenHeightPct: 88,
      modelRotationY: 0,
      cameraPitch: 39.5,
      cameraYaw: 47
    },
    saltwind_skimmer: {
      offsetXPct: 4.79879,
      offsetYPct: 41.8542,
      rotDeg: 0,
      scalePct: 172,
      tokenWidthPct: 76,
      tokenHeightPct: 76,
      modelRotationY: 0,
      cameraPitch: 46,
      cameraYaw: -38
    },
    wavebreaker_idol: {
      offsetXPct: -1.08382,
      offsetYPct: 17.908,
      rotDeg: 0,
      scalePct: 111,
      tokenWidthPct: 100,
      tokenHeightPct: 100,
      modelRotationY: 0,
      cameraPitch: 24.5,
      cameraYaw: 46
    },
    cliff_lurker: {
      offsetXPct: 10.2408,
      offsetYPct: 36.7491,
      rotDeg: 0,
      scalePct: 174,
      tokenWidthPct: 72,
      tokenHeightPct: 72,
      modelRotationY: 0,
      cameraPitch: 53,
      cameraYaw: 55.5
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
    rustbound_marshal: {
      offsetXPct: -10.23980979266577,
      offsetYPct: -10.5241,
      rotDeg: 0,
      scalePct: 190,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    fallen_echo: {
      offsetXPct: -18,
      offsetYPct: 24,
      rotDeg: 0,
      scalePct: 178,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    bannerless_wraithlord: {
      offsetXPct: -26.2092,
      offsetYPct: -10.2711,
      rotDeg: 0,
      scalePct: 185,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    the_last_warmaster: {
      offsetXPct: -16.79403540572541,
      offsetYPct: -15.6887,
      rotDeg: 0,
      scalePct: 200,
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
    thornback_graveguard: {
      offsetXPct: -15.916023436610963,
      offsetYPct: 16.77008325236206,
      rotDeg: 0,
      scalePct: 178,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    mirage_maw: {
      offsetXPct: -5.059020747736657,
      offsetYPct: 16.204686556058885,
      rotDeg: 0,
      scalePct: 160,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    dune_mourner: {
      offsetXPct: -4.547435267603132,
      offsetYPct: -3.354016405254366,
      rotDeg: 0,
      scalePct: 178,
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
    },
    hollowglass_siren: {
      offsetXPct: -10.7926,
      offsetYPct: -6.8230014925373155,
      rotDeg: 0,
      scalePct: 184,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    ashmaw_titan: {
      offsetXPct: -4.72175,
      offsetYPct: -3.0990393903854656,
      rotDeg: 0,
      scalePct: 202,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    inferno_oracle: {
      offsetXPct: -4.380106872041209,
      offsetYPct: -5.538171774591271,
      rotDeg: 0,
      scalePct: 154,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    rimebound_undertaker: {
      offsetXPct: -31.028670202360875,
      offsetYPct: -10.234518464818764,
      rotDeg: 0,
      scalePct: 202,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    frosthorn_bulwark: {
      offsetXPct: -43.170362563237774,
      offsetYPct: 4.264415351812367,
      rotDeg: 0,
      scalePct: 178,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    sleeping_child_of_winter: {
      offsetXPct: -29.6796,
      offsetYPct: -19.6162,
      rotDeg: 0,
      scalePct: 124,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    whitebark_matron: {
      offsetXPct: -49.915682967959526,
      offsetYPct: -7.675906183368871,
      rotDeg: 0,
      scalePct: 226,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    stormfang_ravager: {
      offsetXPct: -9.27605,
      offsetYPct: 22.6096,
      rotDeg: 0,
      scalePct: 136,
      tokenWidthPct: 100,
      tokenHeightPct: 100,
      modelRotationY: 0,
      cameraPitch: 20,
      cameraYaw: 41
    },
    abyssal_tempest_caller: {
      offsetXPct: 1.95323,
      offsetYPct: 25.8827,
      rotDeg: 0,
      scalePct: 130,
      tokenWidthPct: 100,
      tokenHeightPct: 100,
      modelRotationY: 0,
      cameraPitch: 36.5,
      cameraYaw: 45
    },
    bramblehorn_matriarch: {
      offsetXPct: -32.35022778182014,
      offsetYPct: -12.183978198277014,
      rotDeg: 0,
      scalePct: 196,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    fangroot_alpha: {
      offsetXPct: -14.33388364423841,
      offsetYPct: -6.3965882780294425,
      rotDeg: 0,
      scalePct: 160,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    gaiahide_behemoth: {
      offsetXPct: -14.333891020887293,
      offsetYPct: -3.1982941390147213,
      rotDeg: 0,
      scalePct: 160,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    granitehorn_breaker: {
      offsetXPct: -7.60041,
      offsetYPct: 0,
      rotDeg: 0,
      scalePct: 142,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    held_colossus: {
      offsetXPct: 2.6981509758926525,
      offsetYPct: -12.206020824466245,
      rotDeg: 0,
      scalePct: 160,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    verdant_bloomseer: {
      offsetXPct: 3.1067469915699086,
      offsetYPct: -7.856332593804709,
      rotDeg: 0,
      scalePct: 184,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    primordial_silverback: {
      offsetXPct: -16.4483,
      offsetYPct: -0.6829766159113462,
      rotDeg: 0,
      scalePct: 190,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    petrified_coilwarden: {
      offsetXPct: -2.023611281618887,
      offsetYPct: -0.000023027718549784026,
      rotDeg: 0,
      scalePct: 100,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    the_heartbloom_ancient: {
      offsetXPct: -3.427373027838436,
      offsetYPct: -21.107707904885338,
      rotDeg: 0,
      scalePct: 148,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    the_riftforge_tyrant: {
      offsetXPct: -16.6444,
      offsetYPct: -15.5069,
      rotDeg: 0,
      scalePct: 154,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    },
    drowned_channeler: {
      offsetXPct: 2.87897,
      offsetYPct: 16.7862,
      rotDeg: 0,
      scalePct: 136,
      tokenWidthPct: 100,
      tokenHeightPct: 100,
      modelRotationY: 0,
      cameraPitch: 14.5,
      cameraYaw: -1
    },
    tidebound_crusher: {
      offsetXPct: 11.8196,
      offsetYPct: 44.0061,
      rotDeg: 0,
      scalePct: 196,
      tokenWidthPct: 100,
      tokenHeightPct: 100,
      modelRotationY: 0,
      cameraPitch: 31.5,
      cameraYaw: 6
    },
    tidemother_aberration: {
      offsetXPct: -0.683754,
      offsetYPct: 28.2986,
      rotDeg: 0,
      scalePct: 178,
      tokenWidthPct: 100,
      tokenHeightPct: 100,
      modelRotationY: 0,
      cameraPitch: 18.5,
      cameraYaw: -1
    },
    stormwake_leviathan: {
      offsetXPct: 5.12401,
      offsetYPct: 31.8133,
      rotDeg: 0,
      scalePct: 124,
      tokenWidthPct: 100,
      tokenHeightPct: 100,
      modelRotationY: 0,
      cameraPitch: 43.5,
      cameraYaw: -20
    },
    the_stillness_below: {
      offsetXPct: 23.38225545563128,
      offsetYPct: 5.969881549327056,
      rotDeg: 0,
      scalePct: 130,
      tokenWidthPct: 100,
      tokenHeightPct: 100
    }
  };
  const TOKEN_PRESET_REV = "2026-07-13-stormbreak-3d";
  if (typeof GAME_CONFIG !== "undefined" && GAME_CONFIG) {
    GAME_CONFIG.tacticalTokenPresets = presets;
    GAME_CONFIG.tacticalTokenPresetRev = TOKEN_PRESET_REV;
  }
  if (typeof window !== "undefined") {
    window.TACTICAL_TOKEN_PRESET_REV = TOKEN_PRESET_REV;
  }
})();
