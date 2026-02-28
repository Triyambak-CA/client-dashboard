import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

// Attach JWT token to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// On 401, clear token and go to login
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login:      (email, password) => api.post('/auth/login', { email, password }),
  me:         ()                => api.get('/auth/me'),
  createUser: (data)            => api.post('/auth/users', data),
  listUsers:  ()                => api.get('/auth/users'),
  updateUser: (id, data)        => api.put(`/auth/users/${id}`, data),
}

// ── Clients ───────────────────────────────────────────────────────────────────
export const clientsApi = {
  list:   (params) => api.get('/clients', { params }),
  get:    (id)     => api.get(`/clients/${id}`),
  create: (data)   => api.post('/clients', data),
  update: (id, data) => api.put(`/clients/${id}`, data),
  delete: (id)     => api.delete(`/clients/${id}`),
}

// ── GST ───────────────────────────────────────────────────────────────────────
export const gstApi = {
  list:            (clientId)        => api.get('/gst', { params: { client_id: clientId } }),
  get:             (id)              => api.get(`/gst/${id}`),
  create:          (data)            => api.post('/gst', data),
  update:          (id, data)        => api.put(`/gst/${id}`, data),
  delete:          (id)              => api.delete(`/gst/${id}`),
  addSignatory:    (gstId, clientId) => api.post(`/gst/${gstId}/signatories`, { signatory_client_id: clientId }),
  removeSignatory: (gstId, sigId)    => api.delete(`/gst/${gstId}/signatories/${sigId}`),
}

// ── Directors ─────────────────────────────────────────────────────────────────
export const directorsApi = {
  list:   (params) => api.get('/directors', { params }),
  create: (data)   => api.post('/directors', data),
  update: (companyId, individualId, data) => api.put(`/directors/${companyId}/${individualId}`, data),
  delete: (companyId, individualId)       => api.delete(`/directors/${companyId}/${individualId}`),
}

// ── Shareholders ──────────────────────────────────────────────────────────────
export const shareholdersApi = {
  list:   (clientId) => api.get('/shareholders', { params: { company_client_id: clientId } }),
  create: (data)     => api.post('/shareholders', data),
  update: (id, data) => api.put(`/shareholders/${id}`, data),
  delete: (id)       => api.delete(`/shareholders/${id}`),
}

// ── Partners ──────────────────────────────────────────────────────────────────
export const partnersApi = {
  list:   (clientId) => api.get('/partners', { params: { firm_llp_client_id: clientId } }),
  create: (data)     => api.post('/partners', data),
  update: (id, data) => api.put(`/partners/${id}`, data),
  delete: (id)       => api.delete(`/partners/${id}`),
}

// ── Bank Accounts ─────────────────────────────────────────────────────────────
export const bankApi = {
  list:   (clientId) => api.get('/bank-accounts', { params: { client_id: clientId } }),
  create: (data)     => api.post('/bank-accounts', data),
  update: (id, data) => api.put(`/bank-accounts/${id}`, data),
  delete: (id)       => api.delete(`/bank-accounts/${id}`),
}

// ── EPF/ESI ───────────────────────────────────────────────────────────────────
export const epfEsiApi = {
  list:   (clientId) => api.get('/epf-esi', { params: { client_id: clientId } }),
  create: (data)     => api.post('/epf-esi', data),
  update: (id, data) => api.put(`/epf-esi/${id}`, data),
  delete: (id)       => api.delete(`/epf-esi/${id}`),
}

// ── Other Registrations ───────────────────────────────────────────────────────
export const otherRegApi = {
  list:   (clientId) => api.get('/other-registrations', { params: { client_id: clientId } }),
  create: (data)     => api.post('/other-registrations', data),
  update: (id, data) => api.put(`/other-registrations/${id}`, data),
  delete: (id)       => api.delete(`/other-registrations/${id}`),
}
