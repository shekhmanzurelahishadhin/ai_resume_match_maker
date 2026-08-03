import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Resume Matchmaker — AI-powered resume ↔ job matching",
  description:
    "Upload your resume and let AI match you to the right jobs. Recruiters: surface the best-fit candidates in seconds.",
  keywords: [
    "resume",
    "ATS",
    "job match",
    "recruiter",
    "AI",
    "skills extraction",
  ],
  authors: [{ name: "Resume Matchmaker" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
};

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
        <Providers>
          <div className="min-h-screen flex flex-col">
            <div className="flex-1 flex flex-col">{children}</div>
          </div>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
