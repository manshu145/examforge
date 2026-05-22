import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/lib/db";
import { doubtMessages, doubtThreads } from "@/lib/db/schema";
import { requireOnboardedUser } from "@/lib/auth";
import { ChatInput } from "@/components/doubts/chat-input";
import { ChatMessage } from "@/components/doubts/chat-message";

export const dynamic = "force-dynamic";

export default async function DoubtThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await requireOnboardedUser();
  const { id } = await params;
  const thread = await db.query.doubtThreads.findFirst({
    where: eq(doubtThreads.id, id),
  });
  if (!thread || thread.userId !== user.id) notFound();

  const messages = await db
    .select()
    .from(doubtMessages)
    .where(eq(doubtMessages.threadId, id))
    .orderBy(asc(doubtMessages.createdAt));

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link href="/doubts">
          <ArrowLeft className="size-4" /> All chats
        </Link>
      </Button>

      <h1 className="text-2xl font-semibold tracking-tight">
        {thread.title ?? "Chat"}
      </h1>

      <div className="mt-6 space-y-3">
        {messages.map((m) => (
          <ChatMessage
            key={m.id}
            role={m.role as "user" | "assistant" | "system"}
            content={m.content}
          />
        ))}
      </div>

      <Card className="mt-6 sticky bottom-4">
        <CardContent className="p-4">
          <ChatInput threadId={thread.id} placeholder="Reply…" />
        </CardContent>
      </Card>
    </div>
  );
}
