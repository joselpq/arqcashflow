'use client'

import { useState, useEffect } from 'react'
import { formatDateForInput } from '@/lib/utils/date'

export interface DateRange {
  startDate: string
  endDate: string
  label: string
}

interface DateRangePickerProps {
  onRangeChange: (range: DateRange | null) => void
  selectedRange?: DateRange | null
  className?: string
}

export default function DateRangePicker({ onRangeChange, selectedRange, className = '' }: DateRangePickerProps) {
  const [isCustom, setIsCustom] = useState(false)
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  // Preset date ranges
  const getPresetRanges = (): DateRange[] => {
    const today = new Date()
    const startOfToday = new Date(today)
    startOfToday.setHours(0, 0, 0, 0)

    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay())
    startOfWeek.setHours(0, 0, 0, 0)

    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    endOfWeek.setHours(23, 59, 59, 999)

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    endOfMonth.setHours(23, 59, 59, 999)

    const startOfNext30Days = new Date(today)
    const endOfNext30Days = new Date(today)
    endOfNext30Days.setDate(today.getDate() + 30)
    endOfNext30Days.setHours(23, 59, 59, 999)

    const startOfNext3Months = new Date(today)
    const endOfNext3Months = new Date(today)
    endOfNext3Months.setMonth(today.getMonth() + 3)
    endOfNext3Months.setHours(23, 59, 59, 999)

    const startOfYear = new Date(today.getFullYear(), 0, 1)
    const endOfYear = new Date(today.getFullYear(), 11, 31)
    endOfYear.setHours(23, 59, 59, 999)

    return [
      {
        startDate: formatDateForInput(startOfToday),
        endDate: formatDateForInput(startOfToday),
        label: 'Hoje'
      },
      {
        startDate: formatDateForInput(startOfWeek),
        endDate: formatDateForInput(endOfWeek),
        label: 'Esta Semana'
      },
      {
        startDate: formatDateForInput(startOfMonth),
        endDate: formatDateForInput(endOfMonth),
        label: 'Este Mês'
      },
      {
        startDate: formatDateForInput(startOfNext30Days),
        endDate: formatDateForInput(endOfNext30Days),
        label: 'Próximos 30 dias'
      },
      {
        startDate: formatDateForInput(startOfNext3Months),
        endDate: formatDateForInput(endOfNext3Months),
        label: 'Próximos 3 meses'
      },
      {
        startDate: formatDateForInput(startOfYear),
        endDate: formatDateForInput(endOfYear),
        label: 'Este Ano'
      }
    ]
  }

  const presetRanges = getPresetRanges()

  // Handle preset selection
  const handlePresetSelect = (range: DateRange | 'custom' | 'clear') => {
    if (range === 'clear') {
      setIsCustom(false)
      setCustomStartDate('')
      setCustomEndDate('')
      onRangeChange(null)
    } else if (range === 'custom') {
      setIsCustom(true)
      // Don't change the current custom dates
    } else {
      setIsCustom(false)
      onRangeChange(range)
    }
  }

  // Handle custom date changes
  useEffect(() => {
    if (isCustom && customStartDate && customEndDate) {
      // Validate that start date is before end date
      if (new Date(customStartDate) <= new Date(customEndDate)) {
        onRangeChange({
          startDate: customStartDate,
          endDate: customEndDate,
          label: `${formatDateForDisplay(customStartDate)} - ${formatDateForDisplay(customEndDate)}`
        })
      }
    }
  }, [isCustom, customStartDate, customEndDate, onRangeChange])

  // Format date for display
  const formatDateForDisplay = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  // Check if a preset is currently selected
  const isPresetSelected = (preset: DateRange) => {
    return selectedRange &&
           selectedRange.startDate === preset.startDate &&
           selectedRange.endDate === preset.endDate
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Preset Buttons */}
      <div className="flex flex-wrap gap-2">
        {presetRanges.map((preset) => (
          <button
            key={preset.label}
            onClick={() => handlePresetSelect(preset)}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              isPresetSelected(preset)
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-neutral-700 border-neutral-300 hover:border-blue-400 hover:text-blue-600'
            }`}
          >
            {preset.label}
          </button>
        ))}

        {/* Custom Range Button */}
        <button
          onClick={() => handlePresetSelect('custom')}
          className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
            isCustom
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-neutral-700 border-neutral-300 hover:border-blue-400 hover:text-blue-600'
          }`}
        >
          📅 Personalizado
        </button>

        {/* Clear Filter Button */}
        {selectedRange && (
          <button
            onClick={() => handlePresetSelect('clear')}
            className="px-3 py-1.5 text-sm rounded-lg border border-red-300 text-red-600 hover:bg-red-50 transition-colors"
          >
            ✕ Limpar
          </button>
        )}
      </div>

      {/* Custom Date Inputs */}
      {isCustom && (
        <div className="flex gap-3 items-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex-1">
            <label className="block text-xs font-medium text-blue-800 mb-1">
              Data Inicial
            </label>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-blue-300 rounded-md text-sm bg-white text-neutral-900 focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-blue-800 mb-1">
              Data Final
            </label>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-blue-300 rounded-md text-sm bg-white text-neutral-900 focus:border-blue-600 focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Selected Range Display */}
      {selectedRange && !isCustom && (
        <div className="text-sm text-blue-700 font-medium">
          📅 Período: {selectedRange.label}
        </div>
      )}

      {/* Custom Range Display */}
      {selectedRange && isCustom && customStartDate && customEndDate && (
        <div className="text-sm text-blue-700 font-medium">
          📅 Período: {formatDateForDisplay(customStartDate)} - {formatDateForDisplay(customEndDate)}
        </div>
      )}
    </div>
  )
}