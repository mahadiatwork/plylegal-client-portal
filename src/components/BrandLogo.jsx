"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import blackLogo from "@/assets/Ply_Logo_black.png";
import whiteLogo from "@/assets/Ply_Logo_White.png";

export function BrandLogo({ className, priority = false, variant = "white" }) {
  const logoSrc = variant === "black" ? blackLogo : whiteLogo;
  
  return (
    <Image
      src={logoSrc}
      alt="PlyLegal"
      width={200}
      height={60}
      priority={priority}
      className={cn("block h-[60px] w-auto mx-auto", className)}
    />
  );
}


