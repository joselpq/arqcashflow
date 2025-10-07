'use client'

import { useState, useEffect } from 'react'

interface CompactFiltersProps {
  // Search
  searchQuery: string
  onSearchChange: (query: string) => void
  searchPlaceholder?: string

  // Filters
  filters: {
    status?: string
    category?: string
    sortBy?: string
    sortOrder?: string
    [key: string]: any
  }
  onFiltersChange: (filters: any) => void

  // Options
  statusOptions?: Array<{ value: string; label: string }>
  categoryOptions?: Array<{ value: string; label: string }>
  sortOptions?: Array<{ value: string; label: string }>

  // Show/hide specific filters
  showStatus?: boolean
  showCategory?: boolean
  showSort?: boolean

  // Default filter values (for reset)
  defaultFilters?: any
}

export default function CompactFilters({
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Buscar...",
  filters,
  onFiltersChange,
  statusOptions = [],
  categoryOptions = [],
  sortOptions = [],
  showStatus = true,
  showCategory = true,
  showSort = true,
  defaultFilters = {}
}: CompactFiltersProps) {
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(localSearchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [localSearchQuery, onSearchChange])

  const hasActiveFilters = () => {
    if (searchQuery) return true
    if (defaultFilters.status && filters.status !== defaultFilters.status) return true
    if (defaultFilters.category && filters.category !== defaultFilters.category) return true
    if (defaultFilters.sortBy && filters.sortBy !== defaultFilters.sortBy) return true
    if (defaultFilters.sortOrder && filters.sortOrder !== defaultFilters.sortOrder) return true
    return false
  }

  const handleReset = () => {
    setLocalSearchQuery('')
    onSearchChange('')
    onFiltersChange(defaultFilters)
  }

  return (
    <div className="mb-6 p-3 bg-neutral-50 rounded-lg border border-neutral-200">
      <div className="flex flex-wrap items-center gap-2">
        {/* Search Input */}
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={localSearchQuery}
          onChange={(e) => setLocalSearchQuery(e.target.value)}
          className="flex-1 min-w-[200px] border border-neutral-300 rounded-md px-3 py-1.5 text-sm bg-white text-neutral-900 placeholder-neutral-500 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
        />

        {/* Status Filter */}
        {showStatus && statusOptions.length > 0 && (
          <select
            value={filters.status || ''}
            onChange={(e) => onFiltersChange({ ...filters, status: e.target.value })}
            className="border border-neutral-300 rounded-md px-3 py-1.5 text-sm bg-white text-neutral-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
          >
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}

        {/* Category Filter */}
        {showCategory && categoryOptions.length > 0 && (
          <select
            value={filters.category || ''}
            onChange={(e) => onFiltersChange({ ...filters, category: e.target.value })}
            className="border border-neutral-300 rounded-md px-3 py-1.5 text-sm bg-white text-neutral-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
          >
            {categoryOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}

        {/* Sort Filter */}
        {showSort && sortOptions.length > 0 && (
          <>
            <select
              value={filters.sortBy || ''}
              onChange={(e) => onFiltersChange({ ...filters, sortBy: e.target.value })}
              className="border border-neutral-300 rounded-md px-3 py-1.5 text-sm bg-white text-neutral-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={filters.sortOrder || ''}
              onChange={(e) => onFiltersChange({ ...filters, sortOrder: e.target.value })}
              className="border border-neutral-300 rounded-md px-3 py-1.5 text-sm bg-white text-neutral-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="desc">↓ Desc</option>
              <option value="asc">↑ Asc</option>
            </select>
          </>
        )}

        {/* Clear Filters Button */}
        {hasActiveFilters() && (
          <button
            onClick={handleReset}
            className="ml-auto text-sm text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap"
          >
            Limpar filtros
          </button>
        )}
      </div>
    </div>
  )
}
