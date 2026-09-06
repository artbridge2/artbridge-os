import { Check, X } from "lucide-react";
import { formatElapsedEn } from "@/lib/dates";
import { DisconnectButton } from "@/components/settings/disconnect-button";
import type { IntegrationHealth, IntegrationStatus } from "@/lib/integrations/registry";

const STATUS_STYLE: Record<IntegrationHealth, { bg: string; color: string; label: string }> = {
  connected: { bg: "#e5f7ed", color: "#1c9a52", label: "Connected" },
  needs_attention: { bg: "#fdf3d9", color: "#b8860b", label: "Needs attention" },
  not_connected: { bg: "#f0f0f0", color: "#6b7280", label: "Not connected" },
};

function StatusBadge({ status }: { status: IntegrationHealth }) {
  const style = STATUS_STYLE[status];
  return (
    <span
      className="inline-flex h-6 shrink-0 items-center rounded-md px-2 text-[12.5px] font-medium"
      style={{ backgroundColor: style.bg, color: style.color }}
    >
      {style.label}
    </span>
  );
}

export function IntegrationCard({
  integration,
  canManage,
  disconnectAction,
}: {
  integration: IntegrationStatus;
  canManage: boolean;
  disconnectAction?: () => Promise<void>;
}) {
  return (
    <div className="rounded-2xl border border-[#eeeeee] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[15px] font-semibold text-[#12181f]">{integration.name}</p>
          {integration.accountIdentity && <p className="text-[13px] text-[#8a909a]">{integration.accountIdentity}</p>}
        </div>
        <StatusBadge status={integration.status} />
      </div>

      {integration.services && (
        <div className="mt-3 flex flex-wrap gap-2">
          {integration.services.map((s) => (
            <span
              key={s.key}
              title={s.note}
              className="flex items-center gap-1 rounded-md bg-[#f4f4f4] px-2 py-1 text-[12.5px] font-medium text-[#3d4451]"
            >
              {s.status === "connected" ? (
                <Check className="size-3 text-[#1c9a52]" />
              ) : (
                <X className="size-3 text-[#9aa0a8]" />
              )}
              {s.label}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 space-y-1">
        {integration.capabilities.map((cap) => (
          <div key={cap.key} className="flex items-center gap-2 text-[13px]">
            {cap.available ? (
              <Check className="size-3.5 shrink-0 text-[#1c9a52]" />
            ) : (
              <X className="size-3.5 shrink-0 text-[#c7c9cc]" />
            )}
            <span className={cap.available ? "text-[#3d4451]" : "text-[#9aa0a8]"}>{cap.label}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between text-[12.5px] text-[#9aa0a8]">
        <span>Used by: {integration.dependentModules.join(", ")}</span>
        {integration.lastSync && integration.id === "google" && <span>Last sync {formatElapsedEn(integration.lastSync)}</span>}
      </div>

      {integration.manageNote && integration.status === "not_connected" && (
        <p className="mt-2 text-[12.5px] text-[#8a909a]">{integration.manageNote}</p>
      )}

      {canManage && (
        <div className="mt-3 flex items-center gap-2">
          {integration.status === "not_connected" && integration.connectHref && (
            <a
              href={integration.connectHref}
              className="flex h-8 items-center rounded-md bg-[#12181f] px-3 text-[12.5px] font-medium text-white hover:bg-[#12181f]/90"
            >
              Connect
            </a>
          )}
          {integration.status === "connected" && integration.connectHref && (
            <a
              href={integration.connectHref}
              className="flex h-8 items-center rounded-md border border-[#e4e4e4] px-3 text-[12.5px] font-medium text-[#3d4451] hover:bg-[#f9f9f9]"
            >
              Reconnect
            </a>
          )}
          {integration.status === "connected" && disconnectAction && (
            <DisconnectButton action={disconnectAction} consequence={integration.manageNote ?? "This will disconnect the integration."} />
          )}
        </div>
      )}
    </div>
  );
}
