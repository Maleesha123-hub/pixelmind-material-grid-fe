/**
 * Receipt Service
 * Handles receipt preview data retrieval and PDF generation support
 */

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:8080/api/material-grid'}/receipts`

export const receiptService = {
  /**
   * Fetch receipt preview data for given date and vehicle number
   * Endpoint: GET /api/material-grid/receipts/preview?date=YYYY-MM-DD&vehicleNumber=...
   * @param {string} date - Date in YYYY-MM-DD format
   * @param {string} vehicleNumber - Vehicle number (e.g. LC-4838 or ALL)
   * @param {AbortSignal} [signal] - Optional abort signal
   * @returns {Promise<any>}
   */
  getReceiptPreview: async (date, vehicleNumber, signal) => {
    if (!date) {
      throw new Error('Please select a date to preview the receipt.')
    }
    if (!vehicleNumber) {
      throw new Error('Please select a vehicle number to preview the receipt.')
    }

    const params = new URLSearchParams({
      date,
      vehicleNumber,
    })

    const response = await fetch(`${API_BASE}/preview?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
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

    const result = await response.json()
    // Handle ApiResponse<ReceiptSummaryDTO> { success, message, data: {...} }
    if (result && result.data !== undefined) {
      return result.data
    }
    return result
  },
}

export default receiptService
