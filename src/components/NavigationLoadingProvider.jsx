"use client";

import { createContext, useContext, useCallback, useEffect, useState, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { FileCheck2, Shield } from "lucide-react";

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
      {/* Delayed centered navigation overlay */}
      {showOverlay && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center px-4 bg-slate-900/20 backdrop-blur-[2px] pointer-events-auto">
          <div className="w-[92vw] max-w-[500px] rounded-[22px] border border-[#e8ece8] bg-white p-10 shadow-[0_14px_36px_rgba(16,24,40,0.18)]">
            <div className="mx-auto relative h-[172px] w-[172px]">
              <svg viewBox="0 0 172 172" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
                <circle cx="86" cy="86" r="80" fill="none" stroke="#d9dedd" strokeWidth="6" />
                <circle
                  cx="86"
                  cy="86"
                  r="80"
                  fill="none"
                  stroke="#022C22"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray="108 502"
                  className="origin-center animate-spin"
                  style={{ animationDuration: "2.2s" }}
                />
              </svg>

              <div className="absolute inset-0 flex items-center justify-center">
                <FileCheck2 className="h-16 w-16 text-[#022C22]" strokeWidth={2.2} />
              </div>
            </div>

            <h2 className="mt-5 text-center text-[40px] font-semibold text-[#022C22]">Opening application</h2>

            <div className="mt-4 flex items-center justify-center gap-3 text-[#7b8c86]">
              <div className="h-px w-20 bg-[#d5ddda]" />
              <Shield className="h-4 w-4 text-[#022C22]" strokeWidth={2.2} />
              <div className="h-px w-20 bg-[#d5ddda]" />
            </div>

            <p className="mt-5 text-center text-[13px] text-[#4d655d]">
              Please wait while we prepare your workspace.
            </p>
          </div>
        </div>
      )}

      {children}
    </NavigationLoadingContext.Provider>
  );
}


