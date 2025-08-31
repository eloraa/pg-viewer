import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { cookies } from 'next/headers';
import { ThemeInitializer } from '@/components/theme/theme-initializer';
import { getTheme } from '@/lib/server/theme';
import { themeColor } from '@/constants';
import { Toaster } from '@/components/ui/sonner';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Elora',
  description: 'Autoslip generator',
};

export async function generateViewport(): Promise<Viewport> {
  const cookieStore = await cookies();
  const { theme, variant } = getTheme({ cookies: cookieStore });
  const color = themeColor[variant]?.[theme] || (theme === 'dark' ? '#1c1c1c' : '#fefafb');
  return {
    themeColor: color,
    colorScheme: theme,
    interactiveWidget: 'resizes-content',
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const { selectedTheme, theme, variant, image, acrylicOpacity } = getTheme({ cookies: cookieStore });

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${theme} ${variant} antialiased`}
      style={{
        colorScheme: theme === 'dark' ? 'dark' : 'light',
        // @ts-expect-error idk
        '--background-image': `url(${image})`,
      }}
    >
      <body>
        <ThemeInitializer selectedTheme={selectedTheme} variant={variant} image={image} opacity={acrylicOpacity} />
        <div className="__root" style={{ display: 'contents' }}>
          {children}
        </div>
        <Toaster />
      </body>
    </html>
  );
}
