"use client";

import { AlertCircle, ArrowRight, CheckCircle2, ClipboardList, Loader2, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function IntakeStartPageContent({
  started,
  error,
  isSubmitted,
  completionPercentage = 0,
  submitting = false,
  onStartedChange,
  onSubmit,
  onBackToApplications,
}) {
  return (
    <section className="mx-auto w-full max-w-[49rem]">
      <div className="rounded-lg border border-emerald-950/10 bg-white/90 shadow-[0_24px_70px_rgba(20,39,34,0.12)] backdrop-blur">
        <form
          onSubmit={onSubmit}
          onKeyDown={(event) => {
            if (event.key === "Enter" && event.target.tagName !== "TEXTAREA") {
              event.preventDefault();
            }
          }}
          className="px-6 py-7 sm:px-10 sm:py-9"
        >
          <div className="inline-flex items-center gap-4 text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 text-violet-700">
              <ClipboardList className="h-5 w-5" />
            </span>
            Getting started
          </div>

          <h1 className="mt-8 font-serif text-5xl font-semibold leading-none text-emerald-950 sm:text-[3.45rem]">
            Get Started
          </h1>

          <div className="mt-6 space-y-5 text-base leading-7 text-slate-700">
            <p>
              This questionnaire is the foundation of your visa application. Please complete each section carefully and provide as much detail as you can. If you are unsure about a question, answer what you can and continue. You can save your progress and return at any time before submitting.
            </p>
            <p>
              Once submitted, we will review your responses and use this information to prepare your visa application.
            </p>
          </div>

          {isSubmitted && (
            <div className="mt-7 rounded-md border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-start gap-4">
                <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-700" />
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-semibold text-emerald-950">Application submitted successfully</h2>
                  <p className="mt-1 text-sm leading-6 text-emerald-800">
                    Your application has been submitted and is now under review. You completed {completionPercentage}% of all sections.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onBackToApplications}
                    className="mt-4 border-emerald-800/30 text-emerald-950 hover:bg-emerald-100"
                    data-testid="button-back-to-applications"
                  >
                    Back to Applications
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="mt-7 rounded-md border border-violet-200 bg-violet-50/70 px-5 py-5">
            <div className="flex gap-4">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-violet-300 bg-white text-violet-700">
                <AlertCircle className="h-4 w-4" />
              </span>
              <p className="text-sm leading-6 text-slate-700">
                <span className="font-semibold text-slate-900">Accuracy matters.</span> Incomplete or incorrect information can lead to delays, refusal, or visa cancellation. If you are unsure about anything, let us know.
              </p>
            </div>
          </div>

          <div
            className={cn(
              "mt-6 rounded-md border bg-white px-6 py-6 shadow-sm transition-colors",
              error ? "border-red-300 ring-4 ring-red-100" : "border-emerald-900/20"
            )}
          >
            <div className="flex items-start gap-5">
              <Checkbox
                id="started"
                data-testid="checkbox-started"
                checked={started}
                onCheckedChange={(checked) => onStartedChange(!!checked)}
                className="mt-1 h-7 w-7 rounded-md border-emerald-900/30 data-[state=checked]:border-emerald-900 data-[state=checked]:bg-emerald-900 data-[state=checked]:text-white"
              />
              <div className="min-w-0 flex-1">
                <Label
                  htmlFor="started"
                  className="cursor-pointer text-base font-medium leading-7 text-emerald-950 sm:text-lg"
                >
                  I confirm that the information I provide will be accurate to the best of my knowledge.
                </Label>
                {error && (
                  <p className="mt-2 text-sm font-medium text-red-600">
                    {error}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-5 border-t border-slate-200 pt-7 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                <LockKeyhole className="h-4 w-4" />
              </span>
              <span>You can save your progress and return anytime.</span>
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={!started || isSubmitted || submitting}
              data-testid="button-begin"
              className="min-h-[3.25rem] w-full justify-between rounded-md bg-emerald-950 px-7 text-base font-semibold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60 sm:w-[13.25rem]"
            >
              {submitting ? (
                <>
                  <span>Saving...</span>
                  <Loader2 className="h-5 w-5 animate-spin" />
                </>
              ) : isSubmitted ? (
                <span>Submitted</span>
              ) : (
                <>
                  <span>Continue</span>
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      <div className="mt-8 flex items-center gap-5 text-sm text-slate-500">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="flex shrink-0 items-center gap-3 text-center">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-violet-700">
            <LockKeyhole className="h-4 w-4" />
          </span>
          Secure portal. Your privacy is our priority.
        </span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>
    </section>
  );
}
