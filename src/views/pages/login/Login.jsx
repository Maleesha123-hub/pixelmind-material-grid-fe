import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CAlert, CSpinner } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilUser,
  cilLockLocked,
  cilTruck,
  cilArrowRight,
  cilWarning,
  cilShieldAlt,
} from '@coreui/icons'
import './Login.css'

const Login = () => {
  const navigate = useNavigate()

  // Form State — Only Username & Password
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setErrorMessage('')

    if (!username.trim()) {
      setErrorMessage('Please enter your username.')
      return
    }

    if (!password) {
      setErrorMessage('Please enter your password.')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok || (data && data.success === false)) {
        setErrorMessage(data?.message || 'Invalid username or password')
        return
      }

      // Login success -> simply redirect to dashboard
      navigate('/dashboard')
    } catch (err) {
      setErrorMessage(err.message || 'Connection error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="mg-login-wrapper">
      {/* Background Ambient Glows */}
      <div className="mg-login-ambient-1" />
      <div className="mg-login-ambient-2" />

      <div className="mg-login-card">
        {/* Brand Header */}
        <div className="mg-login-brand">
          <div className="mg-login-logo-badge">
            <CIcon icon={cilTruck} size="xxl" />
          </div>
          <div>
            <div className="mg-portal-badge">
              <CIcon icon={cilShieldAlt} size="sm" />
              <span>Enterprise Logistics Portal</span>
            </div>
            <h1 className="mg-product-title">
              MALSHI <span>SUPPLIERS</span>
            </h1>
            <p className="mg-company-sub">
              Building Materials Suppliers &amp; Transport Services
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <CAlert color="danger" dismissible onClose={() => setErrorMessage('')} className="mb-3 py-2 px-3 text-start" style={{ fontSize: '0.82rem' }}>
            <CIcon icon={cilWarning} className="me-2" />
            {errorMessage}
          </CAlert>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin}>
          {/* Username Field */}
          <div className="mg-form-group">
            <label className="mg-form-label" htmlFor="username">
              Username
            </label>
            <div className="mg-input-box">
              <div className="mg-input-icon">
                <CIcon icon={cilUser} />
              </div>
              <input
                id="username"
                type="text"
                className="mg-input"
                placeholder="Enter your username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="mg-form-group">
            <label className="mg-form-label" htmlFor="password">
              Password
            </label>
            <div className="mg-input-box">
              <div className="mg-input-icon">
                <CIcon icon={cilLockLocked} />
              </div>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="mg-input"
                placeholder="Enter your password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
              <button
                type="button"
                className="mg-pw-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {/* Remember Me Option */}
          <div className="mg-form-options">
            <label className="mg-remember-label">
              <input
                type="checkbox"
                className="mg-checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>Remember this device</span>
            </label>
          </div>

          {/* Submit Button */}
          <button type="submit" className="mg-btn-submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <CSpinner size="sm" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>Sign In to Portal</span>
                <CIcon icon={cilArrowRight} />
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="mg-login-footer">
          <div>
            <strong>Malshi Suppliers</strong> &copy; {new Date().getFullYear()}
          </div>
          <div>Powered by &bull; MESKORA Technologies (PVT) Ltd</div>
        </div>
      </div>
    </div>
  )
}

export default Login
