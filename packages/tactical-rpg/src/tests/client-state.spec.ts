// canvasengine reads `window` when it loads and the project has no DOM test environment: a minimal one is enough here.
vi.hoisted(() => {
  const target = globalThis as Record<string, unknown>;
  target.window ??= Object.assign(globalThis, { addEventListener() {}, removeEventListener() {} });
  target.navigator ??= { getGamepads: () => [] };
});
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createEncounter } from "./fixture";
import { messages } from "../core/messages";
import { transition } from "../core/rules";
import { reachable } from "../core/board";
import { installInput } from "../client/input-controller";
import {
  battle,
  busy,
  canPlay,
  current,
  selected,
  receive,
  connectEngine,
  connectHost,
  teardown,
  send,
  controls,
  objectiveText, TEXTS,
  action, timeLeft, notice, myId, spectator, myTeam, allies, mode, staged, commit, route, pace, setPace, selectUnit, skillMenu, selectedSkill, pickSkill, planned, chooseCell, cancel, inspected, hoverCell, details, forecast,
} from "../client/state";

describe("client signals and transport", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    connectEngine({ t: (key: string) => key } as never);
    teardown();
    busy.set(false);
    selected.set("ally-warrior");
  });
  afterEach(() => vi.useRealTimers());
  it("unlocks actions after starting from a null initial state", async () => {
    expect(canPlay()).toBe(false);
    await receive(transition(createEncounter(), { type: "start" }, "ally"));
    expect(canPlay()).toBe(false);
    vi.advanceTimersByTime(1500);
    expect(canPlay()).toBe(true);
    expect(controls().move).toBe(false);
    selected.set("ally-mage");
    expect(current()?.role).toBe("mage");
  });
  it("resynchronizes stale state and clears a transport lock", async () => {
    const state = createEncounter();
    state.revision = 6;
    busy.set(true);
    await receive({ state, error: "t.error.stale" });
    expect(battle()?.revision).toBe(6);
    expect(busy()).toBe(false);
  });
  it("sends the current revision and blocks rapid duplicate commands", async () => {
    const command = vi.fn();
    connectHost({ command, pace: vi.fn(), close: vi.fn(), enter: () => () => {}, started: vi.fn(), ended: vi.fn() });
    await receive({ state: createEncounter() });
    send({ type: "start" });
    send({ type: "start" });
    expect(command).toHaveBeenCalledTimes(1);
    expect(command).toHaveBeenCalledWith({
      revision: 0,
      command: { type: "start" },
    });
    vi.advanceTimersByTime(12000);
    expect(busy()).toBe(false);
  });
  it('starts unselected, selects a technique without spending MP, and cancels selection',async () =>{
    await receive({state:createEncounter()});
    expect(current()).toBeNull();
    await receive(transition(createEncounter(),{type:'start'},'ally'));
    vi.advanceTimersByTime(1500);
    expect(current()).toBeNull();expect(controls().move).toBe(true);
    selectUnit(battle()!.units[2]);expect(mode()).toBe('move');
    action('skill');expect(skillMenu()).toBe(true);
    pickSkill('frost-lance');expect(selectedSkill()).toBe('frost-lance');expect(skillMenu()).toBe(false);
    // Touch: a first tap on the target only shows the forecast.
    chooseCell({x:6,y:1},{touch:true});expect(planned()).toMatchObject({type:'skill',skillId:'frost-lance'});
    expect(current()?.mp).toBe(24);
    // Escape goes back one step at a time.
    cancel();expect(planned()).toBeNull();expect(mode()).toBe('skill');
    cancel();expect(mode()).toBe('menu');
    cancel();expect(mode()).toBe('move');expect(current()).not.toBeNull();
    cancel();expect(current()).toBeNull();
  });
  it('inspects an enemy without selecting it or preparing a command',async () =>{
    const state=transition(createEncounter(),{type:'start'},'ally').state;
    await receive({state});selected.set('');hoverCell({x:4,y:1});
    expect(inspected()?.id).toBe('enemy-warrior');expect(current()).toBeNull();expect(planned()).toBeNull();
    hoverCell(null);expect(inspected()).toBeNull();
  });
  it('keeps the forecast target in the character sheet when the pointer leaves the map',async () =>{
    const state=transition(createEncounter(),{type:'start'},'ally').state;
    await receive({state});busy.set(false);selectUnit(state.units[2]);
    action('skill');pickSkill('frost-lance');chooseCell({x:6,y:1},{touch:true});
    expect(forecast()?.remaining).toBe(34);
    hoverCell(null);
    expect(details()[0]?.id).toBe('enemy-mage');
    hoverCell({x:4,y:5});
    expect(details()[0]?.id).toBe('enemy-mage');
    // Back to the menu: the sheet shows the selected unit again.
    cancel();cancel();hoverCell(null);
    expect(details()[0]?.id).toBe('ally-mage');
  });
  it('coop: partner units are not selectable and their actions keep my staged move',async()=>{
    connectEngine({ t: (key: string) => key, playerIdSignal: () => 'a' } as never);
    let state=transition(createEncounter(),{type:'start'},'ally').state;
    state.players=[{id:'a',name:'Alice'},{id:'b',name:'Bob'}];
    state.units.forEach((u,i)=>{ if(u.team==='ally') u.owner=i===1?'b':'a'; });
    await receive({state});vi.advanceTimersByTime(1500);busy.set(false);
    expect(myId()).toBe('a');
    selected.set('');selectUnit(state.units[1]);expect(current()).toBeNull();
    selectUnit(state.units[0]);chooseCell({x:4,y:4});
    expect(staged()?.cell).toEqual({x:4,y:4});
    const out=transition(state,{type:'wait',unitId:state.units[1].id},'ally',[],'b');
    await receive(out);
    expect(staged()?.cell).toEqual({x:4,y:4});expect(current()?.y).toBe(4);
    connectEngine({ t: (key: string) => key } as never);
  });
  it('coop: the cell of the move being prepared is held on the server, and let go when the move is dropped or sent',async()=>{
    connectEngine({ t: (key: string) => key, playerIdSignal: () => 'a' } as never);
    const hold = vi.fn(), command = vi.fn();
    connectHost({ command, hold, pace: vi.fn(), close: vi.fn(), enter: () => () => {}, started: vi.fn(), ended: vi.fn() });
    const state=transition(createEncounter(),{type:'start'},'ally').state;
    state.players=[{id:'a',name:'Alice'},{id:'b',name:'Bob'}];
    state.units.forEach((u,i)=>{ if(u.team==='ally') u.owner=i===1?'b':'a'; });
    await receive({state});vi.advanceTimersByTime(1500);busy.set(false);
    selected.set('');selectUnit(state.units[0]);chooseCell({x:4,y:4});
    expect(hold).toHaveBeenLastCalledWith(state.units[0].id,{x:4,y:4});
    cancel();
    expect(hold).toHaveBeenLastCalledWith(state.units[0].id,null);
    // Sent with the action: the server frees the cell itself, nothing more is asked
    chooseCell({x:4,y:4});action('wait');
    expect(hold).toHaveBeenCalledTimes(3);
    expect(command).toHaveBeenCalledOnce();
    connectEngine({ t: (key: string) => key } as never);
  });
  it('coop: a cell a partner holds is not one my unit can walk to, and a refusal brings my unit back',async()=>{
    connectEngine({ t: (key: string) => key, playerIdSignal: () => 'a' } as never);
    const hold = vi.fn();
    connectHost({ command: vi.fn(), hold, pace: vi.fn(), close: vi.fn(), enter: () => () => {}, started: vi.fn(), ended: vi.fn() });
    const state=transition(createEncounter(),{type:'start'},'ally').state;
    state.players=[{id:'a',name:'Alice'},{id:'b',name:'Bob'}];
    state.units.forEach((u,i)=>{ if(u.team==='ally') u.owner=i===1?'b':'a'; });
    state.holds=[{unitId:state.units[1].id,x:4,y:4,owner:'b'}];
    await receive({state});vi.advanceTimersByTime(1500);busy.set(false);
    selected.set('');selectUnit(state.units[0]);chooseCell({x:4,y:4});
    expect(staged()).toBeNull();
    // Both aimed at the same cell at the same moment: the server refuses the second one
    const free=[...reachable(state,state.units[0]).values()].find((path)=>path.length)!.at(-1)!;
    chooseCell(free);
    expect(staged()?.cell).toEqual(free);
    await receive({state:{...state},error:'t.error.held'});
    expect(staged()).toBeNull();
    expect(notice()).toBe('t.error.held');
    expect(mode()).toBe('move');
    connectEngine({ t: (key: string) => key } as never);
  });
  it('alone: no cell is held',async()=>{
    const hold = vi.fn();
    connectHost({ command: vi.fn(), hold, pace: vi.fn(), close: vi.fn(), enter: () => () => {}, started: vi.fn(), ended: vi.fn() });
    const state=transition(createEncounter(),{type:'start'},'ally').state;
    await receive({state});busy.set(false);
    selectUnit(state.units[0]);chooseCell({x:4,y:3});cancel();
    expect(hold).not.toHaveBeenCalled();
  });
  it('timer: counts down what the server said was left, and says when the time ran out',async()=>{
    const state=transition(createEncounter(),{type:'start'},'ally').state;
    expect(timeLeft()).toBeNull();
    await receive({state:{...state,timer:{seconds:60,left:42000}}});
    expect(timeLeft()).toBe(42);
    vi.advanceTimersByTime(12000);
    expect(timeLeft()).toBe(30);
    vi.advanceTimersByTime(40000);
    expect(timeLeft()).toBe(0);
    const over=transition(state,{type:'endPhase'},'ally');
    await receive({state:over.state,event:{...over.event,timeout:true}});
    expect(notice()).toBe('t.timeout');
    // The phase the AI plays is not timed
    expect(timeLeft()).toBeNull();
  });
  it('spectator: read-only, sends nothing',async()=>{
    connectEngine({ t: (key: string) => key, playerIdSignal: () => 'carol' } as never);
    const command = vi.fn();
    connectHost({ command, pace: vi.fn(), close: vi.fn(), enter: () => () => {}, started: vi.fn(), ended: vi.fn() });
    const state=transition(createEncounter(),{type:'start'},'ally').state;
    state.players=[{id:'a',name:'Alice'}];
    state.units.forEach((u)=>{ if(u.team==='ally') u.owner='a'; });
    await receive({state});vi.advanceTimersByTime(1500);
    expect(spectator()).toBe(true);
    expect(canPlay()).toBe(false);
    send({type:'endPhase'});
    expect(command).not.toHaveBeenCalled();
    connectEngine({ t: (key: string) => key } as never);
  });
  it('PvP: the versus side sees its units as allies and plays the enemy phase',async()=>{
    connectEngine({ t: (key: string) => key, playerIdSignal: () => 'b' } as never);
    let state=transition(createEncounter(),{type:'start'},'ally').state;
    state.players=[{id:'a',name:'Alice'}];state.versus=[{id:'b',name:'Bob'}];
    state.units.forEach((u)=>{ u.owner=u.team==='ally'?'a':'b'; });
    await receive({state});vi.advanceTimersByTime(1500);
    expect(myTeam()).toBe('enemy');
    expect(spectator()).toBe(false);
    expect(allies().every((u)=>u.team==='enemy')).toBe(true);
    expect(canPlay()).toBe(false);
    state=transition(state,{type:'endPhase'},'ally',[],'a').state;
    await receive({state,event:{kind:'phase'}});vi.advanceTimersByTime(1500);
    expect(canPlay()).toBe(true);
    selected.set('');selectUnit(state.units.find((u)=>u.team==='enemy')!);
    expect(current()?.team).toBe('enemy');
    connectEngine({ t: (key: string) => key } as never);
  });
  it('move: the unit walks at once, Escape brings it back, the action sends the move with it',async()=>{
    const command = vi.fn();
    connectHost({ command, pace: vi.fn(), close: vi.fn(), enter: () => () => {}, started: vi.fn(), ended: vi.fn() });
    const state=transition(createEncounter(),{type:'start'},'ally').state;
    await receive({state});busy.set(false);
    selectUnit(state.units[0]);
    chooseCell({x:4,y:3});
    expect(command).not.toHaveBeenCalled();
    expect(mode()).toBe('menu');expect(current()).toMatchObject({x:4,y:3,moved:true});
    cancel();
    expect(staged()).toBeNull();expect(mode()).toBe('move');expect(current()).toMatchObject({x:4,y:5});
    chooseCell({x:4,y:3});action('wait');
    expect(command).toHaveBeenCalledWith({ revision: state.revision, command: {type:'move',unitId:'ally-warrior',cell:{x:4,y:3},path:[{x:4,y:4},{x:4,y:3}]}, then: {type:'wait',unitId:'ally-warrior'} });
    // Own move: already walked, no second animation; the action plays right after.
    const moved=transition(state,{type:'move',unitId:'ally-warrior',cell:{x:4,y:3}},'ally');
    const waited=transition(moved.state,{type:'wait',unitId:'ally-warrior'},'ally');
    await receive(moved);
    expect(staged()).toBeNull();
    await receive(waited);
    expect(battle()?.revision).toBe(waited.state.revision);
  });
  it('queues packets arriving during an animation, in order',async()=>{
    const state=transition(createEncounter(),{type:'start'},'ally').state;
    await receive({state});vi.advanceTimersByTime(1500);
    const a=transition(state,{type:'wait',unitId:'ally-warrior'},'ally');
    const b=transition(a.state,{type:'wait',unitId:'ally-archer'},'ally');
    await receive(a);await receive(b);
    expect(battle()?.revision).toBe(a.state.revision);
    vi.advanceTimersByTime(1500);await Promise.resolve();
    expect(battle()?.revision).toBe(b.state.revision);
  });
  it('mouse: a click on a target in range attacks at once, with the forecast on hover',async()=>{
    const command = vi.fn();
    connectHost({ command, pace: vi.fn(), close: vi.fn(), enter: () => () => {}, started: vi.fn(), ended: vi.fn() });
    const state=transition(createEncounter(),{type:'start'},'ally').state;
    state.units[3].x=4;state.units[3].y=4;
    await receive({state});busy.set(false);
    selectUnit(state.units[0]);chooseCell({x:4,y:5});
    expect(mode()).toBe('menu');
    action('attack');hoverCell({x:4,y:4});
    expect(forecast()?.target.id).toBe('enemy-warrior');
    chooseCell({x:4,y:4});
    expect(command).toHaveBeenCalledWith({ revision: state.revision, command: {type:'attack',unitId:'ally-warrior',targetId:'enemy-warrior'} });
  });
  it('route: the arrow follows the pointer cell by cell, and the move uses it',async()=>{
    const command = vi.fn();
    connectHost({ command, pace: vi.fn(), close: vi.fn(), enter: () => () => {}, started: vi.fn(), ended: vi.fn() });
    const state=transition(createEncounter(),{type:'start'},'ally').state;
    await receive({state});busy.set(false);
    selectUnit(state.units[0]);   // warrior at 4,5, move 3
    hoverCell({x:3,y:5});hoverCell({x:3,y:4});hoverCell({x:4,y:4});
    expect(route()).toEqual([{x:3,y:5},{x:3,y:4},{x:4,y:4}]);
    // Back on a cell of the route: cut there. A far cell: shortest path.
    hoverCell({x:3,y:4});expect(route()).toEqual([{x:3,y:5},{x:3,y:4}]);
    hoverCell({x:4,y:4});chooseCell({x:4,y:4});
    expect(staged()?.path).toEqual([{x:3,y:5},{x:3,y:4},{x:4,y:4}]);
    action('wait');
    expect(command.mock.calls[0][0].command.path).toEqual([{x:3,y:5},{x:3,y:4},{x:4,y:4}]);
  });
  it('pace: the shared speed comes from the state; asking for another goes to the server',async()=>{
    const paceFn = vi.fn();
    connectHost({ command: vi.fn(), pace: paceFn, close: vi.fn(), enter: () => () => {}, started: vi.fn(), ended: vi.fn() });
    const state=transition(createEncounter(),{type:'start'},'ally').state;
    await receive({state});
    expect(pace()).toBe(1);
    setPace(2);expect(paceFn).toHaveBeenCalledWith(2);
    await receive({state:{...state,pace:2}});expect(pace()).toBe(2);
  });
});

