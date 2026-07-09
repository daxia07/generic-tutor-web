// Interactive session flow E2E test
// Run: npx tsx scripts/e2e-session-flow.ts

import puppeteer from "puppeteer";

const BASE_URL = "http://localhost:3099";

async function run() {
  console.log("\n🎮 Session Flow E2E Test\n");

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  try {
    // Navigate to session page
    console.log("1. Loading session page...");
    await page.goto(`${BASE_URL}/session/new-session`, { waitUntil: "networkidle2", timeout: 20000 });
    await new Promise(r => setTimeout(r, 3000));

    // Click "Start Lesson"
    const started = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent?.includes("Start Lesson"));
      if (btn) { (btn as HTMLElement).click(); return true; }
      return false;
    });
    console.log(started ? "2. Clicked Start Lesson ✅" : "2. No Start Lesson button found ❌");
    if (!started) { process.exit(1); }

    await new Promise(r => setTimeout(r, 2000));

    // Answer questions until session completes
    let questionNum = 0;
    let completed = false;
    let heartsLost = 0;

    for (let i = 0; i < 12; i++) { // Max 12 questions
      questionNum++;
      
      // Detect question type
      const qType = await page.evaluate(() => {
        const body = document.body.textContent || "";
        if (body.includes("Select all that apply")) return "select-all";
        if (body.includes("Arrange in the correct order")) return "order";
        if (body.includes("____")) return "fill-in-blank";
        return "multiple-choice";
      });
      console.log(`3.${questionNum}. Question type: ${qType}`);

      if (qType === "multiple-choice") {
        // Click first option
        const clicked = await page.evaluate(() => {
          const buttons = document.querySelectorAll("button");
          for (const btn of buttons) {
            const text = btn.textContent || "";
            if (text.match(/^[A-D]\s/) && btn.className.includes("rounded-xl")) {
              (btn as HTMLElement).click();
              return text.slice(0, 40);
            }
          }
          return null;
        });
        console.log(`    Selected: ${clicked}`);
        await new Promise(r => setTimeout(r, 500));

        // Click CHECK
        await page.evaluate(() => {
          const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent?.trim() === "CHECK");
          if (btn) (btn as HTMLElement).click();
        });
        await new Promise(r => setTimeout(r, 1500));

        // Check if correct or wrong
        const feedback = await page.evaluate(() => {
          const body = document.body.textContent || "";
          return body.includes("Correct") ? "correct" : body.includes("Not quite") ? "wrong" : "unknown";
        });
        console.log(`    Result: ${feedback}`);
        if (feedback === "wrong") heartsLost++;

      } else if (qType === "fill-in-blank") {
        // Type answer in input
        await page.evaluate(() => {
          const inputs = document.querySelectorAll("input");
          if (inputs.length > 0) {
            const input = inputs[0] as HTMLInputElement;
            input.value = "test answer";
            input.dispatchEvent(new Event("input", { bubbles: true }));
          }
        });
        await new Promise(r => setTimeout(r, 500));
        
        await page.evaluate(() => {
          const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent?.trim() === "CHECK");
          if (btn) (btn as HTMLElement).click();
        });
        await new Promise(r => setTimeout(r, 1500));
        console.log("    Filled blank + submitted");

      } else if (qType === "select-all") {
        // Select first two options
        await page.evaluate(() => {
          const buttons = document.querySelectorAll("button");
          let count = 0;
          for (const btn of buttons) {
            if (count >= 2) break;
            const cls = btn.className || "";
            if (cls.includes("border-[#e5e5e5]") && cls.includes("rounded-xl") && !cls.includes("f0fff0")) {
              (btn as HTMLElement).click();
              count++;
            }
          }
        });
        await new Promise(r => setTimeout(r, 500));
        
        await page.evaluate(() => {
          const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent?.trim() === "CHECK");
          if (btn) (btn as HTMLElement).click();
        });
        await new Promise(r => setTimeout(r, 1500));
        console.log("    Selected 2 options + submitted");

      } else if (qType === "order") {
        // Just submit with default order
        await page.evaluate(() => {
          const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent?.trim() === "CHECK");
          if (btn) (btn as HTMLElement).click();
        });
        await new Promise(r => setTimeout(r, 1500));
        console.log("    Submitted default order");
      }

      // Check for game over
      const isGameOver = await page.evaluate(() => document.body.textContent?.includes("Out of Hearts"));
      if (isGameOver) {
        console.log("    💔 Game over! Hearts depleted.");
        completed = true;
        break;
      }

      // Click CONTINUE
      const continued = await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent?.includes("CONTINUE"));
        if (btn) { (btn as HTMLElement).click(); return true; }
        return false;
      });
      
      if (!continued) {
        // Might be on complete screen
        const isComplete = await page.evaluate(() => document.body.textContent?.includes("Session Complete") || document.body.textContent?.includes("Perfect"));
        if (isComplete) {
          console.log("    🎉 Session complete!");
          completed = true;
          break;
        }
      }
      
      await new Promise(r => setTimeout(r, 1000));

      // Check if session ended
      const endState = await page.evaluate(() => {
        const body = document.body.textContent || "";
        if (body.includes("Session Complete") || body.includes("Perfect")) return "complete";
        if (body.includes("Out of Hearts")) return "game-over";
        return "question";
      });
      
      if (endState === "complete") {
        console.log("    🎉 Session complete!");
        completed = true;
        break;
      } else if (endState === "game-over") {
        console.log("    💔 Game over!");
        completed = true;
        break;
      }
    }

    if (completed) {
      console.log("\n✅ Session flow completed successfully!");
      
      // Check final state on page
      const finalState = await page.evaluate(() => {
        const body = document.body.textContent || "";
        return {
          hasXP: body.includes("XP"),
          hasAccuracy: body.includes("Accuracy") || body.includes("%"),
          hasHearts: body.includes("Hearts") || body.includes("❤"),
          hasRetry: body.includes("Retry"),
          hasContinue: body.includes("Continue"),
        };
      });
      console.log("  Final screen elements:", JSON.stringify(finalState));
    } else {
      console.log("\n⚠️ Session did not complete within expected time");
    }

    // Verify progress was saved
    console.log("\n📊 Checking progress after session...");
    const progress = await page.evaluate(async () => {
      const r = await fetch("/api/progress");
      return r.json();
    });
    console.log(`  totalXp: ${progress.totalXp}`);
    console.log(`  dueCount: ${progress.dueCount}`);
    console.log(`  streak: ${progress.streak?.currentStreak}`);

  } catch (err) {
    console.error("❌ Error:", err instanceof Error ? err.message : String(err));
  } finally {
    await browser.close();
  }
}

run().catch(console.error);
