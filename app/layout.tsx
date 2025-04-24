import { Inter } from 'next/font/google'
import type { Metadata } from 'next'
import ClientLayout from '@/components/ClientLayout'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AI Agent Flow Editor',
  description: 'Visual editor for AI agent flow configurations',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full`}>
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  )
} 