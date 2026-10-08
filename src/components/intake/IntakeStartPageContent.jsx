"use client";

import { ArrowRight, CheckCircle2, HelpCircle, Info, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function IntakeStartPageContent({
  started,
  error,
  isSubmitted,
  completionPercentage = 0,
  totalSections = 23,
  submitting = false,
  onStartedChange,
  onSubmit,
  onBackToApplications,
}) {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 lg:p-10 shadow-sm">
      <form
        onSubmit={onSubmit}
        onKeyDown={(event) => {
          if (event.key === "Enter" && event.target.tagName !== "TEXTAREA") {
            event.preventDefault();
          }
        }}
      >
        {/* Top Meta Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
            SECTION 1 OF {totalSections}
          </span>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
          >
            <HelpCircle className="h-4 w-4" />
            <span>Need help?</span>
          </button>
        </div>

        {/* Section Title & Description */}
        <div className="pt-6">
          <h1 className="font-serif text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Getting started
          </h1>
          <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
            <p>
              This questionnaire is the foundation of your visa application. Please complete each section carefully and provide as much detail as you can. If you are unsure about any question, let us know and we will guide you through it.
            </p>
            <p>
              Once submitted, we will review your responses and use this information to prepare your visa application.
            </p>
          </div>
        </div>

        {isSubmitted && (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
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
                  className="mt-4 border-emerald-300 text-emerald-900 hover:bg-emerald-100"
                  data-testid="button-back-to-applications"
                >
                  Back to Applications
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Info Callout Banner */}
        <div className="mt-6 rounded-xl border border-blue-100 bg-[#F0F5FF] p-4 sm:p-5">
          <div className="flex items-start gap-3.5">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
              <Info className="h-4 w-4" />
            </div>
            <p className="text-sm leading-6 text-slate-700">
              <strong className="font-semibold text-slate-900">Accuracy matters.</strong> Incomplete or incorrect information can lead to delays, refusal, or visa cancellation. If you are unsure about anything, let us know.
            </p>
          </div>
        </div>

        {/* Checkbox Confirmation Card */}
        <div
          className={cn(
            "mt-6 rounded-xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-sm transition-colors",
            error ? "border-red-300 ring-2 ring-red-100" : "hover:border-slate-300"
          )}
        >
          <label className="flex items-center gap-3.5 cursor-pointer select-none">
            <input
              type="checkbox"
              id="started"
              data-testid="checkbox-started"
              checked={started}
              onChange={(e) => onStartedChange(e.target.checked)}
              className="h-5 w-5 rounded border-slate-300 text-[#244D42] focus:ring-[#244D42] cursor-pointer accent-[#244D42]"
            />
            <span className="text-sm font-medium text-slate-800">
              I confirm that the information I provide will be accurate to the best of my knowledge.
            </span>
          </label>
          {error && (
            <p className="mt-2 text-xs font-medium text-red-600 pl-8.5">
              {error}
            </p>
          )}
        </div>

        {/* Footer Navigation Bar */}
        <div className="mt-10 flex flex-col gap-4 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Lock className="h-4 w-4 text-purple-600 shrink-0" />
            <span>You can save your progress and return anytime.</span>
          </div>

          <button
            type="submit"
            disabled={!started || isSubmitted || submitting}
            data-testid="button-begin"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#244D42] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1C3E35] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : isSubmitted ? (
              <span>Submitted</span>
            ) : (
              <>
                <span>Continue</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

