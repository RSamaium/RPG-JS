import type { Meta, StoryObj } from "@storybook/html-vite";
import { panel, button, bars, slots, icon } from "./fixtures";
export default { title: "Foundations/Design system" } satisfies Meta;
export const Overview: StoryObj = {
  render: () =>
    '<div class="catalog-content"><p class="catalog-caption">RPGJS • Reusable GUI library</p><h1>Crystal chronicles</h1><p class="rpg-ui-muted">One markup. Your world, your theme. Switch the theme in the toolbar.</p><div class="rpg-ui-row catalog-section">' +
    ["bg", "surface", "border", "text", "accent", "selection", "danger"]
      .map(
        (token) =>
          '<div class="catalog-token"><div class="catalog-swatch" style="background:var(--rpg-ui-' +
          token +
          ')"></div><code>--rpg-ui-' +
          token +
          "</code></div>",
      )
      .join("") +
    '</div><div class="rpg-ui-grid catalog-section">' +
    panel(
      "Actions",
      '<div class="rpg-ui-row">' +
        button("Confirm", "primary") +
        button("Selected", "secondary", 'aria-pressed="true"') +
        button("Cancel") +
        button("Delete", "danger") +
        "</div>",
    ) +
    panel("Status", bars()) +
    panel("Quick slots", slots(4)) +
    panel(
      "Typography",
      '<h3>A new adventure</h3><p>Readable body text over layered surfaces.</p><small class="rpg-ui-muted">Secondary information and keyboard hints</small>',
    ) +
    "</div></div>",
};
export const ThemeIsolation: StoryObj = {
  render: () =>
    '<h1>Same elements, different worlds</h1><div class="rpg-ui-grid">' +
    ["default", "pixel", "forest"]
      .map(
        (theme) =>
          '<div class="catalog rpg-ui-theme-' +
          theme +
          '" style="min-height:0" ' +
          (theme === "forest" ? 'data-rpg-theme="forest"' : "") +
          ">" +
          panel(
            theme,
            '<div class="rpg-ui-row">' +
              button("Confirm", "primary") +
              button("Selected", "secondary", 'aria-pressed="true"') +
              "</div>" +
              bars() +
              slots(4),
          ) +
          "</div>",
      )
      .join("") +
    "</div>",
};
