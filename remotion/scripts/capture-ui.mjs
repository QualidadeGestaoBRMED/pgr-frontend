import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const url = process.env.PGR_URL || "http://localhost:3000";
const theme = process.env.PGR_THEME;
const outDir = path.resolve(__dirname, "..", "public");
const dataDir = path.resolve(__dirname, "..", "src", "data");

await fs.mkdir(outDir, { recursive: true });
await fs.mkdir(dataDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1400, height: 900 },
});

if (theme) {
  await page.addInitScript((value) => {
    window.localStorage.setItem("theme", value);
  }, theme);
}

const layout = { login: {}, home: {} };

await page.goto(`${url}/login`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);

const username = page.locator("#username");
const password = page.locator("#password");
const button = page.getByRole("button", { name: /^entrar$/i });

layout.login.username = await username.boundingBox();
layout.login.password = await password.boundingBox();
layout.login.button = await button.boundingBox();

await page.screenshot({
  path: path.join(outDir, "login.png"),
  fullPage: false,
});

await page.goto(`${url}/home`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);

const aura = page.locator(".ai-chip");
layout.home.aura = await aura.boundingBox();

await page.screenshot({
  path: path.join(outDir, "home.png"),
  fullPage: false,
});

await aura.hover();
await page.waitForTimeout(900);

await page.screenshot({
  path: path.join(outDir, "home-hover.png"),
  fullPage: false,
});

await fs.writeFile(
  path.join(dataDir, "layout.json"),
  JSON.stringify(layout, null, 2)
);

await browser.close();

console.log("Capturas salvas em:", outDir);
console.log("Layout salvo em:", path.join(dataDir, "layout.json"));
