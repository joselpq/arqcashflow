/**
 * API Validation Schemas
 *
 * Validation schemas specific to API requests, responses, and external integrations.
 * These complement the financial schemas for API-specific concerns.
 */

import { z } from 'zod'
import { BaseFieldSchemas, EnumSchemas } from './schemas'

/**
 * Authentication and user management schemas
 */
export const AuthSchemas = {
  // User registration
  register: z.object({
    email: BaseFieldSchemas.email,
    password: BaseFieldSchemas.password,
    name: BaseFieldSchemas.name.optional(),
  }),

  // User login
  login: z.object({
    email: BaseFieldSchemas.email,
    password: BaseFieldSchemas.password,
  }),

  // Password reset request
  resetPassword: z.object({
    email: BaseFieldSchemas.email,
  }),

  // Password reset confirmation
  confirmResetPassword: z.object({
    token: z.string().min(1, 'Reset token is required'),
    newPassword: BaseFieldSchemas.password,
  }),
}

/**
 * AI Assistant schemas
 */
export const AISchemas = {
  // AI query request
  query: z.object({
    question: z.string().min(1, 'Question is required'),
    history: z.array(z.object({
      question: z.string(),
      answer: z.string()
    })).optional(),
  }),

  // AI assistant request with file upload
  assistant: z.object({
    message: z.string().optional(),
    files: z.array(z.object({
      name: z.string().min(1, 'File name is required'),
      type: z.string().min(1, 'File type is required'),
      base64: z.string().min(1, 'File content is required')
    })).optional(),
    history: z.array(z.object({
      role: EnumSchemas.aiRole,
      content: z.string(),
      metadata: z.any().optional()
    })).optional(),
  }),

  // AI Command Agent request
  command: z.object({
    command: z.string().min(1, 'Command is required').max(500, 'Command is too long'),
    conversationState: z.object({
      messages: z.array(z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
        timestamp: z.union([z.string().datetime(), z.date()]).optional()
      })).optional().default([]),
      pendingOperation: z.object({
        intent: z.any(),
        preview: z.string(),
        entityData: z.any(),
        confirmationRequired: z.boolean()
      }).optional().nullable(),
      lastEntities: z.object({
        contract: z.any().optional(),
        receivable: z.any().optional(),
        expense: z.any().optional(),
        recurringExpense: z.any().optional(),
      }).optional(),
      recentlyCreated: z.array(z.any()).optional(),
      lastReferencedEntities: z.array(z.any()).optional()
    }).optional(),
    isConfirmation: z.boolean().optional(),
  }),

  // AI response schema
  response: z.object({
    content: z.string(),
    confidence: z.number().min(0).max(1).optional(),
    metadata: z.object({
      model: z.string().optional(),
      usage: z.object({
        input_tokens: z.number().optional(),
        output_tokens: z.number().optional(),
      }).optional(),
    }).optional(),
  }),
}

/**
 * Query parameter schemas for API endpoints
 */
// Common pagination parameters
const paginationSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional().default(1),
  limit: z.string().regex(/^\d+$/).transform(Number).optional().default(50),
  offset: z.string().regex(/^\d+$/).transform(Number).optional(),
})

// Common sorting parameters
const sortingSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: EnumSchemas.sortOrder,
})

// Date range filtering
const dateRangeSchema = z.object({
  startDate: BaseFieldSchemas.dateString.optional(),
  endDate: BaseFieldSchemas.dateString.optional(),
}).refine(
  (data) => !data.startDate || !data.endDate || new Date(data.startDate) <= new Date(data.endDate),
  { message: 'Start date must be before or equal to end date' }
)

// Status filtering
const statusFilterSchema = z.object({
  status: z.string().optional(),
  excludeStatus: z.string().optional(),
})

// Search parameters
const searchSchema = z.object({
  q: z.string().max(200, 'Search query is too long').optional(),
  searchFields: z.array(z.string()).optional(),
})

export const QuerySchemas = {
  pagination: paginationSchema,
  sorting: sortingSchema,
  dateRange: dateRangeSchema,
  statusFilter: statusFilterSchema,
  search: searchSchema,
}

/**
 * Response schemas for API endpoints
 */
