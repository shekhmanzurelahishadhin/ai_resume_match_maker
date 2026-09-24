"use client";

// skills-editor.tsx — categorized skill editor.
// Each group has a name + comma-separated items. Add/remove/rename groups.

import { useFieldArray, type Control, type FieldErrors } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ResumeFormValues } from "./resume-form";
import { ListField } from "./list-field";

interface Props {
  control: Control<ResumeFormValues>;
  register: ReturnType<typeof import("react-hook-form").useForm<ResumeFormValues>>["register"];
  errors: FieldErrors<ResumeFormValues>;
}

export function SkillsEditor({ control, register, errors }: Props) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "skills",
  });

  return (
    <div className="space-y-4">
      {fields.length === 0 && (
        <p className="text-sm text-muted-foreground italic">
          No skills added yet. Click "Add skill group" to begin.
        </p>
      )}
      {fields.map((field, index) => {
        const err = errors.skills?.[index];
        return (
          <Card key={field.id}>
            <CardHeader className="py-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm">Skill group #{index + 1}</CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 text-rose-600 hover:text-rose-700"
                  onClick={() => remove(index)}
                  aria-label="Remove group"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 py-3">
              <div className="space-y-1">
                <Label className="text-xs">Category</Label>
                <Input
                  {...register(`skills.${index}.category` as const)}
                  placeholder="Languages"
                />
                {err?.category && (
                  <p className="text-xs text-rose-600">{err.category.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Items (comma-separated)</Label>
                <ListField
                  control={control}
                  name={`skills.${index}.items` as const}
                  mode="comma"
                  placeholder="TypeScript, Python, Go"
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
        onClick={() => append({ category: "", items: [] })}
      >
        <Plus className="size-4" /> Add skill group
      </Button>
    </div>
  );
}
