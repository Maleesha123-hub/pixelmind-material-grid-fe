/**
 * Daily Routes Management Page
 *
 * Provides comprehensive management for Daily Routes:
 * - Paginated list (15 per page)
 * - Multi-criteria search & filtering:
 *     - Daily route date
 *     - Daily route created date
 *     - Bill number
 *     - Vehicle (Searchable dropdown)
 *     - Route (Searchable dropdown)
 *     - Uploaded Excel file / source (Searchable dropdown)
 * - Actions: Add, Edit, and Delete with SweetAlert2 confirmation
 * - Instant metrics overview
 * - Dark & Light mode integration
 *
 * @module DailyRoutes
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Swal from 'sweetalert2'
import Select, { components } from 'react-select'
import CIcon from '@coreui/icons-react'
import {
  CRow,
  CCol,
  CCard,
  CCardBody,
  CCardHeader,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CSpinner,
  useColorModes,
} from '@coreui/react'
import {
  cilTruck,
  cilPencil,
  cilTrash,
  cilPlus,
  cilReload,
  cilSearch,
  cilFilter,
  cilCalendar,
  cilDescription,
  cilFile,
  cilLocationPin,
  cilChevronLeft,
  cilChevronRight,
  cilCheckCircle,
  cilX,
} from '@coreui/icons'
import dailyRouteService from '../../../service/dailyRouteService'
import vehicleService from '../../../service/vehicleService'
import routeService from '../../../service/routeService'
import fileHistoryService from '../../../service/fileHistoryService'
import './DailyRoutes.css'

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 15

const EMPTY_FORM = {
  date: new Date().toISOString().split('T')[0],
  vehicleId: '',
  vehicleNumber: '',
  routeId: '',
  routeCode: '',
  billNumber: '',
}

const ALL_OPTION = { value: '', label: 'All' }

// ─── React-Select Styling Helper ──────────────────────────────────────────────
const getSelectStyles = (isDark) => ({
  control: (base, state) => ({
    ...base,
    minHeight: '42px',
    borderRadius: '8px',
    borderColor: state.isFocused ? '#f59e0b' : isDark ? '#334155' : '#cbd5e1',
    boxShadow: state.isFocused ? '0 0 0 3px rgba(245,158,11,0.2)' : 'none',
    fontSize: '0.875rem',
    backgroundColor: isDark ? '#0f172a' : '#ffffff',
    color: isDark ? '#f8fafc' : '#0f172a',
    cursor: 'pointer',
    '&:hover': { borderColor: '#f59e0b' },
  }),
  menuPortal: (base) => ({ ...base, zIndex: 99999 }),
  menu: (base) => ({
    ...base,
    borderRadius: '10px',
    minWidth: '100%',
    width: 'max-content',
    maxWidth: '560px',
    zIndex: 99999,
    boxShadow: isDark ? '0 16px 36px rgba(0, 0, 0, 0.65)' : '0 12px 28px rgba(15, 23, 42, 0.14)',
    backgroundColor: isDark ? '#0f172a' : '#ffffff',
    border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
    overflow: 'hidden',
  }),
  menuList: (base) => ({
    ...base,
    maxHeight: '250px',
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
    fontSize: '0.84rem',
    cursor: 'pointer',
    borderRadius: '6px',
    padding: '7px 12px',
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
    fontSize: '0.84rem',
  }),
  valueContainer: (base) => ({
    ...base,
    padding: '2px 8px',
  }),
  singleValue: (base) => ({
    ...base,
    color: isDark ? '#f8fafc' : '#0f172a',
    fontSize: '0.85rem',
    fontWeight: 600,
    maxWidth: 'calc(100% - 10px)',
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

// ─── Debounce Hook ────────────────────────────────────────────────────────────
function useDebounce(value, delay = 350) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

// ─── Date Formatter Helper ────────────────────────────────────────────────────
const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

const formatDateTime = (dateStr) => {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

const formatCurrency = (val) => {
  if (val === null || val === undefined || val === '') return '—'
  const num = Number(val)
  if (isNaN(num)) return val
  return `Rs. ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// ─── Format Vehicle Object into Standard Select Option with vehicleId ─────
const formatVehicleOption = (v) => {
  if (!v) return null
  const rawId = v.id ?? v.vehicleId ?? null
  const num =
    v.vehicleNumber ||
    v.number ||
    v.vehicleNo ||
    v.registrationNumber ||
    (rawId ? `Vehicle #${rawId}` : '')
  const cap = v.capacity ? `${v.capacity}m³` : ''
  const driver = v.driverName || v.driver || ''

  return {
    value: rawId ? String(rawId) : num,
    id: rawId,
    vehicleId: rawId,
    vehicleNumber: num,
    label: num || `Vehicle #${rawId}`,
    capacity: v.capacity,
    driverName: driver,
    raw: v,
  }
}

// ─── Custom Vehicle Option Component for Dropdown ──────────────────────────
const CustomVehicleOption = (props) => {
  const { data, innerRef, innerProps, isSelected, isFocused } = props
  return (
    <div
      ref={innerRef}
      {...innerProps}
      className={`dr-select-option ${isSelected ? 'is-selected' : isFocused ? 'is-focused' : ''}`}
    >
      <div className="d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center gap-2">
          <span className="dr-veh-pill" style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem' }}>
            <CIcon icon={cilTruck} size="sm" style={{ color: '#d97706' }} />
            {data.vehicleNumber || data.label}
          </span>
          {data.capacity && (
            <span style={{ fontSize: '0.76rem', color: '#64748b' }}>({data.capacity}m³)</span>
          )}
        </div>
        {data.driverName && (
          <span style={{ fontSize: '0.76rem', color: '#94a3b8' }}>{data.driverName}</span>
        )}
      </div>
    </div>
  )
}

// ─── Format Uploaded Excel Object into Select Option ───────────────────────
const formatExcelOption = (e) => {
  if (!e) return null
  const rawId = e.id ?? e.fileHistoryId ?? null
  const name = typeof e === 'string' ? e : e.fileName || e.name || (rawId ? `Batch #${rawId}` : '')
  const uploadDate =
    e.uploadedDate || e.createdAt ? formatDateTime(e.uploadedDate || e.createdAt) : ''
  const uploader = e.uploadedBy || ''

  return {
    value: rawId ? String(rawId) : name,
    id: rawId,
    fileHistoryId: rawId,
    fileName: name,
    label: name,
    uploadedDate: uploadDate,
    uploadedBy: uploader,
    raw: e,
  }
}

// ─── Custom Excel Single Value (what displays in the input box when selected)
const CustomExcelSingleValue = (props) => {
  return (
    <components.SingleValue {...props}>
      <span
        className="d-inline-flex align-items-center gap-1"
        style={{ maxWidth: '100%', overflow: 'hidden' }}
      >
        <CIcon icon={cilFile} size="sm" style={{ color: '#0284c7', flexShrink: 0 }} />
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontWeight: 600,
            fontSize: '0.84rem',
          }}
        >
          {props.data.fileName || props.data.label}
        </span>
      </span>
    </components.SingleValue>
  )
}

// ─── Custom Excel Option Component for Dropdown List ───────────────────────
const CustomExcelOption = (props) => {
  const { data, innerRef, innerProps, isSelected, isFocused } = props
  return (
    <div
      ref={innerRef}
      {...innerProps}
      className={`dr-select-option ${isSelected ? 'is-selected' : isFocused ? 'is-focused' : ''}`}
      style={{ padding: '8px 12px' }}
    >
      <div className="d-flex align-items-center justify-content-between gap-3">
        <div className="d-flex align-items-center gap-2" style={{ minWidth: 0, flex: 1 }}>
          <CIcon
            icon={cilFile}
            size="sm"
            style={{ color: isSelected ? '#ffffff' : '#0284c7', flexShrink: 0 }}
          />
          <span
            style={{
              fontSize: '0.84rem',
              fontWeight: 600,
              color: isSelected ? '#ffffff' : 'inherit',
              whiteSpace: 'normal',
              wordBreak: 'break-all',
            }}
          >
            {data.fileName || data.label}
          </span>
        </div>
        {data.uploadedDate && (
          <span
            style={{
              fontSize: '0.73rem',
              color: isSelected ? 'rgba(255,255,255,0.85)' : '#94a3b8',
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            {data.uploadedDate}
          </span>
        )}
      </div>
    </div>
  )
}

const DailyRoutes = () => {
  // ─── Color Mode (Theme Detection) ───────────────────────────────────────────
  const { colorMode } = useColorModes('coreui-free-react-admin-template-theme')
  const selectStyles = useMemo(() => getSelectStyles(colorMode === 'dark'), [colorMode])

  // ─── Filter States ──────────────────────────────────────────────────────────
  const [dateFilter, setDateFilter] = useState('')
  const [createdDateFilter, setCreatedDateFilter] = useState('')
  const [billNumberFilter, setBillNumberFilter] = useState('')
  const [selectedVehicle, setSelectedVehicle] = useState(null)
  const [selectedRoute, setSelectedRoute] = useState(null)
  const [selectedExcel, setSelectedExcel] = useState(null)

  // ─── Dropdown Options ───────────────────────────────────────────────────────
  const [vehicleOptions, setVehicleOptions] = useState([])
  const [routeOptions, setRouteOptions] = useState([])
  const [excelOptions, setExcelOptions] = useState([])
  const [optionsLoading, setOptionsLoading] = useState(false)

  // ─── Table Data & Pagination ────────────────────────────────────────────────
  const [routesList, setRoutesList] = useState([])
  const [totalElements, setTotalElements] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [currentPage, setCurrentPage] = useState(0)
  const [loading, setLoading] = useState(false)

  // ─── Modal / Form States ────────────────────────────────────────────────────
  const [modalVisible, setModalVisible] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formVehicle, setFormVehicle] = useState(null)
  const [formRoute, setFormRoute] = useState(null)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const debouncedBill = useDebounce(billNumberFilter, 350)
  const abortRef = useRef(null)
  const allExcelOptionsRef = useRef([])
  const excelSearchTimerRef = useRef(null)

  // ─── Live Vehicle Search API Binder ─────────────────────────────────────────
  const handleVehicleSearch = useCallback(async (inputValue) => {
    try {
      const data = await vehicleService.searchVehicles(inputValue || '')
      if (Array.isArray(data)) {
        const formatted = data.map(formatVehicleOption).filter(Boolean)
        setVehicleOptions(formatted)
      }
    } catch (err) {
      console.warn('Vehicle search error:', err)
    }
  }, [])

  const onVehicleInputChange = (inputValue, { action }) => {
    if (action === 'input-change') {
      handleVehicleSearch(inputValue)
    }
  }

  // ─── Live Uploaded Excel Search API Binder (by-file-type?fileType=DAILY_ROUTE)
  const handleExcelSearch = useCallback((inputValue) => {
    if (excelSearchTimerRef.current) clearTimeout(excelSearchTimerRef.current)

    const query = inputValue ? inputValue.trim() : ''

    if (!query) {
      if (allExcelOptionsRef.current.length > 0) {
        setExcelOptions(allExcelOptionsRef.current)
      }
      return
    }

    excelSearchTimerRef.current = setTimeout(async () => {
      try {
        const data = await fileHistoryService.getFilesByFileType('DAILY_ROUTE', query)
        if (Array.isArray(data) && data.length > 0) {
          const formatted = data.map(formatExcelOption).filter(Boolean)
          setExcelOptions(formatted)
        } else {
          const filtered = allExcelOptionsRef.current.filter(
            (opt) =>
              opt.label.toLowerCase().includes(query.toLowerCase()) ||
              (opt.fileName && opt.fileName.toLowerCase().includes(query.toLowerCase())),
          )
          setExcelOptions(filtered)
        }
      } catch (err) {
        console.warn('Excel search error:', err)
        const filtered = allExcelOptionsRef.current.filter(
          (opt) =>
            opt.label.toLowerCase().includes(query.toLowerCase()) ||
            (opt.fileName && opt.fileName.toLowerCase().includes(query.toLowerCase())),
        )
        setExcelOptions(filtered)
      }
    }, 300)
  }, [])

  const onExcelInputChange = (inputValue, { action }) => {
    if (action === 'input-change') {
      handleExcelSearch(inputValue)
    }
  }

  // ─── Load Filter Options (Vehicles, Routes, Uploaded Excel sheets) ───────────
  const loadFilterOptions = useCallback(async () => {
    setOptionsLoading(true)
    try {
      const [vehiclesRes, routesRes, uploadsRes] = await Promise.allSettled([
        vehicleService.getAllVehicles(),
        routeService.getAllRoutes(),
        fileHistoryService.getFilesByFileType('DAILY_ROUTE', ''),
      ])

      if (vehiclesRes.status === 'fulfilled' && Array.isArray(vehiclesRes.value)) {
        const vOpts = vehiclesRes.value.map(formatVehicleOption).filter(Boolean)
        setVehicleOptions(vOpts)
      }

      if (routesRes.status === 'fulfilled' && Array.isArray(routesRes.value)) {
        const rOpts = routesRes.value.map((r) => ({
          value: r.id ?? r.routeId,
          label: `${r.routeCode || r.code || `Route #${r.id}`} — ${r.startLocation || ''} ➔ ${r.endLocation || ''}`,
          routeCode: r.routeCode || r.code || '',
          raw: r,
        }))
        setRouteOptions(rOpts)
      }

      if (uploadsRes.status === 'fulfilled' && Array.isArray(uploadsRes.value)) {
        const eOpts = uploadsRes.value.map(formatExcelOption).filter(Boolean)
        allExcelOptionsRef.current = eOpts
        setExcelOptions(eOpts)
      }
    } catch (err) {
      console.warn('Error loading filter options:', err)
    } finally {
      setOptionsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFilterOptions()
  }, [loadFilterOptions])

  // ─── Load Daily Routes from Backend with Filters ────────────────────────────
  const loadDailyRoutes = useCallback(
    async (page = 0) => {
      if (abortRef.current) abortRef.current.abort()
      abortRef.current = new AbortController()

      setLoading(true)
      try {
        const params = {
          page,
          size: PAGE_SIZE,
          sort: 'id,desc',
          date: dateFilter || undefined,
          createdDate: createdDateFilter || undefined,
          billNumber: debouncedBill ? debouncedBill.trim() : undefined,
          vehicleId: selectedVehicle?.value || undefined,
          routeId: selectedRoute?.value || undefined,
          fileHistoryId: selectedExcel?.id ?? selectedExcel?.fileHistoryId ?? undefined,
          fileName: selectedExcel?.fileName || undefined,
          uploadedExcel: selectedExcel?.fileName || selectedExcel?.value || undefined,
        }

        const result = await dailyRouteService.getDailyRoutes(params, abortRef.current.signal)

        const content =
          result?.content || result?.items || (Array.isArray(result) ? result : result?.data || [])

        setRoutesList(Array.isArray(content) ? content : [])
        setTotalElements(result?.totalElements ?? result?.total ?? content.length)
        setTotalPages(
          result?.totalPages ??
            Math.max(1, Math.ceil((result?.totalElements ?? content.length) / PAGE_SIZE)),
        )
        setCurrentPage(result?.number ?? page)
      } catch (err) {
        if (err.name === 'AbortError') return
        console.warn('Daily routes fetch warning:', err)
        setRoutesList([])
        setTotalElements(0)
        setTotalPages(1)
      } finally {
        setLoading(false)
      }
    },
    [dateFilter, createdDateFilter, debouncedBill, selectedVehicle, selectedRoute, selectedExcel],
  )

  useEffect(() => {
    loadDailyRoutes(0)
    setCurrentPage(0)
  }, [loadDailyRoutes])

  // ─── Pagination Control ─────────────────────────────────────────────────────
  const goToPage = (p) => {
    if (p < 0 || p >= totalPages) return
    loadDailyRoutes(p)
    setCurrentPage(p)
  }

  // ─── Reset All Filters ──────────────────────────────────────────────────────
  const handleResetFilters = () => {
    setDateFilter('')
    setCreatedDateFilter('')
    setBillNumberFilter('')
    setSelectedVehicle(null)
    setSelectedRoute(null)
    setSelectedExcel(null)
  }

  // Active filters count for visual badge
  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (dateFilter) count++
    if (createdDateFilter) count++
    if (billNumberFilter.trim()) count++
    if (selectedVehicle) count++
    if (selectedRoute) count++
    if (selectedExcel) count++
    return count
  }, [
    dateFilter,
    createdDateFilter,
    billNumberFilter,
    selectedVehicle,
    selectedRoute,
    selectedExcel,
  ])

  // ─── Modal Form Controls ────────────────────────────────────────────────────
  const setFormField = (key, val) => {
    setForm((p) => ({ ...p, [key]: val }))
    if (errors[key]) setErrors((p) => ({ ...p, [key]: '' }))
  }

  const validateForm = () => {
    const e = {}
    if (!form.date) e.date = 'Daily route date is required'
    if (!form.billNumber.trim()) e.billNumber = 'Bill number is required'
    if (!form.vehicleId && !form.vehicleNumber) e.vehicleId = 'Please select or enter a vehicle'
    if (!editMode && !form.routeId && !form.routeCode) {
      e.routeId = 'Please select or enter a route'
    }

    setErrors(e)
    return Object.keys(e).length === 0
  }

  const openAddModal = () => {
    setEditMode(false)
    setSelectedId(null)
    setForm(EMPTY_FORM)
    setFormVehicle(null)
    setFormRoute(null)
    setErrors({})
    setModalVisible(true)
  }

  const openEditModal = (route) => {
    setEditMode(true)
    setSelectedId(route.id)

    const routeVehId = route.vehicle?.id ?? route.vehicleId ?? ''
    const routeVehNum = route.vehicle?.vehicleNumber ?? route.vehicleNumber ?? ''
    const routeBillNo = route.bilNumber ?? route.billNumber ?? ''

    const vehMatch = vehicleOptions.find(
      (v) =>
        (routeVehId && (v.value === routeVehId || v.id === routeVehId)) ||
        (routeVehNum && (v.raw?.vehicleNumber === routeVehNum || v.label.includes(routeVehNum))),
    ) || {
      value: routeVehId,
      label: routeVehNum || (routeVehId ? `Vehicle #${routeVehId}` : ''),
    }

    setForm({
      date: route.date ? route.date.split('T')[0] : '',
      vehicleId: vehMatch.value,
      vehicleNumber: routeVehNum || vehMatch.label,
      billNumber: routeBillNo,
    })
    setFormVehicle(vehMatch)
    setFormRoute(null)
    setErrors({})
    setModalVisible(true)
  }

  // ─── Save Handler (Create / Update) ─────────────────────────────────────────
  const handleSave = async () => {
    if (!validateForm()) return
    setSaving(true)

    const payload = {
      date: form.date,
      billNumber: form.billNumber.trim(),
      bilNumber: form.billNumber.trim(),
      vehicleId: form.vehicleId || undefined,
      vehicleNumber: form.vehicleNumber || undefined,
      ...(!editMode
        ? {
            routeId: form.routeId || undefined,
            routeCode: form.routeCode || undefined,
          }
        : {}),
    }

    try {
      if (editMode) {
        await dailyRouteService.updateDailyRoute(selectedId, payload)
        Swal.fire({
          icon: 'success',
          title: 'Route Updated',
          text: `Daily route #${form.billNumber} has been updated successfully.`,
          confirmButtonColor: '#d97706',
          timer: 2200,
          timerProgressBar: true,
        })
      } else {
        await dailyRouteService.createDailyRoute(payload)
        Swal.fire({
          icon: 'success',
          title: 'Route Added',
          text: `Daily route #${form.billNumber} has been recorded successfully.`,
          confirmButtonColor: '#d97706',
          timer: 2200,
          timerProgressBar: true,
        })
      }
      setModalVisible(false)
      loadDailyRoutes(editMode ? currentPage : 0)
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Save Failed',
        text: err.message || 'Could not save daily route. Please verify the submitted information.',
        confirmButtonColor: '#dc2626',
      })
    } finally {
      setSaving(false)
    }
  }

  // ─── Delete Handler ─────────────────────────────────────────────────────────
  const handleDelete = async (route) => {
    const billNo = route.bilNumber || route.billNumber
    const routeIdentifier = billNo ? `Bill #${billNo}` : `Route #${route.id}`
    const res = await Swal.fire({
      title: `Delete ${routeIdentifier}?`,
      text: 'Are you sure you want to delete this daily route entry? This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      reverseButtons: true,
    })

    if (!res.isConfirmed) return

    try {
      await dailyRouteService.deleteDailyRoute(route.id)
      Swal.fire({
        icon: 'success',
        title: 'Route Deleted',
        text: `${routeIdentifier} has been deleted successfully.`,
        confirmButtonColor: '#d97706',
        timer: 2000,
        timerProgressBar: true,
      })
      loadDailyRoutes(currentPage)
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Delete Failed',
        text: err.message || 'Could not delete daily route.',
        confirmButtonColor: '#dc2626',
      })
    }
  }

  return (
    <div className="dr-page">
      {/* ── Page Header ── */}
      <div className="dr-page-header">
        <div className="dr-header-left">
          <div className="dr-header-icon">
            <CIcon icon={cilTruck} size="xl" />
          </div>
          <div>
            <h1 className="dr-page-title">Daily Routes Management</h1>
            <p className="dr-page-subtitle">
              View, filter, edit, and manage all logged dispatch routes and material trips
            </p>
          </div>
        </div>

        <div className="dr-header-actions">
          <button className="dr-btn-add" onClick={openAddModal} id="btn-add-daily-route">
            <CIcon icon={cilPlus} />
            <span>Add Daily Route</span>
          </button>
        </div>
      </div>

      {/* ── Filter Card ── */}
      <CCard className="dr-card">
        <CCardHeader className="dr-card-header">
          <div className="dr-card-title">
            <CIcon icon={cilFilter} className="text-warning" />
            <span>Filter Daily Routes</span>
            {activeFiltersCount > 0 && (
              <span className="badge bg-warning text-dark ms-2">{activeFiltersCount} Active</span>
            )}
          </div>
          {activeFiltersCount > 0 && (
            <button className="dr-btn-reset" onClick={handleResetFilters} id="btn-reset-filters">
              <CIcon icon={cilReload} size="sm" />
              <span>Reset Filters</span>
            </button>
          )}
        </CCardHeader>

        <CCardBody className="dr-card-body">
          <div className="dr-filter-grid">
            {/* 1. Daily Route Date */}
            <div className="dr-filter-group">
              <label className="dr-label">
                <CIcon icon={cilCalendar} size="sm" /> Daily Route Date
              </label>
              <input
                type="date"
                className="dr-input"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                id="filter-daily-route-date"
              />
            </div>

            {/* 2. Created Date */}
            <div className="dr-filter-group">
              <label className="dr-label">
                <CIcon icon={cilCalendar} size="sm" /> Created Date
              </label>
              <input
                type="date"
                className="dr-input"
                value={createdDateFilter}
                onChange={(e) => setCreatedDateFilter(e.target.value)}
                id="filter-created-date"
              />
            </div>

            {/* 3. Bill Number */}
            <div className="dr-filter-group">
              <label className="dr-label">
                <CIcon icon={cilDescription} size="sm" /> Bill Number
              </label>
              <input
                type="text"
                className="dr-input"
                placeholder="e.g. 7901"
                value={billNumberFilter}
                onChange={(e) => setBillNumberFilter(e.target.value)}
                id="filter-bill-number"
              />
            </div>

            {/* 4. Vehicle (Searchable Dropdown) */}
            <div className="dr-filter-group">
              <label className="dr-label">
                <CIcon icon={cilTruck} size="sm" /> Vehicle
              </label>
              <Select
                isClearable
                isSearchable
                options={vehicleOptions}
                value={selectedVehicle}
                onChange={(opt) => setSelectedVehicle(opt)}
                onInputChange={onVehicleInputChange}
                components={{ Option: CustomVehicleOption }}
                placeholder="Search vehicle..."
                styles={selectStyles}
                menuPortalTarget={document.body}
                id="filter-vehicle-select"
                aria-label="Filter by vehicle"
              />
            </div>

            {/* 5. Route (Searchable Dropdown) */}
            <div className="dr-filter-group">
              <label className="dr-label">
                <CIcon icon={cilLocationPin} size="sm" /> Route
              </label>
              <Select
                isClearable
                isSearchable
                options={routeOptions}
                value={selectedRoute}
                onChange={(opt) => setSelectedRoute(opt)}
                placeholder="Search route code..."
                styles={selectStyles}
                menuPortalTarget={document.body}
                id="filter-route-select"
                aria-label="Filter by route"
              />
            </div>

            {/* 6. Uploaded Excel Sheet */}
            <div className="dr-filter-group dr-filter-group--wide">
              <label className="dr-label">
                <CIcon icon={cilFile} size="sm" /> Uploaded Excel
              </label>
              <Select
                isClearable
                isSearchable
                options={excelOptions}
                value={selectedExcel}
                onChange={(opt) => setSelectedExcel(opt)}
                onInputChange={onExcelInputChange}
                components={{ Option: CustomExcelOption, SingleValue: CustomExcelSingleValue }}
                placeholder="Search upload batch/file..."
                styles={selectStyles}
                menuPortalTarget={document.body}
                id="filter-excel-select"
                aria-label="Filter by uploaded excel"
                noOptionsMessage={() => 'No Excel files found'}
              />
            </div>
          </div>

          {/* Active Filter Badges */}
          {activeFiltersCount > 0 && (
            <div className="dr-active-filters-bar">
              <span className="dr-active-filters-title">Active Filters:</span>
              {dateFilter && (
                <span className="dr-filter-pill">
                  Date: {dateFilter}
                  <span className="dr-filter-pill-remove" onClick={() => setDateFilter('')}>
                    ×
                  </span>
                </span>
              )}
              {createdDateFilter && (
                <span className="dr-filter-pill">
                  Created: {createdDateFilter}
                  <span className="dr-filter-pill-remove" onClick={() => setCreatedDateFilter('')}>
                    ×
                  </span>
                </span>
              )}
              {billNumberFilter && (
                <span className="dr-filter-pill">
                  Bill: {billNumberFilter}
                  <span className="dr-filter-pill-remove" onClick={() => setBillNumberFilter('')}>
                    ×
                  </span>
                </span>
              )}
              {selectedVehicle && (
                <span className="dr-filter-pill">
                  Vehicle: {selectedVehicle.label}
                  <span className="dr-filter-pill-remove" onClick={() => setSelectedVehicle(null)}>
                    ×
                  </span>
                </span>
              )}
              {selectedRoute && (
                <span className="dr-filter-pill">
                  Route: {selectedRoute.label}
                  <span className="dr-filter-pill-remove" onClick={() => setSelectedRoute(null)}>
                    ×
                  </span>
                </span>
              )}
              {selectedExcel && (
                <span className="dr-filter-pill">
                  Excel: {selectedExcel.label}
                  <span className="dr-filter-pill-remove" onClick={() => setSelectedExcel(null)}>
                    ×
                  </span>
                </span>
              )}
            </div>
          )}
        </CCardBody>
      </CCard>

      {/* ── Table Card ── */}
      <CCard className="dr-card">
        <CCardHeader className="dr-card-header">
          <div className="dr-card-title">
            <CIcon icon={cilTruck} className="text-warning" />
            <span>Daily Routes Log ({totalElements} Records)</span>
          </div>
          <button
            className="dr-btn-reset"
            onClick={() => loadDailyRoutes(currentPage)}
            disabled={loading}
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
          >
            <CIcon icon={cilReload} size="sm" className={loading ? 'fa-spin' : ''} />
            <span>Refresh</span>
          </button>
        </CCardHeader>

        <CCardBody className="dr-card-body">
          {loading ? (
            <div className="text-center py-5">
              <CSpinner color="warning" />
              <p className="mt-2 text-muted" style={{ fontSize: '0.88rem' }}>
                Loading daily routes...
              </p>
            </div>
          ) : routesList.length === 0 ? (
            <div className="dr-empty-state">
              <div className="dr-empty-icon">
                <CIcon icon={cilTruck} size="xl" />
              </div>
              <h4 className="dr-empty-title">No Daily Routes Found</h4>
              <p className="dr-empty-sub">
                {activeFiltersCount > 0
                  ? 'No routes match your selected filter criteria. Try adjusting or resetting filters.'
                  : 'No daily routes have been recorded yet. Click "Add Daily Route" or use Bulk Excel Upload.'}
              </p>
              {activeFiltersCount > 0 && (
                <button className="dr-btn-add" onClick={handleResetFilters}>
                  <CIcon icon={cilReload} /> Reset Filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="dr-table-wrap">
                <table className="dr-table">
                  <thead>
                    <tr>
                      <th style={{ width: 44 }}>#</th>
                      <th style={{ minWidth: 120 }}>Date</th>
                      <th style={{ minWidth: 140 }}>Vehicle Number</th>
                      <th style={{ minWidth: 110 }}>Bill Number</th>
                      <th style={{ minWidth: 110 }}>Route</th>
                      <th className="dr-excel-col">Uploaded Excel / Source</th>
                      <th style={{ minWidth: 160 }}>Created Date</th>
                      <th style={{ minWidth: 110 }}>Amount</th>
                      <th style={{ width: 90, textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {routesList.map((item, idx) => {
                      const vehNumber =
                        item.vehicle?.vehicleNumber ||
                        item.vehicleNumber ||
                        (item.vehicle?.id
                          ? `Vehicle #${item.vehicle.id}`
                          : item.vehicleId
                            ? `Vehicle #${item.vehicleId}`
                            : '—')

                      const billNo = item.bilNumber || item.billNumber || '—'

                      const routeCode =
                        item.route?.routeCode ||
                        item.routeCode ||
                        (item.route?.id
                          ? `Route #${item.route.id}`
                          : item.routeId
                            ? `Route #${item.routeId}`
                            : '—')

                      const fileName =
                        item.fileHistory?.fileName ||
                        item.uploadedExcel ||
                        item.fileName ||
                        item.excelFileName

                      return (
                        <tr key={item.id ?? idx}>
                          <td className="dr-td-num">{currentPage * PAGE_SIZE + idx + 1}</td>
                          <td>
                            <span className="dr-date-text">
                              <CIcon icon={cilCalendar} size="sm" className="text-muted" />
                              {formatDate(item.date)}
                            </span>
                          </td>
                          <td>
                            <span className="dr-veh-pill">
                              <CIcon icon={cilTruck} size="sm" style={{ color: '#d97706' }} />
                              {vehNumber}
                            </span>
                          </td>
                          <td>
                            <span className="dr-bill-badge">{billNo}</span>
                          </td>
                          <td>
                            <span className="dr-code-badge">{routeCode}</span>
                          </td>
                          <td className="dr-excel-col">
                            {fileName ? (
                              <span className="dr-excel-badge" title={fileName}>
                                <CIcon icon={cilFile} size="sm" style={{ flexShrink: 0, marginTop: '2px' }} />
                                <span className="dr-excel-badge-text">{fileName}</span>
                              </span>
                            ) : (
                              <span className="dr-manual-badge">Manual Entry</span>
                            )}
                          </td>
                          <td>
                            <span className="dr-created-text">
                              {formatDateTime(item.createdDate || item.createdAt || item.date)}
                            </span>
                          </td>
                          <td>
                            <span className="dr-amount-text">
                              {formatCurrency(item.amount ?? item.totalAmount ?? item.tripAmount)}
                            </span>
                          </td>
                          <td>
                            <div className="dr-actions-cell justify-content-center">
                              <button
                                className="dr-btn-action edit"
                                title="Edit Route"
                                onClick={() => openEditModal(item)}
                                id={`btn-edit-route-${item.id ?? idx}`}
                              >
                                <CIcon icon={cilPencil} size="sm" />
                              </button>
                              <button
                                className="dr-btn-action delete"
                                title="Delete Route"
                                onClick={() => handleDelete(item)}
                                id={`btn-delete-route-${item.id ?? idx}`}
                              >
                                <CIcon icon={cilTrash} size="sm" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div className="dr-pagination-bar">
                <span>
                  Showing {totalElements === 0 ? 0 : currentPage * PAGE_SIZE + 1}–
                  {Math.min((currentPage + 1) * PAGE_SIZE, totalElements)} of{' '}
                  <strong>{totalElements}</strong> records
                </span>

                {totalPages > 1 && (
                  <div className="dr-page-controls">
                    <button
                      className="dr-page-btn"
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 0}
                    >
                      <CIcon icon={cilChevronLeft} size="sm" />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i)
                      .filter((p) => Math.abs(p - currentPage) <= 2)
                      .map((p) => (
                        <button
                          key={p}
                          className={`dr-page-btn ${p === currentPage ? 'active' : ''}`}
                          onClick={() => goToPage(p)}
                        >
                          {p + 1}
                        </button>
                      ))}
                    <button
                      className="dr-page-btn"
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage >= totalPages - 1}
                    >
                      <CIcon icon={cilChevronRight} size="sm" />
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </CCardBody>
      </CCard>

      {/* ── Add / Edit Modal ── */}
      <CModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        size="lg"
        backdrop="static"
      >
        <CModalHeader className="dr-card-header">
          <CModalTitle className="dr-card-title">
            <CIcon icon={editMode ? cilPencil : cilPlus} className="text-warning" />
            <span>{editMode ? 'Edit Daily Route Entry' : 'Add New Daily Route'}</span>
          </CModalTitle>
        </CModalHeader>

        <CModalBody className="p-4">
          <div className="dr-modal-grid">
            {/* Daily Route Date */}
            <div className="dr-filter-group mb-3">
              <label className="dr-label">
                Daily Route Date <span className="req">*</span>
              </label>
              <input
                type="date"
                className={`dr-input ${errors.date ? 'error' : ''}`}
                value={form.date}
                onChange={(e) => setFormField('date', e.target.value)}
              />
              {errors.date && <div className="dr-form-error">{errors.date}</div>}
            </div>

            {/* Bill Number */}
            <div className="dr-filter-group mb-3">
              <label className="dr-label">
                Bill Number <span className="req">*</span>
              </label>
              <input
                type="text"
                className={`dr-input ${errors.billNumber ? 'error' : ''}`}
                placeholder="e.g. 7901"
                value={form.billNumber}
                onChange={(e) => setFormField('billNumber', e.target.value)}
              />
              {errors.billNumber && <div className="dr-form-error">{errors.billNumber}</div>}
            </div>

            {/* Vehicle Selection */}
            <div className="dr-filter-group mb-3">
              <label className="dr-label">
                Vehicle <span className="req">*</span>
              </label>
              <Select
                isClearable
                isSearchable
                options={vehicleOptions}
                value={formVehicle}
                onChange={(opt) => {
                  setFormVehicle(opt)
                  setFormField('vehicleId', opt ? opt.value : '')
                  setFormField('vehicleNumber', opt ? opt.raw?.vehicleNumber || opt.label : '')
                }}
                onInputChange={onVehicleInputChange}
                components={{ Option: CustomVehicleOption }}
                placeholder="Select vehicle..."
                styles={selectStyles}
                menuPortalTarget={document.body}
              />
              {errors.vehicleId && <div className="dr-form-error">{errors.vehicleId}</div>}
            </div>

            {/* Route Selection (Add New Daily Route only) */}
            {!editMode && (
              <div className="dr-filter-group mb-3">
                <label className="dr-label">
                  Route Code <span className="req">*</span>
                </label>
                <Select
                  isClearable
                  isSearchable
                  options={routeOptions}
                  value={formRoute}
                  onChange={(opt) => {
                    setFormRoute(opt)
                    setFormField('routeId', opt ? opt.value : '')
                    setFormField('routeCode', opt ? opt.routeCode || opt.label : '')
                  }}
                  placeholder="Select route..."
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
                {errors.routeId && <div className="dr-form-error">{errors.routeId}</div>}
              </div>
            )}
          </div>
        </CModalBody>

        <CModalFooter>
          <button className="dr-btn-reset" onClick={() => setModalVisible(false)} disabled={saving}>
            Cancel
          </button>
          <button className="dr-btn-add" onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <CSpinner size="sm" style={{ marginRight: 6 }} /> Saving...
              </>
            ) : (
              <>
                <CIcon icon={cilCheckCircle} /> {editMode ? 'Update Route' : 'Save Route'}
              </>
            )}
          </button>
        </CModalFooter>
      </CModal>
    </div>
  )
}

export default DailyRoutes
