import { CheckCircle2, Circle } from "lucide-react";
import { ollamaStatus } from "@/lib/classify";
import { appUrl, connectedEmail, googleConfigured } from "@/lib/google";
import { getKv } from "@/lib/db";
import { ghostedDays, hasSyncStart } from "@/lib/sync";
import { Card, CardHeader } from "@/components/ui";
import { GmailConnection, SyncSettings } from "@/components/SettingsForms";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  google_not_configured: "Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.local, then restart the app.",
  invalid_oauth_state: "The Google sign-in expired or was tampered with. Please try again.",
  token_exchange_failed: "Google sign-in failed. Check that the redirect URI in Google Cloud matches exactly.",
  access_denied: "Google access was declined.",
};

function Step({ done, title, children }: { done: boolean; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      {done ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" /> : <Circle className="mt-0.5 size-5 shrink-0 text-muted" />}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        <div className="mt-1 space-y-1 text-sm text-ink-2">{children}</div>
      </div>
    </li>
  );
}

export default async function SettingsPage(props: PageProps<"/settings">) {
  const params = await props.searchParams;
  const error = typeof params.error === "string" ? (ERRORS[params.error] ?? params.error) : null;
  const email = connectedEmail();
  const ollama = await ollamaStatus();
  const redirect = `${appUrl()}/api/auth/google/callback`;
  const syncStart = getKv("sync_start_at");
  const syncFrom =
    !syncStart || new Date(syncStart).getTime() === 0
      ? "all emails"
      : `emails since ${new Date(syncStart).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-ink-2">Everything is stored locally in <code className="text-xs">data/job-tracker.db</code>.</p>
      </header>

      {error && <Card className="border-critical/40 px-5 py-3 text-sm text-critical">{error}</Card>}
      {params.connected && (
        <Card className="px-5 py-3 text-sm text-success">Gmail connected. The first sync has started, reading {syncFrom}.</Card>
      )}

      <Card>
        <CardHeader title="Setup" subtitle="Three one-time steps" />
        <ol className="space-y-5 px-5 pb-5">
          <Step done={ollama.running && ollama.modelReady} title="1. Local AI model (Ollama)">
            <p>
              Emails are sorted by <span className="font-medium">{ollama.model}</span> running on this Mac, so nothing is sent
              to an AI company.
            </p>
            {!ollama.running && (
              <p className="text-critical">
                Ollama isn&apos;t running. Start it with <code className="text-xs">brew services start ollama</code>.
              </p>
            )}
            {ollama.running && !ollama.modelReady && (
              <p className="text-critical">
                The model isn&apos;t downloaded yet. Run <code className="text-xs">ollama pull {ollama.model}</code>.
              </p>
            )}
          </Step>
          <Step done={googleConfigured()} title="2. Google OAuth client">
            <p>In Google Cloud Console (console.cloud.google.com):</p>
            <ol className="list-decimal space-y-0.5 pl-5">
              <li>Create a project, then enable the <span className="font-medium">Gmail API</span> (APIs &amp; Services → Library).</li>
              <li>
                OAuth consent screen: user type <span className="font-medium">External</span>, add your Gmail address as a{" "}
                <span className="font-medium">test user</span>, add the scope <code className="text-xs">gmail.readonly</code>.
              </li>
              <li>
                Credentials → Create OAuth client ID → <span className="font-medium">Web application</span>, with authorized
                redirect URI <code className="rounded bg-surface-2 px-1 text-xs break-all">{redirect}</code>
              </li>
              <li>
                Put the client ID and secret into <code className="text-xs">.env.local</code> as{" "}
                <code className="text-xs">GOOGLE_CLIENT_ID</code> and <code className="text-xs">GOOGLE_CLIENT_SECRET</code>, then
                restart <code className="text-xs">npm run dev</code>.
              </li>
            </ol>
          </Step>
          <Step done={Boolean(email)} title="3. Connect Gmail">
            <GmailConnection email={email} canConnect={googleConfigured()} firstSync={!hasSyncStart()} />
            <p className="text-xs text-muted">
              While the Google app is in &quot;Testing&quot; mode, Google expires the sign-in after 7 days. If sync reports
              that access expired, just click Reconnect.
            </p>
          </Step>
        </ol>
      </Card>

      <Card>
        <CardHeader title="Sync" />
        <div className="px-5 pb-5">
          <SyncSettings
            intervalHours={Number(getKv("sync_interval_hours") ?? 6)}
            ghostedDays={ghostedDays()}
          />
        </div>
      </Card>
    </div>
  );
}
