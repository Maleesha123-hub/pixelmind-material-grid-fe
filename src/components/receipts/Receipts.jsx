/**
 * Receipts & Settlement Management
 *
 * Connected directly to DailyRouteController backend APIs for:
 *   - Fetching live daily route / trips transactions and summary totals
 *   - Previewing official backend-generated PDF receipts in an embedded viewer
 *   - Downloading official backend-generated PDF files directly to browser
 *
 * Matches the Material Grid design system (Vehicle, Routes, BulkUpload).
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react'
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
  CBadge,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilDescription,
  cilCalendar,
  cilTruck,
  cilFindInPage,
  cilCloudDownload,
  cilSearch,
  cilCheckCircle,
  cilUser,
  cilMoney,
  cilFilter,
  cilReload,
  cilChevronLeft,
  cilChevronRight,
  cilWarning,
  cilLocationPin,
  cilSpeedometer,
  cilExternalLink,
} from '@coreui/icons'
import './Receipts.css'

// ─── Default Consolidated Option ────────────────────────────────────────────
const DEFAULT_VEHICLE_OPTION = {
  value: 'ALL',
  label: 'All Vehicles (Consolidated Receipt)',
  vehicleNumber: 'ALL',
  vehicleType: 'Complete Active Fleet',
  driverName: 'All Fleet Drivers',
  isConsolidated: true,
}

// ─── Master Fleet Vehicles Reference ────────────────────────────────────────
const MASTER_FLEET_VEHICLES = []

// ─── Fallback Sample Dataset (Used only when backend is unreachable) ────────
const FALLBACK_RECEIPT_ITEMS = []

// ─── Format Currency ────────────────────────────────────────────────────────
const formatLKR = (num) => {
  if (isNaN(num) || num === null || num === undefined) return '0.00'
  return Number(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ─── Enhanced Select Component Styles ───────────────────────────────────────
const selectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: '42px',
    borderRadius: '8px',
    borderColor: state.isFocused ? '#d97706' : '#cbd5e1',
    boxShadow: state.isFocused ? '0 0 0 3px rgba(217,119,6,0.18)' : 'none',
    fontSize: '0.875rem',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    '&:hover': { borderColor: '#d97706' },
  }),
  menuPortal: (base) => ({ ...base, zIndex: 99999 }),
  menu: (base) => ({
    ...base,
    borderRadius: '10px',
    zIndex: 99999,
    boxShadow: '0 12px 28px rgba(15, 23, 42, 0.16)',
    border: '1px solid #cbd5e1',
    overflow: 'hidden',
  }),
  menuList: (base) => ({
    ...base,
    maxHeight: '260px',
    padding: '4px',
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected ? '#d97706' : state.isFocused ? '#fef3c7' : 'transparent',
    color: state.isSelected ? '#ffffff' : '#0f172a',
    fontSize: '0.85rem',
    cursor: 'pointer',
    borderRadius: '6px',
    padding: '8px 12px',
    marginBottom: '2px',
    transition: 'all 0.12s ease',
  }),
  placeholder: (base) => ({ ...base, color: '#94a3b8', fontSize: '0.85rem' }),
  singleValue: (base) => ({ ...base, color: '#0f172a', fontSize: '0.875rem', fontWeight: 600 }),
}

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
      <div className="d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center gap-2">
          <span className="rc-option-plate">{data.vehicleNumber || data.value}</span>
          <div>
            <div className="rc-option-driver">
              <CIcon icon={cilUser} size="sm" className="me-1 text-muted" />
              {data.driverName || 'Assigned Driver'}
            </div>
            {data.vehicleType && <div className="rc-option-type">{data.vehicleType}</div>}
          </div>
        </div>
        <span className="rc-badge-pill rc-badge-pill--active">Active</span>
      </div>
    </div>
  )
}

const PAGE_SIZE = 10

const Receipts = () => {
  // ─── Filter State ─────────────────────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState('2026-08-07')
  const [selectedVehicle, setSelectedVehicle] = useState(DEFAULT_VEHICLE_OPTION)
  const [tableSearch, setTableSearch] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  // ─── Backend Data State ───────────────────────────────────────────────────
  const [records, setRecords] = useState([])
  const [backendSummary, setBackendSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  // ─── Modal Backend PDF Preview State ──────────────────────────────────────
  const [previewModalVisible, setPreviewModalVisible] = useState(false)
  const [previewPdfUrl, setPreviewPdfUrl] = useState(null)
  const [previewMeta, setPreviewMeta] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [downloadLoading, setDownloadLoading] = useState(false)
  const [rowActionId, setRowActionId] = useState(null)

  // ─── Format Vehicle Object into Standard Select Option ────────────────────
  const formatVehicleOption = useCallback((v) => {
    const num =
      v.vehicleNumber || v.vehicleNo || v.registrationNumber || v.regNo || v.number || v.id || ''
    const type = v.vehicleType || v.type || v.model || (v.capacity ? `${v.capacity} m³` : '')
    const driver = v.driverName || v.driver || ''

    let label = num
    if (driver) label += ` (${driver})`
    if (type) label += ` — ${type}`

    return {
      value: num,
      label,
      vehicleNumber: num,
      vehicleType: type || 'Material Transport Vehicle',
      driverName: driver || 'Assigned Driver',
      data: v,
    }
  }, [])

  // ─── Initial Master Fleet Options for Dropdown (At least 14 vehicles) ─────
  const initialFleetOptions = useMemo(() => {
    const fleetList = MASTER_FLEET_VEHICLES.map(formatVehicleOption)
    return [DEFAULT_VEHICLE_OPTION, ...fleetList]
  }, [formatVehicleOption])

  // ─── Async Vehicle Search Loader (Returns at least 5+ matching vehicles) ──
  const loadVehicleOptions = async (inputValue) => {
    const cleanInput = (inputValue || '').trim().toLowerCase()

    try {
      // 1. Fetch live matches from backend API
      const backendVehicles = await vehicleService.searchVehicles(cleanInput)
      const backendFormatted = Array.isArray(backendVehicles)
        ? backendVehicles.map(formatVehicleOption)
        : []

      // 2. Aggregate with master fleet and transaction vehicles to ensure rich dataset
      const aggregatedMap = new Map()

      // Insert backend vehicles first
      backendFormatted.forEach((item) => {
        if (item.value && item.value !== 'ALL') {
          aggregatedMap.set(item.value.toUpperCase(), item)
        }
      })

      // Insert master fleet vehicles
      MASTER_FLEET_VEHICLES.forEach((item) => {
        const opt = formatVehicleOption(item)
        if (!aggregatedMap.has(opt.value.toUpperCase())) {
          aggregatedMap.set(opt.value.toUpperCase(), opt)
        }
      })

      const allVehicles = Array.from(aggregatedMap.values())

      // 3. Filter by search input (matching vehicle plate, driver, or type)
      let filtered = allVehicles
      if (cleanInput && !cleanInput.includes('all')) {
        filtered = allVehicles.filter((opt) => {
          const numMatch = (opt.vehicleNumber || '').toLowerCase().includes(cleanInput)
          const driverMatch = (opt.driverName || '').toLowerCase().includes(cleanInput)
          const typeMatch = (opt.vehicleType || '').toLowerCase().includes(cleanInput)
          const labelMatch = (opt.label || '').toLowerCase().includes(cleanInput)
          return numMatch || driverMatch || typeMatch || labelMatch
        })
      }

      // If user is searching 'all' or empty input, include the consolidated option
      if (!cleanInput || cleanInput.includes('all')) {
        return [DEFAULT_VEHICLE_OPTION, ...filtered]
      }

      // If query has matches, return matching vehicles (always showing at least 5 if available in fleet)
      if (filtered.length > 0) {
        return filtered
      }

      // Fallback: if no exact match found, provide top 5 closest fleet vehicles so user always has choices
      return allVehicles.slice(0, 5)
    } catch (err) {
      console.warn('Vehicle search API fallback to local fleet:', err.message)
      if (!cleanInput || cleanInput.includes('all')) {
        return initialFleetOptions
      }
      const filtered = MASTER_FLEET_VEHICLES.map(formatVehicleOption).filter((opt) =>
        (opt.label || '').toLowerCase().includes(cleanInput),
      )
      return filtered.length > 0 ? filtered : initialFleetOptions.slice(0, 6)
    }
  }

  // ─── Fetch Daily Routes / Receipts from DailyRouteController Backend ──────
  useEffect(() => {
    let ignore = false
    const controller = new AbortController()

    const fetchReceipts = async () => {
      setLoading(true)
      const vehicleId = selectedVehicle?.data?.id || 'ALL'

      try {
        const routesResponse = await dailyRouteService.getDailyRoutes(
          {
            date: selectedDate,
            vehicleId: vehicleId,
            search: tableSearch,
            page: 0,
            size: 100,
          },
          controller.signal,
        )

        if (ignore) return

        let fetchedList = []
        if (routesResponse?.content && Array.isArray(routesResponse.content)) {
          fetchedList = routesResponse.content
        } else if (Array.isArray(routesResponse)) {
          fetchedList = routesResponse
        } else if (routesResponse?.items || routesResponse?.records || routesResponse?.trips) {
          fetchedList = routesResponse.items || routesResponse.records || routesResponse.trips
        }

        const mapped = fetchedList.map((r, i) => ({
          id: r.id || r.routeId || r.tripId || `REC-${i + 1}`,
          date: r.date || r.routeDate || r.tripDate || selectedDate,
          billNumber: r.billNumber || r.billNo || r.invoiceNo || r.code || `B-${1000 + i}`,
          vehicleNumber: r.vehicleNumber || r.vehicleNo || r.regNo || vehNumber,
          driver: r.driver || r.driverName || r.driverContact || 'Assigned Driver',
          land: r.land || r.landName || r.source || r.startLocation || 'Quarry Source',
          deliveryLocation:
            r.deliveryLocation || r.location || r.endLocation || r.destination || 'Delivery Site',
          cube: Number(r.cube || r.cubes || r.quantity || 0),
          km: Number(r.km || r.distance || 0),
          transportRate: Number(r.transportRate || r.rate || r.amount || r.grossAmount || 0),
          dailyExpense: Number(r.dailyExpense || r.expense || r.deduction || 0),
          payableAmount: Number(
            r.payableAmount ??
              r.netAmount ??
              r.netPayable ??
              Number(r.transportRate || 0) - Number(r.dailyExpense || 0),
          ),
          status: r.status || (r.paid ? 'Paid' : 'Pending') || 'Paid',
          raw: r,
        }))

        setRecords(mapped)

        try {
          if (selectedDate) {
            const summaryDto = await dailyRouteService.getReceiptPreviewData(
              selectedDate,
              vehNumber,
              controller.signal,
            )
            if (!ignore && summaryDto) {
              setBackendSummary(summaryDto)
            }
          }
        } catch {
          if (!ignore) setBackendSummary(null)
        }
      } catch (err) {
        if (ignore || err.name === 'AbortError') return
        console.warn('Backend daily routes fetch failed, loading local fallback data:', err.message)

        const fallbackFiltered = FALLBACK_RECEIPT_ITEMS.filter((item) => {
          if (selectedDate && item.date !== selectedDate) return false
          if (vehNumber !== 'ALL') {
            const itemVeh = (item.vehicleNumber || '').toLowerCase().replace(/[\s\-_]/g, '')
            const selVeh = vehNumber.toLowerCase().replace(/[\s\-_]/g, '')
            if (itemVeh !== selVeh) return false
          }
          return true
        })

        setRecords(fallbackFiltered)
        setBackendSummary(null)
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    fetchReceipts()

    return () => {
      ignore = true
      controller.abort()
    }
  }, [selectedDate, selectedVehicle, tableSearch, refreshKey])

  // ─── Filtered Records (with search input) ─────────────────────────────────
  const filteredRecords = useMemo(() => {
    if (!tableSearch.trim()) return records

    const q = tableSearch.toLowerCase().trim()
    return records.filter((item) => {
      const matchVeh = (item.vehicleNumber || '').toLowerCase().includes(q)
      const matchBill = (item.billNumber || '').toString().toLowerCase().includes(q)
      const matchDriver = (item.driver || '').toLowerCase().includes(q)
      const matchLoc = (item.deliveryLocation || '').toLowerCase().includes(q)
      const matchLand = (item.land || '').toLowerCase().includes(q)
      const matchId = (item.id || '').toString().toLowerCase().includes(q)
      return matchVeh || matchBill || matchDriver || matchLoc || matchLand || matchId
    })
  }, [records, tableSearch])

  // ─── Pagination ───────────────────────────────────────────────────────────
  const totalPages = Math.ceil(filteredRecords.length / PAGE_SIZE) || 1
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredRecords.slice(start, start + PAGE_SIZE)
  }, [filteredRecords, currentPage])

  // ─── Summary Totals ───────────────────────────────────────────────────────
  const totalTrips = backendSummary?.totalTrips ?? filteredRecords.length
  const totalCubes =
    backendSummary?.totalCubes ?? filteredRecords.reduce((sum, r) => sum + (Number(r.cube) || 0), 0)
  const totalGrossRate =
    backendSummary?.totalGrossRate ??
    backendSummary?.grossAmount ??
    filteredRecords.reduce((sum, r) => sum + (Number(r.transportRate) || 0), 0)
  const totalDailyExpense =
    backendSummary?.totalDailyExpense ??
    backendSummary?.totalExpenses ??
    filteredRecords.reduce((sum, r) => sum + (Number(r.dailyExpense) || 0), 0)
  const totalNetPayable =
    backendSummary?.totalNetPayable ??
    backendSummary?.netPayable ??
    totalGrossRate - totalDailyExpense

  // ─── Action: Preview Backend PDF (Streamed from DailyRouteController) ─────
  const handlePreviewBackendPdf = async (customItem = null) => {
    if (!selectedDate && !customItem) {
      Swal.fire({
        icon: 'warning',
        title: 'Date Required',
        text: 'Please select a date to preview the official backend PDF receipt.',
        confirmButtonColor: '#f59e0b',
      })
      return
    }

    const vehNumber = customItem ? customItem.vehicleNumber : selectedVehicle?.value || 'ALL'
    const routeId = customItem ? customItem.id || customItem.raw?.id : null

    setPreviewLoading(true)
    if (customItem) setRowActionId(customItem.id)

    try {
      const pdfBlob = await dailyRouteService.getReceiptPdfBlob({
        date: customItem ? customItem.date || selectedDate : selectedDate,
        vehicleNumber: vehNumber,
        routeId,
      })

      const blobUrl = URL.createObjectURL(pdfBlob)

      setPreviewPdfUrl(blobUrl)
      setPreviewMeta({
        vehicle: customItem ? customItem.vehicleNumber : selectedVehicle?.label || vehNumber,
        date: customItem ? customItem.date : selectedDate,
        count: customItem ? 1 : totalTrips,
        payable: customItem ? customItem.payableAmount : totalNetPayable,
        routeId,
        vehNumber,
      })
      setPreviewModalVisible(true)
    } catch (err) {
      console.error('Backend PDF preview failed:', err)
      Swal.fire({
        icon: 'error',
        title: 'Backend PDF Preview Failed',
        text:
          err.message ||
          'Unable to retrieve PDF receipt from backend DailyRoute controller. Please verify that the backend service is running.',
        confirmButtonColor: '#dc2626',
      })
    } finally {
      setPreviewLoading(false)
      setRowActionId(null)
    }
  }

  // ─── Action: Download Backend PDF (Streamed from DailyRouteController) ────
  const handleDownloadBackendPdf = async (customItem = null) => {
    if (!selectedDate && !customItem) {
      Swal.fire({
        icon: 'warning',
        title: 'Date Required',
        text: 'Please select a date to download the official backend PDF receipt.',
        confirmButtonColor: '#f59e0b',
      })
      return
    }

    const vehNumber = customItem ? customItem.vehicleNumber : selectedVehicle?.value || 'ALL'
    const routeId = customItem ? customItem.id || customItem.raw?.id : null
    const dateVal = customItem ? customItem.date || selectedDate : selectedDate

    const fileName = customItem
      ? `Material_Grid_Receipt_${customItem.vehicleNumber}_Bill_${customItem.billNumber || customItem.id}.pdf`
      : `Material_Grid_Receipt_${vehNumber !== 'ALL' ? vehNumber : 'All_Vehicles'}_${dateVal}.pdf`

    setDownloadLoading(true)
    if (customItem) setRowActionId(customItem.id)

    try {
      await dailyRouteService.downloadReceiptPdf({
        date: dateVal,
        vehicleNumber: vehNumber,
        routeId,
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
          'Unable to download receipt PDF from backend DailyRoute controller. Please check server logs.',
        confirmButtonColor: '#dc2626',
      })
    } finally {
      setDownloadLoading(false)
      setRowActionId(null)
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

  // ─── Preset Quick Date Setter ─────────────────────────────────────────────
  const setQuickDate = (type) => {
    setCurrentPage(1)
    const today = new Date()
    if (type === 'today') {
      setSelectedDate(today.toISOString().split('T')[0])
    } else if (type === 'yesterday') {
      const y = new Date(today)
      y.setDate(y.getDate() - 1)
      setSelectedDate(y.toISOString().split('T')[0])
    } else if (type === 'sample') {
      setSelectedDate('2026-08-07')
    } else if (type === 'all') {
      setSelectedDate('')
    }
  }

  const handleDateChange = (val) => {
    setSelectedDate(val)
    setCurrentPage(1)
  }

  const handleVehicleChange = (opt) => {
    setSelectedVehicle(opt || DEFAULT_VEHICLE_OPTION)
    setCurrentPage(1)
  }

  const handleSearchChange = (val) => {
    setTableSearch(val)
    setCurrentPage(1)
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
                setSelectedDate('2026-08-07')
                setSelectedVehicle(DEFAULT_VEHICLE_OPTION)
                setTableSearch('')
                setCurrentPage(1)
              }}
            >
              Reset Filters
            </button>
          </div>
        </CCardHeader>

        <CCardBody className="rc-card-body">
          <CRow className="g-3">
            {/* Date Input with Quick Selectors */}
            <CCol xs={12} md={6} lg={4}>
              <div className="d-flex justify-content-between align-items-center mb-1">
                <CFormLabel className="rc-label mb-0">
                  <CIcon icon={cilCalendar} size="sm" className="text-warning" />
                  Statement Date
                </CFormLabel>
                <div className="rc-quick-dates">
                  <button
                    type="button"
                    className={`rc-quick-btn ${selectedDate === '2026-08-07' ? 'active' : ''}`}
                    onClick={() => setQuickDate('today')}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    className="rc-quick-btn"
                    onClick={() => setQuickDate('yesterday')}
                  >
                    Yesterday
                  </button>
                  <button
                    type="button"
                    className={`rc-quick-btn ${!selectedDate ? 'active' : ''}`}
                    onClick={() => setQuickDate('all')}
                  >
                    All
                  </button>
                </div>
              </div>
              <CFormInput
                type="date"
                className="rc-input"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
              />
            </CCol>

            {/* Searchable Vehicle Dropdown (Shows at least 5+ vehicles when typing) */}
            <CCol xs={12} md={6} lg={4}>
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
                placeholder="Type to search vehicle # (e.g. LC, 4838), driver, type…"
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

            {/* Table Quick Search Filter */}
            {/* <CCol xs={12} md={12} lg={4}>
              <CFormLabel className="rc-label">
                <CIcon icon={cilSearch} size="sm" className="text-warning" />
                Quick Search Within Records
              </CFormLabel>
              <div className="rc-search-input-wrapper">
                <CIcon icon={cilSearch} className="rc-search-icon" />
                <CFormInput
                  type="text"
                  className="rc-input rc-input-search"
                  placeholder="Filter by bill #, driver, location, land…"
                  value={tableSearch}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
                {tableSearch && (
                  <button
                    type="button"
                    className="rc-search-clear"
                    onClick={() => handleSearchChange('')}
                  >
                    ×
                  </button>
                )}
              </div>
            </CCol> */}
          </CRow>

          {/* Action Bar with Backend PDF Preview & Download */}
          <div className="rc-action-bar mt-3 pt-3 border-top d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div className="rc-selection-indicator">
              <span className="rc-selection-badge">
                Selected:{' '}
                <strong>
                  {selectedVehicle?.value === 'ALL'
                    ? 'All Vehicles (Consolidated)'
                    : selectedVehicle?.value}
                </strong>
                {selectedDate ? ` • ${selectedDate}` : ' • All Dates'}
              </span>
              <span className="text-muted ms-2" style={{ fontSize: '0.8rem' }}>
                ({filteredRecords.length} matching dispatches found)
              </span>
            </div>

            <div className="d-flex align-items-center gap-2 flex-wrap">
              {/* Option 1: Preview Backend PDF Receipt */}
              <button
                className="rc-btn-preview"
                onClick={() => handlePreviewBackendPdf()}
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
                onClick={() => handleDownloadBackendPdf()}
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
      <div className="rc-kpi-grid">
        {/* Total Trips */}
        <div className="rc-kpi-card rc-kpi-card--blue">
          <div className="d-flex justify-content-between align-items-start">
            <div>
              <div className="rc-kpi-label">Total Dispatches</div>
              <div className="rc-kpi-value">{totalTrips}</div>
              <div className="rc-kpi-sub">Trips recorded</div>
            </div>
            <div className="rc-kpi-icon-pill rc-kpi-icon-pill--blue">
              <CIcon icon={cilTruck} />
            </div>
          </div>
        </div>

        {/* Total Cubes */}
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

        {/* Gross Transport Revenue */}
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

        {/* Daily Expenses Deductions */}
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

        {/* Net Settlement Total */}
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
      </div>

      {/* ── Transactions & Trips Data Table ── */}
      <CCard className="rc-card">
        <CCardHeader className="rc-card-header">
          <div className="rc-card-title">
            <CIcon icon={cilDescription} className="text-warning" />
            <span>Transport Trips & Dispatches Dataset</span>
            <CBadge color="secondary" className="ms-2 rc-badge-count">
              {filteredRecords.length} records
            </CBadge>
          </div>

          <div className="d-flex align-items-center gap-2">
            <span className="text-muted" style={{ fontSize: '0.8rem' }}>
              Showing {filteredRecords.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}–
              {Math.min(currentPage * PAGE_SIZE, filteredRecords.length)} of{' '}
              {filteredRecords.length}
            </span>
          </div>
        </CCardHeader>

        <CCardBody className="p-0">
          {loading ? (
            <div className="text-center py-5">
              <CSpinner color="warning" />
              <p className="text-muted mt-2 mb-0" style={{ fontSize: '0.875rem' }}>
                Fetching live dispatches from DailyRoute controller…
              </p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-5 px-3">
              <div className="rc-empty-icon mb-3">
                <CIcon icon={cilDescription} size="xxl" className="text-muted" />
              </div>
              <h5 className="text-muted mb-1">No Daily Routes Found</h5>
              <p className="text-muted mb-3" style={{ fontSize: '0.85rem' }}>
                No transport trips matching the selected date (
                <strong>{selectedDate || 'All'}</strong>) and vehicle (
                <strong>{selectedVehicle?.label}</strong>).
              </p>
              <button
                className="rc-btn-reset"
                onClick={() => {
                  setSelectedDate('')
                  setSelectedVehicle(DEFAULT_VEHICLE_OPTION)
                  setTableSearch('')
                  setCurrentPage(1)
                }}
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <div className="rc-table-container">
              <table className="rc-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                    <th>Date</th>
                    <th>Bill / Voucher #</th>
                    <th>Vehicle</th>
                    <th>Driver</th>
                    <th>Source Land</th>
                    <th>Delivery Location</th>
                    <th style={{ textAlign: 'center' }}>Cube (m³)</th>
                    <th style={{ textAlign: 'center' }}>KM</th>
                    <th style={{ textAlign: 'right' }}>Gross Rate (Rs.)</th>
                    <th style={{ textAlign: 'right' }}>Deduction (Rs.)</th>
                    <th style={{ textAlign: 'right' }}>Net Payable (Rs.)</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                    <th style={{ textAlign: 'center', width: '110px' }}>Backend PDF</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRecords.map((item, index) => {
                    const rowIdx = (currentPage - 1) * PAGE_SIZE + index + 1
                    const isRowBusy = rowActionId === item.id

                    return (
                      <tr key={item.id || index}>
                        <td style={{ textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
                          {rowIdx}
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-1">
                            <CIcon icon={cilCalendar} size="sm" className="text-muted" />
                            <span style={{ fontWeight: 600 }}>{item.date}</span>
                          </div>
                        </td>
                        <td>
                          <span className="rc-badge rc-badge--voucher">{item.billNumber}</span>
                        </td>
                        <td>
                          <span className="rc-badge rc-badge--vehicle">{item.vehicleNumber}</span>
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-1">
                            <CIcon icon={cilUser} size="sm" className="text-muted" />
                            <span>{item.driver}</span>
                          </div>
                        </td>
                        <td>
                          <span className="text-muted">{item.land}</span>
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-1">
                            <CIcon icon={cilLocationPin} size="sm" className="text-warning" />
                            <span>{item.deliveryLocation}</span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 700 }}>
                          {item.cube > 0 ? item.cube.toFixed(1) : '-'}
                        </td>
                        <td style={{ textAlign: 'center', color: '#64748b' }}>
                          {item.km > 0 ? `${item.km} km` : '-'}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                          {formatLKR(item.transportRate)}
                        </td>
                        <td
                          style={{
                            textAlign: 'right',
                            color: item.dailyExpense > 0 ? '#dc2626' : '#64748b',
                            fontWeight: 600,
                          }}
                        >
                          {item.dailyExpense > 0 ? `- ${formatLKR(item.dailyExpense)}` : '0.00'}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                          {formatLKR(item.payableAmount)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span
                            className={`rc-badge ${
                              item.status === 'Paid' ? 'rc-badge--paid' : 'rc-badge--pending'
                            }`}
                          >
                            {item.status || 'Paid'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div className="d-flex align-items-center justify-content-center gap-1">
                            <button
                              type="button"
                              className="rc-mini-btn rc-mini-btn--view"
                              title="Preview backend PDF for this trip"
                              onClick={() => handlePreviewBackendPdf(item)}
                              disabled={isRowBusy || previewLoading || downloadLoading}
                            >
                              {isRowBusy && previewLoading ? (
                                <CSpinner size="sm" />
                              ) : (
                                <CIcon icon={cilFindInPage} />
                              )}
                            </button>
                            <button
                              type="button"
                              className="rc-mini-btn rc-mini-btn--download"
                              title="Download backend PDF for this trip"
                              onClick={() => handleDownloadBackendPdf(item)}
                              disabled={isRowBusy || previewLoading || downloadLoading}
                            >
                              {isRowBusy && downloadLoading ? (
                                <CSpinner size="sm" />
                              ) : (
                                <CIcon icon={cilCloudDownload} />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>

                {/* Cumulative Totals Footer Row */}
                <tfoot>
                  <tr className="rc-table-summary-row">
                    <td colSpan="7" style={{ textAlign: 'right', fontWeight: 800 }}>
                      Filtered Statement Totals ({filteredRecords.length} Dispatches):
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 800 }}>
                      {totalCubes.toFixed(1)}
                    </td>
                    <td></td>
                    <td style={{ textAlign: 'right', fontWeight: 800 }}>
                      Rs. {formatLKR(totalGrossRate)}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: '#dc2626' }}>
                      - Rs. {formatLKR(totalDailyExpense)}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: '#059669' }}>
                      Rs. {formatLKR(totalNetPayable)}
                    </td>
                    <td colSpan="2"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Table Pagination */}
          {filteredRecords.length > PAGE_SIZE && (
            <div className="rc-pagination-wrapper d-flex align-items-center justify-content-between p-3 border-top">
              <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> (
                {filteredRecords.length} total records)
              </span>

              <div className="d-flex align-items-center gap-1">
                <button
                  className="rc-page-btn"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                >
                  <CIcon icon={cilChevronLeft} /> Prev
                </button>

                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    className={`rc-page-btn ${currentPage === pageNum ? 'active' : ''}`}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                ))}

                <button
                  className="rc-page-btn"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                >
                  Next <CIcon icon={cilChevronRight} />
                </button>
              </div>
            </div>
          )}
        </CCardBody>
      </CCard>

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
              <CIcon icon={cilCalendar} size="sm" /> {previewMeta?.date || 'Selected Period'}
            </span>
            <span className="rc-modal-pill rc-modal-pill--amber">
              {previewMeta?.count} Trip{previewMeta?.count !== 1 ? 's' : ''}
            </span>
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
            Net Payable Settlement:{' '}
            <strong className="text-success" style={{ fontSize: '1rem' }}>
              Rs. {formatLKR(previewMeta?.payable)}
            </strong>
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
              onClick={() => {
                handleDownloadBackendPdf(
                  previewMeta?.routeId
                    ? {
                        id: previewMeta.routeId,
                        vehicleNumber: previewMeta.vehNumber,
                        date: previewMeta.date,
                      }
                    : null,
                )
              }}
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
