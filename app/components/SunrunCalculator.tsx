"use client";

import { useEffect, useMemo, useState } from "react";
import { Field, Metric, money, number } from "./ui";

const WATTS = 410;
const HOURS = 1440;
const SOLAR_RATE = 2.35;
const PANEL_MONTHLY_KWH = ((WATTS * HOURS) / 1000) / 12;

const AIR_SEER_OPTIONS: Record<number, number[]> = {
  12000: [17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28],
  18000: [17, 18, 19, 20, 21, 22, 23, 23.5, 24, 24.5, 25, 26, 27, 27.5],
  24000: [17, 18, 19, 20, 21, 21.5, 22, 23, 24, 24.5, 25, 26, 27],
  36000: [16, 17, 18, 19, 20, 21, 22],
};

type CommissionMode = "pv" | "full";
type PaymentPoint = [number, number];
type PaymentTable = Record<number, Record<number, PaymentPoint[]>>;
type FutureAir = {
  id: number;
  btu: number;
  seer: number;
  hours: number;
  customSeer: boolean;
};

const fixedTable: PaymentTable = {
  1: {
    10: [[5.423, 217.67], [5.346, 214.91], [5.269, 212.15], [5.192, 209.39], [5.116, 206.63], [5.039, 203.87], [4.962, 201.11], [4.886, 198.35], [4.809, 195.59]],
    14: [[4.540, 249.14], [4.462, 245.28], [4.385, 241.41], [4.309, 237.54], [4.232, 233.68], [4.155, 229.81], [4.078, 225.95]],
    18: [[4.180, 288.89], [4.102, 283.92], [4.025, 278.95], [3.948, 273.98], [3.871, 269.01], [3.794, 264.04], [3.716, 259.07]],
    22: [[3.797, 316.49], [3.720, 310.42], [3.643, 304.35], [3.565, 298.27], [3.488, 292.20]],
  },
  2: {
    22: [[5.108, 432.57], [5.031, 426.49], [4.955, 420.42], [4.879, 414.35], [4.803, 408.27], [4.727, 402.20]],
    24: [[4.916, 451.89], [4.840, 445.26], [4.764, 438.64], [4.687, 432.01], [4.611, 425.39], [4.535, 418.76]],
  },
};

const steppedTable: PaymentTable = {
  1: {
    10: [[5.431, 184.24], [5.342, 181.48], [5.252, 178.72], [5.163, 175.96], [5.073, 173.19], [4.984, 170.43], [4.894, 167.67], [4.804, 164.91], [4.715, 162.15]],
    14: [[4.541, 210.74], [4.451, 206.87], [4.360, 203.00], [4.270, 199.14], [4.180, 195.28], [4.090, 191.41]],
    18: [[4.075, 238.89], [3.985, 233.92], [3.894, 228.95], [3.804, 223.98], [3.713, 219.01]],
    22: [[3.769, 266.49], [3.679, 260.42], [3.589, 254.35], [3.498, 248.27], [3.408, 242.20]],
  },
  2: {
    22: [[5.120, 369.01], [5.031, 362.93], [4.942, 356.86], [4.852, 350.79], [4.763, 344.71]],
    24: [[4.925, 385.02], [4.836, 378.39], [4.746, 371.77], [4.657, 365.14], [4.567, 358.51]],
  },
};

function interpolatePayment(points: PaymentPoint[], epc: number) {
  const sorted = [...points].sort((a, b) => a[0] - b[0]);

  let left = sorted[0];
  let right = sorted[1];

  if (epc >= sorted[sorted.length - 1][0]) {
    left = sorted[sorted.length - 2];
    right = sorted[sorted.length - 1];
  } else if (epc > sorted[0][0]) {
    for (let index = 0; index < sorted.length - 1; index += 1) {
      if (epc >= sorted[index][0] && epc <= sorted[index + 1][0]) {
        left = sorted[index];
        right = sorted[index + 1];
        break;
      }
    }
  }

  const [e1, p1] = left;
  const [e2, p2] = right;
  return p1 + ((epc - e1) * (p2 - p1)) / (e2 - e1);
}

