/**
 * Sidebar Navigation Configuration
 *
 * Defines the structure and content of the sidebar navigation menu.
 * Supports multiple navigation component types from CoreUI React:
 * - CNavItem: Single navigation link
 * - CNavGroup: Collapsible group of links
 * - CNavTitle: Section title/divider
 *
 * @module _nav
 */

import React from 'react'
import CIcon from '@coreui/icons-react'
import {
  cilSpeedometer,
  cilTruck,
  cilTransfer,
  cilHistory,
  cilFactory,
  cilCloudUpload,
  cilDescription,
  cilPeople,
  cilGroup,
  cilUser,
  cilCarAlt,
  cilTags,
  cilTag,
  cilGrid,
  cilBarcode,
  cilBalanceScale,
  cilMap,
  cilLocationPin,
  cilUserPlus,
  cilShieldAlt,
  cilLockLocked,
  cilContact,
  cilMoney,
} from '@coreui/icons'
import { CNavGroup, CNavItem, CNavTitle } from '@coreui/react'

/**
 * Navigation menu structure array
 *
 * @type {Array<Object>}
 * @property {React.ComponentType} component - CoreUI nav component (CNavItem, CNavGroup, CNavTitle)
 * @property {string} name - Display text for the nav item
 * @property {string} [to] - Internal route path (for CNavItem with routing)
 * @property {string} [href] - External URL (for CNavItem with external links)
 * @property {React.ReactNode} [icon] - Icon element to display
 * @property {Object} [badge] - Optional badge configuration
 * @property {string} badge.color - Badge color (info, danger, success, etc.)
 * @property {string} badge.text - Badge text content
 * @property {Array<Object>} [items] - Child items for CNavGroup
 *
 * @example
 * // Simple navigation item
 * {
 *   component: CNavItem,
 *   name: 'Dashboard',
 *   to: '/dashboard',
 *   icon: <CIcon icon={cilSpeedometer} customClassName="nav-icon" />,
 * }
 *
 * @example
 * // Navigation group with children
 * {
 *   component: CNavGroup,
 *   name: 'Transport Trips',
 *   to: '/transport-trips',
 *   icon: <CIcon icon={cilTruck} customClassName="nav-icon" />,
 *   items: [
 *     {
 *       component: CNavItem,
 *       name: 'Process Trip',
 *       to: '/transport-trips/process-trip',
 *     },
 *   ],
 * }
 *
 * @example
 * // Section title
 * {
 *   component: CNavTitle,
 *   name: 'OPERATIONS',
 * }
 */
