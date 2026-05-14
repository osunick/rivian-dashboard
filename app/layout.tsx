import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Rivian Autonomy — Sentiment Dashboard',
  description: 'Real-time social sentiment tracking for Rivian autonomy coverage',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0A0A0A] text-[#F5F5F5]">
        {children}
      </body>
    </html>
  );
}
