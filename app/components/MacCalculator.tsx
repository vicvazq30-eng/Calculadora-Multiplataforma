"use client";

import { useEffect, useMemo, useState } from "react";
import { Field, Metric, money, number } from "./ui";

type PriceTier = "suggested" | "economy" | "lastChance";
type BatteryBrand = "none" | "soltech128" | "soltech102" | "tesla" | "sonnen" | "eg4";

const HOURS = 1440;
const PANEL_WATTS = 560;

const SOLAR_RATES: Record<PriceTier, number> = {
  suggested: 2.5,
  economy: 2.25,
  lastChance: 2.0,
};

const SOLTECH_BASE_COSTS: Record<
  PriceTier,
  Record<"soltech128" | "soltech102", number>
> = {
  suggested: {
    soltech128: 12000,
    soltech102: 11000,
  },
  economy: {
    soltech128: 10000,
    soltech102: 8000,
  },
  lastChance: {
    soltech128: 10000,
    soltech102: 8000,
  },
};

const LEGACY_BATTERY_BASE_COSTS: Record<"tesla" | "sonnen" | "eg4", number> = {
  tesla: 11000,
  sonnen: 9000,
  eg4: 10000,
};

function batteryBaseCost(priceTier: PriceTier, batteryBrand: BatteryBrand) {
  if (batteryBrand === "none") return 0;
  if (batteryBrand === "soltech128" || batteryBrand === "soltech102") {
    return SOLTECH_BASE_COSTS[priceTier][batteryBrand];
  }
  return LEGACY_BATTERY_BASE_COSTS[batteryBrand];
}

function batteryCostTotal(priceTier: PriceTier, batteryBrand: BatteryBrand, batteries: number) {
  if (batteryBrand === "none" || batteries <= 0) return 0;

  const firstBatteryCost = batteryBaseCost(priceTier, batteryBrand);
  const additionalBatteryCost = Math.max(firstBatteryCost - 1000, 0);

  return firstBatteryCost + Math.max(batteries - 1, 0) * additionalBatteryCost;
}

export default function MacCalculator() {
  const [priceTier, setPriceTier] = useState<PriceTier>("suggested");
  const [panels, setPanels] = useState(20);
  const [batteryBrand, setBatteryBrand] = useState<BatteryBrand>("none");
  const [batteries, setBatteries] = useState(0);
  const [role, setRole] = useState(0.1);

  useEffect(() => {
    const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>(".platform-tab"));
    const cashTab = tabs.find((tab) => tab.querySelector("strong")?.textContent === "MacFinancial");

    if (cashTab) {
      const title = cashTab.querySelector("strong");
      const description = cashTab.querySelector("span");
      if (title) title.textContent = "Cash";
      if (description) description.textContent = "Casos cash y comisiones";
    }
  }, []);

  const result = useMemo(() => {
    const safePanels = Math.min(53, Math.max(10, Number(panels) || 10));
    const safeBatteries = Math.max(0, Number(batteries) || 0);

    const watts = safePanels * PANEL_WATTS;
    const kw = watts / 1000;
    const solarValue = watts * SOLAR_RATES[priceTier];

    const batteryTotal = batteryCostTotal(priceTier, batteryBrand, safeBatteries);

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
  }, [priceTier, panels, batteryBrand, batteries, role]);

  return (
    <div className="calculator-grid">
      <section className="module-card">
        <div className="section-heading"><h2>Cash</h2></div>

        <div className="form-grid">
          <Field label="Panel">
            <div className="readout">560 W</div>
          </Field>

          <Field label="Cantidad de paneles">
            <input
              type="number"
              min={10}
              max={53}
              step={1}
              value={panels}
              onChange={(e) => setPanels(Number(e.target.value))}
            />
          </Field>

          <Field label="Nivel de precio">
            <select value={priceTier} onChange={(e) => setPriceTier(e.target.value as PriceTier)}>
              <option value="suggested">Precio Sugerido — $2.50/W</option>
              <option value="economy">Economy Solar — $2.25/W</option>
              <option value="lastChance">Last Chance — $2.00/W</option>
            </select>
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
              <option value="soltech128">Soltech ESS 12.8 kWh</option>
              <option value="soltech102">Soltech ESS 10.2 kWh</option>
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
