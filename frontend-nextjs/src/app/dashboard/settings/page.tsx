"use client";

// Settings page — profile update + notification preferences + privacy.
//
// The notification preferences card is wired to:
//   GET  /api/notifications/preferences
//   PUT  /api/notifications/preferences
//
// Defaults (per spec §7):
//   emailNotifications: true, pushNotifications: true, jobMatches: true,
//   resumeAnalysis: true, newJobs: true, dailyDigest: false

import { useState, useEffect, useCallback } from "react";
import {
  Loader2,
  Trash2,
  Download,
  Save,
  Bell,
  Mail,
  Smartphone,
  Target,
  FileText,
  Briefcase,
  Newspaper,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface NotificationPrefs {
  emailNotifications: boolean;
  pushNotifications: boolean;
  jobMatches: boolean;
  resumeAnalysis: boolean;
  newJobs: boolean;
  dailyDigest: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  emailNotifications: true,
  pushNotifications: true,
  jobMatches: true,
  resumeAnalysis: true,
  newJobs: true,
  dailyDigest: false,
};

const PREF_FIELDS: Array<{
  key: keyof NotificationPrefs;
  label: string;
  desc: string;
  icon: typeof Bell;
}> = [
  {
    key: "emailNotifications",
    label: "Email notifications",
    desc: "Receive notifications by email when push is unavailable or disabled.",
    icon: Mail,
  },
  {
    key: "pushNotifications",
    label: "Push notifications",
    desc: "Receive real-time push notifications in your browser or device.",
    icon: Smartphone,
  },
  {
    key: "jobMatches",
    label: "New job matches",
    desc: "When a new job/resume match is found with at least 70% score.",
    icon: Target,
  },
  {
    key: "resumeAnalysis",
    label: "Resume analysis complete",
    desc: "When your resume finishes parsing and skill extraction.",
    icon: FileText,
  },
  {
    key: "newJobs",
    label: "New jobs posted",
    desc: "Seekers — be notified when recruiters post new jobs.",
    icon: Briefcase,
  },
  {
    key: "dailyDigest",
    label: "Daily digest email",
    desc: "One summary email per day with all your recent notifications.",
    icon: Newspaper,
  },
];

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [prefsSaving, setPrefsSaving] = useState(false);

  useEffect(() => {
    if (session?.user?.name) setName(session.user.name);
  }, [session?.user?.name]);

  // Fetch preferences on mount.
  const loadPrefs = useCallback(async () => {
    setPrefsLoading(true);
    try {
      const res = await fetch("/api/notifications/preferences", { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      const p = json?.data?.preferences;
      if (p) {
        setPrefs({
          emailNotifications: p.emailNotifications,
          pushNotifications: p.pushNotifications,
          jobMatches: p.jobMatches,
          resumeAnalysis: p.resumeAnalysis,
          newJobs: p.newJobs,
          dailyDigest: p.dailyDigest,
        });
      }
    } catch {
      // silent — defaults will be used
    } finally {
      setPrefsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrefs();
  }, [loadPrefs]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Save failed");
      await update();
      toast({ title: "Profile updated" });
    } catch (e) {
      toast({
        title: "Save failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePrefChange = (key: keyof NotificationPrefs, value: boolean) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  };

  const handleSavePrefs = async () => {
    setPrefsSaving(true);
    try {
      const res = await fetch("/api/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Save failed");
      const p = json?.data?.preferences;
      if (p) setPrefs(p);
      toast({ title: "Notification preferences saved" });
    } catch (e) {
      toast({
        title: "Save failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setPrefsSaving(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/users/export-data", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Export failed");
      const blob = new Blob([JSON.stringify(json.data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `matchmaker-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Export downloaded" });
    } catch (e) {
      toast({
        title: "Export failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch("/api/users/me", { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j?.error?.message ?? "Delete failed");
      }
      toast({ title: "Account deleted" });
      await signOut({ callbackUrl: "/" });
    } catch (e) {
      toast({
        title: "Delete failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your profile, notifications, and account.
        </p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>Update your display name.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSave}>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                maxLength={80}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={session?.user?.email ?? ""}
                disabled
                className="bg-muted/50"
              />
              <p className="text-xs text-muted-foreground">
                Email changes are not supported.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Label>Role</Label>
              <Badge
                variant="outline"
                className="bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200"
              >
                {(session?.user as { role?: string })?.role ?? "seeker"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Role is fixed after registration.
              </span>
            </div>
          </CardContent>
          <CardFooter className="border-t pt-4 justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <Save className="size-4" /> Save changes
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Notification preferences */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="size-4 text-muted-foreground" />
            <CardTitle className="text-base">Notification preferences</CardTitle>
            {prefsLoading && (
              <Badge variant="outline" className="bg-muted text-muted-foreground">
                <Loader2 className="size-3 mr-1 animate-spin" /> Loading
              </Badge>
            )}
          </div>
          <CardDescription>
            Choose how and when you want to be notified. You can always see your full
            history in the <a className="underline" href="/dashboard/notifications">Notifications</a> center.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {prefsLoading ? (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="space-y-1">
                    <div className="h-4 w-40 rounded bg-muted animate-pulse" />
                    <div className="h-3 w-72 rounded bg-muted/60 animate-pulse" />
                  </div>
                  <div className="size-8 rounded-full bg-muted animate-pulse" />
                </div>
              ))}
            </div>
          ) : (
            PREF_FIELDS.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.key}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors",
                    prefs[f.key] && "border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20",
                  )}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                      <Icon className="size-4 text-emerald-700 dark:text-emerald-300" />
                    </div>
                    <div className="min-w-0">
                      <Label htmlFor={`pref-${f.key}`} className="cursor-pointer">
                        {f.label}
                      </Label>
                      <p className="text-xs text-muted-foreground">{f.desc}</p>
                    </div>
                  </div>
                  <Switch
                    id={`pref-${f.key}`}
                    checked={prefs[f.key]}
                    onCheckedChange={(v) => handlePrefChange(f.key, v)}
                    disabled={prefsSaving}
                  />
                </div>
              );
            })
          )}
        </CardContent>
        <CardFooter className="border-t pt-4 justify-end gap-2">
          <Button
            variant="outline"
            onClick={loadPrefs}
            disabled={prefsLoading || prefsSaving}
          >
            Reset
          </Button>
          <Button
            onClick={handleSavePrefs}
            disabled={prefsLoading || prefsSaving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {prefsSaving ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Saving…
              </>
            ) : (
              <>
                <Save className="size-4" /> Save preferences
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      {/* Privacy */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Privacy & data</CardTitle>
          <CardDescription>
            Export or delete your data. GDPR-friendly by design.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Export my data</p>
              <p className="text-xs text-muted-foreground">
                Download a JSON of all your resumes, jobs, and matches.
              </p>
            </div>
            <Button onClick={handleExport} variant="outline" size="sm" disabled={exporting}>
              {exporting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              Export
            </Button>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-rose-300 p-3 dark:border-rose-800">
            <div>
              <p className="text-sm font-medium text-rose-700 dark:text-rose-300">
                Delete my account
              </p>
              <p className="text-xs text-muted-foreground">
                Permanently delete your account and all associated data.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-rose-600 border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                  disabled={deleting}
                >
                  <Trash2 className="size-4" /> Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently removes your profile, resumes, jobs, matches,
                    and notification history. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-rose-600 hover:bg-rose-700 text-white"
                  >
                    Delete permanently
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
