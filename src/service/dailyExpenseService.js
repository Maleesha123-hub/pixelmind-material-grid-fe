/**
 * Daily Expenses Service
 * Handles communication with Spring Boot Vehicle Expense endpoints
 *
 * Endpoints:
 *   GET    /api/v1/vehicle-expenses
 *   GET    /api/v1/vehicle-expenses/{id}
 *   POST   /api/v1/vehicle-expenses
 *   PUT    /api/v1/vehicle-expenses/{id}
 *   DELETE /api/v1/vehicle-expenses/{id}
 *
 * @module dailyExpenseService
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

// ─── Response unwrapper ──────────────────────────────────────────────────────
const unwrap = (result) => {
  if (!result) return []
  if (Array.isArray(result)) return result
  if (Array.isArray(result.data)) return result.data
  if (result.data?.content && Array.isArray(result.data.content)) return result.data.content
  if (result.data?.items && Array.isArray(result.data.items)) return result.data.items
  if (Array.isArray(result.payload)) return result.payload
  if (result.content && Array.isArray(result.content)) return result.content
  if (result.items && Array.isArray(result.items)) return result.items
  if (result.data !== undefined) return result.data
  return result
}

// ─── Build Query String Helper ────────────────────────────────────────────────
const buildQuery = (params) => {
  const q = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== null && v !== undefined && v !== '' && v !== 'ALL') {
      q.append(k, v)
    }
  })
  return q.toString()
}

// ─── Shared JSON Fetcher ─────────────────────────────────────────────────────
const apiFetch = async (url, options = {}) => {
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }

  const response = await fetch(url, { ...options, headers })

  if (!response.ok) {
    let errorMessage = `Server responded with status: ${response.status}`
    try {
      const err = await response.json()
      errorMessage =
        err.message ||
        err.data?.message ||
        err.error ||
        (Array.isArray(err.errors) ? err.errors.join(', ') : null) ||
        JSON.stringify(err)
    } catch {
      const text = await response.text().catch(() => '')
      if (text) errorMessage = text
    }
    throw new Error(errorMessage)
  }

  const contentType = response.headers.get('content-type')
  if (contentType && contentType.includes('application/json')) {
    return response.json()
  }
  return response.text()
}

export const dailyExpenseService = {
  /**
   * GET /api/v1/vehicle-expenses
   * Fetch paginated list of vehicle daily expenses with optional filters
   *
   * @param {Object} [params]
   * @param {string} [params.date] - Filter by expense date (YYYY-MM-DD)
   * @param {string} [params.expenseDate] - Alternate param for expense date
   * @param {string} [params.createdDate] - Filter by creation date (YYYY-MM-DD)
   * @param {string|number} [params.vehicleId] - Filter by vehicle ID
   * @param {string|number} [params.fileHistoryId] - Filter by Excel upload batch ID
   * @param {string} [params.uploadedExcel] - Filter by Excel file name
   * @param {string} [params.search] - General search query
   * @param {number} [params.page=0] - Page index (0-based)
   * @param {number} [params.size=15] - Page size
   * @param {string} [params.sort='id,desc'] - Sort criteria
   * @param {AbortSignal} [signal]
   * @returns {Promise<any>}
   */
  getDailyExpenses: async (params = {}, signal) => {
    const qs = buildQuery({
      date: params.date || params.expenseDate || undefined,
      expenseDate: params.expenseDate || params.date || undefined,
      createdDate: params.createdDate || undefined,
      vehicleId: params.vehicleId || undefined,
      fileHistoryId: params.fileHistoryId || undefined,
      fileName: params.fileName || undefined,
      uploadedExcel: params.uploadedExcel || undefined,
      search: params.search || undefined,
      page: params.page ?? 0,
      size: params.size ?? 15,
      sort: params.sort || 'id,desc',
    })

    const url = `${BASE_URL}/api/v1/vehicle-expenses?${qs}`
    const result = await apiFetch(url, { method: 'GET', signal })
    return unwrap(result)
  },

  /**
   * GET /api/v1/vehicle-expenses/{id}
   * Fetch single daily expense by ID
   * @param {number|string} id
   * @param {AbortSignal} [signal]
   * @returns {Promise<any>}
   */
  getDailyExpenseById: async (id, signal) => {
    const result = await apiFetch(`${BASE_URL}/api/v1/vehicle-expenses/${id}`, {
      method: 'GET',
      signal,
    })
    return unwrap(result)
  },

  /**
   * POST /api/v1/vehicle-expenses
   * Create a new daily expense record
   * @param {Object} payload - { date/expenseDate, vehicleId, amount, expenseType/category, ... }
   * @param {AbortSignal} [signal]
   * @returns {Promise<any>}
   */
  createDailyExpense: async (payload, signal) => {
    const result = await apiFetch(`${BASE_URL}/api/v1/vehicle-expenses`, {
      method: 'POST',
      body: JSON.stringify(payload),
      signal,
    })
    return unwrap(result)
  },

  /**
   * PUT /api/v1/vehicle-expenses/{id}
   * Update an existing daily expense record
   * @param {number|string} id
   * @param {Object} payload
   * @param {AbortSignal} [signal]
   * @returns {Promise<any>}
   */
  updateDailyExpense: async (id, payload, signal) => {
    const result = await apiFetch(`${BASE_URL}/api/v1/vehicle-expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
      signal,
    })
    return unwrap(result)
  },

  /**
   * DELETE /api/v1/vehicle-expenses/{id}
   * Delete a daily expense entry
   * @param {number|string} id
   * @param {AbortSignal} [signal]
   * @returns {Promise<any>}
   */
  deleteDailyExpense: async (id, signal) => {
    const result = await apiFetch(`${BASE_URL}/api/v1/vehicle-expenses/${id}`, {
      method: 'DELETE',
      signal,
    })
    return unwrap(result)
  },
}

export default dailyExpenseService
