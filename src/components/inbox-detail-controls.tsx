"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  changeThreadStatus,
  createTaskFromThread,
  generateDraft,
  reassignThread,
  sendDraft,
  setFollowUpDate,
  updateDraft,
} from "@/actions/inbox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  PRIORITY_LABELS,
  ROLE_LABELS,
  THREAD_STATUS_LABELS,
  type Area,
  type EmailThreadWithRelations,
  type Profile,
  type ThreadStatus,
} from "@/lib/types";

export function InboxDetailControls({
  thread,
  profiles,
  areas,
}: {
  thread: EmailThreadWithRelations;
  profiles: Profile[];
  areas: Area[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState(thread.draft_reply ?? "");
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState(thread.suggested_task_title ?? thread.subject ?? "");
  const [createdTaskId, setCreatedTaskId] = useState<string | null>(null);

  function run(fn: () => Promise<void>) {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  }

  return (
    <div className="space-y-5 rounded-lg border border-border p-4">
      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <select
          id="status"
          defaultValue={thread.status}
          disabled={pending}
          onChange={(e) => run(() => changeThreadStatus(thread.id, e.target.value as ThreadStatus))}
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
        >
          {Object.entries(THREAD_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="owner">Felelős</Label>
        <select
          id="owner"
          defaultValue={thread.owner_id ?? ""}
          disabled={pending}
          onChange={(e) => run(() => reassignThread(thread.id, e.target.value || null))}
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
        >
          <option value="">Needs assignment</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {ROLE_LABELS[p.role]}
            </option>
          ))}
        </select>
      </div>

      {thread.status === "waiting" && (
        <div className="space-y-2">
          <Label htmlFor="follow_up">Follow-up</Label>
          <Input
            id="follow_up"
            type="date"
            defaultValue={thread.follow_up_at ?? ""}
            disabled={pending}
            onChange={(e) => run(() => setFollowUpDate(thread.id, e.target.value || null))}
          />
        </div>
      )}

      <div className="space-y-2 border-t border-border pt-4">
        <Label>AI válasz</Label>
        {draft ? (
          <>
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => run(() => updateDraft(thread.id, draft))}
              rows={8}
              disabled={pending}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await updateDraft(thread.id, draft);
                    await sendDraft(thread.id);
                    setDraft("");
                    router.refresh();
                  })
                }
              >
                Send
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await generateDraft(thread.id);
                    router.refresh();
                  })
                }
              >
                Regenerate
              </Button>
            </div>
          </>
        ) : (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await generateDraft(thread.id);
                router.refresh();
              })
            }
          >
            Generate draft
          </Button>
        )}
      </div>

      <div className="space-y-2 border-t border-border pt-4">
        <Label>Task</Label>
        {createdTaskId ? (
          <Link href={`/tasks/${createdTaskId}`} className="text-sm underline">
            Task létrehozva →
          </Link>
        ) : showTaskForm ? (
          <div className="space-y-2">
            <Input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Task címe" />
            <select
              id="task_owner"
              defaultValue={thread.owner_id ?? profiles[0]?.id}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {ROLE_LABELS[p.role]}
                </option>
              ))}
            </select>
            <select
              id="task_area"
              defaultValue=""
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            >
              <option value="">— Area —</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <select
              id="task_priority"
              defaultValue={thread.priority}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            >
              {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              disabled={pending || !taskTitle.trim()}
              onClick={() =>
                startTransition(async () => {
                  const ownerEl = document.getElementById("task_owner") as HTMLSelectElement;
                  const areaEl = document.getElementById("task_area") as HTMLSelectElement;
                  const priorityEl = document.getElementById("task_priority") as HTMLSelectElement;
                  const id = await createTaskFromThread(thread.id, {
                    title: taskTitle,
                    ownerId: ownerEl.value,
                    areaId: areaEl.value || null,
                    priority: priorityEl.value,
                  });
                  setCreatedTaskId(id);
                })
              }
            >
              Task létrehozása
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setShowTaskForm(true)}>
            Create task
          </Button>
        )}
      </div>
    </div>
  );
}
