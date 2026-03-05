import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { clientsApi } from '../api'
import { Search, Plus, Phone, Mail, RefreshCw } from 'lucide-react'

const CONSTITUTION_COLORS = {
  'Individual':       'bg-blue-100 text-blue-800',
  'Company':          'bg-purple-100 text-purple-800',
  'LLP':              'bg-indigo-100 text-indigo-800',
  'Partnership Firm': 'bg-green-100 text-green-800',
  'HUF':              'bg-amber-100 text-amber-800',
  'Trust':            'bg-orange-100 text-orange-800',
  'AOP':              'bg-red-100 text-red-800',
  'BOI':              'bg-rose-100 text-rose-800',
}

const CONSTITUTIONS = ['Individual', 'Company', 'LLP', 'Partnership Firm', 'HUF', 'Trust', 'AOP', 'BOI']

export default function Dashboard() {
  const navigate = useNavigate()
  const [clients,      setClients]      = useState([])
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [constitution, setConstitution] = useState('')
  const [isActive,     setIsActive]     = useState('')
  const [isDirect,     setIsDirect]     = useState('')

  const fetchClients = async () => {
    setLoading(true)
    try {
      const params = {}
      if (search)       params.search       = search
      if (constitution) params.constitution = constitution
      if (isActive)     params.is_active    = isActive === 'true'
      if (isDirect)     params.is_direct    = isDirect === 'true'
      const res = await clientsApi.list(params)
      setClients(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchClients() }, [constitution, isActive, isDirect])

  const handleSearch = e => {
    e.preventDefault()
    fetchClients()
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Clients</h1>
          <p className="text-gray-500 text-sm mt-0.5">{clients.length} records</p>
        </div>
        <button
          onClick={() => navigate('/clients/new')}
          className="flex items-center gap-2 bg-[#1F3864] hover:bg-[#162848] text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Add Client
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name or PAN…"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Constitution filter */}
          <select
            value={constitution}
            onChange={e => setConstitution(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">All Constitutions</option>
            {CONSTITUTIONS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* Active filter */}
          <select
            value={isActive}
            onChange={e => setIsActive(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>

          {/* Direct client filter */}
          <select
            value={isDirect}
            onChange={e => setIsDirect(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">All Clients</option>
            <option value="true">Direct Clients Only</option>
            <option value="false">KYC Only</option>
          </select>

          <button type="submit" className="bg-[#1F3864] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#162848] transition-colors">
            Search
          </button>
          <button
            type="button"
            onClick={() => { setSearch(''); setConstitution(''); setIsActive(''); setIsDirect('') }}
            className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <RefreshCw size={14} /> Reset
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-gray-500">Loading clients…</div>
        ) : clients.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg font-medium">No clients found</p>
            <p className="text-sm mt-1">Add your first client using the button above</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">PAN</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Constitution</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Contact</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Tags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clients.map(client => (
                <tr
                  key={client.id}
                  onClick={() => navigate(`/clients/${client.id}`)}
                  className="hover:bg-blue-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{client.display_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">{client.legal_name}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-700">{client.pan}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${CONSTITUTION_COLORS[client.constitution] || 'bg-gray-100 text-gray-700'}`}>
                      {client.constitution}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {client.primary_phone && (
                      <div className="flex items-center gap-1 text-xs"><Phone size={12} />{client.primary_phone}</div>
                    )}
                    {client.primary_email && (
                      <div className="flex items-center gap-1 text-xs mt-0.5"><Mail size={12} />{client.primary_email}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {!client.is_active     && <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs">Inactive</span>}
                      {client.is_on_retainer && <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">Retainer</span>}
                      {!client.is_direct_client && <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">KYC only</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
