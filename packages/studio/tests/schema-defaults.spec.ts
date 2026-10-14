import { describe, expect, it, vi } from "vitest";
import { applyBlockSchemaDefaults } from "../runtime/blocks/schema-defaults";
import { schemaWait, wait } from "../runtime/blocks/executors/wait";
import { schemaShowNotification } from "../runtime/blocks/executors/show-notification";

describe("applyBlockSchemaDefaults", () => {
  it("fills a missing field with the schema default", () => {
    expect(applyBlockSchemaDefaults(schemaWait.schema, {})).toEqual({ duration: 1 });
    expect(applyBlockSchemaDefaults(schemaWait.schema, undefined)).toEqual({ duration: 1 });
  });

  it("replaces null but keeps a value that was set", () => {
    expect(applyBlockSchemaDefaults(schemaWait.schema, { duration: null as never })).toEqual({ duration: 1 });
    expect(applyBlockSchemaDefaults(schemaWait.schema, { duration: 3 })).toEqual({ duration: 3 });
  });

  it("defaults a notification to the info type and 2000 ms", () => {
    expect(applyBlockSchemaDefaults(schemaShowNotification.schema, { message: "Hi" })).toEqual({
      message: "Hi",
      time: 2000,
      type: "info",
    });
  });
});

describe("wait executor", () => {
  it("waits for the default duration when the block has no data", async () => {
    vi.useFakeTimers();
    let done = false;
    const pending = wait({} as never, {} as never).then(() => { done = true; });
    await vi.advanceTimersByTimeAsync(999);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await pending;
    expect(done).toBe(true);
    vi.useRealTimers();
  });
});
