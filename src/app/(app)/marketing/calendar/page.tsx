import { getProfiles } from "@/lib/queries";
import { addDays, formatDateOnly, todayInBudapest } from "@/lib/dates";
import { getCampaigns, getMarketingCalendarItems } from "@/lib/queries-marketing";
import { MarketingCalendarCard } from "@/components/marketing/marketing-calendar-card";
import { NewMarketingEventDialog } from "@/components/marketing/new-marketing-event-dialog";

export default async function MarketingCalendarPage() {
  const today = todayInBudapest();
  const rangeEnd = formatDateOnly(addDays(new Date(today), 90));

  const [items, profiles, campaigns] = await Promise.all([
    getMarketingCalendarItems(today, rangeEnd),
    getProfiles(),
    getCampaigns(),
  ]);

  return (
    <div className="pt-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[#12181f]">Marketing calendar</h1>
          <p className="mt-1 text-[14px] text-[#5a616c]">
            Derived from Campaign dates and marketing work, plus standalone events. Next 90 days.
          </p>
        </div>
        <NewMarketingEventDialog profiles={profiles} campaigns={campaigns} />
      </div>

      <div className="mt-5 max-w-2xl">
        <MarketingCalendarCard items={items} />
      </div>
    </div>
  );
}
