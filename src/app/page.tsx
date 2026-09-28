import Link from "next/link";
import { ArrowRight, Mail } from "lucide-react";
import { emailCounts, listApplications, recentEvents } from "@/lib/applications";
import { localDate } from "@/lib/sync";
import { connectedEmail } from "@/lib/google";
import { STATUSES, STATUS_LABEL, type Application, type Status } from "@/lib/types";
import { Card, CardHeader, StatusBadge, statusColor } from "@/components/ui";
import { ActivityHeatmap } from "@/components/ActivityHeatmap";
import { ApplicationsOverTime } from "@/components/ApplicationsOverTime";

export const dynamic = "force-dynamic";

const RESPONDED: Status[] = ["screening", "assessment", "interview", "offer", "rejected"];
const INTERVIEWED: Status[] = ["interview", "offer"];

function stats(apps: Application[]) {
  const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<Status, number>;
  const byDate: Record<string, number> = {};
  const byPlatform = new Map<string, number>();
  for (const a of apps) {
    byStatus[a.status]++;
    byDate[a.appliedOn] = (byDate[a.appliedOn] ?? 0) + 1;
    const p = a.platform?.trim() || "Unknown";
    byPlatform.set(p, (byPlatform.get(p) ?? 0) + 1);
  }
  const weekAgo = localDate(new Date(Date.now() - 7 * 86_400_000).toISOString());
  const active = byStatus.applied + byStatus.screening + byStatus.assessment + byStatus.interview;
  const responded = apps.filter((a) => RESPONDED.includes(a.status)).length;
  return {
    total: apps.length,
    active,
    thisWeek: apps.filter((a) => a.appliedOn >= weekAgo).length,
    interviews: apps.filter((a) => INTERVIEWED.includes(a.status)).length,
    offers: byStatus.offer,
    responseRate: apps.length ? Math.round((responded / apps.length) * 100) : 0,
    byStatus,
    byDate,
    platforms: [...byPlatform.entries()].sort((a, b) => b[1] - a[1]),
  };
}

function Tile({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card className="px-5 py-4">
      <p className="text-xs font-medium text-ink-2">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-ink">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </Card>
  );
}

function HBar({ label, count, max, color, total }: { label: React.ReactNode; count: number; max: number; color: string; total: number }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr_3.5rem] items-center gap-3 py-1 text-sm">
      <div className="truncate text-ink-2">{label}</div>
      <div className="h-2.5 rounded-full bg-surface-2">
        <div className="h-full rounded-full" style={{ width: `${max ? (count / max) * 100 : 0}%`, background: color }} />
      </div>
      <div className="tabular text-right text-ink">
        {count}
        <span className="ml-1 text-xs text-muted">{total ? Math.round((count / total) * 100) : 0}%</span>
      </div>
    </div>
  );
}

function when(iso: string) {
  return new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric" });
}

export default function OverviewPage() {
  const apps = listApplications();
  const s = stats(apps);
  const events = recentEvents(10);
  const emails = emailCounts();
  const email = connectedEmail();
  const statusMax = Math.max(...Object.values(s.byStatus));
  const topPlatforms = s.platforms.slice(0, 8);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-xl font-semibold">Overview</h1>
        <p className="text-sm text-ink-2">Your job search at a glance, built from your inbox.</p>
      </header>

      {!email && (
        <Card className="flex flex-wrap items-center gap-4 px-5 py-4">
          <Mail className="size-5 text-accent" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Connect Gmail to start tracking</p>
            <p className="text-xs text-ink-2">The app reads job-related emails (read-only) and builds your application list.</p>
          </div>
          <Link href="/settings" className="inline-flex items-center gap-1 text-sm font-medium text-accent">
            Go to Settings <ArrowRight className="size-4" />
          </Link>
        </Card>
      )}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Card className="col-span-2 px-5 py-4 md:col-span-1">
          <p className="text-xs font-medium text-ink-2">Applications submitted</p>
          <p className="mt-1 text-5xl font-semibold text-ink">{s.total}</p>
          <p className="mt-1 text-xs text-muted">+{s.thisWeek} in the last 7 days</p>
        </Card>
        <Tile label="Active" value={s.active} hint="Awaiting a decision" />
        <Tile label="Reached interview" value={s.interviews} />
        <Tile label="Offers" value={s.offers} />
        <Tile label="Response rate" value={`${s.responseRate}%`} hint="Heard back beyond confirmation" />
        <Tile label="Emails stored" value={emails.total} hint={`${emails.jobRelated} job-related`} />
      </section>

      <Card>
        <CardHeader title="Applications per day" subtitle="Each square is one day; darker means more applications submitted" />
        <div className="px-5 pb-4">
          <ActivityHeatmap counts={s.byDate} />
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="Applications over time" />
          <div className="px-5 pb-4">
            <ApplicationsOverTime counts={s.byDate} />
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader
            title="By status"
            action={
              <Link href="/applications" className="text-xs font-medium text-accent">
                Open board
              </Link>
            }
          />
          <div className="px-5 pb-4">
            {STATUSES.map((st) => (
              <HBar
                key={st}
                label={
                  <span className="inline-flex items-center gap-2">
                    <span className="size-2 rounded-full" style={{ background: statusColor(st) }} />
                    {STATUS_LABEL[st]}
                  </span>
                }
                count={s.byStatus[st]}
                max={statusMax}
                total={s.total}
                color={statusColor(st)}
              />
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="Recent updates" subtitle="Latest emails and status changes" />
          <ul className="divide-y divide-line px-5 pb-2">
            {events.length === 0 && <li className="py-6 text-center text-sm text-muted">No updates yet.</li>}
            {events.map((e) => (
              <li key={e.id} className="flex items-start gap-3 py-3">
                <div className="w-14 shrink-0 pt-0.5 text-xs text-muted">{when(e.occurredAt)}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">
                    <Link href={`/applications?open=${e.applicationId}`} className="font-medium hover:underline">
                      {e.company}
                    </Link>
                    {e.role && <span className="text-ink-2"> · {e.role}</span>}
                  </p>
                  <p className="truncate text-xs text-ink-2">{e.detail ?? e.title}</p>
                </div>
                {e.status && <StatusBadge status={e.status} />}
              </li>
            ))}
          </ul>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="By platform" subtitle="Where you applied" />
          <div className="px-5 pb-4">
            {topPlatforms.length === 0 && <p className="py-6 text-center text-sm text-muted">No data yet.</p>}
            {topPlatforms.map(([name, count]) => (
              <HBar key={name} label={name} count={count} max={topPlatforms[0][1]} total={s.total} color="var(--series-1)" />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
