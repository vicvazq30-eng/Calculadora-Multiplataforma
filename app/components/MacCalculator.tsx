"use client";

import { useMemo, useState } from "react";
import { Field, Metric, money, number } from "./ui";

const PANEL_WATTS = 440;
const PRODUCTION_FACTOR = 1000;
const ESCALATOR = 0.0199;
const SYSTEM_RATE = 2.65;

export default function MacCalculator() {
  const [kw, setKw] = useState(17.6);
  const [newRate, setNewRate] = useState(0.19);
  const [currentRate, setCurrentRate] = useState(0.31);
  const [role, setRole] = useState(0.08);

  const result = useMemo(() => {
    const panels = Math.ceil((kw * 1000) / PANEL_WATTS);
    const systemWatts = panels * PANEL_WATTS;
    const production = kw * PRODUCTION_FACTOR;
    const annualNew = production * newRate;
    const monthlyYear1 = annualNew / 12;
    const annualCurrent = production * currentRate;
    const monthlyCurrent = annualCurrent / 12;
    const annualSavings = annualCurrent - annualNew;
    const monthlySavings = annualSavings / 12;
    const monthlyYear25 = monthlyYear1 * Math.pow(1 + ESCALATOR, 24);
    const systemValue = systemWatts * SYSTEM_RATE;
    const commission = systemValue * role;
    return { panels, production, annualNew, monthlyYear1, annualCurrent, monthlyCurrent, annualSavings, monthlySavings, monthlyYear25, systemValue, commission };
  }, [kw, newRate, currentRate, role]);

  return (
    <div className="calculator-grid">
      <section className="module-card">
        <div className="section-heading"><h2>MacFinancial Comercial</h2></div>
        <div className="form-grid">
          <Field label="Tamaño del sistema (kW)" full><input type="number" step="0.01" value={kw} onChange={(e) => setKw(Number(e.target.value))} /></Field>
          <Field label="Precio por kWh al cliente"><input type="number" step="0.0001" value={newRate} onChange={(e) => setNewRate(Number(e.target.value))} /></Field>
          <Field label="Precio actual por kWh"><input type="number" step="0.0001" value={currentRate} onChange={(e) => setCurrentRate(Number(e.target.value))} /></Field>
          <Field label="Rol del vendedor" full><select value={role} onChange={(e) => setRole(Number(e.target.value))}><option value={0.06}>Trainee — 6%</option><option value={0.08}>Consultor — 8%</option><option value={0.09}>Líder — 9%</option><option value={0.1}>Gerente — 10%</option><option value={0.12}>Partner — 12%</option></select></Field>
        </div>
        <div className="hero-metrics"><Metric label="Valor total del sistema" value={money(result.systemValue)} /><Metric label="Comisión del vendedor" value={money(result.commission)} tone="gold" /></div>
      </section>

      <section className="module-card">
        <div className="section-heading"><h2>Resultados</h2></div>
        <div className="primary-result"><span>Pago mensual — Año 1</span><strong>{money(result.monthlyYear1)}</strong><small>Tarifa aplicada sobre producción anual estimada.</small></div>
        <div className="metrics-grid">
          <Metric label="Paneles requeridos" value={`${result.panels} paneles`} />
          <Metric label="Producción primer año" value={`${number(result.production)} kWh`} />
          <Metric label="Pago mensual año 25" value={money(result.monthlyYear25)} />
          <Metric label="Nuevo costo anual" value={money(result.annualNew)} />
          <Metric label="Costo mensual actual" value={money(result.monthlyCurrent)} />
          <Metric label="Costo anual actual" value={money(result.annualCurrent)} />
          <Metric label="Ahorro mensual" value={money(result.monthlySavings)} tone="green" />
          <Metric label="Ahorro anual" value={money(result.annualSavings)} tone="green" />
        </div>
      </section>
    </div>
  );
}
