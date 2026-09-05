/**
 * Editable business rules fed into the classification prompt. Content-based
 * on purpose — never turn these into sender/domain hard filters (a rule like
 * "FrameTrade is noise" has to survive FrameTrade emailing from a new
 * address, and must not accidentally swallow a real order from a supplier
 * who happens to share a domain with a noisy one).
 *
 * Edit this file to add/change rules — no code changes needed elsewhere.
 */
export const CLASSIFICATION_RULES = `
- FrameTrade is NOT an active Artbridge supplier anymore. Any FrameTrade
  marketing, reminder, or "place your order by ..." email is noise/ignore —
  never turn one into a task, regardless of urgency language in the email.
- A supplier deadline or order reminder is only actionable if the supplier is
  a currently active one Artbridge actually orders from.
- A system/SaaS notification (Google Workspace, Shopify, GLS, hosting, etc.)
  is Noise UNLESS it describes something that actually needs a human action
  (e.g. "91% storage used", a failed payment, a broken integration) — in
  that case: category=system, action=task, owner=Adam.
- Judge by content, not by sender domain or whether the message "looks"
  automated. A templated-looking email can still be genuinely actionable.
`.trim();

export const DEFAULT_ROUTING = `
- category=customer: shopping/order inquiries and complaints -> Eszter
- category=artist: general artist communication -> Eszter (Curator once that
  role is active); technical artist issues (artwork upload, portfolio
  problems) -> Adam
- category=developer: technical/backend/Shopify development issues -> Adam
- category=supplier: supplier / procurement -> Adam by default
- category=internal: finance, accounting, admin, marketing/partner
  coordination and other internal-only threads -> judge by content: Eszter
  or Adam
- category=system: no owner unless action is required, then Adam
- category=noise -> no owner

When genuinely unsure, leave owner unassigned (owner = null) rather than
guessing — do not assign an owner on low confidence.
`.trim();
