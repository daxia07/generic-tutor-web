// Complete session flow E2E — handles all question types
import puppeteer from "puppeteer";

const BASE_URL = "http://localhost:3099";
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function run() {
  console.log("\n🎮 Full Session Flow E2E\n");
  
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  
  try {
    // Go to session page
    await page.goto(`${BASE_URL}/session/new-session`, { waitUntil: "networkidle2", timeout: 20000 });
    await sleep(4000);
    
    // Start lesson
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent?.includes("Start Lesson"));
      if (btn) (btn as HTMLElement).click();
    });
    console.log("✅ Clicked Start Lesson");
    await sleep(2000);
    
    // Answer all questions
    let qNum = 0;
    for (let i = 0; i < 10; i++) {
      qNum++;
      
      // Detect what's on screen
      const screenState = await page.evaluate(() => {
        const body = document.body.textContent || "";
        
        // Check for completion/game-over
        if (body.includes("Session Complete") || body.includes("Perfect")) return "complete";
        if (body.includes("Out of Hearts")) return "game-over";
        
        // Check for CONTINUE button (means we answered and need to move on)
        const continueBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent?.includes("CONTINUE"));
        if (continueBtn) return "continue";
        
        // Check for CHECK button (means we selected but haven't submitted)
        const checkBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent?.trim() === "CHECK");
        if (checkBtn) return "check";
        
        // Detect question type
        if (body.includes("Select all that apply")) return "select-all";
        if (body.includes("Arrange in the correct order")) return "order";
        if (body.includes("____")) return "fill-in-blank";
        if (body.includes("Retry Session")) return "game-over";
        
        // Default: try to find option buttons
        const optionBtns = document.querySelectorAll("button");
        for (const btn of optionBtns) {
          const cls = btn.className || "";
          if (cls.includes("rounded-xl") && (btn.textContent?.match(/^[A-E]\s/) || cls.includes("border-[#e5e5e5]"))) {
            return "multiple-choice";
          }
        }
        
        return "unknown";
      });
      
      console.log(`  Q${qNum}: state=${screenState}`);
      
      if (screenState === "complete" || screenState === "game-over") break;
      
      if (screenState === "continue") {
        await page.evaluate(() => {
          const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent?.includes("CONTINUE"));
          if (btn) (btn as HTMLElement).click();
        });
        await sleep(1500);
        continue;
      }
      
      if (screenState === "check") {
        await page.evaluate(() => {
          const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent?.trim() === "CHECK");
          if (btn) (btn as HTMLElement).click();
        });
        await sleep(1500);
        continue;
      }
      
      // Need to make a selection first
      if (screenState === "select-all" || screenState === "multiple-choice") {
        // Click first 1-2 selectable options
        const clicked = await page.evaluate(() => {
          let count = 0;
          const buttons = document.querySelectorAll("button");
          const results: string[] = [];
          for (const btn of buttons) {
            if (count >= 2) break;
            const cls = btn.className || "";
            const text = btn.textContent || "";
            // Select option buttons (border-[#e5e5e5] = unselected, rounded-xl = option shape)
            if (cls.includes("rounded-xl") && cls.includes("border-[#e5e5e5]") && 
                !cls.includes("bg-[#58cc02]") && !text.includes("CHECK") && !text.includes("CONTINUE") &&
                !text.includes("Start") && !text.includes("Retry") && !text.includes("Back") &&
                !text.includes("Skip") && !cls.includes("bg-[#58cc02]")) {
              (btn as HTMLElement).click();
              results.push(text.slice(0, 30));
              count++;
            }
          }
          return results;
        });
        console.log(`    Clicked options: ${clicked.join(", ")}`);
        await sleep(500);
        
        // Now click CHECK
        await page.evaluate(() => {
          const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent?.trim() === "CHECK");
          if (btn) (btn as HTMLElement).click();
        });
        await sleep(1500);
        
        // Check feedback
        const feedback = await page.evaluate(() => {
          const body = document.body.textContent || "";
          return body.includes("Correct") ? "✅ correct" : body.includes("Not quite") ? "❌ wrong" : body.includes("Partially") ? "🟡 partial" : "🔍 unknown";
        });
        console.log(`    Feedback: ${feedback}`);
        
        // Click CONTINUE
        await page.evaluate(() => {
          const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent?.includes("CONTINUE"));
          if (btn) (btn as HTMLElement).click();
        });
        await sleep(1500);
        
      } else if (screenState === "fill-in-blank") {
        // Fill in blank
        await page.evaluate(() => {
          const input = document.querySelector("input");
          if (input) {
            const el = input as HTMLInputElement;
            el.focus();
            el.value = "test answer";
            el.dispatchEvent(new Event("input", { bubbles: true }));
          }
        });
        await sleep(500);
        
        await page.evaluate(() => {
          const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent?.trim() === "CHECK");
          if (btn) (btn as HTMLElement).click();
        });
        await sleep(1500);
        
        // Click CONTINUE
        await page.evaluate(() => {
          const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent?.includes("CONTINUE"));
          if (btn) (btn as HTMLElement).click();
        });
        await sleep(1500);
        
      } else if (screenState === "order") {
        // Just click CHECK with default shuffled order
        await page.evaluate(() => {
          const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent?.trim() === "CHECK");
          if (btn) (btn as HTMLElement).click();
        });
        await sleep(1500);
        
        await page.evaluate(() => {
          const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent?.includes("CONTINUE"));
          if (btn) (btn as HTMLElement).click();
        });
        await sleep(1500);
        
      } else {
        // Unknown — try clicking any available button
        console.log(`    Unknown state, attempting generic interaction...`);
        await sleep(2000);
      }
    }
    
    // Check final state
    const finalBody = await page.evaluate(() => document.body.textContent || "");
    if (finalBody.includes("Session Complete") || finalBody.includes("Perfect")) {
      console.log("\n🎉 SESSION COMPLETED SUCCESSFULLY!");
      
      // Check for result details
      const hasXP = finalBody.includes("XP");
      const hasAccuracy = finalBody.includes("Accuracy") || finalBody.includes("%");
      const hasHeartsInfo = finalBody.includes("Hearts") || finalBody.includes("/5");
      const hasContinue = finalBody.includes("Continue Learning");
      
      console.log(`  XP shown: ${hasXP}`);
      console.log(`  Accuracy shown: ${hasAccuracy}`);
      console.log(`  Hearts info: ${hasHeartsInfo}`);
      console.log(`  Continue CTA: ${hasContinue}`);
      
    } else if (finalBody.includes("Out of Hearts")) {
      console.log("\n💔 GAME OVER — Hearts depleted");
      const hasRetry = finalBody.includes("Retry Session");
      const hasHome = finalBody.includes("Back to Home");
      console.log(`  Retry button: ${hasRetry}`);
      console.log(`  Home button: ${hasHome}`);
      
    } else {
      console.log("\n⚠️ Session still in progress or unexpected state");
      console.log(`  Page text (last 200): ${finalBody.slice(-200)}`);
    }
    
    // Verify Turso persistence
    const progress = await page.evaluate(async () => {
      const r = await fetch("/api/progress");
      return r.json();
    });
    console.log("\n📊 Turso DB state after session:");
    console.log(`  totalXp: ${progress.totalXp}`);
    console.log(`  dueCount: ${progress.dueCount}`);
    console.log(`  masteredCount: ${progress.masteredCount}`);
    console.log(`  streak: ${progress.streak?.currentStreak}`);
    
    if (progress.totalXp > 0) {
      console.log("\n✅ Progress persisted to Turso!");
    }
    
  } catch (err) {
    console.error("❌ Error:", err instanceof Error ? err.message : String(err));
  } finally {
    await browser.close();
  }
}

run().catch(console.error);
