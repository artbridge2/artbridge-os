import "server-only";
import { shopifyAdminQuery } from "@/lib/shopify/client";

/**
 * Real, deterministic SEO findings computed live from actual Shopify product
 * data — no AI involved, so this works today regardless of Anthropic API
 * availability. Deliberately not persisted: Shopify is the source of truth,
 * so a stale cached finding (e.g. "missing meta description" after someone
 * already fixed it in Shopify) would be worse than a few seconds of query
 * time on each page load.
 */
export type SeoFindingType = "missing_meta_title" | "missing_meta_description" | "missing_alt_text" | "duplicate_title";
export type SeoSeverity = "high" | "medium";

export interface SeoFinding {
  type: SeoFindingType;
  severity: SeoSeverity;
  productId: string;
  productTitle: string;
  detail: string;
  adminUrl: string;
  storeUrl: string | null;
}

export interface SeoAuditResult {
  scannedCount: number;
  findings: SeoFinding[];
}

interface ProductNode {
  id: string;
  title: string;
  onlineStoreUrl: string | null;
  seo: { title: string | null; description: string | null };
  images: { edges: { node: { altText: string | null } }[] };
}

interface ProductsQueryResult {
  products: {
    edges: { node: ProductNode }[];
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
}

const PRODUCTS_QUERY = `
  query($cursor: String) {
    products(first: 50, after: $cursor, query: "status:active") {
      edges {
        node {
          id
          title
          onlineStoreUrl
          seo { title description }
          images(first: 10) { edges { node { altText } } }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

function shopHandle(): string {
  const domain = process.env.SHOPIFY_SHOP_DOMAIN ?? "";
  return domain.replace(".myshopify.com", "");
}

function productAdminUrl(id: string): string {
  const numericId = id.split("/").pop();
  return `https://admin.shopify.com/store/${shopHandle()}/products/${numericId}`;
}

// Bounds one audit run so a very large catalog can't turn a page load into a
// runaway sequence of GraphQL round trips.
const MAX_PRODUCTS = 250;

export const SEO_FINDING_LABELS: Record<SeoFindingType, string> = {
  missing_meta_title: "Missing SEO title",
  missing_meta_description: "Missing meta description",
  missing_alt_text: "Missing image alt text",
  duplicate_title: "Duplicate product title",
};

export async function runShopifyProductSeoAudit(): Promise<SeoAuditResult> {
  const products: ProductNode[] = [];
  let cursor: string | null = null;
  do {
    const data: ProductsQueryResult = await shopifyAdminQuery<ProductsQueryResult>(PRODUCTS_QUERY, { cursor });
    products.push(...data.products.edges.map((e) => e.node));
    cursor = data.products.pageInfo.hasNextPage ? data.products.pageInfo.endCursor : null;
  } while (cursor && products.length < MAX_PRODUCTS);

  const findings: SeoFinding[] = [];
  const productsByNormalizedTitle = new Map<string, ProductNode[]>();

  for (const p of products) {
    const adminUrl = productAdminUrl(p.id);

    if (!p.seo.title || p.seo.title.trim().length === 0) {
      findings.push({
        type: "missing_meta_title",
        severity: "medium",
        productId: p.id,
        productTitle: p.title,
        detail: "No custom SEO title set — search results fall back to the product title.",
        adminUrl,
        storeUrl: p.onlineStoreUrl,
      });
    }

    if (!p.seo.description || p.seo.description.trim().length === 0) {
      findings.push({
        type: "missing_meta_description",
        severity: "high",
        productId: p.id,
        productTitle: p.title,
        detail: "No meta description — search results will show an auto-generated snippet instead.",
        adminUrl,
        storeUrl: p.onlineStoreUrl,
      });
    }

    const missingAlt = p.images.edges.some((e) => !e.node.altText || e.node.altText.trim().length === 0);
    if (missingAlt) {
      findings.push({
        type: "missing_alt_text",
        severity: "medium",
        productId: p.id,
        productTitle: p.title,
        detail: "At least one product image has no alt text.",
        adminUrl,
        storeUrl: p.onlineStoreUrl,
      });
    }

    const normalized = p.title.trim().toLowerCase();
    const bucket = productsByNormalizedTitle.get(normalized) ?? [];
    bucket.push(p);
    productsByNormalizedTitle.set(normalized, bucket);
  }

  for (const bucket of productsByNormalizedTitle.values()) {
    if (bucket.length < 2) continue;
    for (const p of bucket) {
      findings.push({
        type: "duplicate_title",
        severity: "high",
        productId: p.id,
        productTitle: p.title,
        detail: `Same title as ${bucket.length - 1} other product${bucket.length - 1 === 1 ? "" : "s"} — hurts both SEO and shoppers telling items apart.`,
        adminUrl: productAdminUrl(p.id),
        storeUrl: p.onlineStoreUrl,
      });
    }
  }

  return { scannedCount: products.length, findings };
}
