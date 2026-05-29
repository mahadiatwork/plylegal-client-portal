"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useSnapshot } from "valtio";
import { applicationsStore } from "@/stores/applicationsStore";
import { appDataStore, updateTasks } from "@/stores/appDataStore";
import { authStore } from "@/stores/authStore";
import { AppSidebar } from "@/components/AppSidebar";
import { AppHeader } from "@/components/AppHeader";
import { PillNav } from "@/components/PillNav";
import { ProgressBar } from "@/components/ProgressBar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

export default function TasksPage() {
  const params = useParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const applicationsSnap = useSnapshot(applicationsStore);
  const appDataSnap = useSnapshot(appDataStore);
  const authSnap = useSnapshot(authStore);
  
  const appId = params.id;
  const slug = params.slug;
  const application = applicationsSnap.applications.find(app => app.id === appId);
  const tasks = appDataSnap.cache[appId]?.tasks || [];

  // Load applications and tasks data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Wait for auth to be ready
        if (!authSnap.isAuthenticated && !authSnap.user) {
          await authStore.checkSession();
        }

        const userId = authSnap.user?.id;
        if (!userId) {
          setIsLoading(false);
          return;
        }

        // Load applications if not already loaded
        if (applicationsSnap.applications.length === 0) {
          await applicationsStore.loadApplications(userId);
        }

        // Load tasks data from localStorage
        if (appId && !appDataSnap.cache[appId]?.tasks) {
          appDataStore.loadTasks(appId);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [appId, authSnap.isAuthenticated, authSnap.user?.id, applicationsSnap.applications.length]);
  
  const handleToggle = (taskId) => {
    const updated = tasks.map(task =>
      task.id === taskId ? { ...task, done: !task.done } : task
    );
    updateTasks(appId, updated);
  };
  
  const completedCount = tasks.filter(t => t.done).length;
  
  // Show loading state while data is being loaded
  if (isLoading || !application) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex min-h-[100dvh] overflow-hidden bg-background">
      <div className="hidden lg:block lg:w-[18.5rem] lg:flex-shrink-0">
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
      
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AppHeader 
          onMenuClick={() => setSidebarOpen(true)} 
        />
        
        <div className="lg:hidden">
          <PillNav appId={appId} slug={slug} />
        </div>
        
        <main className="flex-1 overflow-y-auto px-6 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <h1 className="font-semibold text-gray-900 text-2xl mb-2">Tasks</h1>
              <p className="text-sm text-gray-700">Track your application progress</p>
            </div>
            
            <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="text-gray-900">Your Tasks</CardTitle>
                <CardDescription className="text-gray-700">Check items as you complete them</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <ProgressBar completed={completedCount} total={tasks.length} />
                
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                      data-testid={`task-item-${task.id}`}
                    >
                      <Checkbox
                        id={task.id}
                        checked={task.done}
                        onCheckedChange={() => handleToggle(task.id)}
                        data-testid={`checkbox-task-${task.id}`}
                      />
                      <label
                        htmlFor={task.id}
                        className={`flex-1 text-base cursor-pointer ${
                          task.done ? 'line-through text-gray-500' : 'text-gray-900'
                        }`}
                      >
                        {task.title}
                      </label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
