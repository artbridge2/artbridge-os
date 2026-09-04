import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS, type TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STYLES: Record<TaskStatus, string> = {
  backlog: "bg-transparent text-muted-foreground border-border",
  todo: "bg-secondary text-secondary-foreground border-transparent",
  in_progress: "bg-blue-100 text-blue-900 border-transparent dark:bg-blue-950 dark:text-blue-300",
  waiting: "bg-amber-100 text-amber-900 border-transparent dark:bg-amber-950 dark:text-amber-300",
  done: "bg-green-100 text-green-900 border-transparent dark:bg-green-950 dark:text-green-300",
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <Badge variant="outline" className={cn("font-normal", STYLES[status])}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}