export const ResponseSchemas = {
  // Generic success response
  success: z.object({
    success: z.literal(true),
    message: z.string().optional(),
    data: z.any(),
  }),

  // Generic error response
  error: z.object({
    success: z.literal(false),
    error: z.object({
      message: z.string(),
      code: z.string().optional(),
      category: z.enum(['validation', 'authentication', 'authorization', 'not_found', 'conflict', 'server_error']),
      details: z.any().optional(),
      validation: z.array(z.object({
        field: z.string(),
        message: z.string(),
        code: z.string().optional(),
      })).optional(),
    }),
  }),

  // Paginated response
  paginated: z.object({
    data: z.array(z.any()),
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      totalPages: z.number(),
      hasNext: z.boolean(),
      hasPrev: z.boolean(),
    }),
  }),

  // Analytics/summary response
  analytics: z.object({
    summary: z.object({
      total: z.number(),
      count: z.number(),
      averageValue: z.number().optional(),
    }),
    byStatus: z.record(z.object({
      count: z.number(),
      amount: z.number().optional(),
    })),
    byCategory: z.record(z.object({
      count: z.number(),
      amount: z.number().optional(),
    })),
    byMonth: z.record(z.object({
      count: z.number(),
      amount: z.number().optional(),
    })).optional(),
  }),
}

/**
 * File upload schemas
 */
export const FileSchemas = {
  // Single file upload
  upload: z.object({
    file: z.object({
      name: z.string().min(1, 'File name is required'),
      type: z.string().min(1, 'File type is required'),
      size: z.number().max(10 * 1024 * 1024, 'File size cannot exceed 10MB'), // 10MB limit
      base64: z.string().min(1, 'File content is required'),
    }),
    category: z.enum(['receipt', 'contract', 'invoice', 'document']).optional(),
    description: BaseFieldSchemas.description,
  }),

  // Multiple file upload
  uploadMultiple: z.object({
    files: z.array(z.object({
      name: z.string().min(1, 'File name is required'),
      type: z.string().min(1, 'File type is required'),
      size: z.number().max(50 * 1024 * 1024, 'File size must be less than 50MB'),
    })).max(5, 'Cannot upload more than 5 files at once'),
    category: z.enum(['receipt', 'contract', 'invoice', 'document']).optional(),
    description: BaseFieldSchemas.description,
  }),
}

/**
 * Export/Import schemas
 */
export const ExportSchemas = {
  // CSV export request
  csvExport: z.object({
    type: z.enum(['contracts', 'receivables', 'expenses']),
    filters: z.any().optional(), // Will be validated by specific entity schemas
    fields: z.array(z.string()).optional(), // Specific fields to export
    dateRange: QuerySchemas.dateRange.optional(),
  }),

  // Spreadsheet export (Google Sheets, Excel)
  spreadsheetExport: z.object({
    type: z.enum(['contracts', 'receivables', 'expenses', 'summary']),
    format: z.enum(['xlsx', 'csv', 'google_sheets']).default('xlsx'),
    template: z.string().optional(), // Template to use
    filters: z.any().optional(),
    groupBy: z.enum(['category', 'status', 'month', 'client']).optional(),
  }),

  // Data import validation
  import: z.object({
    type: z.enum(['contracts', 'receivables', 'expenses']),
    data: z.array(z.any()), // Will be validated by specific entity schemas
    validateOnly: z.boolean().default(false), // Dry run mode
    skipErrors: z.boolean().default(false), // Continue on validation errors
  }),
}

/**
 * Webhook and integration schemas
 */
export const IntegrationSchemas = {
  // Generic webhook payload
  webhook: z.object({
    event: z.string(),
    timestamp: z.string().datetime(),
    data: z.any(),
    signature: z.string().optional(),
  }),

  // External API integration settings
  apiIntegration: z.object({
    provider: z.enum(['google_sheets', 'excel', 'accounting_software']),
    credentials: z.object({
      apiKey: z.string().optional(),
      accessToken: z.string().optional(),
      refreshToken: z.string().optional(),
      clientId: z.string().optional(),
      clientSecret: z.string().optional(),
    }),
    settings: z.any(), // Provider-specific settings
    isActive: BaseFieldSchemas.boolean,
  }),
}

/**
 * Validation middleware schema
 */
export const MiddlewareSchemas = {
  // Team context validation
  teamContext: z.object({
    teamId: BaseFieldSchemas.teamId,
    userId: BaseFieldSchemas.userId,
    permissions: z.array(z.string()).optional(),
  }),

  // Rate limiting
  rateLimit: z.object({
    identifier: z.string(), // User ID, IP, etc.
    limit: z.number().positive(),
    window: z.number().positive(), // Time window in seconds
    remaining: z.number().min(0),
  }),

  // Audit log entry
  auditLog: z.object({
    action: z.string(),
    resource: z.string(),
    resourceId: z.string().optional(),
    userId: BaseFieldSchemas.userId,
    teamId: BaseFieldSchemas.teamId,
    timestamp: z.string().datetime(),
    metadata: z.any().optional(),
    ipAddress: z.string().optional(),
    userAgent: z.string().optional(),
  }),
}