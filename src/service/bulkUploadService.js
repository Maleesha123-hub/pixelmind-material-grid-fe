/**
 * Bulk Upload Service
 * Handles communication with Spring Boot Backend for Excel Sheet Uploads
 */

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:8080/api/material-grid'}/daily-routes`

export const bulkUploadService = {
  /**
   * Upload Material Transport Trips Sheet to Backend
   * Endpoint: POST /api/material-grid/daily-routes/bulk-upload
   * Consumes: multipart/form-data with param 'file'
   * Returns: CommonResponseDTO
   * @param {File} file - Excel or CSV file
   * @param {AbortSignal} [signal] - Optional abort signal
   * @returns {Promise<any>}
   */
  uploadTripsSheet: async (file, signal) => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${API_BASE}/bulk-upload`, {
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

