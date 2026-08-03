import Link from "next/link";
import {
  FileSearch,
  Upload,
  Sparkles,
  Target,
  ArrowRight,
  Shield,
  Users,
  Briefcase,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="size-8 rounded-md bg-emerald-600 flex items-center justify-center text-white">
              <FileSearch className="size-5" />
            </div>
            <span className="font-semibold">Resume Matchmaker</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Link href="/register">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b bg-gradient-to-b from-emerald-50/60 to-background dark:from-emerald-950/20">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-800 mb-5">
              <Sparkles className="size-3" />
              AI-powered matching with graceful fallback
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Find the right{" "}
              <span className="text-emerald-600 dark:text-emerald-400">resume</span>
              {" ↔ "}
              <span className="text-emerald-600 dark:text-emerald-400">job</span>{" "}
              fit in seconds.
            </h1>
            <p className="mt-6 text-lg text-muted-foreground">
              Upload a resume and let AI extract skills, score semantic fit, and surface
              the best candidates — even when the AI is offline, the dictionary + TF-IDF
              fallback keeps you running.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                asChild
                size="lg"
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Link href="/register?role=seeker">
                  I&apos;m a job seeker <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="w-full sm:w-auto"
              >
                <Link href="/register?role=recruiter">
                  I&apos;m a recruiter <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="container mx-auto px-4 py-16 md:py-20">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold tracking-tight">How it works</h2>
          <p className="mt-2 text-muted-foreground">Three steps. No spreadsheets.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="relative">
            <CardContent className="pt-6">
              <div className="absolute -top-3 left-6 size-7 rounded-full bg-emerald-600 text-white text-xs font-semibold flex items-center justify-center">
                1
              </div>
              <Upload className="size-8 text-emerald-600 dark:text-emerald-400" />
              <h3 className="mt-3 font-semibold">Upload</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Drop a PDF resume. We parse the text and extract skills using a
                Hugging Face NER model (with a 200+ skill dictionary fallback).
              </p>
            </CardContent>
          </Card>
          <Card className="relative">
            <CardContent className="pt-6">
              <div className="absolute -top-3 left-6 size-7 rounded-full bg-emerald-600 text-white text-xs font-semibold flex items-center justify-center">
                2
              </div>
              <Sparkles className="size-8 text-emerald-600 dark:text-emerald-400" />
              <h3 className="mt-3 font-semibold">Match</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                A cross-encoder scores resume ↔ job semantic similarity. Combined
                with skills overlap (70/30), each match gets a 0–100% score.
              </p>
            </CardContent>
          </Card>
          <Card className="relative">
            <CardContent className="pt-6">
              <div className="absolute -top-3 left-6 size-7 rounded-full bg-emerald-600 text-white text-xs font-semibold flex items-center justify-center">
                3
              </div>
              <Target className="size-8 text-emerald-600 dark:text-emerald-400" />
              <h3 className="mt-3 font-semibold">Connect</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Seekers see their top job matches. Recruiters see ranked
                candidates with matched/missing skills — never the raw resume text.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* For whom */}
      <section className="bg-muted/30 border-y">
        <div className="container mx-auto px-4 py-16">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="rounded-md bg-emerald-100 p-2 inline-flex text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  <Users className="size-5" />
                </div>
                <h3 className="mt-3 font-semibold text-lg">For job seekers</h3>
                <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                  <li>• Upload as many resumes as your job hunt needs (5/hour).</li>
                  <li>• See exactly which skills you matched and which you&apos;re missing.</li>
                  <li>• Re-run analysis any time after editing your resume.</li>
                  <li>• Export all your data anytime (GDPR-friendly).</li>
                </ul>
                <Button asChild className="mt-4 w-full" variant="outline">
                  <Link href="/register?role=seeker">Sign up as seeker</Link>
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="rounded-md bg-amber-100 p-2 inline-flex text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                  <Briefcase className="size-5" />
                </div>
                <h3 className="mt-3 font-semibold text-lg">For recruiters</h3>
                <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                  <li>• Post a job with required skills — we auto-match every new resume.</li>
                  <li>• Ranked candidates table with match % and matched/missing skills.</li>
                  <li>• Privacy-preserving profile view: skills + experience only.</li>
                  <li>• Filter by minimum match percentage.</li>
                </ul>
                <Button asChild className="mt-4 w-full" variant="outline">
                  <Link href="/register?role=recruiter">Sign up as recruiter</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Trust / privacy */}
      <section className="container mx-auto px-4 py-12">
        <div className="flex items-start gap-3 rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-200 dark:border-emerald-800">
          <Shield className="size-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium">Privacy by design.</p>
            <p className="opacity-90">
              Recruiters never see the raw text of a candidate&apos;s resume — only
              extracted skills, years of experience, and matched/missing skills for
              the specific job. Seekers only see their own matches.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t bg-background">
        <div className="container mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Resume Matchmaker. Phase 1 build.</p>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hover:text-foreground">Sign in</Link>
            <Link href="/register" className="hover:text-foreground">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
