"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  FileText,
  Upload,
  BookOpen,
  MessageSquare,
  FileEdit
} from "lucide-react";

export function PillNav({ appId, slug }) {
  const pathname = usePathname();
  const baseHref = slug ? `/applications/${slug}/${appId}` : `/applications/${appId}`;

  const row1 = [
    { href: `${baseHref}/questionnaire`, label: "Questionnaire", icon: FileText },
    { href: `${baseHref}/uploads`, label: "Upload Documents", icon: Upload },
  ];

  const row2 = [
    { href: `${baseHref}/resources`, label: "Resources", icon: BookOpen },
    { href: `${baseHref}/messages`, label: "Send Message", icon: MessageSquare },
    { href: `${baseHref}/corrections`, label: "Submit Corrections", icon: FileEdit },
  ];

  const PillButton = ({ href, label, icon: Icon }) => {
    const isActive = pathname === href || pathname?.startsWith(href + '/');
    return (
      <Link key={href} href={href}>
        <button
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-colors",
            isActive
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
          data-testid={`tab-${label.toLowerCase().replace(/\s+/g, '-')}`}
        >
          <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          {label}
        </button>
      </Link>
    );
  };

  return (
    <div className="border-b border-border bg-card px-3 sm:px-6 py-2 space-y-2">
      {/* Row 1 */}
      <div className="flex gap-2">
        {row1.map((tab) => (
          <PillButton key={tab.href} {...tab} />
        ))}
      </div>
      {/* Row 2 */}
      <div className="flex flex-wrap gap-2">
        {row2.map((tab) => (
          <PillButton key={tab.href} {...tab} />
        ))}
      </div>
    </div>
  );
}
