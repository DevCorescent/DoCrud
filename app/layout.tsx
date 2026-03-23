import type { Metadata } from 'next'
import './globals.css'
import { SessionProvider } from './components/SessionProvider'

export const metadata: Metadata = {
  title: 'Corescent Document Generator',
  description: 'Professional document generation for private limited companies',
  icons: {
    icon: '/corescent-logo.png',
    shortcut: '/corescent-logo.png',
    apple: '/corescent-logo.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-slate-100 text-slate-950 antialiased">
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  )
}
