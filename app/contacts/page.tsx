'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

type Contact = {
  id: string
  phone: string
  name: string | null
  email: string | null
  tags: string[]
  createdAt: string
  _count: { messages: number }
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ phone: '', name: '', email: '', notes: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchContacts() }, [])

  async function fetchContacts() {
    const res = await fetch('/api/contacts')
    const data = await res.json()
    setContacts(data)
    setLoading(false)
  }

  async function createContact() {
    if (!form.phone) return
    setSaving(true)
    await fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    setForm({ phone: '', name: '', email: '', notes: '' })
    setShowForm(false)
    setSaving(false)
    fetchContacts()
  }

  const filtered = contacts.filter(c =>
    c.phone.includes(search) ||
    c.name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Contacts</h1>
          <p className="text-sm text-gray-500">{contacts.length} total contacts</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700"
        >
          + Add Contact
        </button>
      </div>

      {showForm && (
        <div className="bg-white border rounded-xl p-4 mb-6 grid grid-cols-2 gap-3">
          <input placeholder="Phone number *" value={form.phone}
            onChange={e => setForm({ ...form, phone: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm col-span-2" />
          <input placeholder="Name" value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Email" value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm" />
          <div className="col-span-2 flex gap-2">
            <button onClick={createContact} disabled={saving}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Contact'}
            </button>
            <button onClick={() => setShowForm(false)}
              className="border px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      <input
        placeholder="Search by name or phone..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="border rounded-lg px-3 py-2 text-sm w-full mb-4 bg-white"
      />

      {loading ? (
        <div className="text-center text-gray-400 py-12">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-gray-400 py-12">No contacts yet</div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Name</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Phone</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Email</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Messages</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Added</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/contacts/${c.id}`} className="font-medium text-green-600 hover:underline">
                      {c.name ?? 'Unknown'}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.phone}</td>
                  <td className="px-4 py-3 text-gray-400">{c.email ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-full text-xs">
                      {c._count.messages}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(c.createdAt).toLocaleDateString()}
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