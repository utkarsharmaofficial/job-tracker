"use client";

import { useMemo, useState } from "react";

const CELL = 12;
const GAP = 3;
const DAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", ""];

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function level(count: number, max: number): number {
  if (count === 0) return 0;
  if (max <= 4) return Math.min(count, 4);
  return Math.min(4, Math.ceil((count / max) * 4));
}

/** GitHub-style calendar: one cell per day, darker = more applications submitted that day. */
export function ActivityHeatmap({ counts, weeks = 26 }: { counts: Record<string, number>; weeks?: number }) {
  const [hover, setHover] = useState<{ date: string; count: number; x: number; y: number } | null>(null);

  const { columns, max, months } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Start on the Monday `weeks` weeks ago.
    const start = new Date(today);
    const dow = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - dow - (weeks - 1) * 7);

    const columns: { date: string; count: number; future: boolean }[][] = [];
    const months: { label: string; col: number }[] = [];
    let max = 0;
    const cursor = new Date(start);
    for (let w = 0; w < weeks; w++) {
      const col = [];
      for (let d = 0; d < 7; d++) {
        const key = iso(cursor);
        const count = counts[key] ?? 0;
        max = Math.max(max, count);
        if (d === 0 && (w === 0 || cursor.getDate() <= 7)) {
          // Drop the partial first month's label if the next one would collide with it.
          if (months.length === 1 && w - months[0].col < 3) months.pop();
          months.push({ label: cursor.toLocaleString("en", { month: "short" }), col: w });
        }
        col.push({ date: key, count, future: cursor > today });
        cursor.setDate(cursor.getDate() + 1);
      }
      columns.push(col);
    }
    return { columns, max, months };
  }, [counts, weeks]);

  const left = 30;
  const top = 18;
  const width = left + weeks * (CELL + GAP);
  const height = top + 7 * (CELL + GAP);

  return (
    <div className="relative">
      <div className="overflow-x-auto">
        <svg width={width} height={height} role="img" aria-label="Applications submitted per day">
          {months.map((m) => (
            <text key={`${m.label}-${m.col}`} x={left + m.col * (CELL + GAP)} y={11} fontSize={10} fill="var(--muted)">
              {m.label}
            </text>
          ))}
          {DAY_LABELS.map((l, i) =>
            l ? (
              <text key={l} x={0} y={top + i * (CELL + GAP) + CELL - 2} fontSize={10} fill="var(--muted)">
                {l}
              </text>
            ) : null,
          )}
          {columns.map((col, w) =>
            col.map((cell, d) =>
              cell.future ? null : (
                <rect
                  key={cell.date}
                  x={left + w * (CELL + GAP)}
                  y={top + d * (CELL + GAP)}
                  width={CELL}
                  height={CELL}
                  rx={3}
                  fill={`var(--heat-${level(cell.count, max)})`}
                  stroke={hover?.date === cell.date ? "var(--ink)" : "none"}
                  strokeWidth={1.5}
                  onMouseEnter={(e) => {
                    const box = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                    const r = e.currentTarget.getBoundingClientRect();
                    setHover({ date: cell.date, count: cell.count, x: r.left - box.left + CELL / 2, y: r.top - box.top });
                  }}
                  onMouseLeave={() => setHover(null)}
                />
              ),
            ),
          )}
        </svg>
      </div>
      {hover && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border border-line bg-surface px-2 py-1 text-xs whitespace-nowrap text-ink shadow-md"
          style={{ left: hover.x, top: hover.y - 6 }}
        >
          <span className="font-semibold">{hover.count}</span>{" "}
          <span className="text-ink-2">
            application{hover.count === 1 ? "" : "s"} ·{" "}
            {new Date(`${hover.date}T00:00`).toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" })}
          </span>
        </div>
      )}
      <div className="mt-2 flex items-center justify-end gap-1.5 text-[11px] text-muted">
        Less
        {[0, 1, 2, 3, 4].map((l) => (
          <span key={l} className="size-2.5 rounded-[3px]" style={{ background: `var(--heat-${l})` }} />
        ))}
        More
      </div>
    </div>
  );
}
