import type { Metadata } from "next";
import { Inter, Outfit, Geist_Mono, Hind_Siliguri } from "next/font/google";
import "./globals.css";
import { ToastProvider } from '@smart-bazar/shared/contexts/ui/ToastContext';
import { AuthProvider } from '@smart-bazar/shared/contexts/AuthContext';
import ToastContainer from '@smart-bazar/shared/components/ui/ToastContainer';
import { AppConfigProvider } from '@smart-bazar/shared/contexts/AppConfigContext';
import { LanguageProvider } from '@smart-bazar/shared/contexts/LanguageContext';
import { ErrorBoundary } from '@smart-bazar/shared/components/ErrorBoundary';

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const hindSiliguri = Hind_Siliguri({
  variable: "--font-hind-siliguri",
  subsets: ["bengali"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Smart Bazar - Grocery Delivery in 30 Minutes",
  description: "Order groceries online and get them delivered to your doorstep in 30 minutes. Fresh vegetables, fruits, household items and more.",
  keywords: "grocery delivery, online grocery, fresh vegetables, fruits, smart bazar",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${outfit.variable} ${geistMono.variable} ${hindSiliguri.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var saved = localStorage.getItem('smart-bazar-theme');
                if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.setAttribute('data-theme', 'dark');
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.setAttribute('data-theme', 'light');
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {}
            `
          }}
        />
      </head>
      <body className="min-h-full flex flex-col antialiased bg-background text-foreground">
        <ErrorBoundary>
          <AppConfigProvider>
            <ToastProvider>
              <AuthProvider allowedRoles={['customer']} defaultAuthPath="/home" publicPaths={['/', '/register']}>
                <LanguageProvider>
                  {children}
                </LanguageProvider>
              </AuthProvider>
              <ToastContainer />
            </ToastProvider>
          </AppConfigProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}