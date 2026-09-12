import type { Preview } from "@storybook/html-vite";
import "../index.css";
import "../theme-pixel.css";
import "../theme-default.css";
import "./preview.css";
const preview: Preview = {
  tags: ["autodocs"],
  initialGlobals: { theme: "default" },
  globalTypes: {
    theme: {
      description: "Theme",
      toolbar: {
        icon: "paintbrush",
        items: [
          { value: "default", title: "Crystal" },
          { value: "pixel", title: "Pixel" },
          { value: "forest", title: "Custom: forest" },
        ],
        dynamicTitle: true,
      },
    },
  },
  parameters: { layout: "fullscreen", controls: { expanded: true } },
  decorators: [
    (story, context) => {
      const host = document.createElement("div");
      host.className = "catalog rpg-ui-theme-" + context.globals.theme;
      if (context.globals.theme === "forest") host.dataset.rpgTheme = "forest";
      const result = story();
      if (typeof result === "string") host.innerHTML = result;
      else host.append(result);
      return host;
    },
  ],
};
export default preview;
