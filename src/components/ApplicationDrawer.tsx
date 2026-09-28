"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Lock, LockOpen, Mail, RefreshCcw, Trash2, X } from "lucide-react";
import type { Application, TimelineEvent } from "@/lib/types";
import { formatDate, sendJson } from "@/lib/client";
import { Button, StatusBadge, statusColor } from "./ui";
import { ApplicationFields, toPayload, type FormState } from "./ApplicationFields";

function toForm(a: Application): FormState {
  return {
    company: a.company,
    role: a.role ?? "",
    platform: a.platform ?? "",
    status: a.status,
    appliedOn: a.appliedOn,
    techArea: a.techArea ?? "",
    employmentModel: a.employmentModel ?? "",
    workplaceModel: a.workplaceModel ?? "",
    location: a.location ?? "",
    jobUrl: a.jobUrl ?? "",
    notes: a.notes ?? "",
  };
}

export function ApplicationDrawer({ id, onClose, onChanged }: { id: number; onClose: () => void; onChanged: () => void }) {
  const [app, setApp] = useState<Application | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/applications/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Application not found"))))
      .then((data: { app: Application; events: TimelineEvent[] }) => {
        if (cancelled) return;
        setApp(data.app);
        setEvents(data.events);
        setForm(toForm(data.app));
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function patch(body: object) {
    setSaving(true);
    setError(null);
    try {
      const data = await sendJson<{ app: Application; events: TimelineEvent[] }>(`/api/applications/${id}`, "PATCH", body);
      setApp(data.app);
      setEvents(data.events);
      setForm(toForm(data.app));
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!app || !confirm(`Delete the ${app.company} application from the tracker? Your emails are not touched.`)) return;
    await sendJson(`/api/applications/${id}`, "DELETE");
    onChanged();
    onClose();
  }

  const dirty = app && form && JSON.stringify(toPayload(form)) !== JSON.stringify(toPayload(toForm(app)));

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-xl flex-col bg-surface shadow-2xl">
        <div className="flex items-start gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-semibold">{app?.company ?? "Loading…"}</h2>
            {app?.role && <p className="truncate text-sm text-ink-2">{app.role}</p>}
            {app && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusBadge status={app.status} />
                <span className="text-xs text-muted">
                  Applied {formatDate(app.appliedOn)} · {app.emailCount} email{app.emailCount === 1 ? "" : "s"}
                </span>
              </div>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          {error && <p className="text-sm text-critical">{error}</p>}

          {app && (
            <div className="flex items-center gap-3 rounded-lg bg-surface-2 px-3 py-2.5 text-xs text-ink-2">
              {app.statusLocked ? <Lock className="size-4 shrink-0" /> : <RefreshCcw className="size-4 shrink-0" />}
              <span className="flex-1">
                {app.statusLocked
                  ? "Status was set by you, so new emails won't change it."
                  : "Status updates automatically from new emails."}
              </span>
              {app.statusLocked && (
                <Button size="sm" variant="secondary" disabled={saving} onClick={() => patch({ statusLocked: false })}>
                  <LockOpen className="size-3.5" /> Let emails update it
                </Button>
              )}
            </div>
          )}

          {form && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                patch(toPayload(form));
              }}
              className="space-y-3"
            >
              <ApplicationFields form={form} onChange={setForm} />
              <div className="flex items-center gap-2">
                <Button type="submit" variant="primary" disabled={!dirty || saving}>
                  {saving ? "Saving…" : "Save changes"}
                </Button>
                {app?.jobUrl && (
                  <a
                    href={app.jobUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-accent"
                  >
                    Job posting <ExternalLink className="size-3.5" />
                  </a>
                )}
                <Button type="button" variant="danger" className="ml-auto" onClick={remove}>
                  <Trash2 className="size-4" /> Delete
                </Button>
              </div>
            </form>
          )}

          <section>
            <h3 className="mb-3 text-sm font-semibold">Timeline</h3>
            <ol className="relative space-y-4 border-l border-line pl-5">
              {events.map((e) => (
                <li key={e.id} className="relative">
                  <span
                    className="absolute top-1.5 -left-[25px] size-2.5 rounded-full ring-4 ring-surface"
                    style={{ background: e.status ? statusColor(e.status) : "var(--muted)" }}
                  />
                  <div className="flex items-center gap-2 text-xs text-muted">
                    {formatDate(e.occurredAt)}
                    {e.kind === "email" && <Mail className="size-3" />}
                    {e.status && e.kind !== "email" && <StatusBadge status={e.status} />}
                  </div>
                  <p className="mt-0.5 text-sm font-medium">{e.title}</p>
                  {e.detail && <p className="text-sm text-ink-2">{e.detail}</p>}
                  {e.gmailId && (
                    <a
                      href={`https://mail.google.com/mail/u/0/#all/${e.gmailId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-xs text-accent"
                    >
                      Open in Gmail <ExternalLink className="size-3" />
                    </a>
                  )}
                </li>
              ))}
              {events.length === 0 && <li className="text-sm text-muted">No events yet.</li>}
            </ol>
          </section>
        </div>
      </aside>
    </div>
  );
}
