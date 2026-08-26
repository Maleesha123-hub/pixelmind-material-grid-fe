/**
 * Receipts & Settlement Management
 *
 * Connected directly to DailyRouteController backend APIs for:
 *   - Fetching live statement summary DTOs and KPI totals by vehicleId
 *   - Previewing official backend-generated PDF receipts in an embedded viewer
 *   - Downloading official backend-generated PDF files directly to browser
 *
 * Matches the Material Grid design system (Vehicle, Routes, BulkUpload).
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import AsyncSelect from 'react-select/async'
import Swal from 'sweetalert2'
import vehicleService from '../../service/vehicleService'
import dailyRouteService from '../../service/dailyRouteService'
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
  CSpinner,
  useColorModes,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilDescription,
  cilCalendar,
  cilTruck,
  cilFindInPage,
  cilCloudDownload,
  cilCheckCircle,
  cilUser,
  cilMoney,
  cilFilter,
  cilReload,
  cilWarning,
  cilSpeedometer,
  cilExternalLink,
} from '@coreui/icons'
import './Receipts.css'

// ─── Default Consolidated Option ────────────────────────────────────────────
const DEFAULT_VEHICLE_OPTION = {
  value: 'ALL',
  id: 'ALL',
  vehicleId: 'ALL',
  label: 'Select a Vehicle',
  vehicleNumber: 'ALL',
  vehicleType: 'Complete Active Fleet',
  driverName: 'All Fleet Drivers',
  isConsolidated: true,
}

// ─── Format Currency ────────────────────────────────────────────────────────
const formatLKR = (num) => {
  if (isNaN(num) || num === null || num === undefined) return '0.00'
  return Number(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ─── Enhanced Dynamic Select Component Styles ──────────────────────────────
const getSelectStyles = (isDark) => ({
  control: (base, state) => ({
    ...base,
    minHeight: '42px',
    borderRadius: '8px',
    borderColor: state.isFocused ? '#f59e0b' : isDark ? '#334155' : '#cbd5e1',
    boxShadow: state.isFocused ? '0 0 0 3px rgba(245,158,11,0.22)' : 'none',
    fontSize: '0.875rem',
    backgroundColor: isDark ? '#131d31' : '#ffffff',
    color: isDark ? '#f8fafc' : '#0f172a',
    cursor: 'pointer',
    '&:hover': { borderColor: '#f59e0b' },
  }),
  menuPortal: (base) => ({ ...base, zIndex: 99999 }),
  menu: (base) => ({
    ...base,
    borderRadius: '10px',
    zIndex: 99999,
    boxShadow: isDark ? '0 16px 36px rgba(0, 0, 0, 0.65)' : '0 12px 28px rgba(15, 23, 42, 0.16)',
    backgroundColor: isDark ? '#0f172a' : '#ffffff',
    border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
    overflow: 'hidden',
  }),
  menuList: (base) => ({
    ...base,
    maxHeight: '260px',
    padding: '4px',
    backgroundColor: isDark ? '#0f172a' : '#ffffff',
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? '#d97706'
      : state.isFocused
        ? isDark
          ? '#1e293b'
          : '#fef3c7'
        : 'transparent',
    color: state.isSelected ? '#ffffff' : isDark ? '#f8fafc' : '#0f172a',
    fontSize: '0.85rem',
    cursor: 'pointer',
    borderRadius: '6px',
    padding: '8px 12px',
    marginBottom: '2px',
    transition: 'all 0.12s ease',
  }),
  input: (base) => ({
    ...base,
    color: isDark ? '#f8fafc' : '#0f172a',
  }),
  placeholder: (base) => ({
    ...base,
    color: isDark ? '#64748b' : '#94a3b8',
    fontSize: '0.85rem',
  }),
  singleValue: (base) => ({
    ...base,
    color: isDark ? '#f8fafc' : '#0f172a',
    fontSize: '0.875rem',
    fontWeight: 600,
  }),
  indicatorSeparator: (base) => ({
    ...base,
    backgroundColor: isDark ? '#334155' : '#e2e8f0',
  }),
  dropdownIndicator: (base) => ({
    ...base,
    color: isDark ? '#94a3b8' : '#64748b',
    '&:hover': { color: '#f59e0b' },
  }),
  clearIndicator: (base) => ({
    ...base,
    color: isDark ? '#94a3b8' : '#64748b',
    '&:hover': { color: '#ef4444' },
  }),
})

// ─── Custom Option UI Component for Vehicle Select Dropdown ─────────────────
const CustomVehicleOption = (props) => {
  const { data, innerRef, innerProps, isSelected, isFocused } = props

  if (data.isConsolidated) {
    return (
      <div
        ref={innerRef}
        {...innerProps}
        className={`rc-select-option rc-select-option--consolidated ${
          isSelected ? 'is-selected' : isFocused ? 'is-focused' : ''
        }`}
      >
        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-2">
            <span className="rc-option-icon-box rc-option-icon-box--gold">
              <CIcon icon={cilTruck} size="sm" />
            </span>
            <div>
              <strong className="rc-option-title">{data.label}</strong>
              <div className="rc-option-subtitle">{data.vehicleType}</div>
            </div>
          </div>
          <span className="rc-badge-pill rc-badge-pill--gold">All Fleet</span>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={innerRef}
      {...innerProps}
      className={`rc-select-option ${isSelected ? 'is-selected' : isFocused ? 'is-focused' : ''}`}
    >
      <div className="d-flex align-items-center gap-2">
        <span className="rc-option-plate">{data.vehicleNumber || data.label}</span>
        <div>
          <div className="rc-option-driver">
            <CIcon icon={cilUser} size="sm" className="me-1 text-muted" />
            {data.driverName || 'Assigned Driver'}
          </div>
          {data.vehicleType && <div className="rc-option-type">{data.vehicleType}</div>}
        </div>
      </div>
    </div>
  )
}

// ─── Today Date String Helper ───────────────────────────────────────────────
const getTodayStr = () => new Date().toISOString().split('T')[0]

const Receipts = () => {
  // ─── Color Mode (Dark / Light) ────────────────────────────────────────────
  const { colorMode } = useColorModes('coreui-free-react-admin-template-theme')
  const selectStyles = useMemo(() => getSelectStyles(colorMode === 'dark'), [colorMode])

  // ─── Filter State ─────────────────────────────────────────────────────────
  const [startDate, setStartDate] = useState(getTodayStr)
  const [endDate, setEndDate] = useState(getTodayStr)
  const [selectedVehicle, setSelectedVehicle] = useState(DEFAULT_VEHICLE_OPTION)
  const [refreshKey, setRefreshKey] = useState(0)

  // ─── Backend Summary Data State ───────────────────────────────────────────
  const [backendSummary, setBackendSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [initialFleetOptions, setInitialFleetOptions] = useState([DEFAULT_VEHICLE_OPTION])

  // ─── Modal Backend PDF Preview State ──────────────────────────────────────
  const [previewModalVisible, setPreviewModalVisible] = useState(false)
  const [previewPdfUrl, setPreviewPdfUrl] = useState(null)
  const [previewMeta, setPreviewMeta] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [downloadLoading, setDownloadLoading] = useState(false)

  // ─── Format Vehicle Object into Standard Select Option with vehicleId ─────
  const formatVehicleOption = useCallback((v) => {
    if (!v) return null
    const rawId = v.id ?? v.vehicleId ?? null
    const num =
      v.vehicleNumber ||
      v.vehicleNo ||
      v.registrationNumber ||
      v.regNo ||
      v.number ||
      (rawId ? `Vehicle #${rawId}` : '')
    const type = v.vehicleType || v.type || v.model || (v.capacity ? `${v.capacity} cube` : '')
    const driver = v.driverName || v.driver || ''

    let label = num
    if (driver) label += ` (${driver})`
    if (type) label += ` — ${type}`

    return {
      value: rawId ? String(rawId) : num || 'ALL',
      id: rawId,
      vehicleId: rawId,
      vehicleNumber: num,
      label,
      vehicleType: type || 'Material Transport Vehicle',
      driverName: driver || 'Assigned Driver',
      data: v,
    }
  }, [])

  // ─── Load Real Vehicles from Backend on Mount ─────────────────────────────
  useEffect(() => {
    let ignore = false
    const loadFleet = async () => {
      try {
        const data = await vehicleService.getAllVehicles()
        if (!ignore && Array.isArray(data)) {
          const opts = data.map(formatVehicleOption).filter(Boolean)
          setInitialFleetOptions([DEFAULT_VEHICLE_OPTION, ...opts])
        }
      } catch (err) {
        console.error('Failed to load fleet vehicles:', err)
      }
    }
    loadFleet()
    return () => {
      ignore = true
    }
  }, [formatVehicleOption])

  // ─── Async Vehicle Search Loader (Queries Backend Directly) ───────────────
  const loadVehicleOptions = async (inputValue) => {
    const cleanInput = (inputValue || '').trim().toLowerCase()

    try {
      const backendVehicles = await vehicleService.searchVehicles(cleanInput)
      const backendFormatted = Array.isArray(backendVehicles)
        ? backendVehicles.map(formatVehicleOption).filter(Boolean)
        : []

      if (!cleanInput || cleanInput.includes('all')) {
        return [DEFAULT_VEHICLE_OPTION, ...backendFormatted]
      }

      return backendFormatted
    } catch (err) {
      console.error('Vehicle search API error:', err)
      return [DEFAULT_VEHICLE_OPTION]
    }
  }

  // ─── Fetch Receipt Summary DTO from DailyRouteReportController Backend ───
  useEffect(() => {
    let ignore = false
    const controller = new AbortController()

    const fetchReceiptSummary = async () => {
      if ((!startDate && !endDate) || selectedVehicle?.vehicleId === 'ALL') {
        setBackendSummary(null)
        return
      }

      setLoading(true)
      const vehicleId =
        selectedVehicle?.vehicleId ||
        selectedVehicle?.id ||
        (selectedVehicle?.value !== 'ALL' ? selectedVehicle?.value : '')

      try {
        const summaryDto = await dailyRouteService.getSummary(
          { startDate, endDate, vehicleId },
          controller.signal,
        )

        if (!ignore && summaryDto) {
          setBackendSummary(summaryDto)
        }
      } catch (err) {
        if (ignore || err.name === 'AbortError') return
        console.error('DailyRouteReportController.getSummary() fetch failed:', err.message)
        setBackendSummary(null)
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    fetchReceiptSummary()

    return () => {
      ignore = true
      controller.abort()
    }
  }, [startDate, endDate, selectedVehicle, refreshKey])

  // ─── Summary Totals from Backend DTO (DailyRouteReportController.getSummary) ───
  const totalDispatches = backendSummary?.totalDispatches ?? 0

  const totalCubes = backendSummary?.totalVolumes ?? 0

  const totalGrossRate = backendSummary?.dailyGrossTransportRate ?? 0

  const totalDailyExpense = backendSummary?.dailyDeduction ?? 0

  const totalNetPayable = backendSummary?.payable ?? 0

  // ─── Action: Preview Backend PDF (Streamed from Backend) ──────────────────
  const handlePreviewBackendPdf = async () => {
    if ((!startDate && !endDate) || !selectedVehicle || selectedVehicle?.value === 'ALL') {
      Swal.fire({
        icon: 'warning',
        title: 'Vehicle & Date Required',
        text: 'Please select date range and an assigned vehicle to preview the receipt.',
        confirmButtonColor: '#f59e0b',
      })
      return
    }

    const vehicleId = selectedVehicle?.id || selectedVehicle?.vehicleId || selectedVehicle?.value

    setPreviewLoading(true)

    try {
      const pdfBlob = await dailyRouteService.getReceiptPdfBlob({
        startDate,
        endDate,
        vehicleId,
      })

      const blobUrl = URL.createObjectURL(pdfBlob)

      setPreviewPdfUrl(blobUrl)
      setPreviewMeta({
        vehicle: selectedVehicle?.label || `Vehicle #${vehicleId}`,
        dateRange: startDate && endDate ? `${startDate} to ${endDate}` : startDate || endDate,
        count: totalDispatches,
        payable: totalNetPayable,
        vehicleId,
      })
      setPreviewModalVisible(true)
    } catch (err) {
      console.error('Backend PDF preview failed:', err)
      Swal.fire({
        icon: 'error',
        title: 'Backend PDF Preview Failed',
        text:
          err.message ||
          'Unable to retrieve PDF receipt from backend DailyRouteReportController. Please check server logs.',
        confirmButtonColor: '#dc2626',
      })
    } finally {
      setPreviewLoading(false)
    }
  }

  // ─── Action: Download Backend PDF (Streamed from Backend) ─────────────────
  const handleDownloadBackendPdf = async () => {
    if ((!startDate && !endDate) || !selectedVehicle || selectedVehicle?.value === 'ALL') {
      Swal.fire({
        icon: 'warning',
        title: 'Vehicle & Date Required',
        text: 'Please select date range and an assigned vehicle to download the official receipt.',
        confirmButtonColor: '#f59e0b',
      })
      return
    }

    const vehicleId = selectedVehicle?.id || selectedVehicle?.vehicleId || selectedVehicle?.value
    const dateLabel =
      startDate && endDate ? `${startDate}_to_${endDate}` : startDate || endDate || 'export'
    const fileName = `Material_Grid_Receipt_${selectedVehicle?.vehicleNumber || `Vehicle_${vehicleId}`}_${dateLabel}.pdf`

    setDownloadLoading(true)

    try {
      await dailyRouteService.downloadReceiptPdf({
        startDate,
        endDate,
        vehicleId,
        fileName,
      })

      const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      })
      Toast.fire({
        icon: 'success',
        title: 'Receipt PDF downloaded successfully!',
      })
    } catch (err) {
      console.error('Backend PDF download failed:', err)
      Swal.fire({
        icon: 'error',
        title: 'Download Failed',
        text:
          err.message ||
          'Unable to download receipt PDF from backend DailyRouteReportController. Please check server logs.',
        confirmButtonColor: '#dc2626',
      })
    } finally {
      setDownloadLoading(false)
    }
  }

  // ─── Clean up object URL when modal closes ────────────────────────────────
  const handleCloseModal = () => {
    setPreviewModalVisible(false)
    if (previewPdfUrl) {
      URL.revokeObjectURL(previewPdfUrl)
      setPreviewPdfUrl(null)
    }
    setPreviewMeta(null)
  }

  const handleVehicleChange = (opt) => {
    setSelectedVehicle(opt || DEFAULT_VEHICLE_OPTION)
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
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <h1 className="rc-page-title">Receipts & Settlement</h1>
              <span className="rc-backend-tag">
                <CIcon icon={cilCheckCircle} size="sm" /> DailyRoute Connected
              </span>
            </div>
            <p className="rc-page-subtitle">
              Official logistics transport vouchers, dispatch settlements, and backend-generated PDF
              receipts
            </p>
          </div>
        </div>

        <div className="rc-header-right">
          <button
            className="rc-btn-refresh"
            onClick={() => setRefreshKey((k) => k + 1)}
            disabled={loading}
            title="Refresh live data from backend"
          >
            <CIcon icon={cilReload} className={loading ? 'rc-spin' : ''} />
            <span>{loading ? 'Refreshing…' : 'Refresh Data'}</span>
          </button>
        </div>
      </div>

      {/* ── Filter Card ── */}
      <CCard className="rc-card">
        <CCardHeader className="rc-card-header">
          <div className="rc-card-title">
            <CIcon icon={cilFilter} className="text-warning" />
            <span>Receipt Filter & Settlement Controls</span>
          </div>
          <div className="d-flex align-items-center gap-2">
            <button
              className="rc-btn-reset"
              onClick={() => {
                setStartDate(getTodayStr())
                setEndDate(getTodayStr())
                setSelectedVehicle(DEFAULT_VEHICLE_OPTION)
              }}
            >
              Reset Filters
            </button>
          </div>
        </CCardHeader>

        <CCardBody className="rc-card-body">
          <CRow className="g-3">
            {/* Start Date */}
            <CCol xs={12} sm={6} md={3}>
              <CFormLabel className="rc-label">
                <CIcon icon={cilCalendar} size="sm" className="text-warning" />
                Start Date
              </CFormLabel>
              <CFormInput
                type="date"
                className="rc-input"
                value={startDate}
                max={endDate || undefined}
                onChange={(e) => {
                  const val = e.target.value
                  setStartDate(val)
                  if (endDate && val && new Date(val) > new Date(endDate)) {
                    setEndDate('')
                  }
                }}
              />
            </CCol>

            {/* End Date */}
            <CCol xs={12} sm={6} md={3}>
              <CFormLabel className="rc-label">
                <CIcon icon={cilCalendar} size="sm" className="text-warning" />
                End Date
              </CFormLabel>
              <CFormInput
                type="date"
                className="rc-input"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </CCol>

            {/* Searchable Vehicle Dropdown (Real Backend Data) */}
            <CCol xs={12} md={6}>
              <CFormLabel className="rc-label">
                <CIcon icon={cilTruck} size="sm" className="text-warning" />
                Assigned Vehicle Number
              </CFormLabel>
              <AsyncSelect
                cacheOptions
                defaultOptions={initialFleetOptions}
                loadOptions={loadVehicleOptions}
                value={selectedVehicle}
                onChange={handleVehicleChange}
                placeholder="Type to search vehicle #, driver, type…"
                isClearable={true}
                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                styles={selectStyles}
                components={{
                  Option: CustomVehicleOption,
                }}
                classNamePrefix="mg-vehicle-select"
                noOptionsMessage={({ inputValue }) =>
                  inputValue
                    ? `No vehicles matching "${inputValue}"`
                    : 'Type to search fleet vehicles…'
                }
                loadingMessage={() => 'Searching fleet vehicles…'}
              />
            </CCol>
          </CRow>

          {/* Action Bar with Backend PDF Preview & Download */}
          <div className="rc-action-bar mt-3 pt-3 border-top d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div className="rc-selection-indicator">
              <span className="rc-selection-badge">
                Selected:{' '}
                <strong>
                  {selectedVehicle?.value === 'ALL'
                    ? 'Search Vehicles'
                    : selectedVehicle?.label || selectedVehicle?.vehicleNumber}
                </strong>
                {startDate && endDate
                  ? ` • ${startDate} to ${endDate}`
                  : startDate || endDate
                    ? ` • ${startDate || endDate}`
                    : ' • All Dates'}
              </span>
              <span className="text-muted ms-2" style={{ fontSize: '0.8rem' }}>
                ({totalDispatches} recorded dispatches)
              </span>
            </div>

            <div className="d-flex align-items-center gap-2 flex-wrap">
              {/* Option 1: Preview Backend PDF Receipt */}
              <button
                className="rc-btn-preview"
                onClick={handlePreviewBackendPdf}
                disabled={previewLoading || downloadLoading || loading}
              >
                {previewLoading ? (
                  <>
                    <CSpinner size="sm" className="me-1" /> Fetching Backend PDF…
                  </>
                ) : (
                  <>
                    <CIcon icon={cilFindInPage} /> Preview PDF Receipt
                  </>
                )}
              </button>

              {/* Option 2: Download Backend PDF Receipt */}
              <button
                className="rc-btn-download"
                onClick={handleDownloadBackendPdf}
                disabled={previewLoading || downloadLoading || loading}
              >
                {downloadLoading ? (
                  <>
                    <CSpinner size="sm" className="me-1" /> Downloading PDF…
                  </>
                ) : (
                  <>
                    <CIcon icon={cilCloudDownload} /> Download PDF Receipt
                  </>
                )}
              </button>
            </div>
          </div>
        </CCardBody>
      </CCard>

      {/* ── KPI Summary Cards ── */}
      {/* <div className="rc-kpi-grid">
        <div className="rc-kpi-card rc-kpi-card--blue">
          <div className="d-flex justify-content-between align-items-start">
            <div>
              <div className="rc-kpi-label">Total Dispatches</div>
              <div className="rc-kpi-value">{totalDispatches}</div>
              <div className="rc-kpi-sub">Trips recorded</div>
            </div>
            <div className="rc-kpi-icon-pill rc-kpi-icon-pill--blue">
              <CIcon icon={cilTruck} />
            </div>
          </div>
        </div>

        <div className="rc-kpi-card rc-kpi-card--emerald">
          <div className="d-flex justify-content-between align-items-start">
            <div>
              <div className="rc-kpi-label">Total Volume</div>
              <div className="rc-kpi-value">
                {Number(totalCubes).toFixed(1)} <span style={{ fontSize: '0.85rem' }}>m³</span>
              </div>
              <div className="rc-kpi-sub">Total material cubes</div>
            </div>
            <div className="rc-kpi-icon-pill rc-kpi-icon-pill--emerald">
              <CIcon icon={cilSpeedometer} />
            </div>
          </div>
        </div>

        <div className="rc-kpi-card rc-kpi-card--indigo">
          <div className="d-flex justify-content-between align-items-start">
            <div>
              <div className="rc-kpi-label">Gross Transport Rate</div>
              <div className="rc-kpi-value">Rs. {formatLKR(totalGrossRate)}</div>
              <div className="rc-kpi-sub">Before expense deductions</div>
            </div>
            <div className="rc-kpi-icon-pill rc-kpi-icon-pill--indigo">
              <CIcon icon={cilMoney} />
            </div>
          </div>
        </div>

        <div className="rc-kpi-card rc-kpi-card--red">
          <div className="d-flex justify-content-between align-items-start">
            <div>
              <div className="rc-kpi-label">Daily Deductions</div>
              <div className="rc-kpi-value text-danger">Rs. {formatLKR(totalDailyExpense)}</div>
              <div className="rc-kpi-sub">Fleet & site advances</div>
            </div>
            <div className="rc-kpi-icon-pill rc-kpi-icon-pill--red">
              <CIcon icon={cilWarning} />
            </div>
          </div>
        </div>

        <div className="rc-kpi-card rc-kpi-card--slate">
          <div className="d-flex justify-content-between align-items-start">
            <div>
              <div className="rc-kpi-label">Net Payable Settlement</div>
              <div className="rc-kpi-value text-amber">Rs. {formatLKR(totalNetPayable)}</div>
              <div className="rc-kpi-sub">Final voucher balance</div>
            </div>
            <div className="rc-kpi-icon-pill rc-kpi-icon-pill--amber">
              <CIcon icon={cilCheckCircle} />
            </div>
          </div>
        </div>
      </div> */}

      {/* ── Interactive Backend PDF Preview Modal ── */}
      <CModal
        size="xl"
        visible={previewModalVisible}
        onClose={handleCloseModal}
        backdrop="static"
        className="rc-pdf-modal"
      >
        <CModalHeader className="bg-dark text-white d-flex align-items-center justify-content-between">
          <CModalTitle className="d-flex align-items-center gap-2" style={{ fontSize: '1rem' }}>
            <CIcon icon={cilDescription} className="text-warning" />
            <span>Backend PDF Receipt Preview — {previewMeta?.vehicle}</span>
          </CModalTitle>
          <div className="d-flex align-items-center gap-2 me-3">
            <span className="rc-modal-pill">
              <CIcon icon={cilCalendar} size="sm" /> {previewMeta?.dateRange || 'Selected Period'}
            </span>
            {/* <span className="rc-modal-pill rc-modal-pill--amber">
              {previewMeta?.count} Trip{previewMeta?.count !== 1 ? 's' : ''}
            </span> */}
          </div>
        </CModalHeader>

        <CModalBody className="p-2">
          {previewLoading ? (
            <div className="text-center py-5">
              <CSpinner color="warning" />
              <p className="text-muted mt-2">
                Streaming official PDF receipt from DailyRoute controller…
              </p>
            </div>
          ) : previewPdfUrl ? (
            <div className="rc-pdf-preview-wrapper">
              <object data={previewPdfUrl} type="application/pdf" className="rc-pdf-iframe">
                <iframe
                  src={previewPdfUrl}
                  title="Backend PDF Receipt Preview"
                  className="rc-pdf-iframe"
                />
              </object>
            </div>
          ) : (
            <div className="text-center py-5">
              <p className="text-muted">No PDF stream available. Please try again.</p>
            </div>
          )}
        </CModalBody>

        <CModalFooter className="d-flex justify-content-between align-items-center">
          <div className="text-muted" style={{ fontSize: '0.85rem' }}>
            {/* Net Payable Settlement:{' '}
            <strong className="text-success" style={{ fontSize: '1rem' }}>
              Rs. {formatLKR(previewMeta?.payable)}
            </strong> */}
          </div>

          <div className="d-flex align-items-center gap-2">
            {previewPdfUrl && (
              <a href={previewPdfUrl} target="_blank" rel="noreferrer" className="rc-btn-open-tab">
                <CIcon icon={cilExternalLink} /> Open in New Tab
              </a>
            )}

            <CButton color="secondary" variant="ghost" onClick={handleCloseModal}>
              Close
            </CButton>

            <button
              className="rc-btn-download"
              onClick={handleDownloadBackendPdf}
              disabled={downloadLoading}
            >
              {downloadLoading ? (
                <>
                  <CSpinner size="sm" className="me-1" /> Downloading…
                </>
              ) : (
                <>
                  <CIcon icon={cilCloudDownload} /> Download PDF Now
                </>
              )}
            </button>
          </div>
        </CModalFooter>
      </CModal>
    </div>
  )
}

export default Receipts
