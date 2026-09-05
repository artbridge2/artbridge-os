import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export interface ShopifyConnectionStatus {
  connected: boolean;
  shopDomain?: string;
}

/** Safe-to-render connection status — never returns the access token, only for display in Settings/ticket sidebar. */
export async function getShopifyConnectionStatus(): Promise<ShopifyConnectionStatus> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("shopify_integration")
    .select("shop_domain")
    .order("connected_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return { connected: false };
  return { connected: true, shopDomain: data.shop_domain };
}
