/**
 * Bulk Upload Service
 * Handles communication with Spring Boot Backend for Excel Sheet Uploads
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'
const API_BASE = `${BASE_URL}/api/v1/daily-routes`

export const bulkUploadService = {
  /**
   * Upload Material Transport Trips Sheet to Backend
   * Endpoint: POST /api/v1/daily-routes/upload
   * Consumes: multipart/form-data with param 'file'
   * Returns: CommonResponseDTO
   * @param {File} file - Excel or CSV file
   * @param {AbortSignal} [signal] - Optional abort signal
   * @returns {Promise<any>}
   */
  uploadTripsSheet: async (file, signal) => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData,
      signal,
    })

    let responseData = null
    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      try {
        responseData = await response.json()
      } catch {
        responseData = null
      }
    } else {
      const text = await response.text().catch(() => '')
      responseData = text
    }

    if (!response.ok) {
      let errorMessage = `Server responded with status: ${response.status}`
      if (responseData && typeof responseData === 'object') {
        errorMessage =
          responseData.message ||
          responseData.data?.message ||
          responseData.error ||
          JSON.stringify(responseData)
      } else if (typeof responseData === 'string' && responseData) {
        errorMessage = responseData
      }

      const err = new Error(errorMessage)
      err.response = { data: responseData?.data || responseData }
      err.errors =
        responseData?.data?.errors ||
        responseData?.errors ||
        (Array.isArray(responseData?.data) ? responseData.data : [])
      throw err
    }

    return responseData
  },

  /**
   * Upload Daily Expenses Sheet to Backend
   * Endpoint: POST /api/material-grid/daily-routes/daily-expenses
   * @param {File} file - Excel or CSV file
   * @param {AbortSignal} [signal] - Optional abort signal
   * @returns {Promise<any>}
   */
  uploadDailyExpenses: async (file, signal) => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${API_BASE}/daily-expenses`, {
      method: 'POST',
      body: formData,
      signal,
    })

    if (!response.ok) {
      let errorMessage = `Server responded with status: ${response.status}`
      try {
        const errorData = await response.json()
        errorMessage = errorData.message || errorData.error || JSON.stringify(errorData)
      } catch {
        const errorText = await response.text().catch(() => '')
        if (errorText) errorMessage = errorText
      }
      throw new Error(errorMessage)
    }

    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      return await response.json()
    }
    return await response.text()
  },
}

export default bulkUploadService

