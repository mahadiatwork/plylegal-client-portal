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
    { href: `/applications/${appId}/messages`, label: "Send Message", icon: MessageSquare },
    { href: `/applications/${appId}/corrections`, label: "Submit Corrections", icon: FileEdit },
  ];
  
  return (
    <div className="border-b border-border bg-card">
      <div className="px-3 sm:px-6 relative group">
        {/* Left Fade indicator for scroll affordance */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-card to-transparent pointer-events-none z-10 sm:hidden opacity-0 group-hover:opacity-100 transition-opacity" />
        
        {/* Right Fade indicator for scroll affordance */}
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-card to-transparent pointer-events-none z-10 sm:hidden" />

        <div className="flex gap-2 overflow-x-auto py-3 scrollbar-hide">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = pathname === tab.href || pathname?.startsWith(tab.href + '/');
            
            return (
              <Link key={tab.href} href={tab.href}>
                <button
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-colors",
                    isActive 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted text-muted-foreground hover-elevate"
                  )}
                  data-testid={`tab-${tab.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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
