"use client";

import { postProjectComment } from "@/actions/projects";
import { Discussion } from "@/components/shared/discussion";
import type { Profile, ProjectComment } from "@/lib/types";

export function ProjectDiscussion({
  projectId,
  projectName,
  comments,
  profiles,
}: {
  projectId: string;
  projectName: string;
  comments: (ProjectComment & { author: Profile | null })[];
  profiles: Profile[];
}) {
  return (
    <Discussion
      placeholder="Discuss this project…"
      comments={comments}
      profiles={profiles}
      onPost={(body, mentionedProfileIds) => postProjectComment(projectId, body, projectName, mentionedProfileIds)}
    />
  );
}
