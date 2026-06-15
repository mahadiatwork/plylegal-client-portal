"use client";

import { usePathname } from "next/navigation";
import { useSnapshot } from "valtio";
import { applicationsStore } from "@/stores/applicationsStore";
import { cn } from "@/lib/utils";
import { User, FileText, ChevronLeft, Upload, BookOpen, FileEdit } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BrandLogo } from "@/components/BrandLogo";
import { formatVisaApplicationType, getApplicationSlug } from "@/lib/visaDisplay";
import { ProgressLink } from "@/components/ProgressLink";

export function AppSidebar({ mode, application, onClose }) {
  const pathname = usePathname();
  const appsSnap = useSnapshot(applicationsStore);
  
  if (mode === "global") {
    return (
      <aside className="w-64 border-r border-sidebar-border bg-sidebar flex flex-col h-[100dvh] sticky top-0">
        <div className="p-6 border-b border-sidebar-border">
          <BrandLogo priority />
        </div>
        
        <ScrollArea className="flex-1">
          <nav className="p-4 space-y-2">
            <NavLink
              href="/profile"
              icon={User}
              label="Profile"
              isActive={pathname === "/profile"}
              onClick={onClose}
            />
            
            <NavLink
              href="/applications"
              icon={FileText}
              label="Visa Applications"
              badge={appsSnap.applications.length > 0 ? appsSnap.applications.length.toString() : undefined}
              isActive={pathname === "/applications" || pathname?.startsWith("/applications/")}
              onClick={onClose}
            />
          </nav>
        </ScrollArea>
      </aside>
    );
  }
  
  // Contextual sidebar for application workspace
  if (!application) return null;
  const slug = getApplicationSlug(application);
  const baseHref = `/applications/${slug}/${application.id}`;
  
  const appTabs = [
    { href: `${baseHref}/questionnaire`, label: "Questionnaire", icon: FileText },
    { href: `${baseHref}/uploads`, label: "Upload Documents", icon: Upload },
    { href: `${baseHref}/resources`, label: "Resources", icon: BookOpen },
    { href: `${baseHref}/corrections`, label: "Document Review", icon: FileEdit },
  ];
  
  return (
    <aside className="w-[18.5rem] border-r border-sidebar-border bg-sidebar flex flex-col h-[100dvh] overflow-hidden lg:fixed lg:left-0 lg:top-0 lg:z-30">
      <div className="pointer-events-none absolute -bottom-28 -left-20 h-96 w-96 rounded-full border border-white/10" />
      <div className="pointer-events-none absolute -bottom-16 -left-10 h-72 w-72 rounded-full border border-white/10" />
      <div className="relative p-7">
        <ProgressLink href="/applications">
          <button
            className="flex items-center gap-2 text-sm text-sidebar-foreground/75 hover:text-sidebar-foreground transition-colors mb-9"
            onClick={onClose}
            data-testid="button-back-to-applications"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Visa Applications
          </button>
        </ProgressLink>
        
        <div>
          <h2 className="text-2xl font-semibold leading-snug text-sidebar-foreground">
            {formatVisaApplicationType(application)}
          </h2>
        </div>
      </div>
      
      <nav className="relative p-4 space-y-2">
        {appTabs.map((tab) => (
          <NavLink
            key={tab.href}
            href={tab.href}
            icon={tab.icon}
            label={tab.label}
            isActive={pathname === tab.href || pathname?.startsWith(tab.href + '/')}
            onClick={onClose}
            variant="contextual"
          />
        ))}
      </nav>
    </aside>
  );
}

function NavLink({ href, icon: Icon, label, badge, isActive, onClick, variant = "global" }) {
  const isContextual = variant === "contextual";

  return (
    <ProgressLink href={href}>
      <button
        onClick={onClick}
        className={cn(
          "w-full flex items-center gap-3 text-sm font-medium transition-all duration-200",
          isContextual ? "min-h-14 rounded-lg px-4 py-3" : "rounded px-3 py-2",
          isActive && isContextual
            ? "border-l-4 border-white/70 bg-white/10 text-white shadow-sm"
            : isActive
              ? "border-l-4 border-white/70 bg-white/10 text-white"
              : isContextual
                ? "text-sidebar-foreground/90 hover:bg-white/10 hover:text-white"
                : "text-sidebar-foreground hover:bg-white/10 hover:text-white"
        )}
        data-testid={`nav-${label.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        <span className="flex-1 text-left">{label}</span>
        {badge && (
          <span className={cn(
            "px-2 py-0.5 text-xs rounded-full",
            isActive 
              ? "bg-white/20 text-white" 
              : "bg-white/10 text-sidebar-foreground"
          )}>
            {badge}
          </span>
        )}
      </button>
    </ProgressLink>
  );
}
