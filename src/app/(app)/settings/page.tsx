import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/dal";
import { getAreas } from "@/lib/queries";
import { hasCapability } from "@/lib/permissions";
import { getIntegrationsOverview } from "@/lib/integrations/registry";
import { getIngestionRules } from "@/lib/queries-settings";
import { addIngestionRule, deleteIngestionRule, disconnectGmail, disconnectShopify } from "@/actions/settings";
import { signOut } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { AddAreaForm } from "@/components/add-area-form";
import { GmailSyncButton } from "@/components/gmail-sync-button";
import { IntegrationCard } from "@/components/settings/integration-card";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { ROLE_LABELS } from "@/lib/types";

const GMAIL_STATUS_MESSAGES: Record<string, string> = {
  connected: "Gmail sikeresen összekötve. Az első szinkron elindult a háttérben.",
  error: "A Gmail összekötés megszakadt. Próbáld újra.",
  missing_refresh_token:
    "A Google nem adott vissza refresh tokent. Vond vissza a hozzáférést a myaccount.google.com/permissions oldalon, majd kösd össze újra.",
};

const SHOPIFY_STATUS_MESSAGES: Record<string, string> = {
  connected: "Shopify sikeresen összekötve.",
  error: "A Shopify összekötés nem sikerült — próbáld újra.",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const profile = await getCurrentProfile();
  const canView = await hasCapability(profile, "settings_view");
  if (!canView) redirect("/");
  const canManageIntegrations = await hasCapability(profile, "settings_integrations");
  const showAdminTabs = await hasCapability(profile, "settings_team");

  const [areas, integrations, ingestionRules] = await Promise.all([
    getAreas(),
    getIntegrationsOverview(),
    canManageIntegrations ? getIngestionRules() : Promise.resolve([]),
  ]);

  const gmailMessage = typeof params.gmail === "string" ? GMAIL_STATUS_MESSAGES[params.gmail] : undefined;
  const shopifyMessage = typeof params.shopify === "string" ? SHOPIFY_STATUS_MESSAGES[params.shopify] : undefined;

  const google = integrations.find((i) => i.id === "google")!;
  const shopify = integrations.find((i) => i.id === "shopify")!;
  const others = integrations.filter((i) => i.id !== "google" && i.id !== "shopify");

  return (
    <div className="max-w-3xl space-y-6 pt-6">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight text-[#12181f]">Settings</h1>
        <p className="mt-1 text-[14px] text-[#5a616c]">External services, capabilities, and administrative control.</p>
      </div>

      <SettingsTabs active="/settings" showAdmin={showAdminTabs} />

      <div className="rounded-2xl border border-[#eeeeee] bg-white p-4">
        <p className="text-[14.5px] font-semibold text-[#12181f]">Profile</p>
        <p className="mt-1 text-[13.5px] text-[#8a909a]">{ROLE_LABELS[profile.role]} · {profile.email}</p>
        <form action={signOut} className="mt-2">
          <Button type="submit" variant="outline" size="sm">Sign out</Button>
        </form>
      </div>

      <div className="space-y-4">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-[#9aa0a8]">Integrations</p>

        {gmailMessage && <p className="text-[13.5px] text-[#5a616c]">{gmailMessage}</p>}
        {shopifyMessage && <p className="text-[13.5px] text-[#5a616c]">{shopifyMessage}</p>}

        <IntegrationCard integration={google} canManage={canManageIntegrations} disconnectAction={disconnectGmail} />
        {google.status === "connected" && canManageIntegrations && (
          <div className="-mt-2 pl-4">
            <GmailSyncButton />
          </div>
        )}

        <IntegrationCard integration={shopify} canManage={canManageIntegrations} disconnectAction={disconnectShopify} />

        {others.map((integration) => (
          <IntegrationCard key={integration.id} integration={integration} canManage={canManageIntegrations} />
        ))}
      </div>

      {canManageIntegrations && (
        <div className="rounded-2xl border border-[#eeeeee] bg-white p-4">
          <p className="text-[14.5px] font-semibold text-[#12181f]">Communication — Ingestion rules</p>
          <p className="mt-1 text-[13px] text-[#8a909a]">
            Explicit rules always win over AI/heuristic judgment — e.g. never create a ticket from a sender/domain, or always create one regardless of what the classifier thinks.
          </p>
          <ul className="mt-3 space-y-1.5">
            {ingestionRules.map((rule) => (
              <li key={rule.id} className="flex items-center justify-between rounded-md border border-[#eeeeee] px-2.5 py-1.5 text-[13px]">
                <span>
                  <span className="font-medium">{rule.rule_type === "never_create" ? "Never create" : "Always create"}</span>
                  {" · "}
                  {rule.match_type}: <code>{rule.pattern}</code>
                </span>
                <form action={deleteIngestionRule.bind(null, rule.id)}>
                  <button type="submit" className="text-[#9aa0a8] hover:text-[#e0353b]">Remove</button>
                </form>
              </li>
            ))}
            {ingestionRules.length === 0 && <li className="text-[13px] text-[#9aa0a8]">No custom rules yet.</li>}
          </ul>
          <form action={addIngestionRule} className="mt-3 grid grid-cols-3 gap-1.5">
            <select name="rule_type" className="h-8 rounded-md border border-input bg-transparent px-2 text-xs" defaultValue="never_create">
              <option value="never_create">Never create</option>
              <option value="always_create">Always create</option>
            </select>
            <select name="match_type" className="h-8 rounded-md border border-input bg-transparent px-2 text-xs" defaultValue="domain">
              <option value="sender">Sender email</option>
              <option value="domain">Domain</option>
              <option value="subject_pattern">Subject contains</option>
            </select>
            <input name="pattern" required placeholder="pattern" className="h-8 rounded-md border border-input bg-transparent px-2 text-xs" />
            <Button type="submit" size="sm" className="col-span-3">Add rule</Button>
          </form>
        </div>
      )}

      <div className="rounded-2xl border border-[#eeeeee] bg-white p-4">
        <p className="text-[14.5px] font-semibold text-[#12181f]">Areas</p>
        <ul className="mt-2 space-y-1 text-[13.5px] text-[#5a616c]">
          {areas.map((area) => (
            <li key={area.id}>{area.name}</li>
          ))}
        </ul>
        <div className="mt-2">
          <AddAreaForm />
        </div>
      </div>
    </div>
  );
}
