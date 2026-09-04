/**
 * One-time / re-runnable seed script for Artbridge OS Core v0.1.
 *
 * Creates the 3 Supabase Auth users + profiles (Ádám, Eszter, Kurátor) and
 * the starting recurring tasks from the product spec. Safe to re-run: users
 * and recurring roots are matched by email / title+owner before inserting.
 *
 * Usage:
 *   1. Run supabase/migrations/0001_init.sql against your Supabase project.
 *   2. Fill in .env.local (see .env.example).
 *   3. npm run seed
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { computeNextDueDate } from "../src/lib/recurring";
import { formatDateOnly, monthBounds, parseDateOnly, todayInBudapest } from "../src/lib/dates";
import type { RecurringRule, Role, TaskPriority } from "../src/lib/types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Hiányzik a NEXT_PUBLIC_SUPABASE_URL vagy a SUPABASE_SERVICE_ROLE_KEY a .env.local-ból."
  );
  process.exit(1);
}

const USERS: { role: Role; fullName: string; envVar: string }[] = [
  { role: "adam", fullName: "Ádám", envVar: "SEED_ADAM_EMAIL" },
  { role: "eszter", fullName: "Eszter", envVar: "SEED_ESZTER_EMAIL" },
  { role: "kurator", fullName: "Kurátor", envVar: "SEED_KURATOR_EMAIL" },
];

interface SeedTask {
  title: string;
  description?: string;
  owner: Role;
  area: string;
  priority: TaskPriority;
  rule: RecurringRule;
  /** Override the computed initial due date (YYYY-MM-DD). */
  dueDateOverride?: string;
}

const today = parseDateOnly(todayInBudapest());
const endOfThisMonth = formatDateOnly(monthBounds(today).end);

const SEED_TASKS: SeedTask[] = [
  // Eszter
  {
    title: "Email inbox review",
    description:
      "Nézd át a beérkező emaileket és válaszolj minden olyan ügyre, ami reakciót igényel.",
    owner: "eszter",
    area: "Customer Service",
    priority: "high",
    rule: { freq: "weekdays" },
  },
  {
    title: "Social posting",
    description:
      "A jövőben ezt activity-based rendszer váltja majd fel, amely figyeli az utolsó 7 nap posztjait. A v0.1-ben egyszerű recurring task.",
    owner: "eszter",
    area: "Social",
    priority: "normal",
    rule: { freq: "weekly", weekdays: [1, 3, 5] },
  },
  {
    title: "Artwork review",
    owner: "eszter",
    area: "Artists",
    priority: "normal",
    rule: { freq: "weekly" },
  },
  {
    title: "Influencer outreach",
    owner: "eszter",
    area: "Marketing",
    priority: "normal",
    rule: { freq: "monthly" },
  },
  {
    title: "Számlák összegyűjtése és elküldése a könyvelőnek",
    owner: "eszter",
    area: "Admin",
    priority: "high",
    rule: { freq: "monthly" },
    dueDateOverride: endOfThisMonth,
  },
  {
    title: "Művészjutalékok",
    owner: "eszter",
    area: "Finance",
    priority: "high",
    rule: { freq: "quarterly" },
  },
  // Ádám
  {
    title: "Meta Ads review",
    owner: "adam",
    area: "Marketing",
    priority: "high",
    rule: { freq: "weekly" },
  },
  {
    title: "Newsletter",
    description: "Később ezt AI-generated newsletter workflow váltja.",
    owner: "adam",
    area: "Email Marketing",
    priority: "normal",
    rule: { freq: "weekly" },
  },
  {
    title: "SEO review",
    owner: "adam",
    area: "SEO",
    priority: "normal",
    rule: { freq: "monthly" },
  },
  {
    title: "Financial tables update",
    owner: "adam",
    area: "Finance",
    priority: "high",
    rule: { freq: "monthly" },
  },
  {
    title: "Inventory review",
    description:
      "Checklist jelleggel: keretek, papír, csomagolóanyag, paszpartu, egyéb fogyóanyag.",
    owner: "adam",
    area: "Inventory",
    priority: "high",
    rule: { freq: "weekly", interval: 3 },
  },
  // Közös — a spec nem rendel hozzá egyértelmű felelőst, az üzleti szabály
  // (12. pont) miatt mégis kell egy primary owner; alapértelmezés Ádám,
  // az appban egy kattintással átadható Eszternek.
  {
    title: "Weekly planning",
    owner: "adam",
    area: "Management",
    priority: "high",
    rule: { freq: "weekly" },
  },
  {
    title: "Monthly planning",
    owner: "adam",
    area: "Management",
    priority: "high",
    rule: { freq: "monthly" },
  },
];

async function main() {
  const supabase = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const profileIdByRole = new Map<Role, string>();

  for (const u of USERS) {
    const email = process.env[u.envVar];
    if (!email) {
      console.error(`Hiányzik a ${u.envVar} env változó — kihagyva: ${u.fullName}`);
      continue;
    }

    let userId: string | undefined;
    const { data: existing } = await supabase.auth.admin.listUsers();
    const found = existing.users.find((usr) => usr.email?.toLowerCase() === email.toLowerCase());

    if (found) {
      userId = found.id;
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
      });
      if (error || !data.user) {
        console.error(`Nem sikerült létrehozni a usert (${email}):`, error?.message);
        continue;
      }
      userId = data.user.id;
      console.log(`Létrehozva: ${email}`);
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({ id: userId, full_name: u.fullName, role: u.role, email }, { onConflict: "id" });

    if (profileError) {
      console.error(`Nem sikerült menteni a profilt (${email}):`, profileError.message);
      continue;
    }

    profileIdByRole.set(u.role, userId);
    console.log(`Profil kész: ${u.fullName} (${email})`);
  }

  const { data: areas } = await supabase.from("areas").select("id, name");
  const areaIdByName = new Map((areas ?? []).map((a) => [a.name, a.id]));

  for (const t of SEED_TASKS) {
    const ownerId = profileIdByRole.get(t.owner);
    if (!ownerId) {
      console.error(`Nincs owner (${t.owner}) — kihagyva: ${t.title}`);
      continue;
    }

    const { data: existingRoot } = await supabase
      .from("tasks")
      .select("id")
      .eq("title", t.title)
      .eq("owner_id", ownerId)
      .is("recurring_parent_id", null)
      .maybeSingle();

    if (existingRoot) {
      console.log(`Már létezik, kihagyva: ${t.title}`);
      continue;
    }

    const dueDate =
      t.dueDateOverride ?? formatDateOnly(computeNextDueDate(t.rule, today, true));

    const { error } = await supabase.from("tasks").insert({
      title: t.title,
      description: t.description ?? null,
      owner_id: ownerId,
      area_id: areaIdByName.get(t.area) ?? null,
      priority: t.priority,
      status: "todo",
      due_date: dueDate,
      recurring_rule: t.rule,
      created_by: ownerId,
    });

    if (error) {
      console.error(`Nem sikerült létrehozni: ${t.title}`, error.message);
    } else {
      console.log(`Task létrehozva: ${t.title} (${dueDate})`);
    }
  }

  console.log("Seed kész.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
