import "server-only";
import { klaviyoGet } from "./client";

export interface KlaviyoCampaignSummary {
  id: string;
  name: string;
  status: string;
  channel: string;
  sendTime: string | null;
  createdAt: string;
}

interface CampaignsResponse {
  data: {
    id: string;
    attributes: {
      name: string;
      status: string;
      // Klaviyo's own field for the send channel — kept optional since
      // exact placement can vary by API revision; defaulted below.
      channel?: string;
      send_time: string | null;
      created_at: string;
    };
  }[];
}

/** Most recent campaigns (any channel) — unfiltered to avoid a possibly-wrong filter-query syntax before this has been tested against a real account. */
export async function listRecentCampaigns(limit = 20): Promise<KlaviyoCampaignSummary[]> {
  const data = await klaviyoGet<CampaignsResponse>(`/campaigns?sort=-created_at&page[size]=${limit}`);
  return data.data.map((c) => ({
    id: c.id,
    name: c.attributes.name,
    status: c.attributes.status,
    channel: c.attributes.channel ?? "email",
    sendTime: c.attributes.send_time,
    createdAt: c.attributes.created_at,
  }));
}

export interface KlaviyoListSummary {
  id: string;
  name: string;
  createdAt: string;
}

interface ListsResponse {
  data: { id: string; attributes: { name: string; created: string } }[];
}

export async function listAudiences(): Promise<KlaviyoListSummary[]> {
  const data = await klaviyoGet<ListsResponse>(`/lists?sort=name`);
  return data.data.map((l) => ({ id: l.id, name: l.attributes.name, createdAt: l.attributes.created }));
}
