import Image from "next/image";
import ScanForm from "@/components/ScanForm";

export default function HomePage() {
  return (
    <main className="page">
      <div className="shell">
        <section className="left-panel">
          <div className="brand-row">
            <Image
              src="/logo.png"
              alt="Scandly logo"
              width={64}
              height={64}
              priority
              className="brand-logo"
            />
            <div>
              <div className="eyebrow">Scan. Detect. Fix.</div>
              <h1 className="brand-title">Scandly</h1>
            </div>
          </div>

          <div className="hero-copy">
            <p className="hero-label">Website health scanner</p>
            <h2 className="hero-heading">Website QA reports in minutes</h2>
            <p className="hero-text">
              Run a polished QA scan for console errors, failed requests,
              accessibility issues, screenshots, grouped findings and clear
              recommended actions.
            </p>
          </div>

          <div className="form-card">
            <ScanForm />
          </div>
        </section>

        <aside className="right-panel">
          <div className="results-preview">
            <div className="preview-header">
              <span className="preview-pill">Live results panel</span>
              <span className="preview-pill preview-pill-muted">
                Scrollable report
              </span>
            </div>

            <div className="preview-card">
              <p className="preview-section-label">Health score</p>
              <div className="preview-score-row">
                <div>
                  <div className="preview-score">92/100</div>
                  <div className="preview-score-text">Good</div>
                </div>
                <div className="preview-badge">Example</div>
              </div>
            </div>

            <div className="preview-card">
              <p className="preview-section-label">What appears here</p>
              <ul className="preview-list">
                <li>Executive summary</li>
                <li>Key findings</li>
                <li>Grouped issues</li>
                <li>Screenshots</li>
                <li>Recommended actions</li>
              </ul>
            </div>

            <div className="preview-card preview-card-large">
              <p className="preview-section-label">After you run a scan</p>
              <p className="preview-text">
                Your report will appear in this panel. It scrolls independently
                so the scan form stays visible while you review findings.
              </p>

              <div className="mini-result">
                <div className="mini-result-top">
                  <strong>Broken resource or missing asset</strong>
                  <span className="mini-badge">High</span>
                </div>
                <p className="preview-text">
                  Broken or missing resources may affect rendering or image
                  display.
                </p>
              </div>

              <div className="mini-result">
                <div className="mini-result-top">
                  <strong>Protected page requires authentication</strong>
                  <span className="mini-badge mini-badge-medium">Medium</span>
                </div>
                <p className="preview-text">
                  Some pages may need credentials for deeper coverage.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}