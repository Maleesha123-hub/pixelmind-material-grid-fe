/**
 * Daily Route & Receipts Service
 * Handles communication with Spring Boot DailyRouteController
 *
 * Primary Endpoints:
 *   GET  /api/v1/daily-routes              → ApiResponse<PageResponse<DailyRouteResponse>>
 *   GET  /api/v1/daily-routes/search       → ApiResponse<List<DailyRouteResponse>>
 *   GET  /api/v1/daily-routes/receipt/preview → ApiResponse<ReceiptSummaryDTO>
 *   GET  /api/v1/daily-routes/receipt/pdf  → Binary PDF Stream (application/pdf)
 *   GET  /api/v1/daily-routes/{id}/pdf     → Binary PDF Stream for single trip
 *
 * Fallback Base:
 *   /api/material-grid/daily-routes
 *
 * @module dailyRouteService
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'
const PRIMARY_API = `${BASE_URL}/api/v1/daily-routes`
const LEGACY_API = `${BASE_URL}/api/material-grid/daily-routes`
const RECEIPT_LEGACY_API = `${BASE_URL}/api/material-grid/receipts`

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

// ─── Shared JSON Fetcher with Fallbacks ───────────────────────────────────────
const apiFetchJson = async (endpointPaths, options = {}) => {
  const paths = Array.isArray(endpointPaths) ? endpointPaths : [endpointPaths]
  let lastError = null

  for (let i = 0; i < paths.length; i++) {
    const url = paths[i]
    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
        ...options,
      })

      if (response.ok) {
        return await response.json()
      }

      let errorMessage = `Server error: ${response.status}`
      try {
        const errJson = await response.json()
        errorMessage = errJson.message || errJson.error || JSON.stringify(errJson)
      } catch {
        const errText = await response.text().catch(() => '')
        if (errText) errorMessage = errText
      }

      lastError = new Error(errorMessage)
      // If 404 and we have a fallback path, try next endpoint
      if (response.status === 404 && i < paths.length - 1) {
        continue
      }
      throw lastError
    } catch (err) {
      lastError = err
      if (i === paths.length - 1) {
        throw lastError
      }
    }
  }

  throw lastError || new Error('Network request failed')
}

// ─── Shared Binary Blob Fetcher for Backend PDF ──────────────────────────────
const apiFetchBlob = async (endpointPaths, options = {}) => {
  const paths = Array.isArray(endpointPaths) ? endpointPaths : [endpointPaths]
  let lastError = null

  for (let i = 0; i < paths.length; i++) {
    const url = paths[i]
    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/pdf, application/octet-stream, */*',
          ...(options.headers || {}),
        },
        ...options,
      })

      if (response.ok) {
        const contentType = response.headers.get('content-type') || ''
        const blob = await response.blob()

        // Ensure blob has application/pdf type
        if (!blob.type || blob.type === 'application/octet-stream' || !blob.type.includes('pdf')) {
          return new Blob([blob], { type: 'application/pdf' })
        }
        return blob
      }

      let errorMessage = `Server returned status: ${response.status}`
      try {
        const errJson = await response.json()
        errorMessage = errJson.message || errJson.error || JSON.stringify(errJson)
      } catch {
        const errText = await response.text().catch(() => '')
        if (errText) errorMessage = errText
      }

      lastError = new Error(errorMessage)
      if (response.status === 404 && i < paths.length - 1) {
        continue
      }
      throw lastError
    } catch (err) {
      lastError = err
      if (i === paths.length - 1) {
        throw lastError
      }
    }
  }

  throw lastError || new Error('PDF download failed')
}

