import { test, expect } from "vitest";
import { checkScript, simulate, describeGameApi, runTests, simulate as sim2 } from "../src/testing/tools";
import { hostFromApi } from "../src/core/api";
import { GAME_API_DESCRIPTION } from "../src/game/description";
import { GAME_API_IMPL } from "../src/game/impl";
import { SimWorld as World, SharedStore } from "../src/testing/world";

const sim = (source: string, call: { fn: string; args?: unknown[] }, world: any = {}, limits?: any) => simulate({ source, call, world, limits });
const run = async (source: string, fn = "f", args: unknown[] = [], world: any = {}, limits?: any) => {
  const r = await sim(source, { fn, args }, world, limits);
  if (!r.ok) throw new Error(r.error ?? JSON.stringify(r.diagnostics));
  return r;
};
const diag = (source: string) => checkScript(source).diagnostics;

const CRAFT = `
export function canCraft(recipe) {
  const missing = recipe.ingredients.filter(i => ($player.getItem(i.item)?.quantity ?? 0) < i.count);
  if (missing.length > 0) {
    $player.showNotification(\`Il manque : \${missing.map(i => i.name).join(", ")}\`);
    return false;
  }
  return $player.gold >= recipe.gold;
}
export function craft(recipe) {
  if (!canCraft(recipe)) return false;
  for (const ing of recipe.ingredients) $player.removeItem(ing.item, ing.count);
  $player.gold -= recipe.gold;
  $player.addItem(recipe.result, 1);
  const crafted = { ...$state.crafted };
  crafted[recipe.id] = (crafted[recipe.id] ?? 0) + 1;
  $state.crafted = crafted;
  if (crafted[recipe.id] === 10) {
    $player.showText(\`Vous maîtrisez \${recipe.name} !\`);
    $player.gold += 50 * recipe.gold;
  }
  return true;
}
export function totalCount(recipe) { return recipe.ingredients.reduce((sum, i) => sum + i.count, 0); }
`;
const recipe = { id: "r1", name: "Potion", gold: 10, result: "potion", ingredients: [{ item: "herbe", name: "Herbe", count: 2 }, { item: "fiole", name: "Fiole", count: 1 }] };

// ---------------------------------------------------------------- real scenarios
test("crafting with list methods and $state, through the real executors", async () => {
  const world = { player: { gold: 100, items: { herbe: 5, fiole: 3 } } };
  const r = await run(CRAFT, "craft", [recipe], world);
  expect(r.value).toBe(true);
  expect(r.state!.player.gold).toBe(90);
  expect(r.state!.player.items).toMatchObject({ herbe: 3, fiole: 2, potion: 1 });
  expect(r.state!.state).toEqual({ crafted: { r1: 1 } });
  expect(r.effects.map((e) => e.name)).toEqual(["removeItem", "removeItem", "gold", "addItem", "state"]);
  expect((await run(CRAFT, "totalCount", [recipe])).value).toBe(3);
});

test("missing ingredients: a notification lists them, nothing is consumed", async () => {
  const r = await run(CRAFT, "craft", [recipe], { player: { items: { herbe: 1 } } });
  expect(r.value).toBe(false);
  expect(r.effects).toEqual([{ name: "showNotification", params: { message: "Il manque : Herbe, Fiole" } }]);
  expect(r.state!.player.gold).toBe(100);
});

test("the tenth craft gives the bonus (state carried between runs)", async () => {
  const world = { player: { gold: 1000, items: { herbe: 100, fiole: 100 } }, state: { crafted: { r1: 9 } } };
  const r = await run(CRAFT, "craft", [recipe], world);
  expect(r.state!.state).toEqual({ crafted: { r1: 10 } });
  expect(r.state!.player.gold).toBe(1000 - 10 + 500);
  expect(r.effects.some((e) => e.name === "showText")).toBe(true);
});

