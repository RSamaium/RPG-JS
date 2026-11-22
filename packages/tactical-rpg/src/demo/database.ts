import { tacticalEncounter, tacticalRole, tacticalSkill, tacticalUnit } from "../core";

/**
 * Ember Oath: the demo content, declared in the RPGJS database like any other
 * game data (the plugin reads skills, units and encounters from there).
 */
export const emberDatabase = {
  // ------------------------------------------------------------ roles
  // warrior / archer / mage are built in; any other role is declared here.
  paladin: tacticalRole({ name: "Paladin", battle: { attack: "melee", glyph: "✠", color: 0xffe29a } }),
  occultist: tacticalRole({ name: "Occultiste", battle: { attack: "magic", glyph: "☾", color: 0xd98cff } }),
  crossbow: tacticalRole({ name: "Arbalétrier", battle: { attack: "ranged", glyph: "➹", color: 0xa9e38c } }),

  // ------------------------------------------------------------ skills
  "oath-breaker": tacticalSkill({
    name: "Brise-serment",
    description: "Une frappe lourde sur une seule cible.",
    battle: { cost: 8, power: 42, range: 1, shape: "single", visual: "slash", color: 0xffdb95 },
  }),
  "earth-shatter": tacticalSkill({
    name: "Onde tellurique",
    description: "Fracture le sol en croix autour de la cible.",
    battle: { cost: 12, power: 26, range: 1, shape: "cross", visual: "shockwave", color: 0xffa86a },
  }),
  "astral-arrow": tacticalSkill({
    name: "Flèche astrale",
    description: "Traverse la cible et atteint la case suivante.",
    battle: { cost: 8, power: 32, range: 3, shape: "pierce", visual: "arrow", color: 0x80e8d4 },
  }),
  starfall: tacticalSkill({
    name: "Pluie d’étoiles",
    description: "Une volée de flèches frappe une zone en croix.",
    battle: { cost: 12, power: 22, range: 4, shape: "cross", visual: "volley", color: 0xa1cfff },
  }),
  "ember-nova": tacticalSkill({
    name: "Nova du brasier",
    description: "Embrase une zone de 3 × 3 autour de la cible.",
    battle: { cost: 14, power: 30, range: 3, shape: "square", visual: "fire", color: 0xff995d },
  }),
  "frost-lance": tacticalSkill({
    name: "Lance de givre",
    description: "Un cristal de glace frappe une cible lointaine.",
    battle: { cost: 8, power: 38, range: 4, shape: "single", visual: "frost", color: 0x9be9ff },
  }),

  // ------------------------------------------------------------ units
  kael: tacticalUnit({
    name: "Kaël",
    description: "Un rempart entre ses compagnons et le brasier.",
    battle: {
      role: "warrior",
      battler: "ember-hero",
      portrait: "/art/kael-v1.png",
      stats: { hp: 120, mp: 20, power: 24, range: 1, move: 3 },
      skills: ["oath-breaker", "earth-shatter"],
    },
  }),
  eryn: tacticalUnit({
    name: "Éryn",
    description: "Une flèche suffit à rompre le silence.",
    battle: {
      role: "archer",
      battler: "ember-hero",
      portrait: "/art/eryn-v1.png",
      tint: 0xa6efcc,
      stats: { hp: 84, mp: 20, power: 19, range: 3, move: 3 },
      skills: ["astral-arrow", "starfall"],
    },
  }),
  lior: tacticalUnit({
    name: "Lior",
    description: "Il entend encore la voix des cendres.",
    battle: {
      role: "mage",
      battler: "ember-hero",
      portrait: "/art/lior-v1.png",
      tint: 0xd5bcff,
      stats: { hp: 72, mp: 24, power: 22, range: 2, move: 2 },
      skills: ["ember-nova", "frost-lance"],
    },
  }),
  maren: tacticalUnit({
    name: "Maren",
    description: "Son bouclier a déjà arrêté une coulée de lave.",
    battle: {
      role: "paladin",
      battler: "ember-hero",
      tint: 0xfff1c9,
      stats: { hp: 140, mp: 20, power: 22, range: 1, move: 3 },
      skills: ["oath-breaker"],
    },
  }),
  ombre: tacticalUnit({
    name: "Ombre",
    description: "Elle murmure et les braises lui répondent.",
    battle: {
      role: "occultist",
      battler: "ember-sentinel",
      portrait: "/art/sentinel-v1.png",
      tint: 0xb88cff,
      stats: { hp: 70, mp: 24, power: 18, range: 2, move: 2 },
      skills: ["ember-nova"],
    },
  }),
  carreau: tacticalUnit({
    name: "Carreau",
    description: "Il ne tire qu’une fois, mais de très loin.",
    battle: {
      role: "crossbow",
      battler: "ember-sentinel",
      portrait: "/art/sentinel-v1.png",
      tint: 0xc8f0a0,
      stats: { hp: 76, mp: 20, power: 17, range: 4, move: 2 },
      skills: ["astral-arrow"],
    },
  }),
  cendre: tacticalUnit({
    name: "Cendre",
    description: "Une sentinelle liée au sanctuaire.",
    battle: {
      role: "warrior",
      battler: "ember-sentinel",
      portrait: "/art/sentinel-v1.png",
      tint: 0xffbc96,
      stats: { hp: 120, mp: 20, power: 24, range: 1, move: 3 },
      skills: ["oath-breaker", "earth-shatter"],
    },
  }),
  braise: tacticalUnit({
    name: "Braise",
    description: "Un regard immobile derrière les braises.",
    battle: {
      role: "archer",
      battler: "ember-sentinel",
      portrait: "/art/sentinel-v1.png",
      tint: 0xffdfaa,
      stats: { hp: 84, mp: 20, power: 19, range: 3, move: 3 },
      skills: ["astral-arrow", "starfall"],
    },
  }),
  silex: tacticalUnit({
    name: "Silex",
    description: "Une présence nourrie de magie ancienne.",
    battle: {
      role: "mage",
      battler: "ember-sentinel",
      portrait: "/art/sentinel-v1.png",
      tint: 0xcda6ff,
      stats: { hp: 72, mp: 24, power: 22, range: 2, move: 2 },
      skills: ["ember-nova", "frost-lance"],
    },
  }),

  // ------------------------------------------------------------ encounters
  // Four guardians (a paladin joins) against six sentinels, custom roles included.
  rempart: tacticalEncounter({
    name: "Le Rempart de braise",
    battle: {
      chapter: "PROLOGUE · II",
      objective: "Tenez le rempart : éliminez les six sentinelles.",
      intro: "Maren rejoint le serment. En face, les cendres ont levé leurs occultistes et leurs arbalétriers.",
      board: { columns: 9, rows: 7, cellSize: 64, origin: { x: 672, y: 480 } },
      allies: [
        { unit: "kael", x: 4, y: 5 },
        { unit: "eryn", x: 2, y: 6 },
        { unit: "lior", x: 6, y: 6 },
        { unit: "maren", x: 3, y: 5 },
      ],
      enemies: [
        { unit: "cendre", x: 4, y: 1 },
        { unit: "cendre", x: 2, y: 1 },
        { unit: "braise", x: 1, y: 0 },
        { unit: "carreau", x: 7, y: 0 },
        { unit: "ombre", x: 6, y: 1 },
        { unit: "silex", x: 4, y: 0 },
      ],
    },
  }),
  // PvP (key P in the demo): the challenger leads the guardians, the other player the sentinels.
  duel: tacticalEncounter({
    name: "Duel au sanctuaire",
    battle: {
      chapter: "ÉPREUVE",
      objective: "Éliminez l’escadron adverse.",
      intro: "Deux serments, une seule flamme. Le premier escadron à tomber rend les armes.",
      board: { columns: 9, rows: 7, cellSize: 64, origin: { x: 672, y: 480 } },
      allies: [
        { unit: "kael", x: 4, y: 5 },
        { unit: "eryn", x: 2, y: 5 },
        { unit: "lior", x: 6, y: 5 },
      ],
      enemies: [
        { unit: "cendre", x: 4, y: 1 },
        { unit: "braise", x: 2, y: 1 },
        { unit: "silex", x: 6, y: 1 },
      ],
    },
  }),
  sanctuary: tacticalEncounter({
    name: "Le Sanctuaire des Cendres",
    battle: {
      chapter: "PROLOGUE · I",
      objective: "Éliminez les trois gardiens adverses.",
      intro: "Au-dessus du feu, un dernier serment. Guidez vos trois gardiens et reprenez le sanctuaire.",
      // The lava arena.
      board: { columns: 9, rows: 7, cellSize: 64, origin: { x: 672, y: 480 } },
      allies: [
        { unit: "kael", x: 4, y: 5 },
        { unit: "eryn", x: 2, y: 5 },
        { unit: "lior", x: 6, y: 5 },
      ],
      enemies: [
        { unit: "cendre", x: 4, y: 1 },
        { unit: "braise", x: 2, y: 1 },
        { unit: "silex", x: 6, y: 1 },
      ],
    },
  }),
};
