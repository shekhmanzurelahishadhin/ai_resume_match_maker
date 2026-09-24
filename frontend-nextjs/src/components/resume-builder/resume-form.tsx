"use client";

// resume-form.tsx — tabbed form for editing a generated resume's content.
// Tabs: Contact / Summary / Experience / Education / Skills / Projects /
// Certifications. Auto-saves (debounced 1500ms) via PUT /api/resumes/generate/{id}.
//
// Only `contentJson` is sent. Template and theme are saved separately by the
// Design panel; sending them from here too used to overwrite a theme change
// with the stale value this form was mounted with.

import { useEffect, useRef, useState } from "react";
import { useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, Plus, Trash2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import {
  resumeContentSchema,
  type ResumeContent,
} from "@/lib/validators/resume-content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EnhanceButton } from "./enhance-button";
import { ExperienceEditor } from "./experience-editor";
import { SkillsEditor } from "./skills-editor";

export type ResumeFormValues = ResumeContent;

interface Props {
  resumeId: string;
  initialContent: ResumeContent;
  onSaved?: (version: number) => void;
}

export function ResumeForm({ resumeId, initialContent, onSaved }: Props) {
  const qc = useQueryClient();
  const [revision, setRevision] = useState(0);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const form = useForm<ResumeFormValues>({
    resolver: zodResolver(resumeContentSchema) as never,
    defaultValues: initialContent,
    mode: "onChange",
  });
  const {
    register,
    control,
    handleSubmit,
    watch,
    getValues,
    setValue,
    formState: { errors, isDirty },
  } = form;

  // Bump the revision counter whenever any field changes (drives the preview).
  // Use the subscription API to avoid re-rendering the whole form on each keystroke.
  useEffect(() => {
    // React Compiler can't safely memoize react-hook-form's `watch()`; this
    // is the documented subscription pattern. The warning is benign.
    // eslint-disable-next-line react-hooks/incompatible-library
    const sub = watch(() => {
      setRevision((r) => r + 1);
    });
    return () => sub.unsubscribe();
  }, [watch]);

  const saveMut = useMutation({
    mutationFn: async (content: ResumeFormValues) => {
      const res = await fetch(`/api/resumes/generate/${resumeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentJson: content }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Save failed");
      return json.data;
    },
    onSuccess: (data) => {
      toast.success(`Saved (v${data.resume.version}).`);
      qc.invalidateQueries({ queryKey: ["generated", resumeId] });
      onSaved?.(data.resume.version);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Auto-save (debounced 1500ms) after each edit. Keyed on `revision` (bumped
  // only by field changes) rather than `isDirty` + the mutation object: the
  // form stays dirty after a save and the mutation object changes identity on
  // every status change, so depending on those re-saved in an endless loop.
  const { mutate: save } = saveMut;
  useEffect(() => {
    if (revision === 0 || !isDirty) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      handleSubmit((values) => save(values))();
    }, 1500);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [revision, isDirty, handleSubmit, save]);

  // Convenience: project field-array.
  // (Projects + Education are simple enough to inline here without a separate component.)

  const eduList = watch("education");
  const projList = watch("projects");
  const certList = watch("certifications");

  const setEdu = (i: number, key: keyof ResumeContent["education"][number], value: string) => {
    const next = [...(getValues("education") as ResumeContent["education"])];
    next[i] = { ...next[i], [key]: value };
    setValue("education", next, { shouldDirty: true });
  };
  const addEdu = () => {
    const next = [...(getValues("education") as ResumeContent["education"])];
    next.push({
      institution: "",
      degree: "",
      field: "",
      startDate: "",
      endDate: "",
      gpa: "",
    });
    setValue("education", next, { shouldDirty: true });
  };
  const removeEdu = (i: number) => {
    const next = [...(getValues("education") as ResumeContent["education"])];
    next.splice(i, 1);
    setValue("education", next, { shouldDirty: true });
  };

  const setProj = (i: number, key: keyof NonNullable<ResumeContent["projects"]>[number], value: string | string[]) => {
    const next = [...((getValues("projects") as NonNullable<ResumeContent["projects"]>) ?? [])];
    next[i] = { ...next[i], [key]: value } as NonNullable<ResumeContent["projects"]>[number];
    setValue("projects", next, { shouldDirty: true });
  };
  const addProj = () => {
    const next = [...((getValues("projects") as NonNullable<ResumeContent["projects"]>) ?? [])];
    next.push({
      name: "",
      description: "",
      url: "",
      technologies: [],
    });
    setValue("projects", next, { shouldDirty: true });
  };
  const removeProj = (i: number) => {
    const next = [...((getValues("projects") as NonNullable<ResumeContent["projects"]>) ?? [])];
    next.splice(i, 1);
    setValue("projects", next, { shouldDirty: true });
  };

  type Cert = NonNullable<ResumeContent["certifications"]>[number];
  const certs = () => [...((getValues("certifications") as Cert[] | undefined) ?? [])];
  const setCert = (i: number, key: keyof Cert, value: string) => {
    const next = certs();
    next[i] = { ...next[i], [key]: value };
    setValue("certifications", next, { shouldDirty: true });
  };
  const addCert = () => {
    setValue("certifications", [...certs(), { name: "", issuer: "", date: "" }], {
      shouldDirty: true,
    });
  };
  const removeCert = (i: number) => {
    const next = certs();
    next.splice(i, 1);
    setValue("certifications", next, { shouldDirty: true });
  };

  return (
    <Card>
      <CardContent className="p-4 md:p-6">
        <Tabs defaultValue="contact">
          <TabsList className="grid w-full grid-cols-4 sm:grid-cols-7 mb-4 h-auto">
            <TabsTrigger value="contact" className="text-xs sm:text-sm">Contact</TabsTrigger>
            <TabsTrigger value="summary" className="text-xs sm:text-sm">Summary</TabsTrigger>
            <TabsTrigger value="experience" className="text-xs sm:text-sm">Experience</TabsTrigger>
            <TabsTrigger value="education" className="text-xs sm:text-sm">Education</TabsTrigger>
            <TabsTrigger value="skills" className="text-xs sm:text-sm">Skills</TabsTrigger>
            <TabsTrigger value="projects" className="text-xs sm:text-sm">Projects</TabsTrigger>
            <TabsTrigger value="certifications" className="text-xs sm:text-sm">Certs</TabsTrigger>
          </TabsList>

          {/* CONTACT */}
          <TabsContent value="contact" className="space-y-3 mt-2">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Full name" required error={errors.contact?.name?.message}>
                <Input {...register("contact.name")} placeholder="Alex Sample" />
              </Field>
              <Field label="Email" required error={errors.contact?.email?.message}>
                <Input type="email" {...register("contact.email")} placeholder="alex@example.com" />
              </Field>
              <Field label="Phone" error={errors.contact?.phone?.message}>
                <Input {...register("contact.phone")} placeholder="+1 (555) 123-4567" />
              </Field>
              <Field label="Location" error={errors.contact?.location?.message}>
                <Input {...register("contact.location")} placeholder="San Francisco, CA" />
              </Field>
              <Field label="Website" error={errors.contact?.website?.message}>
                <Input {...register("contact.website")} placeholder="alexsample.dev" />
              </Field>
              <Field label="LinkedIn" error={errors.contact?.linkedin?.message}>
                <Input {...register("contact.linkedin")} placeholder="linkedin.com/in/alexsample" />
              </Field>
              <Field label="GitHub" error={errors.contact?.github?.message}>
                <Input {...register("contact.github")} placeholder="github.com/alexsample" />
              </Field>
            </div>
          </TabsContent>

          {/* SUMMARY */}
          <TabsContent value="summary" className="space-y-3 mt-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Label className="text-xs text-muted-foreground">
                A 1–3 sentence elevator pitch.
              </Label>
              <EnhanceButton
                resumeId={resumeId}
                section="summary"
                getField={() => (document.getElementById("summary-textarea") as HTMLTextAreaElement | null)?.value ?? ""}
                onApply={(improved) => {
                  const el = document.getElementById("summary-textarea") as HTMLTextAreaElement | null;
                  if (el) el.value = improved;
                  setValue("summary", improved, { shouldDirty: true });
                }}
              />
            </div>
            <Textarea
              id="summary-textarea"
              {...register("summary")}
              rows={5}
              placeholder="Senior product engineer with 8+ years building delightful web apps end-to-end."
            />
            {errors.summary && (
              <p className="text-xs text-rose-600">{errors.summary.message}</p>
            )}
          </TabsContent>

          {/* EXPERIENCE */}
          <TabsContent value="experience" className="mt-2">
            <ExperienceEditor control={control} register={register} errors={errors as FieldErrors<ResumeFormValues>} setValue={setValue} />
          </TabsContent>

          {/* EDUCATION */}
          <TabsContent value="education" className="space-y-3 mt-2">
            {eduList.length === 0 && (
              <p className="text-sm text-muted-foreground italic">
                No education added yet.
              </p>
            )}
            {eduList.map((_, index) => (
              <Card key={index}>
                <CardContent className="py-3 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">Education #{index + 1}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 text-rose-600 hover:text-rose-700"
                      onClick={() => removeEdu(index)}
                      aria-label="Remove"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Field label="Institution">
                      <Input
                        value={eduList[index]?.institution ?? ""}
                        onChange={(e) => setEdu(index, "institution", e.target.value)}
                        placeholder="State University"
                      />
                    </Field>
                    <Field label="Degree">
                      <Input
                        value={eduList[index]?.degree ?? ""}
                        onChange={(e) => setEdu(index, "degree", e.target.value)}
                        placeholder="B.S."
                      />
                    </Field>
                    <Field label="Field">
                      <Input
                        value={eduList[index]?.field ?? ""}
                        onChange={(e) => setEdu(index, "field", e.target.value)}
                        placeholder="Computer Science"
                      />
                    </Field>
                    <Field label="GPA">
                      <Input
                        value={eduList[index]?.gpa ?? ""}
                        onChange={(e) => setEdu(index, "gpa", e.target.value)}
                        placeholder="3.8"
                      />
                    </Field>
                    <Field label="Start date">
                      <Input
                        value={eduList[index]?.startDate ?? ""}
                        onChange={(e) => setEdu(index, "startDate", e.target.value)}
                        placeholder="2013"
                      />
                    </Field>
                    <Field label="End date">
                      <Input
                        value={eduList[index]?.endDate ?? ""}
                        onChange={(e) => setEdu(index, "endDate", e.target.value)}
                        placeholder="2017"
                      />
                    </Field>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addEdu}>
              <Plus className="size-4" /> Add education
            </Button>
          </TabsContent>

          {/* SKILLS */}
          <TabsContent value="skills" className="mt-2">
            <SkillsEditor control={control} register={register} errors={errors as FieldErrors<ResumeFormValues>} />
          </TabsContent>

          {/* PROJECTS */}
          <TabsContent value="projects" className="space-y-3 mt-2">
            {(projList?.length ?? 0) === 0 && (
              <p className="text-sm text-muted-foreground italic">
                No projects added yet.
              </p>
            )}
            {(projList ?? []).map((_, index) => (
              <Card key={index}>
                <CardContent className="py-3 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">Project #{index + 1}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 text-rose-600 hover:text-rose-700"
                      onClick={() => removeProj(index)}
                      aria-label="Remove"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Field label="Name">
                      <Input
                        value={projList?.[index]?.name ?? ""}
                        onChange={(e) => setProj(index, "name", e.target.value)}
                        placeholder="OpenResume"
                      />
                    </Field>
                    <Field label="URL">
                      <Input
                        value={projList?.[index]?.url ?? ""}
                        onChange={(e) => setProj(index, "url", e.target.value)}
                        placeholder="github.com/alex/openresume"
                      />
                    </Field>
                  </div>
                  <Field label="Description">
                    <Textarea
                      value={projList?.[index]?.description ?? ""}
                      onChange={(e) => setProj(index, "description", e.target.value)}
                      rows={2}
                      placeholder="Open-source resume builder with 2k+ stars."
                    />
                  </Field>
                  <Field label="Technologies (comma-separated)">
                    <Input
                      value={(projList?.[index]?.technologies ?? []).join(", ")}
                      onChange={(e) =>
                        setProj(
                          index,
                          "technologies",
                          e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                        )
                      }
                      placeholder="Next.js, Prisma, Tailwind"
                    />
                  </Field>
                </CardContent>
              </Card>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addProj}>
              <Plus className="size-4" /> Add project
            </Button>
          </TabsContent>

          {/* CERTIFICATIONS */}
          <TabsContent value="certifications" className="space-y-3 mt-2">
            {(certList?.length ?? 0) === 0 && (
              <p className="text-sm text-muted-foreground italic">
                No certifications added yet.
              </p>
            )}
            {(certList ?? []).map((_, index) => (
              <Card key={index}>
                <CardContent className="py-3 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">Certification #{index + 1}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 text-rose-600 hover:text-rose-700"
                      onClick={() => removeCert(index)}
                      aria-label="Remove"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                  <Field label="Name">
                    <Input
                      value={certList?.[index]?.name ?? ""}
                      onChange={(e) => setCert(index, "name", e.target.value)}
                      placeholder="AWS Solutions Architect – Associate"
                    />
                  </Field>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Field label="Issuer">
                      <Input
                        value={certList?.[index]?.issuer ?? ""}
                        onChange={(e) => setCert(index, "issuer", e.target.value)}
                        placeholder="Amazon Web Services"
                      />
                    </Field>
                    <Field label="Date">
                      <Input
                        value={certList?.[index]?.date ?? ""}
                        onChange={(e) => setCert(index, "date", e.target.value)}
                        placeholder="2024"
                      />
                    </Field>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addCert}>
              <Plus className="size-4" /> Add certification
            </Button>
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-between gap-2 mt-6 pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            Auto-saves 1.5s after you stop typing.
          </p>
          <Button
            type="button"
            onClick={handleSubmit((v) => saveMut.mutate(v))}
            disabled={saveMut.isPending}
            className="gap-1.5"
          >
            {saveMut.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Save now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">
        {label} {required && <span className="text-rose-600">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}

// Re-export for components that need to know about the form's revision counter.
export { Sparkles };