describe("the objective the HUD says", () => {
  const withObjective = (objective?: Record<string, unknown>, own?: string) => {
    const state = createEncounter();
    state.objective = objective as never;
    state.meta.objective = own;
    battle.set(state);
    return state;
  };
  beforeEach(() => Object.assign(TEXTS, messages.en));
  afterEach(() => {
    battle.set(null);
    for (const key of Object.keys(TEXTS)) delete TEXTS[key];
  });

  it("is to defeat every enemy when the battle has none", () => {
    withObjective(undefined);
    expect(objectiveText()).toBe("Defeat every enemy unit.");
  });

  it("names the chief, the rounds to hold, and the limit of rounds", () => {
    const state = withObjective({ type: "boss", unitId: "enemy-mage", limit: 6 });
    state.units.find((u) => u.id === "enemy-mage")!.id = "enemy-mage";
    battle.set({ ...state, units: state.units.map((u) => (u.team === "enemy" ? { ...u, id: `enemy-${u.role}` } : u)) });
    expect(objectiveText()).toBe(`Defeat ${state.units.find((u) => u.role === "mage" && u.team === "enemy")!.name}. Within 6 rounds.`);
    withObjective({ type: "survive", turns: 4 });
    expect(objectiveText()).toBe("Hold out for 4 rounds.");
    withObjective({ type: "reach", cell: { x: 1, y: 1 } });
    expect(objectiveText()).toBe("Get a hero to the marked cell.");
  });

  it("is the text of the encounter when it has one, and the generic one for a type nobody said", () => {
    withObjective({ type: "boss", unitId: "x" }, "Hold the gate.");
    expect(objectiveText()).toBe("Hold the gate.");
    withObjective({ type: "holdout" });
    expect(objectiveText()).toBe("Defeat every enemy unit.");
  });
});

