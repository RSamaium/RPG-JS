import { describe, expect, it, vi } from "vitest";
import { show_cinematic, schemaShowCinematic } from "../runtime/blocks/executors/show-cinematic";
import { defaultExecutors, executeBlocksRecursively } from "../runtime/blocks/executors";
import type { GameExecutionContext } from "../runtime/blocks/types";

describe("show_cinematic", () => {
  it("registers a video block and waits until its blocking GUI closes", async () => {
    expect(defaultExecutors.show_cinematic).toBe(show_cinematic);
    expect(schemaShowCinematic.schema.properties.video.format.type).toBe("video");
    let close!: () => void;
    const open = vi.fn(() => new Promise<void>(resolve => close = resolve));
    const gui = vi.fn(() => ({ open }));
    const done = vi.fn();
    const execution = show_cinematic({ player: { gui } } as unknown as GameExecutionContext, { video: "movie" }).then(done);
    expect(gui).toHaveBeenCalledWith("studio-cinematic");
    expect(open).toHaveBeenCalledWith({ mediaId: "movie", allowSkip: true, bgm: 'duck' }, { waitingAction: true, blockPlayerInput: true });
    await Promise.resolve();
    expect(done).not.toHaveBeenCalled();
    close();
    await execution;
    expect(done).toHaveBeenCalledOnce();
  });
  it('batches adjacent video blocks into one blocking GUI and respects per-clip options', async () => {
    const open = vi.fn().mockResolvedValue({ reason: 'ended' });
    const context = { player: { gui: () => ({ open }) } } as unknown as GameExecutionContext;
    await executeBlocksRecursively([
      { id: '1', type: 'show_cinematic', data: { video: 'one', allowSkip: false, bgm: 'pause' } },
      { id: '2', type: 'show_cinematic', data: { video: 'two' } },
    ], context);
    expect(open).toHaveBeenCalledExactlyOnceWith({ mediaId: 'one', allowSkip: false, bgm: 'pause', clips: [{ mediaId: 'two', allowSkip: true, bgm: 'duck' }] }, { waitingAction: true, blockPlayerInput: true });
  });
});
