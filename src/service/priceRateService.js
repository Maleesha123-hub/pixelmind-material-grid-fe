/**
 * Price Rate Service
 *
 * API base: /api/v1/price-rates
 *
 * Matches the PriceRateController contract:
 *   GET    /api/v1/price-rates?status=&page=&size=&sort= → ApiResponse<PageResponse<PriceRateResponse>>
 *   GET    /api/v1/price-rates/active                   → ApiResponse<PriceRateResponse>
 *   GET    /api/v1/price-rates/{id}                     → ApiResponse<PriceRateResponse>
 *   POST   /api/v1/price-rates                          → ApiResponse<PriceRateResponse> { price, status: "ACTIVE" }
 *   PUT    /api/v1/price-rates/{id}                     → ApiResponse<PriceRateResponse> { price, status }
 *   DELETE /api/v1/price-rates/{id}                     → 204 No Content
 *
 * @module priceRateService
 */

const API_BASE = `${import.meta.env.VITE_API_URL}/api/v1/price-rates`

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

export const priceRateService = {
  /**
   * GET /api/v1/price-rates?status=&page=&size=&sort=
   * Paginated list of price rates, filterable by status.
   *
   * @param {Object} [params]
   * @param {string}  [params.status]   - "ACTIVE" | "INACTIVE"
   * @param {number}  [params.page=0]   - 0-based page index
   * @param {number}  [params.size=15]  - Page size
   * @param {string}  [params.sort]     - e.g. "id,desc"
   * @param {AbortSignal} [signal]
   * @returns {Promise<PageResponse<PriceRateResponse>>}
   */
  getPriceRates: async ({ status = '', page = 0, size = 15, sort = 'id,desc' } = {}, signal) => {
    const qs = buildQuery({ status: status !== 'ALL' ? status : undefined, page, size, sort })
    const result = await apiFetch(`${API_BASE}${qs ? `?${qs}` : ''}`, { signal })
    return unwrap(result)
  },

  /**
   * GET /api/v1/price-rates/active
   * Retrieves the currently active price rate.
   *
   * @param {AbortSignal} [signal]
   * @returns {Promise<PriceRateResponse>}
   */
  getActivePriceRate: async (signal) => {
    try {
      const result = await apiFetch(`${API_BASE}/active`, { signal })
      return unwrap(result)
    } catch (err) {
      return null
    }
  },

  /**
   * GET /api/v1/price-rates/{id}
   * Get single price rate by ID.
   *
   * @param {number|string} id
   * @param {AbortSignal} [signal]
   * @returns {Promise<PriceRateResponse>}
   */
  getPriceRate: async (id, signal) => {
    const result = await apiFetch(`${API_BASE}/${id}`, { signal })
    return unwrap(result)
  },

  /**
   * POST /api/v1/price-rates
   * Create a new price rate. When created with status ACTIVE, previously active rates are automatically deactivated.
   *
   * @param {Object} payload
   * @param {number} payload.price  - Required, > 0
   * @param {string} [payload.status="ACTIVE"] - "ACTIVE" | "INACTIVE"
   * @returns {Promise<PriceRateResponse>}
   */
  createPriceRate: async (payload) => {
    const body = {
      price: Number(payload.price),
      status: payload.status || 'ACTIVE',
    }
    const result = await apiFetch(API_BASE, {
      method: 'POST',
      body: JSON.stringify(body),
    })
    return unwrap(result)
  },

  /**
   * PUT /api/v1/price-rates/{id}
   * Update an existing price rate.
   *
   * @param {number|string} id
   * @param {Object} payload
   * @param {number} payload.price
   * @param {string} payload.status - "ACTIVE" | "INACTIVE"
   * @returns {Promise<PriceRateResponse>}
   */
  updatePriceRate: async (id, payload) => {
    const body = {
      price: Number(payload.price),
      status: payload.status,
    }
    const result = await apiFetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
    return unwrap(result)
  },

  /**
   * DELETE /api/v1/price-rates/{id}
   * Delete a price rate. Blocked by backend if rate is ACTIVE or referenced by daily routes.
   *
   * @param {number|string} id
   * @returns {Promise<void>}
   */
  deletePriceRate: async (id) => {
    const result = await apiFetch(`${API_BASE}/${id}`, {
      method: 'DELETE',
    })
    return unwrap(result)
  },
}

export default priceRateService
