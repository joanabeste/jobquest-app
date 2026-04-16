import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/components/ui/Toast';
import { ALL_FONT_VARIABLES } from '@/lib/fonts';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
});

// Ermöglicht, dass relative og:image-URLs in generateMetadata() korrekt
// absolutiert werden (Social-Media-Scraper akzeptieren nur absolute URLs).
function resolveAppUrl(): URL {
  const domain = process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'localhost:3000';
  const isLocal = domain.startsWith('localhost');
  const first = domain.split(',')[0].trim();
  return new URL(`${isLocal ? 'http' : 'https'}://${first}`);
}

export const metadata: Metadata = {
  metadataBase: resolveAppUrl(),
  title: 'JobQuest – Digitales Ausbildungsmarketing',
  description: 'Interaktive Berufserkundungsreisen für Unternehmen erstellen und veröffentlichen.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${ALL_FONT_VARIABLES} antialiased bg-slate-50 text-slate-900`} suppressHydrationWarning>
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
