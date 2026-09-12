import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const index = JSON.parse(readFileSync("storybook-static/index.json", "utf8"));
const stories = Object.values(index.entries).filter(
  (entry: any) => entry.type === "story",
) as { id: string }[];
test("autodocs renders the actual component documentation", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/iframe.html?id=elements-button--docs&viewMode=docs");
  await expect(page.locator(".sbdocs-content")).toBeVisible();
  await expect(
    page.getByText("Playground", { exact: true }).first(),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
for (const theme of ["default", "pixel", "forest"]) {
  test("all stories render without errors: " + theme, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("response", (response) => {
      if (response.status() >= 400)
        errors.push(response.url() + ": " + response.status());
    });
    for (const { id } of stories) {
      await page.goto(
        "/iframe.html?id=" + id + "&viewMode=story&globals=theme:" + theme,
      );
      await expect(page.locator("#storybook-root > .catalog")).toBeVisible();
      await expect(page.locator("#storybook-root")).not.toBeEmpty();
      expect(errors, id).toEqual([]);
    }
  });
}
test("themes coexist and nested aliases resolve locally", async ({ page }) => {
  await page.goto(
    "/iframe.html?id=foundations-design-system--theme-isolation&viewMode=story",
  );
  await expect(page.getByText("Same elements, different worlds")).toBeVisible();
  const values = await page
    .locator(".rpg-ui-grid > .catalog")
    .evaluateAll((nodes) =>
      nodes.map((node) => {
        const selected = node.querySelector('[aria-pressed="true"]')!;
        return {
          color: getComputedStyle(selected).color,
          radius: getComputedStyle(selected).borderRadius,
          background: getComputedStyle(node.querySelector(".rpg-ui-panel")!)
            .backgroundImage,
        };
      }),
    );
  expect(new Set(values.map((v) => v.background)).size).toBe(3);
  expect(values[0].radius).not.toBe(values[1].radius);
  expect(values[1].radius).toBe("0px");
  expect(values[0].color).not.toBe(values[1].color);
});
test("keyboard focus and disabled buttons", async ({ page }) => {
  await page.goto("/iframe.html?id=elements-button--all-states&viewMode=story");
  const first = page
    .getByRole("button", { name: "Normal", exact: true })
    .first();
  await expect(first).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(first).toBeFocused();
  await expect(first).toHaveCSS("outline-style", "solid");
  const before = await first.boundingBox();
  await first.hover();
  await page.mouse.down();
  expect(await first.boundingBox()).toEqual(before);
  await page.mouse.up();
  await expect(
    page.getByRole("button", { name: "Disabled", exact: true }).first(),
  ).toBeDisabled();
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await page
      .getByRole("button", { name: "Loading" })
      .first()
      .evaluate((el) => getComputedStyle(el, "::after").animationName),
  ).toBe("none");
});
for (const width of [390, 1280]) {
  for (const id of [
    "title-screen",
    "dialogue",
    "inventory",
    "shop",
    "save-load",
    "character-select",
    "hud-and-combat",
  ]) {
    test("responsive " + width + " " + id, async ({ page }, info) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(
        "/iframe.html?id=compositions-game-interfaces--" +
          id +
          "&viewMode=story",
      );
      await expect(page.locator("#storybook-root .catalog")).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
      await info.attach(id + "-" + width, {
        body: await page.screenshot({ fullPage: true }),
        contentType: "image/png",
      });
    });
  }
}
