import Link from "next/link";
import { CreditCard, Settings as SettingsIcon, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireOnboardedUser } from "@/lib/auth";
import { getExam, type ExamId } from "@/lib/exams";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { user, profile } = await requireOnboardedUser();
  const exam = profile.examId ? getExam(profile.examId as ExamId) : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex items-center gap-2">
        <SettingsIcon className="size-5 text-primary" />
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
      </div>

      <Card className="mt-8">
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary">
              <User className="size-4" />
            </span>
            <div>
              <p className="text-sm font-medium">{profile.fullName ?? user.fullName ?? "—"}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <div className="grid gap-3 text-sm sm:grid-cols-3">
            <Stat label="Exam" value={exam?.shortName ?? "—"} />
            <Stat label="Target year" value={profile.targetYear?.toString() ?? "—"} />
            <Stat label="Daily hours" value={`${profile.dailyHours}h`} />
          </div>
          <p className="text-xs text-muted-foreground">
            Profile editing comes in the next release. For now,{" "}
            <Link href="/onboarding" className="underline">
              redo onboarding
            </Link>{" "}
            to change your exam.
          </p>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardContent className="flex items-center justify-between gap-4 p-6">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary">
              <CreditCard className="size-4" />
            </span>
            <div>
              <p className="text-sm font-medium">Billing</p>
              <p className="text-xs text-muted-foreground">
                Manage your subscription
              </p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/settings/billing">Open</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}
