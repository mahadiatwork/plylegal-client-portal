"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useSnapshot } from "valtio";
import { applicationsStore } from "@/stores/applicationsStore";
import { appDataStore } from "@/stores/appDataStore";
import { AppSidebar } from "@/components/AppSidebar";
import { AppHeader } from "@/components/AppHeader";
import { PillNav } from "@/components/PillNav";
import { StatusBadge } from "@/components/StatusBadge";
import { Card } from "@/components/ui/card";

export default function DeliverablesPage() {
  const params = useParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const applicationsSnap = useSnapshot(applicationsStore);
  const appDataSnap = useSnapshot(appDataStore);
  
  const appId = params.id;
  const application = applicationsSnap.applications.find(app => app.id === appId);
  const deliverables = appDataSnap.cache[appId]?.deliverables || [];
  
  if (!application) {
    return <div>Loading...</div>;
  }
  
  return (
    <div className="min-h-screen bg-background flex">
      <div className="hidden lg:block">
        <AppSidebar mode="contextual" application={application} />
      </div>
      
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div 
            className="absolute inset-0 bg-background/80 backdrop-blur-sm" 
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0">
            <AppSidebar mode="contextual" application={application} onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}
      
      <div className="flex-1 flex flex-col">
        <AppHeader 
          onMenuClick={() => setSidebarOpen(true)} 
        />
        
        <div className="lg:hidden">
          <PillNav appId={appId} />
        </div>
        
        <main className="flex-1 p-6">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <h1 className="font-serif text-3xl font-bold">Our Deliverables</h1>
              <p className="text-muted-foreground mt-1">What we provide</p>
            </div>
            
            <Card className="rounded-2xl shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-6 py-4 text-left text-sm font-semibold">Item</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Description</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {deliverables.map((item) => (
                    <tr 
                      key={item.id} 
                      className="border-b border-border last:border-0"
                      data-testid={`row-deliverable-${item.id}`}
                    >
                      <td className="px-6 py-4 font-medium">{item.item}</td>
                      <td className="px-6 py-4 text-muted-foreground">{item.description}</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={item.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
