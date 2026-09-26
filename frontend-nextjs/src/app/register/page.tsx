"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { ArrowRight, Loader2, Mail, Lock, User, Users, Briefcase } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/auth-shell";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Role = "seeker" | "recruiter";

function RegisterForm() {
  const router = useRouter();
  const search = useSearchParams();
  const initialRole = (search.get("role") as Role) === "recruiter" ? "recruiter" : "seeker";
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>(initialRole);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          role,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error?.message ?? "Registration failed");
      }
      // Auto sign-in
      const signRes = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });
      if (!signRes || signRes.error) {
        toast({
          title: "Account created — please sign in",
          description: "We couldn't sign you in automatically.",
        });
        router.push("/login");
        return;
      }
      toast({ title: "Welcome to Resume Matchmaker!" });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      toast({
        title: "Registration failed",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Free to start. Choose how you'll use Matchmaker."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-emerald-600 hover:underline dark:text-emerald-400">
            Sign in
          </Link>
        </>
      }
    >
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Role toggle */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole("seeker")}
                  className={cn(
                    "rounded-xl border-2 p-3 text-left transition-all duration-200 hover:-translate-y-0.5",
                    role === "seeker"
                      ? "border-emerald-500 bg-emerald-50 shadow-md shadow-emerald-500/10 dark:bg-emerald-500/10"
                      : "border-border hover:bg-muted/50",
                  )}
                >
                  <Users className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <p className="mt-1 text-sm font-medium">Job seeker</p>
                  <p className="text-xs text-muted-foreground">Find your next role</p>
                </button>
                <button
                  type="button"
                  onClick={() => setRole("recruiter")}
                  className={cn(
                    "rounded-xl border-2 p-3 text-left transition-all duration-200 hover:-translate-y-0.5",
                    role === "recruiter"
                      ? "border-emerald-500 bg-emerald-50 shadow-md shadow-emerald-500/10 dark:bg-emerald-500/10"
                      : "border-border hover:bg-muted/50",
                  )}
                >
                  <Briefcase className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <p className="mt-1 text-sm font-medium">Recruiter</p>
                  <p className="text-xs text-muted-foreground">Find your next hire</p>
                </button>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="name">Full name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                    className="h-11 pl-9"
                    required
                    minLength={2}
                    autoComplete="name"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="h-11 pl-9"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="h-11 pl-9"
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="group h-11 w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/20 hover:from-emerald-600 hover:to-emerald-700"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Creating account…
                  </>
                ) : (
                  <>
                    Create account <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </Button>
            </form>
    </AuthShell>
  );
}

// useSearchParams() opts the subtree into client-side rendering, so it has to
// sit inside a Suspense boundary or the static prerender of this route fails.
export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
