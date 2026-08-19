import React, { useState, useRef } from 'react'
import PropTypes from 'prop-types'
import * as XLSX from 'xlsx'
import Swal from 'sweetalert2'
import CIcon from '@coreui/icons-react'
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CSpinner,
} from '@coreui/react'
import {
  cilCloudUpload,
  cilCloudDownload,
  cilCheckCircle,
  cilWarning,
  cilTrash,
  cilSearch,
  cilReload,
  cilSpreadsheet,
  cilDescription,
  cilTruck,
  cilFile,
} from '@coreui/icons'
import vehicleService from '../../service/vehicleService'

/**
 * Format bytes to readable size
 */
const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export const VehicleBulkUploadModal = ({ visible, onClose, onSuccess }) => {
  const [file, setFile] = useState(null)
  const [fileName, setFileName] = useState('')
  const [fileSize, setFileSize] = useState('')
  const [parsedRows, setParsedRows] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [statusText, setStatusText] = useState('')
  const [activeFilter, setActiveFilter] = useState('ALL') // 'ALL' | 'VALID' | 'ERROR'
  const [searchTerm, setSearchTerm] = useState('')

  const fileInputRef = useRef(null)

  // ─── Reset state ─────────────────────────────────────────────────────────────
  const handleReset = () => {
    setFile(null)
    setFileName('')
    setFileSize('')
    setParsedRows([])
    setIsDragging(false)
    setIsUploading(false)
    setUploadProgress(0)
    setStatusText('')
    setActiveFilter('ALL')
    setSearchTerm('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleClose = () => {
    if (isUploading) return
    handleReset()
    onClose()
  }

  // ─── Download Sample Excel Template ──────────────────────────────────────────
  const handleDownloadTemplate = () => {
    const wsData = [
      ['Vehicle Number', 'Capacity (m³)', 'Status'],
      ['LC-4838', 4.5, 'ACTIVE'],
      ['LI-8902', 3.8, 'ACTIVE'],
      ['LK-5177', 5.0, 'ACTIVE'],
      ['WP-CAD-1234', 4.0, 'ACTIVE'],
      ['WP-ND-5678', 6.2, 'ACTIVE'],
    ]

    const ws = XLSX.utils.aoa_to_sheet(wsData)

    // Set column widths for readability
    ws['!cols'] = [
      { wch: 20 }, // Vehicle Number
      { wch: 18 }, // Capacity (m³)
      { wch: 15 }, // Status
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Vehicles Template')
    XLSX.writeFile(wb, 'Vehicle_Bulk_Upload_Template.xlsx')
  }

  // ─── Parse Excel File ────────────────────────────────────────────────────────
  const parseExcelFile = (selectedFile) => {
    if (!selectedFile) return

    const validExtensions = ['.xlsx', '.xls', '.csv']
    const hasValidExt = validExtensions.some((ext) =>
      selectedFile.name.toLowerCase().endsWith(ext)
    )

    if (!hasValidExt) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid File Format',
        text: 'Please upload an Excel spreadsheet (.xlsx, .xls) or CSV file.',
        confirmButtonColor: '#dc2626',
      })
      return
    }

    setFile(selectedFile)
    setFileName(selectedFile.name)
    setFileSize(formatFileSize(selectedFile.size))

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: '' })

        if (!rawJson || rawJson.length === 0) {
          Swal.fire({
            icon: 'warning',
            title: 'Empty File',
            text: 'The uploaded file does not contain any data rows.',
            confirmButtonColor: '#d97706',
          })
          handleReset()
          return
        }

        const seenNumbers = new Set()
        const rows = rawJson.map((row, index) => {
          // Flexible column mapping
          const rawVeh =
            row['Vehicle Number'] ||
            row['Vehicle No'] ||
            row['VehicleNo'] ||
            row['Vehial Number'] ||
            row['Vehical Number'] ||
            row['Registration Number'] ||
            row['Plate Number'] ||
            row['vehicleNumber'] ||
            row['vehicle'] ||
            row['Vehicle'] ||
            ''

          const rawCap =
            row['Capacity (m³)'] ||
            row['Capacity (m3)'] ||
            row['Capacity'] ||
            row['Cube'] ||
            row['Cube Capacity'] ||
            row['Load Capacity'] ||
            row['capacity'] ||
            ''

          const rawStatus =
            row['Status'] ||
            row['status'] ||
            row['State'] ||
            'ACTIVE'

          const vehNumberClean = String(rawVeh).trim().toUpperCase()
          const capClean = parseFloat(String(rawCap).trim())
          const statusClean = String(rawStatus).trim().toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE'

          // Validation
          const errors = []
          if (!vehNumberClean) {
            errors.push('Vehicle number is required')
          } else if (seenNumbers.has(vehNumberClean)) {
            errors.push('Duplicate vehicle number in file')
          }

          if (rawCap === '' || isNaN(capClean) || capClean <= 0) {
            errors.push('Capacity must be a positive number (> 0)')
          }

          if (vehNumberClean) {
            seenNumbers.add(vehNumberClean)
          }

          return {
            rowNum: index + 1,
            vehicleNumber: vehNumberClean,
            capacity: isNaN(capClean) ? rawCap : capClean,
            status: statusClean,
            isValid: errors.length === 0,
            error: errors.join(', '),
          }
        })

        setParsedRows(rows)
      } catch (err) {
        console.error('File parsing error:', err)
        Swal.fire({
          icon: 'error',
          title: 'Parsing Failed',
          text: 'Unable to parse this file. Please ensure it is a valid Excel format.',
          confirmButtonColor: '#dc2626',
        })
        handleReset()
      }
    }

    reader.readAsArrayBuffer(selectedFile)
  }

  // ─── Drag & Drop Handlers ────────────────────────────────────────────────────
  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      parseExcelFile(e.dataTransfer.files[0])
    }
  }

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      parseExcelFile(e.target.files[0])
    }
  }

  // ─── Upload Execution ────────────────────────────────────────────────────────
  const handleUpload = async () => {
    const validRows = parsedRows.filter((r) => r.isValid)
    if (validRows.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'No Valid Vehicles',
        text: 'There are no valid vehicle rows to upload. Please review errors.',
        confirmButtonColor: '#d97706',
      })
      return
    }

    setIsUploading(true)
    setUploadProgress(0)
    setStatusText(`Starting upload of ${validRows.length} vehicles...`)

    try {
      // First, try dedicated backend bulk upload file endpoint if available
      let useBatchFallback = false
      try {
        const backendRes = await vehicleService.bulkUploadVehiclesFile(file)
        setUploadProgress(100)
        Swal.fire({
          icon: 'success',
          title: 'Bulk Upload Successful!',
          text:
            backendRes.message ||
            `${validRows.length} vehicles have been successfully imported.`,
          confirmButtonColor: '#d97706',
        })
        handleClose()
        if (onSuccess) onSuccess()
        return
      } catch (uploadFileErr) {
        // If 404 or backend file endpoint not yet wired, gracefully fallback to robust batch ingestion
        useBatchFallback = true
      }

      if (useBatchFallback) {
        const result = await vehicleService.bulkCreateVehicles(
          validRows.map((r) => ({
            vehicleNumber: r.vehicleNumber,
            capacity: r.capacity,
            status: r.status,
          })),
          (processed, total, percentage) => {
            setUploadProgress(percentage)
            setStatusText(`Uploaded ${processed} of ${total} vehicles (${percentage}%)...`)
          }
        )

        const successCount = result.successful.length
        const failCount = result.failed.length + (parsedRows.length - validRows.length)

        if (successCount > 0 && result.failed.length === 0) {
          Swal.fire({
            icon: 'success',
            title: 'Bulk Upload Completed!',
            text: `Successfully registered ${successCount} vehicles into the fleet.`,
            confirmButtonColor: '#d97706',
            timer: 3000,
            timerProgressBar: true,
          })
          handleClose()
          if (onSuccess) onSuccess()
        } else if (successCount > 0 && result.failed.length > 0) {
          const failReasons = result.failed
            .map((f) => `• ${f.vehicleNumber}: ${f.error}`)
            .slice(0, 5)
            .join('<br>')
          Swal.fire({
            icon: 'warning',
            title: 'Partially Completed',
            html: `<div style="text-align:left; font-size:0.875rem;">
              <p><strong>${successCount}</strong> vehicles added successfully.</p>
              <p><strong>${result.failed.length}</strong> vehicles failed (e.g. duplicate vehicle number):</p>
              <div style="background:#fef2f2; padding:8px 12px; border-radius:6px; color:#991b1b; font-family:monospace; font-size:0.8rem;">
                ${failReasons}
                ${result.failed.length > 5 ? `<p style="margin:4px 0 0 0; color:#6b7280;">...and ${result.failed.length - 5} more</p>` : ''}
              </div>
            </div>`,
            confirmButtonColor: '#d97706',
          })
          handleClose()
          if (onSuccess) onSuccess()
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Upload Failed',
            text:
              result.failed[0]?.error ||
              'Could not register vehicles. Please check for duplicate records or invalid data.',
            confirmButtonColor: '#dc2626',
          })
        }
      }
    } catch (err) {
      console.error('Bulk upload error:', err)
      Swal.fire({
        icon: 'error',
        title: 'Upload Error',
        text: err.message || 'An unexpected error occurred during bulk upload.',
        confirmButtonColor: '#dc2626',
      })
    } finally {
      setIsUploading(false)
    }
  }

  // ─── Filter & Search Preview List ────────────────────────────────────────────
  const validCount = parsedRows.filter((r) => r.isValid).length
  const errorCount = parsedRows.filter((r) => !r.isValid).length

  const filteredRows = parsedRows.filter((row) => {
    if (activeFilter === 'VALID' && !row.isValid) return false
    if (activeFilter === 'ERROR' && row.isValid) return false

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toUpperCase()
      const matchNum = String(row.vehicleNumber || '').toUpperCase().includes(q)
      const matchCap = String(row.capacity || '').includes(q)
      const matchErr = String(row.error || '').toUpperCase().includes(q)
      return matchNum || matchCap || matchErr
    }
    return true
  })

  return (
    <CModal
      size="lg"
      visible={visible}
      onClose={handleClose}
      backdrop="static"
      className="vm-bulk-modal"
      id="vehicle-bulk-upload-modal"
    >
      <CModalHeader className="vm-bulk-modal-header">
        <div className="vm-bulk-header-wrap">
          <div className="vm-bulk-icon-box">
            <CIcon icon={cilCloudUpload} size="lg" />
          </div>
          <div>
            <CModalTitle className="vm-bulk-modal-title">
              Bulk Upload Vehicles via Excel
            </CModalTitle>
            <p className="vm-bulk-modal-subtitle">
              Upload multiple fleet vehicles simultaneously using an Excel or CSV file
            </p>
          </div>
        </div>
      </CModalHeader>

      <CModalBody className="vm-bulk-modal-body">
        {/* Step 1: Template download & quick instructions */}
        <div className="vm-bulk-template-banner">
          <div className="vm-bulk-template-info">
            <div className="vm-bulk-template-icon">
              <CIcon icon={cilSpreadsheet} />
            </div>
            <div>
              <div className="vm-bulk-template-title">Need the Excel template format?</div>
              <div className="vm-bulk-template-desc">
                Download the standardized template with sample vehicle columns (Vehicle Number, Capacity (m³), Status).
              </div>
            </div>
          </div>
          <button
            type="button"
            className="vm-bulk-btn-template"
            onClick={handleDownloadTemplate}
            id="btn-download-vehicle-template"
          >
            <CIcon icon={cilCloudDownload} />
            Download Sample Excel
          </button>
        </div>

        {/* Step 2: Drag & Drop Dropzone */}
        {!file ? (
          <div
            className={`vm-bulk-dropzone ${isDragging ? 'drag-over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            id="vehicle-dropzone"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept=".xlsx, .xls, .csv"
              style={{ display: 'none' }}
              id="vehicle-file-input"
            />
            <div className="vm-bulk-drop-icon">
              <CIcon icon={cilCloudUpload} size="xxl" />
            </div>
            <h4 className="vm-bulk-drop-heading">
              Drag &amp; drop your vehicle Excel file here
            </h4>
            <p className="vm-bulk-drop-subheading">
              or <span className="vm-bulk-browse-link">browse from your computer</span>
            </p>
            <div className="vm-bulk-formats">
              <span className="vm-format-chip">.XLSX</span>
              <span className="vm-format-chip">.XLS</span>
              <span className="vm-format-chip">.CSV</span>
            </div>
          </div>
        ) : (
          /* Selected File Summary */
          <div className="vm-bulk-file-card">
            <div className="vm-bulk-file-left">
              <div className="vm-bulk-file-icon">
                <CIcon icon={cilFile} size="lg" />
              </div>
              <div className="vm-bulk-file-details">
                <div className="vm-bulk-file-name" title={fileName}>
                  {fileName}
                </div>
                <div className="vm-bulk-file-meta">
                  <span>{fileSize}</span>
                  <span>•</span>
                  <span>{parsedRows.length} rows detected</span>
                </div>
              </div>
            </div>
            {!isUploading && (
              <button
                type="button"
                className="vm-bulk-btn-change"
                onClick={handleReset}
                title="Remove and choose another file"
                id="btn-remove-vehicle-file"
              >
                <CIcon icon={cilTrash} />
                Change File
              </button>
            )}
          </div>
        )}

        {/* Step 3: Data Validation & Preview Table */}
        {parsedRows.length > 0 && (
          <div className="vm-bulk-preview-section">
            {/* Stats bar */}
            <div className="vm-bulk-stats-bar">
              <div className="vm-bulk-stat-item all" onClick={() => setActiveFilter('ALL')}>
                <span className="vm-bulk-stat-label">Total Rows:</span>
                <span className="vm-bulk-stat-val">{parsedRows.length}</span>
              </div>
              <div
                className={`vm-bulk-stat-item valid ${activeFilter === 'VALID' ? 'active' : ''}`}
                onClick={() => setActiveFilter('VALID')}
              >
                <span className="vm-bulk-stat-dot valid" />
                <span className="vm-bulk-stat-label">Ready to Import:</span>
                <span className="vm-bulk-stat-val valid">{validCount}</span>
              </div>
              <div
                className={`vm-bulk-stat-item error ${activeFilter === 'ERROR' ? 'active' : ''}`}
                onClick={() => setActiveFilter('ERROR')}
              >
                <span className="vm-bulk-stat-dot error" />
                <span className="vm-bulk-stat-label">Errors / Invalids:</span>
                <span className="vm-bulk-stat-val error">{errorCount}</span>
              </div>
            </div>

            {/* Filter Tabs & Search Bar */}
            <div className="vm-bulk-table-controls">
              <div className="vm-bulk-filter-tabs">
                <button
                  type="button"
                  className={`vm-bulk-tab ${activeFilter === 'ALL' ? 'active' : ''}`}
                  onClick={() => setActiveFilter('ALL')}
                >
                  All ({parsedRows.length})
                </button>
                <button
                  type="button"
                  className={`vm-bulk-tab valid ${activeFilter === 'VALID' ? 'active' : ''}`}
                  onClick={() => setActiveFilter('VALID')}
                >
                  Valid ({validCount})
                </button>
                <button
                  type="button"
                  className={`vm-bulk-tab error ${activeFilter === 'ERROR' ? 'active' : ''}`}
                  onClick={() => setActiveFilter('ERROR')}
                >
                  Errors ({errorCount})
                </button>
              </div>

              <div className="vm-bulk-search-wrap">
                <CIcon icon={cilSearch} size="sm" className="vm-bulk-search-icon" />
                <input
                  type="text"
                  className="vm-bulk-search-input"
                  placeholder="Filter preview rows..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Preview Table */}
            <div className="vm-bulk-table-container">
              <table className="vm-bulk-table">
                <thead>
                  <tr>
                    <th style={{ width: 45 }}>#</th>
                    <th style={{ width: 90 }}>Status</th>
                    <th>Vehicle Number</th>
                    <th>Capacity (m³)</th>
                    <th>State</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                        No records match the current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row) => (
                      <tr key={row.rowNum} className={row.isValid ? 'valid-row' : 'error-row'}>
                        <td className="vm-bulk-td-num">{row.rowNum}</td>
                        <td>
                          {row.isValid ? (
                            <span className="vm-bulk-badge valid">
                              <CIcon icon={cilCheckCircle} size="sm" />
                              Valid
                            </span>
                          ) : (
                            <span className="vm-bulk-badge error">
                              <CIcon icon={cilWarning} size="sm" />
                              Error
                            </span>
                          )}
                        </td>
                        <td className="vm-bulk-td-veh">
                          <span className="vm-bulk-veh-pill">
                            <CIcon icon={cilTruck} size="sm" />
                            {row.vehicleNumber || <em style={{ color: '#dc2626' }}>[Missing]</em>}
                          </span>
                        </td>
                        <td className="vm-bulk-td-cap">
                          {typeof row.capacity === 'number' ? (
                            <span>
                              {row.capacity}{' '}
                              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>m³</span>
                            </span>
                          ) : (
                            <span style={{ color: '#dc2626' }}>{String(row.capacity) || 'Invalid'}</span>
                          )}
                        </td>
                        <td>
                          <span className={`vm-bulk-state-pill ${row.status.toLowerCase()}`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="vm-bulk-td-remark">
                          {row.isValid ? (
                            <span className="vm-bulk-ready-txt">Ready for registration</span>
                          ) : (
                            <span className="vm-bulk-err-txt">⚠ {row.error}</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Progress bar when uploading */}
            {isUploading && (
              <div className="vm-bulk-progress-wrap">
                <div className="vm-bulk-progress-label">
                  <span>{statusText}</span>
                  <span className="vm-bulk-pct">{uploadProgress}%</span>
                </div>
                <div className="vm-bulk-progress-bar">
                  <div
                    className="vm-bulk-progress-fill"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </CModalBody>

      <CModalFooter className="vm-bulk-modal-footer">
        <button
          type="button"
          className="vm-btn-cancel"
          onClick={handleClose}
          disabled={isUploading}
          id="btn-close-vehicle-bulk"
        >
          Cancel
        </button>
        <button
          type="button"
          className="vm-bulk-btn-upload-action"
          onClick={handleUpload}
          disabled={isUploading || parsedRows.length === 0 || validCount === 0}
          id="btn-submit-vehicle-bulk"
        >
          {isUploading ? (
            <>
              <CSpinner size="sm" style={{ marginRight: 6 }} />
              Uploading...
            </>
          ) : (
            <>
              <CIcon icon={cilCloudUpload} />
              {validCount > 0 ? `Upload ${validCount} Vehicles` : 'Upload Vehicles'}
            </>
          )}
        </button>
      </CModalFooter>
    </CModal>
  )
}

VehicleBulkUploadModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
}

export default VehicleBulkUploadModal
