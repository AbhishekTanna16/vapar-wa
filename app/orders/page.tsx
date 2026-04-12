'use client'
import { useEffect, useState } from 'react'

type Order = {
  id: string
  quantity: number
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
  createdAt: string
  contact: { id: string; phone: string; name: string | null }
  product: { id: string; name: string; price: number }
}

type Contact = { id: string; phone: string; name: string | null }
type Product = { id: string; name: string; price: number; isActive: boolean }

const STATUS_STYLES = {
  PENDING:   'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  SHIPPED:   'bg-purple-100 text-purple-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-600',
}

const STATUS_FLOW: Record<string, string> = {
  PENDING:   'CONFIRMED',
  CONFIRMED: 'SHIPPED',
  SHIPPED:   'DELIVERED',
}

const emptyForm = { contactId: '', productId: '', quantity: '1' }

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [statusFilter, setStatusFilter] = useState('ALL')

  useEffect(() => {
    fetchOrders()
    fetchContacts()
    fetchProducts()
  }, [])

  async function fetchOrders() {
    const res = await fetch('/api/orders')
    setOrders(await res.json())
    setLoading(false)
  }

  async function fetchContacts() {
    const res = await fetch('/api/contacts')
    setContacts(await res.json())
  }

  async function fetchProducts() {
    const res = await fetch('/api/catalog')
    setProducts(await res.json())
  }

  async function createOrder() {
    if (!form.contactId || !form.productId) return
    setSaving(true)
    await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contactId: form.contactId,
        productId: form.productId,
        quantity: parseInt(form.quantity)
      })
    })
    setForm(emptyForm)
    setShowForm(false)
    setSaving(false)
    fetchOrders()
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    })
    fetchOrders()
  }

  async function deleteOrder(id: string) {
    if (!confirm('Delete this order?')) return
    await fetch(`/api/orders/${id}`, { method: 'DELETE' })
    fetchOrders()
  }

  const filtered = statusFilter === 'ALL'
    ? orders
    : orders.filter(o => o.status === statusFilter)

  const totalRevenue = orders
    .filter(o => o.status !== 'CANCELLED')
    .reduce((sum, o) => sum + o.product.price * o.quantity, 0)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Orders</h1>
          <p className="text-sm text-gray-500">{orders.length} total orders</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700"
        >
          + New Order
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {(['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED'] as const).map(s => (
          <div key={s} className="bg-white border rounded-xl p-3">
            <p className="text-xs text-gray-400 mb-1">{s}</p>
            <p className="text-2xl font-bold text-gray-800">
              {orders.filter(o => o.status === s).length}
            </p>
          </div>
        ))}
      </div>

      {/* Revenue */}
      <div className="bg-green-50 border border-green-100 rounded-xl p-4 mb-6 flex items-center justify-between">
        <span className="text-sm text-green-700 font-medium">Total Revenue</span>
        <span className="text-2xl font-bold text-green-700">
          ₹{totalRevenue.toLocaleString()}
        </span>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white border rounded-xl p-5 mb-6">
          <h3 className="font-medium text-gray-700 mb-4">New Order</h3>
          <div className="grid grid-cols-3 gap-3">
            <select
              value={form.contactId}
              onChange={e => setForm({ ...form, contactId: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="">Select contact *</option>
              {contacts.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name ?? c.phone} ({c.phone})
                </option>
              ))}
            </select>
            <select
              value={form.productId}
              onChange={e => setForm({ ...form, productId: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="">Select product *</option>
              {products.filter(p => p.isActive).map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} — ₹{p.price.toLocaleString()}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="1"
              placeholder="Quantity"
              value={form.quantity}
              onChange={e => setForm({ ...form, quantity: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm"
            />
          </div>

          {/* Order preview */}
          {form.contactId && form.productId && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
              Total: ₹{(
                (products.find(p => p.id === form.productId)?.price ?? 0) *
                parseInt(form.quantity || '1')
              ).toLocaleString()}
            </div>
          )}

          <div className="flex gap-2 mt-3">
            <button
              onClick={createOrder}
              disabled={saving}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Create Order'}
            </button>
            <button
              onClick={() => { setShowForm(false); setForm(emptyForm) }}
              className="border px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {['ALL', 'PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              statusFilter === s
                ? 'bg-green-600 text-white border-green-600'
                : 'bg-white text-gray-500 hover:bg-gray-50'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Orders table */}
      {loading ? (
        <div className="text-center text-gray-400 py-12">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-gray-400 py-12">No orders found</div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Customer</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Product</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Qty</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Total</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Date</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => (
                <tr key={o.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{o.contact.name ?? 'Unknown'}</p>
                    <p className="text-xs text-gray-400">{o.contact.phone}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{o.product.name}</td>
                  <td className="px-4 py-3 text-gray-600">{o.quantity}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">
                    ₹{(o.product.price * o.quantity).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[o.status]}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(o.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {STATUS_FLOW[o.status] && (
                        <button
                          onClick={() => updateStatus(o.id, STATUS_FLOW[o.status])}
                          className="text-xs text-blue-500 hover:underline"
                        >
                          → {STATUS_FLOW[o.status]}
                        </button>
                      )}
                      {o.status !== 'CANCELLED' && o.status !== 'DELIVERED' && (
                        <button
                          onClick={() => updateStatus(o.id, 'CANCELLED')}
                          className="text-xs text-red-400 hover:underline"
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        onClick={() => deleteOrder(o.id)}
                        className="text-xs text-gray-300 hover:text-red-400"
                      >
                        Del
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}