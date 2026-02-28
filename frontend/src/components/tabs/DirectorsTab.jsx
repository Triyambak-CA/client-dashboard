import { useState, useEffect } from 'react'
import { directorsApi, clientsApi } from '../../api'
import Modal from '../Modal'
import { Plus, Trash2, Edit2 } from 'lucide-react'

const DESIGNATIONS = ['Director', 'Managing Director', 'Whole-time Director', 'Independent Director', 'Nominee Director', 'Additional Director']

export default function DirectorsTab({ companyId }) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(false)
  const [editing, setEditing] = useState(null)
  const [form,    setForm]    = useState({})
  const [indivs,  setIndivs]  = useState([])
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  const fetch = async () => {
    try { const r = await directorsApi.list({ company_client_id: companyId }); setRecords(r.data) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }
  useEffect(() => {
    fetch()
    clientsApi.list({ constitution: 'Individual' }).then(r => setIndivs(r.data)).catch(() => {})
  }, [companyId])

  const openAdd  = () => { setForm({ company_client_id: companyId, is_active: true, is_kmp: false }); setEditing(null); setModal(true) }
  const openEdit = rec => { setForm({ ...rec }); setEditing(rec); setModal(true) }
  const h = e => setForm(f => ({ ...f, [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const save = async e => {
    e.preventDefault(); setSaving(true); setError('')
    try {
      if (editing) await directorsApi.update(editing.company_client_id, editing.individual_client_id, form)
      else          await directorsApi.create(form)
      setModal(false); fetch()
    } catch (err) { setError(err.response?.data?.detail || 'Error') }
    finally { setSaving(false) }
  }

  const del = async rec => {
    if (!confirm('Remove this director?')) return
    await directorsApi.delete(rec.company_client_id, rec.individual_client_id); fetch()
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-700">Directors</h3>
        <button onClick={openAdd} className="flex items-center gap-1.5 bg-[#1F3864] text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-[#162848]">
          <Plus size={13} /> Add Director
        </button>
      </div>
      {loading ? <p className="text-gray-400 text-sm">Loading…</p> : records.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-8">No directors added yet</p>
      ) : (
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-100 text-xs text-gray-500">
            <th className="text-left py-2 pr-4">Name</th>
            <th className="text-left py-2 pr-4">DIN</th>
            <th className="text-left py-2 pr-4">Designation</th>
            <th className="text-left py-2 pr-4">Appointed</th>
            <th className="text-left py-2 pr-4">Status</th>
            <th className="text-left py-2 pr-4">KMP</th>
            <th />
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {records.map(rec => (
              <tr key={`${rec.company_client_id}-${rec.individual_client_id}`}>
                <td className="py-2 pr-4 font-medium">{rec.individual_name || '—'}</td>
                <td className="py-2 pr-4 font-mono text-gray-600">{rec.din || '—'}</td>
                <td className="py-2 pr-4 text-gray-600">{rec.designation}</td>
                <td className="py-2 pr-4 text-gray-500">{rec.date_of_appointment || '—'}</td>
                <td className="py-2 pr-4">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${rec.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {rec.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="py-2 pr-4 text-gray-500">{rec.is_kmp ? 'Yes' : 'No'}</td>
                <td className="py-2 flex gap-1">
                  <button onClick={() => openEdit(rec)} className="p-1 hover:bg-gray-100 rounded text-gray-500"><Edit2 size={13} /></button>
                  <button onClick={() => del(rec)} className="p-1 hover:bg-red-50 rounded text-red-400"><Trash2 size={13} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {modal && (
        <Modal title={editing ? 'Edit Director' : 'Add Director'} onClose={() => setModal(false)}>
          <form onSubmit={save} className="space-y-3">
            {!editing && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Individual Client *</label>
                <select name="individual_client_id" value={form.individual_client_id||''} onChange={h} required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">— select individual —</option>
                  {indivs.map(c => <option key={c.id} value={c.id}>{c.display_name} {c.din ? `(DIN: ${c.din})` : `(PAN: ${c.pan})`}</option>)}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Designation *</label>
                <select name="designation" value={form.designation||''} onChange={h} required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">— select —</option>
                  {DESIGNATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              {[['Date of Appointment','date_of_appointment'],['Date of Cessation','date_of_cessation']].map(([label, name]) => (
                <div key={name}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input type="date" name={name} value={form[name]||''} onChange={h}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
            </div>
            <div className="flex gap-6">
              {[['Active?','is_active'],['KMP?','is_kmp']].map(([label, name]) => (
                <label key={name} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name={name} checked={!!form[name]} onChange={h} />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <textarea name="notes" value={form.notes||''} onChange={h} rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {error && <p className="text-red-600 text-xs bg-red-50 px-3 py-2 rounded">{error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-[#1F3864] text-white rounded-lg hover:bg-[#162848] disabled:opacity-60">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
