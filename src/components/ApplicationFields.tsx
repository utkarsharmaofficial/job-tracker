"use client";

import type { ReactNode } from "react";
import {
  EMPLOYMENT_MODELS,
  EMPLOYMENT_MODEL_LABEL,
  STATUSES,
  STATUS_LABEL,
  TECH_AREAS,
  TECH_AREA_LABEL,
  WORKPLACE_MODELS,
  WORKPLACE_MODEL_LABEL,
  type EmploymentModel,
  type Status,
  type TechArea,
  type WorkplaceModel,
} from "@/lib/types";
import { inputClass } from "./ui";

export type FormState = {
  company: string;
  role: string;
  platform: string;
  status: Status;
  appliedOn: string;
  techArea: TechArea | "";
  employmentModel: EmploymentModel | "";
  workplaceModel: WorkplaceModel | "";
  location: string;
  jobUrl: string;
  notes: string;
};

/** Convert the form into the API payload (empty strings become null). */
export function toPayload(f: FormState) {
  const n = (v: string) => (v.trim() ? v.trim() : null);
  return {
    company: f.company.trim(),
    role: n(f.role),
    platform: n(f.platform),
    status: f.status,
    appliedOn: f.appliedOn,
    techArea: f.techArea || null,
    employmentModel: f.employmentModel || null,
    workplaceModel: f.workplaceModel || null,
    location: n(f.location),
    jobUrl: n(f.jobUrl),
    notes: n(f.notes),
  };
}

function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={wide ? "col-span-2 block" : "block"}>
      <span className="mb-1 block text-xs font-medium text-ink-2">{label}</span>
      {children}
    </label>
  );
}

function Select<T extends string>({
  value,
  options,
  labels,
  onChange,
  allowEmpty,
}: {
  value: T | "";
  options: readonly T[];
  labels: Record<T, string>;
  onChange: (v: T | "") => void;
  allowEmpty?: boolean;
}) {
  return (
    <select className={inputClass} value={value} onChange={(e) => onChange(e.target.value as T | "")}>
      {allowEmpty && <option value="">Not set</option>}
      {options.map((o) => (
        <option key={o} value={o}>
          {labels[o]}
        </option>
      ))}
    </select>
  );
}

export function ApplicationFields({ form, onChange }: { form: FormState; onChange: (f: FormState) => void }) {
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => onChange({ ...form, [key]: value });
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="Company">
        <input className={inputClass} value={form.company} onChange={(e) => set("company", e.target.value)} required />
      </Field>
      <Field label="Role">
        <input className={inputClass} value={form.role} onChange={(e) => set("role", e.target.value)} />
      </Field>
      <Field label="Status">
        <Select value={form.status} options={STATUSES} labels={STATUS_LABEL} onChange={(v) => set("status", v as Status)} />
      </Field>
      <Field label="Applied on">
        <input type="date" className={inputClass} value={form.appliedOn} onChange={(e) => set("appliedOn", e.target.value)} required />
      </Field>
      <Field label="Platform">
        <input
          className={inputClass}
          value={form.platform}
          placeholder="LinkedIn, Naukri, Company site…"
          onChange={(e) => set("platform", e.target.value)}
        />
      </Field>
      <Field label="Location">
        <input className={inputClass} value={form.location} onChange={(e) => set("location", e.target.value)} />
      </Field>
      <Field label="Tech area">
        <Select value={form.techArea} options={TECH_AREAS} labels={TECH_AREA_LABEL} onChange={(v) => set("techArea", v)} allowEmpty />
      </Field>
      <Field label="Employment">
        <Select
          value={form.employmentModel}
          options={EMPLOYMENT_MODELS}
          labels={EMPLOYMENT_MODEL_LABEL}
          onChange={(v) => set("employmentModel", v)}
          allowEmpty
        />
      </Field>
      <Field label="Workplace">
        <Select
          value={form.workplaceModel}
          options={WORKPLACE_MODELS}
          labels={WORKPLACE_MODEL_LABEL}
          onChange={(v) => set("workplaceModel", v)}
          allowEmpty
        />
      </Field>
      <Field label="Job URL">
        <input className={inputClass} value={form.jobUrl} onChange={(e) => set("jobUrl", e.target.value)} />
      </Field>
      <Field label="Notes" wide>
        <textarea
          className={`${inputClass} h-20 py-2`}
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
        />
      </Field>
    </div>
  );
}
