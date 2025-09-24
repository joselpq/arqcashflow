---
title: "Form Component with Validation Example"
type: "example"
audience: ["developer", "agent"]
contexts: ["form-handling", "precision-handling", "error-handling"]
complexity: "intermediate"
last_updated: "2025-09-24"
version: "1.0"
agent_roles: ["frontend-developer", "ux-designer"]
related:
  - agents/contexts/form-handling.md
  - agents/patterns/precision-handling.md
  - agents/patterns/error-handling.md
---

# Form Component with Validation Example

## Context for LLM Agents

**Scope**: Complete example of a React form component with comprehensive validation, precision handling, and Brazilian locale support
**Prerequisites**: Understanding of React hooks, form handling patterns, Zod validation, and Brazilian financial formatting
**Key Patterns Applied**:
- Client-side validation with Zod schemas
- Precision handling for financial inputs (scroll wheel protection)
- Brazilian date and currency formatting
- Comprehensive error handling and user feedback
- Optimistic updates with error recovery

## Overview

This example demonstrates a complete contract creation form with proper validation, formatting, and error handling for the Brazilian market.

## Complete Implementation

### 1. Form Component with Full Validation

```typescript
'use client'
import { useState, useEffect } from 'react'
import { z } from 'zod'

// Validation schema matching API expectations
const contractFormSchema = z.object({
  title: z.string()
    .min(1, "Título do contrato é obrigatório")
    .max(200, "Título deve ter no máximo 200 caracteres"),
  clientName: z.string()
    .min(1, "Nome do cliente é obrigatório")
    .max(100, "Nome deve ter no máximo 100 caracteres"),
  totalValue: z.number()
    .positive("Valor deve ser maior que zero")
    .max(999999999.99, "Valor máximo excedido"),
  startDate: z.string()
    .min(1, "Data de início é obrigatória")
    .refine((date) => {
      const parsedDate = new Date(date)
      return !isNaN(parsedDate.getTime())
    }, "Data de início inválida"),
  endDate: z.string()
    .min(1, "Data de término é obrigatória")
    .refine((date) => {
      const parsedDate = new Date(date)
      return !isNaN(parsedDate.getTime())
    }, "Data de término inválida"),
  status: z.enum(['draft', 'active', 'completed', 'cancelled']),
  description: z.string()
    .max(1000, "Descrição deve ter no máximo 1000 caracteres")
    .optional()
})

type ContractFormData = z.infer<typeof contractFormSchema>

interface ContractFormProps {
  onSuccess: (contract: any) => void
  onCancel: () => void
  initialData?: Partial<ContractFormData>
  isEditing?: boolean
}

export default function ContractForm({
  onSuccess,
  onCancel,
  initialData,
  isEditing = false
}: ContractFormProps) {
  // Form state management
  const [formData, setFormData] = useState<ContractFormData>({
    title: initialData?.title || '',
    clientName: initialData?.clientName || '',
    totalValue: initialData?.totalValue || 0,
    startDate: initialData?.startDate || '',
    endDate: initialData?.endDate || '',
    status: initialData?.status || 'draft',
    description: initialData?.description || ''
  })

  // UI state management
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isFormValid, setIsFormValid] = useState(false)

  // Real-time validation
  useEffect(() => {
    const result = contractFormSchema.safeParse(formData)
    setIsFormValid(result.success)

    // Clear field errors when they become valid
    if (result.success) {
      setErrors({})
    } else {
      const fieldErrors: Record<string, string> = {}
      result.error.errors.forEach(error => {
        if (error.path.length > 0) {
          const field = error.path[0] as string
          if (!fieldErrors[field]) {
            fieldErrors[field] = error.message
          }
        }
      })
      setErrors(fieldErrors)
    }
  }, [formData])

  // Handle field changes with proper formatting
  const handleFieldChange = (field: keyof ContractFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))

    // Clear submit error when user makes changes
    if (submitError) {
      setSubmitError(null)
    }

    // Clear field-specific error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  // Format currency input (Brazilian Real)
  const formatCurrency = (value: string): number => {
    // Remove all non-numeric characters except decimal separator
    const cleanValue = value.replace(/[^\d,]/g, '').replace(',', '.')
    return parseFloat(cleanValue) || 0
  }

  // Format currency for display
  const displayCurrency = (value: number): string => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  // Format date for input (Brazilian format DD/MM/YYYY to ISO)
  const formatDateForInput = (brasilianDate: string): string => {
    if (!brasilianDate) return ''

    // If already in ISO format, return as-is
    if (brasilianDate.includes('-')) return brasilianDate.split('T')[0]

    // Convert DD/MM/YYYY to YYYY-MM-DD
    const [day, month, year] = brasilianDate.split('/')
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  // Format date for display (ISO to Brazilian DD/MM/YYYY)
  const formatDateForDisplay = (isoDate: string): string => {
    if (!isoDate) return ''

    const date = new Date(isoDate)
    return date.toLocaleDateString('pt-BR')
  }

  // Handle form submission with comprehensive error handling
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      // Final validation before submission
      const validationResult = contractFormSchema.safeParse(formData)
      if (!validationResult.success) {
        const fieldErrors: Record<string, string> = {}
        validationResult.error.errors.forEach(error => {
          if (error.path.length > 0) {
            const field = error.path[0] as string
            fieldErrors[field] = error.message
          }
        })
        setErrors(fieldErrors)
        return
      }

      // Business logic validation
      if (new Date(formData.endDate) <= new Date(formData.startDate)) {
        setErrors({
          endDate: "Data de término deve ser posterior à data de início"
        })
        return
      }

      // Prepare submission data
      const submissionData = {
        ...validationResult.data,
        // Convert dates to ISO format for API
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString()
      }

      // Submit to API
      const url = isEditing ? `/api/contracts/${initialData?.id}` : '/api/contracts'
      const method = isEditing ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData)
      })

      const result = await response.json()

      if (!response.ok) {
        // Handle API validation errors
        if (response.status === 400 && result.details) {
          const apiErrors: Record<string, string> = {}
          if (result.details.fieldErrors) {
            Object.entries(result.details.fieldErrors).forEach(([field, messages]) => {
              apiErrors[field] = (messages as string[])[0]
            })
          }
          setErrors(apiErrors)
          setSubmitError(result.error)
        } else {
          setSubmitError(result.error || 'Erro ao salvar contrato')
        }
        return
      }

      // Success
      onSuccess(result)

    } catch (error) {
      console.error('Form submission error:', error)
      setSubmitError('Erro de conexão. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        {isEditing ? 'Editar Contrato' : 'Novo Contrato'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title Field */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Título do Contrato *
          </label>
          <input
            type="text"
            id="title"
            value={formData.title}
            onChange={(e) => handleFieldChange('title', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.title ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Ex: Projeto Residencial - Cliente Silva"
            maxLength={200}
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-600">{errors.title}</p>
          )}
        </div>

        {/* Client Name Field */}
        <div>
          <label htmlFor="clientName" className="block text-sm font-medium text-gray-700 mb-2">
            Nome do Cliente *
          </label>
          <input
            type="text"
            id="clientName"
            value={formData.clientName}
            onChange={(e) => handleFieldChange('clientName', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.clientName ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Ex: João Silva"
            maxLength={100}
          />
          {errors.clientName && (
            <p className="mt-1 text-sm text-red-600">{errors.clientName}</p>
          )}
        </div>

        {/* Total Value Field - CRITICAL: Scroll wheel protection */}
        <div>
          <label htmlFor="totalValue" className="block text-sm font-medium text-gray-700 mb-2">
            Valor Total *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-500">R$</span>
            <input
              type="number"
              id="totalValue"
              step="0.01"
              min="0"
              max="999999999.99"
              value={formData.totalValue}
              onChange={(e) => handleFieldChange('totalValue', parseFloat(e.target.value) || 0)}
              onWheel={(e) => e.currentTarget.blur()} // CRITICAL: Prevent scroll wheel changes
              className={`w-full pl-10 pr-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.totalValue ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="0,00"
            />
          </div>
          {errors.totalValue && (
            <p className="mt-1 text-sm text-red-600">{errors.totalValue}</p>
          )}
          {formData.totalValue > 0 && (
            <p className="mt-1 text-sm text-gray-600">
              Valor: {displayCurrency(formData.totalValue)}
            </p>
          )}
        </div>

        {/* Date Fields - Brazilian Format */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
              Data de Início *
            </label>
            <input
              type="date"
              id="startDate"
              value={formatDateForInput(formData.startDate)}
              onChange={(e) => handleFieldChange('startDate', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.startDate ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.startDate && (
              <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>
            )}
          </div>

          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
              Data de Término *
            </label>
            <input
              type="date"
              id="endDate"
              value={formatDateForInput(formData.endDate)}
              onChange={(e) => handleFieldChange('endDate', e.target.value)}
              min={formatDateForInput(formData.startDate)} // Prevent end date before start date
              className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.endDate ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.endDate && (
              <p className="mt-1 text-sm text-red-600">{errors.endDate}</p>
            )}
          </div>
        </div>

        {/* Status Field */}
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <select
            id="status"
            value={formData.status}
            onChange={(e) => handleFieldChange('status', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="draft">Rascunho</option>
            <option value="active">Ativo</option>
            <option value="completed">Concluído</option>
            <option value="cancelled">Cancelado</option>
          </select>
        </div>

        {/* Description Field */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Descrição
          </label>
          <textarea
            id="description"
            rows={4}
            value={formData.description || ''}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.description ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Descreva os detalhes do contrato..."
            maxLength={1000}
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600">{errors.description}</p>
          )}
          <p className="mt-1 text-sm text-gray-500">
            {(formData.description || '').length}/1000 caracteres
          </p>
        </div>

        {/* Submit Error Display */}
        {submitError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Erro ao salvar contrato
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  {submitError}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Salvando...
              </div>
            ) : (
              isEditing ? 'Atualizar Contrato' : 'Criar Contrato'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
```

## Key Implementation Points

### 1. Precision Handling
- **Scroll Wheel Protection**: `onWheel={(e) => e.currentTarget.blur()}` prevents accidental changes
- **Number Input Validation**: Min/max constraints and step="0.01" for currency
- **Brazilian Currency Formatting**: Using `pt-BR` locale for proper currency display

### 2. Brazilian Locale Support
- **Date Formatting**: Conversion between Brazilian (DD/MM/YYYY) and ISO formats
- **Currency Display**: Brazilian Real (R$) formatting with proper locale
- **Portuguese Labels**: All UI text in Portuguese for Brazilian users

### 3. Comprehensive Validation
- **Real-time Validation**: Form validation on every change with immediate feedback
- **Zod Schema**: Shared validation logic between client and server
- **Business Logic**: Date range validation and other business rules
- **API Error Handling**: Proper display of server-side validation errors

### 4. User Experience Features
- **Loading States**: Submit button shows loading spinner during submission
- **Character Counters**: Visual feedback for text length limits
- **Error Recovery**: Errors clear automatically when user fixes issues
- **Optimistic Updates**: Form remains responsive during submission

## Usage Example

```typescript
// Parent component usage
function ContractsPage() {
  const [showForm, setShowForm] = useState(false)
  const [contracts, setContracts] = useState([])

  const handleContractCreated = (newContract) => {
    // Optimistic update
    setContracts(prev => [newContract, ...prev])
    setShowForm(false)

    // Show success message
    toast.success('Contrato criado com sucesso!')
  }

  if (showForm) {
    return (
      <ContractForm
        onSuccess={handleContractCreated}
        onCancel={() => setShowForm(false)}
      />
    )
  }

  return (
    <div>
      <button onClick={() => setShowForm(true)}>
        Novo Contrato
      </button>
      {/* Contract list */}
    </div>
  )
}
```

---

*This example demonstrates comprehensive form handling with validation, precision controls, and Brazilian locale support, following all established patterns for financial data integrity.*