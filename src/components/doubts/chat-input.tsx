"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { askDoubt } from "@/server/actions/doubts";

/**
 * Chat input. Used both for new threads (threadId undefined) and for follow-ups
 * inside a thread. On success, redirects to the thread (creates it if needed).
 */
export function ChatInput({
  threadId,
  placeholder = "Ask anything from your syllabus…",
}: {
  threadId?: string;
  placeholder?: string;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();

  function send() {
    if (text.trim().length < 2) return;
    const message = text.trim();
    setText("");
    startTransition(async () => {
      const res = await askDoubt({ threadId, message });
      if (!res.ok) {
        setText(message);
        toast.error(res.error);
        return;
      }
      if (!threadId) {
        router.push(`/doubts/${res.threadId}`);
      }
      router.refresh();
    });
    return;
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
      className="flex items-end gap-2"
    >
      <textarea
        rows={2}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
          }
        }}
        placeholder={placeholder}
        disabled={isPending}
        maxLength={2000}
        className="flex w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      />
      <Button type="submit" size="lg" disabled={isPending || text.trim().length < 2}>
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
      </Button>
    </form>
  );
}
