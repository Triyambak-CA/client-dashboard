import { useState, useRef, useEffect } from 'react'
import { Download, FileText, FileSpreadsheet, Loader2 } from 'lucide-react'

/**
 * Reusable export dropdown.
 * Props:
 *   onExportPDF   – async function called when PDF is chosen
 *   onExportExcel – async function called when Excel is chosen
 *   label         – button label (default: "Export")
 *   small         – if true, renders a compact icon-only trigger
 */
export default function ExportMenu({ onExportPDF, onExportExcel, label = 'Export', small = false }) {
  const [open,    setOpen]    = useState(false)
  const [loading, setLoading] = useState(null)   // null | 'pdf' | 'excel'
  const ref = useRef(null)

  useEffect(() => {
    const close = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const handle = async type => {
    setOpen(false)
    setLoading(type)
    try {
      if (type === 'pdf') await onExportPDF()
      else                await onExportExcel()
    } finally {
      setLoading(null)
    }
  }

  const Icon = loading ? Loader2 : Download

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        disabled={!!loading}
        title={label}
        className={
          small
            ? 'flex items-center gap-1 px-2.5 py-1.5 text-xs border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-lg disabled:opacity-50 transition-colors'
            : 'flex items-center gap-2 border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60'
        }
      >
        <Icon size={small ? 12 : 14} className={loading ? 'animate-spin' : ''} />
        {!small && <span>{loading ? 'Exporting…' : label}</span>}
        {small && <span className="hidden sm:inline">{loading ? '…' : label}</span>}
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-1.5">
          <p className="px-3 py-1 text-xs text-gray-400 font-semibold uppercase tracking-wide">
            Export as
          </p>
          <button
            onClick={() => handle('pdf')}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 transition-colors"
          >
            <FileText size={15} className="text-red-500" />
            PDF Document
          </button>
          <button
            onClick={() => handle('excel')}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors"
          >
            <FileSpreadsheet size={15} className="text-green-600" />
            Excel Spreadsheet
          </button>
        </div>
      )}
    </div>
  )
}
