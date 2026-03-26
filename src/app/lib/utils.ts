import fs from "node:fs";
import path from "node:path";

export function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function sanitizeFileName(input: string) {
  return input
    .replace(/^_+|_+$/g, "")
    .replace(/[^a-zA-Z0-9-_]/g, "_")
    .slice(0, 150);
}

export function getProjectRoot() {
  return process.cwd();
}

export function getReportsDir() {
  return path.join(getProjectRoot(), "reports");
}

export function getScreenshotsDir() {
  return path.join(getProjectRoot(), "public", "screenshots");
}

export function createScanId() {
  const now = new Date();
  const stamp = now
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .replace("Z", "");

  return `scan_${stamp}`;
}