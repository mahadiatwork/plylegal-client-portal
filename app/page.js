"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authStore } from "@/stores";

/**
 * Root page — redirects based on authentication state:
 *   • Authenticated → /applications
 *   • Not authenticated → /login
 */
export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const resolve = async () => {
      const isLoggedIn = await authStore.checkSession();
      if (isLoggedIn) {
        router.replace("/applications");
      } else {
        router.replace("/login");
      }
      setChecking(false);
    };

    resolve();
  }, [router]);

  // Show nothing while determining auth state (prevents flash)
  if (checking) return null;

  return null;
}
