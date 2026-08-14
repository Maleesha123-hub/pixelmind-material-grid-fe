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
const processTrip = React.lazy(() => import('./components/transportTrip/processTrip/ProcessTrip.jsx'))
const tripHistory = React.lazy(() => import('./components/transportTrip/tripHistory/TripHistory.jsx'))
const Route = React.lazy(() => import('./components/transportTrip/route/Route.jsx'))


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
]

export default routes
