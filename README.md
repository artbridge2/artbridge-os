# Artbridge OS — Core v0.1

Belső, 3 usernek (Ádám, Eszter, Kurátor) szóló operációs rendszer az Artbridge napi/heti/havi
működéséhez: ki miért felel, mi sürgős, mi késik, és az ismétlődő rutinfeladatok automatikus
kezelése. Lásd a `Home` / `Tasks` / `Planning` nézeteket.

Stack: Next.js 16 (App Router, Turbopack) · TypeScript · Supabase (Postgres + Auth) · Tailwind
CSS v4 · shadcn/ui (Base UI).

## Első indítás

### 1. Supabase projekt

Hozz létre egy ingyenes projektet a [supabase.com](https://supabase.com)-on. A **Project
Settings → API** alatt találod a project URL-t és a két kulcsot (`anon` és `service_role`).

### 2. Séma

Nyisd meg a Supabase **SQL Editor**-t, és futtasd le a [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql)
fájl teljes tartalmát. Ez létrehozza a `profiles` / `areas` / `tasks` táblákat, az RLS
policyket, és seedeli a 13 alap area-t.

### 3. Környezeti változók

```bash
cp .env.example .env.local
```

Töltsd ki a `.env.local`-t:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — a Supabase projektből
- `SUPABASE_SERVICE_ROLE_KEY` — csak a seed scripthez kell, soha nem kerül a böngészőbe
- `SEED_ADAM_EMAIL` / `SEED_ADAM_PASSWORD` (és Eszter/Kurátor megfelelői) — a 3 valós Artbridge
  email cím + egy-egy jelszó, amivel majd be tudnak lépni

### 4. Userek és induló recurring taskok seedelése

```bash
npm install
npm run seed
```

Ez létrehozza a 3 Supabase Auth usert a megadott jelszóval, a hozzájuk tartozó `profiles`
sorokat, és a spec szerinti 13 induló recurring taskot. A script újrafuttatható: emailt és
title+owner párost ellenőriz, nem duplikál — egy `SEED_*_PASSWORD` megadásával viszont bármikor
lecserélhető/visszaállítható egy meglévő user jelszava is.

> A "Weekly planning" és "Monthly planning" (Közös) taskoknak a spec nem rendelt explicit
> felelőst — az üzleti szabály (minden tasknak egy primary ownerje van) miatt alapértelmezésben
> Ádámhoz kerülnek, egy kattintással átadhatók Eszternek a task részletei között.

### 5. Fejlesztői szerver

```bash
npm run dev
```

Nyisd meg a [http://localhost:3000](http://localhost:3000) címet, lépj be a seedelt email +
jelszó párossal.

## Deploy Vercelre

1. Told fel a repót GitHube (vagy máshova, amit a Vercel el tud érni).
2. Importáld a projektet a [Vercel](https://vercel.com/new)-en.
3. Állítsd be ugyanazokat a környezeti változókat, mint a `.env.local`-ban (a `SUPABASE_SERVICE_ROLE_KEY`
   csak akkor kell, ha a seedet Vercelről is futtatnád — production seedeléshez inkább helyi
   géppel, a production Supabase projekt felé futtasd le).
4. Állítsd be a `NEXT_PUBLIC_SITE_URL`-t a végleges Vercel domainre.
5. `vercel.json` egy napi Gmail-sync cron jobot definiál — Hobby csomagon csak napi 1x futó
   cron engedélyezett, ha ennél sűrűbbre írod át, a deploy build-time hibával elutasítja.

## Architektúra jegyzetek

- **Auth**: Supabase email+jelszó (`@supabase/ssr`), a session-t a `src/middleware.ts` frissíti
  minden requesten (Next.js 16-ban a `middleware` konvenció átnevezve `proxy`-ra — a fájlnév
  maradt a régi, mert egyes build platformok még nem ismerik fel az újat).
- **Recurring engine** (`src/lib/recurring.ts`): egy task teljesítésekor pontosan egy következő
  occurrence jön létre — nincs cron, nincs végtelen jövőbeli másolat.
- **Area lista** külön táblában (`areas`), hogy a Settings oldalról bővíthető legyen kód nélkül.
- A gyártási folyamat (batch nyomtatás, csomagolás) **nincs** ebben az appban — az Artbridge
  meglévő gyártási backendje kezeli, ahogy eddig.

Következő valószínű modul (nem implementált, csak architektúrálisan előkészítve): Gmail
integráció / Inbox, mert jelenleg itt marad el leggyakrabban a válasz.
