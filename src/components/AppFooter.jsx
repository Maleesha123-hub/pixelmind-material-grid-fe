import React from 'react'
import { CFooter } from '@coreui/react'

const AppFooter = () => {
  return (
    <CFooter className="px-4">
      <div>
        <strong>Material Grid</strong>
        <span className="ms-1">&copy; {new Date().getFullYear()} MESKORA Technologies (PVT) Ltd. All rights reserved.</span>
      </div>
      <div className="ms-auto">
        <span className="me-1">Hardware Logistics Management System</span>
      </div>
    </CFooter>
  )
}

export default React.memo(AppFooter)
