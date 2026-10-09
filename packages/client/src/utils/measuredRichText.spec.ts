import { expect, it } from "vitest";
import { parseRichText } from "./richText";
import { locateReadPosition, paginateMeasured, richTextLength } from "./measuredRichText";

it("preserves every Unicode character, space and Markdown run across measured pages", () => {
  const runs = parseRichText("**Silver key** 🗝️\n".repeat(50) + "unbrokenword".repeat(40));
  const pages = paginateMeasured(runs, page => richTextLength(page) <= 55);
  expect(pages.flat().map(run => run.text).join("")).toBe(runs.map(run => run.text).join(""));
  expect(pages.every(page => richTextLength(page) <= 55)).toBe(true);
  expect(pages.flat().some(run => run.kind === "strong")).toBe(true);
  const rotated = paginateMeasured(runs, page => richTextLength(page) <= 23);
  const position = 179;
  const { index, resume } = locateReadPosition(rotated, position);
  expect(rotated.slice(0, index).reduce((sum, page) => sum + richTextLength(page), 0) + resume).toBe(position);
});

it("handles empty dialogue and an impossibly small viewport without losing text", () => {
  expect(paginateMeasured([], () => false)).toEqual([[]]);
  expect(paginateMeasured(parseRichText("abc"), () => false).flat().map(run => run.text).join("")).toBe("abc");
});
