import type { StorybookConfig } from "@storybook/html-vite";
const config: StorybookConfig = {
  stories: ["../stories/**/*.stories.ts"],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y"],
  framework: "@storybook/html-vite",
  async viteFinal(config) {
    return { ...config, base: "./" };
  },
};
export default config;
