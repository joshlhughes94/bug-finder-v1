import Image from "next/image";
import ScanForm from "@/components/ScanForm";

export default function HomePage() {
  return (
    <main className="page">
      <div className="container">

        <div className="hero">

          {/* 🔥 HEADER */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
              marginBottom: 12,
            }}
          >
            <Image
              src="/logo.png"
              alt="Scandly logo"
              width={80}
              height={80}
              priority
              style={{
                filter: "drop-shadow(0 0 12px rgba(0, 200, 255, 0.35))",
              }}
            />

            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: "3rem",
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                }}
              >
                Scandly
              </h1>

              <p
                style={{
                  margin: "6px 0 0 0",
                  opacity: 0.8,
                  fontSize: "1.1rem",
                }}
              >
                Scan. Detect. Fix.
              </p>
            </div>
          </div>

          {/* 🔥 DESCRIPTION */}
          <p
            style={{
              marginTop: 16,
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