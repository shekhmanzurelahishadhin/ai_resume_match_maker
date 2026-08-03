"use client";

// experience-editor.tsx — add/remove/reorder/edit experience entries.
// Used inside the resume-form's Experience tab.

import { useFieldArray, type Control, type FieldErrors, type UseFormSetValue } from "react-hook-form";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EnhanceButton } from "./enhance-button";
import type { ResumeFormValues } from "./resume-form";

interface Props {
  control: Control<ResumeFormValues>;
  register: ReturnType<typeof import("react-hook-form").useForm<ResumeFormValues>>["register"];
  errors: FieldErrors<ResumeFormValues>;
  setValue: UseFormSetValue<ResumeFormValues>;
}

export function ExperienceEditor({ control, register, errors, setValue }: Props) {
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "experience",
  });

  return (
    <div className="space-y-4">
      {fields.length === 0 && (
        <p className="text-sm text-muted-foreground italic">
          No experience added yet. Click "Add experience" below to begin.
        </p>
      )}
      {fields.map((field, index) => {
        const expErr = errors.experience?.[index];
        return (
          <Card key={field.id}>
            <CardHeader className="py-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm">
                  Experience #{index + 1}
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    disabled={index === 0}
                    onClick={() => move(index, index - 1)}
                    aria-label="Move up"
                  >
                    <ArrowUp className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    disabled={index === fields.length - 1}
                    onClick={() => move(index, index + 1)}
                    aria-label="Move down"
                  >
                    <ArrowDown className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 text-rose-600 hover:text-rose-700"
                    onClick={() => remove(index)}
                    aria-label="Remove"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 py-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Position</Label>
                  <Input
                    {...register(`experience.${index}.position` as const)}
                    placeholder="Senior Engineer"
                  />
                  {expErr?.position && (
                    <p className="text-xs text-rose-600">{expErr.position.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Company</Label>
                  <Input
                    {...register(`experience.${index}.company` as const)}
                    placeholder="Acme Corp"
                  />
                  {expErr?.company && (
                    <p className="text-xs text-rose-600">{expErr.company.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Start date</Label>
                  <Input
                    {...register(`experience.${index}.startDate` as const)}
                    placeholder="Jan 2021"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">End date</Label>
                  <Input
                    {...register(`experience.${index}.endDate` as const)}
                    placeholder="Present"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Description (optional)</Label>
                <Textarea
                  {...register(`experience.${index}.description` as const)}
                  placeholder="Short summary of role and impact."
                  rows={2}
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs">Bullet points (one per line)</Label>
                  <EnhanceButton
                    section="experience"
                    getField={() => {
                      const v = (register(`experience.${index}.bullets` as const) as unknown as { name: string }).name;
                      void v;
                      const bullets = (document.getElementById(`exp-bullets-${index}`) as HTMLTextAreaElement | null)?.value ?? "";
                      return bullets.split(/\r?\n/).filter(Boolean).join("\n");
                    }}
                    onApply={(improved) => {
                      const el = document.getElementById(`exp-bullets-${index}`) as HTMLTextAreaElement | null;
                      if (el) el.value = improved;
                      // Also update react-hook-form's value so the change persists on save.
                      const lines = improved.split(/\r?\n/).filter(Boolean);
                      setValue(`experience.${index}.bullets` as const, lines, { shouldDirty: true });
                    }}
                  />
                </div>
                <Textarea
                  id={`exp-bullets-${index}`}
                  {...register(`experience.${index}.bullets` as const)}
                  setValueAs={(v) =>
                    typeof v === "string"
                      ? v.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
                      : Array.isArray(v)
                        ? v
                        : []
                  }
                  placeholder={"Built X that achieved Y\nLed migration to Z reducing latency by 40%"}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        );
      })}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          append({
            company: "",
            position: "",
            startDate: "",
            endDate: "",
            description: "",
            bullets: [],
          })
        }
      >
        <Plus className="size-4" /> Add experience
      </Button>
    </div>
  );
}
