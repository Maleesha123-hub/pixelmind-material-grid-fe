/**
 * Price Rate Management Page
 *
 * Provides single-active-rate pricing management, rate history timeline,
 * date/status filtering, and safe deletion.
 *
 * Backend integration:
 *   - GET    /api/v1/price-rates?status=&page=&size=&sort=
 *   - GET    /api/v1/price-rates/active
 *   - POST   /api/v1/price-rates        { price, status: "ACTIVE" }
 *   - DELETE /api/v1/price-rates/{id}
 *
 * @module PriceRate
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
  cilMoney,
  cilSearch,
  cilPlus,
  cilReload,
  cilTrash,
  cilChevronLeft,
  cilChevronRight,
  cilFilter,
  cilCalendar,
  cilUser,
  cilInfo,
  cilCheckCircle,
} from '@coreui/icons'
import priceRateService from '../../service/priceRateService'
import './PriceRate.css'

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 15

// ─── Debounce Hook ────────────────────────────────────────────────────────────
function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

// ─── Formatter Helpers ────────────────────────────────────────────────────────
const formatCurrency = (val) => {
  const num = Number(val)
  if (isNaN(num)) return '0.00'
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
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

const formatDateOnly = (dateStr) => {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return ''
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  } catch {
    return ''
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
const PriceRate = () => {
  // ── Table State ─────────────────────────────────────────────────────────────
  const [rates, setRates] = useState([])
  const [activeRate, setActiveRate] = useState(null)
  const [totalElements, setTotalElements] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(0)
  const [loading, setLoading] = useState(false)

  // ── Filter State ────────────────────────────────────────────────────────────
  const [searchInput, setSearchInput] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  // ── Modal / Form State ───────────────────────────────────────────────────────
  const [modalVisible, setModalVisible] = useState(false)
  const [rateInput, setRateInput] = useState('')
  const [rateError, setRateError] = useState('')
  const [saving, setSaving] = useState(false)

  const debouncedSearch = useDebounce(searchInput, 400)
  const abortRef = useRef(null)

  // ── Load Active Rate ────────────────────────────────────────────────────────
  const loadActiveRate = useCallback(async () => {
    try {
      const active = await priceRateService.getActivePriceRate()
      setActiveRate(active)
    } catch {
      setActiveRate(null)
    }
  }, [])

  // ── Load Rates ──────────────────────────────────────────────────────────────
  const loadRates = useCallback(
    async (
      page = 0,
      search = '',
      filterDate = '',
      statusF = 'ALL'
    ) => {
      if (abortRef.current) abortRef.current.abort()
      abortRef.current = new AbortController()
      setLoading(true)

      try {
        const result = await priceRateService.getPriceRates(
          {
            status: statusF,
            page,
            size: PAGE_SIZE,
            sort: 'id,desc',
          },
          abortRef.current.signal
        )

        let content = result?.content ?? (Array.isArray(result) ? result : [])

        // Client date filter if specified
        if (filterDate) {
          content = content.filter((item) => {
            const itemDate = formatDateOnly(item.addedDate || item.createdDate)
            return itemDate === filterDate
          })
        }

        // Client search by price / user if specified
        if (search.trim()) {
          const q = search.trim().toLowerCase()
          content = content.filter(
            (item) =>
              (item.price != null && String(item.price).includes(q)) ||
              (item.addedBy && item.addedBy.toLowerCase().includes(q)) ||
              (item.modifiedBy && item.modifiedBy.toLowerCase().includes(q))
          )
        }

        // Status filter fallback
        if (statusF !== 'ALL') {
          content = content.filter((item) => item.status === statusF)
        }

        setRates(content)
        setTotalElements(result?.totalElements ?? content.length)
        setTotalPages(result?.totalPages ?? (Math.ceil(content.length / PAGE_SIZE) || 1))
        setCurrentPage(result?.number ?? page)
      } catch (err) {
        if (err.name === 'AbortError') return
        setRates([])
        setTotalElements(0)
        setTotalPages(0)
      } finally {
        setLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    loadActiveRate()
  }, [loadActiveRate])

  useEffect(() => {
    loadRates(0, debouncedSearch, dateFilter, statusFilter)
    setCurrentPage(0)
  }, [debouncedSearch, dateFilter, statusFilter, loadRates])

  const goToPage = (page) => {
    if (page < 0 || page >= totalPages) return
    loadRates(page, debouncedSearch, dateFilter, statusFilter)
    setCurrentPage(page)
  }

  // ── Open Add Modal ───────────────────────────────────────────────────────────
  const openAdd = () => {
    setRateInput('')
    setRateError('')
    setModalVisible(true)
  }

  // ── Validation ───────────────────────────────────────────────────────────────
  const validate = () => {
    const num = Number(rateInput)
    if (!rateInput && rateInput !== 0) {
      setRateError('Price rate is required')
      return false
    }
    if (isNaN(num) || num <= 0) {
      setRateError('Enter a valid rate greater than zero')
      return false
    }
    setRateError('')
    return true
  }

  // ── Save Handler ─────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)

    try {
      const created = await priceRateService.createPriceRate({
        price: Number(rateInput),
        status: 'ACTIVE',
      })

      Swal.fire({
        icon: 'success',
        title: 'Price Rate Activated',
        text: `New rate Rs. ${formatCurrency(created?.price)} / cube is now active. Previous rates marked as inactive.`,
        confirmButtonColor: '#d97706',
        timer: 2400,
        timerProgressBar: true,
      })

      setModalVisible(false)
      loadActiveRate()
      loadRates(0, debouncedSearch, dateFilter, statusFilter)
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Failed to Save Rate',
        text: err.message || 'Could not save price rate. Please try again.',
        confirmButtonColor: '#dc2626',
      })
    } finally {
      setSaving(false)
    }
  }

  // ── Delete Handler ───────────────────────────────────────────────────────────
  const handleDelete = async (item) => {
    if (item.status === 'ACTIVE') {
      Swal.fire({
        icon: 'info',
        title: 'Active Rate Protected',
        text: 'The currently active rate cannot be deleted. Activate a new rate first before removing this record.',
        confirmButtonColor: '#d97706',
      })
      return
    }

    const res = await Swal.fire({
      title: `Delete Price Rate Rs. ${formatCurrency(item.price)}?`,
      text: 'This action cannot be undone. Only unmapped rate records can be deleted.',
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
      await priceRateService.deletePriceRate(item.id)
      Swal.fire({
        icon: 'success',
        title: 'Rate Deleted',
        text: `Rate record has been removed successfully.`,
        confirmButtonColor: '#d97706',
        timer: 1800,
        timerProgressBar: true,
      })
      loadActiveRate()
      loadRates(currentPage, debouncedSearch, dateFilter, statusFilter)
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Cannot Delete Rate',
        text: err.message || 'Failed to delete price rate. It may be referenced by existing daily routes.',
        confirmButtonColor: '#d97706',
      })
    }
  }

  const startItem = totalElements === 0 ? 0 : currentPage * PAGE_SIZE + 1
  const endItem = Math.min((currentPage + 1) * PAGE_SIZE, totalElements)

  return (
    <div className="pr-page">
      {/* ── Page Header ── */}
      <div className="pr-page-header">
        <div className="pr-header-left">
          <div className="pr-header-icon">
            <CIcon icon={cilMoney} size="xl" />
          </div>
          <div>
            <h1 className="pr-page-title">Price Rate Management</h1>
            <p className="pr-page-subtitle">
              Configure active cube transport rate &amp; view historical rate adjustments
            </p>
          </div>
        </div>
        <div className="pr-header-actions">
          <button className="pr-btn-add" onClick={openAdd} id="btn-add-price-rate">
            <CIcon icon={cilPlus} />
            New Price Rate
          </button>
        </div>
      </div>

      {/* ── Active Rate Spotlight Banner ── */}
      {activeRate && (
        <div className="pr-spotlight-card">
          <div className="pr-spotlight-left">
            <div className="pr-spotlight-icon">
              <CIcon icon={cilCheckCircle} size="xl" />
            </div>
            <div>
              <div className="pr-spotlight-label">
                <CIcon icon={cilCheckCircle} size="sm" /> Current Active Rate
              </div>
              <div className="pr-spotlight-rate">
                Rs. {formatCurrency(activeRate.price)}
                <span className="pr-spotlight-unit">/ cube</span>
              </div>
            </div>
          </div>
          <div className="pr-spotlight-meta">
            <div className="pr-spotlight-meta-item">
              <CIcon icon={cilCalendar} size="sm" style={{ color: '#94a3b8' }} />
              <span>
                Effective Since:{' '}
                <strong>{formatDateTimeDisplay(activeRate.addedDate || activeRate.createdDate)}</strong>
              </span>
            </div>
            {activeRate.addedBy && (
              <div className="pr-spotlight-meta-item">
                <CIcon icon={cilUser} size="sm" style={{ color: '#94a3b8' }} />
                <span>
                  Activated By: <strong>{activeRate.addedBy}</strong>
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Filter Card ── */}
      <CCard className="pr-card">
        <CCardHeader className="pr-card-header">
          <div className="pr-card-title">
            <CIcon icon={cilFilter} className="text-warning" />
            <span>Search &amp; Filter Rates</span>
          </div>
          <button
            className="pr-btn-reset"
            onClick={() => {
              setSearchInput('')
              setDateFilter('')
              setStatusFilter('ALL')
            }}
            id="btn-reset-pr-filters"
          >
            <CIcon icon={cilReload} size="sm" />
            Reset Filters
          </button>
        </CCardHeader>

        <CCardBody className="pr-card-body">
          <CRow className="g-3">
            {/* Created Date Filter */}
            <CCol xs={12} sm={6} md={4}>
              <label className="pr-label" htmlFor="filter-pr-date">
                <CIcon icon={cilCalendar} size="sm" className="text-warning" />
                Created Date
              </label>
              <input
                id="filter-pr-date"
                type="date"
                className="pr-input"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </CCol>

            {/* Status Filter */}
            <CCol xs={12} sm={6} md={4}>
              <label className="pr-label" htmlFor="filter-pr-status">
                <CIcon icon={cilFilter} size="sm" className="text-warning" />
                Status
              </label>
              <select
                id="filter-pr-status"
                className="pr-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active Only</option>
                <option value="INACTIVE">Inactive Only</option>
              </select>
            </CCol>

            {/* Search by Rate or Added By */}
            <CCol xs={12} sm={12} md={4}>
              <label className="pr-label" htmlFor="filter-pr-search">
                <CIcon icon={cilSearch} size="sm" className="text-warning" />
                Search Rate / Created By
              </label>
              <div className="pr-search-wrap">
                <span className="pr-search-icon">
                  {loading ? (
                    <CSpinner size="sm" style={{ color: '#d97706', width: 13, height: 13 }} />
                  ) : (
                    <CIcon icon={cilSearch} size="sm" />
                  )}
                </span>
                <input
                  id="filter-pr-search"
                  type="text"
                  className="pr-search-input"
                  placeholder="e.g. 5000 or admin"
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
      <CCard className="pr-card">
        <div className="pr-table-wrap">
          {loading && rates.length === 0 ? (
            <div className="pr-loading">
              <div className="pr-spinner" />
            </div>
          ) : (
            <>
              <table className="pr-table">
                <thead>
                  <tr>
                    <th style={{ width: 44 }}>#</th>
                    <th>Price Rate (Rs./cube)</th>
                    <th>Created Date</th>
                    <th>Added By</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'center', width: 100 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rates.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <div className="pr-empty">
                          <div className="pr-empty-icon">
                            <CIcon icon={cilMoney} size="xl" />
                          </div>
                          <h3>No price rates found</h3>
                          <p>
                            {searchInput || dateFilter || statusFilter !== 'ALL'
                              ? 'Try adjusting your search term or filter criteria.'
                              : 'Click "New Price Rate" to set the active transport rate.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    rates.map((item, i) => {
                      const isActive = item.status === 'ACTIVE'
                      return (
                        <tr key={item.id || i}>
                          <td className="pr-td-num">{startItem + i}</td>
                          <td>
                            <span className={`pr-rate-pill ${isActive ? 'active-rate' : ''}`}>
                              <CIcon icon={cilMoney} size="sm" style={{ color: isActive ? '#059669' : '#d97706' }} />
                              Rs. {formatCurrency(item.price)}
                            </span>
                          </td>
                          <td>
                            <div className="pr-date-cell">
                              <CIcon icon={cilCalendar} size="sm" className="pr-date-icon" />
                              {formatDateTimeDisplay(item.addedDate || item.createdDate)}
                            </div>
                          </td>
                          <td>
                            <span className="pr-user-pill">
                              <CIcon icon={cilUser} size="sm" />
                              {item.addedBy || 'System'}
                            </span>
                          </td>
                          <td>
                            <span className={`pr-badge ${isActive ? 'active' : 'inactive'}`}>
                              <span className="pr-badge-dot" />
                              {isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td>
                            <div className="pr-actions">
                              {/* Delete Action (Disabled on Active rate) */}
                              <button
                                className="pr-icon-btn delete"
                                title={isActive ? 'Active rate cannot be deleted' : 'Delete price rate'}
                                onClick={() => handleDelete(item)}
                                disabled={isActive}
                                id={`btn-delete-pr-${item.id}`}
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
                <div className="pr-table-footer">
                  <span>
                    {startItem}–{endItem} of{' '}
                    <span className="pr-count-chip">{totalElements}</span> price rates
                  </span>

                  {totalPages > 1 && (
                    <div className="pr-pagination">
                      <button
                        className="pr-page-btn"
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 0 || loading}
                        title="Previous"
                        id="btn-prev-pr-page"
                      >
                        <CIcon icon={cilChevronLeft} size="sm" />
                      </button>

                      {Array.from({ length: totalPages }, (_, i) => i)
                        .filter((p) => Math.abs(p - currentPage) <= 2)
                        .map((p) => (
                          <button
                            key={p}
                            className={`pr-page-btn ${p === currentPage ? 'active' : ''}`}
                            onClick={() => goToPage(p)}
                            disabled={loading}
                          >
                            {p + 1}
                          </button>
                        ))}

                      <button
                        className="pr-page-btn"
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage >= totalPages - 1 || loading}
                        title="Next"
                        id="btn-next-pr-page"
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

      {/* ══════════ MODAL — ADD PRICE RATE ══════════ */}
      <CModal
        size="sm"
        visible={modalVisible}
        onClose={() => !saving && setModalVisible(false)}
        backdrop="static"
        id="price-rate-modal"
      >
        <CModalHeader className="pr-modal-header">
          <CModalTitle className="pr-modal-title">
            <CIcon icon={cilPlus} style={{ color: '#f59e0b' }} />
            New Price Rate
          </CModalTitle>
        </CModalHeader>

        <CModalBody className="pr-modal-body">
          <CRow className="g-3">
            {/* Rate Input */}
            <CCol xs={12}>
              <label className="pr-label" htmlFor="field-rate-price">
                Rate (Per Cube) <span className="req">*</span>
              </label>
              <div className="pr-input-currency-wrap">
                <span className="pr-currency-prefix">Rs.</span>
                <input
                  id="field-rate-price"
                  type="number"
                  step="0.01"
                  min="0.01"
                  className={`pr-input with-prefix ${rateError ? 'error' : ''}`}
                  placeholder="e.g. 5000.00"
                  value={rateInput}
                  onChange={(e) => {
                    setRateInput(e.target.value)
                    if (rateError) setRateError('')
                  }}
                  autoFocus
                />
              </div>
              {rateError ? (
                <div className="pr-input-error">⚠ {rateError}</div>
              ) : (
                <div className="pr-input-hint">Unit price rate per cubic meter</div>
              )}
            </CCol>
          </CRow>

          {/* Automatic Activation Notice */}
          <div className="pr-modal-notice">
            <CIcon icon={cilInfo} size="lg" style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <strong>Single Active Rate Rule:</strong> Saving this rate will automatically activate it
              as the primary rate and deactivate previously active rate records.
            </div>
          </div>
        </CModalBody>

        <CModalFooter className="pr-modal-footer">
          <button
            type="button"
            className="pr-btn-cancel"
            onClick={() => setModalVisible(false)}
            disabled={saving}
            id="btn-modal-pr-cancel"
          >
            Cancel
          </button>
          <button
            type="button"
            className="pr-btn-save"
            onClick={handleSave}
            disabled={saving}
            id="btn-modal-pr-save"
          >
            {saving ? (
              <>
                <CSpinner size="sm" style={{ marginRight: 6 }} /> Saving…
              </>
            ) : (
              <>
                <CIcon icon={cilPlus} /> Save &amp; Activate
              </>
            )}
          </button>
        </CModalFooter>
      </CModal>
    </div>
  )
}

export default PriceRate
