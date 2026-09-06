import "server-only";

export type AiCapabilityStatus = "available" | "needs_configuration" | "not_built";

export interface AiCapability {
  key: string;
  label: string;
  module: string;
  status: AiCapabilityStatus;
  provider: string | null;
  note?: string;
}

/**
 * Real AI capability inventory — reflects what's actually wired today, not
 * an aspirational list. A capability is "not_built" when its module doesn't
 * exist yet, regardless of whether an API key is configured; it's
 * "needs_configuration" when the module exists but no provider key is set.
 */
export function getAiCapabilities(): AiCapability[] {
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;

  return [
    {
      key: "communication_drafting",
      label: "Communication drafting & classification",
      module: "Communication",
      status: hasAnthropicKey ? "available" : "needs_configuration",
      provider: hasAnthropicKey ? "Claude (Anthropic)" : null,
      note: "Drafts replies and classifies incoming threads — never sends automatically.",
    },
    {
      key: "artist_research",
      label: "Artist research & outreach drafting",
      module: "Artists",
      status: hasAnthropicKey ? "available" : "needs_configuration",
      provider: hasAnthropicKey ? "Claude (Anthropic)" : null,
      note: "Web research and outreach drafts — never sends automatically.",
    },
    { key: "content_creation", label: "Content creation", module: "Content", status: "not_built", provider: null, note: "Content pipeline (ideas → draft → review → scheduled → published) exists in Marketing → Content — AI-assisted drafting isn't wired yet." },
    { key: "marketing_assistance", label: "Marketing assistance", module: "Marketing", status: "not_built", provider: null, note: "Not built yet — Campaigns has no AI assistance today." },
    { key: "email_drafting_analysis", label: "Email drafting & Klaviyo account analysis", module: "Email Marketing", status: "not_built", provider: null, note: "Email Marketing now shows real Klaviyo campaigns/audiences (Content module handles copy drafting) — AI-assisted analysis isn't wired yet." },
    { key: "seo_analysis", label: "SEO analysis & content drafting", module: "SEO", status: "not_built", provider: null, note: "SEO module isn't built yet." },
    { key: "project_summarization", label: "Project summarization", module: "Projects", status: "not_built", provider: null, note: "Projects now exists (groups Tasks toward a goal, in Projects) — AI summarization isn't wired yet." },
  ];
}
