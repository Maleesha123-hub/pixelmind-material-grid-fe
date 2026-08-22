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
   * Fetch receipt summary from DailyRouteReportController.getSummary(date, vehicleId)
   * GET /api/v1/daily-routes/report/summary?date=YYYY-MM-DD&vehicleId=...
   *
   * @param {string} date - Date in YYYY-MM-DD format
   * @param {string|number} [vehicleId] - Numeric vehicle ID
   * @param {AbortSignal} [signal]
   * @returns {Promise<any>}
   */
  getSummary: async (date, vehicleId = 'ALL', signal) => {
    if (!date) {
      throw new Error('Please select a date to fetch summary.')
    }

    const vehIdParam = vehicleId === 'ALL' ? '' : vehicleId
    const qs = buildQuery({ date, vehicleId: vehIdParam })

    const endpoints = [
      `${BASE_URL}/api/v1/daily-routes/report/summary?${qs}`,
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
   * Calls DailyRouteReportController.preview(date, vehicleId)
   * GET /api/v1/daily-routes/report/preview?date=YYYY-MM-DD&vehicleId=...
   *
   * @param {Object} params
   * @param {string} params.date - Date in YYYY-MM-DD format
   * @param {string|number} [params.vehicleId] - Vehicle ID
   * @param {AbortSignal} [params.signal]
   * @returns {Promise<Blob>}
   */
  getReceiptPdfBlob: async ({ date, vehicleId = 'ALL' } = {}, signal) => {
    if (!date) {
      throw new Error('Please select a date to preview the PDF receipt.')
    }

    const vehIdParam = vehicleId === 'ALL' ? '' : vehicleId
    const qs = buildQuery({ date, vehicleId: vehIdParam })

    const endpoints = [
      `${BASE_URL}/api/v1/daily-routes/report/preview?${qs}`,
    ]

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
   * Calls DailyRouteReportController.download(date, vehicleId) or preview with attachment
   *
   * @param {Object} params
   * @param {string} params.date
   * @param {string|number} [params.vehicleId]
   * @param {string} [params.fileName]
   * @param {AbortSignal} [params.signal]
   */
  downloadReceiptPdf: async ({ date, vehicleId = 'ALL', fileName = '' } = {}, signal) => {
    const vehIdParam = vehicleId === 'ALL' ? '' : vehicleId
    const qs = buildQuery({ date, vehicleId: vehIdParam })

    const downloadEndpoints = [
      `${BASE_URL}/api/v1/daily-routes/report/download?${qs}`,
    ]

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

    const resolvedFileName =
      fileName ||
      `Material_Grid_Receipt_${vehicleId !== 'ALL' ? `Vehicle_${vehicleId}` : 'All_Vehicles'}_${date || 'export'}.pdf`

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
