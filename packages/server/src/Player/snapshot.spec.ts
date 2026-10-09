import { describe, expect, it } from "vitest";
import {
  addPublicSnapshotAliases,
  addSignalSnapshotAliases,
  isSnapshotInput,
  normalizeSnapshotHitbox,
} from "./snapshot";

describe("player snapshot helpers", () => {
  it("adds public aliases without overriding explicit values", () => {
    const snapshot: Record<string, unknown> = { _name: "Hero", _speed: 3, name: "Kept", _canMove: false };
    addPublicSnapshotAliases(snapshot);
    expect(snapshot).toMatchObject({ name: "Kept", speed: 3, canMove: false });
  });

  it("adds signal aliases for public fields", () => {
    const snapshot: Record<string, unknown> = { name: "Hero", speed: 5, _canMove: true, canMove: false };
    addSignalSnapshotAliases(snapshot);
    expect(snapshot).toMatchObject({ _name: "Hero", _speed: 5, _canMove: true });
    expect(() => addSignalSnapshotAliases(null)).not.toThrow();
  });

  it("normalizes saved hitboxes", () => {
    expect(normalizeSnapshotHitbox({ w: 32, h: "48" })).toEqual({ w: 32, h: 48 });
    expect(normalizeSnapshotHitbox({ width: 16, height: 16 })).toEqual({ w: 16, h: 16 });
    expect(normalizeSnapshotHitbox({ w: 0, h: 10 })).toBeNull();
    expect(normalizeSnapshotHitbox(null)).toBeNull();
  });

  it("distinguishes snapshots from save slots", () => {
    expect(isSnapshotInput({ x: 1 })).toBe(true);
    expect(isSnapshotInput(' {"x":1}')).toBe(true);
    expect(isSnapshotInput("auto")).toBe(false);
    expect(isSnapshotInput(2)).toBe(false);
    expect(isSnapshotInput([])).toBe(false);
  });
});
