import { useState, useEffect } from 'react'
import { partnersApi, clientsApi } from '../../api'
import Modal from '../Modal'
import { Plus, Trash2, Edit2 } from 'lucide-react'

const ROLES = ['Partner', 'Designated Partner', 'Managing Partner', 'Sleeping Partner', 'Minor Partner']

export default function PartnersTab({ clientId }) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(false)
  const [editing, setEditing] = useState(null)
  const [form,    setForm]    = useState({})
  const [indivs,  setIndivs]  = useState([])
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  const fetch = async () => {
    try { const r = await partnersApi.list(clientId); setRecords(r.data) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }
  useEffect(() => {
    fetch()
    clientsApi.list({ constitution: 'Individual' }).then(r => setIndivs(r.data)).catch(() => {})
  }, [clientId])

  const openAdd  = () => { setForm({ firm_llp_client_id: clientId, is_active: true }); setEditing(null); setModal(true) }
  const openEdit = rec => { setForm({ ...rec }); setEditing(rec); setModal(true) }
  const h = e => setForm(f => ({ ...f, [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const save = async e => {
    e.preventDefault(); setSaving(true); setError('')
    try {
      if (editing) await partnersApi.update(editing.id, form)
      else          await partnersApi.create(form)
      setModal(false); fetch()
    } catch (err) { setError(err.response?.data?.detail || 'Error') }
    finally { setSaving(false) }
  }

  const del = async id => {
    if (!confirm('Delete this partner record?')) return
    await partnersApi.delete(id); fetch()
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-700">Partners</h3>
        <button onClick={openAdd} className="flex items-center gap-1.5 bg-[#1F3864] text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-[#162848]">
          <Plus size={13} /> Add Partner
        </button>
      </div>
      {loading ? <p className="text-gray-400 text-sm">Loading…</p> : records.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-8">No partners added yet</p>
      ) : (
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-100 text-xs text-gray-500">
            <th className="text-left py-2 pr-4">Name</th>
            <th className="text-left py-2 pr-4">Role</th>
            <th className="text-left py-2 pr-4">Profit %</th>
            <th className="text-left py-2 pr-4">Capital (₹)</th>
            <th className="text-left py-2 pr-4">Joined</th>
            <th className="text-left py-2 pr-4">Status</th>
            <th />
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {records.map(rec => (
              <tr key={rec.id}>
                <td className="py-2 pr-4 font-medium">{rec.individual_name || '—'}</td>
                <td className="py-2 pr-4 text-gray-600">{rec.role}</td>
                <td className="py-2 pr-4 text-gray-600">{rec.profit_sharing_ratio != null ? `${rec.profit_sharing_ratio}%` : '—'}</td>
                <td className="py-2 pr-4 text-gray-600">{rec.capital_contribution != null ? rec.capital_contribution.toLocaleString() : '—'}</td>
                <td className="py-2 pr-4 text-gray-500">{rec.date_of_joining || '—'}</td>
                <td className="py-2 pr-4">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${rec.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {rec.is_active ? 'Active' : 'Exited'}
                  </span>
                </td>
                <td className="py-2 flex gap-1">
                  <button onClick={() => openEdit(rec)} className="p-1 hover:bg-gray-100 rounded text-gray-500"><Edit2 size={13} /></button>
                  <button onClick={() => del(rec.id)} className="p-1 hover:bg-red-50 rounded text-red-400"><Trash2 size={13} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {modal && (
        <Modal title={editing ? 'Edit Partner' : 'Add Partner'} onClose={() => setModal(false)}>
          <form onSubmit={save} className="space-y-3">
            {!editing && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Individual Partner *</label>
                <select name="individual_client_id" value={form.individual_client_id||''} onChange={h} required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">— select individual —</option>
                  {indivs.map(c => <option key={c.id} value={c.id}>{c.display_name} ({c.pan})</option>)}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Role *</label>
                <select name="role" value={form.role||''} onChange={h} required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">— select —</option>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              {[['Profit Sharing %','profit_sharing_ratio','number'],['Capital Contribution (₹)','capital_contribution','number'],['Date of Joining','date_of_joining','date'],['Date of Exit','date_of_exit','date']].map(([label,name,type]) => (
                <div key={name}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input type={type} name={name} value={form[name]||''} onChange={h}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="is_active" checked={!!form.is_active} onChange={h} />
              <span className="text-sm">Active</span>
            </label>
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
