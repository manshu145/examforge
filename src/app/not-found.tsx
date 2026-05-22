import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <p className="text-sm font-medium uppercase tracking-wider text-primary">
        404
      </p>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        We can&apos;t find that page
      </h1>
      <p className="max-w-sm text-muted-foreground">
        The link may be broken, or the page may have moved. Head back to the
        homepage and start again.
      </p>
      <Button asChild>
        <Link href="/">Back to home</Link>
      </Button>
    </div>
  );
}
