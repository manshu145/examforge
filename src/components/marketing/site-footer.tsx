import Link from "next/link";
import { GraduationCap } from "lucide-react";

/**
 * Minimal marketing footer. Copyright auto-updates each year.
 */
export function SiteFooter() {
  return (
    <footer className="border-t border-border/40 bg-background">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4 lg:px-8">
        <div className="md:col-span-2">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="size-4" />
            </span>
            <span>ExamForge</span>
          </Link>
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">
            An AI mentor that plans, evaluates, and drills with you — built for
            UPSC, NEET, JEE, and State PSC aspirants.
          </p>
        </div>

        <div className="text-sm">
          <p className="font-medium">Product</p>
          <ul className="mt-3 space-y-2 text-muted-foreground">
            <li>
              <Link href="/#features" className="hover:text-foreground">
                Features
              </Link>
            </li>
            <li>
              <Link href="/pricing" className="hover:text-foreground">
                Pricing
              </Link>
            </li>
            <li>
              <Link href="/signup" className="hover:text-foreground">
                Get started
              </Link>
            </li>
          </ul>
        </div>

        <div className="text-sm">
          <p className="font-medium">Company</p>
          <ul className="mt-3 space-y-2 text-muted-foreground">
            <li>
              <Link href="/about" className="hover:text-foreground">
                About
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="hover:text-foreground">
                Privacy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-foreground">
                Terms
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border/40">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} ExamForge. Made for India.</p>
          <p>Crafted for serious aspirants.</p>
        </div>
      </div>
    </footer>
  );
}
