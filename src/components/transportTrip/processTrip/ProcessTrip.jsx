import React, { useState, useCallback } from 'react'
import Select from 'react-select'
import {
  CRow,
  CCol,
  CCard,
  CCardBody,
  CCardHeader,
  CForm,
  CFormLabel,
  CFormInput,
  CFormCheck,
  CButton,
  CBadge,
  CAlert,
  CSpinner,
  CInputGroup,
  CInputGroupText,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilLocationPin,
  cilArrowRight,
  cilTruck,
  cilUser,
  cilPeople,
  cilPlus,
  cilTrash,
  cilSave,
  cilInfo,
  cilMoney,
  cilTag,
  cilSpeedometer,
} from '@coreui/icons'
import './ProcessTrip.css'

// ─── Mock Data (replace with API calls) ──────────────────────────────────────
const ROUTES = [
  { value: 1, label: 'Colombo → Kandy', locationFrom: 'Colombo', locationTo: 'Kandy', distance: 115.5 },
  { value: 2, label: 'Kandy → Galle', locationFrom: 'Kandy', locationTo: 'Galle', distance: 198.2 },
  { value: 3, label: 'Colombo → Galle', locationFrom: 'Colombo', locationTo: 'Galle', distance: 126.0 },
  { value: 4, label: 'Matara → Colombo', locationFrom: 'Matara', locationTo: 'Colombo', distance: 160.8 },
  { value: 5, label: 'Negombo → Kurunegala', locationFrom: 'Negombo', locationTo: 'Kurunegala', distance: 72.3 },
]

const SUPPLIER_ITEMS = [
  { value: 1, label: 'River Sand — RS-001', name: 'River Sand', code: 'RS-001', transportPricePerKm: 2.5, unit: 'm³' },
  { value: 2, label: 'Blue Metal Gravel — BM-002', name: 'Blue Metal Gravel', code: 'BM-002', transportPricePerKm: 3.0, unit: 'MT' },
  { value: 3, label: 'Cement (Holcim) — CM-003', name: 'Cement (Holcim)', code: 'CM-003', transportPricePerKm: 1.8, unit: 'Bags' },
  { value: 4, label: 'Steel Rebar — SR-004', name: 'Steel Rebar', code: 'SR-004', transportPricePerKm: 4.2, unit: 'MT' },
  { value: 5, label: 'Quarry Dust — QD-005', name: 'Quarry Dust', code: 'QD-005', transportPricePerKm: 2.1, unit: 'm³' },
]

const DRIVERS = [
  { value: 1, label: 'Kamal Perera — DRV-001' },
  { value: 2, label: 'Sunil Silva — DRV-002' },
  { value: 3, label: 'Ranjith Fernando — DRV-003' },
  { value: 4, label: 'Nimal Jayasinghe — DRV-004' },
]

const VEHICLES = [
  { value: 1, label: 'WP-CAC-1234 — Lorry 10T' },
  { value: 2, label: 'CP-KAD-5678 — Tipper 8T' },
  { value: 3, label: 'SP-GAF-9012 — Lorry 15T' },
  { value: 4, label: 'NW-CBA-3456 — Dumper 20T' },
]

const CUSTOMERS = [
  { value: 1, label: 'Nawaloka Construction Ltd.' },
  { value: 2, label: 'MTD Engineering (Pvt.) Ltd.' },
  { value: 3, label: 'Sanken Construction' },
  { value: 4, label: 'ICTAD Projects' },
]

// ─── Select Styles ─────────────────────────────────────────────────────────
const selectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: '42px',
    borderRadius: '8px',
    borderColor: state.isFocused ? '#321fdb' : '#c4c9d4',
    boxShadow: state.isFocused ? '0 0 0 3px rgba(50,31,219,0.12)' : 'none',
    fontSize: '0.875rem',
    '&:hover': { borderColor: '#321fdb' },
  }),
  menu: (base) => ({ ...base, borderRadius: '10px', zIndex: 9999 }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected ? '#321fdb' : state.isFocused ? '#f0f1ff' : 'white',
    color: state.isSelected ? 'white' : '#2c2c54',
    fontSize: '0.875rem',
  }),
  placeholder: (base) => ({ ...base, color: '#9da5b1', fontSize: '0.875rem' }),
}

