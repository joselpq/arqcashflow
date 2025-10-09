'use client'

interface ChatHeaderProps {
  isExpanded: boolean
  onClose: () => void
  onToggleExpand: () => void
}

export default function ChatHeader({ isExpanded, onClose, onToggleExpand }: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b border-neutral-200 bg-gradient-to-r from-blue-500 to-purple-600">
      <div className="flex items-center gap-2">
        <span className="text-xl">💬</span>
        <h3 className="text-lg font-semibold text-white">Chat com Arnaldo</h3>
      </div>
      <div className="flex items-center gap-2">
        {/* Expand/Collapse Button - Desktop only */}
        <button
          onClick={onToggleExpand}
          className="hidden md:block text-white hover:bg-white/20 rounded-full p-2 transition-colors"
          aria-label={isExpanded ? "Minimizar chat" : "Expandir chat"}
        >
          {isExpanded ? (
            // Minimize icon
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
                d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"
              />
            </svg>
          ) : (
            // Maximize icon
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
                d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
              />
            </svg>
          )}
        </button>

        {/* Close Button */}
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
    </div>
  )
}
