import chromium from "@sparticuz/chromium-min";
import puppeteer from "puppeteer-core";

/**
 * Remote Chromium binary URL — must match the @sparticuz/chromium-min version.
 * See https://github.com/nicholasgasior/chromium-brotli/releases
 */
const CHROMIUM_REMOTE_URL =
  "https://github.com/nicholasgasior/chromium-brotli/releases/download/v143.0.0/chromium-v143.0.0-pack.tar";

/**
 * Convert an HTML string to a PDF buffer using Puppeteer + @sparticuz/chromium-min.
 * Uses a remote Chromium binary on Vercel serverless to avoid binary packaging issues.
 */
export async function htmlToPdf(html: string): Promise<Buffer> {
  const isLocal = process.env.NODE_ENV === "development";

  const execPath = isLocal
    ? process.platform === "darwin"
      ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
      : "/usr/bin/google-chrome"
    : await chromium.executablePath(CHROMIUM_REMOTE_URL);

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
      // Let the HTML template control all margins and page breaks
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
