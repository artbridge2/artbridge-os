import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { GMAIL_SCOPES } from "@/lib/gmail/client";
import { SHOPIFY_SCOPES } from "@/lib/shopify/client";

export type IntegrationHealth = "connected" | "needs_attention" | "not_connected";

export interface IntegrationCapability {
  key: string;
  label: string;
  available: boolean;
}

export interface IntegrationService {
  key: string;
  label: string;
  status: IntegrationHealth;
  note?: string;
}

export interface IntegrationStatus {
  id: string;
  name: string;
  status: IntegrationHealth;
  accountIdentity: string | null;
  lastSync: string | null;
  lastError: string | null;
  capabilities: IntegrationCapability[];
  dependentModules: string[];
  services?: IntegrationService[];
  connectHref?: string;
  manageNote?: string;
}

async function getGoogleIntegration(): Promise<IntegrationStatus> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("gmail_integration")
    .select("connected_email, last_synced_at, scopes, token_expires_at")
    .order("connected_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const hasCalendarScope = GMAIL_SCOPES.includes("https://www.googleapis.com/auth/calendar.readonly");
  const hasCalendarWriteScope = GMAIL_SCOPES.includes("https://www.googleapis.com/auth/calendar.events");
  const hasDriveScope = GMAIL_SCOPES.some((s) => s.includes("drive"));

  if (!data) {
    return {
      id: "google",
      name: "Google",
      status: "not_connected",
      accountIdentity: null,
      lastSync: null,
      lastError: null,
      capabilities: [
        { key: "canReadGmail", label: "Read Gmail", available: false },
        { key: "canSendGmail", label: "Send Gmail", available: false },
        { key: "canReadGoogleCalendar", label: "Read Google Calendar", available: false },
        { key: "canCreateGoogleEvent", label: "Create Google Calendar events", available: false },
        { key: "canReadDriveFiles", label: "Read Google Drive files", available: false },
      ],
      dependentModules: ["Communication", "Home", "Calendar"],
      services: [
        { key: "gmail", label: "Gmail", status: "not_connected" },
        { key: "calendar", label: "Calendar", status: "not_connected" },
        { key: "drive", label: "Drive", status: "not_connected" },
      ],
      connectHref: "/api/gmail/connect",
    };
  }

  const scopes = (data.scopes as string[] | null) ?? GMAIL_SCOPES;

  return {
    id: "google",
    name: "Google",
    status: "connected",
    accountIdentity: data.connected_email,
    lastSync: data.last_synced_at,
    lastError: null,
    capabilities: [
      { key: "canReadGmail", label: "Read Gmail", available: scopes.some((s) => s.includes("gmail.readonly")) },
      { key: "canSendGmail", label: "Send Gmail", available: scopes.some((s) => s.includes("gmail.send")) },
      { key: "canReadGoogleCalendar", label: "Read Google Calendar", available: scopes.some((s) => s.includes("calendar")) },
      { key: "canCreateGoogleEvent", label: "Create Google Calendar events", available: hasCalendarWriteScope },
      { key: "canReadDriveFiles", label: "Read Google Drive files", available: hasDriveScope },
    ],
    dependentModules: ["Communication", "Home", "Calendar"],
    services: [
      { key: "gmail", label: "Gmail", status: scopes.some((s) => s.includes("gmail.readonly")) ? "connected" : "not_connected" },
      {
        key: "calendar",
        label: "Calendar",
        status: hasCalendarScope ? "connected" : "not_connected",
        note: hasCalendarScope && !hasCalendarWriteScope ? "Read-only — Artbridge OS cannot create/edit Google events yet" : undefined,
      },
      { key: "drive", label: "Drive", status: hasDriveScope ? "connected" : "not_connected", note: "Not yet integrated — Projects links out to Drive but cannot read files" },
    ],
    connectHref: "/api/gmail/connect",
    manageNote: "Disconnect Gmail: new email threads will stop syncing into Communications. Existing synchronized cases remain in Artbridge OS.",
  };
}

async function getShopifyIntegration(): Promise<IntegrationStatus> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("shopify_integration")
    .select("shop_domain, connected_at, scope")
    .order("connected_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) {
    return {
      id: "shopify",
      name: "Shopify",
      status: "not_connected",
      accountIdentity: null,
      lastSync: null,
      lastError: null,
      capabilities: SHOPIFY_SCOPES.map((s) => ({ key: s, label: s.replace("read_", "Read ").replace(/_/g, " "), available: false })),
      dependentModules: ["Communication", "Artists", "Marketing"],
      connectHref: "/api/shopify/connect",
    };
  }

  const scopes = data.scope ? data.scope.split(",") : SHOPIFY_SCOPES;
  return {
    id: "shopify",
    name: "Shopify",
    status: "connected",
    accountIdentity: data.shop_domain,
    lastSync: data.connected_at,
    lastError: null,
    capabilities: [
      { key: "canReadShopifyOrders", label: "Read orders", available: scopes.includes("read_orders") },
      { key: "canReadShopifyCustomers", label: "Read customers", available: scopes.includes("read_customers") },
      { key: "canReadShopifyProducts", label: "Read products/artworks", available: scopes.includes("read_products") },
      { key: "canReadShopifyContent", label: "Read pages/collections", available: scopes.includes("read_content") },
      { key: "canWriteShopifySEO", label: "Write SEO/content", available: false },
    ],
    dependentModules: ["Communication", "Artists", "Marketing", "Content", "SEO"],
    connectHref: "/api/shopify/connect",
    manageNote: "Disconnect Shopify: existing Artbridge OS work stays, but customer/order matching and live Shopify data stop working.",
  };
}

function getKlaviyoIntegration(): IntegrationStatus {
  return {
    id: "klaviyo",
    name: "Klaviyo",
    status: "not_connected",
    accountIdentity: null,
    lastSync: null,
    lastError: null,
    capabilities: [
      { key: "canReadKlaviyoCampaigns", label: "Read campaigns", available: false },
      { key: "canWriteKlaviyoCampaigns", label: "Create/update campaigns", available: false },
      { key: "canSendKlaviyoCampaign", label: "Schedule/send", available: false },
      { key: "canReadKlaviyoSegments", label: "Read lists/segments", available: false },
      { key: "canReadKlaviyoFlows", label: "Read Flows", available: false },
      { key: "canReadKlaviyoPerformance", label: "Read performance", available: false },
    ],
    dependentModules: ["Email Marketing"],
    manageNote: "Not connected yet — Email Marketing will show a real Connect action once this integration is built.",
  };
}

function getSearchConsoleIntegration(): IntegrationStatus {
  return {
    id: "search_console",
    name: "Google Search Console",
    status: "not_connected",
    accountIdentity: null,
    lastSync: null,
    lastError: null,
    capabilities: [{ key: "canReadSearchConsole", label: "Read search performance", available: false }],
    dependentModules: ["SEO"],
    manageNote: "Not connected yet — SEO will show a real Connect action once this integration is built.",
  };
}

export async function getIntegrationsOverview(): Promise<IntegrationStatus[]> {
  const [google, shopify] = await Promise.all([getGoogleIntegration(), getShopifyIntegration()]);
  return [google, shopify, getKlaviyoIntegration(), getSearchConsoleIntegration()];
}

export async function getIntegrationCapabilities(): Promise<Record<string, boolean>> {
  const integrations = await getIntegrationsOverview();
  const flat: Record<string, boolean> = {};
  for (const integration of integrations) {
    for (const cap of integration.capabilities) flat[cap.key] = cap.available;
  }
  return flat;
}
