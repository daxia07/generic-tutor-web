// Screenshot-based debug
import puppeteer from "puppeteer";
import fs from "fs";

async function run() {
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  
  await page.goto("http://localhost:3099/session/new-session", { waitUntil: "networkidle2", timeout: 20000 });
  await new Promise(r => setTimeout(r, 5000));
  
  await page.screenshot({ path: "/tmp/01-session-intro.png", fullPage: true });
  console.log("Screenshot 1: session intro saved");
  
  // Click Start Lesson
  const clicked = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent?.includes("Start Lesson"));
    if (btn) { (btn as HTMLElement).click(); return true; }
    return false;
  });
  console.log("Clicked Start Lesson:", clicked);
  await new Promise(r => setTimeout(r, 3000));
  
  await page.screenshot({ path: "/tmp/02-first-question.png", fullPage: true });
  console.log("Screenshot 2: first question saved");
  
  // Try to interact with the question
  const bodyText = await page.evaluate(() => {
    // Get clean text from main content area only
    const main = document.querySelector("main");
    return main ? main.innerText.slice(0, 500) : "no main";
  });
  console.log("\nPage text:\n", bodyText);
  
  // Get all interactive elements
  const interactives = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    return buttons.map(b => ({
      text: b.textContent?.trim().slice(0, 40) || "",
      visible: b.offsetParent !== null,
      enabled: !b.disabled,
      classes: b.className.slice(0, 60),
    })).filter(b => b.visible);
  });
  console.log("\nVisible buttons:", JSON.stringify(interactives, null, 2));
  
  await browser.close();
}

run().catch(console.error);