const MERCHANT = `
const marchand = event({
  name: "Marchand", x: 12, y: 8,
  pages: [
    page({ graphic: Graphic("npc_marchand"), trigger: "action", run: parler }),
    page({ when: () => $player.getVariable("boutique_ouverte") === true, graphic: Graphic("npc_marchand_content"), trigger: "action", run: remercier }),
  ],
});
function parler() {
  $player.showText("Bienvenue !", { speaker: "$this", position: "bottom" });
  const answer = $player.showChoices("Que voulez-vous ?", [{ text: "Acheter une potion (10 or)", value: 0 }, { text: "Une quête ?", value: 1 }, { text: "Partir", value: 2 }]);
  const c = answer ? answer.value : -1;
  if (c === 0) {
    if ($player.gold < 10) { $player.showText("Pas assez d'or."); return; }
    $player.gold -= 10;
    $player.addItem(Item("potion"), 1);
    $player.setVariable("boutique_ouverte", true);
    $player.showText("Merci, bon voyage !");
  } else if (c === 1) {
    if ($player.getVariable($event.id + "_A")) { $player.showText("Je n'ai plus rien pour vous."); return; }
    $player.showText("Rapportez-moi trois herbes.");
    $player.setVariable($event.id + "_A", true);
    $player.showNotification("Quête acceptée");
  }
}
function remercier() {
  $player.showText(\`Merci de votre visite, \${$player.name} !\`);
  const herbes = ($player.getItem(Item("herbe"))?.quantity ?? 0);
  if (herbes >= 3) {
    $player.showText("Vous avez les herbes !");
    $player.removeItem(Item("herbe"), 3);
    $player.gold += 50;
  }
}
`;
test("merchant event: page choice, buying, self switch, second page", async () => {
  const buy = await simulate({ source: MERCHANT, event: 0, world: { choices: [0] } });
  expect(buy.ok).toBe(true);
  expect(buy.page).toBe(0);
  expect(buy.state!.player.gold).toBe(90);
  expect(buy.state!.player.items.potion).toBe(1);
  expect(buy.state!.vars.boutique_ouverte).toBe(true);
  expect(buy.effects[0]).toEqual({ name: "showText", params: { text: "Bienvenue !", speaker: "$this", position: "bottom" } });

  const poor = await simulate({ source: MERCHANT, event: 0, world: { player: { gold: 3 }, choices: [0] } });
  expect(poor.effects.filter((e) => e.name === "showText").map((e: any) => e.params.text)).toEqual(["Bienvenue !", "Pas assez d'or."]);

  const quest = await simulate({ source: MERCHANT, event: 0, world: { choices: [1] } });
  expect(quest.state!.vars.event_1_A).toBe(true);
  const again = await simulate({ source: MERCHANT, event: 0, world: { choices: [1], vars: { event_1_A: true } } });
  expect(again.effects.map((e: any) => e.params.text).filter(Boolean)).toContain("Je n'ai plus rien pour vous.");

  const second = await simulate({ source: MERCHANT, event: 0, world: { vars: { boutique_ouverte: true }, player: { items: { herbe: 4 } } } });
  expect(second.page).toBe(1);
  expect(second.state!.player.items.herbe).toBe(1);
  expect(second.state!.player.gold).toBe(150);
});

test("the dice are reproducible in a simulation (seed)", async () => {
  const src = `export function f() { return [random(1, 6), random(1, 6), random(1, 6)]; }`;
  const a = await run(src, "f", [], { seed: 7 }), b = await run(src, "f", [], { seed: 7 }), c = await run(src, "f", [], { seed: 8 });
  expect(a.value).toEqual(b.value);
  expect(a.value).not.toEqual(c.value);
  for (const v of a.value as number[]) expect(v >= 1 && v <= 6).toBe(true);
});

test("showChoices() suspends the script until the answer arrives", async () => {
  let answer!: (choice: { text: string; value: number }) => void;
  const pending = simulate({
    source: `export function f() { const c = $player.showChoices("?", [{ text: "a", value: 0 }, { text: "b", value: 1 }]); if (c && c.value === 1) { $player.showText("b"); } return c ? c.value : -1; }`,
    call: { fn: "f" },
    world: { choose: () => new Promise((r) => (answer = r)) },
  });
  await new Promise((r) => setTimeout(r, 20));
  answer({ text: "b", value: 1 });
  const r = await pending;
  expect(r.value).toBe(1);
  expect(r.effects.map((e) => e.name)).toEqual(["showChoices", "showText"]);
});

