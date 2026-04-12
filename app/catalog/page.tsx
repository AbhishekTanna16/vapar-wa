'use client'
import { useEffect, useState } from 'react'

type Product = {
  id: string
  name: string
  description: string | null
  price: number
  imageUrl: string | null
  isActive: boolean
  createdAt: string
  _count: { orders: number }
}

const emptyForm = { name: '', description: '', price: '', imageUrl: '' }

export default function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => { fetchProducts() }, [])

  async function fetchProducts() {
    const res = await fetch('/api/catalog')
    setProducts(await res.json())
    setLoading(false)
  }

  async function saveProduct() {
    if (!form.name || !form.price) return
    setSaving(true)
    if (editingId) {
      await fetch(`/api/catalog/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
    } else {
      await fetch('/api/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
    }
    setForm(emptyForm)
    setEditingId(null)
    setShowForm(false)
    setSaving(false)
    fetchProducts()
  }

  async function toggleActive(product: Product) {
    await fetch(`/api/catalog/${product.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !product.isActive })
    })
    fetchProducts()
  }

  async function deleteProduct(id: string) {
    if (!confirm('Delete this product?')) return
    await fetch(`/api/catalog/${id}`, { method: 'DELETE' })
    fetchProducts()
  }

  function startEdit(p: Product) {
    setForm({
      name: p.name,
      description: p.description ?? '',
      price: p.price.toString(),
      imageUrl: p.imageUrl ?? ''
    })
    setEditingId(p.id)
    setShowForm(true)
  }

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Product Catalog</h1>
          <p className="text-sm text-gray-500">
            {products.filter(p => p.isActive).length} active products
          </p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setEditingId(null); setForm(emptyForm) }}
          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700"
        >
          + Add Product
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white border rounded-xl p-5 mb-6">
          <h3 className="font-medium text-gray-700 mb-4">
            {editingId ? 'Edit Product' : 'New Product'}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="Product name *"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm col-span-2"
            />
            <input
              placeholder="Price (₹) *"
              type="number"
              value={form.price}
              onChange={e => setForm({ ...form, price: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm"
            />
            <input
              placeholder="Image URL (optional)"
              value={form.imageUrl}
              onChange={e => setForm({ ...form, imageUrl: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm"
            />
            <textarea
              placeholder="Description (optional)"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm col-span-2"
              rows={2}
            />
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={saveProduct}
              disabled={saving}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : editingId ? 'Update' : 'Save Product'}
            </button>
            <button
              onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm) }}
              className="border px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <input
        placeholder="Search products..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="border rounded-lg px-3 py-2 text-sm w-full mb-4 bg-white"
      />

      {/* Products grid */}
      {loading ? (
        <div className="text-center text-gray-400 py-12">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-gray-400 py-12">No products yet</div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {filtered.map(p => (
            <div
              key={p.id}
              className={`bg-white border rounded-xl overflow-hidden ${!p.isActive ? 'opacity-60' : ''}`}
            >
              {/* Image */}
              <div className="h-36 bg-gray-100 flex items-center justify-center">
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt={p.name}
                    className="h-full w-full object-cover" />
                ) : (
                  <div className="text-4xl text-gray-300">📦</div>
                )}
              </div>

              {/* Info */}
              <div className="p-3">
                <div className="flex items-start justify-between mb-1">
                  <h3 className="font-medium text-gray-800 text-sm">{p.name}</h3>
                  <span className="font-bold text-green-600 text-sm">
                    ₹{p.price.toLocaleString()}
                  </span>
                </div>
                {p.description && (
                  <p className="text-xs text-gray-400 mb-2 line-clamp-2">{p.description}</p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">{p._count.orders} orders</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleActive(p)}
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        p.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {p.isActive ? 'Active' : 'Inactive'}
                    </button>
                    <button onClick={() => startEdit(p)}
                      className="text-xs text-blue-500 hover:underline">
                      Edit
                    </button>
                    <button onClick={() => deleteProduct(p.id)}
                      className="text-xs text-red-400 hover:underline">
                      Del
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}