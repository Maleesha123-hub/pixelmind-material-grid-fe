import React from 'react'
import { CFooter } from '@coreui/react'

const AppFooter = () => {
  return (
    <CFooter className="px-4">
      <div>
        <strong>Malshi Suppliers</strong>
        <span className="ms-1">&copy; {new Date().getFullYear()} Building Materials &amp; Transport Services.</span>
      </div>
      <div className="ms-auto">
        <span className="me-1">Powered by <strong>MESKORA Technologies (PVT) Ltd</strong></span>
      </div>
    </CFooter>
  )
}

export default React.memo(AppFooter)
