/**
 * Logistics Bulk Excel Uploader
 *
 * Streamlined interface for uploading, validating, and previewing:
 *   1. Daily Routes / Material Transport Trips Sheet
 *   2. Daily Fleet & Site Expenses Sheet
 *
 * Features:
 *   - Drag & Drop Excel/CSV upload with file details preview
 *   - Live spreadsheet parsing & instant metrics calculations
 *   - Searchable data preview table with pagination
 *   - Sample Excel template download
 *   - Backend Spring Boot API integration
 *
 * @module BulkUpload
 */

import React, { useState, useRef, useMemo } from 'react'
import * as XLSX from 'xlsx'
import Swal from 'sweetalert2'
import CIcon from '@coreui/icons-react'
import {
  CRow,
  CCol,
  CCard,
  CCardBody,
  CCardHeader,
  CSpinner,
} from '@coreui/react'
import {
  cilCloudUpload,
  cilCloudDownload,
  cilDescription,
  cilTruck,
  cilMoney,
  cilSearch,
  cilTrash,
  cilCheckCircle,
  cilWarning,
  cilBan,
  cilChevronLeft,
  cilChevronRight,
  cilReload,
  cilFile,
} from '@coreui/icons'
import './BulkUpload.css'
import bulkUploadService from '../../../service/bulkUploadService'

// ─── Constants ────────────────────────────────────────────────────────────────
const PREVIEW_PAGE_SIZE = 10

const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

