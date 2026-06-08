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
            className="space-y-2 border-l border-slate-200 pl-3"
          >
            <div className="text-xs font-semibold uppercase text-slate-500">
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
    <div className="space-y-3">
      {entries.map(([key, nestedValue]) => (
        <div key={key} className="min-w-0">
          <div className="mb-1 text-sm font-medium leading-5 text-slate-700">
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
    <div className="space-y-1 py-2">
      <dt className="text-sm font-semibold leading-6 text-slate-950">
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
      className={cn("space-y-8", className)}
      data-testid="temporary-work-review-summary"
    >
      <h2 className="text-xl font-semibold text-slate-950">Your Answers</h2>

      {visibleSections.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-5 py-8 text-center text-sm text-slate-600">
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-8">
          {visibleSections.map((section) => (
            <article
              key={section.id}
              className="space-y-3"
              data-testid={`review-section-${section.id}`}
            >
              <div className="space-y-2">
                <div className="min-w-0">
                  <h3 className="break-words text-lg font-semibold text-sky-700">
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
                    className="self-start bg-white text-[#285646]"
                  >
                    <ProgressLink href={section.editHref}>
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </ProgressLink>
                  </Button>
                )}
              </div>
              <dl className="space-y-4">
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
