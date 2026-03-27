"use client";

import { useState } from "react";
import ScanForm from "@/components/ScanForm";
import ScanResults from "@/components/ScanResults";
import type { ScanReport } from "@/app/lib/types";

export default function HomePage() {
  const [report, setReport] = useState<ScanReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  return (
    <main className="page">
      <div className="layout">
        <div className="left">
          <div className="brand-bar">
            <div className="brand-left">
              <img src="/logo.png" alt="Scandly logo" className="logo" />
              <span className="brand-name">Scandly</span>
            </div>

            <span className="brand-tagline">Scan. Detect. Fix.</span>
          </div>

          <p className="label">Website health scanner</p>

          <h2>Website QA reports in minutes</h2>

          <p className="description">
            Run a polished QA scan for console errors, failed requests,
            accessibility issues, screenshots, grouped findings and clear
            recommended actions.
          </p>

          <ScanForm
            setReport={setReport}
            setLoading={setLoading}
            setError={setError}
          />

          {error ? <p className="error">{error}</p> : null}
        </div>

        <div className="right">
          {loading ? (
            <div className="results-preview">
              <div className="preview-card">
                <p className="small">Scan in progress</p>
                <h3>Scanning...</h3>
                <span className="badge good">Please wait</span>
              </div>
            </div>
          ) : report ? (
            <ScanResults report={report} />
          ) : (
            <div className="results-preview">
              <div className="preview-card">
                <p className="small">Health score</p>
                <h3>92/100</h3>
                <span className="badge good">Good</span>
              </div>

              <div className="preview-card">
                <p className="small">What appears here</p>
                <ul>
                  <li>Executive summary</li>
                  <li>Key findings</li>
                  <li>Grouped issues</li>
                  <li>Screenshots</li>
                  <li>Recommended actions</li>
                </ul>
              </div>

              <div className="preview-card">
                <p className="small">Example issue</p>

                <div className="issue">
                  <strong>Broken resource</strong>
                  <span className="badge high">High</span>
                  <p>Missing assets may affect rendering.</p>
                </div>

                <div className="issue">
                  <strong>Auth required</strong>
                  <span className="badge medium">Medium</span>
                  <p>Some pages need login.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}