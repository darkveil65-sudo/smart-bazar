import type { Metadata } from "next";
import { Inter, Geist_Mono, Outfit } from "next/font/google";
import "./globals.css";
import { ToastProvider } from '@smart-bazar/shared/contexts/ui/ToastContext';
import { AuthProvider } from '@smart-bazar/shared/contexts/AuthContext';
import ToastContainer from '@smart-bazar/shared/components/ui/ToastContainer';
import { AppConfigProvider } from '@smart-bazar/shared/contexts/AppConfigContext';
import { ErrorBoundary } from '@smart-bazar/shared/components/ErrorBoundary';

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Allkart - Grocery Delivery in 30 Minutes",
  description: "Order groceries online and get them delivered to your doorstep in 30 minutes. Fresh vegetables, fruits, household items and more.",
  keywords: "grocery delivery, online grocery, fresh vegetables, fruits, allkart",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} ${outfit.variable} h-full`}
    >
      <body className="min-h-full flex flex-col antialiased">
        <ErrorBoundary>
          <AppConfigProvider>
            <ToastProvider>
              <AuthProvider allowedRoles={['manager']} defaultAuthPath="/dashboard/manager">
                {children}
              </AuthProvider>
              <ToastContainer />
            </ToastProvider>
          </AppConfigProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}