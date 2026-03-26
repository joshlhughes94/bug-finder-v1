"use client";

import { useState } from "react";

export default function ScanForm() {
  const [url, setUrl] = useState("");
  const [pages, setPages] = useState(5);
  const [loading, setLoading] = useState(false);

  const handleScan = async () => {
    if (!url) return;

    setLoading(true);

    try {
      await fetch("/api/scan", {
        method: "POST",
        body: JSON.stringify({ url, maxPages: pages }),
      });
    } catch (e) {
      console.error(e);
    }

    setLoading(false);
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
        value={pages}
        onChange={(e) => setPages(Number(e.target.value))}
      />

      <button onClick={handleScan} disabled={loading}>
        {loading ? "Scanning..." : "Run scan"}
      </button>

      <p className="note">
        Scans public pages only. Login-protected areas require authentication.
      </p>

    </div>
  );
}