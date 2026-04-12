'use client'
import { useEffect, useState } from 'react'

type FlowRule = {
  id: string
  trigger: string
  matchType: 'EXACT' | 'CONTAINS' | 'STARTS_WITH'
  response: string
  isActive: boolean
  createdAt: string
}

type FlowForm = {
  trigger: string
  matchType: 'EXACT' | 'CONTAINS' | 'STARTS_WITH'
  response: string
}

const MATCH_LABELS = {
  EXACT: 'Exact match',
  CONTAINS: 'Contains',
  STARTS_WITH: 'Starts with',
}

const emptyForm: FlowForm = { trigger: '', matchType: 'CONTAINS', response: '' }

export default function FlowsPage() {
  const [rules, setRules] = useState<FlowRule[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [testInput, setTestInput] = useState('')
  const [testResult, setTestResult] = useState<string | null>(null)

  useEffect(() => { fetchRules() }, [])

  async function fetchRules() {
    const res = await fetch('/api/flows')
    setRules(await res.json())
    setLoading(false)
  }

  async function saveRule() {
    if (!form.trigger || !form.response) return
    setSaving(true)
    if (editingId) {
      await fetch(`/api/flows/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
    } else {
      await fetch('/api/flows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
    }
    setForm(emptyForm)
    setEditingId(null)
    setShowForm(false)
    setSaving(false)
    fetchRules()
  }

  async function toggleActive(rule: FlowRule) {
    await fetch(`/api/flows/${rule.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !rule.isActive })
    })
    fetchRules()
  }

  async function deleteRule(id: string) {
    if (!confirm('Delete this rule?')) return
    await fetch(`/api/flows/${id}`, { method: 'DELETE' })
    fetchRules()
  }

  function startEdit(rule: FlowRule) {
    setForm({ trigger: rule.trigger, matchType: rule.matchType, response: rule.response })
    setEditingId(rule.id)
    setShowForm(true)
  }

  function testFlow() {
    if (!testInput.trim()) return
    const normalised = testInput.trim().toLowerCase()
    const activeRules = rules.filter(r => r.isActive)
    for (const rule of activeRules) {
      const trigger = rule.trigger.toLowerCase()
      const matched =
        rule.matchType === 'EXACT'       ? normalised === trigger :
        rule.matchType === 'CONTAINS'    ? normalised.includes(trigger) :
        rule.matchType === 'STARTS_WITH' ? normalised.startsWith(trigger) :
        false
      if (matched) {
        setTestResult(`✅ Matched rule "${rule.trigger}" → "${rule.response}"`)
        return
      }
    }
    setTestResult('❌ No rule matched — no auto-reply will be sent')
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Auto Replies</h1>
          <p className="text-sm text-gray-500">
            {rules.filter(r => r.isActive).length} active rules
          </p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setEditingId(null); setForm(emptyForm) }}
          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700"
        >
          + Add Rule
        </button>
      </div>

      {/* Test simulator */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
        <p className="text-sm font-medium text-blue-700 mb-2">Test your flow rules</p>
        <div className="flex gap-2">
          <input
            placeholder="Type a message to test (e.g. hi, price, help)"
            value={testInput}
            onChange={e => { setTestInput(e.target.value); setTestResult(null) }}
            onKeyDown={e => e.key === 'Enter' && testFlow()}
            className="flex-1 border rounded-lg px-3 py-2 text-sm bg-white"
          />
          <button
            onClick={testFlow}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
          >
            Test
          </button>
        </div>
        {testResult && (
          <p className="text-sm mt-2 text-blue-800">{testResult}</p>
        )}
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <div className="bg-white border rounded-xl p-4 mb-6">
          <h3 className="font-medium text-gray-700 mb-3">
            {editingId ? 'Edit Rule' : 'New Rule'}
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <input
              placeholder="Trigger word (e.g. price)"
              value={form.trigger}
              onChange={e => setForm({ ...form, trigger: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm"
            />
            <select
              value={form.matchType}
              onChange={e => setForm({ ...form, matchType: e.target.value as any })}
              className="border rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="CONTAINS">Contains</option>
              <option value="EXACT">Exact match</option>
              <option value="STARTS_WITH">Starts with</option>
            </select>
            <div /> 
            <textarea
              placeholder="Auto-reply message..."
              value={form.response}
              onChange={e => setForm({ ...form, response: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm col-span-3"
              rows={3}
            />
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={saveRule}
              disabled={saving}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : editingId ? 'Update Rule' : 'Save Rule'}
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

      {/* Rules list */}
      {loading ? (
        <div className="text-center text-gray-400 py-12">Loading...</div>
      ) : rules.length === 0 ? (
        <div className="text-center text-gray-400 py-12">No rules yet — add one above</div>
      ) : (
        <div className="space-y-3">
          {rules.map(rule => (
            <div
              key={rule.id}
              className={`bg-white border rounded-xl p-4 flex items-start gap-4 ${
                !rule.isActive ? 'opacity-50' : ''
              }`}
            >
              {/* Toggle */}
              <button
                onClick={() => toggleActive(rule)}
                className={`mt-0.5 w-10 h-6 rounded-full transition-colors flex-shrink-0 relative ${
                  rule.isActive ? 'bg-green-500' : 'bg-gray-200'
                }`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                  rule.isActive ? 'left-5' : 'left-1'
                }`} />
              </button>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-800">"{rule.trigger}"</span>
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                    {MATCH_LABELS[rule.matchType]}
                  </span>
                </div>
                <p className="text-sm text-gray-500 truncate">→ {rule.response}</p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => startEdit(rule)}
                  className="text-xs text-blue-500 hover:underline"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteRule(rule.id)}
                  className="text-xs text-red-400 hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}