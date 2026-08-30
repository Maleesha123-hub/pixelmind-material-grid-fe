/**
 * File History Service
 * Handles communication with Spring Boot FileHistoryController
 *
 * Endpoint:
 *   GET /api/v1/file-histories/by-file-type?fileType=DAILY_ROUTE&fileName=
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

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
  return []
}

const buildQuery = (params) => {
  const q = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== null && v !== undefined && v !== '' && v !== 'ALL') {
      q.append(k, v)
    }
  })
  return q.toString()
}

const apiFetch = async (url, options = {}) => {
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }

  const response = await fetch(url, { ...options, headers })

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

export const fileHistoryService = {
  /**
   * Get active file history records filtered by fileType and optionally searchable by fileName.
   * Endpoint: GET /api/v1/file-histories/by-file-type?fileType=...&fileName=...
   *
   * @param {string} [fileType='DAILY_ROUTE'] - FileType enum value (e.g. DAILY_ROUTE)
   * @param {string} [fileName=''] - File name search query
   * @param {AbortSignal} [signal]
   * @returns {Promise<Array>}
   */
  getFilesByFileType: async (fileType = 'DAILY_ROUTE', fileName = '', signal) => {
    const qs = buildQuery({
      fileType: fileType || undefined,
      fileName: typeof fileName === 'string' && fileName.trim() ? fileName.trim() : undefined,
    })
    const url = qs
      ? `${BASE_URL}/api/v1/file-histories/by-file-type?${qs}`
      : `${BASE_URL}/api/v1/file-histories/by-file-type`
    const result = await apiFetch(url, { signal })
    const data = unwrap(result)
    if (Array.isArray(data)) return data
    if (data?.content && Array.isArray(data.content)) return data.content
    if (data?.items && Array.isArray(data.items)) return data.items
    return []
  },
}

export default fileHistoryService
