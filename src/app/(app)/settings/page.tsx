import { getCurrentProfile } from "@/lib/dal";
import { getAreas } from "@/lib/queries";
import { getGmailConnectionStatus } from "@/lib/gmail/status";
import { getShopifyConnectionStatus } from "@/lib/shopify/status";
import { getIngestionRules } from "@/lib/queries-settings";
import { addIngestionRule, deleteIngestionRule } from "@/actions/settings";
import { signOut } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { AddAreaForm } from "@/components/add-area-form";
import { GmailSyncButton } from "@/components/gmail-sync-button";
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
  const [profile, areas, shopify, ingestionRules] = await Promise.all([
    getCurrentProfile(),
    getAreas(),
    getShopifyConnectionStatus(),
    getIngestionRules(),
  ]);
  let gmail: Awaited<ReturnType<typeof getGmailConnectionStatus>> = { connected: false };
  let gmailError: string | null = null;
  try {
    gmail = await getGmailConnectionStatus();
  } catch (err) {
    gmailError = err instanceof Error ? err.message : String(err);
  }

  const gmailMessage =
    typeof params.gmail === "string" ? GMAIL_STATUS_MESSAGES[params.gmail] : undefined;
  const shopifyMessage =
    typeof params.shopify === "string" ? SHOPIFY_STATUS_MESSAGES[params.shopify] : undefined;
  const isCurator = profile.role === "kurator";

  return (
    <div className="max-w-md space-y-8 pt-6">
      <h1 className="text-xl font-semibold tracking-tight">Settings</h1>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Profil</h2>
        <p className="text-sm text-muted-foreground">
          {ROLE_LABELS[profile.role]} · {profile.email}
        </p>
        <form action={signOut}>
          <Button type="submit" variant="outline" size="sm">
            Kijelentkezés
          </Button>
        </form>
      </section>

      {!isCurator && (
        <>
          <section className="space-y-2">
            <h2 className="text-sm font-semibold">Gmail</h2>
            {gmailError && (
              <p className="text-sm text-destructive">Hiba a Gmail állapot lekérésekor: {gmailError}</p>
            )}
            {gmailMessage && <p className="text-sm text-muted-foreground">{gmailMessage}</p>}
            {gmail.connected ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Összekötve: {gmail.connectedEmail}
                  {gmail.lastSyncedAt && (
                    <> · utolsó szinkron: {new Date(gmail.lastSyncedAt).toLocaleString("hu-HU")}</>
                  )}
                </p>
                <GmailSyncButton />
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">Még nincs összekötve.</p>
                <Button size="sm" render={<a href="/api/gmail/connect" />}>
                  Connect Gmail
                </Button>
              </>
            )}
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold">Shopify</h2>
            {shopifyMessage && <p className="text-sm text-muted-foreground">{shopifyMessage}</p>}
            {shopify.connected ? (
              <p className="text-sm text-muted-foreground">Összekötve: {shopify.shopDomain}</p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">Még nincs összekötve.</p>
                <Button size="sm" render={<a href="/api/shopify/connect" />}>
                  Connect Shopify
                </Button>
              </>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold">Communication — Ingestion rules</h2>
            <p className="text-xs text-muted-foreground">
              Explicit rules always win over AI/heuristic judgment. E.g. never create a ticket from a
              sender/domain, or always create one regardless of what the classifier thinks.
            </p>
            <ul className="space-y-1.5">
              {ingestionRules.map((rule) => (
                <li key={rule.id} className="flex items-center justify-between rounded-md border border-border px-2.5 py-1.5 text-xs">
                  <span>
                    <span className="font-medium">{rule.rule_type === "never_create" ? "Never create" : "Always create"}</span>
                    {" · "}
                    {rule.match_type}: <code>{rule.pattern}</code>
                  </span>
                  <form action={deleteIngestionRule.bind(null, rule.id)}>
                    <button type="submit" className="text-muted-foreground hover:text-destructive">
                      Remove
                    </button>
                  </form>
                </li>
              ))}
              {ingestionRules.length === 0 && (
                <li className="text-xs text-muted-foreground">No custom rules yet.</li>
              )}
            </ul>
            <form action={addIngestionRule} className="grid grid-cols-3 gap-1.5">
              <select name="rule_type" className="h-8 rounded-md border border-input bg-transparent px-2 text-xs" defaultValue="never_create">
                <option value="never_create">Never create</option>
                <option value="always_create">Always create</option>
              </select>
              <select name="match_type" className="h-8 rounded-md border border-input bg-transparent px-2 text-xs" defaultValue="domain">
                <option value="sender">Sender email</option>
                <option value="domain">Domain</option>
                <option value="subject_pattern">Subject contains</option>
              </select>
              <input
                name="pattern"
                required
                placeholder="pattern"
                className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
              />
              <Button type="submit" size="sm" className="col-span-3">
                Add rule
              </Button>
            </form>
          </section>
        </>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Area-k</h2>
        <ul className="space-y-1 text-sm text-muted-foreground">
          {areas.map((area) => (
            <li key={area.id}>{area.name}</li>
          ))}
        </ul>
        <AddAreaForm />
      </section>
    </div>
  );
}