const formatCurrency = (val) => {
  const num = Number(val)
  if (isNaN(num)) return '0.00'
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

// ─── Component ────────────────────────────────────────────────────────────────
const BulkUpload = () => {
  const [activeTab, setActiveTab] = useState('trips') // 'trips' | 'expenses'

  // ── Trips State ─────────────────────────────────────────────────────────────
  const [tripsFile, setTripsFile] = useState(null)
  const [tripsData, setTripsData] = useState([])
  const [tripsLoading, setTripsLoading] = useState(false)
  const [tripsSearch, setTripsSearch] = useState('')
  const [tripsPage, setTripsPage] = useState(0)
  const [tripsErrors, setTripsErrors] = useState([])
  const [tripsSummary, setTripsSummary] = useState(null)
  const [tripsDragOver, setTripsDragOver] = useState(false)
  const tripFileInputRef = useRef(null)

  // ── Expenses State ──────────────────────────────────────────────────────────
  const [expensesFile, setExpensesFile] = useState(null)
  const [expensesData, setExpensesData] = useState([])
  const [expensesLoading, setExpensesLoading] = useState(false)
  const [expensesSearch, setExpensesSearch] = useState('')
  const [expensesPage, setExpensesPage] = useState(0)
  const [expensesErrors, setExpensesErrors] = useState([])
  const [expensesSummary, setExpensesSummary] = useState(null)
  const [expensesDragOver, setExpensesDragOver] = useState(false)
  const expenseFileInputRef = useRef(null)

  // ─── Sample Template Downloads ──────────────────────────────────────────────
  const downloadTripsTemplate = () => {
    const wsData = [
      ['Date', 'Vehicle Number', 'Bil Number', 'Route Code', 'Check By'],
      ['2026-08-07', 'LC-4838', '7901', 'RT000001', 'Loku akka'],
      ['2026-08-07', 'LI-8902', '7902', 'RT000001', 'Loku akka'],
      ['2026-08-07', 'LM-4535', '7903', 'RT000001', 'Loku akka'],
      ['2026-08-07', 'LK-5177', '7904', 'RT000001', 'surendra'],
    ]
    const ws = XLSX.utils.aoa_to_sheet(wsData)
    ws['!cols'] = [
      { wch: 14 },
      { wch: 18 },
      { wch: 16 },
      { wch: 16 },
      { wch: 18 },
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Daily Routes')
    XLSX.writeFile(wb, 'Daily_Routes_Template.xlsx')
  }

  const downloadExpensesTemplate = () => {
    const wsData = [
      ['Date', 'Vehicle Number', 'Expense'],
      ['2026-08-07', 'LM-4565', 10000],
      ['2026-08-07', 'lf-3769', 5000],
      ['2026-08-07', 'LJ-4472', 3000],
      ['2026-08-07', 'LM-4687', 7000],
      ['2026-08-07', 'LI-8790', 10000],
    ]
    const ws = XLSX.utils.aoa_to_sheet(wsData)
    ws['!cols'] = [
      { wch: 14 },
      { wch: 18 },
      { wch: 16 },
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Daily Expenses')
    XLSX.writeFile(wb, 'Daily_Expenses_Template.xlsx')
  }

  // ─── File Validation ─────────────────────────────────────────────────────────
  const validateFile = (file) => {
    if (!file) return false
    const validExtensions = ['.xlsx', '.xls', '.csv']
    const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext))
    if (!hasValidExt) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid File Format',
        text: 'Please upload an Excel spreadsheet (.xlsx, .xls) or CSV file.',
        confirmButtonColor: '#dc2626',
      })
      return false
    }
    return true
  }

  // ─── Parse Local Trips Sheet ────────────────────────────────────────────────
  const parseTripsLocal = (file) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array', cellDates: true })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' })

        const formatted = json
          .map((row) => {
            let rawDate = row['Date'] || row['date'] || ''
            if (rawDate instanceof Date) {
              rawDate = rawDate.toISOString().split('T')[0]
            } else if (typeof rawDate === 'string' && rawDate.trim()) {
              const str = rawDate.trim()
              const mdy = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
              if (mdy) {
                const mm = mdy[1].padStart(2, '0')
                const dd = mdy[2].padStart(2, '0')
                const yyyy = mdy[3]
                rawDate = `${yyyy}-${mm}-${dd}`
              }
            }

            const rawVeh =
              row['Vehicle Number'] ||
              row['vehicleNumber'] ||
              row['Vehicle'] ||
              row['vehicle'] ||
              row['Vehial Number'] ||
              row['Vehical'] ||
              ''
            const rawBill =
              row['Bil Number'] ||
              row['Bill Number'] ||
              row['bilNumber'] ||
              row['billNumber'] ||
              row['Bill'] ||
              row['bill'] ||
              ''
            const rawRouteCode =
              row['Route Code'] ||
              row['routeCode'] ||
              row['RouteCode'] ||
              row['Route'] ||
              row['route'] ||
              ''
            const rawCheckBy =
              row['Check By'] ||
              row['Checked By'] ||
              row['checkBy'] ||
              row['checkedBy'] ||
              row['Check by'] ||
              row['Checked by'] ||
              ''

            return {
              date: String(rawDate).trim(),
              vehicleNumber: String(rawVeh).trim(),
              billNumber: String(rawBill).trim(),
              routeCode: String(rawRouteCode).trim(),
              checkBy: String(rawCheckBy).trim(),
            }
          })
          .filter(
            (item) => item.vehicleNumber || item.billNumber || item.routeCode || item.date || item.checkBy,
          )

        setTripsData(formatted)
        setTripsPage(0)
      } catch (err) {
        console.warn('Local preview parse error:', err)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  // ─── Parse Local Expenses Sheet ─────────────────────────────────────────────
  const parseExpensesLocal = (file) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array', cellDates: true })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' })

        const formatted = json
          .map((row) => {
            let rawDate = row['Date'] || row['date'] || ''
            if (rawDate instanceof Date) {
              rawDate = rawDate.toISOString().split('T')[0]
            } else if (typeof rawDate === 'string' && rawDate.trim()) {
              const str = rawDate.trim()
              const mdy = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
              if (mdy) {
                const mm = mdy[1].padStart(2, '0')
                const dd = mdy[2].padStart(2, '0')
                const yyyy = mdy[3]
                rawDate = `${yyyy}-${mm}-${dd}`
              }
            }

            const rawVeh =
              row['Vehicle Number'] ||
              row['vehicleNumber'] ||
              row['Vehicle/Ref'] ||
              row['Vehicle'] ||
              row['vehicle'] ||
              row['Vehial Number'] ||
              row['Vehical'] ||
              ''
            const rawExpense =
              row['Expense'] !== undefined && row['Expense'] !== ''
                ? Number(String(row['Expense']).replace(/,/g, '')) || 0
                : row['Amount (LKR)'] !== undefined && row['Amount (LKR)'] !== ''
                ? Number(String(row['Amount (LKR)']).replace(/,/g, '')) || 0
                : row['Amount'] !== undefined && row['Amount'] !== ''
                ? Number(String(row['Amount']).replace(/,/g, '')) || 0
                : row['amount'] !== undefined && row['amount'] !== ''
                ? Number(String(row['amount']).replace(/,/g, '')) || 0
                : 0

            return {
              date: String(rawDate).trim(),
              vehicleNumber: String(rawVeh).trim(),
              expense: rawExpense,
            }
          })
          .filter((item) => item.vehicleNumber || item.expense > 0 || item.date)

        setExpensesData(formatted)
        setExpensesPage(0)
      } catch (err) {
        console.warn('Local preview parse error (expenses):', err)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  // ─── Handle File Selections ──────────────────────────────────────────────────
  const handleSelectTripsFile = (file) => {
    if (!validateFile(file)) return
    setTripsFile(file)
    setTripsErrors([])
    setTripsSummary(null)
    parseTripsLocal(file)
  }

  const handleSelectExpensesFile = (file) => {
    if (!validateFile(file)) return
    setExpensesFile(file)
    setExpensesErrors([])
    setExpensesSummary(null)
    parseExpensesLocal(file)
  }

  // ─── Upload to Backend Handlers ──────────────────────────────────────────────
  const handleUploadTrips = async () => {
    if (!tripsFile) return
    setTripsLoading(true)
    setTripsErrors([])
    setTripsSummary(null)

    try {
      const response = await bulkUploadService.uploadTripsSheet(tripsFile)
      const successMessage =
        response?.message ||
        response?.data?.message ||
        (typeof response === 'string'
          ? response
          : `Routes from "${tripsFile.name}" were uploaded and processed successfully.`)

      Swal.fire({
        icon: 'success',
        title: 'Upload Successful!',
        text: successMessage,
        confirmButtonColor: '#f59e0b',
        timer: 4000,
        timerProgressBar: true,
      })
    } catch (err) {
      console.error('Trip upload error:', err)
      const rawErrors =
        err.errors ||
        err.response?.data?.errors ||
        err.response?.errors ||
        []
      const summaryData = err.response?.data || null

      if (rawErrors.length > 0) {
        setTripsErrors(rawErrors)
        setTripsSummary(summaryData)
        Swal.fire({
          icon: 'error',
          title: 'Validation Failed',
          text: err.message || 'Please check the validation errors listed below.',
          confirmButtonColor: '#dc2626',
        })
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Upload Failed',
          text: err.message || 'Unable to upload trips sheet. Please check your data format.',
          confirmButtonColor: '#dc2626',
        })
      }
    } finally {
      setTripsLoading(false)
    }
  }

  const handleUploadExpenses = async () => {
    if (!expensesFile) return
    setExpensesLoading(true)
    setExpensesErrors([])
    setExpensesSummary(null)

    try {
      const response = await bulkUploadService.uploadDailyExpenses(expensesFile)
      const successMessage =
        response?.message ||
        response?.data?.message ||
        (typeof response === 'string'
          ? response
          : `Expenses from "${expensesFile.name}" were uploaded and processed successfully.`)

      Swal.fire({
        icon: 'success',
        title: 'Expenses Uploaded!',
        text: successMessage,
        confirmButtonColor: '#059669',
        timer: 4000,
        timerProgressBar: true,
      })
    } catch (err) {
      console.error('Expense upload error:', err)
      const rawErrors =
        err.errors ||
        err.response?.data?.errors ||
        err.response?.errors ||
        []
      const summaryData = err.response?.data || null

      if (rawErrors.length > 0) {
        setExpensesErrors(rawErrors)
        setExpensesSummary(summaryData)
        Swal.fire({
          icon: 'error',
          title: 'Validation Failed',
          text: err.message || 'Please check the validation errors listed below.',
          confirmButtonColor: '#dc2626',
        })
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Upload Failed',
          text: err.message || 'Unable to upload expenses sheet. Please check your data format.',
          confirmButtonColor: '#dc2626',
        })
      }
    } finally {
      setExpensesLoading(false)
    }
  }

  // ─── Reset Handlers ──────────────────────────────────────────────────────────
  const handleResetTrips = () => {
    setTripsFile(null)
    setTripsData([])
    setTripsErrors([])
    setTripsSummary(null)
    setTripsSearch('')
    setTripsPage(0)
    if (tripFileInputRef.current) tripFileInputRef.current.value = ''
  }

  const handleResetExpenses = () => {
    setExpensesFile(null)
    setExpensesData([])
    setExpensesErrors([])
    setExpensesSummary(null)
    setExpensesSearch('')
    setExpensesPage(0)
    if (expenseFileInputRef.current) expenseFileInputRef.current.value = ''
  }

  // ─── Trips Filter & Metrics ──────────────────────────────────────────────────
  const filteredTrips = useMemo(() => {
    if (!tripsSearch.trim()) return tripsData
    const q = tripsSearch.toLowerCase()
    return tripsData.filter(
      (item) =>
        (item.vehicleNumber || '').toLowerCase().includes(q) ||
        (item.billNumber || '').toString().toLowerCase().includes(q) ||
        (item.routeCode || '').toLowerCase().includes(q) ||
        (item.checkBy || '').toLowerCase().includes(q) ||
        (item.date || '').includes(q),
    )
  }, [tripsData, tripsSearch])

  const totalTripsCount = tripsData.length
  const uniqueVehiclesCount = new Set(tripsData.map((item) => item.vehicleNumber).filter(Boolean)).size
  const uniqueRoutesCount = new Set(tripsData.map((item) => item.routeCode).filter(Boolean)).size
  const uniqueInspectorsCount = new Set(tripsData.map((item) => item.checkBy).filter(Boolean)).size

  const tripsTotalPages = Math.ceil(filteredTrips.length / PREVIEW_PAGE_SIZE) || 1
  const paginatedTrips = filteredTrips.slice(
    tripsPage * PREVIEW_PAGE_SIZE,
    (tripsPage + 1) * PREVIEW_PAGE_SIZE,
  )

  // ─── Expenses Filter & Metrics ───────────────────────────────────────────────
  const filteredExpenses = useMemo(() => {
    if (!expensesSearch.trim()) return expensesData
    const q = expensesSearch.toLowerCase()
    return expensesData.filter(
      (item) =>
        (item.vehicleNumber || '').toLowerCase().includes(q) ||
        (item.expense || '').toString().toLowerCase().includes(q) ||
        (item.date || '').includes(q),
    )
  }, [expensesData, expensesSearch])

  const totalExpenseCount = expensesData.length
  const totalExpenseAmount = expensesData.reduce((sum, item) => sum + (Number(item.expense) || 0), 0)
  const uniqueExpenseVehiclesCount = new Set(
    expensesData.map((item) => item.vehicleNumber).filter(Boolean),
  ).size

  const expensesTotalPages = Math.ceil(filteredExpenses.length / PREVIEW_PAGE_SIZE) || 1
  const paginatedExpenses = filteredExpenses.slice(
    expensesPage * PREVIEW_PAGE_SIZE,
    (expensesPage + 1) * PREVIEW_PAGE_SIZE,
  )

  return (
    <div className="bu-page">
      {/* ── Page Header ── */}
      <div className="bu-page-header">
        <div className="bu-header-left">
          <div className="bu-header-icon">
            <CIcon icon={cilCloudUpload} size="xl" />
          </div>
          <div>
            <h1 className="bu-page-title">Logistics Bulk Excel Uploader</h1>
            <p className="bu-page-subtitle">
              Import material dispatch routes and fleet site expense spreadsheets
            </p>
          </div>
        </div>

        <div className="bu-header-actions">
          {activeTab === 'trips' ? (
            <button className="bu-btn-download" onClick={downloadTripsTemplate} id="btn-dl-routes-tpl">
              <CIcon icon={cilCloudDownload} /> Download Routes Template
            </button>
          ) : (
            <button className="bu-btn-download" onClick={downloadExpensesTemplate} id="btn-dl-expenses-tpl">
              <CIcon icon={cilCloudDownload} /> Download Expenses Template
            </button>
          )}
        </div>
      </div>

      {/* ── Segmented Tab Switcher ── */}
      <div className="bu-tab-container">
        <button
          className={`bu-tab-btn bu-tab-btn--routes ${activeTab === 'trips' ? 'active' : ''}`}
          onClick={() => setActiveTab('trips')}
          id="tab-routes-sheet"
        >
          <CIcon icon={cilTruck} size="lg" />
          <span>Daily Routes Sheet</span>
          {tripsData.length > 0 && <span className="bu-tab-count">{tripsData.length} records</span>}
        </button>

        <button
          className={`bu-tab-btn bu-tab-btn--expenses ${activeTab === 'expenses' ? 'active' : ''}`}
          onClick={() => setActiveTab('expenses')}
          id="tab-expenses-sheet"
        >
          <CIcon icon={cilMoney} size="lg" />
          <span>Daily Expenses Sheet</span>
          {expensesData.length > 0 && <span className="bu-tab-count">{expensesData.length} records</span>}
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 1: DAILY ROUTES SHEET
         ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'trips' && (
        <>
          <CCard className="bu-card">
            <CCardHeader className="bu-card-header">
              <div className="bu-card-title">
                <CIcon icon={cilDescription} className="text-warning" />
                <span>Upload Material Transport Trips Sheet</span>
              </div>
            </CCardHeader>

            <CCardBody className="bu-card-body">
              {/* Upload Dropzone */}
              {!tripsFile ? (
                <div
                  className={`bu-dropzone ${tripsDragOver ? 'dragover' : ''}`}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setTripsDragOver(true)
                  }}
                  onDragLeave={() => setTripsDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setTripsDragOver(false)
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleSelectTripsFile(e.dataTransfer.files[0])
                    }
                  }}
                  onClick={() => tripFileInputRef.current?.click()}
                  id="dropzone-routes-sheet"
                >
                  <input
                    type="file"
                    ref={tripFileInputRef}
                    style={{ display: 'none' }}
                    accept=".xlsx, .xls, .csv"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleSelectTripsFile(e.target.files[0])
                      }
                    }}
                  />
                  <div className="bu-dropzone-icon">
                    <CIcon icon={cilCloudUpload} size="xl" />
                  </div>
                  <h4 className="bu-dropzone-heading">Drag &amp; drop your routes Excel sheet here</h4>
                  <p className="bu-dropzone-sub">
                    or <span className="bu-browse-link">browse from your computer</span>
                  </p>
                  <span className="bu-format-pill">Accepts .xlsx, .xls, .csv</span>
                </div>
              ) : (
                /* Selected File Card */
                <div className="bu-file-card">
                  <div className="bu-file-left">
                    <div className="bu-file-icon">
                      <CIcon icon={cilDescription} />
                    </div>
                    <div>
                      <div className="bu-file-name">{tripsFile.name}</div>
                      <div className="bu-file-meta">
                        <span>{formatFileSize(tripsFile.size)}</span>
                        <span>•</span>
                        <span>{tripsData.length} records parsed</span>
                        <span>•</span>
                        <span className="bu-file-status-pill">Ready to Upload</span>
                      </div>
                    </div>
                  </div>

                  <div className="bu-file-actions">
                    <button
                      className="bu-btn-remove-file"
                      onClick={handleResetTrips}
                      disabled={tripsLoading}
                      id="btn-remove-trips-file"
                    >
                      <CIcon icon={cilTrash} size="sm" /> Change File
                    </button>
                    <button
                      className="bu-btn-upload-now"
                      onClick={handleUploadTrips}
                      disabled={tripsLoading}
                      id="btn-submit-trips-file"
                    >
                      {tripsLoading ? (
                        <>
                          <CSpinner size="sm" style={{ marginRight: 6 }} /> Processing…
                        </>
                      ) : (
                        <>
                          <CIcon icon={cilCloudUpload} /> Upload &amp; Process to Server
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Validation Errors Display */}
              {tripsErrors.length > 0 && (
                <div className="bu-val-box" id="routes-upload-validation-errors">
                  <div className="bu-val-header">
                    <div className="bu-val-title">
                      <CIcon icon={cilWarning} className="text-danger" />
                      <span>Upload Validation Errors</span>
                      <span className="bu-val-count-badge">{tripsErrors.length} Failed</span>
                    </div>
                    {tripsSummary?.totalRows != null && (
                      <div className="bu-val-summary-text">
                        Total Rows: <strong>{tripsSummary.totalRows}</strong> | Errors:{' '}
                        <strong className="text-danger">
                          {tripsSummary.errorCount ?? tripsErrors.length}
                        </strong>
                      </div>
                    )}
                  </div>

                  <div className="bu-val-table-wrap">
                    <table className="bu-val-table">
                      <thead>
                        <tr>
                          <th style={{ width: 70 }}>Row</th>
                          <th style={{ width: 140 }}>Field</th>
                          <th style={{ width: 150 }}>Entered Value</th>
                          <th>Validation Error</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tripsErrors.map((err, idx) => (
                          <tr key={idx}>
                            <td>
                              <span className="bu-val-row-pill">Row {err.rowNumber ?? idx + 1}</span>
                            </td>
                            <td>
                              <span className="bu-val-field">{err.field || '—'}</span>
                            </td>
                            <td>
                              <code className="bu-val-value">
                                {err.value !== undefined &&
                                err.value !== null &&
                                String(err.value).trim() !== ''
                                  ? String(err.value)
                                  : '[Empty]'}
                              </code>
                            </td>
                            <td>
                              <div className="bu-val-msg">
                                <CIcon
                                  icon={cilBan}
                                  size="sm"
                                  className="text-danger"
                                  style={{ flexShrink: 0 }}
                                />
                                <span>{err.message || 'Validation error'}</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="bu-val-footer-hint mt-2">
                    💡 Please fix these rows in your Excel file (e.g. ensure valid license dates exist or correct the dates), then re-upload.
                  </div>
                </div>
              )}
            </CCardBody>
          </CCard>

          {/* Parsed Live Preview Section */}
          {tripsData.length > 0 && (
            <CCard className="bu-card">
              <CCardHeader className="bu-card-header">
                <div className="bu-card-title">
                  <CIcon icon={cilTruck} className="text-warning" />
                  <span>Parsed Routes Preview &amp; Summary</span>
                </div>
              </CCardHeader>

              <CCardBody className="bu-card-body">
                {/* Metrics Summary Grid */}
                <div className="bu-metrics-grid">
                  <div className="bu-metric-card">
                    <span className="bu-metric-label">Total Routes</span>
                    <span className="bu-metric-value">{totalTripsCount}</span>
                  </div>
                  <div className="bu-metric-card">
                    <span className="bu-metric-label">Active Vehicles</span>
                    <span className="bu-metric-value highlight">{uniqueVehiclesCount} vehicles</span>
                  </div>
                  <div className="bu-metric-card">
                    <span className="bu-metric-label">Route Codes</span>
                    <span className="bu-metric-value" style={{ color: '#0284c7' }}>
                      {uniqueRoutesCount} routes
                    </span>
                  </div>
                  <div className="bu-metric-card">
                    <span className="bu-metric-label">Checked By</span>
                    <span className="bu-metric-value green">{uniqueInspectorsCount} persons</span>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="bu-search-row">
                  <div className="bu-search-wrap">
                    <CIcon icon={cilSearch} size="sm" className="bu-search-icon" />
                    <input
                      type="text"
                      className="bu-search-input"
                      placeholder="Search by vehicle, bil number, route code, check by, or date..."
                      value={tripsSearch}
                      onChange={(e) => {
                        setTripsSearch(e.target.value)
                        setTripsPage(0)
                      }}
                    />
                  </div>
                  {tripsSearch && (
                    <button
                      className="bu-btn-remove-file"
                      onClick={() => setTripsSearch('')}
                      style={{ padding: '0.45rem 0.75rem', fontSize: '0.78rem' }}
                    >
                      <CIcon icon={cilReload} size="sm" /> Clear Search
                    </button>
                  )}
                </div>

                {/* Data Preview Table */}
                <div className="bu-table-wrap">
                  <table className="bu-table">
                    <thead>
                      <tr>
                        <th style={{ width: 44 }}>#</th>
                        <th>Date</th>
                        <th>Vehicle Number</th>
                        <th>Bil Number</th>
                        <th>Route Code</th>
                        <th>Check By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedTrips.map((item, idx) => (
                        <tr key={idx}>
                          <td className="bu-td-num">{tripsPage * PREVIEW_PAGE_SIZE + idx + 1}</td>
                          <td>{item.date || '—'}</td>
                          <td>
                            <span className="bu-veh-pill">
                              <CIcon icon={cilTruck} size="sm" style={{ color: '#d97706' }} />
                              {item.vehicleNumber || '—'}
                            </span>
                          </td>
                          <td>
                            <strong>{item.billNumber || '—'}</strong>
                          </td>
                          <td>
                            <span className="bu-code-badge">{item.routeCode || '—'}</span>
                          </td>
                          <td>{item.checkBy || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div className="bu-pagination-bar">
                  <span>
                    Showing {filteredTrips.length === 0 ? 0 : tripsPage * PREVIEW_PAGE_SIZE + 1}–
                    {Math.min((tripsPage + 1) * PREVIEW_PAGE_SIZE, filteredTrips.length)} of{' '}
                    <strong>{filteredTrips.length}</strong> preview records
                  </span>

                  {tripsTotalPages > 1 && (
                    <div className="bu-page-controls">
                      <button
                        className="bu-page-btn"
                        onClick={() => setTripsPage((p) => Math.max(0, p - 1))}
                        disabled={tripsPage === 0}
                      >
                        <CIcon icon={cilChevronLeft} size="sm" />
                      </button>
                      {Array.from({ length: tripsTotalPages }, (_, i) => i)
                        .filter((p) => Math.abs(p - tripsPage) <= 2)
                        .map((p) => (
                          <button
                            key={p}
                            className={`bu-page-btn ${p === tripsPage ? 'active' : ''}`}
                            onClick={() => setTripsPage(p)}
                          >
                            {p + 1}
                          </button>
                        ))}
                      <button
                        className="bu-page-btn"
                        onClick={() => setTripsPage((p) => Math.min(tripsTotalPages - 1, p + 1))}
                        disabled={tripsPage >= tripsTotalPages - 1}
                      >
                        <CIcon icon={cilChevronRight} size="sm" />
                      </button>
                    </div>
                  )}
                </div>
              </CCardBody>
            </CCard>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 2: DAILY EXPENSES SHEET
         ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'expenses' && (
        <>
          <CCard className="bu-card">
            <CCardHeader className="bu-card-header">
              <div className="bu-card-title">
                <CIcon icon={cilMoney} className="text-success" />
                <span>Upload Vehicle Daily Expenses Sheet</span>
              </div>
            </CCardHeader>

            <CCardBody className="bu-card-body">
              {/* Upload Dropzone */}
              {!expensesFile ? (
                <div
                  className={`bu-dropzone ${expensesDragOver ? 'dragover' : ''}`}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setExpensesDragOver(true)
                  }}
                  onDragLeave={() => setExpensesDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setExpensesDragOver(false)
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleSelectExpensesFile(e.dataTransfer.files[0])
                    }
                  }}
                  onClick={() => expenseFileInputRef.current?.click()}
                  id="dropzone-expenses-sheet"
                >
                  <input
                    type="file"
                    ref={expenseFileInputRef}
                    style={{ display: 'none' }}
                    accept=".xlsx, .xls, .csv"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleSelectExpensesFile(e.target.files[0])
                      }
                    }}
                  />
                  <div className="bu-dropzone-icon">
                    <CIcon icon={cilCloudUpload} size="xl" />
                  </div>
                  <h4 className="bu-dropzone-heading">Drag &amp; drop your expenses Excel sheet here</h4>
                  <p className="bu-dropzone-sub">
                    or <span className="bu-browse-link">browse from your computer</span>
                  </p>
                  <span className="bu-format-pill">Accepts .xlsx, .xls, .csv</span>
                </div>
              ) : (
                /* Selected File Card */
                <div className="bu-file-card">
                  <div className="bu-file-left">
                    <div className="bu-file-icon">
                      <CIcon icon={cilDescription} />
                    </div>
                    <div>
                      <div className="bu-file-name">{expensesFile.name}</div>
                      <div className="bu-file-meta">
                        <span>{formatFileSize(expensesFile.size)}</span>
                        <span>•</span>
                        <span>{expensesData.length} records parsed</span>
                        <span>•</span>
                        <span className="bu-file-status-pill">Ready to Upload</span>
                      </div>
                    </div>
                  </div>

                  <div className="bu-file-actions">
                    <button
                      className="bu-btn-remove-file"
                      onClick={handleResetExpenses}
                      disabled={expensesLoading}
                      id="btn-remove-expenses-file"
                    >
                      <CIcon icon={cilTrash} size="sm" /> Change File
                    </button>
                    <button
                      className="bu-btn-upload-now"
                      onClick={handleUploadExpenses}
                      disabled={expensesLoading}
                      id="btn-submit-expenses-file"
                    >
                      {expensesLoading ? (
                        <>
                          <CSpinner size="sm" style={{ marginRight: 6 }} /> Processing…
                        </>
                      ) : (
                        <>
                          <CIcon icon={cilCloudUpload} /> Upload &amp; Process to Server
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Validation Errors Display */}
              {expensesErrors.length > 0 && (
                <div className="bu-val-box" id="expenses-upload-validation-errors">
                  <div className="bu-val-header">
                    <div className="bu-val-title">
                      <CIcon icon={cilWarning} className="text-danger" />
                      <span>Upload Validation Errors</span>
                      <span className="bu-val-count-badge">{expensesErrors.length} Failed</span>
                    </div>
                    {expensesSummary?.totalRows != null && (
                      <div className="bu-val-summary-text">
                        Total Rows: <strong>{expensesSummary.totalRows}</strong> | Errors:{' '}
                        <strong className="text-danger">
                          {expensesSummary.errorCount ?? expensesErrors.length}
                        </strong>
                      </div>
                    )}
                  </div>

                  <div className="bu-val-table-wrap">
                    <table className="bu-val-table">
                      <thead>
                        <tr>
                          <th style={{ width: 70 }}>Row</th>
                          <th style={{ width: 140 }}>Field</th>
                          <th style={{ width: 150 }}>Entered Value</th>
                          <th>Validation Error</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expensesErrors.map((err, idx) => (
                          <tr key={idx}>
                            <td>
                              <span className="bu-val-row-pill">Row {err.rowNumber ?? idx + 1}</span>
                            </td>
                            <td>
                              <span className="bu-val-field">{err.field || '—'}</span>
                            </td>
                            <td>
                              <code className="bu-val-value">
                                {err.value !== undefined &&
                                err.value !== null &&
                                String(err.value).trim() !== ''
                                  ? String(err.value)
                                  : '[Empty]'}
                              </code>
                            </td>
                            <td>
                              <div className="bu-val-msg">
                                <CIcon
                                  icon={cilBan}
                                  size="sm"
                                  className="text-danger"
                                  style={{ flexShrink: 0 }}
                                />
                                <span>{err.message || 'Validation error'}</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="bu-val-footer-hint mt-2">
                    💡 Please fix these rows in your Excel file (e.g. check vehicle numbers, expense amounts, or dates), then re-upload.
                  </div>
                </div>
              )}
            </CCardBody>
          </CCard>

          {/* Parsed Live Preview Section */}
          {expensesData.length > 0 && (
            <CCard className="bu-card">
              <CCardHeader className="bu-card-header">
                <div className="bu-card-title">
                  <CIcon icon={cilMoney} className="text-success" />
                  <span>Parsed Expenses Preview &amp; Summary</span>
                </div>
              </CCardHeader>

              <CCardBody className="bu-card-body">
                {/* Metrics Summary Grid */}
                <div className="bu-metrics-grid">
                  <div className="bu-metric-card">
                    <span className="bu-metric-label">Total Records</span>
                    <span className="bu-metric-value">{totalExpenseCount}</span>
                  </div>
                  <div className="bu-metric-card">
                    <span className="bu-metric-label">Total Expense</span>
                    <span className="bu-metric-value highlight">Rs. {formatCurrency(totalExpenseAmount)}</span>
                  </div>
                  <div className="bu-metric-card">
                    <span className="bu-metric-label">Active Vehicles</span>
                    <span className="bu-metric-value green">{uniqueExpenseVehiclesCount} vehicles</span>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="bu-search-row">
                  <div className="bu-search-wrap">
                    <CIcon icon={cilSearch} size="sm" className="bu-search-icon" />
                    <input
                      type="text"
                      className="bu-search-input"
                      placeholder="Search by vehicle, expense amount, or date..."
                      value={expensesSearch}
                      onChange={(e) => {
                        setExpensesSearch(e.target.value)
                        setExpensesPage(0)
                      }}
                    />
                  </div>
                  {expensesSearch && (
                    <button
                      className="bu-btn-remove-file"
                      onClick={() => setExpensesSearch('')}
                      style={{ padding: '0.45rem 0.75rem', fontSize: '0.78rem' }}
                    >
                      <CIcon icon={cilReload} size="sm" /> Clear Search
                    </button>
                  )}
                </div>

                {/* Data Preview Table */}
                <div className="bu-table-wrap">
                  <table className="bu-table">
                    <thead>
                      <tr>
                        <th style={{ width: 44 }}>#</th>
                        <th>Date</th>
                        <th>Vehicle Number</th>
                        <th>Expense</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedExpenses.map((item, idx) => (
                        <tr key={idx}>
                          <td className="bu-td-num">{expensesPage * PREVIEW_PAGE_SIZE + idx + 1}</td>
                          <td>{item.date || '—'}</td>
                          <td>
                            <span className="bu-veh-pill">
                              <CIcon icon={cilTruck} size="sm" style={{ color: '#059669' }} />
                              {item.vehicleNumber || '—'}
                            </span>
                          </td>
                          <td className="bu-currency-pill" style={{ color: '#dc2626', fontWeight: 700 }}>
                            Rs. {formatCurrency(item.expense)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div className="bu-pagination-bar">
                  <span>
                    Showing {filteredExpenses.length === 0 ? 0 : expensesPage * PREVIEW_PAGE_SIZE + 1}–
                    {Math.min((expensesPage + 1) * PREVIEW_PAGE_SIZE, filteredExpenses.length)} of{' '}
                    <strong>{filteredExpenses.length}</strong> preview records
                  </span>

                  {expensesTotalPages > 1 && (
                    <div className="bu-page-controls">
                      <button
                        className="bu-page-btn"
                        onClick={() => setExpensesPage((p) => Math.max(0, p - 1))}
                        disabled={expensesPage === 0}
                      >
                        <CIcon icon={cilChevronLeft} size="sm" />
                      </button>
                      {Array.from({ length: expensesTotalPages }, (_, i) => i)
                        .filter((p) => Math.abs(p - expensesPage) <= 2)
                        .map((p) => (
                          <button
                            key={p}
                            className={`bu-page-btn ${p === expensesPage ? 'active' : ''}`}
                            onClick={() => setExpensesPage(p)}
                          >
                            {p + 1}
                          </button>
                        ))}
                      <button
                        className="bu-page-btn"
                        onClick={() => setExpensesPage((p) => Math.min(expensesTotalPages - 1, p + 1))}
                        disabled={expensesPage >= expensesTotalPages - 1}
                      >
                        <CIcon icon={cilChevronRight} size="sm" />
                      </button>
                    </div>
                  )}
                </div>
              </CCardBody>
            </CCard>
          )}
        </>
      )}
    </div>
  )
}

export default BulkUpload
