import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

/**
 * Convert an HTML string to a PDF buffer using Puppeteer + @sparticuz/chromium.
 * Works on Vercel serverless (AWS Lambda compatible Chromium binary).
 */
export async function htmlToPdf(html: string): Promise<Buffer> {
  const isLocal = process.env.NODE_ENV === "development";

  const execPath = isLocal
    ? process.platform === "darwin"
      ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
      : "/usr/bin/google-chrome"
    : await chromium.executablePath();

  const browser = await puppeteer.launch({
    args: isLocal ? [] : chromium.args,
    defaultViewport: { width: 794, height: 1123 }, // A4 at 96dpi
    executablePath: execPath,
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
