'use client'
import { useEffect, useState } from 'react'

type Campaign = {
  id: string
  name: string
  message: string
  status: 'DRAFT' | 'RUNNING' | 'COMPLETED' | 'FAILED'
  recipients: string[]
  sentCount: number
  failedCount: number
  createdAt: string
}

type Contact = {
  id: string
  phone: string
  name: string | null
}

const STATUS_STYLES = {
  DRAFT:     'bg-gray-100 text-gray-600',
  RUNNING:   'bg-blue-100 text-blue-600',
  COMPLETED: 'bg-green-100 text-green-700',
  FAILED:    'bg-red-100 text-red-600',
}

const emptyForm = { name: '', message: '', recipients: [] as string[] }

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState<string | null>(null)
  const [manualPhone, setManualPhone] = useState('')

  useEffect(() => {
    fetchCampaigns()
    fetchContacts()
  }, [])

  async function fetchCampaigns() {
    const res = await fetch('/api/campaigns')
    setCampaigns(await res.json())
    setLoading(false)
  }

  async function fetchContacts() {
    const res = await fetch('/api/contacts')
    setContacts(await res.json())
  }

  async function saveCampaign() {
    if (!form.name || !form.message || !form.recipients.length) return
    setSaving(true)
    await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    setForm(emptyForm)
    setShowForm(false)
    setSaving(false)
    fetchCampaigns()
  }

  async function sendCampaign(id: string) {
    if (!confirm('Send this campaign now?')) return
    setSending(id)
    await fetch(`/api/campaigns/${id}/send`, { method: 'POST' })
    setSending(null)
    fetchCampaigns()
  }

  async function deleteCampaign(id: string) {
    if (!confirm('Delete this campaign?')) return
    await fetch(`/api/campaigns/${id}`, { method: 'DELETE' })
    fetchCampaigns()
  }

  function toggleRecipient(phone: string) {
    setForm(f => ({
      ...f,
      recipients: f.recipients.includes(phone)
        ? f.recipients.filter(p => p !== phone)
        : [...f.recipients, phone]
    }))
  }

  function addManualPhone() {
    const phone = manualPhone.trim()
    if (!phone || form.recipients.includes(phone)) return
    setForm(f => ({ ...f, recipients: [...f.recipients, phone] }))
    setManualPhone('')
  }

  function selectAll() {
    setForm(f => ({ ...f, recipients: contacts.map(c => c.phone) }))
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Campaigns</h1>
          <p className="text-sm text-gray-500">{campaigns.length} total campaigns</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700"
        >
          + New Campaign
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white border rounded-xl p-5 mb-6">
          <h3 className="font-medium text-gray-700 mb-4">New Campaign</h3>
          <div className="space-y-3">
            <input
              placeholder="Campaign name (e.g. Diwali Sale)"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm w-full"
            />
            <textarea
              placeholder="Message to send..."
              value={form.message}
              onChange={e => setForm({ ...form, message: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm w-full"
              rows={4}
            />

            {/* Recipients */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-700">
                  Recipients ({form.recipients.length} selected)
                </p>
                <button onClick={selectAll}
                  className="text-xs text-green-600 hover:underline">
                  Select all contacts
                </button>
              </div>

              {/* Manual phone entry */}
              <div className="flex gap-2 mb-2">
                <input
                  placeholder="Add phone manually (e.g. 919876543210)"
                  value={manualPhone}
                  onChange={e => setManualPhone(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addManualPhone()}
                  className="flex-1 border rounded-lg px-3 py-2 text-sm"
                />
                <button onClick={addManualPhone}
                  className="border px-3 py-2 rounded-lg text-sm hover:bg-gray-50">
                  Add
                </button>
              </div>

              {/* Contact list */}
              {contacts.length > 0 && (
                <div className="border rounded-lg max-h-40 overflow-y-auto">
                  {contacts.map(c => (
                    <label key={c.id}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b last:border-0">
                      <input
                        type="checkbox"
                        checked={form.recipients.includes(c.phone)}
                        onChange={() => toggleRecipient(c.phone)}
                        className="accent-green-600"
                      />
                      <span className="text-sm text-gray-700">
                        {c.name ?? c.phone}
                        {c.name && <span className="text-gray-400 ml-1">({c.phone})</span>}
                      </span>
                    </label>
                  ))}
                </div>
              )}

              {/* Selected phones */}
              {form.recipients.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {form.recipients.map(p => (
                    <span key={p}
                      className="bg-green-50 text-green-700 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                      {p}
                      <button onClick={() => toggleRecipient(p)}
                        className="hover:text-red-500 font-bold">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button onClick={saveCampaign} disabled={saving}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
                {saving ? 'Saving...' : 'Save as Draft'}
              </button>
              <button onClick={() => { setShowForm(false); setForm(emptyForm) }}
                className="border px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Campaigns list */}
      {loading ? (
        <div className="text-center text-gray-400 py-12">Loading...</div>
      ) : campaigns.length === 0 ? (
        <div className="text-center text-gray-400 py-12">No campaigns yet</div>
      ) : (
        <div className="space-y-3">
          {campaigns.map(c => (
            <div key={c.id} className="bg-white border rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-gray-800">{c.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[c.status]}`}>
                      {c.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-2 line-clamp-1">{c.message}</p>
                  <div className="flex gap-4 text-xs text-gray-400">
                    <span>{c.recipients.length} recipients</span>
                    {c.status === 'COMPLETED' && (
                      <>
                        <span className="text-green-600">✓ {c.sentCount} sent</span>
                        {c.failedCount > 0 && (
                          <span className="text-red-500">✗ {c.failedCount} failed</span>
                        )}
                      </>
                    )}
                    <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  {c.status === 'DRAFT' && (
                    <button
                      onClick={() => sendCampaign(c.id)}
                      disabled={sending === c.id}
                      className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-green-700 disabled:opacity-50"
                    >
                      {sending === c.id ? 'Sending...' : 'Send Now'}
                    </button>
                  )}
                  {c.status !== 'RUNNING' && (
                    <button onClick={() => deleteCampaign(c.id)}
                      className="text-xs text-red-400 hover:underline">
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}