export type IssueSeverity = "high" | "medium" | "low";

export type IssueType =
  | "console_error"
  | "failed_request"
  | "accessibility"
  | "navigation"
  | "page_load";

export interface ScanRequest {
  url: string;
  maxPages: number;
}

export interface ScanIssue {
  id: string;
  type: IssueType;
  severity: IssueSeverity;
  url: string;
  title: string;
  message: string;
  screenshotPath?: string;
  details?: unknown;
}

export interface ScannedPage {
  url: string;
  title: string;
  screenshotPath: string;
}

export interface ScanSummary {
  pagesScanned: number;
  totalIssues: number;
  high: number;
  medium: number;
  low: number;
}

export interface ScanReport {
  scanId: string;
  startUrl: string;
  scannedAt: string;
  summary: ScanSummary;
  pages: ScannedPage[];
  issues: ScanIssue[];
  reportPath: string;
}