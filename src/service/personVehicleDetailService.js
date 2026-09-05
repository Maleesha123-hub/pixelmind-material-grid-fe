/**
 * Person Vehicle Detail (Excavator Inspection & Checked By) Service
 * Handles communication with Spring Boot PersonVehicleDetailController
 *
 * Endpoints:
 *   GET    /api/v1/person-vehicle-details
 *   GET    /api/v1/person-vehicle-details/{id}
 *   POST   /api/v1/person-vehicle-details
 *   PUT    /api/v1/person-vehicle-details/{id}
 *   DELETE /api/v1/person-vehicle-details/{id}
 *
 * @module personVehicleDetailService
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'
const API_BASE = `${BASE_URL}/api/v1/person-vehicle-details`

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

// ─── Shared Binary Blob Fetcher for Backend PDF ──────────────────────────────
const apiFetchBlob = async (url, options = {}) => {
  const headers = {
    Accept: 'application/pdf, application/octet-stream, */*',
    ...(options.headers || {}),
  }

  const response = await fetch(url, {
    headers,
    ...options,
  })

  if (!response.ok) {
    let errorMessage = `Server returned status: ${response.status}`
    try {
      const errJson = await response.json()
      errorMessage = errJson.message || errJson.error || JSON.stringify(errJson)
    } catch {
      const errText = await response.text().catch(() => '')
      if (errText) errorMessage = errText
    }
    throw new Error(errorMessage)
  }

  const blob = await response.blob()

  // Ensure blob has application/pdf type
  if (!blob.type || blob.type === 'application/octet-stream' || !blob.type.includes('pdf')) {
    return new Blob([blob], { type: 'application/pdf' })
  }
  return blob
}

export const personVehicleDetailService = {
  /**
   * GET /api/v1/person-vehicle-details
   * Fetch paginated list of person vehicle detail assignments with filters:
   * (personId, vehicleId, date, startDate, endDate, createdDate, fileHistoryId, page, size, sort)
   *
   * @param {Object} [params]
   * @param {number|string} [params.personId] - Filter by person ID
   * @param {number|string} [params.vehicleId] - Filter by vehicle ID
   * @param {string} [params.date] - Filter by inspection date (YYYY-MM-DD)
   * @param {string} [params.startDate] - Filter by start date range
   * @param {string} [params.endDate] - Filter by end date range
   * @param {string} [params.createdDate] - Filter by creation date (YYYY-MM-DD)
   * @param {number|string} [params.fileHistoryId] - Filter by Excel upload batch ID
   * @param {number} [params.page=0] - Page index (0-based)
   * @param {number} [params.size=15] - Page size
   * @param {string} [params.sort='id,desc'] - Sort criteria
   * @param {AbortSignal} [signal]
   * @returns {Promise<any>}
   */
  getPersonVehicleDetails: async (params = {}, signal) => {
    const qs = buildQuery({
      personId: params.personId || undefined,
      vehicleId: params.vehicleId || undefined,
      date: params.date || undefined,
      startDate: params.startDate || undefined,
      endDate: params.endDate || undefined,
      createdDate: params.createdDate || undefined,
      fileHistoryId: params.fileHistoryId || undefined,
      page: params.page !== undefined ? params.page : 0,
      size: params.size || 15,
      sort: params.sort || 'id,desc',
    })

    const url = `${API_BASE}?${qs}`
    const result = await apiFetch(url, { signal })
    return unwrap(result)
  },

  /**
   * GET /api/v1/person-vehicle-details/{id}
   * Get single inspection detail record by ID.
   *
   * @param {number|string} id
   * @param {AbortSignal} [signal]
   * @returns {Promise<any>}
   */
  getPersonVehicleDetail: async (id, signal) => {
    const result = await apiFetch(`${API_BASE}/${id}`, { signal })
    return unwrap(result)
  },

  /**
   * POST /api/v1/person-vehicle-details
   * Create a new person vehicle detail assignment.
   *
   * @param {Object} payload
   * @param {string} payload.date - YYYY-MM-DD
   * @param {number|string} payload.personId
   * @param {number|string} payload.vehicleId
   * @param {AbortSignal} [signal]
   * @returns {Promise<any>}
   */
  createPersonVehicleDetail: async (payload, signal) => {
    const body = {
      date: payload.date,
      personId: Number(payload.personId),
      vehicleId: Number(payload.vehicleId),
    }

    const result = await apiFetch(API_BASE, {
      method: 'POST',
      body: JSON.stringify(body),
      signal,
    })
    return unwrap(result)
  },

  /**
   * PUT /api/v1/person-vehicle-details/{id}
   * Update an existing person vehicle detail record.
   *
   * @param {number|string} id
   * @param {Object} payload
   * @param {string} payload.date - YYYY-MM-DD
   * @param {number|string} payload.personId
   * @param {number|string} payload.vehicleId
   * @param {AbortSignal} [signal]
   * @returns {Promise<any>}
   */
  updatePersonVehicleDetail: async (id, payload, signal) => {
    const body = {
      date: payload.date,
      personId: Number(payload.personId),
      vehicleId: Number(payload.vehicleId),
    }

    const result = await apiFetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
      signal,
    })
    return unwrap(result)
  },

  /**
   * DELETE /api/v1/person-vehicle-details/{id}
   * Soft-delete a record.
   *
   * @param {number|string} id
   * @param {AbortSignal} [signal]
   * @returns {Promise<any>}
   */
  deletePersonVehicleDetail: async (id, signal) => {
    const result = await apiFetch(`${API_BASE}/${id}`, {
      method: 'DELETE',
      signal,
    })
    return unwrap(result)
  },

  /**
   * GET /api/v1/person-vehicle-details/report/preview
   * Retrieve PDF report blob for inline preview.
   *
   * @param {Object} params
   * @param {number|string} params.personId
   * @param {string} params.startDate - YYYY-MM-DD
   * @param {string} params.endDate - YYYY-MM-DD
   * @param {AbortSignal} [signal]
   * @returns {Promise<Blob>}
   */
  getReportPdfPreviewBlob: async ({ personId, startDate, endDate }, signal) => {
    const qs = buildQuery({ personId, startDate, endDate })
    const url = `${API_BASE}/report/preview?${qs}`
    return apiFetchBlob(url, { method: 'GET', signal })
  },

  /**
   * GET /api/v1/person-vehicle-details/report/download
   * Directly download the PDF report attachment.
   *
   * @param {Object} params
   * @param {number|string} params.personId
   * @param {string} params.startDate - YYYY-MM-DD
   * @param {string} params.endDate - YYYY-MM-DD
   * @param {string} [params.fileName]
   * @param {AbortSignal} [signal]
   */
  downloadReportPdf: async ({ personId, startDate, endDate, fileName }, signal) => {
    const qs = buildQuery({ personId, startDate, endDate })
    const url = `${API_BASE}/report/download?${qs}`
    const blob = await apiFetchBlob(url, { method: 'GET', signal })

    const dateLabel =
      startDate && endDate ? `${startDate}_to_${endDate}` : startDate || endDate || 'report'
    const resolvedFileName =
      fileName || `Person_Vehicle_Report_Person_${personId}_${dateLabel}.pdf`

    const blobUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = resolvedFileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    setTimeout(() => {
      URL.revokeObjectURL(blobUrl)
    }, 1000)
  },
}

export default personVehicleDetailService
