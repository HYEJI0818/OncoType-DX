import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { EnhancedTranslationProvider } from "@/contexts/EnhancedTranslationContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthErrorBoundary } from "@/components/AuthErrorBoundary";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "뇌종양 MRI 영상 분석 대시보드 | Brain Tumor Analysis",
  description: "AI 기반 뇌종양 MRI 영상 분석 및 진단 대시보드 - Brain Tumor MRI Analysis Dashboard",
  keywords: ["MRI", "뇌종양", "brain tumor", "의료 영상", "medical imaging", "AI 진단", "AI diagnosis"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <AuthErrorBoundary>
            <EnhancedTranslationProvider>
              {children}
            </EnhancedTranslationProvider>
          </AuthErrorBoundary>
        </AuthProvider>
      </body>
    </html>
  );
}
