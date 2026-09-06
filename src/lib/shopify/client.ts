import "server-only";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

// Read-only on purpose — Communication only ever displays order/customer
// context, it never writes to Shopify. Must match the Admin API scopes
// configured on the Shopify app itself (Dev Dashboard > API access).
export const SHOPIFY_SCOPES = ["read_orders", "read_customers", "read_products", "read_content"];

const API_VERSION = "2024-10";

function shopDomain(): string {
  const domain = process.env.SHOPIFY_SHOP_DOMAIN;
  if (!domain) throw new Error("SHOPIFY_SHOP_DOMAIN not configured");
  return domain;
}

function apiKey(): string {
  const key = process.env.SHOPIFY_API_KEY;
  if (!key) throw new Error("SHOPIFY_API_KEY not configured");
  return key;
}

function apiSecret(): string {
  const secret = process.env.SHOPIFY_API_SECRET;
  if (!secret) throw new Error("SHOPIFY_API_SECRET not configured");
  return secret;
}

function redirectUri(): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return `${site}/api/shopify/callback`;
}

/** URL to send the user to for the one-time Shopify OAuth consent flow. */
export function getConsentUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: apiKey(),
    scope: SHOPIFY_SCOPES.join(","),
    redirect_uri: redirectUri(),
    state,
  });
  return `https://${shopDomain()}/admin/oauth/authorize?${params.toString()}`;
}

/**
 * Verifies Shopify's HMAC signature on the callback query string — without
 * this, anyone could forge a callback request and get us to "connect" to a
 * shop we don't control.
 */
export function verifyCallbackHmac(searchParams: URLSearchParams): boolean {
  const params = new URLSearchParams(searchParams);
  const hmac = params.get("hmac");
  if (!hmac) return false;
  params.delete("hmac");
  params.delete("signature");

  const message = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  const digest = crypto.createHmac("sha256", apiSecret()).update(message).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmac));
}

export function isKnownShop(shop: string | null): boolean {
  return !!shop && shop === shopDomain();
}

export async function exchangeCodeForToken(code: string): Promise<{ access_token: string; scope: string }> {
  const res = await fetch(`https://${shopDomain()}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: apiKey(), client_secret: apiSecret(), code }),
  });
  if (!res.ok) throw new Error(`Shopify token exchange failed: ${res.status} ${await res.text()}`);
  return res.json();
}

interface AdminIntegrationRow {
  shop_domain: string;
  access_token: string;
}

async function getStoredIntegration(): Promise<AdminIntegrationRow | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("shopify_integration")
    .select("shop_domain, access_token")
    .order("connected_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

/** Minimal Admin API GraphQL client. Throws if Shopify isn't connected — callers should show a Connect Shopify state instead of a raw error. */
export async function shopifyAdminQuery<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const integration = await getStoredIntegration();
  if (!integration) throw new Error("SHOPIFY_NOT_CONNECTED");

  const res = await fetch(`https://${integration.shop_domain}/admin/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": integration.access_token,
    },
    body: JSON.stringify({ query, variables }),
    // No default timeout on fetch — an unresponsive Shopify endpoint could
    // otherwise hang a caller (e.g. Communication classification) indefinitely.
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) throw new Error(`Shopify Admin API error: ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(`Shopify Admin API error: ${JSON.stringify(json.errors)}`);
  return json.data as T;
}
