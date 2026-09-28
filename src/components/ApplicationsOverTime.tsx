"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Chip } from "./ui";

type Grain = "day" | "week" | "month";
const RANGE: Record<Grain, number> = { day: 30, week: 26, month: 12 };

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buckets(counts: Record<string, number>, grain: Grain) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const out: { key: string; label: string; tooltip: string; count: number }[] = [];

  if (grain === "day") {
    for (let i = RANGE.day - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      out.push({
        key: iso(d),
        label: d.toLocaleDateString("en", { month: "short", day: "numeric" }),
        tooltip: d.toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" }),
        count: counts[iso(d)] ?? 0,
      });
    }
  } else if (grain === "week") {
    const monday = new Date(today);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    for (let w = RANGE.week - 1; w >= 0; w--) {
      const start = new Date(monday);
      start.setDate(start.getDate() - w * 7);
      let count = 0;
      for (let d = 0; d < 7; d++) {
        const day = new Date(start);
        day.setDate(day.getDate() + d);
        count += counts[iso(day)] ?? 0;
      }
      const label = start.toLocaleDateString("en", { month: "short", day: "numeric" });
      out.push({ key: iso(start), label, tooltip: `Week of ${label}`, count });
    }
  } else {
    for (let m = RANGE.month - 1; m >= 0; m--) {
      const start = new Date(today.getFullYear(), today.getMonth() - m, 1);
      const prefix = iso(start).slice(0, 7);
      let count = 0;
      for (const [k, v] of Object.entries(counts)) if (k.startsWith(prefix)) count += v;
      out.push({
        key: prefix,
        label: start.toLocaleDateString("en", { month: "short" }),
        tooltip: start.toLocaleDateString("en", { month: "long", year: "numeric" }),
        count,
      });
    }
  }
  return out;
}

export function ApplicationsOverTime({ counts }: { counts: Record<string, number> }) {
  const [grain, setGrain] = useState<Grain>("week");
  const data = useMemo(() => buckets(counts, grain), [counts, grain]);
  const total = data.reduce((s, d) => s + d.count, 0);
  const periodLabel = grain === "day" ? "last 30 days" : grain === "week" ? "last 26 weeks" : "last 12 months";

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-ink-2">
          <span className="font-semibold text-ink">{total}</span> submitted in the {periodLabel}
        </p>
        <div className="flex gap-1.5">
          {(["day", "week", "month"] as Grain[]).map((g) => (
            <Chip key={g} active={grain === g} onClick={() => setGrain(g)}>
              {g === "day" ? "Daily" : g === "week" ? "Weekly" : "Monthly"}
            </Chip>
          ))}
        </div>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "var(--muted)" }}
              tickLine={false}
              axisLine={{ stroke: "var(--axis)" }}
              interval="preserveStartEnd"
              minTickGap={16}
            />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted)" }} tickLine={false} axisLine={false} />
            <Tooltip
              cursor={{ fill: "var(--surface-2)" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as (typeof data)[number];
                return (
                  <div className="rounded-md border border-line bg-surface px-2.5 py-1.5 text-xs shadow-md">
                    <div className="text-ink-2">{p.tooltip}</div>
                    <div className="tabular font-semibold text-ink">
                      {p.count} application{p.count === 1 ? "" : "s"}
                    </div>
                  </div>
                );
              }}
            />
            <Bar dataKey="count" fill="var(--series-1)" radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
