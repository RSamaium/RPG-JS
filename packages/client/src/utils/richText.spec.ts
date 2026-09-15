import { describe, expect, it } from "vitest";
import { paginateRichText, parseRichText, sliceRichText } from "./richText";

describe("safe dialogue rich text", () => {
  it("parses emphasis, code, headings and lists without rendering HTML", () => {
    const runs = parseRichText("# Quest\nTake **gold**, *silver*, `key`, ~~dust~~.\n- Go\n<script>alert(1)</script>");
    expect(runs).toContainEqual({ text: "Quest", kind: "strong" });
    expect(runs).toContainEqual({ text: "gold", kind: "strong" });
    expect(runs).toContainEqual({ text: "silver", kind: "em" });
    expect(runs).toContainEqual({ text: "key", kind: "code" });
    expect(runs).toContainEqual({ text: "dust", kind: "strike" });
    expect(runs.map(run => run.text).join("")).toContain("• Go\n<script>alert(1)</script>");
  });
  it("keeps only link/image labels and honours escaped markup", () => {
    expect(parseRichText("[label](https://example.org) ![portrait](remote.png) \\*literal\\*").map(run => run.text).join("")).toBe("label portrait *literal*");
  });
  it("reveals Unicode code points, retaining formatting", () => {
    expect(sliceRichText(parseRichText("**🗡️ Go**"), 1)).toEqual([{ text: "🗡", kind: "strong" }]);
    expect(sliceRichText(parseRichText("hello"), -1)).toEqual([]);
  });
  it("paginates without losing text or mutating the source", () => {
    const runs = parseRichText("**" + "A long quest awaits. ".repeat(50) + "**");
    const before = JSON.stringify(runs);
    const pages = paginateRichText(runs, 180);
    expect(pages.length).toBeGreaterThan(1);
    expect(pages.flat().map(run => run.text).join("")).toBe(runs.map(run => run.text).join(""));
    expect(pages.flat().every(run => run.kind === "strong")).toBe(true);
    expect(JSON.stringify(runs)).toBe(before);
    expect(paginateRichText([])).toEqual([[]]);
  });
});
