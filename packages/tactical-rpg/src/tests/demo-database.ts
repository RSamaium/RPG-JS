import { tacticalEncounter, tacticalRole, tacticalSkill, tacticalUnit } from "../core/data";

/**
 * Ember Oath: the content the tests play, declared in the RPGJS database like
 * any other game data (the module reads skills, units and encounters from there).
 */
export const emberDatabase = {
  // ------------------------------------------------------------ roles
  // warrior / archer / mage are built in; any other role is declared here.
  paladin: tacticalRole({ name: "Paladin", tactical: { attack: "melee", glyph: "✠", color: 0xffe29a } }),
  occultist: tacticalRole({ name: "Occultist", tactical: { attack: "magic", glyph: "☾", color: 0xd98cff } }),
  crossbow: tacticalRole({ name: "Crossbowman", tactical: { attack: "ranged", glyph: "➹", color: 0xa9e38c } }),

  // ------------------------------------------------------------ skills
  "oath-breaker": tacticalSkill({
    name: "Oath Breaker",
    description: "A heavy blow on a single target.",
    spCost: 8, power: 42, tactical: { range: 1, shape: "single", visual: "slash", color: 0xffdb95 },
  }),
  "earth-shatter": tacticalSkill({
    name: "Earth Shatter",
    description: "Splits the ground in a cross around the target.",
    spCost: 12, power: 26, tactical: { range: 1, shape: "cross", visual: "shockwave", color: 0xffa86a },
  }),
  "astral-arrow": tacticalSkill({
    name: "Astral Arrow",
    description: "Goes through the target and hits the next cell.",
    spCost: 8, power: 32, tactical: { range: 3, shape: "pierce", visual: "arrow", color: 0x80e8d4 },
  }),
  starfall: tacticalSkill({
    name: "Starfall",
    description: "A volley of arrows hits a cross-shaped area.",
    spCost: 12, power: 22, tactical: { range: 4, shape: "cross", visual: "volley", color: 0xa1cfff },
  }),
  "ember-nova": tacticalSkill({
    name: "Ember Nova",
    description: "Sets a 3 × 3 area around the target ablaze.",
    spCost: 14, power: 30, tactical: { range: 3, shape: "square", visual: "fire", color: 0xff995d },
  }),
  "frost-lance": tacticalSkill({
    name: "Frost Lance",
    description: "An ice crystal strikes a distant target.",
    spCost: 8, power: 38, tactical: { range: 4, shape: "single", visual: "frost", color: 0x9be9ff },
  }),

  // ------------------------------------------------------------ units
  kael: tacticalUnit({
    name: "Kael",
    description: "A wall between his companions and the blaze.",
    tactical: {
      role: "warrior",
      battler: "ember-hero",
      portrait: "/art/kael-v1.png",
      stats: { hp: 120, sp: 20, power: 24, range: 1, move: 3 },
      skills: ["oath-breaker", "earth-shatter"],
    },
  }),
  eryn: tacticalUnit({
    name: "Eryn",
    description: "One arrow is enough to break the silence.",
    tactical: {
      role: "archer",
      battler: "ember-hero",
      portrait: "/art/eryn-v1.png",
      tint: 0xa6efcc,
      stats: { hp: 84, sp: 20, power: 19, range: 3, move: 3 },
      skills: ["astral-arrow", "starfall"],
    },
  }),
  lior: tacticalUnit({
    name: "Lior",
    description: "He still hears the voice of the ashes.",
    tactical: {
      role: "mage",
      battler: "ember-hero",
      portrait: "/art/lior-v1.png",
      tint: 0xd5bcff,
      stats: { hp: 72, sp: 24, power: 22, range: 2, move: 2 },
      skills: ["ember-nova", "frost-lance"],
    },
  }),
  maren: tacticalUnit({
    name: "Maren",
    description: "Her shield once stopped a lava flow.",
    tactical: {
      role: "paladin",
      battler: "ember-hero",
      tint: 0xfff1c9,
      stats: { hp: 140, sp: 20, power: 22, range: 1, move: 3 },
      skills: ["oath-breaker"],
    },
  }),
  shade: tacticalUnit({
    name: "Shade",
    description: "She whispers and the embers answer.",
    tactical: {
      role: "occultist",
      battler: "ember-sentinel",
      portrait: "/art/sentinel-v1.png",
      tint: 0xb88cff,
      stats: { hp: 70, sp: 24, power: 18, range: 2, move: 2 },
      skills: ["ember-nova"],
    },
  }),
  bolt: tacticalUnit({
    name: "Bolt",
    description: "He shoots only once, but from very far.",
    tactical: {
      role: "crossbow",
      battler: "ember-sentinel",
      portrait: "/art/sentinel-v1.png",
      tint: 0xc8f0a0,
      stats: { hp: 76, sp: 20, power: 17, range: 4, move: 2 },
      skills: ["astral-arrow"],
    },
  }),
  cinder: tacticalUnit({
    name: "Cinder",
    description: "A sentinel bound to the sanctuary.",
    tactical: {
      role: "warrior",
      battler: "ember-sentinel",
      portrait: "/art/sentinel-v1.png",
      tint: 0xffbc96,
      stats: { hp: 120, sp: 20, power: 24, range: 1, move: 3 },
      skills: ["oath-breaker", "earth-shatter"],
    },
  }),
  ember: tacticalUnit({
    name: "Ember",
    description: "A still gaze behind the embers.",
    tactical: {
      role: "archer",
      battler: "ember-sentinel",
      portrait: "/art/sentinel-v1.png",
      tint: 0xffdfaa,
      stats: { hp: 84, sp: 20, power: 19, range: 3, move: 3 },
      skills: ["astral-arrow", "starfall"],
    },
  }),
  flint: tacticalUnit({
    name: "Flint",
    description: "A presence fed by ancient magic.",
    tactical: {
      role: "mage",
      battler: "ember-sentinel",
      portrait: "/art/sentinel-v1.png",
      tint: 0xcda6ff,
      stats: { hp: 72, sp: 24, power: 22, range: 2, move: 2 },
      skills: ["ember-nova", "frost-lance"],
    },
  }),

  // ------------------------------------------------------------ encounters
  // Four guardians (a paladin joins) against six sentinels, custom roles included.
  rampart: tacticalEncounter({
    name: "The Ember Rampart",
    tactical: {
      chapter: "PROLOGUE · II",
      objective: "Hold the rampart: defeat the six sentinels.",
      intro: "Maren joins the oath. Across the field, the ashes have raised their occultists and crossbowmen.",
      board: { columns: 9, rows: 7, cellSize: 64, origin: { x: 672, y: 480 } },
      allies: [
        { unit: "kael", x: 4, y: 5 },
        { unit: "eryn", x: 2, y: 6 },
        { unit: "lior", x: 6, y: 6 },
        { unit: "maren", x: 3, y: 5 },
      ],
      enemies: [
        { unit: "cinder", x: 4, y: 1 },
        { unit: "cinder", x: 2, y: 1 },
        { unit: "ember", x: 1, y: 0 },
        { unit: "bolt", x: 7, y: 0 },
        { unit: "shade", x: 6, y: 1 },
        { unit: "flint", x: 4, y: 0 },
      ],
    },
  }),
  // PvP: the challenger leads the guardians, the other player the sentinels.
  duel: tacticalEncounter({
    name: "Duel at the Sanctuary",
    tactical: {
      chapter: "TRIAL",
      objective: "Defeat the opposing squad.",
      intro: "Two oaths, one flame. The first squad to fall lays down its arms.",
      board: { columns: 9, rows: 7, cellSize: 64, origin: { x: 672, y: 480 } },
      allies: [
        { unit: "kael", x: 4, y: 5 },
        { unit: "eryn", x: 2, y: 5 },
        { unit: "lior", x: 6, y: 5 },
      ],
      enemies: [
        { unit: "cinder", x: 4, y: 1 },
        { unit: "ember", x: 2, y: 1 },
        { unit: "flint", x: 6, y: 1 },
      ],
    },
  }),
  sanctuary: tacticalEncounter({
    name: "The Sanctuary of Ashes",
    tactical: {
      chapter: "PROLOGUE · I",
      objective: "Defeat the three opposing guardians.",
      intro: "Above the fire, one last oath. Lead your three guardians and take back the sanctuary.",
      // The lava arena.
      board: { columns: 9, rows: 7, cellSize: 64, origin: { x: 672, y: 480 } },
      allies: [
        { unit: "kael", x: 4, y: 5 },
        { unit: "eryn", x: 2, y: 5 },
        { unit: "lior", x: 6, y: 5 },
      ],
      enemies: [
        { unit: "cinder", x: 4, y: 1 },
        { unit: "ember", x: 2, y: 1 },
        { unit: "flint", x: 6, y: 1 },
      ],
    },
  }),
};
