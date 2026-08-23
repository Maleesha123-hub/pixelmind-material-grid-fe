/**
 * License Service
 *
 * API base: /api/v1/licenses
 *
 * Matches the LicenseController contract:
 *   GET  /api/v1/licenses?startDate=&endDate=&page=&size=&sort= → ApiResponse<PageResponse<LicenseResponse>>
 *   GET  /api/v1/licenses/{id}                                  → ApiResponse<LicenseResponse>
 *   POST /api/v1/licenses                                       → ApiResponse<LicenseResponse>  { startDate, endDate, price }
 *   PUT  /api/v1/licenses/{id}                                  → ApiResponse<LicenseResponse>  { startDate, endDate, price, status }
 *   DELETE /api/v1/licenses/{id}                                → 204 No Content
 *
 * @module licenseService
 */

const API_BASE = `${import.meta.env.VITE_API_URL}/api/v1/licenses`

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

  // Handle 204 No Content
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

export const licenseService = {
  /**
   * GET /api/v1/licenses?search=&startDate=&endDate=&page=&size=&sort=
   * Paginated list of licenses, filterable by search term and date range.
   *
   * @param {Object} [params]
   * @param {string}  [params.search]    - Search term (code/price)
   * @param {string}  [params.startDate] - ISO date string YYYY-MM-DD
   * @param {string}  [params.endDate]   - ISO date string YYYY-MM-DD
   * @param {number}  [params.page=0]    - 0-based page index
   * @param {number}  [params.size=15]   - Page size
   * @param {string}  [params.sort]      - e.g. "id,desc"
   * @param {AbortSignal} [signal]
   * @returns {Promise<PageResponse<LicenseResponse>>}
   */
  getLicenses: async (
    { search = '', startDate = '', endDate = '', page = 0, size = 15, sort = 'id,desc' } = {},
    signal,
  ) => {
    const qs = buildQuery({ search: search.trim() || undefined, startDate, endDate, page, size, sort })
    const result = await apiFetch(`${API_BASE}${qs ? `?${qs}` : ''}`, { signal })
    return unwrap(result)
  },

  /**
   * GET /api/v1/licenses/{id}
   * Get single license details by ID.
   *
   * @param {number|string} id
   * @param {AbortSignal} [signal]
   * @returns {Promise<LicenseResponse>}
   */
  getLicense: async (id, signal) => {
    const result = await apiFetch(`${API_BASE}/${id}`, { signal })
    return unwrap(result)
  },

  /**
   * POST /api/v1/licenses
   * Create a new license. License code is server-generated.
   *
   * @param {Object} payload
   * @param {string} payload.startDate - Required, YYYY-MM-DD
   * @param {string} payload.endDate   - Required, YYYY-MM-DD
   * @param {number} payload.price     - Required, > 0
   * @returns {Promise<LicenseResponse>}
   */
  createLicense: async (payload) => {
    const result = await apiFetch(API_BASE, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return unwrap(result)
  },

  /**
   * PUT /api/v1/licenses/{id}
   * Update an existing license.
   *
   * @param {number|string} id
   * @param {Object} payload
   * @param {string} payload.startDate - Required, YYYY-MM-DD
   * @param {string} payload.endDate   - Required, YYYY-MM-DD
   * @param {number} payload.price     - Required, > 0
   * @param {boolean} [payload.status] - Active status boolean
   * @returns {Promise<LicenseResponse>}
   */
  updateLicense: async (id, payload) => {
    const result = await apiFetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
    return unwrap(result)
  },

  /**
   * DELETE /api/v1/licenses/{id}
   * Delete a license. Blocked by backend if vehicle assignments exist.
   *
   * @param {number|string} id
   * @returns {Promise<void>}
   */
  deleteLicense: async (id) => {
    const result = await apiFetch(`${API_BASE}/${id}`, {
      method: 'DELETE',
    })
    return unwrap(result)
  },
}

export default licenseService
