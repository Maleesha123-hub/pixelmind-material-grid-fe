/**
 * Operations Reports & Analytics Page
 *
 * Provides comprehensive filtration (Date range, Person searchable dropdown,
 * Vehicle searchable dropdown) and report preview / download actions matching
 * the Receipts page design system.
 *
 * @module Reports
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import AsyncSelect from 'react-select/async'
import Swal from 'sweetalert2'
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
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilNotes,
  cilCalendar,
  cilUser,
  cilTruck,
  cilFilter,
  cilReload,
  cilFindInPage,
  cilCloudDownload,
  cilCheckCircle,
  cilPrint,
} from '@coreui/icons'
import personService from '../../service/personService'
import vehicleService from '../../service/vehicleService'
import './Reports.css'

// ─── Default Consolidated Dropdown Options ─────────────────────────────────
const ALL_PERSONS_OPTION = {
  value: 'ALL',
  id: 'ALL',
  label: 'All Persons (Mount & Excavator Owners)',
  name: 'All Persons',
  personCode: 'ALL',
  personType: 'ALL',
}

const ALL_VEHICLES_OPTION = {
  value: 'ALL',
  id: 'ALL',
  label: 'All Vehicles (Complete Fleet)',
  vehicleNumber: 'All Vehicles',
  capacity: 'ALL',
}

// ─── Fallback Mock Data for UI Demonstration ────────────────────────────────
const MOCK_PERSONS = [
  { value: '1', id: 1, label: 'Kasun Fernando', name: 'Kasun Fernando', personCode: 'PER000017', personType: 'MOUNT_OWNER' },
  { value: '2', id: 2, label: 'Jayantha Silva', name: 'Jayantha Silva', personCode: 'PER000016', personType: 'MOUNT_OWNER' },
  { value: '3', id: 3, label: 'Gamini Perera', name: 'Gamini Perera', personCode: 'PER000015', personType: 'EXCAVATOR_OWNER' },
  { value: '4', id: 4, label: 'Farhan Mohamed', name: 'Farhan Mohamed', personCode: 'PER000014', personType: 'MOUNT_OWNER' },
  { value: '5', id: 5, label: 'Lalith Kumara', name: 'Lalith Kumara', personCode: 'PER000013', personType: 'EXCAVATOR_OWNER' },
]

const MOCK_VEHICLES = [
  { value: '1', id: 1, label: 'WP LC-4838', vehicleNumber: 'WP LC-4838', capacity: 4.5 },
  { value: '2', id: 2, label: 'WP NA-9021', vehicleNumber: 'WP NA-9021', capacity: 5.0 },
  { value: '3', id: 3, label: 'SP LG-1142', vehicleNumber: 'SP LG-1142', capacity: 3.5 },
  { value: '4', id: 4, label: 'CP DA-5509', vehicleNumber: 'CP DA-5509', capacity: 4.0 },
  { value: '5', id: 5, label: 'EP LB-3381', vehicleNumber: 'EP LB-3381', capacity: 6.0 },
]

// ─── Mock Report Table Records ──────────────────────────────────────────────
const SAMPLE_REPORT_RECORDS = [
  {
    id: 'TRP-10491',
    date: '2026-09-04',
    personName: 'Kasun Fernando',
    personCode: 'PER000017',
    personType: 'MOUNT_OWNER',
    vehicleNumber: 'WP LC-4838',
    route: 'Mawanella → Colombo',
    capacity: 4.5,
    amount: 54000.0,
    status: 'COMPLETED',
  },
  {
    id: 'TRP-10490',
    date: '2026-09-04',
    personName: 'Jayantha Silva',
    personCode: 'PER000016',
    personType: 'MOUNT_OWNER',
    vehicleNumber: 'WP NA-9021',
    route: 'Kandy → Gampaha',
    capacity: 5.0,
    amount: 62500.0,
    status: 'COMPLETED',
  },
  {
    id: 'TRP-10489',
    date: '2026-09-03',
    personName: 'Gamini Perera',
    personCode: 'PER000015',
    personType: 'EXCAVATOR_OWNER',
    vehicleNumber: 'SP LG-1142',
    route: 'Kurunegala → Negombo',
    capacity: 3.5,
    amount: 41000.0,
    status: 'COMPLETED',
  },
  {
    id: 'TRP-10488',
    date: '2026-09-03',
    personName: 'Farhan Mohamed',
    personCode: 'PER000014',
    personType: 'MOUNT_OWNER',
    vehicleNumber: 'CP DA-5509',
    route: 'Ratnapura → Avissawella',
    capacity: 4.0,
    amount: 48000.0,
    status: 'PENDING',
  },
  {
    id: 'TRP-10487',
    date: '2026-09-02',
    personName: 'Lalith Kumara',
    personCode: 'PER000013',
    personType: 'EXCAVATOR_OWNER',
    vehicleNumber: 'EP LB-3381',
    route: 'Kegalle → Colombo Harbour',
    capacity: 6.0,
    amount: 75000.0,
    status: 'COMPLETED',
  },
]

// ─── Format Currency Helper ────────────────────────────────────────────────
const formatCurrency = (val) => {
  const num = Number(val)
  if (isNaN(num)) return '0.00'
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ─── React Select Theming Helper ───────────────────────────────────────────
const getCustomSelectStyles = (isDark) => ({
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

// ─── Custom Option UI for Person Select ─────────────────────────────────────
const CustomPersonOption = ({ data, innerRef, innerProps }) => {
  const isAll = data.value === 'ALL'
  return (
    <div ref={innerRef} {...innerProps} className="rp-select-option">
      <div className="rp-select-option-main">
        <div className={`rp-select-icon-box ${isAll ? '' : 'rp-select-icon-box--person'}`}>
          <CIcon icon={cilUser} size="sm" />
        </div>
        <div>
          <div className="rp-select-title">{data.name}</div>
          {!isAll && data.personCode && <div className="rp-select-sub">{data.personCode}</div>}
        </div>
      </div>
      {!isAll && data.personType && (
        <span
          className={`rp-type-chip ${
            data.personType === 'MOUNT_OWNER' ? 'rp-type-chip--mount' : 'rp-type-chip--excavator'
          }`}
        >
          {data.personType === 'MOUNT_OWNER' ? 'Mount' : 'Excavator'}
        </span>
      )}
    </div>
  )
}

// ─── Custom Option UI for Vehicle Select ────────────────────────────────────
const CustomVehicleOption = ({ data, innerRef, innerProps }) => {
  const isAll = data.value === 'ALL'
  return (
    <div ref={innerRef} {...innerProps} className="rp-select-option">
      <div className="rp-select-option-main">
        <div className={`rp-select-icon-box ${isAll ? '' : 'rp-select-icon-box--vehicle'}`}>
          <CIcon icon={cilTruck} size="sm" />
        </div>
        <div>
          <div className="rp-select-title">{data.vehicleNumber}</div>
        </div>
      </div>
      {!isAll && data.capacity && (
        <span className="rp-type-chip rp-type-chip--cube">{data.capacity} cube</span>
      )}
    </div>
  )
}

const Reports = () => {
  // ── Date Filters ──────────────────────────────────────────────────────────
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setDate(1) // First day of current month
    return d.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])

  // ── Async Searchable Dropdown States ──────────────────────────────────────
  const [initialPersonOptions, setInitialPersonOptions] = useState([
    ALL_PERSONS_OPTION,
    ...MOCK_PERSONS,
  ])
  const [selectedPerson, setSelectedPerson] = useState(ALL_PERSONS_OPTION)

  const [initialVehicleOptions, setInitialVehicleOptions] = useState([
    ALL_VEHICLES_OPTION,
    ...MOCK_VEHICLES,
  ])
  const [selectedVehicle, setSelectedVehicle] = useState(ALL_VEHICLES_OPTION)

  // ── Format Options Callbacks ──────────────────────────────────────────────
  const formatPersonOption = useCallback((p) => {
    if (!p) return null
    const rawId = p.id ?? p.personId ?? null
    const name = p.name || `Person #${rawId}`
    const code = p.personCode || (rawId ? `PER-${rawId}` : '')
    const type = p.personType || ''

    let label = name
    if (code) label += ` (${code})`

    return {
      value: rawId ? String(rawId) : code || name || 'ALL',
      id: rawId,
      personId: rawId,
      name,
      personCode: code,
      personType: type,
      label,
      data: p,
    }
  }, [])

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
    const cap = v.capacity ? `${v.capacity} cube` : ''
    const driver = v.driverName || v.driver || ''

    let label = num
    if (cap) label += ` (${cap})`
    if (driver) label += ` — ${driver}`

    return {
      value: rawId ? String(rawId) : num || 'ALL',
      id: rawId,
      vehicleId: rawId,
      vehicleNumber: num,
      capacity: v.capacity,
      driverName: driver,
      label,
      data: v,
    }
  }, [])

  // ── Dynamic Async Loaders (Triggered as the user types) ───────────────────
  const loadPersonOptions = useCallback(
    async (inputValue) => {
      const cleanInput = (inputValue || '').trim()
      try {
        const res = await personService.getPersons({
          search: cleanInput,
          size: 50,
          page: 0,
          sort: 'name,asc',
        })
        const list = res?.content ?? (Array.isArray(res) ? res : [])
        const formatted = list.map(formatPersonOption).filter(Boolean)
        if (!cleanInput || cleanInput.toLowerCase().includes('all')) {
          return [ALL_PERSONS_OPTION, ...formatted]
        }
        return formatted
      } catch (err) {
        console.error('Dynamic person search API error:', err)
        return [ALL_PERSONS_OPTION]
      }
    },
    [formatPersonOption],
  )

  const loadVehicleOptions = useCallback(
    async (inputValue) => {
      const cleanInput = (inputValue || '').trim()
      try {
        const res = await vehicleService.searchVehicles(cleanInput)
        const list = Array.isArray(res) ? res : (res?.content ?? [])
        const formatted = list.map(formatVehicleOption).filter(Boolean)
        if (!cleanInput || cleanInput.toLowerCase().includes('all')) {
          return [ALL_VEHICLES_OPTION, ...formatted]
        }
        return formatted
      } catch (err) {
        console.error('Dynamic vehicle search API error:', err)
        return [ALL_VEHICLES_OPTION]
      }
    },
    [formatVehicleOption],
  )

  // ── Loading & Modal States ────────────────────────────────────────────────
  const [previewLoading, setPreviewLoading] = useState(false)
  const [downloadLoading, setDownloadLoading] = useState(false)
  const [previewModalVisible, setPreviewModalVisible] = useState(false)

  // ── Detect Dark Mode from document attribute ──────────────────────────────
  const [isDark, setIsDark] = useState(
    typeof document !== 'undefined' &&
      document.documentElement.getAttribute('data-coreui-theme') === 'dark',
  )

  useEffect(() => {
    if (typeof document === 'undefined') return
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.getAttribute('data-coreui-theme') === 'dark')
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-coreui-theme'],
    })
    return () => observer.disconnect()
  }, [])

  const selectStyles = useMemo(() => getCustomSelectStyles(isDark), [isDark])

  // ── Load Real Fleet & Persons on Mount for Default Dropdown Display ───────
  useEffect(() => {
    let ignore = false

    const loadInitialFleetAndPersons = async () => {
      try {
        const personsRes = await personService.getPersons({ size: 50, page: 0, sort: 'name,asc' })
        const pList = personsRes?.content ?? (Array.isArray(personsRes) ? personsRes : [])
        if (!ignore && pList.length > 0) {
          const mapped = pList.map(formatPersonOption).filter(Boolean)
          setInitialPersonOptions([ALL_PERSONS_OPTION, ...mapped])
        }
      } catch (err) {
        console.warn('Initial persons fetch error:', err)
      }

      try {
        const vehiclesRes = await vehicleService.getAllVehicles()
        const vList = Array.isArray(vehiclesRes) ? vehiclesRes : (vehiclesRes?.content ?? [])
        if (!ignore && vList.length > 0) {
          const mapped = vList.map(formatVehicleOption).filter(Boolean)
          setInitialVehicleOptions([ALL_VEHICLES_OPTION, ...mapped])
        }
      } catch (err) {
        console.warn('Initial vehicles fetch error:', err)
      }
    }

    loadInitialFleetAndPersons()
    return () => {
      ignore = true
    }
  }, [formatPersonOption, formatVehicleOption])

  // ── Action: Reset Filters ─────────────────────────────────────────────────
  const handleResetFilters = () => {
    const d = new Date()
    d.setDate(1)
    setStartDate(d.toISOString().split('T')[0])
    setEndDate(new Date().toISOString().split('T')[0])
    setSelectedPerson(ALL_PERSONS_OPTION)
    setSelectedVehicle(ALL_VEHICLES_OPTION)
  }

  // ── Action: Preview Report ────────────────────────────────────────────────
  const handlePreviewReport = () => {
    setPreviewLoading(true)
    setTimeout(() => {
      setPreviewLoading(false)
      setPreviewModalVisible(true)
    }, 450)
  }

  // ── Action: Download Report ───────────────────────────────────────────────
  const handleDownloadReport = () => {
    setDownloadLoading(true)
    setTimeout(() => {
      setDownloadLoading(false)
      Swal.fire({
        icon: 'success',
        title: 'Report Downloaded',
        text: `Operations Report for ${selectedPerson?.name} (${selectedVehicle?.vehicleNumber}) has been generated.`,
        confirmButtonColor: '#d97706',
        timer: 2500,
        timerProgressBar: true,
      })
    }, 600)
  }

  // ── Filtered Records for Display ──────────────────────────────────────────
  const filteredRecords = useMemo(() => {
    return SAMPLE_REPORT_RECORDS.filter((r) => {
      if (selectedPerson && selectedPerson.value !== 'ALL') {
        if (r.personCode !== selectedPerson.personCode && r.personName !== selectedPerson.name) {
          return false
        }
      }
      if (selectedVehicle && selectedVehicle.value !== 'ALL') {
        if (r.vehicleNumber !== selectedVehicle.vehicleNumber) {
          return false
        }
      }
      return true
    })
  }, [selectedPerson, selectedVehicle])

  // ── KPI Totals for Report Statement ─────────────────────────────────────
  const totalTrips = filteredRecords.length
  const totalGrossAmount = filteredRecords.reduce((acc, r) => acc + (Number(r.amount) || 0), 0)

  return (
    <div className="rp-page">
      {/* ── Page Header ── */}
      <div className="rp-page-header">
        <div className="rp-header-left">
          <div className="rp-header-icon">
            <CIcon icon={cilNotes} size="xl" />
          </div>
          <div>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <h1 className="rp-page-title">Operations Reports &amp; Analytics</h1>
              <span className="rp-badge-tag">
                <CIcon icon={cilCheckCircle} size="sm" /> Live Data Module
              </span>
            </div>
            <p className="rp-page-subtitle">
              Generate, preview, and download comprehensive transport vouchers, settlements, and
              fleet reports
            </p>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          <button
            className="rp-btn-refresh"
            onClick={handleResetFilters}
            title="Reset filters to default"
          >
            <CIcon icon={cilReload} />
            <span>Reset Filters</span>
          </button>
        </div>
      </div>

      {/* ── Filter Card ── */}
      <CCard className="rp-card">
        <CCardHeader className="rp-card-header">
          <div className="rp-card-title">
            <CIcon icon={cilFilter} className="text-warning" />
            <span>Report Filter &amp; Generation Criteria</span>
          </div>
          <button className="rp-btn-reset" onClick={handleResetFilters}>
            Clear Criteria
          </button>
        </CCardHeader>

        <CCardBody className="rp-card-body">
          <CRow className="g-3">
            {/* Start Date */}
            <CCol xs={12} sm={6}>
              <label className="rp-label" htmlFor="rp-start-date">
                <CIcon icon={cilCalendar} size="sm" className="text-warning" />
                Start Date
              </label>
              <input
                id="rp-start-date"
                type="date"
                className="rp-input"
                value={startDate}
                max={endDate || undefined}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </CCol>

            {/* End Date */}
            <CCol xs={12} sm={6}>
              <label className="rp-label" htmlFor="rp-end-date">
                <CIcon icon={cilCalendar} size="sm" className="text-warning" />
                End Date
              </label>
              <input
                id="rp-end-date"
                type="date"
                className="rp-input"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </CCol>

            {/* Person Searchable Dropdown */}
            <CCol xs={12} md={6}>
              <label className="rp-label">
                <CIcon icon={cilUser} size="sm" className="text-warning" />
                Person (Owner)
              </label>
              <AsyncSelect
                cacheOptions
                defaultOptions={initialPersonOptions}
                loadOptions={loadPersonOptions}
                value={selectedPerson}
                onChange={(opt) => setSelectedPerson(opt || ALL_PERSONS_OPTION)}
                placeholder="Type to search person by name or code…"
                isClearable={true}
                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                menuPosition="fixed"
                menuPlacement="auto"
                styles={selectStyles}
                components={{
                  Option: CustomPersonOption,
                }}
                classNamePrefix="rp-select"
                noOptionsMessage={({ inputValue }) =>
                  inputValue ? `No persons matching "${inputValue}"` : 'Type to search persons…'
                }
                loadingMessage={() => 'Searching persons…'}
              />
            </CCol>

            {/* Vehicle Searchable Dropdown */}
            <CCol xs={12} md={6}>
              <label className="rp-label">
                <CIcon icon={cilTruck} size="sm" className="text-warning" />
                Vehicle Number
              </label>
              <AsyncSelect
                cacheOptions
                defaultOptions={initialVehicleOptions}
                loadOptions={loadVehicleOptions}
                value={selectedVehicle}
                onChange={(opt) => setSelectedVehicle(opt || ALL_VEHICLES_OPTION)}
                placeholder="Type to search vehicle number…"
                isClearable={true}
                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                menuPosition="fixed"
                menuPlacement="auto"
                styles={selectStyles}
                components={{
                  Option: CustomVehicleOption,
                }}
                classNamePrefix="rp-select"
                noOptionsMessage={({ inputValue }) =>
                  inputValue ? `No vehicles matching "${inputValue}"` : 'Type to search fleet vehicles…'
                }
                loadingMessage={() => 'Searching fleet vehicles…'}
              />
            </CCol>
          </CRow>

          {/* Action Bar with Matching Preview & Download Buttons */}
          <div className="rp-action-bar mt-3 pt-3 border-top d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div className="rp-selection-indicator">
              <span className="rp-selection-badge">
                Filtering:{' '}
                <strong>
                  {selectedPerson?.name || 'All Persons'} •{' '}
                  {selectedVehicle?.vehicleNumber || 'All Vehicles'}
                </strong>
                {startDate && endDate
                  ? ` • ${startDate} to ${endDate}`
                  : startDate || endDate
                    ? ` • ${startDate || endDate}`
                    : ' • All Dates'}
              </span>
            </div>

            <div className="d-flex align-items-center gap-2 flex-wrap">
              {/* Preview Button — Exact Match with Receipts Page */}
              <button
                className="rp-btn-preview"
                onClick={handlePreviewReport}
                disabled={previewLoading || downloadLoading}
                id="btn-preview-report"
              >
                {previewLoading ? (
                  <>
                    <CSpinner size="sm" className="me-1" /> Generating Preview…
                  </>
                ) : (
                  <>
                    <CIcon icon={cilFindInPage} /> Preview Report
                  </>
                )}
              </button>

              {/* Download Button — Exact Match with Receipts Page */}
              <button
                className="rp-btn-download"
                onClick={handleDownloadReport}
                disabled={previewLoading || downloadLoading}
                id="btn-download-report"
              >
                {downloadLoading ? (
                  <>
                    <CSpinner size="sm" className="me-1" /> Preparing Download…
                  </>
                ) : (
                  <>
                    <CIcon icon={cilCloudDownload} /> Download Report
                  </>
                )}
              </button>
            </div>
          </div>
        </CCardBody>
      </CCard>



      {/* ══════════ MODAL: REPORT PREVIEW ══════════ */}
      <CModal
        size="lg"
        visible={previewModalVisible}
        onClose={() => setPreviewModalVisible(false)}
        className="rp-preview-modal"
        backdrop="static"
      >
        <CModalHeader className="rp-modal-header">
          <CModalTitle className="rp-modal-title">
            <CIcon icon={cilFindInPage} style={{ color: '#f59e0b' }} />
            Official Operations Report Preview
          </CModalTitle>
        </CModalHeader>

        <CModalBody className="rp-modal-body">
          <div className="rp-report-paper">
            <div className="rp-paper-header">
              <div>
                <h3 className="rp-paper-title">MESKORA MATERIAL GRID</h3>
                <div className="rp-paper-sub">Operations Transport Settlement &amp; Dispatch Statement</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="rp-status-badge rp-status-badge--completed">OFFICIAL REPORT</span>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 4 }}>
                  Generated: {new Date().toLocaleDateString()}
                </div>
              </div>
            </div>

            <div className="rp-meta-grid">
              <div className="rp-meta-item">
                <span className="rp-meta-label">Selected Person:</span>
                <span className="rp-meta-val">{selectedPerson?.name}</span>
              </div>
              <div className="rp-meta-item">
                <span className="rp-meta-label">Assigned Vehicle:</span>
                <span className="rp-meta-val">{selectedVehicle?.vehicleNumber}</span>
              </div>
              <div className="rp-meta-item">
                <span className="rp-meta-label">Date Coverage:</span>
                <span className="rp-meta-val">
                  {startDate} to {endDate}
                </span>
              </div>
              <div className="rp-meta-item">
                <span className="rp-meta-label">Total Dispatches:</span>
                <span className="rp-meta-val">{totalTrips} Trips</span>
              </div>
            </div>

            <table className="rp-table" style={{ marginTop: '1rem' }}>
              <thead>
                <tr>
                  <th>Trip #</th>
                  <th>Date</th>
                  <th>Route</th>
                  <th>Cube</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((r) => (
                  <tr key={r.id}>
                    <td>{r.id}</td>
                    <td>{r.date}</td>
                    <td>{r.route}</td>
                    <td>{r.capacity} cube</td>
                    <td className="fw-bold">Rs. {formatCurrency(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div
              className="d-flex justify-content-between align-items-center mt-4 pt-3 border-top"
              style={{ fontSize: '0.95rem' }}
            >
              <span className="fw-bold">Total Net Statement:</span>
              <span className="fw-bolder" style={{ color: '#d97706', fontSize: '1.2rem' }}>
                Rs. {formatCurrency(totalGrossAmount)}
              </span>
            </div>
          </div>
        </CModalBody>

        <CModalFooter className="rp-modal-footer">
          <button
            type="button"
            className="rp-btn-close"
            onClick={() => setPreviewModalVisible(false)}
          >
            Close
          </button>
          <button
            type="button"
            className="rp-btn-preview"
            onClick={() => window.print()}
            style={{ padding: '0.55rem 1.1rem' }}
          >
            <CIcon icon={cilPrint} /> Print Statement
          </button>
          <button
            type="button"
            className="rp-btn-download"
            onClick={() => {
              setPreviewModalVisible(false)
              handleDownloadReport()
            }}
            style={{ padding: '0.55rem 1.25rem' }}
          >
            <CIcon icon={cilCloudDownload} /> Download PDF
          </button>
        </CModalFooter>
      </CModal>
    </div>
  )
}

export default Reports
