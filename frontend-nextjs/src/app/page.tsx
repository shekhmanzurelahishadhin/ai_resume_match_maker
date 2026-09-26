"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import {
  Upload,
  Sparkles,
  Target,
  ArrowRight,
  Shield,
  Users,
  Briefcase,
  Wand2,
  MessageSquare,
  Bell,
  Send,
  Brain,
  CheckCircle2,
  XCircle,
  FileText,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";

const ease = [0.22, 1, 0.36, 1] as const;

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease } },
};

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const FEATURES = [
  {
    icon: Brain,
    title: "AI skill extraction",
    body: "Drop a PDF and we pull out skills, experience and seniority — with a 200+ skill dictionary fallback when the AI is offline.",
    tint: "from-emerald-500 to-teal-500",
  },
  {
    icon: Target,
    title: "Semantic match scoring",
    body: "Every resume ↔ job pair gets a 0–100% score blending semantic similarity with skills overlap.",
    tint: "from-teal-500 to-cyan-500",
  },
  {
    icon: Wand2,
    title: "Resume builder",
    body: "Build resumes in themed templates, tailor them to a job with AI, keep version history and export to PDF or DOCX.",
    tint: "from-violet-500 to-fuchsia-500",
  },
  {
    icon: Send,
    title: "One-click applications",
    body: "Apply with any of your resumes and track every application's status from submitted to hired.",
    tint: "from-sky-500 to-indigo-500",
  },
  {
    icon: MessageSquare,
    title: "Recruiter messaging",
    body: "Recruiters reach out to top candidates directly, and conversations live in a built-in inbox.",
    tint: "from-amber-500 to-orange-500",
  },
  {
    icon: Bell,
    title: "Smart notifications",
    body: "New matches, applicants and messages arrive in-app, by push, or as a daily digest — your choice.",
    tint: "from-rose-500 to-pink-500",
  },
];

const STEPS = [
  {
    icon: Upload,
    title: "Upload",
    body: "Drop in a PDF resume. We parse the text and extract your skills in seconds.",
  },
  {
    icon: Sparkles,
    title: "Match",
    body: "AI scores your resume against every open job and ranks the best fits.",
  },
  {
    icon: Target,
    title: "Connect",
    body: "Apply in one click, or get found by recruiters who can see exactly why you fit.",
  },
];

