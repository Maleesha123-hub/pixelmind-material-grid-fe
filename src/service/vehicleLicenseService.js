/**
 * Vehicle License Management Service
 * Handles communication with Spring Boot Vehicle License endpoints
 *
 * Endpoints:
 *   GET    /api/v1/vehicle-licenses
 *   GET    /api/v1/vehicle-licenses/{id}
 *   POST   /api/v1/vehicle-licenses
 *   PUT    /api/v1/vehicle-licenses/{id}
 *   DELETE /api/v1/vehicle-licenses/{id}
 *
 * @module vehicleLicenseService
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

// ─── Response unwrapper ──────────────────────────────────────────────────────
const unwrap = (result) => {
  if (!result) return null
  if (Array.isArray(result)) return { content: result, totalElements: result.length, totalPages: 1 }
  if (result.data !== undefined) return result.data
  if (result.payload !== undefined) return result.payload
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

  if (response.status === 204) {
    return null
  }

  const contentType = response.headers.get('content-type')
  if (contentType && contentType.includes('application/json')) {
    return response.json()
  }
  return response.text()
}

export const vehicleLicenseService = {
  /**
   * GET /api/v1/vehicle-licenses
   * Fetch paginated list of vehicle licenses with filters:
   * (licenseId, vehicleId, assignDate, createdDate, fileHistoryId, page, size, sort)
   *
   * @param {Object} [params]
   * @param {number|string} [params.licenseId] - Filter by license ID
   * @param {number|string} [params.vehicleId] - Filter by vehicle ID
   * @param {string} [params.assignDate] - Filter by assigned date (YYYY-MM-DD)
   * @param {string} [params.assignedDate] - Alternate param for assigned date
   * @param {string} [params.date] - Alternate param for assigned date
   * @param {string} [params.createdDate] - Filter by creation date (YYYY-MM-DD)
   * @param {number|string} [params.fileHistoryId] - Filter by Excel upload batch ID
   * @param {number} [params.page=0] - Page index (0-based)
   * @param {number} [params.size=15] - Page size
   * @param {string} [params.sort='id,desc'] - Sort criteria
   * @param {AbortSignal} [signal]
   * @returns {Promise<any>}
   */
  getVehicleLicenses: async (params = {}, signal) => {
    const qs = buildQuery({
      licenseId: params.licenseId || undefined,
      vehicleId: params.vehicleId || undefined,
      assignDate: params.assignDate || params.assignedDate || params.date || undefined,
      assignedDate: params.assignedDate || params.assignDate || params.date || undefined,
      date: params.date || params.assignDate || params.assignedDate || undefined,
      createdDate: params.createdDate || undefined,
      fileHistoryId: params.fileHistoryId || undefined,
      page: params.page ?? 0,
      size: params.size ?? 15,
      sort: params.sort || 'id,desc',
    })

    const url = `${BASE_URL}/api/v1/vehicle-licenses?${qs}`
    const result = await apiFetch(url, { method: 'GET', signal })
    return unwrap(result)
  },

  /**
   * GET /api/v1/vehicle-licenses/{id}
   * Fetch single vehicle license entry by ID
   * @param {number|string} id
   * @param {AbortSignal} [signal]
   * @returns {Promise<any>}
   */
  getVehicleLicenseById: async (id, signal) => {
    const result = await apiFetch(`${BASE_URL}/api/v1/vehicle-licenses/${id}`, {
      method: 'GET',
      signal,
    })
    return unwrap(result)
  },

  /**
   * POST /api/v1/vehicle-licenses
   * Assign or create a vehicle license entry
   * @param {Object} payload - { vehicleId, licenseId, assignDate/assignedDate/date, ... }
   * @param {AbortSignal} [signal]
   * @returns {Promise<any>}
   */
  createVehicleLicense: async (payload, signal) => {
    const result = await apiFetch(`${BASE_URL}/api/v1/vehicle-licenses`, {
      method: 'POST',
      body: JSON.stringify(payload),
      signal,
    })
    return unwrap(result)
  },

  /**
   * PUT /api/v1/vehicle-licenses/{id}
   * Update an existing vehicle license entry
   * @param {number|string} id
   * @param {Object} payload
   * @param {AbortSignal} [signal]
   * @returns {Promise<any>}
   */
  updateVehicleLicense: async (id, payload, signal) => {
    const result = await apiFetch(`${BASE_URL}/api/v1/vehicle-licenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
      signal,
    })
    return unwrap(result)
  },

  /**
   * DELETE /api/v1/vehicle-licenses/{id}
   * Delete a vehicle license entry
   * @param {number|string} id
   * @param {AbortSignal} [signal]
   * @returns {Promise<any>}
   */
  deleteVehicleLicense: async (id, signal) => {
    const result = await apiFetch(`${BASE_URL}/api/v1/vehicle-licenses/${id}`, {
      method: 'DELETE',
      signal,
    })
    return unwrap(result)
  },
}

export default vehicleLicenseService
