import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const url = process.env.PGR_URL || "http://localhost:3000";
const outDir = path.resolve(__dirname, "..", "videos");

await fs.mkdir(outDir, { recursive: true });

const viewport = { width: 1920, height: 1080 };
const shellInsets = { top: 72, right: 72, bottom: 48, left: 72 };

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport,
  deviceScaleFactor: 2,
  recordVideo: {
    dir: outDir,
    size: viewport,
  },
});
const page = await context.newPage();

const ensureOverlay = async () => {
  await page.addStyleTag({
    content: `
      html, body {
        background: #e9eef1 !important;
      }
      .demo-browser {
        position: fixed;
        top: 16px;
        left: 16px;
        right: 16px;
        height: 48px;
        background: #f7f9fb;
        border: 1px solid #e1e7ec;
        border-radius: 12px;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 0 14px;
        box-shadow: 0 12px 30px rgba(10, 30, 45, 0.12);
        font-family: "Inter", system-ui, -apple-system, sans-serif;
        font-size: 12px;
        color: #6b7a86;
        z-index: 9998;
        pointer-events: none;
      }
      .demo-browser .dot {
        width: 10px;
        height: 10px;
        border-radius: 999px;
      }
      .demo-browser .bar {
        flex: 1;
        height: 28px;
        border-radius: 10px;
        background: #ffffff;
        border: 1px solid #e1e7ec;
        display: flex;
        align-items: center;
        padding: 0 10px;
        color: #7b8893;
      }
      #demo-cursor {
        position: fixed;
        left: 0;
        top: 0;
        width: 20px;
        height: 20px;
        border-radius: 999px;
        background: white;
        box-shadow: 0 4px 10px rgba(0,0,0,0.25);
        border: 1px solid rgba(0,0,0,0.1);
        transform: translate(-100px, -100px);
        z-index: 9999;
        pointer-events: none;
      }
      #demo-cursor::after {
        content: "";
        position: absolute;
        left: 8px;
        top: 10px;
        width: 0;
        height: 0;
        border-left: 10px solid white;
        border-top: 10px solid transparent;
        border-bottom: 10px solid transparent;
        filter: drop-shadow(0 2px 6px rgba(0,0,0,0.25));
        transform: rotate(-10deg);
      }
    `,
  });

  await page.evaluate(({ inset }) => {
    if (!document.querySelector(".demo-browser")) {
      const bar = document.createElement("div");
      bar.className = "demo-browser";
      bar.innerHTML = `
        <div style="display:flex;gap:6px;">
          <span class="dot" style="background:#ff5f57"></span>
          <span class="dot" style="background:#febc2e"></span>
          <span class="dot" style="background:#28c840"></span>
        </div>
        <div class="bar">https://pgr.brmed.com</div>
      `;
      document.body.appendChild(bar);
    }

    if (!document.querySelector("#demo-cursor")) {
      const cursor = document.createElement("div");
      cursor.id = "demo-cursor";
      document.body.appendChild(cursor);

      document.addEventListener("mousemove", (event) => {
        cursor.style.transform = `translate(${event.clientX}px, ${event.clientY}px)`;
      });
    }

    const candidates = Array.from(document.body.children).filter((child) => {
      return (
        !child.classList.contains("demo-browser") &&
        child.id !== "demo-cursor"
      );
    });

    const root = document.querySelector("#__next") || candidates[0];
    if (root) {
      root.style.position = "fixed";
      root.style.top = `${inset.top}px`;
      root.style.right = `${inset.right}px`;
      root.style.bottom = `${inset.bottom}px`;
      root.style.left = `${inset.left}px`;
      root.style.borderRadius = "18px";
      root.style.overflow = "hidden";
      root.style.boxShadow = "0 28px 70px rgba(10, 30, 45, 0.2)";
      root.style.border = "1px solid #dfe6eb";
      root.style.background = "#ffffff";
      root.style.transformOrigin = "center";
    }

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
  }, { inset: shellInsets });
};

const moveCursor = async (from, to, steps = 55, delay = 10) => {
  const smoothstep = (t) => t * t * (3 - 2 * t);
  for (let i = 0; i <= steps; i += 1) {
    const t = smoothstep(i / steps);
    const x = from.x + (to.x - from.x) * t;
    const y = from.y + (to.y - from.y) * t;
    await page.mouse.move(x, y);
    await page.waitForTimeout(delay);
  }
};

