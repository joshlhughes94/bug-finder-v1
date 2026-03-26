import Image from "next/image";
import ScanForm from "@/components/ScanForm";

export default function HomePage() {
  return (
    <main className="page">
      <div className="layout">

        {/* LEFT SIDE */}
        <div className="left">

          <div className="brand">
            <Image
              src="/logo.png"
              alt="Scandly logo"
              width={56}
              height={56}
            />
            <div>
              <p className="tagline">Scan. Detect. Fix.</p>
              <h1>Scandly</h1>
            </div>
          </div>

          <p className="label">Website health scanner</p>

          <h2>Website QA reports in minutes</h2>

          <p className="description">
            Run a polished QA scan for console errors, failed requests,
            accessibility issues, screenshots, grouped findings and clear
            recommended actions.
          </p>

          <ScanForm />

        </div>

        {/* RIGHT SIDE */}
        <div className="right">

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

        </div>

      </div>
    </main>
  );
}