// ---------------------------------------------------------------- language
test("loops, switch, destructuring, nested functions, spread, ++", async () => {
  const src = `
export function f(list) {
  let total = 0;
  for (let i = 0; i < 5; i++) { if (i === 3) continue; total += i; }       // 0+1+2+4 = 7
  let n = 0;
  while (true) { n++; if (n >= 4) break; }                                  // 4
  const { a, b } = { a: 10, b: 20 };
  const [x, y] = [1, 2];
  function double(v) { return v * 2; }
  const grow = (v) => double(v) + 1;
  let label = "";
  switch (n) { case 1: label = "one"; break; case 4: label = "four"; break; default: label = "other"; }
  const merged = [...list, 99];
  const obj = { ...{ p: 1 }, q: 2 };
  return { total, n, a, b, x, y, d: double(4), g: grow(4), label, merged, obj };
}`;
  const r = await run(src, "f", [[1, 2]]);
  expect(r.value).toEqual({ total: 7, n: 4, a: 10, b: 20, x: 1, y: 2, d: 8, g: 9, label: "four", merged: [1, 2, 99], obj: { p: 1, q: 2 } });
});

test("list and text methods", async () => {
  const src = `
export function f() {
  const l = [5, 3, 9, 1];
  const names = ["b", "a", "c"];
  const e = Object.entries({ k: 1, j: 2 });
  return {
    map: l.map(x => x * 2), filter: l.filter(x => x > 2), find: l.find(x => x > 4), findIndex: l.findIndex(x => x === 9),
    some: l.some(x => x > 8), every: l.every(x => x > 0), sum: l.reduce((a, b) => a + b, 0), max: Math.max(...l),
    inc: l.includes(3), idx: l.indexOf(9), join: names.join("-"), slice: l.slice(1, 3), concat: l.concat([7]),
    sortNum: l.sort((a, b) => a - b), sortDef: names.sort(), rev: l.reverse(), len: l.length,
    up: "abc".toUpperCase(), has: "hello".includes("ell"), parts: "a,b,c".split(","), rep: "a-b".replaceAll("-", "+"), trim: " x ".trim(),
    keys: Object.keys({ a: 1, b: 2 }), ent: e, floor: Math.floor(2.7), isArr: Array.isArray(l),
  };
}`;
  const v = (await run(src)).value as any;
  expect(v).toMatchObject({ map: [10, 6, 18, 2], filter: [5, 3, 9], find: 5, findIndex: 2, some: true, every: true, sum: 18, max: 9, inc: true, idx: 2,
    join: "b-a-c", slice: [3, 9], concat: [5, 3, 9, 1, 7], sortNum: [1, 3, 5, 9], sortDef: ["a", "b", "c"], rev: [1, 9, 3, 5], len: 4,
    up: "ABC", has: true, parts: ["a", "b", "c"], rep: "a+b", trim: "x", keys: ["a", "b"], ent: [["k", 1], ["j", 2]], floor: 2, isArr: true });
});

test("callbacks may call the game (asynchronous callbacks)", async () => {
  const r = await run(`export function f(items) { items.forEach(i => $player.addItem(i, 2)); return items.map(i => ($player.getItem(i)?.quantity ?? 0)); }`, "f", [["a", "b"]]);
  expect(r.value).toEqual([2, 2]);
  expect(r.effects.length).toBe(2);
});

test("data from the game is read-only; the script's own data is not", async () => {
  const bad = await sim(`export function f(r) { r.gold = 0; }`, { fn: "f", args: [{ gold: 5 }] });
  expect(bad.ok).toBe(false);
  expect(bad.error).toMatch(/read-only/);
  const bad2 = await sim(`export function f(r) { r.list.push(1); }`, { fn: "f", args: [{ list: [] }] });
  expect(bad2.error).toMatch(/read-only/);
  const ok = await run(`export function f(r) { const c = { ...r }; c.gold = 0; const l = [...r.list]; l.push(9); return [c.gold, r.gold, l]; }`, "f", [{ gold: 5, list: [1] }]);
  expect(ok.value).toEqual([0, 5, [1, 9]]);
});

