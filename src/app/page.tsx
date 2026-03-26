import Image from "next/image";
import ScanForm from "@/components/ScanForm";

export default function HomePage() {
  return (
    <main className="page">
      <div className="container">

        <div className="hero">

          {/* 🔥 LOGO ONLY (no duplicate text) */}
          <div style={{ marginBottom: 16 }}>
            <Image
              src="/logo.png"
              alt="Scandly logo"
              width={260}
              height={80}
              priority
              style={{
                maxWidth: "100%",
                height: "auto",
                filter: "drop-shadow(0 0 12px rgba(0, 200, 255, 0.25))",
              }}
            />
          </div>

          {/* TAGLINE */}
          <p
            style={{
              margin: 0,
              fontSize: "1.2rem",
              fontWeight: 500,
              opacity: 0.9,
            }}
          >
            Scan. Detect. Fix.
          </p>

          {/* DESCRIPTION */}
          <p
            style={{
              marginTop: 18,
              fontSize: "1.05rem",
              maxWidth: 700,
              opacity: 0.85,
            }}
          >
            Paste in a website URL and get a polished QA scan for console errors,
            failed requests, accessibility issues, and screenshots.
          </p>

        </div>

        <ScanForm />

      </div>
    </main>
  );
}