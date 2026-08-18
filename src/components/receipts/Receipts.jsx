import React, { useState, useMemo, useEffect } from 'react'
import AsyncSelect from 'react-select/async'
import vehicleService from '../../service/vehicleService'
import receiptService from '../../service/receiptService'
import Swal from 'sweetalert2'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  CRow,
  CCol,
  CCard,
  CCardBody,
  CCardHeader,
  CFormLabel,
  CFormInput,
  CButton,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CBadge,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilDescription,
  cilCalendar,
  cilTruck,
  cilFindInPage,
  cilCloudDownload,
  cilSearch,
  cilPrint,
  cilCheckCircle,
  cilUser,
  cilMoney,
  cilFilter,
} from '@coreui/icons'
import './Receipts.css'

// ─── Default Consolidated Option ────────────────────────────────────────────
const DEFAULT_VEHICLE_OPTION = { value: 'ALL', label: 'All Vehicles (Consolidated Receipt)' }

// ─── Initial Sample Receipts / Trips Dataset ────────────────────────────────
const MOCK_RECEIPT_ITEMS = [
  { id: 'RCP-7901', date: '2026-08-07', land: 'L (Quarry East)', vehicleNumber: 'LC-4838', driver: 'Kamal Perera', billNumber: '7901', cube: 3.7, km: 24, transportRate: 10952.0, deliveryLocation: 'Warakapola 28+580', dailyExpense: 0, payableAmount: 10952.0, status: 'Paid' },
  { id: 'RCP-7902', date: '2026-08-07', land: 'L (Quarry East)', vehicleNumber: 'LI-8902', driver: 'Sunil Silva', billNumber: '7902', cube: 3.9, km: 24, transportRate: 11544.0, deliveryLocation: 'Warakapola 28+580', dailyExpense: 0, payableAmount: 11544.0, status: 'Paid' },
  { id: 'RCP-7903', date: '2026-08-07', land: 'L (Quarry East)', vehicleNumber: 'LM-4535', driver: 'Ranjith Fernando', billNumber: '7903', cube: 4.0, km: 24, transportRate: 11840.0, deliveryLocation: 'Warakapola 28+580', dailyExpense: 0, payableAmount: 11840.0, status: 'Paid' },
  { id: 'RCP-7904', date: '2026-08-07', land: 'S (Sand Quarry)', vehicleNumber: 'LK-5177', driver: 'Nimal Jayasinghe', billNumber: '7904', cube: 3.0, km: 24, transportRate: 8880.0, deliveryLocation: 'Warakapola 28+580', dailyExpense: 0, payableAmount: 8880.0, status: 'Paid' },
  { id: 'RCP-7905', date: '2026-08-07', land: 'L (Quarry East)', vehicleNumber: 'LM-6460', driver: 'Anura Kumara', billNumber: '7905', cube: 4.3, km: 24, transportRate: 12728.0, deliveryLocation: 'Warakapola 28+580', dailyExpense: 0, payableAmount: 12728.0, status: 'Paid' },
  { id: 'RCP-7906', date: '2026-08-07', land: 'L (Quarry East)', vehicleNumber: 'LM-4687', driver: 'Bandara M.', billNumber: '7906', cube: 3.8, km: 24, transportRate: 11248.0, deliveryLocation: 'Warakapola 28+580', dailyExpense: 0, payableAmount: 11248.0, status: 'Paid' },
  { id: 'RCP-7907', date: '2026-08-07', land: 'L (Quarry East)', vehicleNumber: 'LJ-0993', driver: 'Sarath Fonseka', billNumber: '7907', cube: 3.8, km: 24, transportRate: 11248.0, deliveryLocation: 'Warakapola 28+580', dailyExpense: 0, payableAmount: 11248.0, status: 'Paid' },
  { id: 'RCP-7908', date: '2026-08-08', land: 'L (Quarry East)', vehicleNumber: 'LI-9587', driver: 'Pradeep Kumara', billNumber: '7908', cube: 3.7, km: 24, transportRate: 10952.0, deliveryLocation: 'Warakapola 28+580', dailyExpense: 0, payableAmount: 10952.0, status: 'Pending' },
  { id: 'RCP-7909', date: '2026-08-08', land: 'S (Sand Quarry)', vehicleNumber: 'LI-5827', driver: 'Chaminda V.', billNumber: '7909', cube: 3.8, km: 24, transportRate: 11248.0, deliveryLocation: 'Warakapola 28+580', dailyExpense: 0, payableAmount: 11248.0, status: 'Pending' },
  { id: 'RCP-7911', date: '2026-08-08', land: 'L (Quarry East)', vehicleNumber: 'LM-4565', driver: 'Gamini D.', billNumber: '7911', cube: 4.0, km: 24, transportRate: 11840.0, deliveryLocation: 'Warakapola 28+580', dailyExpense: 10000.0, payableAmount: 1840.0, status: 'Paid' },
  { id: 'RCP-7912', date: '2026-08-09', land: 'B (Brick Works)', vehicleNumber: 'LN-5891', driver: 'Asela P.', billNumber: '7912', cube: 4.0, km: 24, transportRate: 11840.0, deliveryLocation: 'Warakapola 28+580', dailyExpense: 0, payableAmount: 11840.0, status: 'Pending' },
  { id: 'RCP-7913', date: '2026-08-09', land: 'B (Brick Works)', vehicleNumber: 'LO-4415', driver: 'Thushara K.', billNumber: '7913', cube: 4.0, km: 24, transportRate: 11840.0, deliveryLocation: 'Warakapola 28+580', dailyExpense: 0, payableAmount: 11840.0, status: 'Paid' },
  { id: 'RCP-7920', date: '2026-08-10', land: 'B (Brick Works)', vehicleNumber: 'LM-9680', driver: 'Chandana S.', billNumber: '7920', cube: 3.6, km: 24, transportRate: 10656.0, deliveryLocation: 'Warakapola 28+580', dailyExpense: 5000.0, payableAmount: 5656.0, status: 'Paid' },
  { id: 'RCP-7921', date: '2026-08-10', land: 'L (Quarry East)', vehicleNumber: 'LF-3769', driver: 'Mahinda R.', billNumber: '7921', cube: 3.0, km: 24, transportRate: 8880.0, deliveryLocation: 'Warakapola 28+580', dailyExpense: 2000.0, payableAmount: 6880.0, status: 'Paid' },
]

