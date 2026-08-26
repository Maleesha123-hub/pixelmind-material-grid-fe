/**
 * Route Management Page
 *
 * Master data management for routes (start location, end location, km, status).
 * Matches the design and architecture of the Vehicles management page.
 *
 * @module Routes
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
  cilMap,
  cilPencil,
  cilSearch,
  cilPlus,
  cilReload,
  cilTrash,
  cilChevronLeft,
  cilChevronRight,
  cilFilter,
  cilArrowRight,
  cilLocationPin,
} from '@coreui/icons'
import routeService from '../../service/routeService'
import './Routes.css'

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 15
const EMPTY_FORM = {
  startLocation: '',
  endLocation: '',
  km: '',
  price: '',
}

// ─── Currency Formatter Helper ────────────────────────────────────────────────
const formatCurrency = (val) => {
  const num = Number(val)
  if (isNaN(num)) return '0.00'
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

// ─── Debounce hook ────────────────────────────────────────────────────────────
function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

const Routes = () => {
  // ── Table state ─────────────────────────────────────────────────────────────
  const [routesList, setRoutesList] = useState([])
  const [totalElements, setTotalElements] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [searchInput, setSearchInput] = useState('')

  // ── Modal / form state ───────────────────────────────────────────────────────
  const [modalVisible, setModalVisible] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const debouncedSearch = useDebounce(searchInput, 400)
  const abortRef = useRef(null)

  // ── Load routes ─────────────────────────────────────────────────────────────
  const loadRoutes = useCallback(async (page = 0, search = '') => {
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()
    setLoading(true)
    try {
      const result = await routeService.getRoutes(
        { search, page, size: PAGE_SIZE, sort: 'id,asc' },
        abortRef.current.signal,
      )
      const content = result?.content ?? (Array.isArray(result) ? result : [])

      setRoutesList(content)
      setTotalElements(result?.totalElements ?? content.length)
      setTotalPages(result?.totalPages ?? Math.max(1, Math.ceil(content.length / PAGE_SIZE)))
      setCurrentPage(result?.number ?? page)
    } catch (err) {
      if (err.name === 'AbortError') return
      setRoutesList([])
      setTotalElements(0)
      setTotalPages(0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRoutes(0, debouncedSearch)
    setCurrentPage(0)
  }, [debouncedSearch, loadRoutes])

  const goToPage = (page) => {
    if (page < 0 || page >= totalPages) return
    loadRoutes(page, debouncedSearch)
    setCurrentPage(page)
  }

  // ── Form helpers ─────────────────────────────────────────────────────────────
  const setField = (key, val) => {
    setForm((p) => ({ ...p, [key]: val }))
    if (errors[key]) setErrors((p) => ({ ...p, [key]: '' }))
  }

  const validate = () => {
    const e = {}
    if (!form.startLocation.trim()) e.startLocation = 'Start location is required'
    if (!form.endLocation.trim()) e.endLocation = 'End location is required'

    const kmVal = Number(form.km)
    if (!form.km && form.km !== 0) {
      e.km = 'Distance (km) is required'
    } else if (isNaN(kmVal) || kmVal <= 0) {
      e.km = 'Enter a valid positive distance in km'
    }

    const priceVal = Number(form.price)
    if (!form.price && form.price !== 0) {
      e.price = 'Price is required'
    } else if (isNaN(priceVal) || priceVal <= 0) {
      e.price = 'Enter a valid positive price'
    }

    setErrors(e)
    return Object.keys(e).length === 0
  }

  // ── Modals ───────────────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditMode(false)
    setSelectedId(null)
    setForm(EMPTY_FORM)
    setErrors({})
    setModalVisible(true)
  }

  const openEdit = (route) => {
    setEditMode(true)
    setSelectedId(route.id)
    setForm({
      startLocation: route.startLocation || '',
      endLocation: route.endLocation || '',
      km: route.km != null ? String(route.km) : '',
      price: route.price != null ? String(route.price) : '',
    })
    setErrors({})
    setModalVisible(true)
  }

  // ── Save ─────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)

    const payload = {
      startLocation: form.startLocation.trim(),
      endLocation: form.endLocation.trim(),
      km: Number(form.km),
      price: Number(form.price),
    }

    try {
      if (editMode) {
        await routeService.updateRoute(selectedId, payload)
        Swal.fire({
          icon: 'success',
          title: 'Route Updated',
          text: `Route "${payload.startLocation} → ${payload.endLocation}" has been updated.`,
          confirmButtonColor: '#d97706',
          timer: 2200,
          timerProgressBar: true,
        })
      } else {
        await routeService.createRoute(payload)
        Swal.fire({
          icon: 'success',
          title: 'Route Added',
          text: `Route "${payload.startLocation} → ${payload.endLocation}" (${payload.km} km, Rs. ${formatCurrency(payload.price)}) created.`,
          confirmButtonColor: '#d97706',
          timer: 2200,
          timerProgressBar: true,
        })
      }
      setModalVisible(false)
      loadRoutes(editMode ? currentPage : 0, debouncedSearch)
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Save Failed',
        text: err.message || 'Could not save route. Please try again.',
        confirmButtonColor: '#dc2626',
      })
    } finally {
      setSaving(false)
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────────
  const handleDelete = async (route) => {
    const routeLabel = `${route.startLocation} → ${route.endLocation}`
    const res = await Swal.fire({
      title: `Delete route "${routeLabel}"?`,
      text: 'This action cannot be undone. Routes with historical records cannot be deleted.',
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
      await routeService.deleteRoute(route.id)
      Swal.fire({
        icon: 'success',
        title: 'Deleted',
        text: `Route "${routeLabel}" has been removed.`,
        confirmButtonColor: '#d97706',
        timer: 1800,
        timerProgressBar: true,
      })
      loadRoutes(currentPage, debouncedSearch)
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Cannot Delete Route',
        text:
          err.message ||
          'Cannot delete route with existing records. Route is preserved for referential integrity.',
        confirmButtonColor: '#d97706',
      })
    }
  }

  // ── Counts ───────────────────────────────────────────────────────────────────
  const startItem = totalElements === 0 ? 0 : currentPage * PAGE_SIZE + 1
  const endItem = Math.min((currentPage + 1) * PAGE_SIZE, totalElements)

  return (
    <div className="rt-page">
      {/* ── Page Header ── */}
      <div className="rt-page-header">
        <div className="rt-header-left">
          <div className="rt-header-icon">
            <CIcon icon={cilLocationPin} size="xl" />
          </div>
          <div>
            <h1 className="rt-page-title">Routes Management</h1>
            <p className="rt-page-subtitle">
              Start location, end location, distance (km) &amp; price
            </p>
          </div>
        </div>
        <div className="rt-header-actions">
          <button className="rt-btn-add" onClick={openAdd} id="btn-add-route">
            <CIcon icon={cilPlus} />
            Add Route
          </button>
        </div>
      </div>

      {/* ── Filter Card ── */}
      <CCard className="rt-card">
        <CCardHeader className="rt-card-header">
          <div className="rt-card-title">
            <CIcon icon={cilFilter} className="text-warning" />
            <span>Search &amp; Filter</span>
          </div>
          <button
            className="rt-btn-reset"
            onClick={() => {
              setSearchInput('')
            }}
          >
            <CIcon icon={cilReload} size="sm" />
            Reset Filter
          </button>
        </CCardHeader>
        <CCardBody className="rt-card-body">
          <CRow className="g-3">
            {/* Search Route (start location - end location) */}
            <CCol xs={12} sm={8} md={5} lg={4}>
              <label className="rt-label">
                <CIcon icon={cilSearch} size="sm" className="text-warning" />
                Search Route (Start / End Location)
              </label>
              <div className="rt-search-wrap">
                <span className="rt-search-icon">
                  {loading ? (
                    <CSpinner size="sm" style={{ color: '#d97706', width: 13, height: 13 }} />
                  ) : (
                    <CIcon icon={cilSearch} size="sm" />
                  )}
                </span>
                <input
                  id="route-search"
                  type="text"
                  className="rt-search-input"
                  placeholder="e.g. Quarry A - Plant 1"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  autoComplete="off"
                />
              </div>
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>

      {/* ── Route Table Card ── */}
      <CCard className="rt-card">
        <div className="rt-table-wrap">
          {loading && routesList.length === 0 ? (
            <div className="rt-loading">
              <div className="rt-spinner" />
            </div>
          ) : (
            <>
              <table className="rt-table">
                <thead>
                  <tr>
                    <th style={{ width: 44 }}>#</th>
                    <th>Route Code</th>
                    <th>Route (Start → End)</th>
                    <th>Start Location</th>
                    <th>End Location</th>
                    <th>Distance (km)</th>
                    <th>Price</th>
                    <th style={{ textAlign: 'center', width: 120 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {routesList.length === 0 ? (
                    <tr>
                      <td colSpan={8}>
                        <div className="rt-empty">
                          <div className="rt-empty-icon">
                            <CIcon icon={cilLocationPin} size="xl" />
                          </div>
                          <h3>No routes found</h3>
                          <p>
                            {searchInput
                              ? 'Try a different search term.'
                              : 'Click "Add Route" to register the first route.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    routesList.map((r, i) => (
                      <tr key={r.id || i}>
                        <td className="rt-td-num">{startItem + i}</td>
                        <td>
                          <span className="rt-code-badge">{r.routeCode || '—'}</span>
                        </td>
                        <td>
                          <span className="rt-route-pill">
                            <CIcon icon={cilLocationPin} size="sm" style={{ color: '#f59e0b' }} />
                            <span>{r.startLocation}</span>
                            <span className="rt-route-arrow">→</span>
                            <span>{r.endLocation}</span>
                          </span>
                        </td>
                        <td>
                          <span className="rt-loc-badge">{r.startLocation}</span>
                        </td>
                        <td>
                          <span className="rt-loc-badge">{r.endLocation}</span>
                        </td>
                        <td>
                          <span className="rt-km-val">
                            {r.km ?? '—'}
                            <span className="rt-km-unit">km</span>
                          </span>
                        </td>
                        <td>
                          <span className="rt-price-pill">Rs. {formatCurrency(r.price)}</span>
                        </td>
                        <td>
                          <div className="rt-actions">
                            {/* Edit */}
                            <button
                              className="rt-icon-btn edit"
                              title="Edit route"
                              onClick={() => openEdit(r)}
                              id={`btn-edit-route-${r.id || i}`}
                            >
                              <CIcon icon={cilPencil} size="sm" />
                            </button>

                            {/* Delete */}
                            <button
                              className="rt-icon-btn delete"
                              title="Delete route"
                              onClick={() => handleDelete(r)}
                              id={`btn-delete-route-${r.id || i}`}
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

              {/* Footer: count + pagination */}
              {totalElements > 0 && (
                <div className="rt-table-footer">
                  <span>
                    {startItem}–{endItem} of <span className="rt-count-chip">{totalElements}</span>{' '}
                    routes
                  </span>

                  {totalPages > 1 && (
                    <div className="rt-pagination">
                      <button
                        className="rt-page-btn"
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 0 || loading}
                        title="Previous"
                      >
                        <CIcon icon={cilChevronLeft} size="sm" />
                      </button>

                      {Array.from({ length: totalPages }, (_, idx) => idx)
                        .filter((p) => Math.abs(p - currentPage) <= 2)
                        .map((p) => (
                          <button
                            key={p}
                            className={`rt-page-btn ${p === currentPage ? 'active' : ''}`}
                            onClick={() => goToPage(p)}
                            disabled={loading}
                          >
                            {p + 1}
                          </button>
                        ))}

                      <button
                        className="rt-page-btn"
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage >= totalPages - 1 || loading}
                        title="Next"
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

      {/* ══════════ MODAL — ADD / EDIT ROUTE ══════════ */}
      <CModal
        size="md"
        visible={modalVisible}
        onClose={() => !saving && setModalVisible(false)}
        backdrop="static"
        id="route-modal"
      >
        <CModalHeader className="rt-modal-header">
          <CModalTitle className="rt-modal-title">
            <CIcon icon={editMode ? cilPencil : cilPlus} style={{ color: '#f59e0b' }} />
            {editMode ? 'Edit Route' : 'Add Route'}
          </CModalTitle>
        </CModalHeader>

        <CModalBody className="rt-modal-body">
          <CRow className="g-3">
            {/* Start Location */}
            <CCol xs={12}>
              <label className="rt-label" htmlFor="field-start-loc">
                Start Location <span className="req">*</span>
              </label>
              <input
                id="field-start-loc"
                type="text"
                className={`rt-input ${errors.startLocation ? 'error' : ''}`}
                placeholder="e.g. Quarry Site A"
                value={form.startLocation}
                onChange={(e) => setField('startLocation', e.target.value)}
                autoFocus
              />
              {errors.startLocation && (
                <div className="rt-input-error">⚠ {errors.startLocation}</div>
              )}
            </CCol>

            {/* End Location */}
            <CCol xs={12}>
              <label className="rt-label" htmlFor="field-end-loc">
                End Location <span className="req">*</span>
              </label>
              <input
                id="field-end-loc"
                type="text"
                className={`rt-input ${errors.endLocation ? 'error' : ''}`}
                placeholder="e.g. Plant 1 / Site B"
                value={form.endLocation}
                onChange={(e) => setField('endLocation', e.target.value)}
              />
              {errors.endLocation && <div className="rt-input-error">⚠ {errors.endLocation}</div>}
            </CCol>

            {/* Distance (km) */}
            <CCol xs={12} md={6}>
              <label className="rt-label" htmlFor="field-km">
                Distance (km) <span className="req">*</span>
              </label>
              <input
                id="field-km"
                type="number"
                step="0.01"
                min="0.01"
                className={`rt-input ${errors.km ? 'error' : ''}`}
                placeholder="e.g. 24.5"
                value={form.km}
                onChange={(e) => setField('km', e.target.value)}
              />
              {errors.km ? (
                <div className="rt-input-error">⚠ {errors.km}</div>
              ) : (
                <div className="rt-input-hint">Distance in kilometers</div>
              )}
            </CCol>

            {/* Price */}
            <CCol xs={12} md={6}>
              <label className="rt-label" htmlFor="field-price">
                Price (Rs.) <span className="req">*</span>
              </label>
              <div className="rt-input-currency-wrap">
                <span className="rt-currency-prefix">Rs.</span>
                <input
                  id="field-price"
                  type="number"
                  step="0.01"
                  min="0.0001"
                  className={`rt-input with-prefix ${errors.price ? 'error' : ''}`}
                  placeholder="e.g. 1500.00"
                  value={form.price}
                  onChange={(e) => setField('price', e.target.value)}
                />
              </div>
              {errors.price ? (
                <div className="rt-input-error">⚠ {errors.price}</div>
              ) : (
                <div className="rt-input-hint">Transport rate / unit price</div>
              )}
            </CCol>
          </CRow>
        </CModalBody>

        <CModalFooter className="rt-modal-footer">
          <button
            className="rt-btn-cancel"
            onClick={() => setModalVisible(false)}
            disabled={saving}
            id="btn-modal-cancel-route"
          >
            Cancel
          </button>
          <button
            className="rt-btn-save"
            onClick={handleSave}
            disabled={saving}
            id="btn-modal-save-route"
          >
            {saving ? (
              <>
                <CSpinner size="sm" style={{ marginRight: 4 }} /> Saving…
              </>
            ) : (
              <>
                <CIcon icon={editMode ? cilPencil : cilPlus} />
                {editMode ? 'Save Changes' : 'Add Route'}
              </>
            )}
          </button>
        </CModalFooter>
      </CModal>
    </div>
  )
}

export default Routes
