import { sliceRichText, type RichTextRun } from "./richText";

export const richTextLength = (runs: RichTextRun[]): number => runs.reduce((sum, run) => sum + Array.from(run.text).length, 0);

function after(runs: RichTextRun[], offset: number): RichTextRun[] {
  return runs.flatMap(run => {
    const chars = Array.from(run.text);
    const text = chars.slice(Math.min(offset, chars.length)).join("");
    offset = Math.max(0, offset - chars.length);
    return text ? [{ ...run, text }] : [];
  });
}

/** Internal layout-driven pagination. Never discard whitespace, markup runs or Unicode characters. */
export function paginateMeasured(runs: RichTextRun[], fits: (runs: RichTextRun[]) => boolean): RichTextRun[][] {
  const pages: RichTextRun[][] = [];
  let remaining = runs;
  while (richTextLength(remaining)) {
    const length = richTextLength(remaining);
    let low = 1, high = length, count = 1;
    while (low <= high) {
      const middle = Math.floor((low + high) / 2);
      if (fits(sliceRichText(remaining, middle))) { count = middle; low = middle + 1; }
      else high = middle - 1;
    }
    if (count < length) {
      const text = Array.from(sliceRichText(remaining, count).map(run => run.text).join(""));
      for (let i = text.length - 1; i >= Math.floor(count / 2); i--) {
        if (/\s/.test(text[i])) { count = i + 1; break; }
      }
    }
    pages.push(sliceRichText(remaining, count));
    remaining = after(remaining, count);
  }
  return pages.length ? pages : [[]];
}

/** Measure using the actual rendered typography, including each Markdown span. */
export function measureRichText(runs: RichTextRun[], content: HTMLElement, maxTextHeight?: number): RichTextRun[][] | null {
  if (!content.clientWidth || !content.clientHeight) return null;
  const probe = content.cloneNode(false) as HTMLElement;
  probe.removeAttribute("id");
  probe.setAttribute("aria-hidden", "true");
  Object.assign(probe.style, {
    position: "absolute", visibility: "hidden", pointerEvents: "none", contain: "layout",
    width: `${content.clientWidth}px`, height: "auto", minHeight: "0", maxHeight: "none",
    flex: "none", overflow: "visible", inset: "0 auto auto 0",
  });
  content.parentElement!.appendChild(probe);
  const render = (page: RichTextRun[]) => {
    probe.replaceChildren(...page.map(run => {
      const span = document.createElement("span");
      span.className = `rpg-ui-rich-${run.kind}`;
      span.textContent = run.text;
      return span;
    }));
  };
  try {
    if (maxTextHeight !== undefined) {
      // Measure the complete message, not the typewriter's current prefix:
      // short prompts leave room for choices without moving during typing.
      render(runs);
      content.style.flexBasis = `${Math.min(maxTextHeight, Math.ceil(probe.getBoundingClientRect().height) + 1)}px`;
    }
    return paginateMeasured(runs, page => {
      render(page);
      return probe.getBoundingClientRect().height <= content.clientHeight - 1;
    });
  } finally { probe.remove(); }
}

/** Map an absolute read position to a new layout without skipping unread text. */
export function locateReadPosition(pages: RichTextRun[][], position: number): { index: number; resume: number } {
  let offset = 0;
  for (let index = 0; index < pages.length; index++) {
    const length = richTextLength(pages[index]);
    if (position <= offset + length || index === pages.length - 1) return { index, resume: Math.max(0, Math.min(length, position - offset)) };
    offset += length;
  }
  return { index: 0, resume: 0 };
}
