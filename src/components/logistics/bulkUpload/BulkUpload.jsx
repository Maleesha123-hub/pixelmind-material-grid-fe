import React, { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import {
  CRow,
  CCol,
  CCard,
  CCardBody,
  CCardHeader,
  CButton,
  CAlert,
  CSpinner,
  CBadge,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilCloudUpload,
  cilDescription,
  cilTruck,
  cilMoney,
  cilCheckCircle,
  cilWarning,
  cilSearch,
  cilTrash,
  cilSave,
  cilInfo,
} from '@coreui/icons'
import './BulkUpload.css'
import Swal from 'sweetalert2'

import bulkUploadService from '../../../service/bulkUploadService'

const REQUIRED_TRIP_COLUMNS = ['Date', 'Vehicle Number', 'Check By', 'Bil Number', 'Route Code']

const REQUIRED_EXPENSE_COLUMNS = ['Date', 'Vehicle Number', 'Amount (LKR)', 'Remarks']

const BulkUpload = () => {
  const [activeTab, setActiveTab] = useState('trips') // 'trips' | 'expenses'

  // Uploader 1 State (Trips)
  const [tripsData, setTripsData] = useState([])
  const [tripsFileName, setTripsFileName] = useState('')
  const [tripsDragOver, setTripsDragOver] = useState(false)
  const [tripsSearch, setTripsSearch] = useState('')
  const [tripsLoading, setTripsLoading] = useState(false)

  const tripFileInputRef = useRef(null)

  // Uploader 2 State (Expenses)
  const [expensesData, setExpensesData] = useState([])
  const [expensesFileName, setExpensesFileName] = useState('')
  const [expensesDragOver, setExpensesDragOver] = useState(false)
  const [expensesSearch, setExpensesSearch] = useState('')
  const [expensesLoading, setExpensesLoading] = useState(false)

  const expenseFileInputRef = useRef(null)

  // ─── Format Currency ──────────────────────────────────────────────────────
  const formatLKR = (num) => {
    if (isNaN(num) || num === null || num === undefined) return '0.00'
    return Number(num).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  // ─── Upload & Parse Material Trip Sheet (Backend API Connected) ───────────
  const handleTripsFile = async (file) => {
    if (!file) return
    setTripsLoading(true)
    setTripsFileName(file.name)

    try {
      // 1. Send file to backend Spring Boot service
      const backendResponse = await bulkUploadService.uploadTripsSheet(file)

      // 2. Parse client-side for immediate display & preview
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
                row['Vehial Number'] ||
                row['Vehicle Number'] ||
                row['vehicle'] ||
                row['Vehical'] ||
                ''
              const rawBill = row['Bil Number'] || row['Bill Number'] || row['bill'] || ''
              const rawCube = parseFloat(row['Cube'] || row['cube'] || 0) || 0
              const rawKm = parseFloat(row['KM'] || row['km'] || 0) || 0
              const rawRate =
                parseFloat(
                  row['Transport Per Rate'] || row['Transport Rate'] || row['transport'] || 0,
                ) || 0
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
        } catch (parseErr) {
          console.warn('Local preview parse error:', parseErr)
        }
      }
      reader.readAsArrayBuffer(file)

      Swal.fire({
        icon: 'success',
        title: 'Upload Successful!',
        text: backendResponse.message || `"${file.name}" was saved to the system successfully.`,
        confirmButtonText: 'Continue',
        confirmButtonColor: '#f59e0b',
        timer: 4000,
        timerProgressBar: true,
      })
    } catch (err) {
      console.error('Trip upload error:', err)
      Swal.fire({
        icon: 'error',
        title: 'Upload Failed',
        text: err.message || 'Unable to connect to backend service. Please try again.',
        confirmButtonText: 'OK, got it',
        confirmButtonColor: '#dc2626',
      })
    } finally {
      setTripsLoading(false)
    }
  }

  // ─── Upload & Parse Daily Expenses Sheet (Backend API Connected) ──────────
  const handleExpensesFile = async (file) => {
    if (!file) return
    setExpensesLoading(true)
    setExpensesFileName(file.name)

    try {
      // 1. Send file to backend Spring Boot service
      const backendResponse = await bulkUploadService.uploadDailyExpenses(file)

      // 2. Parse client-side for immediate display & preview
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
              category:
                row['Category'] || row['Expense Category'] || row['category'] || 'General Expense',
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
        } catch (parseErr) {
          console.warn('Local preview parse error:', parseErr)
        }
      }
      reader.readAsArrayBuffer(file)

      Swal.fire({
        icon: 'success',
        title: 'Expenses Uploaded!',
        text: backendResponse || `"${file.name}" was saved to the system successfully.`,
        confirmButtonText: 'Continue',
        confirmButtonColor: '#0ea5e9',
        timer: 4000,
        timerProgressBar: true,
      })
    } catch (err) {
      console.error('Expense upload error:', err)
      Swal.fire({
        icon: 'error',
        title: 'Upload Failed',
        text: err.message || 'Unable to connect to backend service. Please try again.',
        confirmButtonText: 'OK, got it',
        confirmButtonColor: '#dc2626',
      })
    } finally {
      setExpensesLoading(false)
    }
  }

  // ─── Download Sample Excel Templates ──────────────────────────────────────
  const downloadSampleTripsTemplate = () => {
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
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sample Trips')
    XLSX.writeFile(wb, 'Sample_Material_Trip_Logistics.xlsx')
  }

  const downloadSampleExpensesTemplate = () => {
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
      [
        '8/7/2026',
        'Fuel / Diesel',
        'WP-CAC-1234',
        'EXP-1001',
        'Ceypetco Fuel Station',
        'Fuel Card',
        45000.0,
        '28+580',
        '120L Diesel',
      ],
      [
        '8/7/2026',
        'Driver Advance',
        'DRV-001 (Kamal)',
        'EXP-1002',
        'Kamal Perera',
        'Cash',
        10000.0,
        '28+580',
        'Trip Advance',
      ],
      [
        '8/7/2026',
        'Machinery Hire',
        'Excavator Kondaya',
        'EXP-1003',
        'Kondaya Plant Hire',
        'Bank Transfer',
        100000.0,
        'Quarry Land L',
        '10-hour hire',
      ],
    ]
    const ws = XLSX.utils.aoa_to_sheet(wsData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Daily Expenses')
    XLSX.writeFile(wb, 'Sample_Daily_Expenses.xlsx')
  }

  // ─── Trips Calculations ───────────────────────────────────────────────────
  const filteredTrips = tripsData.filter((item) => {
    const q = tripsSearch.toLowerCase()
    return (
      (item.vehicleNumber || '').toLowerCase().includes(q) ||
      (item.billNumber || '').toString().includes(q) ||
      (item.deliveryLocation || '').toLowerCase().includes(q) ||
      (item.land || '').toLowerCase().includes(q) ||
      (item.date || '').includes(q)
    )
  })

  const totalTripsCount = tripsData.length
  const totalCubes = tripsData.reduce((sum, item) => sum + (Number(item.cube) || 0), 0)
  const totalGrossTransport = tripsData.reduce(
    (sum, item) => sum + (Number(item.transportRate) || 0),
    0,
  )
  const totalDailyExpensesInTrips = tripsData.reduce(
    (sum, item) => sum + (Number(item.dailyExpense) || 0),
    0,
  )
  const totalNetPayable = tripsData.reduce(
    (sum, item) => sum + (Number(item.payableAmount) || 0),
    0,
  )

  // ─── Expenses Calculations ────────────────────────────────────────────────
  const filteredExpenses = expensesData.filter((item) => {
    const q = expensesSearch.toLowerCase()
    return (
      (item.category || '').toLowerCase().includes(q) ||
      (item.refNo || '').toLowerCase().includes(q) ||
      (item.paidTo || '').toLowerCase().includes(q) ||
      (item.voucherNo || '').toLowerCase().includes(q)
    )
  })

  const totalExpenseAmount = expensesData.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
  const fuelExpenses = expensesData
    .filter((i) => (i.category || '').includes('Fuel'))
    .reduce((sum, i) => sum + i.amount, 0)
  const machineryExpenses = expensesData
    .filter(
      (i) => (i.category || '').includes('Machinery') || (i.refNo || '').includes('Excavator'),
    )
    .reduce((sum, i) => sum + i.amount, 0)
  const driverAdvances = expensesData
    .filter((i) => (i.category || '').includes('Advance') || (i.category || '').includes('Labour'))
    .reduce((sum, i) => sum + i.amount, 0)

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
              Upload, validate, and process material dispatch sheets & daily site expense ledgers
            </p>
          </div>
        </div>
      </div>

      {/* ── Dual Section Tabs ── */}
      <div className="bu-tab-container">
        <button
          className={`bu-tab-btn ${activeTab === 'trips' ? 'bu-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('trips')}
        >
          <CIcon icon={cilTruck} size="lg" />
          <span>Material Transport Trips Sheet</span>
          <span className="bu-tab-badge bu-tab-badge--amber">
            Dispatch Details {tripsData.length > 0 ? `(${tripsData.length})` : ''}
          </span>
        </button>
        <button
          className={`bu-tab-btn ${activeTab === 'expenses' ? 'bu-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('expenses')}
        >
          <CIcon icon={cilMoney} size="lg" />
          <span>Daily Expenses Sheet</span>
          <span className="bu-tab-badge bu-tab-badge--blue">
            Fleet & Site Ledger {expensesData.length > 0 ? `(${expensesData.length})` : ''}
          </span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 1: Material Transport Trips Uploader (Picture Format)
         ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'trips' && (
        <>
          {/* Upload Card */}
          <CCard className="bu-card">
            <CCardHeader className="bu-card-header">
              <div className="bu-card-title">
                <CIcon icon={cilDescription} className="text-warning" />
                <span>Upload Material Trip Sheet (Sample Format)</span>
              </div>
              <div className="d-flex align-items-center gap-2">
                <button className="bu-btn-download" onClick={downloadSampleTripsTemplate}>
                  <CIcon icon={cilDescription} /> Download Sample Template
                </button>
              </div>
            </CCardHeader>
            <CCardBody className="bu-card-body">
              <div
                className={`bu-dropzone ${tripsDragOver ? 'bu-dropzone--dragover' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault()
                  setTripsDragOver(true)
                }}
                onDragLeave={() => setTripsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setTripsDragOver(false)
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleTripsFile(e.dataTransfer.files[0])
                  }
                }}
                onClick={() => tripFileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={tripFileInputRef}
                  className="bu-file-input"
                  accept=".xlsx, .xls, .csv"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleTripsFile(e.target.files[0])
                    }
                  }}
                />
                <div className="bu-dropzone-icon">
                  {tripsLoading ? (
                    <CSpinner color="warning" />
                  ) : (
                    <CIcon icon={cilCloudUpload} size="xl" />
                  )}
                </div>
                <div className="bu-dropzone-title">
                  {tripsFileName ? tripsFileName : 'Drop your Excel trip file here, or browse'}
                </div>
                <div className="bu-dropzone-desc">
                  Supports .xlsx, .xls, .csv files. Expected columns: Date, LAND, Vehial Number, Bil
                  Number, Cube, KM, Transport Rate, Delivery Location, Daily Expence, Payable Amount
                </div>
                <CButton color="warning" size="sm" className="text-white fw-bold">
                  Browse Files
                </CButton>
              </div>

              {/* Column Verification Chips */}
              <div className="bu-columns-checklist">
                <span className="text-muted fw-bold me-2" style={{ fontSize: '0.75rem' }}>
                  <CIcon icon={cilInfo} className="me-1" /> Expected Columns:
                </span>
                {REQUIRED_TRIP_COLUMNS.map((col) => (
                  <span key={col} className="bu-col-chip bu-col-chip--matched">
                    <CIcon icon={cilCheckCircle} size="sm" /> {col}
                  </span>
                ))}
              </div>
            </CCardBody>
          </CCard>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 2: Daily Expenses Uploader
         ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'expenses' && (
        <>
          {/* Upload Card */}
          <CCard className="bu-card">
            <CCardHeader className="bu-card-header">
              <div className="bu-card-title">
                <CIcon icon={cilMoney} className="text-info" />
                <span>Upload Daily Site & Expenses Sheet</span>
              </div>
              <div className="d-flex align-items-center gap-2">
                <button className="bu-btn-download" onClick={downloadSampleExpensesTemplate}>
                  <CIcon icon={cilDescription} /> Download Expense Template
                </button>
              </div>
            </CCardHeader>
            <CCardBody className="bu-card-body">
              <div
                className={`bu-dropzone ${expensesDragOver ? 'bu-dropzone--dragover' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault()
                  setExpensesDragOver(true)
                }}
                onDragLeave={() => setExpensesDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setExpensesDragOver(false)
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleExpensesFile(e.dataTransfer.files[0])
                  }
                }}
                onClick={() => expenseFileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={expenseFileInputRef}
                  className="bu-file-input"
                  accept=".xlsx, .xls, .csv"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleExpensesFile(e.target.files[0])
                    }
                  }}
                />
                <div className="bu-dropzone-icon">
                  {expensesLoading ? (
                    <CSpinner color="info" />
                  ) : (
                    <CIcon icon={cilMoney} size="xl" />
                  )}
                </div>
                <div className="bu-dropzone-title">
                  {expensesFileName
                    ? expensesFileName
                    : 'Drop your Daily Expenses Excel file here, or browse'}
                </div>
                <div className="bu-dropzone-desc">
                  Supports .xlsx, .xls, .csv files. Columns: Date, Category, Vehicle/Ref, Voucher
                  No, Paid To, Payment Method, Amount, Site Allocation, Remarks
                </div>
                <CButton color="info" size="sm" className="text-white fw-bold">
                  Browse Files
                </CButton>
              </div>

              {/* Column Verification Chips */}
              <div className="bu-columns-checklist">
                <span className="text-muted fw-bold me-2" style={{ fontSize: '0.75rem' }}>
                  <CIcon icon={cilInfo} className="me-1" /> Expected Columns:
                </span>
                {REQUIRED_EXPENSE_COLUMNS.map((col) => (
                  <span key={col} className="bu-col-chip bu-col-chip--matched">
                    <CIcon icon={cilCheckCircle} size="sm" /> {col}
                  </span>
                ))}
              </div>
            </CCardBody>
          </CCard>
        </>
      )}
    </div>
  )
}

export default BulkUpload
