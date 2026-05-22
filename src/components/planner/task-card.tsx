"use client";

import { useTransition, useOptimistic } from "react";
import { Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { togglePlanTask } from "@/server/actions/planner";

/**
 * One row in the planner timeline. Optimistic check-off so the UI feels
 * instant even when the server round-trip is slow.
 */
export function TaskCard({
  id,
  title,
  description,
  topicName,
  estMinutes,
  isDone,
}: {
  id: string;
  title: string;
  description: string | null;
  topicName: string | null;
  estMinutes: number;
  isDone: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [optimisticDone, setOptimisticDone] = useOptimistic(isDone);

  function handleToggle(next: boolean) {
    startTransition(async () => {
      setOptimisticDone(next);
      const res = await togglePlanTask(id, next);
      if (!res.ok) {
        setOptimisticDone(!next);
        toast.error(res.error);
      }
    });
  }

  return (
    <div
      className={cn(
        "group flex items-start gap-3 rounded-lg border p-4 transition-colors",
        optimisticDone
          ? "border-border bg-muted/40"
          : "border-border bg-background hover:border-primary/40",
      )}
    >
      <div className="pt-0.5">
        {pending ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        ) : (
          <Checkbox
            checked={optimisticDone}
            onCheckedChange={(v) => handleToggle(v === true)}
            aria-label={`Mark "${title}" as ${optimisticDone ? "incomplete" : "done"}`}
          />
        )}
      </div>
      <div className="flex-1">
        <p
          className={cn(
            "text-sm font-medium leading-tight",
            optimisticDone && "text-muted-foreground line-through",
          )}
        >
          {title}
        </p>
        {description && (
          <p
            className={cn(
              "mt-1 text-sm text-muted-foreground",
              optimisticDone && "line-through",
            )}
          >
            {description}
          </p>
        )}
        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3" />
            {estMinutes} min
          </span>
          {topicName && (
            <span className="rounded-full bg-muted px-2 py-0.5">{topicName}</span>
          )}
        </div>
      </div>
    </div>
  );
}
