"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const EXCERPT_CHARACTER_LIMIT = 320;
const EXCERPT_LINE_LIMIT = 6;

function takeCodePoints(value, limit) {
  const codePoints = [];

  for (const character of value) {
    codePoints.push(character);
    if (codePoints.length >= limit) break;
  }

  return codePoints;
}

function getNoteExcerpt(value) {
  const text = String(value || "").trim();
  const lines = text.split(/\r?\n/);
  const lineExcerpt = lines.slice(0, EXCERPT_LINE_LIMIT).join("\n");
  const codePoints = takeCodePoints(lineExcerpt, EXCERPT_CHARACTER_LIMIT + 1);
  const isTruncated = lines.length > EXCERPT_LINE_LIMIT || codePoints.length > EXCERPT_CHARACTER_LIMIT;

  if (!isTruncated) return { excerpt: text, isTruncated: false };

  const excerptCodePoints = codePoints.slice(0, EXCERPT_CHARACTER_LIMIT);
  let excerpt = excerptCodePoints.join("").trimEnd();
  if (codePoints.length > EXCERPT_CHARACTER_LIMIT) {
    const lastWordBoundary = excerptCodePoints.lastIndexOf(" ");
    if (lastWordBoundary > EXCERPT_CHARACTER_LIMIT * 0.75) {
      excerpt = excerptCodePoints.slice(0, lastWordBoundary).join("").trimEnd();
    }
  }

  return { excerpt: `${excerpt}…`, isTruncated: true };
}

export function ResourceNoteViewer({ sanitizedHtml, fallbackText = "", previewText = "" }) {
  const content = sanitizedHtml || fallbackText;
  const [isExpanded, setIsExpanded] = useState(false);

  if (!content) return null;

  const collapseText = sanitizedHtml ? previewText : fallbackText;
  const { excerpt, isTruncated } = getNoteExcerpt(collapseText);
  const fullContent = sanitizedHtml ? (
    <div
      className="resource-note-content rich-text-content text-sm leading-5 text-black"
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  ) : (
    <p className="resource-note-content whitespace-pre-wrap break-words text-sm leading-5 text-black">
      {fallbackText}
    </p>
  );

  if (!isTruncated) {
    return <div className="mt-2 text-black">{fullContent}</div>;
  }

  return (
    <Collapsible
      open={isExpanded}
      onOpenChange={setIsExpanded}
      className="mt-2 text-black"
    >
      {!isExpanded ? (
        <p className="resource-note-content whitespace-pre-wrap break-words text-sm leading-5 text-black">
          {excerpt}
        </p>
      ) : null}
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="resource-note-toggle mt-2 inline-flex items-center gap-1 rounded-sm text-xs font-semibold text-[#255E4A] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F726B] focus-visible:ring-offset-2"
        >
          {isExpanded ? "Show Less" : "Show More"}
          <ChevronDown
            aria-hidden="true"
            className={`h-3.5 w-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className={isExpanded ? "mt-2" : ""}>
        {fullContent}
      </CollapsibleContent>
    </Collapsible>
  );
}
