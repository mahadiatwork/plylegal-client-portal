"use client";

import { useCallback } from "react";
import Link from "next/link";
import { useNavigationLoading } from "@/components/NavigationLoadingProvider";

/**
 * Drop-in replacement for next/link that triggers the navigation
 * progress indicator on click (unless modifier keys suggest
 * the user wants a native browser behaviour like open-in-new-tab).
 */
export function ProgressLink({ href, onClick, children, ...rest }) {
  const { startNavigation } = useNavigationLoading();

  const handleClick = useCallback(
    (e) => {
      // Let the browser handle modifier-key clicks natively (ctrl/cmd/shift for new tab etc.)
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }

      // Only trigger for internal links
      if (href && typeof href === "string" && !href.startsWith("http")) {
        startNavigation(href);
      }

      if (onClick) {
        onClick(e);
      }
    },
    [href, onClick, startNavigation]
  );

  return (
    <Link href={href} onClick={handleClick} {...rest}>
      {children}
    </Link>
  );
}
