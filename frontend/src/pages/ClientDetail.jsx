import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { clientsApi } from '../api'
import { ArrowLeft, Edit2, Eye, EyeOff } from 'lucide-react'
import GSTTab          from '../components/tabs/GSTTab'
import DirectorsTab    from '../components/tabs/DirectorsTab'
import ShareholdersTab from '../components/tabs/ShareholdersTab'
import PartnersTab     from '../components/tabs/PartnersTab'
import BankTab         from '../components/tabs/BankTab'
import EPFESITab       from '../components/tabs/EPFESITab'
import OtherRegTab     from '../components/tabs/OtherRegTab'
import ClientForm      from '../components/ClientForm'

const CONSTITUTION_COLORS = {
  'Individual':       'bg-blue-100 text-blue-700',
  'Company':          'bg-purple-100 text-purple-700',
  'LLP':              'bg-indigo-100 text-indigo-700',
  'Partnership Firm': 'bg-green-100 text-green-700',
  'HUF':              'bg-amber-100 text-amber-700',
  'Trust':            'bg-orange-100 text-orange-700',
  'AOP':              'bg-red-100 text-red-700',
  'BOI':              'bg-rose-100 text-rose-700',
}

function Field({ label, value, secret }) {
  const [show, setShow] = useState(false)
  if (!value) return null
  return (
    <div>
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-0.5">{label}</p>
      <div className="flex items-center gap-1">
        <p className="text-sm text-gray-900 font-mono">
          {secret && !show ? '••••••••' : value}
        </p>
        {secret && (
          <button onClick={() => setShow(s => !s)} className="text-gray-400 hover:text-gray-600">
            {show ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        )}
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 pb-1 border-b border-gray-100">{title}</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">{children}</div>
    </div>
  )
}

export default function ClientDetail() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const [client,   setClient]   = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState('overview')
  const [editing,  setEditing]  = useState(false)

  const fetchClient = async () => {
    try {
      const res = await clientsApi.get(id)
      setClient(res.data)
    } catch { navigate('/') }
    finally  { setLoading(false) }
  }

  useEffect(() => { fetchClient() }, [id])

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-500">Loading…</div>
  if (!client) return null

  const isIndividual = client.constitution === 'Individual'
  const isCompany    = client.constitution === 'Company'
  const isFirmLLP    = client.constitution === 'Partnership Firm' || client.constitution === 'LLP'

  const tabs = [
    { key: 'overview',    label: 'Overview' },
    ...(isIndividual ? [{ key: 'kyc', label: 'KYC / DSC' }] : []),
    { key: 'credentials', label: 'Credentials' },
    { key: 'gst',         label: 'GST' },
    ...(isCompany ? [
      { key: 'directors',    label: 'Directors' },
      { key: 'shareholders', label: 'Shareholders' },
    ] : []),
    ...(isFirmLLP ? [{ key: 'partners', label: 'Partners' }] : []),
    { key: 'bank',         label: 'Bank Accounts' },
    { key: 'epfesi',       label: 'EPF / ESI' },
    { key: 'otherreg',     label: 'Other Registrations' },
  ]

  return (
    <div className="p-6">
      {/* Back + Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-4">
          <button onClick={() => navigate('/')} className="mt-1 p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft size={18} className="text-gray-500" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{client.display_name}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${CONSTITUTION_COLORS[client.constitution] || 'bg-gray-100 text-gray-700'}`}>
                {client.constitution}
              </span>
              {!client.is_active && <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">Inactive</span>}
              {client.is_on_retainer && <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">Retainer</span>}
            </div>
            <p className="text-gray-500 text-sm mt-1">{client.legal_name} &nbsp;·&nbsp; PAN: <span className="font-mono">{client.pan}</span></p>
          </div>
        </div>
        <button
          onClick={() => setEditing(true)}
          className="flex items-center gap-2 border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Edit2 size={14} /> Edit
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-1 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                tab === t.key
                  ? 'border-[#1F3864] text-[#1F3864]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {tab === 'overview' && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <Section title="Identity">
              <Field label="PAN"                         value={client.pan} />
              <Field label="Constitution"                value={client.constitution} />
              <Field label="CIN / LLPIN"                 value={client.cin_llpin} />
              <Field label="TAN"                         value={client.tan} />
              <Field label="Date of Incorp / Birth"      value={client.date_of_incorporation_birth} />
              <Field label="Client Since"                value={client.client_since} />
            </Section>
            <Section title="Contact">
              <Field label="Primary Phone"   value={client.primary_phone} />
              <Field label="Secondary Phone" value={client.secondary_phone} />
              <Field label="Primary Email"   value={client.primary_email} />
              <Field label="Secondary Email" value={client.secondary_email} />
            </Section>
            <Section title="Address">
              <Field label="Address Line 1" value={client.address_line1} />
              <Field label="Address Line 2" value={client.address_line2} />
              <Field label="City"           value={client.city} />
              <Field label="State"          value={client.state} />
              <Field label="Pin Code"       value={client.pin_code} />
            </Section>
            {client.notes && (
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Notes</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{client.notes}</p>
              </div>
            )}
          </div>
        )}

        {tab === 'kyc' && isIndividual && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <Section title="Personal Identity">
              <Field label="Father's Name" value={client.father_name} />
              <Field label="Mother's Name" value={client.mother_name} />
              <Field label="Gender"        value={client.gender} />
              <Field label="Nationality"   value={client.nationality} />
            </Section>
            <Section title="KYC Numbers">
              <Field label="Aadhaar No."   value={client.aadhaar_no} />
              <Field label="DIN"           value={client.din} />
              <Field label="Passport No."  value={client.passport_no} />
              <Field label="Passport Expiry" value={client.passport_expiry} />
            </Section>
            <Section title="MCA v3 Login">
              <Field label="MCA User ID"  value={client.mca_user_id} />
              <Field label="MCA Password" value={client.mca_password} secret />
            </Section>
            <Section title="DSC (Digital Signature Certificate)">
              <Field label="DSC Provider"       value={client.dsc_provider} />
              <Field label="DSC Expiry Date"    value={client.dsc_expiry_date} />
              <Field label="DSC Token Password" value={client.dsc_token_password} secret />
            </Section>
          </div>
        )}

        {tab === 'credentials' && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <Section title="Income Tax Portal">
              <Field label="IT Portal User ID"            value={client.it_portal_user_id} />
              <Field label="IT Portal Password"           value={client.it_portal_password} secret />
              <Field label="IT Portal User ID (TDS)"      value={client.it_portal_user_id_tds} />
              <Field label="IT Password (TDS)"            value={client.it_password_tds} secret />
              <Field label="Password for 26AS"            value={client.password_26as} secret />
              <Field label="Password for AIS / TIS"       value={client.password_ais_tis} secret />
            </Section>
            <Section title="TRACES">
              <Field label="TRACES User ID (Deductor)"   value={client.traces_user_id_deductor} />
              <Field label="TRACES Password (Deductor)"  value={client.traces_password_deductor} secret />
              <Field label="TRACES User ID (Tax Payer)"  value={client.traces_user_id_taxpayer} />
              <Field label="TRACES Password (Tax Payer)" value={client.traces_password_taxpayer} secret />
            </Section>
          </div>
        )}

        {tab === 'gst'         && <GSTTab          clientId={id} />}
        {tab === 'directors'   && <DirectorsTab     clientId={id} companyId={id} />}
        {tab === 'shareholders'&& <ShareholdersTab  clientId={id} />}
        {tab === 'partners'    && <PartnersTab      clientId={id} />}
        {tab === 'bank'        && <BankTab          clientId={id} />}
        {tab === 'epfesi'      && <EPFESITab        clientId={id} />}
        {tab === 'otherreg'    && <OtherRegTab      clientId={id} />}
      </div>

      {/* Edit modal */}
      {editing && (
        <ClientForm
          client={client}
          onClose={() => setEditing(false)}
          onSaved={updated => { setClient(updated); setEditing(false) }}
        />
      )}
    </div>
  )
}
