/**
 * Utility Functions - Central Export
 *
 * Convenient single import point for all utility functions.
 * Allows: import { requireAuth, formatDateShort, logAuditEntry } from '@/lib/utils'
 */

// Authentication utilities
export {
  getCurrentUser,
  getCurrentTeamId,
  requireAuth
} from './auth'

// Date utilities
export {
  isDateBefore,
  isDateInRange,
  formatDateShort,
  formatDateFull,
  formatDateForInput,
  getTodayDateString,
  createDateForStorage,
  isReceivableOverdue,
  isExpenseOverdue,
  getReceivableActualStatus,
  getExpenseActualStatus
} from './date'

// Audit logging
export type {
  AuditContext,
  EntityChange,
  AuditLogQuery
} from './audit'

export {
  logAuditEntry,
  logStatusChange,
  detectChanges,
  createAuditContext,
  getAuditLogs,
  getEntityHistory,
  getUserActivity,
  getTeamActivity,
  withAudit,
  withAuditLogging,
  createAuditContextFromAPI,
  auditCreate,
  auditUpdate,
  auditDelete,
  isAuditEnabled,
  safeAudit,
  auditBatch,
  captureEntityState,
  auditWrapper
} from './audit'

// Business terminology
export type { BusinessTerminology } from './terminology'
export { getBusinessTerminology, terminology } from './terminology'