const getRect = async (kind) => {
  return page.evaluate((target) => {
    const findByText = (text) =>
      Array.from(document.querySelectorAll("button")).find((btn) =>
        btn.textContent?.toLowerCase().includes(text)
      );

    let el = null;
    if (target === "username") el = document.querySelector("#username");
    if (target === "password") el = document.querySelector("#password");
    if (target === "submit") el = findByText("entrar");
    if (target === "aura") {
      el =
        document.querySelector('[data-aura="true"]') ||
        document.querySelector(".ai-chip") ||
        findByText("aura");
    }
    if (target === "pgr") el = findByText("novo pgr");

    if (!el) return null;
    const box = el.getBoundingClientRect();
    return { x: box.left, y: box.top, width: box.width, height: box.height };
  }, kind);
};

await page.goto(`${url}/login`, { waitUntil: "networkidle" });
await ensureOverlay();
await page.waitForTimeout(500);

const userBox = await getRect("username");
const passBox = await getRect("password");
const btnBox = await getRect("submit");

if (!userBox || !passBox || !btnBox) {
  throw new Error("Não foi possível localizar campos de login.");
}

await page.mouse.move(200, 820);
await page.waitForTimeout(300);

await moveCursor(
  { x: 200, y: 820 },
  { x: userBox.x + userBox.width * 0.18, y: userBox.y + userBox.height / 2 }
);
await page.mouse.click(userBox.x + userBox.width * 0.18, userBox.y + userBox.height / 2);
await page.keyboard.type("admin", { delay: 70 });

await moveCursor(
  { x: userBox.x + userBox.width * 0.18, y: userBox.y + userBox.height / 2 },
  { x: passBox.x + passBox.width * 0.18, y: passBox.y + passBox.height / 2 }
);
await page.mouse.click(passBox.x + passBox.width * 0.18, passBox.y + passBox.height / 2);
await page.keyboard.type("admin", { delay: 70 });

await moveCursor(
  { x: passBox.x + passBox.width * 0.18, y: passBox.y + passBox.height / 2 },
  { x: btnBox.x + btnBox.width * 0.5, y: btnBox.y + btnBox.height / 2 }
);
await page.mouse.click(
  btnBox.x + btnBox.width * 0.5,
  btnBox.y + btnBox.height / 2
);

await page.waitForURL(/\/home/, { timeout: 15000 });
await page.waitForLoadState("networkidle");
await page.waitForTimeout(900);
await ensureOverlay();
await page.waitForTimeout(500);

const auraBox = await getRect("aura");
if (!auraBox) {
  await page.screenshot({ path: path.join(outDir, "debug-home.png"), fullPage: true });
  throw new Error("Não foi possível localizar o botão Aura. Screenshot salvo.");
}

await moveCursor(
  { x: btnBox.x + btnBox.width * 0.5, y: btnBox.y + btnBox.height / 2 },
  { x: auraBox.x + auraBox.width * 0.5, y: auraBox.y + auraBox.height / 2 },
  60,
  10
);
await page.mouse.move(auraBox.x + auraBox.width * 0.5, auraBox.y + auraBox.height / 2);
await page.waitForTimeout(700);

await page.evaluate(() => {
  const root = document.querySelector("#__next") || document.querySelector("body > div");
  if (root) {
    root.style.transition = "transform 0.8s ease, box-shadow 0.8s ease";
    root.style.transform = "scale(1.02)";
    root.style.boxShadow = "0 48px 110px rgba(10, 30, 45, 0.32)";
  }
});
await page.waitForTimeout(900);

await page.evaluate(() => {
  const root = document.querySelector("#__next") || document.querySelector("body > div");
  if (root) {
    root.style.transform = "scale(1)";
  }
});
await page.waitForTimeout(500);

const pgrButtonBox = await getRect("pgr");
if (pgrButtonBox) {
  await moveCursor(
    { x: auraBox.x + auraBox.width * 0.5, y: auraBox.y + auraBox.height / 2 },
    { x: pgrButtonBox.x + pgrButtonBox.width * 0.55, y: pgrButtonBox.y + pgrButtonBox.height / 2 },
    60,
    10
  );
  await page.mouse.click(
    pgrButtonBox.x + pgrButtonBox.width * 0.55,
    pgrButtonBox.y + pgrButtonBox.height / 2
  );
  await page.waitForTimeout(1100);
}

await browser.close();

console.log("Vídeo salvo em:", outDir);
