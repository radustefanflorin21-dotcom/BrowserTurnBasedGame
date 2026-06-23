/**
 * Tier-pool gathering tables (Harvester / Skinner / Extractor).
 */
(function (root) {
  const PROFESSION_GATHERING_TABLES = Object.freeze({
    skinner: Object.freeze({
      beast: Object.freeze({
        t1: Object.freeze(["Raw Hide", "Thin Fur", "Soft Leather"]),
        t2: Object.freeze(["Tough Hide", "Thick Fur", "Treated Leather"]),
        t3: Object.freeze(["Reinforced Hide", "Dense Fur", "Hardened Leather"]),
        t4: Object.freeze(["Elite Hide", "Primal Fur", "Flexible Reinforced Leather"]),
        t5: Object.freeze(["Mythic Hide", "Alpha Pelt", "Perfected Leather"])
      })
    }),
    extractor: Object.freeze({
      beast: Object.freeze({
        t1: Object.freeze(["Bone Fragment", "Small Tooth"]),
        t2: Object.freeze(["Dense Bone", "Sharp Fang"]),
        t3: Object.freeze(["Reinforced Bone", "Heavy Fang"]),
        t4: Object.freeze(["Elite Bone", "Predator Fang"]),
        t5: Object.freeze(["Titan Bone", "Apex Core"])
      }),
      stone: Object.freeze({
        t1: Object.freeze(["Stone Fragment", "Rough Core"]),
        t2: Object.freeze(["Dense Stone", "Solid Core"]),
        t3: Object.freeze(["Reinforced Stone", "Stable Core"]),
        t4: Object.freeze(["Crystal Stone", "Hardened Core"]),
        t5: Object.freeze(["Titan Core", "Crystalized Core"])
      }),
      construct: Object.freeze({
        t1: Object.freeze(["Metal Scrap"]),
        t2: Object.freeze(["Reinforced Scrap"]),
        t3: Object.freeze(["Mechanism Part"]),
        t4: Object.freeze(["Advanced Mechanism"]),
        t5: Object.freeze(["Perfect Core"])
      }),
      undead: Object.freeze({
        t1: Object.freeze(["Bone Dust"]),
        t2: Object.freeze(["Fragmented Core"]),
        t3: Object.freeze(["Spirit Core"]),
        t4: Object.freeze(["Condensed Soul"]),
        t5: Object.freeze(["Ancient Soul Core"])
      })
    }),
    harvester: Object.freeze({
      nature: Object.freeze({
        t1: Object.freeze(["Seeds", "Plant Fiber"]),
        t2: Object.freeze(["Growth Seed", "Bark"]),
        t3: Object.freeze(["Living Fiber", "Bark Fragment"]),
        t4: Object.freeze(["Ancient Seed", "Vital Growth"]),
        t5: Object.freeze(["World Seed", "Life Core"])
      }),
      elemental: Object.freeze({
        t1: Object.freeze(["Residue"]),
        t2: Object.freeze(["Infused Dust"]),
        t3: Object.freeze(["Elemental Fragment"]),
        t4: Object.freeze(["Charged Core"]),
        t5: Object.freeze(["Pure Essence"])
      }),
      undead: Object.freeze({
        t1: Object.freeze(["Faint Residue"]),
        t2: Object.freeze(["Soul Dust"]),
        t3: Object.freeze(["Spirit Thread"]),
        t4: Object.freeze(["Echo Fragment"]),
        t5: Object.freeze(["Bound Soul"])
      })
    })
  });

  const api = Object.freeze({ PROFESSION_GATHERING_TABLES });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.GatheringTables = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : global);
