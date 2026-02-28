import { useState, useEffect } from 'react'
import { epfEsiApi } from '../../api'
import Modal from '../Modal'
import { Plus, Trash2, Edit2, Eye, EyeOff } from 'lucide-react'

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

export default function EPFESITab({ clientId }) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(false)
  const [editing, setEditing] = useState(null)
  const [form,    setForm]    = useState({})
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  const fetch = async () => {
    try { const r = await epfEsiApi.list(clientId); setRecords(r.data) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }
  useEffect(() => { fetch() }, [clientId])

  const openAdd  = () => { setForm({ client_id: clientId, registration_type: 'EPF', is_active: true }); setEditing(null); setModal(true) }
  const openEdit = rec => { setForm({ ...rec }); setEditing(rec); setModal(true) }
  const h = e => setForm(f => ({ ...f, [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const save = async e => {
    e.preventDefault(); setSaving(true); setError('')
    try {
      if (editing) await epfEsiApi.update(editing.id, form)
      else          await epfEsiApi.create(form)
      setModal(false); fetch()
    } catch (err) { setError(err.response?.data?.detail || 'Error') }
    finally { setSaving(false) }
  }

  const del = async id => {
    if (!confirm('Delete this EPF/ESI registration?')) return
    await epfEsiApi.delete(id); fetch()
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-700">EPF / ESI Registrations</h3>
        <button onClick={openAdd} className="flex items-center gap-1.5 bg-[#1F3864] text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-[#162848]">
          <Plus size={13} /> Add
        </button>
      </div>
      {loading ? <p className="text-gray-400 text-sm">Loading…</p> : records.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-8">No EPF/ESI registrations yet</p>
      ) : (
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-100 text-xs text-gray-500">
            <th className="text-left py-2 pr-4">Type</th>
            <th className="text-left py-2 pr-4">Code / Reg No.</th>
            <th className="text-left py-2 pr-4">State</th>
            <th className="text-left py-2 pr-4">Portal ID</th>
            <th className="text-left py-2 pr-4">Password</th>
            <th className="text-left py-2 pr-4">Status</th>
            <th />
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {records.map(rec => (
              <tr key={rec.id}>
                <td className="py-2 pr-4"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${rec.registration_type === 'EPF' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{rec.registration_type}</span></td>
                <td className="py-2 pr-4 font-mono text-gray-700">{rec.establishment_code}</td>
                <td className="py-2 pr-4 text-gray-600">{rec.state || '—'}</td>
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
        <Modal title={editing ? 'Edit EPF/ESI Registration' : 'Add EPF/ESI Registration'} onClose={() => setModal(false)}>
          <form onSubmit={save} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Type *</label>
                <select name="registration_type" value={form.registration_type||'EPF'} onChange={h} required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="EPF">EPF</option>
                  <option value="ESI">ESI</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">State</label>
                <select name="state" value={form.state||''} onChange={h}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">— select —</option>
                  {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Establishment Code / Reg No. *</label>
                <input type="text" name="establishment_code" value={form.establishment_code||''} onChange={h} required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              {[['Registration Date','registration_date','date'],['Cancellation Date','cancellation_date','date'],['Portal User ID','portal_user_id','text'],['Portal Password','portal_password','password'],['DSC Holder Name','dsc_holder_name','text'],['Authorised Signatory','authorised_signatory','text']].map(([label,name,type]) => (
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
