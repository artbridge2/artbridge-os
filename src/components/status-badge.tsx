import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS, type TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STYLES: Record<TaskStatus, string> = {
  todo: "bg-secondary text-secondary-foreground border-transparent",
  in_progress: "bg-blue-100 text-blue-900 border-transparent dark:bg-blue-950 dark:text-blue-300",
  completed: "bg-green-100 text-green-900 border-transparent dark:bg-green-950 dark:text-green-300",
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <Badge variant="outline" className={cn("font-normal", STYLES[status])}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}
