"use client";

import { useMemo, useState } from "react";
import { Field, Metric, money, number } from "./ui";

const WATTS = 410;
const HOURS = 1440;
const STEPPED_FACTOR = 0.8475;

const fixedTable: Record<string, [[number, number], [number, number]]> = {
  "10-1": [[4.551, 192.63], [4.48, 189.96]],
  "12-1": [[4.112, 205.96], [4.041, 202.76]],
  "14-1": [[3.992, 229.41], [3.921, 225.68]],
  "16-1": [[3.796, 246.48], [3.725, 242.22]],
  "18-1": [[3.644, 263.53], [3.573, 258.74]],
  "20-1": [[3.523, 280.6], [3.452, 275.27]],
  "22-1": [[3.425, 297.65], [3.353, 291.79]],
  "22-2": [[4.333, 384.2], [4.263, 378.33]],
  "24-2": [[4.149, 399.13], [4.078, 392.73]],
};

function interpolate(points: [[number, number], [number, number]], epc: number) {
  const [[e1, p1], [e2, p2]] = points;
  return p1 + ((epc - e1) * (p2 - p1)) / (e2 - e1);
}

function fixedEstimate(panels: number, batteries: number, epc: number) {
  const exact = fixedTable[`${panels}-${batteries}`];
  if (exact) return interpolate(exact, epc);
  const rows = Object.keys(fixedTable)
    .map((key) => {
      const [p, b] = key.split("-").map(Number);
      return { key, p, b };
    })
    .filter((row) => row.b === batteries)
    .sort((a, b) => a.p - b.p);
  if (!rows.length) return 0;
  if (panels <= rows[0].p) return interpolate(fixedTable[rows[0].key], epc);
  for (let index = 0; index < rows.length - 1; index += 1) {
    const left = rows[index];
    const right = rows[index + 1];
    if (panels >= left.p && panels <= right.p) {
      const lp = interpolate(fixedTable[left.key], epc);
      const rp = interpolate(fixedTable[right.key], epc);
      return lp + ((panels - left.p) / (right.p - left.p)) * (rp - lp);
    }
  }
  const last = rows.at(-1)!;
  const previous = rows.at(-2);
  if (!previous) return interpolate(fixedTable[last.key], epc);
  const lastPay = interpolate(fixedTable[last.key], epc);
  const previousPay = interpolate(fixedTable[previous.key], epc);
  return lastPay + ((panels - last.p) * (lastPay - previousPay)) / (last.p - previous.p);
}

export default function SunrunCalculator() {
  const [panels, setPanels] = useState(20);
  const [batteries, setBatteries] = useState(1);
  const [role, setRole] = useState(0.1);
  const [saleEpc, setSaleEpc] = useState(0);
  const [months, setMonths] = useState([0, 0, 0]);

  const result = useMemo(() => {
    const eligible = panels >= 10 && !(batteries >= 2 && panels < 22);
    const multiplier = batteries >= 2 ? 2.17 : panels <= 16 ? 2.15 : 2.25;
    const batteryUnit = batteries === 1 ? (panels <= 13 ? 10500 : panels <= 20 ? 11000 : 11500) : 10500;
    const batteryTotal = eligible ? batteries * batteryUnit : 0;
    const watts = panels * WATTS;
    const pv = eligible ? watts * multiplier : 0;
    const baseSystem = eligible ? pv + batteryTotal : 0;
    const epcBase = eligible && watts ? baseSystem / watts : 0;
    const finalEpc = saleEpc > 0 ? saleEpc : epcBase;
    const saleSystem = eligible ? watts * finalEpc : 0;
    const margin = Math.max(saleSystem - baseSystem, 0);
    const saleCommission = margin > 4000 ? margin * 0.7 : margin;
    const annual = (watts * HOURS) / 1000;
    const monthly = annual / 12;
    const average = months.reduce((sum, item) => sum + item, 0) / 3;
    const annualConsumption = average * 12;
    const offset = annualConsumption ? (annual / annualConsumption) * 100 : 0;
    const fixed = eligible ? fixedEstimate(panels, batteries, finalEpc) : 0;
    return { eligible, epcBase, finalEpc, baseSystem, saleSystem, margin, saleCommission, annual, monthly, average, annualConsumption, offset, fixed, baseCommission: baseSystem * role };
  }, [panels, batteries, role, saleEpc, months]);

  return (
    <div className="calculator-grid">
      <section className="module-card">
        <div className="section-heading"><h2>Sunrun</h2></div>
        <div className="form-grid">
          <Field label="Cantidad de paneles"><input type="number" min={0} value={panels} onChange={(e) => setPanels(Number(e.target.value))} /></Field>
          <Field label="Watts por panel"><div className="readout">410 W</div></Field>
          <Field label="Cantidad de baterías"><input type="number" min={0} value={batteries} onChange={(e) => setBatteries(Number(e.target.value))} /></Field>
          <Field label="Rol del vendedor"><select value={role} onChange={(e) => setRole(Number(e.target.value))}><option value={0.06}>Trainee — 6%</option><option value={0.1}>Consultor — 10%</option><option value={0.11}>Líder — 11%</option><option value={0.12}>Gerente — 12%</option><option value={0.14}>Partner — 14%</option><option value={0.16}>Partner Ejecutivo — 16%</option></select></Field>
          <Field label="EPC de venta" full><input type="number" step="0.01" value={saleEpc || ""} placeholder={result.epcBase.toFixed(2)} onChange={(e) => setSaleEpc(Number(e.target.value))} /></Field>
        </div>
        {!result.eligible ? <div className="alert">Sistema no elegible. Mínimo 10 paneles; 2 baterías requieren 22 paneles.</div> : null}
        <div className="hero-metrics"><Metric label="EPC base" value={result.epcBase.toFixed(2)} tone="blue" /><Metric label="EPC venta" value={result.finalEpc.toFixed(2)} tone="blue" /></div>
        <div className="hero-metrics"><Metric label="Pago fijo aproximado" value={money(result.fixed)} /><Metric label="Pago escalonado aproximado" value={money(result.fixed * STEPPED_FACTOR)} tone="gold" /></div>
        <div className="consumption-block"><h3>Promedio de consumo</h3><div className="form-grid compact">{months.map((value, index) => <Field key={index} label={`Mes alto ${index + 1}`}><input type="number" value={value} onChange={(e) => setMonths((current) => current.map((item, i) => i === index ? Number(e.target.value) : item))} /></Field>)}</div></div>
      </section>

      <section className="module-card">
        <div className="section-heading"><h2>Resultados</h2></div>
        <div className="metrics-grid">
          <Metric label="Tamaño del sistema" value={`${number((panels * WATTS) / 1000, 2)} kW`} />
          <Metric label="Producción anual" value={`${number(result.annual)} kWh`} />
          <Metric label="Producción mensual" value={`${number(result.monthly)} kWh`} />
          <Metric label="Offset promedio" value={`${number(result.offset)}%`} />
          <Metric label="Sistema base" value={money(result.baseSystem)} />
          <Metric label="Comisión base" value={money(result.baseCommission)} tone="gold" />
          <Metric label="Sistema venta" value={money(result.saleSystem)} />
          <Metric label="Comisión de venta" value={money(result.saleCommission)} tone="gold" note={result.margin > 4000 ? "70% vendedor · 30% compañía" : ""} />
        </div>
      </section>
    </div>
  );
}
