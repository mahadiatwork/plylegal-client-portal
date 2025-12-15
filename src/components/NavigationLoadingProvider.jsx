"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import { LoadingPage } from "@/components/LoadingPage";

export function NavigationLoadingProvider({ children }) {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);
  const prevPathnameRef = useRef(pathname);
  const loadingTimeoutRef = useRef(null);

  useEffect(() => {
    // Check if pathname actually changed
    if (pathname !== prevPathnameRef.current) {
      // Clear any existing timeout
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }

      // Show loading immediately
      setIsLoading(true);
      prevPathnameRef.current = pathname;

      // Hide loading after page has time to render
      // Adjust this delay based on your needs (300-500ms is usually good)
      loadingTimeoutRef.current = setTimeout(() => {
        setIsLoading(false);
      }, 400);
    }

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [pathname]);

  if (isLoading) {
    return <LoadingPage />;
  }

  return <>{children}</>;
}


