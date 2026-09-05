/**
 * Logistics Bulk Excel Uploader
 *
 * Streamlined interface for uploading, validating, and previewing:
 *   1. Daily Routes / Material Transport Trips Sheet
 *   2. Daily Fleet & Site Expenses Sheet
 *   3. Vehicle Licenses Sheet
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
import { CRow, CCol, CCard, CCardBody, CCardHeader, CSpinner } from '@coreui/react'
import {
  cilCloudUpload,
  cilCloudDownload,
  cilDescription,
  cilTruck,
  cilMoney,
  cilContact,
  cilSearch,
  cilTrash,
  cilCheckCircle,
  cilWarning,
  cilBan,
  cilChevronLeft,
  cilChevronRight,
  cilReload,
  cilFile,
  cilUser,
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
  const [activeTab, setActiveTab] = useState('trips') // 'trips' | 'expenses' | 'licenses'

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

  // ── Licenses State ──────────────────────────────────────────────────────────
  const [licensesFile, setLicensesFile] = useState(null)
  const [licensesData, setLicensesData] = useState([])
  const [licensesLoading, setLicensesLoading] = useState(false)
  const [licensesSearch, setLicensesSearch] = useState('')
  const [licensesPage, setLicensesPage] = useState(0)
  const [licensesErrors, setLicensesErrors] = useState([])
  const [licensesSummary, setLicensesSummary] = useState(null)
  const [licensesDragOver, setLicensesDragOver] = useState(false)
  const licenseFileInputRef = useRef(null)

  // ── Excavator Inspection & Checked By State ─────────────────────────────────
  const [inspectionFile, setInspectionFile] = useState(null)
  const [inspectionData, setInspectionData] = useState([])
  const [inspectionLoading, setInspectionLoading] = useState(false)
  const [inspectionSearch, setInspectionSearch] = useState('')
  const [inspectionPage, setInspectionPage] = useState(0)
  const [inspectionErrors, setInspectionErrors] = useState([])
  const [inspectionSummary, setInspectionSummary] = useState(null)
  const [inspectionDragOver, setInspectionDragOver] = useState(false)
  const inspectionFileInputRef = useRef(null)

  // ─── Sample Template Downloads ──────────────────────────────────────────────
  const downloadTripsTemplate = () => {
    const wsData = [
      ['Date', 'Vehicle Number', 'Bil Number', 'Route Code'],
      ['2026-08-07', 'LC-4838', '7901', 'RT000001'],
      ['2026-08-07', 'LI-8902', '7902', 'RT000001'],
      ['2026-08-07', 'LM-4535', '7903', 'RT000001'],
      ['2026-08-07', 'LK-5177', '7904', 'RT000001'],
    ]
    const ws = XLSX.utils.aoa_to_sheet(wsData)
    ws['!cols'] = [{ wch: 14 }, { wch: 18 }, { wch: 16 }, { wch: 16 }]
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
    ws['!cols'] = [{ wch: 14 }, { wch: 18 }, { wch: 16 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Daily Expenses')
    XLSX.writeFile(wb, 'Daily_Expenses_Template.xlsx')
  }

  const downloadLicensesTemplate = () => {
    const wsData = [
      ['Vehicle Number', 'License Code'],
      ['LM-4565', 'LIC000001'],
      ['lf-3769', 'LIC000001'],
      ['LJ-4472', 'LIC000001'],
      ['LM-4687', 'LIC000001'],
      ['LI-8790', 'LIC000001'],
      ['LN-8877', 'LIC000003'],
      ['LM-4565', 'LIC000003'],
    ]
    const ws = XLSX.utils.aoa_to_sheet(wsData)
    ws['!cols'] = [{ wch: 18 }, { wch: 18 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Vehicle Licenses')
    XLSX.writeFile(wb, 'Vehicle_Licenses_Template.xlsx')
  }

  const downloadInspectionTemplate = () => {
    const wsData = [
      ['Date', 'Person Code', 'Vehicle Number'],
      ['2026-08-07', 'PER000017', 'WP-LC-4838'],
      ['2026-08-07', 'PER000016', 'WP-NA-9021'],
      ['2026-08-07', 'PER000015', 'SP-LG-1142'],
      ['2026-08-07', 'PER000014', 'CP-DA-5509'],
      ['2026-08-07', 'PER000013', 'EP-LB-3381'],
    ]
    const ws = XLSX.utils.aoa_to_sheet(wsData)
    ws['!cols'] = [{ wch: 14 }, { wch: 18 }, { wch: 18 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Excavator Inspection')
    XLSX.writeFile(wb, 'Excavator_Inspection_Template.xlsx')
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

            return {
              date: String(rawDate).trim(),
              vehicleNumber: String(rawVeh).trim(),
              billNumber: String(rawBill).trim(),
              routeCode: String(rawRouteCode).trim(),
            }
          })
          .filter((item) => item.vehicleNumber || item.billNumber || item.routeCode || item.date)

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

  // ─── Parse Local Licenses Sheet ─────────────────────────────────────────────
  const parseLicensesLocal = (file) => {
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
            const rawVeh =
              row['Vehicle Number'] ||
              row['vehicleNumber'] ||
              row['Vehicle/Ref'] ||
              row['Vehicle'] ||
              row['vehicle'] ||
              row['Vehial Number'] ||
              row['Vehical'] ||
              ''
            const rawLicenseCode =
              row['License Code'] ||
              row['licenseCode'] ||
              row['LicenseCode'] ||
              row['License'] ||
              row['license'] ||
              row['License Number'] ||
              ''

            return {
              vehicleNumber: String(rawVeh).trim(),
              licenseCode: String(rawLicenseCode).trim(),
            }
          })
          .filter((item) => item.vehicleNumber || item.licenseCode)

        setLicensesData(formatted)
        setLicensesPage(0)
      } catch (err) {
        console.warn('Local preview parse error (licenses):', err)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  // ─── Parse Local Excavator Inspection Sheet ─────────────────────────────────
  const parseInspectionLocal = (file) => {
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

            const rawPersonCode =
              row['Person Code'] ||
              row['personCode'] ||
              row['PersonCode'] ||
              row['Person'] ||
              row['person'] ||
              ''
            const rawVeh =
              row['Vehicle Number'] ||
              row['vehicleNumber'] ||
              row['Vehicle/Ref'] ||
              row['Vehicle'] ||
              row['vehicle'] ||
              row['Vehial Number'] ||
              row['Vehical'] ||
              ''

            return {
              date: String(rawDate).trim(),
              personCode: String(rawPersonCode).trim().toUpperCase(),
              vehicleNumber: String(rawVeh).trim().toUpperCase(),
            }
          })
          .filter((item) => item.date || item.personCode || item.vehicleNumber)

        setInspectionData(formatted)
        setInspectionPage(0)
      } catch (err) {
        console.warn('Local preview parse error (inspection):', err)
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

  const handleSelectLicensesFile = (file) => {
    if (!validateFile(file)) return
    setLicensesFile(file)
    setLicensesErrors([])
    setLicensesSummary(null)
    parseLicensesLocal(file)
  }

  const handleSelectInspectionFile = (file) => {
    if (!validateFile(file)) return
    setInspectionFile(file)
    setInspectionErrors([])
    setInspectionSummary(null)
    parseInspectionLocal(file)
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
      const rawErrors = err.errors || err.response?.data?.errors || err.response?.errors || []
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
      const rawErrors = err.errors || err.response?.data?.errors || err.response?.errors || []
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

  const handleUploadLicenses = async () => {
    if (!licensesFile) return
    setLicensesLoading(true)
    setLicensesErrors([])
    setLicensesSummary(null)

    try {
      const response = await bulkUploadService.uploadVehicleLicenses(licensesFile)
      const successMessage =
        response?.message ||
        response?.data?.message ||
        (typeof response === 'string'
          ? response
          : `Vehicle licenses from "${licensesFile.name}" were uploaded and processed successfully.`)

      Swal.fire({
        icon: 'success',
        title: 'Licenses Uploaded!',
        text: successMessage,
        confirmButtonColor: '#0284c7',
        timer: 4000,
        timerProgressBar: true,
      })
    } catch (err) {
      console.error('License upload error:', err)
      const rawErrors = err.errors || err.response?.data?.errors || err.response?.errors || []
      const summaryData = err.response?.data || null

      if (rawErrors.length > 0) {
        setLicensesErrors(rawErrors)
        setLicensesSummary(summaryData)
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
          text:
            err.message ||
            'Unable to upload vehicle licenses sheet. Please check your data format.',
          confirmButtonColor: '#dc2626',
        })
      }
    } finally {
      setLicensesLoading(false)
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

  const handleResetLicenses = () => {
    setLicensesFile(null)
    setLicensesData([])
    setLicensesErrors([])
    setLicensesSummary(null)
    setLicensesSearch('')
    setLicensesPage(0)
    if (licenseFileInputRef.current) licenseFileInputRef.current.value = ''
  }

  const handleUploadInspection = async () => {
    if (!inspectionFile) return
    setInspectionLoading(true)
    setInspectionErrors([])
    setInspectionSummary(null)

    try {
      const response = await bulkUploadService.uploadPersonVehicleDetails(inspectionFile)
      const successMessage =
        response?.message ||
        response?.data?.message ||
        (typeof response === 'string'
          ? response
          : `Excavator inspection details from "${inspectionFile.name}" were uploaded and processed successfully.`)

      Swal.fire({
        icon: 'success',
        title: 'Uploaded Successfully!',
        text: successMessage,
        confirmButtonColor: '#7c3aed',
        timer: 4000,
        timerProgressBar: true,
      })
    } catch (err) {
      console.error('Inspection upload error:', err)
      const rawErrors = err.errors || err.response?.data?.errors || err.response?.errors || []
      const summaryData = err.response?.data || null

      if (rawErrors.length > 0) {
        setInspectionErrors(rawErrors)
        setInspectionSummary(summaryData)
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
          text: err.message || 'Unable to upload inspection sheet. Please check your data format.',
          confirmButtonColor: '#dc2626',
        })
      }
    } finally {
      setInspectionLoading(false)
    }
  }

  const handleResetInspection = () => {
    setInspectionFile(null)
    setInspectionData([])
    setInspectionErrors([])
    setInspectionSummary(null)
    setInspectionSearch('')
    setInspectionPage(0)
    if (inspectionFileInputRef.current) inspectionFileInputRef.current.value = ''
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
        (item.date || '').includes(q),
    )
  }, [tripsData, tripsSearch])

  const totalTripsCount = tripsData.length
  const uniqueVehiclesCount = new Set(tripsData.map((item) => item.vehicleNumber).filter(Boolean))
    .size
  const uniqueRoutesCount = new Set(tripsData.map((item) => item.routeCode).filter(Boolean)).size
  const uniqueDatesCount = new Set(tripsData.map((item) => item.date).filter(Boolean)).size

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
  const totalExpenseAmount = expensesData.reduce(
    (sum, item) => sum + (Number(item.expense) || 0),
    0,
  )
  const uniqueExpenseVehiclesCount = new Set(
    expensesData.map((item) => item.vehicleNumber).filter(Boolean),
  ).size

  const expensesTotalPages = Math.ceil(filteredExpenses.length / PREVIEW_PAGE_SIZE) || 1
  const paginatedExpenses = filteredExpenses.slice(
    expensesPage * PREVIEW_PAGE_SIZE,
    (expensesPage + 1) * PREVIEW_PAGE_SIZE,
  )

  // ─── Licenses Filter & Metrics ──────────────────────────────────────────────
  const filteredLicenses = useMemo(() => {
    if (!licensesSearch.trim()) return licensesData
    const q = licensesSearch.toLowerCase()
    return licensesData.filter(
      (item) =>
        (item.vehicleNumber || '').toLowerCase().includes(q) ||
        (item.licenseCode || '').toLowerCase().includes(q),
    )
  }, [licensesData, licensesSearch])

  const totalLicensesCount = licensesData.length
  const uniqueLicenseVehiclesCount = new Set(
    licensesData.map((item) => item.vehicleNumber).filter(Boolean),
  ).size
  const uniqueLicensesCount = new Set(licensesData.map((item) => item.licenseCode).filter(Boolean))
    .size

  const licensesTotalPages = Math.ceil(filteredLicenses.length / PREVIEW_PAGE_SIZE) || 1
  const paginatedLicenses = filteredLicenses.slice(
    licensesPage * PREVIEW_PAGE_SIZE,
    (licensesPage + 1) * PREVIEW_PAGE_SIZE,
  )

  // ─── Excavator Inspection Filter & Metrics ──────────────────────────────────
  const filteredInspection = useMemo(() => {
    if (!inspectionSearch.trim()) return inspectionData
    const q = inspectionSearch.toLowerCase()
    return inspectionData.filter(
      (item) =>
        (item.vehicleNumber || '').toLowerCase().includes(q) ||
        (item.personCode || '').toLowerCase().includes(q) ||
        (item.date || '').includes(q),
    )
  }, [inspectionData, inspectionSearch])

  const totalInspectionCount = inspectionData.length
  const uniqueInspectionVehiclesCount = new Set(
    inspectionData.map((item) => item.vehicleNumber).filter(Boolean),
  ).size
  const uniqueInspectionPersonsCount = new Set(
    inspectionData.map((item) => item.personCode).filter(Boolean),
  ).size

  const inspectionTotalPages = Math.ceil(filteredInspection.length / PREVIEW_PAGE_SIZE) || 1
  const paginatedInspection = filteredInspection.slice(
    inspectionPage * PREVIEW_PAGE_SIZE,
    (inspectionPage + 1) * PREVIEW_PAGE_SIZE,
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
              Import material dispatch routes, fleet site expenses, and vehicle license spreadsheets
            </p>
          </div>
        </div>

        <div className="bu-header-actions">
          {activeTab === 'trips' && (
            <button
              className="bu-btn-download bu-btn-download--routes"
              onClick={downloadTripsTemplate}
              id="btn-dl-routes-tpl"
            >
              <CIcon icon={cilCloudDownload} /> Download Routes Template
            </button>
          )}
          {activeTab === 'expenses' && (
            <button
              className="bu-btn-download bu-btn-download--expenses"
              onClick={downloadExpensesTemplate}
              id="btn-dl-expenses-tpl"
            >
              <CIcon icon={cilCloudDownload} /> Download Expenses Template
            </button>
          )}
          {activeTab === 'licenses' && (
            <button
              className="bu-btn-download bu-btn-download--licenses"
              onClick={downloadLicensesTemplate}
              id="btn-dl-licenses-tpl"
            >
              <CIcon icon={cilCloudDownload} /> Download Licenses Template
            </button>
          )}
          {activeTab === 'inspection' && (
            <button
              className="bu-btn-download bu-btn-download--inspection"
              onClick={downloadInspectionTemplate}
              id="btn-dl-inspection-tpl"
            >
              <CIcon icon={cilCloudDownload} /> Download Inspection Template
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
          {expensesData.length > 0 && (
            <span className="bu-tab-count">{expensesData.length} records</span>
          )}
        </button>

        <button
          className={`bu-tab-btn bu-tab-btn--licenses ${activeTab === 'licenses' ? 'active' : ''}`}
          onClick={() => setActiveTab('licenses')}
          id="tab-licenses-sheet"
        >
          <CIcon icon={cilContact} size="lg" />
          <span>Vehicle Licenses Sheet</span>
          {licensesData.length > 0 && (
            <span className="bu-tab-count">{licensesData.length} records</span>
          )}
        </button>

        <button
          className={`bu-tab-btn bu-tab-btn--inspection ${activeTab === 'inspection' ? 'active' : ''}`}
          onClick={() => setActiveTab('inspection')}
          id="tab-inspection-sheet"
        >
          <CIcon icon={cilUser} size="lg" />
          <span>Excavator Inspection &amp; Checked By</span>
          {inspectionData.length > 0 && (
            <span className="bu-tab-count">{inspectionData.length} records</span>
          )}
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
                  <h4 className="bu-dropzone-heading">
                    Drag &amp; drop your routes Excel sheet here
                  </h4>
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
                              <span className="bu-val-row-pill">
                                Row {err.rowNumber ?? idx + 1}
                              </span>
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
                    💡 Please fix these rows in your Excel file (e.g. ensure valid license dates
                    exist or correct the dates), then re-upload.
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
                    <span className="bu-metric-value highlight">
                      {uniqueVehiclesCount} vehicles
                    </span>
                  </div>
                  <div className="bu-metric-card">
                    <span className="bu-metric-label">Route Codes</span>
                    <span className="bu-metric-value" style={{ color: '#0284c7' }}>
                      {uniqueRoutesCount} routes
                    </span>
                  </div>
                  <div className="bu-metric-card">
                    <span className="bu-metric-label">Active Dates</span>
                    <span className="bu-metric-value green">{uniqueDatesCount} dates</span>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="bu-search-row">
                  <div className="bu-search-wrap">
                    <CIcon icon={cilSearch} size="sm" className="bu-search-icon" />
                    <input
                      type="text"
                      className="bu-search-input"
                      placeholder="Search by vehicle, bil number, route code, or date..."
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
                  <h4 className="bu-dropzone-heading">
                    Drag &amp; drop your expenses Excel sheet here
                  </h4>
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
                              <span className="bu-val-row-pill">
                                Row {err.rowNumber ?? idx + 1}
                              </span>
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
                    💡 Please fix these rows in your Excel file (e.g. check vehicle numbers, expense
                    amounts, or dates), then re-upload.
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
                    <span className="bu-metric-value highlight">
                      Rs. {formatCurrency(totalExpenseAmount)}
                    </span>
                  </div>
                  <div className="bu-metric-card">
                    <span className="bu-metric-label">Active Vehicles</span>
                    <span className="bu-metric-value green">
                      {uniqueExpenseVehiclesCount} vehicles
                    </span>
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
                          <td className="bu-td-num">
                            {expensesPage * PREVIEW_PAGE_SIZE + idx + 1}
                          </td>
                          <td>{item.date || '—'}</td>
                          <td>
                            <span className="bu-veh-pill">
                              <CIcon icon={cilTruck} size="sm" style={{ color: '#059669' }} />
                              {item.vehicleNumber || '—'}
                            </span>
                          </td>
                          <td
                            className="bu-currency-pill"
                            style={{ color: '#dc2626', fontWeight: 700 }}
                          >
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
                    Showing{' '}
                    {filteredExpenses.length === 0 ? 0 : expensesPage * PREVIEW_PAGE_SIZE + 1}–
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
                        onClick={() =>
                          setExpensesPage((p) => Math.min(expensesTotalPages - 1, p + 1))
                        }
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

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 3: VEHICLE LICENSES SHEET
         ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'licenses' && (
        <>
          <CCard className="bu-card">
            <CCardHeader className="bu-card-header">
              <div className="bu-card-title">
                <CIcon icon={cilContact} className="text-info" />
                <span>Upload Vehicle Licenses Sheet</span>
              </div>
            </CCardHeader>

            <CCardBody className="bu-card-body">
              {/* Upload Dropzone */}
              {!licensesFile ? (
                <div
                  className={`bu-dropzone ${licensesDragOver ? 'dragover' : ''}`}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setLicensesDragOver(true)
                  }}
                  onDragLeave={() => setLicensesDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setLicensesDragOver(false)
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleSelectLicensesFile(e.dataTransfer.files[0])
                    }
                  }}
                  onClick={() => licenseFileInputRef.current?.click()}
                  id="dropzone-licenses-sheet"
                >
                  <input
                    type="file"
                    ref={licenseFileInputRef}
                    style={{ display: 'none' }}
                    accept=".xlsx, .xls, .csv"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleSelectLicensesFile(e.target.files[0])
                      }
                    }}
                  />
                  <div className="bu-dropzone-icon">
                    <CIcon icon={cilCloudUpload} size="xl" />
                  </div>
                  <h4 className="bu-dropzone-heading">
                    Drag &amp; drop your vehicle licenses Excel sheet here
                  </h4>
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
                      <div className="bu-file-name">{licensesFile.name}</div>
                      <div className="bu-file-meta">
                        <span>{formatFileSize(licensesFile.size)}</span>
                        <span>•</span>
                        <span>{licensesData.length} records parsed</span>
                        <span>•</span>
                        <span className="bu-file-status-pill">Ready to Upload</span>
                      </div>
                    </div>
                  </div>

                  <div className="bu-file-actions">
                    <button
                      className="bu-btn-remove-file"
                      onClick={handleResetLicenses}
                      disabled={licensesLoading}
                      id="btn-remove-licenses-file"
                    >
                      <CIcon icon={cilTrash} size="sm" /> Change File
                    </button>
                    <button
                      className="bu-btn-upload-now"
                      onClick={handleUploadLicenses}
                      disabled={licensesLoading}
                      id="btn-submit-licenses-file"
                    >
                      {licensesLoading ? (
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
              {licensesErrors.length > 0 && (
                <div className="bu-val-box" id="licenses-upload-validation-errors">
                  <div className="bu-val-header">
                    <div className="bu-val-title">
                      <CIcon icon={cilWarning} className="text-danger" />
                      <span>Upload Validation Errors</span>
                      <span className="bu-val-count-badge">{licensesErrors.length} Failed</span>
                    </div>
                    {licensesSummary?.totalRows != null && (
                      <div className="bu-val-summary-text">
                        Total Rows: <strong>{licensesSummary.totalRows}</strong> | Errors:{' '}
                        <strong className="text-danger">
                          {licensesSummary.errorCount ?? licensesErrors.length}
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
                        {licensesErrors.map((err, idx) => (
                          <tr key={idx}>
                            <td>
                              <span className="bu-val-row-pill">
                                Row {err.rowNumber ?? idx + 1}
                              </span>
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
                    💡 Please fix these rows in your Excel file (e.g. check vehicle numbers or
                    license codes), then re-upload.
                  </div>
                </div>
              )}
            </CCardBody>
          </CCard>

          {/* Parsed Live Preview Section */}
          {licensesData.length > 0 && (
            <CCard className="bu-card">
              <CCardHeader className="bu-card-header">
                <div className="bu-card-title">
                  <CIcon icon={cilContact} className="text-info" />
                  <span>Parsed Vehicle Licenses Preview &amp; Summary</span>
                </div>
              </CCardHeader>

              <CCardBody className="bu-card-body">
                {/* Metrics Summary Grid */}
                <div className="bu-metrics-grid">
                  <div className="bu-metric-card">
                    <span className="bu-metric-label">Total Records</span>
                    <span className="bu-metric-value">{totalLicensesCount}</span>
                  </div>
                  <div className="bu-metric-card">
                    <span className="bu-metric-label">Active Vehicles</span>
                    <span className="bu-metric-value highlight">
                      {uniqueLicenseVehiclesCount} vehicles
                    </span>
                  </div>
                  <div className="bu-metric-card">
                    <span className="bu-metric-label">License Codes</span>
                    <span className="bu-metric-value" style={{ color: '#0284c7' }}>
                      {uniqueLicensesCount} codes
                    </span>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="bu-search-row">
                  <div className="bu-search-wrap">
                    <CIcon icon={cilSearch} size="sm" className="bu-search-icon" />
                    <input
                      type="text"
                      className="bu-search-input"
                      placeholder="Search by vehicle or license code..."
                      value={licensesSearch}
                      onChange={(e) => {
                        setLicensesSearch(e.target.value)
                        setLicensesPage(0)
                      }}
                    />
                  </div>
                  {licensesSearch && (
                    <button
                      className="bu-btn-remove-file"
                      onClick={() => setLicensesSearch('')}
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
                        <th>Vehicle Number</th>
                        <th>License Code</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedLicenses.map((item, idx) => (
                        <tr key={idx}>
                          <td className="bu-td-num">
                            {licensesPage * PREVIEW_PAGE_SIZE + idx + 1}
                          </td>
                          <td>
                            <span className="bu-veh-pill">
                              <CIcon icon={cilTruck} size="sm" style={{ color: '#0284c7' }} />
                              {item.vehicleNumber || '—'}
                            </span>
                          </td>
                          <td>
                            <span
                              className="bu-code-badge"
                              style={{
                                background: '#e0f2fe',
                                color: '#0369a1',
                                borderColor: '#bae6fd',
                              }}
                            >
                              {item.licenseCode || '—'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div className="bu-pagination-bar">
                  <span>
                    Showing{' '}
                    {filteredLicenses.length === 0 ? 0 : licensesPage * PREVIEW_PAGE_SIZE + 1}–
                    {Math.min((licensesPage + 1) * PREVIEW_PAGE_SIZE, filteredLicenses.length)} of{' '}
                    <strong>{filteredLicenses.length}</strong> preview records
                  </span>

                  {licensesTotalPages > 1 && (
                    <div className="bu-page-controls">
                      <button
                        className="bu-page-btn"
                        onClick={() => setLicensesPage((p) => Math.max(0, p - 1))}
                        disabled={licensesPage === 0}
                      >
                        <CIcon icon={cilChevronLeft} size="sm" />
                      </button>
                      {Array.from({ length: licensesTotalPages }, (_, i) => i)
                        .filter((p) => Math.abs(p - licensesPage) <= 2)
                        .map((p) => (
                          <button
                            key={p}
                            className={`bu-page-btn ${p === licensesPage ? 'active' : ''}`}
                            onClick={() => setLicensesPage(p)}
                          >
                            {p + 1}
                          </button>
                        ))}
                      <button
                        className="bu-page-btn"
                        onClick={() =>
                          setLicensesPage((p) => Math.min(licensesTotalPages - 1, p + 1))
                        }
                        disabled={licensesPage >= licensesTotalPages - 1}
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
          TAB 4: EXCAVATOR INSPECTION & CHECKED BY SHEET
         ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'inspection' && (
        <>
          <CCard className="bu-card">
            <CCardHeader className="bu-card-header">
              <div className="bu-card-title">
                <CIcon icon={cilUser} style={{ color: '#7c3aed' }} />
                <span>Upload Excavator Inspection &amp; Checked By Sheet</span>
              </div>
            </CCardHeader>

            <CCardBody className="bu-card-body">
              {/* Upload Dropzone */}
              {!inspectionFile ? (
                <div
                  className={`bu-dropzone ${inspectionDragOver ? 'dragover' : ''}`}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setInspectionDragOver(true)
                  }}
                  onDragLeave={() => setInspectionDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setInspectionDragOver(false)
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleSelectInspectionFile(e.dataTransfer.files[0])
                    }
                  }}
                  onClick={() => inspectionFileInputRef.current?.click()}
                  id="dropzone-inspection-sheet"
                >
                  <input
                    type="file"
                    ref={inspectionFileInputRef}
                    style={{ display: 'none' }}
                    accept=".xlsx, .xls, .csv"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleSelectInspectionFile(e.target.files[0])
                      }
                    }}
                  />
                  <div
                    className="bu-dropzone-icon"
                    style={{ background: '#f5f3ff', color: '#7c3aed' }}
                  >
                    <CIcon icon={cilCloudUpload} size="xl" />
                  </div>
                  <h4 className="bu-dropzone-heading">
                    Drag &amp; drop your Excavator Inspection &amp; Checked By sheet here
                  </h4>
                  <p className="bu-dropzone-sub">
                    or{' '}
                    <span className="bu-browse-link" style={{ color: '#7c3aed' }}>
                      browse from your computer
                    </span>
                  </p>
                  <span className="bu-format-pill">Accepts .xlsx, .xls, .csv</span>
                </div>
              ) : (
                /* Selected File Card */
                <div className="bu-file-card">
                  <div className="bu-file-left">
                    <div
                      className="bu-file-icon"
                      style={{ background: '#f5f3ff', color: '#7c3aed' }}
                    >
                      <CIcon icon={cilDescription} />
                    </div>
                    <div>
                      <div className="bu-file-name">{inspectionFile.name}</div>
                      <div className="bu-file-meta">
                        <span>{formatFileSize(inspectionFile.size)}</span>
                        <span>•</span>
                        <span>{inspectionData.length} records parsed</span>
                        <span>•</span>
                        <span className="bu-file-status-pill">Ready to Upload</span>
                      </div>
                    </div>
                  </div>

                  <div className="bu-file-actions">
                    <button
                      className="bu-btn-remove-file"
                      onClick={handleResetInspection}
                      disabled={inspectionLoading}
                      id="btn-remove-inspection-file"
                    >
                      <CIcon icon={cilTrash} size="sm" /> Change File
                    </button>
                    <button
                      className="bu-btn-upload-now"
                      style={{
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                        borderColor: '#7c3aed',
                      }}
                      onClick={handleUploadInspection}
                      disabled={inspectionLoading}
                      id="btn-submit-inspection-file"
                    >
                      {inspectionLoading ? (
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
              {inspectionErrors.length > 0 && (
                <div className="bu-val-box" id="inspection-upload-validation-errors">
                  <div className="bu-val-header">
                    <div className="bu-val-title">
                      <CIcon icon={cilWarning} className="text-danger" />
                      <span>Upload Validation Errors</span>
                      <span className="bu-val-count-badge">{inspectionErrors.length} Failed</span>
                    </div>
                    {inspectionSummary?.totalRows != null && (
                      <div className="bu-val-summary-text">
                        Total Rows: <strong>{inspectionSummary.totalRows}</strong> | Errors:{' '}
                        <strong className="text-danger">
                          {inspectionSummary.errorCount ?? inspectionErrors.length}
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
                        {inspectionErrors.map((err, idx) => (
                          <tr key={idx}>
                            <td>
                              <span className="bu-val-row-pill">
                                Row {err.rowNumber ?? idx + 1}
                              </span>
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
                    💡 Please fix these rows in your Excel file (e.g. check person codes, vehicle
                    numbers, or date formats), then re-upload.
                  </div>
                </div>
              )}
            </CCardBody>
          </CCard>

          {/* Parsed Live Preview Section */}
          {inspectionData.length > 0 && (
            <CCard className="bu-card">
              <CCardHeader className="bu-card-header">
                <div className="bu-card-title">
                  <CIcon icon={cilUser} style={{ color: '#7c3aed' }} />
                  <span>Parsed Excavator Inspection Preview &amp; Summary</span>
                </div>
              </CCardHeader>

              <CCardBody className="bu-card-body">
                {/* Metrics Summary Grid */}
                <div className="bu-metrics-grid">
                  <div className="bu-metric-card">
                    <span className="bu-metric-label">Total Records</span>
                    <span className="bu-metric-value">{totalInspectionCount}</span>
                  </div>
                  <div className="bu-metric-card">
                    <span className="bu-metric-label">Assigned Vehicles</span>
                    <span className="bu-metric-value highlight">
                      {uniqueInspectionVehiclesCount} vehicles
                    </span>
                  </div>
                  <div className="bu-metric-card">
                    <span className="bu-metric-label">Assigned Persons</span>
                    <span className="bu-metric-value" style={{ color: '#7c3aed' }}>
                      {uniqueInspectionPersonsCount} persons
                    </span>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="bu-search-row">
                  <div className="bu-search-wrap">
                    <CIcon icon={cilSearch} size="sm" className="bu-search-icon" />
                    <input
                      type="text"
                      className="bu-search-input"
                      placeholder="Search by date, vehicle or person code..."
                      value={inspectionSearch}
                      onChange={(e) => {
                        setInspectionSearch(e.target.value)
                        setInspectionPage(0)
                      }}
                    />
                  </div>
                  {inspectionSearch && (
                    <button
                      className="bu-btn-remove-file"
                      onClick={() => setInspectionSearch('')}
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
                        <th>Person Code</th>
                        <th>Vehicle Number</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedInspection.map((item, idx) => (
                        <tr key={idx}>
                          <td className="bu-td-num">
                            {inspectionPage * PREVIEW_PAGE_SIZE + idx + 1}
                          </td>
                          <td>
                            <span style={{ fontWeight: 600, color: '#334155' }}>
                              {item.date || '—'}
                            </span>
                          </td>
                          <td>
                            <span
                              className="bu-code-badge"
                              style={{
                                background: '#f5f3ff',
                                color: '#7c3aed',
                                borderColor: '#ddd6fe',
                              }}
                            >
                              <CIcon icon={cilUser} size="sm" style={{ marginRight: 4 }} />
                              {item.personCode || '—'}
                            </span>
                          </td>
                          <td>
                            <span className="bu-veh-pill">
                              <CIcon icon={cilTruck} size="sm" style={{ color: '#7c3aed' }} />
                              {item.vehicleNumber || '—'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div className="bu-pagination-bar">
                  <span>
                    Showing{' '}
                    {filteredInspection.length === 0 ? 0 : inspectionPage * PREVIEW_PAGE_SIZE + 1}–
                    {Math.min((inspectionPage + 1) * PREVIEW_PAGE_SIZE, filteredInspection.length)}{' '}
                    of <strong>{filteredInspection.length}</strong> preview records
                  </span>

                  {inspectionTotalPages > 1 && (
                    <div className="bu-page-controls">
                      <button
                        className="bu-page-btn"
                        onClick={() => setInspectionPage((p) => Math.max(0, p - 1))}
                        disabled={inspectionPage === 0}
                      >
                        <CIcon icon={cilChevronLeft} size="sm" />
                      </button>
                      {Array.from({ length: inspectionTotalPages }, (_, i) => i)
                        .filter((p) => Math.abs(p - inspectionPage) <= 2)
                        .map((p) => (
                          <button
                            key={p}
                            className={`bu-page-btn ${p === inspectionPage ? 'active' : ''}`}
                            onClick={() => setInspectionPage(p)}
                          >
                            {p + 1}
                          </button>
                        ))}
                      <button
                        className="bu-page-btn"
                        onClick={() =>
                          setInspectionPage((p) => Math.min(inspectionTotalPages - 1, p + 1))
                        }
                        disabled={inspectionPage >= inspectionTotalPages - 1}
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
