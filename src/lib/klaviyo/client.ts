import "server-only";

/**
 * Klaviyo Private API Key auth — deliberately not OAuth. This is a single
 * internal account (not a public app distributed to other merchants), so a
 * read-only private key (Klaviyo: Account → Settings → API Keys, scoped to
 * read-only) is simpler and has no redirect/callback dance to build or
 * maintain. Stored as an env var, same pattern as SHOPIFY_API_KEY.
 *
 * IMPORTANT: unlike the Shopify/Gmail clients, this has not been exercised
 * against a real Klaviyo account yet — no API key has been provided. The
 * endpoint shapes below follow Klaviyo's documented 2024-10-15 JSON:API
 * structure, but treat the first real connection as a verification step,
 * not an assumption that this is already correct.
 */

const API_BASE = "https://a.klaviyo.com/api";
const API_REVISION = "2024-10-15";

function apiKey(): string | null {
  return process.env.KLAVIYO_API_KEY || null;
}

export function isKlaviyoConfigured(): boolean {
  return !!apiKey();
}

export async function klaviyoGet<T>(path: string): Promise<T> {
  const key = apiKey();
  if (!key) throw new Error("KLAVIYO_NOT_CONNECTED");

  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      Authorization: `Klaviyo-API-Key ${key}`,
      revision: API_REVISION,
      accept: "application/json",
    },
    // No default timeout on fetch — an unresponsive endpoint shouldn't hang a page load.
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) throw new Error(`Klaviyo API error: ${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}
