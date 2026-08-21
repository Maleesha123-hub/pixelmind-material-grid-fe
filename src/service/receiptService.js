/**
 * Receipt Service
 * Delegates to DailyRouteController endpoints for live data binding,
 * preview summary DTOs, and backend PDF streaming & downloads.
 */

import dailyRouteService from './dailyRouteService'

export const receiptService = {
  /**
   * Fetch receipt preview data / summary DTO for given date and vehicleId
   * Endpoint: GET /api/v1/daily-routes/receipt/preview?date=YYYY-MM-DD&vehicleId=...
   */
  getReceiptPreview: async (date, vehicleId = 'ALL', signal) => {
    return dailyRouteService.getReceiptPreviewData(date, vehicleId, signal)
  },

  /**
   * Fetch daily routes list
   */
  getDailyRoutes: async (params, signal) => {
    return dailyRouteService.getDailyRoutes(params, signal)
  },

  /**
   * Fetch backend-generated PDF Blob
   */
  getReceiptPdfBlob: async (params, signal) => {
    return dailyRouteService.getReceiptPdfBlob(params, signal)
  },

  /**
   * Download backend-generated PDF
   */
  downloadReceiptPdf: async (params, signal) => {
    return dailyRouteService.downloadReceiptPdf(params, signal)
  },
}

export default receiptService
