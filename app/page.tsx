"use client";

import { useState } from "react";
import SunrunCalculator from "./components/SunrunCalculator";
import SunvidaCalculator from "./components/SunvidaCalculator";
import MacCalculator from "./components/MacCalculator";

type Platform = "sunrun" | "sunvida" | "mac";

const platforms: Array<{ id: Platform; label: string; description: string }> = [
  { id: "sunrun", label: "Sunrun", description: "EPC, pagos y comisiones" },
  { id: "sunvida", label: "SunVida", description: "SRP, Lease y Loan" },
  { id: "mac", label: "MacFinancial", description: "PPA comercial" },
];

export default function HomePage() {
  const [platform, setPlatform] = useState<Platform>("sunrun");

  return (
    <main className="app-shell">
      <header className="brand-header">
        <img src="/hqs-logo.png" alt="HQS Energy" className="brand-logo" />
        <div className="header-copy">
          <p className="eyebrow">HQS ENERGY</p>
          <h1>Commercial Platform</h1>
          <p>Calculadora interna de propuestas y compensación.</p>
        </div>
      </header>

      <nav className="platform-nav" aria-label="Plataformas">
        {platforms.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`platform-tab ${platform === item.id ? "active" : ""}`}
            onClick={() => setPlatform(item.id)}
          >
            <strong>{item.label}</strong>
            <span>{item.description}</span>
          </button>
        ))}
      </nav>

      <section className="module-stage">
        {platform === "sunrun" && <SunrunCalculator />}
        {platform === "sunvida" && <SunvidaCalculator />}
        {platform === "mac" && <MacCalculator />}
      </section>
    </main>
  );
}
