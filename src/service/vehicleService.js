/**
 * Vehicle Service
 *
 * API base: /api/material-grid/vehicles
 *
 * Matches the controller contract:
 *   GET  /search?query=          → ApiResponse<List<VehicleResponse>>
 *   GET  /?search=&page=&size=   → ApiResponse<PageResponse<VehicleResponse>>
 *   POST /                       → ApiResponse<VehicleResponse>
 *   PUT  /{id}                   → ApiResponse<VehicleResponse>
 *   PATCH /{id}/status?status=   → ApiResponse<VehicleResponse>
 */

const API_BASE = `${import.meta.env.VITE_API_URL}/api/v1/vehicles`

// ─── Response unwrapper ──────────────────────────────────────────────────────
// Handles: ApiResponse<T>  → { success, message, data }
//          CommonResponseDTO → { status, message, data }
//          raw array / object fallback
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

export const vehicleService = {
  /**
   * GET /api/v1/vehicles?search=&size=50
   * Auto-complete / dropdown search — returns vehicles matching query.
   * Used by: Receipts page async select dropdown.
   *
   * @param {string} [query] - Search term (vehicle number)
   * @param {AbortSignal} [signal]
   * @returns {Promise<Array<VehicleResponse>>}
   */
  searchVehicles: async (query = '', signal) => {
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
   * Alias for Receipts page: returns active vehicles for dropdown.
   */
  getAllVehicles: async (signal) => {
    return vehicleService.searchVehicles('', signal)
  },

  /**
   * GET /api/material-grid/vehicles?search=&page=&size=
   * Paginated list — returns ALL vehicles (active + inactive).
   * Used by: Vehicle Management page table.
   *
   * @param {Object} [params]
   * @param {string}  [params.search]  - Filter by vehicle number
   * @param {number}  [params.page=0]  - 0-based page index
   * @param {number}  [params.size=20] - Page size
   * @param {string}  [params.sort]    - e.g. "vehicleNumber,asc"
   * @param {AbortSignal} [signal]
   * @returns {Promise<PageResponse<VehicleResponse>>}
   *   { content: [], totalElements, totalPages, number, size }
   */
  getVehicles: async ({ search = '', page = 0, size = 20, sort = 'id,asc' } = {}, signal) => {
    const qs = buildQuery({ search, page, size, sort })
    const result = await apiFetch(`${API_BASE}?${qs}`, { signal })
    return unwrap(result) // PageResponse: { content, totalElements, totalPages, number, size }
  },

  /**
   * POST /api/material-grid/vehicles
   * Create a new vehicle.
   *
   * @param {Object} payload
   * @param {string} payload.vehicleNumber  - Required, e.g. "LC-4838"
   * @param {number} payload.capacity       - Required, e.g. 4.5 (cubic meters)
   * @param {string} [payload.status]       - "ACTIVE" | "INACTIVE" (default ACTIVE)
   * @returns {Promise<VehicleResponse>}
   */
  createVehicle: async (payload) => {
    const result = await apiFetch(API_BASE, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return unwrap(result)
  },

  /**
   * PUT /api/material-grid/vehicles/{id}
   * Update an existing vehicle (capacity / status).
   *
   * @param {number|string} id
   * @param {Object} payload  - { capacity, status }
   * @returns {Promise<VehicleResponse>}
   */
  updateVehicle: async (id, payload) => {
    const result = await apiFetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
    return unwrap(result)
  },

  /**
   * PATCH /api/material-grid/vehicles/{id}/status?status=INACTIVE
   * Toggle vehicle active / inactive.
   *
   * @param {number|string} id
   * @param {string} status - "ACTIVE" | "INACTIVE"
   * @returns {Promise<VehicleResponse>}
   */
  toggleVehicleStatus: async (id, status) => {
    const result = await apiFetch(`${API_BASE}/${id}/status?status=${encodeURIComponent(status)}`, {
      method: 'PATCH',
    })
    return unwrap(result)
  },

  /**
   * DELETE /api/material-grid/vehicles/{id}
   * Permanently delete a vehicle.
   *
   * @param {number|string} id
   * @returns {Promise<void>}
   */
  deleteVehicle: async (id) => {
    const result = await apiFetch(`${API_BASE}/${id}`, { method: 'DELETE' })
    return unwrap(result)
  },

  /**
   * POST /api/v1/vehicles/upload
   * Upload vehicle Excel/CSV file to backend endpoint (Vehicle Number | Capacity(cube)).
   *
   * @param {File} file
   * @param {AbortSignal} [signal]
   * @returns {Promise<any>}
   */
  bulkUploadVehiclesFile: async (file, signal) => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData,
      signal,
    })

    const contentType = response.headers.get('content-type')
    let result = null
    if (contentType && contentType.includes('application/json')) {
      try {
        result = await response.json()
      } catch {
        result = null
      }
    } else {
      result = await response.text().catch(() => '')
    }

    if (!response.ok || (result && typeof result === 'object' && result.success === false)) {
      let errorMessage =
        typeof result === 'object' && result?.message
          ? result.message
          : `Server responded with status: ${response.status}`

      const err = new Error(errorMessage)
      err.response = result
      err.status = response.status
      err.errors = result?.data?.errors || result?.errors || []
      throw err
    }

    return result
  },

  /**
   * Bulk create vehicles with batching and progress tracking.
   * Concurrently processes chunks to maintain fast, reliable ingestion.
   *
   * @param {Array<{vehicleNumber: string, capacity: number, status?: string}>} vehiclesList
   * @param {Function} [onProgress] - Callback (current, total, percentage)
   * @returns {Promise<{successful: Array, failed: Array}>}
   */
  bulkCreateVehicles: async (vehiclesList = [], onProgress) => {
    const total = vehiclesList.length
    if (total === 0) return { successful: [], failed: [] }

    const successful = []
    const failed = []
    const CHUNK_SIZE = 5

    for (let i = 0; i < total; i += CHUNK_SIZE) {
      const chunk = vehiclesList.slice(i, i + CHUNK_SIZE)
      const promises = chunk.map(async (v) => {
        try {
          const res = await vehicleService.createVehicle({
            vehicleNumber: v.vehicleNumber.trim().toUpperCase(),
            capacity: Number(v.capacity),
          })
          successful.push({ ...v, result: res })
        } catch (err) {
          failed.push({ ...v, error: err.message || 'Failed to create' })
        }
      })

      await Promise.all(promises)

      const processed = Math.min(i + CHUNK_SIZE, total)
      if (typeof onProgress === 'function') {
        onProgress(processed, total, Math.round((processed / total) * 100))
      }
    }

    return { successful, failed }
  },
}

export default vehicleService
