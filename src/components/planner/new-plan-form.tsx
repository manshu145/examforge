"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generatePlan } from "@/server/actions/planner";

/**
 * Client form. The server action does the heavy lifting (AI call, DB writes,
 * usage logging). On success we redirect to /planner.
 */

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const offsetDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const schema = z
  .object({
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
    notes: z.string().max(500).optional(),
  })
  .refine((v) => v.endDate > v.startDate, {
    message: "End date must be after start date",
    path: ["endDate"],
  });

type FormValues = z.infer<typeof schema>;

const PRESETS = [
  { label: "1 week", days: 7 },
  { label: "2 weeks", days: 14 },
  { label: "4 weeks", days: 28 },
  { label: "6 weeks", days: 42 },
];

export function NewPlanForm({
  examShortName,
  dailyHours,
}: {
  examShortName: string;
  dailyHours: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [generating, setGenerating] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      startDate: today(),
      endDate: offsetDays(28),
      notes: "",
    },
  });

  const watchStart = watch("startDate");
  const watchEnd = watch("endDate");

  function applyPreset(days: number) {
    setValue("startDate", today(), { shouldValidate: true });
    setValue("endDate", offsetDays(days), { shouldValidate: true });
  }

  function onSubmit(values: FormValues) {
    setGenerating(true);
    startTransition(async () => {
      const res = await generatePlan(values);
      setGenerating(false);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Plan ready", {
        description: "Your AI-generated plan is live.",
      });
      router.push("/planner");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardContent className="space-y-6 p-6">
          <div>
            <h2 className="text-lg font-semibold">Pick a time window</h2>
            <p className="text-sm text-muted-foreground">
              We&apos;ll size {examShortName} tasks for{" "}
              <span className="font-medium text-foreground">{dailyHours}h/day</span>.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <Button
                key={p.days}
                type="button"
                size="sm"
                variant="outline"
                onClick={() => applyPreset(p.days)}
              >
                {p.label}
              </Button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start</Label>
              <Input
                id="startDate"
                type="date"
                min={today()}
                disabled={isPending}
                aria-invalid={!!errors.startDate}
                {...register("startDate")}
              />
              {errors.startDate && (
                <p className="text-xs text-destructive">{errors.startDate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End</Label>
              <Input
                id="endDate"
                type="date"
                min={watchStart || today()}
                disabled={isPending}
                aria-invalid={!!errors.endDate}
                {...register("endDate")}
              />
              {errors.endDate && (
                <p className="text-xs text-destructive">{errors.endDate.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Anything we should know? (optional)</Label>
            <textarea
              id="notes"
              rows={3}
              maxLength={500}
              placeholder="e.g. I have my college finals on the 12th, please go light that week."
              disabled={isPending}
              {...register("notes")}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {watchStart && watchEnd && watchEnd > watchStart
            ? `${daysBetween(watchStart, watchEnd)} days planned`
            : "Pick a start and end date"}
        </p>
        <Button type="submit" size="lg" disabled={isPending}>
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}
          {generating ? "Generating..." : "Generate plan"}
        </Button>
      </div>
    </form>
  );
}

function daysBetween(a: string, b: string): number {
  const ms =
    new Date(`${b}T00:00:00Z`).getTime() -
    new Date(`${a}T00:00:00Z`).getTime();
  return Math.round(ms / 86_400_000) + 1;
}