// ─── Select Component Styles ───────────────────────────────────────────────
const selectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: '42px',
    borderRadius: '8px',
    borderColor: state.isFocused ? '#d97706' : '#cbd5e1',
    boxShadow: state.isFocused ? '0 0 0 3px rgba(217,119,6,0.15)' : 'none',
    fontSize: '0.875rem',
    backgroundColor: '#ffffff',
    '&:hover': { borderColor: '#d97706' },
  }),
  menu: (base) => ({
    ...base,
    borderRadius: '10px',
    zIndex: 9999,
    boxShadow: '0 10px 25px rgba(15, 23, 42, 0.12)',
    border: '1px solid #e2e8f0',
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected ? '#d97706' : state.isFocused ? '#fef3c7' : 'white',
    color: state.isSelected ? 'white' : '#1e293b',
    fontSize: '0.875rem',
    cursor: 'pointer',
  }),
  placeholder: (base) => ({ ...base, color: '#94a3b8', fontSize: '0.875rem' }),
}

const Receipts = () => {
  // Helper to format vehicle response items into React-Select options
  const formatVehicleOption = (v) => {
    const num = v.vehicleNumber || v.vehicleNo || v.registrationNumber || v.regNo || v.number || v.id
    const type = v.vehicleType || v.type || v.model || ''
    const driver = v.driverName || v.driver || ''

    let label = num
    if (type) label += ` — ${type}`
    if (driver) label += ` (Driver: ${driver})`

    return {
      value: num,
      label,
      data: v,
    }
  }

  // ─── Async Vehicle Loader (Calls backend /search?query=... on typing) ─────
  const loadVehicleOptions = async (inputValue) => {
    try {
      const vehicles = await vehicleService.searchVehicles(inputValue)
      const list = Array.isArray(vehicles) ? vehicles.map(formatVehicleOption) : []

      // If no query or searching 'all', include default consolidated option
      if (!inputValue || inputValue.trim() === '' || inputValue.toLowerCase().includes('all')) {
        return [DEFAULT_VEHICLE_OPTION, ...list]
      }
      return list
    } catch (err) {
      console.error('Vehicle search API error:', err)
      return [DEFAULT_VEHICLE_OPTION]
    }
  }

  // ─── Filter State ─────────────────────────────────────────────────────────
  const [fromDate, setFromDate] = useState('2026-08-07')
  const [selectedVehicle, setSelectedVehicle] = useState(DEFAULT_VEHICLE_OPTION) // Default: All Vehicles
  const [tableSearch, setTableSearch] = useState('')

  // ─── Modal Preview State ──────────────────────────────────────────────────
  const [previewModalVisible, setPreviewModalVisible] = useState(false)
  const [previewPdfUrl, setPreviewPdfUrl] = useState(null)
  const [previewMeta, setPreviewMeta] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [downloadLoading, setDownloadLoading] = useState(false)

  // ─── Format Currency ──────────────────────────────────────────────────────
  const formatLKR = (num) => {
    if (isNaN(num) || num === null || num === undefined) return '0.00'
    return Number(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  // ─── Filtered Records ─────────────────────────────────────────────────────
  const filteredRecords = useMemo(() => {
    return MOCK_RECEIPT_ITEMS.filter((item) => {
      // Date filter — show records on or after selected date
      if (fromDate && item.date < fromDate) return false

      // Vehicle filter
      if (selectedVehicle && selectedVehicle.value && selectedVehicle.value !== 'ALL') {
        const itemVeh = (item.vehicleNumber || '').toLowerCase().replace(/[\s\-_]/g, '')
        const selVeh = (selectedVehicle.value || '').toLowerCase().replace(/[\s\-_]/g, '')
        if (itemVeh !== selVeh) return false
      }

      // Search term
      if (tableSearch) {
        const q = tableSearch.toLowerCase()
        const matchVeh = (item.vehicleNumber || '').toLowerCase().includes(q)
        const matchBill = (item.billNumber || '').toString().includes(q)
        const matchDriver = (item.driver || '').toLowerCase().includes(q)
        const matchLoc = (item.deliveryLocation || '').toLowerCase().includes(q)
        const matchId = (item.id || '').toLowerCase().includes(q)
        if (!matchVeh && !matchBill && !matchDriver && !matchLoc && !matchId) return false
      }

      return true
    })
  }, [fromDate, selectedVehicle, tableSearch])

  // ─── Summary Totals ───────────────────────────────────────────────────────
  const totalTrips = filteredRecords.length
  const totalCubes = filteredRecords.reduce((sum, r) => sum + (Number(r.cube) || 0), 0)
  const totalGrossRate = filteredRecords.reduce((sum, r) => sum + (Number(r.transportRate) || 0), 0)
  const totalDailyExpense = filteredRecords.reduce((sum, r) => sum + (Number(r.dailyExpense) || 0), 0)
  const totalNetPayable = filteredRecords.reduce((sum, r) => sum + (Number(r.payableAmount) || 0), 0)

  // ─── PDF Receipt Generator Function ───────────────────────────────────────
  const generatePdfDoc = (data = null, customItem = null) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

    let recordsToPrint = []
    let voucherNumber = `MG-VCH-${Date.now().toString().slice(-6)}`
    let statementPeriod = fromDate || 'ALL DATES'
    let isAll = !selectedVehicle || selectedVehicle.value === 'ALL'
    let vehLabel = isAll ? 'ALL FLEET VEHICLES' : (selectedVehicle.label || selectedVehicle.value)
    let cubesTotal = totalCubes
    let grossTotal = totalGrossRate
    let expenseTotal = totalDailyExpense
    let netTotal = totalNetPayable

    if (customItem) {
      recordsToPrint = [customItem]
      vehLabel = customItem.vehicleNumber
      cubesTotal = Number(customItem.cube) || 0
      grossTotal = Number(customItem.transportRate) || 0
      expenseTotal = Number(customItem.dailyExpense) || 0
      netTotal = Number(customItem.payableAmount) || 0
    } else if (data) {
      if (Array.isArray(data)) {
        recordsToPrint = data
      } else {
        recordsToPrint = data.items || data.trips || data.records || data.routes || data.dailyRoutes || data.details || []
        voucherNumber = data.receiptNumber || data.voucherNumber || data.voucherNo || data.receiptNo || voucherNumber
        statementPeriod = data.date || data.statementDate || data.period || statementPeriod
        if (data.vehicleNumber) {
          vehLabel = `${data.vehicleNumber}${data.driverName ? ` (Driver: ${data.driverName})` : ''}`
        }
        if (data.totalCubes !== undefined) cubesTotal = Number(data.totalCubes) || 0
        else cubesTotal = recordsToPrint.reduce((sum, r) => sum + (Number(r.cube || r.cubes) || 0), 0)

        if (data.totalGrossRate !== undefined) grossTotal = Number(data.totalGrossRate) || 0
        else if (data.grossAmount !== undefined) grossTotal = Number(data.grossAmount) || 0
        else grossTotal = recordsToPrint.reduce((sum, r) => sum + (Number(r.transportRate || r.rate || r.amount) || 0), 0)

        if (data.totalDailyExpense !== undefined) expenseTotal = Number(data.totalDailyExpense) || 0
        else if (data.totalExpenses !== undefined) expenseTotal = Number(data.totalExpenses) || 0
        else expenseTotal = recordsToPrint.reduce((sum, r) => sum + (Number(r.dailyExpense || r.expense) || 0), 0)

        if (data.totalNetPayable !== undefined) netTotal = Number(data.totalNetPayable) || 0
        else if (data.netPayable !== undefined) netTotal = Number(data.netPayable) || 0
        else netTotal = grossTotal - expenseTotal
      }
    } else {
      recordsToPrint = filteredRecords
    }

    // Header Background Accent Bar
    doc.setFillColor(15, 23, 42) // Slate 900
    doc.rect(0, 0, 210, 26, 'F')

    // Amber Accent Line
    doc.setFillColor(217, 119, 6) // Amber 600
    doc.rect(0, 26, 210, 2.5, 'F')

    // Company Brand Name & Subtitle
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text('MATERIAL GRID — LOGISTICS & SUPPLY CHAIN', 14, 12)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(245, 158, 11) // Amber 500
    doc.text('OFFICIAL MATERIAL TRANSPORT & DISPATCH PAYMENT VOUCHER', 14, 19)

    // Document Meta (Top Right)
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(7.5)
    doc.text(`VOUCHER: ${voucherNumber}`, 196, 12, { align: 'right' })
    doc.text(`ISSUED: ${new Date().toLocaleDateString('en-GB')}`, 196, 19, { align: 'right' })

    // Voucher Info Grid Box
    doc.setDrawColor(226, 232, 240)
    doc.setFillColor(248, 250, 252)
    doc.roundedRect(14, 34, 182, 22, 2, 2, 'FD')

    doc.setTextColor(51, 65, 85)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('STATEMENT PERIOD:', 18, 41)
    doc.text('ASSIGNED VEHICLE:', 78, 41)
    doc.text('TOTAL DISPATCHES:', 140, 41)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(15, 23, 42)
    doc.text(`${statementPeriod}`, 18, 49)
    doc.text(`${vehLabel}`, 78, 49)
    doc.text(`${recordsToPrint.length} Trips (${cubesTotal.toFixed(1)} Cubes)`, 140, 49)

    // Table Data preparation
    const tableHeaders = [
      ['#', 'Date', 'Bill No', 'Vehicle', 'Land / Source', 'Delivery Location', 'Cube', 'KM', 'Rate (LKR)', 'Deduction', 'Net Amount']
    ]

    const tableRows = recordsToPrint.map((item, idx) => [
      idx + 1,
      item.date || item.routeDate || '',
      item.billNumber || item.billNo || item.invoiceNo || '-',
      item.vehicleNumber || item.vehicleNo || '-',
      item.land || item.landName || item.source || '-',
      item.deliveryLocation || item.location || item.destination || '-',
      (item.cube > 0 || item.cubes > 0) ? (item.cube || item.cubes) : '-',
      (item.km > 0 || item.distance > 0) ? `${item.km || item.distance}` : '-',
      formatLKR(item.transportRate ?? item.rate ?? item.amount ?? 0),
      (item.dailyExpense > 0 || item.expense > 0) ? formatLKR(item.dailyExpense || item.expense) : '-',
      formatLKR(item.payableAmount ?? item.netAmount ?? ((item.transportRate || 0) - (item.dailyExpense || 0))),
    ])

    // Generate Table with AutoTable
    autoTable(doc, {
      startY: 60,
      head: tableHeaders,
      body: tableRows,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59], // Slate 800
        textColor: [255, 255, 255],
        fontSize: 7.5,
        fontStyle: 'bold',
        halign: 'left',
      },
      bodyStyles: {
        fontSize: 7.2,
        textColor: [30, 41, 59],
        cellPadding: 2,
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 18 },
        2: { cellWidth: 14, fontStyle: 'bold', textColor: [2, 132, 199] },
        3: { cellWidth: 18, fontStyle: 'bold' },
        4: { cellWidth: 24 },
        5: { cellWidth: 28 },
        6: { cellWidth: 12, halign: 'center' },
        7: { cellWidth: 10, halign: 'center' },
        8: { cellWidth: 20, halign: 'right' },
        9: { cellWidth: 14, halign: 'right', textColor: [220, 38, 38] },
        10: { cellWidth: 20, halign: 'right', fontStyle: 'bold', textColor: [5, 150, 105] },
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      margin: { left: 14, right: 14 },
    })

    // Financial Summary Table Footer
    const finalY = doc.lastAutoTable.finalY + 6

    // Summary Box
    doc.setFillColor(248, 250, 252)
    doc.setDrawColor(203, 213, 225)
    doc.roundedRect(110, finalY, 86, 32, 2, 2, 'FD')

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(71, 85, 105)
    doc.text('Gross Transport Total:', 114, finalY + 7)
    doc.text(`Rs. ${formatLKR(grossTotal)}`, 192, finalY + 7, { align: 'right' })

    doc.text('Total Expense Deductions:', 114, finalY + 14)
    doc.setTextColor(220, 38, 38)
    doc.text(`- Rs. ${formatLKR(expenseTotal)}`, 192, finalY + 14, { align: 'right' })

    doc.setDrawColor(203, 213, 225)
    doc.line(114, finalY + 18, 192, finalY + 18)

    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(15, 23, 42)
    doc.text('NET PAYABLE AMOUNT:', 114, finalY + 26)
    doc.setTextColor(217, 119, 6) // Amber 600
    doc.text(`Rs. ${formatLKR(netTotal)}`, 192, finalY + 26, { align: 'right' })

    // Signatures section
    const signY = finalY + 48
    if (signY < 275) {
      doc.setDrawColor(148, 163, 184)
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 116, 139)

      // Signature 1
      doc.line(14, signY, 60, signY)
      doc.text('Driver / Contractor Signature', 14, signY + 5)

      // Signature 2
      doc.line(80, signY, 130, signY)
      doc.text('Transport Officer / Dispatcher', 80, signY + 5)

      // Signature 3
      doc.line(150, signY, 196, signY)
      doc.text('Authorized Finance Approval', 150, signY + 5)
    }

    return doc
  }

  // ─── Option 1: Preview PDF in Modal (Backend Connected) ────────────────────
  const handlePreviewPdf = async (customItem = null) => {
    if (customItem) {
      const doc = generatePdfDoc(null, customItem)
      const blob = doc.output('blob')
      const blobUrl = URL.createObjectURL(blob)
      setPreviewPdfUrl(blobUrl)
      setPreviewMeta({
        vehicle: customItem.vehicleNumber,
        count: 1,
        payable: customItem.payableAmount,
      })
      setPreviewModalVisible(true)
      return
    }

    if (!fromDate) {
      Swal.fire({
        icon: 'warning',
        title: 'Date Required',
        text: 'Please select a date to preview the receipt.',
        confirmButtonColor: '#f59e0b',
      })
      return
    }

    const vehNumber = selectedVehicle?.value || 'ALL'
    setPreviewLoading(true)

    try {
      // 1. Query Spring Boot API: GET /api/material-grid/receipts/preview?date=...&vehicleNumber=...
      const receiptData = await receiptService.getReceiptPreview(fromDate, vehNumber)

      const items = receiptData?.items || receiptData?.trips || receiptData?.records || receiptData?.routes || (Array.isArray(receiptData) ? receiptData : [])

      const doc = generatePdfDoc(receiptData)
      const blob = doc.output('blob')
      const blobUrl = URL.createObjectURL(blob)

      setPreviewPdfUrl(blobUrl)
      setPreviewMeta({
        vehicle: receiptData?.vehicleNumber || selectedVehicle?.label || vehNumber,
        count: items.length || 1,
        payable: receiptData?.totalNetPayable ?? receiptData?.netPayable ?? totalNetPayable,
      })
      setPreviewModalVisible(true)
    } catch (err) {
      console.warn('Backend receipt preview call returned error, checking local records:', err.message)
      // If server error or offline in development, fallback gracefully to current filtered records
      if (filteredRecords.length > 0) {
        const doc = generatePdfDoc(filteredRecords)
        const blob = doc.output('blob')
        const blobUrl = URL.createObjectURL(blob)
        setPreviewPdfUrl(blobUrl)
        setPreviewMeta({
          vehicle: selectedVehicle?.label || 'All Vehicles',
          count: filteredRecords.length,
          payable: totalNetPayable,
        })
        setPreviewModalVisible(true)
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Preview Failed',
          text: err.message || 'Unable to retrieve receipt preview data from server.',
          confirmButtonColor: '#dc2626',
        })
      }
    } finally {
      setPreviewLoading(false)
    }
  }

  // ─── Option 2: Download PDF Receipt ───────────────────────────────────────
  const handleDownloadPdf = async (customItem = null) => {
    if (customItem) {
      const doc = generatePdfDoc(null, customItem)
      const fileName = `Material_Grid_Receipt_${customItem.vehicleNumber}_${customItem.date || fromDate}.pdf`
      doc.save(fileName)
      return
    }

    if (!fromDate) {
      Swal.fire({
        icon: 'warning',
        title: 'Date Required',
        text: 'Please select a date to download the receipt.',
        confirmButtonColor: '#f59e0b',
      })
      return
    }

    const vehNumber = selectedVehicle?.value || 'ALL'
    setDownloadLoading(true)

    try {
      const receiptData = await receiptService.getReceiptPreview(fromDate, vehNumber)
      const doc = generatePdfDoc(receiptData)
      const vehName = receiptData?.vehicleNumber || (selectedVehicle?.value !== 'ALL' ? selectedVehicle.value : 'All_Vehicles')
      const fileName = `Material_Grid_Receipt_${vehName}_${fromDate}.pdf`
      doc.save(fileName)
    } catch (err) {
      console.warn('Backend download call returned error, checking local records:', err.message)
      if (filteredRecords.length > 0) {
        const doc = generatePdfDoc(filteredRecords)
        const vehName = selectedVehicle?.value !== 'ALL' ? selectedVehicle.value : 'All_Vehicles'
        const fileName = `Material_Grid_Receipt_${vehName}_${fromDate}.pdf`
        doc.save(fileName)
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Download Failed',
          text: err.message || 'Unable to download receipt.',
          confirmButtonColor: '#dc2626',
        })
      }
    } finally {
      setDownloadLoading(false)
    }
  }

  return (
    <div className="rc-page">
      {/* ── Page Header ── */}
      <div className="rc-page-header">
        <div className="rc-header-left">
          <div className="rc-header-icon">
            <CIcon icon={cilDescription} size="xl" />
          </div>
          <div>
            <h1 className="rc-page-title">Receipts & Payment Vouchers</h1>
            <p className="rc-page-subtitle">
              Select date ranges and vehicle numbers to preview and download official transport receipts
            </p>
          </div>
        </div>
      </div>

      {/* ── Filter Card ── */}
      <CCard className="rc-card">
        <CCardHeader className="rc-card-header">
          <div className="rc-card-title">
            <CIcon icon={cilFilter} className="text-warning" />
            <span>Receipt Filter & Generation Controls</span>
          </div>
          <div className="d-flex align-items-center gap-2">
            <button
              className="rc-btn-reset"
              onClick={() => {
                setFromDate('2026-08-07')
                setSelectedVehicle(DEFAULT_VEHICLE_OPTION)
                setTableSearch('')
              }}
            >
              Reset Filters
            </button>
          </div>
        </CCardHeader>

        <CCardBody className="rc-card-body">
          <CRow className="g-3">
            {/* Date */}
            <CCol xs={12} md={6}>
              <CFormLabel className="rc-label">
                <CIcon icon={cilCalendar} size="sm" className="text-warning" />
                Date
              </CFormLabel>
              <CFormInput
                type="date"
                className="rc-input"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </CCol>

            {/* Searchable Vehicle Dropdown */}
            <CCol xs={12} md={6}>
              <CFormLabel className="rc-label">
                <CIcon icon={cilTruck} size="sm" className="text-warning" />
                Vehicle Number
              </CFormLabel>
              <AsyncSelect
                cacheOptions
                defaultOptions
                loadOptions={loadVehicleOptions}
                value={selectedVehicle}
                onChange={setSelectedVehicle}
                placeholder="Search vehicle number (e.g. LC-4838) or driver…"
                isClearable={false}
                styles={selectStyles}
                classNamePrefix="mg-select"
                noOptionsMessage={({ inputValue }) =>
                  inputValue ? `No vehicles matching "${inputValue}"` : 'Type to search vehicles…'
                }
                loadingMessage={() => 'Searching vehicles…'}
              />
            </CCol>
          </CRow>

          {/* Action Bar with the Two Requested Options */}
          <div className="rc-action-bar mt-3 pt-3 border-top d-flex align-items-center justify-content-between">
            <div></div>

            <div className="d-flex align-items-center gap-2">
              {/* Option 1: Preview PDF Receipt */}
              <button
                className="rc-btn-preview"
                onClick={() => handlePreviewPdf()}
                disabled={previewLoading || downloadLoading}
              >
                <CIcon icon={cilFindInPage} /> {previewLoading ? 'Loading Preview…' : 'Preview PDF Receipt'}
              </button>

              {/* Option 2: Download PDF Receipt */}
              <button
                className="rc-btn-download"
                onClick={() => handleDownloadPdf()}
                disabled={previewLoading || downloadLoading}
              >
                <CIcon icon={cilCloudDownload} /> {downloadLoading ? 'Downloading…' : 'Download PDF Receipt'}
              </button>
            </div>
          </div>
        </CCardBody>
      </CCard>

      {/* ── Interactive PDF Preview Modal ── */}
      <CModal
        size="xl"
        visible={previewModalVisible}
        onClose={() => {
          setPreviewModalVisible(false)
          if (previewPdfUrl) {
            URL.revokeObjectURL(previewPdfUrl)
            setPreviewPdfUrl(null)
          }
        }}
        backdrop="static"
      >
        <CModalHeader className="bg-dark text-white">
          <CModalTitle className="d-flex align-items-center gap-2" style={{ fontSize: '1rem' }}>
            <CIcon icon={cilDescription} className="text-warning" />
            <span>PDF Receipt Voucher Preview — {previewMeta?.vehicle}</span>
          </CModalTitle>
        </CModalHeader>

        <CModalBody className="p-2">
          {previewPdfUrl ? (
            <div className="rc-pdf-preview-wrapper">
              <iframe
                src={previewPdfUrl}
                title="PDF Receipt Preview"
                className="rc-pdf-iframe"
              />
            </div>
          ) : (
            <div className="text-center py-5">
              <p className="text-muted">Loading PDF Document...</p>
            </div>
          )}
        </CModalBody>

        <CModalFooter className="d-flex justify-content-between align-items-center">
          <div className="text-muted" style={{ fontSize: '0.85rem' }}>
            Net Payable: <strong className="text-success">Rs. {formatLKR(previewMeta?.payable)}</strong> ({previewMeta?.count} Trips)
          </div>
          <div className="d-flex align-items-center gap-2">
            <CButton
              color="secondary"
              variant="ghost"
              onClick={() => {
                setPreviewModalVisible(false)
                if (previewPdfUrl) {
                  URL.revokeObjectURL(previewPdfUrl)
                  setPreviewPdfUrl(null)
                }
              }}
            >
              Close
            </CButton>
            <button
              className="rc-btn-download"
              onClick={() => {
                handleDownloadPdf()
              }}
            >
              <CIcon icon={cilCloudDownload} /> Download PDF Now
            </button>
          </div>
        </CModalFooter>
      </CModal>
    </div>
  )
}

export default Receipts
