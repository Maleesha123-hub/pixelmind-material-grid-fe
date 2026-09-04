/**
 * Person Management Page
 *
 * Master data management for persons (ownership types: MOUNT_OWNER, EXCAVATOR_OWNER).
 * Matches the design and architecture of Vehicles, Routes, and License management pages.
 *
 * Backend integration:
 *   - GET    /api/v1/persons?search=&page=&size=&sort= → ApiResponse<PageResponse<PersonResponse>>
 *   - GET    /api/v1/persons/{id}                     → ApiResponse<PersonResponse>
 *   - POST   /api/v1/persons                          → ApiResponse<PersonResponse> { name, personType }
 *   - PUT    /api/v1/persons/{id}                     → ApiResponse<PersonResponse> { name, personType }
 *   - DELETE /api/v1/persons/{id}                     → ApiResponse<Void>
 *
 * @module Persons
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
  cilPeople,
  cilUser,
  cilPencil,
  cilSearch,
  cilPlus,
  cilReload,
  cilTrash,
  cilChevronLeft,
  cilChevronRight,
  cilFilter,
} from '@coreui/icons'
import personService from '../../service/personService'
import './Persons.css'

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 15

export const PERSON_TYPES = [
  { value: 'MOUNT_OWNER', label: 'Mount Owner', badgeClass: 'mount-owner' },
  { value: 'EXCAVATOR_OWNER', label: 'Excavator Owner', badgeClass: 'excavator-owner' },
]

const EMPTY_FORM = {
  name: '',
  personType: 'MOUNT_OWNER',
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

const Persons = () => {
  // ── Table state ─────────────────────────────────────────────────────────────
  const [personsList, setPersonsList] = useState([])
  const [totalElements, setTotalElements] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [searchInput, setSearchInput] = useState('')

  // ── Modal / form state ───────────────────────────────────────────────────────
  const [modalVisible, setModalVisible] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [selectedPerson, setSelectedPerson] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const debouncedSearch = useDebounce(searchInput, 400)
  const abortRef = useRef(null)

  // ── Load persons ────────────────────────────────────────────────────────────
  const loadPersons = useCallback(async (page = 0, search = '') => {
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()
    setLoading(true)
    try {
      const result = await personService.getPersons(
        { search, page, size: PAGE_SIZE, sort: 'id,desc' },
        abortRef.current.signal,
      )
      const content = result?.content ?? (Array.isArray(result) ? result : [])

      setPersonsList(content)
      setTotalElements(result?.totalElements ?? content.length)
      setTotalPages(result?.totalPages ?? Math.max(1, Math.ceil(content.length / PAGE_SIZE)))
      setCurrentPage(result?.number ?? page)
    } catch (err) {
      if (err.name === 'AbortError') return
      setPersonsList([])
      setTotalElements(0)
      setTotalPages(0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPersons(0, debouncedSearch)
    setCurrentPage(0)
  }, [debouncedSearch, loadPersons])

  const goToPage = (page) => {
    if (page < 0 || page >= totalPages) return
    loadPersons(page, debouncedSearch)
    setCurrentPage(page)
  }

  // ── Form helpers ─────────────────────────────────────────────────────────────
  const setField = (key, val) => {
    setForm((p) => ({ ...p, [key]: val }))
    if (errors[key]) setErrors((p) => ({ ...p, [key]: '' }))
  }

  const validate = () => {
    const e = {}
    const trimmedName = form.name.trim()
    if (!trimmedName) {
      e.name = 'Person name is required'
    } else if (trimmedName.length > 150) {
      e.name = 'Person name cannot exceed 150 characters'
    }

    if (!form.personType) {
      e.personType = 'Person type is required'
    } else if (!['MOUNT_OWNER', 'EXCAVATOR_OWNER'].includes(form.personType)) {
      e.personType = 'Please select a valid person type'
    }

    setErrors(e)
    return Object.keys(e).length === 0
  }

  // ── Modals ───────────────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditMode(false)
    setSelectedPerson(null)
    setForm(EMPTY_FORM)
    setErrors({})
    setModalVisible(true)
  }

  const openEdit = (p) => {
    setEditMode(true)
    setSelectedPerson(p)
    setForm({
      name: p.name || '',
      personType: p.personType || 'MOUNT_OWNER',
    })
    setErrors({})
    setModalVisible(true)
  }

  // ── Save (Create / Update) ───────────────────────────────────────────────────
  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    const payload = {
      name: form.name.trim(),
      personType: form.personType,
    }

    try {
      if (editMode) {
        await personService.updatePerson(selectedPerson.id, payload)
        Swal.fire({
          icon: 'success',
          title: 'Person Updated',
          text: `"${payload.name}" details have been successfully updated.`,
          confirmButtonColor: '#d97706',
          timer: 2200,
          timerProgressBar: true,
        })
      } else {
        await personService.createPerson(payload)
        Swal.fire({
          icon: 'success',
          title: 'Person Created',
          text: `"${payload.name}" has been registered successfully.`,
          confirmButtonColor: '#d97706',
          timer: 2200,
          timerProgressBar: true,
        })
      }
      setModalVisible(false)
      loadPersons(editMode ? currentPage : 0, debouncedSearch)
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Save Failed',
        text: err.message || 'Could not save person details. Please try again.',
        confirmButtonColor: '#dc2626',
      })
    } finally {
      setSaving(false)
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────────
  const handleDelete = async (p) => {
    const res = await Swal.fire({
      title: `Delete ${p.name}?`,
      text: p.personCode
        ? `Code: ${p.personCode}. This action cannot be undone.`
        : 'This action cannot be undone.',
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
      await personService.deletePerson(p.id)
      Swal.fire({
        icon: 'success',
        title: 'Deleted',
        text: `"${p.name}" has been removed.`,
        confirmButtonColor: '#d97706',
        timer: 1800,
        timerProgressBar: true,
      })
      loadPersons(currentPage, debouncedSearch)
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Failed to delete',
        text: err.message || 'Could not delete person.',
        confirmButtonColor: '#d97706',
        timer: 5000,
        timerProgressBar: true,
      })
    }
  }

  // ── Counts ───────────────────────────────────────────────────────────────────
  const startItem = totalElements === 0 ? 0 : currentPage * PAGE_SIZE + 1
  const endItem = Math.min((currentPage + 1) * PAGE_SIZE, totalElements)

  // ── Person Type Helper ───────────────────────────────────────────────────────
  const getPersonTypeMeta = (type) => {
    return (
      PERSON_TYPES.find((t) => t.value === type) || {
        value: type,
        label: type || 'Unknown',
        badgeClass: 'mount-owner',
      }
    )
  }

  return (
    <div className="pm-page">
      {/* ── Page Header ── */}
      <div className="pm-page-header">
        <div className="pm-header-left">
          <div className="pm-header-icon">
            <CIcon icon={cilPeople} size="xl" />
          </div>
          <div>
            <h1 className="pm-page-title">Person Management</h1>
            <p className="pm-page-subtitle">Manage persons, ownership types &amp; details</p>
          </div>
        </div>
        <div className="pm-header-actions">
          <button className="pm-btn-add" onClick={openAdd} id="btn-add-person">
            <CIcon icon={cilPlus} />
            Add Person
          </button>
        </div>
      </div>

      {/* ── Filter Card ── */}
      <CCard className="pm-card">
        <CCardHeader className="pm-card-header">
          <div className="pm-card-title">
            <CIcon icon={cilFilter} className="text-warning" />
            <span>Search &amp; Filter</span>
          </div>
          <button
            className="pm-btn-reset"
            onClick={() => setSearchInput('')}
            id="btn-reset-person-filter"
          >
            <CIcon icon={cilReload} size="sm" />
            Reset Filter
          </button>
        </CCardHeader>
        <CCardBody className="pm-card-body">
          <CRow className="g-3">
            {/* Search by Name */}
            <CCol xs={12} sm={8} md={6} lg={4}>
              <label className="pm-label" htmlFor="person-search-input">
                <CIcon icon={cilSearch} size="sm" className="text-warning" />
                Search by Person Name
              </label>
              <div className="pm-search-wrap">
                <span className="pm-search-icon">
                  {loading ? (
                    <CSpinner size="sm" style={{ color: '#d97706', width: 13, height: 13 }} />
                  ) : (
                    <CIcon icon={cilSearch} size="sm" />
                  )}
                </span>
                <input
                  id="person-search-input"
                  type="text"
                  className="pm-search-input"
                  placeholder="e.g. John Doe, Nimal Perera..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  autoComplete="off"
                />
              </div>
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>

      {/* ── Persons Table Card ── */}
      <CCard className="pm-card">
        <div className="pm-table-wrap">
          {loading && personsList.length === 0 ? (
            <div className="pm-loading">
              <div className="pm-spinner" />
            </div>
          ) : (
            <>
              <table className="pm-table">
                <thead>
                  <tr>
                    <th style={{ width: 44 }}>#</th>
                    <th style={{ width: 140 }}>Person Code</th>
                    <th>Name</th>
                    <th style={{ width: 200 }}>Person Type</th>
                    <th style={{ textAlign: 'center', width: 120 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {personsList.length === 0 ? (
                    <tr>
                      <td colSpan={5}>
                        <div className="pm-empty">
                          <div className="pm-empty-icon">
                            <CIcon icon={cilPeople} size="xl" />
                          </div>
                          <h3>No persons found</h3>
                          <p>
                            {searchInput
                              ? 'Try a different search keyword.'
                              : 'Click "Add Person" to register the first person.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    personsList.map((p, i) => {
                      const typeMeta = getPersonTypeMeta(p.personType)
                      const initial = p.name ? p.name.trim().charAt(0).toUpperCase() : 'P'

                      return (
                        <tr key={p.id}>
                          <td className="pm-td-num">{startItem + i}</td>
                          <td>
                            <span className="pm-code-badge">{p.personCode || `PER-${p.id}`}</span>
                          </td>
                          <td>
                            <div className="pm-name-cell">
                              <span className="pm-avatar-mini">{initial}</span>
                              <span>{p.name}</span>
                            </div>
                          </td>
                          <td>
                            <span className={`pm-type-badge ${typeMeta.badgeClass}`}>
                              <span className="pm-type-dot" />
                              {typeMeta.label}
                            </span>
                          </td>
                          <td>
                            <div className="pm-actions">
                              {/* Edit */}
                              <button
                                className="pm-icon-btn edit"
                                title="Edit person"
                                onClick={() => openEdit(p)}
                                id={`btn-edit-person-${p.id}`}
                              >
                                <CIcon icon={cilPencil} size="sm" />
                              </button>

                              {/* Delete */}
                              <button
                                className="pm-icon-btn delete"
                                title="Delete person"
                                onClick={() => handleDelete(p)}
                                id={`btn-delete-person-${p.id}`}
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

              {/* Footer: counts + pagination */}
              {totalElements > 0 && (
                <div className="pm-table-footer">
                  <span>
                    {startItem}–{endItem} of <span className="pm-count-chip">{totalElements}</span>{' '}
                    persons
                  </span>

                  {totalPages > 1 && (
                    <div className="pm-pagination">
                      <button
                        className="pm-page-btn"
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 0 || loading}
                        title="Previous"
                      >
                        <CIcon icon={cilChevronLeft} size="sm" />
                      </button>

                      {Array.from({ length: totalPages }, (_, i) => i)
                        .filter((page) => Math.abs(page - currentPage) <= 2)
                        .map((page) => (
                          <button
                            key={page}
                            className={`pm-page-btn ${page === currentPage ? 'active' : ''}`}
                            onClick={() => goToPage(page)}
                            disabled={loading}
                          >
                            {page + 1}
                          </button>
                        ))}

                      <button
                        className="pm-page-btn"
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

      {/* ══════════ MODAL — ADD / EDIT PERSON ══════════ */}
      <CModal
        size="md"
        visible={modalVisible}
        onClose={() => !saving && setModalVisible(false)}
        backdrop="static"
        id="person-modal"
      >
        <CModalHeader className="pm-modal-header">
          <CModalTitle className="pm-modal-title">
            <CIcon icon={editMode ? cilPencil : cilPlus} style={{ color: '#f59e0b' }} />
            {editMode ? 'Edit Person' : 'Add Person'}
          </CModalTitle>
        </CModalHeader>

        <CModalBody className="pm-modal-body">
          <CRow className="g-3">
            {/* Person Code (display in Edit mode) */}
            {editMode && selectedPerson?.personCode && (
              <CCol xs={12}>
                <label className="pm-label">Person Code</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="pm-code-badge">{selectedPerson.personCode}</span>
                  <span className="pm-input-hint" style={{ marginTop: 0 }}>
                    (Server generated - read-only)
                  </span>
                </div>
              </CCol>
            )}

            {/* Name */}
            <CCol xs={12}>
              <label className="pm-label" htmlFor="field-person-name">
                Person Name <span className="req">*</span>
              </label>
              <input
                id="field-person-name"
                type="text"
                className={`pm-input ${errors.name ? 'error' : ''}`}
                placeholder="e.g. Kasun Fernando"
                value={form.name}
                maxLength={150}
                onChange={(e) => setField('name', e.target.value)}
                autoFocus
              />
              {errors.name ? (
                <div className="pm-input-error">⚠ {errors.name}</div>
              ) : (
                <div className="pm-input-hint">Full name of the person (max 150 characters)</div>
              )}
            </CCol>

            {/* Person Type */}
            <CCol xs={12}>
              <label className="pm-label" htmlFor="field-person-type">
                Person Type <span className="req">*</span>
              </label>
              <select
                id="field-person-type"
                className={`pm-select ${errors.personType ? 'error' : ''}`}
                value={form.personType}
                onChange={(e) => setField('personType', e.target.value)}
              >
                {PERSON_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label} ({t.value})
                  </option>
                ))}
              </select>
              {errors.personType ? (
                <div className="pm-input-error">⚠ {errors.personType}</div>
              ) : (
                <div className="pm-input-hint">Select the ownership category for this person</div>
              )}
            </CCol>
          </CRow>
        </CModalBody>

        <CModalFooter className="pm-modal-footer">
          <button
            className="pm-btn-cancel"
            onClick={() => setModalVisible(false)}
            disabled={saving}
            id="btn-modal-cancel"
          >
            Cancel
          </button>
          <button
            className="pm-btn-save"
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
                <CIcon icon={editMode ? cilPencil : cilPlus} />
                {editMode ? 'Save Changes' : 'Create Person'}
              </>
            )}
          </button>
        </CModalFooter>
      </CModal>
    </div>
  )
}

export default Persons
