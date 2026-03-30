import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AtmosphereProvider } from "@/components/atmosphere/AtmosphereProvider";
import { AtmosphereCanvas } from "@/components/atmosphere/AtmosphereCanvas";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Tribunal — AI Decision Court",
  description:
    "An AI-powered courtroom that stress-tests your decisions with five debating agents.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        geist.variable,
      )}
    >
      <body>
        <ThemeProvider>
          <AtmosphereProvider>
            <AtmosphereCanvas />
            {children}
          </AtmosphereProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
