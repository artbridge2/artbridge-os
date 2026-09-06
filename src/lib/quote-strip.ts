/**
 * Strips quoted previous-message history that Gmail appends to the bottom of
 * a reply body — display-only. The stored sanitized_body keeps the full
 * original (needed for AI classification/summary context and the full
 * conversation view); this is purely for showing the "Latest incoming
 * message" as what the sender actually wrote, not their whole quoted thread.
 *
 * Covers the common quote-boundary markers: a classic ">" quote block, the
 * English "On <date>, <name> wrote:" line, the Hungarian Gmail equivalent
 * ("<name> ezt írta (időpont: ...):"), and Outlook-style
 * "-----Original Message-----" / "From: ... Sent: ... To: ... Subject:" blocks.
 */
const QUOTE_BOUNDARY_PATTERNS: RegExp[] = [
  /^>/, // classic quote prefix
  /^On .+ wrote:\s*$/i, // Gmail/Apple Mail English
  /ezt írta \(időpont:.*\):\s*$/i, // Gmail Hungarian
  /^-{2,}\s*Original Message\s*-{2,}/i, // Outlook
  /^From:.*$/i, // Outlook-style header block start (checked alongside the line below)
];

export function stripQuotedHistory(body: string): string {
  const lines = body.split(/\r\n|\r|\n/);
  let cutIndex = lines.length;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (QUOTE_BOUNDARY_PATTERNS.some((pattern) => pattern.test(trimmed))) {
      cutIndex = i;
      break;
    }
  }

  const result = lines.slice(0, cutIndex).join("\n").trim();
  // If stripping would leave nothing (e.g. a forwarded email that's ALL quote), fall back to the original rather than showing an empty card.
  return result.length > 0 ? result : body.trim();
}