/** Floating product mock in the hero: a live-looking match result. */
function HeroMock() {
  const pct = 92;
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-tr from-emerald-500/25 via-teal-400/15 to-sky-400/20 blur-3xl" aria-hidden />

      <motion.div
        initial={{ opacity: 0, y: 30, rotate: -2 }}
        animate={{ opacity: 1, y: 0, rotate: 0 }}
        transition={{ duration: 0.8, ease, delay: 0.2 }}
        className="relative rounded-2xl border bg-card/90 p-5 shadow-2xl backdrop-blur"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Top match</p>
            <p className="mt-1 text-lg font-semibold">Senior Frontend Engineer</p>
            <p className="text-sm text-muted-foreground">Acme Labs · Remote</p>
          </div>
          <div className="relative size-20 shrink-0">
            <svg viewBox="0 0 80 80" className="size-20 -rotate-90">
              <circle cx="40" cy="40" r={r} className="fill-none stroke-muted" strokeWidth="7" />
              <motion.circle
                cx="40"
                cy="40"
                r={r}
                className="fill-none stroke-emerald-500"
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={c}
                initial={{ strokeDashoffset: c }}
                animate={{ strokeDashoffset: c * (1 - pct / 100) }}
                transition={{ duration: 1.6, ease, delay: 0.6 }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {pct}%
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Matched skills</p>
          <motion.div
            className="flex flex-wrap gap-1.5"
            variants={container}
            initial="hidden"
            animate="show"
          >
            {["React", "TypeScript", "Next.js", "Tailwind", "GraphQL"].map((s) => (
              <motion.span
                key={s}
                variants={fadeUp}
                className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300"
              >
                <CheckCircle2 className="size-3" /> {s}
              </motion.span>
            ))}
            <motion.span
              variants={fadeUp}
              className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
            >
              <XCircle className="size-3" /> Rust
            </motion.span>
          </motion.div>
        </div>

        <div className="mt-5 flex items-center gap-2">
          <div className="h-9 flex-1 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-center text-sm font-medium leading-9 text-white">
            Apply now
          </div>
          <div className="h-9 rounded-lg border px-3 text-sm leading-9 text-muted-foreground">Save</div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease, delay: 0.7 }}
        className="absolute -left-6 -bottom-8 hidden sm:flex animate-float items-center gap-3 rounded-xl border bg-card/95 px-3.5 py-2.5 shadow-xl backdrop-blur"
      >
        <div className="rounded-lg bg-gradient-to-br from-sky-500 to-indigo-500 p-2 text-white">
          <FileText className="size-4" />
        </div>
        <div className="text-xs">
          <p className="font-semibold">resume.pdf parsed</p>
          <p className="text-muted-foreground">24 skills · 6 yrs experience</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease, delay: 0.9 }}
        className="absolute -right-4 -top-6 hidden sm:flex items-center gap-2 rounded-full border bg-card/95 px-3 py-1.5 text-xs font-medium shadow-lg backdrop-blur [animation-delay:1.5s] animate-float"
      >
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
        </span>
        3 new matches
      </motion.div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      {/* Header */}
      <header className="glass sticky top-0 z-40 border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <BrandLogo />
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="transition-colors hover:text-foreground">Features</a>
            <a href="#how" className="transition-colors hover:text-foreground">How it works</a>
            <a href="#audience" className="transition-colors hover:text-foreground">For teams</a>
          </nav>
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm" className="rounded-full px-4">
              <Link href="/register">
                Get started <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative isolate border-b">
        <div className="absolute inset-0 -z-10 bg-grid [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" aria-hidden />
        <div className="absolute -top-24 -left-24 -z-10 size-[28rem] rounded-full bg-emerald-400/25 blur-3xl animate-blob dark:bg-emerald-500/15" aria-hidden />
        <div className="absolute top-20 -right-24 -z-10 size-[26rem] rounded-full bg-sky-400/20 blur-3xl animate-blob [animation-delay:-6s] dark:bg-sky-500/10" aria-hidden />

        <div className="container mx-auto grid items-center gap-16 px-4 py-16 md:py-24 lg:grid-cols-2">
          <motion.div variants={container} initial="hidden" animate="show" className="text-center lg:text-left">
            <motion.div
              variants={fadeUp}
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/70 bg-emerald-50/80 px-3 py-1 text-xs font-medium text-emerald-800 backdrop-blur dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200"
            >
              <Sparkles className="size-3" />
              AI-powered matching · works even offline
            </motion.div>
            <motion.h1
              variants={fadeUp}
              className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl"
            >
              Find the perfect{" "}
              <span className="text-gradient">resume ↔ job</span> fit in seconds.
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0">
              Upload a resume and let AI extract skills, score semantic fit, and surface the
              best opportunities. Recruiters get ranked, explainable candidate lists.
            </motion.p>
            <motion.div
              variants={fadeUp}
              className="mt-8 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3"
            >
              <Button asChild size="lg" className="group h-12 w-full sm:w-auto rounded-full px-7 text-base shadow-lg shadow-emerald-600/25">
                <Link href="/register?role=seeker">
                  I&apos;m a job seeker
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="group h-12 w-full sm:w-auto rounded-full px-7 text-base">
                <Link href="/register?role=recruiter">
                  I&apos;m a recruiter
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </motion.div>
            <motion.dl
              variants={fadeUp}
              className="mt-10 grid grid-cols-3 gap-4 max-w-md mx-auto lg:mx-0"
            >
              {[
                ["0–100%", "fit score"],
                ["6+", "resume themes"],
                ["2", "AI providers"],
              ].map(([n, l]) => (
                <div key={l} className="rounded-xl border bg-card/60 px-3 py-2.5 backdrop-blur">
                  <dt className="text-xl font-bold">{n}</dt>
                  <dd className="text-xs text-muted-foreground">{l}</dd>
                </div>
              ))}
            </motion.dl>
          </motion.div>

          <HeroMock />
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container mx-auto scroll-mt-20 px-4 py-20 md:py-24">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="text-sm font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Features</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Everything your job hunt needs</h2>
          <p className="mt-3 text-muted-foreground">
            From the first upload to the final offer — one workspace for seekers and recruiters.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {FEATURES.map((f) => (
            <motion.div
              key={f.title}
              variants={fadeUp}
              whileHover={{ y: -6 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
              className="group relative overflow-hidden rounded-2xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-xl"
            >
              <div className={`absolute -right-10 -top-10 size-32 rounded-full bg-gradient-to-br ${f.tint} opacity-10 blur-2xl transition-opacity duration-500 group-hover:opacity-25`} aria-hidden />
              <div className={`inline-flex rounded-xl bg-gradient-to-br ${f.tint} p-2.5 text-white shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6`}>
                <f.icon className="size-5" />
              </div>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* How it works */}
      <section id="how" className="relative scroll-mt-20 border-y bg-muted/30">
        <div className="container mx-auto px-4 py-20">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">How it works</h2>
            <p className="mt-2 text-muted-foreground">Three steps. No spreadsheets.</p>
          </motion.div>

          <motion.ol
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            className="relative mt-14 grid gap-10 md:grid-cols-3"
          >
            <div className="absolute left-[16%] right-[16%] top-7 hidden h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent md:block" aria-hidden />
            {STEPS.map((s, i) => (
              <motion.li key={s.title} variants={fadeUp} className="relative text-center">
                <div className="relative mx-auto flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-600/30">
                  <s.icon className="size-6" />
                  <span className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full border-2 border-background bg-foreground text-[11px] font-bold text-background">
                    {i + 1}
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-semibold">{s.title}</h3>
                <p className="mx-auto mt-1.5 max-w-xs text-sm text-muted-foreground">{s.body}</p>
              </motion.li>
            ))}
          </motion.ol>
        </div>
      </section>

      {/* For whom */}
      <section id="audience" className="container mx-auto scroll-mt-20 px-4 py-20">
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="grid gap-6 md:grid-cols-2"
        >
          {[
            {
              icon: Users,
              title: "For job seekers",
              tint: "from-emerald-500 to-teal-500",
              items: [
                "See exactly which skills you matched and which you're missing.",
                "Build and tailor resumes in beautiful themed templates.",
                "Apply in one click and track every application.",
                "Export all your data anytime (GDPR-friendly).",
              ],
              cta: "Sign up as seeker",
              href: "/register?role=seeker",
            },
            {
              icon: Briefcase,
              title: "For recruiters",
              tint: "from-amber-500 to-orange-500",
              items: [
                "Post a job — every new resume is auto-matched against it.",
                "Ranked candidates with match % and matched/missing skills.",
                "Review applicants and message candidates directly.",
                "Privacy-preserving profiles: skills and experience only.",
              ],
              cta: "Sign up as recruiter",
              href: "/register?role=recruiter",
            },
          ].map((a) => (
            <motion.div
              key={a.title}
              variants={fadeUp}
              className="group relative overflow-hidden rounded-2xl border bg-card p-7 shadow-sm transition-shadow hover:shadow-xl"
            >
              <div className={`absolute -right-16 -top-16 size-48 rounded-full bg-gradient-to-br ${a.tint} opacity-10 blur-3xl`} aria-hidden />
              <div className={`inline-flex rounded-xl bg-gradient-to-br ${a.tint} p-2.5 text-white shadow-lg`}>
                <a.icon className="size-5" />
              </div>
              <h3 className="mt-4 text-xl font-semibold">{a.title}</h3>
              <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
                {a.items.map((it) => (
                  <li key={it} className="flex gap-2.5">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                    {it}
                  </li>
                ))}
              </ul>
              <Button asChild className="group/btn mt-6 w-full rounded-full" variant="outline">
                <Link href={a.href}>
                  {a.cta}
                  <ArrowRight className="size-4 transition-transform group-hover/btn:translate-x-1" />
                </Link>
              </Button>
            </motion.div>
          ))}
        </motion.div>

        {/* Trust / privacy */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="mt-8 flex items-start gap-3 rounded-2xl border border-emerald-300/70 bg-emerald-50/70 p-5 text-emerald-900 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-100"
        >
          <Shield className="mt-0.5 size-5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium">Privacy by design.</p>
            <p className="opacity-90">
              Recruiters never see the raw text of a candidate&apos;s resume — only extracted
              skills, years of experience, and matched/missing skills for the specific job.
            </p>
          </div>
        </motion.div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 pb-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-sky-700 px-6 py-14 text-center text-white shadow-2xl animate-gradient"
        >
          <div className="absolute inset-0 bg-grid opacity-20" aria-hidden />
          <h2 className="relative text-3xl font-bold tracking-tight md:text-4xl">Ready to find your match?</h2>
          <p className="relative mx-auto mt-3 max-w-lg text-white/85">
            Create a free account and get your first match scores in under a minute.
          </p>
          <Button asChild size="lg" className="group relative mt-8 h-12 rounded-full bg-white px-8 text-base text-emerald-700 hover:bg-white/90">
            <Link href="/register">
              Get started free
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t">
        <div className="container mx-auto flex flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} Resume Matchmaker</p>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hover:text-foreground">Sign in</Link>
            <Link href="/register" className="hover:text-foreground">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
