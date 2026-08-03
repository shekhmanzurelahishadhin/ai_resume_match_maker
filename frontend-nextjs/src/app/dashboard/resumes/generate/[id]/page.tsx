// [id]/page.tsx — edit a generated resume (form + live preview).
// Privacy: only the owner can view/edit. Defense-in-depth alongside middleware.

import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  resumeContentSchema,
  customizationSchema,
  type ResumeContent,
  type ResumeCustomization,
} from "@/lib/validators/resume-content";
import { EditorClient } from "./editor-client";

export const dynamic = "force-dynamic";

export default async function EditGeneratedResumePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string } | undefined;
  if (!user?.id) notFound();

  const r = await db.generatedResume.findUnique({
    where: { id },
    include: {
      template: { select: { slug: true, name: true } },
    },
  });
  if (!r) notFound();
  if (r.userId !== user.id) notFound();

  // Validate stored content. If it's malformed, fall back to an empty shell
  // (the user can still use the editor to rebuild).
  const contentParsed = resumeContentSchema.safeParse(r.contentJson);
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
      templateName={r.template.name}
      templateSlug={r.template.slug}
      currentVersion={r.version}
    />
  );
}
