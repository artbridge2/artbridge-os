"use client";

import { postTaskComment } from "@/actions/tasks";
import { Discussion } from "@/components/shared/discussion";
import type { Profile, TaskComment } from "@/lib/types";

export function TaskComments({
  taskId,
  comments,
  profiles,
}: {
  taskId: string;
  comments: (TaskComment & { author: Profile | null })[];
  profiles: Profile[];
}) {
  return (
    <Discussion
      title="Comments"
      placeholder="Write a comment…"
      emptyLabel="No comments yet."
      comments={comments}
      profiles={profiles}
      onPost={(body, mentionedProfileIds) => postTaskComment(taskId, body, mentionedProfileIds)}
    />
  );
}
