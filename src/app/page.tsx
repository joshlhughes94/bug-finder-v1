import Image from "next/image";
import ScanForm from "@/components/ScanForm";

export default function HomePage() {
  return (
    <main className="page">
      <div className="container">
        <div className="hero">
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Image
              src="/logo.png"
              alt="Scandly logo"
              width={56}
              height={56}
              priority
            />

            <div>
              <h1 style={{ margin: 0 }}>Scandly</h1>
              <p style={{ margin: "6px 0 0 0", opacity: 0.85 }}>
                Scan. Detect. Fix.
              </p>
            </div>
          </div>

          <p style={{ marginTop: 18 }}>
            Paste in a website URL and get a polished QA scan for console errors,
            failed requests, accessibility issues, and screenshots.
          </p>
        </div>

        <ScanForm />
      </div>
    </main>
  );
}