import { getCurrentProfile } from "@/lib/dal";
import { getAreas } from "@/lib/queries";
import { signOut } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { AddAreaForm } from "@/components/add-area-form";
import { ROLE_LABELS } from "@/lib/types";

export default async function SettingsPage() {
  const [profile, areas] = await Promise.all([getCurrentProfile(), getAreas()]);

  return (
    <div className="max-w-md space-y-8">
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
