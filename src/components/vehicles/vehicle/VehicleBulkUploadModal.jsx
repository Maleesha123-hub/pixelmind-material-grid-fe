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
  cilTrash,
  cilSpreadsheet,
  cilFile,
  cilWarning,
  cilBan,
} from '@coreui/icons'
import vehicleService from '../../../service/vehicleService'

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
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [backendErrors, setBackendErrors] = useState([])
  const [uploadSummary, setUploadSummary] = useState(null)

  const fileInputRef = useRef(null)

  // ─── Reset state ─────────────────────────────────────────────────────────────
  const handleReset = () => {
    setFile(null)
    setFileName('')
    setFileSize('')
    setIsDragging(false)
    setIsUploading(false)
    setBackendErrors([])
    setUploadSummary(null)
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
      ['Vehicle Number', 'Capacity'],
      ['LC-4838', 4.5],
      ['LI-8902', 3.8],
      ['LK-5177', 5.0],
      ['WP-CAD-1234', 4.0],
      ['WP-ND-5678', 6.2],
    ]

    const ws = XLSX.utils.aoa_to_sheet(wsData)

    // Set column widths for readability
    ws['!cols'] = [
      { wch: 22 }, // Vehicle Number
      { wch: 20 }, // Capacity (cube)
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Vehicles Template')
    XLSX.writeFile(wb, 'Vehicle_Bulk_Upload_Template.xlsx')
  }

  // ─── Handle File Selection ───────────────────────────────────────────────────
  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return

    const validExtensions = ['.xlsx', '.xls', '.csv']
    const hasValidExt = validExtensions.some((ext) => selectedFile.name.toLowerCase().endsWith(ext))

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
    setBackendErrors([])
    setUploadSummary(null)
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
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files[0])
    }
  }

  // ─── Upload Execution ────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!file) {
      Swal.fire({
        icon: 'warning',
        title: 'No File Selected',
        text: 'Please select an Excel or CSV file to upload.',
        confirmButtonColor: '#d97706',
      })
      return
    }

    setIsUploading(true)
    setBackendErrors([])
    setUploadSummary(null)

    try {
      const response = await vehicleService.bulkUploadVehiclesFile(file)

      const successMessage =
        response?.message ||
        response?.data?.message ||
        (typeof response === 'string'
          ? response
          : `Vehicles from "${file.name}" have been uploaded successfully.`)

      Swal.fire({
        icon: 'success',
        title: 'Upload Successful!',
        text: successMessage,
        confirmButtonColor: '#d97706',
        timer: 3500,
        timerProgressBar: true,
      })

      handleClose()
      if (onSuccess) onSuccess()
    } catch (err) {
      console.error('Bulk upload error:', err)

      // Extract error details from backend response
      const rawErrors = err.errors || err.response?.data?.errors || err.response?.errors || []

      const summaryData = err.response?.data || null

      if (rawErrors && rawErrors.length > 0) {
        setBackendErrors(rawErrors)
        setUploadSummary(summaryData)

        Swal.fire({
          icon: 'error',
          title: 'Validation Failed',
          text: err.message || 'Please check the errors listed below.',
          confirmButtonColor: '#dc2626',
        })
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Upload Failed',
          text:
            err.message || 'Could not upload vehicles. Please check your Excel file and try again.',
          confirmButtonColor: '#dc2626',
        })
      }
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <CModal
      size={backendErrors.length > 0 ? 'lg' : 'md'}
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
        {/* Step 1: Template download banner */}
        <div className="vm-bulk-template-banner">
          <div className="vm-bulk-template-info">
            <div className="vm-bulk-template-icon">
              <CIcon icon={cilSpreadsheet} />
            </div>
            <div>
              <div className="vm-bulk-template-title">Need the Excel template format?</div>
              <div className="vm-bulk-template-desc">
                Download the standardized template with vehicle columns (Vehicle Number, Capacity
                (cube)).
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

        {/* Step 2: Drag & Drop Dropzone or Selected File */}
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
            <h4 className="vm-bulk-drop-heading">Drag &amp; drop your vehicle Excel file here</h4>
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
          /* Selected File Display */
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
                  {backendErrors.length > 0 ? (
                    <span style={{ color: '#dc2626', fontWeight: 600 }}>
                      Validation failed ({backendErrors.length} errors)
                    </span>
                  ) : (
                    <span style={{ color: '#059669', fontWeight: 600 }}>Ready to upload</span>
                  )}
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

        {/* Step 3: Backend Validation Errors Display */}
        {backendErrors.length > 0 && (
          <div className="vm-bulk-validation-box" id="vehicle-upload-validation-errors">
            <div className="vm-bulk-val-header">
              <div className="vm-bulk-val-title">
                <CIcon icon={cilWarning} className="text-danger" />
                <span>Upload Validation Errors</span>
                <span className="vm-bulk-val-count-badge">{backendErrors.length} Failed</span>
              </div>
              {uploadSummary?.totalRows != null && (
                <div className="vm-bulk-val-summary-text">
                  Total Rows: <strong>{uploadSummary.totalRows}</strong> | Errors:{' '}
                  <strong className="text-danger">
                    {uploadSummary.errorCount ?? backendErrors.length}
                  </strong>
                </div>
              )}
            </div>

            <div className="vm-bulk-val-table-wrap">
              <table className="vm-bulk-val-table">
                <thead>
                  <tr>
                    <th style={{ width: 70 }}>Row</th>
                    <th style={{ width: 140 }}>Field</th>
                    <th style={{ width: 150 }}>Entered Value</th>
                    <th>Validation Error</th>
                  </tr>
                </thead>
                <tbody>
                  {backendErrors.map((err, idx) => (
                    <tr key={idx}>
                      <td>
                        <span className="vm-bulk-val-row-pill">Row {err.rowNumber ?? idx + 1}</span>
                      </td>
                      <td>
                        <span className="vm-bulk-val-field">{err.field || '—'}</span>
                      </td>
                      <td>
                        <code className="vm-bulk-val-value">
                          {err.value !== undefined &&
                          err.value !== null &&
                          String(err.value).trim() !== ''
                            ? String(err.value)
                            : '[Empty]'}
                        </code>
                      </td>
                      <td>
                        <div className="vm-bulk-val-msg">
                          <CIcon
                            icon={cilBan}
                            size="sm"
                            className="text-danger"
                            style={{ flexShrink: 0 }}
                          />
                          <span>{err.message || 'Validation error'}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="vm-bulk-val-footer-hint mt-2">
              💡 Please fix these rows in your Excel file (e.g. check vehicle number or capacity format), then re-upload.
            </div>
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
          disabled={isUploading || !file}
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
              Upload Vehicles
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
