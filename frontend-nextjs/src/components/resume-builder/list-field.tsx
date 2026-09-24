"use client";

// list-field.tsx — edit a string[] form value as delimited text.
//
// Bullets are one-per-line, skills are comma-separated. The form value must be
// an array (the zod schema rejects a string, which used to make autosave fail
// silently), but re-deriving the text from the array on every keystroke would
// swallow the newline or comma the user just typed. So the raw text is kept
// locally and only the parsed array is written to the form.

import { useEffect, useRef, useState } from "react";
import { Controller, type Control, type FieldPath } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ResumeFormValues } from "./resume-form";

interface ListFieldProps {
  control: Control<ResumeFormValues>;
  name: FieldPath<ResumeFormValues>;
  /** "lines" → textarea, one item per line; "comma" → single-line input. */
  mode: "lines" | "comma";
  id?: string;
  placeholder?: string;
  rows?: number;
}

function parse(text: string, mode: ListFieldProps["mode"]): string[] {
  return text
    .split(mode === "lines" ? /\r?\n/ : ",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function format(items: string[], mode: ListFieldProps["mode"]): string {
  return items.join(mode === "lines" ? "\n" : ", ");
}

function sameList(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

export function ListField(props: ListFieldProps) {
  return (
    <Controller
      control={props.control}
      name={props.name}
      render={({ field }) => (
        <ListFieldInner
          {...props}
          value={Array.isArray(field.value) ? (field.value as string[]) : []}
          onChange={field.onChange}
          onBlur={field.onBlur}
        />
      )}
    />
  );
}

function ListFieldInner({
  mode,
  id,
  placeholder,
  rows,
  value,
  onChange,
  onBlur,
}: ListFieldProps & {
  value: string[];
  onChange: (next: string[]) => void;
  onBlur: () => void;
}) {
  const [text, setText] = useState(() => format(value, mode));
  const lastEmitted = useRef<string[]>(value);

  // Pick up changes made outside this field (AI enhance, tailor, restore).
  // Our own edits round-trip unchanged, so they never reset the caret.
  useEffect(() => {
    if (!sameList(value, lastEmitted.current)) {
      lastEmitted.current = value;
      setText(format(value, mode));
    }
  }, [value, mode]);

  const handle = (next: string) => {
    setText(next);
    const parsed = parse(next, mode);
    lastEmitted.current = parsed;
    onChange(parsed);
  };

  if (mode === "lines") {
    return (
      <Textarea
        id={id}
        value={text}
        onChange={(e) => handle(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        rows={rows ?? 4}
      />
    );
  }

  return (
    <Input
      id={id}
      value={text}
      onChange={(e) => handle(e.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
    />
  );
}
