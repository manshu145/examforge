import Link from "next/link";
import { Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Reusable "feature placeholder" surface for Mocks, Insights, Progress.
 * The DB schema, RLS, and quotas are already in place -- only the UX is pending.
 */
export function ComingSoon({
  title,
  description,
  bullets,
}: {
  title: string;
  description: string;
  bullets: string[];
}) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6 lg:px-8">
      <Card>
        <CardContent className="space-y-5 p-10 text-center">
          <Badge className="mx-auto gap-1.5">
            <Sparkles className="size-3" />
            Coming soon
          </Badge>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
          <ul className="mx-auto max-w-md space-y-1.5 text-left text-sm">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-2">
                <span className="mt-1.5 inline-block size-1.5 shrink-0 rounded-full bg-primary" />
                <span className="text-muted-foreground">{b}</span>
              </li>
            ))}
          </ul>
          <div className="pt-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
