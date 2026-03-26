"use client";

import { useState } from "react";
import type { ScanReport } from "@/app/lib/types";
import ScanResults from "./ScanResults";

export default function ScanForm() {
  const [url, setUrl] = useState("");
  const [maxPages, setMaxPages] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<ScanReport | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setReport(null);

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          maxPages,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Scan failed.");
      }

      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div>
              <label className="label" htmlFor="url">
                Website URL
              </label>
              <input
                id="url"
                className="input"
                type="text"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label" htmlFor="maxPages">
                Max pages
              </label>
              <input
                id="maxPages"
                className="input"
                type="number"
                min={1}
                max={25}
                value={maxPages}
                onChange={(e) => setMaxPages(Number(e.target.value))}
                required
              />
            </div>
          </div>

          <div className="actions">
            <button className="button" type="submit" disabled={loading}>
              {loading ? "Scanning..." : "Run scan"}
            </button>

            <span className="muted">
              Checks console errors, failed requests, accessibility, and takes
              screenshots.
            </span>
          </div>

          {error ? <p className="error">{error}</p> : null}
        </form>
      </div>

      {report ? <ScanResults report={report} /> : null}
    </>
  );
}