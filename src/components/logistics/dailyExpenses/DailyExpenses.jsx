/**
 * Daily Expenses Management Page
 *
 * Provides comprehensive management for Daily Vehicle Expenses:
 * - Paginated list (15 per page)
 * - Multi-criteria search & filtering:
 *     - Expense date
 *     - Vehicle (Searchable dropdown with live API search)
 *     - Created date
 *     - Uploaded Excel file / source (Searchable dropdown with fileType=VEHICLE_EXPENSE)
 * - Actions: Add, Edit, and Delete with SweetAlert2 confirmation
 * - Dark & Light mode theme support
 *
 * @module DailyExpenses
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
  cilMoney,
  cilCalendar,
  cilTruck,
  cilFile,
  cilPlus,
  cilPencil,
  cilTrash,
  cilReload,
  cilFilter,
  cilChevronLeft,
  cilChevronRight,
  cilCheckCircle,
  cilDescription,
} from '@coreui/icons'
import dailyExpenseService from '../../../service/dailyExpenseService'
import vehicleService from '../../../service/vehicleService'
import fileHistoryService from '../../../service/fileHistoryService'
import './DailyExpenses.css'

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 15

const EMPTY_FORM = {
  date: new Date().toISOString().split('T')[0],
  vehicleId: '',
  vehicleNumber: '',
  description: '',
  amount: '',
}

// ─── Debounce Hook ────────────────────────────────────────────────────────────
function useDebounce(value, delay = 350) {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])
  return debouncedValue
}

// ─── React-Select Styling Helper ──────────────────────────────────────────────
const getSelectStyles = (isDark) => ({
  control: (base, state) => ({
    ...base,
    minHeight: '42px',
    borderRadius: '8px',
    borderColor: state.isFocused ? '#10b981' : isDark ? '#334155' : '#cbd5e1',
    boxShadow: state.isFocused ? '0 0 0 3px rgba(16, 185, 129, 0.2)' : 'none',
    fontSize: '0.875rem',
    backgroundColor: isDark ? '#0f172a' : '#ffffff',
    color: isDark ? '#f8fafc' : '#0f172a',
    cursor: 'pointer',
    '&:hover': { borderColor: '#10b981' },
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
      ? '#10b981'
      : state.isFocused
        ? isDark
          ? '#1e293b'
          : '#ecfdf5'
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
    '&:hover': { color: '#10b981' },
  }),
  clearIndicator: (base) => ({
    ...base,
    color: isDark ? '#94a3b8' : '#64748b',
    '&:hover': { color: '#dc2626' },
  }),
})

// ─── Format Currency Helper ───────────────────────────────────────────────────
const formatCurrency = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '—'
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(val)
    .replace('LKR', 'Rs.')
}

// ─── Date Formatter Helpers ───────────────────────────────────────────────────
const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
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
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

// ─── Format Vehicle Object into Select Option ─────────────────────────────────
const formatVehicleOption = (v) => {
  if (!v) return null
  const num = v.vehicleNumber || v.regNumber || v.number || (v.id ? `Vehicle #${v.id}` : '')
  const driver = v.driverName || v.assignedDriver || ''
  const cap = v.capacity ? `${v.capacity}m³` : ''
  const labelText = [num, driver ? `(${driver})` : '', cap].filter(Boolean).join(' • ')

  return {
    value: v.id ?? num,
    id: v.id,
    vehicleNumber: num,
    driverName: driver,
    capacity: v.capacity,
    label: labelText || String(v.id || 'Vehicle'),
    raw: v,
  }
}

// ─── Custom Vehicle Option Component for Dropdown ─────────────────────────────
const CustomVehicleOption = (props) => {
  const { data, innerRef, innerProps, isSelected, isFocused } = props
  return (
    <div
      ref={innerRef}
      {...innerProps}
      className={`de-select-option ${isSelected ? 'is-selected' : isFocused ? 'is-focused' : ''}`}
    >
      <div className="d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center gap-2">
          <span className="de-veh-pill" style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem' }}>
            <CIcon icon={cilTruck} size="sm" style={{ color: '#10b981' }} />
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

// ─── Format Uploaded Excel Object into Select Option ──────────────────────────
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

// ─── Custom Excel Single Value ────────────────────────────────────────────────
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

// ─── Custom Excel Option Component for Dropdown List ──────────────────────────
const CustomExcelOption = (props) => {
  const { data, innerRef, innerProps, isSelected, isFocused } = props
  return (
    <div
      ref={innerRef}
      {...innerProps}
      className={`de-select-option ${isSelected ? 'is-selected' : isFocused ? 'is-focused' : ''}`}
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

const DailyExpenses = () => {
  // ─── Color Mode (Theme Detection) ───────────────────────────────────────────
  const { colorMode } = useColorModes('coreui-free-react-admin-template-theme')
  const selectStyles = useMemo(() => getSelectStyles(colorMode === 'dark'), [colorMode])

  // ─── Filter States ──────────────────────────────────────────────────────────
  const [dateFilter, setDateFilter] = useState('')
  const [createdDateFilter, setCreatedDateFilter] = useState('')
  const [selectedVehicle, setSelectedVehicle] = useState(null)
  const [selectedExcel, setSelectedExcel] = useState(null)

  // ─── Dropdown Options ───────────────────────────────────────────────────────
  const [vehicleOptions, setVehicleOptions] = useState([])
  const [excelOptions, setExcelOptions] = useState([])
  const [optionsLoading, setOptionsLoading] = useState(false)

  // ─── Table Data & Pagination ────────────────────────────────────────────────
  const [expensesList, setExpensesList] = useState([])
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
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

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

  // ─── Live Uploaded Excel Search API Binder (by-file-type?fileType=VEHICLE_EXPENSE)
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
        const data = await fileHistoryService.getFilesByFileType('VEHICLE_EXPENSE', query)
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

  // ─── Load Filter Options (Vehicles, Uploaded Excel sheets for VEHICLE_EXPENSE)
  const loadFilterOptions = useCallback(async () => {
    setOptionsLoading(true)
    try {
      const [vehiclesRes, uploadsRes] = await Promise.allSettled([
        vehicleService.getAllVehicles(),
        fileHistoryService.getFilesByFileType('VEHICLE_EXPENSE', ''),
      ])

      if (vehiclesRes.status === 'fulfilled' && Array.isArray(vehiclesRes.value)) {
        const vOpts = vehiclesRes.value.map(formatVehicleOption).filter(Boolean)
        setVehicleOptions(vOpts)
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

  // ─── Load Daily Expenses from Backend with Filters ──────────────────────────
  const loadDailyExpenses = useCallback(
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
          expenseDate: dateFilter || undefined,
          createdDate: createdDateFilter || undefined,
          vehicleId: selectedVehicle?.value || undefined,
          fileHistoryId: selectedExcel?.id ?? selectedExcel?.fileHistoryId ?? undefined,
          fileName: selectedExcel?.fileName || undefined,
          uploadedExcel: selectedExcel?.fileName || selectedExcel?.value || undefined,
        }

        const result = await dailyExpenseService.getDailyExpenses(params, abortRef.current.signal)

        const content =
          result?.content || result?.items || (Array.isArray(result) ? result : result?.data || [])

        setExpensesList(Array.isArray(content) ? content : [])
        setTotalElements(result?.totalElements ?? result?.total ?? content.length)
        setTotalPages(
          result?.totalPages ??
            Math.max(1, Math.ceil((result?.totalElements ?? content.length) / PAGE_SIZE)),
        )
        setCurrentPage(result?.number ?? page)
      } catch (err) {
        if (err.name === 'AbortError') return
        console.warn('Daily expenses fetch warning:', err)
        setExpensesList([])
        setTotalElements(0)
        setTotalPages(1)
      } finally {
        setLoading(false)
      }
    },
    [dateFilter, createdDateFilter, selectedVehicle, selectedExcel],
  )

  useEffect(() => {
    loadDailyExpenses(0)
    setCurrentPage(0)
  }, [loadDailyExpenses])

  // ─── Pagination Control ─────────────────────────────────────────────────────
  const goToPage = (p) => {
    if (p < 0 || p >= totalPages) return
    loadDailyExpenses(p)
    setCurrentPage(p)
  }

  // ─── Reset All Filters ──────────────────────────────────────────────────────
  const handleResetFilters = () => {
    setDateFilter('')
    setCreatedDateFilter('')
    setSelectedVehicle(null)
    setSelectedExcel(null)
  }

  // Active filters count for visual badge
  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (dateFilter) count++
    if (createdDateFilter) count++
    if (selectedVehicle) count++
    if (selectedExcel) count++
    return count
  }, [dateFilter, createdDateFilter, selectedVehicle, selectedExcel])

  // ─── Modal Form Controls ────────────────────────────────────────────────────
  const setFormField = (key, val) => {
    setForm((p) => ({ ...p, [key]: val }))
    if (errors[key]) setErrors((p) => ({ ...p, [key]: '' }))
  }

  const validateForm = () => {
    const e = {}
    if (!form.date) e.date = 'Expense date is required'
    if (!form.vehicleId && !form.vehicleNumber) e.vehicleId = 'Please select or enter a vehicle'
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0) {
      e.amount = 'Please enter a valid expense amount'
    }

    setErrors(e)
    return Object.keys(e).length === 0
  }

  const openAddModal = () => {
    setEditMode(false)
    setSelectedId(null)
    setForm(EMPTY_FORM)
    setFormVehicle(null)
    setErrors({})
    setModalVisible(true)
  }

  const openEditModal = (item) => {
    setEditMode(true)
    setSelectedId(item.id)

    const vehId = item.vehicle?.id ?? item.vehicleId ?? ''
    const vehNum = item.vehicle?.vehicleNumber ?? item.vehicleNumber ?? ''

    const vehMatch = vehicleOptions.find(
      (v) =>
        (vehId && (v.value === vehId || v.id === vehId)) ||
        (vehNum && (v.raw?.vehicleNumber === vehNum || v.label.includes(vehNum))),
    ) || {
      value: vehId,
      label: vehNum || (vehId ? `Vehicle #${vehId}` : ''),
    }

    setForm({
      date: item.date || item.expenseDate ? (item.date || item.expenseDate).split('T')[0] : '',
      vehicleId: vehMatch.value,
      vehicleNumber: vehNum || vehMatch.label,
      description: item.description || item.expenseType || item.category || '',
      amount: item.amount !== undefined && item.amount !== null ? String(item.amount) : '',
    })
    setFormVehicle(vehMatch)
    setErrors({})
    setModalVisible(true)
  }

  // ─── Save Handler (Create / Update) ─────────────────────────────────────────
  const handleSave = async () => {
    if (!validateForm()) return
    setSaving(true)

    const payload = {
      date: form.date,
      expenseDate: form.date,
      vehicleId: form.vehicleId || undefined,
      vehicleNumber: form.vehicleNumber || undefined,
      description: form.description?.trim() || undefined,
      expenseType: form.description?.trim() || undefined,
      amount: Number(form.amount),
    }

    try {
      if (editMode) {
        await dailyExpenseService.updateDailyExpense(selectedId, payload)
        Swal.fire({
          icon: 'success',
          title: 'Expense Updated',
          text: 'Daily expense record has been updated successfully.',
          confirmButtonColor: '#10b981',
          timer: 2200,
          timerProgressBar: true,
        })
      } else {
        await dailyExpenseService.createDailyExpense(payload)
        Swal.fire({
          icon: 'success',
          title: 'Expense Added',
          text: 'Daily expense record has been added successfully.',
          confirmButtonColor: '#10b981',
          timer: 2200,
          timerProgressBar: true,
        })
      }
      setModalVisible(false)
      loadDailyExpenses(editMode ? currentPage : 0)
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Save Failed',
        text: err.message || 'Failed to save daily expense. Please try again.',
        confirmButtonColor: '#dc2626',
      })
    } finally {
      setSaving(false)
    }
  }

  // ─── Delete Handler ─────────────────────────────────────────────────────────
  const handleDelete = (item) => {
    const vehNum = item.vehicle?.vehicleNumber || item.vehicleNumber || `ID #${item.id}`
    const amtStr = formatCurrency(item.amount)

    Swal.fire({
      title: 'Delete Expense Record?',
      html: `Are you sure you want to delete expense for <b>${vehNum}</b> (${amtStr})?<br/><small class="text-danger">This action cannot be undone.</small>`,
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
          await dailyExpenseService.deleteDailyExpense(item.id)
          Swal.fire({
            icon: 'success',
            title: 'Deleted!',
            text: 'Daily expense has been removed.',
            confirmButtonColor: '#10b981',
            timer: 2000,
            timerProgressBar: true,
          })
          loadDailyExpenses(currentPage)
        } catch (err) {
          Swal.fire({
            icon: 'error',
            title: 'Delete Failed',
            text: err.message || 'Could not delete expense record.',
            confirmButtonColor: '#dc2626',
          })
        }
      }
    })
  }

  // ─── Render Component ───────────────────────────────────────────────────────
  return (
    <div className="de-page">
      {/* ── Filter Card ── */}
      <CCard className="de-card mb-4">
        <CCardHeader className="de-card-header">
          <div className="de-card-title">
            <CIcon icon={cilFilter} className="text-success" />
            <span>Filter Daily Expenses</span>
            {activeFiltersCount > 0 && (
              <span className="badge bg-success rounded-pill ms-2" style={{ fontSize: '0.75rem' }}>
                {activeFiltersCount} active
              </span>
            )}
          </div>
          <div className="de-card-actions">
            <button className="de-btn-reset" onClick={handleResetFilters}>
              <CIcon icon={cilReload} size="sm" /> Reset Filters
            </button>
            <button className="de-btn-add" onClick={openAddModal} id="btn-add-daily-expense">
              <CIcon icon={cilPlus} /> Add Daily Expense
            </button>
          </div>
        </CCardHeader>

        <CCardBody className="p-3">
          <div className="de-filter-grid">
            {/* 1. Expense Date */}
            <div className="de-filter-group">
              <label className="de-label">
                <CIcon icon={cilCalendar} size="sm" /> Expense Date
              </label>
              <input
                type="date"
                className="de-input"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                id="filter-expense-date"
              />
            </div>

            {/* 2. Vehicle (Searchable Dropdown) */}
            <div className="de-filter-group">
              <label className="de-label">
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

            {/* 3. Created Date */}
            <div className="de-filter-group">
              <label className="de-label">
                <CIcon icon={cilCalendar} size="sm" /> Created Date
              </label>
              <input
                type="date"
                className="de-input"
                value={createdDateFilter}
                onChange={(e) => setCreatedDateFilter(e.target.value)}
                id="filter-created-date"
              />
            </div>

            {/* 4. Uploaded Excel Sheet */}
            <div className="de-filter-group de-filter-group--wide">
              <label className="de-label">
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
            <div className="de-active-filters-bar">
              <span className="de-active-filters-title">Active Filters:</span>
              {dateFilter && (
                <span className="de-filter-pill">
                  Date: {dateFilter}
                  <span className="de-filter-pill-remove" onClick={() => setDateFilter('')}>
                    ×
                  </span>
                </span>
              )}
              {selectedVehicle && (
                <span className="de-filter-pill">
                  Vehicle: {selectedVehicle.label}
                  <span className="de-filter-pill-remove" onClick={() => setSelectedVehicle(null)}>
                    ×
                  </span>
                </span>
              )}
              {createdDateFilter && (
                <span className="de-filter-pill">
                  Created: {createdDateFilter}
                  <span className="de-filter-pill-remove" onClick={() => setCreatedDateFilter('')}>
                    ×
                  </span>
                </span>
              )}
              {selectedExcel && (
                <span className="de-filter-pill">
                  Excel: {selectedExcel.label}
                  <span className="de-filter-pill-remove" onClick={() => setSelectedExcel(null)}>
                    ×
                  </span>
                </span>
              )}
            </div>
          )}
        </CCardBody>
      </CCard>

      {/* ── Table Card ── */}
      <CCard className="de-card">
        <CCardHeader className="de-card-header">
          <div className="de-card-title">
            <CIcon icon={cilMoney} className="text-success" />
            <span>Daily Expenses Log ({totalElements} Records)</span>
          </div>
          <button
            className="de-btn-reset"
            onClick={() => loadDailyExpenses(currentPage)}
            disabled={loading}
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
          >
            <CIcon icon={cilReload} size="sm" className={loading ? 'fa-spin' : ''} /> Refresh
          </button>
        </CCardHeader>

        <CCardBody className="p-3">
          {loading && expensesList.length === 0 ? (
            <div className="text-center py-5">
              <CSpinner color="success" />
              <div className="mt-2 text-muted" style={{ fontSize: '0.85rem' }}>
                Loading daily expenses...
              </div>
            </div>
          ) : expensesList.length === 0 ? (
            <div className="de-empty-state">
              <CIcon icon={cilMoney} size="3xl" />
              <div className="de-empty-title">No Daily Expenses Found</div>
              <p className="de-empty-desc">
                {activeFiltersCount > 0
                  ? 'No expense entries match your active filter criteria. Try resetting filters.'
                  : 'No daily expense records have been created yet. Click "Add Daily Expense" to start.'}
              </p>
            </div>
          ) : (
            <>
              <div className="de-table-wrap">
                <table className="de-table" aria-label="Daily expenses list table">
                  <thead>
                    <tr>
                      <th style={{ width: 44 }}>#</th>
                      <th style={{ minWidth: 130 }}>Expense Date</th>
                      <th style={{ minWidth: 140 }}>Vehicle Number</th>
                      <th className="de-excel-col">Uploaded Excel / Source</th>
                      <th style={{ minWidth: 160 }}>Created Date</th>
                      <th style={{ minWidth: 130 }}>Expense Amount</th>
                      <th style={{ width: 90, textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expensesList.map((item, idx) => {
                      const vehNumber =
                        item.vehicle?.vehicleNumber ||
                        item.vehicleNumber ||
                        (item.vehicle?.id
                          ? `Vehicle #${item.vehicle.id}`
                          : item.vehicleId
                            ? `Vehicle #${item.vehicleId}`
                            : '—')

                      const fileName =
                        item.fileHistory?.fileName ||
                        item.uploadedExcel ||
                        item.fileName ||
                        item.excelFileName

                      return (
                        <tr key={item.id ?? idx}>
                          <td className="de-td-num">{currentPage * PAGE_SIZE + idx + 1}</td>
                          <td>
                            <span className="de-date-text">
                              <CIcon icon={cilCalendar} size="sm" className="text-muted" />
                              {formatDate(item.date || item.expenseDate)}
                            </span>
                          </td>
                          <td>
                            <span className="de-veh-pill">
                              <CIcon icon={cilTruck} size="sm" style={{ color: '#10b981' }} />
                              {vehNumber}
                            </span>
                          </td>
                          <td className="de-excel-col">
                            {fileName ? (
                              <span className="de-excel-badge" title={fileName}>
                                <CIcon
                                  icon={cilFile}
                                  size="sm"
                                  style={{ flexShrink: 0, marginTop: '2px' }}
                                />
                                <span className="de-excel-badge-text">{fileName}</span>
                              </span>
                            ) : (
                              <span className="de-manual-badge">Manual Entry</span>
                            )}
                          </td>
                          <td>
                            <span className="de-created-text">
                              {formatDateTime(item.createdDate || item.createdAt || item.date)}
                            </span>
                          </td>
                          <td>
                            <span className="de-amount-text">
                              {formatCurrency(item.amount ?? item.expenseAmount)}
                            </span>
                          </td>
                          <td>
                            <div className="de-actions-cell justify-content-center">
                              <button
                                className="de-btn-action edit"
                                title="Edit Expense"
                                onClick={() => openEditModal(item)}
                                id={`btn-edit-expense-${item.id ?? idx}`}
                              >
                                <CIcon icon={cilPencil} size="sm" />
                              </button>
                              <button
                                className="de-btn-action delete"
                                title="Delete Expense"
                                onClick={() => handleDelete(item)}
                                id={`btn-delete-expense-${item.id ?? idx}`}
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
              <div className="de-pagination-footer">
                <div className="de-page-info">
                  Showing {currentPage * PAGE_SIZE + 1} to{' '}
                  {Math.min((currentPage + 1) * PAGE_SIZE, totalElements)} of {totalElements}{' '}
                  records (Page {currentPage + 1} of {totalPages})
                </div>

                {totalPages > 1 && (
                  <div className="de-page-controls">
                    <button
                      className="de-page-btn"
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
                          className={`de-page-btn ${p === currentPage ? 'active' : ''}`}
                          onClick={() => goToPage(p)}
                        >
                          {p + 1}
                        </button>
                      ))}
                    <button
                      className="de-page-btn"
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
        <CModalHeader className="de-card-header">
          <CModalTitle className="de-card-title">
            <CIcon icon={editMode ? cilPencil : cilPlus} className="text-success" />
            <span>{editMode ? 'Edit Daily Expense Record' : 'Add New Daily Expense'}</span>
          </CModalTitle>
        </CModalHeader>

        <CModalBody className="p-4">
          <div className="de-modal-grid">
            {/* Expense Date */}
            <div className="de-filter-group mb-3">
              <label className="de-label">
                Expense Date <span className="req">*</span>
              </label>
              <input
                type="date"
                className={`de-input ${errors.date ? 'error' : ''}`}
                value={form.date}
                onChange={(e) => setFormField('date', e.target.value)}
              />
              {errors.date && <div className="de-form-error">{errors.date}</div>}
            </div>

            {/* Vehicle Selection */}
            <div className="de-filter-group mb-3">
              <label className="de-label">
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
              {errors.vehicleId && <div className="de-form-error">{errors.vehicleId}</div>}
            </div>

            {/* Expense Description / Category */}
            <div className="de-filter-group mb-3">
              <label className="de-label">Description / Category</label>
              <input
                type="text"
                className="de-input"
                placeholder="e.g. Fuel, Maintenance, Toll, Driver Allowance"
                value={form.description}
                onChange={(e) => setFormField('description', e.target.value)}
              />
            </div>

            {/* Amount */}
            <div className="de-filter-group mb-3">
              <label className="de-label">
                Amount (Rs.) <span className="req">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                className={`de-input ${errors.amount ? 'error' : ''}`}
                placeholder="e.g. 5000.00"
                value={form.amount}
                onChange={(e) => setFormField('amount', e.target.value)}
              />
              {errors.amount && <div className="de-form-error">{errors.amount}</div>}
            </div>
          </div>
        </CModalBody>

        <CModalFooter>
          <button className="de-btn-reset" onClick={() => setModalVisible(false)} disabled={saving}>
            Cancel
          </button>
          <button className="de-btn-add" onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <CSpinner size="sm" style={{ marginRight: 6 }} /> Saving...
              </>
            ) : (
              <>
                <CIcon icon={cilCheckCircle} /> {editMode ? 'Update Expense' : 'Save Expense'}
              </>
            )}
          </button>
        </CModalFooter>
      </CModal>
    </div>
  )
}

export default DailyExpenses
