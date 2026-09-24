// [id]/page.tsx — edit a generated resume (form + live preview).
// Privacy: only the owner can view/edit. Defense-in-depth alongside middleware.

import { notFound } from "next/navigation";

import { apiGetOrNull } from "@/lib/server-api";
import {
  parseResumeContent,
  customizationSchema,
  type ResumeContent,
  type ResumeCustomization,
} from "@/lib/validators/resume-content";
import { EditorClient } from "./editor-client";

export const dynamic = "force-dynamic";

interface GeneratedResumeDetail {
  id: string;
  version: number;
  contentJson: unknown;
  customizationJson: unknown;
  template: { id: string; slug: string; name: string };
}

export default async function EditGeneratedResumePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Ownership is enforced by the API policy; a 403/404 arrives here as null.
  const payload = await apiGetOrNull<{ resume: GeneratedResumeDetail }>(
    `resumes/generate/${id}`,
  );
  const r = payload?.resume;
  if (!r) notFound();

  // Validate stored content. If it's malformed, fall back to an empty shell
  // (the user can still use the editor to rebuild).
  const contentParsed = parseResumeContent(r.contentJson);
  if (!contentParsed.success) {
    notFound();
  }
  const customizationParsed = customizationSchema.safeParse(r.customizationJson ?? {});

  return (
    <EditorClient
      resumeId={r.id}
      initialContent={contentParsed.data as ResumeContent}
      customization={
        (customizationParsed.success ? customizationParsed.data : null) as ResumeCustomization | null
      }
      templateId={r.template.id}
      templateName={r.template.name}
      templateSlug={r.template.slug}
      currentVersion={r.version}
    />
  );
}