describe("the keys of the battle while the player writes", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    connectEngine({ t: (key: string) => key } as never);
    teardown();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  /** Installs the keyboard of the battle and returns what presses a key on an element. */
  function keyboard() {
    const listeners: Record<string, (event: unknown) => void> = {};
    vi.stubGlobal("addEventListener", (name: string, listener: (event: unknown) => void) => (listeners[name] = listener));
    vi.stubGlobal("removeEventListener", () => {});
    vi.stubGlobal("requestAnimationFrame", () => 0);
    vi.stubGlobal("cancelAnimationFrame", () => {});
    vi.stubGlobal("HTMLButtonElement", class {});
    const remove = installInput();
    const press = (key: string, target: unknown) => {
      const event = { key, target, preventDefault: vi.fn(), stopImmediatePropagation: vi.fn() };
      listeners.keydown(event);
      return event;
    };
    return { press, remove };
  }

  it("are left to the field of the chat: a letter is typed, not an order", async () => {
    const state = transition(createEncounter(), { type: "start" }, "ally").state;
    await receive({ state });
    busy.set(false);
    selected.set("");
    const { press, remove } = keyboard();

    // "e" ends the phase and Enter confirms, but not from the field the player writes in
    const typed = press("e", { tagName: "INPUT" });
    press("Enter", { tagName: "INPUT" });
    expect(typed.preventDefault).not.toHaveBeenCalled();
    expect(planned()).toBeNull();

    const order = press("e", { tagName: "CANVAS" });
    expect(order.preventDefault).toHaveBeenCalled();
    expect(planned()).toEqual({ type: "endPhase" });
    remove();
  });
});
