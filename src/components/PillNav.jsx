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

export function PillNav({ appId }) {
  const pathname = usePathname();
  
  const tabs = [
    { href: `/applications/${appId}/questionnaire`, label: "Questionnaire", icon: FileText },
    { href: `/applications/${appId}/uploads`, label: "Upload Documents", icon: Upload },
    { href: `/applications/${appId}/resources`, label: "Resources", icon: BookOpen },
    { href: `/applications/${appId}/corrections`, label: "Submit Corrections", icon: FileEdit },
  ];
  
  return (
    <div className="border-b border-border bg-card">
      <div className="px-6">
        <div className="flex gap-2 overflow-x-auto py-3 scrollbar-hide">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = pathname === tab.href || pathname?.startsWith(tab.href + '/');
            
            return (
              <Link key={tab.href} href={tab.href}>
                <button
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                    isActive 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted text-muted-foreground hover-elevate"
                  )}
                  data-testid={`tab-${tab.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
