import { getCurrentProfile } from "@/lib/dal";
import { getAreas } from "@/lib/queries";
import { getGmailConnectionStatus } from "@/lib/gmail/status";
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

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const [profile, areas] = await Promise.all([getCurrentProfile(), getAreas()]);
  let gmail: Awaited<ReturnType<typeof getGmailConnectionStatus>> = { connected: false };
  let gmailError: string | null = null;
  try {
    gmail = await getGmailConnectionStatus();
  } catch (err) {
    gmailError = err instanceof Error ? err.message : String(err);
  }

  const gmailMessage =
    typeof params.gmail === "string" ? GMAIL_STATUS_MESSAGES[params.gmail] : undefined;

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
        <p className="text-sm text-muted-foreground">
          Not connected. Order and customer context in Communication will stay hidden until an
          admin adds Shopify Admin API credentials.
        </p>
        <Button size="sm" variant="outline" disabled>
          Connect Shopify
        </Button>
      </section>

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