function paymentEstimate(table: PaymentTable, panels: number, batteries: number, epc: number) {
  const batteryTable = table[batteries];
  if (!batteryTable || !epc) return 0;

  const panelRows = Object.keys(batteryTable).map(Number).sort((a, b) => a - b);
  if (!panelRows.length) return 0;

  const paymentAt = (panelCount: number) => interpolatePayment(batteryTable[panelCount], epc);

  if (batteryTable[panels]) return paymentAt(panels);
  if (panelRows.length === 1) return paymentAt(panelRows[0]);

  if (panels <= panelRows[0]) {
    const leftPanel = panelRows[0];
    const rightPanel = panelRows[1];
    const leftPayment = paymentAt(leftPanel);
    const rightPayment = paymentAt(rightPanel);
    return leftPayment + ((panels - leftPanel) / (rightPanel - leftPanel)) * (rightPayment - leftPayment);
  }

  for (let index = 0; index < panelRows.length - 1; index += 1) {
    const leftPanel = panelRows[index];
    const rightPanel = panelRows[index + 1];
    if (panels >= leftPanel && panels <= rightPanel) {
      const leftPayment = paymentAt(leftPanel);
      const rightPayment = paymentAt(rightPanel);
      return leftPayment + ((panels - leftPanel) / (rightPanel - leftPanel)) * (rightPayment - leftPayment);
    }
  }

  const rightPanel = panelRows[panelRows.length - 1];
  const leftPanel = panelRows[panelRows.length - 2];
  const rightPayment = paymentAt(rightPanel);
  const leftPayment = paymentAt(leftPanel);
  return rightPayment + ((panels - rightPanel) / (rightPanel - leftPanel)) * (rightPayment - leftPayment);
}

function pvBatteryEpcCost(batteries: number) {
  if (batteries <= 0) return 0;
  return 10000 + Math.max(batteries - 1, 0) * 12000;
}

function pvCommissionBatteryCost(batteries: number) {
  return Math.max(batteries - 1, 0) * 12000;
}

function fullBatteryCost(batteries: number) {
  const prices = [12500, 12000, 11000, 10500];
  return prices.slice(0, Math.max(0, batteries)).reduce((sum, price) => sum + price, 0);
}

