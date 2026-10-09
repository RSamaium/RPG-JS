import type { Meta, StoryObj } from "@storybook/html-vite";
import { panel, button, escape } from "./fixtures";
const example = `[data-rpg-theme="my-world"] {
  --rpg-ui-accent: #a4db9a;
  --rpg-ui-warning: #e7c89a;
  --rpg-ui-control-radius: 0px;
  --rpg-ui-ornament-opacity: 0;
}`;
export default {
  title: "Foundations/Customization",
  parameters: {
    docs: {
      description: {
        component:
          "Import index.css, then a theme, then your overrides. Use components.css instead of index.css for embedded widgets without the game-page reset. All components work in HTML, CanvasEngine DOMContainer and Vue. Themes are client-side presentation only.",
      },
    },
  },
} satisfies Meta;
export const ThemeRecipe: StoryObj = {
  render: () =>
    '<div class="catalog-content"><h1>Make it your world</h1><p>Set data-rpg-theme on your game container. Declare your palette on that boundary, after the theme imports.</p>' +
    panel(
      "A custom theme",
      '<pre style="white-space:pre-wrap"><code>' +
        escape(example) +
        "</code></pre>",
    ) +
    "<h2>Three levels of customization</h2><ol><li>Palette: background, surface, text, accent, warning.</li><li>Semantic roles: selection, surface gradient, focus, typography.</li><li>Components: control background, radius, padding and panel shadows.</li></ol><p>Use the Theme toolbar to compare crystal, pixel and forest on any story. Theme isolation shows nested boundaries with identical markup.</p><p>Keep native disabled behavior, accessible names, visible focus and 44px touch targets. Your game supplies translated labels and assets.</p>" +
    button("Example action", "primary") +
    "</div>",
};
