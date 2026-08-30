import React from 'react'
import CIcon from '@coreui/icons-react'
import { cilMoney } from '@coreui/icons'
import { CCard, CCardBody, CCardHeader } from '@coreui/react'

const DailyExpenses = () => {
  return (
    <div className="daily-expenses-page">
      <CCard className="mb-4 shadow-sm">
        <CCardHeader className="d-flex align-items-center gap-2">
          <CIcon icon={cilMoney} className="text-success" />
          <h5 className="mb-0">Daily Expenses Management</h5>
        </CCardHeader>
        <CCardBody>
          <p className="text-body-secondary mb-0">
            Daily Expenses management component.
          </p>
        </CCardBody>
      </CCard>
    </div>
  )
}

export default DailyExpenses
