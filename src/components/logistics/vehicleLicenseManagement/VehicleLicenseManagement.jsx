/**
 * Vehicle License Management Component
 *
 * Provides a comprehensive, production-grade interface for managing
 * assigned vehicle licenses:
 * - Multi-criteria filters: License, Vehicle, Assigned Date, Created Date, Uploaded Excel
 * - Paginated table view (15 items/page) with user-friendly formatting:
 *     (#, License Code, Vehicle Number, License Assigned Date, Uploaded Excel / Source, Created Date, Amount, Actions)
 * - Add / Edit modal dialogues with live asynchronous React-Select controls
 * - Delete operations with SweetAlert2 confirmation
 * - Responsive UI matching Daily Routes & Daily Expenses design
 *
 * @module VehicleLicenseManagement
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Select, { components } from 'react-select'
import Swal from 'sweetalert2'
import CIcon from '@coreui/icons-react'
import {
  cilContact,
  cilPencil,
  cilSearch,
  cilPlus,
  cilReload,
  cilTrash,
  cilChevronLeft,
  cilChevronRight,
  cilFilter,
  cilCalendar,
  cilTruck,
  cilDescription,
  cilCheckCircle,
} from '@coreui/icons'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CSpinner,
} from '@coreui/react'

import vehicleLicenseService from '../../../service/vehicleLicenseService'
import { vehicleService } from '../../../service/vehicleService'
import { licenseService } from '../../../service/licenseService'
import { fileHistoryService } from '../../../service/fileHistoryService'
import './VehicleLicenseManagement.css'

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 15

const EMPTY_FORM = {
  vehicleId: '',
  vehicleNumber: '',
  licenseId: '',
  licenseCode: '',
  assignDate: '',
}

// ─── Debounce Helper ──────────────────────────────────────────────────────────
function debounce(fn, delay) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

// ─── Currency & Date Formatting Helpers ───────────────────────────────────────
const formatCurrency = (val) => {
  const num = Number(val)
  if (isNaN(num)) return 'Rs. 0.00'
  return `Rs. ${num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

const formatDateDisplay = (dateStr) => {
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

const formatDateTimeDisplay = (dateStr) => {
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

// ─── React-Select Styling Helper ──────────────────────────────────────────────
const getSelectStyles = (isDark) => ({
  control: (base, state) => ({
    ...base,
    minHeight: '42px',
    borderRadius: '8px',
    borderColor: state.isFocused ? '#0284c7' : isDark ? '#334155' : '#cbd5e1',
    boxShadow: state.isFocused ? '0 0 0 3px rgba(2, 132, 199, 0.2)' : 'none',
    fontSize: '0.875rem',
    backgroundColor: isDark ? '#0f172a' : '#ffffff',
    color: isDark ? '#f8fafc' : '#0f172a',
    cursor: 'pointer',
    '&:hover': { borderColor: '#0284c7' },
  }),
  menuPortal: (base) => ({ ...base, zIndex: 99999 }),
  menu: (base) => ({
    ...base,
    borderRadius: '10px',
    minWidth: '100%',
    width: 'max-content',
    maxWidth: '680px',
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
      ? '#0284c7'
      : state.isFocused
        ? isDark
          ? '#1e293b'
          : '#f0f9ff'
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
    '&:hover': { color: '#0284c7' },
  }),
  clearIndicator: (base) => ({
    ...base,
    color: isDark ? '#94a3b8' : '#64748b',
    '&:hover': { color: '#dc2626' },
  }),
})

// ─── Format Data Helpers for Select Options ──────────────────────────────────
const formatVehicleOption = (v) => {
  if (!v) return null
  const rawId = v.id ?? v.vehicleId ?? null
  const num =
    v.vehicleNumber ||
    v.number ||
    v.vehicleNo ||
    v.registrationNumber ||
    (rawId ? `Vehicle #${rawId}` : '')
  const cap = v.capacity || ''
  const driver = v.driverName || v.driver || ''

  return {
    value: rawId,
    id: rawId,
    vehicleId: rawId,
    vehicleNumber: num,
    label: cap ? `${num} • ${cap}m³` : num || `Vehicle #${rawId}`,
    capacity: cap,
    driverName: driver,
    raw: v,
  }
}

const formatLicenseOption = (l) => {
  if (!l) return null
  const rawId = l.id ?? l.licenseId ?? null
  const code = l.licenseCode || l.code || (rawId ? `LIC-${rawId}` : '')
  const priceStr = l.price !== undefined && l.price !== null ? formatCurrency(l.price) : ''
  const dateStr =
    l.startDate && l.endDate
      ? ` (${formatDateDisplay(l.startDate)} - ${formatDateDisplay(l.endDate)})`
      : ''

  return {
    value: rawId,
    id: rawId,
    licenseId: rawId,
    licenseCode: code,
    label: `${code}${priceStr ? ` • ${priceStr}` : ''}${dateStr}`,
    raw: l,
  }
}

const formatExcelOption = (f) => {
  if (!f) return null
  const rawId = f.id ?? f.fileHistoryId ?? null
  const name = typeof f === 'string' ? f : f.fileName || f.name || (rawId ? `Batch #${rawId}` : '')
  const cDate = f.createdDate || f.createdAt || f.uploadedDate || ''

  return {
    value: rawId ? String(rawId) : name,
    id: rawId,
    fileHistoryId: rawId,
    label: name,
    fileName: name,
    createdDate: cDate,
    raw: f,
  }
}

// ─── Custom Select Option & SingleValue Components ───────────────────────────
const CustomVehicleOption = (props) => {
  const { data } = props
  return (
    <components.Option {...props}>
      <div className="d-flex align-items-center justify-content-between gap-2">
        <div className="d-flex align-items-center gap-2" style={{ minWidth: 0, flex: 1 }}>
          <CIcon icon={cilTruck} size="sm" className="text-secondary flex-shrink-0" />
          <span style={{ fontWeight: 600, fontSize: '0.86rem' }}>
            {data.vehicleNumber || data.label}
          </span>
          {data.capacity && (
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>({data.capacity}m³)</span>
          )}
        </div>
        {data.driverName && (
          <span style={{ fontSize: '0.74rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
            {data.driverName}
          </span>
        )}
      </div>
    </components.Option>
  )
}

const CustomVehicleSingleValue = (props) => {
  return (
    <components.SingleValue {...props}>
      <span
        className="d-inline-flex align-items-center gap-1"
        style={{ maxWidth: '100%', overflow: 'hidden' }}
      >
        <CIcon icon={cilTruck} size="sm" style={{ color: '#0284c7', flexShrink: 0 }} />
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontWeight: 600,
            fontSize: '0.84rem',
          }}
        >
          {props.data.vehicleNumber || props.data.label}
        </span>
        {props.data.capacity && (
          <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '4px' }}>
            ({props.data.capacity}m³)
          </span>
        )}
      </span>
    </components.SingleValue>
  )
}

const CustomLicenseOption = (props) => {
  const { data } = props
  const raw = data.raw || {}
  const hasDates = raw.startDate || raw.endDate
  const priceFormatted =
    raw.price !== undefined && raw.price !== null ? formatCurrency(raw.price) : null
  return (
    <components.Option {...props}>
      <div className="d-flex align-items-center justify-content-between gap-2">
        <div className="d-flex align-items-center gap-2" style={{ minWidth: 0, flex: 1 }}>
          <CIcon icon={cilContact} size="sm" className="text-info flex-shrink-0" />
          <span style={{ fontWeight: 600, fontSize: '0.86rem' }}>
            {data.licenseCode || data.label}
          </span>
        </div>
        {priceFormatted && (
          <span
            className="badge bg-info-subtle text-info"
            style={{ fontSize: '0.75rem', fontWeight: 600 }}
          >
            {priceFormatted}
          </span>
        )}
      </div>
      {hasDates && (
        <div
          style={{
            fontSize: '0.74rem',
            color: '#64748b',
            marginTop: '2px',
            paddingLeft: '22px',
          }}
        >
          Valid: {formatDateDisplay(raw.startDate)} → {formatDateDisplay(raw.endDate)}
        </div>
      )}
    </components.Option>
  )
}

const CustomLicenseSingleValue = (props) => {
  const { data } = props
  const raw = data.raw || {}
  const dateRange =
    raw.startDate && raw.endDate
      ? ` (${formatDateDisplay(raw.startDate)} - ${formatDateDisplay(raw.endDate)})`
      : ''
  return (
    <components.SingleValue {...props}>
      <span
        className="d-inline-flex align-items-center gap-1"
        style={{ maxWidth: '100%', overflow: 'hidden' }}
      >
        <CIcon icon={cilContact} size="sm" style={{ color: '#0284c7', flexShrink: 0 }} />
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontWeight: 600,
            fontSize: '0.84rem',
          }}
        >
          {data.licenseCode || data.label}
        </span>
        {dateRange && (
          <span
            style={{
              fontSize: '0.75rem',
              color: '#64748b',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {dateRange}
          </span>
        )}
      </span>
    </components.SingleValue>
  )
}

const CustomExcelOption = (props) => {
  const { data } = props
  return (
    <components.Option {...props}>
      <div className="d-flex align-items-center justify-content-between gap-3">
        <div className="d-flex align-items-center gap-2" style={{ minWidth: 0, flex: 1 }}>
          <CIcon icon={cilDescription} size="sm" className="text-primary flex-shrink-0" />
          <span
            style={{
              fontSize: '0.84rem',
              fontWeight: 600,
              whiteSpace: 'normal',
              wordBreak: 'break-all',
            }}
          >
            {data.fileName || data.label}
          </span>
        </div>
        {data.createdDate && (
          <span
            style={{
              fontSize: '0.73rem',
              color: '#94a3b8',
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            {formatDateTimeDisplay(data.createdDate)}
          </span>
        )}
      </div>
    </components.Option>
  )
}

const CustomExcelSingleValue = (props) => {
  return (
    <components.SingleValue {...props}>
      <span
        className="d-inline-flex align-items-center gap-1"
        style={{ maxWidth: '100%', overflow: 'hidden' }}
      >
        <CIcon icon={cilDescription} size="sm" style={{ color: '#0284c7', flexShrink: 0 }} />
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

// ─── Main Component ──────────────────────────────────────────────────────────
const VehicleLicenseManagement = () => {
  // ── Theme Detection ─────────────────────────────────────────────────────────
  const [isDark, setIsDark] = useState(
    () => document.documentElement.getAttribute('data-coreui-theme') === 'dark',
  )

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.getAttribute('data-coreui-theme') === 'dark')
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-coreui-theme'],
    })
    return () => observer.disconnect()
  }, [])

  const selectStyles = useMemo(() => getSelectStyles(isDark), [isDark])

  // ── Table State ─────────────────────────────────────────────────────────────
  const [recordsList, setRecordsList] = useState([])
  const [totalElements, setTotalElements] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [currentPage, setCurrentPage] = useState(0)
  const [loading, setLoading] = useState(false)

  // ── Filter State ────────────────────────────────────────────────────────────
  const [selectedLicense, setSelectedLicense] = useState(null)
  const [selectedVehicle, setSelectedVehicle] = useState(null)
  const [assignDateFilter, setAssignDateFilter] = useState('')
  const [createdDateFilter, setCreatedDateFilter] = useState('')
  const [selectedExcel, setSelectedExcel] = useState(null)

  // ── Filter Dropdown Options ─────────────────────────────────────────────────
  const [licenseOptions, setLicenseOptions] = useState([])
  const [vehicleOptions, setVehicleOptions] = useState([])
  const [excelOptions, setExcelOptions] = useState([])
  const [optionsLoading, setOptionsLoading] = useState(false)

  const allVehiclesRef = useRef([])
  const allLicensesRef = useRef([])
  const allExcelOptionsRef = useRef([])
  const abortRef = useRef(null)

  // ── Modal State (Add / Edit) ────────────────────────────────────────────────
  const [modalVisible, setModalVisible] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formVehicle, setFormVehicle] = useState(null)
  const [formLicense, setFormLicense] = useState(null)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  // ─── Fetch Initial Filter Options ───────────────────────────────────────────
  const loadFilterOptions = useCallback(async () => {
    setOptionsLoading(true)
    try {
      const [vehiclesRes, licRes, uploadsRes] = await Promise.allSettled([
        vehicleService.getAllVehicles(),
        licenseService.getLicenses({ size: 200 }),
        fileHistoryService.getFilesByFileType('VEHICLE_LICENSE', ''),
      ])

      if (vehiclesRes.status === 'fulfilled') {
        const vList = Array.isArray(vehiclesRes.value)
          ? vehiclesRes.value
          : vehiclesRes.value?.content || vehiclesRes.value?.data || []
        const vOpts = vList.map(formatVehicleOption).filter(Boolean)
        allVehiclesRef.current = vOpts
        setVehicleOptions(vOpts)
      }

      if (licRes.status === 'fulfilled') {
        const lList = Array.isArray(licRes.value)
          ? licRes.value
          : licRes.value?.content || licRes.value?.data || []
        const lOpts = lList.map(formatLicenseOption).filter(Boolean)
        allLicensesRef.current = lOpts
        setLicenseOptions(lOpts)
      }

      if (uploadsRes.status === 'fulfilled') {
        const uList = Array.isArray(uploadsRes.value)
          ? uploadsRes.value
          : uploadsRes.value?.content || uploadsRes.value?.data || []
        const eOpts = uList.map(formatExcelOption).filter(Boolean)
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

  // ─── Debounced Excel Search ─────────────────────────────────────────────────
  const handleExcelSearch = useRef(
    debounce(async (query) => {
      if (!query || !query.trim()) {
        setExcelOptions(allExcelOptionsRef.current)
        return
      }
      try {
        const res = await fileHistoryService.getFilesByFileType('VEHICLE_LICENSE', query.trim())
        if (Array.isArray(res) && res.length > 0) {
          setExcelOptions(res.map(formatExcelOption).filter(Boolean))
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
    }, 300),
  ).current

  const onExcelInputChange = useCallback(
    (inputValue, { action }) => {
      if (action === 'input-change') {
        handleExcelSearch(inputValue)
      }
    },
    [handleExcelSearch],
  )

  // ─── Load Vehicle License Records from Backend ──────────────────────────────
  const loadRecords = useCallback(
    async (page = 0) => {
      if (abortRef.current) abortRef.current.abort()
      abortRef.current = new AbortController()

      setLoading(true)
      try {
        const params = {
          page,
          size: PAGE_SIZE,
          sort: 'id,desc',
          licenseId: selectedLicense?.value || selectedLicense?.id || undefined,
          vehicleId: selectedVehicle?.value || selectedVehicle?.id || undefined,
          assignDate: assignDateFilter || undefined,
          assignedDate: assignDateFilter || undefined,
          date: assignDateFilter || undefined,
          createdDate: createdDateFilter || undefined,
          fileHistoryId: selectedExcel?.id ?? selectedExcel?.fileHistoryId ?? undefined,
        }

        const result = await vehicleLicenseService.getVehicleLicenses(
          params,
          abortRef.current.signal,
        )

        const content =
          result?.content || result?.items || (Array.isArray(result) ? result : result?.data || [])

        setRecordsList(Array.isArray(content) ? content : [])
        setTotalElements(result?.totalElements ?? result?.total ?? content.length)
        setTotalPages(
          result?.totalPages ??
            Math.max(1, Math.ceil((result?.totalElements ?? content.length) / PAGE_SIZE)),
        )
        setCurrentPage(result?.number ?? page)
      } catch (err) {
        if (err.name === 'AbortError') return
        console.warn('Vehicle licenses fetch warning:', err)
        setRecordsList([])
        setTotalElements(0)
        setTotalPages(1)
      } finally {
        setLoading(false)
      }
    },
    [selectedLicense, selectedVehicle, assignDateFilter, createdDateFilter, selectedExcel],
  )

  useEffect(() => {
    loadRecords(0)
    setCurrentPage(0)
  }, [loadRecords])

  // ─── Pagination Control ─────────────────────────────────────────────────────
  const goToPage = (p) => {
    if (p < 0 || p >= totalPages) return
    loadRecords(p)
    setCurrentPage(p)
  }

  // ─── Reset All Filters ──────────────────────────────────────────────────────
  const handleResetFilters = () => {
    setSelectedLicense(null)
    setSelectedVehicle(null)
    setAssignDateFilter('')
    setCreatedDateFilter('')
    setSelectedExcel(null)
  }

  // Active filters count for visual badge
  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (selectedLicense) count++
    if (selectedVehicle) count++
    if (assignDateFilter) count++
    if (createdDateFilter) count++
    if (selectedExcel) count++
    return count
  }, [selectedLicense, selectedVehicle, assignDateFilter, createdDateFilter, selectedExcel])

  // ─── Modal Form Controls ────────────────────────────────────────────────────
  const setFormField = (key, val) => {
    setForm((p) => ({ ...p, [key]: val }))
    if (errors[key]) setErrors((p) => ({ ...p, [key]: '' }))
  }

  const validateForm = () => {
    const e = {}
    if (!form.vehicleId && !form.vehicleNumber) e.vehicleId = 'Please select a vehicle'
    if (!form.licenseId && !form.licenseCode) e.licenseId = 'Please select a license'
    if (!form.assignDate) e.assignDate = 'Please select a license assigned date'

    setErrors(e)
    return Object.keys(e).length === 0
  }

  const openAddModal = () => {
    setEditMode(false)
    setSelectedId(null)
    const today = new Date().toISOString().split('T')[0]
    setForm({
      ...EMPTY_FORM,
      assignDate: today,
    })
    setFormVehicle(null)
    setFormLicense(null)
    setErrors({})
    setModalVisible(true)
  }

  // ─── Edit Modal Opener ──────────────────────────────────────────────────────
  const openEditModal = (item) => {
    setEditMode(true)
    setSelectedId(item.id)

    const rawDate = item.assignDate || item.assignedDate || item.date || ''
    const formattedDate = rawDate
      ? rawDate.includes('T')
        ? rawDate.split('T')[0]
        : rawDate.substring(0, 10)
      : ''

    const vehId = item.vehicle?.id ?? item.vehicleId ?? item.vehicle?.vehicleId ?? ''
    const vehNum = item.vehicle?.vehicleNumber ?? item.vehicleNumber ?? item.vehicle?.number ?? ''

    const vehMatch =
      vehicleOptions.find(
        (v) =>
          (vehId && (String(v.value) === String(vehId) || String(v.id) === String(vehId))) ||
          (vehNum &&
            (v.vehicleNumber === vehNum ||
              v.raw?.vehicleNumber === vehNum ||
              v.label?.includes(vehNum))),
      ) ||
      (vehId || vehNum
        ? {
            value: vehId,
            id: vehId,
            vehicleId: vehId,
            vehicleNumber: vehNum,
            label: vehNum || `Vehicle #${vehId}`,
            raw: item.vehicle || {},
          }
        : null)

    const licId = item.license?.id ?? item.licenseId ?? item.license?.licenseId ?? ''
    const licCode =
      item.license?.licenseCode ??
      item.licenseCode ??
      item.license?.code ??
      (licId ? `LIC-${licId}` : '')

    const licMatch =
      licenseOptions.find(
        (l) =>
          (licId && (String(l.value) === String(licId) || String(l.id) === String(licId))) ||
          (licCode &&
            (l.licenseCode === licCode ||
              l.raw?.licenseCode === licCode ||
              l.label?.includes(licCode))),
      ) ||
      (licId || licCode
        ? {
            value: licId,
            id: licId,
            licenseId: licId,
            licenseCode: licCode,
            label: item.license ? formatLicenseOption(item.license)?.label || licCode : licCode,
            raw: item.license || {},
          }
        : null)

    setForm({
      vehicleId: vehMatch ? vehMatch.value : '',
      vehicleNumber: vehMatch ? vehMatch.vehicleNumber || vehMatch.label : '',
      licenseId: licMatch ? licMatch.value : '',
      licenseCode: licMatch ? licMatch.licenseCode || licMatch.label : '',
      assignDate: formattedDate,
    })
    setFormVehicle(vehMatch)
    setFormLicense(licMatch)
    setErrors({})
    setModalVisible(true)
  }

  // ─── Save Handler (Create / Update) ─────────────────────────────────────────
  const handleSave = async () => {
    if (!validateForm()) return
    setSaving(true)

    const payload = {
      vehicleId: form.vehicleId || undefined,
      vehicleNumber: form.vehicleNumber || undefined,
      licenseId: form.licenseId || undefined,
      licenseCode: form.licenseCode || undefined,
      assignDate: form.assignDate || undefined,
      assignedDate: form.assignDate || undefined,
      date: form.assignDate || undefined,
    }

    try {
      if (editMode) {
        await vehicleLicenseService.updateVehicleLicense(selectedId, payload)
        Swal.fire({
          icon: 'success',
          title: 'License Updated',
          text: 'Vehicle license record has been updated successfully.',
          confirmButtonColor: '#0284c7',
          timer: 2200,
          timerProgressBar: true,
        })
      } else {
        await vehicleLicenseService.createVehicleLicense(payload)
        Swal.fire({
          icon: 'success',
          title: 'License Assigned',
          text: 'Vehicle license record has been created successfully.',
          confirmButtonColor: '#0284c7',
          timer: 2200,
          timerProgressBar: true,
        })
      }
      setModalVisible(false)
      loadRecords(editMode ? currentPage : 0)
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Save Failed',
        text: err.message || 'Failed to save vehicle license. Please try again.',
        confirmButtonColor: '#dc2626',
      })
    } finally {
      setSaving(false)
    }
  }

  // ─── Delete Handler ─────────────────────────────────────────────────────────
  const handleDelete = (item) => {
    const vehNum = item.vehicle?.vehicleNumber || item.vehicleNumber || `ID #${item.id}`
    const licCode = item.license?.licenseCode || item.licenseCode || 'License'

    Swal.fire({
      title: 'Delete License Record?',
      html: `Are you sure you want to remove license <b>${licCode}</b> from vehicle <b>${vehNum}</b>?<br/><small class="text-danger">This action cannot be undone.</small>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await vehicleLicenseService.deleteVehicleLicense(item.id)
          Swal.fire({
            icon: 'success',
            title: 'Deleted!',
            text: 'Vehicle license record has been removed.',
            confirmButtonColor: '#0284c7',
            timer: 2000,
            timerProgressBar: true,
          })
          loadRecords(currentPage)
        } catch (err) {
          Swal.fire({
            icon: 'error',
            title: 'Delete Failed',
            text: err.message || 'Could not delete license record. Please try again.',
            confirmButtonColor: '#dc2626',
          })
        }
      }
    })
  }

  // ─── Render Component ───────────────────────────────────────────────────────
  return (
    <div className="vl-page">
      {/* ── Page Header (Topic) ── */}
      <div className="vl-page-header">
        <div className="vl-header-left">
          <div className="vl-header-icon">
            <CIcon icon={cilContact} size="xl" />
          </div>
          <div>
            <h1 className="vl-page-title">Vehicle License Management</h1>
            <p className="vl-page-subtitle">
              View, filter, edit, and manage all vehicle license assignments and renewals
            </p>
          </div>
        </div>

        <div className="vl-header-actions">
          <button className="vl-btn-add" onClick={openAddModal} id="btn-add-vehicle-license">
            <CIcon icon={cilPlus} />
            <span>Assign Vehicle License</span>
          </button>
        </div>
      </div>

      {/* ── Filter Card ── */}
      <CCard className="vl-card mb-4">
        <CCardHeader className="vl-card-header">
          <div className="vl-card-title">
            <CIcon icon={cilFilter} className="text-info" />
            <span>Filter Vehicle Licenses</span>
            {activeFiltersCount > 0 && (
              <span
                className="badge bg-info text-dark rounded-pill ms-2"
                style={{ fontSize: '0.75rem' }}
              >
                {activeFiltersCount} Active
              </span>
            )}
          </div>
          {activeFiltersCount > 0 && (
            <button className="vl-btn-reset" onClick={handleResetFilters} id="btn-reset-filters">
              <CIcon icon={cilReload} size="sm" />
              <span>Reset Filters</span>
            </button>
          )}
        </CCardHeader>

        <CCardBody className="p-3">
          <div className="vl-filter-grid">
            {/* Filter: License */}
            <div className="vl-filter-group">
              <label className="vl-label">
                <CIcon icon={cilContact} size="sm" />
                License
              </label>
              <Select
                isClearable
                isSearchable
                options={licenseOptions}
                value={selectedLicense}
                onChange={setSelectedLicense}
                components={{
                  Option: CustomLicenseOption,
                  SingleValue: CustomLicenseSingleValue,
                }}
                placeholder="Search license..."
                styles={selectStyles}
                isLoading={optionsLoading}
                menuPortalTarget={document.body}
              />
            </div>

            {/* Filter: Vehicle */}
            <div className="vl-filter-group">
              <label className="vl-label">
                <CIcon icon={cilTruck} size="sm" />
                Vehicle
              </label>
              <Select
                isClearable
                isSearchable
                options={vehicleOptions}
                value={selectedVehicle}
                onChange={setSelectedVehicle}
                components={{
                  Option: CustomVehicleOption,
                  SingleValue: CustomVehicleSingleValue,
                }}
                placeholder="Search vehicle..."
                styles={selectStyles}
                isLoading={optionsLoading}
                menuPortalTarget={document.body}
              />
            </div>

            {/* Filter: License Assigned Date */}
            <div className="vl-filter-group">
              <label className="vl-label">
                <CIcon icon={cilCalendar} size="sm" />
                License Assigned Date
              </label>
              <input
                type="date"
                className="vl-input"
                value={assignDateFilter}
                onChange={(e) => setAssignDateFilter(e.target.value)}
              />
            </div>

            {/* Filter: Created Date */}
            <div className="vl-filter-group">
              <label className="vl-label">
                <CIcon icon={cilCalendar} size="sm" />
                Created Date
              </label>
              <input
                type="date"
                className="vl-input"
                value={createdDateFilter}
                onChange={(e) => setCreatedDateFilter(e.target.value)}
              />
            </div>

            {/* Filter: Uploaded Excel */}
            <div className="vl-filter-group">
              <label className="vl-label">
                <CIcon icon={cilDescription} size="sm" />
                Uploaded Excel
              </label>
              <Select
                isClearable
                isSearchable
                options={excelOptions}
                value={selectedExcel}
                onChange={setSelectedExcel}
                onInputChange={onExcelInputChange}
                components={{
                  Option: CustomExcelOption,
                  SingleValue: CustomExcelSingleValue,
                }}
                placeholder="Search upload batch/file..."
                styles={selectStyles}
                isLoading={optionsLoading}
                menuPortalTarget={document.body}
              />
            </div>
          </div>

          {/* Active Filter Pills Bar */}
          {activeFiltersCount > 0 && (
            <div className="vl-active-filters-bar">
              <span className="vl-active-filters-title">Active Filters:</span>

              {selectedLicense && (
                <span className="vl-filter-pill">
                  License: {selectedLicense.licenseCode || selectedLicense.label}
                  <span className="vl-filter-pill-remove" onClick={() => setSelectedLicense(null)}>
                    ✕
                  </span>
                </span>
              )}

              {selectedVehicle && (
                <span className="vl-filter-pill">
                  Vehicle: {selectedVehicle.vehicleNumber || selectedVehicle.label}
                  <span className="vl-filter-pill-remove" onClick={() => setSelectedVehicle(null)}>
                    ✕
                  </span>
                </span>
              )}

              {assignDateFilter && (
                <span className="vl-filter-pill">
                  Assigned Date: {formatDateDisplay(assignDateFilter)}
                  <span className="vl-filter-pill-remove" onClick={() => setAssignDateFilter('')}>
                    ✕
                  </span>
                </span>
              )}

              {createdDateFilter && (
                <span className="vl-filter-pill">
                  Created Date: {formatDateDisplay(createdDateFilter)}
                  <span className="vl-filter-pill-remove" onClick={() => setCreatedDateFilter('')}>
                    ✕
                  </span>
                </span>
              )}

              {selectedExcel && (
                <span className="vl-filter-pill">
                  File: {selectedExcel.fileName || selectedExcel.label}
                  <span className="vl-filter-pill-remove" onClick={() => setSelectedExcel(null)}>
                    ✕
                  </span>
                </span>
              )}
            </div>
          )}
        </CCardBody>
      </CCard>

      {/* ── Table Card ── */}
      <CCard className="vl-card">
        <CCardHeader className="vl-card-header">
          <div className="vl-card-title">
            <CIcon icon={cilContact} className="text-info" />
            <span>Vehicle Licenses Log ({totalElements} Records)</span>
          </div>
          <button
            className="vl-btn-reset"
            onClick={() => loadRecords(currentPage)}
            disabled={loading}
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
          >
            <CIcon icon={cilReload} size="sm" className={loading ? 'fa-spin' : ''} /> Refresh
          </button>
        </CCardHeader>

        <CCardBody className="p-3">
          {loading && recordsList.length === 0 ? (
            <div className="text-center py-5">
              <CSpinner color="info" />
              <div className="mt-2 text-muted" style={{ fontSize: '0.85rem' }}>
                Loading vehicle licenses...
              </div>
            </div>
          ) : recordsList.length === 0 ? (
            <div className="vl-empty-state">
              <CIcon icon={cilContact} size="3xl" />
              <div className="vl-empty-title">No vehicle license records found</div>
              <p className="vl-empty-desc">
                {activeFiltersCount > 0
                  ? 'Try adjusting your filters or search terms.'
                  : 'Get started by assigning a new vehicle license or bulk uploading an Excel sheet.'}
              </p>
              {activeFiltersCount > 0 && (
                <button
                  className="vl-btn-reset mt-3"
                  onClick={handleResetFilters}
                  style={{ display: 'inline-flex' }}
                >
                  <CIcon icon={cilReload} size="sm" /> Reset All Filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="vl-table-wrap">
                <table className="vl-table">
                  <thead>
                    <tr>
                      <th style={{ width: '48px' }}>#</th>
                      <th>License Code</th>
                      <th>Vehicle Number</th>
                      <th>License Assigned Date</th>
                      <th className="vl-excel-col">Uploaded Excel / Source</th>
                      <th>Created Date</th>
                      <th style={{ textAlign: 'right' }}>License Fee</th>
                      <th style={{ textAlign: 'center', width: '90px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recordsList.map((item, idx) => {
                      const vehNum = item.vehicle?.vehicleNumber || item.vehicleNumber || '—'
                      const licCode =
                        item.license?.licenseCode ||
                        item.licenseCode ||
                        `License #${item.license?.id || item.licenseId || '—'}`
                      const assignDate = item.assignDate || item.assignedDate || item.date
                      const createdDate = item.createdDate || item.createdAt
                      const amountVal = item.license?.price ?? item.price ?? item.amount

                      return (
                        <tr key={item.id || idx}>
                          <td className="vl-td-num">{currentPage * PAGE_SIZE + idx + 1}</td>

                          {/* License Code */}
                          <td>
                            <span className="vl-license-pill">
                              <CIcon icon={cilContact} size="sm" />
                              {licCode}
                            </span>
                          </td>

                          {/* Vehicle Number */}
                          <td>
                            <span className="vl-veh-pill">
                              <CIcon icon={cilTruck} size="sm" className="text-secondary" />
                              {vehNum}
                            </span>
                          </td>

                          {/* License Assigned Date */}
                          <td>
                            <span className="vl-date-text">
                              <CIcon icon={cilCalendar} size="sm" className="text-secondary" />
                              {formatDateDisplay(assignDate)}
                            </span>
                          </td>

                          {/* Uploaded Excel / Source */}
                          <td className="vl-excel-col">
                            {item.fileHistory?.fileName || item.fileName ? (
                              <span
                                className="vl-excel-badge"
                                title={item.fileHistory?.fileName || item.fileName}
                              >
                                <CIcon
                                  icon={cilDescription}
                                  size="sm"
                                  className="mt-1 flex-shrink-0"
                                />
                                <span className="vl-excel-badge-text">
                                  {item.fileHistory?.fileName || item.fileName}
                                </span>
                              </span>
                            ) : (
                              <span className="vl-manual-badge">
                                <CIcon icon={cilPencil} size="sm" /> Manual Entry
                              </span>
                            )}
                          </td>

                          {/* Created Date */}
                          <td className="vl-created-text">{formatDateTimeDisplay(createdDate)}</td>

                          {/* Amount */}
                          <td style={{ textAlign: 'right' }}>
                            <span className="vl-amount-text">
                              {amountVal !== undefined && amountVal !== null
                                ? formatCurrency(amountVal)
                                : '—'}
                            </span>
                          </td>

                          {/* Actions */}
                          <td style={{ textAlign: 'center' }}>
                            <div className="vl-actions-cell" style={{ justifyContent: 'center' }}>
                              <button
                                className="vl-btn-action edit"
                                title="Edit License Record"
                                onClick={() => openEditModal(item)}
                              >
                                <CIcon icon={cilPencil} size="sm" />
                              </button>
                              <button
                                className="vl-btn-action delete"
                                title="Delete License Record"
                                onClick={() => handleDelete(item)}
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

              {/* ── Pagination Footer ── */}
              <div className="vl-pagination-footer">
                <div className="vl-page-info">
                  Showing <b>{recordsList.length > 0 ? currentPage * PAGE_SIZE + 1 : 0}</b> to{' '}
                  <b>{Math.min((currentPage + 1) * PAGE_SIZE, totalElements)}</b> of{' '}
                  <b>{totalElements}</b> records
                </div>

                {totalPages > 1 && (
                  <div className="vl-page-controls">
                    <button
                      className="vl-page-btn"
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 0}
                    >
                      <CIcon icon={cilChevronLeft} size="sm" />
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i)
                      .filter(
                        (p) => p === 0 || p === totalPages - 1 || Math.abs(p - currentPage) <= 1,
                      )
                      .reduce((acc, p, i, arr) => {
                        if (i > 0 && p - arr[i - 1] > 1) {
                          acc.push('...')
                        }
                        acc.push(p)
                        return acc
                      }, [])
                      .map((p, idx) =>
                        p === '...' ? (
                          <span key={`ellipsis-${idx}`} className="px-2 text-muted">
                            ...
                          </span>
                        ) : (
                          <button
                            key={p}
                            className={`vl-page-btn ${currentPage === p ? 'active' : ''}`}
                            onClick={() => goToPage(p)}
                          >
                            {p + 1}
                          </button>
                        ),
                      )}

                    <button
                      className="vl-page-btn"
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
        <CModalHeader className="vl-card-header">
          <CModalTitle className="vl-card-title">
            <CIcon icon={editMode ? cilPencil : cilPlus} className="text-info" />
            <span>{editMode ? 'Edit Vehicle License Record' : 'Assign Vehicle License'}</span>
          </CModalTitle>
        </CModalHeader>

        <CModalBody className="p-4">
          <div className="vl-modal-grid">
            {/* Vehicle Selection */}
            <div className="vl-filter-group mb-3">
              <label className="vl-label">
                <CIcon icon={cilTruck} size="sm" />
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
                  setFormField(
                    'vehicleNumber',
                    opt ? opt.vehicleNumber || opt.raw?.vehicleNumber || opt.label : '',
                  )
                }}
                components={{
                  Option: CustomVehicleOption,
                  SingleValue: CustomVehicleSingleValue,
                }}
                placeholder="Select vehicle..."
                styles={selectStyles}
                menuPortalTarget={document.body}
              />
              {errors.vehicleId && <div className="vl-form-error">{errors.vehicleId}</div>}
            </div>

            {/* License Selection */}
            <div className="vl-filter-group mb-3">
              <label className="vl-label">
                <CIcon icon={cilContact} size="sm" />
                License <span className="req">*</span>
              </label>
              <Select
                isClearable
                isSearchable
                options={licenseOptions}
                value={formLicense}
                onChange={(opt) => {
                  setFormLicense(opt)
                  setFormField('licenseId', opt ? opt.value : '')
                  setFormField(
                    'licenseCode',
                    opt ? opt.licenseCode || opt.raw?.licenseCode || opt.label : '',
                  )
                }}
                components={{
                  Option: CustomLicenseOption,
                  SingleValue: CustomLicenseSingleValue,
                }}
                placeholder="Select license..."
                styles={selectStyles}
                menuPortalTarget={document.body}
              />
              {errors.licenseId && <div className="vl-form-error">{errors.licenseId}</div>}
            </div>

            {/* License Assigned Date */}
            <div className="vl-filter-group mb-3">
              <label className="vl-label">
                <CIcon icon={cilCalendar} size="sm" />
                License Assigned Date <span className="req">*</span>
              </label>
              <input
                type="date"
                className={`vl-input ${errors.assignDate ? 'error' : ''}`}
                value={form.assignDate}
                onChange={(e) => setFormField('assignDate', e.target.value)}
              />
              {errors.assignDate && <div className="vl-form-error">{errors.assignDate}</div>}
            </div>
          </div>
        </CModalBody>

        <CModalFooter>
          <button className="vl-btn-reset" onClick={() => setModalVisible(false)} disabled={saving}>
            Cancel
          </button>
          <button
            className="vl-btn-add"
            onClick={handleSave}
            disabled={saving}
            style={{ minWidth: '140px', justifyContent: 'center' }}
          >
            {saving ? (
              <CSpinner size="sm" />
            ) : (
              <>
                <CIcon icon={cilCheckCircle} />
                <span>{editMode ? 'Update License' : 'Assign License'}</span>
              </>
            )}
          </button>
        </CModalFooter>
      </CModal>
    </div>
  )
}

export default VehicleLicenseManagement
