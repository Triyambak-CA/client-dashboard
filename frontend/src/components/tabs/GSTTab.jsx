import { useState, useEffect } from 'react'
import { gstApi, clientsApi } from '../../api'
import Modal from '../Modal'
import { Plus, Trash2, Edit2, Eye, EyeOff, UserPlus, UserMinus } from 'lucide-react'

const GST_TYPES = ['Regular', 'Composition', 'QRMP', 'SEZ Unit', 'SEZ Developer', 'Casual', 'Non-Resident']

function PwdField({ value }) {
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

export default function GSTTab({ clientId }) {
  const [records, setRecords]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal,   setModal]     = useState(null) // null | 'add' | 'edit' | 'signatory'
  const [editing, setEditing]   = useState(null)
  const [sigGst,  setSigGst]    = useState(null) // selected gst record for signatory mgmt
  const [form,    setForm]      = useState({})
  const [sigClientId, setSigClientId] = useState('')
  const [clients, setClients]   = useState([])
  const [saving,  setSaving]    = useState(false)
  const [error,   setError]     = useState('')

  const fetch = async () => {
    try { const r = await gstApi.list(clientId); setRecords(r.data) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }
  const fetchClients = async () => {
    try { const r = await clientsApi.list({ constitution: 'Individual', is_active: true }); setClients(r.data) }
    catch {}
  }

  useEffect(() => { fetch(); fetchClients() }, [clientId])

  const openAdd = () => { setForm({ client_id: clientId, is_active: true }); setEditing(null); setModal('add') }
  const openEdit = rec => { setForm({ ...rec }); setEditing(rec); setModal('edit') }

  const save = async e => {
    e.preventDefault(); setSaving(true); setError('')
    try {
      if (editing) await gstApi.update(editing.id, form)
      else          await gstApi.create(form)
      setModal(null); fetch()
    } catch (err) { setError(err.response?.data?.detail || 'Error') }
    finally { setSaving(false) }
  }

  const del = async id => {
    if (!confirm('Delete this GST registration?')) return
    await gstApi.delete(id); fetch()
  }

  const addSignatory = async e => {
    e.preventDefault(); setSaving(true); setError('')
    try { await gstApi.addSignatory(sigGst.id, sigClientId); const r = await gstApi.get(sigGst.id); setSigGst(r.data); fetch() }
    catch (err) { setError(err.response?.data?.detail || 'Error') }
    finally { setSaving(false) }
  }

  const removeSignatory = async (gstId, sigId) => {
    if (!confirm('Remove this signatory?')) return
    await gstApi.removeSignatory(gstId, sigId)
    const r = await gstApi.get(gstId); setSigGst(r.data); fetch()
  }

  const h = e => setForm(f => ({ ...f, [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-700">GST Registrations</h3>
        <button onClick={openAdd} className="flex items-center gap-1.5 bg-[#1F3864] text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-[#162848]">
          <Plus size={13} /> Add GSTIN
        </button>
      </div>

      {loading ? <p className="text-gray-400 text-sm">Loading…</p> : records.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-8">No GST registrations yet</p>
      ) : (
        <div className="space-y-3">
          {records.map(rec => (
            <div key={rec.id} className="border border-gray-100 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono font-semibold text-gray-900">{rec.gstin}</span>
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${rec.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {rec.is_active ? 'Active' : 'Inactive'}
                  </span>
                  {rec.registration_type && <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">{rec.registration_type}</span>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setSigGst(rec); setModal('signatory') }} className="p-1.5 hover:bg-blue-50 rounded text-blue-500" title="Manage signatories">
                    <UserPlus size={14} />
                  </button>
                  <button onClick={() => openEdit(rec)} className="p-1.5 hover:bg-gray-100 rounded text-gray-500">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => del(rec.id)} className="p-1.5 hover:bg-red-50 rounded text-red-400">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-3 text-xs text-gray-500">
                <span>State: {rec.state || '—'}</span>
                <span>Reg Date: {rec.registration_date || '—'}</span>
                <span>Portal ID: {rec.gst_user_id || '—'}</span>
                <span>Portal Pwd: <PwdField value={rec.gst_password} /></span>
                <span>EWB API ID: {rec.ewb_api_user_id || '—'}</span>
                <span>EWB API Pwd: <PwdField value={rec.ewb_api_password} /></span>
              </div>
              {rec.signatories?.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-400 mb-1">Authorised Signatories:</p>
                  <div className="flex flex-wrap gap-2">
                    {rec.signatories.map(s => (
                      <span key={s.id} className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs">
                        {s.signatory_name} ({s.signatory_pan})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {(modal === 'add' || modal === 'edit') && (
        <Modal title={modal === 'edit' ? 'Edit GST Registration' : 'Add GST Registration'} onClose={() => setModal(null)}>
          <form onSubmit={save} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {[
                ['GSTIN *', 'gstin', 'text', true],
                ['State', 'state', 'text'],
                ['State Code (2 digits)', 'state_code', 'text'],
                ['Registration Date', 'registration_date', 'date'],
                ['Cancellation Date', 'cancellation_date', 'date'],
              ].map(([label, name, type, req]) => (
                <div key={name}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input type={type||'text'} name={name} value={form[name]||''} onChange={h} required={req}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Registration Type</label>
                <select name="registration_type" value={form.registration_type||''} onChange={h}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">— select —</option>
                  {GST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <hr className="my-2" />
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">GST Portal Credentials</p>
            <div className="grid grid-cols-2 gap-3">
              {[['GST User ID','gst_user_id'],['GST Password','gst_password'],['EWB User ID','ewb_user_id'],['EWB Password','ewb_password'],['EWB API User ID','ewb_api_user_id'],['EWB API Password','ewb_api_password']].map(([label, name]) => (
                <div key={name}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input type={name.includes('password') ? 'password' : 'text'} name={name} value={form[name]||''} onChange={h}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <input type="checkbox" name="is_active" checked={!!form.is_active} onChange={h} id="gst_active" />
              <label htmlFor="gst_active" className="text-sm text-gray-700">Active</label>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <textarea name="notes" value={form.notes||''} onChange={h} rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {error && <p className="text-red-600 text-xs bg-red-50 px-3 py-2 rounded">{error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setModal(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-[#1F3864] text-white rounded-lg hover:bg-[#162848] disabled:opacity-60">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Signatory Modal */}
      {modal === 'signatory' && sigGst && (
        <Modal title={`Signatories — ${sigGst.gstin}`} onClose={() => setModal(null)}>
          <div className="mb-4">
            {sigGst.signatories?.length === 0 ? (
              <p className="text-gray-400 text-sm">No signatories added yet.</p>
            ) : (
              <div className="space-y-2 mb-4">
                {sigGst.signatories.map(s => (
                  <div key={s.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                    <span className="text-sm"><strong>{s.signatory_name}</strong> — {s.signatory_pan}</span>
                    <button onClick={() => removeSignatory(sigGst.id, s.id)} className="text-red-400 hover:text-red-600">
                      <UserMinus size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <form onSubmit={addSignatory} className="flex gap-2">
            <select value={sigClientId} onChange={e => setSigClientId(e.target.value)} required
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">— select individual client —</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.display_name} ({c.pan})</option>)}
            </select>
            <button type="submit" disabled={saving || !sigClientId} className="px-4 py-2 text-sm bg-[#1F3864] text-white rounded-lg hover:bg-[#162848] disabled:opacity-60">
              Add
            </button>
          </form>
          {error && <p className="text-red-600 text-xs mt-2">{error}</p>}
        </Modal>
      )}
    </div>
  )
}
