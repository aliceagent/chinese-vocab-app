import type { Metadata, Viewport } from 'next'
import './globals.css'
import { registerServiceWorker } from '@/lib/serviceWorker'
import { AuthProvider } from '@/components/providers/SessionProvider'

// Use system fonts for better performance on mobile
const systemFonts = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'

export const metadata: Metadata = {
  title: 'Chinese Vocab - Learn Chinese Your Way',
  description:
    'Upload your documents, extract vocabulary, generate personalized stories, and test your knowledge with adaptive quizzes.',
  keywords: [
    'Chinese',
    'Mandarin',
    'vocabulary',
    'learning',
    'HSK',
    'Pinyin',
    'language learning',
  ],
  authors: [{ name: 'Chinese Vocab' }],
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#dc2626',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body style={{ fontFamily: systemFonts }}>
        <AuthProvider>
          {children}
        </AuthProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined') {
                (${registerServiceWorker.toString()})();
              }
            `
          }}
        />
      </body>
    </html>
  )
}
