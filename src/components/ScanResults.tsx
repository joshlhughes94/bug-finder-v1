"use client";

import type { ScanIssue, ScanReport } from "@/app/lib/types";

type Props = {
  report: ScanReport;
};

type IssueGroup = {
  key: string;
  title: string;
  severity: "high" | "medium" | "low";
  count: number;
  urls: string[];
  issues: ScanIssue[];
  summary: string;
};

function getIssueGroupKey(issue: ScanIssue) {
  const msg = issue.message.toLowerCase();

  if (issue.type === "navigation" && msg.includes("401")) {
    return "auth-protected-page";
  }

  if (msg.includes("404") && issue.type === "console_error") {
    return "broken-resource-404";
  }

  if (
    issue.type === "failed_request" &&
    (msg.includes("optimizely") ||
      msg.includes("chartbeat") ||
      msg.includes("google-analytics") ||
      msg.includes("doubleclick") ||
      msg.includes("googletagmanager"))
  ) {
    return "third-party-tracking";
  }

  if (
    issue.type === "accessibility" &&
    issue.title === "Accessibility scan skipped"
  ) {
    return "accessibility-skipped";
  }

  if (
    issue.type === "accessibility" &&
    issue.title === "Accessibility scan failed"
  ) {
    return "accessibility-failed";
  }

  if (
    issue.type === "console_error" &&
    msg.includes("err_name_not_resolved")
  ) {
    return "resource-resolution-error";
  }

  if (issue.type === "page_load") {
    return "page-load-failure";
  }

  return `${issue.type}:${issue.title}`;
}

function getGroupTitle(key: string, issues: ScanIssue[]) {
  switch (key) {
    case "auth-protected-page":
      return "Protected page requires authentication";
    case "broken-resource-404":
      return "Broken resource or missing asset";
    case "third-party-tracking":
      return "Third-party tracking request failures";
    case "accessibility-skipped":
      return "Accessibility scan was skipped";
    case "accessibility-failed":
      return "Accessibility scan failed";
    case "resource-resolution-error":
      return "External resource resolution errors";
    case "page-load-failure":
      return "Page load failures";
    default:
      return issues[0]?.title || "Issue group";
  }
}

function getGroupSeverity(
  key: string,
  issues: ScanIssue[]
): "high" | "medium" | "low" {
  if (key === "broken-resource-404") return "high";
  if (key === "page-load-failure") return "high";
  if (key === "auth-protected-page") return "medium";
  if (key === "third-party-tracking") return "low";
  if (key === "accessibility-skipped" || key === "accessibility-failed") {
    return "low";
  }

  if (issues.some((i) => i.severity === "high")) return "high";
  if (issues.some((i) => i.severity === "medium")) return "medium";
  return "low";
}

function getGroupSummary(key: string, issues: ScanIssue[]) {
  const count = issues.length;
  const urls = [...new Set(issues.map((i) => i.url))];

  switch (key) {
    case "auth-protected-page":
      return `A scanned page returned 401 Unauthorized. Found on ${urls.length} page(s).`;
    case "broken-resource-404":
      return `Broken or missing resources detected ${count} time(s) across ${urls.length} page(s).`;
    case "third-party-tracking":
      return `Tracking requests failed ${count} time(s).`;
    case "accessibility-skipped":
      return `Accessibility scan did not run on some pages.`;
    case "accessibility-failed":
      return `Accessibility scan failed on some pages.`;
    case "resource-resolution-error":
      return `External resources could not be resolved ${count} time(s).`;
    case "page-load-failure":
      return `One or more pages failed during loading.`;
    default:
      return `Found ${count} occurrence(s) across ${urls.length} page(s).`;
  }
}

function getRecommendedAction(key: string) {
  switch (key) {
    case "broken-resource-404":
      return "Check asset paths and deployment packaging.";
    case "auth-protected-page":
      return "Confirm authentication expectations or exclude from scan.";
    case "third-party-tracking":
      return "Review if analytics is critical.";
    case "resource-resolution-error":
      return "Check DNS and external dependencies.";
    case "page-load-failure":
      return "Re-test page and check logs.";
    default:
      return "Review manually.";
  }
}

