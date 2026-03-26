"use client";

import { Dispatch, SetStateAction, useState } from "react";
import type { ScanReport } from "@/app/lib/types";

type Props = {
  setReport: Dispatch<SetStateAction<ScanReport | null>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<string>>;
};

export default function ScanForm({
  setReport,
  setLoading,
  setError,
}: Props) {
  const [url, setUrl] = useState("");
  const [pages, setPages] = useState(5);

  const handleScan = async () => {
    if (!url.trim()) {
      setError("Please enter a website URL.");
      return;
    }

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
          maxPages: pages,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.error || "Scan failed.");
        return;
      }

      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form">
      <label>Website URL</label>
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://example.com"
      />

      <label>Max pages</label>
      <input
        type="number"
        min={1}
        max={25}
        value={pages}
        onChange={(e) => setPages(Number(e.target.value))}
      />

      <button onClick={handleScan}>Run scan</button>

      <p className="note">
        Scans public pages only. Login-protected areas require authentication.
      </p>
    </div>
  );
}