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
const DailyRoutes = React.lazy(() => import('./components/logistics/dailyRoutes/DailyRoutes.jsx'))
const DailyExpenses = React.lazy(
  () => import('./components/logistics/dailyExpenses/DailyExpenses.jsx'),
)
const VehicleLicenseManagement = React.lazy(
  () => import('./components/logistics/vehicleLicenseManagement/VehicleLicenseManagement.jsx'),
)
const ExcavatorInspection = React.lazy(
  () => import('./components/logistics/excavatorInspection/ExcavatorInspection.jsx'),
)

// Receipts
const Receipts = React.lazy(() => import('./components/receipts/Receipts.jsx'))

// Operations — Reports
const Reports = React.lazy(() => import('./components/reports/Reports.jsx'))

// Vehicles
const Vehicle = React.lazy(() => import('./components/vehicles/vehicle/Vehicle.jsx'))
const VehicleLicense = React.lazy(() => import('./components/vehicles/license/VehicleLicense.jsx'))

// Master Data — Routes
const RoutesPage = React.lazy(() => import('./components/routes/Routes.jsx'))

// Master Data — Persons
const Persons = React.lazy(() => import('./components/persons/Persons.jsx'))

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
  { path: '/logistics/daily-routes', name: 'Daily Routes', element: DailyRoutes },
  { path: '/logistics/daily-expenses', name: 'Daily Expenses', element: DailyExpenses },
  {
    path: '/logistics/vehicle-license-management',
    name: 'Vehicle License',
    element: VehicleLicenseManagement,
  },
  {
    path: '/logistics/excavator-inspection',
    name: 'Excavator Inspection',
    element: ExcavatorInspection,
  },
  { path: '/receipts', name: 'Receipts', element: Receipts },
  { path: '/persons', name: 'Persons', element: Persons },
  { path: '/person', name: 'Person', element: Persons },
  { path: '/reports', name: 'Reports', element: Reports },
  { path: '/vehicles', name: 'Vehicles', element: Vehicle },
  { path: '/license', name: 'License', element: VehicleLicense },
  { path: '/routes', name: 'Routes', element: RoutesPage },
]

export default routes
