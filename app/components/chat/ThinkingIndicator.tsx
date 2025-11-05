export const ThinkingIndicator = () => (
  <div className="flex items-center gap-2 text-gray-500 text-sm py-2 px-3 animate-fade-in">
    <span>Arnaldo está pensando</span>
    <div className="flex gap-1">
      <span
        className="animate-bounce inline-block"
        style={{ animationDelay: '0ms' }}
      >
        .
      </span>
      <span
        className="animate-bounce inline-block"
        style={{ animationDelay: '150ms' }}
      >
        .
      </span>
      <span
        className="animate-bounce inline-block"
        style={{ animationDelay: '300ms' }}
      >
        .
      </span>
    </div>
    <span className="text-base">💭</span>
  </div>
)
