import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentProfile } from "@/lib/dal";
import { hasCapability } from "@/lib/permissions";
import { getAiInstructions } from "@/lib/ai/instructions";
import { AiInstructionEditor } from "@/components/settings/ai-instruction-editor";

export default async function AiInstructionsPage() {
  const profile = await getCurrentProfile();
  const canManage = await hasCapability(profile, "settings_ai");
  if (!canManage) redirect("/settings");

  const instructions = await getAiInstructions();

  return (
    <div className="max-w-2xl space-y-4 pt-6">
      <Link href="/settings/ai" className="inline-flex items-center gap-1 text-sm text-[#8a909a] hover:text-[#12181f]">
        <ArrowLeft className="size-4" />
        AI settings
      </Link>

      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-[#12181f]">AI instructions</h1>
        <p className="mt-1 text-[13.5px] text-[#8a909a]">
          Persistent business context and rules AI capabilities follow. Each save creates a new version — never edits history in place.
        </p>
      </div>

      <div className="space-y-4">
        {instructions.map((instruction) => (
          <AiInstructionEditor key={instruction.key} instruction={instruction} />
        ))}
      </div>
    </div>
  );
}
