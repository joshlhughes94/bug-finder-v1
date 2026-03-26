import ScanForm from "../components/ScanForm";

export default function HomePage() {
  return (
    <main className="page">
      <div className="container">
        <div className="hero">
          <h1>Bug Finder V1</h1>
          <p>
            Paste in a website URL and scan for console errors, failed requests,
            accessibility issues, and screenshots.
          </p>
        </div>

        <ScanForm />
      </div>
    </main>
  );
}