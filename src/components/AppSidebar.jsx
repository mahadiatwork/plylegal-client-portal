"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSnapshot } from "valtio";
import { applicationsStore } from "@/stores/applicationsStore";
import { cn } from "@/lib/utils";
import { User, FileText, ChevronLeft, FileCheck, Upload, CheckSquare, Package, BookOpen, MessageSquare, FileEdit } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export function AppSidebar({ mode, application, onClose }) {
  const pathname = usePathname();
  const appsSnap = useSnapshot(applicationsStore);
  
  if (mode === "global") {
    return (
      <aside className="w-64 border-r border-sidebar-border bg-sidebar flex flex-col h-screen sticky top-0">
        <div className="p-6 border-b border-sidebar-border">
          <h2 className="font-serif text-2xl font-bold text-sidebar-foreground">PlyLegal</h2>
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
  
  const appTabs = [
    { href: `/applications/${application.id}/questionnaire`, label: "Questionnaire", icon: FileText },
    { href: `/applications/${application.id}/review`, label: "Review & PDF", icon: FileCheck },
    { href: `/applications/${application.id}/uploads`, label: "Upload Documents", icon: Upload },
    { href: `/applications/${application.id}/tasks`, label: "Tasks", icon: CheckSquare },
    { href: `/applications/${application.id}/deliverables`, label: "Our Deliverables", icon: Package },
    { href: `/applications/${application.id}/resources`, label: "Resources", icon: BookOpen },
    { href: `/applications/${application.id}/messages`, label: "Send Message", icon: MessageSquare },
    { href: `/applications/${application.id}/corrections`, label: "Submit Corrections", icon: FileEdit },
  ];
  
  return (
    <aside className="w-64 border-r border-sidebar-border bg-sidebar flex flex-col h-screen sticky top-0">
      <div className="p-6 border-b border-sidebar-border">
        <Link href="/applications">
          <button
            className="flex items-center gap-2 text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors mb-4"
            onClick={onClose}
            data-testid="button-back-to-applications"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Visa Applications
          </button>
        </Link>
        
        <div>
          <div className="text-xs text-sidebar-foreground/70">{application.reference}</div>
          <h2 className="font-serif text-lg font-semibold text-sidebar-foreground mt-1">{application.type}</h2>
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <nav className="p-4 space-y-1">
          {appTabs.map((tab) => (
            <NavLink
              key={tab.href}
              href={tab.href}
              icon={tab.icon}
              label={tab.label}
              isActive={pathname === tab.href || pathname?.startsWith(tab.href + '/')}
              onClick={onClose}
            />
          ))}
        </nav>
      </ScrollArea>
    </aside>
  );
}

function NavLink({ href, icon: Icon, label, badge, isActive, onClick }) {
  return (
    <Link href={href}>
      <button
        onClick={onClick}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-all duration-200",
          isActive
            ? "bg-[#285646] text-white border-l-4 border-[#00A67E]"
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
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
              : "bg-sidebar-accent text-sidebar-foreground"
          )}>
            {badge}
          </span>
        )}
      </button>
    </Link>
  );
}
