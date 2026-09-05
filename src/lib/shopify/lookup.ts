import "server-only";
import { shopifyAdminQuery } from "./client";

export interface ShopifyOrderSummary {
  id: string;
  name: string;
  createdAt: string;
  fulfillmentStatus: string | null;
  totalPrice: string;
  currency: string;
  lineItems: string[];
}

export interface ShopifyCustomerMatch {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  location: string | null;
  ordersCount: number;
  recentOrders: ShopifyOrderSummary[];
  adminUrl: string;
}

interface CustomerQueryResult {
  customers: {
    edges: {
      node: {
        id: string;
        firstName: string | null;
        lastName: string | null;
        email: string | null;
        phone: string | null;
        numberOfOrders: string;
        defaultAddress: { city: string | null; country: string | null } | null;
        orders: {
          edges: {
            node: {
              id: string;
              name: string;
              createdAt: string;
              displayFulfillmentStatus: string;
              totalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
              lineItems: { edges: { node: { title: string; quantity: number } }[] };
            };
          }[];
        };
      };
    }[];
  };
}

const CUSTOMER_QUERY = `
  query($q: String!) {
    customers(first: 1, query: $q) {
      edges {
        node {
          id
          firstName
          lastName
          email
          phone
          numberOfOrders
          defaultAddress { city country }
          orders(first: 3, sortKey: CREATED_AT, reverse: true) {
            edges {
              node {
                id
                name
                createdAt
                displayFulfillmentStatus
                totalPriceSet { shopMoney { amount currencyCode } }
                lineItems(first: 3) { edges { node { title quantity } } }
              }
            }
          }
        }
      }
    }
  }
`;

function shopHandle(): string {
  const domain = process.env.SHOPIFY_SHOP_DOMAIN ?? "";
  return domain.replace(".myshopify.com", "");
}

function orderAdminUrl(orderId: string): string {
  const numericId = orderId.split("/").pop();
  return `https://admin.shopify.com/store/${shopHandle()}/orders/${numericId}`;
}

function customerAdminUrl(customerId: string): string {
  const numericId = customerId.split("/").pop();
  return `https://admin.shopify.com/store/${shopHandle()}/customers/${numericId}`;
}

/**
 * Best-effort customer match by email — spec §7's strongest practical
 * signal for v1. Returns null (not an error) when nothing matches or
 * Shopify isn't connected, so callers can show a clean "no match" state.
 */
export async function findShopifyCustomerByEmail(email: string): Promise<ShopifyCustomerMatch | null> {
  let data: CustomerQueryResult;
  try {
    data = await shopifyAdminQuery<CustomerQueryResult>(CUSTOMER_QUERY, { q: `email:${email}` });
  } catch (err) {
    if (err instanceof Error && err.message === "SHOPIFY_NOT_CONNECTED") throw err;
    console.error("[shopify] customer lookup failed", err);
    return null;
  }

  const node = data.customers.edges[0]?.node;
  if (!node) return null;

  return {
    id: node.id,
    name: [node.firstName, node.lastName].filter(Boolean).join(" ") || email,
    email: node.email ?? email,
    phone: node.phone,
    location: node.defaultAddress ? [node.defaultAddress.city, node.defaultAddress.country].filter(Boolean).join(", ") : null,
    ordersCount: Number(node.numberOfOrders) || 0,
    recentOrders: node.orders.edges.map((e) => ({
      id: e.node.id,
      name: e.node.name,
      createdAt: e.node.createdAt,
      fulfillmentStatus: e.node.displayFulfillmentStatus,
      totalPrice: e.node.totalPriceSet.shopMoney.amount,
      currency: e.node.totalPriceSet.shopMoney.currencyCode,
      lineItems: e.node.lineItems.edges.map((li) => `${li.node.title} (×${li.node.quantity})`),
    })),
    adminUrl: customerAdminUrl(node.id),
  };
}

export function shopifyOrderAdminUrl(orderId: string): string {
  return orderAdminUrl(orderId);
}
