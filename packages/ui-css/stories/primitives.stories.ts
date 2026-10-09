import type { Meta, StoryObj } from "@storybook/html-vite";
import { panel, button, bars, slots, menuItems } from "./fixtures";
export default { title: "Elements/Primitives" } satisfies Meta;
export const Panels: StoryObj = {
  render: () =>
    '<div class="rpg-ui-grid">' +
    panel(
      "Sanctuary",
      "<p>A framed surface for any custom GUI.</p>" + button("Rest", "primary"),
    ) +
    '<section class="rpg-ui-window"><h2 class="rpg-ui-window-title">Quest log</h2><p>Reach the northern gate before nightfall.</p></section></div>',
};
export const Fields: StoryObj = {
  render: () =>
    panel(
      "Character name",
      '<label class="rpg-ui-stack">Name<input class="rpg-ui-input" placeholder="Enter a name"></label><label class="rpg-ui-stack">Invalid name<input class="rpg-ui-input" value="!" aria-invalid="true" aria-describedby="name-error"><span id="name-error">Use at least two letters.</span></label><label>Unavailable<input class="rpg-ui-input" disabled value="Locked"></label><label><input type="checkbox" class="rpg-ui-checkbox" checked>Enable sound effects</label>' +
        button("Confirm", "primary"),
    ),
};
export const Bars: StoryObj = { render: () => panel("Resources", bars()) };
export const Slots: StoryObj = { render: () => slots() };
export const Tooltip: StoryObj = {
  render: () =>
    '<div class="rpg-ui-stack"><button class="rpg-ui-btn" aria-describedby="crystal-help">Crystal sword</button><div id="crystal-help" role="tooltip" class="rpg-ui-tooltip" data-visible="true" style="position:relative;align-self:flex-start">Attack +24 · Rare equipment</div></div>',
};
export const TabsAndLists: StoryObj = {
  render: () =>
    '<div class="rpg-ui-menu-tabs">' +
    menuItems(["Items", "Equipment", "Skills"]) +
    '</div><div class="rpg-ui-menu">' +
    menuItems(["Crystal sword", "Healing potion", "Silver shield"]) +
    "</div>",
};
export const Notifications: StoryObj = {
  render: () =>
    '<div class="rpg-ui-stack">' +
    panel("Quest complete", "<p>You discovered the crystal sanctuary.</p>") +
    '<div class="rpg-ui-toast"><h3 class="rpg-ui-toast-title">Level up</h3><p>You reached level 12.</p></div><div class="rpg-ui-notification"><span class="rpg-ui-notification-message">Inventory full</span></div></div>',
};
