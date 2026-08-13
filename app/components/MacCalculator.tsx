"use client";

import { useMemo, useState } from "react";
import { Field, Metric, money, number } from "./ui";

type PanelType = "410" | "440";
type BatteryBrand = "none" | "tesla" | "sonnen" | "eg4";

const HOURS = 1440;

const PANEL_CONFIG: Record<PanelType, { watts: number; rate: number }> = {
  "410": { watts: 410, rate: 2.5 },
  "440": { watts: 440, rate: 2.6 },
};

const BATTERY_COSTS: Record<Exclude<BatteryBrand, "none">, number> = {
  tesla: 11000,
  sonnen: 9000,
  eg4: 10000,
};

export default function MacCalculator() {
  const [panelType, setPanelType] = useState<PanelType>("410");
  const [panels, setPanels] = useState(20);
  const [batteryBrand, setBatteryBrand] = useState<BatteryBrand>("none");
  const [batteries, setBatteries] = useState(0);
  const [role, setRole] = useState(0.1);

  const result = useMemo(() => {
    const safePanels = Math.max(0, Number(panels) || 0);
    const safeBatteries = Math.max(0, Number(batteries) || 0);
    const config = PANEL_CONFIG[panelType];

    const watts = safePanels * config.watts;
    const kw = watts / 1000;
    const solarValue = watts * config.rate;

    const batteryUnitCost =
      batteryBrand === "none" ? 0 : BATTERY_COSTS[batteryBrand];
    const batteryTotal = batteryUnitCost * safeBatteries;

    const systemTotal = solarValue + batteryTotal;
    const commission = systemTotal * role;
    const annual = (watts * HOURS) / 1000;
    const monthly = annual / 12;

    return {
      watts,
      kw,
      systemTotal,
      commission,
      annual,
      monthly,
    };
  }, [panelType, panels, batteryBrand, batteries, role]);

  return (
    <div className="calculator-grid">
      <section className="module-card">
        <div className="section-heading"><h2>Cash</h2></div>

        <div className="form-grid">
          <Field label="Tipo de panel">
            <select value={panelType} onChange={(e) => setPanelType(e.target.value as PanelType)}>
              <option value="410">Panel 410 W</option>
              <option value="440">Panel 440 W</option>
            </select>
          </Field>

          <Field label="Cantidad de paneles">
            <input
              type="number"
              min={0}
              step={1}
              value={panels}
              onChange={(e) => setPanels(Number(e.target.value))}
            />
          </Field>

          <Field label="Marca de batería">
            <select
              value={batteryBrand}
              onChange={(e) => {
                const brand = e.target.value as BatteryBrand;
                setBatteryBrand(brand);
                if (brand === "none") setBatteries(0);
                if (brand !== "none" && batteries === 0) setBatteries(1);
              }}
            >
              <option value="none">Sin batería</option>
              <option value="tesla">Tesla</option>
              <option value="sonnen">Sonnen</option>
              <option value="eg4">EG4</option>
            </select>
          </Field>

          <Field label="Cantidad de baterías">
            <input
              type="number"
              min={0}
              step={1}
              disabled={batteryBrand === "none"}
              value={batteryBrand === "none" ? 0 : batteries}
              onChange={(e) => setBatteries(Number(e.target.value))}
            />
          </Field>

          <Field label="Rol del vendedor" full>
            <select value={role} onChange={(e) => setRole(Number(e.target.value))}>
              <option value={0.06}>Trainee — 6%</option>
              <option value={0.1}>Consultor — 10%</option>
              <option value={0.11}>Líder — 11%</option>
              <option value={0.12}>Gerente — 12%</option>
              <option value={0.14}>Partner — 14%</option>
              <option value={0.16}>Partner Ejecutivo — 16%</option>
            </select>
          </Field>
        </div>
      </section>

      <section className="module-card">
        <div className="section-heading"><h2>Resultados</h2></div>

        <div className="primary-result">
          <span>Monto total del sistema</span>
          <strong>{money(result.systemTotal)}</strong>
          <small>El cálculo interno incluye paneles y baterías seleccionadas.</small>
        </div>

        <div className="metrics-grid">
          <Metric label="Tamaño del sistema" value={`${number(result.kw, 2)} kW`} />
          <Metric label="Producción anual" value={`${number(result.annual)} kWh`} />
          <Metric label="Producción mensual" value={`${number(result.monthly)} kWh`} />
          <Metric label="Comisión del vendedor" value={money(result.commission)} tone="gold" />
        </div>
      </section>
    </div>
  );
}
