"use client";

import { useEffect, useMemo, useState } from "react";
import { Field, Metric, money, number } from "./ui";

type PriceTier = "suggested" | "economy" | "lastChance";
type BatteryBrand = "none" | "soltech128" | "soltech102" | "tesla" | "sonnen" | "eg4";
type FutureAir = {
  id: number;
  btu: number;
  seer: number;
  hours: number;
  customSeer: boolean;
};

const HOURS = 1440;
const PANEL_WATTS = 560;
const PANEL_MONTHLY_KWH = ((PANEL_WATTS * HOURS) / 1000) / 12;
// Cash pricing warnings: Economy Solar and Last Chance.

const AIR_SEER_OPTIONS: Record<number, number[]> = {
  12000: [17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28],
  18000: [17, 18, 19, 20, 21, 22, 23, 23.5, 24, 24.5, 25, 26, 27, 27.5],
  24000: [17, 18, 19, 20, 21, 21.5, 22, 23, 24, 24.5, 25, 26, 27],
  36000: [16, 17, 18, 19, 20, 21, 22],
};

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
  const [futureAirs, setFutureAirs] = useState<FutureAir[]>([
    { id: 1, btu: 0, seer: 0, hours: 0, customSeer: false },
  ]);

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

    const futureLoads = futureAirs.map((air) => {
      const monthlyConsumption = air.btu > 0 && air.seer > 0 && air.hours > 0
        ? ((air.btu / air.seer) / 1000) * air.hours * 30
        : 0;
      const panelsNeeded = monthlyConsumption > 0
        ? Math.ceil(monthlyConsumption / PANEL_MONTHLY_KWH)
        : 0;

      return {
        ...air,
        monthlyConsumption,
        panelsNeeded,
      };
    });

    const futureMonthlyConsumption = futureLoads.reduce(
      (sum, air) => sum + air.monthlyConsumption,
      0,
    );
    const futurePanels = futureLoads.reduce(
      (sum, air) => sum + air.panelsNeeded,
      0,
    );
    const recommendedFinalPanels = safePanels + futurePanels;

    return {
      watts,
      kw,
      systemTotal,
      commission,
      annual,
      monthly,
      futureLoads,
      futureMonthlyConsumption,
      futurePanels,
      recommendedFinalPanels,
    };
  }, [priceTier, panels, batteryBrand, batteries, role, futureAirs]);

  const updateFutureAir = (id: number, updates: Partial<FutureAir>) => {
    setFutureAirs((current) => current.map((air) => (
      air.id === id ? { ...air, ...updates } : air
    )));
  };

  const addFutureAir = () => {
    setFutureAirs((current) => {
      const nextId = Math.max(0, ...current.map((air) => air.id)) + 1;
      return [
        ...current,
        { id: nextId, btu: 0, seer: 0, hours: 0, customSeer: false },
      ];
    });
  };

  const removeLastFutureAir = () => {
    setFutureAirs((current) => current.length > 1 ? current.slice(0, -1) : current);
  };

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
              <option value="suggested">Precio Sugerido</option>
              <option value="economy">Economy Solar</option>
              <option value="lastChance">Last Chance</option>
            </select>
            {priceTier !== "suggested" ? (
              <div
                style={{
                  marginTop: 10,
                  padding: "12px 14px",
                  border: "1px solid #f59e0b",
                  borderRadius: 14,
                  background: "#fffbeb",
                  color: "#92400e",
                  fontSize: 13,
                  fontWeight: 800,
                  lineHeight: 1.4,
                }}
              >
                {priceTier === "economy"
                  ? "Advertencia: al utilizar Economy Solar, su comisión se verá afectada y será determinada por el Gerente General."
                  : "Advertencia: al utilizar Last Chance, su comisión será una comisión flat y será designada por el Gerente General."}
              </div>
            ) : null}
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
              <option value={0.13}>Gerente Ejecutivo — 13%</option>
              <option value={0.14}>Jr. Partner — 14%</option>
              <option value={0.15}>Partner — 15%</option>
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

        <div className="consumption-block">
          <h3>Consumos futuros</h3>

          {futureAirs.map((air, index) => {
            const load = result.futureLoads.find((item) => item.id === air.id);
            const seerOptions = AIR_SEER_OPTIONS[air.btu] || [];

            return (
              <div key={air.id} className={index > 0 ? "consumption-block" : ""}>
                <strong style={{ display: "block", marginBottom: 9 }}>Aire {index + 1}</strong>

                <div className="form-grid compact">
                  <Field label="Aire acondicionado">
                    <select
                      value={air.btu}
                      onChange={(e) => updateFutureAir(air.id, {
                        btu: Number(e.target.value),
                        seer: 0,
                        customSeer: false,
                      })}
                    >
                      <option value={0}>Seleccionar BTU</option>
                      <option value={12000}>12,000 BTU</option>
                      <option value={18000}>18,000 BTU</option>
                      <option value={24000}>24,000 BTU</option>
                      <option value={36000}>36,000 BTU</option>
                    </select>
                  </Field>

                  <Field label="SEER / SEER2">
                    <select
                      value={air.customSeer ? "custom" : air.seer || ""}
                      disabled={!air.btu}
                      onChange={(e) => {
                        if (e.target.value === "custom") {
                          updateFutureAir(air.id, { customSeer: true, seer: 0 });
                          return;
                        }
                        updateFutureAir(air.id, {
                          customSeer: false,
                          seer: Number(e.target.value),
                        });
                      }}
                    >
                      <option value="">Seleccionar SEER</option>
                      {seerOptions.map((seer) => <option key={seer} value={seer}>{seer}</option>)}
                      <option value="custom">Otro / valor exacto</option>
                    </select>
                  </Field>

                  {air.customSeer ? (
                    <Field label="SEER / SEER2 exacto">
                      <input
                        type="number"
                        min={10}
                        max={40}
                        step="0.1"
                        value={air.seer || ""}
                        placeholder="Ej: 18.8"
                        onChange={(e) => updateFutureAir(air.id, { seer: Number(e.target.value) })}
                      />
                    </Field>
                  ) : null}

                  <Field label="Horas de uso diario">
                    <input
                      type="number"
                      min={0}
                      max={24}
                      step="0.5"
                      value={air.hours || ""}
                      placeholder="Ej: 8"
                      onChange={(e) => updateFutureAir(air.id, { hours: Number(e.target.value) })}
                    />
                  </Field>
                </div>

                <div className="inline-summary">
                  <span>SEER usado<strong>{air.seer || "—"}</strong></span>
                  <span>Consumo mensual<strong>{number(load?.monthlyConsumption || 0)} kWh</strong></span>
                  <span>Paneles para este aire<strong>+{load?.panelsNeeded || 0}</strong></span>
                </div>
              </div>
            );
          })}

          <div
            className="segmented"
            style={{
              gridTemplateColumns: futureAirs.length > 1 ? "1fr 1fr" : "1fr",
              marginTop: 12,
            }}
          >
            <button type="button" className="active" onClick={addFutureAir}>Añadir otro aire</button>
            {futureAirs.length > 1 ? (
              <button type="button" onClick={removeLastFutureAir}>Quitar último aire</button>
            ) : null}
          </div>

          <div className="hero-metrics">
            <Metric label="Consumo futuro total" value={`${number(result.futureMonthlyConsumption)} kWh/mes`} />
            <Metric label="Paneles adicionales totales" value={`+${result.futurePanels} paneles`} tone="blue" />
          </div>

          <div className="hero-metrics">
            <Metric label="Sistema seleccionado" value={`${Math.min(53, Math.max(10, Number(panels) || 10))} paneles`} />
            <Metric label="Sistema recomendado final" value={`${result.recommendedFinalPanels} paneles`} tone="gold" />
          </div>
        </div>
      </section>
    </div>
  );
}
