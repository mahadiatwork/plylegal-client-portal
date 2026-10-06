"use client";

import { usePathname } from "next/navigation";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigationLoading } from "@/components/NavigationLoadingProvider";

export function QuestionnaireStepper({
  sections = [],
  activeSectionIndex = 0,
  completedCount = 0,
  totalCount = 23,
  onSelectSection,
  className,
}) {
  const draftSnap = useSnapshot(draftStore);
  const completion = draftStore.getCompletionPercentage();
  const effectiveCompleted = completedCount || completion.completed || 0;
  const effectiveTotal = totalCount || (completion.total > 0 ? completion.total : 23);
  const percentage = effectiveTotal > 0 ? Math.round((effectiveCompleted / effectiveTotal) * 100) : 0;

  return (
    <aside className={cn("w-full rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6", className)}>
      <div className="space-y-4">
        {/* Header and counter */}
        <div>
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400 block mb-1">
            QUESTIONNAIRE
          </span>
          <p className="text-sm font-semibold text-slate-800">
            {effectiveCompleted} of {effectiveTotal} sections complete
          </p>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-[#244D42] transition-all duration-500 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Stepper list */}
        <nav className="pt-2 space-y-1" aria-label="Questionnaire Progress">
          {sections.map((sec, idx) => {
            const stepNumber = idx + 1;
            const isCompleted = sec.completed || (stepNumber < activeSectionIndex + 1);
            const isActive = idx === activeSectionIndex;

            return (
              <button
                key={sec.id || sec.title || idx}
                type="button"
                onClick={() => onSelectSection && onSelectSection(sec, idx)}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                  isActive
                    ? "bg-[#EEF7F2]/60 font-semibold text-slate-900"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
                data-testid={`stepper-item-${idx + 1}`}
              >
                {/* Step indicator circle */}
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs transition-colors",
                    isActive
                      ? "bg-[#244D42] font-bold text-white shadow-sm"
                      : isCompleted
                        ? "bg-[#EEF7F2] text-[#244D42] border border-[#DCECE5] font-semibold"
                        : "border border-slate-200 text-slate-400 font-medium"
                  )}
                >
                  {isCompleted && !isActive ? (
                    <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                  ) : (
                    stepNumber
                  )}
                </span>

                {/* Section title */}
                <span className="flex-1 truncate">{sec.title}</span>

                {/* Optional right checkmark */}
                {isCompleted && (
                  <Check className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
