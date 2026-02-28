import { useState } from 'react'
import { clientsApi } from '../api'
import Modal from './Modal'

const CONSTITUTIONS = ['Individual', 'Company', 'LLP', 'Partnership Firm', 'HUF', 'Trust', 'AOP', 'BOI']
const STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana',
  'Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur',
  'Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana',
  'Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
  'Andaman & Nicobar','Chandigarh','Dadra & Nagar Haveli','Daman & Diu','Delhi','Jammu & Kashmir',
  'Ladakh','Lakshadweep','Puducherry',
]

function FormSection({ title, children }) {
  return (
    <div className="mb-6">
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 pb-1 border-b border-gray-100">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>
    </div>
  )
}

function Field({ label, name, type = 'text', value, onChange, required, options, span2 }) {
  const cls = `w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${span2 ? 'md:col-span-2' : ''}`
  return (
    <div className={span2 ? 'md:col-span-2' : ''}>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {options ? (
        <select name={name} value={value || ''} onChange={onChange} required={required} className={cls}>
          <option value="">— select —</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : type === 'checkbox' ? (
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" name={name} checked={!!value} onChange={onChange} className="rounded" />
          <span className="text-sm text-gray-700">Yes</span>
        </label>
      ) : (
        <input
          type={type} name={name} value={value || ''} onChange={onChange}
          required={required} className={cls}
          placeholder={type === 'password' ? '••••••••' : undefined}
        />
      )}
    </div>
  )
}

export default function ClientForm({ client, onClose, onSaved, inline }) {
  const isEdit = !!client
  const [form, setForm]     = useState(client || { constitution: 'Individual', is_direct_client: true, is_active: true, is_on_retainer: false, nationality: 'Indian' })
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  const handle = e => {
    const { name, value, type, checked } = e.target
    const newVal = type === 'checkbox' ? checked : value

    setForm(f => {
      const updated = { ...f, [name]: newVal }

      if (name === 'pan') {
        updated.it_portal_user_id = newVal
        const dob = f.date_of_incorporation_birth
        if (dob) {
          const [y, m, d] = dob.split('-')
          updated.password_ais_tis = newVal.toLowerCase() + d + m + y
        }
      }

      if (name === 'tan') {
        updated.it_portal_user_id_tds = newVal
      }

      if (name === 'date_of_incorporation_birth' && newVal) {
        const [y, m, d] = newVal.split('-')
        const ddmmyyyy = d + m + y
        updated.password_26as = ddmmyyyy
        updated.password_ais_tis = (f.pan || '').toLowerCase() + ddmmyyyy
      }

      return updated
    })
  }

  const submit = async e => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = isEdit
        ? await clientsApi.update(client.id, form)
        : await clientsApi.create(form)
      onSaved(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const isIndividual = form.constitution === 'Individual'

  const formContent = (
    <form onSubmit={submit}>
      <FormSection title="Identity">
        <Field label="PAN"                    name="pan"                         value={form.pan}                         onChange={handle} required />
        <Field label="Constitution"           name="constitution"                value={form.constitution}                onChange={handle} required options={CONSTITUTIONS} />
        <Field label="Display Name"           name="display_name"                value={form.display_name}                onChange={handle} required />
        <Field label="Legal Name"             name="legal_name"                  value={form.legal_name}                  onChange={handle} required />
        <Field label="Date of Incorp / Birth" name="date_of_incorporation_birth" value={form.date_of_incorporation_birth} onChange={handle} type="date" />
        <Field label="CIN / LLPIN"            name="cin_llpin"                   value={form.cin_llpin}                   onChange={handle} />
        <Field label="TAN"                    name="tan"                         value={form.tan}                         onChange={handle} />
        <Field label="Client Since"           name="client_since"                value={form.client_since}                onChange={handle} type="date" />
        <div className="md:col-span-2 flex flex-wrap gap-6">
          <Field label="Direct Client?"  name="is_direct_client" value={form.is_direct_client} onChange={handle} type="checkbox" />
          <Field label="Active?"         name="is_active"        value={form.is_active}        onChange={handle} type="checkbox" />
          <Field label="On Retainer?"    name="is_on_retainer"   value={form.is_on_retainer}   onChange={handle} type="checkbox" />
        </div>
      </FormSection>

      {isIndividual && (
        <>
          <FormSection title="Individual KYC — Personal Identity">
            <Field label="Father's Name" name="father_name" value={form.father_name} onChange={handle} />
            <Field label="Mother's Name" name="mother_name" value={form.mother_name} onChange={handle} />
            <Field label="Gender"        name="gender"      value={form.gender}      onChange={handle} options={['Male', 'Female', 'Other']} />
            <Field label="Nationality"   name="nationality" value={form.nationality} onChange={handle} />
          </FormSection>
          <FormSection title="Individual KYC — KYC Numbers">
            <Field label="Aadhaar No."    name="aadhaar_no"       value={form.aadhaar_no}       onChange={handle} />
            <Field label="DIN"            name="din"              value={form.din}              onChange={handle} />
            <Field label="Passport No."   name="passport_no"      value={form.passport_no}      onChange={handle} />
            <Field label="Passport Expiry"name="passport_expiry"  value={form.passport_expiry}  onChange={handle} type="date" />
          </FormSection>
          <FormSection title="Individual KYC — MCA v3">
            <Field label="MCA User ID"  name="mca_user_id"  value={form.mca_user_id}  onChange={handle} />
            <Field label="MCA Password" name="mca_password" value={form.mca_password} onChange={handle} type="password" />
          </FormSection>
          <FormSection title="Individual KYC — DSC">
            <Field label="DSC Provider"       name="dsc_provider"       value={form.dsc_provider}       onChange={handle} />
            <Field label="DSC Expiry Date"    name="dsc_expiry_date"    value={form.dsc_expiry_date}    onChange={handle} type="date" />
            <Field label="DSC Token Password" name="dsc_token_password" value={form.dsc_token_password} onChange={handle} type="password" />
          </FormSection>
        </>
      )}

      <FormSection title="Contact">
        <Field label="Primary Phone"   name="primary_phone"   value={form.primary_phone}   onChange={handle} />
        <Field label="Secondary Phone" name="secondary_phone" value={form.secondary_phone} onChange={handle} />
        <Field label="Primary Email"   name="primary_email"   value={form.primary_email}   onChange={handle} type="email" />
        <Field label="Secondary Email" name="secondary_email" value={form.secondary_email} onChange={handle} type="email" />
      </FormSection>

      <FormSection title="Address">
        <Field label="Address Line 1" name="address_line1" value={form.address_line1} onChange={handle} span2 />
        <Field label="Address Line 2" name="address_line2" value={form.address_line2} onChange={handle} span2 />
        <Field label="City"           name="city"          value={form.city}          onChange={handle} />
        <Field label="State"          name="state"         value={form.state}         onChange={handle} options={STATES} />
        <Field label="Pin Code"       name="pin_code"      value={form.pin_code}      onChange={handle} />
      </FormSection>

      <FormSection title="Income Tax Portal">
        <Field label="IT Portal User ID"       name="it_portal_user_id"     value={form.it_portal_user_id}     onChange={handle} />
        <Field label="IT Portal Password"      name="it_portal_password"    value={form.it_portal_password}    onChange={handle} type="password" />
        <Field label="IT Portal User ID (TDS)" name="it_portal_user_id_tds" value={form.it_portal_user_id_tds} onChange={handle} />
        <Field label="IT Password (TDS)"       name="it_password_tds"       value={form.it_password_tds}       onChange={handle} type="password" />
        <Field label="Password for 26AS"       name="password_26as"         value={form.password_26as}         onChange={handle} type="password" />
        <Field label="Password for AIS / TIS"  name="password_ais_tis"      value={form.password_ais_tis}      onChange={handle} type="password" />
      </FormSection>

      <FormSection title="TRACES">
        <Field label="TRACES User ID (Deductor)"   name="traces_user_id_deductor"  value={form.traces_user_id_deductor}  onChange={handle} />
        <Field label="TRACES Password (Deductor)"  name="traces_password_deductor" value={form.traces_password_deductor} onChange={handle} type="password" />
        <Field label="TRACES User ID (Tax Payer)"  name="traces_user_id_taxpayer"  value={form.traces_user_id_taxpayer}  onChange={handle} />
        <Field label="TRACES Password (Tax Payer)" name="traces_password_taxpayer" value={form.traces_password_taxpayer} onChange={handle} type="password" />
      </FormSection>

      <FormSection title="Notes">
        <div className="md:col-span-2">
          <textarea
            name="notes" value={form.notes || ''} onChange={handle} rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Internal notes…"
          />
        </div>
      </FormSection>

      {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg mb-4">{error}</p>}

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={loading} className="px-5 py-2 text-sm bg-[#1F3864] hover:bg-[#162848] text-white rounded-lg font-medium transition-colors disabled:opacity-60">
          {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Client'}
        </button>
      </div>
    </form>
  )

  if (inline) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">New Client</h1>
        <div className="bg-white rounded-xl border border-gray-200 p-6">{formContent}</div>
      </div>
    )
  }

  return (
    <Modal title={isEdit ? `Edit — ${client.display_name}` : 'New Client'} onClose={onClose} wide>
      {formContent}
    </Modal>
  )
}
