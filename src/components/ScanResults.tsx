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
      return `A scanned page returned 401 Unauthorized. This may be expected if the page is protected and no credentials were supplied. Found on ${urls.length} page(s).`;
    case "broken-resource-404":
      return `Broken or missing resources were detected, which may affect page rendering or images. Found ${count} time(s) across ${urls.length} page(s).`;
    case "third-party-tracking":
      return `External analytics or tracking requests failed. These are usually lower priority unless analytics collection is business-critical. Found ${count} time(s).`;
    case "accessibility-skipped":
      return `The accessibility scan did not run on some pages, so accessibility coverage is incomplete.`;
    case "accessibility-failed":
      return `The accessibility scan failed on some pages, so accessibility coverage is incomplete.`;
    case "resource-resolution-error":
      return `Some external resources could not be resolved. This may be due to third-party scripts or missing assets. Found ${count} time(s).`;
    case "page-load-failure":
      return `One or more pages failed during loading or scan execution.`;
    default:
      return `Found ${count} occurrence(s) across ${urls.length} page(s).`;
  }
}

function getRecommendedAction(key: string) {
  switch (key) {
    case "broken-resource-404":
      return "Check asset paths, confirm the files exist in the deployed build, and verify static content packaging in the target environment.";
    case "auth-protected-page":
      return "Confirm whether authentication is expected. Exclude protected pages from unauthenticated scans or provide test credentials for deeper coverage.";
    case "third-party-tracking":
      return "Review only if analytics or tracking is business-critical. Otherwise treat this as lower priority than user-facing functionality issues.";
    case "resource-resolution-error":
      return "Check external hostnames, DNS resolution, and whether the failing resource is required for core page functionality.";
    case "page-load-failure":
      return "Re-test the page manually and review frontend and server logs to identify the cause of the load failure.";
    case "accessibility-skipped":
      return "Re-run the accessibility scan after confirming the page allows script injection, or run accessibility checks separately.";
    case "accessibility-failed":
      return "Review why the accessibility scan failed and re-run it so accessibility coverage is included in the report.";
    default:
      return "Review the affected page manually and confirm whether this issue impacts core user functionality.";
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

  return [...groups.entries()]
    .map(([key, groupedIssues]) => ({
      key,
      title: getGroupTitle(key, groupedIssues),
      severity: getGroupSeverity(key, groupedIssues),
      count: groupedIssues.length,
      urls: [...new Set(groupedIssues.map((i) => i.url))],
      issues: groupedIssues,
      summary: getGroupSummary(key, groupedIssues),
    }))
    .sort((a, b) => {
      const rank = { high: 3, medium: 2, low: 1 };
      return rank[b.severity] - rank[a.severity] || b.count - a.count;
    });
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
  const lowGroups = groups.filter((g) => g.severity === "low");

  const brokenAssets = groups.find((g) => g.key === "broken-resource-404");
  const authProtected = groups.find((g) => g.key === "auth-protected-page");
  const tracking = groups.find((g) => g.key === "third-party-tracking");
  const a11ySkipped = groups.find((g) => g.key === "accessibility-skipped");
  const pageLoadFailure = groups.find((g) => g.key === "page-load-failure");

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
    parts.push(
      `No major user-facing issues were detected in the grouped findings.`
    );
  }

  if (brokenAssets) {
    parts.push(
      `Broken or missing resources were found and may affect rendering or image display.`
    );
  }

  if (authProtected) {
    parts.push(
      `At least one scanned page requires authentication, which may be expected depending on site access rules.`
    );
  }

  if (pageLoadFailure) {
    parts.push(
      `Some pages failed during loading or scan execution and should be re-tested manually.`
    );
  }

  if (tracking) {
    parts.push(
      `Some third-party tracking failures were also detected, though these are typically lower priority unless analytics collection is business-critical.`
    );
  }

  if (a11ySkipped) {
    parts.push(
      `Accessibility coverage is incomplete because the automated accessibility scan did not run successfully on all pages.`
    );
  }

  if (lowGroups.length > 0 && !tracking && !a11ySkipped) {
    parts.push(
      `Lower-priority technical findings were also recorded for follow-up review.`
    );
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
  const healthScore = calculateHealthScore(groupIssues(report.issues));
  const healthLabel = getHealthLabel(healthScore);

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Scandly Report - ${report.scanId}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      padding: 24px;
      background: #f8fafc;
      color: #0f172a;
      line-height: 1.6;
    }
    .brand {
      margin-bottom: 24px;
    }
    .brand h1 {
      margin: 0;
      font-size: 32px;
    }
    .brand p {
      margin: 4px 0 0;
      color: #2563eb;
      font-weight: 600;
    }
    .card {
      background: white;
      padding: 18px;
      border-radius: 12px;
      margin-bottom: 18px;
      border: 1px solid #e5e7eb;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }
    .summary-box {
      background: #f8fafc;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 14px;
    }
    .summary-box h3 {
      margin: 0 0 8px;
      font-size: 12px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .summary-box p {
      margin: 0;
      font-size: 28px;
      font-weight: 800;
    }
    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: bold;
      margin-top: 8px;
    }
    .high { background: #fee2e2; color: #b91c1c; }
    .medium { background: #fef3c7; color: #92400e; }
    .low { background: #dcfce7; color: #166534; }
    .meta {
      color: #64748b;
      font-size: 14px;
    }
    .issue {
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 14px;
      margin-top: 12px;
      background: #fff;
    }
    img {
      width: 100%;
      border-radius: 8px;
      margin-top: 10px;
      border: 1px solid #e5e7eb;
    }
    ul {
      padding-left: 20px;
    }
  </style>
</head>
<body>
  <div class="brand">
    <h1>Scandly</h1>
    <p>Scan. Detect. Fix.</p>
  </div>

  <div class="card">
    <h2>Scan summary</h2>
    <div class="grid">
      <div class="summary-box">
        <h3>Health score</h3>
        <p>${healthScore}/100</p>
        <span class="badge ${getHealthSeverity(healthScore)}">${healthLabel}</span>
      </div>
      <div class="summary-box">
        <h3>Pages scanned</h3>
        <p>${report.summary.pagesScanned}</p>
      </div>
      <div class="summary-box">
        <h3>Issue groups</h3>
        <p>${groupIssues(report.issues).length}</p>
      </div>
      <div class="summary-box">
        <h3>High severity groups</h3>
        <p>${groupIssues(report.issues).filter((g) => g.severity === "high").length}</p>
      </div>
    </div>

    <p class="meta" style="margin-top:16px;">
      Scan ID: ${report.scanId}<br />
      Start URL: ${report.startUrl}<br />
      Scanned at: ${report.scannedAt}
    </p>
  </div>

  <div class="card">
    <h2>Executive summary</h2>
    <p>${executiveSummary}</p>
  </div>

  <div class="card">
    <h2>Key findings</h2>
    ${getTopFindings(groupIssues(report.issues))
      .map(
        (group) => `
      <div class="issue">
        <strong>${group.title}</strong>
        <span class="badge ${group.severity}">${group.severity}</span>
        <p>${group.summary}</p>
        <p class="meta">Occurrences: ${group.count} · Pages affected: ${group.urls.length}</p>
        <p class="meta"><strong>Recommended action:</strong> ${getRecommendedAction(group.key)}</p>
      </div>
    `
      )
      .join("")}
  </div>

  <div class="card">
    <h2>Scanned pages</h2>
    ${report.pages
      .map(
        (page) => `
      <div class="issue">
        <strong>${page.title}</strong>
        <p class="meta">${page.url}</p>
        ${
          page.screenshotDataUrl || page.screenshotPath
            ? `<img src="${page.screenshotDataUrl || page.screenshotPath}" alt="Screenshot of ${page.url}" />`
            : ""
        }
      </div>
    `
      )
      .join("")}
  </div>
</body>
</html>
`;

  const blob = new Blob([html], { type: "text/html" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${report.scanId}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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