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
        '"',
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
            "</div>",
        ),
      )
      .join("") +
    "</div></div>",
};
export const SizesAndIcons: StoryObj = {
  render: () =>
    '<div class="rpg-ui-row">' +
    ["small", "medium", "large"]
      .map(
        (size) =>
          '<button class="rpg-ui-btn" data-variant="primary" data-size="' +
          size +
          '">' +
          icon("sword") +
          "Equip</button>",
      )
      .join("") +
    "</div>",
};
export const LongLabel: StoryObj = {
  args: {
    label: "Continue the journey through the forgotten crystal sanctuary",
  },
};
