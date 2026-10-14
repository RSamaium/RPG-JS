export interface Modifiers {
  readonly shift: boolean;
  readonly ctrl: boolean;
  readonly alt: boolean;
  readonly meta: boolean;
}

export const NO_MODIFIERS: Modifiers = Object.freeze({ shift: false, ctrl: false, alt: false, meta: false });

/** A pointer event, already converted to world coordinates (pixels of the map). */
export interface PointerInput {
  readonly x: number;
  readonly y: number;
  /** 0 is the main button, 2 the secondary one. */
  readonly button: number;
  readonly modifiers: Modifiers;
}

export interface KeyInput {
  /** `KeyboardEvent.key`: `"Escape"`, `"Delete"`, `"a"`… */
  readonly key: string;
  readonly modifiers: Modifiers;
}

/** Builds a pointer input: `pointer(10, 20, { shift: true })`. Handy in tests and in hosts that have no DOM events. */
export function pointer(x: number, y: number, options: { button?: number } & Partial<Modifiers> = {}): PointerInput {
  const { button = 0, ...modifiers } = options;
  return { x, y, button, modifiers: { ...NO_MODIFIERS, ...modifiers } };
}

export function key(name: string, modifiers: Partial<Modifiers> = {}): KeyInput {
  return { key: name, modifiers: { ...NO_MODIFIERS, ...modifiers } };
}
