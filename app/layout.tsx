import type { Metadata } from 'next';
import { IBM_Plex_Mono, Space_Grotesk, Anton } from 'next/font/google';
import './globals.css';

const displayFont = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
});

const posterFont = Anton({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-poster',
});

const monoFont = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
  title: 'GameFilm — Rivian Intelligence',
  description: 'Competitive intelligence dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${displayFont.variable} ${posterFont.variable} ${monoFont.variable} min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
