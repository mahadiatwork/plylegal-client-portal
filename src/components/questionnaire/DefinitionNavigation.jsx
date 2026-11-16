"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

function pathOf(href) {
  return String(href || "").split("?")[0];
}

function profileLabel(entry) {
  if (entry.profile) {
    return [entry.profile.given_names, entry.profile.family_name].filter(Boolean).join(" ").trim() || "Unnamed";
  }
  if (entry.member) {
    return [entry.member.passport?.given_names, entry.member.passport?.family_name].filter(Boolean).join(" ") || "Unnamed Member";
  }
  return "";
}

/**
 * Sidebar for a definition-driven questionnaire (see `lib/questionnaires/navigation.js`).
 * Group and step order, and which groups exist at all, come straight from the definition.
 */
export function DefinitionNavigation({
  navigation,
  internalPathname,
  activeProfileId,
  isComplete,
  onNavigate,
}) {
  const [expanded, setExpanded] = useState(() => new Set());

  const isStepActive = (step) => {
    if (pathOf(step.href) !== internalPathname) return false;
    if (!step.profileId || step.groupKey === "children" || step.groupKey === "non-migrating") return true;
    return !activeProfileId || String(activeProfileId) === String(step.profileId);
  };

  const groupId = (entry, index) => `${entry.key}:${entry.profile?.id || entry.member?.id || index}`;

  // Keep the group that contains the current page open.
  useEffect(() => {
    const activeGroups = navigation.entries
      .map((entry, index) => ({ entry, index }))
      .filter(({ entry }) => entry.type === "group" && entry.steps.some(isStepActive))
      .map(({ entry, index }) => groupId(entry, index));
    if (!activeGroups.length) return;
    setExpanded((previous) => {
      if (activeGroups.every((id) => previous.has(id))) return previous;
      return new Set([...previous, ...activeGroups]);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, internalPathname, activeProfileId]);

  const numbering = useMemo(() => {
    const numbers = new Map();
    navigation.steps.forEach((step, index) => numbers.set(step.id, index + 1));
    return numbers;
  }, [navigation]);

  const toggle = (id) => setExpanded((previous) => {
    const next = new Set(previous);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  const renderStep = (step, { nested }) => {
    const active = isStepActive(step);
    const complete = Boolean(step.completionKey) && isComplete(step.completionKey);
    const number = numbering.get(step.id);
    return (
      <button
        key={step.id}
        type="button"
        data-testid="definition-nav-step"
        data-route={pathOf(step.href)}
        data-active={active ? "true" : "false"}
        data-complete={complete ? "true" : "false"}
        aria-current={active ? "page" : undefined}
        onClick={() => onNavigate(step)}
        className={cn(
          "group flex w-full items-center text-left transition-colors",
          nested ? "gap-2.5 rounded-lg px-2.5 py-1.5 text-xs" : "gap-3 rounded-xl px-3 py-2.5 text-sm",
          active ? "bg-[#EEF7F2] font-semibold text-[#244D42]" : nested ? "text-slate-600 hover:bg-slate-50" : "text-slate-700 hover:bg-slate-50",
        )}
      >
        <span
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full transition-colors",
            nested ? "h-5 w-5 text-[10px]" : "h-6 w-6 text-xs",
            active
              ? "bg-[#244D42] font-bold text-white shadow-sm"
              : complete
                ? "bg-[#EEF7F2] font-semibold text-[#244D42]"
                : "border border-slate-200 font-medium text-slate-400",
          )}
        >
          {complete && !active ? <Check className={nested ? "h-3 w-3 stroke-[2.5]" : "h-3.5 w-3.5 stroke-[2.5]"} /> : number}
        </span>
        <span className="flex-1 truncate">{step.title}</span>
        {complete ? <Check className={cn("shrink-0 text-[#244D42]", nested ? "h-3 w-3" : "h-3.5 w-3.5")} /> : null}
      </button>
    );
  };

  return (
    <nav className="space-y-1 pt-1" aria-label="Questionnaire Sections" data-testid="definition-navigation">
      {navigation.entries.map((entry, index) => {
        if (entry.type === "step") return renderStep(entry.step, { nested: false });
        const id = groupId(entry, index);
        const open = expanded.has(id);
        const name = profileLabel(entry);
        const groupActive = entry.steps.some(isStepActive);
        return (
          <Collapsible key={id} open={open} onOpenChange={() => toggle(id)} className="pt-1">
            <div className="space-y-1">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  data-testid="definition-nav-group"
                  data-group={entry.key}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50",
                    groupActive && "bg-slate-100/80 text-slate-900",
                  )}
                >
                  <span className="truncate">
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">{entry.label}</span>
                    {name ? <span className="text-sm font-semibold text-slate-800">{name}</span> : null}
                  </span>
                  <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200", open && "rotate-180")} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="ml-3 mt-1 space-y-0.5 overflow-hidden border-l-2 border-slate-100 pl-3">
                {entry.steps.map((step) => renderStep(step, { nested: true }))}
              </CollapsibleContent>
            </div>
          </Collapsible>
        );
      })}
    </nav>
  );
}
