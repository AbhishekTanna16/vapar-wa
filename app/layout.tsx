import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import Link from 'next/link'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'WhatsApp Automation',
  description: "Vapar's WhatsApp business tool",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={geist.className}>
        <div className="flex h-screen bg-gray-50">
          <aside className="w-56 bg-white border-r flex flex-col">
            <div className="p-4 border-b">
              <h1 className="font-bold text-green-600 text-lg">Vapar WA</h1>
              <p className="text-xs text-gray-400">Business Automation</p>
            </div>
            <nav className="flex-1 p-3 space-y-1">
              {[
                { href: '/', label: 'Dashboard' },
                { href: '/contacts', label: 'Contacts' },
                { href: '/flows', label: 'Auto Replies' },
                { href: '/campaigns', label: 'Campaigns' },
                { href: '/catalog', label: 'Catalog' },
                { href: '/orders', label: 'Orders' },
              ].map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block px-3 py-2 rounded-md text-sm text-gray-600 hover:bg-green-50 hover:text-green-700 transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="p-3 border-t">
              <div className="text-xs text-gray-500 font-medium mb-1">WhatsApp</div>
              {process.env.WHATSAPP_TOKEN ? (
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                  <span className="text-xs text-green-600">Connected</span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />
                  <span className="text-xs text-gray-400">Not connected</span>
                </div>
              )}
            </div>
          </aside>
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}