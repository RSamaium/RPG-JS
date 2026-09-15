/** A safe, presentational Markdown run. Render `text` as a text node, never HTML. */
export interface RichTextRun {
  text: string;
  kind: "text" | "strong" | "em" | "code" | "strike";
}

/**
 * Parse a small game-friendly Markdown subset into safe text runs, on either runtime.
 * Supports emphasis, inline code, strike-through, headings, lists and link labels.
 * HTML is literal text; URLs and images never create executable or remote content.
 * @param source - Untrusted dialogue, tooltip or journal text.
 * @returns Runs for a DOM/text renderer (no HTML injection is needed).
 * @example
 * const runs = parseRichText('Take the **silver key**.');
 */
export function parseRichText(source: string): RichTextRun[] {
  const runs: RichTextRun[] = [];
  const inline = (text: string, kind: RichTextRun["kind"] = "text", depth = 0) => {
    if (depth > 8) { runs.push({ text, kind }); return; }
    const pattern = /\\([\\`*_~\[\]])|\*\*([^*]+)\*\*|__([^_]+)__|`([^`]+)`|~~([^~]+)~~|\*([^*\n]+)\*|_([^_\n]+)_|!?\[([^\]]*)\]\([^\n)]*\)/g;
    let start = 0;
    for (const match of text.matchAll(pattern)) {
      if (match.index! > start) runs.push({ text: text.slice(start, match.index), kind });
      if (match[1]) runs.push({ text: match[1], kind });
      else if (match[2] || match[3]) inline(match[2] || match[3], "strong", depth + 1);
      else if (match[4]) runs.push({ text: match[4], kind: "code" });
      else if (match[5]) inline(match[5], "strike", depth + 1);
      else if (match[6] || match[7]) inline(match[6] || match[7], "em", depth + 1);
      else inline(match[8] || "", kind, depth + 1);
      start = match.index! + match[0].length;
    }
    if (start < text.length) runs.push({ text: text.slice(start), kind });
  };
  String(source ?? "").replace(/\r\n?/g, "\n").split("\n").forEach((line, index) => {
    if (index) runs.push({ text: "\n", kind: "text" });
    const heading = /^#{1,6}\s+(.+)$/.exec(line);
    inline(heading ? heading[1] : line.replace(/^\s*[-+*]\s+/, "• ").replace(/^>\s?/, ""), heading ? "strong" : "text");
  });
  return runs;
}

/**
 * Reveal a prefix without cutting Unicode code points or exposing Markdown syntax.
 * @param runs - Runs returned by parseRichText.
 * @param count - Maximum visible code points.
 * @returns A new array suitable for a typewriter renderer.
 * @example sliceRichText(parseRichText('**Hello**'), 2) // bold "He"
 */
export function sliceRichText(runs: readonly RichTextRun[], count: number): RichTextRun[] {
  let remaining = Math.max(0, count);
  return runs.flatMap(run => {
    const chars = Array.from(run.text);
    const text = chars.slice(0, remaining).join("");
    remaining = Math.max(0, remaining - chars.length);
    return text ? [{ ...run, text }] : [];
  });
}

/**
 * Paginate rich text for dialogue panels, preserving formatting and all text.
 * @param runs - Parsed text runs.
 * @param size - Soft page length in code points; defaults to 320 (minimum 40).
 * @returns Non-empty page list, including one empty page for empty input.
 * @example const pages = paginateRichText(parseRichText(message), 180);
 */
export function paginateRichText(runs: readonly RichTextRun[], size = 320): RichTextRun[][] {
  const limit = Math.max(40, Number.isFinite(size) ? size : 320);
  const pages: RichTextRun[][] = [[]];
  let length = 0;
  for (const run of runs) {
    for (const char of Array.from(run.text)) {
      const page = pages[pages.length - 1];
      const last = page[page.length - 1];
      if (last?.kind === run.kind) last.text += char;
      else page.push({ kind: run.kind, text: char });
      length++;
      if (length >= limit && (/\s/.test(char) || length >= limit + 24)) { pages.push([]); length = 0; }
    }
  }
  if (pages.length > 1 && !pages[pages.length - 1].length) pages.pop();
  return pages;
}
