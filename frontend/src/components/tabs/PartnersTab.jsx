import { useState, useEffect } from 'react'
import { partnersApi, clientsApi } from '../../api'
import Modal from '../Modal'
import ExportMenu from '../ExportMenu'
import NewIndividualModal from '../NewIndividualModal'
import { exportSectionPDF, exportSectionExcel } from '../../utils/exportClient'
import { Plus, Trash2, Edit2, UserPlus } from 'lucide-react'

const ROLES = ['Partner', 'Designated Partner', 'Managing Partner', 'Sleeping Partner', 'Minor Partner']

export default function PartnersTab({ clientId, client }) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(false)
  const [editing, setEditing] = useState(null)
  const [form,    setForm]    = useState({})
  const [indivs,  setIndivs]  = useState([])
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')
  const [showNewIndiv, setShowNewIndiv] = useState(false)

  const fetchRecords = async () => {
    try { const r = await partnersApi.list(clientId); setRecords(r.data) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }
  const fetchIndivs = () =>
    clientsApi.list({ constitution: 'Individual' }).then(r => setIndivs(r.data)).catch(() => {})

  useEffect(() => { fetchRecords(); fetchIndivs() }, [clientId])

  const openAdd  = () => { setForm({ firm_llp_client_id: clientId, is_active: true }); setEditing(null); setModal(true) }
  const openEdit = rec => { setForm({ ...rec }); setEditing(rec); setModal(true) }
  const h = e => setForm(f => ({ ...f, [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const save = async e => {
    e.preventDefault(); setSaving(true); setError('')
    try {
      if (editing) await partnersApi.update(editing.id, form)
      else          await partnersApi.create(form)
      setModal(false); fetchRecords()
    } catch (err) { setError(err.response?.data?.detail || 'Error') }
    finally { setSaving(false) }
  }

  const del = async id => {
    if (!confirm('Delete this partner record?')) return
    await partnersApi.delete(id); fetchRecords()
  }

  const exportHead = ['Name', 'Role', 'Profit %', 'Capital (₹)', 'Date of Joining', 'Date of Exit', 'Status', 'Notes']
  const exportRows = records.map(r => [r.individual_name, r.role, r.profit_sharing_ratio, r.capital_contribution, r.date_of_joining, r.date_of_exit, r.is_active ? 'Active' : 'Exited', r.notes])

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-700">Partners</h3>
        <div className="flex items-center gap-2">
          {records.length > 0 && client && (
            <ExportMenu
              small label="Export"
              onExportPDF={() => exportSectionPDF({ client, title: 'Partners', head: exportHead, rows: exportRows })}
              onExportExcel={() => exportSectionExcel({ client, title: 'Partners', head: exportHead, rows: exportRows })}
            />
          )}
          <button onClick={openAdd} className="flex items-center gap-1.5 bg-[#1F3864] text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-[#162848]">
            <Plus size={13} /> Add Partner
          </button>
        </div>
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
                <div className="flex gap-2">
                  <select name="individual_client_id" value={form.individual_client_id || ''} onChange={h} required
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="">— select individual —</option>
                    {indivs.map(c => <option key={c.id} value={c.id}>{c.display_name} ({c.pan})</option>)}
                  </select>
                  <button type="button" onClick={() => setShowNewIndiv(true)}
                    className="flex items-center gap-1 px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 whitespace-nowrap font-medium">
                    <UserPlus size={12} /> New
                  </button>
                </div>
                {indivs.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">No individuals in the system yet. Click <strong>New</strong> to create one.</p>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Role *</label>
                <select name="role" value={form.role || ''} onChange={h} required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">— select —</option>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              {[['Profit Sharing %', 'profit_sharing_ratio', 'number'], ['Capital Contribution (₹)', 'capital_contribution', 'number'], ['Date of Joining', 'date_of_joining', 'date'], ['Date of Exit', 'date_of_exit', 'date']].map(([label, name, type]) => (
                <div key={name}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input type={type} name={name} value={form[name] || ''} onChange={h}
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
              <textarea name="notes" value={form.notes || ''} onChange={h} rows={2}
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

      {showNewIndiv && (
        <NewIndividualModal
          onClose={() => setShowNewIndiv(false)}
          onCreated={newIndiv => {
            setIndivs(prev => [...prev, newIndiv])
            setForm(f => ({ ...f, individual_client_id: newIndiv.id }))
            setShowNewIndiv(false)
          }}
        />
      )}
    </div>
  )
}
