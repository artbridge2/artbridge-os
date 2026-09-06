"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ExternalLink, Plus, ShoppingBag, X } from "lucide-react";
import {
  archiveCase,
  assignToMe,
  deleteConversation,
  markNotRelevant,
  markResolved,
  markWaiting,
  reassignThread,
  restoreCase,
  restoreFromNotRelevant,
  setIssueType,
  setPriority,
  updateLabels,
} from "@/actions/inbox";
import type { ShopifyCustomerMatch } from "@/lib/shopify/lookup";
import { initials, senderDisplayName } from "@/lib/communication-style";
import {
  CASE_PRIORITY_LABELS,
  CUSTOMER_ISSUE_TYPES,
  ISSUE_TYPE_LABELS,
  ROLE_LABELS,
  type CasePriority,
  type EmailThreadWithRelations,
  type Profile,
} from "@/lib/types";

function SidebarCard({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#eeeeee] bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-[14.5px] font-semibold text-[#12181f]">{title}</p>
        {action}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function ActionButton({ label, danger, onClick, disabled }: { label: string; danger?: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center rounded-lg px-2 py-2 text-left text-[13.5px] font-medium hover:bg-[#f4f4f4] disabled:opacity-40"
      style={{ color: danger ? "#e0353b" : "#3d4451" }}
    >
      {label}
    </button>
  );
}

export function TicketSidebar({
  thread,
  profiles,
  shopifyMatch,
  shopifyConnected,
}: {
  thread: EmailThreadWithRelations;
  profiles: Profile[];
  shopifyMatch: ShopifyCustomerMatch | null;
  shopifyConnected: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [labelInput, setLabelInput] = useState("");
  const [addingLabel, setAddingLabel] = useState(false);
  const name = senderDisplayName(thread);
  const assignableProfiles = profiles.filter((p) => p.role !== "kurator");

  function run(fn: () => Promise<void>) {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  }

  function addLabel() {
    const value = labelInput.trim();
    if (!value || thread.labels.includes(value)) {
      setAddingLabel(false);
      setLabelInput("");
      return;
    }
    run(() => updateLabels(thread.id, [...thread.labels, value]));
    setLabelInput("");
    setAddingLabel(false);
  }

  function removeLabel(label: string) {
    run(() => updateLabels(thread.id, thread.labels.filter((l) => l !== label)));
  }

  return (
    <div className="space-y-4">
      <SidebarCard title="Customer">
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#f0f0f0] text-[12.5px] font-semibold text-[#5a616c]">
            {initials(name)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-[#12181f]">{shopifyMatch?.name ?? name}</p>
            <p className="truncate text-[13px] text-[#8a909a]">{shopifyMatch?.email ?? thread.sender}</p>
            {shopifyMatch?.phone && <p className="truncate text-[13px] text-[#8a909a]">{shopifyMatch.phone}</p>}
            {shopifyMatch?.location && <p className="truncate text-[13px] text-[#8a909a]">{shopifyMatch.location}</p>}
          </div>
        </div>
      </SidebarCard>

      <SidebarCard title="Order">
        {!shopifyConnected ? (
          <div className="flex flex-col items-start gap-2">
            <span className="flex size-9 items-center justify-center rounded-full bg-[#f0f0f0]">
              <ShoppingBag className="size-4 text-[#8a909a]" />
            </span>
            <p className="text-[13px] text-[#8a909a]">Connect Shopify to see this customer&apos;s order history here.</p>
            <Link href="/settings" className="flex items-center gap-1 text-[13px] font-medium text-[#3b82f6]">
              Connect Shopify <ArrowRight className="size-3.5" />
            </Link>
          </div>
        ) : !shopifyMatch ? (
          <p className="text-[13px] text-[#8a909a]">No Shopify customer found for this email address.</p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[13px] text-[#8a909a]">{shopifyMatch.ordersCount} order(s)</p>
              <a
                href={shopifyMatch.adminUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-[13px] font-medium text-[#3b82f6]"
              >
                View customer <ExternalLink className="size-3.5" />
              </a>
            </div>
            {shopifyMatch.recentOrders.map((order) => (
              <div key={order.id} className="rounded-lg border border-[#eeeeee] p-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-[13.5px] font-semibold text-[#12181f]">{order.name}</p>
                  <p className="text-[12.5px] text-[#9aa0a8]">{new Date(order.createdAt).toLocaleDateString()}</p>
                </div>
                <p className="mt-0.5 text-[12.5px] text-[#8a909a]">{order.lineItems.join(", ")}</p>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-[12.5px] text-[#8a909a]">{order.fulfillmentStatus}</span>
                  <span className="text-[12.5px] font-medium text-[#12181f]">
                    {order.totalPrice} {order.currency}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </SidebarCard>

      {thread.category === "customer" && (
        <SidebarCard title="Issue type">
          <select
            defaultValue={thread.issue_type ?? ""}
            disabled={pending}
            onChange={(e) => run(() => setIssueType(thread.id, e.target.value || null))}
            className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-[13px]"
          >
            <option value="">Not set</option>
            {CUSTOMER_ISSUE_TYPES.map((t) => (
              <option key={t} value={t}>
                {ISSUE_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </SidebarCard>
      )}

      <SidebarCard
        title="Labels"
        action={
          !addingLabel && (
            <button
              type="button"
              onClick={() => setAddingLabel(true)}
              className="flex items-center gap-1 text-[13px] font-medium text-[#3d4451] hover:text-[#12181f]"
            >
              <Plus className="size-3.5" /> Add label
            </button>
          )
        }
      >
        <div className="flex flex-wrap gap-1.5">
          {thread.labels.map((label) => (
            <span
              key={label}
              className="flex items-center gap-1 rounded-md bg-[#f0f0f0] px-2 py-1 text-[12.5px] font-medium text-[#3d4451]"
            >
              {label}
              <button type="button" onClick={() => removeLabel(label)} disabled={pending}>
                <X className="size-3" />
              </button>
            </span>
          ))}
          {thread.labels.length === 0 && !addingLabel && (
            <p className="text-[13px] text-[#9aa0a8]">No labels yet.</p>
          )}
        </div>
        {addingLabel && (
          <div className="mt-2 flex items-center gap-1.5">
            <input
              autoFocus
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addLabel()}
              placeholder="Label name"
              className="h-8 flex-1 rounded-md border border-input bg-transparent px-2 text-[13px]"
            />
            <button type="button" onClick={addLabel} className="text-[13px] font-medium text-[#3b82f6]">
              Add
            </button>
          </div>
        )}
      </SidebarCard>

      <SidebarCard title="Actions">
        <div className="flex flex-col">
          <div className="px-2 py-1.5">
            <label className="text-[12px] text-[#9aa0a8]">Priority</label>
            <select
              defaultValue={thread.priority}
              disabled={pending}
              onChange={(e) => run(() => setPriority(thread.id, e.target.value as CasePriority))}
              className="mt-1 h-8 w-full rounded-md border border-input bg-transparent px-2 text-[13px]"
            >
              {Object.entries(CASE_PRIORITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="px-2 py-1.5">
            <label className="text-[12px] text-[#9aa0a8]">Assign to</label>
            <select
              defaultValue={thread.owner_id ?? ""}
              disabled={pending}
              onChange={(e) => run(() => reassignThread(thread.id, e.target.value || null))}
              className="mt-1 h-8 w-full rounded-md border border-input bg-transparent px-2 text-[13px]"
            >
              <option value="">Unassigned</option>
              {assignableProfiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {ROLE_LABELS[p.role]}
                </option>
              ))}
            </select>
          </div>
          <ActionButton label="Assign to me" disabled={pending} onClick={() => run(() => assignToMe(thread.id))} />

          {thread.status !== "waiting" && thread.status !== "resolved" && thread.status !== "archived" && (
            <ActionButton label="Mark as waiting" disabled={pending} onClick={() => run(() => markWaiting(thread.id))} />
          )}
          {thread.status !== "resolved" && thread.status !== "archived" && (
            <ActionButton label="Resolve" disabled={pending} onClick={() => run(() => markResolved(thread.id))} />
          )}
          {thread.status === "resolved" && (
            <ActionButton label="Archive now" disabled={pending} onClick={() => run(() => archiveCase(thread.id))} />
          )}
          {thread.status === "archived" && (
            <ActionButton label="Restore" disabled={pending} onClick={() => run(() => restoreCase(thread.id))} />
          )}
          {!thread.suppressed ? (
            <ActionButton
              label="Not relevant"
              disabled={pending}
              onClick={() => {
                if (!confirm("Mark as not relevant? This removes it from active Communications but leaves the original Gmail message untouched.")) return;
                startTransition(() => markNotRelevant(thread.id));
              }}
            />
          ) : (
            <ActionButton label="Restore (was marked not relevant)" disabled={pending} onClick={() => run(() => restoreFromNotRelevant(thread.id))} />
          )}

          <ActionButton
            label="Delete conversation"
            danger
            disabled={pending}
            onClick={() => {
              if (!confirm("Delete this conversation? It can be recovered from the database if needed.")) return;
              startTransition(() => deleteConversation(thread.id));
            }}
          />
        </div>
      </SidebarCard>
    </div>
  );
}
