import Link from "next/link";
import { GraduationCap } from "lucide-react";

/**
 * Minimal layout for the onboarding gate -- just the logo.
 *
 * We deliberately do NOT use the (app) layout here, because (app) redirects
 * un-onboarded users to /onboarding -- which would be an infinite loop.
 * Auth-gating for /onboarding lives in the root middleware.
 */
export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border/40">
        <div className="mx-auto flex h-14 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground">
              <GraduationCap className="size-3.5" />
            </span>
            <span>ExamForge</span>
          </Link>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
