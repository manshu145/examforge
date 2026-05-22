import { cn } from "@/lib/utils";

/** Single chat bubble. Server component (no interactivity). */
export function ChatMessage({
  role,
  content,
}: {
  role: "user" | "assistant" | "system";
  content: string;
}) {
  if (role === "system") return null;
  const isUser = role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground"
            : "border bg-card text-card-foreground",
        )}
      >
        {content}
      </div>
    </div>
  );
}
