"use client";

import { createContext, useContext, useCallback, useEffect, useState, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { NavigationSpinner } from "@/components/NavigationSpinner";

const NavigationLoadingContext = createContext(null);

const SAFETY_TIMEOUT_MS = 5000;
const OVERLAY_DELAY_MS = 250;

export function useNavigationLoading() {
  const ctx = useContext(NavigationLoadingContext);
  if (!ctx) {
    throw new Error("useNavigationLoading must be used within NavigationLoadingProvider");
  }
  return ctx;
}

export function NavigationLoadingProvider({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const targetHrefRef = useRef(null);
  const safetyTimeoutRef = useRef(null);
  const overlayDelayRef = useRef(null);

  const clearNavigation = useCallback(() => {
    setIsNavigating(false);
    setShowOverlay(false);
    targetHrefRef.current = null;
    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current);
      safetyTimeoutRef.current = null;
    }
    if (overlayDelayRef.current) {
      clearTimeout(overlayDelayRef.current);
      overlayDelayRef.current = null;
    }
  }, []);

  const startNavigation = useCallback((href) => {
    targetHrefRef.current = href || null;
    setIsNavigating(true);

    // Show the centered overlay only after a short delay so instant navigations don't flash
    overlayDelayRef.current = setTimeout(() => {
      setShowOverlay(true);
    }, OVERLAY_DELAY_MS);

    // Safety timeout: if pathname never changes (e.g. same-route push), clear after 5s
    if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
    safetyTimeoutRef.current = setTimeout(() => {
      clearNavigation();
    }, SAFETY_TIMEOUT_MS);
  }, [clearNavigation]);

  const navigate = useCallback((href, opts) => {
    startNavigation(href);
    router.push(href, opts);
  }, [startNavigation, router]);

  // Clear navigation state when pathname actually changes
  useEffect(() => {
    if (isNavigating) {
      clearNavigation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
      if (overlayDelayRef.current) clearTimeout(overlayDelayRef.current);
    };
  }, []);

  const value = {
    isNavigating,
    startNavigation,
    navigate,
  };

  return (
    <NavigationLoadingContext.Provider value={value}>
      {/* Top progress bar */}
      {isNavigating && (
        <div className="fixed top-0 left-0 right-0 h-1 z-[100] overflow-hidden">
          <div
            className="h-full w-1/3 nav-progress-bar"
            style={{ backgroundColor: "#285646" }}
          />
        </div>
      )}

      {/* Delayed centered overlay spinner */}
      {showOverlay && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/10 pointer-events-auto">
          <div className="bg-white/90 rounded-2xl p-6 shadow-lg flex flex-col items-center">
            <NavigationSpinner size="md" />
            <p className="text-[#2D5A4F] text-sm font-medium mt-3">Loading…</p>
          </div>
        </div>
      )}

      {children}
    </NavigationLoadingContext.Provider>
  );
}


