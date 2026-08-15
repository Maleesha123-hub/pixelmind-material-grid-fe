/**
 * Bulk Upload Service
 * Handles communication with Spring Boot Backend for Excel Sheet Uploads
 */
import { environment } from '../environments/environment'

const API_BASE = `${environment.baseUrl}/bulk-upload`

export const bulkUploadService = {
  /**
   * Upload Material Transport Trips Sheet to Backend
   * Endpoint: POST /api/material-grid/bulk-upload/trips-sheet
   * @param {File} file - Excel or CSV file
   * @param {AbortSignal} [signal] - Optional abort signal
   * @returns {Promise<string>}
   */
  uploadTripsSheet: async (file, signal) => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${API_BASE}/trips-sheet`, {
      method: 'POST',
      body: formData,
      signal,
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Upload failed')
      throw new Error(errorText || `Server responded with status: ${response.status}`)
    }

    return await response.text()
  },

  /**
   * Upload Daily Expenses Sheet to Backend
   * Endpoint: POST /api/material-grid/bulk-upload/daily-expenses
   * @param {File} file - Excel or CSV file
   * @param {AbortSignal} [signal] - Optional abort signal
   * @returns {Promise<string>}
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
      const errorText = await response.text().catch(() => 'Upload failed')
      throw new Error(errorText || `Server responded with status: ${response.status}`)
    }

    return await response.text()
  },
}

export default bulkUploadService
