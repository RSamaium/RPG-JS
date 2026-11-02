import { describe, expect, it } from "vitest";
import { EMOTION_BUBBLES, EMOTION_BUBBLE_SHEET } from "./emotion-bubble";

describe("emotion bubbles", () => {
  it("maps every emotion to a distinct cell inside the sheet grid", () => {
    const cells = Object.values(EMOTION_BUBBLES).map(([column, row]) => `${column},${row}`);
    expect(new Set(cells).size).toBe(cells.length);
    for (const [column, row] of Object.values(EMOTION_BUBBLES)) {
      expect(column).toBeLessThan(EMOTION_BUBBLE_SHEET.framesWidth);
      expect(row).toBeLessThan(EMOTION_BUBBLE_SHEET.framesHeight);
    }
  });

  it("fills the whole 6x5 grid", () => {
    expect(Object.keys(EMOTION_BUBBLES)).toHaveLength(
      EMOTION_BUBBLE_SHEET.framesWidth * EMOTION_BUBBLE_SHEET.framesHeight
    );
  });
});
