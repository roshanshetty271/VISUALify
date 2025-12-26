import type { Metadata } from 'next';
import { Inter, Montserrat, Space_Grotesk } from 'next/font/google';
import { AuthProvider } from '@/components/providers/AuthProvider';
import './globals.css';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
});

const montserrat = Montserrat({ 
  subsets: ['latin'],
  variable: '--font-montserrat',
  weight: ['400', '500', '600', '700', '800', '900'],
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'VISUALify - See Your Sound',
  description: 'Real-time music visualization powered by Spotify',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${montserrat.variable} ${spaceGrotesk.variable} font-sans bg-[#0a0a0f] text-white antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
