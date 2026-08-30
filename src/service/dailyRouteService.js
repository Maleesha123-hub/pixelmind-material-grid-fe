/**
 * Daily Route & Receipts Service
 * Handles direct communication with Spring Boot DailyRouteReportController & DailyRouteController
 *
 * Endpoints:
 *   GET  /api/v1/daily-routes/report/summary?date=...&vehicleId=... → CommonResponseDTO (Receipt Summary)
 *   GET  /api/v1/daily-routes/report/preview?date=...&vehicleId=... → Binary PDF Stream (application/pdf)
 *   GET  /api/v1/daily-routes/report/download?date=...&vehicleId=... → Binary PDF Stream (application/pdf)
 *
 * @module dailyRouteService
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

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
   * GET /api/v1/daily-routes?date=&createdDate=&billNumber=&vehicleId=&routeId=&uploadedExcel=&search=&page=&size=&sort=
   * Fetch paginated daily routes with filters
   *
   * @param {Object} [params]
   * @param {string} [params.date] - Filter by daily route date (YYYY-MM-DD)
   * @param {string} [params.createdDate] - Filter by creation date (YYYY-MM-DD)
   * @param {string} [params.billNumber] - Filter by bill number
   * @param {string|number} [params.vehicleId] - Filter by vehicle ID
   * @param {string|number} [params.routeId] - Filter by route ID
   * @param {string} [params.uploadedExcel] - Filter by uploaded Excel file/batch
   * @param {string} [params.search] - General search term
   * @param {number} [params.page=0] - Page number (0-based)
   * @param {number} [params.size=15] - Page size
   * @param {string} [params.sort='id,desc'] - Sort order
   * @param {AbortSignal} [signal]
   * @returns {Promise<any>}
   */
  getDailyRoutes: async (params = {}, signal) => {
    const qs = buildQuery({
      date: params.date || undefined,
      createdDate: params.createdDate || undefined,
      billNumber: params.billNumber || undefined,
      vehicleId: params.vehicleId || undefined,
      routeId: params.routeId || undefined,
      fileHistoryId: params.fileHistoryId || undefined,
      fileName: params.fileName || undefined,
      uploadedExcel: params.uploadedExcel || undefined,
      search: params.search || undefined,
      page: params.page ?? 0,
      size: params.size ?? 15,
      sort: params.sort || 'id,desc',
    })

    const endpoints = [
      `${BASE_URL}/api/v1/daily-routes?${qs}`,
    ]

    let lastError = null
    for (let i = 0; i < endpoints.length; i++) {
      try {
        const result = await apiFetch(endpoints[i], { method: 'GET', signal })
        return unwrap(result)
      } catch (err) {
        if (signal?.aborted) throw err
        lastError = err
      }
    }

    throw lastError || new Error('Failed to load daily routes from backend')
  },

  /**
   * GET /api/v1/daily-routes/{id}
   * @param {number|string} id
   * @param {AbortSignal} [signal]
   * @returns {Promise<any>}
   */
  getDailyRouteById: async (id, signal) => {
    const result = await apiFetch(`${BASE_URL}/api/v1/daily-routes/${id}`, {
      method: 'GET',
      signal,
    })
    return unwrap(result)
  },

  /**
   * POST /api/v1/daily-routes
   * Create single daily route entry
   * @param {Object} payload - { date, billNumber, vehicleId, routeId, ... }
   * @param {AbortSignal} [signal]
   * @returns {Promise<any>}
   */
  createDailyRoute: async (payload, signal) => {
    const result = await apiFetch(`${BASE_URL}/api/v1/daily-routes`, {
      method: 'POST',
      body: JSON.stringify(payload),
      signal,
    })
    return unwrap(result)
  },

  /**
   * PUT /api/v1/daily-routes/{id}
   * Update existing daily route entry
   * @param {number|string} id
   * @param {Object} payload
   * @param {AbortSignal} [signal]
   * @returns {Promise<any>}
   */
  updateDailyRoute: async (id, payload, signal) => {
    const result = await apiFetch(`${BASE_URL}/api/v1/daily-routes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
      signal,
    })
    return unwrap(result)
  },

  /**
   * DELETE /api/v1/daily-routes/{id}
   * Delete daily route entry
   * @param {number|string} id
   * @param {AbortSignal} [signal]
   * @returns {Promise<any>}
   */
  deleteDailyRoute: async (id, signal) => {
    const result = await apiFetch(`${BASE_URL}/api/v1/daily-routes/${id}`, {
      method: 'DELETE',
      signal,
    })
    return unwrap(result)
  },

  /**
   * GET /api/v1/file-histories/by-file-type?fileType=DAILY_ROUTE&fileName=
   * Get list of unique uploaded Excel sheets / batches
   * @param {string} [fileName=''] - Search term for file name
   * @param {AbortSignal} [signal]
   * @returns {Promise<Array>}
   */
  getUploadedExcelList: async (fileName = '', signal) => {
    const qs = buildQuery({ fileType: 'DAILY_ROUTE', fileName: typeof fileName === 'string' ? fileName.trim() || undefined : undefined })
    try {
      const result = await apiFetch(`${BASE_URL}/api/v1/file-histories/by-file-type?${qs}`, {
        method: 'GET',
        signal,
      })
      const data = unwrap(result)
      if (Array.isArray(data)) return data
      if (data?.content && Array.isArray(data.content)) return data.content
      if (data?.items && Array.isArray(data.items)) return data.items
      return []
    } catch (err) {
      if (err.name === 'AbortError') throw err
      return []
    }
  },
  /**
   * Fetch receipt summary from DailyRouteReportController.getSummary
   * GET /api/v1/daily-routes/report/summary?startDate=...&endDate=...&date=...&vehicleId=...
   *
   * @param {Object|string} paramsOrDate - Object with { startDate, endDate, date, vehicleId } or date string
   * @param {string|number} [maybeEndDateOrVehId] - End date or numeric vehicle ID
   * @param {string|number} [maybeVehicleId] - Numeric vehicle ID
   * @param {AbortSignal} [signal]
   * @returns {Promise<any>}
   */
  getSummary: async (paramsOrDate, maybeEndDateOrVehId = 'ALL', maybeVehicleId = 'ALL', signal) => {
    // TODO: implement feature in future
    return {}

    let startDate = ''
    let endDate = ''
    let date = ''
    let vehicleId = 'ALL'
    let abortSignal = signal

    if (
      typeof paramsOrDate === 'object' &&
      paramsOrDate !== null &&
      !(paramsOrDate instanceof AbortSignal)
    ) {
      startDate = paramsOrDate.startDate || ''
      endDate = paramsOrDate.endDate || ''
      date = paramsOrDate.date || ''
      vehicleId = paramsOrDate.vehicleId || 'ALL'
      abortSignal = maybeEndDateOrVehId instanceof AbortSignal ? maybeEndDateOrVehId : signal
    } else {
      if (typeof maybeEndDateOrVehId === 'string' && maybeEndDateOrVehId.includes('-')) {
        startDate = paramsOrDate || ''
        endDate = maybeEndDateOrVehId || ''
        vehicleId = maybeVehicleId || 'ALL'
      } else {
        date = paramsOrDate || ''
        vehicleId = maybeEndDateOrVehId || 'ALL'
        abortSignal = maybeVehicleId instanceof AbortSignal ? maybeVehicleId : signal
      }
    }

    const vehIdParam = vehicleId === 'ALL' ? '' : vehicleId
    const qs = buildQuery({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      date: !startDate && !endDate && date ? date : startDate && !endDate ? startDate : undefined,
      vehicleId: vehIdParam,
    })

    const endpoints = [`${BASE_URL}/api/v1/daily-routes/report/summary?${qs}`]

    let lastError = null
    for (let i = 0; i < endpoints.length; i++) {
      try {
        const result = await apiFetch(endpoints[i], { method: 'GET', signal: abortSignal })
        return unwrap(result)
      } catch (err) {
        if (abortSignal?.aborted) throw err
        lastError = err
      }
    }

    throw lastError || new Error('Failed to load receipt summary from backend')
  },

  /**
   * Alias for backward compatibility
   */
  getReceiptPreviewData: async (date, vehicleId = 'ALL', signal) => {
    return dailyRouteService.getSummary(date, vehicleId, signal)
  },

  /**
   * Fetch backend-generated PDF receipt stream as a Blob (application/pdf)
   * Calls DailyRouteReportController.preview
   *
   * @param {Object} params
   * @param {string} [params.startDate] - Start Date YYYY-MM-DD
   * @param {string} [params.endDate]   - End Date YYYY-MM-DD
   * @param {string} [params.date]      - Date in YYYY-MM-DD format
   * @param {string|number} [params.vehicleId] - Vehicle ID
   * @param {AbortSignal} [params.signal]
   * @returns {Promise<Blob>}
   */
  getReceiptPdfBlob: async (
    { startDate = '', endDate = '', date = '', vehicleId = 'ALL' } = {},
    signal,
  ) => {
    const vehIdParam = vehicleId === 'ALL' ? '' : vehicleId
    const qs = buildQuery({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      date: !startDate && !endDate && date ? date : startDate && !endDate ? startDate : undefined,
      vehicleId: vehIdParam,
    })

    const endpoints = [`${BASE_URL}/api/v1/daily-routes/report/preview?${qs}`]

    let lastError = null
    for (let i = 0; i < endpoints.length; i++) {
      try {
        return await apiFetchBlob(endpoints[i], { method: 'GET', signal })
      } catch (err) {
        if (signal?.aborted) throw err
        lastError = err
      }
    }

    throw lastError || new Error('Failed to retrieve PDF receipt from backend')
  },

  /**
   * Directly download the backend-generated PDF receipt to the client
   * Calls DailyRouteReportController.download
   *
   * @param {Object} params
   * @param {string} [params.startDate]
   * @param {string} [params.endDate]
   * @param {string} [params.date]
   * @param {string|number} [params.vehicleId]
   * @param {string} [params.fileName]
   * @param {AbortSignal} [params.signal]
   */
  downloadReceiptPdf: async (
    { startDate = '', endDate = '', date = '', vehicleId = 'ALL', fileName = '' } = {},
    signal,
  ) => {
    const vehIdParam = vehicleId === 'ALL' ? '' : vehicleId
    const qs = buildQuery({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      date: !startDate && !endDate && date ? date : startDate && !endDate ? startDate : undefined,
      vehicleId: vehIdParam,
    })

    const downloadEndpoints = [`${BASE_URL}/api/v1/daily-routes/report/download?${qs}`]

    let blob = null
    let lastError = null
    for (let i = 0; i < downloadEndpoints.length; i++) {
      try {
        blob = await apiFetchBlob(downloadEndpoints[i], { method: 'GET', signal })
        if (blob) break
      } catch (err) {
        if (signal?.aborted) throw err
        lastError = err
      }
    }

    if (!blob) {
      throw lastError || new Error('Failed to download PDF receipt from backend')
    }

    const dateLabel =
      startDate && endDate ? `${startDate}_to_${endDate}` : startDate || date || 'export'
    const resolvedFileName =
      fileName ||
      `Material_Grid_Receipt_${vehicleId !== 'ALL' ? `Vehicle_${vehicleId}` : 'All_Vehicles'}_${dateLabel}.pdf`

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
