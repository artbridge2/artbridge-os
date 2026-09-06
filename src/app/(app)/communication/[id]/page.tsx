import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentProfile } from "@/lib/dal";
import { canAccessCommunication } from "@/lib/permissions";
import { getEmailMessages, getEmailThreadById } from "@/lib/queries-inbox";
import { getProfiles } from "@/lib/queries";
import { getGmailConnectionStatus } from "@/lib/gmail/status";
import { getShopifyConnectionStatus } from "@/lib/shopify/status";
import { findShopifyCustomerByEmail } from "@/lib/shopify/lookup";
import { TicketHeader } from "@/components/communication/ticket-header";
import { TicketMessages } from "@/components/communication/ticket-messages";
import { ReplyComposer } from "@/components/communication/reply-composer";
import { TicketSidebar } from "@/components/communication/ticket-sidebar";

export default async function ThreadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!(await canAccessCommunication(profile))) redirect("/");

  const [thread, messages, profiles, gmailStatus, shopifyStatus] = await Promise.all([
    getEmailThreadById(id),
    getEmailMessages(id),
    getProfiles(),
    getGmailConnectionStatus(),
    getShopifyConnectionStatus(),
  ]);

  if (!thread) notFound();

  const shopifyMatch =
    shopifyStatus.connected && thread.sender ? await findShopifyCustomerByEmail(thread.sender).catch(() => null) : null;

  return (
    <div className="grid grid-cols-1 gap-6 pt-6 lg:grid-cols-[1fr_300px]">
      <div className="min-w-0 space-y-4">
        <Link
          href="/communication"
          className="inline-flex items-center gap-1 text-sm text-[#8a909a] hover:text-[#12181f]"
        >
          <ArrowLeft className="size-4" />
          Back to Communication
        </Link>

        <TicketHeader thread={thread} />

        {thread.ai_summary && (
          <div className="rounded-xl border border-[#eeeeee] bg-[#fafafa] p-3">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-[#9aa0a8]">AI summary</p>
            <p className="mt-1 text-[13.5px] text-[#3d4451]">{thread.ai_summary}</p>
            {thread.suggested_next_action && (
              <p className="mt-2 text-[13px] text-[#5a616c]">
                <span className="font-medium">Suggested next action:</span> {thread.suggested_next_action}
              </p>
            )}
          </div>
        )}

        <TicketMessages messages={messages} />

        <ReplyComposer threadId={thread.id} gmailConnected={gmailStatus.connected} />
      </div>

      <TicketSidebar thread={thread} profiles={profiles} shopifyMatch={shopifyMatch} shopifyConnected={shopifyStatus.connected} />
    </div>
  );
}
