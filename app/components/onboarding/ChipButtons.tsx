'use client'

interface ChipButtonOption {
  label: string
  value: string
}

interface ChipButtonsProps {
  options: ChipButtonOption[]
  onSelect: (value: string) => void
  disabled?: boolean
}

export default function ChipButtons({ options, onSelect, disabled = false }: ChipButtonsProps) {
  return (
    <div className="flex flex-wrap gap-2 justify-center mt-4">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onSelect(option.value)}
          disabled={disabled}
          className="px-4 py-2 bg-neutral-200 text-neutral-800 rounded-full text-sm hover:bg-neutral-300 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
