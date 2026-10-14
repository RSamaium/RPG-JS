// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createMapModel } from "../model/model";
import { nodesIn, pickNode, pickNodes, sameTarget, targetKey, targetOf } from "./picking";
import { sceneOf, world } from "./__fixtures__";

const nodes = sceneOf(createMapModel(world()));

describe("picking", () => {
  it("finds what is under a point, by drawn bounds", () => {
    expect(pickNode(nodes, { x: 150, y: 150 })?.id).toBe("t1");
    expect(pickNode(nodes, { x: 700, y: 605 })?.id).toBe("chest-1");
    expect(pickNode(nodes, { x: 5, y: 5 })).toBeUndefined();
  });

  it("counts the border of a node as inside", () => {
    expect(pickNode(nodes, { x: 128, y: 96 })?.id).toBe("t1");
    expect(pickNode(nodes, { x: 192, y: 192 })?.id).toBe("t1");
    expect(pickNode(nodes, { x: 193, y: 192 })).toBeUndefined();
  });

  it("puts the node drawn in front first when sprites overlap", () => {
    // t1 spans x 128..192 / y 96..192; t2 spans x 256..320: move a third tree over t1
    const overlap = [
      { ...nodes.find((n) => n.id === "t1")!, id: "back", sortKey: 10 },
      { ...nodes.find((n) => n.id === "t1")!, id: "front", sortKey: 20 },
    ];
    expect(pickNodes(overlap, { x: 150, y: 150 }).map((n) => n.id)).toEqual(["front", "back"]);
  });

  it("breaks ties with the node that comes later, as the renderer draws it later", () => {
    const same = [
      { ...nodes.find((n) => n.id === "t1")!, id: "first", sortKey: 5 },
      { ...nodes.find((n) => n.id === "t1")!, id: "second", sortKey: 5 },
    ];
    expect(pickNode(same, { x: 150, y: 150 })?.id).toBe("second");
  });

  it("can use the hitbox instead of the drawn bounds, and ignores nodes without one", () => {
    expect(pickNode(nodes, { x: 150, y: 110 }, { area: "bounds" })?.id).toBe("t1");
    expect(pickNode(nodes, { x: 150, y: 110 }, { area: "hitbox" })).toBeUndefined(); // crown, not trunk
    expect(pickNode(nodes, { x: 150, y: 175 }, { area: "hitbox" })?.id).toBe("t1"); // trunk
    expect(pickNode(nodes, { x: 705, y: 605 }, { area: "hitbox" })).toBeUndefined(); // the chest has no hitbox
  });

  it("can be limited to some kinds of target", () => {
    expect(pickNode(nodes, { x: 705, y: 605 }, { types: ["element"] })).toBeUndefined();
    expect(pickNode(nodes, { x: 705, y: 605 }, { types: ["event"] })?.id).toBe("chest-1");
  });

  it("selects by area, touching included", () => {
    expect(nodesIn(nodes, { x: 100, y: 80, width: 200, height: 150 }).map((n) => n.id).sort()).toEqual(["t1", "t2"]);
    expect(nodesIn(nodes, { x: 100, y: 80, width: 200, height: 150 }, ["event"])).toEqual([]);
    expect(nodesIn(nodes, { x: 192, y: 192, width: 0, height: 0 }).map((n) => n.id)).toEqual(["t1"]);
  });

  it("names targets the way the scene does", () => {
    const node = nodes.find((n) => n.id === "t1")!;
    expect(targetOf(node)).toEqual({ type: "element", id: "t1" });
    expect(targetKey(targetOf(node))).toBe(node.key);
    expect(sameTarget({ type: "element", id: "a" }, { type: "event", id: "a" })).toBe(false);
  });
});
