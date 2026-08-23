import React from 'react'
import {
  CBadge,
  CDropdown,
  CDropdownDivider,
  CDropdownHeader,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
} from '@coreui/react'
import {
  cilBell,
  cilTruck,
  cilDescription,
  cilHistory,
  cilSettings,
  cilUser,
  cilLockLocked,
  cilChartLine,
} from '@coreui/icons'
import CIcon from '@coreui/icons-react'

const AppHeaderDropdown = () => {
  return (
    <CDropdown variant="nav-item">
      <CDropdownToggle placement="bottom-end" className="py-0 pe-0" caret={false}>
        <div
          className="app-header-user-avatar d-flex align-items-center justify-content-center rounded-circle"
          style={{
            width: '38px',
            height: '38px',
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            border: '1.5px solid #334155',
            color: '#f59e0b',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          title="User Profile"
        >
          <CIcon icon={cilUser} size="lg" />
        </div>
      </CDropdownToggle>
      <CDropdownMenu className="pt-0" placement="bottom-end">
        <CDropdownHeader className="bg-body-secondary fw-semibold mb-2">Activity</CDropdownHeader>
        <CDropdownItem href="#">
          <CIcon icon={cilTruck} className="me-2" />
          Active Trips
          <CBadge color="info" className="ms-2">
            3
          </CBadge>
        </CDropdownItem>
        <CDropdownItem href="#">
          <CIcon icon={cilDescription} className="me-2" />
          Pending Receipts
          <CBadge color="warning" className="ms-2">
            7
          </CBadge>
        </CDropdownItem>
        <CDropdownItem href="#">
          <CIcon icon={cilHistory} className="me-2" />
          Recent Deliveries
          <CBadge color="success" className="ms-2">
            12
          </CBadge>
        </CDropdownItem>
        <CDropdownItem href="#">
          <CIcon icon={cilBell} className="me-2" />
          Alerts
          <CBadge color="danger" className="ms-2">
            2
          </CBadge>
        </CDropdownItem>
        <CDropdownHeader className="bg-body-secondary fw-semibold my-2">Account</CDropdownHeader>
        <CDropdownItem href="#">
          <CIcon icon={cilUser} className="me-2" />
          Profile
        </CDropdownItem>
        <CDropdownItem href="#">
          <CIcon icon={cilChartLine} className="me-2" />
          Reports
        </CDropdownItem>
        <CDropdownItem href="#">
          <CIcon icon={cilSettings} className="me-2" />
          Settings
        </CDropdownItem>
        <CDropdownDivider />
        <CDropdownItem href="#/login">
          <CIcon icon={cilLockLocked} className="me-2" />
          Lock Account
        </CDropdownItem>
      </CDropdownMenu>
    </CDropdown>
  )
}

export default AppHeaderDropdown
