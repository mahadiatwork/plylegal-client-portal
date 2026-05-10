"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSnapshot } from "valtio";
import { authStore } from "@/stores";

export function AuthGuard({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const snap = useSnapshot(authStore);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  
  // Check for existing Firebase session on mount (page refresh)
  useEffect(() => {
    const checkExistingSession = async () => {
      await authStore.checkSession();
      setIsCheckingSession(false);
    };
    
    checkExistingSession();
  }, []); // Run once on mount
  
  useEffect(() => {
    // Don't redirect while still checking session
    if (isCheckingSession) return;
    
    // Protected routes that require authentication
    const protectedRoutes = ["/applications", "/profile", "/intake"];
    const isProtected = protectedRoutes.some(route => pathname?.startsWith(route));
    
    // Admin routes require both auth and admin role
    const isAdminRoute = pathname?.startsWith("/admin");
    
    // Routes that don't require profile completion
    const profileSetupRoutes = ["/profile/setup", "/profile"];
    const isProfileRoute = profileSetupRoutes.some(route => pathname?.startsWith(route));
    
    // Check if on password change page
    const isPasswordChangePage = pathname === "/change-password";
    const isAccessDeniedPage = pathname === "/access-denied";
    
    // Redirect to login if not authenticated and trying to access protected route
    if (isProtected && !snap.isAuthenticated) {
      router.push("/login");
      return;
    }
    
    // Redirect to login if not authenticated and trying to access admin route
    if (isAdminRoute && !snap.isAuthenticated) {
      router.push("/login");
      return;
    }
    
    // Redirect non-admin users trying to access admin routes
    if (
      isAdminRoute &&
      snap.isAuthenticated &&
      snap.userProfile &&
      snap.userProfile.role !== "admin" &&
      !isAccessDeniedPage
    ) {
      router.push("/access-denied");
      return;
    }

    if (
      snap.isAuthenticated &&
      snap.userProfile &&
      snap.userProfile.portalAccess === false &&
      !isAccessDeniedPage
    ) {
      router.push("/access-denied");
      return;
    }
    
    // Redirect to password change if authenticated and needs password change
    // (highest priority - must change password before doing anything else)
    if (
      snap.isAuthenticated && 
      snap.userProfile && 
      snap.userProfile.needsPasswordChange && 
      !isPasswordChangePage
    ) {
      router.push("/change-password");
      return;
    }
    
    // Redirect to profile setup if authenticated but profile incomplete
    // (except if already on profile setup or profile page)
    if (
      snap.isAuthenticated && 
      snap.userProfile && 
      !snap.userProfile.profileCompleted && 
      isProtected && 
      !isProfileRoute &&
      !isPasswordChangePage
    ) {
      router.push("/profile/setup");
      return;
    }
  }, [snap.isAuthenticated, snap.userProfile, pathname, router, isCheckingSession]);
  
  // Show loading while checking session
  if (isCheckingSession) {
    return null; // or a loading spinner
  }
  
  // Don't render children until auth check is complete
  if (pathname !== "/login" && !snap.isAuthenticated) {
    const protectedRoutes = ["/applications", "/profile", "/intake", "/admin"];
    const isProtected = protectedRoutes.some(route => pathname?.startsWith(route));
    
    if (isProtected) {
      return null; // or a loading spinner
    }
  }
  
  // Don't render admin pages for non-admin users
  if (
    pathname?.startsWith("/admin") &&
    snap.isAuthenticated &&
    snap.userProfile &&
    snap.userProfile.role !== "admin"
  ) {
    return null;
  }
  
  return <>{children}</>;
}
