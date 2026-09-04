import { Badge } from "@/components/ui/badge";
import { PRIORITY_LABELS, type TaskPriority } from "@/lib/types";
import { cn } from "@/lib/utils";

const STYLES: Record<TaskPriority, string> = {
  low: "bg-transparent text-muted-foreground border-border",
  normal: "bg-secondary text-secondary-foreground border-transparent",
  high: "bg-amber-100 text-amber-900 border-transparent dark:bg-amber-950 dark:text-amber-300",
  critical: "bg-red-100 text-red-900 border-transparent dark:bg-red-950 dark:text-red-300",
};

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  if (priority === "normal") return null;
  return (
    <Badge variant="outline" className={cn("font-normal", STYLES[priority])}>
      {PRIORITY_LABELS[priority]}
    </Badge>
  );
}