export default function SunrunCalculator() {
  const [commissionMode, setCommissionMode] = useState<CommissionMode>("pv");
  const [panels, setPanels] = useState(20);
  const [batteries, setBatteries] = useState(1);
  const [role, setRole] = useState(0.1);
  const [saleEpc, setSaleEpc] = useState(0);
  const [months, setMonths] = useState([0, 0, 0]);
  const [pvWarning, setPvWarning] = useState(false);
  const [futureAirs, setFutureAirs] = useState<FutureAir[]>([
    { id: 1, btu: 0, seer: 0, hours: 0, customSeer: false },
  ]);

  const result = useMemo(() => {
    const eligible = panels >= 10 && !(batteries >= 2 && panels < 22);
    const watts = panels * WATTS;
    const pv = eligible ? watts * SOLAR_RATE : 0;

    const batteryTotal = eligible
      ? commissionMode === "pv"
        ? pvBatteryEpcCost(batteries)
        : fullBatteryCost(batteries)
      : 0;

    const commissionBase = eligible
      ? commissionMode === "pv"
        ? pv + pvCommissionBatteryCost(batteries)
        : pv + batteryTotal
      : 0;

    const baseSystem = eligible ? pv + batteryTotal : 0;
    const epcBase = eligible && watts ? baseSystem / watts : 0;
    const requestedSaleEpc = saleEpc > 0 ? saleEpc : epcBase;
    const finalEpc = commissionMode === "pv"
      ? Math.min(requestedSaleEpc, epcBase)
      : requestedSaleEpc;
    const saleSystem = eligible ? watts * finalEpc : 0;

    const epcBaseForAdjustment = Number(epcBase.toFixed(2));
    const saleEpcForAdjustment = saleEpc > 0
      ? Number(finalEpc.toFixed(2))
      : epcBaseForAdjustment;
    const margin = eligible ? (saleEpcForAdjustment - epcBaseForAdjustment) * watts : 0;
    const baseCommission = commissionBase * role;
    const saleCommission = margin > 4000 ? margin * 0.7 : margin;

    const annual = (watts * HOURS) / 1000;
    const monthly = annual / 12;
    const average = months.reduce((sum, item) => sum + item, 0) / 3;
    const annualConsumption = average * 12;
    const offset = annualConsumption ? (annual / annualConsumption) * 100 : 0;
    const panelsAt120 = average > 0
      ? Math.ceil((average * 1.2) / PANEL_MONTHLY_KWH)
      : 0;

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
    const recommendedFinalPanels = panelsAt120 + futurePanels;

    const fixed = eligible ? paymentEstimate(fixedTable, panels, batteries, finalEpc) : 0;
    const stepped = eligible ? paymentEstimate(steppedTable, panels, batteries, finalEpc) : 0;

    return {
      eligible,
      epcBase,
      finalEpc,
      baseSystem,
      saleSystem,
      margin,
      saleCommission,
      annual,
      monthly,
      average,
      annualConsumption,
      offset,
      panelsAt120,
      futureLoads,
      futureMonthlyConsumption,
      futurePanels,
      recommendedFinalPanels,
      fixed,
      stepped,
      baseCommission,
    };
  }, [commissionMode, panels, batteries, role, saleEpc, months, futureAirs]);

  useEffect(() => {
    if (commissionMode === "pv" && saleEpc > 0 && saleEpc > result.epcBase) {
      setSaleEpc(result.epcBase);
      setPvWarning(true);
    }
    if (commissionMode === "full") {
      setPvWarning(false);
    }
  }, [commissionMode, result.epcBase, saleEpc]);

  const handleSaleEpcChange = (value: number) => {
    if (commissionMode === "pv" && value > result.epcBase) {
      setPvWarning(true);
      setSaleEpc(result.epcBase);
      return;
    }

    setPvWarning(false);
    setSaleEpc(value);
  };

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
        <div className="section-heading"><h2>Sunrun</h2></div>

        <div className="segmented">
          <button
            type="button"
            className={commissionMode === "full" ? "active" : ""}
            onClick={() => {
              setCommissionMode("full");
              setPvWarning(false);
            }}
          >
            Full Comisión
          </button>
          <button
            type="button"
            className={commissionMode === "pv" ? "active" : ""}
            onClick={() => setCommissionMode("pv")}
          >
            PV Comisión
          </button>
        </div>

        <div className="form-grid">
          <Field label="Cantidad de paneles"><input type="number" min={0} value={panels} onChange={(e) => setPanels(Number(e.target.value))} /></Field>
          <Field label="Watts por panel"><div className="readout">410 W</div></Field>
          <Field label="Cantidad de baterías"><input type="number" min={0} value={batteries} onChange={(e) => setBatteries(Number(e.target.value))} /></Field>
          <Field label="Rol del vendedor"><select value={role} onChange={(e) => setRole(Number(e.target.value))}><option value={0.06}>Trainee — 6%</option><option value={0.1}>Consultor — 10%</option><option value={0.11}>Líder — 11%</option><option value={0.12}>Gerente — 12%</option><option value={0.14}>Partner — 14%</option><option value={0.16}>Partner Ejecutivo — 16%</option></select></Field>
          <Field label="EPC de venta" full>
            <input
              type="number"
              step="0.01"
              max={commissionMode === "pv" ? result.epcBase : undefined}
              value={saleEpc || ""}
              placeholder={result.epcBase.toFixed(2)}
              onChange={(e) => handleSaleEpcChange(Number(e.target.value))}
            />
            {pvWarning ? <div className="alert">Para tener excedente debe ser con Full Comisión</div> : null}
          </Field>
        </div>
        {!result.eligible ? <div className="alert">Sistema no elegible. Mínimo 10 paneles; 2 baterías requieren 22 paneles.</div> : null}
        <div className="hero-metrics"><Metric label="EPC base" value={result.epcBase.toFixed(2)} tone="blue" /><Metric label="EPC venta" value={result.finalEpc.toFixed(2)} tone="blue" /></div>
        <div className="hero-metrics"><Metric label="Pago fijo aproximado" value={money(result.fixed)} /><Metric label="Pago escalonado aproximado" value={money(result.stepped)} tone="gold" /></div>

        <div className="consumption-block">
          <h3>Promedio de consumo</h3>
          <div className="form-grid compact">{months.map((value, index) => <Field key={index} label={`Mes alto ${index + 1}`}><input type="number" value={value} onChange={(e) => setMonths((current) => current.map((item, i) => i === index ? Number(e.target.value) : item))} /></Field>)}</div>
          <div className="hero-metrics">
            <Metric label="Promedio mensual" value={`${number(result.average)} kWh`} />
            <Metric label="Paneles recomendados al 120%" value={`${result.panelsAt120} paneles`} tone="blue" />
          </div>
        </div>
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
          <Metric
            label="Comisión de venta"
            value={money(result.saleCommission)}
            tone="gold"
            note={result.margin > 4000 ? "70% vendedor · 30% compañía" : ""}
          />
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
            <Metric label="Sistema base al 120%" value={`${result.panelsAt120} paneles`} />
            <Metric label="Sistema recomendado final" value={`${result.recommendedFinalPanels} paneles`} tone="gold" />
          </div>
        </div>
      </section>
    </div>
  );
}