// ---------------------------------------------------------------- harness tools
test("check_script collects several errors with their lines and says what exists", () => {
  const d = diag(`export function f() {\n  $player.goldd += 1;\n  const x = unknownThing + 1;\n  $player.fly();\n  while (true) {}\n  new Foo();\n}`);
  expect(d.map((x) => x.line)).toEqual([2, 3, 4, 6]);
  expect(d[0].message).toMatch(/"\$player.goldd" does not exist. Available members of \$player: gold, level, name/);
  expect(d[1].message).toBe('unknown name "unknownThing"');
  expect(d[2].message).toMatch(/"\$player.fly" does not exist. Available methods of \$player: getItem, hasItem, addItem, removeItem, getVariable, setVariable, hasVariable, removeVariable, showText, showChoices, showNotification, changeMap/);
  expect(d[3].message).toMatch(/"NewExpression" is not available/);
});

test("check_script: syntax errors, catalog references, permissions", () => {
  expect(diag("export function f( {")[0].message).toMatch(/syntax error/);
  const c = checkScript(`export function f() { $player.addItem(Item("potoin")); $player.gold += 1; $player.setVariable("x", true); return $player.getVariable("visits"); }`, { item: ["potion"] });
  expect(c.ok).toBe(false);
  expect(c.diagnostics[0].message).toBe('unknown item "potoin"');
  const ok = checkScript(`export function f() { $player.addItem(Item("potion")); $player.gold += 1; $player.setVariable("x", true); return $player.getVariable("visits"); }\non("player.levelUp", () => { $player.showNotification("hi"); });`, { item: ["potion"] });
  expect(ok.ok).toBe(true);
  expect(ok.permissions).toEqual(["player.addItem", "player.getVariable", "player.gold", "player.setVariable", "player.showNotification"]);
  expect(ok.refs).toEqual([{ function: "Item", id: "potion", line: 1 }]);
  expect(ok.exports).toEqual(["f"]);
  expect(ok.handlers).toEqual(["player.levelUp"]);
});

test("describe_api lists what exists, as TypeScript declarations", () => {
  const d = describeGameApi();
  expect(d).toContain("declare const $player: {");
  expect(d).toContain("gold: number;");
  expect(d).toContain("readonly level: number;");
  expect(d).toContain("addItem(id: string, nb?: number): void;");
  expect(d).toContain("declare function wait(");
  expect(d).toContain("[name: string]: number | string | boolean | null;");
  expect(d).toContain("showChoices(text: string, choices: { text: string; value: string | number | boolean }[])");
  expect(d).toContain("Script entry points");
});

