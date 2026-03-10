import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import XLSX from 'xlsx-js-style'

// ─── PDF minimal theme palette ─────────────────────────────────────────────
const C_BLACK  = [30, 30, 30]
const C_DARK   = [60, 60, 60]
const C_GRAY   = [102, 102, 102]
const C_LIGHT  = [153, 153, 153]
const C_RULE   = [220, 220, 220]
const C_ACCENT = [180, 180, 180]

// ─── Excel style objects (xlsx-js-style) ───────────────────────────────────
const XL_TITLE  = { font: { bold: true, sz: 12, color: { rgb: '1F3864' } } }
const XL_META   = { font: { italic: true, sz: 9,  color: { rgb: '666666' } } }
const XL_HEADER = {
  font: { bold: true, color: { rgb: 'FFFFFF' } },
  fill: { fgColor: { rgb: '1F3864' } },
  alignment: { horizontal: 'center' },
}
const XL_LABEL  = { font: { bold: true, color: { rgb: '505050' } } }

function applyXlStyles(ws, data, headerRowIdx) {
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')

  // Title row
  const t0 = XLSX.utils.encode_cell({ r: 0, c: 0 })
  if (ws[t0]) ws[t0].s = XL_TITLE

  // Metadata rows 1–2
  for (let mr = 1; mr <= 2; mr++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const a = XLSX.utils.encode_cell({ r: mr, c })
      if (ws[a]) ws[a].s = XL_META
    }
  }

  // Header row
  for (let c = range.s.c; c <= range.e.c; c++) {
    const a = XLSX.utils.encode_cell({ r: headerRowIdx, c })
    if (ws[a]) ws[a].s = XL_HEADER
  }

  // Bold labels on col 0 for 2-column (Field / Value) sheets
  if (data[headerRowIdx]?.length === 2) {
    for (let r = headerRowIdx + 1; r <= range.e.r; r++) {
      const a = XLSX.utils.encode_cell({ r, c: 0 })
      if (ws[a]) ws[a].s = XL_LABEL
    }
  }

  // Auto column widths (capped at 60 chars)
  const cols = []
  for (let c = range.s.c; c <= range.e.c; c++) {
    let max = 10
    for (let r = range.s.r; r <= range.e.r; r++) {
      const val = ws[XLSX.utils.encode_cell({ r, c })]?.v
      if (val != null) max = Math.max(max, String(val).length)
    }
    cols.push({ wch: Math.min(max + 2, 60) })
  }
  ws['!cols'] = cols

  // Freeze rows up to and including the header
  ws['!freeze'] = { xSplit: 0, ySplit: headerRowIdx + 1 }
}

function v(val) {
  if (val === null || val === undefined || val === '') return '—'
  if (typeof val === 'boolean') return val ? 'Yes' : 'No'
  return String(val)
}

// ─── PDF helpers ──────────────────────────────────────────────────────────────

function drawPDFHeader(doc, client) {
  const w = doc.internal.pageSize.width

  doc.setTextColor(...C_BLACK)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text(client.display_name, 14, 12)

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...C_GRAY)
  doc.text(
    `PAN: ${client.pan}   ·   ${client.constitution}   ·   ${client.legal_name || ''}`,
    14, 19
  )
  doc.text(
    `Generated: ${new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}`,
    w - 14, 19, { align: 'right' }
  )

  // Thin rule
  doc.setDrawColor(...C_ACCENT)
  doc.setLineWidth(0.5)
  doc.line(14, 23, w - 14, 23)
  doc.setDrawColor(0)
  doc.setTextColor(0)
}

function sectionHeading(doc, title, y) {
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...C_LIGHT)
  doc.text(title.toUpperCase(), 14, y)
  doc.setDrawColor(...C_RULE)
  doc.setLineWidth(0.3)
  doc.line(14, y + 1.5, doc.internal.pageSize.width - 14, y + 1.5)
  doc.setDrawColor(0)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0)
  return y + 7
}

function kvTable(doc, pairs, startY, client) {
  const filtered = pairs.filter(([, val]) => val !== undefined && val !== null && val !== '')
  if (!filtered.length) return startY + 4
  autoTable(doc, {
    startY,
    body: filtered.map(([k, val]) => [k, v(val)]),
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: { top: 2, bottom: 2, left: 4, right: 4 } },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: C_DARK, cellWidth: 55 },
      1: { textColor: C_BLACK, font: 'courier' },
    },
    margin: { left: 14, right: 14 },
    didDrawPage: () => { drawPDFHeader(doc, client) },
  })
  return doc.lastAutoTable.finalY + 8
}

