/** Portrait equipment positions, base transforms, and hero art per character gender.
 * Edit female layouts in Edit Mode (switch to Female), reposition gear, then Export equip layout.
 * Paste exported JSON into portraitCharacterPresets.female in this file or config.
 */
(function () {
  const presets = {
  "male": {
    "label": "Male",
    "heroPortraits": {
      "idle": "Assets/Character/male_character.png",
      "walk": "Assets/Character/male_character.png",
      "attack": "Assets/Character/male_character.png"
    },
    "baseLayout": {
      "offsetXPct": 11.566826474173666,
      "offsetYPct": -4.0486297112605,
      "rotDeg": 0,
      "scalePct": 124
    },
    "bottomHudLayout": {
      "offsetXPct": 0,
      "offsetYPct": 0,
      "rotDeg": 0,
      "scalePct": 100
    },
    "weaponOcclusion": {
      "Assets/Character/male_character.png": {
        "backHandClip": "polygon(58% 52%, 74% 49%, 86% 56%, 88% 71%, 79% 83%, 63% 81%, 56% 67%)",
        "frontBodyClip": "polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0, 52% 49%, 57% 63%, 55% 79%, 43% 83%, 36% 72%, 38% 56%)"
      },
      "Assets/Character/male_template.png": {
        "backHandClip": "polygon(58% 52%, 74% 49%, 86% 56%, 88% 71%, 79% 83%, 63% 81%, 56% 67%)",
        "frontBodyClip": "polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0, 52% 49%, 57% 63%, 55% 79%, 43% 83%, 36% 72%, 38% 56%)"
      }
    },
    "equipment": {
      "weapon": {
        "offsetXPct": -106.26729560795518,
        "offsetYPct": -43.375242659607835,
        "rotDeg": 3,
        "scalePct": 172
      },
      "weapon_one_handed_sword": {
        "offsetXPct": -106.26729560795518,
        "offsetYPct": -43.375242659607835,
        "rotDeg": 3,
        "scalePct": 172
      },
      "weapon_dagger": {
        "offsetXPct": -84.86835294834734,
        "offsetYPct": -78.6537897112605,
        "rotDeg": 11.5,
        "scalePct": 70
      },
      "weapon_greatsword": {
        "offsetXPct": -139.81,
        "offsetYPct": -40.4835,
        "rotDeg": 22.5,
        "scalePct": 160
      },
      "weapon_two_handed": {
        "offsetXPct": -109.736,
        "offsetYPct": -58.4119,
        "rotDeg": 17.5,
        "scalePct": 172
      },
      "chest": {
        "offsetXPct": 7.518376474173667,
        "offsetYPct": -32.3869,
        "rotDeg": 0,
        "scalePct": 64
      },
      "chest_robe": {
        "offsetXPct": 7.518376474173667,
        "offsetYPct": -24.3869,
        "rotDeg": 0,
        "scalePct": 74
      },
      "amulet": {
        "offsetXPct": 1.1566791337815001,
        "offsetYPct": -77.49704265960783,
        "rotDeg": -12.5,
        "scalePct": 40
      },
      "bracelet": {
        "offsetXPct": -86.17220589669466,
        "offsetYPct": -38.170161732437,
        "rotDeg": 12,
        "scalePct": 15
      },
      "feet": {
        "offsetXPct": 2.3133735258263335,
        "offsetYPct": 5.783326474173667,
        "rotDeg": 0,
        "scalePct": 82
      },
      "head": {
        "offsetXPct": 2.3133532370868335,
        "offsetYPct": -32.3868,
        "rotDeg": 0,
        "scalePct": 52
      },
      "head_veil": {
        "offsetXPct": 2.3133532370868335,
        "offsetYPct": -34.3868,
        "rotDeg": 0,
        "scalePct": 62
      },
      "legs": {
        "offsetXPct": 6.9399664741736675,
        "offsetYPct": -20.241736762913167,
        "rotDeg": 0,
        "scalePct": 106
      },
      "ring1": {
        "offsetXPct": 258.9379485563025,
        "offsetYPct": -154.416226352269,
        "rotDeg": 0,
        "scalePct": 15
      },
      "ring2": {
        "offsetXPct": -249.26419825154085,
        "offsetYPct": -167.71818995506982,
        "rotDeg": 12.5,
        "scalePct": 15
      },
      "offhand": {
        "offsetXPct": 102.9440102887395,
        "offsetYPct": -49.73697911630142,
        "rotDeg": 34,
        "scalePct": 160
      },
      "offhand_one_handed_sword": {
        "offsetXPct": 100.6309897112605,
        "offsetYPct": -44.532036762913165,
        "rotDeg": 33,
        "scalePct": 178
      },
      "offhand_dagger": {
        "offsetXPct": 146.319,
        "offsetYPct": -68.2438,
        "rotDeg": 37.5,
        "scalePct": 76
      },
      "offhand_shield": {
        "offsetXPct": 102.9440102887395,
        "offsetYPct": -49.73697911630142,
        "rotDeg": 34,
        "scalePct": 160
      },
      "male_offhand_fixed_arm": {
        "offsetXPct": -120.873,
        "offsetYPct": -115.088,
        "rotDeg": 0,
        "scalePct": 70
      },
      "male_no_weapon": {
        "offsetXPct": -106.98864265960783,
        "offsetYPct": -66.651858845042,
        "rotDeg": 9,
        "scalePct": 20
      },
      "male_no_helm": {
        "offsetXPct": 2.8917030092996683,
        "offsetYPct": -32.38687352582633,
        "rotDeg": 0,
        "scalePct": 40
      }
    }
  },
  "female": {
    "label": "Female",
    "heroPortraits": {
      "idle": "Assets/Character/female_character.png",
      "walk": "Assets/Character/female_character.png",
      "attack": "Assets/Character/female_character.png"
    },
    "baseLayout": {
      "offsetXPct": 21.08781710800357,
      "offsetYPct": 3.18735,
      "rotDeg": 0,
      "scalePct": 184
    },
    "bottomHudLayout": {
      "offsetXPct": 0,
      "offsetYPct": 0,
      "rotDeg": 0,
      "scalePct": 149
    },
    "weaponOcclusion": {
      "Assets/Character/female_character.png": {
        "backHandClip": "polygon(58% 52%, 74% 49%, 86% 56%, 88% 71%, 79% 83%, 63% 81%, 56% 67%)",
        "frontBodyClip": "polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0, 52% 49%, 57% 63%, 55% 79%, 43% 83%, 36% 72%, 38% 56%)"
      }
    },
    "equipment": {
      "amulet": {
        "offsetXPct": -1.1283528919964296,
        "offsetYPct": -34.46224650401666,
        "rotDeg": -12.5,
        "scalePct": 22
      },
      "bracelet": {
        "offsetXPct": -81.60220699196667,
        "offsetYPct": -27.50667060398691,
        "rotDeg": 12,
        "scalePct": 9
      },
      "chest": {
        "offsetXPct": 4.09083,
        "offsetYPct": -23.2468,
        "rotDeg": 0,
        "scalePct": 40
      },
      "chest_robe": {
        "offsetXPct": 9.04173843201428,
        "offsetYPct": -8.344985063969057,
        "rotDeg": 0,
        "scalePct": 66
      },
      "feet": {
        "offsetXPct": -0.733342,
        "offsetYPct": -24.683839036001192,
        "rotDeg": 2,
        "scalePct": 58
      },
      "female_no_helm": {
        "offsetXPct": -0.154981,
        "offsetYPct": -1.15806,
        "rotDeg": 0,
        "scalePct": 34
      },
      "female_no_weapon": {
        "offsetXPct": -98.2295,
        "offsetYPct": -69.6985,
        "rotDeg": 9,
        "scalePct": 13
      },
      "female_offhand_fixed_arm": {
        "offsetXPct": -167.33548289199643,
        "offsetYPct": -121.9451609639988,
        "rotDeg": 0,
        "scalePct": 34
      },
      "head": {
        "offsetXPct": 0.7899940360011901,
        "offsetYPct": -5.72807,
        "rotDeg": 0,
        "scalePct": 40
      },
      "head_veil": {
        "offsetXPct": 3.07503,
        "offsetYPct": 5.98213,
        "rotDeg": 0,
        "scalePct": 66
      },
      "legs": {
        "offsetXPct": 3.13157,
        "offsetYPct": -30.9052,
        "rotDeg": 0,
        "scalePct": 76
      },
      "offhand": {
        "offsetXPct": 102.9440102887395,
        "offsetYPct": -49.73697911630142,
        "rotDeg": 34,
        "scalePct": 160
      },
      "offhand_dagger": {
        "offsetXPct": 120.04151710800357,
        "offsetYPct": -70.14801710800357,
        "rotDeg": 37.5,
        "scalePct": 40
      },
      "offhand_one_handed_sword": {
        "offsetXPct": 93.0143,
        "offsetYPct": -53.672039036001195,
        "rotDeg": 33,
        "scalePct": 136
      },
      "offhand_shield": {
        "offsetXPct": 102.9440102887395,
        "offsetYPct": -49.73697911630142,
        "rotDeg": 34,
        "scalePct": 160
      },
      "ring1": {
        "offsetXPct": 233.04309253198454,
        "offsetYPct": -161.2707325200833,
        "rotDeg": 41,
        "scalePct": 9
      },
      "ring2": {
        "offsetXPct": -231.36478458792024,
        "offsetYPct": -168.4796399880988,
        "rotDeg": -18.5,
        "scalePct": 11
      },
      "weapon": {
        "offsetXPct": -106.26729560795518,
        "offsetYPct": -43.375242659607835,
        "rotDeg": 3,
        "scalePct": 172
      },
      "weapon_dagger": {
        "offsetXPct": -85.6301,
        "offsetYPct": -76.3688,
        "rotDeg": 11.5,
        "scalePct": 40
      },
      "weapon_greatsword": {
        "offsetXPct": -119.62551710800358,
        "offsetYPct": -54.19362192799762,
        "rotDeg": 22.5,
        "scalePct": 88
      },
      "weapon_one_handed_sword": {
        "offsetXPct": -100.17313903600119,
        "offsetYPct": -54.41941710800357,
        "rotDeg": 3,
        "scalePct": 112
      },
      "weapon_two_handed": {
        "offsetXPct": -100.59632192799762,
        "offsetYPct": -64.88609518000595,
        "rotDeg": 17.5,
        "scalePct": 112
      }
    }
  }
};
  if (typeof GAME_CONFIG !== "undefined" && GAME_CONFIG) {
    GAME_CONFIG.portraitCharacterPresets = presets;
  }
})();
