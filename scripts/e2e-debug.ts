// Debug: dump session page DOM
import puppeteer from "puppeteer";

async function run() {
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  
  await page.goto("http://localhost:3099/session/new-session", { waitUntil: "networkidle2", timeout: 20000 });
  await new Promise(r => setTimeout(r, 4000));

  // Click Start Lesson
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent?.includes("Start Lesson"));
    if (btn) (btn as HTMLElement).click();
  });
  await new Promise(r => setTimeout(r, 2000));

  // Dump the page HTML
  const html = await page.evaluate(() => {
    const main = document.querySelector("main");
    return main ? main.innerHTML.slice(0, 3000) : "no main element";
  });
  console.log(html);
  
  // Also dump all button texts
  const buttons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("button")).map(b => ({
      text: b.textContent?.trim().slice(0, 50),
      classes: b.className.slice(0, 100),
    }));
  });
  console.log("\n\nBUTTONS:", JSON.stringify(buttons, null, 2));

  await browser.close();
}

run().catch(console.error);