// ---------------------------------------------------------------- hostile
test("hostile: nothing escapes and everything is bounded", async () => {
  const cases: [string, RegExp][] = [
    [`export function f() { while (true) {} }`, /ran more than 100 times|step budget/],
    [`export function f() { for (;;) {} }`, /ran more than 100 times|step budget/],
    [`export function f() { for (let i = 0; i < 100; i++) for (let j = 0; j < 100; j++) for (let k = 0; k < 100; k++) {} }`, /step budget/],
    [`export function f() { let a = [1]; while (a.length < 5000) { a = [...a, ...a]; } }`, /list longer than 1000|ran more/],
    [`export function f() { let s = "ab"; for (let i = 0; i < 50; i++) { s = s + s; } }`, /text longer than 10000/],
    [`export function f() { let s = "ab"; for (let i = 0; i < 50; i++) { s += s; } }`, /text longer than 10000/],
    [`export function f(n) { return f(n + 1); }`, /call depth|step budget/],
    [`export function f() { return [1,2,3].map(x => f()); }`, /call depth|step budget/],
    [`export function f() { return "x".padStart(1e9); }`, /not available on string/],
    [`export function f() { return "x".repeat(1e9); }`, /not available on string/],
    [`export function f() { return [1].constructor; }`, /not allowed|constructor/],
    [`export function f() { const { constructor } = {}; }`, /./],
    [`export function f() { return [].map.call([1], x => x); }`, /./],
    [`export function f() { const g = (x) => x; return g.call(null, 1); }`, /./],
    [`export function f() { return $player["con" + "structor"]; }`, /not allowed/],
    [`export function f() { const o = {}; return o["__pro" + "to__"]; }`, /not allowed/],
    [`export function f() { return globalThis; }`, /unknown name/],
    [`export function f() { return this; }`, /./],
    [`export function f() { return eval("1"); }`, /unknown name "eval"/],
    [`export function f() { return Function("return 1")(); }`, /kind of call is not available/], [`export function f() { return Function; }`, /unknown name "Function"/],
    [`export function f() { return process.env; }`, /unknown name "process"/],
    [`export function f() { return import("x"); }`, /./],
    [`export function f() { return \`\${$player}\`.length; }`, /^$/],
  ];
  const problems: string[] = [];
  for (const [src, re] of cases) {
    const r = await sim(src, { fn: "f" });
    const msg = String(r.error ?? (r.diagnostics ?? []).map((d: any) => d.message).join("\n"));
    if (re.source === "^$") { if (!r.ok) problems.push(`should be harmless: ${src}`); continue; } // a handle prints as text
    if (r.ok) problems.push(`NOT REFUSED: ${src}`);
    else if (!re.test(msg)) problems.push(`refused with another message: ${src} -> ${msg}`);
  }
  expect(problems).toEqual([]);
});

test("hostile: refused syntax", () => {
  for (const src of [
    `export function f() { delete x.y; }`, `export function f() { return a in b; }`, `export function f() { return /ab+c/; }`,
    `export function f() { return tag\`x\`; }`, `export function f() { x: for (;;) { break x; } }`, `export function f() { return (1, 2); }`,
    `export function f() { return { get a() { return 1; } }; }`, `export function f() { return { [k]: 1 }; }`, `export function f() { try { } catch (e) { } }`,
    `class A {}`, `export default 1;`, `import x from "y";`, `export async function f() {}`, `export function* f() {}`, `export function f() { var a = 1; }`,
    `export function f() { return a?.b; }`, `export function f() { return new Date(); }`, `export function f() { throw 1; }`, `export function f() { do {} while (1); }`,
  ]) expect(checkScript(src).ok, src).toBe(false);
});

test("hostile: oversized host arguments and state", async () => {
  expect((await sim(`export function f(s) { $player.showText(s); }`, { fn: "f", args: ["y".repeat(5000)] }, {}, { steps: 1e5, iterations: 100, maxString: 1e6 })).error).toMatch(/text of 5000 characters refused/);
  expect((await sim(`export function f() { let s = "ab"; for (let i = 0; i < 8; i++) { s += s; } const o = {}; for (let i = 0; i < 60; i++) { o["key" + i] = s; } $state.big = o; }`, { fn: "f" })).error).toMatch(/limit 10000/);
});

test("hostile: a script cannot change what it did not own, even through callbacks", async () => {
  const shared = { list: [3, 1, 2], cfg: { price: 5 } };
  const r = await sim(`export function f(d) { return d.list.map(x => { d.cfg.price = 0; return x; }); }`, { fn: "f", args: [shared] });
  expect(r.ok).toBe(false);
  expect(shared.cfg.price).toBe(5);
  const r2 = await sim(`export function f(d) { return d.list.sort((a, b) => a - b); }`, { fn: "f", args: [shared] });
  expect(r2.ok).toBe(true);
  expect(shared.list).toEqual([3, 1, 2]); // sort works on a copy
});

test("constant data: references usable, and read-only for every run", async () => {
  const src = `
const PRIX = { potion: { item: Item("potion"), prix: 20 }, liste: [1, 2, 3] };
export function lire() { return PRIX.potion.prix + PRIX.liste.length; }
export function casser() { PRIX.potion.prix = 0; }
export function casserListe() { PRIX.liste.push(4); }`;
  expect((await run(src, "lire")).value).toBe(23);
  expect((await sim(src, { fn: "casser" })).error).toMatch(/read-only/);
  expect((await sim(src, { fn: "casserListe" })).error).toMatch(/read-only/);
  expect(checkScript(src, { item: ["potion"] }).refs).toEqual([{ function: "Item", id: "potion", line: 2 }]);
  expect(checkScript(src.replace('Item("potion")', 'Item("potoin")'), { item: ["potion"] }).ok).toBe(false);
});

