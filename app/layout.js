import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "./providers";
import favicon from "@/assets/favicon.png";

export const metadata = {
  title: "PlyLega: Visa Portal",
  description: "Legal immigration case management portal",
  icons: {
    icon: favicon.src,
  },
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
