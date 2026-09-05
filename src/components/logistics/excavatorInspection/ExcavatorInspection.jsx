/**
 * Excavator Inspection & Checked By Management Page
 *
 * Provides comprehensive management for Excavator Inspection records:
 * - Paginated list (15 per page)
 * - Multi-criteria search & filtering:
 *     - Inspection date
 *     - Created date
 *     - Vehicle (Searchable dropdown with capacity & vehicle pill)
 *     - Person (Searchable dropdown with person code badge & name)
 *     - Uploaded Excel file / source (Searchable dropdown with fileType=PERSON_VEHICLE_DETAIL)
 * - Actions: Add, Edit, and Delete with SweetAlert2 confirmation
 * - Instant KPI metrics overview
 * - Full Dark & Light mode integration
 *
 * @module ExcavatorInspection
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
  cilUser,
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
  cilChevronLeft,
  cilChevronRight,
  cilCheckCircle,
  cilX,
  cilWarning,
  cilPeople,
} from '@coreui/icons'
import personVehicleDetailService from '../../../service/personVehicleDetailService'
import vehicleService from '../../../service/vehicleService'
import personService from '../../../service/personService'
import fileHistoryService from '../../../service/fileHistoryService'
import './ExcavatorInspection.css'

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 15

const EMPTY_FORM = {
  date: new Date().toISOString().split('T')[0],
  personId: '',
  personCode: '',
  personName: '',
  vehicleId: '',
  vehicleNumber: '',
}

const ALL_OPTION = { value: '', label: 'All' }

// ─── React-Select Styling Helper ──────────────────────────────────────────────
const getSelectStyles = (isDark) => ({
  control: (base, state) => ({
    ...base,
    minHeight: '42px',
    height: '42px',
    borderRadius: '8px',
    borderColor: state.isFocused ? '#7c3aed' : isDark ? '#334155' : '#cbd5e1',
    boxShadow: state.isFocused ? '0 0 0 3px rgba(124, 58, 237, 0.2)' : 'none',
    fontSize: '0.875rem',
    backgroundColor: isDark ? '#0f172a' : '#ffffff',
    color: isDark ? '#f8fafc' : '#0f172a',
    cursor: 'pointer',
    '&:hover': { borderColor: '#7c3aed' },
  }),
  menuPortal: (base) => ({ ...base, zIndex: 99999 }),
  menu: (base) => ({
    ...base,
    borderRadius: '10px',
    minWidth: '100%',
    width: '100%',
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
      ? '#7c3aed'
      : state.isFocused
        ? isDark
          ? '#1e293b'
          : '#f5f3ff'
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
    overflow: 'hidden',
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
    '&:hover': { color: '#7c3aed' },
  }),
  clearIndicator: (base) => ({
    ...base,
    color: isDark ? '#94a3b8' : '#64748b',
    '&:hover': { color: '#ef4444' },
  }),
})

// ─── Format Helpers ───────────────────────────────────────────────────────────
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

// ─── Custom Filter Option for React-Select ───────────────────────────────────
const customFilterOption = (candidate, input) => {
  if (!input || !input.trim()) return true
  const q = input.toLowerCase().trim()
  const data = candidate.data || {}
  const raw = data.raw || {}
  const label = String(candidate.label || '').toLowerCase()
  const value = String(candidate.value || '').toLowerCase()
  const num = String(
    data.vehicleNumber || raw.vehicleNumber || data.number || raw.number || '',
  ).toLowerCase()
  const driver = String(data.driverName || raw.driverName || '').toLowerCase()
  const cap = String(data.capacity || raw.capacity || '').toLowerCase()
  const code = String(
    data.personCode || raw.personCode || data.code || raw.code || '',
  ).toLowerCase()
  const name = String(data.personName || raw.name || raw.personName || '').toLowerCase()
  const pType = String(
    data.personType || raw.personType || data.personTypeLabel || raw.type || '',
  ).toLowerCase()
  const fileName = String(data.fileName || raw.fileName || '').toLowerCase()

  return (
    label.includes(q) ||
    value.includes(q) ||
    num.includes(q) ||
    driver.includes(q) ||
    cap.includes(q) ||
    code.includes(q) ||
    name.includes(q) ||
    pType.includes(q) ||
    fileName.includes(q)
  )
}

// ─── Option Formatters ────────────────────────────────────────────────────────
const formatVehicleOption = (v) => {
  if (!v) return null
  const rawId = v.id ?? v.vehicleId ?? null
  const num =
    v.vehicleNumber ||
    v.number ||
    v.vehicleNo ||
    v.registrationNumber ||
    (rawId ? `Vehicle #${rawId}` : '')
  const cap = v.capacity ? `${v.capacity}cube` : ''
  const driver = v.driverName || v.driver || ''

  return {
    value: rawId ? String(rawId) : num,
    id: rawId,
    vehicleId: rawId,
    vehicleNumber: num,
    label: cap ? `${num} (${cap})` : num || `Vehicle #${rawId}`,
    capacity: v.capacity,
    driverName: driver,
    raw: v,
  }
}

const CustomVehicleOption = (props) => {
  const { data, isSelected } = props
  return (
    <components.Option {...props}>
      <div className="d-flex align-items-center justify-content-between gap-2">
        <div className="d-flex align-items-center gap-2" style={{ minWidth: 0, flex: 1 }}>
          <CIcon
            icon={cilTruck}
            size="sm"
            style={{ color: isSelected ? '#ffffff' : '#7c3aed', flexShrink: 0 }}
          />
          <span
            style={{
              fontWeight: 600,
              fontSize: '0.86rem',
              color: isSelected ? '#ffffff' : 'inherit',
            }}
          >
            {data.vehicleNumber || data.label}
          </span>
          {data.capacity && (
            <span
              style={{
                fontSize: '0.75rem',
                color: isSelected ? 'rgba(255, 255, 255, 0.85)' : '#64748b',
              }}
            >
              ({data.capacity}cube)
            </span>
          )}
        </div>
        {data.driverName && (
          <span
            style={{
              fontSize: '0.74rem',
              color: isSelected ? 'rgba(255, 255, 255, 0.85)' : '#94a3b8',
              whiteSpace: 'nowrap',
            }}
          >
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
        <CIcon icon={cilTruck} size="sm" style={{ color: '#7c3aed', flexShrink: 0 }} />
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontWeight: 600,
            fontSize: '0.84rem',
            color: 'inherit',
          }}
        >
          {props.data.vehicleNumber || props.data.label}
        </span>
      </span>
    </components.SingleValue>
  )
}

const formatPersonTypeLabel = (type) => {
  if (!type) return ''
  if (type === 'MOUNT_OWNER') return 'Mount Owner'
  if (type === 'EXCAVATOR_OWNER') return 'Excavator Owner'
  return String(type).replace(/_/g, ' ')
}

const formatPersonOption = (p) => {
  if (!p) return null
  const rawId = p.id ?? p.personId ?? null
  const code = p.personCode || p.code || (rawId ? `PER#${rawId}` : '')
  const name = p.name || p.personName || ''
  const type = p.personType || p.type || ''
  const typeLabel = formatPersonTypeLabel(type)

  // Concat person type with name and code:
  // e.g. "PER000015 - Gamini Perera (Excavator Owner)"
  const parts = []
  if (code) parts.push(code)
  if (name) parts.push(name)
  let displayLabel = parts.join(' - ') || (rawId ? `Person #${rawId}` : '')
  if (typeLabel) {
    displayLabel = displayLabel ? `${displayLabel} (${typeLabel})` : typeLabel
  }

  return {
    value: rawId ? String(rawId) : code,
    id: rawId,
    personId: rawId,
    personCode: code,
    personName: name,
    personType: type,
    personTypeLabel: typeLabel,
    label: displayLabel,
    raw: p,
  }
}

const CustomPersonOption = (props) => {
  const { data, isSelected } = props
  return (
    <components.Option {...props}>
      <div className="d-flex align-items-center justify-content-between gap-2">
        <div className="d-flex align-items-center gap-2" style={{ minWidth: 0, flex: 1 }}>
          <CIcon
            icon={cilUser}
            size="sm"
            style={{ color: isSelected ? '#ffffff' : '#7c3aed', flexShrink: 0 }}
          />
          <span
            style={{
              fontWeight: 600,
              fontSize: '0.86rem',
              color: isSelected ? '#ffffff' : 'inherit',
            }}
          >
            {data.personCode && data.personName
              ? `${data.personCode} - ${data.personName}`
              : data.label}
          </span>
          {data.personTypeLabel && (
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 600,
                padding: '0.15rem 0.45rem',
                borderRadius: '12px',
                backgroundColor: isSelected
                  ? 'rgba(255, 255, 255, 0.25)'
                  : data.personType === 'EXCAVATOR_OWNER'
                    ? '#f3e8ff'
                    : '#e0f2fe',
                color: isSelected
                  ? '#ffffff'
                  : data.personType === 'EXCAVATOR_OWNER'
                    ? '#7c3aed'
                    : '#0369a1',
                border: isSelected
                  ? '1px solid rgba(255, 255, 255, 0.4)'
                  : data.personType === 'EXCAVATOR_OWNER'
                    ? '1px solid #ddd6fe'
                    : '1px solid #bae6fd',
                whiteSpace: 'nowrap',
              }}
            >
              {data.personTypeLabel}
            </span>
          )}
        </div>
      </div>
    </components.Option>
  )
}

const CustomPersonSingleValue = (props) => {
  return (
    <components.SingleValue {...props}>
      <span
        className="d-inline-flex align-items-center gap-1"
        style={{ maxWidth: '100%', overflow: 'hidden' }}
      >
        <CIcon icon={cilUser} size="sm" style={{ color: '#7c3aed', flexShrink: 0 }} />
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontWeight: 600,
            fontSize: '0.84rem',
            color: 'inherit',
          }}
        >
          {props.data.label}
        </span>
      </span>
    </components.SingleValue>
  )
}

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

const CustomExcelSingleValue = (props) => {
  return (
    <components.SingleValue {...props}>
      <span
        className="d-inline-flex align-items-center gap-1"
        style={{ maxWidth: '100%', overflow: 'hidden' }}
      >
        <CIcon icon={cilFile} size="sm" style={{ color: '#7c3aed', flexShrink: 0 }} />
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontWeight: 600,
            fontSize: '0.84rem',
            color: 'inherit',
          }}
        >
          {props.data.fileName || props.data.label}
        </span>
      </span>
    </components.SingleValue>
  )
}

const CustomExcelOption = (props) => {
  const { data, isSelected } = props
  return (
    <components.Option {...props}>
      <div className="d-flex align-items-center justify-content-between gap-3">
        <div className="d-flex align-items-center gap-2" style={{ minWidth: 0, flex: 1 }}>
          <CIcon
            icon={cilFile}
            size="sm"
            style={{ color: isSelected ? '#ffffff' : '#7c3aed', flexShrink: 0 }}
          />
          <span
            style={{
              fontSize: '0.84rem',
              fontWeight: 600,
              whiteSpace: 'normal',
              wordBreak: 'break-all',
              color: isSelected ? '#ffffff' : 'inherit',
            }}
          >
            {data.fileName || data.label}
          </span>
        </div>
        {data.uploadedDate && (
          <span
            style={{
              fontSize: '0.74rem',
              color: isSelected ? 'rgba(255, 255, 255, 0.85)' : '#94a3b8',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {data.uploadedDate}
          </span>
        )}
      </div>
    </components.Option>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────
const ExcavatorInspection = () => {
  // ── Theme Detection (Reactively synced with data-coreui-theme attribute) ────
  const [isDark, setIsDark] = useState(
    () =>
      typeof document !== 'undefined' &&
      document.documentElement.getAttribute('data-coreui-theme') === 'dark',
  )

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(
        typeof document !== 'undefined' &&
          document.documentElement.getAttribute('data-coreui-theme') === 'dark',
      )
    }
    checkTheme()
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-coreui-theme'],
    })
    return () => observer.disconnect()
  }, [])

  const selectStyles = useMemo(() => getSelectStyles(isDark), [isDark])

  // ─── Filters State ──────────────────────────────────────────────────────────
  const [dateFilter, setDateFilter] = useState('')
  const [createdDateFilter, setCreatedDateFilter] = useState('')
  const [selectedVehicle, setSelectedVehicle] = useState(null)
  const [selectedPerson, setSelectedPerson] = useState(null)
  const [selectedExcel, setSelectedExcel] = useState(null)

  // ─── Dropdown Options ───────────────────────────────────────────────────────
  const [vehicleOptions, setVehicleOptions] = useState([])
  const [personOptions, setPersonOptions] = useState([])
  const [excelOptions, setExcelOptions] = useState([])

  // ─── Table Data & Pagination ────────────────────────────────────────────────
  const [inspectionsList, setInspectionsList] = useState([])
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
  const [formPerson, setFormPerson] = useState(null)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const abortRef = useRef(null)
  const allExcelOptionsRef = useRef([])
  const excelSearchTimerRef = useRef(null)

  // ─── Fetch Initial Options ──────────────────────────────────────────────────
  useEffect(() => {
    const loadInitialOptions = async () => {
      try {
        const [vehiclesData, personsData, filesData] = await Promise.allSettled([
          vehicleService.searchVehicles(''),
          personService.getPersons({ size: 100, sort: 'id,desc' }),
          fileHistoryService.getFilesByFileType('PERSON_VEHICLE_DETAIL', ''),
        ])

        if (vehiclesData.status === 'fulfilled' && Array.isArray(vehiclesData.value)) {
          setVehicleOptions(vehiclesData.value.map(formatVehicleOption).filter(Boolean))
        }

        if (personsData.status === 'fulfilled') {
          const rawPersons = personsData.value?.content || personsData.value || []
          if (Array.isArray(rawPersons)) {
            setPersonOptions(rawPersons.map(formatPersonOption).filter(Boolean))
          }
        }

        if (filesData.status === 'fulfilled' && Array.isArray(filesData.value)) {
          const formattedFiles = filesData.value.map(formatExcelOption).filter(Boolean)
          allExcelOptionsRef.current = formattedFiles
          setExcelOptions(formattedFiles)
        }
      } catch (err) {
        console.warn('Error loading initial dropdown options:', err)
      }
    }

    loadInitialOptions()
  }, [])

  // ─── Live Vehicle Search Binder ─────────────────────────────────────────────
  const handleVehicleSearch = useCallback(async (inputValue) => {
    try {
      const data = await vehicleService.searchVehicles(inputValue || '')
      if (Array.isArray(data)) {
        setVehicleOptions(data.map(formatVehicleOption).filter(Boolean))
      }
    } catch (err) {
      console.warn('Vehicle search error:', err)
    }
  }, [])

  // ─── Live Person Search Binder ──────────────────────────────────────────────
  const handlePersonSearch = useCallback(async (inputValue) => {
    try {
      const data = await personService.getPersons({ search: inputValue || '', size: 50 })
      const raw = data?.content || data || []
      if (Array.isArray(raw)) {
        setPersonOptions(raw.map(formatPersonOption).filter(Boolean))
      }
    } catch (err) {
      console.warn('Person search error:', err)
    }
  }, [])

  // ─── Live Uploaded Excel Search Binder ──────────────────────────────────────
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
        const data = await fileHistoryService.getFilesByFileType('PERSON_VEHICLE_DETAIL', query)
        if (Array.isArray(data) && data.length > 0) {
          setExcelOptions(data.map(formatExcelOption).filter(Boolean))
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
      }
    }, 300)
  }, [])

  // ─── Fetch Paginated Inspections ────────────────────────────────────────────
  const fetchInspections = useCallback(
    async (pageToLoad = currentPage) => {
      if (abortRef.current) {
        abortRef.current.abort()
      }
      abortRef.current = new AbortController()

      setLoading(true)
      try {
        const params = {
          date: dateFilter || undefined,
          createdDate: createdDateFilter || undefined,
          vehicleId: selectedVehicle?.id ?? selectedVehicle?.vehicleId ?? undefined,
          personId: selectedPerson?.id ?? selectedPerson?.personId ?? undefined,
          fileHistoryId: selectedExcel?.id ?? selectedExcel?.fileHistoryId ?? undefined,
          page: pageToLoad,
          size: PAGE_SIZE,
          sort: 'id,desc',
        }

        const res = await personVehicleDetailService.getPersonVehicleDetails(
          params,
          abortRef.current.signal,
        )

        const content = res?.content || (Array.isArray(res) ? res : [])
        setInspectionsList(content)
        setTotalElements(res?.totalElements ?? content.length)
        setTotalPages(res?.totalPages ?? Math.max(1, Math.ceil(content.length / PAGE_SIZE)))
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Fetch excavator inspection error:', err)
          Swal.fire({
            icon: 'error',
            title: 'Error Fetching Records',
            text: err.message || 'Unable to load excavator inspection records.',
            confirmButtonColor: '#7c3aed',
          })
        }
      } finally {
        setLoading(false)
      }
    },
    [currentPage, dateFilter, createdDateFilter, selectedVehicle, selectedPerson, selectedExcel],
  )

  useEffect(() => {
    setCurrentPage(0)
    fetchInspections(0)
  }, [dateFilter, createdDateFilter, selectedVehicle, selectedPerson, selectedExcel])

  const handlePageChange = (newPage) => {
    if (newPage >= 0 && newPage < totalPages && newPage !== currentPage) {
      setCurrentPage(newPage)
      fetchInspections(newPage)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // ─── Clear All Filters ──────────────────────────────────────────────────────
  const handleClearFilters = () => {
    setDateFilter('')
    setCreatedDateFilter('')
    setSelectedVehicle(null)
    setSelectedPerson(null)
    setSelectedExcel(null)
    setCurrentPage(0)
  }

  const hasActiveFilters = Boolean(
    dateFilter || createdDateFilter || selectedVehicle || selectedPerson || selectedExcel,
  )

  // ─── Modal Open Handlers ────────────────────────────────────────────────────
  const handleOpenCreateModal = () => {
    setEditMode(false)
    setSelectedId(null)
    setForm(EMPTY_FORM)
    setFormVehicle(null)
    setFormPerson(null)
    setErrors({})
    setModalVisible(true)
  }

  const handleOpenEditModal = (item) => {
    setEditMode(true)
    setSelectedId(item.id)

    const rawPerson = item.person
    const rawVehicle = item.vehicle

    const personOpt = rawPerson ? formatPersonOption(rawPerson) : null
    const vehicleOpt = rawVehicle ? formatVehicleOption(rawVehicle) : null

    setForm({
      date: item.date || new Date().toISOString().split('T')[0],
      personId: rawPerson?.id || '',
      personCode: rawPerson?.personCode || '',
      personName: rawPerson?.name || '',
      vehicleId: rawVehicle?.id || '',
      vehicleNumber: rawVehicle?.vehicleNumber || '',
    })

    setFormPerson(personOpt)
    setFormVehicle(vehicleOpt)
    setErrors({})
    setModalVisible(true)
  }

  // ─── Modal Save Handler ─────────────────────────────────────────────────────
  const handleSave = async () => {
    const errs = {}
    if (!form.date) errs.date = 'Inspection date is required'
    if (!formPerson || !formPerson.id) errs.person = 'Person is required'
    if (!formVehicle || !formVehicle.id) errs.vehicle = 'Vehicle is required'

    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    setSaving(true)
    try {
      const payload = {
        date: form.date,
        personId: formPerson.id,
        vehicleId: formVehicle.id,
      }

      if (editMode) {
        await personVehicleDetailService.updatePersonVehicleDetail(selectedId, payload)
        Swal.fire({
          icon: 'success',
          title: 'Record Updated!',
          text: 'Excavator inspection record was updated successfully.',
          confirmButtonColor: '#7c3aed',
          timer: 2500,
        })
      } else {
        await personVehicleDetailService.createPersonVehicleDetail(payload)
        Swal.fire({
          icon: 'success',
          title: 'Record Created!',
          text: 'New excavator inspection record was created successfully.',
          confirmButtonColor: '#7c3aed',
          timer: 2500,
        })
      }

      setModalVisible(false)
      fetchInspections(currentPage)
    } catch (err) {
      console.error('Save error:', err)
      Swal.fire({
        icon: 'error',
        title: 'Save Failed',
        text: err.message || 'Unable to save record. Please check the details and try again.',
        confirmButtonColor: '#dc2626',
      })
    } finally {
      setSaving(false)
    }
  }

  // ─── Delete Handler ─────────────────────────────────────────────────────────
  const handleDelete = (item) => {
    const personDesc = item.person?.personCode
      ? `${item.person.personCode} (${item.person.name || ''})`
      : 'this person'
    const vehDesc = item.vehicle?.vehicleNumber || 'this vehicle'

    Swal.fire({
      title: 'Delete Record?',
      html: `Are you sure you want to delete the assignment for <strong>${personDesc}</strong> with vehicle <strong>${vehDesc}</strong> on <strong>${formatDate(item.date)}</strong>?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'Cancel',
      focusCancel: true,
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await personVehicleDetailService.deletePersonVehicleDetail(item.id)
          Swal.fire({
            icon: 'success',
            title: 'Deleted!',
            text: 'The inspection record has been deleted.',
            confirmButtonColor: '#7c3aed',
            timer: 2000,
          })
          fetchInspections(currentPage)
        } catch (err) {
          console.error('Delete error:', err)
          Swal.fire({
            icon: 'error',
            title: 'Delete Failed',
            text: err.message || 'Unable to delete the record.',
            confirmButtonColor: '#dc2626',
          })
        }
      }
    })
  }

  return (
    <div className="ei-page">
      {/* ─── Page Header ──────────────────────────────────────────────────────── */}
      <div className="ei-page-header">
        <div className="ei-header-left">
          <div className="ei-header-icon">
            <CIcon icon={cilUser} size="xl" />
          </div>
          <div>
            <h1 className="ei-page-title">Excavator Inspection &amp; Checked By</h1>
            <p className="ei-page-subtitle">
              Manage excavator inspection assignments, checked-by persons, and batch upload
              histories
            </p>
          </div>
        </div>

        <div className="ei-header-actions">
          <button className="ei-btn-add" onClick={handleOpenCreateModal} id="btn-ei-add-record">
            <CIcon icon={cilPlus} />
            <span>New Record</span>
          </button>
        </div>
      </div>

      {/* ─── Filter Panel ─────────────────────────────────────────────────────── */}
      <CCard className="ei-card ei-filter-card">
        <CCardHeader className="ei-card-header d-flex align-items-center justify-content-between">
          <div className="ei-card-title">
            <CIcon icon={cilFilter} style={{ color: '#7c3aed' }} />
            <span>Filter Inspection Records</span>
          </div>
          {hasActiveFilters && (
            <button
              className="ei-btn-reset-filters"
              onClick={handleClearFilters}
              id="btn-ei-clear-filters"
            >
              <CIcon icon={cilReload} size="sm" /> Clear All Filters
            </button>
          )}
        </CCardHeader>

        <CCardBody className="p-3">
          <div className="ei-filter-grid">
            {/* 1. Inspection Date */}
            <div className="ei-filter-group">
              <label className="ei-label">
                <CIcon icon={cilCalendar} size="sm" /> Inspection Date
              </label>
              <input
                type="date"
                className="ei-input"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                id="filter-ei-date"
              />
            </div>

            {/* 2. Vehicle (Searchable Dropdown) */}
            <div className="ei-filter-group">
              <label className="ei-label">
                <CIcon icon={cilTruck} size="sm" /> Vehicle
              </label>
              <Select
                isClearable
                isSearchable
                options={[ALL_OPTION, ...vehicleOptions]}
                value={selectedVehicle || ALL_OPTION}
                onChange={(opt) => setSelectedVehicle(opt?.value ? opt : null)}
                onInputChange={(val, { action }) => {
                  if (action === 'input-change') handleVehicleSearch(val)
                }}
                filterOption={customFilterOption}
                components={{ Option: CustomVehicleOption, SingleValue: CustomVehicleSingleValue }}
                placeholder="Search vehicle..."
                styles={selectStyles}
                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                id="filter-ei-vehicle"
                aria-label="Filter by vehicle"
              />
            </div>

            {/* 3. Checked By (Person) (Searchable Dropdown) */}
            <div className="ei-filter-group">
              <label className="ei-label">
                <CIcon icon={cilUser} size="sm" /> Checked By (Person)
              </label>
              <Select
                isClearable
                isSearchable
                options={[ALL_OPTION, ...personOptions]}
                value={selectedPerson || ALL_OPTION}
                onChange={(opt) => setSelectedPerson(opt?.value ? opt : null)}
                onInputChange={(val, { action }) => {
                  if (action === 'input-change') handlePersonSearch(val)
                }}
                filterOption={customFilterOption}
                components={{ Option: CustomPersonOption, SingleValue: CustomPersonSingleValue }}
                placeholder="Search person code / name..."
                styles={selectStyles}
                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                id="filter-ei-person"
                aria-label="Filter by checked by"
              />
            </div>

            {/* 4. Created Date */}
            <div className="ei-filter-group">
              <label className="ei-label">
                <CIcon icon={cilCalendar} size="sm" /> Created Date
              </label>
              <input
                type="date"
                className="ei-input"
                value={createdDateFilter}
                onChange={(e) => setCreatedDateFilter(e.target.value)}
                id="filter-ei-created-date"
              />
            </div>

            {/* 5. Uploaded Excel */}
            <div className="ei-filter-group">
              <label className="ei-label">
                <CIcon icon={cilFile} size="sm" /> Uploaded Excel
              </label>
              <Select
                isClearable
                isSearchable
                options={[ALL_OPTION, ...excelOptions]}
                value={selectedExcel || ALL_OPTION}
                onChange={(opt) => setSelectedExcel(opt?.value ? opt : null)}
                onInputChange={handleExcelSearch}
                filterOption={customFilterOption}
                components={{ Option: CustomExcelOption, SingleValue: CustomExcelSingleValue }}
                placeholder="Search upload batch / file..."
                styles={selectStyles}
                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                id="filter-ei-excel"
                aria-label="Filter by uploaded excel"
                noOptionsMessage={() => 'No Excel files found'}
              />
            </div>
          </div>
        </CCardBody>
      </CCard>

      {/* ─── Records Table Card ───────────────────────────────────────────────── */}
      <CCard className="ei-card">
        <CCardHeader className="ei-card-header d-flex align-items-center justify-content-between">
          <div className="ei-card-title">
            <CIcon icon={cilUser} style={{ color: '#7c3aed' }} />
            <span>Inspection Assignments ({totalElements} Records)</span>
          </div>
          <button
            className="ei-btn-reset-filters"
            onClick={() => fetchInspections(currentPage)}
            disabled={loading}
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
            id="btn-ei-refresh"
            title="Refresh records"
          >
            <CIcon icon={cilReload} size="sm" className={loading ? 'ei-spin' : ''} /> Refresh
          </button>
        </CCardHeader>

        <CCardBody className="ei-card-body p-0">
          <div className="ei-table-wrap">
            <table className="ei-table">
              <thead>
                <tr>
                  <th style={{ width: 48 }}>#</th>
                  <th style={{ width: 130 }}>Date</th>
                  <th style={{ minWidth: 220 }}>Checked By (Person)</th>
                  <th style={{ minWidth: 170 }}>Vehicle Number</th>
                  <th style={{ width: 170 }}>Created Date</th>
                  <th className="ei-excel-col">Uploaded Excel / Source</th>
                  <th style={{ width: 110, textAlign: 'center' }}>
                    <div className="d-flex align-items-center justify-content-center gap-1">
                      <span>Actions</span>
                      <button
                        type="button"
                        className="btn btn-link p-0 text-decoration-none"
                        onClick={() => fetchInspections(currentPage)}
                        disabled={loading}
                        title="Refresh records"
                        style={{ color: '#7c3aed', lineHeight: 1 }}
                      >
                        <CIcon icon={cilReload} size="sm" className={loading ? 'ei-spin' : ''} />
                      </button>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-5">
                      <CSpinner style={{ color: '#7c3aed' }} />
                      <div className="mt-2 text-muted" style={{ fontSize: '0.85rem' }}>
                        Loading inspection records…
                      </div>
                    </td>
                  </tr>
                ) : inspectionsList.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="ei-empty">
                        <div className="ei-empty-icon">
                          <CIcon icon={cilSearch} size="xl" />
                        </div>
                        <h3>No Records Found</h3>
                        <p>
                          {hasActiveFilters
                            ? 'No inspection records match the current filter criteria. Try changing or clearing your filters.'
                            : 'No excavator inspection records available. Click "New Record" or upload an Excel sheet to get started.'}
                        </p>
                        {hasActiveFilters && (
                          <button
                            className="ei-btn-reset-filters mt-3"
                            onClick={handleClearFilters}
                          >
                            <CIcon icon={cilReload} size="sm" /> Clear Filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  inspectionsList.map((item, idx) => (
                    <tr key={item.id || idx}>
                      <td className="ei-td-num">{currentPage * PAGE_SIZE + idx + 1}</td>
                      <td>
                        <span className="ei-date-text">
                          <CIcon
                            icon={cilCalendar}
                            size="sm"
                            style={{ color: '#64748b', marginRight: 4 }}
                          />
                          {formatDate(item.date)}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <span className="ei-person-code-badge">
                            <CIcon icon={cilUser} size="sm" style={{ marginRight: 4 }} />
                            {item.person?.personCode || '—'}
                          </span>
                          <span className="ei-person-name">{item.person?.name || '—'}</span>
                          {item.person?.personType && (
                            <span
                              style={{
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                padding: '0.12rem 0.4rem',
                                borderRadius: '10px',
                                backgroundColor:
                                  item.person.personType === 'EXCAVATOR_OWNER'
                                    ? '#f3e8ff'
                                    : '#e0f2fe',
                                color:
                                  item.person.personType === 'EXCAVATOR_OWNER'
                                    ? '#7c3aed'
                                    : '#0369a1',
                                border:
                                  item.person.personType === 'EXCAVATOR_OWNER'
                                    ? '1px solid #ddd6fe'
                                    : '1px solid #bae6fd',
                              }}
                            >
                              {formatPersonTypeLabel(item.person.personType)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="ei-veh-pill">
                          <CIcon icon={cilTruck} size="sm" style={{ color: '#7c3aed' }} />
                          {item.vehicle?.vehicleNumber || '—'}
                        </span>
                      </td>
                      <td>
                        <span className="ei-created-date">{formatDateTime(item.createdDate)}</span>
                      </td>
                      <td className="ei-excel-col">
                        {item.fileHistory?.fileName || item.fileName ? (
                          <span
                            className="ei-excel-badge"
                            title={item.fileHistory?.fileName || item.fileName}
                          >
                            <CIcon
                              icon={cilDescription}
                              size="sm"
                              className="mt-1 flex-shrink-0"
                            />
                            <span className="ei-excel-badge-text">
                              {item.fileHistory?.fileName || item.fileName}
                            </span>
                          </span>
                        ) : (
                          <span className="ei-manual-pill">
                            <CIcon icon={cilPencil} size="sm" style={{ marginRight: 4 }} />
                            Manual Entry
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div className="ei-action-btns">
                          <button
                            className="ei-btn-action-edit"
                            onClick={() => handleOpenEditModal(item)}
                            title="Edit record"
                            id={`btn-edit-ei-${item.id}`}
                          >
                            <CIcon icon={cilPencil} size="sm" />
                          </button>
                          <button
                            className="ei-btn-action-delete"
                            onClick={() => handleDelete(item)}
                            title="Delete record"
                            id={`btn-delete-ei-${item.id}`}
                          >
                            <CIcon icon={cilTrash} size="sm" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ─── Pagination Bar ───────────────────────────────────────────────── */}
          <div className="ei-pagination-bar">
            <span>
              Showing {totalElements === 0 ? 0 : currentPage * PAGE_SIZE + 1}–
              {Math.min((currentPage + 1) * PAGE_SIZE, totalElements)} of{' '}
              <strong>{totalElements}</strong> records
            </span>

            {totalPages > 1 && (
              <div className="ei-page-controls">
                <button
                  className="ei-page-btn"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 0}
                  id="btn-ei-prev-page"
                >
                  <CIcon icon={cilChevronLeft} size="sm" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i)
                  .filter((p) => Math.abs(p - currentPage) <= 2 || p === 0 || p === totalPages - 1)
                  .map((p, idx, arr) => {
                    const prevP = arr[idx - 1]
                    const showEllipsis = prevP !== undefined && p - prevP > 1
                    return (
                      <React.Fragment key={p}>
                        {showEllipsis && <span className="px-1 text-muted">…</span>}
                        <button
                          className={`ei-page-btn ${p === currentPage ? 'active' : ''}`}
                          onClick={() => handlePageChange(p)}
                        >
                          {p + 1}
                        </button>
                      </React.Fragment>
                    )
                  })}
                <button
                  className="ei-page-btn"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages - 1}
                  id="btn-ei-next-page"
                >
                  <CIcon icon={cilChevronRight} size="sm" />
                </button>
              </div>
            )}
          </div>
        </CCardBody>
      </CCard>

      {/* ─── Create & Edit Modal ──────────────────────────────────────────────── */}
      <CModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        backdrop="static"
        alignment="center"
        className="ei-modal"
      >
        <CModalHeader className="ei-modal-header">
          <CModalTitle className="ei-modal-title">
            <CIcon icon={editMode ? cilPencil : cilPlus} style={{ color: '#7c3aed' }} />
            <span>{editMode ? 'Edit Inspection Record' : 'Add Excavator Inspection Record'}</span>
          </CModalTitle>
        </CModalHeader>

        <CModalBody className="ei-modal-body">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSave()
            }}
          >
            {/* 1. Date */}
            <div className="mb-3">
              <label className="ei-modal-label required">Inspection Date</label>
              <input
                type="date"
                className={`form-control ei-modal-input ${errors.date ? 'is-invalid' : ''}`}
                value={form.date}
                onChange={(e) => {
                  setForm((f) => ({ ...f, date: e.target.value }))
                  if (errors.date) setErrors((errs) => ({ ...errs, date: null }))
                }}
                id="modal-ei-date"
              />
              {errors.date && <div className="invalid-feedback">{errors.date}</div>}
            </div>

            {/* 2. Person */}
            <div className="mb-3">
              <label className="ei-modal-label required">Checked By (Person)</label>
              <Select
                styles={selectStyles}
                options={personOptions}
                value={formPerson}
                onChange={(opt) => {
                  setFormPerson(opt)
                  setForm((f) => ({
                    ...f,
                    personId: opt?.id || '',
                    personCode: opt?.personCode || '',
                    personName: opt?.personName || '',
                  }))
                  if (errors.person) setErrors((errs) => ({ ...errs, person: null }))
                }}
                onInputChange={(val, { action }) => {
                  if (action === 'input-change') handlePersonSearch(val)
                }}
                filterOption={customFilterOption}
                components={{ Option: CustomPersonOption, SingleValue: CustomPersonSingleValue }}
                placeholder="Select person code or name..."
                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                isClearable
                id="modal-ei-person"
              />
              {errors.person && (
                <div className="text-danger mt-1" style={{ fontSize: '0.8rem' }}>
                  {errors.person}
                </div>
              )}
            </div>

            {/* 3. Vehicle */}
            <div className="mb-3">
              <label className="ei-modal-label required">Vehicle Number</label>
              <Select
                styles={selectStyles}
                options={vehicleOptions}
                value={formVehicle}
                onChange={(opt) => {
                  setFormVehicle(opt)
                  setForm((f) => ({
                    ...f,
                    vehicleId: opt?.id || '',
                    vehicleNumber: opt?.vehicleNumber || '',
                  }))
                  if (errors.vehicle) setErrors((errs) => ({ ...errs, vehicle: null }))
                }}
                onInputChange={(val, { action }) => {
                  if (action === 'input-change') handleVehicleSearch(val)
                }}
                filterOption={customFilterOption}
                components={{ Option: CustomVehicleOption, SingleValue: CustomVehicleSingleValue }}
                placeholder="Select vehicle number..."
                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                isClearable
                id="modal-ei-vehicle"
              />
              {errors.vehicle && (
                <div className="text-danger mt-1" style={{ fontSize: '0.8rem' }}>
                  {errors.vehicle}
                </div>
              )}
            </div>
          </form>
        </CModalBody>

        <CModalFooter className="ei-modal-footer">
          <button
            type="button"
            className="ei-btn-modal-cancel"
            onClick={() => setModalVisible(false)}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="ei-btn-modal-save"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <>
                <CSpinner size="sm" style={{ marginRight: 6 }} /> Saving…
              </>
            ) : editMode ? (
              'Save Changes'
            ) : (
              'Create Record'
            )}
          </button>
        </CModalFooter>
      </CModal>
    </div>
  )
}

export default ExcavatorInspection
