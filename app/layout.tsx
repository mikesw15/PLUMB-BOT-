import type {Metadata} from 'next';
import { Inter } from 'next/font/google';
import './globals.css'; // Global styles

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Plumb Bot | AI Assistant for UK Plumbers',
  description: 'AI chat assistant for your website. Voice call agent coming soon. Capture leads, qualify jobs, and book callbacks 24/7.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`scroll-smooth ${inter.className}`}>
      <body className="antialiased text-slate-900 bg-slate-50" suppressHydrationWarning>{children}</body>
    </html>
  );
}
