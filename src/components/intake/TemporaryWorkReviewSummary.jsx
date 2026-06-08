"use client";

import { ProgressLink } from "@/components/ProgressLink";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  formatReviewLabel,
  formatReviewValue,
  hasReviewValue,
} from "@/lib/temporaryWorkReview";
import { Pencil } from "lucide-react";

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function ReviewValue({ value }) {
  if (!hasReviewValue(value)) return null;

  if (Array.isArray(value)) {
    return (
      <div className="space-y-3">
        {value.filter(hasReviewValue).map((item, index) => (
          <div
            key={index}
            className="rounded-lg border border-slate-200 bg-slate-50 p-3"
          >
            <div className="mb-2 inline-flex rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 ring-1 ring-slate-200">
              Item {index + 1}
            </div>
            {isPlainObject(item) ? (
              <NestedObject value={item} />
            ) : (
              <p className="whitespace-pre-wrap break-words text-sm text-slate-900">
                {formatReviewValue(item)}
              </p>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (isPlainObject(value)) {
    return <NestedObject value={value} />;
  }

  return (
    <p className="whitespace-pre-wrap break-words text-sm font-medium leading-6 text-slate-900">
      {formatReviewValue(value)}
    </p>
  );
}

function NestedObject({ value }) {
  const entries = Object.entries(value || {}).filter(([, nestedValue]) =>
    hasReviewValue(nestedValue)
  );

  if (entries.length === 0) return null;

  return (
    <div className="space-y-3 border-l-2 border-slate-200 pl-3">
      {entries.map(([key, nestedValue]) => (
        <div key={key} className="min-w-0">
          <div className="mb-1 text-xs font-semibold uppercase text-slate-500">
            {formatReviewLabel(key)}
          </div>
          <ReviewValue value={nestedValue} />
        </div>
      ))}
    </div>
  );
}

function ReviewRow({ item }) {
  if (!item || !hasReviewValue(item.value)) return null;

  return (
    <div className="grid gap-2 px-5 py-4 sm:grid-cols-[minmax(0,14rem)_1fr] sm:gap-5">
      <dt className="text-xs font-semibold uppercase leading-5 text-slate-500">
        {item.label}
      </dt>
      <dd className="min-w-0">
        <ReviewValue value={item.value} />
      </dd>
    </div>
  );
}

export function TemporaryWorkReviewSummary({
  sections,
  emptyMessage = "No questionnaire answers are available to review yet.",
  className,
}) {
  const visibleSections = (sections || []).filter(
    (section) => Array.isArray(section.items) && section.items.some((item) => hasReviewValue(item.value))
  );

  return (
    <section
      className={cn("space-y-4", className)}
      data-testid="temporary-work-review-summary"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">Your Answers</h2>
          <p className="mt-1 text-sm text-slate-600">
            Review each section before submitting.
          </p>
        </div>
        {visibleSections.length > 0 && (
          <span className="text-sm font-medium text-slate-500">
            {visibleSections.length} section{visibleSections.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {visibleSections.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-5 py-8 text-center text-sm text-slate-600">
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-4">
          {visibleSections.map((section) => (
            <article
              key={section.id}
              className="overflow-hidden rounded-lg border border-slate-200 bg-white"
              data-testid={`review-section-${section.id}`}
            >
              <div className="flex flex-col gap-3 border-b border-slate-200 bg-[#eef7f4] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <h3 className="break-words text-base font-semibold text-[#285646]">
                    {section.title}
                  </h3>
                  {section.subtitle && (
                    <p className="mt-0.5 text-sm text-slate-600">{section.subtitle}</p>
                  )}
                </div>
                {section.editHref && (
                  <Button
                    asChild
                    type="button"
                    variant="outline"
                    size="sm"
                    className="self-start bg-white text-[#285646] sm:self-center"
                  >
                    <ProgressLink href={section.editHref}>
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </ProgressLink>
                  </Button>
                )}
              </div>
              <dl className="divide-y divide-slate-100">
                {section.items.map((item, index) => (
                  <ReviewRow key={`${item.label}-${index}`} item={item} />
                ))}
              </dl>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
