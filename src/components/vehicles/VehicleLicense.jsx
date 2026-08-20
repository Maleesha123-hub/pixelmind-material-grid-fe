/**
 * Vehicle License Management Page
 *
 * Provides full CRUD operations, date range & status filtering,
 * and statistical overview for vehicle licenses.
 *
 * Backend integration:
 *   - GET    /api/v1/licenses?startDate=&endDate=&page=&size=&sort=
 *   - POST   /api/v1/licenses        { startDate, endDate, price }
 *   - PUT    /api/v1/licenses/{id}   { startDate, endDate, price, status }
 *   - DELETE /api/v1/licenses/{id}
 *
 * @module VehicleLicense
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import Swal from 'sweetalert2'
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
} from '@coreui/react'
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
} from '@coreui/icons'
import licenseService from '../../service/licenseService'
import './VehicleLicense.css'

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 15
const EMPTY_FORM = {
  startDate: '',
  endDate: '',
  price: '',
  status: 'ACTIVE',
}

// ─── Debounce Hook ────────────────────────────────────────────────────────────
function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

// ─── Currency & Date Formatter Helpers ────────────────────────────────────────
const formatCurrency = (val) => {
  const num = Number(val)
  if (isNaN(num)) return '0.00'
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
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

// ─── Component ────────────────────────────────────────────────────────────────
const VehicleLicense = () => {
  // ── Table State ─────────────────────────────────────────────────────────────
  const [licenses, setLicenses] = useState([])
  const [totalElements, setTotalElements] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(0)
  const [loading, setLoading] = useState(false)

  // ── Filter State ────────────────────────────────────────────────────────────
  const [searchInput, setSearchInput] = useState('')
  const [startDateFilter, setStartDateFilter] = useState('')
  const [endDateFilter, setEndDateFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  // ── Modal / Form State ───────────────────────────────────────────────────────
  const [modalVisible, setModalVisible] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const debouncedSearch = useDebounce(searchInput, 400)
  const abortRef = useRef(null)

  // ── Load Licenses ───────────────────────────────────────────────────────────
  const loadLicenses = useCallback(
    async (page = 0, search = '', startD = '', endD = '', statusF = 'ALL') => {
      if (abortRef.current) abortRef.current.abort()
      abortRef.current = new AbortController()
      setLoading(true)

      try {
        const result = await licenseService.getLicenses(
          {
            startDate: startD || undefined,
            endDate: endD || undefined,
            page,
            size: PAGE_SIZE,
            sort: 'id,desc',
          },
          abortRef.current.signal,
        )

        let content = result?.content ?? (Array.isArray(result) ? result : [])

        // Apply status filter if active/inactive
        if (statusF !== 'ALL') {
          content = content.filter((item) => {
            return statusF === item.status
          })
        }

        setLicenses(content)
        setTotalElements(result?.totalElements ?? content.length)
        setTotalPages(result?.totalPages ?? (Math.ceil(content.length / PAGE_SIZE) || 1))
        setCurrentPage(result?.number ?? page)
      } catch (err) {
        if (err.name === 'AbortError') return
        setLicenses([])
        setTotalElements(0)
        setTotalPages(0)
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    loadLicenses(0, debouncedSearch, startDateFilter, endDateFilter, statusFilter)
    setCurrentPage(0)
  }, [debouncedSearch, startDateFilter, endDateFilter, statusFilter, loadLicenses])

  const goToPage = (page) => {
    if (page < 0 || page >= totalPages) return
    loadLicenses(page, debouncedSearch, startDateFilter, endDateFilter, statusFilter)
    setCurrentPage(page)
  }

  // ── Form Helpers ─────────────────────────────────────────────────────────────
  const setField = (key, val) => {
    setForm((p) => ({ ...p, [key]: val }))
    if (errors[key]) setErrors((p) => ({ ...p, [key]: '' }))
  }

  const validate = () => {
    const e = {}

    if (!form.startDate) {
      e.startDate = 'Start date is required'
    }

    if (!form.endDate) {
      e.endDate = 'End date is required'
    } else if (form.startDate && new Date(form.endDate) < new Date(form.startDate)) {
      e.endDate = 'End date must not be earlier than start date'
    }

    const priceNum = Number(form.price)
    if (!form.price && form.price !== 0) {
      e.price = 'Price is required'
    } else if (isNaN(priceNum) || priceNum <= 0) {
      e.price = 'Price must be greater than 0'
    }

    setErrors(e)
    return Object.keys(e).length === 0
  }

  // ── Open Modals ──────────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditMode(false)
    setSelectedId(null)
    setForm(EMPTY_FORM)
    setErrors({})
    setModalVisible(true)
  }

  const openEdit = (license) => {
    setEditMode(true)
    setSelectedId(license.id)
    const isAct =
      license.active !== false && license.status !== false && license.status !== 'INACTIVE'
    setForm({
      startDate: license.startDate || '',
      endDate: license.endDate || '',
      price: license.price != null ? String(license.price) : '',
      status: isAct ? 'ACTIVE' : 'INACTIVE',
    })
    setErrors({})
    setModalVisible(true)
  }

  // ── Save Handler ─────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)

    const payload = {
      startDate: form.startDate,
      endDate: form.endDate,
      price: Number(form.price),
    }

    try {
      if (editMode) {
        await licenseService.updateLicense(selectedId, {
          ...payload,
          status: form.status === 'ACTIVE',
        })
        Swal.fire({
          icon: 'success',
          title: 'License Updated',
          text: 'License details have been successfully updated.',
          confirmButtonColor: '#d97706',
          timer: 2200,
          timerProgressBar: true,
        })
      } else {
        const created = await licenseService.createLicense(payload)
        Swal.fire({
          icon: 'success',
          title: 'License Created',
          text: `License ${created?.licenseCode || ''} has been registered successfully.`,
          confirmButtonColor: '#d97706',
          timer: 2200,
          timerProgressBar: true,
        })
      }
      setModalVisible(false)
      loadLicenses(
        editMode ? currentPage : 0,
        debouncedSearch,
        startDateFilter,
        endDateFilter,
        statusFilter,
      )
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Save Failed',
        text: err.message || 'Could not save license. Please verify input data.',
        confirmButtonColor: '#dc2626',
      })
    } finally {
      setSaving(false)
    }
  }

  // ── Delete Handler ───────────────────────────────────────────────────────────
  const handleDelete = async (license) => {
    const res = await Swal.fire({
      title: `Delete License ${license.licenseCode || ''}?`,
      text: 'This action cannot be undone. Note: licenses assigned to vehicles cannot be deleted.',
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
      await licenseService.deleteLicense(license.id)
      Swal.fire({
        icon: 'success',
        title: 'Deleted',
        text: `License ${license.licenseCode || ''} has been removed.`,
        confirmButtonColor: '#d97706',
        timer: 1800,
        timerProgressBar: true,
      })
      loadLicenses(currentPage, debouncedSearch, startDateFilter, endDateFilter, statusFilter)
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Cannot Delete License',
        text:
          err.message || 'Failed to delete license. It might be referenced by vehicle assignments.',
        confirmButtonColor: '#d97706',
      })
    }
  }

  const startItem = totalElements === 0 ? 0 : currentPage * PAGE_SIZE + 1
  const endItem = Math.min((currentPage + 1) * PAGE_SIZE, totalElements)

  return (
    <div className="vlm-page">
      {/* ── Page Header ── */}
      <div className="vlm-page-header">
        <div className="vlm-header-left">
          <div className="vlm-header-icon">
            <CIcon icon={cilContact} size="xl" />
          </div>
          <div>
            <h1 className="vlm-page-title">Vehicle License Management</h1>
            <p className="vlm-page-subtitle">
              Manage validity periods, pricing, and license registrations
            </p>
          </div>
        </div>
        <div className="vlm-header-actions">
          <button className="vlm-btn-add" onClick={openAdd} id="btn-add-license">
            <CIcon icon={cilPlus} />
            Add License
          </button>
        </div>
      </div>

      {/* ── Filter Card ── */}
      <CCard className="vlm-card">
        <CCardHeader className="vlm-card-header">
          <div className="vlm-card-title">
            <CIcon icon={cilFilter} className="text-warning" />
            <span>Search &amp; Filter Licenses</span>
          </div>
          <button
            className="vlm-btn-reset"
            onClick={() => {
              setSearchInput('')
              setStartDateFilter('')
              setEndDateFilter('')
              setStatusFilter('ALL')
            }}
            id="btn-reset-filters"
          >
            <CIcon icon={cilReload} size="sm" />
            Reset Filters
          </button>
        </CCardHeader>

        <CCardBody className="vlm-card-body">
          <CRow className="g-3">
            {/* Start Date Filter */}
            <CCol xs={12} sm={6} md={3}>
              <label className="vlm-label" htmlFor="filter-start-date">
                <CIcon icon={cilCalendar} size="sm" className="text-warning" />
                Start Date
              </label>
              <input
                id="filter-start-date"
                type="date"
                className="vlm-input"
                value={startDateFilter}
                max={endDateFilter || undefined}
                onChange={(e) => {
                  const val = e.target.value
                  setStartDateFilter(val)
                  if (endDateFilter && val && new Date(val) > new Date(endDateFilter)) {
                    setEndDateFilter('')
                  }
                }}
              />
            </CCol>

            {/* End Date Filter */}
            <CCol xs={12} sm={6} md={3}>
              <label className="vlm-label" htmlFor="filter-end-date">
                <CIcon icon={cilCalendar} size="sm" className="text-warning" />
                End Date
              </label>
              <input
                id="filter-end-date"
                type="date"
                className="vlm-input"
                value={endDateFilter}
                min={startDateFilter || undefined}
                onChange={(e) => setEndDateFilter(e.target.value)}
              />
            </CCol>

            {/* Status Filter */}
            <CCol xs={12} sm={6} md={3}>
              <label className="vlm-label" htmlFor="filter-status">
                <CIcon icon={cilFilter} size="sm" className="text-warning" />
                Status
              </label>
              <select
                id="filter-status"
                className="vlm-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active Only</option>
                <option value="INACTIVE">Inactive Only</option>
              </select>
            </CCol>

            {/* Search by Code / Keyword */}
            <CCol xs={12} sm={6} md={3}>
              <label className="vlm-label" htmlFor="filter-search">
                <CIcon icon={cilSearch} size="sm" className="text-warning" />
                Search Code / Price
              </label>
              <div className="vlm-search-wrap">
                <span className="vlm-search-icon">
                  {loading ? (
                    <CSpinner size="sm" style={{ color: '#d97706', width: 13, height: 13 }} />
                  ) : (
                    <CIcon icon={cilSearch} size="sm" />
                  )}
                </span>
                <input
                  id="filter-search"
                  type="text"
                  className="vlm-search-input"
                  placeholder="e.g. LIC-0001"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  autoComplete="off"
                />
              </div>
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>

      {/* ── Table Card ── */}
      <CCard className="vlm-card">
        <div className="vlm-table-wrap">
          {loading && licenses.length === 0 ? (
            <div className="vlm-loading">
              <div className="vlm-spinner" />
            </div>
          ) : (
            <>
              <table className="vlm-table">
                <thead>
                  <tr>
                    <th style={{ width: 44 }}>#</th>
                    <th>License Code</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Validity Period</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'center', width: 120 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {licenses.length === 0 ? (
                    <tr>
                      <td colSpan={8}>
                        <div className="vlm-empty">
                          <div className="vlm-empty-icon">
                            <CIcon icon={cilContact} size="xl" />
                          </div>
                          <h3>No vehicle licenses found</h3>
                          <p>
                            {searchInput ||
                            startDateFilter ||
                            endDateFilter ||
                            statusFilter !== 'ALL'
                              ? 'Try adjusting your date range or filter criteria.'
                              : 'Click "Add License" to create the first vehicle license.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    licenses.map((lic, i) => {
                      const isAct =
                        lic.active !== false && lic.status !== false && lic.status !== 'INACTIVE'
                      const isExpired = lic.endDate ? new Date(lic.endDate) < new Date() : false

                      return (
                        <tr key={lic.id || i}>
                          <td className="vlm-td-num">{startItem + i}</td>
                          <td>
                            <span className="vlm-code-pill">
                              <CIcon icon={cilContact} size="sm" style={{ color: '#f59e0b' }} />
                              {lic.licenseCode || `LIC-${lic.id}`}
                            </span>
                          </td>
                          <td>
                            <div className="vlm-date-cell">
                              <CIcon icon={cilCalendar} size="sm" className="vlm-date-icon" />
                              {formatDateDisplay(lic.startDate)}
                            </div>
                          </td>
                          <td>
                            <div className="vlm-date-cell">
                              <CIcon icon={cilCalendar} size="sm" className="vlm-date-icon" />
                              {formatDateDisplay(lic.endDate)}
                            </div>
                          </td>
                          <td>
                            <span
                              className={`vlm-duration-pill ${isExpired ? 'expired' : 'active'}`}
                            >
                              {isExpired ? 'Expired' : 'Valid'}
                            </span>
                          </td>
                          <td>
                            <span className="vlm-price-pill">Rs. {formatCurrency(lic.price)}</span>
                          </td>
                          <td>
                            <span className={`vlm-badge ${isAct ? 'active' : 'inactive'}`}>
                              <span className="vlm-badge-dot" />
                              {isAct ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td>
                            <div className="vlm-actions">
                              {/* Edit Action */}
                              <button
                                className="vlm-icon-btn edit"
                                title="Edit license"
                                onClick={() => openEdit(lic)}
                                id={`btn-edit-lic-${lic.id}`}
                              >
                                <CIcon icon={cilPencil} size="sm" />
                              </button>

                              {/* Delete Action */}
                              <button
                                className="vlm-icon-btn delete"
                                title="Delete license"
                                onClick={() => handleDelete(lic)}
                                id={`btn-delete-lic-${lic.id}`}
                              >
                                <CIcon icon={cilTrash} size="sm" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>

              {/* Footer: Count & Pagination */}
              {totalElements > 0 && (
                <div className="vlm-table-footer">
                  <span>
                    {startItem}–{endItem} of <span className="vlm-count-chip">{totalElements}</span>{' '}
                    licenses
                  </span>

                  {totalPages > 1 && (
                    <div className="vlm-pagination">
                      <button
                        className="vlm-page-btn"
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 0 || loading}
                        title="Previous"
                        id="btn-prev-page"
                      >
                        <CIcon icon={cilChevronLeft} size="sm" />
                      </button>

                      {Array.from({ length: totalPages }, (_, i) => i)
                        .filter((p) => Math.abs(p - currentPage) <= 2)
                        .map((p) => (
                          <button
                            key={p}
                            className={`vlm-page-btn ${p === currentPage ? 'active' : ''}`}
                            onClick={() => goToPage(p)}
                            disabled={loading}
                          >
                            {p + 1}
                          </button>
                        ))}

                      <button
                        className="vlm-page-btn"
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage >= totalPages - 1 || loading}
                        title="Next"
                        id="btn-next-page"
                      >
                        <CIcon icon={cilChevronRight} size="sm" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </CCard>

      {/* ══════════ MODAL — ADD / EDIT LICENSE ══════════ */}
      <CModal
        size="md"
        visible={modalVisible}
        onClose={() => !saving && setModalVisible(false)}
        backdrop="static"
        id="vehicle-license-modal"
      >
        <CModalHeader className="vlm-modal-header">
          <CModalTitle className="vlm-modal-title">
            <CIcon icon={editMode ? cilPencil : cilPlus} style={{ color: '#f59e0b' }} />
            {editMode ? 'Edit Vehicle License' : 'Add Vehicle License'}
          </CModalTitle>
        </CModalHeader>

        <CModalBody className="vlm-modal-body">
          <CRow className="g-3">
            {/* Start Date */}
            <CCol xs={12} md={6}>
              <label className="vlm-label" htmlFor="field-start-date">
                Start Date <span className="req">*</span>
              </label>
              <input
                id="field-start-date"
                type="date"
                className={`vlm-input ${errors.startDate ? 'error' : ''}`}
                value={form.startDate}
                onChange={(e) => setField('startDate', e.target.value)}
                autoFocus={!editMode}
              />
              {errors.startDate ? (
                <div className="vlm-input-error">⚠ {errors.startDate}</div>
              ) : (
                <div className="vlm-input-hint">License start / issue date</div>
              )}
            </CCol>

            {/* End Date */}
            <CCol xs={12} md={6}>
              <label className="vlm-label" htmlFor="field-end-date">
                End Date <span className="req">*</span>
              </label>
              <input
                id="field-end-date"
                type="date"
                className={`vlm-input ${errors.endDate ? 'error' : ''}`}
                value={form.endDate}
                onChange={(e) => setField('endDate', e.target.value)}
                min={form.startDate || undefined}
              />
              {errors.endDate ? (
                <div className="vlm-input-error">⚠ {errors.endDate}</div>
              ) : (
                <div className="vlm-input-hint">License expiry / renewal date</div>
              )}
            </CCol>

            {/* Price */}
            <CCol xs={12} md={editMode ? 6 : 12}>
              <label className="vlm-label" htmlFor="field-price">
                Price (LKR / Amount) <span className="req">*</span>
              </label>
              <div className="vlm-input-currency-wrap">
                <span className="vlm-currency-prefix">Rs.</span>
                <input
                  id="field-price"
                  type="number"
                  step="0.01"
                  min="0.01"
                  className={`vlm-input with-prefix ${errors.price ? 'error' : ''}`}
                  placeholder="e.g. 15000.00"
                  value={form.price}
                  onChange={(e) => setField('price', e.target.value)}
                  autoFocus={editMode}
                />
              </div>
              {errors.price ? (
                <div className="vlm-input-error">⚠ {errors.price}</div>
              ) : (
                <div className="vlm-input-hint">Total cost of the license</div>
              )}
            </CCol>

            {/* Status (In Edit Mode) */}
            {editMode && (
              <CCol xs={12} md={6}>
                <label className="vlm-label" htmlFor="field-status">
                  Status
                </label>
                <select
                  id="field-status"
                  className="vlm-select"
                  value={form.status}
                  onChange={(e) => setField('status', e.target.value)}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
                <div className="vlm-input-hint">License activation state</div>
              </CCol>
            )}
          </CRow>
        </CModalBody>

        <CModalFooter className="vlm-modal-footer">
          <button
            type="button"
            className="vlm-btn-cancel"
            onClick={() => setModalVisible(false)}
            disabled={saving}
            id="btn-modal-cancel"
          >
            Cancel
          </button>
          <button
            type="button"
            className="vlm-btn-save"
            onClick={handleSave}
            disabled={saving}
            id="btn-modal-save"
          >
            {saving ? (
              <>
                <CSpinner size="sm" style={{ marginRight: 6 }} /> Saving…
              </>
            ) : (
              <>
                <CIcon icon={editMode ? cilPencil : cilPlus} />{' '}
                {editMode ? 'Save Changes' : 'Create License'}
              </>
            )}
          </button>
        </CModalFooter>
      </CModal>
    </div>
  )
}

export default VehicleLicense
