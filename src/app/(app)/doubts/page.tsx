import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { ArrowRight, MessageSquareText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/lib/db";
import { doubtThreads } from "@/lib/db/schema";
import { requireOnboardedUser } from "@/lib/auth";
import { assertQuota, FREE_LIMITS } from "@/lib/quotas";
import { ChatInput } from "@/components/doubts/chat-input";
import { formatDate, truncateWords } from "@/lib/utils";

export const metadata = { title: "Doubt solver" };
export const dynamic = "force-dynamic";

export default async function DoubtsPage() {
  const { user } = await requireOnboardedUser();
  const quota = await assertQuota(user.id, "doubt");
  const threads = await db
    .select()
    .from(doubtThreads)
    .where(eq(doubtThreads.userId, user.id))
    .orderBy(desc(doubtThreads.updatedAt))
    .limit(20);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex items-center gap-2">
        <MessageSquareText className="size-5 text-primary" />
        <h1 className="text-3xl font-semibold tracking-tight">Doubt solver</h1>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Stuck on a concept? Ask anything from your syllabus.
      </p>

      {!quota.ok && (
        <div className="mt-6 rounded-md border border-warning/40 bg-warning/10 p-4 text-sm">
          <p className="font-medium">Daily limit reached</p>
          <p className="mt-1 text-muted-foreground">{quota.reason}</p>
          <Button asChild size="sm" className="mt-3">
            <Link href="/pricing">Upgrade to Pro</Link>
          </Button>
        </div>
      )}
      {quota.ok && quota.plan === "free" && (
        <Badge variant="secondary" className="mt-4">
          {FREE_LIMITS.doubt.count - quota.used} of {FREE_LIMITS.doubt.count} doubts
          left today (Free plan)
        </Badge>
      )}

      <Card className="mt-8">
        <CardContent className="p-4">
          {quota.ok ? <ChatInput /> : null}
        </CardContent>
      </Card>

      {threads.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold">Recent conversations</h2>
          <div className="mt-4 space-y-3">
            {threads.map((t) => (
              <Link key={t.id} href={`/doubts/${t.id}`} className="block">
                <Card className="transition-colors hover:border-primary/40">
                  <CardContent className="flex items-center justify-between gap-4 p-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {t.title ? truncateWords(t.title, 12) : "Untitled chat"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(t.updatedAt)}
                      </p>
                    </div>
                    <ArrowRight className="size-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