// ---------------------------------------------------------------- shared properties (map.setSync)
const hostOf = (world: World) => hostFromApi(GAME_API_DESCRIPTION, GAME_API_IMPL, world);

const SHOP = `
shared({
  stock:  { initial: 3, client: true, persist: false },
  prix:   { initial: 20, client: true, persist: true },
  annonce: { initial: "Bienvenue", client: true },
});
export function acheter() {
  if (!$shared.take("stock", 1)) { $player.showText("Rupture de stock."); return false; }
  $player.gold -= $shared.prix;
  $player.addItem(Item("potion"), 1);
  $shared.annonce = \`Il reste \${$shared.stock} potions\`;
  return true;
}
export function acheterMalAvise() {          // check, wait, then write: not safe when two players interleave
  if ($shared.stock > 0) {
    $player.showChoices("?", [{ text: "Oui", value: 0 }, { text: "Non", value: 1 }]);
    $shared.stock -= 1;
    return true;
  }
  return false;
}
export function surchauffe() { $shared.prix += 5; $shared.prix -= 1; return $shared.prix; }
`;
const runShared = async (fn: string, store: SharedStore, init: any = {}) => {
  const check = checkScript(SHOP);
  expect(check.ok, JSON.stringify(check.diagnostics)).toBe(true);
  store.declare(check.program!.shared);
  const world = new World({ ...init, shared: store });
  const value = (await check.program!.call(fn, [], hostOf(world), { steps: 1e5, iterations: 100 })).value;
  return { value, world };
};

test("shared properties: declared once, read and written by the script, flags reported", async () => {
  const c = checkScript(SHOP);
  expect(c.shared).toEqual([
    { name: "stock", initial: 3, client: true, persist: false },
    { name: "prix", initial: 20, client: true, persist: true },
    { name: "annonce", initial: "Bienvenue", client: true, persist: false },
  ]);
  const store = new SharedStore();
  const a = await runShared("acheter", store, { player: { gold: 100 } });
  expect(a.value).toBe(true);
  expect(a.world.player.gold).toBe(80);
  expect(store.values).toEqual({ stock: 2, prix: 20, annonce: "Il reste 2 potions" });
  expect(a.world.effects.filter((e) => e.name === "sync").map((e: any) => e.params.name)).toEqual(["stock", "annonce"]);
  expect((await runShared("surchauffe", store)).value).toBe(24);
});

test("shared properties: the second player sees what the first one did, and the last item goes to one player only", async () => {
  const store = new SharedStore();
  const results = await Promise.all([runShared("acheter", store), runShared("acheter", store), runShared("acheter", store), runShared("acheter", store)]);
  expect(results.map((r) => r.value).sort()).toEqual([false, true, true, true]);   // stock was 3
  expect(store.values.stock).toBe(0);
});

test("shared properties: check-then-write across a wait is NOT atomic (why take() exists)", async () => {
  const store = new SharedStore();
  store.declare([{ name: "stock", initial: 1, client: true, persist: false }, { name: "prix", initial: 20, client: true, persist: false }, { name: "annonce", initial: "", client: true, persist: false }]);
  const gate = new Promise<void>((r) => setTimeout(r, 20));
  const mk = () => new World({ shared: store, choose: async (_text, choices) => { await gate; return choices[0]; } });
  const check = checkScript(SHOP).program!;
  const [wa, wb] = [mk(), mk()];
  await Promise.all([check.call("acheterMalAvise", [], hostOf(wa), { steps: 1e5, iterations: 100 }), check.call("acheterMalAvise", [], hostOf(wb), { steps: 1e5, iterations: 100 })]);
  expect(store.values.stock).toBe(-1);      // both saw 1, both wrote: the stock is negative
});

