"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { initializeAppData } from "@/stores/appDataStore";

export default function ApplicationLayout({ children }) {
  const params = useParams();
  const appId = params?.id;
  
  useEffect(() => {
    if (appId) {
      initializeAppData(appId);
    }
  }, [appId]);
  
  return <>{children}</>;
}