function dataTable(doc, head, rows, startY, client) {
  if (!rows.length) {
    doc.setFontSize(8)
    doc.setTextColor(160, 160, 160)
    doc.text('No records.', 14, startY + 5)
    doc.setTextColor(0)
    return startY + 14
  }
  autoTable(doc, {
    startY,
    head: [head],
    body: rows.map(r => r.map(c => v(c))),
    theme: 'plain',
    headStyles: {
      fillColor: [245, 245, 245],
      textColor: C_DARK,
      fontSize: 7.5,
      fontStyle: 'bold',
      lineColor: C_RULE,
      lineWidth: 0.3,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: C_BLACK,
      lineColor: C_RULE,
      lineWidth: 0.2,
    },
    margin: { left: 14, right: 14 },
    didDrawPage: () => { drawPDFHeader(doc, client) },
  })
  return doc.lastAutoTable.finalY + 8
}

function needPage(doc, y, client) {
  if (y > doc.internal.pageSize.height - 40) {
    doc.addPage()
    drawPDFHeader(doc, client)
    return 30
  }
  return y
}

// ─── Public: single-section PDF ───────────────────────────────────────────────
export function exportSectionPDF({ client, title, head, rows }) {
  const doc = new jsPDF({ orientation: rows[0]?.length > 6 ? 'landscape' : 'portrait' })
  drawPDFHeader(doc, client)
  let y = 30
  y = sectionHeading(doc, title, y)
  if (head.length === 2) {
    kvTable(doc, rows, y, client)
  } else {
    dataTable(doc, head, rows, y, client)
  }
  doc.save(`${client.display_name} — ${title}.pdf`)
}

// ─── Public: single-section Excel ─────────────────────────────────────────────
export function exportSectionExcel({ client, title, head, rows }) {
  const wb = XLSX.utils.book_new()
  const info = [
    [title],
    [`Client: ${client.display_name}`, `PAN: ${client.pan}`, client.constitution],
    [`Generated: ${new Date().toLocaleString('en-IN')}`],
    [],
    head,
    ...rows.map(r => r.map(c => v(c))),
  ]
  const ws = XLSX.utils.aoa_to_sheet(info)
  applyXlStyles(ws, info, 4)
  XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 31))
  XLSX.writeFile(wb, `${client.display_name} — ${title}.xlsx`)
}

