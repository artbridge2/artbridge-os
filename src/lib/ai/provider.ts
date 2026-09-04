import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { CLASSIFICATION_RULES, DEFAULT_ROUTING } from "./rules";

/**
 * Thin, provider-swappable AI layer. Everything the rest of the app needs
 * from "AI" goes through these three functions — swap the Anthropic calls
 * for another provider here without touching callers.
 */

// Bump when the prompt/logic changes meaningfully enough that existing
// classifications should be considered stale (see src/lib/ai/rules.ts).
export const CLASSIFICATION_VERSION = 1;

const CATEGORIES = [
  "customer",
  "artist",
  "development",
  "finance_admin",
  "supplier_logistics",
  "marketing_partner",
  "system",
  "noise",
] as const;

const ACTIONS = ["reply", "task", "reply_task", "waiting", "fyi", "ignore"] as const;
const OWNERS = ["adam", "eszter", "kurator"] as const;
const PRIORITIES = ["low", "normal", "high", "critical"] as const;

const ClassificationSchema = z.object({
  category: z.enum(CATEGORIES),
  action: z.enum(ACTIONS),
  owner: z.enum(OWNERS).nullable(),
  priority: z.enum(PRIORITIES),
  summary: z.string(),
  suggested_task_title: z.string().nullable(),
  suggested_follow_up_date: z.string().nullable(),
  confidence: z.number().min(0).max(1),
});

export type ClassificationResult = z.infer<typeof ClassificationSchema>;

export interface ThreadMessageInput {
  sender: string | null;
  body: string;
  sentAt: string | null;
  isInbound: boolean;
}

export interface ThreadForAI {
  subject: string | null;
  participants: string[];
  messages: ThreadMessageInput[];
}

function client() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");
  return new Anthropic({ apiKey });
}

const CLASSIFY_MODEL = process.env.ANTHROPIC_CLASSIFY_MODEL || "claude-haiku-4-5-20251001";
const DRAFT_MODEL = process.env.ANTHROPIC_DRAFT_MODEL || "claude-sonnet-5";

function conversationText(thread: ThreadForAI): string {
  return thread.messages
    .map(
      (m) =>
        `[${m.isInbound ? "INBOUND" : "OUTBOUND"}${m.sentAt ? " " + m.sentAt : ""}] ${
          m.sender ?? "unknown"
        }:\n${m.body}`
    )
    .join("\n\n---\n\n");
}

const CLASSIFY_SYSTEM_PROMPT = `You triage the shared Artbridge inbox (info@artbridge.hu) for a small art business (Ádám and Eszter). Decide, from the actual content, whether a thread needs attention and from whom — never from sender/domain alone.

Business rules:
${CLASSIFICATION_RULES}

Default routing (content, not just sender, decides which of these applies):
${DEFAULT_ROUTING}

Write the summary in the same language as the email (Hungarian email -> Hungarian summary, English -> English). Be concise: 1-2 sentences. Only suggest a task title when action is "task" or "reply_task". Only suggest a follow-up date when action is "waiting". When genuinely unsure about the owner, return owner: null rather than guessing.`;

/** Classifies a thread. Throws if the AI provider call fails — callers decide how to handle that (e.g. leave status as-is and retry later). */
export async function classifyThread(thread: ThreadForAI): Promise<ClassificationResult> {
  const message = await client().messages.create({
    model: CLASSIFY_MODEL,
    max_tokens: 1024,
    system: CLASSIFY_SYSTEM_PROMPT,
    tools: [
      {
        name: "classify_email_thread",
        description: "Return the classification for this Artbridge inbox email thread.",
        input_schema: {
          type: "object",
          properties: {
            category: { type: "string", enum: CATEGORIES as unknown as string[] },
            action: { type: "string", enum: ACTIONS as unknown as string[] },
            owner: {
              type: ["string", "null"],
              enum: [...OWNERS, null] as unknown as string[],
            },
            priority: { type: "string", enum: PRIORITIES as unknown as string[] },
            summary: { type: "string" },
            suggested_task_title: { type: ["string", "null"] },
            suggested_follow_up_date: {
              type: ["string", "null"],
              description: "YYYY-MM-DD, only when action is 'waiting'",
            },
            confidence: { type: "number", minimum: 0, maximum: 1 },
          },
          required: [
            "category",
            "action",
            "owner",
            "priority",
            "summary",
            "suggested_task_title",
            "suggested_follow_up_date",
            "confidence",
          ],
        },
      },
    ],
    tool_choice: { type: "tool", name: "classify_email_thread" },
    messages: [
      {
        role: "user",
        content: `Subject: ${thread.subject ?? "(no subject)"}\nParticipants: ${thread.participants.join(
          ", "
        )}\n\n${conversationText(thread)}`,
      },
    ],
  });

  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );
  if (!toolUse) throw new Error("AI did not return a classification tool call");

  return ClassificationSchema.parse(toolUse.input);
}

const DRAFT_SYSTEM_PROMPT = `You draft email replies for Artbridge (an art business), sent from info@artbridge.hu. Tone: human, concise, friendly, helpful, direct — never corporate or overly verbose. Reply in the same language the conversation is in (natural Hungarian for Hungarian threads, English for English threads). Write only the reply body — no subject line, no "Dear ..." boilerplate signature block beyond a brief natural sign-off, no explanation of what you did.`;

/** Generates a reply draft body for a thread. Never sends anything — the caller is responsible for the explicit send action. */
export async function generateReplyDraft(thread: ThreadForAI): Promise<string> {
  const message = await client().messages.create({
    model: DRAFT_MODEL,
    max_tokens: 1024,
    system: DRAFT_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Subject: ${thread.subject ?? "(no subject)"}\n\n${conversationText(
          thread
        )}\n\nWrite the reply to the most recent inbound message.`,
      },
    ],
  });

  const textBlock = message.content.find(
    (block): block is Anthropic.TextBlock => block.type === "text"
  );
  return textBlock?.text?.trim() ?? "";
}
