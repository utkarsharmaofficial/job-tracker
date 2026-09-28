"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { ArrowDown, ArrowUp, Columns3, Plus, Search, Table2 } from "lucide-react";
import {
  EMPLOYMENT_MODELS,
  EMPLOYMENT_MODEL_LABEL,
  STATUSES,
  STATUS_LABEL,
  TECH_AREAS,
  TECH_AREA_LABEL,
  WORKPLACE_MODELS,
  WORKPLACE_MODEL_LABEL,
  type Application,
  type Status,
} from "@/lib/types";
import { formatDate, sendJson } from "@/lib/client";
import { useStoredChoice } from "@/lib/useStoredChoice";
import { Button, Card, Chip, StatusBadge, inputClass, statusColor } from "./ui";
import { ApplicationDrawer } from "./ApplicationDrawer";
import { AddApplicationDialog } from "./AddApplicationDialog";

type View = "board" | "table";
type SortKey = "company" | "status" | "appliedOn" | "lastActivityAt" | "platform";

function toggle<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

function FilterRow<T extends string>({
  label,
  options,
  labels,
  selected,
  onChange,
}: {
  label: string;
  options: readonly T[];
  labels: Record<T, string>;
  selected: Set<T>;
  onChange: (s: Set<T>) => void;
}) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      <span className="w-24 shrink-0 text-xs font-medium text-muted">{label}</span>
      {options.map((o) => (
        <Chip key={o} active={selected.has(o)} onClick={() => onChange(toggle(selected, o))}>
          {labels[o]}
        </Chip>
      ))}
    </div>
  );
}

