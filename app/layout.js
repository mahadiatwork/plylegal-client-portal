import "./globals.css";
import localFont from "next/font/local";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "./providers";

const standerd = localFont({
  src: [
    {
      path: "../public/fonts/plylegal/Standerd-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/plylegal/Standerd-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/plylegal/Standerd-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../public/fonts/plylegal/Standerd-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-sans",
  display: "swap",
  fallback: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
});

const seasonMix = localFont({
  src: [
    {
      path: "../public/fonts/plylegal/SeasonMix-Medium.woff2",
      weight: "400 700",
      style: "normal",
    },
  ],
  variable: "--font-serif",
  display: "swap",
  fallback: ["Lora", "Georgia", "Times New Roman", "serif"],
});

const FAVICON_URL =
  "https://cdn.prod.website-files.com/68df275416b515842035785c/68f9a3861f1f134bb950ee93_Favicon.svg";

export const metadata = {
  title: "Ply Legal | Client Portal",
  description: "Legal immigration case management portal",
  icons: {
    icon: FAVICON_URL,
    shortcut: FAVICON_URL,
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${standerd.variable} ${seasonMix.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
