/**
 * Vehicle Management Page
 *
 * Connects to:
 *   GET  /api/material-grid/vehicles?search=&page=&size=  → paginated table
 *   GET  /api/material-grid/vehicles/search?query=        → (used by Receipts)
 *   POST /api/material-grid/vehicles                      → create
 *   PUT  /api/material-grid/vehicles/{id}                 → update
 *   PATCH /api/material-grid/vehicles/{id}/status?status= → toggle
 *
 * @module Vehicle
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import Swal from 'sweetalert2'
import CIcon from '@coreui/icons-react'
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CSpinner,
} from '@coreui/react'
import {
  cilCarAlt,
  cilPencil,
  cilBan,
  cilCheckCircle,
  cilSearch,
  cilPlus,
  cilReload,
  cilTruck,
  cilChevronLeft,
  cilChevronRight,
} from '@coreui/icons'
import vehicleService from '../../service/vehicleService'
import './Vehicle.css'

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 10
const EMPTY_FORM = { vehicleNumber: '', capacity: '' }

// ─── Debounce hook ────────────────────────────────────────────────────────────
function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

// ─── Component ────────────────────────────────────────────────────────────────
const Vehicle = () => {
  // ── Table state ─────────────────────────────────────────────────────────────
  const [vehicles, setVehicles]         = useState([])          // current page content
  const [totalElements, setTotalElements] = useState(0)
  const [totalPages, setTotalPages]     = useState(0)
  const [currentPage, setCurrentPage]   = useState(0)          // 0-based
  const [loading, setLoading]           = useState(false)
  const [searchInput, setSearchInput]   = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  // ── Modal / form state ───────────────────────────────────────────────────────
  const [modalVisible, setModalVisible] = useState(false)
  const [editMode, setEditMode]         = useState(false)
  const [selectedId, setSelectedId]     = useState(null)
  const [form, setForm]                 = useState(EMPTY_FORM)
  const [errors, setErrors]             = useState({})
  const [saving, setSaving]             = useState(false)

  // ── Debounced search ─────────────────────────────────────────────────────────
  const debouncedSearch = useDebounce(searchInput, 400)
  const abortRef = useRef(null)

  // ── Load vehicles (server-side, paginated) ───────────────────────────────────
  const loadVehicles = useCallback(async (page = 0, search = '', statusF = 'ALL') => {
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()

    setLoading(true)
    try {
      const result = await vehicleService.getVehicles(
        { search, page, size: PAGE_SIZE, sort: 'id,asc' },
        abortRef.current.signal
      )

      // result is PageResponse: { content, totalElements, totalPages, number, size }
      let content = result?.content ?? (Array.isArray(result) ? result : [])

      // client-side status filter (if backend doesn't support it)
      if (statusF !== 'ALL') {
        content = content.filter((v) => v.status === statusF)
      }

      setVehicles(content)
      setTotalElements(result?.totalElements ?? content.length)
      setTotalPages(result?.totalPages ?? 1)
      setCurrentPage(result?.number ?? page)
    } catch (err) {
      if (err.name === 'AbortError') return
      console.warn('Backend unavailable — check your API server:', err.message)
      setVehicles([])
      setTotalElements(0)
      setTotalPages(0)
    } finally {
      setLoading(false)
    }
  }, [])

  // Re-fetch whenever search/filter/page changes
  useEffect(() => {
    loadVehicles(0, debouncedSearch, statusFilter)
    setCurrentPage(0)
  }, [debouncedSearch, statusFilter, loadVehicles])

  const goToPage = (page) => {
    if (page < 0 || page >= totalPages) return
    loadVehicles(page, debouncedSearch, statusFilter)
    setCurrentPage(page)
  }

  // ── Form helpers ─────────────────────────────────────────────────────────────
  const setField = (key, val) => {
    setForm((p) => ({ ...p, [key]: val }))
    if (errors[key]) setErrors((p) => ({ ...p, [key]: '' }))
  }

  const validate = () => {
    const e = {}
    if (!form.vehicleNumber.trim()) {
      e.vehicleNumber = 'Vehicle number is required'
    }
    const cap = Number(form.capacity)
    if (!form.capacity && form.capacity !== 0) {
      e.capacity = 'Capacity is required'
    } else if (isNaN(cap) || cap <= 0) {
      e.capacity = 'Enter a valid positive number'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // ── Open modals ──────────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditMode(false)
    setSelectedId(null)
    setForm(EMPTY_FORM)
    setErrors({})
    setModalVisible(true)
  }

  const openEdit = (v) => {
    setEditMode(true)
    setSelectedId(v.id)
    setForm({
      vehicleNumber: v.vehicleNumber || '',
      capacity:      v.capacity != null ? String(v.capacity) : '',
    })
    setErrors({})
    setModalVisible(true)
  }

  // ── Save (create / update) ───────────────────────────────────────────────────
  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)

    // Only send the fields VehicleCreateRequest / VehicleUpdateRequest accept
    const payload = {
      vehicleNumber: form.vehicleNumber.trim().toUpperCase(),
      capacity:      Number(form.capacity),
    }

    try {
      if (editMode) {
        await vehicleService.updateVehicle(selectedId, payload)
        Swal.fire({
          icon: 'success', title: 'Vehicle Updated',
          text: `${payload.vehicleNumber} updated successfully.`,
          confirmButtonColor: '#d97706', timer: 2200, timerProgressBar: true,
        })
      } else {
        await vehicleService.createVehicle(payload)
        Swal.fire({
          icon: 'success', title: 'Vehicle Added',
          text: `${payload.vehicleNumber} has been registered.`,
          confirmButtonColor: '#d97706', timer: 2200, timerProgressBar: true,
        })
      }
      setModalVisible(false)
      // Refresh current page
      loadVehicles(currentPage, debouncedSearch, statusFilter)
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Save Failed',
        text: err.message || 'Could not save. Please try again.',
        confirmButtonColor: '#dc2626',
      })
    } finally {
      setSaving(false)
    }
  }

  // ── Toggle status ────────────────────────────────────────────────────────────
  const handleToggle = async (v) => {
    const next  = v.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    const label = next === 'ACTIVE' ? 'Activate' : 'Deactivate'
    const color = next === 'ACTIVE' ? '#059669' : '#dc2626'

    const res = await Swal.fire({
      title: `${label} ${v.vehicleNumber}?`,
      text:  `This vehicle will be marked as ${next}.`,
      icon:  'question',
      showCancelButton: true,
      confirmButtonText: label,
      cancelButtonText: 'Cancel',
      confirmButtonColor: color,
      cancelButtonColor: '#64748b',
      reverseButtons: true,
    })
    if (!res.isConfirmed) return

    try {
      await vehicleService.toggleVehicleStatus(v.id, next)
      Swal.fire({
        icon: 'success',
        title: next === 'ACTIVE' ? 'Activated' : 'Deactivated',
        text: `${v.vehicleNumber} is now ${next}.`,
        confirmButtonColor: '#d97706', timer: 1800, timerProgressBar: true,
      })
      loadVehicles(currentPage, debouncedSearch, statusFilter)
    } catch (err) {
      Swal.fire({
        icon: 'error', title: 'Failed',
        text: err.message || 'Could not update status.',
        confirmButtonColor: '#dc2626',
      })
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  const startItem = totalElements === 0 ? 0 : currentPage * PAGE_SIZE + 1
  const endItem   = Math.min((currentPage + 1) * PAGE_SIZE, totalElements)

  return (
    <div className="vh-page">

      {/* ── Header ── */}
      <div className="vh-page-header">
        <div className="vh-header-left">
          <div className="vh-header-icon">
            <CIcon icon={cilCarAlt} size="xl" />
          </div>
          <div>
            <h1 className="vh-page-title">Vehicle Management</h1>
            <p className="vh-page-subtitle">
              Fleet registry — vehicle number &amp; cube capacity
            </p>
          </div>
        </div>
        <button className="vh-btn-add" onClick={openAdd} id="btn-add-vehicle">
          <CIcon icon={cilPlus} />
          Add Vehicle
        </button>
      </div>

      {/* ── Search + Filter row ── */}
      <div className="vh-search-bar">
        {/* Search input — debounced, triggers server-side query */}
        <div className="vh-search-wrap">
          <span className="vh-search-icon-pos">
            {loading
              ? <CSpinner size="sm" style={{ color: '#d97706', width: 14, height: 14 }} />
              : <CIcon icon={cilSearch} size="sm" />
            }
          </span>
          <input
            id="vehicle-search"
            type="text"
            className="vh-search-input"
            placeholder="Search vehicle number…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            autoComplete="off"
          />
        </div>

        {/* Status filter */}
        <select
          id="vehicle-status-filter"
          className="vh-filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>

        {/* Clear */}
        <button
          className="vh-btn-cancel"
          style={{ height: 42 }}
          title="Clear filters"
          onClick={() => { setSearchInput(''); setStatusFilter('ALL') }}
        >
          <CIcon icon={cilReload} size="sm" />
        </button>
      </div>

      {/* ── Table Card ── */}
      <div className="vh-card">
        {loading && vehicles.length === 0 ? (
          <div className="vh-loading"><div className="vh-spinner" /></div>
        ) : (
          <>
            <table className="vh-table">
              <thead>
                <tr>
                  <th style={{ width: 44 }}>#</th>
                  <th>Vehicle Number</th>
                  <th>Capacity</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="vh-empty">
                        <div className="vh-empty-icon">
                          <CIcon icon={cilTruck} size="xl" />
                        </div>
                        <h3>No vehicles found</h3>
                        <p>
                          {searchInput || statusFilter !== 'ALL'
                            ? 'Try a different search or filter.'
                            : 'Click "Add Vehicle" to register the first vehicle.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  vehicles.map((v, i) => (
                    <tr key={v.id}>
                      <td className="vh-td-num">{startItem + i}</td>
                      <td>
                        <span className="vh-reg-pill">
                          <CIcon icon={cilTruck} size="sm" style={{ color: '#f59e0b' }} />
                          {v.vehicleNumber}
                        </span>
                      </td>
                      <td>
                        <span className="vh-capacity-val">
                          {v.capacity ?? '—'}
                          <span className="vh-capacity-unit">m³</span>
                        </span>
                      </td>
                      <td>
                        <span className={`vh-badge ${v.status === 'ACTIVE' ? 'active' : 'inactive'}`}>
                          <span className="vh-badge-dot" />
                          {v.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div className="vh-actions">
                          <button
                            className="vh-icon-btn edit"
                            title="Edit vehicle"
                            onClick={() => openEdit(v)}
                            id={`btn-edit-${v.id}`}
                          >
                            <CIcon icon={cilPencil} size="sm" />
                          </button>
                          {v.status === 'ACTIVE' ? (
                            <button
                              className="vh-icon-btn deactivate"
                              title="Deactivate"
                              onClick={() => handleToggle(v)}
                              id={`btn-deactivate-${v.id}`}
                            >
                              <CIcon icon={cilBan} size="sm" />
                            </button>
                          ) : (
                            <button
                              className="vh-icon-btn activate"
                              title="Activate"
                              onClick={() => handleToggle(v)}
                              id={`btn-activate-${v.id}`}
                            >
                              <CIcon icon={cilCheckCircle} size="sm" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* ── Table Footer: count + pagination ── */}
            {totalElements > 0 && (
              <div className="vh-table-footer">
                <span>
                  {startItem}–{endItem} of{' '}
                  <span className="vh-count-badge">{totalElements}</span> vehicles
                </span>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="vh-pagination">
                    <button
                      className="vh-page-btn"
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 0 || loading}
                      title="Previous page"
                    >
                      <CIcon icon={cilChevronLeft} size="sm" />
                    </button>

                    {/* Page numbers */}
                    {Array.from({ length: totalPages }, (_, i) => i)
                      .filter((p) => Math.abs(p - currentPage) <= 2)
                      .map((p) => (
                        <button
                          key={p}
                          className={`vh-page-btn ${p === currentPage ? 'active' : ''}`}
                          onClick={() => goToPage(p)}
                          disabled={loading}
                        >
                          {p + 1}
                        </button>
                      ))}

                    <button
                      className="vh-page-btn"
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage >= totalPages - 1 || loading}
                      title="Next page"
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

      {/* ══════════ MODAL — ADD / EDIT ══════════ */}
      <CModal
        size="sm"
        visible={modalVisible}
        onClose={() => !saving && setModalVisible(false)}
        backdrop="static"
        id="vehicle-modal"
      >
        <CModalHeader className="vh-modal-header">
          <CModalTitle className="vh-modal-title">
            <CIcon icon={editMode ? cilPencil : cilPlus} style={{ color: '#f59e0b' }} />
            {editMode ? 'Edit Vehicle' : 'Add Vehicle'}
          </CModalTitle>
        </CModalHeader>

        <CModalBody className="vh-modal-body">

          {/* Vehicle Number */}
          <div className="vh-form-group">
            <label className="vh-label" htmlFor="field-veh-num">
              Vehicle Number <span className="req">*</span>
            </label>
            <input
              id="field-veh-num"
              type="text"
              className={`vh-input ${errors.vehicleNumber ? 'error' : ''}`}
              placeholder="e.g. LC-4838"
              value={form.vehicleNumber}
              onChange={(e) => setField('vehicleNumber', e.target.value)}
              disabled={editMode}
              style={editMode ? { background: '#f9fafb', cursor: 'not-allowed', color: '#6b7280' } : {}}
              autoFocus={!editMode}
            />
            {errors.vehicleNumber
              ? <div className="vh-input-error">⚠ {errors.vehicleNumber}</div>
              : editMode
                ? <div className="vh-input-hint">Vehicle number cannot be changed after creation</div>
                : null
            }
          </div>

          {/* Capacity in Cube */}
          <div className="vh-form-group">
            <label className="vh-label" htmlFor="field-capacity">
              Capacity (Cubes — m³) <span className="req">*</span>
            </label>
            <input
              id="field-capacity"
              type="number"
              step="0.1"
              min="0.1"
              className={`vh-input ${errors.capacity ? 'error' : ''}`}
              placeholder="e.g. 4.5"
              value={form.capacity}
              onChange={(e) => setField('capacity', e.target.value)}
              autoFocus={editMode}
            />
            {errors.capacity
              ? <div className="vh-input-error">⚠ {errors.capacity}</div>
              : <div className="vh-input-hint">Vehicle load capacity in cubic meters</div>
            }
          </div>

        </CModalBody>

        <CModalFooter className="vh-modal-footer">
          <button
            className="vh-btn-cancel"
            onClick={() => setModalVisible(false)}
            disabled={saving}
            id="btn-modal-cancel"
          >
            Cancel
          </button>
          <button
            className="vh-btn-save"
            onClick={handleSave}
            disabled={saving}
            id="btn-modal-save"
          >
            {saving
              ? <><CSpinner size="sm" /> Saving…</>
              : <><CIcon icon={editMode ? cilPencil : cilPlus} /> {editMode ? 'Save Changes' : 'Add Vehicle'}</>
            }
          </button>
        </CModalFooter>
      </CModal>
    </div>
  )
}

export default Vehicle
