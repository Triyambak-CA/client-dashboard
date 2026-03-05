import { useState } from 'react'
import { clientsApi } from '../api'
import Modal from './Modal'
import { AlertTriangle, CheckCircle, Loader2, UserPlus } from 'lucide-react'

const GENDERS = ['Male', 'Female', 'Other']

export default function NewIndividualModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    constitution: 'Individual',
    is_active: true,
    is_direct_client: false,
    is_on_retainer: false,
    nationality: 'Indian',
  })
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState('')
  const [panChecking,  setPanChecking]  = useState(false)
  const [panStatus,    setPanStatus]    = useState(null)   // null | 'clear' | {duplicate: client}

  const h = e => {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
    if (name === 'pan') setPanStatus(null)
  }

  const checkPAN = async () => {
    const pan = (form.pan || '').trim().toUpperCase()
    if (!pan) return
    setPanChecking(true)
    setPanStatus(null)
    try {
      const r = await clientsApi.list({ search: pan })
      const match = r.data.find(c => c.pan?.toUpperCase() === pan)
      setPanStatus(match ? { duplicate: match } : 'clear')
    } catch {
      setPanStatus(null)
    } finally {
      setPanChecking(false)
    }
  }

  const submit = async e => {
    e.preventDefault()
    if (panStatus?.duplicate) return
    setSaving(true); setError('')
    try {
      const payload = { ...form, pan: (form.pan || '').trim().toUpperCase() }
      const res = await clientsApi.create(payload)
      onCreated(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Error creating individual')
    } finally {
      setSaving(false)
    }
  }

  const inp = (label, name, type = 'text', required = false) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type} name={name} value={form[name] || ''} onChange={h} required={required}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )

  const hasDuplicate = panStatus && panStatus !== 'clear'

  return (
    <Modal title={<span className="flex items-center gap-2"><UserPlus size={16} />Create New Individual</span>} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">

        {/* PAN with inline duplicate check */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            PAN <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <input
              name="pan" value={form.pan || ''} onChange={h} required
              placeholder="ABCDE1234F"
              maxLength={10}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase tracking-widest font-mono"
            />
            <button
              type="button" onClick={checkPAN}
              disabled={panChecking || !(form.pan || '').trim()}
              className="flex items-center gap-1.5 px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 disabled:opacity-50 whitespace-nowrap font-medium"
            >
              {panChecking
                ? <><Loader2 size={11} className="animate-spin" /> Checking…</>
                : 'Check PAN'
              }
            </button>
          </div>

          {/* PAN status feedback */}
          {panStatus === 'clear' && (
            <p className="flex items-center gap-1.5 mt-1.5 text-xs text-green-700">
              <CheckCircle size={12} /> PAN is available — no duplicate found.
            </p>
          )}
        </div>

        {/* Duplicate warning */}
        {hasDuplicate && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle size={15} className="text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-amber-900">PAN already registered</p>
                <p className="text-xs text-amber-800 mt-0.5 truncate">
                  <strong>{panStatus.duplicate.display_name}</strong>
                  {' '}({panStatus.duplicate.constitution}) — PAN {panStatus.duplicate.pan}
                </p>
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => onCreated(panStatus.duplicate)}
                    className="text-xs bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg font-medium"
                  >
                    Use this existing person
                  </button>
                  <button
                    type="button"
                    onClick={() => { setForm(f => ({ ...f, pan: '' })); setPanStatus(null) }}
                    className="text-xs text-amber-700 hover:text-amber-900 px-2 py-1.5"
                  >
                    Enter different PAN
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Core fields */}
        <div className="grid grid-cols-2 gap-3">
          {inp('Display Name', 'display_name', 'text', true)}
          {inp('Legal Name', 'legal_name', 'text', true)}
          {inp('Date of Birth', 'date_of_incorporation_birth', 'date')}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Gender</label>
            <select name="gender" value={form.gender || ''} onChange={h}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">— select —</option>
              {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          {inp("Father's Name", 'father_name')}
          {inp('DIN', 'din')}
          {inp('Aadhaar No.', 'aadhaar_no')}
          {inp('Primary Phone', 'primary_phone')}
          {inp('Primary Email', 'primary_email', 'email')}
          {inp('Nationality', 'nationality')}
        </div>

        <p className="text-xs text-gray-400">
          You can fill remaining KYC / credential details from the individual's profile page later.
        </p>

        {error && <p className="text-red-600 text-xs bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || hasDuplicate}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-[#1F3864] text-white rounded-lg hover:bg-[#162848] disabled:opacity-60"
          >
            {saving ? <><Loader2 size={13} className="animate-spin" /> Creating…</> : 'Create Individual'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
