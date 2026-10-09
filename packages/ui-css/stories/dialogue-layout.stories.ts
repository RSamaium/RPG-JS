import type { Meta, StoryObj } from "@storybook/html-vite";
import { interactive, scene, lunaPortrait } from "./fixtures";
import { parseRichText } from "../../client/src/utils/richText";
import { measureRichText, richTextLength, locateReadPosition } from "../../client/src/utils/measuredRichText";

export default { title: "Compositions/Responsive dialogue", parameters: { controls: { disable: true } } } satisfies Meta;

const message = 'The **silver key** belongs to you now.\nBeyond the gate lies *the forgotten kingdom*. 🗝️\n' + 'Follow the river until you reach the sanctuary. '.repeat(18);
function dialogue(height?: number, choices = false, short = false) {
  const root = interactive(scene(`<div class="rpg-ui-dialog-layer"><div class="rpg-ui-dialog-container" data-position="bottom" data-full-width="false" data-has-face="true"><div class="rpg-ui-dialog" ${height ? `style="--rpg-ui-dialogue-height:${height}px;--rpg-ui-dialogue-height-portrait:${height}px;--rpg-ui-dialogue-height-landscape:${height}px"` : ''}><div class="rpg-ui-dialog-body"><div><div class="rpg-ui-dialog-speaker">Luna</div><div class="rpg-ui-dialog-content"></div>${choices ? '<div class="rpg-ui-dialog-actions"></div>' : ''}</div><div class="rpg-ui-dialog-face"><img src="${lunaPortrait}" alt="Luna"></div></div><button type="button" class="rpg-ui-dialog-continue" aria-label="Continue"><span aria-hidden="true"></span></button></div></div></div>`));
  const content = root.querySelector<HTMLElement>('.rpg-ui-dialog-content')!;
  const button = root.querySelector<HTMLButtonElement>('.rpg-ui-dialog-continue')!;
  root.querySelector('.rpg-ui-dialog-body')!.setAttribute('data-has-choices', String(choices));
  const runs = parseRichText(short ? 'Where would you like to go?' : message);
  let pages = [runs], index = 0;
  const render = () => {
    content.replaceChildren(...pages[index].map(run => {
      const span = document.createElement('span'); span.className = `rpg-ui-rich-${run.kind}`; span.textContent = run.text; return span;
    }));
    const actions = root.querySelector('.rpg-ui-dialog-actions');
    const final = choices && index === pages.length - 1;
    button.hidden = final;
    if (actions) actions.innerHTML = final ? `<div class="rpg-ui-dialog-choices">${Array.from({ length: short ? 2 : 12 }, (_, i) => `<button class="rpg-ui-dialog-choice" type="button">Destination ${i + 1}</button>`).join('')}</div>` : '';
  };
  const reflow = () => {
    const speaker = root.querySelector<HTMLElement>('.rpg-ui-dialog-speaker')!;
    const budget = choices ? Math.max(1, (content.parentElement!.clientHeight - speaker.offsetHeight - parseFloat(getComputedStyle(speaker).marginBottom || '0')) * .45) : undefined;
    const next = measureRichText(runs, content, budget);
    if (!next) return;
    const anchor = pages.slice(0, index).reduce((sum, page) => sum + richTextLength(page), 0);
    index = locateReadPosition(next, anchor).index; pages = next; render();
  };
  button.addEventListener('click', () => { index = (index + 1) % pages.length; render(); });
  const observer = new ResizeObserver(() => { if (root.isConnected) reflow(); else observer.disconnect(); });
  observer.observe(content);
  document.fonts.ready.then(() => { if (root.isConnected) reflow(); });
  render();
  return root;
}
export const Desktop: StoryObj = { render: () => dialogue(280) };
export const Portrait: StoryObj = { render: () => dialogue(320) };
export const Landscape: StoryObj = { render: () => dialogue(220) };
export const RotationAndLongChoices: StoryObj = { render: () => dialogue(undefined, true) };
export const ShortChoices: StoryObj = { render: () => dialogue(undefined, true, true) };
