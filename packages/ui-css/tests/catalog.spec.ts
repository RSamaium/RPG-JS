import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const index = JSON.parse(readFileSync("storybook-static/index.json", "utf8"));
const stories = Object.values(index.entries).filter(
  (entry: any) => entry.type === "story"
) as { id: string }[];
test.describe('touch controls', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  test('continuation triangle responds to a tap', async ({ page }) => {
    await page.goto('/iframe.html?id=compositions-responsive-dialogue--portrait&viewMode=story');
    const content = page.locator('.rpg-ui-dialog-content');
    await expect(content).toContainText('silver key');
    const before = await content.textContent();
    await page.getByRole('button', { name: 'Continue', exact: true }).tap();
    await expect(content).not.toHaveText(before!);
    await page.goto('/iframe.html?id=compositions-integrated-game-states--player-options&viewMode=story');
    const select = page.getByRole('combobox', { name: 'Language' });
    await select.scrollIntoViewIfNeeded();
    expect((await select.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await select.selectOption('fr');
    await expect(select).toHaveValue('fr');
  });
});
for (const [name, width, height, expected] of [['desktop', 1280, 844, 280], ['portrait', 390, 844, 320], ['landscape', 844, 390, 220]] as const) {
  test(`measured dialogue ${name} preserves text and stable height`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto(`/iframe.html?id=compositions-responsive-dialogue--${name}&viewMode=story`);
    const dialog = page.locator('.rpg-ui-dialog');
    const content = page.locator('.rpg-ui-dialog-content');
    await expect(content).toContainText('silver key');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(Math.round((await dialog.boundingBox())!.height)).toBe(expected);
    const first = await content.textContent();
    let collected = '';
    for (let i = 0; i < 100; i++) {
      expect(await content.evaluate(el => el.scrollHeight <= el.clientHeight + 1)).toBe(true);
      collected += await content.textContent();
      const arrow = page.getByRole('button', { name: 'Continue', exact: true });
      const bounds = (await arrow.boundingBox())!;
      expect(bounds.width).toBeGreaterThanOrEqual(44);
      expect(bounds.height).toBeGreaterThanOrEqual(44);
      await arrow.click();
      expect(Math.round((await dialog.boundingBox())!.height)).toBe(expected);
      if (await content.textContent() === first) break;
    }
    expect(collected).toBe('The silver key belongs to you now.\nBeyond the gate lies the forgotten kingdom. 🗝️\n' + 'Follow the river until you reach the sanctuary. '.repeat(18));
    expect(await page.locator('.rpg-ui-dialog-continue > span').evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  });
}
test('rotation retains bounded text and long choices scroll inside the fixed dialogue', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/iframe.html?id=compositions-responsive-dialogue--rotation-and-long-choices&viewMode=story');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const arrow = page.getByRole('button', { name: 'Continue', exact: true });
  await arrow.click();
  await page.setViewportSize({ width: 844, height: 390 });
  const content = page.locator('.rpg-ui-dialog-content');
  for (let i = 0; i < 100 && await arrow.isVisible(); i++) {
    expect(await content.evaluate(el => el.scrollHeight <= el.clientHeight + 1)).toBe(true);
    await arrow.click();
  }
  await expect(arrow).toBeHidden();
  await expect(page.locator('.rpg-ui-dialog-choice')).toHaveCount(12);
  const actions = page.locator('.rpg-ui-dialog-actions');
  expect(await actions.evaluate(el => el.scrollHeight > el.clientHeight)).toBe(true);
  await page.getByRole('button', { name: 'Destination 12', exact: true }).scrollIntoViewIfNeeded();
  expect(Math.round((await page.locator('.rpg-ui-dialog').boundingBox())!.height)).toBe(220);
});
for (const viewport of [{ width: 1280, height: 844 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
  test(`short dialogue choices fit without scrolling ${viewport.width}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/iframe.html?id=compositions-responsive-dialogue--short-choices&viewMode=story');
    const actions = page.locator('.rpg-ui-dialog-actions');
    await expect(actions.locator('button')).toHaveCount(2);
    await page.evaluate(() => document.fonts.ready);
    await expect.poll(() => actions.evaluate(el => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(1);
    const bounds = await actions.boundingBox();
    const last = await actions.locator('button').last().boundingBox();
    expect(last!.y + last!.height).toBeLessThanOrEqual(bounds!.y + bounds!.height + 1);
  });
}
for (const width of [390, 1280]) {
  test(`rich dialogue typography and portrait stay bounded at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/iframe.html?id=compositions-integrated-game-states--rich-dialogue&viewMode=story');
    await expect(page.locator('.rpg-ui-rich-strong')).toHaveText('silver key');
    const content = page.locator('.rpg-ui-dialog-content');
    expect(await content.evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(18);
    expect(await content.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.locator('.rpg-ui-dialog').evaluate(el => Promise.all(el.getAnimations().map(a => a.finished)));
    const face = await page.locator('.rpg-ui-dialog-face').boundingBox();
    const body = await page.locator('.rpg-ui-dialog-body').boundingBox();
    expect(Math.abs(face!.height - body!.height)).toBeLessThan(2);
    const portrait = await page.locator('.rpg-ui-dialog-face > img').boundingBox();
    expect(Math.abs(portrait!.height - face!.height)).toBeLessThan(2);
    expect(await page.locator('.rpg-ui-dialog-continue').innerText()).not.toMatch(/\d+\s*\/\s*\d+/);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await page.locator('.rpg-ui-dialog').evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  });
  test(`equipment comparison and options are usable at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/iframe.html?id=compositions-integrated-game-states--equipment-attributes&viewMode=story');
    await expect(page.locator('.rpg-ui-equip-stat')).toHaveCount(3);
    await expect(page.locator('.rpg-ui-equip-stat-current strong').last()).toHaveText('0');
    const stats = page.locator('.rpg-ui-equip-stats');
    expect(await stats.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    // The panel enter animation moves both columns; measure the settled layout.
    await page.locator('.rpg-ui-menu-panel').evaluate(el => Promise.all(el.getAnimations({ subtree: true }).map(a => a.finished)));
    const list = await page.locator('.rpg-ui-equipment-layout > .rpg-ui-menu-panel-list').boundingBox();
    const inspector = await page.locator('.rpg-ui-equipment-inspector').boundingBox();
    if (width >= 700) {
      expect(inspector!.x).toBeGreaterThanOrEqual(list!.x + list!.width);
      expect(Math.abs(inspector!.y - list!.y)).toBeLessThan(2);
    } else {
      expect(inspector!.y).toBeGreaterThanOrEqual(list!.y + list!.height);
      expect(list!.height).toBeGreaterThanOrEqual(190);
    }
    await page.goto('/iframe.html?id=compositions-integrated-game-states--player-options&viewMode=story');
    await expect(page.getByRole('button', { name: 'Move up' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Action Space' })).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Back / menu Esc' })).toHaveCount(1);
    const volume = page.getByRole('slider', { name: 'Music', exact: true });
    await volume.scrollIntoViewIfNeeded();
    await volume.focus();
    await page.keyboard.press('ArrowLeft');
    await expect(volume).toHaveValue('74');
  });
}
for (const width of [390, 1280]) {
  for (const state of ["empty-inventory", "missing-equipment-art", "unavailable-shop-item", "empty-shop"]) {
    test(`integrated ${state} keeps its close button inside the window at ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(`/iframe.html?id=compositions-integrated-game-states--${state}&viewMode=story`);
      const window = page.locator(".rpg-ui-main-menu-layout, .rpg-shop-container");
      const close = window.getByRole("button", { name: "Close", exact: true });
      await expect(close).toBeVisible();
      await window.evaluate(el => Promise.all(el.getAnimations().map(animation => animation.finished)));
      const bounds = await window.boundingBox();
      const button = await close.boundingBox();
      expect(button!.x).toBeGreaterThanOrEqual(bounds!.x);
      expect(button!.x + button!.width).toBeLessThanOrEqual(bounds!.x + bounds!.width);
      expect(button!.y).toBeGreaterThanOrEqual(bounds!.y);
      expect(button!.y + button!.height).toBeLessThanOrEqual(bounds!.y + bounds!.height);
      await close.click({ trial: true });
      await expect(page.locator(".rpg-ui-empty-state, .rpg-ui-notice").first()).toBeVisible();
    });
  }
}
test("autodocs renders the actual component documentation", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/iframe.html?id=elements-button--docs&viewMode=docs");
  await expect(page.locator(".sbdocs-content")).toBeVisible();
  await expect(
    page.getByText("Playground", { exact: true }).first()
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("account composition supports sign-in and sign-up layouts", async ({ page }) => {
  await page.goto(
    "/iframe.html?id=compositions-game-interfaces--account&viewMode=story"
  );
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Create a new account" }).click();
  await expect(page.getByRole("heading", { name: "Create account" })).toBeVisible();
  await expect(page.getByLabel("Username", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Confirm password", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Email or username", { exact: true })).toBeHidden();
  const panel = page.locator(".rpg-ui-account");
  const bounds = await panel.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(1280);
});
for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 720 }, { width: 844, height: 390 }]) {
  test("account forms keep actions reachable " + viewport.width, async ({ page }) => {
    await page.setViewportSize(viewport);
    for (const state of ["registration", "registration-error", "forgot-password", "instructions-sent", "reset-password", "expired-code"]) {
      await page.goto("/iframe.html?id=compositions-account--" + state + "&viewMode=story");
      const panel = page.locator(".rpg-ui-account");
      await expect(panel).toBeVisible();
      expect(await panel.evaluate(el => getComputedStyle(el).overflowY)).not.toBe("auto");
      const action = page.locator(".rpg-ui-account-submit");
      await action.scrollIntoViewIfNeeded();
      await action.click({ trial: true });
      const fields = await page.locator(".rpg-ui-form-grid").boundingBox();
      const button = await action.boundingBox();
      expect(button!.y).toBeGreaterThanOrEqual(fields!.y + fields!.height);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
    }
  });
}
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
        "/iframe.html?id=" + id + "&viewMode=story&globals=theme:" + theme
      );
      await expect(page.locator("#storybook-root > .catalog")).toBeVisible();
      await expect(page.locator("#storybook-root")).not.toBeEmpty();
      expect(errors, id).toEqual([]);
    }
  });
}
test("themes coexist and nested aliases resolve locally", async ({ page }) => {
  await page.goto(
    "/iframe.html?id=foundations-design-system--theme-isolation&viewMode=story"
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
      })
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
    page.getByRole("button", { name: "Disabled", exact: true }).first()
  ).toBeDisabled();
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await page
      .getByRole("button", { name: "Loading" })
      .first()
      .evaluate((el) => getComputedStyle(el, "::after").animationName)
  ).toBe("none");
});
test("primary action material and ornaments follow the theme boundary", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=elements-button--sizes-and-icons&viewMode=story"
  );
  const primary = page.getByRole("button", { name: "Begin journey" });
  await expect(primary).toBeVisible();
  const values = await primary.evaluate((el) => {
    const secondary = document.querySelector('[data-variant="secondary"]')!;
    return [
      getComputedStyle(el).backgroundImage,
      getComputedStyle(secondary).backgroundImage,
    ];
  });
  expect(values[0]).not.toBe(values[1]);
  await page.locator(".catalog").evaluate((el: HTMLElement) => {
    el.style.setProperty(
      "--rpg-ui-primary-background",
      "linear-gradient(rgb(11, 22, 33), rgb(44, 55, 66))"
    );
    el.style.setProperty("--rpg-ui-ornament-opacity", "0");
  });
  await expect(primary).toHaveCSS(
    "background-image",
    "linear-gradient(rgb(11, 22, 33), rgb(44, 55, 66))"
  );
  expect(
    await page
      .locator(".rpg-ui-panel")
      .first()
      .evaluate((el) => getComputedStyle(el, "::before").opacity)
  ).toBe("0");
});
test("inventory engraving does not intercept selection", async ({ page }) => {
  await page.goto(
    "/iframe.html?id=compositions-game-interfaces--inventory&viewMode=story"
  );
  const slot = page.getByRole("button", {
    name: "Inventory slot 2",
    exact: true,
  });
  await slot.click();
  await expect(slot).toHaveAttribute("data-selected", "true");
  await expect(
    page.getByRole("button", { name: "Inventory slot 1", exact: true })
  ).toHaveAttribute("data-selected", "false");
});
test("celestial artwork and local font load; title remains usable without art", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=compositions-game-interfaces--title-screen&viewMode=story"
  );
  const title = page.locator(".rpg-ui-title-screen");
  await expect(title).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  expect(
    await title.evaluate((el) => getComputedStyle(el).backgroundImage)
  ).toContain("celestial-sanctuary");
  expect(
    await page.evaluate(() =>
      [...document.fonts].some(
        (f) => f.family.includes("RPGJS Cinzel") && f.status === "loaded"
      )
    )
  ).toBe(true);
  const next = page.getByRole("button", { name: "Continue", exact: true });
  await next.click();
  await expect(next).toHaveAttribute("data-selected", "true");
  await title.evaluate((el: HTMLElement) => {
    el.style.setProperty("--rpg-ui-scene-art", "none");
    el.style.setProperty("--rpg-ui-emblem-display", "none");
  });
  await expect(title).toHaveCSS("background-image", "none");
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect(next).toBeFocused();
  await expect(next).toHaveCSS("outline-style", "solid");
});
test("character heading does not overlap the portrait stage", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(
    "/iframe.html?id=compositions-game-interfaces--character-select&viewMode=story"
  );
  await expect(
    page.locator(".rpg-ui-character-select-portrait img")
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const header = await page
    .locator(".rpg-ui-character-select-header")
    .boundingBox();
  const stage = await page
    .locator(".rpg-ui-character-select-stage")
    .boundingBox();
  expect(stage!.y).toBeGreaterThanOrEqual(header!.y + header!.height - 1);
  const container = await page.locator(".rpg-ui-character-select").boundingBox();
  const confirm = await page.getByRole("button", { name: "Confirm", exact: true }).boundingBox();
  expect(confirm!.y + confirm!.height).toBeLessThanOrEqual(container!.y + container!.height);
});
for (const width of [390, 1280]) {
  for (const id of [
    "title-screen",
    "account",
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
          "&viewMode=story"
      );
      await expect(page.locator("#storybook-root .catalog")).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth)
      ).toBeLessThanOrEqual(width);
      await info.attach(id + "-" + width, {
        body: await page.screenshot({ fullPage: true }),
        contentType: "image/png",
      });
    });
  }
}
