"use client";

// Split-screen shell for /login and /register: an animated brand panel on the
// left (desktop only) and the form card on the right.

import { motion } from "framer-motion";
import { Brain, CheckCircle2, Target, Wand2 } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";

const POINTS = [
  { icon: Brain, text: "AI extracts your skills from any PDF resume" },
  { icon: Target, text: "Explainable 0–100% match scores for every job" },
  { icon: Wand2, text: "Tailor resumes to a job in one click" },
];

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 p-10 text-white lg:flex lg:flex-col animate-gradient">
        <div className="absolute inset-0 bg-grid opacity-20" aria-hidden />
        <div className="absolute -left-20 top-1/3 size-80 rounded-full bg-emerald-300/30 blur-3xl animate-blob" aria-hidden />
        <div className="absolute -right-10 bottom-10 size-72 rounded-full bg-sky-400/25 blur-3xl animate-blob [animation-delay:-8s]" aria-hidden />

        <BrandLogo className="relative [&_p]:text-white [&_p:last-child]:text-white/70" />

        <div className="relative mt-auto max-w-md">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-3xl font-bold leading-tight tracking-tight xl:text-4xl"
          >
            Your next role — or your next hire — is one match away.
          </motion.h2>
          <ul className="mt-8 space-y-4">
            {POINTS.map((p, i) => (
              <motion.li
                key={p.text}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 + i * 0.12 }}
                className="flex items-center gap-3"
              >
                <span className="flex size-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20 backdrop-blur">
                  <p.icon className="size-4" />
                </span>
                <span className="text-sm text-white/90">{p.text}</span>
              </motion.li>
            ))}
          </ul>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="mt-10 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur animate-float"
          >
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Full-Stack Developer</span>
              <span className="rounded-full bg-emerald-400/25 px-2 py-0.5 text-xs font-semibold text-emerald-100">
                89% match
              </span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-teal-200"
                initial={{ width: 0 }}
                animate={{ width: "89%" }}
                transition={{ duration: 1.4, delay: 1, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
              {["Laravel", "React", "MySQL", "Docker"].map((s) => (
                <span key={s} className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5">
                  <CheckCircle2 className="size-3 text-emerald-300" /> {s}
                </span>
              ))}
            </div>
          </motion.div>
        </div>

        <p className="relative mt-10 text-xs text-white/60">
          © {new Date().getFullYear()} Resume Matchmaker
        </p>
      </aside>

      {/* Form side */}
      <main className="relative flex flex-col bg-app">
        <div className="flex items-center justify-between p-4 lg:justify-end">
          <BrandLogo className="lg:hidden" />
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center px-4 pb-12">
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-md"
          >
            <div className="mb-6">
              <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
            </div>
            <div className="rounded-2xl border bg-card p-6 shadow-xl shadow-black/5 dark:shadow-black/30">
              {children}
            </div>
            <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
