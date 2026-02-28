import { useState, useEffect } from 'react'
import { bankApi } from '../../api'
import Modal from '../Modal'
import { Plus, Trash2, Edit2, Eye, EyeOff } from 'lucide-react'

const ACCOUNT_TYPES = ['Current', 'Savings', 'Cash Credit', 'Overdraft', 'EEFC']

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

export default function BankTab({ clientId }) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(false)
  const [editing, setEditing] = useState(null)
  const [form,    setForm]    = useState({})
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  const fetch = async () => {
    try { const r = await bankApi.list(clientId); setRecords(r.data) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }
  useEffect(() => { fetch() }, [clientId])

  const openAdd  = () => { setForm({ client_id: clientId, is_primary: false }); setEditing(null); setModal(true) }
  const openEdit = rec => { setForm({ ...rec }); setEditing(rec); setModal(true) }
  const h = e => setForm(f => ({ ...f, [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const save = async e => {
    e.preventDefault(); setSaving(true); setError('')
    try {
      if (editing) await bankApi.update(editing.id, form)
      else          await bankApi.create(form)
      setModal(false); fetch()
    } catch (err) { setError(err.response?.data?.detail || 'Error') }
    finally { setSaving(false) }
  }

  const del = async id => {
    if (!confirm('Delete this bank account?')) return
    await bankApi.delete(id); fetch()
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-700">Bank Accounts</h3>
        <button onClick={openAdd} className="flex items-center gap-1.5 bg-[#1F3864] text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-[#162848]">
          <Plus size={13} /> Add Account
        </button>
      </div>
      {loading ? <p className="text-gray-400 text-sm">Loading…</p> : records.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-8">No bank accounts added yet</p>
      ) : (
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-100 text-xs text-gray-500">
            <th className="text-left py-2 pr-4">Bank</th>
            <th className="text-left py-2 pr-4">Account No.</th>
            <th className="text-left py-2 pr-4">IFSC</th>
            <th className="text-left py-2 pr-4">Type</th>
            <th className="text-left py-2 pr-4">Net Banking</th>
            <th className="text-left py-2 pr-4">Password</th>
            <th />
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {records.map(rec => (
              <tr key={rec.id}>
                <td className="py-2 pr-4">
                  <span className="font-medium">{rec.bank_name}</span>
                  {rec.is_primary && <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">Primary</span>}
                  {rec.branch_name && <span className="block text-xs text-gray-500">{rec.branch_name}</span>}
                </td>
                <td className="py-2 pr-4 font-mono text-gray-700">{rec.account_number}</td>
                <td className="py-2 pr-4 font-mono text-gray-600">{rec.ifsc_code}</td>
                <td className="py-2 pr-4 text-gray-600">{rec.account_type || '—'}</td>
                <td className="py-2 pr-4 text-gray-600 text-xs">{rec.net_banking_user_id || '—'}</td>
                <td className="py-2 pr-4"><PwdCell value={rec.net_banking_password} /></td>
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
        <Modal title={editing ? 'Edit Bank Account' : 'Add Bank Account'} onClose={() => setModal(false)}>
          <form onSubmit={save} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {[['Bank Name *','bank_name',true],['Account Number *','account_number',true],['IFSC Code *','ifsc_code',true],['Branch Name','branch_name',false]].map(([label,name,req]) => (
                <div key={name}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input type="text" name={name} value={form[name]||''} onChange={h} required={req}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Account Type</label>
                <select name="account_type" value={form.account_type||''} onChange={h}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">— select —</option>
                  {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              {[['Net Banking User ID','net_banking_user_id'],['Net Banking Password','net_banking_password']].map(([label,name]) => (
                <div key={name}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input type={name.includes('password') ? 'password' : 'text'} name={name} value={form[name]||''} onChange={h}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="is_primary" checked={!!form.is_primary} onChange={h} />
              <span className="text-sm">Primary account</span>
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
