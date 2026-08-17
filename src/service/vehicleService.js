/**
 * Vehicle Service
 * Handles vehicle data fetching and search against Spring Boot Backend
 */

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:8080/api/material-grid'}/vehicles`

export const vehicleService = {
  /**
   * Search vehicles by vehicle number or driver name
   * Endpoint: GET /api/material-grid/vehicles/search?query={query}
   * @param {string} [query] - Optional search term
   * @param {AbortSignal} [signal] - Optional abort signal
   * @returns {Promise<Array>}
   */
  searchVehicles: async (query = '', signal) => {
    const url = query && query.trim() !== ''
      ? `${API_BASE}/search?query=${encodeURIComponent(query.trim())}`
      : `${API_BASE}/search`

    const response = await fetch(url, {
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

    // Handle ApiResponse<List<VehicleResponse>> { success, message, data: [...] }
    if (result && Array.isArray(result.data)) {
      return result.data
    }
    if (result && Array.isArray(result.payload)) {
      return result.payload
    }
    if (Array.isArray(result)) {
      return result
    }
    return []
  },

  /**
   * Get all active vehicles for dropdown
   * Endpoint: GET /api/material-grid/vehicles/search
   * @param {AbortSignal} [signal] - Optional abort signal
   * @returns {Promise<Array>}
   */
  getAllVehicles: async (signal) => {
    return vehicleService.searchVehicles('', signal)
  },
}

export default vehicleService
