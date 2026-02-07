import "./Home.css";
import logo from "../../assets/paltechdome-logo.png";
import Demo from "../../components/Demo";

export default function Home() {
  return (
    <div className="homeRoot">
      <header className="navBar">
        <div className="navInner">
          <a className="brand" href="#home">
            <img className="brandLogo" src={logo} alt="PalTechDome Logo" />
            <span className="brandText">PalTechDome</span>
          </a>

          <nav className="navLinks">
            <a href="#home">Home</a>
            <a href="#mission">Our Mission</a>
            <a href="#demo">Demo</a>
          </nav>

          <a className="navCta" href="#demo">
            Try Demo
          </a>
        </div>
      </header>

      <main id="home" className="heroSection">
        <div className="heroGrid">
          <section className="heroLeft">
            <div className="badge">Hybrid Post-Quantum Encryption — PoC</div>

            <h1 className="heroTitle">
              Quantum-Safe <span>Data Encryption</span>
            </h1>

            <p className="heroSub">
              We demonstrate a hybrid encryption prototype using RSA-3072 and ML-KEM-1024 (Kyber)
              to establish a quantum-resistant session key, then encrypt files efficiently using AES-256-GCM.
              This is a proof-of-concept demo designed to protect long-term sensitive data.

              <br />
              <b>Flow:</b> Upload → Encrypt & Download (.enc) → Decrypt & Restore Original File
            </p>


            <div className="heroButtons">
              <a className="btnPrimary" href="#demo">
                Try the Demo
              </a>
              <a className="btnGhost" href="#mission">
                Why Hybrid PQC?
              </a>
            </div>

            <div className="heroStats">
              <div className="statCard">
                <div className="statNum">PQC Standard</div>
                <div className="statLbl">ML-KEM-1024 (Kyber)</div>
              </div>
              <div className="statCard">
                <div className="statNum">Hybrid</div>
                <div className="statLbl">RSA + Kyber Combined</div>
              </div>
              <div className="statCard">
                <div className="statNum">Fast File Encryption</div>
                <div className="statLbl">AES-256-GCM</div>
              </div>
            </div>
          </section>

          <section id="demo" className="heroRight">
            <Demo />
          </section>
        </div>
      </main>


      <section id="mission" className="missionSection">
        <div className="containerX">
          <h2 className="sectionTitle">Our Mission</h2>
          <p className="sectionSub">
            Build a clear path for adopting quantum-safe practices in real systems, starting with a
            simple, understandable prototype and a long-term plan for integration.
          </p>

          <div className="missionGrid">
            <div className="missionCard">
              <h3>Why it matters</h3>
              <p>
                Public-key cryptography (RSA/ECC) is vulnerable to future quantum attacks. Sensitive
                data often needs confidentiality for years (“harvest now, decrypt later” risk).
              </p>
            </div>

            <div className="missionCard">
              <h3>What we demonstrate</h3>
              <p>
                A hybrid approach: derive a session key using classical + post-quantum secrets, then
                encrypt the dataset using symmetric encryption (fast for bulk data).
              </p>
            </div>

            <div className="missionCard">
              <h3>Long-term path</h3>
              <p>
                Inventory cryptography dependencies, adopt standards-based PQC, test hybrid modes,
                then migrate fully as ecosystems mature.
              </p>
            </div>
          </div>

          <div className="missionCtaRow">
            <a className="btnPrimary" href="#demo">
              Go to Demo
            </a>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="containerX footerInner">
          <div className="footerLeft">
            <b>PalTechDome</b> — Quantum-Safe Encryption PoC
          </div>
          <div className="footerRight">Team • University • 2026</div>
        </div>
      </footer>
    </div>
  );
}
