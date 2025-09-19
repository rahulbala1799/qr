import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'QR Order - Restaurant Ordering Made Simple',
  description: 'Order food instantly using QR codes at your table. No waiting, no hassle - just scan and order.',
  keywords: 'restaurant, ordering, qr code, food delivery, table service',
  authors: [{ name: 'Rahul Bala' }],
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
