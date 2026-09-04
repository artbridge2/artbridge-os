import "server-only";
import sanitizeHtml from "sanitize-html";

/**
 * Emails are attacker-controlled input. Never store or render a message
 * body as raw HTML. Prefer the message's own text/plain part; if only HTML
 * is available, strip it down to a minimal safe subset (no scripts, no
 * event handlers, no external images/tracking pixels, no forms).
 */
export function sanitizeEmailHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ["p", "br", "b", "strong", "i", "em", "u", "ul", "ol", "li", "a", "blockquote"],
    allowedAttributes: { a: ["href"] },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" }),
    },
  }).trim();
}

export function plainTextFromHtml(html: string): string {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
