// Pure data, importable from both client and server code — the capability
// registry itself (DB reads/merging) lives in permissions.ts, which is
// server-only and must never be imported from a client component.
export const CAPABILITIES = [
  { key: "home", label: "Home" },
  { key: "tasks", label: "Tasks" },
  { key: "communications_customer", label: "Communications: Customers" },
  { key: "communications_artist", label: "Communications: Artists" },
  { key: "communications_developer", label: "Communications: Developers" },
  { key: "communications_supplier", label: "Communications: Suppliers" },
  { key: "communications_other", label: "Communications: Other" },
  { key: "artists", label: "Artists" },
  { key: "marketing", label: "Marketing (view)" },
  { key: "marketing_manage", label: "Marketing (create/manage campaigns)" },
  { key: "content", label: "Content" },
  { key: "email_marketing", label: "Email Marketing" },
  { key: "seo", label: "SEO" },
  { key: "calendar", label: "Calendar" },
  { key: "projects", label: "Projects" },
  { key: "settings_view", label: "Settings: view" },
  { key: "settings_integrations", label: "Settings: manage integrations" },
  { key: "settings_team", label: "Settings: manage team & permissions" },
  { key: "settings_ai", label: "Settings: manage AI" },
  { key: "settings_audit_log", label: "Settings: view audit log" },
] as const;

export type CapabilityKey = (typeof CAPABILITIES)[number]["key"];
