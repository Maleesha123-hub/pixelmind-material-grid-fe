/**
 * Bulk Upload Service
 * Handles communication with Spring Boot Backend for Excel Sheet Uploads
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'
const DAILY_ROUTES_API_BASE = `${BASE_URL}/api/v1/daily-routes`
const VEHICLE_EXPENSES_API_BASE = `${BASE_URL}/api/v1/vehicle-expenses`
const VEHICLE_LICENSES_API_BASE = `${BASE_URL}/api/v1/vehicle-licenses`
const PERSON_VEHICLE_DETAILS_API_BASE = `${BASE_URL}/api/v1/person-vehicle-details`

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

    const response = await fetch(`${DAILY_ROUTES_API_BASE}/upload`, {
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
   * Endpoint: POST /api/v1/vehicle-expenses/upload
   * @param {File} file - Excel or CSV file
   * @param {AbortSignal} [signal] - Optional abort signal
   * @returns {Promise<any>}
   */
  uploadDailyExpenses: async (file, signal) => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${VEHICLE_EXPENSES_API_BASE}/upload`, {
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
   * Upload Vehicle Licenses Sheet to Backend
   * Endpoint: POST /api/v1/vehicle-licenses/upload
   * Consumes: multipart/form-data with param 'file'
   * Returns: BulkUploadResponse
   * @param {File} file - Excel or CSV file
   * @param {AbortSignal} [signal] - Optional abort signal
   * @returns {Promise<any>}
   */
  uploadVehicleLicenses: async (file, signal) => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${VEHICLE_LICENSES_API_BASE}/upload`, {
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
   * Upload Person Vehicle Details Sheet (Excavator Inspection & Checked By) to Backend
   * Endpoint: POST /api/v1/person-vehicle-details/upload
   * Consumes: multipart/form-data with param 'file'
   * Returns: ApiResponse<BulkUploadResponse>
   * @param {File} file - Excel file (.xlsx, .xls)
   * @param {AbortSignal} [signal] - Optional abort signal
   * @returns {Promise<any>}
   */
  uploadPersonVehicleDetails: async (file, signal) => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${PERSON_VEHICLE_DETAILS_API_BASE}/upload`, {
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
}

export default bulkUploadService
