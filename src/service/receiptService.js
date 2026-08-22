/**
 * Receipt Service
 * Delegates to DailyRouteReportController & DailyRouteController endpoints
 */

import dailyRouteService from './dailyRouteService'

export const receiptService = {
  /**
   * Fetch receipt summary DTO for given date and vehicleId from DailyRouteReportController
   * Endpoint: GET /api/v1/daily-route-reports/summary?date=YYYY-MM-DD&vehicleId=...
   */
  getSummary: async (date, vehicleId = 'ALL', signal) => {
    return dailyRouteService.getSummary(date, vehicleId, signal)
  },

  /**
   * Alias for backward compatibility
   */
  getReceiptPreview: async (date, vehicleId = 'ALL', signal) => {
    return dailyRouteService.getSummary(date, vehicleId, signal)
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
