import { NextResponse, type NextRequest } from "next/server";
import { getCurrentProfile } from "@/lib/dal";
import { exchangeCodeForToken, isKnownShop, verifyCallbackHmac } from "@/lib/shopify/client";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const me = await getCurrentProfile();
  const { searchParams } = request.nextUrl;

  const shop = searchParams.get("shop");
  const code = searchParams.get("code");

  if (!code || !isKnownShop(shop) || !verifyCallbackHmac(searchParams)) {
    return NextResponse.redirect(new URL("/settings?shopify=error", request.url));
  }

  const { access_token, scope } = await exchangeCodeForToken(code);

  const admin = createAdminClient();
  await admin.from("shopify_integration").insert({
    shop_domain: shop,
    access_token,
    scope,
    connected_by: me.id,
  });

  return NextResponse.redirect(new URL("/settings?shopify=connected", request.url));
}
