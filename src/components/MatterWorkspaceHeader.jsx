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
  let textColor = "text-slate-700";
  let bgClass = "bg-slate-100";

  if (text.includes("preparing") || text.includes("in progress") || text.includes("qualification") || text.includes("review")) {
    dotColor = "bg-blue-600";
    textColor = "text-blue-700";
    bgClass = "bg-blue-50";
  } else if (text.includes("finalis") || text.includes("finaliz") || text.includes("won") || text.includes("approved") || text.includes("completed")) {
    dotColor = "bg-emerald-600";
    textColor = "text-emerald-700";
    bgClass = "bg-emerald-50";
  } else if (text.includes("awaiting")) {
    dotColor = "bg-amber-500";
    textColor = "text-amber-800";
    bgClass = "bg-amber-50";
  } else {
    dotColor = "bg-slate-400";
    textColor = "text-slate-600";
    bgClass = "bg-slate-100";
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
  const applicationTitle = application ? formatVisaApplicationType(application) : "Visa Matter";
  const status = application?.status || "Preparing application";

  const baseHref = slug && appId ? `/applications/${slug}/${appId}` : "";

  const tabs = [
    {
      id: "questionnaire",
      label: "Questionnaire",
      href: `${baseHref}/questionnaire`,
      icon: FileText,
      isActive: pathname?.includes("/questionnaire") || pathname?.startsWith("/intake/"),
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
    <div className={cn("w-full border-b border-slate-200/80 bg-white shadow-sm", className)}>
      <div className="mx-auto w-full max-w-[1608px] px-4 pt-4 sm:px-6 sm:pt-6 lg:px-8">
        {/* Back Link */}
        <div className="mb-2">
          <ProgressLink
            href={backHref}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{backLabel}</span>
          </ProgressLink>
        </div>

        {/* Matter Title & Status Dot */}
        <div className="flex flex-wrap items-baseline gap-3 pb-4 pt-1">
          <h1 className="font-serif text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {applicationTitle}
          </h1>
          <MatterStatusDot status={status} />
        </div>

        {/* Horizontal Tabs */}
        <nav className="flex items-center space-x-1 sm:space-x-4 overflow-x-auto no-scrollbar -mb-px" aria-label="Matter Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <ProgressLink
                key={tab.id}
                href={tab.href}
                className={cn(
                  "group relative inline-flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors whitespace-nowrap",
                  tab.isActive
                    ? "border-[#244D42] text-[#244D42] font-semibold"
                    : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900"
                )}
                data-testid={`tab-${tab.id}`}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    tab.isActive ? "text-[#244D42]" : "text-slate-400 group-hover:text-slate-600"
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
