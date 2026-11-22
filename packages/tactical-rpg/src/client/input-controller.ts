import {
  action,
  battle,
  busy,
  canPlay,
  cancel,
  confirm,
  cursor,
  endPhase,
  nextUnit,
  planned,
  send,
  help,
  hoverCell, cue, leave, spectator, mode, menuItems, menuIndex, setPace, pace, speed, myTeam, skillMenu, skillOptions, skillIndex, pickSkill, itemMenu, itemOptions, itemIndex, pickItem,
} from "./state";
/**
 * Keyboard and gamepad for the battle. `yields()`: another RPGJS GUI has the
 * focus (a dialog, choices, a menu…) and must receive the keys.
 */
/** The player is writing (the chat, a field of another interface): the keys are letters of their text, not orders of the battle. */
export function isTextField(target: unknown): boolean {
  const element = target as { tagName?: string; isContentEditable?: boolean } | null;
  return element?.tagName === "INPUT" || element?.tagName === "TEXTAREA" || element?.isContentEditable === true;
}

export function installInput(yields: () => boolean = () => false): () => void {
  function dispatch(key: string) {
    if (help()) {
      if (key === "Escape") help.set(false);
      return;
    }
    const state = battle();
    if (!state) return;
    // A spectator only leaves (Escape) or closes the result screen.
    if (spectator() && !state.winner) {
      if (key === "Escape") leave();
      return;
    }
    if (state.winner) {
      if (!busy() && (key === "Enter" || key === " ")) leave();
      return;
    }
    if (!state.started && (key === "Enter" || key === " ")) {
      send({ type: "start" });
      return;
    }
    if (busy()) return;
    if (key === "Escape") {
      cue("back");
      cancel();
      return;
    }
    if (!canPlay()) return;
    if(skillMenu()){
      const options=skillOptions();
      if(key==='ArrowDown'||key==='ArrowRight'){skillIndex.set((skillIndex()+1)%options.length);cue('select')}
      if(key==='ArrowUp'||key==='ArrowLeft'){skillIndex.set((skillIndex()+options.length-1)%options.length);cue('select')}
      if(key==='Enter'||key===' ')pickSkill(options[skillIndex()]?.id);
      if(key==='1'||key==='2')pickSkill(options[Number(key)-1]?.id);
      return;
    }
    if (itemMenu()) {
      const options = itemOptions();
      if (!options.length) return;
      if (key === "ArrowDown" || key === "ArrowRight") { itemIndex.set((itemIndex() + 1) % options.length); cue("select"); }
      if (key === "ArrowUp" || key === "ArrowLeft") { itemIndex.set((itemIndex() + options.length - 1) % options.length); cue("select"); }
      if (key === "Enter" || key === " ") pickItem(options[itemIndex()]?.id);
      if (key === "1" || key === "2") pickItem(options[Number(key) - 1]?.id);
      return;
    }
    if (key === "Enter" || key === " ") {
      confirm();
      return;
    }
    // Action menu: arrows go through its entries (the grid cursor stays).
    if (mode() === "menu" && ["ArrowUp", "ArrowDown", "w", "s"].includes(key)) {
      const n = menuItems().length;
      menuIndex.set((menuIndex() + (key === "ArrowUp" || key === "w" ? n - 1 : 1)) % n);
      cue("select");
      return;
    }
    if (key === "Tab" || key === "q") {
      nextUnit();
      return;
    }
    if (key === "e") {
      endPhase();
      return;
    }
    // The keys of the entries of the menu (2, 3…) follow what the menu offers; 1 goes back to the move.
    if (key === "1") {
      action("move");
      return;
    }
    const entry = menuItems().find((item) => item.key === key);
    if (entry && !entry.disabled) {
      action(entry.id);
      return;
    }
    const delta: Record<string, [number, number]> = {
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      w: [0, -1],
      s: [0, 1],
      a: [-1, 0],
      d: [1, 0],
    };
    if (delta[key]) {
      const [dx, dy] = delta[key],
        p = cursor();
      cursor.set({
        x: Math.max(0, Math.min(state.board.columns - 1, p.x + dx)),
        y: Math.max(0, Math.min(state.board.rows - 1, p.y + dy)),
      });
      hoverCell(cursor());
      planned.set(null);
    }
  }
  const recognized = new Set([
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "Enter",
    " ",
    "Escape",
    "Tab",
    "q",
    "e",
    "w",
    "a",
    "s",
    "d",
    "1",
    "2",
    "3",
    "4",
    "r",
  ]);
  /** The opposing side is playing (AI or opponent): Space held fast-forwards it. */
  const theirTurn = () => {
    const state = battle();
    return !!state?.started && !state.winner && state.phase !== myTeam();
  };
  const keydown = (event: KeyboardEvent) => {
    if (yields() || isTextField(event.target)) return;
    if (help() && event.key !== "Escape") return;
    if (event.shiftKey && event.key === "Tab") return;
    if(skillMenu()&&event.key==='Tab')return;
    if (!recognized.has(event.key) || event.ctrlKey || event.metaKey) return;
    // Space held during the opposing turn fast-forwards it, even with a button focused.
    if (event.key === " " && theirTurn()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!event.repeat) setPace(3);
      return;
    }
    if (
      event.target instanceof HTMLButtonElement &&
      !skillMenu() &&
      (event.key === "Enter" || event.key === " ")
    )
      return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if(event.target instanceof HTMLButtonElement)event.target.blur();
    if (event.repeat) return;
    dispatch(event.key);
  };
  const keyup = (event: KeyboardEvent) => {
    if (isTextField(event.target)) return;
    if (event.key === " " && pace() === 3) setPace(speed());
  };
  window.addEventListener("keydown", keydown, true);
  window.addEventListener("keyup", keyup, true);
  let frame = 0,
    lastKey = "",
    lastTime = 0;
  const poll = (now: number) => {
    if (yields()) {
      frame = requestAnimationFrame(poll);
      return;
    }
    const pad = navigator.getGamepads?.()[0];
    let key = "";
    if (pad) {
      const b = pad.buttons;
      key = b[0]?.pressed
        ? "Enter"
        : b[1]?.pressed
          ? "Escape"
          : b[5]?.pressed
            ? "Tab"
            : b[2]?.pressed
              ? "2"
              : b[3]?.pressed
                ? "3"
                : b[9]?.pressed
                  ? "e"
                  : b[12]?.pressed || pad.axes[1] < -0.6
                    ? "ArrowUp"
                    : b[13]?.pressed || pad.axes[1] > 0.6
                      ? "ArrowDown"
                      : b[14]?.pressed || pad.axes[0] < -0.6
                        ? "ArrowLeft"
                        : b[15]?.pressed || pad.axes[0] > 0.6
                          ? "ArrowRight"
                          : "";
    }
    if (
      key &&
      (key !== lastKey || (key.startsWith("Arrow") && now - lastTime > 200))
    ) {
      dispatch(key);
      lastTime = now;
    }
    lastKey = key;
    frame = requestAnimationFrame(poll);
  };
  frame = requestAnimationFrame(poll);
  return () => {
    window.removeEventListener("keydown", keydown, true);
    window.removeEventListener("keyup", keyup, true);
    cancelAnimationFrame(frame);
  };
}
