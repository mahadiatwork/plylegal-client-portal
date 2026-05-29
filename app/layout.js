import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "./providers";

const FAVICON_URL =
  "https://cdn.prod.website-files.com/68df275416b515842035785c/68f9a3861f1f134bb950ee93_Favicon.svg";

export const metadata = {
  title: "PlyLegal: Visa Portal",
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
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
