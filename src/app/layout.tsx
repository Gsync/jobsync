import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import dynamicImport from "next/dynamic";
export const dynamic = "force-dynamic";

const ThemeProvider = dynamicImport(
  () => import("@/components/theme-provider").then((mod) => mod.ThemeProvider),
  {
    ssr: false,
    loading: () => (
      // Optional: Add skeleton loader here
      <div className="min-h-screen bg-background" />
    ),
  }
);

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    template: "%s | JobSync",
    default: "JobSync",
  },
  description: "Job Application Tracking System",
};

interface Props {
  children: React.ReactNode;
}

export default function RootLayout({ children }: Readonly<Props>) {
  return (
    <html lang="en">
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          inter.variable
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