export const dailyRouteService = {
  /**
   * Fetch daily routes / trips list from DailyRouteController
   * GET /api/v1/daily-routes?date=...&vehicleNumber=...&page=...&size=...&search=...
   */
  getDailyRoutes: async (
    {
      date = '',
      vehicleNumber = '',
      startDate = '',
      endDate = '',
      search = '',
      page = 0,
      size = 20,
      sort = 'id,desc',
    } = {},
    signal,
  ) => {
    const qs = buildQuery({
      date,
      vehicleNumber: vehicleNumber === 'ALL' ? '' : vehicleNumber,
      startDate,
      endDate,
      search,
      page,
      size,
      sort,
    })

    const endpoints = [
      `${PRIMARY_API}${qs ? `?${qs}` : ''}`,
      `${LEGACY_API}${qs ? `?${qs}` : ''}`,
      `${PRIMARY_API}/search${qs ? `?${qs}` : ''}`,
    ]

    const result = await apiFetchJson(endpoints, { method: 'GET', signal })
    return unwrap(result)
  },

  /**
   * Fetch receipt summary & breakdown DTO from DailyRouteController
   * GET /api/v1/daily-routes/receipt/preview?date=...&vehicleNumber=...
   */
  getReceiptPreviewData: async (date, vehicleNumber = 'ALL', signal) => {
    if (!date) {
      throw new Error('Please select a date to preview the receipt.')
    }

    const vehParam = vehicleNumber === 'ALL' ? '' : vehicleNumber
    const qs = buildQuery({ date, vehicleNumber: vehParam })

    const endpoints = [
      `${PRIMARY_API}/receipt/preview?${qs}`,
      `${PRIMARY_API}/preview?${qs}`,
      `${LEGACY_API}/receipt/preview?${qs}`,
      `${RECEIPT_LEGACY_API}/preview?${qs}`,
    ]

    const result = await apiFetchJson(endpoints, { method: 'GET', signal })
    return unwrap(result)
  },

  /**
   * Fetch backend-generated PDF receipt stream as a Blob (application/pdf)
   *
   * @param {Object} params
   * @param {string} [params.date] - Date in YYYY-MM-DD format
   * @param {string} [params.vehicleNumber] - Vehicle number or ALL
   * @param {string|number} [params.routeId] - Optional specific route/trip ID
   * @param {AbortSignal} [params.signal]
   * @returns {Promise<Blob>}
   */
  getReceiptPdfBlob: async ({ date, vehicleNumber = 'ALL', routeId = null } = {}, signal) => {
    if (routeId) {
      const singleEndpoints = [
        `${PRIMARY_API}/${routeId}/pdf`,
        `${PRIMARY_API}/${routeId}/receipt/pdf`,
        `${LEGACY_API}/${routeId}/pdf`,
      ]
      return await apiFetchBlob(singleEndpoints, { method: 'GET', signal })
    }

    if (!date) {
      throw new Error('Please select a date to generate the PDF receipt.')
    }

    const vehParam = vehicleNumber === 'ALL' ? '' : vehicleNumber
    const qs = buildQuery({ date, vehicleNumber: vehParam })

    const endpoints = [
      `${PRIMARY_API}/receipt/pdf?${qs}`,
      `${PRIMARY_API}/pdf?${qs}`,
      `${PRIMARY_API}/download-receipt?${qs}`,
      `${LEGACY_API}/receipt/pdf?${qs}`,
      `${RECEIPT_LEGACY_API}/preview/pdf?${qs}`,
      `${RECEIPT_LEGACY_API}/pdf?${qs}`,
    ]

    return await apiFetchBlob(endpoints, { method: 'GET', signal })
  },

  /**
   * Directly download the backend-generated PDF receipt to the client
   *
   * @param {Object} params
   * @param {string} [params.date]
   * @param {string} [params.vehicleNumber]
   * @param {string|number} [params.routeId]
   * @param {string} [params.fileName]
   * @param {AbortSignal} [params.signal]
   */
  downloadReceiptPdf: async (
    { date, vehicleNumber = 'ALL', routeId = null, fileName = '' } = {},
    signal,
  ) => {
    const blob = await dailyRouteService.getReceiptPdfBlob({ date, vehicleNumber, routeId }, signal)

    const resolvedFileName =
      fileName ||
      (routeId
        ? `Material_Grid_Trip_Receipt_${routeId}.pdf`
        : `Material_Grid_Receipt_${vehicleNumber !== 'ALL' ? vehicleNumber : 'All_Vehicles'}_${date || 'export'}.pdf`)

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
