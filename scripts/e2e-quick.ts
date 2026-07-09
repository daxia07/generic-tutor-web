// Quick E2E test script using Puppeteer CDP
// Run: npx tsx scripts/e2e-quick.ts

import puppeteer from "puppeteer";

const BASE_URL = "http://localhost:3099";
let passed = 0;
let failed = 0;

function ok(name: string, detail = "") {
  passed++;
  console.log(`  ✅ ${name}${detail ? " — " + detail : ""}`);
}
function fail(name: string, detail = "") {
  failed++;
  console.log(`  ❌ ${name}${detail ? " — " + detail : ""}`);
}

async function run() {
  console.log("\n🚀 Quick E2E Tests\n");

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  try {
    // 1. Dashboard
    console.log("📋 Dashboard");
    await page.goto(BASE_URL, { waitUntil: "networkidle2", timeout: 30000 });
    const body1 = await page.evaluate(() => document.body.textContent || "");
    ok("Page loads", body1.length > 100 ? `${body1.length} chars` : "too short");
    body1.includes("Streak") ? ok("Streak stat visible") : fail("Streak stat visible");
    body1.includes("XP") ? ok("XP stat visible") : fail("XP stat visible");
    body1.includes("Start Session") || body1.includes("Start Learning")
      ? ok("Session CTA present")
      : fail("Session CTA present");

    // 2. Learn page
    console.log("\n📚 Learn Page");
    await page.goto(`${BASE_URL}/learn`, { waitUntil: "networkidle2", timeout: 15000 });
    const body2 = await page.evaluate(() => document.body.textContent || "");
    body2.includes("Learn") ? ok("Title correct") : fail("Title correct");
    body2.includes("new") && body2.includes("mastered")
      ? ok("Stats line present")
      : fail("Stats line present");
    // Count concept cards
    const cardCount = await page.evaluate(() => document.querySelectorAll("a[href*='/learn/']").length);
    cardCount > 20 ? ok(`${cardCount} concept cards`) : fail(`${cardCount} concept cards (expected >20)`);

    // 3. Review page
    console.log("\n🔄 Review Page");
    await page.goto(`${BASE_URL}/review`, { waitUntil: "networkidle2", timeout: 15000 });
    const body3 = await page.evaluate(() => document.body.textContent || "");
    body3.includes("Review") ? ok("Title correct") : fail("Title correct");
    body3.includes("streak") || body3.includes("Streak")
      ? ok("Streak section present")
      : fail("Streak section present");

    // 4. Concept detail page (client-rendered, needs wait for API)
    console.log("\n📖 Concept Detail");
    await page.goto(`${BASE_URL}/learn/caching`, { waitUntil: "networkidle2", timeout: 15000 });
    // Wait for client-side fetch to complete
    await new Promise(r => setTimeout(r, 3000));
    const body4 = await page.evaluate(() => document.body.textContent || "");
    body4.toLowerCase().includes("cach") ? ok("Caching concept loads") : fail("Caching concept loads");
    body4.includes("Cache-aside") || body4.includes("Write-through")
      ? ok("Key terms present")
      : fail("Key terms present", "Client hydration may be slow — API returns data");
    body4.includes("Ready") || body4.includes("grade") || body4.includes("recall")
      ? ok("Grade section present")
      : fail("Grade section present", "Client hydration may be slow");

    // 5. Session API
    console.log("\n🌐 Session API");
    const apiRes = await page.evaluate(async () => {
      const r = await fetch("/api/session?mode=learn");
      return r.json();
    });
    apiRes.sessionId ? ok("Session ID returned") : fail("Session ID returned");
    apiRes.questionCount > 0
      ? ok(`${apiRes.questionCount} questions in session`)
      : fail(`${apiRes.questionCount} questions in session`);
    apiRes.questions && apiRes.questions.length > 0
      ? ok(`${apiRes.questions.length} question objects`, `Types: ${[...new Set(apiRes.questions.map((q: any) => q.type))].join(", ")}`)
      : fail("No question objects");

    // 6. Progress API
    console.log("\n📊 Progress API");
    const progressRes = await page.evaluate(async () => {
      const r = await fetch("/api/progress");
      return r.json();
    });
    typeof progressRes.totalXp === "number" ? ok(`totalXp: ${progressRes.totalXp}`) : fail("totalXp missing");
    typeof progressRes.dueCount === "number" ? ok(`dueCount: ${progressRes.dueCount}`) : fail("dueCount missing");
    const streakHist = progressRes.streak?.streakHistory;
    Array.isArray(streakHist) ? ok("streakHistory present") : fail("streakHistory missing", "Check streak.streakHistory");

    // 7. Session flow page renders
    console.log("\n🎮 Session Page");
    await page.goto(`${BASE_URL}/session/new-session`, { waitUntil: "networkidle2", timeout: 20000 });
    await new Promise(r => setTimeout(r, 3000)); // Wait for session fetch
    const body5 = await page.evaluate(() => document.body.textContent || "");
    body5.includes("Start Lesson") || body5.includes("Session")
      ? ok("Session intro renders")
      : fail("Session intro renders", body5.slice(0, 100));

    // 8. Grade-concept API
    console.log("\n📝 Grade-Concept API");
    const gradeRes = await page.evaluate(async () => {
      const r = await fetch("/api/grade-concept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conceptId: "caching", grade: 4, title: "Caching", difficulty: 3 }),
      });
      return r.json();
    });
    gradeRes.card ? ok("Grade returns updated card") : fail("Grade returns updated card", JSON.stringify(gradeRes).slice(0, 200));
    typeof gradeRes.xpEarned === "number" ? ok(`xpEarned: ${gradeRes.xpEarned}`) : fail("xpEarned missing");

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    fail("Test execution", msg);
  } finally {
    await browser.close();
  }

  console.log("\n" + "=".repeat(40));
  console.log(`Results: ${passed} passed, ${failed} failed (total ${passed + failed})`);
  console.log(failed === 0 ? "\n✅ ALL PASSED\n" : "\n⚠️ SOME FAILURES\n");
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(console.error);