function groupIssues(issues: ScanIssue[]): IssueGroup[] {
  const groups = new Map<string, ScanIssue[]>();

  for (const issue of issues) {
    const key = getIssueGroupKey(issue);
    const existing = groups.get(key) ?? [];
    existing.push(issue);
    groups.set(key, existing);
  }

  return [...groups.entries()].map(([key, groupedIssues]) => ({
    key,
    title: getGroupTitle(key, groupedIssues),
    severity: getGroupSeverity(key, groupedIssues),
    count: groupedIssues.length,
    urls: [...new Set(groupedIssues.map((i) => i.url))],
    issues: groupedIssues,
    summary: getGroupSummary(key, groupedIssues),
  }));
}

function getTopFindings(groups: IssueGroup[]) {
  return groups
    .filter((g) => g.severity !== "low" || g.key === "broken-resource-404")
    .slice(0, 4);
}

function calculateHealthScore(groups: IssueGroup[]) {
  let score = 100;

  for (const group of groups) {
    if (group.severity === "high") score -= 20;
    else if (group.severity === "medium") score -= 8;
    else score -= 2;
  }

  return Math.max(0, score);
}

function getHealthLabel(score: number) {
  if (score >= 90) return "Good";
  if (score >= 70) return "Needs attention";
  return "Critical";
}

function getHealthSeverity(score: number): "high" | "medium" | "low" {
  if (score >= 90) return "low";
  if (score >= 70) return "medium";
  return "high";
}

function buildExecutiveSummary(
  groups: IssueGroup[],
  healthLabel: string,
  pagesScanned: number
) {
  const highGroups = groups.filter((g) => g.severity === "high");
  const mediumGroups = groups.filter((g) => g.severity === "medium");

  const parts: string[] = [];

  parts.push(
    `This scan reviewed ${pagesScanned} page${pagesScanned === 1 ? "" : "s"} and the overall site health is rated ${healthLabel.toLowerCase()}.`
  );

  if (highGroups.length > 0) {
    parts.push(
      `High-priority findings were detected in ${highGroups.length} grouped area${highGroups.length === 1 ? "" : "s"}.`
    );
  } else if (mediumGroups.length > 0) {
    parts.push(
      `No high-priority findings were detected, but ${mediumGroups.length} medium-priority grouped issue${mediumGroups.length === 1 ? "" : "s"} should be reviewed.`
    );
  } else {
    parts.push(`No major user-facing issues were detected in the grouped findings.`);
  }

  return parts.join(" ");
}

