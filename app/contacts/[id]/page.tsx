'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

type Message = {
  id: string
  direction: 'INBOUND' | 'OUTBOUND'
  body: string
  status: string
  createdAt: string
}

type Contact = {
  id: string
  phone: string
  name: string | null
  email: string | null
  notes: string | null
  tags: string[]
  createdAt: string
  messages: Message[]
}

export default function ContactDetailPage() {
  const { id } = useParams()
  const [contact, setContact] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', notes: '' })

  useEffect(() => { fetchContact() }, [id])

  async function fetchContact() {
    const res = await fetch(`/api/contacts/${id}`)
    const data = await res.json()
    setContact(data)
    setForm({ name: data.name ?? '', email: data.email ?? '', notes: data.notes ?? '' })
    setLoading(false)
  }

  async function saveContact() {
    await fetch(`/api/contacts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    setEditing(false)
    fetchContact()
  }

  if (loading) return <div className="p-6 text-gray-400">Loading...</div>
  if (!contact) return <div className="p-6 text-gray-400">Contact not found</div>

  return (
    <div className="p-6 max-w-4xl">
      <Link href="/contacts" className="text-sm text-gray-400 hover:text-gray-600 mb-4 block">
        ← Back to Contacts
      </Link>

      <div className="grid grid-cols-3 gap-6">
        {/* Contact info */}
        <div className="bg-white border rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Contact Info</h2>
            <button onClick={() => setEditing(!editing)}
              className="text-xs text-green-600 hover:underline">
              {editing ? 'Cancel' : 'Edit'}
            </button>
          </div>

          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-lg mb-3">
            {(contact.name ?? contact.phone)[0].toUpperCase()}
          </div>

          {editing ? (
            <div className="space-y-2">
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Name" className="border rounded px-2 py-1 text-sm w-full" />
              <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="Email" className="border rounded px-2 py-1 text-sm w-full" />
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="Notes" className="border rounded px-2 py-1 text-sm w-full" rows={3} />
              <button onClick={saveContact}
                className="bg-green-600 text-white px-3 py-1.5 rounded text-sm w-full hover:bg-green-700">
                Save
              </button>
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <div><span className="text-gray-400">Name:</span> <span className="text-gray-700">{contact.name ?? '—'}</span></div>
              <div><span className="text-gray-400">Phone:</span> <span className="text-gray-700">{contact.phone}</span></div>
              <div><span className="text-gray-400">Email:</span> <span className="text-gray-700">{contact.email ?? '—'}</span></div>
              <div><span className="text-gray-400">Notes:</span> <span className="text-gray-700">{contact.notes ?? '—'}</span></div>
              <div><span className="text-gray-400">Added:</span> <span className="text-gray-700">{new Date(contact.createdAt).toLocaleDateString()}</span></div>
            </div>
          )}
        </div>

        {/* Message history */}
        <div className="col-span-2 bg-white border rounded-xl p-4">
          <h2 className="font-semibold text-gray-800 mb-4">
            Message History ({contact.messages.length})
          </h2>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {contact.messages.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No messages yet</p>
            ) : (
              contact.messages.map(msg => (
                <div key={msg.id}
                  className={`flex ${msg.direction === 'OUTBOUND' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs px-3 py-2 rounded-xl text-sm ${
                    msg.direction === 'OUTBOUND'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    <p>{msg.body}</p>
                    <p className={`text-xs mt-1 ${msg.direction === 'OUTBOUND' ? 'text-green-200' : 'text-gray-400'}`}>
                      {new Date(msg.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}