test("shared properties: typos, undeclared names, wrong types and limits", async () => {
  expect(diag(`shared({ stock: { initial: 1 } });\nexport function f() { return $shared.stok; }`)[0]).toMatchObject({ line: 2 });
  expect(diag(`shared({ stock: { initial: 1 } });\nexport function f() { return $shared.stok; }`)[0].message).toMatch(/"\$shared.stok" is not declared. .*Declared: stock/);
  expect(diag(`export function f() { return $shared.x; }`)[0].message).toMatch(/Declared: none/);
  expect(diag(`shared({ a: { initial: {} } });`)[0].message).toMatch(/initial must be a plain value/);
  expect(diag(`shared({ a: { initial: 1 }, a: { initial: 2 } });`)[0].message).toMatch(/declared twice/);
  expect(diag(`shared({ constructor: { initial: 1 } });`)[0].message).toMatch(/not a valid shared property name/);
  const many = Array.from({ length: 21 }, (_, i) => `p${i}: { initial: 0 }`).join(", ");
  expect(diag(`shared({ ${many} });`)[0].message).toMatch(/at most 20/);
  const store = new SharedStore();
  const bad = async (src: string) => { const c = checkScript(src); store.declare(c.program!.shared); return c.program!.call("f", [], hostOf(new World({ shared: store })), { steps: 1e5, iterations: 100 }); };
  await expect(bad(`shared({ n: { initial: 1 } });\nexport function f() { $shared.n = "texte"; }`)).rejects.toThrow(/holds number, not string/);
  await expect(bad(`shared({ m: { initial: 1 } });\nexport function f() { $shared.m = 1 / 0; }`)).rejects.toThrow(/finite/);
  await expect(bad(`shared({ t: { initial: "a" } });\nexport function f() { let s = "ab"; for (let i = 0; i < 9; i++) { s += s; } $shared.t = s; }`)).rejects.toThrow(/500 characters/);
  await expect(bad(`shared({ o: { initial: 1 } });\nexport function f() { $shared["o"] *= 2; }`)).rejects.toThrow(/accepts only =, \+= and -=/);
  await expect(bad(`shared({ k: { initial: 1 } });\nexport function f() { return $shared["zzz"]; }`)).rejects.toThrow(/not declared/);
});

test("a handle of the game cannot be spread or copied (it would copy the capability)", async () => {
  for (const src of [`shared({ n: { initial: 1 } });\nexport function f() { const c = { ...$shared }; c.n = 5; return c; }`, `export function f() { return { ...$player }; }`, `export function f() { return { ...Math }; }`]) {
    const r = await sim(src, { fn: "f" });
    expect(r.ok, src).toBe(false);
    expect(String(r.error), src).toMatch(/cannot be spread/);
  }
  const ok = await run(`export function f(d) { const c = { ...d, extra: 1 }; return c; }`, "f", [{ a: 1 }]);
  expect(ok.value).toEqual({ a: 1, extra: 1 });
});

// ---------------------------------------------------------------- coverage and tests as data

const SELL = `export function vendre(a) {
  if (a !== "potion") return false;
  if (($player.getItem(a)?.quantity ?? 0) < 1) return false;
  if ($player.gold >= 100) return false;     // a wrong rule that still compiles: a rich player can never sell
  $player.gold += 12;
  return true;
}`;

test("coverage: the lines no test has executed are reported, by function", async () => {
  const r = await sim2({ source: SELL, call: { fn: "vendre", args: ["potion"] }, world: { player: { items: {} } } });
  expect(r.value).toBe(false);
  expect(r.uncovered).toEqual({ vendre: "4-6" });          // the whole success path was never played
  const ok = await sim2({ source: SELL, call: { fn: "vendre", args: ["potion"] }, world: { player: { items: { potion: 1 } } } });
  expect(ok.value).toBe(false);
  expect(ok.uncovered).toEqual({ vendre: "5-6" });         // the bug is visible: the sale stops at line 4
  const handlers = await sim2({ source: `on("player.joinMap", () => {\n  if ($hook.map === "cave") {\n    $player.showNotification("cave");\n  }\n});`, fire: "player.joinMap", world: { hook: { map: "town" } } });
  expect(handlers.uncovered).toEqual({ "on:player.joinMap": "3" });
});

