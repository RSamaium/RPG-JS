import type { Meta, StoryObj } from "@storybook/html-vite";
import {
  button,
  icon,
  panel,
  bars,
  slots,
  escape,
  interactive,
} from "./fixtures";
const meta: Meta = {
  title: "Elements/Button",
  args: {
    label: "Begin journey",
    variant: "primary",
    size: "medium",
    disabled: false,
    selected: false,
    loading: false,
  },
  argTypes: {
    variant: {
      control: "select",
      options: [
        "primary",
        "secondary",
        "ghost",
        "danger",
        "success",
        "warning",
      ],
    },
    size: { control: "select", options: ["small", "medium", "large"] },
  },
  render: (args) =>
    button(
      args.label,
      args.variant,
      'data-size="' +
        args.size +
        '" ' +
        (args.disabled || args.loading ? "disabled " : "") +
        'aria-pressed="' +
        args.selected +
        '" aria-busy="' +
        args.loading +
        '"'
    ),
};
export default meta;
export const Playground: StoryObj = {};
export const AllStates: StoryObj = {
  render: () =>
    '<div class="catalog-content"><p class="catalog-caption">Interaction language</p><h1>Buttons & actions</h1><p class="rpg-ui-muted">Tab to inspect keyboard focus. Hover and press each enabled button.</p><div class="rpg-ui-stack">' +
    ["primary", "secondary", "ghost", "danger"]
      .map((v) =>
        panel(
          v,
          '<div class="rpg-ui-row">' +
            button("Normal", v) +
            button("Selected", v, 'aria-pressed="true"') +
            button("Disabled", v, "disabled") +
            button("Loading", v, 'disabled aria-busy="true"') +
            "</div>"
        )
      )
      .join("") +
    "</div></div>",
};
export const SizesAndIcons: StoryObj = {
  render: () =>
    '<div class="catalog-content"><header class="catalog-sheet-heading"><span class="rpg-ui-eyebrow">Crystal chronicles · Interaction system</span><h1>Every action, intentional.</h1><p class="rpg-ui-muted">Gilded metal, etched edges and a clear hierarchy of actions.</p></header><div class="catalog-button-sizes">' +
    ["small", "medium", "large"]
      .map(
        (size) =>
          '<section class="rpg-ui-panel rpg-ui-stack"><span class="rpg-ui-eyebrow">' +
          size +
          ' action</span><div class="catalog-button-specimen"><button class="rpg-ui-btn" data-variant="primary" data-size="' +
          size +
          '">' +
          icon("sword") +
          'Equip</button></div><small class="rpg-ui-muted">' +
          {
            small: "Compact toolbars & secondary tasks",
            medium: "The everyday action",
            large: "The moment that matters",
          }[size] +
          "</small></section>"
      )
      .join("") +
    '</div><div class="catalog-section">' +
    panel(
      "A language of choices",
      '<div class="rpg-ui-row">' +
        button("Begin journey", "primary") +
        button("View equipment") +
        button("Return", "ghost") +
        button("Discard", "danger") +
        "</div>"
    ) +
    "</div></div>",
};
export const LongLabel: StoryObj = {
  args: {
    label: "Continue the journey through the forgotten crystal sanctuary",
  },
};
