import "server-only";
import { auth, gmail as gmailApi, type gmail_v1 } from "@googleapis/gmail";
import { getKv, setKv } from "./db";

export const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
const TOKENS_KEY = "google_tokens";
const EMAIL_KEY = "google_email";

export function appUrl(): string {
  return process.env.APP_URL ?? "http://localhost:3000";
}

export function googleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function oauthClient() {
  if (!googleConfigured()) {
    throw new Error("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are not set in .env.local");
  }
  const client = new auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${appUrl()}/api/auth/google/callback`,
  );
  // Persist refreshed access tokens; Google only sends refresh_token on first consent.
  client.on("tokens", (tokens) => {
    const prev = JSON.parse(getKv(TOKENS_KEY) ?? "{}");
    setKv(TOKENS_KEY, JSON.stringify({ ...prev, ...tokens }));
  });
  return client;
}

export function authUrl(state: string): string {
  return oauthClient().generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [GMAIL_SCOPE],
    state,
  });
}

export async function handleCallback(code: string) {
  const client = oauthClient();
  const { tokens } = await client.getToken(code);
  setKv(TOKENS_KEY, JSON.stringify(tokens));
  client.setCredentials(tokens);
  const profile = await gmailApi({ version: "v1", auth: client }).users.getProfile({ userId: "me" });
  setKv(EMAIL_KEY, profile.data.emailAddress ?? "");
}

export function connectedEmail(): string | null {
  return getKv(TOKENS_KEY) ? getKv(EMAIL_KEY) : null;
}

export function disconnect() {
  setKv(TOKENS_KEY, null);
  setKv(EMAIL_KEY, null);
}

export function gmailClient(): gmail_v1.Gmail {
  const raw = getKv(TOKENS_KEY);
  if (!raw) throw new Error("Gmail is not connected. Connect it on the Settings page.");
  const client = oauthClient();
  client.setCredentials(JSON.parse(raw));
  return gmailApi({ version: "v1", auth: client });
}
