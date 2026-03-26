import fs from "node:fs";
import path from "node:path";
import axe from "axe-core";
import { chromium, type ConsoleMessage, type Request } from "playwright";
import type { ScanIssue, ScanReport, ScannedPage } from "./types";
import {
  createScanId,
  ensureDir,
  getReportsDir,
  getScreenshotsDir,
  sanitizeFileName,
} from "./utils";

function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function isInternalLink(link: string, origin: string) {
  try {
    const parsed = new URL(link);
    return parsed.origin === origin;
  } catch {
    return false;
  }
}

function shouldSkipLink(link: string) {
  const lower = link.toLowerCase();
  return (
    lower.startsWith("mailto:") ||
    lower.startsWith("tel:") ||
    lower.startsWith("javascript:") ||
    lower.includes("#")
  );
}

function shouldIgnoreFailedRequest(url: string) {
  const lower = url.toLowerCase();

  return (
    lower.includes("chartbeat.net") ||
    lower.includes("google-analytics.com") ||
    lower.includes("doubleclick.net") ||
    lower.includes("googletagmanager.com") ||
    lower.includes("googleads.g.doubleclick.net") ||
    lower.includes("facebook.net") ||
    lower.includes("bat.bing.com") ||
    lower.includes("optimizely.com")
  );
}

function getSeverityFromHttpStatus(status: number): "high" | "medium" {
  return status >= 500 ? "high" : "medium";
}

function getA11ySeverity(impact?: string): "high" | "medium" | "low" {
  if (impact === "critical" || impact === "serious") return "high";
  if (impact === "moderate") return "medium";
  return "low";
}

export async function runScan(
  startingUrl: string,
  maxPages = 10
): Promise<ScanReport> {
  const startUrl = normalizeUrl(startingUrl);
  const origin = new URL(startUrl).origin;

  const scanId = createScanId();
  const reportsDir = getReportsDir();
  const screenshotsDir = getScreenshotsDir();

  ensureDir(reportsDir);
  ensureDir(screenshotsDir);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  const pages: ScannedPage[] = [];
  const issues: ScanIssue[] = [];
  const visited = new Set<string>();
  const queue: string[] = [startUrl];

  let currentPageUrl = startUrl;
  let issueCounter = 0;

  const addIssue = (issue: Omit<ScanIssue, "id">) => {
    issueCounter++;
    issues.push({
      id: `${scanId}_${issueCounter}`,
      ...issue,
    });
  };

  page.on("console", (msg: ConsoleMessage) => {
    if (msg.type() === "error") {
      addIssue({
        type: "console_error",
        severity: "medium",
        url: currentPageUrl,
        title: "JavaScript error detected on page",
        message: msg.text(),
      });
    }
  });

  page.on("requestfailed", (request: Request) => {
    const failedUrl = request.url();

    if (shouldIgnoreFailedRequest(failedUrl)) {
      return;
    }

    addIssue({
      type: "failed_request",
      severity: "medium",
      url: currentPageUrl,
      title: "Failed network request (may impact functionality)",
      message: `${request.method()} ${failedUrl}`,
    });
  });

  try {
    while (queue.length > 0 && visited.size < maxPages) {
      const nextUrl = queue.shift();
      if (!nextUrl || visited.has(nextUrl)) continue;

      visited.add(nextUrl);
      currentPageUrl = nextUrl;

      try {
        const response = await page.goto(nextUrl, {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        });

        await page.waitForTimeout(1000);

        if (response && response.status() >= 400) {
          addIssue({
            type: "navigation",
            severity: getSeverityFromHttpStatus(response.status()),
            url: nextUrl,
            title: `HTTP ${response.status()}`,
            message: `Page returned status ${response.status()}`,
          });
        }

        const title = await page.title();

        const safeName = sanitizeFileName(nextUrl);
        const fileName = `${scanId}_${safeName}.png`;
        const filePath = path.join(screenshotsDir, fileName);
        const publicPath = `/screenshots/${fileName}`;

        const screenshotBuffer = await page.screenshot({
          path: filePath,
          fullPage: true,
        });

        const screenshotDataUrl = `data:image/png;base64,${Buffer.from(
          screenshotBuffer
        ).toString("base64")}`;

        pages.push({
          url: nextUrl,
          title: title || nextUrl,
          screenshotPath: publicPath,
          screenshotDataUrl,
        });

        try {
          await page.addScriptTag({ content: axe.source });

          const axeWasAvailable = await page.evaluate(() => {
            return typeof (window as any).axe !== "undefined";
          });

          if (axeWasAvailable) {
            const results = await page.evaluate(() => {
              return (window as any).axe.run();
            });

            for (const v of results.violations) {
              addIssue({
                type: "accessibility",
                severity: getA11ySeverity(v.impact),
                url: nextUrl,
                title: v.id,
                message: v.description,
                screenshotPath: publicPath,
                screenshotDataUrl,
              });
            }
          } else {
            addIssue({
              type: "accessibility",
              severity: "low",
              url: nextUrl,
              title: "Accessibility scan skipped",
              message: "axe-core was not available on this page.",
              screenshotPath: publicPath,
              screenshotDataUrl,
            });
          }
        } catch (error) {
          addIssue({
            type: "accessibility",
            severity: "low",
            url: nextUrl,
            title: "Accessibility scan failed",
            message:
              error instanceof Error
                ? error.message
                : "Unknown accessibility error",
            screenshotPath: publicPath,
            screenshotDataUrl,
          });
        }

        const links = await page.$$eval("a[href]", (anchors) =>
          anchors.map((a) => (a as HTMLAnchorElement).href)
        );

        for (const link of links) {
          if (
            !shouldSkipLink(link) &&
            isInternalLink(link, origin) &&
            !visited.has(link) &&
            !queue.includes(link)
          ) {
            queue.push(link);
          }
        }
      } catch (err) {
        addIssue({
          type: "page_load",
          severity: "high",
          url: nextUrl,
          title: "Page failed",
          message: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }
  } finally {
    await browser.close();
  }

  const summary = {
    pagesScanned: pages.length,
    totalIssues: issues.length,
    high: issues.filter((i) => i.severity === "high").length,
    medium: issues.filter((i) => i.severity === "medium").length,
    low: issues.filter((i) => i.severity === "low").length,
  };

  const report: ScanReport = {
    scanId,
    startUrl,
    scannedAt: new Date().toISOString(),
    summary,
    pages,
    issues,
    reportPath: path.join(reportsDir, `${scanId}.json`),
  };

  fs.writeFileSync(report.reportPath, JSON.stringify(report, null, 2));

  return report;
}