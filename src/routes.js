/**
 * Application Routes Configuration
 *
 * Defines all protected routes in the application using React lazy loading
 * for code splitting and performance optimization.
 *
 * Each route object contains:
 * - path: URL path for the route
 * - name: Human-readable name for breadcrumbs
 * - element: Lazy-loaded React component
 * - exact: (optional) Requires exact path match
 *
 * @module routes
 */

import React from 'react'

// Dashboard
const Dashboard = React.lazy(() => import('./views/dashboard/Dashboard'))

// Transport Trips
const processTrip = React.lazy(
  () => import('./components/transportTrip/processTrip/ProcessTrip.jsx'),
)
const tripHistory = React.lazy(
  () => import('./components/transportTrip/tripHistory/TripHistory.jsx'),
)
const Route = React.lazy(() => import('./components/transportTrip/route/Route.jsx'))

// Logistics
const BulkUpload = React.lazy(() => import('./components/logistics/bulkUpload/BulkUpload.jsx'))

// Receipts
const Receipts = React.lazy(() => import('./components/receipts/Receipts.jsx'))

// Vehicles
const Vehicle = React.lazy(() => import('./components/vehicles/vehicle/Vehicle.jsx'))
const VehicleLicense = React.lazy(() => import('./components/vehicles/license/VehicleLicense.jsx'))

// Master Data — Routes
const RoutesPage = React.lazy(() => import('./components/routes/Routes.jsx'))

// Master Data — Price Rates
const PriceRate = React.lazy(() => import('./components/priceRates/PriceRate.jsx'))

/**
 * Array of route configuration objects
 *
 * @type {Array<Object>}
 * @property {string} path - URL path pattern
 * @property {string} name - Display name for breadcrumbs and navigation
 * @property {React.LazyExoticComponent} element - Lazy-loaded component
 * @property {boolean} [exact] - Whether to match path exactly
 *
 * @example
 * // Route renders when URL matches '/dashboard'
 * { path: '/dashboard', name: 'Dashboard', element: Dashboard }
 *
 * @example
 * // Route with exact match required
 * { path: '/base', name: 'Base', element: Cards, exact: true }
 */
export const routes = [
  { path: '/', exact: true, name: 'Home' },
  { path: '/dashboard', name: 'Dashboard', element: Dashboard },
  { path: '/transport-trips/route', name: 'Route', element: Route },
  { path: '/transport-trips/process-trip', name: 'Process Trip', element: processTrip },
  { path: '/transport-trips/trip-history', name: 'Trip History', element: tripHistory },
  { path: '/logistics/bulk-upload', name: 'Bulk Upload', element: BulkUpload },
  { path: '/receipts', name: 'Receipts', element: Receipts },
  { path: '/vehicles/vehicle', name: 'Vehicles', element: Vehicle },
  { path: '/vehicles/vehicle-license', name: 'Vehicle License', element: VehicleLicense },
  { path: '/routes', name: 'Routes', element: RoutesPage },
  { path: '/price-rates', name: 'Price Rates', element: PriceRate },
]

export default routes