function downloadJSON(report: ScanReport) {
  const fileName = `${report.scanId}.json`;
  const blob = new Blob([JSON.stringify(report, null, 2)], {
    type: "application/json",
  });

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

function downloadHTML(report: ScanReport, executiveSummary: string) {
  const groups = groupIssues(report.issues);
  const topFindings = getTopFindings(groups);
  const healthScore = calculateHealthScore(groups);
  const healthLabel = getHealthLabel(healthScore);
  const healthSeverity = getHealthSeverity(healthScore);

  const priorityActions = topFindings
    .slice(0, 3)
    .map(
      (group, index) => `
        <div class="priority-item">
          <div class="priority-number">${index + 1}</div>
          <div class="priority-content">
            <div class="priority-title">${group.title}</div>
            <div class="priority-meta">
              ${group.count} occurrence${group.count === 1 ? "" : "s"} across ${
        group.urls.length
      } page${group.urls.length === 1 ? "" : "s"}
            </div>
            <div class="priority-text">${getRecommendedAction(group.key)}</div>
          </div>
        </div>
      `
    )
    .join("");

  const keyFindingsHtml =
    topFindings.length === 0
      ? `<p class="empty-state">No major findings were detected in this scan.</p>`
      : topFindings
          .map(
            (group) => `
        <div class="finding-card">
          <div class="finding-top">
            <div class="finding-title">${group.title}</div>
            <span class="badge ${group.severity}">${group.severity}</span>
          </div>
          <p class="finding-summary">${group.summary}</p>
          <p class="finding-meta">
            <strong>Pages affected:</strong> ${group.urls.length}
            <span class="dot">•</span>
            <strong>Occurrences:</strong> ${group.count}
          </p>
          <div class="impact-box">
            <div class="impact-label">Why it matters</div>
            <div class="impact-text">
              ${
                group.severity === "high"
                  ? "This may directly affect user experience, functionality, or trust and should be reviewed as a priority."
                  : group.severity === "medium"
                  ? "This may affect site reliability or user experience and should be reviewed before it becomes a wider issue."
                  : "This is lower priority but still worth reviewing as part of overall site quality and maintenance."
              }
            </div>
          </div>
          <div class="recommend-box">
            <div class="recommend-label">Recommended action</div>
            <div class="recommend-text">${getRecommendedAction(group.key)}</div>
          </div>
        </div>
      `
          )
          .join("");

  const groupedFindingsHtml = groups
    .map(
      (group) => `
    <div class="group-card">
      <div class="finding-top">
        <div class="finding-title">${group.title}</div>
        <span class="badge ${group.severity}">${group.severity}</span>
      </div>
      <p class="finding-summary">${group.summary}</p>
      <p class="finding-meta">
        <strong>Pages affected:</strong> ${group.urls.length}
        <span class="dot">•</span>
        <strong>Occurrences:</strong> ${group.count}
      </p>
      <p class="recommend-text"><strong>Recommended action:</strong> ${getRecommendedAction(
        group.key
      )}</p>
    </div>
  `
    )
    .join("");

  const scannedPagesHtml = report.pages
    .map(
      (page) => `
    <div class="page-card">
      <div class="page-title">${page.title}</div>
      <div class="page-url">${page.url}</div>
      ${
        page.screenshotDataUrl || page.screenshotPath
          ? `<img src="${
              page.screenshotDataUrl || page.screenshotPath
            }" alt="Screenshot of ${page.url}" class="page-image" />`
          : ""
      }
    </div>
  `
    )
    .join("");

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Scandly Report - ${report.scanId}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Arial, Helvetica, sans-serif;
      background: #f3f4f6;
      color: #0f172a;
      line-height: 1.6;
      padding: 32px;
    }
    .report-shell {
      max-width: 1100px;
      margin: 0 auto;
    }
    .report-header {
      background: linear-gradient(135deg, #ffffff, #f8fafc);
      border: 1px solid #e5e7eb;
      border-radius: 20px;
      padding: 28px;
      margin-bottom: 24px;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
    }
    .brand-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      margin-bottom: 18px;
    }
    .brand-left {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .brand-mark {
      width: 50px;
      height: 50px;
      border-radius: 14px;
      background: linear-gradient(135deg, #dbeafe, #eff6ff);
      border: 1px solid #bfdbfe;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      font-weight: 800;
      color: #1d4ed8;
    }
    .brand-name {
      margin: 0;
      font-size: 30px;
      font-weight: 800;
      letter-spacing: -0.03em;
    }
    .brand-tagline {
      margin: 4px 0 0;
      color: #2563eb;
      font-weight: 700;
      font-size: 15px;
    }
    .header-status {
      text-align: right;
    }
    .status-label {
      margin: 0;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #64748b;
    }
    .status-value {
      margin: 6px 0 0;
      font-size: 14px;
      color: #334155;
      font-weight: 600;
    }
    .hero-title {
      margin: 0 0 10px;
      font-size: 34px;
      line-height: 1.05;
      letter-spacing: -0.04em;
    }
    .hero-text {
      margin: 0;
      max-width: 760px;
      color: #475569;
      font-size: 16px;
    }
    .card {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 18px;
      padding: 22px;
      margin-bottom: 20px;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
    }
    .section-title {
      margin: 0 0 16px;
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 14px;
      margin-bottom: 18px;
    }
    .summary-box {
      background: #f8fafc;
      border: 1px solid #e5e7eb;
      border-radius: 14px;
      padding: 16px;
    }
    .summary-box h3 {
      margin: 0 0 8px;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #64748b;
    }
    .summary-box p {
      margin: 0;
      font-size: 30px;
      font-weight: 800;
      letter-spacing: -0.03em;
    }
    .meta-block {
      color: #64748b;
      font-size: 14px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 6px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .high { background: #fee2e2; color: #b91c1c; }
    .medium { background: #fef3c7; color: #92400e; }
    .low { background: #dcfce7; color: #166534; }
    .priority-item {
      display: flex;
      gap: 14px;
      align-items: flex-start;
      padding: 16px;
      border: 1px solid #e5e7eb;
      border-radius: 14px;
      background: #fcfcfd;
      margin-bottom: 14px;
    }
    .priority-number {
      width: 34px;
      height: 34px;
      border-radius: 999px;
      background: #dbeafe;
      color: #1d4ed8;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      flex: 0 0 34px;
    }
    .priority-title {
      font-weight: 800;
      margin-bottom: 4px;
    }
    .priority-meta {
      color: #64748b;
      font-size: 14px;
      margin-bottom: 6px;
    }
    .priority-text {
      color: #334155;
      font-size: 15px;
    }
    .finding-card,
    .group-card,
    .page-card {
      border: 1px solid #e5e7eb;
      border-radius: 16px;
      padding: 18px;
      background: #ffffff;
      margin-bottom: 14px;
    }
    .finding-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 10px;
    }
    .finding-title,
    .page-title {
      font-weight: 800;
      font-size: 18px;
      line-height: 1.3;
    }
    .finding-summary {
      margin: 0 0 10px;
      color: #334155;
    }
    .finding-meta,
    .page-url {
      color: #64748b;
      font-size: 14px;
    }
    .impact-box,
    .recommend-box {
      margin-top: 12px;
      background: #f8fafc;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 12px;
    }
    .impact-label,
    .recommend-label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #64748b;
      font-weight: 800;
      margin-bottom: 6px;
    }
    .impact-text,
    .recommend-text {
      font-size: 14px;
      color: #334155;
    }
    .dot {
      margin: 0 8px;
      color: #94a3b8;
    }
    .page-image {
      width: 100%;
      border-radius: 12px;
      margin-top: 14px;
      border: 1px solid #e5e7eb;
    }
    .footer {
      text-align: center;
      color: #64748b;
      font-size: 13px;
      padding: 10px 0 0;
    }
    .empty-state {
      color: #475569;
      margin: 0;
    }
  </style>
</head>
<body>
  <div class="report-shell">
    <div class="report-header">
      <div class="brand-row">
        <div class="brand-left">
          <div class="brand-mark">✓</div>
          <div>
            <h1 class="brand-name">Scandly</h1>
            <p class="brand-tagline">Scan. Detect. Fix.</p>
          </div>
        </div>
        <div class="header-status">
          <p class="status-label">Report generated</p>
          <p class="status-value">${new Date(report.scannedAt).toLocaleString()}</p>
        </div>
      </div>

      <h2 class="hero-title">Website QA report</h2>
      <p class="hero-text">
        This report summarises site health, highlights the most important findings,
        and provides clear next steps based on the scan results for <strong>${report.startUrl}</strong>.
      </p>
    </div>

    <div class="card">
      <h2 class="section-title">Scan summary</h2>
      <div class="summary-grid">
        <div class="summary-box">
          <h3>Health score</h3>
          <p>${healthScore}/100</p>
          <span class="badge ${healthSeverity}" style="margin-top:10px;">${healthLabel}</span>
        </div>
        <div class="summary-box">
          <h3>Pages scanned</h3>
          <p>${report.summary.pagesScanned}</p>
        </div>
        <div class="summary-box">
          <h3>Issue groups</h3>
          <p>${groups.length}</p>
        </div>
        <div class="summary-box">
          <h3>High severity groups</h3>
          <p>${groups.filter((g) => g.severity === "high").length}</p>
        </div>
      </div>

      <div class="meta-block">
        <strong>Scan ID:</strong> ${report.scanId}<br />
        <strong>Start URL:</strong> ${report.startUrl}<br />
        <strong>Overall assessment:</strong> ${healthLabel}
      </div>
    </div>

    <div class="card">
      <h2 class="section-title">Executive summary</h2>
      <p>${executiveSummary}</p>
    </div>

    <div class="card">
      <h2 class="section-title">Priority actions</h2>
      ${
        priorityActions ||
        `<p class="empty-state">No priority actions were identified in this scan.</p>`
      }
    </div>

    <div class="card">
      <h2 class="section-title">Key findings</h2>
      ${keyFindingsHtml}
    </div>

    <div class="card">
      <h2 class="section-title">Grouped findings</h2>
      ${groupedFindingsHtml}
    </div>

    <div class="card">
      <h2 class="section-title">Scanned pages</h2>
      ${scannedPagesHtml}
    </div>

    <div class="footer">
      Generated by Scandly
    </div>
  </div>
</body>
</html>
`;

  const blob = new Blob([html], { type: "text/html" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "scandly-report.html";
  a.click();
  window.URL.revokeObjectURL(url);
}

export default function ScanResults({ report }: Props) {
  const groups = groupIssues(report.issues);
  const topFindings = getTopFindings(groups);
  const healthScore = calculateHealthScore(groups);
  const healthLabel = getHealthLabel(healthScore);
  const healthSeverity = getHealthSeverity(healthScore);
  const executiveSummary = buildExecutiveSummary(
    groups,
    healthLabel,
    report.summary.pagesScanned
  );

  return (
    <>
      <div className="card">
        <h2 className="section-title">Scan summary</h2>

        <div className="summary-grid">
          <div className="summary-box">
            <h3>Health score</h3>
            <p>{healthScore}/100</p>
            <span className={`badge ${healthSeverity}`} style={{ marginTop: 10 }}>
              {healthLabel}
            </span>
          </div>

          <div className="summary-box">
            <h3>Pages scanned</h3>
            <p>{report.summary.pagesScanned}</p>
          </div>

          <div className="summary-box">
            <h3>Issue groups</h3>
            <p>{groups.length}</p>
          </div>

          <div className="summary-box">
            <h3>High severity groups</h3>
            <p>{groups.filter((g) => g.severity === "high").length}</p>
          </div>
        </div>

        <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => downloadJSON(report)}>Download JSON</button>
          <button onClick={() => downloadHTML(report, executiveSummary)}>
            Download HTML
          </button>
        </div>

        <p className="muted" style={{ marginTop: 16 }}>
          Scan ID: {report.scanId}
          <br />
          Start URL: {report.startUrl}
          <br />
          Report file: {report.reportPath}
          <br />
          Overall assessment: {healthLabel}
        </p>
      </div>

      <div className="card">
        <h2 className="section-title">Executive summary</h2>
        <p>{executiveSummary}</p>
      </div>

      <div className="card">
        <h2 className="section-title">Key findings</h2>

        {topFindings.length === 0 ? (
          <p className="success">No major findings detected in this scan.</p>
        ) : (
          <div className="issue-list">
            {topFindings.map((group) => (
              <div className="issue-card" key={group.key}>
                <div className="issue-top">
                  <strong>{group.title}</strong>
                  <span className={`badge ${group.severity}`}>
                    {group.severity}
                  </span>
                </div>

                <p className="meta">
                  Occurrences: {group.count}
                  <br />
                  Pages affected: {group.urls.length}
                </p>

                <p>{group.summary}</p>

                <p className="meta">
                  <strong>Recommended action:</strong> {getRecommendedAction(group.key)}
                </p>

                <div className="meta">
                  {group.urls.slice(0, 3).map((url) => (
                    <div key={url}>{url}</div>
                  ))}
                  {group.urls.length > 3 ? (
                    <div>+ {group.urls.length - 3} more page(s)</div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="section-title">Grouped findings</h2>

        <div className="issue-list">
          {groups.map((group) => (
            <div className="issue-card" key={group.key}>
              <div className="issue-top">
                <strong>{group.title}</strong>
                <span className={`badge ${group.severity}`}>
                  {group.severity}
                </span>
              </div>

              <p className="meta">
                Occurrences: {group.count}
                <br />
                Pages affected: {group.urls.length}
              </p>

              <p>{group.summary}</p>

              <p className="meta">
                <strong>Recommended action:</strong> {getRecommendedAction(group.key)}
              </p>

              <details style={{ marginTop: 12 }}>
                <summary className="muted" style={{ cursor: "pointer" }}>
                  View raw issues
                </summary>

                <div style={{ marginTop: 12 }}>
                  {group.issues.map((issue) => (
                    <div key={issue.id} style={{ marginBottom: 16 }}>
                      <p className="meta">
                        Type: {issue.type}
                        <br />
                        URL: {issue.url}
                      </p>

                      <p>{issue.message}</p>

                      {(issue.screenshotDataUrl || issue.screenshotPath) ? (
                        <img
                          className="screenshot"
                          src={issue.screenshotDataUrl || issue.screenshotPath}
                          alt={`Issue screenshot for ${issue.url}`}
                        />
                      ) : null}
                    </div>
                  ))}
                </div>
              </details>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2 className="section-title">Scanned pages</h2>

        <div className="page-list">
          {report.pages.map((page) => (
            <div className="page-card" key={page.url}>
              <strong>{page.title}</strong>
              <p className="meta">{page.url}</p>

              {(page.screenshotDataUrl || page.screenshotPath) ? (
                <img
                  className="screenshot"
                  src={page.screenshotDataUrl || page.screenshotPath}
                  alt={`Screenshot of ${page.url}`}
                />
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}