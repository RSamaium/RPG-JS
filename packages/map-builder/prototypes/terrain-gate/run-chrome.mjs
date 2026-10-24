// Runs the gate page in a local Chrome with GPU flags and prints the results as JSON.
// Usage: node run-chrome.mjs [url] [--software]
import { createRequire } from "node:module";
const require = createRequire("/home/samuel/www/libraries/RPG-JS/node_modules/.pnpm/playwright-core@1.63.0/node_modules/playwright-core/");
const { chromium } = require("playwright-core");
const url = process.argv[2]?.startsWith("http") ? process.argv[2] : "http://localhost:5193/";
const software = process.argv.includes("--software");
const browser = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  headless: true,
  args: software
    ? ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
    : ["--enable-gpu", "--use-gl=angle", "--use-angle=gl", "--ignore-gpu-blocklist", "--enable-webgl"],
});
const page = await browser.newPage({ viewport: { width: 1300, height: 760 } });
page.on("pageerror", (error) => console.error("pageerror", error.message));
await page.goto(url);
await page.waitForFunction(() => window.__gate?.done === true, null, { timeout: 240000 });
console.log(JSON.stringify(await page.evaluate(() => window.__gate), null, 1));
await browser.close();
