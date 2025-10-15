'use client'

interface ArnaldoChatFABProps {
  onClick: () => void
  hasUnread?: boolean
}

export default function ArnaldoChatFAB({ onClick, hasUnread = false }: ArnaldoChatFABProps) {
  return (
    <button
      onClick={onClick}
      className="
        fixed bottom-6 right-6 z-30
        w-14 h-14 rounded-full
        bg-gradient-to-r from-blue-500 to-purple-600
        text-white shadow-lg
        hover:shadow-xl hover:scale-105
        active:scale-95
        transition-all duration-200
        flex items-center justify-center
        group
      "
      aria-label="Abrir chat com Arnaldo"
      title="Chat com Arnaldo (Cmd/Ctrl + /)"
    >
      {/* AI Sparkle Icon - Gemini style with 3 sparkles */}
      <svg
        className="w-6 h-6"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        {/* Main sparkle - center */}
        <path d="M12 2 L14 10 L15.5 12 L14 14 L12 22 L10 14 L8.5 12 L10 10 Z M2 12 L10 10 L12 8.5 L14 10 L22 12 L14 14 L12 15.5 L10 14 Z" />

        {/* Small sparkle - top right (30% size) */}
        <path d="M18.5 3.5 L19.1 5.5 L19.65 6.5 L19.1 7.5 L18.5 9.5 L17.9 7.5 L17.35 6.5 L17.9 5.5 Z M15.5 6.5 L17.5 5.9 L18.5 5.35 L19.5 5.9 L21.5 6.5 L19.5 7.1 L18.5 7.65 L17.5 7.1 Z" />

        {/* Small sparkle - bottom left (30% size) */}
        <path d="M5.5 14.5 L6.1 16.5 L6.65 17.5 L6.1 18.5 L5.5 20.5 L4.9 18.5 L4.35 17.5 L4.9 16.5 Z M2.5 17.5 L4.5 16.9 L5.5 16.35 L6.5 16.9 L8.5 17.5 L6.5 18.1 L5.5 18.65 L4.5 18.1 Z" />
      </svg>

      {/* Unread Indicator */}
      {hasUnread && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse" />
      )}
    </button>
  )
}
