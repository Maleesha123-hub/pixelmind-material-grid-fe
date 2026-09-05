/**
 * Person Service
 *
 * API base: /api/v1/persons
 *
 * Matches the PersonController contract:
 *   GET    /api/v1/persons?search=&page=&size=&sort= → ApiResponse<PageResponse<PersonResponse>>
 *   GET    /api/v1/persons/{id}                     → ApiResponse<PersonResponse>
 *   POST   /api/v1/persons                          → ApiResponse<PersonResponse> { name, personType }
 *   PUT    /api/v1/persons/{id}                     → ApiResponse<PersonResponse> { name, personType }
 *   DELETE /api/v1/persons/{id}                     → ApiResponse<Void>
 *
 * @module personService
 */

const API_BASE = `${import.meta.env.VITE_API_URL}/api/v1/persons`

// ─── Response unwrapper ──────────────────────────────────────────────────────
const unwrap = (result) => {
  if (result && result.data !== undefined) return result.data
  if (result && Array.isArray(result.payload)) return result.payload
  if (Array.isArray(result)) return result
  return result
}

// ─── Shared fetch helper ─────────────────────────────────────────────────────
const apiFetch = async (url, options = {}) => {
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' }

  const response = await fetch(url, {
    headers,
    ...options,
  })

  if (!response.ok) {
    let errorMessage = `Server error: ${response.status}`
    try {
      const err = await response.json()
      errorMessage = err.message || err.error || JSON.stringify(err)
    } catch {
      const text = await response.text().catch(() => '')
      if (text) errorMessage = text
    }
    throw new Error(errorMessage)
  }

  if (response.status === 204) {
    return null
  }

  return response.json()
}

// ─── Build query string helper ────────────────────────────────────────────────
const buildQuery = (params) => {
  const q = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== null && v !== undefined && v !== '') q.append(k, v)
  })
  return q.toString()
}

export const personService = {
  /**
   * GET /api/v1/persons?search=&page=&size=&sort=
   * Paginated list with optional name search.
   *
   * @param {Object} [params]
   * @param {string} [params.search]  - Search person name
   * @param {number} [params.page=0]  - 0-based page index
   * @param {number} [params.size=20] - Page size
   * @param {string} [params.sort='id,desc'] - Sorting
   * @param {AbortSignal} [signal]
   * @returns {Promise<PageResponse<PersonResponse>>}
   */
  getPersons: async ({ search = '', page = 0, size = 15, sort = 'id,desc' } = {}, signal) => {
    const qs = buildQuery({ search: search.trim(), page, size, sort })
    const result = await apiFetch(`${API_BASE}?${qs}`, { signal })
    return unwrap(result)
  },

  /**
   * GET /api/v1/persons/{id}
   * Get single person by ID.
   *
   * @param {number|string} id
   * @param {AbortSignal} [signal]
   * @returns {Promise<PersonResponse>}
   */
  getPerson: async (id, signal) => {
    const result = await apiFetch(`${API_BASE}/${id}`, { signal })
    return unwrap(result)
  },

  /**
   * POST /api/v1/persons
   * Create a new person.
   *
   * @param {Object} payload
   * @param {string} payload.name       - Required, max 150 chars
   * @param {string} payload.personType - 'MOUNT_OWNER' | 'EXCAVATOR_OWNER'
   * @returns {Promise<PersonResponse>}
   */
  createPerson: async (payload) => {
    const result = await apiFetch(API_BASE, {
      method: 'POST',
      body: JSON.stringify({
        name: payload.name.trim(),
        personType: payload.personType,
      }),
    })
    return unwrap(result)
  },

  /**
   * PUT /api/v1/persons/{id}
   * Update an existing person.
   *
   * @param {number|string} id
   * @param {Object} payload
   * @param {string} payload.name       - Required, max 150 chars
   * @param {string} payload.personType - 'MOUNT_OWNER' | 'EXCAVATOR_OWNER'
   * @returns {Promise<PersonResponse>}
   */
  updatePerson: async (id, payload) => {
    const result = await apiFetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: payload.name.trim(),
        personType: payload.personType,
      }),
    })
    return unwrap(result)
  },

  /**
   * DELETE /api/v1/persons/{id}
   * Permanently delete a person.
   *
   * @param {number|string} id
   * @returns {Promise<void>}
   */
  deletePerson: async (id) => {
    const result = await apiFetch(`${API_BASE}/${id}`, {
      method: 'DELETE',
    })
    return unwrap(result)
  },
}

export default personService
