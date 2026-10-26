import { defineAssets } from "../assets";
import { defineMap, el, event } from "../define-map";

export const assets = defineAssets({
  "tree-oak": { src: "/img/tree-oak.png", size: [64, 96], hitbox: [16, 16, 32, 24] },
  "house-red": { src: "/img/house-red.png", size: [128, 128] },
  "wood-icon": { src: "/img/wood.png", size: [16, 16] },
});

export const forest = () =>
  defineMap(assets, {
    id: "forest",
    size: [2560, 1920],
    tileSize: 32,
    elements: [
      el("house-red", { id: "home", x: 640, y: 320 }),
      el("tree-oak", { id: "t1", x: 128, y: 96, data: { hits: 5 } }),
      el("tree-oak", { id: "t2", x: 256, y: 160, depth: { z: 2, height: 96 } }),
    ],
    events: [event("chest", { id: "chest-1", x: 700, y: 400, graphic: "wood-icon" })],
    extensions: { terrain: { version: 1 } },
  });

import type { CommitHost, MapCommitter } from "../committer";
import { localCommitter, type LocalCommitter, type LocalCommitterOptions } from "../committer";
import type { ApplyResult } from "../result";

/** A local committer that also exposes the host it is attached to, to simulate an authority. */
export function spyCommitter(options?: LocalCommitterOptions): LocalCommitter & { host: () => CommitHost } {
  const committer = localCommitter(options);
  let host: CommitHost | undefined;
  const attach = committer.attach.bind(committer);
  return Object.assign(committer, {
    attach(value: CommitHost) {
      host = value;
      attach(value);
    },
    host: () => host!,
  });
}

/** A committer that, like a remote one, answers asynchronously. */
export function asyncCommitter(): MapCommitter<Promise<ApplyResult>> & { calls: number } {
  let host: CommitHost | undefined;
  const self = {
    calls: 0,
    attach(value: CommitHost) {
      host = value;
    },
    async commit(request: Parameters<MapCommitter["commit"]>[0]) {
      self.calls += 1;
      await Promise.resolve();
      return host!.integrate(request.patches, {
        origin: "local",
        record: request.record,
        ...(request.coalesce !== undefined ? { coalesce: request.coalesce } : {}),
      });
    },
  };
  return self;
}
