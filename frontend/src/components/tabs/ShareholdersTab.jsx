import { useState, useEffect } from 'react'
import { shareholdersApi, clientsApi } from '../../api'
import Modal from '../Modal'
import { Plus, Trash2, Edit2 } from 'lucide-react'

const HOLDER_TYPES  = ['Individual', 'Company', 'Trust', 'HUF', 'LLP']
const SHARE_TYPES   = ['Equity', 'Preference', 'CCPS', 'OCPS']

export default function ShareholdersTab({ clientId }) {
  const [records,  setRecords]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(false)
  const [editing,  setEditing]  = useState(null)
  const [form,     setForm]     = useState({})
  const [clients,  setClients]  = useState([])
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  const fetch = async () => {
    try { const r = await shareholdersApi.list(clientId); setRecords(r.data) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }
  useEffect(() => {
    fetch()
    clientsApi.list({}).then(r => setClients(r.data)).catch(() => {})
  }, [clientId])

  const openAdd  = () => { setForm({ company_client_id: clientId, holder_type: 'Individual', is_active: true }); setEditing(null); setModal(true) }
  const openEdit = rec => { setForm({ ...rec }); setEditing(rec); setModal(true) }
  const h = e => setForm(f => ({ ...f, [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const save = async e => {
    e.preventDefault(); setSaving(true); setError('')
    try {
      if (editing) await shareholdersApi.update(editing.id, form)
      else          await shareholdersApi.create(form)
      setModal(false); fetch()
    } catch (err) { setError(err.response?.data?.detail || 'Error') }
    finally { setSaving(false) }
  }

  const del = async id => {
    if (!confirm('Delete this shareholding record?')) return
    await shareholdersApi.delete(id); fetch()
  }

  const individualsOnly = clients.filter(c => c.constitution === 'Individual')

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-700">Shareholders</h3>
        <button onClick={openAdd} className="flex items-center gap-1.5 bg-[#1F3864] text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-[#162848]">
          <Plus size={13} /> Add Shareholder
        </button>
      </div>
      {loading ? <p className="text-gray-400 text-sm">Loading…</p> : records.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-8">No shareholders added yet</p>
      ) : (
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-100 text-xs text-gray-500">
            <th className="text-left py-2 pr-4">Name</th>
            <th className="text-left py-2 pr-4">PAN</th>
            <th className="text-left py-2 pr-4">Type</th>
            <th className="text-left py-2 pr-4">Shares</th>
            <th className="text-left py-2 pr-4">%</th>
            <th className="text-left py-2 pr-4">Date</th>
            <th />
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {records.map(rec => (
              <tr key={rec.id}>
                <td className="py-2 pr-4 font-medium">{rec.holder_name || '—'}</td>
                <td className="py-2 pr-4 font-mono text-gray-600">{rec.holder_pan || '—'}</td>
                <td className="py-2 pr-4 text-gray-600">{rec.holder_type} {rec.share_type ? `· ${rec.share_type}` : ''}</td>
                <td className="py-2 pr-4 text-gray-600">{rec.number_of_shares?.toLocaleString() || '—'}</td>
                <td className="py-2 pr-4 text-gray-600">{rec.percentage ? `${rec.percentage}%` : '—'}</td>
                <td className="py-2 pr-4 text-gray-500">{rec.date_acquired || '—'}</td>
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
        <Modal title={editing ? 'Edit Shareholder' : 'Add Shareholder'} onClose={() => setModal(false)}>
          <form onSubmit={save} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Holder Type *</label>
                <select name="holder_type" value={form.holder_type||'Individual'} onChange={h} required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  {HOLDER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              {form.holder_type === 'Individual' ? (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Individual Client</label>
                  <select name="individual_client_id" value={form.individual_client_id||''} onChange={h}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="">— select —</option>
                    {individualsOnly.map(c => <option key={c.id} value={c.id}>{c.display_name} ({c.pan})</option>)}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Holding Entity Client</label>
                  <select name="holding_entity_client_id" value={form.holding_entity_client_id||''} onChange={h}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="">— select —</option>
                    {clients.filter(c => c.constitution !== 'Individual').map(c => <option key={c.id} value={c.id}>{c.display_name} ({c.pan})</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Share Type</label>
                <select name="share_type" value={form.share_type||''} onChange={h}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">— select —</option>
                  {SHARE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              {[['No. of Shares','number_of_shares','number'],['Face Value (₹)','face_value','number'],['Percentage %','percentage','number'],['Date Acquired','date_acquired','date']].map(([label,name,type]) => (
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
