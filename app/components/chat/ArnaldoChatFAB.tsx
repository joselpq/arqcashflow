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
      {/* Chat Icon */}
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>

      {/* Unread Indicator */}
      {hasUnread && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse" />
      )}
    </button>
  )
}
