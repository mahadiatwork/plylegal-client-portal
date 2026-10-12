"use client";

import { usePathname } from "next/navigation";
import { ProgressLink } from "@/components/ProgressLink";
import { formatVisaApplicationType, getApplicationSlug } from "@/lib/visaDisplay";
import { cn } from "@/lib/utils";
import {
  FileText,
  Upload,
  BookOpen,
  Folder,
  ArrowLeft,
} from "lucide-react";

export function MatterStatusDot({ status }) {
  const text = String(status || "").trim().toLowerCase();

  let dotColor = "bg-slate-400";
  let textColor = "text-slate-600";
  let bgClass = "bg-[#F1F5F9]";

  if (text.includes("preparing") || text.includes("in progress") || text.includes("qualification") || text.includes("review")) {
    dotColor = "bg-[#159A6A]";
    textColor = "text-[#2A5A4D]";
    bgClass = "bg-[#E8F2ED]";
  } else if (text.includes("finalis") || text.includes("finaliz") || text.includes("won") || text.includes("approved") || text.includes("completed")) {
    dotColor = "bg-[#16A34A]";
    textColor = "text-[#15803D]";
    bgClass = "bg-[#DCFCE7]";
  } else if (text.includes("awaiting")) {
    dotColor = "bg-[#F59E0B]";
    textColor = "text-[#D97706]";
    bgClass = "bg-[#FEF3C7]";
  } else {
    dotColor = "bg-[#94A3B8]";
    textColor = "text-[#475569]";
    bgClass = "bg-[#F1F5F9]";
  }

  const label = status || "Draft";

  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", bgClass, textColor)}>
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotColor)} />
      {label}
    </span>
  );
}

export function MatterWorkspaceHeader({
  application,
  appId: propAppId,
  slug: propSlug,
  backHref = "/applications",
  backLabel = "All matters",
  className,
}) {
  const pathname = usePathname();
  const appId = propAppId || application?.id;
  const slug = propSlug || (application ? getApplicationSlug(application) : "");
  const applicationTitle = application
    ? formatVisaApplicationType(application)
    : slug === "482"
      ? "Skills in Demand (Subclass 482)"
      : slug === "186"
        ? "Employer Nomination Visa (Subclass 186)"
        : slug === "866" || slug === "protection"
          ? "Protection Visa (Subclass 866)"
          : slug === "820" || slug === "partner"
            ? "Partner Visa (Subclass 820)"
            : "Skills in Demand (Subclass 482)";
  const status = application?.status || "Preparing application";

  const baseHref = slug && appId ? `/applications/${slug}/${appId}` : "";

  const tabs = [
    {
      id: "questionnaire",
      label: "Questionnaire",
      href: `${baseHref}/questionnaire`,
      icon: FileText,
      isActive: pathname?.includes("/questionnaire") || pathname?.includes("/intake"),
    },
    {
      id: "uploads",
      label: "Upload Documents",
      href: `${baseHref}/uploads`,
      icon: Upload,
      isActive: pathname?.includes("/uploads"),
    },
    {
      id: "resources",
      label: "Resources",
      href: `${baseHref}/resources`,
      icon: BookOpen,
      isActive: pathname?.includes("/resources"),
    },
    {
      id: "shared-files",
      label: "Shared Files",
      href: `${baseHref}/shared-files`,
      icon: Folder,
      isActive: pathname?.includes("/shared-files") || pathname?.includes("/deliverables"),
    },
  ];

  return (
    <div className={cn("w-full border-b border-[#D9DCEA] bg-transparent", className)}>
      <div className="mx-auto w-full max-w-[1608px] px-4 pt-4 sm:px-6 lg:px-8">
        {/* Back Link */}
        <div className="mb-2">
          <ProgressLink
            href={backHref}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-950 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-slate-700" />
            <span>{backLabel}</span>
          </ProgressLink>
        </div>

        {/* Matter Title & Status Dot stacked vertically */}
        <div className="pb-3 pt-1">
          <h1 className="font-serif text-3xl sm:text-[40px] font-bold tracking-tight text-[#0D3339]">
            {applicationTitle}
          </h1>
          <div className="mt-2">
            <MatterStatusDot status={status} />
          </div>
        </div>

        {/* Horizontal Tabs */}
        <nav className="flex items-center gap-2 sm:gap-5 overflow-x-auto no-scrollbar -mb-px" aria-label="Matter Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <ProgressLink
                key={tab.id}
                href={tab.href}
                className={cn(
                  "group relative inline-flex items-center gap-3 rounded-t-xl border-b-[3px] px-4 py-4 text-sm font-medium transition-colors whitespace-nowrap sm:px-5 sm:text-base",
                  tab.isActive
                    ? "border-[#244D42] bg-[#FCFBF8] text-[#244D42] font-semibold shadow-[0_-1px_1px_rgba(13,51,57,0.04)]"
                    : "border-transparent bg-transparent text-[#405653] hover:text-[#173F46]"
                )}
                data-testid={`tab-${tab.id}`}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 shrink-0 transition-colors sm:h-6 sm:w-6",
                    tab.isActive ? "text-[#244D42]" : "text-[#405653] group-hover:text-[#173F46]"
                  )}
                />
                <span>{tab.label}</span>
              </ProgressLink>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
