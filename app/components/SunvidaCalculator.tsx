"use client";

import { useMemo, useState } from "react";
import { Field, Metric, money, number } from "./ui";

type Mode = "battery" | "solar";
type Product = "lease15" | "lease20" | "loan10" | "loan15";

const models: Record<Product, Record<string, { slope: number; intercept: number }>> = {
  lease15: {
    "640": { slope: 0.009614320049335367, intercept: -0.0002612310330488325 },
    "680": { slope: 0.009044261161067647, intercept: 0.0006654794795140544 },
    "700": { slope: 0.00876617152808952, intercept: -0.0021784658297674614 },
  },
  lease20: {
    "680": { slope: 0.008426732724992144, intercept: -0.0000873006073065575 },
    "700": { slope: 0.00811714831537761, intercept: 0.0012482596940573247 },
  },
  loan10: {
    "620": { slope: 0.012716284442912102, intercept: 0.0016864323885789586 },
    "640": { slope: 0.011533734866366803, intercept: -0.0022341681422292994 },
    "680": { slope: 0.011026902084305512, intercept: 0.0010283014173343614 },
    "700": { slope: 0.010778600150418616, intercept: -0.005549200923934921 },
  },
  loan15: {
    "640": { slope: 0.009327006975671407, intercept: 0.0012606102227902573 },
    "680": { slope: 0.00876617152808952, intercept: -0.0021784658297674614 },
    "700": { slope: 0.008492751694858086, intercept: -0.0031472502022804423 },
  },
};

export default function SunvidaCalculator() {
  const [mode, setMode] = useState<Mode>("battery");
  const [panels, setPanels] = useState(20);
  const [brand, setBrand] = useState("fortress");
  const [batteries, setBatteries] = useState(1);
  const [role, setRole] = useState(0.06);
  const [credit, setCredit] = useState("700");
  const [product, setProduct] = useState<Product>("lease20");

  const result = useMemo(() => {
    const safePanels = Math.min(50, Math.max(10, panels));
    const watts = safePanels * 445;
    const rate = safePanels <= 12 ? 3.1 : safePanels <= 22 ? 2.85 : 2.8;
    const count = mode === "solar" ? 0 : batteries;
    const batteryCost = count > 0 ? (brand === "fortress" ? 7500 + Math.max(count - 1, 0) * 7000 : 10000 * count) : 0;
    const srp = watts * rate + batteryCost;
    const model = models[product]?.[credit];
    const payment = model ? model.slope * srp + model.intercept : null;
    const annual = (watts * 1440) / 1000;
    return { safePanels, watts, srp, payment, annual, monthly: annual / 12, commission: srp * role };
  }, [mode, panels, brand, batteries, role, credit, product]);

  return (
    <div className="calculator-grid">
      <section className="module-card">
        <div className="section-heading"><h2>SunVida</h2></div>
        <div className="segmented">
          <button type="button" className={mode === "battery" ? "active" : ""} onClick={() => setMode("battery")}>Paneles + batería</button>
          <button type="button" className={mode === "solar" ? "active" : ""} onClick={() => setMode("solar")}>Solo paneles</button>
        </div>
        <div className="form-grid">
          <Field label="Cantidad de paneles"><input type="number" min={10} max={50} value={panels} onChange={(e) => setPanels(Number(e.target.value))} /></Field>
          <Field label="Watts por panel"><div className="readout">445 W</div></Field>
          {mode === "battery" ? <><Field label="Marca de batería"><select value={brand} onChange={(e) => setBrand(e.target.value)}><option value="fortress">Fortress eBoost</option><option value="tesla">Tesla PW3</option></select></Field><Field label="Cantidad de baterías"><input type="number" min={1} max={2} value={batteries} onChange={(e) => setBatteries(Number(e.target.value))} /></Field></> : null}
          <Field label="Rol del vendedor"><select value={role} onChange={(e) => setRole(Number(e.target.value))}><option value={0.04}>Trainee — 4%</option><option value={0.06}>Consultor — 6%</option><option value={0.07}>Líder — 7%</option><option value={0.08}>Gerente — 8%</option><option value={0.1}>Partner — 10%</option><option value={0.11}>Partner Ejecutivo — 11%</option></select></Field>
          <Field label="Rango de Empírica"><select value={credit} onChange={(e) => setCredit(e.target.value)}><option value="620">620–639</option><option value="640">640–679</option><option value="680">680–699</option><option value="700">700–850</option></select></Field>
          <Field label="Financiamiento" full><select value={product} onChange={(e) => setProduct(e.target.value as Product)}><option value="lease15">Lease 15 años</option><option value="lease20">Lease 20 años</option><option value="loan10">Loan 10 años</option><option value="loan15">Loan 15 años</option></select></Field>
        </div>
      </section>

      <section className="module-card">
        <div className="section-heading"><h2>Resultados</h2></div>
        <div className="primary-result"><span>System Retail Price (SRP)</span><strong>{money(result.srp)}</strong><small>Comisión calculada sobre el SRP total.</small></div>
        <div className="metrics-grid">
          <Metric label="Tamaño del sistema" value={`${number(result.watts / 1000, 2)} kW`} />
          <Metric label="Comisión del vendedor" value={money(result.commission)} tone="gold" />
          <Metric label="Producción anual" value={`${number(result.annual)} kWh`} />
          <Metric label="Producción mensual" value={`${number(result.monthly)} kWh`} />
        </div>
        <div className="primary-result" style={{ marginTop: 10 }}><span>Pago aproximado seleccionado</span><strong>{result.payment === null ? "No disponible" : money(result.payment)}</strong><small>{mode === "solar" ? "Solo paneles" : brand === "fortress" ? "Fortress eBoost" : "Tesla PW3"} · estimado según SRP y Empírica</small></div>
      </section>
    </div>
  );
}
