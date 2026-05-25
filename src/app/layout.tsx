'use client';

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { useAppStore } from '@/lib/store';
import { useEffect } from 'react';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const metadata: Metadata = {
  title: "Haanu — AI Agent That Gets Things Done",
  description: "Haanu is an autonomous AI agent that plans, researches, codes, and creates — turning your ideas into reality. Free to use forever.",
  keywords: ["Haanu", "AI Agent", "autonomous AI", "web search", "code generation", "image generation", "free AI"],
  authors: [{ name: "Haanu AI" }],
  icons: {
    icon: "/haanu-logo.png",
  },
  openGraph: {
    title: "Haanu — AI Agent That Gets Things Done",
    description: "Autonomous AI agent that plans, researches, codes, and creates. Free forever.",
    type: "website",
    siteName: "Haanu",
  },
  twitter: {
    card: "summary_large_image",
    title: "Haanu — AI Agent That Gets Things Done",
    description: "Autonomous AI agent that plans, researches, codes, and creates. Free forever.",
  },
};

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useAppStore((state) => state.theme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  return <>{children}</>;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider>{children}</ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
