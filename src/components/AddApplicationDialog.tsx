"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { sendJson } from "@/lib/client";
import { Button } from "./ui";
import { ApplicationFields, toPayload, type FormState } from "./ApplicationFields";

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** For applications that never produced an email (e.g. applied through a portal with no confirmation). */
export function AddApplicationDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState<FormState>({
    company: "",
    role: "",
    platform: "",
    status: "applied",
    appliedOn: today(),
    techArea: "",
    employmentModel: "",
    workplaceModel: "",
    location: "",
    jobUrl: "",
    notes: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await sendJson("/api/applications", "POST", toPayload(form));
      onCreated();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <form onSubmit={submit} className="relative w-full max-w-lg space-y-4 rounded-xl bg-surface p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Add application</h2>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            <X className="size-4" />
          </Button>
        </div>
        <ApplicationFields form={form} onChange={setForm} />
        {error && <p className="text-sm text-critical">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={saving || !form.company.trim()}>
            {saving ? "Adding…" : "Add application"}
          </Button>
        </div>
      </form>
    </div>
  );
}