// ─── Empty item row template ─────────────────────────────────────────────────
const emptyItem = () => ({
  id: Date.now(),
  supplierItem: null,
  unit: '',
  baseBuyingPrice: '',
  buyingPrice: '',
  baseSellingPrice: '',
  sellingPrice: '',
  transportPricePerUnit: '',
  transportPrice: '',
  isFixTransportPrice: false,
})

// ─── Component ───────────────────────────────────────────────────────────────
const ProcessTrip = () => {
  const [route, setRoute] = useState(null)
  const [driver, setDriver] = useState(null)
  const [vehicle, setVehicle] = useState(null)
  const [customer, setCustomer] = useState(null)
  const [prepaidTransportPrice, setPrepaidTransportPrice] = useState('')
  const [items, setItems] = useState([emptyItem()])
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Auto-calculate transport price when item or route changes
  const calcTransportPrice = useCallback((item, selectedRoute) => {
    if (!item.isFixTransportPrice && item.supplierItem && selectedRoute && item.unit) {
      const pricePerKm = item.supplierItem.transportPricePerKm || 0
      const distance = selectedRoute.distance || 0
      const units = parseFloat(item.unit) || 0
      const perUnit = pricePerKm * distance
      const total = perUnit * units
      return { transportPricePerUnit: perUnit.toFixed(2), transportPrice: total.toFixed(2) }
    }
    return {}
  }, [])

  const updateItem = (id, field, value) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it
        const updated = { ...it, [field]: value }

        // Auto-fill unit from selected supplier item
        if (field === 'supplierItem' && value) {
          updated.unit = ''
        }

        // Re-calculate transport pricing
        const calc = calcTransportPrice(updated, route)
        return { ...updated, ...calc }
      }),
    )
  }

  const handleRouteChange = (selected) => {
    setRoute(selected)
    // Recalculate all item transport prices
    setItems((prev) =>
      prev.map((it) => {
        const calc = calcTransportPrice(it, selected)
        return { ...it, ...calc }
      }),
    )
  }

  const addItem = () => setItems((prev) => [...prev, emptyItem()])
  const removeItem = (id) => setItems((prev) => prev.filter((it) => it.id !== id))

  // Totals
  const totalBuying = items.reduce((sum, it) => {
    const base = parseFloat(it.buyingPrice) || 0
    const qty = parseFloat(it.unit) || 0
    return sum + base * qty
  }, 0)

  const totalSelling = items.reduce((sum, it) => {
    const base = parseFloat(it.sellingPrice) || 0
    const qty = parseFloat(it.unit) || 0
    return sum + base * qty
  }, 0)

  const totalTransport = items.reduce((sum, it) => {
    return sum + (parseFloat(it.transportPrice) || 0)
  }, 0)

  const handleSubmit = (e) => {
    e.preventDefault()
    setSubmitting(true)
    setTimeout(() => {
      setSubmitting(false)
      setSubmitted(true)
      setTimeout(() => setSubmitted(false), 3000)
    }, 1500)
  }

  return (
    <div className="pt-page">
      {/* ── Page Header ── */}
      <div className="pt-page-header mb-4">
        <div className="pt-page-header__icon">
          <CIcon icon={cilTruck} size="xl" />
        </div>
        <div>
          <h1 className="pt-page-title">Process Trip</h1>
          <p className="pt-page-subtitle">Create a new material transportation trip record</p>
        </div>
      </div>

      {submitted && (
        <CAlert color="success" className="pt-alert-success mb-4">
          <CIcon icon={cilInfo} className="me-2" />
          Trip has been saved successfully!
        </CAlert>
      )}

      <CForm onSubmit={handleSubmit}>
        {/* ══ Section 1: Trip Details ════════════════════════════════════════ */}
        <CCard className="pt-card mb-4">
          <CCardHeader className="pt-card-header">
            <span className="pt-section-label">
              <CIcon icon={cilLocationPin} className="me-2" />
              Trip Details
            </span>
          </CCardHeader>
          <CCardBody className="pt-card-body">
            <CRow className="g-3">
              {/* Route Selection */}
              <CCol xs={12} md={6}>
                <CFormLabel className="pt-label">
                  Route <span className="pt-required">*</span>
                </CFormLabel>
                <Select
                  inputId="route-select"
                  options={ROUTES}
                  value={route}
                  onChange={handleRouteChange}
                  placeholder="Search and select route…"
                  isClearable
                  styles={selectStyles}
                />
                {/* Distance Badge — main highlight */}
                {route && (
                  <div className="pt-distance-display mt-2">
                    <div className="pt-distance-inner">
                      <div className="pt-distance-route">
                        <span className="pt-loc pt-loc--from">{route.locationFrom}</span>
                        <CIcon icon={cilArrowRight} className="pt-loc-arrow" />
                        <span className="pt-loc pt-loc--to">{route.locationTo}</span>
                      </div>
                      <div className="pt-distance-value">
                        <CIcon icon={cilSpeedometer} className="me-1" />
                        <strong>{route.distance}</strong>
                        <span className="pt-distance-unit">km</span>
                      </div>
                    </div>
                  </div>
                )}
              </CCol>

              {/* Customer */}
              <CCol xs={12} md={6}>
                <CFormLabel className="pt-label">
                  Customer <span className="pt-required">*</span>
                </CFormLabel>
                <Select
                  inputId="customer-select"
                  options={CUSTOMERS}
                  value={customer}
                  onChange={setCustomer}
                  placeholder="Search customer…"
                  isClearable
                  styles={selectStyles}
                />
              </CCol>

              {/* Driver */}
              <CCol xs={12} md={6}>
                <CFormLabel className="pt-label">
                  <CIcon icon={cilUser} className="me-1" size="sm" />
                  Driver <span className="pt-required">*</span>
                </CFormLabel>
                <Select
                  inputId="driver-select"
                  options={DRIVERS}
                  value={driver}
                  onChange={setDriver}
                  placeholder="Search driver…"
                  isClearable
                  styles={selectStyles}
                />
              </CCol>

              {/* Vehicle */}
              <CCol xs={12} md={6}>
                <CFormLabel className="pt-label">
                  <CIcon icon={cilTruck} className="me-1" size="sm" />
                  Vehicle <span className="pt-required">*</span>
                </CFormLabel>
                <Select
                  inputId="vehicle-select"
                  options={VEHICLES}
                  value={vehicle}
                  onChange={setVehicle}
                  placeholder="Search vehicle…"
                  isClearable
                  styles={selectStyles}
                />
              </CCol>

              {/* Prepaid Transport Price */}
              <CCol xs={12} md={4}>
                <CFormLabel className="pt-label">
                  <CIcon icon={cilMoney} className="me-1" size="sm" />
                  Prepaid Transport Price
                </CFormLabel>
                <CInputGroup>
                  <CInputGroupText className="pt-input-prefix">Rs.</CInputGroupText>
                  <CFormInput
                    id="prepaid-transport-price"
                    type="number"
                    placeholder="0.00"
                    value={prepaidTransportPrice}
                    onChange={(e) => setPrepaidTransportPrice(e.target.value)}
                    className="pt-input"
                    min="0"
                    step="0.01"
                  />
                </CInputGroup>
              </CCol>
            </CRow>
          </CCardBody>
        </CCard>

        {/* ══ Section 2: Supplier Items ══════════════════════════════════════ */}
        <CCard className="pt-card mb-4">
          <CCardHeader className="pt-card-header">
            <span className="pt-section-label">
              <CIcon icon={cilTag} className="me-2" />
              Supplier Items
            </span>
            <CButton
              color="primary"
              size="sm"
              className="pt-add-btn"
              type="button"
              onClick={addItem}
            >
              <CIcon icon={cilPlus} className="me-1" />
              Add Item
            </CButton>
          </CCardHeader>
          <CCardBody className="pt-card-body p-0">
            {items.map((item, index) => (
              <div key={item.id} className={`pt-item-row ${index % 2 === 0 ? 'pt-item-row--even' : ''}`}>
                {/* Item header */}
                <div className="pt-item-header">
                  <CBadge className="pt-item-badge">Item {index + 1}</CBadge>
                  {items.length > 1 && (
                    <button
                      type="button"
                      className="pt-remove-btn"
                      onClick={() => removeItem(item.id)}
                      title="Remove item"
                    >
                      <CIcon icon={cilTrash} size="sm" />
                    </button>
                  )}
                </div>

                <CRow className="g-3 p-3">
                  {/* Supplier Item */}
                  <CCol xs={12} md={6} lg={4}>
                    <CFormLabel className="pt-label">
                      Supplier Item <span className="pt-required">*</span>
                    </CFormLabel>
                    <Select
                      inputId={`supplier-item-${item.id}`}
                      options={SUPPLIER_ITEMS}
                      value={item.supplierItem}
                      onChange={(val) => updateItem(item.id, 'supplierItem', val)}
                      placeholder="Search item…"
                      isClearable
                      styles={selectStyles}
                    />
                    {item.supplierItem && (
                      <span className="pt-item-unit-hint">Unit: {item.supplierItem.unit}</span>
                    )}
                  </CCol>

                  {/* Quantity / Unit */}
                  <CCol xs={6} md={3} lg={2}>
                    <CFormLabel className="pt-label">Quantity</CFormLabel>
                    <CInputGroup>
                      <CFormInput
                        id={`unit-${item.id}`}
                        type="number"
                        placeholder="0"
                        value={item.unit}
                        onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                        className="pt-input"
                        min="0"
                        step="0.01"
                      />
                      {item.supplierItem && (
                        <CInputGroupText className="pt-input-suffix">
                          {item.supplierItem.unit}
                        </CInputGroupText>
                      )}
                    </CInputGroup>
                  </CCol>

                  {/* ── Buying Prices ── */}
                  <CCol xs={12}>
                    <div className="pt-price-group-label">
                      <span className="pt-price-group-label--buying">Buying Prices</span>
                    </div>
                    <CRow className="g-2">
                      <CCol xs={6} md={4} lg={3}>
                        <CFormLabel className="pt-label pt-label--sm">Base Buying Price</CFormLabel>
                        <CInputGroup size="sm">
                          <CInputGroupText className="pt-input-prefix">Rs.</CInputGroupText>
                          <CFormInput
                            id={`base-buying-${item.id}`}
                            type="number"
                            placeholder="0.00"
                            value={item.baseBuyingPrice}
                            onChange={(e) => updateItem(item.id, 'baseBuyingPrice', e.target.value)}
                            className="pt-input"
                            min="0"
                            step="0.01"
                          />
                        </CInputGroup>
                      </CCol>
                      <CCol xs={6} md={4} lg={3}>
                        <CFormLabel className="pt-label pt-label--sm">Buying Price / Unit</CFormLabel>
                        <CInputGroup size="sm">
                          <CInputGroupText className="pt-input-prefix">Rs.</CInputGroupText>
                          <CFormInput
                            id={`buying-price-${item.id}`}
                            type="number"
                            placeholder="0.00"
                            value={item.buyingPrice}
                            onChange={(e) => updateItem(item.id, 'buyingPrice', e.target.value)}
                            className="pt-input"
                            min="0"
                            step="0.01"
                          />
                        </CInputGroup>
                      </CCol>
                      <CCol xs={6} md={4} lg={3}>
                        <CFormLabel className="pt-label pt-label--sm">Total Buying Price</CFormLabel>
                        <CInputGroup size="sm">
                          <CInputGroupText className="pt-input-prefix">Rs.</CInputGroupText>
                          <CFormInput
                            id={`total-buying-${item.id}`}
                            type="number"
                            placeholder="0.00"
                            value={
                              item.buyingPrice && item.unit
                                ? (parseFloat(item.buyingPrice) * parseFloat(item.unit)).toFixed(2)
                                : ''
                            }
                            readOnly
                            className="pt-input pt-input--readonly"
                          />
                        </CInputGroup>
                      </CCol>
                    </CRow>
                  </CCol>

                  {/* ── Selling Prices ── */}
                  <CCol xs={12}>
                    <div className="pt-price-group-label">
                      <span className="pt-price-group-label--selling">Selling Prices</span>
                    </div>
                    <CRow className="g-2">
                      <CCol xs={6} md={4} lg={3}>
                        <CFormLabel className="pt-label pt-label--sm">Base Selling Price</CFormLabel>
                        <CInputGroup size="sm">
                          <CInputGroupText className="pt-input-prefix">Rs.</CInputGroupText>
                          <CFormInput
                            id={`base-selling-${item.id}`}
                            type="number"
                            placeholder="0.00"
                            value={item.baseSellingPrice}
                            onChange={(e) => updateItem(item.id, 'baseSellingPrice', e.target.value)}
                            className="pt-input"
                            min="0"
                            step="0.01"
                          />
                        </CInputGroup>
                      </CCol>
                      <CCol xs={6} md={4} lg={3}>
                        <CFormLabel className="pt-label pt-label--sm">Selling Price / Unit</CFormLabel>
                        <CInputGroup size="sm">
                          <CInputGroupText className="pt-input-prefix">Rs.</CInputGroupText>
                          <CFormInput
                            id={`selling-price-${item.id}`}
                            type="number"
                            placeholder="0.00"
                            value={item.sellingPrice}
                            onChange={(e) => updateItem(item.id, 'sellingPrice', e.target.value)}
                            className="pt-input"
                            min="0"
                            step="0.01"
                          />
                        </CInputGroup>
                      </CCol>
                      <CCol xs={6} md={4} lg={3}>
                        <CFormLabel className="pt-label pt-label--sm">Total Selling Price</CFormLabel>
                        <CInputGroup size="sm">
                          <CInputGroupText className="pt-input-prefix">Rs.</CInputGroupText>
                          <CFormInput
                            id={`total-selling-${item.id}`}
                            type="number"
                            placeholder="0.00"
                            value={
                              item.sellingPrice && item.unit
                                ? (parseFloat(item.sellingPrice) * parseFloat(item.unit)).toFixed(2)
                                : ''
                            }
                            readOnly
                            className="pt-input pt-input--readonly"
                          />
                        </CInputGroup>
                      </CCol>
                    </CRow>
                  </CCol>

                  {/* ── Transport Prices ── */}
                  <CCol xs={12}>
                    <div className="pt-price-group-label">
                      <span className="pt-price-group-label--transport">Transport Pricing</span>
                    </div>
                    <CRow className="g-2 align-items-end">
                      <CCol xs={6} md={4} lg={3}>
                        <CFormLabel className="pt-label pt-label--sm">Transport Price / Unit</CFormLabel>
                        <CInputGroup size="sm">
                          <CInputGroupText className="pt-input-prefix">Rs.</CInputGroupText>
                          <CFormInput
                            id={`transport-per-unit-${item.id}`}
                            type="number"
                            placeholder="0.00"
                            value={item.transportPricePerUnit}
                            onChange={(e) => updateItem(item.id, 'transportPricePerUnit', e.target.value)}
                            className="pt-input"
                            readOnly={!item.isFixTransportPrice}
                            min="0"
                            step="0.01"
                          />
                        </CInputGroup>
                      </CCol>
                      <CCol xs={6} md={4} lg={3}>
                        <CFormLabel className="pt-label pt-label--sm">Total Transport Price</CFormLabel>
                        <CInputGroup size="sm">
                          <CInputGroupText className="pt-input-prefix">Rs.</CInputGroupText>
                          <CFormInput
                            id={`transport-price-${item.id}`}
                            type="number"
                            placeholder="0.00"
                            value={item.transportPrice}
                            onChange={(e) => updateItem(item.id, 'transportPrice', e.target.value)}
                            className={`pt-input ${!item.isFixTransportPrice ? 'pt-input--readonly' : ''}`}
                            readOnly={!item.isFixTransportPrice}
                            min="0"
                            step="0.01"
                          />
                        </CInputGroup>
                      </CCol>
                      <CCol xs={12} md={4} lg={3} className="d-flex align-items-center">
                        <div className="pt-fix-price-toggle">
                          <CFormCheck
                            id={`fix-transport-${item.id}`}
                            checked={item.isFixTransportPrice}
                            onChange={(e) => updateItem(item.id, 'isFixTransportPrice', e.target.checked)}
                            label="Fixed Transport Price"
                            className="pt-checkbox"
                          />
                          {!item.isFixTransportPrice && route && item.supplierItem && (
                            <small className="pt-auto-calc-hint">
                              Auto-calculated from route distance
                            </small>
                          )}
                        </div>
                      </CCol>
                    </CRow>
                  </CCol>
                </CRow>
              </div>
            ))}
          </CCardBody>
        </CCard>

        {/* ══ Section 3: Trip Summary ════════════════════════════════════════ */}
        <CCard className="pt-card pt-summary-card mb-4">
          <CCardHeader className="pt-card-header">
            <span className="pt-section-label">
              <CIcon icon={cilMoney} className="me-2" />
              Trip Summary
            </span>
          </CCardHeader>
          <CCardBody className="pt-card-body">
            <CRow className="g-3">
              <CCol xs={6} md={3}>
                <div className="pt-summary-tile pt-summary-tile--buying">
                  <div className="pt-summary-tile__label">Total Buying</div>
                  <div className="pt-summary-tile__value">
                    Rs. {totalBuying.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </CCol>
              <CCol xs={6} md={3}>
                <div className="pt-summary-tile pt-summary-tile--selling">
                  <div className="pt-summary-tile__label">Total Selling</div>
                  <div className="pt-summary-tile__value">
                    Rs. {totalSelling.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </CCol>
              <CCol xs={6} md={3}>
                <div className="pt-summary-tile pt-summary-tile--transport">
                  <div className="pt-summary-tile__label">Total Transport</div>
                  <div className="pt-summary-tile__value">
                    Rs. {totalTransport.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </CCol>
              <CCol xs={6} md={3}>
                <div className="pt-summary-tile pt-summary-tile--profit">
                  <div className="pt-summary-tile__label">Gross Profit</div>
                  <div className="pt-summary-tile__value">
                    Rs.{' '}
                    {(totalSelling - totalBuying - totalTransport).toLocaleString('en-LK', {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                </div>
              </CCol>
            </CRow>
          </CCardBody>
        </CCard>

        {/* ══ Submit ════════════════════════════════════════════════════════ */}
        <div className="pt-actions">
          <CButton type="button" color="light" className="pt-btn-cancel me-2">
            Cancel
          </CButton>
          <CButton type="submit" color="primary" className="pt-btn-submit" disabled={submitting}>
            {submitting ? (
              <>
                <CSpinner size="sm" className="me-2" />
                Saving…
              </>
            ) : (
              <>
                <CIcon icon={cilSave} className="me-2" />
                Save Trip
              </>
            )}
          </CButton>
        </div>
      </CForm>
    </div>
  )
}

export default ProcessTrip
