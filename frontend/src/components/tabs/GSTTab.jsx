import { useState, useEffect } from 'react'
import { gstApi, clientsApi } from '../../api'
import Modal from '../Modal'
import ExportMenu from '../ExportMenu'
import { exportSectionPDF, exportSectionExcel } from '../../utils/exportClient'
import { Plus, Trash2, Edit2, Eye, EyeOff, UserPlus, UserMinus, RefreshCw, Loader2 } from 'lucide-react'

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

function statusBadge(status) {
  if (!status) return null
  const s = status.toLowerCase()
  const cls = s.includes('active') && !s.includes('in')
    ? 'bg-green-100 text-green-700'
    : s.includes('cancel')
    ? 'bg-red-100 text-red-700'
    : 'bg-yellow-100 text-yellow-700'
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{status}</span>
}

function _mapRegType(dty) {
  if (!dty) return ''
  const map = {
    'Regular': 'Regular', 'Composition': 'Composition', 'SEZ Unit': 'SEZ Unit',
    'SEZ Developer': 'SEZ Developer', 'Casual Taxable Person': 'Casual',
    'Casual': 'Casual', 'Non Resident': 'Non-Resident', 'Non-Resident': 'Non-Resident', 'QRMP': 'QRMP',
  }
  return Object.entries(map).find(([k]) => dty.includes(k))?.[1] || ''
}

