/**
 * Route Service
 *
 * API base: /api/v1/routes
 *
 * Matches the controller contract:
 *   GET  /search?query=          → ApiResponse<List<RouteResponse>>
 *   GET  /?search=&page=&size=   → ApiResponse<PageResponse<RouteResponse>>
 *   POST /                       → ApiResponse<RouteResponse>
 *   PUT  /{id}                   → ApiResponse<RouteResponse>
 *   PATCH /{id}/status?status=   → ApiResponse<RouteResponse>
 *   DELETE /{id}                 → ApiResponse<void>
 */

const API_BASE = `${import.meta.env.VITE_API_URL}/api/v1/routes`

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

  const result = await response.json()
  if (result && result.success === false) {
    throw new Error(result.message || 'Operation failed')
  }
  return result
}

// ─── Build query string helper ────────────────────────────────────────────────
const buildQuery = (params) => {
  const q = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== null && v !== undefined && v !== '') q.append(k, v)
  })
  return q.toString()
}

export const routeService = {
  /**
   * GET /api/v1/routes/search?query=
   * Auto-complete / dropdown search — returns active routes.
   *
   * @param {string} [query] - Search term
   * @param {AbortSignal} [signal]
   * @returns {Promise<Array>}
   */
  searchRoutes: async (query = '', signal) => {
    const qs = buildQuery({
      search: query.trim(),
      page: 0,
      size: 50,
      sort: 'id,asc',
    })
    const result = await apiFetch(`${API_BASE}?${qs}`, { signal })
    const data = unwrap(result)
    if (Array.isArray(data)) return data
    if (data?.content && Array.isArray(data.content)) return data.content
    if (data?.items && Array.isArray(data.items)) return data.items
    return []
  },

  /**
   * Alias: returns active routes for dropdowns.
   */
  getAllRoutes: async (signal) => {
    return routeService.searchRoutes('', signal)
  },

  /**
   * GET /api/v1/routes?search=&page=&size=&status=&sort=
   * Paginated list of routes.
   *
   * @param {Object} [params]
   * @param {string}  [params.search]
   * @param {string}  [params.status]
   * @param {number}  [params.page=0]
   * @param {number}  [params.size=20]
   * @param {string}  [params.sort="id,asc"]
   * @param {AbortSignal} [signal]
   * @returns {Promise<Object>}
   */
  getRoutes: async (
    { search = '', status = '', page = 0, size = 15, sort = 'id,asc' } = {},
    signal,
  ) => {
    const qs = buildQuery({ search, status: status === 'ALL' ? '' : status, page, size, sort })
    const result = await apiFetch(`${API_BASE}?${qs}`, { signal })
    return unwrap(result)
  },

  /**
   * POST /api/v1/routes
   * Create a new route.
   *
   * @param {Object} payload
   * @param {string} payload.startLocation  - Required, e.g. "Quarry Site A"
   * @param {string} payload.endLocation    - Required, e.g. "Plant 1"
   * @param {number} payload.km             - Required, e.g. 24.5
   * @param {number} payload.price          - Required, e.g. 1500.00
   * @param {boolean|string} [payload.status] - true/false or ACTIVE/INACTIVE
   * @returns {Promise<Object>}
   */
  createRoute: async (payload) => {
    const result = await apiFetch(API_BASE, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return unwrap(result)
  },

  /**
   * PUT /api/v1/routes/{id}
   * Update an existing route.
   *
   * @param {number|string} id
   * @param {Object} payload - { startLocation, endLocation, km, price, status }
   * @returns {Promise<Object>}
   */
  updateRoute: async (id, payload) => {
    const result = await apiFetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
    return unwrap(result)
  },

  /**
   * PATCH /api/v1/routes/{id}/status?status=
   * Toggle route status.
   *
   * @param {number|string} id
   * @param {string|boolean} status
   * @returns {Promise<Object>}
   */
  toggleRouteStatus: async (id, status) => {
    const statusParam = typeof status === 'boolean' ? (status ? 'ACTIVE' : 'INACTIVE') : status
    const result = await apiFetch(
      `${API_BASE}/${id}/status?status=${encodeURIComponent(statusParam)}`,
      { method: 'PATCH' },
    )
    return unwrap(result)
  },

  /**
   * DELETE /api/v1/routes/{id}
   * Permanently delete a route.
   *
   * @param {number|string} id
   * @returns {Promise<void>}
   */
  deleteRoute: async (id) => {
    const result = await apiFetch(`${API_BASE}/${id}`, { method: 'DELETE' })
    return unwrap(result)
  },
}

export default routeService
