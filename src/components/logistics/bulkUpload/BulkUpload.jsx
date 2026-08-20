/**
 * Logistics Bulk Excel Uploader
 *
 * Streamlined interface for uploading, validating, and previewing:
 *   1. Daily Routes / Material Transport Trips Sheet
 *   2. Daily Site & Fleet Expenses Sheet
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
  const [tripsDragOver, setTripsDragOver] = useState(false)
  const tripFileInputRef = useRef(null)

  // ── Expenses State ──────────────────────────────────────────────────────────
  const [expensesFile, setExpensesFile] = useState(null)
  const [expensesData, setExpensesData] = useState([])
  const [expensesLoading, setExpensesLoading] = useState(false)
  const [expensesSearch, setExpensesSearch] = useState('')
  const [expensesPage, setExpensesPage] = useState(0)
  const [expensesErrors, setExpensesErrors] = useState([])
  const [expensesDragOver, setExpensesDragOver] = useState(false)
  const expenseFileInputRef = useRef(null)

  // ─── Sample Template Downloads ──────────────────────────────────────────────
  const downloadTripsTemplate = () => {
    const wsData = [
      [
        'Date',
        'LAND',
        'Vehial Number',
        'Bil Number',
        'Cube',
        'KM',
        'Transport Per Rate',
        'Dilivery Location',
        'Daily Expence',
        'Paybel Amount',
      ],
      ['8/7/2026', 'L', 'LC-4838', '7901', 3.7, 24, 10952.0, '28+580', 0, 10952.0],
      ['8/7/2026', 'L', 'LI-8902', '7902', 3.9, 24, 11544.0, '28+580', 0, 11544.0],
      ['8/7/2026', 'S', 'LK-5177', '7904', 3.0, 24, 8880.0, '28+580', 0, 8880.0],
      ['8/7/2026', 'L', 'LM-4565', '7911', 4.0, 24, 11840.0, '28+580', 10000.0, 1840.0],
    ]
    const ws = XLSX.utils.aoa_to_sheet(wsData)
    ws['!cols'] = [
      { wch: 12 },
      { wch: 8 },
      { wch: 16 },
      { wch: 14 },
      { wch: 10 },
      { wch: 10 },
      { wch: 18 },
      { wch: 18 },
      { wch: 14 },
      { wch: 14 },
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Daily Routes')
    XLSX.writeFile(wb, 'Material_Routes_Template.xlsx')
  }

  const downloadExpensesTemplate = () => {
    const wsData = [
      [
        'Date',
        'Category',
        'Vehicle/Ref',
        'Voucher No',
        'Paid To',
        'Payment Method',
        'Amount (LKR)',
        'Site Allocation',
        'Remarks',
      ],
      ['8/7/2026', 'Fuel / Diesel', 'WP-CAC-1234', 'EXP-1001', 'Ceypetco Station', 'Fuel Card', 45000.0, '28+580', '120L Diesel'],
      ['8/7/2026', 'Driver Advance', 'DRV-001', 'EXP-1002', 'Kamal Perera', 'Cash', 10000.0, '28+580', 'Trip Advance'],
      ['8/7/2026', 'Machinery Hire', 'Excavator #1', 'EXP-1003', 'Plant Hire Ltd', 'Bank Transfer', 100000.0, 'Quarry Land L', '10-hour hire'],
    ]
    const ws = XLSX.utils.aoa_to_sheet(wsData)
    ws['!cols'] = [
      { wch: 12 },
      { wch: 18 },
      { wch: 16 },
      { wch: 14 },
      { wch: 20 },
      { wch: 16 },
      { wch: 15 },
      { wch: 16 },
      { wch: 20 },
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
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' })

        const formatted = json
          .map((row) => {
            const rawDate = row['Date'] || row['date'] || ''
            const rawLand = row['LAND'] || row['Land'] || row['land'] || '-'
            const rawVeh =
              row['Vehial Number'] || row['Vehicle Number'] || row['vehicle'] || row['Vehical'] || ''
            const rawBill = row['Bil Number'] || row['Bill Number'] || row['bill'] || ''
            const rawCube = parseFloat(row['Cube'] || row['cube'] || 0) || 0
            const rawKm = parseFloat(row['KM'] || row['km'] || 0) || 0
            const rawRate =
              parseFloat(row['Transport Per Rate'] || row['Transport Rate'] || row['transport'] || 0) || 0
            const rawLoc =
              row['Dilivery Location'] || row['Delivery Location'] || row['location'] || '-'
            const rawExpense =
              parseFloat(row['Daily Expence'] || row['Daily Expense'] || row['expense'] || 0) || 0
            const rawPayable =
              row['Paybel Amount'] !== undefined && row['Paybel Amount'] !== ''
                ? parseFloat(row['Paybel Amount'])
                : rawRate - rawExpense

            return {
              date: rawDate,
              land: rawLand,
              vehicleNumber: rawVeh,
              billNumber: rawBill,
              cube: rawCube,
              km: rawKm,
              transportRate: rawRate,
              deliveryLocation: rawLoc,
              dailyExpense: rawExpense,
              payableAmount: rawPayable,
            }
          })
          .filter((item) => item.vehicleNumber || item.billNumber || item.date)

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
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' })

        const formatted = json
          .map((row) => ({
            date: row['Date'] || row['date'] || '',
            category: row['Category'] || row['Expense Category'] || row['category'] || 'General Expense',
            refNo: row['Vehicle/Ref'] || row['Vehicle Number'] || row['ref'] || '-',
            voucherNo: row['Voucher No'] || row['voucher'] || '-',
            paidTo: row['Paid To'] || row['beneficiary'] || '-',
            method: row['Payment Method'] || row['method'] || 'Cash',
            amount: parseFloat(row['Amount (LKR)'] || row['Amount'] || row['amount'] || 0) || 0,
            site: row['Site Allocation'] || row['Site'] || row['site'] || 'General Site',
            remarks: row['Remarks'] || row['Notes'] || row['remarks'] || '',
          }))
          .filter((item) => item.date || item.amount || item.category)

        setExpensesData(formatted)
        setExpensesPage(0)
      } catch (err) {
        console.warn('Local preview parse error:', err)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  // ─── Handle File Selections ──────────────────────────────────────────────────
  const handleSelectTripsFile = (file) => {
    if (!validateFile(file)) return
    setTripsFile(file)
    setTripsErrors([])
    parseTripsLocal(file)
  }

  const handleSelectExpensesFile = (file) => {
    if (!validateFile(file)) return
    setExpensesFile(file)
    setExpensesErrors([])
    parseExpensesLocal(file)
  }

  // ─── Upload to Backend Handlers ──────────────────────────────────────────────
  const handleUploadTrips = async () => {
    if (!tripsFile) return
    setTripsLoading(true)
    setTripsErrors([])

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
      const rawErrors = err.errors || err.response?.data?.errors || []
      if (rawErrors.length > 0) {
        setTripsErrors(rawErrors)
      }
      Swal.fire({
        icon: 'error',
        title: 'Upload Failed',
        text: err.message || 'Unable to upload trips sheet. Please check your data format.',
        confirmButtonColor: '#dc2626',
      })
    } finally {
      setTripsLoading(false)
    }
  }

  const handleUploadExpenses = async () => {
    if (!expensesFile) return
    setExpensesLoading(true)
    setExpensesErrors([])

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
      const rawErrors = err.errors || err.response?.data?.errors || []
      if (rawErrors.length > 0) {
        setExpensesErrors(rawErrors)
      }
      Swal.fire({
        icon: 'error',
        title: 'Upload Failed',
        text: err.message || 'Unable to upload expenses sheet. Please check your data format.',
        confirmButtonColor: '#dc2626',
      })
    } finally {
      setExpensesLoading(false)
    }
  }

  // ─── Reset Handlers ──────────────────────────────────────────────────────────
  const handleResetTrips = () => {
    setTripsFile(null)
    setTripsData([])
    setTripsErrors([])
    setTripsSearch('')
    setTripsPage(0)
    if (tripFileInputRef.current) tripFileInputRef.current.value = ''
  }

  const handleResetExpenses = () => {
    setExpensesFile(null)
    setExpensesData([])
    setExpensesErrors([])
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
        (item.billNumber || '').toString().includes(q) ||
        (item.deliveryLocation || '').toLowerCase().includes(q) ||
        (item.land || '').toLowerCase().includes(q) ||
        (item.date || '').includes(q)
    )
  }, [tripsData, tripsSearch])

  const totalTripsCount = tripsData.length
  const totalCubes = tripsData.reduce((sum, item) => sum + (Number(item.cube) || 0), 0)
  const totalGrossTransport = tripsData.reduce((sum, item) => sum + (Number(item.transportRate) || 0), 0)
  const totalDailyExpensesInTrips = tripsData.reduce((sum, item) => sum + (Number(item.dailyExpense) || 0), 0)
  const totalNetPayable = tripsData.reduce((sum, item) => sum + (Number(item.payableAmount) || 0), 0)

  const tripsTotalPages = Math.ceil(filteredTrips.length / PREVIEW_PAGE_SIZE) || 1
  const paginatedTrips = filteredTrips.slice(
    tripsPage * PREVIEW_PAGE_SIZE,
    (tripsPage + 1) * PREVIEW_PAGE_SIZE
  )

  // ─── Expenses Filter & Metrics ───────────────────────────────────────────────
  const filteredExpenses = useMemo(() => {
    if (!expensesSearch.trim()) return expensesData
    const q = expensesSearch.toLowerCase()
    return expensesData.filter(
      (item) =>
        (item.category || '').toLowerCase().includes(q) ||
        (item.refNo || '').toLowerCase().includes(q) ||
        (item.paidTo || '').toLowerCase().includes(q) ||
        (item.voucherNo || '').toLowerCase().includes(q)
    )
  }, [expensesData, expensesSearch])

  const totalExpenseAmount = expensesData.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
  const fuelExpenses = expensesData
    .filter((i) => (i.category || '').includes('Fuel'))
    .reduce((sum, i) => sum + (Number(i.amount) || 0), 0)
  const machineryExpenses = expensesData
    .filter((i) => (i.category || '').includes('Machinery') || (i.refNo || '').includes('Excavator'))
    .reduce((sum, i) => sum + (Number(i.amount) || 0), 0)
  const driverAdvances = expensesData
    .filter((i) => (i.category || '').includes('Advance') || (i.category || '').includes('Labour'))
    .reduce((sum, i) => sum + (Number(i.amount) || 0), 0)

  const expensesTotalPages = Math.ceil(filteredExpenses.length / PREVIEW_PAGE_SIZE) || 1
  const paginatedExpenses = filteredExpenses.slice(
    expensesPage * PREVIEW_PAGE_SIZE,
    (expensesPage + 1) * PREVIEW_PAGE_SIZE
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
                <div className="bu-val-box">
                  <div className="bu-val-header">
                    <span className="bu-val-title">
                      <CIcon icon={cilBan} /> {tripsErrors.length} Validation Errors Found
                    </span>
                  </div>
                  <div className="bu-val-table-wrap">
                    <table className="bu-val-table">
                      <thead>
                        <tr>
                          <th style={{ width: 80 }}>Row</th>
                          <th>Field</th>
                          <th>Value</th>
                          <th>Message</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tripsErrors.map((err, idx) => (
                          <tr key={idx}>
                            <td>Row {err.rowNumber ?? idx + 1}</td>
                            <td>{err.field || '—'}</td>
                            <td><code>{err.value || '[Empty]'}</code></td>
                            <td style={{ color: '#c53030' }}>{err.message || 'Validation error'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
                    <span className="bu-metric-label">Total Trips</span>
                    <span className="bu-metric-value">{totalTripsCount}</span>
                  </div>
                  <div className="bu-metric-card">
                    <span className="bu-metric-label">Total Volume</span>
                    <span className="bu-metric-value highlight">{totalCubes.toFixed(1)} cubes</span>
                  </div>
                  <div className="bu-metric-card">
                    <span className="bu-metric-label">Gross Transport</span>
                    <span className="bu-metric-value">Rs. {formatCurrency(totalGrossTransport)}</span>
                  </div>
                  <div className="bu-metric-card">
                    <span className="bu-metric-label">Daily Expenses</span>
                    <span className="bu-metric-value" style={{ color: '#dc2626' }}>
                      Rs. {formatCurrency(totalDailyExpensesInTrips)}
                    </span>
                  </div>
                  <div className="bu-metric-card">
                    <span className="bu-metric-label">Net Payable</span>
                    <span className="bu-metric-value green">Rs. {formatCurrency(totalNetPayable)}</span>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="bu-search-row">
                  <div className="bu-search-wrap">
                    <CIcon icon={cilSearch} size="sm" className="bu-search-icon" />
                    <input
                      type="text"
                      className="bu-search-input"
                      placeholder="Search by vehicle, bill number, location, or date..."
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
                        <th>Land</th>
                        <th>Vehicle No</th>
                        <th>Bill No</th>
                        <th>Cube</th>
                        <th>KM</th>
                        <th>Transport Rate</th>
                        <th>Delivery Location</th>
                        <th>Daily Exp.</th>
                        <th>Payable</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedTrips.map((item, idx) => (
                        <tr key={idx}>
                          <td className="bu-td-num">{tripsPage * PREVIEW_PAGE_SIZE + idx + 1}</td>
                          <td>{item.date || '—'}</td>
                          <td>{item.land || '—'}</td>
                          <td>
                            <span className="bu-veh-pill">
                              <CIcon icon={cilTruck} size="sm" style={{ color: '#d97706' }} />
                              {item.vehicleNumber || '—'}
                            </span>
                          </td>
                          <td><strong>{item.billNumber || '—'}</strong></td>
                          <td>{item.cube}</td>
                          <td>{item.km}</td>
                          <td className="bu-currency-pill">Rs. {formatCurrency(item.transportRate)}</td>
                          <td>{item.deliveryLocation || '—'}</td>
                          <td style={{ color: item.dailyExpense > 0 ? '#dc2626' : '#64748b' }}>
                            Rs. {formatCurrency(item.dailyExpense)}
                          </td>
                          <td className="bu-currency-pill net">Rs. {formatCurrency(item.payableAmount)}</td>
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
                <span>Upload Daily Fleet &amp; Site Expenses Sheet</span>
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
                <div className="bu-val-box">
                  <div className="bu-val-header">
                    <span className="bu-val-title">
                      <CIcon icon={cilBan} /> {expensesErrors.length} Validation Errors Found
                    </span>
                  </div>
                  <div className="bu-val-table-wrap">
                    <table className="bu-val-table">
                      <thead>
                        <tr>
                          <th style={{ width: 80 }}>Row</th>
                          <th>Field</th>
                          <th>Value</th>
                          <th>Message</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expensesErrors.map((err, idx) => (
                          <tr key={idx}>
                            <td>Row {err.rowNumber ?? idx + 1}</td>
                            <td>{err.field || '—'}</td>
                            <td><code>{err.value || '[Empty]'}</code></td>
                            <td style={{ color: '#c53030' }}>{err.message || 'Validation error'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
                    <span className="bu-metric-value">{expensesData.length}</span>
                  </div>
                  <div className="bu-metric-card">
                    <span className="bu-metric-label">Total Expense</span>
                    <span className="bu-metric-value highlight">Rs. {formatCurrency(totalExpenseAmount)}</span>
                  </div>
                  <div className="bu-metric-card">
                    <span className="bu-metric-label">Fuel / Diesel</span>
                    <span className="bu-metric-value">Rs. {formatCurrency(fuelExpenses)}</span>
                  </div>
                  <div className="bu-metric-card">
                    <span className="bu-metric-label">Machinery Hire</span>
                    <span className="bu-metric-value">Rs. {formatCurrency(machineryExpenses)}</span>
                  </div>
                  <div className="bu-metric-card">
                    <span className="bu-metric-label">Driver Advances</span>
                    <span className="bu-metric-value">Rs. {formatCurrency(driverAdvances)}</span>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="bu-search-row">
                  <div className="bu-search-wrap">
                    <CIcon icon={cilSearch} size="sm" className="bu-search-icon" />
                    <input
                      type="text"
                      className="bu-search-input"
                      placeholder="Search by category, vehicle/ref, voucher, or beneficiary..."
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
                        <th>Category</th>
                        <th>Vehicle / Ref</th>
                        <th>Voucher No</th>
                        <th>Paid To</th>
                        <th>Payment Method</th>
                        <th>Amount</th>
                        <th>Site Allocation</th>
                        <th>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedExpenses.map((item, idx) => (
                        <tr key={idx}>
                          <td className="bu-td-num">{expensesPage * PREVIEW_PAGE_SIZE + idx + 1}</td>
                          <td>{item.date || '—'}</td>
                          <td><strong>{item.category}</strong></td>
                          <td>
                            <span className="bu-veh-pill">{item.refNo}</span>
                          </td>
                          <td>{item.voucherNo}</td>
                          <td>{item.paidTo}</td>
                          <td>{item.method}</td>
                          <td className="bu-currency-pill" style={{ color: '#dc2626' }}>
                            Rs. {formatCurrency(item.amount)}
                          </td>
                          <td>{item.site}</td>
                          <td>{item.remarks || '—'}</td>
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
