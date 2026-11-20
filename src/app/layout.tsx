import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import Shell from "@/components/Shell";
import ThemeScript from "@/components/ThemeScript";

export const metadata: Metadata = {
  title: { default: "حِكَمُ الحِكْمَةِ | Intisari Kebijaksanaan", template: "%s | حِكَمُ الحِكْمَةِ" },
  description: "Portal Ilmu & Talaqqi — nota Dars Sahih al-Bukhari, Sahih Muslim, Fawaid Zahabiyyah, Dars Syeikhuna dan Podcast Hikmah.",
  manifest: "/manifest.json",
  applicationName: "Intisari Kebijaksanaan",
  appleWebApp: { capable: true, title: "حِكَمُ الحِكْمَةِ", statusBarStyle: "default" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F4F0" },
    { media: "(prefers-color-scheme: dark)", color: "#121519" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ms" suppressHydrationWarning>
      <head>
        <ThemeScript />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Aref+Ruqaa:wght@400;700&family=Inter:wght@400;500;600&family=Lora:wght@500;600&display=swap"
        />
      </head>
      <body className="font-sans antialiased">
        <Providers>
          <Shell>{children}</Shell>
        </Providers>
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){})})}`,
          }}
        />
      </body>
    </html>
  );
}
