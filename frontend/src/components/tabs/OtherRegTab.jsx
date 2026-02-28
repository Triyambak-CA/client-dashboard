import { useState, useEffect } from 'react'
import { otherRegApi } from '../../api'
import Modal from '../Modal'
import { Plus, Trash2, Edit2, Eye, EyeOff, AlertTriangle } from 'lucide-react'

const REG_TYPES = ['MSME/Udyam','IEC','FSSAI','Professional Tax','Shops & Estab','Trade License','Drug License','Import Export Code','Others']
const STATES = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Other']

function PwdCell({ value }) {
  const [show, setShow] = useState(false)
  if (!value) return <span className="text-gray-400 text-xs">—</span>
  return (
    <span className="flex items-center gap-1 font-mono text-xs">
      {show ? value : '••••••••'}
      <button onClick={() => setShow(s => !s)} className="text-gray-400 hover:text-gray-600">
        {show ? <EyeOff size={11} /> : <Eye size={11} />}
      </button>
    </span>
  )
}

function isExpiringSoon(dateStr) {
  if (!dateStr) return false
  const days = (new Date(dateStr) - new Date()) / 86400000
  return days >= 0 && days <= 30
}
function isExpired(dateStr) {
  if (!dateStr) return false
  return new Date(dateStr) < new Date()
}

export default function OtherRegTab({ clientId }) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(false)
  const [editing, setEditing] = useState(null)
  const [form,    setForm]    = useState({})
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  const fetch = async () => {
    try { const r = await otherRegApi.list(clientId); setRecords(r.data) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }
  useEffect(() => { fetch() }, [clientId])

  const openAdd  = () => { setForm({ client_id: clientId, is_active: true }); setEditing(null); setModal(true) }
  const openEdit = rec => { setForm({ ...rec }); setEditing(rec); setModal(true) }
  const h = e => setForm(f => ({ ...f, [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const save = async e => {
    e.preventDefault(); setSaving(true); setError('')
    try {
      if (editing) await otherRegApi.update(editing.id, form)
      else          await otherRegApi.create(form)
      setModal(false); fetch()
    } catch (err) { setError(err.response?.data?.detail || 'Error') }
    finally { setSaving(false) }
  }

  const del = async id => {
    if (!confirm('Delete this registration?')) return
    await otherRegApi.delete(id); fetch()
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-700">Other Registrations</h3>
        <button onClick={openAdd} className="flex items-center gap-1.5 bg-[#1F3864] text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-[#162848]">
          <Plus size={13} /> Add
        </button>
      </div>
      {loading ? <p className="text-gray-400 text-sm">Loading…</p> : records.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-8">No registrations added yet</p>
      ) : (
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-100 text-xs text-gray-500">
            <th className="text-left py-2 pr-4">Type</th>
            <th className="text-left py-2 pr-4">Reg. Number</th>
            <th className="text-left py-2 pr-4">Valid Until</th>
            <th className="text-left py-2 pr-4">Portal ID</th>
            <th className="text-left py-2 pr-4">Password</th>
            <th className="text-left py-2 pr-4">Status</th>
            <th />
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {records.map(rec => (
              <tr key={rec.id}>
                <td className="py-2 pr-4">
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium">{rec.registration_type}</span>
                </td>
                <td className="py-2 pr-4 font-mono text-gray-700">{rec.registration_number}</td>
                <td className="py-2 pr-4">
                  {rec.valid_until ? (
                    <span className={`flex items-center gap-1 text-xs ${isExpired(rec.valid_until) ? 'text-red-600 font-semibold' : isExpiringSoon(rec.valid_until) ? 'text-amber-600 font-semibold' : 'text-gray-600'}`}>
                      {(isExpired(rec.valid_until) || isExpiringSoon(rec.valid_until)) && <AlertTriangle size={11} />}
                      {rec.valid_until}
                    </span>
                  ) : <span className="text-gray-400 text-xs">—</span>}
                </td>
                <td className="py-2 pr-4 text-gray-600 text-xs">{rec.portal_user_id || '—'}</td>
                <td className="py-2 pr-4"><PwdCell value={rec.portal_password} /></td>
                <td className="py-2 pr-4"><span className={`px-2 py-0.5 rounded-full text-xs ${rec.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{rec.is_active ? 'Active' : 'Inactive'}</span></td>
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
        <Modal title={editing ? 'Edit Registration' : 'Add Registration'} onClose={() => setModal(false)}>
          <form onSubmit={save} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Registration Type *</label>
                <select name="registration_type" value={form.registration_type||''} onChange={h} required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">— select —</option>
                  {REG_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Registration Number *</label>
                <input type="text" name="registration_number" value={form.registration_number||''} onChange={h} required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              {[['Registration Date','registration_date','date'],['Valid Until','valid_until','date'],['Issuing Authority','issuing_authority','text']].map(([label,name,type]) => (
                <div key={name}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input type={type} name={name} value={form[name]||''} onChange={h}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">State / Jurisdiction</label>
                <select name="state_jurisdiction" value={form.state_jurisdiction||''} onChange={h}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">— select —</option>
                  {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {[['Portal User ID','portal_user_id','text'],['Portal Password','portal_password','password']].map(([label,name,type]) => (
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
