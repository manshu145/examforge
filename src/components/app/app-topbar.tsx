import Link from "next/link";
import {
  CalendarDays,
  ClipboardCheck,
  GraduationCap,
  LineChart,
  MessageSquareText,
  Newspaper,
} from "lucide-react";

import { UserMenu } from "@/components/app/user-menu";
import type { AuthUser } from "@/lib/auth";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LineChart },
  { href: "/planner", label: "Planner", icon: CalendarDays },
  { href: "/evaluator", label: "Evaluator", icon: ClipboardCheck },
  { href: "/doubts", label: "Doubts", icon: MessageSquareText },
  { href: "/insights", label: "Insights", icon: Newspaper },
];

export function AppTopbar({ user }: { user: AuthUser }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <span className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground">
            <GraduationCap className="size-3.5" />
          </span>
          <span className="hidden sm:inline">ExamForge</span>
        </Link>

        <nav className="hidden flex-1 items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto">
          <UserMenu fullName={user.fullName} email={user.email} />
        </div>
      </div>
    </header>
  );
}
