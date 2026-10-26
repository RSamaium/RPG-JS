import { defineAssets } from "../../model/assets";
import { defineMap, el, event } from "../../model/define-map";
import { createMapModel, type MapModel } from "../../model/model";
import type { ApplyResult, MaybePromise } from "../../model/result";
import { elements, events } from "../../features";
import type { DescribeContext, SceneNode } from "../../renderer/scene";
import { registerElementIntents } from "../builtin-intents";
import { createInteraction, type InteractionController, type InteractionOptions, type ModelApi } from "../controller";

export const assets = defineAssets({
  tree: { src: "/tree.png", size: [64, 96], hitbox: [16, 70, 32, 20] },
  house: { src: "/house.png", size: [128, 128], hitbox: [0, 64, 128, 64] },
  chest: { src: "/chest.png", size: [16, 16] },
  wood: { src: "/wood.png", size: [16, 16] },
});

export const world = () =>
  defineMap(assets, {
    id: "world",
    size: [1024, 768],
    elements: [
      el("house", { id: "home", x: 640, y: 320 }),
      el("tree", { id: "t1", x: 128, y: 96 }),
      el("tree", { id: "t2", x: 256, y: 160 }),
    ],
    events: [event("pickup", { id: "chest-1", x: 700, y: 600, graphic: "chest" })],
  });

export const describeContext: DescribeContext = { assets };

/** The scene the way the renderer describes it, without PixiJS. */
export const sceneOf = (model: { readonly state: MapModel["state"] }): readonly SceneNode[] => [
  ...elements().render!.describeAll(model.state, describeContext),
  ...events().render!.describeAll(model.state, describeContext),
];

export interface Harness<R extends MaybePromise<ApplyResult> = ApplyResult> {
  readonly model: MapModel<R>;
  readonly controller: InteractionController<R>;
  readonly nodes: () => readonly SceneNode[];
}

export function harness(options: Partial<Pick<InteractionOptions<ApplyResult>, "modes" | "actor">> & { model?: MapModel } = {}): Harness {
  const model = options.model ?? createMapModel(world());
  const controller = createInteraction({
    model: model as ModelApi<ApplyResult>,
    assets,
    describe: describeContext,
    nodes: () => sceneOf(model),
    ...(options.modes ? { modes: options.modes } : {}),
    ...(options.actor ? { actor: options.actor } : {}),
    onError: (error) => {
      throw error;
    },
  });
  registerElementIntents(controller as unknown as InteractionController);
  return { model, controller, nodes: () => sceneOf(model) };
}