test("tests as data: expectations, ranges, failures that say what differed, union coverage", async () => {
  const tests = [
    { name: "pas de potion : refusé", call: { fn: "vendre", args: ["potion"] }, world: { player: { items: {} } }, expect: { returns: false, "player.gold": 100, effects: [] } },
    { name: "vente réussie", call: { fn: "vendre", args: ["potion"] }, world: { player: { items: { potion: 1 } } }, expect: { returns: true, "player.gold": 112, "player.items.potion": 0 } },
    { name: "sans attente : juste une simulation", call: { fn: "vendre", args: ["autre"] } },
    { name: "plage", call: { fn: "vendre", args: ["potion"] }, world: { player: { gold: 50 } }, expect: { returns: false, "player.gold": { min: 40, max: 60 } } },
    { name: "clé inconnue", call: { fn: "vendre", args: ["potion"] }, expect: { retourne: true } },
  ];
  const rep = await runTests(SELL, tests as any);
  expect(rep.ok).toBe(true);
  expect(rep.results.map((r) => r.pass)).toEqual([true, false, null, true, false]);
  expect(rep.results[1].failures.slice(0, 2)).toEqual(['returns false, expected true', 'player.gold is 100, expected 112']);
  expect(rep.results[4].failures[0]).toMatch(/unknown expectation "retourne"/);
  expect(rep.uncovered).toEqual({ vendre: "5-6" });        // across all the tests, the two lines after the bug still never ran
  const broken = await runTests(`export function f() { return nope; }`, tests as any);
  expect(broken.ok).toBe(false);
  expect(broken.diagnostics![0].message).toMatch(/unknown name "nope"/);
});

// ---------------------------------------------------------------- free checks: no value from a void call, required exports
test("a function that returns nothing cannot be used as a value", () => {
  const bad: [string, RegExp][] = [
    [`export function f(a) { if (!$player.removeItem(a, 1)) return false; return true; }`, /"\$player.removeItem" returns nothing/],
    [`export function f() { const ok = $player.addItem("x"); return ok; }`, /"\$player.addItem" returns nothing/],
    [`export function f() { return $player.showText("a"); }`, /"\$player.showText" returns nothing/],
    [`export function f() { if ($player.showNotification("a")) { return 1; } return 2; }`, /"\$player.showNotification" returns nothing/],
    [`export function f(c) { return c && $player.addItem("x"); }`, /returns nothing/],
    [`export function f() { return [wait(1)]; }`, /"wait" returns nothing/],
  ];
  for (const [src, re] of bad) { const d = diag(src); expect(d.length, src).toBe(1); expect(d[0].message, src).toMatch(re); expect(d[0].line).toBe(1); }
  const good = [
    `export function f(a) { $player.removeItem(a, 1); $player.showText("ok"); return true; }`,
    `export function f(list) { list.forEach(i => $player.addItem(i, 2)); }`,
    `export function f() { const n = ($player.getItem("x")?.quantity ?? 0); const t = $shared.take("s", 1); return n > 0 || t; }\nshared({ s: { initial: 1 } });`,
    `export function f() { const c = $player.showChoices("?", [{ text: "a", value: 0 }, { text: "b", value: 1 }]); const r = random(1, 6); return (c ? c.value : 0) + r; }`,
  ];
  for (const src of good) expect(diag(src), src).toEqual([]);
});

test("required exports are checked when saving", () => {
  const src = `export function acheter(a) { return true; }\nexport function vendre(a) { return true; }`;
  expect(checkScript(src, undefined, { requiredExports: ["acheter", "vendre"] }).ok).toBe(true);
  const r = checkScript(src, undefined, { requiredExports: ["prix", "acheter", "vendre"] });
  expect(r.ok).toBe(false);
  expect(r.diagnostics).toEqual([{ line: 0, message: 'missing exported function "prix": the request requires it, write export function prix(...) { ... }' }]);
  expect(checkScript(`function prix() {}\nexport function acheter() {}`, undefined, { requiredExports: ["prix"] }).ok).toBe(false);   // present but not exported
});
