import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CDropdown,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
} from '@coreui/react'
import { cilAccountLogout, cilUser } from '@coreui/icons'
import CIcon from '@coreui/icons-react'

const AppHeaderDropdown = () => {
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/v1/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      }).catch(() => null)
    } finally {
      navigate('/login')
    }
  }

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
      <CDropdownMenu className="py-1" placement="bottom-end" style={{ minWidth: '150px' }}>
        <CDropdownItem
          as="button"
          onClick={handleLogout}
          className="d-flex align-items-center text-danger py-2"
          style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}
        >
          <CIcon icon={cilAccountLogout} className="me-2 text-danger" size="sm" />
          <span>Sign Out</span>
        </CDropdownItem>
      </CDropdownMenu>
    </CDropdown>
  )
}

export default AppHeaderDropdown
