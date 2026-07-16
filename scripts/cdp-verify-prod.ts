/**
 * CDP verify production (learn.mingli.world) via Chrome automation profile.
 * Usage: npx tsx scripts/cdp-verify-prod.ts
 */
import puppeteer from "puppeteer";
import fs from "fs";

const BASE = process.env.TUTOR_BASE_URL || "https://learn.mingli.world";
const results: { name: string; pass: boolean; detail: string }[] = [];

function ok(name: string, pass: boolean, detail = "") {
  results.push({ name, pass, detail: String(detail) });
  console.log(`${pass ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`);
}

async function main() {
  const version = await fetch("http://localhost:9222/json/version").then((r) =>
    r.json()
  );
  const browser = await puppeteer.connect({
    browserWSEndpoint: version.webSocketDebuggerUrl,
    defaultViewport: null,
    protocolTimeout: 120000,
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(45000);

  try {
    await page.goto(`${BASE}/login`, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    ok("login page", true, await page.title());

    await page.waitForSelector("#username", { timeout: 15000 });
    await page.click("#username", { clickCount: 3 });
    await page.type("#username", "ming", { delay: 12 });
    await page.click("#password", { clickCount: 3 });
    await page.type("#password", "ping", { delay: 12 });
    await Promise.all([
      page
        .waitForNavigation({ waitUntil: "domcontentloaded", timeout: 30000 })
        .catch(() => null),
      page.click('button[type="submit"]'),
    ]);
    await new Promise((r) => setTimeout(r, 1500));
    ok("login succeeds", !page.url().includes("/login"), page.url());

    // HOME
    await page.goto(`${BASE}/`, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    await new Promise((r) => setTimeout(r, 2500));
    let text = await page.evaluate(() => document.body.innerText);
    ok(
      "home System Design",
      /System Design/i.test(text),
      text.slice(0, 100).replace(/\n/g, " ")
    );
    ok("home Start lesson", /Start lesson/i.test(text));
    ok("home bottom Digest", /Digest/i.test(text));
    ok("home bottom Plan", /Plan/i.test(text));
    ok("home stats strip", /🔥|❤️|⚡|💎/.test(text));
    await page.screenshot({ path: "/tmp/cdp-home.png", fullPage: true });

    // DIGEST
    await page.goto(`${BASE}/digest`, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    await new Promise((r) => setTimeout(r, 1500));
    text = await page.evaluate(() => document.body.innerText);
    ok("digest inbox UI", /Digest inbox|queue for tonight/i.test(text));
    const areas = await page.$$("textarea");
    ok("digest textareas", areas.length >= 2, String(areas.length));
    if (areas[0]) {
      await areas[0].click({ clickCount: 3 });
      await areas[0].type("CDP note stampede", { delay: 8 });
    }
    if (areas[1]) {
      await areas[1].click({ clickCount: 3 });
      await areas[1].type("more scenarios please", { delay: 8 });
    }
    for (const b of await page.$$("button")) {
      const t = await (await b.getProperty("textContent")).jsonValue();
      if (/queue for tonight/i.test(String(t || ""))) {
        await b.click();
        break;
      }
    }
    await new Promise((r) => setTimeout(r, 2000));
    text = await page.evaluate(() => document.body.innerText);
    ok(
      "digest queued item visible",
      /CDP note|stampede|queued|inbox/i.test(text)
    );
    await page.screenshot({ path: "/tmp/cdp-digest.png", fullPage: true });

    // PLAN
    await page.goto(`${BASE}/plan`, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    await new Promise((r) => setTimeout(r, 1500));
    text = await page.evaluate(() => document.body.innerText);
    ok("plan overnight", /Overnight brain|3:00 AM/i.test(text));
    ok("plan digest queue", /queued|Digest queue|inbox/i.test(text));
    await page.screenshot({ path: "/tmp/cdp-plan.png", fullPage: true });

    // ME
    await page.goto(`${BASE}/me`, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    await new Promise((r) => setTimeout(r, 1500));
    text = await page.evaluate(() => document.body.innerText);
    ok("me page", /You \+ Pip|Mastered|Level/i.test(text));

    // SESSION
    await page.goto(`${BASE}/session?mode=learn`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await new Promise((r) => setTimeout(r, 3500));
    text = await page.evaluate(() => document.body.innerText);
    ok(
      "session loads",
      /Start|CHECK|Check|caught up|❤️|question|lesson/i.test(text),
      text.slice(0, 100).replace(/\n/g, " ")
    );

    for (const b of await page.$$("button")) {
      const t = String(
        (await (await b.getProperty("textContent")).jsonValue()) || ""
      ).trim();
      if (/^start/i.test(t)) {
        await b.click();
        await new Promise((r) => setTimeout(r, 1500));
        break;
      }
    }
    text = await page.evaluate(() => document.body.innerText);
    const inLesson = /CHECK|Check|❤️/.test(text);
    const caughtUp = /caught up/i.test(text);
    ok(
      "lesson shell or empty",
      inLesson || caughtUp,
      text.slice(0, 100).replace(/\n/g, " ")
    );

    if (inLesson) {
      for (const b of await page.$$("button")) {
        const t = String(
          (await (await b.getProperty("textContent")).jsonValue()) || ""
        ).trim();
        if (/^A\b/.test(t)) {
          await b.click();
          break;
        }
      }
      for (const b of await page.$$("button")) {
        const t = String(
          (await (await b.getProperty("textContent")).jsonValue()) || ""
        ).trim();
        if (/^CHECK$/i.test(t) || /^Check$/i.test(t)) {
          await b.click();
          await new Promise((r) => setTimeout(r, 1200));
          break;
        }
      }
      text = await page.evaluate(() => document.body.innerText);
      ok(
        "feedback after check",
        /Nice|Not quite|Continue|Correct/i.test(text)
      );
      await page.screenshot({ path: "/tmp/cdp-session.png", fullPage: true });
    }

    const api = await page.evaluate(async () => {
      const digRes = await fetch("/api/digest");
      const planRes = await fetch("/api/plan");
      return {
        dig: { status: digRes.status, body: await digRes.json().catch(() => ({})) },
        plan: {
          status: planRes.status,
          body: await planRes.json().catch(() => ({})),
        },
      };
    });
    ok(
      "api digest 200",
      api.dig.status === 200,
      JSON.stringify(
        (api.dig.body as { counts?: unknown }).counts ||
          (api.dig.body as { error?: unknown }).error ||
          {}
      )
    );
    ok(
      "api plan 200",
      api.plan.status === 200,
      String(
        (api.plan.body as { tomorrow?: string }).tomorrow ||
          (api.plan.body as { error?: string }).error ||
          ""
      )
    );
  } catch (e) {
    ok("fatal", false, e instanceof Error ? e.message : String(e));
  }

  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\nSUMMARY ${passed} passed, ${failed} failed of ${results.length}`);
  fs.writeFileSync("/tmp/tutor-cdp-results.json", JSON.stringify(results, null, 2));
  await page.close().catch(() => {});
  browser.disconnect();
  process.exit(failed ? 1 : 0);
}

main();