// ─── Public: full client PDF ───────────────────────────────────────────────────
export async function exportFullClientPDF(client, fetchers) {
  const doc = new jsPDF({ orientation: 'landscape' })
  drawPDFHeader(doc, client)
  let y = 30

  // ── Overview ────────────────────────────────────────────────────────────────
  y = sectionHeading(doc, 'Overview', y)
  y = kvTable(doc, [
    ['PAN', client.pan],
    ['Legal Name', client.legal_name],
    ['Constitution', client.constitution],
    ['CIN / LLPIN', client.cin_llpin],
    ['TAN', client.tan],
    ['Date of Incorp / Birth', client.date_of_incorporation_birth],
    ['Client Since', client.client_since],
    ['Primary Phone', client.primary_phone],
    ['Secondary Phone', client.secondary_phone],
    ['Primary Email', client.primary_email],
    ['Secondary Email', client.secondary_email],
    ['Address', [client.address_line1, client.address_line2, client.city, client.state, client.pin_code].filter(Boolean).join(', ')],
    ['Direct Client', client.is_direct_client],
    ['On Retainer', client.is_on_retainer],
    ['Active', client.is_active],
    ['Notes', client.notes],
  ], y, client)

  // ── KYC / DSC (Individual only) ─────────────────────────────────────────────
  if (client.constitution === 'Individual') {
    y = needPage(doc, y, client)
    y = sectionHeading(doc, 'KYC / DSC', y)
    y = kvTable(doc, [
      ["Father's Name", client.father_name],
      ["Mother's Name", client.mother_name],
      ['Gender', client.gender],
      ['Nationality', client.nationality],
      ['Aadhaar No.', client.aadhaar_no],
      ['DIN', client.din],
      ['Passport No.', client.passport_no],
      ['Passport Expiry', client.passport_expiry],
      ['MCA User ID', client.mca_user_id],
      ['MCA Password', client.mca_password],
      ['DSC Provider', client.dsc_provider],
      ['DSC Expiry Date', client.dsc_expiry_date],
      ['DSC Token Password', client.dsc_token_password],
    ], y, client)
  }

  // ── Credentials ─────────────────────────────────────────────────────────────
  y = needPage(doc, y, client)
  y = sectionHeading(doc, 'Credentials', y)
  y = kvTable(doc, [
    ['IT Portal User ID', client.it_portal_user_id],
    ['IT Portal Password', client.it_portal_password],
    ['IT Portal User ID (TDS)', client.it_portal_user_id_tds],
    ['IT Password (TDS)', client.it_password_tds],
    ['Password for 26AS', client.password_26as],
    ['Password for AIS / TIS', client.password_ais_tis],
    ['TRACES User ID (Deductor)', client.traces_user_id_deductor],
    ['TRACES Password (Deductor)', client.traces_password_deductor],
    ['TRACES User ID (Tax Payer)', client.traces_user_id_taxpayer],
    ['TRACES Password (Tax Payer)', client.traces_password_taxpayer],
  ], y, client)

  // ── GST ─────────────────────────────────────────────────────────────────────
  y = needPage(doc, y, client)
  y = sectionHeading(doc, 'GST Registrations', y)
  const gstData = await fetchers.gst()
  y = dataTable(doc,
    ['GSTIN', 'State', 'Type', 'Reg Date', 'User ID', 'Password', 'EWB User ID', 'EWB Password', 'Status', 'Signatories'],
    gstData.map(r => [r.gstin, r.state, r.registration_type, r.registration_date, r.gst_user_id, r.gst_password, r.ewb_user_id, r.ewb_password, r.is_active ? 'Active' : 'Inactive', r.signatories?.map(s => s.signatory_name).join(', ') || '—']),
    y, client
  )

  // ── Directors / Shareholders / Partners ──────────────────────────────────────
  const isCompany = client.constitution === 'Company'
  const isFirmLLP = ['Partnership Firm', 'LLP'].includes(client.constitution)

  if (isCompany) {
    y = needPage(doc, y, client)
    y = sectionHeading(doc, 'Directors', y)
    const dirs = await fetchers.directors()
    y = dataTable(doc,
      ['Name', 'DIN', 'Designation', 'Appointed', 'Cessation', 'Status', 'KMP'],
      dirs.map(r => [r.individual_name, r.din, r.designation, r.date_of_appointment, r.date_of_cessation, r.is_active ? 'Active' : 'Inactive', r.is_kmp ? 'Yes' : 'No']),
      y, client
    )

    y = needPage(doc, y, client)
    y = sectionHeading(doc, 'Shareholders', y)
    const shrs = await fetchers.shareholders()
    y = dataTable(doc,
      ['Name', 'PAN', 'Holder Type', 'Share Type', 'No. of Shares', 'Face Value', '%', 'Date Acquired', 'Status'],
      shrs.map(r => [r.holder_name, r.holder_pan, r.holder_type, r.share_type, r.number_of_shares, r.face_value, r.percentage != null ? `${r.percentage}%` : '', r.date_acquired, r.is_active ? 'Active' : 'Inactive']),
      y, client
    )
  }

  if (isFirmLLP) {
    y = needPage(doc, y, client)
    y = sectionHeading(doc, 'Partners', y)
    const parts = await fetchers.partners()
    y = dataTable(doc,
      ['Name', 'Role', 'Profit %', 'Capital (₹)', 'Joined', 'Exited', 'Status'],
      parts.map(r => [r.individual_name, r.role, r.profit_sharing_ratio, r.capital_contribution, r.date_of_joining, r.date_of_exit, r.is_active ? 'Active' : 'Exited']),
      y, client
    )
  }

  // ── Bank Accounts ────────────────────────────────────────────────────────────
  y = needPage(doc, y, client)
  y = sectionHeading(doc, 'Bank Accounts', y)
  const banks = await fetchers.bank()
  y = dataTable(doc,
    ['Bank', 'Account No.', 'IFSC', 'Branch', 'Type', 'Net Banking ID', 'Net Banking Pwd', 'Primary'],
    banks.map(r => [r.bank_name, r.account_number, r.ifsc_code, r.branch_name, r.account_type, r.net_banking_user_id, r.net_banking_password, r.is_primary ? 'Yes' : '']),
    y, client
  )

  // ── EPF / ESI ─────────────────────────────────────────────────────────────────
  y = needPage(doc, y, client)
  y = sectionHeading(doc, 'EPF / ESI', y)
  const epf = await fetchers.epfesi()
  y = dataTable(doc,
    ['Type', 'Estab. Code', 'State', 'Reg Date', 'Portal ID', 'Password', 'DSC Holder', 'Auth Signatory', 'Status'],
    epf.map(r => [r.registration_type, r.establishment_code, r.state, r.registration_date, r.portal_user_id, r.portal_password, r.dsc_holder_name, r.authorised_signatory, r.is_active ? 'Active' : 'Inactive']),
    y, client
  )

  // ── Other Registrations ───────────────────────────────────────────────────────
  y = needPage(doc, y, client)
  y = sectionHeading(doc, 'Other Registrations', y)
  const others = await fetchers.otherReg()
  dataTable(doc,
    ['Type', 'Reg. Number', 'Reg Date', 'Valid Until', 'Issuing Authority', 'Portal ID', 'Password', 'Status'],
    others.map(r => [r.registration_type, r.registration_number, r.registration_date, r.valid_until, r.issuing_authority, r.portal_user_id, r.portal_password, r.is_active ? 'Active' : 'Inactive']),
    y, client
  )

  doc.save(`${client.display_name} — Full Profile.pdf`)
}

