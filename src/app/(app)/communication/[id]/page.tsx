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
import { extractEmail } from "@/lib/ai/provider";
import { TicketHeader } from "@/components/communication/ticket-header";
import { AiCasePanel } from "@/components/communication/ai-case-panel";
import { ConversationPanel } from "@/components/communication/conversation-panel";
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
    shopifyStatus.connected && thread.sender ? await findShopifyCustomerByEmail(extractEmail(thread.sender)).catch(() => null) : null;

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

        <TicketHeader thread={thread} shopifyMatch={shopifyMatch} />

        <AiCasePanel threadId={thread.id} summary={thread.ai_summary} checklist={thread.ai_checklist} />

        <ConversationPanel messages={messages} />

        <ReplyComposer threadId={thread.id} gmailConnected={gmailStatus.connected} initialDraft={thread.draft_reply} />
      </div>

      <TicketSidebar thread={thread} profiles={profiles} shopifyMatch={shopifyMatch} shopifyConnected={shopifyStatus.connected} />
    </div>
  );
}
