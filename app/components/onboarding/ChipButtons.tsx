'use client'

interface ChipButtonOption {
  label: string
  value: string
}

interface ChipButtonsProps {
  options: ChipButtonOption[]
  onSelect: (value: string) => void
  disabled?: boolean
  selectedValue?: string // Pre-selected value when going back
}

export default function ChipButtons({ options, onSelect, disabled = false, selectedValue }: ChipButtonsProps) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {options.map((option) => {
        const isSelected = selectedValue === option.value
        return (
          <button
            key={option.value}
            onClick={() => onSelect(option.value)}
            disabled={disabled}
            className={`px-4 py-2 rounded-full text-sm active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md ${
              isSelected
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-neutral-200 text-neutral-800 hover:bg-neutral-300'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
