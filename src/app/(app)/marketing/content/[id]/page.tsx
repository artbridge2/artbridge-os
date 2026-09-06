import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentProfile } from "@/lib/dal";
import { hasCapability } from "@/lib/permissions";
import { getProfiles } from "@/lib/queries";
import { getCampaigns } from "@/lib/queries-marketing";
import { getContentItemById } from "@/lib/queries-content";
import { ContentHeader } from "@/components/marketing/content-header";
import { ContentBodyEditor } from "@/components/marketing/content-body-editor";
import { ContentSidebar } from "@/components/marketing/content-sidebar";
import { NotAuthorized } from "@/components/home/not-authorized";

export default async function ContentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!(await hasCapability(profile, "content"))) return <NotAuthorized title="Content" />;
  const canManage = true;

  const [item, profiles, campaigns] = await Promise.all([getContentItemById(id), getProfiles(), getCampaigns()]);

  if (!item) notFound();

  return (
    <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-6 pt-6 lg:grid-cols-[1fr_280px]">
      <div className="min-w-0 space-y-4">
        <Link href="/marketing/content" className="inline-flex items-center gap-1 text-sm text-[#8a909a] hover:text-[#12181f]">
          <ArrowLeft className="size-4" />
          Content
        </Link>

        <ContentHeader item={item} />

        <ContentBodyEditor contentItemId={item.id} initialBody={item.body} canEdit={canManage} />
      </div>

      <ContentSidebar item={item} profiles={profiles} campaigns={campaigns.map((c) => ({ id: c.id, name: c.name }))} canManage={canManage} />
    </div>
  );
}
