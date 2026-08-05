import type { ReactNode } from "react";

export function money(value: number) {
  return new Intl.NumberFormat("es-PR", {
    style: "currency",
    currency: "USD",
  }).format(Number(value) || 0);
}

export function number(value: number, digits = 0) {
  return new Intl.NumberFormat("es-PR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number(value) || 0);
}

type FieldProps = {
  label: string;
  children: ReactNode;
  full?: boolean;
};

export function Field({ label, children, full = false }: FieldProps) {
  return (
    <label className={full ? "field full" : "field"}>
      <span>{label}</span>
      {children}
    </label>
  );
}

type MetricProps = {
  label: string;
  value: string;
  tone?: "blue" | "gold" | "green" | "soft";
  note?: string;
};

export function Metric({ label, value, tone = "soft", note = "" }: MetricProps) {
  return (
    <div className={`metric-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {note ? <small>{note}</small> : null}
    </div>
  );
}
