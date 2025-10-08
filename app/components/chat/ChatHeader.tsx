'use client'

interface ChatHeaderProps {
  onClose: () => void
}

export default function ChatHeader({ onClose }: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b border-neutral-200 bg-gradient-to-r from-blue-500 to-purple-600">
      <div className="flex items-center gap-2">
        <span className="text-xl">💬</span>
        <h3 className="text-lg font-semibold text-white">Chat com Arnaldo</h3>
      </div>
      <button
        onClick={onClose}
        className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
        aria-label="Fechar chat"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  )
}