// ─── Public: full client Excel ────────────────────────────────────────────────
export async function exportFullClientExcel(client, fetchers) {
  const wb = XLSX.utils.book_new()
  const ts = new Date().toLocaleString('en-IN')

  function sheet(title, rows) {
    const data = [
      [title],
      [`Client: ${client.display_name}`, `PAN: ${client.pan}`, client.constitution],
      [`Generated: ${ts}`],
      [],
      ...rows,
    ]
    const ws = XLSX.utils.aoa_to_sheet(data)
    applyXlStyles(ws, data, 4)
    XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 31))
  }

  // Overview
  sheet('Overview', [
    ['Field', 'Value'],
    ['PAN', client.pan],
    ['Legal Name', client.legal_name],
    ['Constitution', client.constitution],
    ['CIN / LLPIN', client.cin_llpin || ''],
    ['TAN', client.tan || ''],
    ['Date of Incorp / Birth', client.date_of_incorporation_birth || ''],
    ['Client Since', client.client_since || ''],
    ['Primary Phone', client.primary_phone || ''],
    ['Secondary Phone', client.secondary_phone || ''],
    ['Primary Email', client.primary_email || ''],
    ['Secondary Email', client.secondary_email || ''],
    ['Address Line 1', client.address_line1 || ''],
    ['Address Line 2', client.address_line2 || ''],
    ['City', client.city || ''],
    ['State', client.state || ''],
    ['Pin Code', client.pin_code || ''],
    ['Direct Client', client.is_direct_client ? 'Yes' : 'No'],
    ['On Retainer', client.is_on_retainer ? 'Yes' : 'No'],
    ['Active', client.is_active ? 'Yes' : 'No'],
    ['Notes', client.notes || ''],
  ])

  // KYC (Individual only)
  if (client.constitution === 'Individual') {
    sheet('KYC & DSC', [
      ['Field', 'Value'],
      ["Father's Name", client.father_name || ''],
      ["Mother's Name", client.mother_name || ''],
      ['Gender', client.gender || ''],
      ['Nationality', client.nationality || ''],
      ['Aadhaar No.', client.aadhaar_no || ''],
      ['DIN', client.din || ''],
      ['Passport No.', client.passport_no || ''],
      ['Passport Expiry', client.passport_expiry || ''],
      ['MCA User ID', client.mca_user_id || ''],
      ['MCA Password', client.mca_password || ''],
      ['DSC Provider', client.dsc_provider || ''],
      ['DSC Expiry Date', client.dsc_expiry_date || ''],
      ['DSC Token Password', client.dsc_token_password || ''],
    ])
  }

  // Credentials
  sheet('Credentials', [
    ['Field', 'Value'],
    ['IT Portal User ID', client.it_portal_user_id || ''],
    ['IT Portal Password', client.it_portal_password || ''],
    ['IT Portal User ID (TDS)', client.it_portal_user_id_tds || ''],
    ['IT Password (TDS)', client.it_password_tds || ''],
    ['Password for 26AS', client.password_26as || ''],
    ['Password for AIS / TIS', client.password_ais_tis || ''],
    ['TRACES User ID (Deductor)', client.traces_user_id_deductor || ''],
    ['TRACES Password (Deductor)', client.traces_password_deductor || ''],
    ['TRACES User ID (Tax Payer)', client.traces_user_id_taxpayer || ''],
    ['TRACES Password (Tax Payer)', client.traces_password_taxpayer || ''],
  ])

  // GST
  const gstData = await fetchers.gst()
  sheet('GST', [
    ['GSTIN', 'State', 'Type', 'Reg Date', 'Cancellation Date', 'User ID', 'Password', 'EWB User ID', 'EWB Password', 'EWB API User ID', 'EWB API Password', 'Status', 'Notes', 'Signatories'],
    ...gstData.map(r => [r.gstin, r.state, r.registration_type, r.registration_date, r.cancellation_date, r.gst_user_id, r.gst_password, r.ewb_user_id, r.ewb_password, r.ewb_api_user_id, r.ewb_api_password, r.is_active ? 'Active' : 'Inactive', r.notes || '', r.signatories?.map(s => `${s.signatory_name} (${s.signatory_pan})`).join('; ') || '']),
  ])

  const isCompany = client.constitution === 'Company'
  const isFirmLLP = ['Partnership Firm', 'LLP'].includes(client.constitution)

  if (isCompany) {
    const dirs = await fetchers.directors()
    sheet('Directors', [
      ['Name', 'DIN', 'Designation', 'Date of Appointment', 'Date of Cessation', 'Status', 'KMP', 'Notes'],
      ...dirs.map(r => [r.individual_name, r.din, r.designation, r.date_of_appointment, r.date_of_cessation, r.is_active ? 'Active' : 'Inactive', r.is_kmp ? 'Yes' : 'No', r.notes || '']),
    ])

    const shrs = await fetchers.shareholders()
    sheet('Shareholders', [
      ['Name', 'PAN', 'Holder Type', 'Share Type', 'No. of Shares', 'Face Value (₹)', 'Percentage %', 'Date Acquired', 'Status', 'Notes'],
      ...shrs.map(r => [r.holder_name, r.holder_pan, r.holder_type, r.share_type, r.number_of_shares, r.face_value, r.percentage, r.date_acquired, r.is_active ? 'Active' : 'Inactive', r.notes || '']),
    ])
  }

  if (isFirmLLP) {
    const parts = await fetchers.partners()
    sheet('Partners', [
      ['Name', 'Role', 'Profit Sharing %', 'Capital Contribution (₹)', 'Date of Joining', 'Date of Exit', 'Status', 'Notes'],
      ...parts.map(r => [r.individual_name, r.role, r.profit_sharing_ratio, r.capital_contribution, r.date_of_joining, r.date_of_exit, r.is_active ? 'Active' : 'Exited', r.notes || '']),
    ])
  }

  // Bank
  const banks = await fetchers.bank()
  sheet('Bank Accounts', [
    ['Bank Name', 'Account Number', 'IFSC Code', 'Branch', 'Account Type', 'Net Banking User ID', 'Net Banking Password', 'Primary', 'Notes'],
    ...banks.map(r => [r.bank_name, r.account_number, r.ifsc_code, r.branch_name || '', r.account_type || '', r.net_banking_user_id || '', r.net_banking_password || '', r.is_primary ? 'Yes' : 'No', r.notes || '']),
  ])

  // EPF/ESI
  const epf = await fetchers.epfesi()
  sheet('EPF-ESI', [
    ['Type', 'Establishment Code', 'State', 'Reg Date', 'Cancellation Date', 'Portal User ID', 'Portal Password', 'DSC Holder', 'Auth Signatory', 'Status', 'Notes'],
    ...epf.map(r => [r.registration_type, r.establishment_code, r.state || '', r.registration_date || '', r.cancellation_date || '', r.portal_user_id || '', r.portal_password || '', r.dsc_holder_name || '', r.authorised_signatory || '', r.is_active ? 'Active' : 'Inactive', r.notes || '']),
  ])

  // Other Registrations
  const others = await fetchers.otherReg()
  sheet('Other Registrations', [
    ['Type', 'Reg. Number', 'Reg Date', 'Valid Until', 'Issuing Authority', 'State/Jurisdiction', 'Portal User ID', 'Portal Password', 'Status', 'Notes'],
    ...others.map(r => [r.registration_type, r.registration_number, r.registration_date || '', r.valid_until || '', r.issuing_authority || '', r.state_jurisdiction || '', r.portal_user_id || '', r.portal_password || '', r.is_active ? 'Active' : 'Inactive', r.notes || '']),
  ])

  XLSX.writeFile(wb, `${client.display_name} — Full Profile.xlsx`)
}
