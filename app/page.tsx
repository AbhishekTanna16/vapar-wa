'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

type Analytics = {
  contacts: { total: number }
  messages: { total: number; inbound: number; outbound: number }
  orders: { total: number; pending: number; delivered: number; cancelled: number; revenue: number }
  products: { active: number }
  campaigns: { total: number; completed: number }
  flows: { active: number }
  recentMessages: Array<{
    id: string
    body: string
    direction: 'INBOUND' | 'OUTBOUND'
    createdAt: string
    contact: { phone: string; name: string | null }
  }>
  recentOrders: Array<{
    id: string
    quantity: number
    status: string
    createdAt: string
    contact: { phone: string; name: string | null }
    product: { name: string; price: number }
  }>
  last7Days: Array<{ date: string; inbound: number; outbound: number }>
}

const STATUS_STYLES: Record<string, string> = {
  PENDING:   'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  SHIPPED:   'bg-purple-100 text-purple-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-600',
}

function StatCard({
  label, value, sub, color = 'gray', href
}: {
  label: string
  value: string | number
  sub?: string
  color?: string
  href?: string
}) {
  const colors: Record<string, string> = {
    green:  'bg-green-50  border-green-100  text-green-700',
    blue:   'bg-blue-50   border-blue-100   text-blue-700',
    purple: 'bg-purple-50 border-purple-100 text-purple-700',
    amber:  'bg-amber-50  border-amber-100  text-amber-700',
    gray:   'bg-white     border-gray-200   text-gray-800',
  }
  const card = (
    <div className={`border rounded-xl p-4 ${colors[color]}`}>
      <p className="text-xs opacity-70 mb-1">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
      {sub && <p className="text-xs opacity-60 mt-1">{sub}</p>}
    </div>
  )
  return href ? <Link href={href}>{card}</Link> : card
}

export default function DashboardPage() {
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/analytics')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        Loading dashboard...
      </div>
    )
  }

  if (!data) return null

  const maxMessages = Math.max(
    ...data.last7Days.map(d => Number(d.inbound) + Number(d.outbound)), 1
  )

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-sm text-gray-400">
          {new Date().toLocaleDateString('en-IN', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
          })}
        </p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Total Contacts"
          value={data.contacts.total}
          sub="WhatsApp contacts"
          color="green"
          href="/contacts"
        />
        <StatCard
          label="Total Messages"
          value={data.messages.total}
          sub={`${data.messages.inbound} in · ${data.messages.outbound} out`}
          color="blue"
        />
        <StatCard
          label="Total Orders"
          value={data.orders.total}
          sub={`${data.orders.pending} pending`}
          color="amber"
          href="/orders"
        />
        <StatCard
          label="Revenue"
          value={`₹${data.orders.revenue.toLocaleString()}`}
          sub={`${data.orders.delivered} delivered`}
          color="green"
          href="/orders"
        />
      </div>

      {/* Second row */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Active Products"
          value={data.products.active}
          color="purple"
          href="/catalog"
        />
        <StatCard
          label="Campaigns"
          value={data.campaigns.total}
          sub={`${data.campaigns.completed} completed`}
          href="/campaigns"
        />
        <StatCard
          label="Auto-Reply Rules"
          value={data.flows.active}
          sub="active rules"
          href="/flows"
        />
        <StatCard
          label="Cancelled Orders"
          value={data.orders.cancelled}
          color="gray"
          href="/orders"
        />
      </div>

      <div className="grid grid-cols-3 gap-6">

        {/* Message chart */}
        <div className="col-span-2 bg-white border rounded-xl p-4">
          <h2 className="font-semibold text-gray-700 mb-4">Messages — last 7 days</h2>
          {data.last7Days.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-300 text-sm">
              No messages yet
            </div>
          ) : (
            <div className="flex items-end gap-2 h-36">
              {data.last7Days.map((d, i) => {
                const inbound  = Number(d.inbound)
                const outbound = Number(d.outbound)
                const total    = inbound + outbound
                const height   = Math.round((total / maxMessages) * 100)
                const inPct    = total > 0 ? Math.round((inbound / total) * 100) : 50
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex flex-col justify-end rounded-t overflow-hidden"
                      style={{ height: '100px' }}>
                      <div
                        className="w-full bg-green-400 rounded-t"
                        style={{ height: `${height}%` }}
                        title={`${inbound} in, ${outbound} out`}
                      />
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(d.date).toLocaleDateString('en-IN', { weekday: 'short' })}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
          <div className="flex gap-4 mt-2">
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
              Messages per day
            </span>
          </div>
        </div>

        {/* Recent messages */}
        <div className="bg-white border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-700">Recent Messages</h2>
            <Link href="/contacts" className="text-xs text-green-600 hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {data.recentMessages.length === 0 ? (
              <p className="text-gray-300 text-sm text-center py-6">No messages yet</p>
            ) : (
              data.recentMessages.map(m => (
                <div key={m.id} className="flex items-start gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                    m.direction === 'INBOUND' ? 'bg-green-400' : 'bg-blue-400'
                  }`} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-700 truncate">
                      {m.contact.name ?? m.contact.phone}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{m.body}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent orders */}
      <div className="bg-white border rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-700">Recent Orders</h2>
          <Link href="/orders" className="text-xs text-green-600 hover:underline">
            View all
          </Link>
        </div>
        {data.recentOrders.length === 0 ? (
          <p className="text-gray-300 text-sm text-center py-6">No orders yet</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 text-gray-400 font-medium text-xs">Customer</th>
                <th className="text-left py-2 text-gray-400 font-medium text-xs">Product</th>
                <th className="text-left py-2 text-gray-400 font-medium text-xs">Total</th>
                <th className="text-left py-2 text-gray-400 font-medium text-xs">Status</th>
                <th className="text-left py-2 text-gray-400 font-medium text-xs">Date</th>
              </tr>
            </thead>
            <tbody>
              {data.recentOrders.map(o => (
                <tr key={o.id} className="border-b last:border-0">
                  <td className="py-2 text-gray-700">
                    {o.contact.name ?? o.contact.phone}
                  </td>
                  <td className="py-2 text-gray-500">{o.product.name}</td>
                  <td className="py-2 font-medium text-gray-800">
                    ₹{(o.product.price * o.quantity).toLocaleString()}
                  </td>
                  <td className="py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[o.status]}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="py-2 text-gray-400 text-xs">
                    {new Date(o.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  )
}