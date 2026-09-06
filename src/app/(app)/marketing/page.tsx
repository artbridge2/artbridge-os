import { addDays, formatDateOnly, todayInBudapest } from "@/lib/dates";
import {
  getActiveCampaigns,
  getCampaignAttentionItems,
  getMarketingCalendarItems,
} from "@/lib/queries-marketing";
import { ActiveCampaignsCard } from "@/components/marketing/active-campaigns-card";
import { UpcomingCard } from "@/components/marketing/upcoming-card";
import { NeedsAttentionCard } from "@/components/marketing/needs-attention-card";
import { MarketingCalendarCard } from "@/components/marketing/marketing-calendar-card";

export default async function MarketingOverviewPage() {
  const today = todayInBudapest();
  const twoWeeksOut = formatDateOnly(addDays(new Date(today), 14));

  const [activeCampaigns, attentionItems, calendarItems] = await Promise.all([
    getActiveCampaigns(),
    getCampaignAttentionItems(),
    getMarketingCalendarItems(today, twoWeeksOut),
  ]);

  return (
    <div className="pt-6">
      <h1 className="text-[26px] font-bold tracking-tight text-[#12181f]">Marketing</h1>
      <p className="mt-1 text-[14px] text-[#5a616c]">What&apos;s active, what&apos;s coming up, and what needs a decision.</p>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ActiveCampaignsCard campaigns={activeCampaigns} />
        <UpcomingCard items={calendarItems} />
        <NeedsAttentionCard items={attentionItems} />
        <MarketingCalendarCard items={calendarItems} compact />
      </div>
    </div>
  );
}
