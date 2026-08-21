/**
 * Daily Route & Receipts Service
 * Handles direct communication with Spring Boot DailyRouteController
 *
 * Endpoints:
 *   GET  /api/v1/daily-routes              → ApiResponse<PageResponse<DailyRouteResponse>>
 *   GET  /api/v1/daily-routes/receipt/preview?date=...&vehicleId=... → ApiResponse<ReceiptSummaryDTO>
 *   GET  /api/v1/daily-routes/receipt/pdf?date=...&vehicleId=...  → Binary PDF Stream (application/pdf)
 *   GET  /api/v1/daily-routes/{id}/pdf     → Binary PDF Stream for single trip
 *
 * @module dailyRouteService
 */

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/v1/daily-routes`

// ─── Response unwrapper ──────────────────────────────────────────────────────
const unwrap = (result) => {
  if (result && result.data !== undefined) return result.data
  if (result && Array.isArray(result.payload)) return result.payload
  if (Array.isArray(result)) return result
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

  const response = await fetch(url, {
    headers,
    ...options,
  })

  if (!response.ok) {
    let errorMessage = `Server error: ${response.status}`
    try {
      const errJson = await response.json()
      errorMessage = errJson.message || errJson.error || JSON.stringify(errJson)
    } catch {
      const errText = await response.text().catch(() => '')
      if (errText) errorMessage = errText
    }
    throw new Error(errorMessage)
  }

  return response.json()
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

export const dailyRouteService = {
  /**
   * Fetch daily routes / trips list from DailyRouteController
   * GET /api/v1/daily-routes?date=...&vehicleId=...&page=...&size=...&search=...
   */
  getDailyRoutes: async (
    { date = '', vehicleId = '', search = '', page = 0, size = 20, sort = 'id,desc' } = {},
    signal,
  ) => {
    const qs = buildQuery({
      date,
      vehicleId: vehicleId === 'ALL' ? '' : vehicleId,
      search,
      page,
      size,
      sort,
    })

    const result = await apiFetch(`${API_BASE}${qs ? `?${qs}` : ''}`, {
      method: 'GET',
      signal,
    })
    return unwrap(result)
  },

  /**
   * Fetch receipt summary & breakdown DTO from DailyRouteController
   * GET /api/v1/daily-routes/receipt/preview?date=...&vehicleId=...
   */
  getReceiptPreviewData: async (date, vehicleId = 'ALL', signal) => {
    if (!date) {
      throw new Error('Please select a date to preview the receipt.')
    }

    const vehIdParam = vehicleId === 'ALL' ? '' : vehicleId
    const qs = buildQuery({ date, vehicleId: vehIdParam })

    const result = await apiFetch(`${API_BASE}/receipt/preview?${qs}`, {
      method: 'GET',
      signal,
    })
    return unwrap(result)
  },

  /**
   * Fetch backend-generated PDF receipt stream as a Blob (application/pdf)
   * GET /api/v1/daily-routes/receipt/pdf?date=...&vehicleId=...
   * or for single trip: GET /api/v1/daily-routes/{routeId}/pdf
   *
   * @param {Object} params
   * @param {string} [params.date] - Date in YYYY-MM-DD format
   * @param {string|number} [params.vehicleId] - Vehicle ID or ALL
   * @param {string|number} [params.routeId] - Optional specific route/trip ID
   * @param {AbortSignal} [params.signal]
   * @returns {Promise<Blob>}
   */
  getReceiptPdfBlob: async ({ date, vehicleId = 'ALL', routeId = null } = {}, signal) => {
    if (routeId) {
      return await apiFetchBlob(`${API_BASE}/${routeId}/pdf`, {
        method: 'GET',
        signal,
      })
    }

    if (!date) {
      throw new Error('Please select a date to generate the PDF receipt.')
    }

    const vehIdParam = vehicleId === 'ALL' ? '' : vehicleId
    const qs = buildQuery({ date, vehicleId: vehIdParam })

    return await apiFetchBlob(`${API_BASE}/receipt/pdf?${qs}`, {
      method: 'GET',
      signal,
    })
  },

  /**
   * Directly download the backend-generated PDF receipt to the client
   *
   * @param {Object} params
   * @param {string} [params.date]
   * @param {string|number} [params.vehicleId]
   * @param {string|number} [params.routeId]
   * @param {string} [params.fileName]
   * @param {AbortSignal} [params.signal]
   */
  downloadReceiptPdf: async (
    { date, vehicleId = 'ALL', routeId = null, fileName = '' } = {},
    signal,
  ) => {
    const blob = await dailyRouteService.getReceiptPdfBlob({ date, vehicleId, routeId }, signal)

    const resolvedFileName =
      fileName ||
      (routeId
        ? `Material_Grid_Trip_Receipt_${routeId}.pdf`
        : `Material_Grid_Receipt_${vehicleId !== 'ALL' ? `Vehicle_${vehicleId}` : 'All_Vehicles'}_${date || 'export'}.pdf`)

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

export default dailyRouteService
