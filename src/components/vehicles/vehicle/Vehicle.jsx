/**
 * Vehicle Management Page
 *
 * Design matches Receipts & BulkUpload pages exactly.
 * API:
 *   GET  /api/material-grid/vehicles?search=&page=&size=
 *   POST /api/material-grid/vehicles          { vehicleNumber, capacity }
 *   PUT  /api/material-grid/vehicles/{id}     { capacity }
 *   PATCH /api/material-grid/vehicles/{id}/status?status=
 *   DELETE /api/material-grid/vehicles/{id}   (handled client-side / via status)
 *
 * @module Vehicle
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
  cilCarAlt,
  cilPencil,
  cilBan,
  cilCheckCircle,
  cilSearch,
  cilPlus,
  cilReload,
  cilTruck,
  cilTrash,
  cilChevronLeft,
  cilChevronRight,
  cilFilter,
  cilCloudUpload,
} from '@coreui/icons'
import vehicleService from '../../../service/vehicleService'
import VehicleBulkUploadModal from './VehicleBulkUploadModal'
import './Vehicle.css'

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 15
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
  const [vehicles, setVehicles] = useState([])
  const [totalElements, setTotalElements] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [searchInput, setSearchInput] = useState('')

  // ── Modal / form state ───────────────────────────────────────────────────────
  const [modalVisible, setModalVisible] = useState(false)
  const [bulkModalVisible, setBulkModalVisible] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const debouncedSearch = useDebounce(searchInput, 400)
  const abortRef = useRef(null)

  // ── Load vehicles ────────────────────────────────────────────────────────────
  const loadVehicles = useCallback(async (page = 0, search = '') => {
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()
    setLoading(true)
    try {
      const result = await vehicleService.getVehicles(
        { search, page, size: PAGE_SIZE, sort: 'id,asc' },
        abortRef.current.signal,
      )
      const content = result?.content ?? (Array.isArray(result) ? result : [])
      setVehicles(content)
      setTotalElements(result?.totalElements ?? content.length)
      setTotalPages(result?.totalPages ?? 1)
      setCurrentPage(result?.number ?? page)
    } catch (err) {
      if (err.name === 'AbortError') return
      setVehicles([])
      setTotalElements(0)
      setTotalPages(0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadVehicles(0, debouncedSearch)
    setCurrentPage(0)
  }, [debouncedSearch, loadVehicles])

  const goToPage = (page) => {
    if (page < 0 || page >= totalPages) return
    loadVehicles(page, debouncedSearch)
    setCurrentPage(page)
  }

  // ── Form helpers ─────────────────────────────────────────────────────────────
  const setField = (key, val) => {
    setForm((p) => ({ ...p, [key]: val }))
    if (errors[key]) setErrors((p) => ({ ...p, [key]: '' }))
  }

  const validate = () => {
    const e = {}
    if (!form.vehicleNumber.trim()) e.vehicleNumber = 'Vehicle number is required'
    const cap = Number(form.capacity)
    if (!form.capacity && form.capacity !== 0) {
      e.capacity = 'Capacity is required'
    } else if (isNaN(cap) || cap <= 0) {
      e.capacity = 'Enter a valid positive number'
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

  const openEdit = (v) => {
    setEditMode(true)
    setSelectedId(v.id)
    setForm({
      vehicleNumber: v.vehicleNumber || '',
      capacity: v.capacity != null ? String(v.capacity) : '',
    })
    setErrors({})
    setModalVisible(true)
  }

  // ── Save ─────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    const payload = {
      vehicleNumber: form.vehicleNumber.trim().toUpperCase(),
      capacity: Number(form.capacity),
    }
    try {
      if (editMode) {
        await vehicleService.updateVehicle(selectedId, payload)
        Swal.fire({
          icon: 'success',
          title: 'Vehicle Updated',
          text: `${payload.vehicleNumber} has been updated.`,
          confirmButtonColor: '#d97706',
          timer: 2200,
          timerProgressBar: true,
        })
      } else {
        await vehicleService.createVehicle(payload)
        Swal.fire({
          icon: 'success',
          title: 'Vehicle Added',
          text: `${payload.vehicleNumber} has been registered.`,
          confirmButtonColor: '#d97706',
          timer: 2200,
          timerProgressBar: true,
        })
      }
      setModalVisible(false)
      loadVehicles(editMode ? currentPage : 0, debouncedSearch)
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

  // ── Delete ───────────────────────────────────────────────────────────────────
  const handleDelete = async (v) => {
    const res = await Swal.fire({
      title: `Delete ${v.vehicleNumber}?`,
      text: 'This action cannot be undone.',
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
      await vehicleService.deleteVehicle(v.id)
      Swal.fire({
        icon: 'success',
        title: 'Deleted',
        text: `${v.vehicleNumber} has been removed.`,
        confirmButtonColor: '#d97706',
        timer: 1800,
        timerProgressBar: true,
      })
      loadVehicles(currentPage, debouncedSearch)
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Failed to delete',
        text: err.message,
        confirmButtonColor: '#d97706',
        timer: 5000,
        timerProgressBar: true,
      })
    }
  }

  // ── Counts ───────────────────────────────────────────────────────────────────
  const startItem = totalElements === 0 ? 0 : currentPage * PAGE_SIZE + 1
  const endItem = Math.min((currentPage + 1) * PAGE_SIZE, totalElements)

  return (
    <div className="vm-page">
      {/* ── Page Header ── */}
      <div className="vm-page-header">
        <div className="vm-header-left">
          <div className="vm-header-icon">
            <CIcon icon={cilCarAlt} size="xl" />
          </div>
          <div>
            <h1 className="vm-page-title">Vehicle Management</h1>
            <p className="vm-page-subtitle">Vehicle number &amp; cube capacity</p>
          </div>
        </div>
        <div className="vm-header-actions">
          <button
            type="button"
            className="vm-btn-upload-excel"
            onClick={() => setBulkModalVisible(true)}
            id="btn-bulk-upload-vehicle"
            title="Upload Vehicle Excel Sheet"
          >
            <CIcon icon={cilCloudUpload} />
            Upload Excel
          </button>
          <button className="vm-btn-add" onClick={openAdd} id="btn-add-vehicle">
            <CIcon icon={cilPlus} />
            Add Vehicle
          </button>
        </div>
      </div>

      {/* ── Filter Card ── */}
      <CCard className="vm-card">
        <CCardHeader className="vm-card-header">
          <div className="vm-card-title">
            <CIcon icon={cilFilter} className="text-warning" />
            <span>Search &amp; Filter</span>
          </div>
          <button
            className="vm-btn-reset"
            onClick={() => {
              setSearchInput('')
            }}
          >
            <CIcon icon={cilReload} size="sm" />
            Reset Filter
          </button>
        </CCardHeader>
        <CCardBody className="vm-card-body">
          <CRow className="g-3">
            {/* Search */}
            <CCol xs={12} sm={8} md={5} lg={4}>
              <label className="vm-label">
                <CIcon icon={cilSearch} size="sm" className="text-warning" />
                Search Vehicle Number
              </label>
              <div className="vm-search-wrap">
                <span className="vm-search-icon">
                  {loading ? (
                    <CSpinner size="sm" style={{ color: '#d97706', width: 13, height: 13 }} />
                  ) : (
                    <CIcon icon={cilSearch} size="sm" />
                  )}
                </span>
                <input
                  id="vehicle-search"
                  type="text"
                  className="vm-search-input"
                  placeholder="e.g. LC-4838"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  autoComplete="off"
                  style={{ paddingLeft: '2.25rem' }}
                />
              </div>
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>

      {/* ── Vehicle Table Card ── */}
      <CCard className="vm-card">
        <div className="vm-table-wrap">
          {loading && vehicles.length === 0 ? (
            <div className="vm-loading">
              <div className="vm-spinner" />
            </div>
          ) : (
            <>
              <table className="vm-table">
                <thead>
                  <tr>
                    <th style={{ width: 44 }}>#</th>
                    <th>Vehicle Number</th>
                    <th>Capacity (cube)</th>
                    <th style={{ textAlign: 'center', width: 120 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.length === 0 ? (
                    <tr>
                      <td colSpan={4}>
                        <div className="vm-empty">
                          <div className="vm-empty-icon">
                            <CIcon icon={cilTruck} size="xl" />
                          </div>
                          <h3>No vehicles found</h3>
                          <p>
                            {searchInput
                              ? 'Try a different search term.'
                              : 'Click "Add Vehicle" to register the first vehicle.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    vehicles.map((v, i) => (
                      <tr key={v.id}>
                        <td className="vm-td-num">{startItem + i}</td>
                        <td>
                          <span className="vm-reg-pill">
                            <CIcon icon={cilTruck} size="sm" style={{ color: '#f59e0b' }} />
                            {v.vehicleNumber}
                          </span>
                        </td>
                        <td>
                          <span className="vm-capacity-val">
                            {v.capacity ?? '—'}
                            <span className="vm-capacity-unit">cube</span>
                          </span>
                        </td>
                        <td>
                          <div className="vm-actions">
                            {/* Edit */}
                            <button
                              className="vm-icon-btn edit"
                              title="Edit vehicle"
                              onClick={() => openEdit(v)}
                              id={`btn-edit-${v.id}`}
                            >
                              <CIcon icon={cilPencil} size="sm" />
                            </button>

                            {/* Delete */}
                            <button
                              className="vm-icon-btn delete"
                              title="Delete vehicle"
                              onClick={() => handleDelete(v)}
                              id={`btn-delete-${v.id}`}
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
                <div className="vm-table-footer">
                  <span>
                    {startItem}–{endItem} of <span className="vm-count-chip">{totalElements}</span>{' '}
                    vehicles
                  </span>

                  {totalPages > 1 && (
                    <div className="vm-pagination">
                      <button
                        className="vm-page-btn"
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 0 || loading}
                        title="Previous"
                      >
                        <CIcon icon={cilChevronLeft} size="sm" />
                      </button>

                      {Array.from({ length: totalPages }, (_, i) => i)
                        .filter((p) => Math.abs(p - currentPage) <= 2)
                        .map((p) => (
                          <button
                            key={p}
                            className={`vm-page-btn ${p === currentPage ? 'active' : ''}`}
                            onClick={() => goToPage(p)}
                            disabled={loading}
                          >
                            {p + 1}
                          </button>
                        ))}

                      <button
                        className="vm-page-btn"
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

      {/* ══════════ MODAL — ADD / EDIT ══════════ */}
      <CModal
        size="sm"
        visible={modalVisible}
        onClose={() => !saving && setModalVisible(false)}
        backdrop="static"
        id="vehicle-modal"
      >
        <CModalHeader className="vm-modal-header">
          <CModalTitle className="vm-modal-title">
            <CIcon icon={editMode ? cilPencil : cilPlus} style={{ color: '#f59e0b' }} />
            {editMode ? 'Edit Vehicle' : 'Add Vehicle'}
          </CModalTitle>
        </CModalHeader>

        <CModalBody className="vm-modal-body">
          <CRow className="g-3">
            {/* Vehicle Number */}
            <CCol xs={12}>
              <label className="vm-label" htmlFor="field-veh-num">
                Vehicle Number <span className="req">*</span>
              </label>
              <input
                id="field-veh-num"
                type="text"
                className={`vm-input ${errors.vehicleNumber ? 'error' : ''}`}
                placeholder="e.g. LC-4838"
                value={form.vehicleNumber}
                onChange={(e) => setField('vehicleNumber', e.target.value)}
                autoFocus={!editMode}
              />
              {errors.vehicleNumber ? (
                <div className="vm-input-error">⚠ {errors.vehicleNumber}</div>
              ) : null}
            </CCol>

            {/* Capacity */}
            <CCol xs={12}>
              <label className="vm-label" htmlFor="field-capacity">
                Capacity (cube) <span className="req">*</span>
              </label>
              <input
                id="field-capacity"
                type="number"
                step="0.1"
                min="0.1"
                className={`vm-input ${errors.capacity ? 'error' : ''}`}
                placeholder="e.g. 4.5"
                value={form.capacity}
                onChange={(e) => setField('capacity', e.target.value)}
                autoFocus={editMode}
              />
              {errors.capacity ? (
                <div className="vm-input-error">⚠ {errors.capacity}</div>
              ) : (
                <div className="vm-input-hint">Load capacity in cubic meters</div>
              )}
            </CCol>
          </CRow>
        </CModalBody>

        <CModalFooter className="vm-modal-footer">
          <button
            className="vm-btn-cancel"
            onClick={() => setModalVisible(false)}
            disabled={saving}
            id="btn-modal-cancel"
          >
            Cancel
          </button>
          <button
            className="vm-btn-save"
            onClick={handleSave}
            disabled={saving}
            id="btn-modal-save"
          >
            {saving ? (
              <>
                <CSpinner size="sm" style={{ marginRight: 4 }} /> Saving…
              </>
            ) : (
              <>
                <CIcon icon={editMode ? cilPencil : cilPlus} />{' '}
                {editMode ? 'Save Changes' : 'Add Vehicle'}
              </>
            )}
          </button>
        </CModalFooter>
      </CModal>

      {/* ══════════ MODAL — BULK EXCEL UPLOAD ══════════ */}
      <VehicleBulkUploadModal
        visible={bulkModalVisible}
        onClose={() => setBulkModalVisible(false)}
        onSuccess={() => loadVehicles(0, debouncedSearch)}
      />
    </div>
  )
}

export default Vehicle
