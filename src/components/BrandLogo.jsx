"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandLogo({ className, priority = false }) {
  return (
    <Image
      src="/logo.png"
      alt="PlyLegal"
      width={200}
      height={60}
      priority={priority}
      className={cn("block h-[60px] w-auto mx-auto", className)}
    />
  );
}


