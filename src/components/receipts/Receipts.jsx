import React, { useState, useMemo } from 'react'
import Select from 'react-select'
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

// ─── Mock Vehicle Options ───────────────────────────────────────────────────
const VEHICLE_OPTIONS = [
  { value: 'ALL', label: 'All Vehicles (Consolidated Receipt)' },
  { value: 'LC-4838', label: 'LC-4838 — Tipper 10T (Driver: Kamal Perera)' },
  { value: 'LI-8902', label: 'LI-8902 — Lorry 15T (Driver: Sunil Silva)' },
  { value: 'LM-4535', label: 'LM-4535 — Dumper 20T (Driver: Ranjith Fernando)' },
  { value: 'LK-5177', label: 'LK-5177 — Tipper 8T (Driver: Nimal Jayasinghe)' },
  { value: 'LM-6460', label: 'LM-6460 — Heavy Dumper 25T (Driver: Anura Kumara)' },
  { value: 'LM-4687', label: 'LM-4687 — Lorry 10T (Driver: Bandara M.)' },
  { value: 'LJ-0993', label: 'LJ-0993 — Tipper 12T (Driver: Sarath Fonseka)' },
  { value: 'LI-9587', label: 'LI-9587 — Lorry 10T (Driver: Pradeep Kumara)' },
  { value: 'LI-5827', label: 'LI-5827 — Tipper 8T (Driver: Chaminda V.)' },
  { value: 'LM-4565', label: 'LM-4565 — Lorry 15T (Driver: Gamini D.)' },
  { value: 'LN-5891', label: 'LN-5891 — Tipper 10T (Driver: Asela P.)' },
  { value: 'LO-4415', label: 'LO-4415 — Dumper 18T (Driver: Thushara K.)' },
  { value: 'LM-9680', label: 'LM-9680 — Tipper 10T (Driver: Chandana S.)' },
  { value: 'LF-3769', label: 'LF-3769 — Lorry 20T (Driver: Mahinda R.)' },
]

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
  // ─── Filter State ─────────────────────────────────────────────────────────
  const [fromDate, setFromDate] = useState('2026-08-01')
  const [toDate, setToDate] = useState('2026-08-16')
  const [selectedVehicle, setSelectedVehicle] = useState(VEHICLE_OPTIONS[0]) // Default: All Vehicles
  const [tableSearch, setTableSearch] = useState('')

  // ─── Modal Preview State ──────────────────────────────────────────────────
  const [previewModalVisible, setPreviewModalVisible] = useState(false)
  const [previewPdfUrl, setPreviewPdfUrl] = useState(null)
  const [previewMeta, setPreviewMeta] = useState(null)

  // ─── Format Currency ──────────────────────────────────────────────────────
  const formatLKR = (num) => {
    if (isNaN(num) || num === null || num === undefined) return '0.00'
    return Number(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  // ─── Filtered Records ─────────────────────────────────────────────────────
  const filteredRecords = useMemo(() => {
    return MOCK_RECEIPT_ITEMS.filter((item) => {
      // Date filter
      if (fromDate && item.date < fromDate) return false
      if (toDate && item.date > toDate) return false

      // Vehicle filter
      if (selectedVehicle && selectedVehicle.value !== 'ALL') {
        if (item.vehicleNumber !== selectedVehicle.value) return false
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
  }, [fromDate, toDate, selectedVehicle, tableSearch])

  // ─── Summary Totals ───────────────────────────────────────────────────────
  const totalTrips = filteredRecords.length
  const totalCubes = filteredRecords.reduce((sum, r) => sum + (Number(r.cube) || 0), 0)
  const totalGrossRate = filteredRecords.reduce((sum, r) => sum + (Number(r.transportRate) || 0), 0)
  const totalDailyExpense = filteredRecords.reduce((sum, r) => sum + (Number(r.dailyExpense) || 0), 0)
  const totalNetPayable = filteredRecords.reduce((sum, r) => sum + (Number(r.payableAmount) || 0), 0)

  // ─── PDF Receipt Generator Function ───────────────────────────────────────
  const generatePdfDoc = (recordsToPrint = filteredRecords, customTitle = null) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const isAll = !selectedVehicle || selectedVehicle.value === 'ALL'
    const vehLabel = isAll ? 'ALL FLEET VEHICLES' : selectedVehicle.value

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
    doc.text(`VOUCHER: MG-VCH-${Date.now().toString().slice(-6)}`, 196, 12, { align: 'right' })
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
    doc.text(`${fromDate || 'START'} to ${toDate || 'CURRENT'}`, 18, 49)
    doc.text(`${vehLabel}`, 78, 49)
    doc.text(`${recordsToPrint.length} Trips (${totalCubes.toFixed(1)} Cubes)`, 140, 49)

    // Table Data preparation
    const tableHeaders = [
      ['#', 'Date', 'Bill No', 'Vehicle', 'Land / Source', 'Delivery Location', 'Cube', 'KM', 'Rate (LKR)', 'Deduction', 'Net Amount']
    ]

    const tableRows = recordsToPrint.map((item, idx) => [
      idx + 1,
      item.date,
      item.billNumber,
      item.vehicleNumber,
      item.land,
      item.deliveryLocation,
      item.cube > 0 ? item.cube : '-',
      item.km > 0 ? `${item.km}` : '-',
      formatLKR(item.transportRate),
      item.dailyExpense > 0 ? formatLKR(item.dailyExpense) : '-',
      formatLKR(item.payableAmount),
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
    doc.text(`Rs. ${formatLKR(totalGrossRate)}`, 192, finalY + 7, { align: 'right' })

    doc.text('Total Expense Deductions:', 114, finalY + 14)
    doc.setTextColor(220, 38, 38)
    doc.text(`- Rs. ${formatLKR(totalDailyExpense)}`, 192, finalY + 14, { align: 'right' })

    doc.setDrawColor(203, 213, 225)
    doc.line(114, finalY + 18, 192, finalY + 18)

    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(15, 23, 42)
    doc.text('NET PAYABLE AMOUNT:', 114, finalY + 26)
    doc.setTextColor(217, 119, 6) // Amber 600
    doc.text(`Rs. ${formatLKR(totalNetPayable)}`, 192, finalY + 26, { align: 'right' })

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

  // ─── Option 1: Preview PDF in Modal ───────────────────────────────────────
  const handlePreviewPdf = (customItem = null) => {
    const records = customItem ? [customItem] : filteredRecords
    if (records.length === 0) {
      alert('No matching records found to generate receipt preview. Please adjust your filters.')
      return
    }

    const doc = generatePdfDoc(records)
    const blob = doc.output('blob')
    const blobUrl = URL.createObjectURL(blob)

    setPreviewPdfUrl(blobUrl)
    setPreviewMeta({
      vehicle: customItem ? customItem.vehicleNumber : (selectedVehicle?.label || 'All Vehicles'),
      count: records.length,
      payable: customItem ? customItem.payableAmount : totalNetPayable,
    })
    setPreviewModalVisible(true)
  }

  // ─── Option 2: Download PDF Receipt ───────────────────────────────────────
  const handleDownloadPdf = (customItem = null) => {
    const records = customItem ? [customItem] : filteredRecords
    if (records.length === 0) {
      alert('No matching records found to download receipt. Please adjust your filters.')
      return
    }

    const doc = generatePdfDoc(records)
    const vehName = customItem
      ? customItem.vehicleNumber
      : selectedVehicle?.value !== 'ALL'
        ? selectedVehicle.value
        : 'All_Vehicles'

    const fileName = `Material_Grid_Receipt_${vehName}_${fromDate}_to_${toDate}.pdf`
    doc.save(fileName)
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
                setFromDate('2026-08-01')
                setToDate('2026-08-16')
                setSelectedVehicle(VEHICLE_OPTIONS[0])
                setTableSearch('')
              }}
            >
              Reset Filters
            </button>
          </div>
        </CCardHeader>

        <CCardBody className="rc-card-body">
          <CRow className="g-3">
            {/* From Date */}
            <CCol xs={12} md={4}>
              <CFormLabel className="rc-label">
                <CIcon icon={cilCalendar} size="sm" className="text-warning" />
                From Date
              </CFormLabel>
              <CFormInput
                type="date"
                className="rc-input"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </CCol>

            {/* To Date */}
            <CCol xs={12} md={4}>
              <CFormLabel className="rc-label">
                <CIcon icon={cilCalendar} size="sm" className="text-warning" />
                To Date
              </CFormLabel>
              <CFormInput
                type="date"
                className="rc-input"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </CCol>

            {/* Searchable Vehicle Dropdown */}
            <CCol xs={12} md={4}>
              <CFormLabel className="rc-label">
                <CIcon icon={cilTruck} size="sm" className="text-warning" />
                Vehicle Number (Searchable)
              </CFormLabel>
              <Select
                options={VEHICLE_OPTIONS}
                value={selectedVehicle}
                onChange={setSelectedVehicle}
                placeholder="Search vehicle number or driver…"
                isClearable={false}
                classNamePrefix="mg-select"
              />
            </CCol>
          </CRow>

          {/* Action Bar with the Two Requested Options */}
          <div className="rc-action-bar mt-3 pt-3 border-top d-flex align-items-center justify-content-between">
            <div></div>

            <div className="d-flex align-items-center gap-2">
              {/* Option 1: Preview PDF Receipt */}
              <button className="rc-btn-preview" onClick={() => handlePreviewPdf()}>
                <CIcon icon={cilFindInPage} /> Preview PDF Receipt
              </button>

              {/* Option 2: Download PDF Receipt */}
              <button className="rc-btn-download" onClick={() => handleDownloadPdf()}>
                <CIcon icon={cilCloudDownload} /> Download PDF Receipt
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