const _nav = [
  {
    component: CNavItem,
    name: 'Dashboard',
    to: '/dashboard',
    icon: <CIcon icon={cilSpeedometer} customClassName="nav-icon" />,
  },
  {
    component: CNavTitle,
    name: 'OPERATIONS',
  },
  // {
  //   component: CNavGroup,
  //   name: 'Transport Trips',
  //   to: '/transport-trips',
  //   icon: <CIcon icon={cilTruck} customClassName="nav-icon" />,
  //   items: [
  //     {
  //       component: CNavItem,
  //       name: 'Process Trip',
  //       to: '/transport-trips/process-trip',
  //       icon: <CIcon icon={cilTransfer} customClassName="nav-icon" />,
  //     },
  //     {
  //       component: CNavItem,
  //       name: 'Trip History',
  //       to: '/transport-trips/trip-history',
  //       icon: <CIcon icon={cilHistory} customClassName="nav-icon" />,
  //     },
  //   ],
  // },
  {
    component: CNavGroup,
    name: 'Logistics',
    to: '/logistics',
    icon: <CIcon icon={cilFactory} customClassName="nav-icon" />,
    items: [
      {
        component: CNavItem,
        name: 'Bulk Upload',
        to: '/logistics/bulk-upload',
        icon: <CIcon icon={cilCloudUpload} customClassName="nav-icon" />,
      },
    ],
  },
  {
    component: CNavItem,
    name: 'Receipts',
    to: '/receipts',
    icon: <CIcon icon={cilDescription} customClassName="nav-icon" />,
  },
  {
    component: CNavTitle,
    name: 'MASTER DATA',
  },
  {
    component: CNavItem,
    name: 'Vehicles',
    to: '/vehicles',
    icon: <CIcon icon={cilTruck} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Vehicle License',
    to: '/vehicle-license',
    icon: <CIcon icon={cilContact} customClassName="nav-icon" />,
  },
  // {
  //   component: CNavItem,
  //   name: 'Vehicles',
  //   to: '/vehicles',
  //   icon: <CIcon icon={cilCarAlt} customClassName="nav-icon" />,
  // },
  {
    component: CNavItem,
    name: 'Routes',
    to: '/routes',
    icon: <CIcon icon={cilLocationPin} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Price Rates',
    to: '/price-rates',
    icon: <CIcon icon={cilMoney} customClassName="nav-icon" />,
  },
  // {
  //   component: CNavGroup,
  //   name: 'Persons',
  //   to: '/persons',
  //   icon: <CIcon icon={cilPeople} customClassName="nav-icon" />,
  //   items: [
  //     {
  //       component: CNavItem,
  //       name: 'Person Type',
  //       to: '/persons/person-type',
  //       icon: <CIcon icon={cilGroup} customClassName="nav-icon" />,
  //     },
  //     {
  //       component: CNavItem,
  //       name: 'Person',
  //       to: '/persons/person',
  //       icon: <CIcon icon={cilUser} customClassName="nav-icon" />,
  //     },
  //   ],
  // },
  // {
  //   component: CNavGroup,
  //   name: 'Vehicles',
  //   to: '/vehicles',
  //   icon: <CIcon icon={cilCarAlt} customClassName="nav-icon" />,
  //   items: [
  //     {
  //       component: CNavItem,
  //       name: 'Vehicle Type',
  //       to: '/vehicles/vehicle-type',
  //       icon: <CIcon icon={cilTags} customClassName="nav-icon" />,
  //     },
  //     {
  //       component: CNavItem,
  //       name: 'Vehicle',
  //       to: '/vehicles/vehicle',
  //       icon: <CIcon icon={cilTruck} customClassName="nav-icon" />,
  //     },
  //   ],
  // },
  // {
  //   component: CNavGroup,
  //   name: 'Items',
  //   to: '/items',
  //   icon: <CIcon icon={cilGrid} customClassName="nav-icon" />,
  //   items: [
  //     {
  //       component: CNavItem,
  //       name: 'Category',
  //       to: '/items/category',
  //       icon: <CIcon icon={cilTag} customClassName="nav-icon" />,
  //     },
  //     {
  //       component: CNavItem,
  //       name: 'Item',
  //       to: '/items/item',
  //       icon: <CIcon icon={cilBarcode} customClassName="nav-icon" />,
  //     },
  //   ],
  // },
  // {
  //   component: CNavItem,
  //   name: 'Unit Types',
  //   to: '/unit-types',
  //   icon: <CIcon icon={cilBalanceScale} customClassName="nav-icon" />,
  // },
  // {
  //   component: CNavItem,
  //   name: 'Routes',
  //   to: '/transport-trips/route',
  //   icon: <CIcon icon={cilMap} customClassName="nav-icon" />,
  // },
  // {
  //   component: CNavTitle,
  //   name: 'USER MANAGEMENT',
  // },
  // {
  //   component: CNavItem,
  //   name: 'Users',
  //   to: '/users',
  //   icon: <CIcon icon={cilUserPlus} customClassName="nav-icon" />,
  // },
  // {
  //   component: CNavItem,
  //   name: 'User Roles',
  //   to: '/user-roles',
  //   icon: <CIcon icon={cilShieldAlt} customClassName="nav-icon" />,
  // },
  // {
  //   component: CNavItem,
  //   name: 'Permissions',
  //   to: '/permissions',
  //   icon: <CIcon icon={cilLockLocked} customClassName="nav-icon" />,
  // },
]

export default _nav
