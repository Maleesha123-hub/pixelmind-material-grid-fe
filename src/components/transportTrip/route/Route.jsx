import React from 'react'
import { CRow, CCol, CCard, CCardHeader, CCardBody } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilMap } from '@coreui/icons'

const Route = () => {
  return (
    <div className="p-3">
      <CCard>
        <CCardHeader className="d-flex align-items-center gap-2">
          <CIcon icon={cilMap} className="text-warning" />
          <strong>Routes & Distance Management</strong>
        </CCardHeader>
        <CCardBody>
          <p className="text-muted">Manage quarry, plant, and delivery chainage routes.</p>
        </CCardBody>
      </CCard>
    </div>
  )
}

export default Route