export function ApplicationsView({ apps, initialOpenId }: { apps: Application[]; initialOpenId: number | null }) {
  const router = useRouter();
  const [view, setView] = useStoredChoice<View>("applications-view", ["board", "table"], "board");
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState("");
  const [statuses, setStatuses] = useState<Set<Status>>(new Set());
  const [tech, setTech] = useState<Set<(typeof TECH_AREAS)[number]>>(new Set());
  const [employment, setEmployment] = useState<Set<(typeof EMPLOYMENT_MODELS)[number]>>(new Set());
  const [workplace, setWorkplace] = useState<Set<(typeof WORKPLACE_MODELS)[number]>>(new Set());
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "lastActivityAt", dir: -1 });
  const [openId, setOpenId] = useState<number | null>(initialOpenId);
  const [adding, setAdding] = useState(false);
  const [dragOver, setDragOver] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);

  const platforms = useMemo(
    () => [...new Set(apps.map((a) => a.platform).filter((p): p is string => Boolean(p)))].sort(),
    [apps],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return apps.filter(
      (a) =>
        (!q || `${a.company} ${a.role ?? ""} ${a.location ?? ""}`.toLowerCase().includes(q)) &&
        (!platform || a.platform === platform) &&
        (statuses.size === 0 || statuses.has(a.status)) &&
        (tech.size === 0 || (a.techArea && tech.has(a.techArea))) &&
        (employment.size === 0 || (a.employmentModel && employment.has(a.employmentModel))) &&
        (workplace.size === 0 || (a.workplaceModel && workplace.has(a.workplaceModel))),
    );
  }, [apps, query, platform, statuses, tech, employment, workplace]);

  const sorted = useMemo(() => {
    const rank = (s: Status) => STATUSES.indexOf(s);
    return [...filtered].sort((a, b) => {
      const k = sort.key;
      const av = k === "status" ? rank(a.status) : (a[k] ?? "");
      const bv = k === "status" ? rank(b.status) : (b[k] ?? "");
      return (av < bv ? -1 : av > bv ? 1 : 0) * sort.dir;
    });
  }, [filtered, sort]);

  const anyFilter = query || platform || statuses.size || tech.size || employment.size || workplace.size;

  async function moveTo(id: number, status: Status) {
    const app = apps.find((a) => a.id === id);
    if (!app || app.status === status) return;
    setError(null);
    try {
      await sendJson(`/api/applications/${id}`, "PATCH", { status });
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function header(key: SortKey, label: string) {
    const active = sort.key === key;
    return (
      <th className="px-3 py-2 text-left font-medium whitespace-nowrap">
        <button
          type="button"
          className="inline-flex items-center gap-1 hover:text-ink"
          onClick={() => setSort({ key, dir: active ? ((-sort.dir) as 1 | -1) : 1 })}
        >
          {label}
          {active && (sort.dir === 1 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
        </button>
      </th>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Applications</h1>
          <p className="text-sm text-ink-2">
            {filtered.length === apps.length ? `${apps.length} applications` : `${filtered.length} of ${apps.length} applications`}
            {view === "board" && " · drag a card to change its status"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-line bg-surface p-0.5">
            {(["board", "table"] as View[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={clsx(
                  "flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm",
                  view === v ? "bg-surface-2 font-medium text-ink" : "text-ink-2",
                )}
              >
                {v === "board" ? <Columns3 className="size-4" /> : <Table2 className="size-4" />}
                {v === "board" ? "Board" : "Table"}
              </button>
            ))}
          </div>
          <Button variant="primary" onClick={() => setAdding(true)}>
            <Plus className="size-4" /> Add
          </Button>
        </div>
      </header>

      <Card className="space-y-2 px-4 py-3">
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-48 flex-1">
            <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted" />
            <input
              className={`${inputClass} pl-9`}
              placeholder="Search company, role, location"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select className={`${inputClass} sm:w-52`} value={platform} onChange={(e) => setPlatform(e.target.value)}>
            <option value="">All platforms</option>
            {platforms.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          {anyFilter ? (
            <Button
              variant="ghost"
              onClick={() => {
                setQuery("");
                setPlatform("");
                setStatuses(new Set());
                setTech(new Set());
                setEmployment(new Set());
                setWorkplace(new Set());
              }}
            >
              Clear filters
            </Button>
          ) : null}
        </div>
        {view === "table" && (
          <FilterRow label="Status" options={STATUSES} labels={STATUS_LABEL} selected={statuses} onChange={setStatuses} />
        )}
        <FilterRow label="Tech area" options={TECH_AREAS} labels={TECH_AREA_LABEL} selected={tech} onChange={setTech} />
        <FilterRow
          label="Employment"
          options={EMPLOYMENT_MODELS}
          labels={EMPLOYMENT_MODEL_LABEL}
          selected={employment}
          onChange={setEmployment}
        />
        <FilterRow
          label="Workplace"
          options={WORKPLACE_MODELS}
          labels={WORKPLACE_MODEL_LABEL}
          selected={workplace}
          onChange={setWorkplace}
        />
      </Card>

      {error && <p className="text-sm text-critical">{error}</p>}

      {view === "board" ? (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STATUSES.map((status) => {
            const items = sorted.filter((a) => a.status === status);
            return (
              <div
                key={status}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(status);
                }}
                onDragLeave={() => setDragOver((s) => (s === status ? null : s))}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(null);
                  moveTo(Number(e.dataTransfer.getData("text/plain")), status);
                }}
                className={clsx(
                  "flex w-64 shrink-0 flex-col rounded-xl border bg-surface-2/60 transition-colors",
                  dragOver === status ? "border-accent" : "border-transparent",
                )}
              >
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <span className="size-2.5 rounded-full" style={{ background: statusColor(status) }} />
                  <span className="text-sm font-semibold">{STATUS_LABEL[status]}</span>
                  <span className="tabular ml-auto text-xs text-muted">{items.length}</span>
                </div>
                <div className="flex max-h-[65vh] min-h-24 flex-col gap-2 overflow-y-auto px-2 pb-2">
                  {items.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("text/plain", String(a.id))}
                      onClick={() => setOpenId(a.id)}
                      className="rounded-lg border border-line bg-surface p-3 text-left shadow-sm transition-shadow hover:shadow-md"
                    >
                      <p className="truncate text-sm font-medium">{a.company}</p>
                      {a.role && <p className="truncate text-xs text-ink-2">{a.role}</p>}
                      <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted">
                        <span className="truncate">{a.platform ?? "—"}</span>
                        <span className="shrink-0">{formatDate(a.appliedOn)}</span>
                      </div>
                      {(a.techArea || a.workplaceModel) && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {a.techArea && (
                            <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] text-ink-2">
                              {TECH_AREA_LABEL[a.techArea]}
                            </span>
                          )}
                          {a.workplaceModel && (
                            <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] text-ink-2">
                              {WORKPLACE_MODEL_LABEL[a.workplaceModel]}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  ))}
                  {items.length === 0 && <p className="py-4 text-center text-xs text-muted">Nothing here</p>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="border-b border-line text-xs text-ink-2">
              <tr>
                {header("company", "Company")}
                <th className="px-3 py-2 text-left font-medium">Role</th>
                {header("status", "Status")}
                {header("platform", "Platform")}
                {header("appliedOn", "Applied")}
                {header("lastActivityAt", "Last update")}
                <th className="px-3 py-2 text-left font-medium">Tech</th>
                <th className="px-3 py-2 text-left font-medium">Employment</th>
                <th className="px-3 py-2 text-left font-medium">Workplace</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {sorted.map((a) => (
                <tr key={a.id} onClick={() => setOpenId(a.id)} className="cursor-pointer hover:bg-surface-2">
                  <td className="px-3 py-2.5 font-medium">{a.company}</td>
                  <td className="max-w-56 truncate px-3 py-2.5 text-ink-2">{a.role ?? "—"}</td>
                  <td className="px-3 py-2.5">
                    <StatusBadge status={a.status} locked={a.statusLocked} />
                  </td>
                  <td className="px-3 py-2.5 text-ink-2">{a.platform ?? "—"}</td>
                  <td className="tabular px-3 py-2.5 whitespace-nowrap text-ink-2">{formatDate(a.appliedOn)}</td>
                  <td className="tabular px-3 py-2.5 whitespace-nowrap text-ink-2">{formatDate(a.lastActivityAt)}</td>
                  <td className="px-3 py-2.5 text-ink-2">{a.techArea ? TECH_AREA_LABEL[a.techArea] : "—"}</td>
                  <td className="px-3 py-2.5 text-ink-2">
                    {a.employmentModel ? EMPLOYMENT_MODEL_LABEL[a.employmentModel] : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-ink-2">
                    {a.workplaceModel ? WORKPLACE_MODEL_LABEL[a.workplaceModel] : "—"}
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-muted">
                    No applications match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      )}

      {openId !== null && (
        <ApplicationDrawer
          id={openId}
          onClose={() => {
            setOpenId(null);
            if (initialOpenId) router.replace("/applications");
          }}
          onChanged={() => router.refresh()}
        />
      )}
      {adding && (
        <AddApplicationDialog
          onClose={() => setAdding(false)}
          onCreated={() => {
            setAdding(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