export default function GSTTab({ clientId, client }) {
  const [records, setRecords]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal,   setModal]     = useState(null)
  const [editing, setEditing]   = useState(null)
  const [sigGst,  setSigGst]    = useState(null)
  const [form,    setForm]      = useState({})
  const [sigClientId, setSigClientId] = useState('')
  const [clients, setClients]   = useState([])
  const [saving,  setSaving]    = useState(false)
  const [error,   setError]     = useState('')

  // GSTIN fetch state
  const [fetching,          setFetching]          = useState(false)
  const [fetchError,        setFetchError]        = useState('')
  const [legalNameWarning,  setLegalNameWarning]  = useState('')
  const [showPortalLink,    setShowPortalLink]    = useState(false)

  const fetchRecords = async () => {
    try { const r = await gstApi.list(clientId); setRecords(r.data) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }
  const fetchClients = async () => {
    try { const r = await clientsApi.list({ constitution: 'Individual', is_active: true }); setClients(r.data) }
    catch {}
  }

  useEffect(() => { fetchRecords(); fetchClients() }, [clientId])

  const _resetFetchState = () => {
    setFetchError(''); setLegalNameWarning(''); setShowPortalLink(false)
  }

  const openAdd  = () => {
    setForm({ client_id: clientId, is_active: true })
    setEditing(null); _resetFetchState(); setModal('add')
  }
  const openEdit = rec => {
    setForm({ ...rec })
    setEditing(rec); _resetFetchState(); setModal('edit')
  }

  const _applyGstData = d => {
    setForm(f => ({
      ...f,
      state:               d.state               || f.state,
      state_code:          d.state_code          || f.state_code,
      registration_type:   _mapRegType(d.registration_type) || f.registration_type,
      gstin_status:        d.gstin_status        ?? f.gstin_status,
      registration_date:   d.registration_date   || f.registration_date,
      cancellation_date:   d.cancellation_date   || f.cancellation_date,
      trade_name:          d.trade_name          ?? f.trade_name,
      principal_address:   d.principal_address   ?? f.principal_address,
      nature_of_business:  d.nature_of_business  ?? f.nature_of_business,
      einvoice_applicable: d.einvoice_applicable ?? f.einvoice_applicable,
      last_fetched_at:     d.last_fetched_at     || f.last_fetched_at,
    }))
    const gstLegal    = (d.legal_name || '').trim()
    const clientLegal = (client?.legal_name || '').trim()
    if (gstLegal && clientLegal && gstLegal.toLowerCase() !== clientLegal.toLowerCase()) {
      setLegalNameWarning(`GST portal legal name: "${gstLegal}" — differs from master record: "${clientLegal}"`)
    } else if (!clientLegal && gstLegal) {
      setLegalNameWarning(`Legal name not set on master record. GST portal shows: "${gstLegal}"`)
    }
  }

  const fetchFromGstin = async () => {
    const gstin = (form.gstin || '').trim().toUpperCase()
    if (gstin.length !== 15) return
    setFetching(true); setFetchError(''); setLegalNameWarning(''); setShowPortalLink(false)
    try {
      const r = await gstApi.lookup(gstin)
      _applyGstData(r.data)
    } catch (err) {
      const detail = err.response?.data?.detail || ''
      if (detail === 'GST_PORTAL_REQUIRED' || err.response?.status === 503) {
        setShowPortalLink(true)
      } else {
        setFetchError(detail || 'Could not fetch from GST portal. Please fill in manually.')
      }
    } finally {
      setFetching(false)
    }
  }

  const save = async e => {
    e.preventDefault(); setSaving(true); setError('')
    try {
      if (editing) await gstApi.update(editing.id, form)
      else          await gstApi.create(form)
      setModal(null); fetchRecords()
    } catch (err) { setError(err.response?.data?.detail || 'Error') }
    finally { setSaving(false) }
  }

  const del = async id => {
    if (!confirm('Delete this GST registration?')) return
    await gstApi.delete(id); fetchRecords()
  }

  const addSignatory = async e => {
    e.preventDefault(); setSaving(true); setError('')
    try {
      await gstApi.addSignatory(sigGst.id, sigClientId)
      const r = await gstApi.get(sigGst.id); setSigGst(r.data); fetchRecords()
    } catch (err) { setError(err.response?.data?.detail || 'Error') }
    finally { setSaving(false) }
  }

  const removeSignatory = async (gstId, sigId) => {
    if (!confirm('Remove this signatory?')) return
    await gstApi.removeSignatory(gstId, sigId)
    const r = await gstApi.get(gstId); setSigGst(r.data); fetchRecords()
  }

  const h = e => setForm(f => ({
    ...f,
    [e.target.name]: e.target.type === 'checkbox'
      ? e.target.checked
      : e.target.value === 'true' ? true
      : e.target.value === 'false' ? false
      : e.target.value
  }))

  // When GSTIN changes, clear fetch results
  const onGstinChange = e => {
    setFetchError(''); setLegalNameWarning('')
    h(e)
  }

  const exportHead = [
    'GSTIN', 'Trade Name', 'Portal Status', 'State', 'Type', 'Reg Date', 'Cancel Date',
    'Principal Address', 'Nature of Business', 'E-Invoice',
    'Portal User ID', 'Portal Pwd', 'EWB User ID', 'EWB Pwd', 'Active', 'Signatories',
  ]
  const exportRows = records.map(r => [
    r.gstin,
    r.trade_name || '—',
    r.gstin_status || (r.is_active ? 'Active' : 'Inactive'),
    r.state || '—',
    r.registration_type || '—',
    r.registration_date || '—',
    r.cancellation_date || '—',
    r.principal_address || '—',
    r.nature_of_business || '—',
    r.einvoice_applicable == null ? '—' : r.einvoice_applicable ? 'Yes' : 'No',
    r.gst_user_id || '—',
    r.gst_password || '—',
    r.ewb_user_id || '—',
    r.ewb_password || '—',
    r.is_active ? 'Yes' : 'No',
    r.signatories?.map(s => `${s.signatory_name} (${s.signatory_pan})`).join('; ') || '—',
  ])

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-700">GST Registrations</h3>
        <div className="flex items-center gap-2">
          {records.length > 0 && client && (
            <ExportMenu
              small label="Export"
              onExportPDF={() => exportSectionPDF({ client, title: 'GST Registrations', head: exportHead, rows: exportRows })}
              onExportExcel={() => exportSectionExcel({ client, title: 'GST Registrations', head: exportHead, rows: exportRows })}
            />
          )}
          <button onClick={openAdd} className="flex items-center gap-1.5 bg-[#1F3864] text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-[#162848]">
            <Plus size={13} /> Add GSTIN
          </button>
        </div>
      </div>

      {loading ? <p className="text-gray-400 text-sm">Loading…</p> : records.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-8">No GST registrations yet</p>
      ) : (
        <div className="space-y-3">
          {records.map(rec => (
            <div key={rec.id} className="border border-gray-100 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-mono font-semibold text-gray-900">{rec.gstin}</span>
                  {rec.gstin_status
                    ? statusBadge(rec.gstin_status)
                    : <span className={`px-2 py-0.5 rounded-full text-xs ${rec.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {rec.is_active ? 'Active' : 'Inactive'}
                      </span>
                  }
                  {rec.registration_type && <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">{rec.registration_type}</span>}
                  {rec.einvoice_applicable != null && (
                    <span className={`px-2 py-0.5 rounded-full text-xs ${rec.einvoice_applicable ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                      E-Invoice: {rec.einvoice_applicable ? 'Yes' : 'No'}
                    </span>
                  )}
                </div>
                <div className="flex gap-1 flex-shrink-0">
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

              <div className="mt-2 grid grid-cols-3 gap-x-4 gap-y-1.5 text-xs text-gray-500">
                {rec.trade_name && <span className="col-span-2">Trade Name: <span className="text-gray-700 font-medium">{rec.trade_name}</span></span>}
                <span>State: {rec.state || '—'}</span>
                <span>Reg Date: {rec.registration_date || '—'}</span>
                {rec.cancellation_date && <span>Cancel Date: {rec.cancellation_date}</span>}
                <span>Portal ID: {rec.gst_user_id || '—'}</span>
                <span>Portal Pwd: <PwdField value={rec.gst_password} /></span>
                <span>EWB API ID: {rec.ewb_api_user_id || '—'}</span>
                <span>EWB API Pwd: <PwdField value={rec.ewb_api_password} /></span>
                {rec.principal_address && (
                  <span className="col-span-3 text-gray-600">Address: {rec.principal_address}</span>
                )}
                {rec.nature_of_business && (
                  <span className="col-span-3">Nature: {rec.nature_of_business}</span>
                )}
                {rec.last_fetched_at && (
                  <span className="col-span-3 text-gray-300 text-xs">
                    Portal data fetched: {new Date(rec.last_fetched_at).toLocaleDateString('en-IN')}
                  </span>
                )}
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

            {/* GSTIN row with Fetch button */}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">GSTIN *</label>
              <div className="flex gap-2">
                <input
                  type="text" name="gstin" value={form.gstin || ''} onChange={onGstinChange}
                  required maxLength={15}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="15-character GSTIN"
                />
                <button
                  type="button" onClick={fetchFromGstin}
                  disabled={fetching || (form.gstin || '').trim().length !== 15}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-[#1F3864] text-[#1F3864] hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                  title="Fetch details from GST portal"
                >
                  {fetching ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                  {fetching ? 'Fetching…' : 'Fetch from GST'}
                </button>
              </div>
              {fetchError && (
                <p className="text-red-600 text-xs mt-1 bg-red-50 px-2 py-1 rounded">{fetchError}</p>
              )}
              {showPortalLink && (
                <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                  <span className="text-amber-700 text-xs leading-relaxed">
                    Auto-fetch unavailable. Open the GST portal, search this GSTIN, solve the CAPTCHA, then fill the fields below.
                  </span>
                  <a
                    href="https://services.gst.gov.in/services/searchtp"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 flex items-center gap-1 px-2 py-1 text-xs font-medium bg-amber-600 text-white rounded hover:bg-amber-700 whitespace-nowrap"
                  >
                    Open GST Portal
                  </a>
                </div>
              )}
              {legalNameWarning && (
                <p className="text-amber-700 text-xs mt-1 bg-amber-50 px-2 py-1.5 rounded border border-amber-200">
                  ⚠ {legalNameWarning}
                </p>
              )}
            </div>

            {/* Core Registration Details */}
            <div className="grid grid-cols-2 gap-3">
              {[
                ['State', 'state'],
                ['State Code (2 digits)', 'state_code'],
              ].map(([label, name]) => (
                <div key={name}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input type="text" name={name} value={form[name] || ''} onChange={h}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
              {[
                ['Registration Date', 'registration_date'],
                ['Cancellation Date', 'cancellation_date'],
              ].map(([label, name]) => (
                <div key={name}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <div className="relative">
                    <input type="date" name={name}
                      value={form[name] || ''}
                      onChange={h}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    {form[name] && (
                      <button type="button"
                        onClick={() => setForm(f => ({ ...f, [name]: '' }))}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-base leading-none"
                        title="Clear date"
                      >×</button>
                    )}
                  </div>
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Registration Type</label>
                <select name="registration_type" value={form.registration_type || ''} onChange={h}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">— select —</option>
                  {GST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {/* GST Portal Data (auto-filled by Fetch) */}
            <hr className="my-1" />
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">GST Portal Data</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Trade Name</label>
                <input type="text" name="trade_name" value={form.trade_name || ''} onChange={h}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">GSTIN Status</label>
                <input type="text" name="gstin_status" value={form.gstin_status || ''} onChange={h}
                  placeholder="e.g. Active, Cancelled"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Principal Place of Business Address</label>
                <input type="text" name="principal_address" value={form.principal_address || ''} onChange={h}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Nature of Business</label>
                <input type="text" name="nature_of_business" value={form.nature_of_business || ''} onChange={h}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">E-Invoicing Applicable</label>
                <select name="einvoice_applicable" value={form.einvoice_applicable == null ? '' : String(form.einvoice_applicable)} onChange={h}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">— unknown —</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
            </div>

            {/* Portal Credentials */}
            <hr className="my-1" />
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">GST Portal Credentials</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['GST User ID', 'gst_user_id'], ['GST Password', 'gst_password'],
                ['EWB User ID', 'ewb_user_id'], ['EWB Password', 'ewb_password'],
                ['EWB API User ID', 'ewb_api_user_id'], ['EWB API Password', 'ewb_api_password'],
              ].map(([label, name]) => (
                <div key={name}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input type={name.includes('password') ? 'password' : 'text'} name={name} value={form[name] || ''} onChange={h}
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
              <textarea name="notes" value={form.notes || ''} onChange={h} rows={2}
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
