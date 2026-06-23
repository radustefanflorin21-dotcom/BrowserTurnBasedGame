/**
 * Browser smoke — login UI, character select, and in-game shell.
 * Optional devDependency: playwright (`npm install` in server/).
 * Run: npm run smoke:browser
 */
import path from "path";
import { fileURLToPath } from "url";

const API = process.env.API_BASE || "http://localhost:3001";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const INDEX_URL = `file:///${path.join(ROOT, "index.html").replace(/\\/g, "/")}`;
const EMAIL = process.env.SMOKE_BROWSER_EMAIL || `browser-${Date.now()}@test.local`;
const PASSWORD = process.env.SMOKE_PASSWORD || "smoke123456";

let passed = 0;
let failed = 0;

function ok(name, detail = "") {
  passed++;
  console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail = "") {
  failed++;
  console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
}

function skip(name, reason) {
  console.log(`  ○ ${name} — ${reason}`);
}

function section(title) {
  console.log(`\n── ${title} ──`);
}

async function main() {
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    console.log("Browser smoke skipped — install playwright in server/: npm install");
    process.exit(0);
  }

  console.log(`Browser smoke → ${INDEX_URL}`);
  console.log(`Account: ${EMAIL}`);

  section("Preflight");
  try {
    const health = await fetch(`${API}/api/health`);
    if (health.ok) ok("API server reachable");
    else fail("API server reachable", String(health.status));
  } catch (err) {
    fail("API server reachable", err.message);
    console.error("\nStart the server: cd server && npm start");
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(String(err)));

  try {
    section("Auth UI");
    await page.goto(INDEX_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForSelector("#mmoAuthScreen:not(.hidden)", { timeout: 20000 });
    ok("Auth screen visible");

    await page.click("#mmoShowRegister");
    await page.fill("#mmoRegisterEmail", EMAIL);
    await page.fill("#mmoRegisterPassword", PASSWORD);
    await page.click("#mmoRegisterForm button[type=submit]");
    await page.waitForSelector("#characterSelectScreen:not(.hidden)", { timeout: 25000 });
    ok("Register → character select");

    section("Character select & creation");
    const addBtn = page.locator("[data-character-slot-add]").first();
    await addBtn.waitFor({ state: "visible", timeout: 10000 });
    await addBtn.click();
    await page.waitForSelector("#companion-create-name-input", { timeout: 8000 });
    await page.fill("#companion-create-name-input", "Browser Hero");
    await page.click("[data-hero-name-confirm]");
    await page.waitForTimeout(1000);

    const filledSlot = page.locator("[data-character-slot-select]").first();
    if (await filledSlot.count()) {
      await filledSlot.click();
      ok("Hero slot created");
    } else {
      fail("Hero slot created", "no filled slot");
    }

    const playBtn = page.locator("#characterSelectPlayBtn");
    await playBtn.click();
    await page.waitForSelector(".container:not(.hidden)", { timeout: 25000 });
    ok("Play → game container");

    section("In-game UI");
    await page.waitForSelector("#bottomHud:not(.hidden)", { timeout: 15000 });
    ok("Bottom HUD visible");

    await page.click("#characterPanelBtn");
    await page.waitForSelector("#characterPanelModal:not(.hidden)", { timeout: 8000 });
    ok("Character panel opens");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    await page.click("#marketPanelBtn");
    await page.waitForSelector("#menuPanelModal:not(.hidden)", { timeout: 8000 });
    const marketTitle = await page.locator("#menuPanelTitle").textContent();
    if (marketTitle && /market/i.test(marketTitle)) ok("Market panel opens");
    else ok("Menu panel opens", marketTitle?.trim() || "panel");
    await page.click("#menuPanelClose");

    const criticalErrors = consoleErrors.filter(
      (e) => !/favicon|Failed to load resource|net::ERR_FILE_NOT_FOUND/i.test(e)
    );
    if (criticalErrors.length === 0) ok("No critical page errors");
    else fail("No critical page errors", criticalErrors.slice(0, 2).join("; "));
  } catch (err) {
    fail("Browser flow", err.message);
  } finally {
    await browser.close();
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
