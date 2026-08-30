import React from 'react'
import CIcon from '@coreui/icons-react'
import { cilContact } from '@coreui/icons'
import { CCard, CCardBody, CCardHeader } from '@coreui/react'

const VehicleLicenseManagement = () => {
  return (
    <div className="vehicle-license-management-page">
      <CCard className="mb-4 shadow-sm">
        <CCardHeader className="d-flex align-items-center gap-2">
          <CIcon icon={cilContact} className="text-info" />
          <h5 className="mb-0">Vehicle License</h5>
        </CCardHeader>
        <CCardBody>
          <p className="text-body-secondary mb-0">
            Vehicle License component.
          </p>
        </CCardBody>
      </CCard>
    </div>
  )
}

export default VehicleLicenseManagement
