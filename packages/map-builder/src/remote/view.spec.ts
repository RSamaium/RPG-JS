// @vitest-environment node
import { Container, Sprite } from "pixi.js";
import { describe, expect, it } from "vitest";
import { elements, events, selection } from "../features";
import { createMapView } from "../renderer/view";
import { fakeTextures } from "../features/__fixtures__";
import { assets, client, newAuthority, settle } from "./__fixtures__";
import { bindRemoteEffects } from "./join";

const container = (view: { stages: { objects: Container } }, key: string) =>
  view.stages.objects.children.find((child) => child.label === key) as Container | undefined;

async function watcher() {
  const a = newAuthority();
  const ann = await client(a);
  const bob = await client(a);
  const view = createMapView({ model: bob.model, assets, features: [elements(), events(), selection()], textures: fakeTextures().provider, onError: () => undefined });
  return { a, ann, bob, view };
}

describe("a view of a remote map", () => {
  it("follows what other players do", async () => {
    const { ann, view } = await watcher();
    await ann.controller.submit({ type: "element.move", id: "t1", x: 300, y: 400 });
    await settle();
    const sprite = container(view, "elements/t1")!.children[0] as Sprite;
    expect([sprite.x, sprite.y]).toEqual([300, 400]);
    expect(container(view, "elements/t1")!.zIndex).toBe(400 + 90);
  });

  it("follows what the game does, such as a tree being cut and its loot appearing", async () => {
    const { a, view } = await watcher();
    a.apply([{ type: "element.remove", id: "t1" }, { type: "event.add", event: { id: "wood-1", kind: "loot", x: 128, y: 96, graphic: "wood" } }]);
    await settle();
    expect(container(view, "elements/t1")).toBeUndefined();
    expect(container(view, "events/wood-1")).toBeDefined();
  });

  it("is rebuilt when the authority sends the whole map again", async () => {
    const { a, bob, view } = await watcher();
    bob.wire.drop((m) => m.type === "patches");
    a.apply({ type: "element.remove", id: "t2" });
    a.apply({ type: "element.add", element: { id: "new", kind: "tree", x: 10, y: 10 } });
    await settle();
    expect(container(view, "elements/t2")).toBeDefined(); // bob heard nothing yet

    bob.wire.drop(() => false);
    bob.wire.emit({ type: "snapshot", revision: 2, definition: a.model.getDefinition() });
    expect(container(view, "elements/t2")).toBeUndefined();
    expect(container(view, "elements/new")).toBeDefined();
    expect(container(view, "elements/t1")).toBeDefined();
  });

  it("shows the effects the authority plays, on the right element", async () => {
    const { a, bob, view } = await watcher();
    bindRemoteEffects(bob.remote, view.effects);
    a.effect("t1", "shake", { duration: 100, intensity: 10, frequency: 1 });
    await settle();
    view.tick(25);
    expect(container(view, "elements/t1")!.x).not.toBe(0);
    expect(container(view, "elements/t2")!.x).toBe(0);
    view.tick(100);
    expect(container(view, "elements/t1")!.x).toBe(0);
  });

  it("an effect aimed at something that is not there is ignored", async () => {
    const { a, bob, view } = await watcher();
    bindRemoteEffects(bob.remote, view.effects);
    a.effect("ghost", "shake");
    await settle();
    expect(view.effects.running).toBe(0);
  });

  it("stops showing effects when unbound", async () => {
    const { a, bob, view } = await watcher();
    const stop = bindRemoteEffects(bob.remote, view.effects);
    stop();
    a.effect("t1", "shake");
    await settle();
    expect(view.effects.running).toBe(0);
  });
});
