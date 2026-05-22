"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { evaluateAnswer } from "@/server/actions/evaluator";

export function EvaluatorForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  const wordCount = answer.trim().split(/\s+/).filter(Boolean).length;
  const canSubmit = question.length >= 10 && answer.length >= 50 && !isPending;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await evaluateAnswer({ question, answer });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Evaluation ready");
      router.push(`/evaluator/${res.evaluationId}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Card>
        <CardContent className="space-y-5 p-6">
          <div className="space-y-2">
            <Label htmlFor="question">Question</Label>
            <textarea
              id="question"
              rows={3}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Paste the question (e.g. 'Discuss the impact of the Industrial Revolution on Indian society…')"
              maxLength={2000}
              disabled={isPending}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="answer">Your answer</Label>
              <span className="text-xs text-muted-foreground">{wordCount} words</span>
            </div>
            <textarea
              id="answer"
              rows={12}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Write your descriptive answer here. Aim for 200-300 words for Mains-style questions."
              maxLength={8000}
              disabled={isPending}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            />
          </div>
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={!canSubmit}>
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}
          {isPending ? "Evaluating…" : "Evaluate"}
        </Button>
      </div>
    </form>
  );
}
