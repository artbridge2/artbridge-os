import "server-only";
import { google, type gmail_v1 } from "googleapis";
import { createAdminClient } from "@/lib/supabase/admin";
import { plainTextFromHtml, sanitizeEmailHtml } from "./sanitize";

// Least-privilege on purpose: we track state (status/owner/priority) in our
// own DB, not Gmail labels, so we never need gmail.modify.
export const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
];

function redirectUri(): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return `${site}/api/gmail/callback`;
}

function oauthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not configured");
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri());
}

/** URL to send the user to for the one-time Google consent flow. */
export function getConsentUrl(state: string): string {
  return oauthClient().generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // ensures a refresh_token is issued even on re-auth
    scope: GMAIL_SCOPES,
    state,
  });
}

export async function exchangeCodeForTokens(code: string) {
  const { tokens } = await oauthClient().getToken(code);
  return tokens;
}

/** Loads the stored refresh token and returns an authorized Gmail client, keeping the cached access token fresh in the DB as googleapis silently refreshes it. */
async function getAuthorizedClient(): Promise<gmail_v1.Gmail> {
  const admin = createAdminClient();
  const { data: integration, error } = await admin
    .from("gmail_integration")
    .select("*")
    .order("connected_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !integration) throw new Error("Gmail is not connected yet");

  const auth = oauthClient();
  auth.setCredentials({
    refresh_token: integration.refresh_token,
    access_token: integration.access_token ?? undefined,
    expiry_date: integration.token_expires_at
      ? new Date(integration.token_expires_at).getTime()
      : undefined,
  });

  auth.on("tokens", (tokens) => {
    if (!tokens.access_token) return;
    void admin
      .from("gmail_integration")
      .update({
        access_token: tokens.access_token,
        token_expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
      })
      .eq("id", integration.id);
  });

  return google.gmail({ version: "v1", auth });
}

function decodeBase64Url(data: string): string {
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
}

/** Walks a Gmail message payload to find the best body: prefers text/plain, sanitizes text/html as a fallback. */
function extractBody(payload: gmail_v1.Schema$MessagePart | undefined): string {
  if (!payload) return "";

  const found: { plain: string | null; html: string | null } = { plain: null, html: null };

  function walk(part: gmail_v1.Schema$MessagePart) {
    if (part.mimeType === "text/plain" && part.body?.data && !found.plain) {
      found.plain = decodeBase64Url(part.body.data);
    } else if (part.mimeType === "text/html" && part.body?.data && !found.html) {
      found.html = decodeBase64Url(part.body.data);
    }
    part.parts?.forEach(walk);
  }
  walk(payload);

  if (found.plain) return found.plain.trim();
  if (found.html) return plainTextFromHtml(found.html);
  return "";
}

function headerValue(
  headers: gmail_v1.Schema$MessagePartHeader[] | undefined,
  name: string
): string | null {
  return headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? null;
}

export interface FetchedMessage {
  gmailMessageId: string;
  sender: string | null;
  recipients: string[];
  isInbound: boolean;
  body: string;
  sentAt: string | null;
}

export interface FetchedThread {
  gmailThreadId: string;
  subject: string | null;
  participants: string[];
  snippet: string | null;
  messages: FetchedMessage[];
}

async function toFetchedThread(
  thread: gmail_v1.Schema$Thread,
  myEmail: string
): Promise<FetchedThread> {
  const messages = thread.messages ?? [];
  const participants = new Set<string>();
  let subject: string | null = null;

  const fetched: FetchedMessage[] = messages.map((m) => {
    const headers = m.payload?.headers ?? undefined;
    const from = headerValue(headers, "From");
    const to = headerValue(headers, "To");
    const date = headerValue(headers, "Date");
    if (!subject) subject = headerValue(headers, "Subject");
    if (from) participants.add(from);
    to?.split(",").forEach((r) => participants.add(r.trim()));

    return {
      gmailMessageId: m.id!,
      sender: from,
      recipients: to ? to.split(",").map((r) => r.trim()) : [],
      isInbound: from ? !from.toLowerCase().includes(myEmail.toLowerCase()) : true,
      body: extractBody(m.payload),
      sentAt: date ? new Date(date).toISOString() : m.internalDate ? new Date(Number(m.internalDate)).toISOString() : null,
    };
  });

  return {
    gmailThreadId: thread.id!,
    subject,
    participants: [...participants],
    snippet: thread.snippet ?? null,
    messages: fetched,
  };
}

/** Lists thread IDs from the last `days` days (used for the one-time initial backfill). */
export async function listRecentThreadIds(days: number): Promise<string[]> {
  const gmail = await getAuthorizedClient();
  const after = new Date(Date.now() - days * 86_400_000);
  const query = `after:${after.getFullYear()}/${after.getMonth() + 1}/${after.getDate()}`;

  const ids: string[] = [];
  let pageToken: string | undefined;
  do {
    const { data } = await gmail.users.threads.list({
      userId: "me",
      q: query,
      pageToken,
      maxResults: 100,
    });
    (data.threads ?? []).forEach((t) => t.id && ids.push(t.id));
    pageToken = data.nextPageToken ?? undefined;
  } while (pageToken);

  return ids;
}

export async function getThread(gmailThreadId: string, myEmail: string): Promise<FetchedThread> {
  const gmail = await getAuthorizedClient();
  const { data } = await gmail.users.threads.get({
    userId: "me",
    id: gmailThreadId,
    format: "full",
  });
  return toFetchedThread(data, myEmail);
}

/** IDs of threads touched since `startHistoryId` (incremental sync). Returns null if the history window has expired and a full resync is needed. */
export async function listChangedThreadIds(startHistoryId: string): Promise<string[] | null> {
  const gmail = await getAuthorizedClient();
  const threadIds = new Set<string>();
  let pageToken: string | undefined;

  try {
    do {
      const { data } = await gmail.users.history.list({
        userId: "me",
        startHistoryId,
        historyTypes: ["messageAdded"],
        pageToken,
      });
      (data.history ?? []).forEach((h) =>
        h.messagesAdded?.forEach((m) => m.message?.threadId && threadIds.add(m.message.threadId))
      );
      pageToken = data.nextPageToken ?? undefined;
    } while (pageToken);
  } catch (err: unknown) {
    const status = (err as { code?: number })?.code;
    if (status === 404) return null; // historyId too old — caller should full-resync
    throw err;
  }

  return [...threadIds];
}

export async function getCurrentHistoryId(): Promise<string> {
  const gmail = await getAuthorizedClient();
  const { data } = await gmail.users.getProfile({ userId: "me" });
  return data.historyId!;
}

function buildRawMessage(opts: {
  to: string;
  subject: string;
  body: string;
  inReplyTo?: string | null;
  from: string;
}): string {
  const headers = [
    `From: ${opts.from}`,
    `To: ${opts.to}`,
    `Subject: ${opts.subject}`,
    "Content-Type: text/plain; charset=utf-8",
    ...(opts.inReplyTo ? [`In-Reply-To: ${opts.inReplyTo}`, `References: ${opts.inReplyTo}`] : []),
  ];
  const raw = `${headers.join("\r\n")}\r\n\r\n${opts.body}`;
  return Buffer.from(raw).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function sendReply(opts: {
  gmailThreadId: string;
  to: string;
  subject: string;
  body: string;
  from: string;
  inReplyToRfc822MessageId?: string | null;
}): Promise<void> {
  const gmail = await getAuthorizedClient();
  await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      threadId: opts.gmailThreadId,
      raw: buildRawMessage({
        to: opts.to,
        subject: opts.subject.startsWith("Re:") ? opts.subject : `Re: ${opts.subject}`,
        body: opts.body,
        from: opts.from,
        inReplyTo: opts.inReplyToRfc822MessageId,
      }),
    },
  });
}

export { sanitizeEmailHtml };
